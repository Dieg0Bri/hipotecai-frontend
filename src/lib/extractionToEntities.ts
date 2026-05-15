/**
 * extractionToEntities · convierte el JSONB de `dt_extraccion.datos` a
 * Entity[] para que el visor PDF pueda resaltar cada valor en el texto.
 *
 * Estrategia de mapeo:
 *   · Cada campo (key, value) genera UNA Entity con text = value stringified
 *   · Para arrays de objetos (ej. hipotecas_vigentes), se expanden subrows
 *   · Para objetos simples (ej. deslindes: {norte, sur, ...}), se expanden subkeys
 *   · Valores no-resaltables (boolean, null, empty arrays, números puros sin contexto)
 *     se skip — solo lo que aparece como texto literal en el PDF se highlight-ea
 *
 * Si se pasa `evidencia`, cada Entity se enriquece con:
 *   - fuente_texto: 'pdf_text' | 'ocr'  → para badge "vía OCR" en el panel
 *   - pagina, confianza_ocr             → para sincronizar con el visor OCR
 */
import type { EvidenciaItem, ExtraccionItem } from './estudio';
import { categoryFor, labelFor, type Entity } from '@/data/entities';

/**
 * String mínimo para hacer match en el PDF (evita falsos positivos con textos
 * muy cortos como "Sí" o un solo dígito).
 */
const MIN_TEXT_LEN = 3;

export function extraccionesToEntities(
  extracciones: ExtraccionItem[],
  evidencia?: EvidenciaItem[],
): Entity[] {
  const out: Entity[] = [];

  for (const ext of extracciones) {
    const datos = (ext.datos ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(datos)) {
      pushEntities(out, ext.id_extraccion, key, value, ext.confianza ?? undefined);
    }
  }

  // Dedupe: si el mismo `text` aparece dos veces, mantenemos solo el primero
  // (el highlight pintará todas las ocurrencias del texto en el PDF de todos modos).
  const seen = new Set<string>();
  const deduped = out.filter((e) => {
    const k = `${e.class}|${e.text.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Enriquecer con evidencia. Match por (class === campo) — la evidencia nos
  // da `campo` que es el mismo identificador que extraction_class. Para
  // claves anidadas (deslindes.norte) hacemos un fallback por substring.
  if (evidencia && evidencia.length > 0) {
    const byCampo = new Map<string, EvidenciaItem>();
    for (const ev of evidencia) {
      if (!ev.campo) continue;
      // Si el mismo campo aparece varias veces (lista), usamos la primera.
      if (!byCampo.has(ev.campo)) byCampo.set(ev.campo, ev);
    }
    for (const ent of deduped) {
      const ev = byCampo.get(ent.class);
      if (!ev) continue;
      ent.fuente_texto = ev.fuente_texto;
      if (ev.page != null) ent.pagina = ev.page;
      if (ev.confianza_ocr != null) ent.confianza_ocr = ev.confianza_ocr;
      // Bboxes solo vienen cuando fuente='ocr' y migración 009+ está
      // aplicada. Cuando no, el visor cae al text-layer search clásico.
      if (ev.bboxes && ev.bboxes.length > 0) ent.bboxes = ev.bboxes;
    }
  }

  return deduped;
}

function pushEntities(
  out: Entity[],
  extId: number,
  key: string,
  value: unknown,
  confidence: number | undefined,
  prefix?: string,
): void {
  if (value === null || value === undefined || value === '') return;

  // Booleans no se buscan — son derivados (ej. libre_de_gravamenes=true no aparece literal)
  if (typeof value === 'boolean') return;

  // Strings y números → 1 entity
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    if (text.length < MIN_TEXT_LEN) return;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    out.push({
      id: `ext-${extId}-${fullKey}-${out.length}`,
      class: key,
      text,
      label: prefix ? `${labelFor(prefix)} · ${labelFor(key)}` : labelFor(key),
      category: categoryFor(prefix || key),
      confidence,
    });
    return;
  }

  // Array de strings/numbers → entity por cada uno
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (typeof item === 'string' || typeof item === 'number') {
        const text = String(item).trim();
        if (text.length < MIN_TEXT_LEN) continue;
        out.push({
          id: `ext-${extId}-${key}-${i}-${out.length}`,
          class: key,
          text,
          label: labelFor(key),
          category: categoryFor(key),
          confidence,
        });
      } else if (item && typeof item === 'object') {
        // Array de objetos (ej. hipotecas_vigentes: [{acreedor, foja, numero, anio}])
        const obj = item as Record<string, unknown>;
        // Buscar el "campo principal" del objeto para usarlo como text
        const principal = obj.acreedor ?? obj.nombre ?? obj.descripcion ?? obj.razon_social
                       ?? Object.values(obj).find((v) => typeof v === 'string');
        if (typeof principal === 'string' && principal.trim().length >= MIN_TEXT_LEN) {
          out.push({
            id: `ext-${extId}-${key}-${i}-${out.length}`,
            class: key,
            text: principal.trim(),
            label: `${labelFor(key)} #${i + 1}`,
            category: categoryFor(key),
            confidence,
            attributes: stringifyAttrs(obj),
          });
        }
        // También expandir subkeys textuales (foja, numero, etc.)
        for (const [subKey, subVal] of Object.entries(obj)) {
          if (subKey === 'acreedor' || subKey === 'nombre' || subKey === 'descripcion') continue;
          pushEntities(out, extId, subKey, subVal, confidence, key);
        }
      }
    }
    return;
  }

  // Objeto simple (ej. deslindes: {norte: "calle X", sur: "lote 12", ...})
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const [subKey, subVal] of Object.entries(obj)) {
      pushEntities(out, extId, subKey, subVal, confidence, key);
    }
  }
}

function stringifyAttrs(obj: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return out;
}

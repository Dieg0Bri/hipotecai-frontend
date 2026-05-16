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
 * Si se pasa `anchors`, cada Entity se enriquece con:
 *   - anchors[]      → TODAS las ubicaciones del campo (auto + manual)
 *   - fuente_texto, pagina, bboxes (derivados del primer anchor activo)
 */
import type { Anchor, ExtraccionItem } from './estudio';
import { categoryFor, labelFor, type Entity, type EntityAnchor } from '@/data/entities';

/**
 * String mínimo para hacer match en el PDF (evita falsos positivos con textos
 * muy cortos como "Sí" o un solo dígito).
 */
const MIN_TEXT_LEN = 3;

export function extraccionesToEntities(
  extracciones: ExtraccionItem[],
  anchors?: Anchor[],
): Entity[] {
  const out: Entity[] = [];

  for (const ext of extracciones) {
    const datos = (ext.datos ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(datos)) {
      pushEntities(out, ext.id_extraccion, key, value, ext.confianza ?? undefined);
    }
  }

  // Dedupe por (class, text) — el highlight pintará todas las ocurrencias
  // del texto en el PDF de todos modos cuando es match en text-layer.
  const seen = new Set<string>();
  const deduped = out.filter((e) => {
    const k = `${e.class}|${e.text.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Enriquecer con anchors. Match por (class === campo). Una entidad puede
  // tener varios anchors (auto del extractor + manuales del abogado) —
  // todos se guardan en ent.anchors. Los campos derivados (pagina, bboxes,
  // etc.) apuntan al PRIMER anchor activo para compat con código viejo
  // que no itera anchors.
  if (anchors && anchors.length > 0) {
    const byCampo = new Map<string, Anchor[]>();
    for (const a of anchors) {
      if (!a.campo) continue;
      if (a.estado === 'rechazado') continue;  // ocultos por default
      const list = byCampo.get(a.campo);
      if (list) list.push(a);
      else byCampo.set(a.campo, [a]);
    }
    for (const ent of deduped) {
      const list = byCampo.get(ent.class);
      if (!list || list.length === 0) continue;
      // Orden: manual confirmado primero (lo que el abogado eligió),
      // luego auto confirmado, luego propuestos. El "primer activo" que
      // proyectamos a los campos derivados sigue ese orden.
      const sorted = [...list].sort(orderAnchor);
      ent.anchors = sorted.map(toEntityAnchor);
      const first = sorted[0];
      ent.fuente_texto = first.fuente_texto;
      if (first.page != null) ent.pagina = first.page;
      if (first.confianza_ocr != null) ent.confianza_ocr = first.confianza_ocr;
      if (first.bboxes && first.bboxes.length > 0) ent.bboxes = first.bboxes;
    }
  }

  return deduped;
}

function orderAnchor(a: Anchor, b: Anchor): number {
  // Manual confirmado > auto confirmado > manual propuesto > auto propuesto.
  const score = (x: Anchor) =>
    (x.origen === 'manual' ? 2 : 0) + (x.estado === 'confirmado' ? 1 : 0);
  return score(b) - score(a);
}

function toEntityAnchor(a: Anchor): EntityAnchor {
  return {
    // Migración 011: id_evidencia es un string UUID. Backend sigue
    // exponiéndolo como `id_evidencia` por compat.
    id_anchor: String(a.id ?? a.id_evidencia),
    page: a.page,
    char_start: a.char_start,
    char_end: a.char_end,
    snippet: a.snippet,
    fuente_texto: a.fuente_texto,
    bboxes: a.bboxes,
    origen: a.origen,
    estado: a.estado,
    confianza_ocr: a.confianza_ocr,
    creado_por: a.creado_por,
  };
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
      id_extraccion: extId,
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
          id_extraccion: extId,
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
            id_extraccion: extId,
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

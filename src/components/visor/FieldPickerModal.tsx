'use client';

/**
 * FieldPickerModal · modal que aparece tras capturar un draft y le pide al
 * abogado a qué CAMPO vincula el span seleccionado/dibujado.
 * --------------------------------------------------------------
 * UX:
 *   - Muestra el snippet (preview de lo que se ancló).
 *   - Lista los campos ya extraídos en el documento, agrupados por
 *     categoría (vienen de las Entity actuales). Click → selecciona.
 *   - Filtro por texto para encontrar el campo rápido.
 *   - "Otro campo (texto libre)" al final como escape — para casos donde
 *     el extractor no detectó nada y el abogado quiere crear el anchor
 *     a un campo nuevo (typo en datos: backend lo acepta, queda registrado
 *     aunque no haya entity matcheable en el panel hasta que se re-extraiga).
 *   - Botón "Crear anchor" hace POST. Mientras está pending, deshabilita el
 *     submit y muestra spinner.
 */
import { useMemo, useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { CATEGORY_META, labelFor, type Entity, type EntityCategory } from '@/data/entities';

export interface FieldOption {
  /** El identificador que va a `campo` (ej. "titular_actual", "vendedor"). */
  class: string;
  label: string;
  category: EntityCategory;
}

interface Props {
  /** Snippet preview que se va a anclar. */
  snippet: string;
  /** Página del anchor. */
  page: number;
  /** Fuente: pdf_text (text-selection) u ocr (rect dibujado). */
  fuenteTexto: 'pdf_text' | 'ocr';
  /** Campos ya presentes en el documento — derivados de Entity[]. */
  fields: FieldOption[];
  onCancel: () => void;
  /** El padre hace el POST createAnchor y resuelve. El modal espera. */
  onConfirm: (campo: string) => Promise<void>;
}

export default function FieldPickerModal({
  snippet, page, fuenteTexto, fields, onCancel, onConfirm,
}: Props) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [customField, setCustomField] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dedupe campos: pueden venir múltiples Entities con el mismo class
  // (ej. dos hipotecas distintas) pero para anchorear solo importa la
  // clase. Mantenemos la primera Label/Category encontrada.
  const uniqueFields = useMemo(() => {
    const seen = new Map<string, FieldOption>();
    for (const f of fields) {
      if (!seen.has(f.class)) seen.set(f.class, f);
    }
    return Array.from(seen.values());
  }, [fields]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return uniqueFields;
    return uniqueFields.filter((f) =>
      f.label.toLowerCase().includes(q) || f.class.toLowerCase().includes(q),
    );
  }, [uniqueFields, filter]);

  const finalCampo = selected ?? customField.trim();

  const handleConfirm = async () => {
    if (!finalCampo || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(finalCampo);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center"
      style={{ zIndex: 60 }}
      onClick={onCancel}
    >
      <div
        className="bg-[#F8F5EE] border border-[#E5DFD3] shadow-2xl w-[480px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-4 border-b border-[#E5DFD3] flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="smallcaps text-[#A47148] mb-1">Vincular a campo</div>
            <h2 className="font-serif text-[18px] text-[#0B1F3A] font-medium leading-tight">
              Elegir qué dato representa esta selección
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-[#6B6B6B] hover:text-[#0B1F3A] -mt-1 -mr-1"
            aria-label="Cancelar"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </header>

        {/* Preview del snippet */}
        <section className="px-5 py-3 border-b border-[#E5DFD3] bg-[#FBF9F2]">
          <div className="text-[10px] tracking-[0.14em] uppercase text-[#6B6B6B] mb-1">
            Texto anclado · página {page} · {fuenteTexto === 'ocr' ? 'OCR' : 'PDF nativo'}
          </div>
          <div className="font-serif italic text-[13px] text-[#1C1C1C] leading-snug break-words max-h-20 overflow-y-auto">
            {snippet ? `«${snippet}»` : <span className="text-[#6B6B6B]">(rect sin texto — solo área)</span>}
          </div>
        </section>

        {/* Filtro */}
        <div className="px-5 py-3 border-b border-[#E5DFD3]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B6B6B]" strokeWidth={1.5} />
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar campos…"
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#E5DFD3] focus:border-[#A47148] rounded-[2px] text-[12px] focus:outline-none"
            />
          </div>
        </div>

        {/* Lista de campos */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && uniqueFields.length > 0 && (
            <div className="px-5 py-6 text-center text-[#6B6B6B] font-serif italic text-[13px]">
              Sin coincidencias
            </div>
          )}
          {uniqueFields.length === 0 && (
            <div className="px-5 py-6 text-center text-[#6B6B6B] font-serif italic text-[13px]">
              Aún no hay campos extraídos. Usá &quot;Otro campo&quot; abajo.
            </div>
          )}
          <ul>
            {filtered.map((f) => {
              const meta = CATEGORY_META[f.category];
              const isSelected = selected === f.class;
              return (
                <li key={f.class}>
                  <button
                    type="button"
                    onClick={() => { setSelected(f.class); setCustomField(''); }}
                    className={`w-full text-left px-5 py-2.5 flex items-center gap-2.5 hover:bg-[#FBF9F2] border-l-2 transition-colors ${
                      isSelected ? 'bg-white border-l-[#A47148]' : 'border-l-transparent'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: meta.ink }}
                    />
                    <span className="flex-1 min-w-0">
                      <div className="text-[13px] text-[#1C1C1C] truncate">{f.label}</div>
                      <div className="text-[10px] tabular text-[#6B6B6B]">{f.class}</div>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Otro campo (texto libre) */}
        <div className="px-5 py-3 border-t border-[#E5DFD3] bg-[#FBF9F2]">
          <div className="text-[10px] tracking-[0.14em] uppercase text-[#6B6B6B] mb-1.5">
            O ingresar un campo nuevo
          </div>
          <input
            value={customField}
            onChange={(e) => { setCustomField(e.target.value); setSelected(null); }}
            placeholder="ej. observacion_letrado"
            className="w-full px-3 py-2 bg-white border border-[#E5DFD3] focus:border-[#A47148] rounded-[2px] text-[12px] focus:outline-none font-mono tabular"
          />
        </div>

        {/* Acciones */}
        <footer className="px-5 py-3 border-t border-[#E5DFD3] flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="text-[10px] uppercase tracking-[0.14em] px-3 py-2 border border-[#E5DFD3] hover:border-[#6B6B6B] disabled:opacity-50 rounded-[2px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!finalCampo || submitting}
            className="text-[10px] uppercase tracking-[0.14em] px-3 py-2 bg-[#0B1F3A] text-[#F8F5EE] hover:bg-[#16315A] disabled:opacity-50 rounded-[2px] inline-flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />}
            Crear anchor
          </button>
        </footer>
      </div>
    </div>
  );
}

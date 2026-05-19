'use client';

/**
 * OcrTranscriptPanel · panel central que muestra la transcripción OCR
 * --------------------------------------------------------------
 * Aparece en el visor SOLO cuando `archivo.fuente_extraccion === 'ocr'`,
 * entre el PDF original (izq) y el panel de entities (der).
 *
 * Carga el `.md` desde el bucket OCR vía signed URL y lo segmenta por
 * página usando los offsets que persistió ocr-api en `dt_ocr_pagina`.
 *
 * Cuando hay una entity activa, busca su texto literal dentro de la
 * página correspondiente y lo resalta con <mark>. También hace scroll
 * automático a esa página.
 *
 * IMPORTANTE: el OCR es un MODELO, no el documento. La cabecera lleva
 * disclaimer visible y cada línea baja en confianza es indicada visualmente.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Loader2, ScanLine, AlertTriangle } from 'lucide-react';

import {
  getOcrMarkdown, type OcrPagina, type OcrDocumentoMeta,
} from '@/lib/estudio';
import type { Entity } from '@/data/entities';

interface Props {
  documento: OcrDocumentoMeta;
  paginas: OcrPagina[];
  /** Entity actualmente seleccionada — si su texto está en alguna página, se resalta. */
  activeEntity: Entity | null;
}

const PAGE_ID_PREFIX = 'ocr-page';

export default function OcrTranscriptPanel({ documento, paginas, activeEntity }: Props) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Descarga el .md vía signed URL una sola vez (cambia solo si cambia gcs_uri).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOcrMarkdown(documento.gcs_uri)
      .then((md) => { if (!cancelled) setMarkdown(md); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [documento.gcs_uri]);

  // Segmentación por página usando los offsets persistidos. Cada página
  // queda como un slice del markdown — más rápido y robusto que parsear.
  const pageBlocks = useMemo(() => {
    if (!markdown) return [];
    return paginas.map((p) => ({
      ...p,
      texto: markdown.slice(p.char_start, p.char_end),
    }));
  }, [markdown, paginas]);

  // Scroll a la página de la entity activa cuando cambia.
  useEffect(() => {
    if (!activeEntity?.pagina) return;
    const el = document.getElementById(`${PAGE_ID_PREFIX}-${activeEntity.pagina}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeEntity]);

  if (loading) {
    return (
      <aside className="h-full flex flex-col items-center justify-center bg-[#FBF9F2] border-l border-[#E5DFD3] text-[#6B6B6B] gap-2">
        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
        <p className="text-[12px] font-serif italic">Cargando transcripción OCR…</p>
      </aside>
    );
  }
  if (error) {
    return (
      <aside className="h-full flex flex-col items-center justify-center bg-[#FBF9F2] border-l border-[#E5DFD3] text-[#7E1F1F] gap-2 px-6 text-center">
        <AlertTriangle className="w-6 h-6" strokeWidth={1.5} />
        <p className="text-[12px]">No se pudo cargar la transcripción OCR</p>
        <p className="text-[11px] text-[#6B6B6B]">{error}</p>
      </aside>
    );
  }

  return (
    <aside className="h-full flex flex-col bg-[#FBF9F2] border-l border-[#E5DFD3]">
      {/* Header con disclaimer + metadata del modelo OCR */}
      <header className="px-5 py-3 border-b border-[#E5DFD3] bg-[#FFF8E6]">
        <div className="flex items-center gap-2 mb-1">
          <ScanLine className="w-4 h-4 text-[#7A5A00]" strokeWidth={1.5} />
          <span className="smallcaps text-[#7A5A00]">Transcripción OCR</span>
          <span className="text-[10px] tabular text-[#6B6B6B] ml-auto">
            {documento.modelo} · {documento.paginas ?? 0} pág.
            {documento.confianza_promedio != null && (
              <> · {Math.round(documento.confianza_promedio * 100)}% conf.</>
            )}
          </span>
        </div>
        <p className="text-[11px] text-[#7A5A00] leading-snug">
          Texto reconocido por modelo de visión. <strong>El documento legal vinculante es el PDF original</strong>;
          esta vista existe para auditoría y comparativa.
        </p>
      </header>

      {/* Cuerpo: una sección por página */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {pageBlocks.map((p) => (
          <section
            key={p.id_ocr_pagina}
            id={`${PAGE_ID_PREFIX}-${p.pagina}`}
            className={`scroll-mt-4 ${
              activeEntity?.pagina === p.pagina ? 'ring-2 ring-[#A47148] ring-offset-2 ring-offset-[#FBF9F2] rounded-[2px]' : ''
            }`}
          >
            <header className="flex items-center justify-between mb-2 pb-1 border-b border-dashed border-[#E5DFD3]">
              <h3 className="font-serif text-[13px] text-[#0B1F3A] italic">Página {p.pagina}</h3>
              {p.confianza_promedio != null && (
                <span
                  className={`text-[10px] tabular ${
                    p.confianza_promedio < 0.7 ? 'text-[#7E1F1F]' : 'text-[#6B6B6B]'
                  }`}
                  title={p.confianza_promedio < 0.7 ? 'Baja confianza — revisar manualmente' : ''}
                >
                  {Math.round(p.confianza_promedio * 100)}% conf.
                  {p.confianza_promedio < 0.7 && ' ⚠'}
                </span>
              )}
            </header>
            <div className="text-[12.5px] leading-relaxed text-[#1C1C1C] whitespace-pre-wrap font-serif">
              {renderWithHighlight(p.texto, p.char_start, p.pagina, activeEntity)}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

/**
 * Renderiza el texto de una página resaltando la entity activa.
 *
 * Estrategia en tres niveles (cae al siguiente si el actual no aplica):
 *
 *  1. **Offsets locales del anchor** — vienen del extractor (langextract)
 *     persistidos por `_build_evidencia` ya convertidos a coords LOCALES
 *     de la página (no globales del ensamblado). `text.slice(cs, ce)`
 *     directo, sin restas. Es el match más preciso: apunta al span
 *     exacto que el modelo identificó, incluso si el snippet se repite
 *     en la misma página.
 *
 *  2. **Snippet match** — para anchors viejos creados antes del fix de
 *     offsets (cuando `char_start/end` eran globales) o anchors sin
 *     offsets. Busca el `snippet` literal case-insensitive dentro del
 *     bloque de la página.
 *
 *  3. **entity.text match** — fallback final para entidades legacy sin
 *     anchors persistidos. Busca el texto extraído tal cual.
 *
 * Los `<mark>` llevan `data-entity-id` + `data-bbox-marker="ocr"` para
 * que LeaderLine los pueda usar como ancla visual (PDF ↔ OCR ↔ Panel).
 *
 * Devuelve React nodes (no HTML) para no inyectar XSS.
 */
function renderWithHighlight(
  text: string,
  _pageGlobalStart: number, // reservado por si en el futuro persistimos offsets del .md
  pageNumber: number,
  activeEntity: Entity | null,
): ReactNode {
  if (!activeEntity) return text;

  // Path 1: offsets locales (preferido)
  const offsetRanges: Array<{ start: number; end: number; id_anchor: string }> = [];
  for (const a of activeEntity.anchors ?? []) {
    if (a.fuente_texto !== 'ocr') continue;
    if (a.estado === 'rechazado') continue;
    if (a.page !== pageNumber) continue;
    if (a.char_start == null || a.char_end == null) continue;
    if (a.char_start < 0 || a.char_end > text.length) continue;
    if (a.char_end <= a.char_start) continue;
    offsetRanges.push({
      start: a.char_start,
      end: a.char_end,
      id_anchor: a.id_anchor,
    });
  }
  if (offsetRanges.length > 0) {
    return renderRanges(text, dedupeOverlap(offsetRanges), activeEntity.id);
  }

  // Path 2: snippet match (anchors viejos sin offsets locales)
  const snippetMatches: Array<{ start: number; end: number; id_anchor: string }> = [];
  const lowerText = text.toLowerCase();
  for (const a of activeEntity.anchors ?? []) {
    if (a.fuente_texto !== 'ocr') continue;
    if (a.estado === 'rechazado') continue;
    if (a.page !== pageNumber) continue;
    const snippet = (a.snippet ?? '').trim();
    if (snippet.length < 3) continue;
    const idx = lowerText.indexOf(snippet.toLowerCase());
    if (idx < 0) continue;
    snippetMatches.push({
      start: idx,
      end: idx + snippet.length,
      id_anchor: a.id_anchor,
    });
  }
  if (snippetMatches.length > 0) {
    return renderRanges(text, dedupeOverlap(snippetMatches), activeEntity.id);
  }

  // Path 3: fallback con entity.text (entidades legacy sin anchors)
  if (!activeEntity.text || activeEntity.text.length < 3) return text;
  const needle = activeEntity.text.trim();
  const idx = lowerText.indexOf(needle.toLowerCase());
  if (idx < 0) return text;
  return renderRanges(
    text,
    [{ start: idx, end: idx + needle.length, id_anchor: `fallback-${activeEntity.id}` }],
    activeEntity.id,
  );
}

function dedupeOverlap<T extends { start: number; end: number }>(ranges: T[]): T[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: T[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (!last || r.start >= last.end) out.push(r);
  }
  return out;
}

function renderRanges(
  text: string,
  ranges: Array<{ start: number; end: number; id_anchor: string }>,
  entityId: string,
): ReactNode {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (r.start > cursor) parts.push(text.slice(cursor, r.start));
    parts.push(
      <mark
        key={`m-${r.id_anchor}-${i}`}
        data-entity-id={entityId}
        data-anchor-id={r.id_anchor}
        data-bbox-marker="ocr"
        className="bg-[#FFD56B] text-[#1C1C1C] px-0.5 rounded-[1px]"
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

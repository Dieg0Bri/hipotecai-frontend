'use client';

/**
 * BboxHighlight · overlay rectangular para entidades OCR
 * --------------------------------------------------------------
 * Variante de `EntityHighlight` que dibuja directo a partir de
 * coordenadas geométricas (bboxes en puntos PDF) en lugar de buscar
 * el texto en el text-layer de pdfjs.
 *
 * ¿Por qué dos componentes?
 *   - PDFs con texto nativo: pdfjs renderiza el text-layer y EntityHighlight
 *     hace string-match → posicion exacta del span sobre las letras.
 *   - PDFs escaneados (sin texto nativo): text-layer queda vacío → string-match
 *     no encuentra nada. Las bboxes vienen del OCR (Surya), persistidas en
 *     `dt_extraccion_evidencia.bboxes` cuando `fuente_texto='ocr'`.
 *
 * Convención de coordenadas:
 *   - bbox = [x0, y0, x1, y1] en PUNTOS PDF (1/72")
 *   - Origen TOP-LEFT (ya convertido desde Surya por ocr-api)
 *   - Conversión a CSS px: multiplicar por `pageCssWidth / pageWidthPt`.
 *
 * El componente NO usa MutationObserver — se re-renderiza solo cuando
 * cambian sus props. Eso es suficiente porque las bboxes son estables
 * en el tiempo (no dependen del render del text-layer).
 */
import { useMemo, useEffect } from 'react';
import { CATEGORY_META, type Entity } from '@/data/entities';

interface Props {
  pageNumber: number;
  entities: Entity[];
  activeEntityId: string | null;
  /** Ancho de la página en puntos PDF — viene del onLoadSuccess de react-pdf. */
  pageWidthPt: number | undefined;
  /** Ancho de la página renderizada en CSS px. Si la página es responsive,
   *  ResizeObserver del padre va a re-renderizar con el ancho nuevo. */
  pageCssWidth: number | undefined;
  /** Click sobre un highlight → selecciona la entidad en el panel lateral. */
  onEntityClick?: (entityId: string) => void;
  /** Notifica al padre la posicion `y` de la entidad activa para que haga
   *  scroll. Mismo contrato que EntityHighlight para uniformidad. */
  onHighlightPosition?: (entityId: string, pageNumber: number, y: number) => void;
}

export default function BboxHighlight({
  pageNumber,
  entities,
  activeEntityId,
  pageWidthPt,
  pageCssWidth,
  onEntityClick,
  onHighlightPosition,
}: Props) {
  // Computo las cajas a renderizar. Solo entities cuya pagina coincida y
  // que tengan bboxes (las pdf_text las maneja EntityHighlight).
  const rects = useMemo(() => {
    if (!pageWidthPt || !pageCssWidth || pageWidthPt <= 0) return [];
    const scale = pageCssWidth / pageWidthPt;
    const out: Array<{
      entityId: string;
      category: Entity['category'];
      x: number; y: number; width: number; height: number;
      tooltip: string;
    }> = [];
    for (const ent of entities) {
      if (!ent.bboxes || ent.bboxes.length === 0) continue;
      if (ent.pagina !== pageNumber) continue;
      for (const [x0, y0, x1, y1] of ent.bboxes) {
        out.push({
          entityId: ent.id,
          category: ent.category,
          x: x0 * scale,
          y: y0 * scale,
          width: Math.max(1, (x1 - x0) * scale),
          height: Math.max(1, (y1 - y0) * scale),
          tooltip: `${ent.label} — ${ent.text}`,
        });
      }
    }
    return out;
  }, [entities, pageNumber, pageWidthPt, pageCssWidth]);

  // Notifica al padre cuando la entidad activa esta en esta pagina
  useEffect(() => {
    if (!onHighlightPosition || !activeEntityId) return;
    const r = rects.find((rr) => rr.entityId === activeEntityId);
    if (r) onHighlightPosition(activeEntityId, pageNumber, r.y);
  }, [activeEntityId, rects, onHighlightPosition, pageNumber]);

  if (rects.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 11 }}>
      {rects.map((r, i) => {
        const meta = CATEGORY_META[r.category];
        const isActive = r.entityId === activeEntityId;
        return (
          <button
            key={`${r.entityId}-${i}`}
            type="button"
            data-entity-id={r.entityId}
            title={r.tooltip}
            onClick={(ev) => {
              ev.stopPropagation();
              onEntityClick?.(r.entityId);
            }}
            className="absolute rounded-[2px] transition-all duration-200 pointer-events-auto cursor-pointer hover:brightness-110 focus:outline-none"
            style={{
              left: r.x - 1,
              top: r.y - 1,
              width: r.width + 2,
              height: r.height + 2,
              background: meta.fill,
              borderBottom: `2px solid ${meta.ink}`,
              boxShadow: isActive
                ? `0 0 0 2px ${meta.ink}, 0 0 0 4px rgba(255,255,255,0.65)`
                : 'none',
              opacity: isActive ? 0.95 : 0.85,
              padding: 0,
              border: 0,
            }}
            aria-label={r.tooltip}
          />
        );
      })}
    </div>
  );
}

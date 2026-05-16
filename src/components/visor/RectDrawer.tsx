'use client';

/**
 * RectDrawer · overlay sobre la página que captura un rect dibujado a mano.
 * --------------------------------------------------------------
 * Solo se monta cuando el modo "agregar anchor" está activo. Captura mouse
 * down/move/up sobre la página y al soltar llama `onCapture` con el rect
 * convertido a PUNTOS PDF.
 *
 * Cuando la página tiene text-layer y el usuario seleccionó texto en lugar
 * de dibujar, este componente no interfiere — el `onMouseDown` viene del
 * mismo div pero ignoramos el evento si el target es un span del text-layer
 * (significa que el usuario está intentando seleccionar texto, no dibujar).
 *
 * Convención de coordenadas:
 *   - Mouse en CSS px relativo al div de la página.
 *   - Convertimos a PT con `scale = pageWidthPt / pageCssWidth` (inverso del
 *     usado por BboxHighlight).
 */
import { useEffect, useRef, useState } from 'react';

interface Props {
  pageNumber: number;
  pageWidthPt: number | undefined;
  pageCssWidth: number | undefined;
  /** Solo se renderiza si true. */
  enabled: boolean;
  onCapture: (payload: {
    page: number;
    bbox: [number, number, number, number]; // PT
    snippet: string;                         // texto contenido si lo hay
  }) => void;
}

interface DragState {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export default function RectDrawer({
  pageNumber, pageWidthPt, pageCssWidth, enabled, onCapture,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    if (!enabled) setDrag(null);
  }, [enabled]);

  const start = (ev: React.MouseEvent) => {
    if (!enabled) return;
    // Si el click viene sobre un span del text-layer, NO iniciamos drag —
    // el usuario está intentando seleccionar texto, no dibujar.
    const target = ev.target as HTMLElement;
    if (target.closest('.react-pdf__Page__textContent')) return;
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    setDrag({ x0: x, y0: y, x1: x, y1: y });
    ev.preventDefault();
  };

  const move = (ev: React.MouseEvent) => {
    if (!drag) return;
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    setDrag({
      ...drag,
      x1: ev.clientX - r.left,
      y1: ev.clientY - r.top,
    });
  };

  const end = () => {
    if (!drag) return;
    const minX = Math.min(drag.x0, drag.x1);
    const maxX = Math.max(drag.x0, drag.x1);
    const minY = Math.min(drag.y0, drag.y1);
    const maxY = Math.max(drag.y0, drag.y1);
    const widthCss = maxX - minX;
    const heightCss = maxY - minY;
    // Filtro de "rect demasiado chico" — typically un click sin drag genera
    // un rect de ~0 que no queremos.
    if (widthCss < 5 || heightCss < 5) {
      setDrag(null);
      return;
    }
    if (pageWidthPt && pageCssWidth && pageCssWidth > 0) {
      const scale = pageWidthPt / pageCssWidth;
      const bbox: [number, number, number, number] = [
        minX * scale,
        minY * scale,
        maxX * scale,
        maxY * scale,
      ];
      // Intentar capturar texto contenido en el rect — si la pagina tiene
      // text-layer, podriamos hacer hit-test pero es complejo y para escaneos
      // el text-layer estara vacio igual. Dejamos snippet vacio; el modal
      // permite igual asignar a un campo.
      onCapture({ page: pageNumber, bbox, snippet: '' });
    }
    setDrag(null);
  };

  if (!enabled) return null;

  // Overlay completo de la página. pointer-events-auto solo cuando dibujamos
  // — así no interferimos con el text-layer (cuando target.closest matchea
  // text-layer span, no iniciamos drag igualmente).
  return (
    <div
      ref={containerRef}
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={end}
      onMouseLeave={end}
      className="absolute inset-0"
      style={{
        zIndex: 14,
        cursor: 'crosshair',
        // pointer-events: el div recibe los eventos, pero gracias al check
        // de closest(.react-pdf__Page__textContent) en `start`, el text-layer
        // que está más arriba en el z-stack puede capturar selecciones
        // primero. Hacemos passthrough en mousedown cuando target.closest matchea.
      }}
    >
      {drag && (
        <div
          className="absolute border-2 border-dashed border-[#A47148] bg-[rgba(164,113,72,0.15)]"
          style={{
            left: Math.min(drag.x0, drag.x1),
            top: Math.min(drag.y0, drag.y1),
            width: Math.abs(drag.x1 - drag.x0),
            height: Math.abs(drag.y1 - drag.y0),
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

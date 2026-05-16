'use client';

/**
 * LeaderLine · curva SVG que conecta el bbox activo del PDF con su
 * card en el panel lateral.
 * --------------------------------------------------------------
 * Diseño:
 * - Overlay fijo a viewport (position: fixed) — el SVG vive afuera del
 *   scroll del PDF y del panel para que su sistema de coordenadas
 *   sea estable. Si lo metieras dentro de cualquiera de los dos, los
 *   scrolls romperían la curva.
 * - Re-mide en scroll/resize via ResizeObserver + scroll listener
 *   capturing (necesario porque el scroll ocurre en contenedores
 *   internos, no en window).
 * - Bézier cúbico con tangentes horizontales — la línea sale del bbox
 *   hacia la derecha y entra a la card desde la izquierda, dando un
 *   "leader" natural sin atravesar el documento.
 *
 * Selecciona el primer bbox visible del entityId activo (data-anchor-id
 * más alto pierde frente al más bajo — el primero que aparece en DOM
 * está priorizado por sorted-by-origen del extractionToEntities).
 *
 * No se renderiza nada si:
 * - No hay entidad activa
 * - El bbox no está en una página visible del viewport
 * - La card del panel está fuera de viewport (queda implícito por las
 *   coords; la curva sale del viewport y desaparece sola, no es bug)
 */
import { useEffect, useState } from 'react';

interface Props {
  activeEntityId: string | null;
  /** Color de la línea (default: ink color del panel). */
  color?: string;
  /** Si false, oculta el componente sin desmontar (para toggles rápidos). */
  enabled?: boolean;
}

interface Endpoints {
  x1: number; y1: number;  // origen (bbox del PDF)
  x2: number; y2: number;  // destino (card del panel)
}

export default function LeaderLine({
  activeEntityId,
  color = '#A47148',
  enabled = true,
}: Props) {
  const [points, setPoints] = useState<Endpoints | null>(null);

  useEffect(() => {
    if (!enabled || !activeEntityId) {
      setPoints(null);
      return;
    }

    const recompute = () => {
      // Buscamos el primer bbox visible (puede haber varios — uno por
      // anchor activo). Tomamos el primero del DOM order, que ya está
      // sorted por prioridad (manual confirmado > auto, ver
      // extractionToEntities).
      // Selector explícito por `data-bbox-marker`: el visor pone "bbox"
      // (BboxHighlight) o "textlayer" (EntityHighlight); el panel no pone
      // ningún marker. Cualquiera de los dos sirve como origen visual.
      const bboxEl = document.querySelector<HTMLElement>(
        `[data-entity-id="${activeEntityId}"][data-bbox-marker]`
      );
      const cardEl = document.querySelector<HTMLElement>(
        `[data-entity-id="${activeEntityId}"]:not([data-bbox-marker])`
      );
      if (!bboxEl || !cardEl) {
        setPoints(null);
        return;
      }
      const br = bboxEl.getBoundingClientRect();
      const cr = cardEl.getBoundingClientRect();
      // El leader sale del borde derecho del bbox y entra al borde
      // izquierdo de la card; punto medio vertical en cada extremo.
      setPoints({
        x1: br.right,
        y1: br.top + br.height / 2,
        x2: cr.left,
        y2: cr.top + cr.height / 2,
      });
    };

    recompute();
    // Re-medir en cualquier cambio. Capture phase porque el scroll real
    // sucede en divs internos (no en window).
    const onScroll = () => recompute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', recompute);
    // Re-medimos también periódicamente las primeras ~1s porque el PDF
    // puede terminar de renderizar pages después del mount inicial.
    const interval = window.setInterval(recompute, 200);
    const stopInterval = window.setTimeout(
      () => window.clearInterval(interval),
      1500,
    );

    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', recompute);
      window.clearInterval(interval);
      window.clearTimeout(stopInterval);
    };
  }, [activeEntityId, enabled]);

  if (!points || !enabled) return null;

  // Bézier cúbico horizontal. Las tangentes salen/entran horizontalmente
  // (1/3 de la distancia X) para dar curva suave que no atraviese
  // verticalmente el documento.
  const dx = Math.max(40, Math.abs(points.x2 - points.x1) / 3);
  const path = `M ${points.x1} ${points.y1} ` +
               `C ${points.x1 + dx} ${points.y1}, ` +
               `${points.x2 - dx} ${points.y2}, ` +
               `${points.x2} ${points.y2}`;

  return (
    <svg
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 40 }}
      aria-hidden
    >
      <defs>
        <marker
          id="leader-dot"
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
          orient="auto"
        >
          <circle cx="4" cy="4" r="3" fill={color} />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        markerStart="url(#leader-dot)"
        markerEnd="url(#leader-dot)"
        opacity={0.7}
      />
    </svg>
  );
}

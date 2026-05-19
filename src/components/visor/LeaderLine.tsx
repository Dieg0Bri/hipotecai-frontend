'use client';

/**
 * LeaderLine · curva SVG que conecta visualmente el bbox del PDF, el
 * span del OCR (si está montado) y la card del panel lateral.
 * --------------------------------------------------------------
 * Layout posible del visor:
 *   - 2 columnas (PDF | Panel)          → 1 curva: PDF → Panel
 *   - 3 columnas (PDF | OCR | Panel)    → 2 curvas: PDF → OCR → Panel
 *   - Solo OCR (sin PDF en viewport)    → 1 curva: OCR → Panel
 *
 * Diseño:
 * - Overlay fijo a viewport (position: fixed) — el SVG vive afuera del
 *   scroll del PDF/OCR/panel para que su sistema de coordenadas
 *   sea estable. Si lo metieras dentro de cualquiera, los scrolls
 *   romperían la curva.
 * - Re-mide en scroll/resize capturing (necesario porque los scrolls
 *   suceden en contenedores internos, no en window).
 * - Bézier cúbico con tangentes horizontales — la línea sale del bbox
 *   hacia la derecha y entra al destino desde la izquierda, dando un
 *   "leader" natural sin atravesar verticalmente los documentos.
 *
 * Selección de elementos (por `data-bbox-marker`):
 *   - "bbox" / "textlayer" → highlight del PDF (BboxHighlight / EntityHighlight)
 *   - "ocr"                → <mark> del OcrTranscriptPanel
 *   - sin marker           → card del panel lateral (EntityPanel)
 *
 * Cuando hay varios elementos del mismo tipo, agarra el primero del DOM
 * (ya está sorted por prioridad: manual confirmado > auto, ver
 * extractionToEntities).
 */
import { useEffect, useState } from 'react';

interface Props {
  activeEntityId: string | null;
  /** Color de la línea (default: ink color del panel). */
  color?: string;
  /** Si false, oculta el componente sin desmontar (para toggles rápidos). */
  enabled?: boolean;
}

interface Endpoint {
  x: number;
  y: number;
}

export default function LeaderLine({
  activeEntityId,
  color = '#A47148',
  enabled = true,
}: Props) {
  // Lista de puntos a unir secuencialmente. Cada par consecutivo se
  // dibuja como una curva Bézier individual.
  const [waypoints, setWaypoints] = useState<Endpoint[]>([]);

  useEffect(() => {
    if (!enabled || !activeEntityId) {
      setWaypoints([]);
      return;
    }

    const recompute = () => {
      // Buscamos los tres tipos de ancla por separado. PDF y OCR son
      // intercambiables — cualquiera puede ser origen si está montado.
      const pdfEl = document.querySelector<HTMLElement>(
        `[data-entity-id="${activeEntityId}"][data-bbox-marker="bbox"],` +
        `[data-entity-id="${activeEntityId}"][data-bbox-marker="textlayer"]`
      );
      const ocrEl = document.querySelector<HTMLElement>(
        `[data-entity-id="${activeEntityId}"][data-bbox-marker="ocr"]`
      );
      const cardEl = document.querySelector<HTMLElement>(
        `[data-entity-id="${activeEntityId}"]:not([data-bbox-marker])`
      );

      // Construimos la cadena de waypoints en orden de izquierda a
      // derecha visual: PDF → OCR → Card. Si alguno no está, se omite
      // (no rompe — el siguiente toma su lugar).
      const points: Endpoint[] = [];
      const addRightEdge = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        points.push({ x: r.right, y: r.top + r.height / 2 });
      };
      const addLeftEdge = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        points.push({ x: r.left, y: r.top + r.height / 2 });
      };
      // Cada nodo intermedio se cruza por su centro horizontal: la
      // curva entra por la izquierda y sale por la derecha — eso da
      // continuidad visual "pasamos por acá" sin doble flecha.
      const addBothEdges = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        points.push({ x: r.left, y: r.top + r.height / 2 });
        points.push({ x: r.right, y: r.top + r.height / 2 });
      };

      if (pdfEl) addRightEdge(pdfEl);
      if (ocrEl) {
        // OCR es nodo intermedio cuando hay PDF y Card a sus lados.
        // Si está solo (sin PDF) o sin Card, se trata como extremo.
        const hasLeft = !!pdfEl;
        const hasRight = !!cardEl;
        if (hasLeft && hasRight) addBothEdges(ocrEl);
        else if (hasLeft) addLeftEdge(ocrEl);
        else addRightEdge(ocrEl);
      }
      if (cardEl) addLeftEdge(cardEl);

      // Necesitamos al menos 2 puntos para dibujar una curva.
      setWaypoints(points.length >= 2 ? points : []);
    };

    recompute();
    // Re-medir en cualquier cambio. Capture phase porque el scroll real
    // sucede en divs internos (no en window).
    const onScroll = () => recompute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', recompute);
    // Re-medimos también periódicamente las primeras ~1.5s porque el
    // PDF puede terminar de renderizar pages después del mount inicial.
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

  if (waypoints.length < 2 || !enabled) return null;

  // Construimos un path con varios segmentos Bézier. Cada segmento une
  // dos waypoints consecutivos con tangentes horizontales (1/3 de la
  // distancia X) para curva suave que no cruza verticalmente.
  const segments: string[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const dx = Math.max(30, Math.abs(b.x - a.x) / 3);
    segments.push(
      `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`,
    );
  }
  const path = segments.join(' ');

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
      {/* Punto en el waypoint intermedio (OCR) si hay tres anclas. Hace
          explícito que la curva "pasa por acá" y no es una sola línea
          que se dobla por casualidad. */}
      {waypoints.length >= 4 && (
        <circle
          cx={(waypoints[1].x + waypoints[2].x) / 2}
          cy={(waypoints[1].y + waypoints[2].y) / 2}
          r={3}
          fill={color}
          opacity={0.7}
        />
      )}
    </svg>
  );
}

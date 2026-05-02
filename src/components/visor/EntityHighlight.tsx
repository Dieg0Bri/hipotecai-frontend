'use client';

/**
 * EntityHighlight · resalta entidades extraídas en el text-layer del PDF
 * --------------------------------------------------------------
 * Variante de TextHighlight de ISA1 adaptada a múltiples entidades
 * concurrentes con colores por categoría legal.
 *
 * Para cada entidad:
 *   1. Busca su `text` (normalizado) en el text-layer renderizado por
 *      pdfjs sobre la página actual.
 *   2. Calcula `getClientRects()` del rango y los pinta como overlay
 *      absoluto encima de la página.
 *   3. Si la entidad está "seleccionada" (props.activeEntityId) la
 *      resalta más fuerte y notifica posición al padre para hacer scroll.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { CATEGORY_META, type Entity } from '@/data/entities';

interface HighlightRect {
  entityId: string;
  category: Entity['category'];
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  pageNumber: number;
  pageIdPrefix: string;
  entities: Entity[];
  activeEntityId: string | null;
  onHighlightPosition?: (entityId: string, pageNumber: number, y: number) => void;
  /** Click sobre el highlight → selecciona la entidad en el panel lateral */
  onEntityClick?: (entityId: string) => void;
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function EntityHighlight({
  pageNumber,
  pageIdPrefix,
  entities,
  activeEntityId,
  onHighlightPosition,
  onEntityClick,
}: Props) {
  const [rects, setRects] = useState<HighlightRect[]>([]);
  const observerRef = useRef<MutationObserver | null>(null);

  const compute = useCallback(() => {
    const pageEl = document.getElementById(`${pageIdPrefix}-${pageNumber}`);
    if (!pageEl) return;
    const spans = Array.from(
      pageEl.querySelectorAll('.react-pdf__Page__textContent span')
    ) as HTMLElement[];
    if (spans.length === 0) return;

    const pageRect = pageEl.getBoundingClientRect();
    const next: HighlightRect[] = [];

    // Pre-build full text + span map (igual que ISA1)
    let fullText = '';
    const spanMap: { span: HTMLElement; start: number; end: number; length: number }[] = [];
    spans.forEach((span) => {
      const t = span.textContent ?? '';
      spanMap.push({ span, start: fullText.length, end: fullText.length + t.length, length: t.length });
      fullText += t;
    });
    const norm = normalize(fullText);

    for (const entity of entities) {
      if (!entity.text) continue;
      const target = normalize(entity.text.trim());
      if (!target) continue;

      let pos = 0;
      while (pos < norm.length) {
        const idx = norm.indexOf(target, pos);
        if (idx === -1) break;
        const matchEnd = idx + target.length;

        for (const sm of spanMap) {
          if (sm.end > idx && sm.start < matchEnd) {
            const startInSpan = Math.max(0, idx - sm.start);
            const endInSpan = Math.min(sm.length, matchEnd - sm.start);
            try {
              const node = sm.span.firstChild;
              if (!node || node.nodeType !== Node.TEXT_NODE) continue;
              const range = document.createRange();
              range.setStart(node, startInSpan);
              range.setEnd(node, endInSpan);
              const rs = range.getClientRects();
              for (let i = 0; i < rs.length; i++) {
                const r = rs[i];
                if (r.width > 0 && r.height > 0) {
                  next.push({
                    entityId: entity.id,
                    category: entity.category,
                    x: r.left - pageRect.left,
                    y: r.top - pageRect.top,
                    width: r.width,
                    height: r.height,
                  });
                }
              }
            } catch {
              // ignore
            }
          }
        }
        pos = idx + 1;
      }
    }

    setRects(next);
  }, [entities, pageNumber, pageIdPrefix]);

  useEffect(() => {
    const pageEl = document.getElementById(`${pageIdPrefix}-${pageNumber}`);
    if (!pageEl) return;

    compute();
    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => {
      if (pageEl.querySelector('.react-pdf__Page__textContent span')) {
        compute();
      }
    });
    observerRef.current.observe(pageEl, { childList: true, subtree: true });
    return () => observerRef.current?.disconnect();
  }, [compute, pageNumber, pageIdPrefix]);

  // Notifica posición de la entidad activa para que el padre haga scroll
  useEffect(() => {
    if (!onHighlightPosition || !activeEntityId) return;
    const r = rects.find((rr) => rr.entityId === activeEntityId);
    if (r) onHighlightPosition(activeEntityId, pageNumber, r.y);
  }, [activeEntityId, rects, onHighlightPosition, pageNumber]);

  if (rects.length === 0) return null;

  return (
    // El contenedor sigue sin recibir eventos (deja pasar selección de texto),
    // pero cada rect individual sí los recibe (cursor pointer + click).
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {rects.map((r, i) => {
        const meta = CATEGORY_META[r.category];
        const isActive = r.entityId === activeEntityId;
        const entity = entities.find((e) => e.id === r.entityId);
        const tooltip = entity ? `${entity.label} — ${entity.text}` : '';

        return (
          <button
            key={`${r.entityId}-${i}`}
            type="button"
            data-entity-id={r.entityId}
            title={tooltip}
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
            aria-label={tooltip}
          />
        );
      })}
    </div>
  );
}

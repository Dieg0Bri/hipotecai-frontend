'use client';

/**
 * useAnchorDraft · estado del modo "agregar anchor manual"
 * --------------------------------------------------------------
 * Centraliza el flujo:
 *   1. start()                → modo activo, cursor cambia, listeners abiertos
 *   2. capture(draft)         → se capturó una selección o un rect
 *   3. abort() / commit(...)  → se sale del modo, modal cierra
 *
 * El componente que consuma este hook (PDFCanvas) renderiza:
 *   - cursor especial cuando active=true
 *   - listener de window.getSelection sobre text-layer
 *   - RectDrawer overlay cuando active=true Y la página no tiene text-layer
 *
 * Y el padre (page.tsx) renderiza el FieldPickerModal cuando draft != null
 * y al confirmar llama createAnchor().
 */
import { useCallback, useState } from 'react';

/** Payload de un anchor parcialmente formado, listo para que el usuario
 *  le elija un `campo` destino en el modal. */
export interface AnchorDraft {
  /** Página 1-indexed. */
  page: number;
  /** Texto seleccionado/snippet del rect dibujado. Vacío si es solo rect. */
  snippet: string;
  /** Bboxes en PUNTOS PDF. */
  bboxes: number[][];
  /** 'pdf_text' si vino de window.getSelection sobre text-layer; 'ocr'
   *  si vino de un rect dibujado a mano (típico en escaneos). */
  fuente_texto: 'pdf_text' | 'ocr';
}

export interface UseAnchorDraftResult {
  active: boolean;
  draft: AnchorDraft | null;
  start: () => void;
  capture: (d: AnchorDraft) => void;
  /** Cierra el modal sin crear nada. Mantiene el modo activo por si el
   *  usuario quiere reintentar la selección. */
  dismissDraft: () => void;
  /** Sale del modo completo (toolbar toggle off). */
  exit: () => void;
}

export function useAnchorDraft(): UseAnchorDraftResult {
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState<AnchorDraft | null>(null);

  const start = useCallback(() => {
    setActive(true);
    setDraft(null);
  }, []);

  const capture = useCallback((d: AnchorDraft) => {
    // Defensa: bboxes vacías significa que no captamos nada — no abrimos modal.
    if (!d.bboxes || d.bboxes.length === 0) return;
    setDraft(d);
  }, []);

  const dismissDraft = useCallback(() => {
    setDraft(null);
  }, []);

  const exit = useCallback(() => {
    setActive(false);
    setDraft(null);
  }, []);

  return { active, draft, start, capture, dismissDraft, exit };
}

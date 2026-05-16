'use client';

/**
 * EntityPanel · panel lateral con las entidades agrupadas por categoría
 * --------------------------------------------------------------
 * - Cada categoría tiene su sección con su color y símbolo.
 * - Cada entidad muestra su label, valor extraído y confianza.
 * - Click en una entidad → marca activa (el visor hace scroll y la
 *   resalta más fuerte en el PDF).
 * - Cuando la entidad activa cambia desde el PDF (click en highlight),
 *   el panel auto-expande la categoría y scrollea al item al centro.
 * - Search filter para encontrar entidades cuando son muchas.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IdCard, Users, MapPin, Banknote, Pen, ShieldAlert, CheckCircle2, Map, FileQuestion,
  Search, X, ChevronDown, ChevronRight, Check, ScanLine, Trash2, RotateCcw, Sparkles, Hand,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { CATEGORY_META, type Entity, type EntityAnchor, type EntityCategory } from '@/data/entities';

const ICON_MAP: Record<string, LucideIcon> = {
  IdCard, Users, MapPin, Banknote, Pen, ShieldAlert, CheckCircle2, Map, FileQuestion,
};

interface Props {
  entities: Entity[];
  activeEntityId: string | null;
  onSelect: (entityId: string) => void;
  documentName: string;
  documentType: string;
  confidence: number;
  /** Acciones de anchor. Si no se pasan, los botones quedan ocultos. */
  onConfirmAnchor?: (anchorId: number) => Promise<void> | void;
  onRejectAnchor?: (anchorId: number) => Promise<void> | void;
  onDeleteAnchor?: (anchorId: number) => Promise<void> | void;
}

export default function EntityPanel({
  entities, activeEntityId, onSelect, documentName, documentType, confidence,
  onConfirmAnchor, onRejectAnchor, onDeleteAnchor,
}: Props) {
  // Anchor sobre el que están operando los botones — siempre el primero de
  // la entidad activa (el más prioritario por orderAnchor). Para v0 el panel
  // expone acciones sobre ese; un futuro PR podría listar todos los anchors
  // de la entidad para acciones independientes.
  const [pendingAction, setPendingAction] = useState<number | null>(null);
  const runAction = async (
    anchorId: number,
    fn?: (id: number) => Promise<void> | void,
  ) => {
    if (!fn) return;
    setPendingAction(anchorId);
    try { await fn(anchorId); }
    finally { setPendingAction(null); }
  };
  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Set<EntityCategory>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  // Cuando la entidad activa cambia (típicamente por click en el highlight
  // del PDF) auto-expandir la categoría que la contiene y scrollear al item.
  useEffect(() => {
    if (!activeEntityId) return;
    const ent = entities.find((e) => e.id === activeEntityId);
    if (!ent) return;

    setCollapsed((prev) => {
      if (!prev.has(ent.category)) return prev;
      const next = new Set(prev);
      next.delete(ent.category);
      return next;
    });

    // Esperar al siguiente frame para que el item ya esté pintado si la
    // categoría se acaba de expandir, y luego centrarlo en el panel.
    const raf = requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(
        `[data-entity-id="${activeEntityId}"]`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeEntityId, entities]);

  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = !f
      ? entities
      : entities.filter((e) =>
          e.text.toLowerCase().includes(f) || e.label.toLowerCase().includes(f) || e.class.toLowerCase().includes(f)
        );

    const groups: Partial<Record<EntityCategory, Entity[]>> = {};
    for (const ent of filtered) {
      if (!groups[ent.category]) groups[ent.category] = [];
      groups[ent.category]!.push(ent);
    }

    // Orden estable por categoría
    const order: EntityCategory[] = [
      'identificacion', 'partes', 'propiedad', 'valor', 'gravamen', 'estado', 'normativa', 'profesional', 'otro',
    ];
    return order
      .filter((c) => (groups[c]?.length ?? 0) > 0)
      .map((c) => ({ category: c, entities: groups[c]! }));
  }, [entities, filter]);

  const toggle = (c: EntityCategory) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const totalShown = grouped.reduce((acc, g) => acc + g.entities.length, 0);

  return (
    <aside className="h-full flex flex-col bg-[#F8F5EE] border-l border-[#E5DFD3]">
      {/* Header con metadata del documento */}
      <header className="px-5 py-4 border-b border-[#E5DFD3] bg-[#FBF9F2]">
        <div className="smallcaps text-[#A47148] mb-1">Reconocimiento de entidades</div>
        <h2 className="font-serif text-[20px] text-[#0B1F3A] font-medium leading-tight truncate" title={documentName}>
          {documentName}
        </h2>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#6B6B6B]">
          <span className="smallcaps">{documentType}</span>
          {confidence > 0 && (
            <>
              <span>·</span>
              <span className="tabular">Confianza global {(confidence * 100).toFixed(0)}%</span>
            </>
          )}
        </div>
      </header>

      {/* Search */}
      <div className="px-5 py-3 border-b border-[#E5DFD3]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B6B6B]" strokeWidth={1.5} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar entidades…"
            className="w-full pl-8 pr-8 py-2 bg-white border border-[#E5DFD3] focus:border-[#A47148] rounded-[2px] text-[12px] focus:outline-none"
          />
          {filter && (
            <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#0B1F3A]">
              <X className="w-3 h-3" strokeWidth={1.5} />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] tracking-[0.14em] uppercase text-[#6B6B6B]">
          <span>{totalShown} de {entities.length} entidades</span>
          <span>{grouped.length} categorías</span>
        </div>
      </div>

      {/* Lista de categorías */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {grouped.length === 0 && (
          <div className="px-5 py-12 text-center text-[#6B6B6B]">
            <FileQuestion className="w-8 h-8 mx-auto mb-3 opacity-40" strokeWidth={1.25} />
            <p className="font-serif italic text-[14px]">Sin entidades que coincidan</p>
          </div>
        )}

        {grouped.map(({ category, entities: items }) => {
          const meta = CATEGORY_META[category];
          const Icon = ICON_MAP[meta.iconName] ?? FileQuestion;
          const isCollapsed = collapsed.has(category);

          return (
            <section key={category} className="border-b border-[#E5DFD3]">
              <button
                onClick={() => toggle(category)}
                className="w-full px-5 py-3 flex items-center gap-2.5 hover:bg-[#FBF9F2] transition-colors cursor-pointer"
              >
                {isCollapsed
                  ? <ChevronRight className="w-3.5 h-3.5 text-[#6B6B6B]" strokeWidth={1.5} />
                  : <ChevronDown className="w-3.5 h-3.5 text-[#6B6B6B]" strokeWidth={1.5} />}
                <span
                  className="w-7 h-7 rounded-[2px] flex items-center justify-center"
                  style={{ background: meta.fill, color: meta.ink, border: `1px solid ${meta.ink}40` }}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                </span>
                <span className="flex-1 text-left smallcaps" style={{ color: meta.ink }}>{meta.label}</span>
                <span className="text-[11px] tabular text-[#6B6B6B]">{items.length}</span>
              </button>

              {!isCollapsed && (
                <ul className="pb-2">
                  {items.map((ent) => {
                    const isActive = ent.id === activeEntityId;
                    return (
                      <li key={ent.id}>
                        <button
                          onClick={() => onSelect(ent.id)}
                          data-entity-id={ent.id}
                          className={`w-full text-left pl-[3.4rem] pr-5 py-2.5 transition-colors cursor-pointer ${
                            isActive ? 'bg-white border-l-2 -ml-px' : 'hover:bg-[#FBF9F2] border-l-2 border-transparent -ml-px'
                          }`}
                          style={isActive ? { borderLeftColor: meta.ink } : undefined}
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[10px] tracking-[0.14em] uppercase font-medium" style={{ color: meta.ink }}>
                              {ent.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {ent.fuente_texto === 'ocr' && (
                                <span
                                  title={ent.confianza_ocr != null
                                    ? `Texto reconocido por OCR · confianza ${Math.round(ent.confianza_ocr * 100)}%`
                                    : 'Texto reconocido por OCR (no aparece literal en el PDF)'}
                                  className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] tracking-[0.1em] uppercase rounded-[2px] bg-[#FFF4D6] text-[#7A5A00] border border-[#E5C97E]"
                                >
                                  <ScanLine className="w-2.5 h-2.5" strokeWidth={1.75} /> OCR
                                </span>
                              )}
                              {ent.pagina != null && (
                                <span className="text-[9px] tabular text-[#6B6B6B]" title={`Página ${ent.pagina}`}>
                                  p.{ent.pagina}
                                </span>
                              )}
                              {ent.confidence !== undefined && ent.confidence > 0 && (
                                <span className="text-[10px] tabular text-[#6B6B6B]">{Math.round(ent.confidence * 100)}%</span>
                              )}
                            </div>
                          </div>
                          <div
                            className="text-[13px] text-[#1C1C1C] leading-snug break-words"
                            style={{ borderLeft: isActive ? `2px solid ${meta.ink}` : 'none', paddingLeft: isActive ? 8 : 0 }}
                          >
                            «{ent.text}»
                          </div>
                          {ent.attributes && Object.keys(ent.attributes).length > 0 && (
                            <dl className="mt-1.5 grid grid-cols-[40%_60%] gap-x-2 gap-y-0.5 text-[10.5px] text-[#6B6B6B]">
                              {Object.entries(ent.attributes).map(([k, v]) => (
                                <div key={k} className="contents">
                                  <dt className="smallcaps">{k}</dt>
                                  <dd className="text-right text-[#1C1C1C] truncate font-mono tabular">{String(v)}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          {isActive && (
                            <AnchorActions
                              entity={ent}
                              pendingAction={pendingAction}
                              onConfirm={(id) => runAction(id, onConfirmAnchor)}
                              onReject={(id) => runAction(id, onRejectAnchor)}
                              onDelete={(id) => runAction(id, onDeleteAnchor)}
                              metaInk={meta.ink}
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Leyenda de colores */}
      <footer className="px-5 py-3 border-t border-[#E5DFD3] bg-[#FBF9F2]">
        <div className="smallcaps text-[#6B6B6B] mb-2">Leyenda</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_META) as EntityCategory[]).map((c) => {
            const m = CATEGORY_META[c];
            return (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] tracking-[0.08em] uppercase rounded-[2px]"
                style={{ background: m.fill, color: m.ink, border: `1px solid ${m.ink}30` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.ink }} /> {m.short}
              </span>
            );
          })}
        </div>
      </footer>
    </aside>
  );
}


/**
 * AnchorActions · botones de Confirmar / Rechazar / Borrar sobre el
 * primer anchor activo de la entidad. Solo se renderiza cuando la entidad
 * tiene anchors persistidos (id_anchor >= 0); las entidades legacy sin
 * anchors no muestran acciones.
 *
 * Reglas:
 *  - Anchor 'auto' propuesto: Confirmar + Rechazar
 *  - Anchor 'auto' confirmado: solo Rechazar (botón "Volver a proponer")
 *  - Anchor 'manual': Borrar (DELETE físico)
 */
function AnchorActions({
  entity, pendingAction, onConfirm, onReject, onDelete, metaInk,
}: {
  entity: Entity;
  pendingAction: number | null;
  onConfirm: (id: number) => Promise<void> | void;
  onReject: (id: number) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
  metaInk: string;
}) {
  const anchors: EntityAnchor[] = (entity.anchors ?? []).filter(
    (a) => a.estado !== 'rechazado' && a.id_anchor >= 0,
  );
  if (anchors.length === 0) return null;
  const primary = anchors[0];
  const busy = pendingAction === primary.id_anchor;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {/* Badge de origen del anchor primario */}
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] tracking-[0.1em] uppercase rounded-[2px] bg-white border"
        style={{ borderColor: `${metaInk}40`, color: metaInk }}
        title={primary.origen === 'manual'
          ? 'Anchor agregado por el abogado'
          : 'Anchor propuesto automáticamente por el extractor'}
      >
        {primary.origen === 'manual'
          ? <><Hand className="w-2.5 h-2.5" strokeWidth={1.75} /> Manual</>
          : <><Sparkles className="w-2.5 h-2.5" strokeWidth={1.75} /> Auto</>}
        {primary.estado === 'confirmado' && (
          <span className="ml-0.5">· confirmado</span>
        )}
      </span>

      {/* Botones según origen + estado */}
      {primary.origen === 'auto' && primary.estado === 'propuesto' && (
        <>
          <button
            disabled={busy}
            onClick={() => onConfirm(primary.id_anchor)}
            className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 border border-[#E5DFD3] hover:border-[#2F5D3C] hover:text-[#2F5D3C] disabled:opacity-50 rounded-[2px] inline-flex items-center gap-1"
          >
            <Check className="w-3 h-3" strokeWidth={1.5} /> Confirmar
          </button>
          <button
            disabled={busy}
            onClick={() => onReject(primary.id_anchor)}
            className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 border border-[#E5DFD3] hover:border-[#7E1F1F] hover:text-[#7E1F1F] disabled:opacity-50 rounded-[2px] inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" strokeWidth={1.5} /> Rechazar
          </button>
        </>
      )}

      {primary.origen === 'auto' && primary.estado === 'confirmado' && (
        <button
          disabled={busy}
          onClick={() => onReject(primary.id_anchor)}
          className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 border border-[#E5DFD3] hover:border-[#7E1F1F] hover:text-[#7E1F1F] disabled:opacity-50 rounded-[2px] inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" strokeWidth={1.5} /> Deshacer
        </button>
      )}

      {primary.origen === 'manual' && (
        <button
          disabled={busy}
          onClick={() => onDelete(primary.id_anchor)}
          className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 border border-[#E5DFD3] hover:border-[#7E1F1F] hover:text-[#7E1F1F] disabled:opacity-50 rounded-[2px] inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} /> Borrar
        </button>
      )}

      {anchors.length > 1 && (
        <span className="text-[10px] tabular text-[#6B6B6B]">
          · {anchors.length - 1} más
        </span>
      )}
    </div>
  );
}

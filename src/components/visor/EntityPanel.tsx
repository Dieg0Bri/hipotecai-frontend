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
  Search, X, ChevronDown, ChevronRight, Edit3, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { CATEGORY_META, type Entity, type EntityCategory } from '@/data/entities';

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
}

export default function EntityPanel({
  entities, activeEntityId, onSelect, documentName, documentType, confidence,
}: Props) {
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
                            {ent.confidence !== undefined && ent.confidence > 0 && (
                              <span className="text-[10px] tabular text-[#6B6B6B]">{Math.round(ent.confidence * 100)}%</span>
                            )}
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
                            <div className="mt-2 flex items-center gap-1.5">
                              <button className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 border border-[#E5DFD3] hover:border-[#A47148] rounded-[2px] inline-flex items-center gap-1">
                                <Edit3 className="w-3 h-3" strokeWidth={1.5} /> Editar
                              </button>
                              <button className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 border border-[#E5DFD3] hover:border-[#2F5D3C] hover:text-[#2F5D3C] rounded-[2px] inline-flex items-center gap-1">
                                <Check className="w-3 h-3" strokeWidth={1.5} /> Aprobar
                              </button>
                            </div>
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

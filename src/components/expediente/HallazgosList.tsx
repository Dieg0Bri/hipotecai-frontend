'use client';

/**
 * HallazgosList · resultado del verificacion-legal-api
 * --------------------------------------------------------------
 * Muestra los hallazgos ordenados por severidad. Cada fila tiene un
 * nivel cromático (burgundy/amber/bronze/mute) y un acordeón con
 * detalle + recomendación + acciones.
 */
import { useState } from 'react';
import { AlertOctagon, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight, CheckCircle2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Hallazgo, SeveridadHallazgo } from '@/data/types';

const SEV: Record<SeveridadHallazgo, {
  label: string;
  icon: LucideIcon;
  text: string;
  bg: string;
  border: string;
  order: number;
}> = {
  critica:  { label: 'Crítica',  icon: AlertOctagon,  text: '#7E1F1F', bg: 'rgba(126, 31, 31, 0.04)', border: '#7E1F1F', order: 0 },
  alta:     { label: 'Alta',     icon: AlertTriangle, text: '#A06820', bg: 'rgba(160, 104, 32, 0.04)', border: '#A06820', order: 1 },
  media:    { label: 'Media',    icon: AlertCircle,   text: '#A47148', bg: 'rgba(164, 113, 72, 0.04)', border: '#A47148', order: 2 },
  baja:     { label: 'Baja',     icon: Info,          text: '#6B6B6B', bg: 'transparent', border: '#D9D1BE', order: 3 },
  info:     { label: 'Info',     icon: Info,          text: '#6B6B6B', bg: 'transparent', border: '#D9D1BE', order: 4 },
};

export default function HallazgosList({ hallazgos }: { hallazgos: Hallazgo[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set([1]));

  if (hallazgos.length === 0) {
    return (
      <div className="paper-card p-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-[#2F5D3C] mx-auto mb-4" strokeWidth={1.25} />
        <h3 className="font-serif text-[24px] text-[#0B1F3A] font-medium mb-2">Sin hallazgos abiertos</h3>
        <p className="text-[14px] text-[#3F3F3F] max-w-md mx-auto">
          La verificación legal no detectó incongruencias en este expediente. Puede continuar con la emisión del informe.
        </p>
      </div>
    );
  }

  // ordenar por severidad
  const sorted = [...hallazgos].sort((a, b) => SEV[a.severidad].order - SEV[b.severidad].order);

  // resumen por severidad
  const counts = sorted.reduce<Record<SeveridadHallazgo, number>>((acc, h) => {
    acc[h.severidad] = (acc[h.severidad] || 0) + 1;
    return acc;
  }, { critica: 0, alta: 0, media: 0, baja: 0, info: 0 });

  return (
    <div>
      {/* Resumen */}
      <div className="paper-card p-5 mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <span className="smallcaps text-[#A47148]">Resumen</span>
        {(['critica', 'alta', 'media', 'baja', 'info'] as SeveridadHallazgo[])
          .filter((s) => counts[s] > 0)
          .map((s) => {
            const cfg = SEV[s];
            const Icon = cfg.icon;
            return (
              <div key={s} className="flex items-center gap-2">
                <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: cfg.text }} />
                <span className="text-[13px]" style={{ color: cfg.text }}>
                  <span className="font-serif text-[20px] tabular leading-none">{counts[s]}</span>{' '}
                  <span className="smallcaps">{cfg.label.toLowerCase()}</span>
                </span>
              </div>
            );
          })}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {sorted.map((h) => {
          const isOpen = open.has(h.id_hallazgo);
          const cfg = SEV[h.severidad];
          const Icon = cfg.icon;

          return (
            <div
              key={h.id_hallazgo}
              className="paper-card overflow-hidden transition-all"
              style={{ background: cfg.bg, borderColor: cfg.border }}
            >
              <button
                onClick={() => {
                  setOpen((prev) => {
                    const next = new Set(prev);
                    if (next.has(h.id_hallazgo)) next.delete(h.id_hallazgo);
                    else next.add(h.id_hallazgo);
                    return next;
                  });
                }}
                className="w-full px-6 py-5 flex items-start gap-4 text-left hover:bg-[#FBF9F2] transition-colors cursor-pointer"
              >
                {isOpen
                  ? <ChevronDown className="w-4 h-4 mt-1 flex-shrink-0" strokeWidth={1.5} style={{ color: cfg.text }} />
                  : <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0" strokeWidth={1.5} style={{ color: cfg.text }} />}

                <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center border rounded-[2px]" style={{ borderColor: cfg.border, color: cfg.text }}>
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="smallcaps" style={{ color: cfg.text }}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] tracking-[0.14em] uppercase text-[#6B6B6B] font-mono tabular">
                      {h.regla_id}
                    </span>
                  </div>
                  <h4 className="font-serif text-[18px] text-[#0B1F3A] font-medium leading-tight">
                    {h.titulo}
                  </h4>
                  {!isOpen && (
                    <p className="text-[13px] text-[#3F3F3F] mt-1.5 line-clamp-2 leading-relaxed">
                      {h.descripcion}
                    </p>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pl-[5.75rem] fade-up">
                  <p className="text-[14px] text-[#1C1C1C] leading-relaxed mb-4">{h.descripcion}</p>

                  {h.detalle && Object.keys(h.detalle).length > 0 && (
                    <div className="paper-card p-4 mb-4 bg-[#FFFEF9]">
                      <div className="smallcaps text-[#A47148] mb-2">Detalle técnico</div>
                      <dl className="space-y-1.5">
                        {Object.entries(h.detalle).map(([k, v]) => (
                          <div key={k} className="flex items-start gap-3 text-[12px]">
                            <dt className="smallcaps text-[#6B6B6B] flex-shrink-0 min-w-[10rem]">{k.replace(/_/g, ' ')}</dt>
                            <dd className="text-[#1C1C1C] font-mono tabular break-all">{String(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {h.recomendacion && (
                    <div className="border-l-2 pl-4 mb-5" style={{ borderColor: cfg.border }}>
                      <div className="smallcaps mb-1" style={{ color: cfg.text }}>Recomendación</div>
                      <p className="font-serif italic text-[14px] text-[#1C1C1C] leading-relaxed">{h.recomendacion}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button className="btn-bronze inline-flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer">
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Marcar resuelto
                    </button>
                    <button className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px]">
                      Agregar nota
                    </button>
                    <button className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px]">
                      <X className="w-3.5 h-3.5" strokeWidth={1.5} /> Descartar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

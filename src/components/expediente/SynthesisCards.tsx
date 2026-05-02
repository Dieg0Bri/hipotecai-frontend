/**
 * SynthesisCards · vista consolidada del inmueble
 * --------------------------------------------------------------
 * 6 cards (uno por fuente documental) con los campos clave que el
 * sintetizador-api unificó en el grafo del inmueble.
 */
import {
  ScrollText, ShieldAlert, Banknote, Building2, Map, Compass, AlertCircle, Check, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SintesisCard, SintesisResumen, TipoDocumento } from '@/data/types';

const ICONS: Record<TipoDocumento | 'ninguna', LucideIcon> = {
  escritura:                 ScrollText,
  cert_dominio_vigente:      ScrollText,
  cert_hipotecas_gravamenes: ShieldAlert,
  cert_avaluo_sii:           Banknote,
  cert_municipal:            Building2,
  plano_propiedad:           Compass,
  plan_regulador:            Map,
  otro:                      ScrollText,
  ninguna:                   ScrollText,
};

const fmtBoolean = (v: boolean) =>
  v ? (
    <span className="inline-flex items-center gap-1 text-[#2F5D3C]">
      <Check className="w-3 h-3" strokeWidth={2} /> Sí
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[#7E1F1F]">
      <X className="w-3 h-3" strokeWidth={2} /> No
    </span>
  );

export default function SynthesisCards({
  cards,
  resumen,
}: {
  cards: SintesisCard[];
  resumen: SintesisResumen;
}) {
  return (
    <div className="space-y-6">
      {/* Resumen */}
      <SintesisResumenBar resumen={resumen} />

      {/* Cards en grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.source} card={card} />
        ))}
      </div>
    </div>
  );
}

function SintesisResumenBar({ resumen }: { resumen: SintesisResumen }) {
  const tone = resumen.cobertura_pct >= 85 ? '#2F5D3C' : resumen.cobertura_pct >= 50 ? '#A06820' : '#7E1F1F';
  return (
    <div className="paper-card p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <div className="smallcaps text-[#6B6B6B] mb-2">Cobertura documental</div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[34px] leading-none tabular" style={{ color: tone }}>
              {resumen.cobertura_pct.toFixed(0)}%
            </span>
            <span className="text-[12px] text-[#6B6B6B]">
              {resumen.schemas_presentes.length} de {resumen.schemas_presentes.length + resumen.schemas_faltantes.length}
            </span>
          </div>
          <div className="mt-2 h-[3px] bg-[#E5DFD3] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-700" style={{ width: `${resumen.cobertura_pct}%`, background: tone }} />
          </div>
        </div>

        <div>
          <div className="smallcaps text-[#6B6B6B] mb-2">Documentos faltantes</div>
          {resumen.schemas_faltantes.length === 0 ? (
            <p className="font-serif italic text-[#2F5D3C] text-[15px]">Todos los documentos del catálogo están presentes.</p>
          ) : (
            <ul className="space-y-1">
              {resumen.schemas_faltantes.map((s) => (
                <li key={s} className="text-[12px] text-[#3F3F3F]">· {s.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="smallcaps text-[#6B6B6B] mb-2">Incongruencias detectadas</div>
          <div className="flex items-baseline gap-2">
            <span className={`font-serif text-[34px] leading-none tabular ${resumen.n_incongruencias > 0 ? 'text-[#A06820]' : 'text-[#2F5D3C]'}`}>
              {resumen.n_incongruencias}
            </span>
            <span className="text-[12px] text-[#6B6B6B]">en cruces inter-fuente</span>
          </div>
          {resumen.n_incongruencias > 0 && (
            <p className="text-[11px] text-[#6B6B6B] mt-2">Ver pestaña Hallazgos abajo para el detalle.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ card }: { card: SintesisCard }) {
  const Icon = ICONS[card.source];
  return (
    <div className="paper-card p-6 relative">
      {card.warning && (
        <div className="absolute top-3 right-3" title={card.warning}>
          <AlertCircle className="w-4 h-4 text-[#A06820]" strokeWidth={1.5} />
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E5DFD3]">
        <div className="w-9 h-9 border border-[#A47148] rounded-[2px] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#A47148]" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <h3 className="font-serif text-[18px] text-[#0B1F3A] font-medium leading-tight">{card.label}</h3>
          {card.fecha_emision && (
            <p className="text-[11px] text-[#6B6B6B] tabular mt-0.5">Emitido: {card.fecha_emision}</p>
          )}
        </div>
      </div>

      <dl className="space-y-2.5">
        {card.campos.map((c) => (
          <div key={c.key} className="grid grid-cols-[45%_55%] gap-3 items-start">
            <dt className="smallcaps text-[#6B6B6B] truncate">{c.label}</dt>
            <dd className="text-[13px] text-[#1C1C1C] text-right break-words">
              {typeof c.value === 'boolean' ? fmtBoolean(c.value) : c.value === null ? <span className="text-[#B5AC97]">—</span> : String(c.value)}
            </dd>
          </div>
        ))}
      </dl>

      {card.warning && (
        <div className="mt-4 pt-3 border-t border-dashed border-[#A06820]/40">
          <p className="text-[11px] text-[#A06820] leading-relaxed">{card.warning}</p>
        </div>
      )}
    </div>
  );
}

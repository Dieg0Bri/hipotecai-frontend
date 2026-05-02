/**
 * ExpedienteHeader · carátula del estudio hipotecario
 * --------------------------------------------------------------
 * Encabezado tipo papel timbrado: folio, rol, dirección, cliente,
 * estado y letrado a cargo. Inspirado en la carátula de "Nuevo
 * estudio" pero con datos reales del expediente activo.
 */
import { Building2, Calendar, MapPin, Hash, Clock, Scale, ScrollText } from 'lucide-react';
import Chip from '@/components/ui/Chip';
import Ornament from '@/components/brand/Ornament';
import type { Estudio } from '@/data/types';

const ESTADO_CHIP: Record<Estudio['estado'], { tone: 'mute' | 'amber' | 'forest' | 'burgundy'; label: string }> = {
  borrador:    { tone: 'mute',     label: 'Borrador' },
  en_analisis: { tone: 'amber',    label: 'En análisis' },
  observado:   { tone: 'burgundy', label: 'Observado' },
  verificado:  { tone: 'forest',   label: 'Verificado' },
  archivado:   { tone: 'mute',     label: 'Archivado' },
};

// timeZone fijo para evitar hydration mismatch (server UTC vs client local)
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'America/Santiago' }).format(new Date(iso));

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(iso));

export default function ExpedienteHeader({ estudio }: { estudio: Estudio }) {
  const estadoChip = ESTADO_CHIP[estudio.estado];

  return (
    <section className="paper-card p-10 sm:p-14 fade-up relative overflow-hidden">
      <CornerOrnaments />

      {/* eyebrow */}
      <div className="text-center mb-2 flex items-center justify-center gap-3">
        <span className="smallcaps text-[#A47148]">Expediente activo</span>
        <span className="text-[#A47148]">·</span>
        <Chip tone={estadoChip.tone}>{estadoChip.label}</Chip>
      </div>

      {/* Folio + dirección */}
      <h1 className="font-serif text-center text-[36px] sm:text-[48px] leading-[1.05] tracking-[-0.015em] text-[#0B1F3A] font-medium">
        {estudio.folio}
      </h1>
      <p className="font-serif text-center italic text-[20px] sm:text-[24px] text-[#3F3F3F] mt-1">
        {estudio.direccion}
      </p>

      <Ornament tone="bronze" className="my-6 max-w-md mx-auto" />

      {/* Datos en tres columnas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto">
        <Field icon={Hash}     label="Rol SII"           value={<span className="font-mono tabular text-[14px]">{estudio.rol_sii}</span>} />
        <Field icon={MapPin}   label="Comuna"            value={`${estudio.comuna}`} />
        <Field icon={Building2} label="Cliente"          value={estudio.cliente_nombre} />
        <Field icon={Scale}    label="Letrado a cargo"   value={estudio.letrado_nombre} />
        <Field icon={Calendar} label="Fecha de apertura" value={<span className="font-serif italic" suppressHydrationWarning>{fmtDate(estudio.fecha_apertura)}</span>} />
        <Field icon={Clock}    label="Plazo solicitado"  value={`${estudio.plazo_dias} días hábiles`} />
        <Field icon={ScrollText} label="Hora de apertura" value={<span className="tabular text-[13px]" suppressHydrationWarning>{fmtTime(estudio.fecha_apertura)} h</span>} />
        <Field icon={Building2} label="Tipo de mandante" value={<span className="capitalize">{estudio.cliente_tipo}</span>} />
      </div>

      {/* Encargo */}
      {estudio.encargo && (
        <div className="mt-8 max-w-3xl mx-auto pt-6 border-t border-[#E5DFD3]">
          <div className="smallcaps text-[#A47148] mb-2 text-center">Naturaleza del encargo</div>
          <p className="font-serif italic text-[16px] text-[#1C1C1C] leading-relaxed text-center">
            «{estudio.encargo}»
          </p>
        </div>
      )}
    </section>
  );
}

/* ─── helpers ─── */

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <Icon className="w-3.5 h-3.5 text-[#A47148] mx-auto mb-2" strokeWidth={1.5} />
      <div className="smallcaps text-[#6B6B6B] mb-1.5">{label}</div>
      <div className="text-[14px] text-[#1C1C1C]">{value}</div>
    </div>
  );
}

function CornerOrnaments() {
  const corners = [
    { className: 'top-4 left-4', rotation: '' },
    { className: 'top-4 right-4', rotation: 'rotate-90' },
    { className: 'bottom-4 left-4', rotation: '-rotate-90' },
    { className: 'bottom-4 right-4', rotation: 'rotate-180' },
  ];
  return (
    <>
      {corners.map((c) => (
        <svg
          key={c.className}
          className={`absolute ${c.className} ${c.rotation} w-8 h-8 text-[#A47148] opacity-50`}
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden
        >
          <path d="M0 0 L32 0 M0 0 L0 32" stroke="currentColor" strokeWidth="0.7" />
          <circle cx="2" cy="2" r="0.8" fill="currentColor" />
        </svg>
      ))}
    </>
  );
}

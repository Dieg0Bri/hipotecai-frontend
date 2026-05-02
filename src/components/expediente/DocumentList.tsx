'use client';

/**
 * DocumentList · documentos del expediente con extracciones expandibles
 * --------------------------------------------------------------
 * Tabla registral con tipo (chip), estado del pipeline, confianza y
 * última actividad. Cada fila se expande para mostrar:
 *   · campos extraídos por langextract
 *   · enlace al visor del documento (PDF + entidades)
 *   · estado de revisión editable
 */
import { useState } from 'react';
import {
  FileText, ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertCircle,
  ScanSearch, MoreHorizontal, FileSearch,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Chip from '@/components/ui/Chip';
import type {
  Archivo, EstadoProcesamiento, EstadoRevision, TipoDocumento,
} from '@/data/types';

const TIPO_TONE: Record<TipoDocumento, 'navy' | 'forest' | 'amber' | 'bronze' | 'mute' | 'burgundy'> = {
  escritura:                 'navy',
  cert_dominio_vigente:      'forest',
  cert_hipotecas_gravamenes: 'burgundy',
  cert_avaluo_sii:           'amber',
  cert_municipal:            'bronze',
  plano_propiedad:           'navy',
  plan_regulador:            'forest',
  otro:                      'mute',
};

const PROCESO_LABEL: Record<EstadoProcesamiento, { label: string; tone: 'forest' | 'amber' | 'navy' | 'mute' | 'burgundy'; icon?: 'spin' | 'check' | 'alert' }> = {
  recibido:     { label: 'Recibido',      tone: 'mute' },
  clasificando: { label: 'Clasificando',  tone: 'amber', icon: 'spin' },
  clasificado:  { label: 'Clasificado',   tone: 'navy' },
  extrayendo:   { label: 'Extrayendo',    tone: 'amber', icon: 'spin' },
  procesado:    { label: 'Procesado',     tone: 'forest', icon: 'check' },
  error:        { label: 'Error',         tone: 'burgundy', icon: 'alert' },
};

const REVISION_LABEL: Record<EstadoRevision, { label: string; tone: 'forest' | 'amber' | 'mute' | 'burgundy' }> = {
  pendiente: { label: 'Pendiente', tone: 'mute' },
  aprobado:  { label: 'Aprobado',  tone: 'forest' },
  observado: { label: 'Observado', tone: 'amber' },
  rechazado: { label: 'Rechazado', tone: 'burgundy' },
};

const fmtSize = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }).format(new Date(iso));

export default function DocumentList({ archivos }: { archivos: Archivo[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const params = useParams<{ folio: string }>();
  const folio = params?.folio ?? '';

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="paper-card overflow-hidden">
      <table className="registro-table">
        <thead>
          <tr>
            <th className="w-10"></th>
            <th className="w-12">#</th>
            <th>Documento</th>
            <th className="w-44">Tipo</th>
            <th className="w-32">Pipeline</th>
            <th className="w-28">Revisión</th>
            <th className="w-20 text-right">Confianza</th>
            <th className="w-20 text-right">Hora</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {archivos.map((a, i) => {
            const isOpen = expanded.has(a.id_archivo);
            const proc = PROCESO_LABEL[a.estado_procesamiento];
            const rev = REVISION_LABEL[a.estado_revision];
            const canExpand = !!a.extraccion;

            return (
              <ExpandableRow
                key={a.id_archivo}
                isOpen={isOpen}
                onToggle={() => canExpand && toggle(a.id_archivo)}
                disabled={!canExpand}
                index={i + 1}
                archivo={a}
                proc={proc}
                rev={rev}
                folio={folio}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── helpers ─── */

type RowProps = {
  isOpen: boolean;
  onToggle: () => void;
  disabled: boolean;
  index: number;
  archivo: Archivo;
  proc: typeof PROCESO_LABEL[EstadoProcesamiento];
  rev: typeof REVISION_LABEL[EstadoRevision];
  folio: string;
};

function ExpandableRow({ isOpen, onToggle, disabled, index, archivo, proc, rev, folio }: RowProps) {
  const visorHref = folio ? `/estudios/${folio}/documentos/${archivo.id_archivo}` : '#';
  return (
    <>
      <tr
        onClick={disabled ? undefined : onToggle}
        className={`${disabled ? 'opacity-60' : 'cursor-pointer'}`}
      >
        <td className="!py-3.5">
          {!disabled && (
            isOpen
              ? <ChevronDown className="w-4 h-4 text-[#A47148]" strokeWidth={1.5} />
              : <ChevronRight className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
          )}
        </td>
        <td className="font-mono tabular text-[11px] text-[#6B6B6B]">{String(index).padStart(2, '0')}</td>
        <td>
          <div className="flex items-start gap-2.5">
            <FileText className="w-4 h-4 mt-0.5 text-[#A47148] flex-shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <Link
                href={visorHref}
                onClick={(e) => e.stopPropagation()}
                className="text-[13px] text-[#1C1C1C] truncate block hover:text-[#A47148] transition-colors"
              >
                {archivo.nombre}
              </Link>
              <div className="text-[11px] text-[#6B6B6B] tabular mt-0.5">{fmtSize(archivo.size_bytes)}</div>
            </div>
          </div>
        </td>
        <td>
          <Chip tone={TIPO_TONE[archivo.tipo]}>{archivo.tipo_nombre}</Chip>
        </td>
        <td>
          <ProcessingChip proc={proc} />
        </td>
        <td>
          <Chip tone={rev.tone}>{rev.label}</Chip>
        </td>
        <td className="text-right tabular text-[13px] text-[#1C1C1C]">
          {archivo.confianza > 0 ? `${(archivo.confianza * 100).toFixed(0)}%` : '—'}
        </td>
        <td className="text-right tabular text-[12px] text-[#6B6B6B]" suppressHydrationWarning>{fmtTime(archivo.fecha_subida)}</td>
        <td className="text-right">
          <button
            className="text-[#6B6B6B] hover:text-[#0B1F3A] p-1.5 rounded-[2px] hover:bg-[#FBF9F2]"
            onClick={(e) => {
              e.stopPropagation();
              alert('v0: menú contextual del archivo');
            }}
            aria-label="Más"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </td>
      </tr>

      {isOpen && archivo.extraccion && (
        <tr className="bg-[#FBF9F2]">
          <td colSpan={9} className="!p-0">
            <ExtractionPanel archivo={archivo} folio={folio} />
          </td>
        </tr>
      )}
    </>
  );
}

function ProcessingChip({ proc }: { proc: typeof PROCESO_LABEL[EstadoProcesamiento] }) {
  const Icon = proc.icon === 'spin' ? Loader2 : proc.icon === 'check' ? CheckCircle2 : proc.icon === 'alert' ? AlertCircle : null;
  return (
    <Chip tone={proc.tone}>
      {Icon && <Icon className={`w-3 h-3 ${proc.icon === 'spin' ? 'animate-spin' : ''}`} strokeWidth={1.75} />}
      {proc.label}
    </Chip>
  );
}

function ExtractionPanel({ archivo, folio }: { archivo: Archivo; folio: string }) {
  const datos = archivo.extraccion as Record<string, unknown>;
  const entries = Object.entries(datos).filter(([, v]) => v !== null && v !== undefined && v !== '');
  const visorHref = folio ? `/estudios/${folio}/documentos/${archivo.id_archivo}` : '#';

  return (
    <div className="px-10 py-6 border-t border-[#E5DFD3] border-l-2 border-l-[#A47148]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScanSearch className="w-4 h-4 text-[#A47148]" strokeWidth={1.5} />
          <span className="smallcaps text-[#A47148]">Extracción langextract</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={visorHref}
            className="btn-bronze inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer"
          >
            <FileSearch className="w-3 h-3" strokeWidth={1.5} /> Abrir visor
          </Link>
          <button className="btn-ghost px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] rounded-[2px]">
            Marcar revisado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2.5">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-[40%_60%] gap-3 py-2 border-b border-[#E5DFD3] last:border-0"
          >
            <div className="smallcaps text-[#6B6B6B] truncate">{key.replace(/_/g, ' ')}</div>
            <div className="text-[13px] text-[#1C1C1C] text-right break-words">
              {formatValue(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(v: unknown): React.ReactNode {
  if (v === null || v === undefined) return <span className="text-[#B5AC97]">—</span>;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return <span className="font-mono tabular">{v.toLocaleString('es-CL')}</span>;
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-[#B5AC97]">—</span>;
    return (
      <ul className="text-right space-y-1">
        {v.map((item, i) => (
          <li key={i} className="text-[12px]">
            {typeof item === 'object' ? <em className="text-[#3F3F3F]">{JSON.stringify(item)}</em> : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof v === 'object') {
    return <em className="text-[12px] text-[#3F3F3F] font-mono">{JSON.stringify(v)}</em>;
  }
  return String(v);
}

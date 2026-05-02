'use client';

/**
 * /estudios · cartera de estudios hipotecarios (datos reales)
 * --------------------------------------------------------------
 * Listado conectado a estudios-service. Filtra por estado + búsqueda
 * server-side. Muestra el avance (calculado desde estado_procesamiento de
 * los archivos) cuando viene del backend.
 */

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, Building2, Clock, ArrowRight, PlusCircle, Loader2,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Chip from '@/components/ui/Chip';
import Ornament from '@/components/brand/Ornament';
import { listEstudios, type EstudioListItem } from '@/lib/estudio';

type EstadoTone = 'amber' | 'forest' | 'burgundy' | 'navy' | 'mute';

// Mapa de código de estado a tono visual del Chip.
const ESTADO_TONE: Record<string, EstadoTone> = {
  borrador:    'mute',
  en_analisis: 'amber',
  observado:   'burgundy',
  verificado:  'forest',
  archivado:   'navy',
};

const FILTROS: { key: string; label: string }[] = [
  { key: 'todos',       label: 'Todos' },
  { key: 'borrador',    label: 'En borrador' },
  { key: 'en_analisis', label: 'En análisis' },
  { key: 'observado',   label: 'Con observación' },
  { key: 'verificado',  label: 'Verificados' },
];

const fmtRelative = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'justo ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `hace ${Math.floor(diff / 86400)} d`;
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(d);
};

export default function EstudiosPage() {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<string>('todos');
  const [estudios, setEstudios] = useState<EstudioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEstudios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEstudios({
        estado: filtro === 'todos' ? undefined : filtro,
        search: search.trim() || undefined,
        limit: 100,
      });
      setEstudios(data);
    } catch (err) {
      setError((err as Error).message);
      setEstudios([]);
    } finally {
      setLoading(false);
    }
  }, [filtro, search]);

  // Refetch al cambiar filtro
  useEffect(() => {
    fetchEstudios();
  }, [fetchEstudios]);

  // Debounce de la búsqueda
  useEffect(() => {
    const id = setTimeout(fetchEstudios, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="min-h-screen flex flex-col paper-grain">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-14">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 fade-up">
          <div>
            <div className="smallcaps text-[#A47148] mb-3">Cartera</div>
            <h1 className="font-serif text-[44px] sm:text-[52px] leading-[1.04] tracking-[-0.015em] text-[#0B1F3A] font-medium">
              Estudios hipotecarios
            </h1>
            <p className="mt-2 text-[14px] text-[#3F3F3F] max-w-2xl">
              Cada folio es un análisis íntegro: documentos, extracciones, síntesis y verificación legal.
            </p>
          </div>
          <Link
            href="/estudios/nuevo"
            className="btn-bronze inline-flex items-center gap-2 px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-medium rounded-[2px] self-start lg:self-auto"
          >
            <PlusCircle className="w-4 h-4" strokeWidth={1.5} />
            Nuevo estudio
          </Link>
        </header>

        <Ornament tone="bronze" className="mb-10 max-w-md" />

        {/* Filtros */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por folio, rol, dirección o cliente…"
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5DFD3] focus:border-[#A47148] rounded-[2px] text-[14px] text-[#1C1C1C] placeholder:text-[#B5AC97] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="smallcaps text-[#6B6B6B] mr-2 hidden sm:inline">Estado</span>
            {FILTROS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`px-3 py-2 text-[12px] tracking-[0.04em] rounded-[2px] border transition-all cursor-pointer ${
                  filtro === f.key
                    ? 'bg-[#0B1F3A] border-[#0B1F3A] text-[#F8F5EE] font-medium'
                    : 'bg-transparent border-[#E5DFD3] text-[#3F3F3F] hover:border-[#A47148] hover:text-[#0B1F3A]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="paper-card overflow-hidden">
          <table className="registro-table">
            <thead>
              <tr>
                <th className="w-36">Folio</th>
                <th className="w-32">Rol SII</th>
                <th>Propiedad</th>
                <th>Cliente</th>
                <th className="w-28">Estado</th>
                <th className="w-36">Avance</th>
                <th className="w-24 text-right">Docs.</th>
                <th className="w-32 text-right">Últ. mov.</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-[#6B6B6B]">
                    <Loader2 className="w-5 h-5 inline animate-spin text-[#A47148]" strokeWidth={1.5} />
                    <span className="ml-3 text-[13px]">Cargando expedientes…</span>
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="font-serif italic text-[16px] text-[#7E1F1F]">No se pudo cargar la cartera.</div>
                    <p className="text-[12px] mt-1 text-[#6B6B6B]">{error}</p>
                    <button
                      onClick={fetchEstudios}
                      className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[#A47148] hover:text-[#0B1F3A]"
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              )}
              {!loading && !error && estudios.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-[#6B6B6B]">
                    <div className="font-serif italic text-[18px]">Sin estudios que coincidan con su búsqueda.</div>
                    <p className="text-[13px] mt-2">
                      <Link href="/estudios/nuevo" className="text-[#A47148] hover:text-[#0B1F3A]">
                        Abra un nuevo expediente
                      </Link>{' '}
                      para empezar.
                    </p>
                  </td>
                </tr>
              )}
              {!loading && !error && estudios.map((e) => {
                const tone = ESTADO_TONE[e.estado_codigo ?? 'borrador'] || 'mute';
                const avance = typeof e.avance === 'number' ? Math.round(e.avance) : 0;
                const docs = e.total_archivos ?? 0;
                return (
                  <tr key={e.folio}>
                    <td>
                      <Link
                        href={`/estudios/${encodeURIComponent(e.folio)}`}
                        className="font-mono tabular text-[12px] text-[#0B1F3A] hover:text-[#A47148] transition-colors"
                      >
                        {e.folio}
                      </Link>
                    </td>
                    <td className="font-mono tabular text-[13px] text-[#1C1C1C]">{e.rol_sii || '—'}</td>
                    <td>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-[#A47148] flex-shrink-0" strokeWidth={1.5} />
                        <div>
                          <div className="text-[#1C1C1C]">{e.direccion}</div>
                          <div className="text-[11px] text-[#6B6B6B] uppercase tracking-[0.08em] mt-0.5">{e.comuna}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-[#3F3F3F]">
                        <Building2 className="w-3.5 h-3.5 text-[#6B6B6B]" strokeWidth={1.5} />
                        <span className="truncate max-w-[14rem]">{e.cliente_nombre || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <Chip tone={tone}>{e.estado_nombre || e.estado_codigo || '—'}</Chip>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-[3px] bg-[#E5DFD3] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0B1F3A]" style={{ width: `${avance}%` }} />
                        </div>
                        <span className="text-[11px] tabular text-[#6B6B6B] w-8 text-right">{avance}%</span>
                      </div>
                    </td>
                    <td className="text-right tabular text-[#1C1C1C]">{docs}</td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-[#6B6B6B]" suppressHydrationWarning>
                        <Clock className="w-3 h-3" strokeWidth={1.5} />
                        {fmtRelative(e.ultima_actualizacion ?? e.fecha_creacion)}
                      </div>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/estudios/${encodeURIComponent(e.folio)}`}
                        className="inline-flex items-center justify-center w-8 h-8 text-[#0B1F3A] hover:text-[#A47148] hover:bg-[#FBF9F2] rounded-[2px] transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && !error && estudios.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-[12px] text-[#6B6B6B]">
            <span>Mostrando {estudios.length} expediente(s)</span>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

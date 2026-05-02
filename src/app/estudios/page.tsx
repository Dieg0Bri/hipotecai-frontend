'use client';

/**
 * /estudios · cartera de estudios hipotecarios
 * --------------------------------------------------------------
 * Listado tipo registro de propiedad: filtros sobrios arriba,
 * tabla densa abajo. Sin gradientes ni alegría visual gratuita.
 */

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Search, MapPin, Building2, Clock, ArrowRight, PlusCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Chip from '@/components/ui/Chip';
import Ornament from '@/components/brand/Ornament';

type EstadoTone = 'amber' | 'forest' | 'burgundy' | 'navy' | 'mute';

type Estudio = {
  id: string;
  rol: string;
  direccion: string;
  comuna: string;
  cliente: string;
  estado: string;
  estadoTone: EstadoTone;
  avance: number;
  documentos: number;
  ultima: string;
};

const ESTUDIOS: Estudio[] = [
  { id: 'EH-2026-0114', rol: '12.345-7', direccion: 'Av. Apoquindo 5400', comuna: 'Las Condes',     cliente: 'Mutuaria del Pacífico SpA', estado: 'En análisis',  estadoTone: 'amber',    avance: 64, documentos: 11, ultima: 'hace 2 h' },
  { id: 'EH-2026-0113', rol: '02.870-3', direccion: 'Pasaje Los Olmos 117', comuna: 'Ñuñoa',         cliente: 'Banco Bice',                estado: 'Verificado',   estadoTone: 'forest',   avance: 100, documentos: 9,  ultima: 'ayer' },
  { id: 'EH-2026-0112', rol: '08.991-K', direccion: 'Camino el Alba 12000', comuna: 'Lo Barnechea',  cliente: 'Inmobiliaria Las Encinas',  estado: 'Observado',    estadoTone: 'burgundy', avance: 89, documentos: 14, ultima: 'hace 3 d' },
  { id: 'EH-2026-0111', rol: '54.012-9', direccion: 'Vicuña Mackenna 9870', comuna: 'La Florida',    cliente: 'Particular - J. Soto',      estado: 'Borrador',     estadoTone: 'mute',     avance: 12, documentos: 3,  ultima: 'hace 5 d' },
  { id: 'EH-2026-0110', rol: '03.456-2', direccion: 'Pedro de Valdivia 200', comuna: 'Providencia',  cliente: 'Banco Santander Chile',     estado: 'En análisis',  estadoTone: 'amber',    avance: 41, documentos: 7,  ultima: 'hace 1 sem' },
  { id: 'EH-2026-0109', rol: '17.220-4', direccion: 'Caupolicán 458',        comuna: 'Concepción',   cliente: 'Mutuaria CChC',             estado: 'Verificado',   estadoTone: 'forest',   avance: 100, documentos: 12, ultima: 'hace 2 sem' },
];

const FILTROS: { key: string; label: string; count: number }[] = [
  { key: 'todos',      label: 'Todos',          count: 14 },
  { key: 'borrador',   label: 'En borrador',    count: 2 },
  { key: 'analisis',   label: 'En análisis',    count: 6 },
  { key: 'observado',  label: 'Con observación', count: 2 },
  { key: 'verificado', label: 'Verificados',    count: 4 },
];

export default function EstudiosPage() {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const visibles = useMemo(() => {
    return ESTUDIOS.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.rol.toLowerCase().includes(q) &&
          !e.direccion.toLowerCase().includes(q) &&
          !e.cliente.toLowerCase().includes(q) &&
          !e.id.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filtro === 'borrador' && e.estado !== 'Borrador') return false;
      if (filtro === 'analisis' && e.estado !== 'En análisis') return false;
      if (filtro === 'observado' && e.estado !== 'Observado') return false;
      if (filtro === 'verificado' && e.estado !== 'Verificado') return false;
      return true;
    });
  }, [search, filtro]);

  return (
    <div className="min-h-screen flex flex-col paper-grain">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-14">
        {/* ─── Header ─── */}
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

        {/* ─── Filtros ─── */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Buscador */}
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

          {/* Filtros chips */}
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
                {f.label} <span className="ml-1 opacity-70 tabular">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Tabla / registro ─── */}
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
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-[#6B6B6B]">
                    <div className="font-serif italic text-[18px]">Sin estudios que coincidan con su búsqueda.</div>
                    <p className="text-[13px] mt-2">Pruebe ajustar los filtros o la consulta.</p>
                  </td>
                </tr>
              )}
              {visibles.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link
                      href={`/estudios/${e.id}`}
                      className="font-mono tabular text-[12px] text-[#0B1F3A] hover:text-[#A47148] transition-colors"
                    >
                      {e.id}
                    </Link>
                  </td>
                  <td className="font-mono tabular text-[13px] text-[#1C1C1C]">{e.rol}</td>
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
                      <span className="truncate max-w-[14rem]">{e.cliente}</span>
                    </div>
                  </td>
                  <td>
                    <Chip tone={e.estadoTone}>{e.estado}</Chip>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-[3px] bg-[#E5DFD3] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0B1F3A]" style={{ width: `${e.avance}%` }} />
                      </div>
                      <span className="text-[11px] tabular text-[#6B6B6B] w-8 text-right">{e.avance}%</span>
                    </div>
                  </td>
                  <td className="text-right tabular text-[#1C1C1C]">{e.documentos}</td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
                      <Clock className="w-3 h-3" strokeWidth={1.5} />
                      {e.ultima}
                    </div>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/estudios/${e.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 text-[#0B1F3A] hover:text-[#A47148] hover:bg-[#FBF9F2] rounded-[2px] transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* paginador / footer registro */}
        <div className="mt-6 flex items-center justify-between text-[12px] text-[#6B6B6B]">
          <span>Mostrando {visibles.length} de {ESTUDIOS.length} estudios</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-[#E5DFD3] hover:border-[#A47148] rounded-[2px] text-[#3F3F3F] disabled:opacity-30" disabled>
              Anterior
            </button>
            <span className="px-3 py-1.5 border border-[#0B1F3A] bg-[#0B1F3A] text-[#F8F5EE] rounded-[2px] tabular">1</span>
            <button className="px-3 py-1.5 border border-[#E5DFD3] hover:border-[#A47148] rounded-[2px] text-[#3F3F3F]">
              Siguiente
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


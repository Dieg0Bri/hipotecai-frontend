'use client';

/**
 * /dashboard · home tras autenticación
 * --------------------------------------------------------------
 * Bienvenida sobria con datos del despacho, accesos directos a
 * las secciones principales y un resumen del último estudio.
 */

import Link from 'next/link';
import {
  PlusCircle, FolderOpen, Library, ArrowRight, Building2, MapPin,
  ScrollText, Scale, Clock,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Ornament from '@/components/brand/Ornament';
import Chip from '@/components/ui/Chip';
import RequireAuth from '@/components/auth/RequireAuth';

const TILES = [
  {
    href: '/estudios/nuevo',
    eyebrow: 'Encargo nuevo',
    title: 'Iniciar estudio',
    description: 'Cargue escrituras, certificados y planos de la propiedad para comenzar el análisis.',
    icon: PlusCircle,
    accent: '#A47148',
  },
  {
    href: '/estudios',
    eyebrow: 'Cartera activa',
    title: 'Mis estudios',
    description: 'Continúe el análisis donde lo dejó. Consulte el avance, los hallazgos y observaciones.',
    icon: FolderOpen,
    accent: '#0B1F3A',
  },
  {
    href: '/biblioteca',
    eyebrow: 'Referencia',
    title: 'Biblioteca legal',
    description: 'Plantillas, normativa de propiedad raíz, plan regulador y precedentes consultados.',
    icon: Library,
    accent: '#2F5D3C',
  },
];

const RECENT = [
  {
    rol: '12.345-7',
    direccion: 'Av. Apoquindo 5400, Las Condes',
    cliente: 'Mutuaria del Pacífico SpA',
    estado: 'En análisis',
    estadoTone: 'amber' as const,
    ultima: 'hace 2 horas',
    avance: 64,
  },
  {
    rol: '02.870-3',
    direccion: 'Pasaje Los Olmos 117, Ñuñoa',
    cliente: 'Banco Bice',
    estado: 'Verificado',
    estadoTone: 'forest' as const,
    ultima: 'ayer',
    avance: 100,
  },
  {
    rol: '08.991-K',
    direccion: 'Camino el Alba 12000, Lo Barnechea',
    cliente: 'Inmobiliaria Las Encinas',
    estado: 'Observado',
    estadoTone: 'burgundy' as const,
    ultima: 'hace 3 días',
    avance: 89,
  },
];

const KPIS = [
  { label: 'Estudios este mes', value: '14', delta: '+3' },
  { label: 'Promedio análisis', value: '4.2 h', delta: '−18%' },
  { label: 'Hallazgos críticos', value: '7', delta: '+1' },
  { label: 'Tasa de aprobación', value: '92%', delta: '+4 pts' },
];

export default function Dashboard() {
  return (
    <RequireAuth>
    <div className="min-h-screen flex flex-col paper-grain">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-14">
        {/* ─── Hero / saludo ─── */}
        <section className="fade-up">
          <div className="smallcaps text-[#A47148] mb-3">Despacho activo · Santiago</div>
          <h1 className="font-serif text-[44px] sm:text-[56px] leading-[1.02] tracking-[-0.015em] text-[#0B1F3A] font-medium max-w-3xl">
            Buenos días, <span className="italic text-[#A47148]">Diego</span>.
            <br />
            Hoy hay <span className="font-light">3 estudios</span> en su escritorio.
          </h1>
          <p className="mt-4 text-[15px] text-[#3F3F3F] max-w-2xl leading-relaxed">
            Continúe donde lo dejó o inicie un nuevo estudio hipotecario. La síntesis automática y los
            hallazgos quedan registrados para su revisión final.
          </p>
        </section>

        <Ornament tone="bronze" className="mt-12 mb-10 max-w-md" />

        {/* ─── KPIs ─── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E5DFD3] border border-[#E5DFD3] rounded-[2px] overflow-hidden mb-14">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-[#FBF9F2] p-6">
              <div className="smallcaps text-[#6B6B6B] mb-3">{k.label}</div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-[34px] text-[#0B1F3A] leading-none tabular">{k.value}</span>
                <span className="text-[11px] text-[#A47148] tracking-[0.08em]">{k.delta}</span>
              </div>
            </div>
          ))}
        </section>

        {/* ─── Tiles principales ─── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {TILES.map(({ href, eyebrow, title, description, icon: Icon, accent }) => (
            <Link
              key={href}
              href={href}
              className="group paper-card p-8 hover:shadow-md transition-all duration-300 relative overflow-hidden"
            >
              {/* esquina decorativa */}
              <div
                className="absolute top-0 right-0 w-12 h-[2px] transition-all duration-300 group-hover:w-24"
                style={{ background: accent }}
              />

              <div className="flex items-start justify-between mb-6">
                <div
                  className="w-11 h-11 flex items-center justify-center border rounded-[2px]"
                  style={{ borderColor: accent, color: accent }}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>

              <div className="smallcaps mb-3" style={{ color: accent }}>
                {eyebrow}
              </div>
              <h3 className="font-serif text-[28px] leading-[1.1] text-[#0B1F3A] tracking-[-0.01em] font-medium mb-3">
                {title}
              </h3>
              <p className="text-[13px] text-[#3F3F3F] leading-relaxed mb-8 min-h-[3em]">
                {description}
              </p>

              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-medium text-[#0B1F3A]">
                Ingresar
                <ArrowRight
                  className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </div>
            </Link>
          ))}
        </section>

        {/* ─── Últimos estudios (registro) ─── */}
        <section className="paper-card overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E5DFD3] flex items-center justify-between">
            <div>
              <div className="smallcaps text-[#A47148]">Registro reciente</div>
              <h2 className="font-serif text-[26px] text-[#0B1F3A] mt-1 font-medium">
                Últimos estudios
              </h2>
            </div>
            <Link
              href="/estudios"
              className="text-[12px] uppercase tracking-[0.14em] text-[#0B1F3A] hover:text-[#A47148] flex items-center gap-2 transition-colors"
            >
              Ver todos
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>

          <table className="registro-table">
            <thead>
              <tr>
                <th className="w-32">Rol SII</th>
                <th>Propiedad</th>
                <th>Cliente</th>
                <th className="w-28">Estado</th>
                <th className="w-32">Avance</th>
                <th className="w-32 text-right">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {RECENT.map((r) => (
                <tr key={r.rol} className="cursor-pointer">
                  <td className="font-mono tabular text-[13px] text-[#0B1F3A]">{r.rol}</td>
                  <td>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-[#A47148] flex-shrink-0" strokeWidth={1.5} />
                      <span className="text-[#1C1C1C]">{r.direccion}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-[#3F3F3F]">
                      <Building2 className="w-3.5 h-3.5 text-[#6B6B6B]" strokeWidth={1.5} />
                      {r.cliente}
                    </div>
                  </td>
                  <td>
                    <Chip tone={r.estadoTone}>{r.estado}</Chip>
                  </td>
                  <td>
                    <ProgressTrack value={r.avance} />
                  </td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
                      <Clock className="w-3 h-3" strokeWidth={1.5} />
                      {r.ultima}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ─── Marca de agua tipográfica ─── */}
        <div className="mt-20 flex items-center justify-center gap-4 text-[#A47148] opacity-50">
          <ScrollText className="w-4 h-4" strokeWidth={1.25} />
          <span className="font-serif text-[13px] italic tracking-wide">
            Lex non scripta · Lex scripta
          </span>
          <Scale className="w-4 h-4" strokeWidth={1.25} />
        </div>
      </main>

      <Footer />
    </div>
    </RequireAuth>
  );
}

function ProgressTrack({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-[3px] bg-[#E5DFD3] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0B1F3A] transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[11px] tabular text-[#6B6B6B] w-8 text-right">{value}%</span>
    </div>
  );
}


'use client';

/**
 * /estudios/[folio] · expediente abierto (datos reales)
 * --------------------------------------------------------------
 *  I.    Carátula con datos del estudio
 *  II.   Documentos cargados — clasificación editable + aprobación humana
 *        + botón "Procesar todo" gated por revision-stats
 *  III.  Documentos solicitados por triggers (IF/THEN del clasificador)
 *  IV.   Síntesis (mock por ahora — Slice 5)
 *  V.    Hallazgos legales (mock por ahora — Slice 5)
 *  VI.   Acciones de cierre
 */

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Sparkles, ScrollText, FileCheck2, Archive, Send, Loader2,
  CheckCircle2, AlertTriangle,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Ornament from '@/components/brand/Ornament';
import ExpedienteHeader from '@/components/expediente/ExpedienteHeader';
import DocumentReviewList from '@/components/expediente/DocumentReviewList';
import DocumentosSolicitadosPanel from '@/components/expediente/DocumentosSolicitadosPanel';
import SynthesisCards from '@/components/expediente/SynthesisCards';
import HallazgosList from '@/components/expediente/HallazgosList';

import {
  ESTUDIO_MOCK,
  SINTESIS_CARDS_MOCK,
  SINTESIS_RESUMEN_MOCK,
  HALLAZGOS_MOCK,
} from '@/data/mock-estudio';
import {
  getEstudio, getRevisionStats, procesarEstudio, listArchivos,
  type EstudioData, type RevisionStats, type ProcesarIniciado,
} from '@/lib/estudio';

interface PageProps {
  params: Promise<{ folio: string }>;
}

export default function ExpedientePage({ params }: PageProps) {
  const { folio } = use(params);

  const [estudio, setEstudio] = useState<EstudioData | null>(null);
  const [stats, setStats] = useState<RevisionStats | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [procesarMsg, setProcesarMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reviewKey, setReviewKey] = useState(0);
  const [activosExtrayendo, setActivosExtrayendo] = useState(0);

  const refreshStats = useCallback(async () => {
    try {
      const s = await getRevisionStats(folio);
      setStats(s);
    } catch {
      /* silencioso */
    }
  }, [folio]);

  // Cuenta cuántos archivos están en estado activo ('extrayendo' o 'clasificando')
  // para decidir si seguir haciendo polling.
  const refreshActivos = useCallback(async () => {
    try {
      const archivos = await listArchivos(folio);
      const activos = archivos.filter(
        (a) => a.estado_procesamiento === 'extrayendo' || a.estado_procesamiento === 'clasificando',
      ).length;
      setActivosExtrayendo(activos);
    } catch {
      /* silencioso */
    }
  }, [folio]);

  useEffect(() => {
    getEstudio(folio).then(setEstudio).catch(() => setEstudio(null));
    refreshStats();
    refreshActivos();
  }, [folio, refreshStats, refreshActivos]);

  // Polling automático cada 2.5s mientras hay archivos en estado activo
  // (background processing en estudios-service). Se apaga cuando llega a 0.
  useEffect(() => {
    if (activosExtrayendo === 0) return;
    const id = setInterval(() => {
      refreshActivos();
      refreshStats();
      setReviewKey((k) => k + 1); // fuerza al ReviewList a refrescar también
    }, 2500);
    return () => clearInterval(id);
  }, [activosExtrayendo, refreshActivos, refreshStats]);

  const handleProcesar = async () => {
    setIniciando(true);
    setProcesarMsg(null);
    try {
      const r = await procesarEstudio(folio);
      setProcesarMsg({
        ok: true,
        text: r.total > 0
          ? `Procesamiento iniciado: ${r.total} archivo(s) en cola.`
          : 'Nada nuevo para procesar.',
      });
      // Refresh inmediato + arranca polling vía activosExtrayendo
      setReviewKey((k) => k + 1);
      await Promise.all([refreshStats(), refreshActivos()]);
    } catch (err) {
      setProcesarMsg({ ok: false, text: (err as Error).message });
    } finally {
      setIniciando(false);
    }
  };

  // Hasta tener un endpoint real de estudio, el header usa lo que vino del backend
  // o cae al mock para campos no críticos.
  const estudioParaHeader = estudio
    ? {
        ...ESTUDIO_MOCK,
        folio: estudio.folio,
        rol_sii: estudio.rol_sii,
        direccion: estudio.direccion,
        comuna: estudio.comuna,
        region: estudio.region ?? ESTUDIO_MOCK.region,
        encargo: estudio.encargo ?? ESTUDIO_MOCK.encargo,
        plazo_dias: estudio.plazo_dias ?? ESTUDIO_MOCK.plazo_dias,
        cliente_nombre: estudio.cliente_nombre ?? ESTUDIO_MOCK.cliente_nombre,
      }
    : { ...ESTUDIO_MOCK, folio };

  const procesable = stats?.procesable ?? false;
  const total = stats?.total ?? 0;
  const aprobados = stats?.aprobados ?? 0;

  return (
    <div className="min-h-screen flex flex-col paper-grain">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/estudios"
            className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#6B6B6B] hover:text-[#0B1F3A] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            Volver a la cartera
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/estudios/nuevo"
              className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px]"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> Subir documento
            </Link>
            <button
              className="btn-bronze inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer"
              onClick={() => alert('v0+1: lanza /verificar en verificacion-legal-api')}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} /> Verificar legalmente
            </button>
          </div>
        </div>

        {/* I. Carátula */}
        <ExpedienteHeader estudio={estudioParaHeader} />

        {/* II. Documentos + revisión humana + procesar */}
        <section className="mt-12">
          <SectionHeader
            number="II"
            eyebrow="Sección segunda"
            title="Documentos del expediente"
            description="Revise la clasificación que la IA propuso para cada documento. Confirme o corrija antes de procesar las extracciones."
          />

          {/* Banner de procesamiento */}
          <div className="paper-card p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {activosExtrayendo > 0 ? (
                <Loader2 className="w-5 h-5 text-[#A47148] animate-spin" strokeWidth={1.5} />
              ) : procesable ? (
                <CheckCircle2 className="w-5 h-5 text-[#3A6B47]" strokeWidth={1.5} />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#A47148]" strokeWidth={1.5} />
              )}
              <div>
                <div className="font-serif text-[16px] text-[#0B1F3A] font-medium">
                  {activosExtrayendo > 0
                    ? `Procesando ${activosExtrayendo} archivo(s)…`
                    : procesable
                    ? 'Todos los documentos están aprobados.'
                    : `${aprobados} de ${total} documentos aprobados.`}
                </div>
                <div className="text-[11px] text-[#6B6B6B]">
                  {activosExtrayendo > 0
                    ? 'Las extracciones corren en background. Puede cerrar esta pestaña, el proceso sigue.'
                    : procesable
                    ? 'Puede procesar las extracciones del expediente.'
                    : 'Apruebe la clasificación de cada documento para habilitar el procesamiento.'}
                </div>
              </div>
            </div>
            <button
              onClick={handleProcesar}
              disabled={!procesable || iniciando || activosExtrayendo > 0}
              className="btn-bronze inline-flex items-center gap-2 px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {iniciando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  Iniciando…
                </>
              ) : activosExtrayendo > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  En proceso
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                  Procesar todo el expediente
                </>
              )}
            </button>
          </div>

          {procesarMsg && (
            <div className={`paper-card p-4 mb-4 border-l-2 ${procesarMsg.ok ? 'border-[#3A6B47]' : 'border-[#7E1F1F]'}`}>
              <div className={`smallcaps mb-1 ${procesarMsg.ok ? 'text-[#3A6B47]' : 'text-[#7E1F1F]'}`}>
                {procesarMsg.ok ? 'Procesamiento iniciado' : 'Error al procesar'}
              </div>
              <div className="text-[13px] text-[#3F3F3F]">{procesarMsg.text}</div>
            </div>
          )}

          <DocumentReviewList key={reviewKey} folio={folio} onChange={refreshStats} />
        </section>

        {/* III. Documentos solicitados (triggers IF/THEN) */}
        <section className="mt-12">
          <SectionHeader
            number="III"
            eyebrow="Sección tercera"
            title="Documentos pendientes solicitados"
            description="Antecedentes adicionales que el sistema detectó necesarios al revisar los documentos base (condominio, bien familiar, persona jurídica, usufructo, etc.)."
          />
          <DocumentosSolicitadosPanel folio={folio} />
        </section>

        {/* IV. Síntesis (mock — Slice 5) */}
        <section className="mt-12">
          <SectionHeader
            number="IV"
            eyebrow="Sección cuarta"
            title="Síntesis del inmueble"
            description="Datos consolidados de las extracciones por fuente documental, contrastados entre sí."
          />
          <SynthesisCards cards={SINTESIS_CARDS_MOCK} resumen={SINTESIS_RESUMEN_MOCK} />
        </section>

        {/* V. Hallazgos (mock — Slice 5) */}
        <section className="mt-12">
          <SectionHeader
            number="V"
            eyebrow="Sección quinta"
            title="Hallazgos de la verificación legal"
            description="Observaciones detectadas por el motor de reglas chilenas. Marque cada hallazgo como resuelto antes de cerrar el estudio."
          />
          <HallazgosList hallazgos={HALLAZGOS_MOCK} />
        </section>

        {/* VI. Acciones de cierre */}
        <section className="mt-12">
          <Ornament tone="bronze" className="mb-8 max-w-md mx-auto" />

          <div className="paper-card p-8 sm:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <span className="smallcaps text-[#A47148]">Sección sexta</span>
                <h2 className="font-serif text-[28px] sm:text-[32px] leading-[1.1] tracking-[-0.01em] text-[#0B1F3A] font-medium mt-1">
                  Cierre del expediente
                </h2>
                <p className="text-[13px] text-[#3F3F3F] mt-2 max-w-xl">
                  Una vez resueltos los hallazgos abiertos podrá emitir el informe de estudio hipotecario y entregarlo al cliente.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 self-start lg:self-auto">
                <button
                  className="btn-ghost inline-flex items-center gap-2 px-5 py-3 text-[12px] uppercase tracking-[0.14em] rounded-[2px]"
                  onClick={() => alert('v0+1: archiva el estudio')}
                >
                  <Archive className="w-3.5 h-3.5" strokeWidth={1.5} /> Archivar
                </button>
                <button
                  className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-[12px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer"
                  onClick={() => alert('v0+1: marca verificado en estudios-service')}
                >
                  <FileCheck2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Marcar verificado
                </button>
                <button
                  className="btn-bronze inline-flex items-center gap-2 px-5 py-3 text-[12px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer"
                  onClick={() => alert('v0+1: genera el informe en PDF')}
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={1.5} /> Emitir informe
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SectionHeader({
  number, eyebrow, title, description,
}: { number: string; eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-5 mb-5">
      <div className="font-serif text-[#A47148] text-[44px] leading-none italic select-none mt-[-4px] tabular">
        {number}.
      </div>
      <div className="flex-1">
        <div className="smallcaps text-[#A47148] mb-1">{eyebrow}</div>
        <h2 className="font-serif text-[28px] sm:text-[32px] leading-[1.1] tracking-[-0.01em] text-[#0B1F3A] font-medium">
          {title}
        </h2>
        <p className="text-[13px] text-[#3F3F3F] mt-1.5 max-w-2xl">{description}</p>
      </div>
    </div>
  );
}

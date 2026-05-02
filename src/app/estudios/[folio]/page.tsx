'use client';

/**
 * /estudios/[folio] · expediente abierto
 * --------------------------------------------------------------
 * Layout vertical en secciones (estilo expediente):
 *   I.   Carátula con datos del estudio
 *   II.  Documentos cargados (con extracción expandible)
 *   III. Síntesis del inmueble (cards consolidadas)
 *   IV.  Hallazgos legales
 *   V.   Acciones (cerrar / generar informe)
 *
 * v0: usa mock-estudio.ts. Cuando los servicios estén conectados,
 * los hooks `useEstudio(folio)`, `useArchivos(folio)`,
 * `useSintesis(folio)`, `useHallazgos(folio)` reemplazarán los datos.
 */

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Sparkles, ScrollText, FileCheck2, Archive, Send,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Ornament from '@/components/brand/Ornament';
import ExpedienteHeader from '@/components/expediente/ExpedienteHeader';
import DocumentList from '@/components/expediente/DocumentList';
import DocumentosSolicitadosPanel from '@/components/expediente/DocumentosSolicitadosPanel';
import SynthesisCards from '@/components/expediente/SynthesisCards';
import HallazgosList from '@/components/expediente/HallazgosList';

import {
  ESTUDIO_MOCK,
  ARCHIVOS_MOCK,
  SINTESIS_CARDS_MOCK,
  SINTESIS_RESUMEN_MOCK,
  HALLAZGOS_MOCK,
} from '@/data/mock-estudio';

interface PageProps {
  params: Promise<{ folio: string }>;
}

export default function ExpedientePage({ params }: PageProps) {
  const { folio } = use(params);

  // En v0 cargamos siempre el mismo mock; en próximas iteraciones
  // se buscará en backend por `folio`.
  const estudio = { ...ESTUDIO_MOCK, folio };
  const archivos = ARCHIVOS_MOCK;
  const sintesisCards = SINTESIS_CARDS_MOCK;
  const sintesisResumen = SINTESIS_RESUMEN_MOCK;
  const hallazgos = HALLAZGOS_MOCK;

  const procesados = archivos.filter((a) => a.estado_procesamiento === 'procesado').length;
  const enProgreso = archivos.length - procesados;

  return (
    <div className="min-h-screen flex flex-col paper-grain">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/estudios"
            className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#6B6B6B] hover:text-[#0B1F3A] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            Volver a la cartera
          </Link>

          <div className="flex items-center gap-2">
            <button className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px]">
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> Subir documento
            </button>
            <button
              className="btn-bronze inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer"
              onClick={() => alert('v0: lanza /verificar en verificacion-legal-api')}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} /> Verificar legalmente
            </button>
          </div>
        </div>

        {/* I. Carátula */}
        <ExpedienteHeader estudio={estudio} />

        {/* II. Documentos */}
        <section className="mt-12">
          <SectionHeader
            number="II"
            eyebrow="Sección segunda"
            title="Documentos del expediente"
            description={`${archivos.length} cargados · ${procesados} procesados · ${enProgreso} en progreso.`}
          />
          <DocumentList archivos={archivos} />
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

        {/* IV. Síntesis */}
        <section className="mt-12">
          <SectionHeader
            number="IV"
            eyebrow="Sección cuarta"
            title="Síntesis del inmueble"
            description="Datos consolidados de las extracciones por fuente documental, contrastados entre sí."
          />
          <SynthesisCards cards={sintesisCards} resumen={sintesisResumen} />
        </section>

        {/* V. Hallazgos */}
        <section className="mt-12">
          <SectionHeader
            number="V"
            eyebrow="Sección quinta"
            title="Hallazgos de la verificación legal"
            description="Observaciones detectadas por el motor de reglas chilenas. Marque cada hallazgo como resuelto antes de cerrar el estudio."
          />
          <HallazgosList hallazgos={hallazgos} />
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
                  onClick={() => alert('v0: archiva el estudio')}
                >
                  <Archive className="w-3.5 h-3.5" strokeWidth={1.5} /> Archivar
                </button>
                <button
                  className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-[12px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer"
                  onClick={() => alert('v0: marca verificado en estudios-service')}
                >
                  <FileCheck2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Marcar verificado
                </button>
                <button
                  className="btn-bronze inline-flex items-center gap-2 px-5 py-3 text-[12px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer"
                  onClick={() => alert('v0: genera el informe en PDF (próxima iteración)')}
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={1.5} /> Emitir informe
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Cita de cierre */}
        <div className="mt-16 flex items-center justify-center gap-4 text-[#A47148] opacity-60">
          <ScrollText className="w-4 h-4" strokeWidth={1.25} />
          <span className="font-serif text-[13px] italic tracking-wide">
            Veritas filia temporis
          </span>
          <ScrollText className="w-4 h-4 scale-x-[-1]" strokeWidth={1.25} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SectionHeader({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
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

'use client';

/**
 * /estudios/nuevo · creación de un estudio hipotecario
 * --------------------------------------------------------------
 * Composición tipo "carátula de expediente":
 *   1. Encabezado con folio sugerido y fecha de apertura
 *   2. Datos de la propiedad y cliente (formulario notarial)
 *   3. Zona de carga de documentos (acepta PDFs sueltos o ZIP)
 *   4. Resumen y confirmación
 *
 * Al apretar "Abrir expediente":
 *   1. POST estudios-service crea el estudio y devuelve folio
 *   2. Por cada archivo: signed-URL → PUT a GCS → confirm
 *   3. Eventarc dispara el clasificador automaticamente
 *   4. Redirect a /estudios/[folio]
 */

import { useState, useRef, useCallback, useEffect, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Upload, FileText, MapPin, Building2,
  Calendar, Hash, Trash2, ScrollText, FileCheck2, Check, AlertCircle, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Ornament from '@/components/brand/Ornament';
import { Field, TextField } from '@/components/ui/Field';
import Chip from '@/components/ui/Chip';
import { extractPdfsFromZip, isZipFile } from '@/lib/zipExtract';
import { createEstudio, uploadFileToFolio, type UploadStatus } from '@/lib/uploadFlow';
import { listClasificaciones, type TipoDocumento as TipoDocCatalogo } from '@/lib/catalogo';

type DocItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
};

export default function NuevoEstudio() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [expanding, setExpanding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [zipNotice, setZipNotice] = useState<string | null>(null);
  const [tiposBase, setTiposBase] = useState<TipoDocCatalogo[]>([]);
  const [form, setForm] = useState({
    rol: '',
    direccion: '',
    comuna: '',
    region: 'Metropolitana',
    cliente: '',
    encargo: '',
    plazoDias: 7,
  });

  const hoy = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(new Date());

  // Carga el catálogo de tipos de documento base al montar.
  useEffect(() => {
    listClasificaciones({ tipo: 'base' })
      .then(setTiposBase)
      .catch(() => setTiposBase([]));
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const items: DocItem[] = newFiles.map((f) => ({
      id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      file: f,
      status: 'pending',
      progress: 0,
    }));
    setDocs((prev) => [...prev, ...items]);
  }, []);

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setExpanding(true);
      setZipNotice(null);
      try {
        const collected: File[] = [];
        const ignoredAll: string[] = [];
        for (const f of Array.from(files)) {
          if (isZipFile(f)) {
            const { pdfs, ignored } = await extractPdfsFromZip(f);
            collected.push(...pdfs);
            ignoredAll.push(...ignored);
          } else {
            collected.push(f);
          }
        }
        addFiles(collected);
        if (ignoredAll.length > 0) {
          setZipNotice(`Se ignoraron ${ignoredAll.length} archivos no-PDF dentro del ZIP.`);
        }
      } catch (err) {
        setZipNotice(`Error abriendo ZIP: ${(err as Error).message}`);
      } finally {
        setExpanding(false);
      }
    },
    [addFiles]
  );

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDrag(false);
    onFiles(e.dataTransfer.files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles(e.target.files);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeDoc = (id: string) => setDocs((prev) => prev.filter((d) => d.id !== id));

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateDoc = (id: string, patch: Partial<DocItem>) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const canSubmit =
    !!form.rol && !!form.direccion && !!form.comuna && docs.length > 0 && !submitting && !expanding;

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!canSubmit) {
      setSubmitError('Complete los campos obligatorios y agregue al menos un documento.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createEstudio({
        rol_sii: form.rol,
        direccion: form.direccion,
        comuna: form.comuna,
        region: form.region,
        cliente: form.cliente || undefined,
        encargo: form.encargo || undefined,
        plazo_dias: form.plazoDias,
      });
      const folio = created.folio;

      for (const doc of docs) {
        if (doc.status === 'done' || doc.status === 'duplicate') continue;
        updateDoc(doc.id, { status: 'uploading', progress: 0, error: undefined });
        try {
          const result = await uploadFileToFolio(folio, doc.file, ({ loaded, total }) => {
            const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
            updateDoc(doc.id, { progress });
          });
          updateDoc(doc.id, {
            status: result.duplicate ? 'duplicate' : 'done',
            progress: 100,
          });
        } catch (err) {
          updateDoc(doc.id, { status: 'failed', error: (err as Error).message });
        }
      }

      const anyFailed = docs.some((d) => d.status === 'failed');
      if (!anyFailed) {
        router.push(`/estudios/${folio}`);
      } else {
        setSubmitError('Algunos archivos fallaron al subir. Revise la lista y reintente.');
      }
    } catch (err) {
      setSubmitError(`No se pudo abrir el expediente: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col paper-grain">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 lg:px-10 py-14">
        <Link
          href="/estudios"
          className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#6B6B6B] hover:text-[#0B1F3A] mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Volver a la cartera
        </Link>

        {/* ─── Carátula del expediente ─── */}
        <section className="paper-card p-10 sm:p-14 fade-up relative overflow-hidden">
          <CornerOrnaments />

          <div className="text-center mb-2">
            <span className="smallcaps text-[#A47148]">Apertura de expediente</span>
          </div>

          <h1 className="font-serif text-center text-[44px] sm:text-[56px] leading-[1.02] tracking-[-0.015em] text-[#0B1F3A] font-medium">
            Estudio hipotecario
          </h1>

          <Ornament tone="bronze" className="my-6 max-w-md mx-auto" />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
            <div>
              <div className="smallcaps text-[#6B6B6B] mb-1.5">Folio</div>
              <div className="font-mono tabular text-[15px] text-[#0B1F3A]">Asignado al abrir</div>
            </div>
            <div>
              <div className="smallcaps text-[#6B6B6B] mb-1.5">Fecha de apertura</div>
              <div className="font-serif text-[15px] text-[#1C1C1C] italic">{hoy}</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="smallcaps text-[#6B6B6B] mb-1.5">Letrado a cargo</div>
              <div className="text-[14px] text-[#1C1C1C]">D. Cabezas R.</div>
            </div>
          </div>
        </section>

        {/* ─── 1. Identificación de la propiedad ─── */}
        <section className="mt-10">
          <SectionHeader
            number="I"
            eyebrow="Sección primera"
            title="Identificación de la propiedad"
            description="Datos registrales del inmueble objeto del estudio."
          />

          <div className="paper-card p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <Field
              label="Rol SII"
              required
              placeholder="12.345-7"
              value={form.rol}
              onChange={(e) => update('rol', e.target.value)}
              rightAdornment={<Hash className="w-4 h-4" strokeWidth={1.5} />}
            />
            <Field
              label="Comuna"
              required
              placeholder="Las Condes"
              value={form.comuna}
              onChange={(e) => update('comuna', e.target.value)}
              rightAdornment={<MapPin className="w-4 h-4" strokeWidth={1.5} />}
            />
            <div className="md:col-span-2">
              <Field
                label="Dirección completa"
                required
                placeholder="Av. Apoquindo 5400, oficina 1404"
                value={form.direccion}
                onChange={(e) => update('direccion', e.target.value)}
              />
            </div>
            <Field
              label="Región"
              value={form.region}
              onChange={(e) => update('region', e.target.value)}
              hint="Por defecto Metropolitana"
            />
            <Field
              label="Plazo solicitado (días hábiles)"
              type="number"
              value={form.plazoDias}
              onChange={(e) => update('plazoDias', Number(e.target.value))}
              rightAdornment={<Calendar className="w-4 h-4" strokeWidth={1.5} />}
            />
          </div>
        </section>

        {/* ─── 2. Cliente y encargo ─── */}
        <section className="mt-12">
          <SectionHeader
            number="II"
            eyebrow="Sección segunda"
            title="Cliente y mandato"
            description="Quién encarga el estudio y bajo qué propósito."
          />

          <div className="paper-card p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2">
              <Field
                label="Cliente / mandante"
                placeholder="Razón social o nombre completo"
                value={form.cliente}
                onChange={(e) => update('cliente', e.target.value)}
                rightAdornment={<Building2 className="w-4 h-4" strokeWidth={1.5} />}
              />
            </div>
            <div className="md:col-span-2">
              <TextField
                label="Naturaleza del encargo"
                placeholder="Ej. Estudio previo a constitución de hipoteca a favor del cliente, para crédito hipotecario por UF 5.000…"
                value={form.encargo}
                onChange={(e) => update('encargo', e.target.value)}
                hint="Opcional · este texto queda en la carátula del expediente."
              />
            </div>
          </div>
        </section>

        {/* ─── 3. Documentos ─── */}
        <section className="mt-12">
          <SectionHeader
            number="III"
            eyebrow="Sección tercera"
            title="Acopio documental"
            description="Cargue las escrituras, certificados y planos disponibles. La clasificación es automática. Acepta PDFs sueltos o un ZIP con varios documentos adentro."
          />

          <div className="paper-card p-6 mb-6">
            <div className="smallcaps text-[#6B6B6B] mb-3">
              Documentos base esperados {tiposBase.length > 0 && <span className="text-[#A47148]">· {tiposBase.length}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {tiposBase.length === 0 ? (
                <div className="text-[12px] text-[#9B9B9B] italic">Cargando catálogo…</div>
              ) : (
                tiposBase.map((t) => (
                  <Chip key={t.codigo} tone="mute">
                    {t.nombre}
                  </Chip>
                ))
              )}
            </div>
            <div className="text-[11px] text-[#6B6B6B] italic mt-3">
              Documentos adicionales (condominio, bien familiar, persona jurídica, etc.) se solicitan
              automáticamente al detectar las condiciones en los documentos base.
            </div>
          </div>

          <label
            htmlFor="docs-input"
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            className={`block cursor-pointer paper-card p-12 text-center transition-all duration-200 ${
              drag ? 'border-[#A47148] bg-[#FBF9F2]' : ''
            } ${expanding ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 border border-[#A47148] rounded-[2px] flex items-center justify-center">
                {expanding ? (
                  <Loader2 className="w-6 h-6 text-[#A47148] animate-spin" strokeWidth={1.5} />
                ) : (
                  <Upload className="w-6 h-6 text-[#A47148]" strokeWidth={1.5} />
                )}
              </div>
              <div>
                <div className="font-serif text-[24px] text-[#0B1F3A] font-medium tracking-[-0.01em]">
                  {expanding ? 'Descomprimiendo…' : 'Arrastre los documentos'}
                </div>
                <p className="text-[13px] text-[#6B6B6B] mt-1.5">
                  o haga clic para seleccionarlos · PDF o ZIP · hasta 50 MB por archivo
                </p>
              </div>
              <span className="smallcaps text-[#A47148]">Máx. 30 archivos por estudio</span>
            </div>
            <input
              ref={fileRef}
              id="docs-input"
              type="file"
              multiple
              accept="application/pdf,application/zip,application/x-zip-compressed,.zip,.pdf"
              className="hidden"
              onChange={handleChange}
            />
          </label>

          {zipNotice && (
            <div className="mt-4 text-[12px] text-[#6B6B6B] italic">{zipNotice}</div>
          )}

          {docs.length > 0 && (
            <div className="paper-card mt-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5DFD3] flex items-center justify-between">
                <div>
                  <span className="smallcaps text-[#A47148]">Acopio</span>
                  <span className="ml-3 font-serif text-[18px] text-[#0B1F3A] font-medium">
                    {docs.length} {docs.length === 1 ? 'documento' : 'documentos'}
                  </span>
                </div>
                {!submitting && (
                  <button
                    onClick={() => setDocs([])}
                    className="text-[12px] uppercase tracking-[0.14em] text-[#6B6B6B] hover:text-[#7E1F1F] transition-colors"
                  >
                    Vaciar acopio
                  </button>
                )}
              </div>
              <ul>
                {docs.map((d, i) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-4 px-6 py-3.5 border-b border-[#E5DFD3] last:border-0 hover:bg-[#FBF9F2] transition-colors"
                  >
                    <span className="font-mono tabular text-[11px] text-[#6B6B6B] w-6">{String(i + 1).padStart(2, '0')}</span>
                    <FileText className="w-4 h-4 text-[#A47148]" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-[#1C1C1C] truncate">{d.name}</div>
                      <div className="text-[11px] text-[#6B6B6B] tabular flex items-center gap-3">
                        <span>{(d.size / 1024).toFixed(1)} KB</span>
                        {d.status === 'uploading' && (
                          <span className="text-[#A47148]">Subiendo… {d.progress}%</span>
                        )}
                        {d.error && <span className="text-[#7E1F1F] truncate">{d.error}</span>}
                      </div>
                    </div>
                    <StatusChip status={d.status} />
                    {!submitting && (
                      <button
                        onClick={() => removeDoc(d.id)}
                        className="text-[#6B6B6B] hover:text-[#7E1F1F] p-1.5 rounded-[2px] hover:bg-[#F8F5EE] transition-colors"
                        aria-label="Quitar"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ─── Confirmación / acciones ─── */}
        <section className="mt-12">
          <Ornament tone="bronze" className="mb-8 max-w-md mx-auto" />

          {submitError && (
            <div className="paper-card p-4 mb-6 border-l-2 border-[#7E1F1F]">
              <div className="smallcaps text-[#7E1F1F] mb-1">Error</div>
              <div className="text-[13px] text-[#3F3F3F]">{submitError}</div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <div className="font-serif italic text-[#3F3F3F] text-[15px]">
                «Toda escritura es prueba de sí misma.»
              </div>
              <div className="smallcaps text-[#A47148] mt-2">
                <ScrollText className="w-3 h-3 inline mr-1.5 -mt-0.5" strokeWidth={1.5} />
                Iniciar el procesamiento abrirá el expediente y comenzará la clasificación.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/estudios"
                className="btn-ghost px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-medium rounded-[2px] inline-flex items-center gap-2"
              >
                Cancelar
              </Link>
              <button
                disabled={!canSubmit}
                className="btn-bronze px-7 py-3 text-[12px] uppercase tracking-[0.14em] font-medium rounded-[2px] inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                    Subiendo…
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" strokeWidth={1.5} />
                    Abrir expediente
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function StatusChip({ status }: { status: UploadStatus }) {
  switch (status) {
    case 'pending':
      return <Chip tone="mute">Por subir</Chip>;
    case 'uploading':
      return <Chip tone="bronze">Subiendo</Chip>;
    case 'confirming':
      return <Chip tone="amber">Registrando</Chip>;
    case 'done':
      return (
        <Chip tone="forest">
          <Check className="w-3 h-3 inline mr-1" strokeWidth={2} />
          Subido
        </Chip>
      );
    case 'duplicate':
      return <Chip tone="mute">Duplicado</Chip>;
    case 'failed':
      return (
        <Chip tone="burgundy">
          <AlertCircle className="w-3 h-3 inline mr-1" strokeWidth={2} />
          Falló
        </Chip>
      );
  }
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

function CornerOrnaments() {
  return (
    <>
      <svg className="absolute top-4 left-4 w-8 h-8 text-[#A47148] opacity-60" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path d="M0 0 L32 0 M0 0 L0 32" stroke="currentColor" strokeWidth="0.7" />
        <circle cx="2" cy="2" r="0.8" fill="currentColor" />
      </svg>
      <svg className="absolute top-4 right-4 w-8 h-8 text-[#A47148] opacity-60 rotate-90" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path d="M0 0 L32 0 M0 0 L0 32" stroke="currentColor" strokeWidth="0.7" />
        <circle cx="2" cy="2" r="0.8" fill="currentColor" />
      </svg>
      <svg className="absolute bottom-4 left-4 w-8 h-8 text-[#A47148] opacity-60 -rotate-90" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path d="M0 0 L32 0 M0 0 L0 32" stroke="currentColor" strokeWidth="0.7" />
        <circle cx="2" cy="2" r="0.8" fill="currentColor" />
      </svg>
      <svg className="absolute bottom-4 right-4 w-8 h-8 text-[#A47148] opacity-60 rotate-180" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path d="M0 0 L32 0 M0 0 L0 32" stroke="currentColor" strokeWidth="0.7" />
        <circle cx="2" cy="2" r="0.8" fill="currentColor" />
      </svg>
    </>
  );
}

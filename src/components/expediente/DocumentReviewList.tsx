'use client';

/**
 * DocumentReviewList · listado de archivos del estudio con clasificación
 * editable y aprobación humana.
 *
 * Flujo:
 *   1. Eventarc clasifica el archivo (estado_revision='pendiente', id_clasificacion=sugerido)
 *   2. El letrado revisa: puede cambiar el tipo (dropdown contra catálogo)
 *      y aprobar la clasificación con un botón
 *   3. Cuando todos los archivos están aprobados, se desbloquea el botón
 *      "Procesar todo el expediente" en el header
 */
import { useEffect, useState, useCallback } from 'react';
import {
  FileText, CheckCircle2, AlertCircle, Loader2, ChevronDown, RefreshCw, RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import {
  listArchivos, updateArchivoMetadata, reprocesarArchivo, type ArchivoEstudio,
} from '@/lib/estudio';
import { listClasificaciones, type TipoDocumento } from '@/lib/catalogo';
import Chip from '@/components/ui/Chip';

interface Props {
  folio: string;
  onChange?: () => void; // notificar al padre para refrescar revision-stats
}

export default function DocumentReviewList({ folio, onChange }: Props) {
  const [archivos, setArchivos] = useState<ArchivoEstudio[]>([]);
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([listArchivos(folio), listClasificaciones()]);
      setArchivos(a);
      setTipos(t);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [folio]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const cambiarTipo = async (a: ArchivoEstudio, idClasif: number) => {
    setSavingId(a.id_archivo);
    try {
      const updated = await updateArchivoMetadata(folio, a.id_archivo, {
        id_clasificacion: idClasif,
        // cambiar tipo regresa a "pendiente" para que el letrado vuelva a aprobar
        estado_revision: 'pendiente',
      });
      setArchivos((prev) => prev.map((x) => (x.id_archivo === a.id_archivo ? mergeArchivo(x, updated) : x)));
      onChange?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const aprobar = async (a: ArchivoEstudio) => {
    setSavingId(a.id_archivo);
    try {
      const updated = await updateArchivoMetadata(folio, a.id_archivo, { estado_revision: 'aprobado' });
      setArchivos((prev) => prev.map((x) => (x.id_archivo === a.id_archivo ? mergeArchivo(x, updated) : x)));
      onChange?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const desaprobar = async (a: ArchivoEstudio) => {
    setSavingId(a.id_archivo);
    try {
      const updated = await updateArchivoMetadata(folio, a.id_archivo, { estado_revision: 'pendiente' });
      setArchivos((prev) => prev.map((x) => (x.id_archivo === a.id_archivo ? mergeArchivo(x, updated) : x)));
      onChange?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const reprocesar = async (a: ArchivoEstudio) => {
    // Marca optimista del estado mientras corre la llamada (~5–60 s).
    setArchivos((prev) =>
      prev.map((x) => (x.id_archivo === a.id_archivo ? { ...x, estado_procesamiento: 'extrayendo' } : x)),
    );
    try {
      const r = await reprocesarArchivo(folio, a.id_archivo);
      setArchivos((prev) =>
        prev.map((x) =>
          x.id_archivo === a.id_archivo
            ? { ...x, estado_procesamiento: r.ok ? 'procesado' : 'error' }
            : x,
        ),
      );
      onChange?.();
    } catch (err) {
      // Si falla la llamada en sí, dejamos en error.
      setArchivos((prev) =>
        prev.map((x) => (x.id_archivo === a.id_archivo ? { ...x, estado_procesamiento: 'error' } : x)),
      );
      setError((err as Error).message);
    }
  };

  if (loading && archivos.length === 0) {
    return (
      <div className="paper-card p-8 text-center">
        <Loader2 className="w-5 h-5 inline animate-spin text-[#A47148]" strokeWidth={1.5} />
        <span className="ml-3 text-[13px] text-[#6B6B6B]">Cargando archivos…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="paper-card p-4 border-l-2 border-[#7E1F1F]">
        <div className="smallcaps text-[#7E1F1F] mb-1">Error</div>
        <div className="text-[13px] text-[#3F3F3F]">{error}</div>
        <button onClick={refresh} className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[#A47148] hover:text-[#0B1F3A]">
          Reintentar
        </button>
      </div>
    );
  }

  if (archivos.length === 0) {
    return (
      <div className="paper-card p-8 text-center">
        <span className="text-[13px] text-[#6B6B6B]">Aún no se han subido documentos al expediente.</span>
      </div>
    );
  }

  return (
    <div className="paper-card overflow-hidden">
      <div className="px-6 py-3 border-b border-[#E5DFD3] flex items-center justify-between">
        <div className="text-[12px] text-[#6B6B6B]">
          La IA clasificó automáticamente. Confirmá o corrigí cada documento antes de procesar.
        </div>
        <button
          onClick={refresh}
          className="text-[#6B6B6B] hover:text-[#0B1F3A] p-1.5 rounded-[2px] hover:bg-[#FBF9F2]"
          aria-label="Refrescar"
          title="Refrescar"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
        </button>
      </div>

      <ul>
        {archivos.map((a, i) => (
          <ArchivoRow
            key={a.id_archivo}
            index={i + 1}
            archivo={a}
            tipos={tipos}
            saving={savingId === a.id_archivo}
            onCambiarTipo={(id) => cambiarTipo(a, id)}
            onAprobar={() => aprobar(a)}
            onDesaprobar={() => desaprobar(a)}
            onReprocesar={() => reprocesar(a)}
            folio={folio}
          />
        ))}
      </ul>
    </div>
  );
}

/* ──────────────────────── ArchivoRow ───────────────────────── */

interface RowProps {
  index: number;
  archivo: ArchivoEstudio;
  tipos: TipoDocumento[];
  saving: boolean;
  onCambiarTipo: (idClasif: number) => void;
  onAprobar: () => void;
  onDesaprobar: () => void;
  onReprocesar: () => void;
  folio: string;
}

function ArchivoRow({ index, archivo, tipos, saving, onCambiarTipo, onAprobar, onDesaprobar, onReprocesar, folio }: RowProps) {
  const aprobado = archivo.estado_revision === 'aprobado';
  const procesado = archivo.estado_procesamiento === 'procesado';
  const extrayendo = archivo.estado_procesamiento === 'extrayendo';
  const enError = archivo.estado_procesamiento === 'error';
  const sinClasif = archivo.id_clasificacion == null;

  // Agrupamos los tipos por categoría para el dropdown
  const tiposBase = tipos.filter((t) => t.tipo_categoria === 'base');
  const tiposCondicionales = tipos.filter((t) => t.tipo_categoria === 'condicional');

  return (
    <li className="px-6 py-4 border-b border-[#E5DFD3] last:border-0">
      <div className="flex items-start gap-4">
        <span className="font-mono tabular text-[11px] text-[#6B6B6B] w-6 mt-1">
          {String(index).padStart(2, '0')}
        </span>
        <FileText className="w-4 h-4 text-[#A47148] mt-1 flex-shrink-0" strokeWidth={1.5} />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <Link
              href={`/estudios/${folio}/documentos/${archivo.id_archivo}`}
              className="text-[13px] text-[#1C1C1C] hover:text-[#A47148] transition-colors truncate"
            >
              {archivo.nombre}
            </Link>
            <div className="flex items-center gap-2">
              {procesado && (
                <>
                  <Chip tone="forest">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" strokeWidth={2} />
                    Procesado
                  </Chip>
                  <button
                    onClick={onReprocesar}
                    disabled={saving || extrayendo}
                    title="Volver a procesar (re-extraer datos)"
                    className="text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B] hover:text-[#A47148] inline-flex items-center gap-1 px-2 py-1 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" strokeWidth={2} /> Reprocesar
                  </button>
                </>
              )}
              {extrayendo && (
                <Chip tone="amber">
                  <Loader2 className="w-3 h-3 inline mr-1 animate-spin" strokeWidth={2} />
                  Extrayendo
                </Chip>
              )}
              {enError && (
                <>
                  <Chip tone="burgundy">
                    <AlertCircle className="w-3 h-3 inline mr-1" strokeWidth={2} />
                    Error
                  </Chip>
                  <button
                    onClick={onReprocesar}
                    disabled={saving || extrayendo}
                    title="Reintentar extracción"
                    className="text-[10px] uppercase tracking-[0.14em] text-[#A47148] hover:text-[#0B1F3A] inline-flex items-center gap-1 px-2 py-1 border border-[#A47148] rounded-[2px] disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" strokeWidth={2} /> Reintentar
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="text-[11px] text-[#6B6B6B] tabular mt-0.5">
            {archivo.size_bytes ? `${(archivo.size_bytes / 1024).toFixed(1)} KB` : ''}
            {archivo.clasificacion_confianza != null && (
              <span className="ml-3">
                IA: {(archivo.clasificacion_confianza * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {/* Sugerencia IA + dropdown */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <div className="text-[11px] text-[#6B6B6B]">Tipo:</div>
            <div className="relative">
              <select
                disabled={saving || procesado || extrayendo}
                value={archivo.id_clasificacion ?? ''}
                onChange={(e) => onCambiarTipo(parseInt(e.target.value, 10))}
                className="appearance-none pr-8 pl-3 py-1.5 text-[12px] border border-[#E5DFD3] rounded-[2px] bg-white hover:border-[#A47148] focus:border-[#A47148] focus:outline-none disabled:opacity-50 disabled:bg-[#FBF9F2]"
              >
                {sinClasif && <option value="">(sin clasificar)</option>}
                {tiposBase.length > 0 && (
                  <optgroup label="Documentos base">
                    {tiposBase.map((t) => (
                      <option key={t.codigo} value={t.id}>{t.nombre}</option>
                    ))}
                  </optgroup>
                )}
                {tiposCondicionales.length > 0 && (
                  <optgroup label="Documentos condicionales">
                    {tiposCondicionales.map((t) => (
                      <option key={t.codigo} value={t.id}>{t.nombre}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#6B6B6B] pointer-events-none" strokeWidth={1.5} />
            </div>

            {/* Estado revisión + acción */}
            {aprobado ? (
              <button
                onClick={onDesaprobar}
                disabled={saving || procesado || extrayendo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] border border-[#3A6B47] text-[#3A6B47] rounded-[2px] hover:bg-[#F0F4EE] disabled:opacity-50"
                title="Quitar aprobación"
              >
                <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                Aprobado
              </button>
            ) : (
              <button
                onClick={onAprobar}
                disabled={saving || sinClasif || procesado || extrayendo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] border border-[#A47148] text-[#A47148] rounded-[2px] hover:bg-[#FBF9F2] disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : null}
                Aprobar
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function mergeArchivo(prev: ArchivoEstudio, updated: ArchivoEstudio): ArchivoEstudio {
  // El backend puede devolver solo los campos cambiados — preservamos lo no devuelto.
  return { ...prev, ...updated };
}

'use client';

/**
 * DocumentosSolicitadosPanel · documentos que el sistema le pidió al cliente
 * tras detectar condiciones especiales en los documentos base (triggers IF/THEN).
 *
 * Datos: GET /api-estudios/estudios/{folio}/documentos-solicitados
 * Mutaciones: PATCH para marcar como descartado / subido (cuando se vincule).
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Check, X, Loader2 } from 'lucide-react';
import {
  listDocumentosSolicitados,
  updateSolicitudEstado,
  type DocumentoSolicitado,
} from '@/lib/catalogo';

interface Props {
  folio: string;
}

const TRIGGER_ICONOS: Record<string, string> = {
  'T-CONDOMINIO': '🏢',
  'T-SUBSIDIO': '🏠',
  'T-RURAL': '🌳',
  'T-BIEN-FAMILIAR': '💍',
  'T-USUFRUCTO': '🗝',
  'T-INDIGENA': '📜',
  'T-PERSONA-JURIDICA': '🏛',
  'T-ALZAMIENTO': '🏦',
};

export default function DocumentosSolicitadosPanel({ folio }: Props) {
  const [items, setItems] = useState<DocumentoSolicitado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listDocumentosSolicitados(folio)
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [folio]);

  const descartar = async (id: number) => {
    try {
      await updateSolicitudEstado(folio, id, 'descartado');
      setItems((prev) =>
        prev.map((it) => (it.id_solicitud === id ? { ...it, estado: 'descartado' } : it)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="paper-card p-6 text-center">
        <Loader2 className="w-5 h-5 inline animate-spin text-[#A47148]" strokeWidth={1.5} />
        <span className="ml-3 text-[13px] text-[#6B6B6B]">Cargando solicitudes…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="paper-card p-4 border-l-2 border-[#7E1F1F]">
        <div className="smallcaps text-[#7E1F1F] mb-1">Error</div>
        <div className="text-[13px] text-[#3F3F3F]">{error}</div>
      </div>
    );
  }

  // Agrupar por trigger_id para que un mismo trigger que pide varios docs
  // se vea como un solo bloque.
  const porTrigger = items.reduce<Record<string, DocumentoSolicitado[]>>((acc, it) => {
    const key = `${it.trigger_id}::${it.id_archivo_origen ?? 'na'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(it);
    return acc;
  }, {});

  const grupos = Object.values(porTrigger);
  const pendientes = items.filter((i) => i.estado === 'pendiente').length;

  if (grupos.length === 0) {
    return (
      <div className="paper-card p-6 text-center">
        <Check className="w-5 h-5 inline text-[#3A6B47]" strokeWidth={1.5} />
        <span className="ml-3 text-[13px] text-[#3F3F3F]">
          No se han detectado condiciones especiales en los documentos base.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="smallcaps text-[#A47148]">
          Solicitudes del sistema {pendientes > 0 && <span className="text-[#7E1F1F]">· {pendientes} pendientes</span>}
        </div>
        <div className="text-[11px] text-[#6B6B6B] italic">
          Detectadas automáticamente por el clasificador
        </div>
      </div>

      {grupos.map((grupo) => {
        const head = grupo[0];
        const allResueltos = grupo.every((g) => g.estado !== 'pendiente');
        return (
          <div
            key={`${head.trigger_id}-${head.id_archivo_origen ?? 'na'}`}
            className={`paper-card p-6 border-l-2 ${
              allResueltos ? 'border-[#3A6B47]' : 'border-[#A47148]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-[28px] leading-none mt-1">
                {TRIGGER_ICONOS[head.trigger_id] || (
                  <AlertTriangle className="w-6 h-6 text-[#A47148]" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="font-serif text-[18px] text-[#0B1F3A] font-medium leading-tight">
                    {head.motivo}
                  </h3>
                  <span className="font-mono tabular text-[10px] text-[#6B6B6B] uppercase tracking-[0.1em]">
                    {head.trigger_id}
                  </span>
                </div>

                {head.matched_phrase && (
                  <div className="mt-2 text-[12px] text-[#6B6B6B] italic">
                    Detectado:{' '}
                    <span className="bg-[#FBF5E6] px-1.5 py-0.5 rounded-[2px]">
                      “{head.matched_phrase}”
                    </span>
                    {head.nombre_archivo_origen && (
                      <span className="ml-2 text-[#9B9B9B]">en {head.nombre_archivo_origen}</span>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <div className="smallcaps text-[#6B6B6B] mb-2">Documentos solicitados</div>
                  <ul className="space-y-2">
                    {grupo.map((sol) => (
                      <li
                        key={sol.id_solicitud}
                        className="flex items-center gap-3 px-3 py-2 border border-[#E5DFD3] rounded-[2px]"
                      >
                        <FileText className="w-4 h-4 text-[#A47148]" strokeWidth={1.5} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-[#1C1C1C]">{sol.nombre_solicitado}</div>
                          {sol.emisor && (
                            <div className="text-[11px] text-[#6B6B6B]">{sol.emisor}</div>
                          )}
                        </div>
                        {sol.estado === 'pendiente' && (
                          <button
                            onClick={() => descartar(sol.id_solicitud)}
                            className="text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B] hover:text-[#7E1F1F] px-2 py-1 transition-colors"
                            title="Descartar (no aplica a este caso)"
                          >
                            <X className="w-3 h-3" strokeWidth={2} />
                          </button>
                        )}
                        {sol.estado === 'subido' && (
                          <span className="text-[10px] uppercase tracking-[0.14em] text-[#3A6B47] inline-flex items-center gap-1">
                            <Check className="w-3 h-3" strokeWidth={2} /> Subido
                          </span>
                        )}
                        {sol.estado === 'descartado' && (
                          <span className="text-[10px] uppercase tracking-[0.14em] text-[#9B9B9B]">
                            Descartado
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

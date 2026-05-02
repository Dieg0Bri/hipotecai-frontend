/**
 * pdfGenerator — produce PDFs sintéticos para los mocks
 * --------------------------------------------------------------
 * Cuando no hay backend que sirva los archivos reales, generamos en
 * el cliente PDFs con jsPDF que contienen literalmente las entidades
 * extraídas. La idea es que el visor (react-pdf) y el highlight DOM
 * funcionen sin distinción entre PDF real y sintético.
 *
 * Devuelve un `Blob` URL listo para pasarse a `<Document file=...>`.
 */
import jsPDF from 'jspdf';

import type { Archivo, TipoDocumento } from '@/data/types';

interface DocumentBody {
  title: string;
  subtitle?: string;
  paragraphs: string[];
}

/**
 * Construye el cuerpo textual sintético del documento a partir del tipo
 * + extracción mock. El texto contiene las entidades en su contexto,
 * para que el highlight las encuentre en el text layer del PDF.
 */
function buildBody(archivo: Archivo): DocumentBody {
  const datos = (archivo.extraccion ?? {}) as Record<string, unknown>;
  const get = (k: string) => (datos[k] === undefined || datos[k] === null ? '' : String(datos[k]));

  switch (archivo.tipo) {
    case 'escritura':
      return {
        title: 'ESCRITURA PÚBLICA DE COMPRAVENTA',
        subtitle: `Repertorio N° 8745-2022 · Foja 4321`,
        paragraphs: [
          `En la ciudad de Santiago de Chile, a ${get('fecha_otorgamiento')}, ante mí, ${get('notario_nombre')}, Notario Público de la ${get('notaria_numero')}, comparecen, por una parte, doña ${(datos.vendedores as string[] | undefined)?.[0] ?? 'MARÍA SOTO ROJAS, RUT 12.345.678-9'}, soltera, dueña de casa, y por la otra, don ${(datos.compradores as string[] | undefined)?.[0] ?? 'PEDRO LÓPEZ ROJAS, RUT 9.876.543-2'}, casado, ingeniero civil, ambos domiciliados en esta ciudad, mayores de edad, quienes han convenido en celebrar el siguiente contrato de COMPRAVENTA.`,
          `PRIMERO. Doña MARÍA SOTO ROJAS vende, cede y transfiere a don PEDRO LÓPEZ ROJAS, quien acepta y compra para sí, el inmueble ubicado en ${get('direccion_propiedad')}, Rol de Avalúos N° ${get('rol_propiedad')}, comuna de Las Condes, con una superficie aproximada de ${get('superficie_m2')} m², que se encuentra inscrito a fojas 4321 número 8765 del Registro de Propiedad del Conservador de Bienes Raíces de Santiago, correspondiente al año 2018.`,
          `SEGUNDO. El precio de la compraventa es la suma de $ ${Number(get('precio_clp') || 0).toLocaleString('es-CL')}, equivalentes a UF ${get('precio_uf')}, que la compradora paga ${get('forma_pago')} en este acto, declarando la vendedora recibirla a su entera satisfacción.`,
          `TERCERO. La vendedora se obliga a entregar el inmueble en el estado en que se encuentra, libre de moradores, sin deudas pendientes y al día en sus contribuciones e impuesto territorial.`,
          `CUARTO. Las partes fijan domicilio en la ciudad de Santiago para todos los efectos del presente contrato y se someten a la jurisdicción de los tribunales ordinarios de justicia de esta ciudad.`,
          `En comprobante y previa lectura, firman.`,
        ],
      };

    case 'cert_dominio_vigente':
      return {
        title: 'CERTIFICADO DE DOMINIO VIGENTE',
        subtitle: get('cbr_emisor'),
        paragraphs: [
          `Santiago, ${get('fecha_emision')}.`,
          `El Conservador de Bienes Raíces de Santiago certifica que la propiedad inscrita a fojas ${get('foja')} número ${get('numero_inscripcion')} del Registro de Propiedad correspondiente al año ${get('anio_inscripcion')}, ubicada en ${get('direccion')}, Rol de Avalúos N° ${get('rol_propiedad')}, figura inscrita a nombre de ${get('titular_actual')}, ${get('titular_rut')}.`,
          `La inscripción referida se encuentra plenamente vigente a la fecha del presente certificado y no se han registrado transferencias ni inscripciones posteriores que alteren la situación dominical informada.`,
          `Se extiende el presente certificado a solicitud del interesado y para los fines a que haya lugar.`,
        ],
      };

    case 'cert_hipotecas_gravamenes':
      return {
        title: 'CERTIFICADO DE HIPOTECAS, GRAVÁMENES, PROHIBICIONES E INTERDICCIONES',
        subtitle: get('cbr_emisor'),
        paragraphs: [
          `Santiago, ${get('fecha_emision')}.`,
          `El Conservador de Bienes Raíces de Santiago certifica que la propiedad referida en la solicitud, registra los siguientes antecedentes:`,
          `a) Hipoteca a favor de Banco Bice por UF 3.200, inscrita a fojas 4321 número 8766 del Registro de Hipotecas del año 2020.`,
          `b) Prohibición de gravar y enajenar a favor de Banco Bice, asociada a la hipoteca anterior, inscrita a fojas 4321 número 8767 del Registro de Prohibiciones del año 2020.`,
          `c) No registra otros gravámenes, prohibiciones, interdicciones ni embargos vigentes.`,
          `En consecuencia, la propiedad NO se encuentra libre de gravámenes a la fecha del presente certificado.`,
          `Se extiende el presente certificado a solicitud del interesado y para los fines a que haya lugar.`,
        ],
      };

    case 'cert_avaluo_sii':
      return {
        title: 'CERTIFICADO DE AVALÚO FISCAL',
        subtitle: 'Servicio de Impuestos Internos · Subdirección de Avaluaciones',
        paragraphs: [
          `Fecha de emisión: ${get('fecha_emision')}.`,
          `Rol de avalúo: ${get('rol_avaluo')}. Comuna: ${get('comuna')}.`,
          `Avalúo total fiscal de la propiedad: $ ${Number(get('avaluo_total_clp') || 0).toLocaleString('es-CL')}, desglosado en avalúo de terreno por $ ${Number(get('avaluo_terreno_clp') || 0).toLocaleString('es-CL')} y avalúo de construcción por $ ${Number(get('avaluo_construccion_clp') || 0).toLocaleString('es-CL')}.`,
          `Superficie construida declarada: ${get('superficie_construida_m2')} m². Destino: ${get('destino')}.`,
          `La propiedad se encuentra afecta al pago de Impuesto Territorial (No exenta).`,
          `El presente certificado se emite para fines tributarios e informativos.`,
        ],
      };

    case 'cert_municipal':
      return {
        title: 'CERTIFICADO MUNICIPAL DE NÚMERO Y NO EXPROPIACIÓN',
        subtitle: 'Dirección de Obras Municipales',
        paragraphs: [
          `${get('municipalidad')}.`,
          `Las Condes, ${get('fecha_emision')}.`,
          `Se certifica que el inmueble ubicado en ${get('direccion_oficial')} tiene asignado el ${get('numero_municipal')} oficial.`,
          `Asimismo, se certifica que el referido inmueble NO se encuentra afecto a expropiación municipal vigente, según los antecedentes contenidos en el Plan Regulador Comunal y los proyectos de obras municipales en curso.`,
          `Recepción final otorgada con fecha 30-12-2018, según permiso de edificación N° 245-2017 emitido por esta Dirección de Obras Municipales.`,
          `El presente certificado se extiende para los fines administrativos correspondientes.`,
        ],
      };

    case 'plano_propiedad':
      return {
        title: 'PLANO DE PROPIEDAD',
        subtitle: 'Cajetín informativo · Cuadro de superficies',
        paragraphs: [
          `Tipo de plano: ${get('tipo_plano')}.`,
          `Comuna: Las Condes. Rol asociado: 12.345-7.`,
          `Superficie construida total: ${get('superficie_construida_m2')} m².`,
          `Profesional autor: ${get('profesional')}.`,
          `Fecha del plano: ${get('fecha_plano')}.`,
          `Deslindes generales: NORTE: pasaje común. SUR: predio Rol 12.345-8. ORIENTE: Av. Apoquindo en línea quebrada. PONIENTE: predio Rol 12.345-6.`,
          `El presente plano constituye documentación de respaldo del expediente y debe leerse en conjunto con la escritura pública y el certificado del Conservador de Bienes Raíces.`,
        ],
      };

    case 'plan_regulador':
      return {
        title: 'PLAN REGULADOR COMUNAL DE LAS CONDES',
        subtitle: 'Instrumento de Planificación Territorial',
        paragraphs: [
          `Comuna: ${get('comuna')}.`,
          `Zonificación aplicable: ${get('zonificacion')}.`,
          `Usos permitidos: ${(datos.usos_permitidos as string[] | undefined)?.join(', ') ?? 'residencial, oficina, comercio menor'}.`,
          `Altura máxima de edificación: ${get('altura_maxima')}.`,
          `Coeficiente de constructibilidad: ${get('coef_constructibilidad')}. Coeficiente de ocupación de suelo: ${get('coef_ocupacion_suelo')}.`,
          `El presente extracto del plan regulador se acompaña con fines exclusivamente informativos para el análisis de la operación hipotecaria.`,
        ],
      };

    default:
      return {
        title: archivo.tipo_nombre.toUpperCase(),
        paragraphs: [`Documento del expediente. Sin extracción disponible aún.`],
      };
  }
}

/**
 * Genera un PDF en memoria con jsPDF y devuelve un Blob URL.
 * El PDF queda con texto seleccionable (usa fuente Times) lo que
 * permite que pdfjs-dist construya el text layer y el highlight
 * funcione vía DOM.
 */
export function generatePdfBlobUrl(archivo: Archivo): string {
  const body = buildBody(archivo);

  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
    compress: true,
  });

  // Márgenes
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 64;
  const marginTop = 80;
  const marginBottom = 64;
  const contentWidth = pageWidth - marginX * 2;

  // Encabezado tipo papel timbrado
  doc.setFont('Times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Folio · hipotecai · ${archivo.id_archivo}`.toUpperCase(), marginX, 36, {
    charSpace: 1,
  });
  doc.setDrawColor(220, 200, 160);
  doc.setLineWidth(0.5);
  doc.line(marginX, 46, pageWidth - marginX, 46);

  // Título
  doc.setFont('Times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(11, 31, 58); // navy
  const titleLines = doc.splitTextToSize(body.title, contentWidth);
  doc.text(titleLines, pageWidth / 2, marginTop, { align: 'center' });
  let y = marginTop + titleLines.length * 18;

  if (body.subtitle) {
    doc.setFont('Times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(body.subtitle, pageWidth / 2, y + 14, { align: 'center' });
    y += 28;
  }

  // Ornamento simple (tres puntos)
  doc.setFontSize(12);
  doc.setTextColor(164, 113, 72); // bronce
  doc.text('· · ·', pageWidth / 2, y + 16, { align: 'center' });
  y += 36;

  // Cuerpo
  doc.setFont('Times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(28, 28, 28);
  doc.setLineHeightFactor(1.5);

  for (const p of body.paragraphs) {
    const lines = doc.splitTextToSize(p, contentWidth);
    const blockHeight = lines.length * 14 + 10;

    if (y + blockHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }

    doc.text(lines, marginX, y, { align: 'justify', maxWidth: contentWidth });
    y += blockHeight;
  }

  // Pie con firma estilizada
  if (y > pageHeight - marginBottom - 40) {
    doc.addPage();
    y = marginTop;
  }
  y += 16;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(marginX + 80, y, marginX + 240, y);
  doc.setFont('Times', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Firma autorizada', marginX + 100, y + 12);

  // Generar Blob URL
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

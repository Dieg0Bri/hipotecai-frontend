/**
 * Entidades extraídas por langextract — modelo + categorías legales.
 * --------------------------------------------------------------
 * Cada entidad mapea 1:1 con `lx.Extraction`:
 *   · class             → tipo de entidad (campo del schema)
 *   · text              → fragmento literal del documento (lo que se resalta)
 *   · attributes        → metadatos adicionales (acreedor, monto…)
 *   · char_interval     → offsets en el texto fuente (para el highlight)
 *   · confidence        → confianza de la extracción
 *
 * Para v0 las entidades se agrupan en CATEGORÍAS legales con un color
 * propio que el visor usa para resaltar el texto en el PDF.
 */

export type EntityCategory =
  | 'identificacion'    // foja, repertorio, fechas, número de inscripción
  | 'partes'            // vendedor, comprador, titular, RUT
  | 'propiedad'         // dirección, comuna, rol SII, superficie, deslindes
  | 'valor'             // precio CLP/UF, avalúos
  | 'profesional'       // notario, arquitecto
  | 'gravamen'          // hipotecas, prohibiciones, gravámenes
  | 'estado'            // libre de gravámenes, no expropiación, recepción final
  | 'normativa'         // zonificación, usos permitidos, coeficientes
  | 'otro';

/** Un anchor representa UNA ubicación concreta del campo en el documento.
 *  Una Entity puede tener N anchors (el extractor propuso uno + el abogado
 *  agregó otros en otras páginas). El visor dibuja TODOS los anchors
 *  visibles (estado != 'rechazado') y el panel muestra acciones por anchor.
 *
 *  Coordenadas:
 *  - `char_start`/`char_end` son offsets GLOBALES del texto ensamblado por
 *    el extractor (concat de todas las páginas). El frontend solo los
 *    usa como id de span — para pintar usa `bboxes` (OCR) o re-busca el
 *    `snippet` en el text-layer (pdf_text).
 *  - `bboxes` están en PUNTOS PDF (1/72") con origen top-left.
 */
export interface EntityAnchor {
  /** UUID v4 generado por el backend al crear el anchor. */
  id_anchor: string;
  page: number | null;
  char_start: number | null;
  char_end: number | null;
  snippet: string | null;
  fuente_texto: 'pdf_text' | 'ocr';
  bboxes: number[][] | null;
  origen: 'auto' | 'manual';
  estado: 'propuesto' | 'confirmado' | 'rechazado';
  confianza_ocr: number | null;
  creado_por: string | null;
}

export interface Entity {
  /** Identificador único dentro del documento (auto-generado) */
  id: string;
  /** Clase de la entidad (e.g. "rol_propiedad", "vendedor") */
  class: string;
  /** Texto literal extraído del documento (lo que se highlight-ea) */
  text: string;
  /** Etiqueta amigable para el panel ("Rol SII", "Vendedor") */
  label: string;
  /** Categoría legal para color y agrupación */
  category: EntityCategory;
  /** Atributos adicionales (e.g. { acreedor: "Banco Bice", monto_uf: 3200 }) */
  attributes?: Record<string, string | number | boolean>;
  /** Confianza de la extracción 0-1 (opcional) */
  confidence?: number;
  /** Offsets en el texto fuente — útil cuando langextract los entrega */
  char_interval?: { start: number; end: number };
  /** Marca si el campo fue editado por el letrado */
  edited?: boolean;
  /** id_extraccion al que pertenece — la UI lo necesita para crear anchors
   *  nuevos vía POST /extracciones/{id}/anchors. */
  id_extraccion?: number;

  /* ─── Trazabilidad multi-anchor (migración 010) ─── */
  /** Ubicaciones de este campo en el documento (auto + manual). */
  anchors?: EntityAnchor[];

  /* ─── Campos derivados del primer anchor activo (compat) ───
   * Mantenidos para no romper código existente que lee ent.pagina/ent.bboxes
   * sin iterar anchors. Apuntan al PRIMER anchor con estado != 'rechazado'. */
  fuente_texto?: 'pdf_text' | 'ocr';
  pagina?: number;
  confianza_ocr?: number;
  bboxes?: number[][];
}

/* ─────────────────── Categorías visuales ─────────────────── */

export const CATEGORY_META: Record<EntityCategory, {
  label: string;
  short: string;
  /** Color de relleno del highlight en el PDF (con alpha) */
  fill: string;
  /** Color del borde y texto */
  ink: string;
  /** Ícono de lucide-react (string para lazy import en el componente) */
  iconName: 'IdCard' | 'Users' | 'MapPin' | 'Banknote' | 'Pen' | 'ShieldAlert' | 'CheckCircle2' | 'Map' | 'FileQuestion';
}> = {
  identificacion: {
    label: 'Identificación',
    short: 'IDENT',
    fill: 'rgba(11, 31, 58, 0.18)',
    ink: '#0B1F3A',
    iconName: 'IdCard',
  },
  partes: {
    label: 'Partes',
    short: 'PARTE',
    fill: 'rgba(47, 93, 60, 0.18)',
    ink: '#2F5D3C',
    iconName: 'Users',
  },
  propiedad: {
    label: 'Propiedad',
    short: 'PROP',
    fill: 'rgba(164, 113, 72, 0.20)',
    ink: '#A47148',
    iconName: 'MapPin',
  },
  valor: {
    label: 'Valor',
    short: 'VALOR',
    fill: 'rgba(160, 104, 32, 0.20)',
    ink: '#A06820',
    iconName: 'Banknote',
  },
  profesional: {
    label: 'Profesional',
    short: 'PROF',
    fill: 'rgba(126, 31, 31, 0.16)',
    ink: '#7E1F1F',
    iconName: 'Pen',
  },
  gravamen: {
    label: 'Gravámenes',
    short: 'GRAV',
    fill: 'rgba(126, 31, 31, 0.20)',
    ink: '#7E1F1F',
    iconName: 'ShieldAlert',
  },
  estado: {
    label: 'Estado documental',
    short: 'EST',
    fill: 'rgba(47, 93, 60, 0.18)',
    ink: '#2F5D3C',
    iconName: 'CheckCircle2',
  },
  normativa: {
    label: 'Normativa urbana',
    short: 'NORM',
    fill: 'rgba(11, 31, 58, 0.18)',
    ink: '#0B1F3A',
    iconName: 'Map',
  },
  otro: {
    label: 'Sin clasificar',
    short: 'OTRO',
    fill: 'rgba(107, 107, 107, 0.18)',
    ink: '#6B6B6B',
    iconName: 'FileQuestion',
  },
};

/** Mapeo `extraction_class` → categoría legal. */
const CLASS_TO_CATEGORY: Record<string, EntityCategory> = {
  // Identificación
  fecha_otorgamiento: 'identificacion',
  fecha_emision: 'identificacion',
  fecha_plano: 'identificacion',
  foja: 'identificacion',
  repertorio: 'identificacion',
  numero_inscripcion: 'identificacion',
  anio_inscripcion: 'identificacion',
  numero_municipal: 'identificacion',
  rol_avaluo: 'identificacion',
  cbr_emisor: 'identificacion',
  municipalidad: 'identificacion',
  tipo_acto: 'identificacion',
  tipo_plano: 'identificacion',

  // Partes
  vendedor: 'partes',
  vendedores: 'partes',
  comprador: 'partes',
  compradores: 'partes',
  titular_actual: 'partes',
  titular_rut: 'partes',

  // Propiedad
  rol_propiedad: 'propiedad',
  rol_sii: 'propiedad',
  direccion: 'propiedad',
  direccion_propiedad: 'propiedad',
  direccion_oficial: 'propiedad',
  comuna: 'propiedad',
  superficie_m2: 'propiedad',
  superficie_total_m2: 'propiedad',
  superficie_construida_m2: 'propiedad',
  superficie_terreno_m2: 'propiedad',
  deslindes: 'propiedad',
  destino: 'propiedad',

  // Valor
  precio_clp: 'valor',
  precio_uf: 'valor',
  forma_pago: 'valor',
  avaluo_total_clp: 'valor',
  avaluo_terreno_clp: 'valor',
  avaluo_construccion_clp: 'valor',

  // Profesional
  notario_nombre: 'profesional',
  notaria_numero: 'profesional',
  profesional: 'profesional',

  // Gravamen
  hipoteca: 'gravamen',
  hipotecas_vigentes: 'gravamen',
  prohibicion: 'gravamen',
  prohibiciones: 'gravamen',
  gravamen: 'gravamen',
  gravamenes: 'gravamen',
  interdicciones: 'gravamen',

  // Estado
  libre_de_gravamenes: 'estado',
  no_expropiacion: 'estado',
  recepcion_final: 'estado',
  permiso_edificacion: 'estado',
  exento_iva: 'estado',

  // Normativa
  zonificacion: 'normativa',
  usos_permitidos: 'normativa',
  altura_maxima: 'normativa',
  coef_constructibilidad: 'normativa',
  coef_ocupacion_suelo: 'normativa',
  densidad_max: 'normativa',
};

const CLASS_TO_LABEL: Record<string, string> = {
  fecha_otorgamiento: 'Fecha de otorgamiento',
  fecha_emision: 'Fecha de emisión',
  fecha_plano: 'Fecha del plano',
  foja: 'Foja',
  repertorio: 'Repertorio',
  numero_inscripcion: 'N° de inscripción',
  anio_inscripcion: 'Año de inscripción',
  numero_municipal: 'N° municipal',
  rol_avaluo: 'Rol de avalúo',
  cbr_emisor: 'CBR emisor',
  municipalidad: 'Municipalidad',
  tipo_acto: 'Tipo de acto',
  tipo_plano: 'Tipo de plano',

  vendedor: 'Vendedor',
  vendedores: 'Vendedor',
  comprador: 'Comprador',
  compradores: 'Comprador',
  titular_actual: 'Titular actual',
  titular_rut: 'RUT titular',

  rol_propiedad: 'Rol SII',
  rol_sii: 'Rol SII',
  direccion: 'Dirección',
  direccion_propiedad: 'Dirección de la propiedad',
  direccion_oficial: 'Dirección oficial',
  comuna: 'Comuna',
  superficie_m2: 'Superficie (m²)',
  superficie_total_m2: 'Superficie total (m²)',
  superficie_construida_m2: 'Superficie construida (m²)',
  superficie_terreno_m2: 'Superficie de terreno (m²)',
  deslindes: 'Deslindes',
  destino: 'Destino',

  precio_clp: 'Precio (CLP)',
  precio_uf: 'Precio (UF)',
  forma_pago: 'Forma de pago',
  avaluo_total_clp: 'Avalúo total',
  avaluo_terreno_clp: 'Avalúo terreno',
  avaluo_construccion_clp: 'Avalúo construcción',

  notario_nombre: 'Notario',
  notaria_numero: 'Notaría',
  profesional: 'Profesional autor',

  hipoteca: 'Hipoteca',
  hipotecas_vigentes: 'Hipoteca vigente',
  prohibicion: 'Prohibición',
  prohibiciones: 'Prohibición',
  gravamen: 'Gravamen',
  gravamenes: 'Gravamen',
  interdicciones: 'Interdicción',

  libre_de_gravamenes: 'Libre de gravámenes',
  no_expropiacion: 'No expropiación',
  recepcion_final: 'Recepción final',
  permiso_edificacion: 'Permiso de edificación',
  exento_iva: 'Exento IVA',

  zonificacion: 'Zonificación',
  usos_permitidos: 'Uso permitido',
  altura_maxima: 'Altura máxima',
  coef_constructibilidad: 'Coef. constructibilidad',
  coef_ocupacion_suelo: 'Coef. ocupación de suelo',
  densidad_max: 'Densidad máxima',
};

export function categoryFor(extractionClass: string): EntityCategory {
  return CLASS_TO_CATEGORY[extractionClass] ?? 'otro';
}

export function labelFor(extractionClass: string): string {
  return CLASS_TO_LABEL[extractionClass] ?? extractionClass.replace(/_/g, ' ');
}

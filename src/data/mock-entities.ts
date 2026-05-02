/**
 * Entidades por documento mock — el equivalente a lo que devolvería
 * `documentos-api` (langextract) para cada archivo del expediente.
 *
 * Cada entidad tiene `text` (lo que se busca y resalta en el PDF) +
 * `class` + `label` + `category` + `attributes`. El PDF generado por
 * `lib/pdfGenerator.ts` contiene literalmente estos textos.
 */
import type { Entity } from '@/data/entities';
import { categoryFor, labelFor } from '@/data/entities';

const e = (
  id: string,
  cls: string,
  text: string,
  attributes?: Record<string, string | number | boolean>,
  confidence = 0.92,
): Entity => ({
  id,
  class: cls,
  text,
  label: labelFor(cls),
  category: categoryFor(cls),
  attributes,
  confidence,
});

/* ─────────────── id_archivo: 101 — escritura compraventa ─────────────── */

export const ENTITIES_101: Entity[] = [
  e('101-1',  'tipo_acto',           'COMPRAVENTA'),
  e('101-2',  'fecha_otorgamiento',  '12 de marzo de 2022'),
  e('101-3',  'notario_nombre',      'JUAN PÉREZ GONZÁLEZ', undefined, 0.97),
  e('101-4',  'notaria_numero',      'Cuarta Notaría de Santiago'),
  e('101-5',  'repertorio',          'N° 8745-2022'),
  e('101-6',  'foja',                'Foja 4321'),
  e('101-7',  'vendedor',            'MARÍA SOTO ROJAS, RUT 12.345.678-9'),
  e('101-8',  'comprador',           'PEDRO LÓPEZ ROJAS, RUT 9.876.543-2'),
  e('101-9',  'rol_propiedad',       '12.345-7'),
  e('101-10', 'direccion_propiedad', 'Av. Apoquindo 5400, oficina 1404, Las Condes'),
  e('101-11', 'superficie_m2',       '78,5 m²', { numero: 78.5 }),
  e('101-12', 'precio_clp',          '$ 145.000.000', { monto: 145_000_000 }),
  e('101-13', 'precio_uf',           'UF 4.250', { uf: 4250 }),
  e('101-14', 'forma_pago',          'al contado al firmar la presente escritura'),
];

/* ─────────────── id_archivo: 102 — cert dominio vigente ─────────────── */

export const ENTITIES_102: Entity[] = [
  e('102-1',  'cbr_emisor',          'Conservador de Bienes Raíces de Santiago', undefined, 0.98),
  e('102-2',  'fecha_emision',       '15 de abril de 2026'),
  e('102-3',  'foja',                'fojas 1234'),
  e('102-4',  'numero_inscripcion',  'número 8765'),
  e('102-5',  'anio_inscripcion',    'año 2018'),
  e('102-6',  'titular_actual',      'PEDRO LÓPEZ ROJAS', undefined, 0.96),
  e('102-7',  'titular_rut',         'RUT 9.876.543-2'),
  e('102-8',  'rol_propiedad',       '12.345-7'),
  e('102-9',  'direccion',           'Av. Apoquindo 5400 oficina 1404, Las Condes'),
];

/* ─────────────── id_archivo: 103 — cert hipotecas / gravámenes ─────────────── */

export const ENTITIES_103: Entity[] = [
  e('103-1', 'cbr_emisor',     'Conservador de Bienes Raíces de Santiago'),
  e('103-2', 'fecha_emision',  '14 de marzo de 2026'),
  e('103-3', 'hipoteca',       'Hipoteca a favor de Banco Bice por UF 3.200', { acreedor: 'Banco Bice', monto_uf: 3200, foja: '4321', numero: '8766', anio: 2020 }, 0.94),
  e('103-4', 'prohibicion',    'Prohibición de gravar y enajenar a favor de Banco Bice'),
  e('103-5', 'libre_de_gravamenes', 'NO se encuentra libre de gravámenes', { libre: false }),
];

/* ─────────────── id_archivo: 104 — cert avalúo SII ─────────────── */

export const ENTITIES_104: Entity[] = [
  e('104-1', 'rol_avaluo',                '12345-7'),
  e('104-2', 'comuna',                    'Las Condes'),
  e('104-3', 'fecha_emision',             '28 de abril de 2026'),
  e('104-4', 'avaluo_total_clp',          '$ 145.230.000', { monto: 145_230_000 }, 0.99),
  e('104-5', 'avaluo_terreno_clp',        '$ 90.000.000',  { monto: 90_000_000 }),
  e('104-6', 'avaluo_construccion_clp',   '$ 55.230.000',  { monto: 55_230_000 }),
  e('104-7', 'superficie_construida_m2',  '76,8 m²',       { numero: 76.8 }),
  e('104-8', 'destino',                   'Habitacional'),
  e('104-9', 'exento_iva',                'No exento',     { exento: false }),
];

/* ─────────────── id_archivo: 105 — cert municipal ─────────────── */

export const ENTITIES_105: Entity[] = [
  e('105-1', 'municipalidad',     'Ilustre Municipalidad de Las Condes'),
  e('105-2', 'fecha_emision',     '22 de abril de 2026'),
  e('105-3', 'numero_municipal',  'número municipal 5400'),
  e('105-4', 'direccion_oficial', 'Av. Apoquindo 5400 oficina 1404'),
  e('105-5', 'no_expropiacion',   'NO se encuentra afecto a expropiación municipal'),
  e('105-6', 'recepcion_final',   'Recepción final otorgada con fecha 30-12-2018', { otorgada: true, fecha: '30-12-2018', permiso: '245-2017' }),
];

/* ─────────────── id_archivo: 106 — plano propiedad ─────────────── */

export const ENTITIES_106: Entity[] = [
  e('106-1', 'tipo_plano',                'Arquitectónico'),
  e('106-2', 'superficie_construida_m2',  '78,5 m²', { numero: 78.5 }),
  e('106-3', 'profesional',               'Arq. Carolina Vega, Reg. Nac. 5678'),
  e('106-4', 'fecha_plano',               'marzo de 2018'),
];

/* ─────────────── id_archivo: 107 — plan regulador ─────────────── */

export const ENTITIES_107: Entity[] = [
  e('107-1', 'comuna',                  'Las Condes'),
  e('107-2', 'zonificacion',            'ZH-1'),
  e('107-3', 'usos_permitidos',         'residencial, oficina, comercio menor'),
  e('107-4', 'altura_maxima',           '7 pisos'),
  e('107-5', 'coef_constructibilidad',  '2,5', { numero: 2.5 }),
  e('107-6', 'coef_ocupacion_suelo',    '0,5', { numero: 0.5 }),
];

export const ENTITIES_BY_ARCHIVO: Record<number, Entity[]> = {
  101: ENTITIES_101,
  102: ENTITIES_102,
  103: ENTITIES_103,
  104: ENTITIES_104,
  105: ENTITIES_105,
  106: ENTITIES_106,
  107: ENTITIES_107,
};

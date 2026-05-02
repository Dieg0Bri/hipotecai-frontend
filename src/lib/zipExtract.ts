/**
 * zipExtract.ts · descomprime un ZIP en el browser y devuelve los PDFs
 * adentro como objetos File individuales. Ignora carpetas, archivos
 * ocultos (.DS_Store, __MACOSX/) y todo lo que no sea PDF.
 */
import JSZip from 'jszip';

export interface ZipExtractResult {
  pdfs: File[];
  ignored: string[];
}

const PDF_RE = /\.pdf$/i;
const HIDDEN_RE = /(^|\/)(\.|__MACOSX\/)/;

export async function extractPdfsFromZip(zipFile: File): Promise<ZipExtractResult> {
  const buffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const pdfs: File[] = [];
  const ignored: string[] = [];

  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir) continue;
    if (HIDDEN_RE.test(entry.name)) continue;

    if (!PDF_RE.test(entry.name)) {
      ignored.push(entry.name);
      continue;
    }

    const blob = await entry.async('blob');
    // Conservar solo el basename para evitar nombres con slashes adentro
    const basename = entry.name.split('/').pop() || entry.name;
    const file = new File([blob], basename, {
      type: 'application/pdf',
      lastModified: entry.date?.getTime() ?? Date.now(),
    });
    pdfs.push(file);
  }

  return { pdfs, ignored };
}

export function isZipFile(file: File): boolean {
  return (
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    /\.zip$/i.test(file.name)
  );
}

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface EpubMetadata {
  title?: string;
  author?: string;
  chapters: string[];
  contentText: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: true,
});

function textFromAny(node: unknown): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textFromAny).join(' ');
  if (node && typeof node === 'object') {
    return Object.values(node as Record<string, unknown>).map(textFromAny).join(' ');
  }
  return '';
}

export async function parseEpubFile(file: File): Promise<EpubMetadata> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const containerRaw = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerRaw) {
    return { chapters: ['Chapter 1'], contentText: '' };
  }

  const container = parser.parse(containerRaw) as any;
  const rootfilePath =
    container?.container?.rootfiles?.rootfile?.['full-path'] ||
    container?.container?.rootfiles?.rootfile?.[0]?.['full-path'];

  if (!rootfilePath) return { chapters: ['Chapter 1'], contentText: '' };

  const opfRaw = await zip.file(rootfilePath)?.async('text');
  if (!opfRaw) return { chapters: ['Chapter 1'], contentText: '' };

  const opf = parser.parse(opfRaw) as any;
  const metadata = opf?.package?.metadata || {};

  const title = metadata?.['dc:title']
    ? textFromAny(metadata['dc:title']).trim()
    : undefined;
  const author = metadata?.['dc:creator']
    ? textFromAny(metadata['dc:creator']).trim()
    : undefined;

  const manifest = opf?.package?.manifest?.item;
  const spine = opf?.package?.spine?.itemref;
  const manifestItems = Array.isArray(manifest) ? manifest : manifest ? [manifest] : [];
  const spineItems = Array.isArray(spine) ? spine : spine ? [spine] : [];

  const baseDir = rootfilePath.includes('/') ? rootfilePath.slice(0, rootfilePath.lastIndexOf('/') + 1) : '';

  const hrefById = new Map<string, string>();
  manifestItems.forEach((item: any) => {
    if (item?.id && item?.href) hrefById.set(item.id, baseDir + item.href);
  });

  const chapters: string[] = [];
  const chunks: string[] = [];

  for (const itemRef of spineItems) {
    const idref = itemRef?.idref;
    const href = idref ? hrefById.get(idref) : null;
    if (!href) continue;

    const chapterRaw = await zip.file(href)?.async('text');
    if (!chapterRaw) continue;

    const chapterDoc = parser.parse(chapterRaw) as any;
    const heading =
      textFromAny(chapterDoc?.html?.body?.h1).trim() ||
      textFromAny(chapterDoc?.html?.body?.h2).trim() ||
      `Chapter ${chapters.length + 1}`;
    chapters.push(heading);

    const bodyText = textFromAny(chapterDoc?.html?.body)
      .replace(/\s+/g, ' ')
      .trim();
    if (bodyText) chunks.push(bodyText);
  }

  return {
    title,
    author,
    chapters: chapters.length ? chapters : ['Chapter 1'],
    contentText: chunks.join('\n\n'),
  };
}

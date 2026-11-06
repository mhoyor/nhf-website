// Photos uploaded in the admin (news photos, player headshots, club crests). Files are
// checked by their first bytes, not their name, and stored in the media table, so the
// database backup includes them. They are served from /media/<id>.

export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface Upload {
  bytes: Uint8Array;
  type: ImageType;
  name: string;
}

/** The image type from the file's first bytes, so a renamed file cannot pass as a photo. */
export function sniff(b: Uint8Array): ImageType | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

/**
 * The image chosen in a file field, if any. Returns null when no file was chosen, or a
 * sentence for the person when the file is too big or not a photo.
 */
export async function readImage(form: FormData, field: string, maxMb: number, what = 'The photo'): Promise<Upload | string | null> {
  const file = form.get(field);
  if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || (file as File).size === 0) return null;
  const f = file as File;
  if (f.size > maxMb * 1024 * 1024) return `${what} is larger than ${maxMb} MB. Save it smaller (about 2000 pixels wide is plenty) and try again.`;
  const bytes = new Uint8Array(await f.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return `${what} must be a JPEG, PNG or WebP image.`;
  return { bytes, type, name: f.name.slice(0, 120) || 'photo' };
}

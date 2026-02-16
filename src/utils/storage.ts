import { supabase } from '@/integrations/supabase/client';

type UploadOpts = {
  bucket?: string;
  category?: string;
  prefix?: string;
};

const compressImage = async (file: File, category?: string): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;
  const maxSize = category === 'appointment-photos' ? 900 : 700;
  const quality = category === 'appointment-photos' ? 0.6 : 0.7;

  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = image.width;
      let height = image.height;
      const scale = Math.min(maxSize / width, maxSize / height, 1);
      width = width * scale;
      height = height * scale;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const name = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const compressed = new File([blob], name, { type: 'image/jpeg' });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    image.src = objectUrl;
  });
};

export async function uploadPublicImage(file: File, opts: UploadOpts = {}): Promise<string> {
  const category = opts.category || 'misc';
  const fileToUpload = await compressImage(file, category);
  const ext = fileToUpload.name.includes('.') ? fileToUpload.name.split('.').pop() : 'bin';
  const prefix = opts.prefix
    ? (category === 'avatars' ? `${opts.prefix}/` : `${opts.prefix}-`)
    : '';

  const bucket = opts.bucket || 'site-images';
  const categoryFolder = category === bucket ? '' : `${category}/`;
  const filePath = `${categoryFolder}${prefix}${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileToUpload, {
      cacheControl: '3600',
      upsert: true,
    });
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
}

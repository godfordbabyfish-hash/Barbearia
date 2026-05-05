import { supabase } from '@/integrations/supabase/client';

type UploadOpts = {
  bucket?: string;
  category?: string;
  prefix?: string;
};

const compressImage = async (file: File, category?: string): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;

  const getCompressionProfile = (targetCategory?: string) => {
    if (targetCategory === 'appointment-photos') {
      return { maxSize: 800, quality: 0.55 };
    }

    if (targetCategory === 'avatars') {
      return { maxSize: 256, quality: 0.65 };
    }

    if (targetCategory === 'product-sales') {
      return { maxSize: 900, quality: 0.6 };
    }

    return { maxSize: 700, quality: 0.68 };
  };

  const { maxSize, quality } = getCompressionProfile(category);

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

// Generate a resized image in WebP (fallback to JPEG if unsupported)
const generateResized = async (
  file: File,
  maxSize: number,
  quality: number,
  mimePreferred: 'image/webp' | 'image/jpeg' = 'image/webp'
): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = image.width;
      let height = image.height;
      const scale = Math.min(maxSize / width, maxSize / height, 1);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);

      const tryToBlob = (type: string) =>
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              if (type === 'image/webp') {
                // Fallback to JPEG if WebP unsupported
                tryToBlob('image/jpeg');
              } else {
                resolve(file);
              }
              return;
            }
            const ext = type === 'image/webp' ? 'webp' : 'jpg';
            const name = file.name.replace(/\.[^/.]+$/, '') + `.${ext}`;
            resolve(new File([blob], name, { type }));
          },
          type,
          quality
        );

      tryToBlob(mimePreferred);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    image.src = objectUrl;
  });
};

export type UploadVariantResult = {
  mainUrl: string; // usually w800
  thumb400Url?: string;
  thumb800Url?: string;
};

export async function uploadPublicImageVariants(file: File, opts: UploadOpts = {}): Promise<UploadVariantResult> {
  const bucket = opts.bucket || 'site-images';
  const category = opts.category || 'misc';
  const prefix = opts.prefix ? (category === 'avatars' ? `${opts.prefix}/` : `${opts.prefix}-`) : '';
  const categoryFolder = category === bucket ? '' : `${category}/`;
  const ts = Date.now();

  const file400 = await generateResized(file, 400, 0.65, 'image/webp');
  const file800 = await generateResized(file, 800, 0.65, 'image/webp');

  const path400 = `${categoryFolder}${prefix}${ts}-w400.${file400.name.split('.').pop()}`;
  const path800 = `${categoryFolder}${prefix}${ts}-w800.${file800.name.split('.').pop()}`;

  const upload = async (path: string, f: File) => {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, f, { cacheControl: '31536000', upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl as string;
  };

  const [url400, url800] = await Promise.all([upload(path400, file400), upload(path800, file800)]);

  return { mainUrl: url800, thumb400Url: url400, thumb800Url: url800 };
}

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
      cacheControl: '31536000',
      upsert: true,
    });
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
}

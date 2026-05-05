export type OptimizeOptions = { width?: number; height?: number; quality?: number; resize?: 'cover' | 'contain' };

// Builds a Supabase Storage transform URL from a public object URL
export const getOptimizedStorageImageUrl = (
  imageUrl?: string | null,
  options?: OptimizeOptions
): string => {
  if (!imageUrl) return '';

  try {
    const parsed = new URL(imageUrl);
    const objectPathMarker = '/storage/v1/object/public/';
    const markerIndex = parsed.pathname.indexOf(objectPathMarker);

    if (markerIndex === -1) {
      return imageUrl;
    }

    const objectPath = parsed.pathname.slice(markerIndex + objectPathMarker.length);
    const prefix = parsed.pathname.slice(0, markerIndex);
    parsed.pathname = `${prefix}/storage/v1/render/image/public/${objectPath}`;

    parsed.searchParams.set('width', String(options?.width ?? 480));
    if (options?.height) {
      parsed.searchParams.set('height', String(options.height));
    } else {
      parsed.searchParams.delete('height');
    }
    parsed.searchParams.set('quality', String(options?.quality ?? 60));
    parsed.searchParams.set('resize', options?.resize ?? 'cover');
    return parsed.toString();
  } catch {
    return imageUrl;
  }
};

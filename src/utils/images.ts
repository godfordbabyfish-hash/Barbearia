export type OptimizeOptions = { width?: number; height?: number; quality?: number; resize?: 'cover' | 'contain' };

// Selects a physical upload variant when available. The current Supabase plan
// does not provide dynamic image transformations, so legacy/original URLs are
// returned unchanged instead of causing a failed render request plus fallback.
export const getOptimizedStorageImageUrl = (
  imageUrl?: string | null,
  options?: OptimizeOptions
): string => {
  if (!imageUrl) return '';

  try {
    const parsed = new URL(imageUrl);
    if (!parsed.pathname.includes('/storage/v1/object/public/')) return imageUrl;

    const targetWidth = (options?.width ?? 480) <= 400 ? 400 : 800;
    const variantPattern = /-w(?:400|800)(\.(?:webp|jpe?g|png))$/i;
    if (!variantPattern.test(parsed.pathname)) return imageUrl;

    parsed.pathname = parsed.pathname.replace(variantPattern, `-w${targetWidth}$1`);
    return parsed.toString();
  } catch {
    return imageUrl;
  }
};

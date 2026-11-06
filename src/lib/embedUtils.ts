// Utility functions for detecting and handling embed types

export type EmbedType = 'lottie' | 'rive' | 'rive-embed' | 'figma' | 'video' | 'youtube' | 'unicorn' | 'iframe' | 'none';

/**
 * Auto-detect embed type from URL or manual override
 * Priority: manualType > URL pattern detection
 */
export function detectEmbedType(url: string, manualType?: string): EmbedType {
  if (!url) return 'none';
  
  // Manual override (except "Auto")
  if (manualType && manualType.toLowerCase() !== 'auto') {
    return manualType.toLowerCase() as EmbedType;
  }
  
  // Auto-detect from URL patterns
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('.lottie') || lowerUrl.includes('lottie.host') || lowerUrl.endsWith('.json')) {
    return 'lottie';
  }
  
  // Rive: Differentiate between embed URLs (iframe) and direct .riv files (SDK)
  if (lowerUrl.includes('rive.app/community') && lowerUrl.includes('/embed')) {
    return 'rive-embed'; // Rive community embed URLs use iframe
  }
  
  if (lowerUrl.includes('.riv') || lowerUrl.includes('rive.app')) {
    return 'rive'; // Direct .riv files use the SDK
  }
  
  if (lowerUrl.includes('figma.com/proto') || lowerUrl.includes('figma.com/embed')) {
    return 'figma';
  }
  
  if (lowerUrl.includes('youtube.com/watch') || lowerUrl.includes('youtu.be/') || lowerUrl.includes('youtube.com/embed')) {
    return 'youtube';
  }
  
  if (lowerUrl.includes('unicorn.studio/embed')) {
    return 'unicorn';
  }
  
  if (lowerUrl.match(/\.(mp4|webm|mov|avi)$/i)) {
    return 'video';
  }
  
  // Generic iframe fallback for other URLs
  return 'iframe';
}

/**
 * How a card preview behaves for the visitor:
 * - image: static picture, the whole preview opens the modal
 * - motion: plays by itself but cannot be interacted with, opens like an image
 * - video: has its own player controls, opened with a separate expand button
 * - interactive: the visitor plays with it in place, opened with a separate expand button
 */
export type PreviewKind = 'image' | 'motion' | 'video' | 'interactive';

export function getPreviewKind(embedType: EmbedType): PreviewKind {
  switch (embedType) {
    case 'none':
      return 'image';
    case 'lottie':
      return 'motion';
    case 'video':
    case 'youtube':
      return 'video';
    default:
      return 'interactive';
  }
}

/**
 * Width / height of the embed frame. Keep in sync with getAspectRatioClass.
 */
export function getAspectRatio(embedType: EmbedType): number {
  switch (embedType) {
    case 'figma':
      return 4 / 3;
    case 'lottie':
    case 'rive':
    case 'rive-embed':
      return 1;
    case 'unicorn':
      return 16 / 10;
    default:
      return 16 / 9;
  }
}

/**
 * Get appropriate aspect ratio class for embed
 */
export function getAspectRatioClass(embedType: EmbedType): string {
  switch (embedType) {
    case 'figma':
      return 'aspect-[4/3]'; // Figma prototypes are often 4:3 or custom
    case 'video':
    case 'youtube':
      return 'aspect-video'; // 16:9
    case 'lottie':
    case 'rive':
    case 'rive-embed':
      return 'aspect-square'; // Animations often square or custom
    case 'unicorn':
      return 'aspect-[16/10]'; // Unicorn Studio scenes common aspect ratio
    default:
      return 'aspect-video';
  }
}

/**
 * Extract Unicorn Studio project ID from URL or return as-is if already an ID
 */
export function extractUnicornProjectId(urlOrId: string): string {
  if (!urlOrId) return '';
  
  // If it's already a project ID (alphanumeric string without slashes), return as-is
  if (!urlOrId.includes('/') && !urlOrId.includes('.')) {
    return urlOrId;
  }
  
  // Try to extract from URL patterns
  // Example: https://www.unicorn.studio/project/gMktMQdz9XvCxh8ovIbM
  const match = urlOrId.match(/([a-zA-Z0-9_-]{15,30})/);
  return match ? match[1] : urlOrId;
}

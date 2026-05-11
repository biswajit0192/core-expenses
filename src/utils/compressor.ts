import Resizer from 'react-image-file-resizer';

/**
 * Compresses an image file to a maximum of 400x400 pixels,
 * maintaining aspect ratio, and converting it to WebP format.
 * 
 * @param file The original image file from an input or drop event.
 * @returns A promise that resolves to the compressed Blob.
 */
export const compressImage = (file: File): Promise<Blob> => {
  console.log('[Compressor] Starting compression for file:', file.name);
  return new Promise((resolve, reject) => {
    try {
      console.log('[Compressor] Resizing image to 400x400 (WebP format)...');
      Resizer.imageFileResizer(
        file,
        400, // max width
        400, // max height
        'WEBP', // compress format
        80, // quality
        0, // rotation
        (uri) => {
          if (uri instanceof Blob) {
            console.log('[Compressor] Compression finished successfully.');
            resolve(uri);
          } else {
            console.error('[Compressor] Compression failed: Unexpected response type.');
            reject(new Error('Failed to compress image: Unexpected response type.'));
          }
        },
        'blob' // output type
      );
    } catch (err) {
      console.error('[Compressor] Exception caught:', err);
      reject(err);
    }
  });
};


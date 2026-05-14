const LOCAL_PROFILE_IMAGE_KEY = 'core_user_profile_image';

/**
 * Saves a base64 string or URL to localStorage for offline persistence.
 */
export const saveLocalProfileImage = (imageUrl: string) => {
  try {
    localStorage.setItem(LOCAL_PROFILE_IMAGE_KEY, imageUrl);
    window.dispatchEvent(new CustomEvent('core_profile_image_updated', { detail: imageUrl }));
  } catch (e) {
    console.error('[ProfileImage] Failed to save to localStorage:', e);
  }
};

/**
 * Retrieves the profile image with proper priority:
 * 1. Local Persistence (LocalStorage)
 * 2. Remote URL (Firebase/Auth)
 * 3. Default Avatar
 */
export const getProfileImage = (remoteUrl?: string | null) => {
  const localImage = localStorage.getItem(LOCAL_PROFILE_IMAGE_KEY);
  
  if (localImage) return localImage;
  if (remoteUrl) return remoteUrl;
  
  return "https://api.dicebear.com/7.x/avataaars/svg?seed=default";
};

/**
 * Converts a Blob/File to a Base64 string for storage.
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Processes the image crop using a hidden canvas.
 */
export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No 2d context');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/webp', 0.9);
  });
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const LOCAL_PROFILE_IMAGE_KEY = 'core_user_profile_image';

/**
 * Saves a base64 string or URL to localStorage for offline persistence.
 */
export const saveLocalProfileImage = (imageUrl: string) => {
  try {
    localStorage.setItem(LOCAL_PROFILE_IMAGE_KEY, imageUrl);
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

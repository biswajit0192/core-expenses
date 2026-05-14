import { useRef, useState } from 'react';
import { X, Upload, Check } from 'lucide-react';
import styles from './ImageSelector.module.scss';
import ImageCropper from './ImageCropper';

interface ImageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string | Blob, isCustom: boolean) => Promise<void>;
  currentImageUrl?: string;
}

const AVATAR_OPTIONS = [
  { id: 'av1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4' },
  { id: 'av2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo&backgroundColor=c0aede' },
  { id: 'av3', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffdfbf' },
  { id: 'av4', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Oscar&backgroundColor=ffd5dc' },
  { id: 'av5', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster&backgroundColor=d1d4f9' },
];

export default function ImageSelector({ isOpen, onClose, onSelect, currentImageUrl }: ImageSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setIsUploading(true);
      setImageToCrop(null);
      await onSelect(croppedBlob, true);
      onClose();
    } catch (err) {
      console.error('Error processing image:', err);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarSelect = async (url: string) => {
    try {
      setSelectedAvatar(url);
      setIsUploading(true);
      await onSelect(url, false);
      onClose();
    } catch (err) {
      console.error('Error selecting avatar:', err);
    } finally {
      setIsUploading(false);
      setSelectedAvatar(null);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h3>Customize Profile</h3>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.section}>
            <p>Choose an animated character</p>
            <div className={styles.avatarList}>
              {AVATAR_OPTIONS.map((avatar) => (
                <div 
                  key={avatar.id}
                  className={`${styles.avatarOption} ${currentImageUrl === avatar.url || selectedAvatar === avatar.url ? styles.selected : ''}`}
                  onClick={() => handleAvatarSelect(avatar.url)}
                >
                  <img src={avatar.url} alt="Avatar option" />
                  {(currentImageUrl === avatar.url || selectedAvatar === avatar.url) && (
                    <div className={styles.checkOverlay}>
                      <Check size={16} color="white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <p>Or upload your own photo</p>
            <div className={styles.uploadArea}>
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button 
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload size={18} />
                {isUploading ? 'Processing...' : 'Upload from Device'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {imageToCrop && (
        <ImageCropper 
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </>
  );
}

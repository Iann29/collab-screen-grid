import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import placeholderImage from '/placeholder.svg';
import chinaGif from '/gif/china.gif';
import { useToast } from '@/hooks/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface ScreenModalProps {
  name: string;
  isOpen: boolean;
  isOffline?: boolean;
  onClose: () => void;
}

const ScreenModal: React.FC<ScreenModalProps> = ({ name, isOpen, isOffline = false, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const screenId = `screen-${name.toLowerCase()}-full`;

  useEffect(() => {
    // Create audio element when component mounts
    audioRef.current = new Audio('/audio/porquenotrabalha.mp3');
    
    return () => {
      // Cleanup audio when component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Reset and play audio when name or offline status changes
  useEffect(() => {
    if (isOpen && isOffline && audioRef.current) {
      // Reset audio to beginning
      audioRef.current.currentTime = 0;
      
      // Play audio when modal opens for offline collaborator
      audioRef.current.play()
        .catch(err => {
          console.error('Failed to play audio:', err);
          toast({
            title: "Não foi possível reproduzir o áudio",
            description: "Verifique se seu navegador permite reprodução automática",
            variant: "destructive"
          });
        });
    }
  }, [isOpen, isOffline, toast, name]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
      
      // Stop audio when modal closes
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-card rounded-lg overflow-hidden border border-border shadow-xl w-full mx-4 animate-scale-in"
        style={{ maxWidth: '672px' }} // Um pouco maior que 640px para dar margem
      >
        <div className="px-4 py-3 bg-muted flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Tela de {formattedName}</span>
            {isOffline && (
              <span className="bg-red-500/20 text-red-500 text-xs px-2 py-0.5 rounded-full">Offline</span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-background/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <AspectRatio ratio={4/3} className="w-full overflow-hidden">
            <img
              id={screenId}
              src={chinaGif}
              alt={`Tela de ${formattedName} (expandida)`}
              className="w-full h-full object-cover"
            />
          </AspectRatio>
        </div>
      </div>
    </div>
  );
};

export default ScreenModal;

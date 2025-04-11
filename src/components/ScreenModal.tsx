import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import placeholderImage from '/placeholder.svg';
import chinaGif from '/gif/china.gif';
import { useToast } from '@/hooks/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { websocketService } from '@/services/websocket';

interface ScreenModalProps {
  name: string;
  isOpen: boolean;
  isOffline?: boolean;
  onClose: () => void;
}

const ScreenModal: React.FC<ScreenModalProps> = ({ name, isOpen, isOffline: initialOffline = false, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioPlayedRef = useRef<boolean>(false);
  const { toast } = useToast();
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  
  // Use estado interno para evitar piscar/flickering
  const [isOffline, setIsOffline] = useState(initialOffline);
  
  // IMPORTANT: Normalized IDs
  const screenId = `screen-${name.toLowerCase()}`;
  const modalScreenId = `${screenId}-full`;

  // Verificação de status real antes de montar o componente
  useEffect(() => {
    // Primeiro usa o status passado via props (para consistência inicial)
    setIsOffline(initialOffline);

    // Verifica o status atual no websocketService (mais preciso)
    const realStatus = !websocketService.isScreenOnline(name);
    setIsOffline(realStatus);
    
    // Listener para mudanças de status durante a exibição do modal
    const handleScreenStatusChange = (event: CustomEvent<{ username: string, isOnline: boolean }>) => {
      const { username, isOnline } = event.detail;
      if (username.toLowerCase() === name.toLowerCase()) {
        setIsOffline(!isOnline);
      }
    };
    
    window.addEventListener('screen-status-change', handleScreenStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('screen-status-change', handleScreenStatusChange as EventListener);
    };
  }, [name, initialOffline]);
  
  // Inicialização e limpeza do áudio
  useEffect(() => {
    audioRef.current = new Audio('/audio/porquenotrabalha.mp3');
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Reset para o próximo uso do modal
      audioPlayedRef.current = false;
    };
  }, []);

  // Lógica melhorada para reprodução de áudio apenas quando realmente necessário
  useEffect(() => {
    // Só toca o áudio quando o modal é aberto E está offline E ainda não tocou nesta sessão
    if (isOpen && isOffline && audioRef.current && !audioPlayedRef.current) {
      // Marca que o áudio já foi tocado nesta sessão de modal
      audioPlayedRef.current = true;
      
      // Reproduz o áudio
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
      });
    }
  }, [isOpen, isOffline]);

  // Manipulação de eventos do modal
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
        style={{ maxWidth: '672px' }}
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
            {isOffline ? (
              <img
                id={modalScreenId}
                src={chinaGif}
                alt={`Tela de ${formattedName} (offline)`}
                className="w-full h-full object-cover"
                data-screen-id={modalScreenId}
                data-offline="true"
              />
            ) : (
              <img
                id={modalScreenId}
                src={placeholderImage}
                alt={`Tela de ${formattedName} (expandida)`}
                className="w-full h-full object-cover"
                data-screen-id={modalScreenId}
                data-offline="false"
                loading="eager"
                decoding="async"
                fetchpriority="high"
              />
            )}
          </AspectRatio>
        </div>
      </div>
    </div>
  );
};

export default ScreenModal;
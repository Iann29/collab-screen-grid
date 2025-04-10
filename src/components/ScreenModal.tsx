
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import placeholderImage from '/placeholder.svg';
import chinaGif from '/gif/china.gif';

interface ScreenModalProps {
  name: string;
  isOpen: boolean;
  onClose: () => void;
}

const ScreenModal: React.FC<ScreenModalProps> = ({ name, isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const screenId = `screen-${name.toLowerCase()}-full`;

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
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-card rounded-lg overflow-hidden border border-border shadow-xl w-full mx-4 animate-scale-in"
        style={{ maxWidth: '672px' }} // Um pouco maior que 640px para dar margem
      >
        <div className="px-4 py-3 bg-muted flex items-center justify-between">
          <span className="font-medium">Tela de {formattedName}</span>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-background/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 flex justify-center">
          <img
            id={screenId}
            src={chinaGif}
            alt={`Tela de ${formattedName} (expandida)`}
            className="w-full h-auto"
            style={{ 
              width: '640px', 
              height: '480px',
              objectFit: 'cover'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ScreenModal;

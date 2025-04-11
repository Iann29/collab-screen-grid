import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import placeholderImage from '/placeholder.svg';
import chinaGif from '/gif/china.gif';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface ScreenCardProps {
  name: string;
  isOwner?: boolean;
  customLabel?: string;
  onClick: () => void;
  isOffline?: boolean;
  labelColor?: string;
}

const ScreenCard: React.FC<ScreenCardProps> = ({ 
  name, 
  isOwner = false, 
  customLabel, 
  onClick,
  isOffline = true, // Default to offline for now
  labelColor
}) => {
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  
  // CRITICAL: Este ID deve corresponder EXATAMENTE ao que o servidor envia
  // Garantimos lowercase para evitar problemas de case sensitivity
  const screenId = `screen-${name.toLowerCase()}`;
  
  // Use useRef para acessar o elemento da imagem diretamente quando necessário
  const imageRef = useRef<HTMLImageElement>(null);
  
  // OTIMIZAÇÃO: Use um useEffect para debug e inicialização
  useEffect(() => {
    console.log(`ScreenCard ${screenId} montado`);
    
    // Este return é executado quando o componente é desmontado
    return () => {
      console.log(`ScreenCard ${screenId} desmontado`);
    };
  }, [screenId]);
  
  const handleClick = () => {
    onClick();
  };
  
  return (
    <div className="rounded-lg overflow-hidden bg-secondary border border-border hover:border-primary/50 transition-all duration-300">
      <div className="px-4 py-2 bg-muted flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground">{formattedName}</span>
          {customLabel && (
            <span className={cn("bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full", labelColor)}>
              {customLabel}
            </span>
          )}
        </div>
        <div 
          className={`h-2 w-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} 
          title={isOffline ? "Offline" : "Online"}
        ></div>
      </div>
      
      <div 
        className="relative cursor-pointer group"
        onClick={handleClick}
      >
        <AspectRatio ratio={4/3} className="w-full">
          {/* CORREÇÃO CRÍTICA: ID adicionado em AMBAS versões da imagem */}
          {isOffline ? (
            <img
              id={screenId}
              src={chinaGif}
              alt={`Tela de ${formattedName} (offline)`}
              className="w-full h-full object-cover"
              data-screen-id={screenId}
              data-offline="true"
            />
          ) : (
            <img
              id={screenId}
              ref={imageRef}
              src={placeholderImage}
              alt={`Tela de ${formattedName}`}
              className="w-full h-full object-cover"
              data-screen-id={screenId}
              data-offline="false"
              // OTIMIZAÇÃO: Adiciona atributos de otimização de imagem
              loading="eager"
              decoding="async"
              // OTIMIZAÇÃO: Indica ao browser que a imagem mudará com frequência
              fetchpriority="high"
            />
          )}
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-xs font-medium bg-background/80 text-foreground px-2 py-1 rounded">Clique para expandir</span>
          </div>
        </AspectRatio>
      </div>
    </div>
  );
};

export default ScreenCard;
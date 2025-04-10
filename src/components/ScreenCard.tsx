
import React from 'react';
import { cn } from '@/lib/utils';
import placeholderImage from '/placeholder.svg';

interface ScreenCardProps {
  name: string;
  isOwner?: boolean;
  customLabel?: string;
  onClick: () => void;
}

const ScreenCard: React.FC<ScreenCardProps> = ({ name, isOwner = false, customLabel, onClick }) => {
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const screenId = `screen-${name.toLowerCase()}`;
  
  return (
    <div className="rounded-lg overflow-hidden bg-secondary border border-border hover:border-primary/50 transition-all duration-300">
      <div className="px-4 py-2 bg-muted flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground">{formattedName}</span>
          {customLabel && (
            <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">{customLabel}</span>
          )}
        </div>
        <div className="h-2 w-2 rounded-full bg-red-500" title="Offline"></div>
      </div>
      
      <div 
        className="relative cursor-pointer group"
        onClick={onClick}
      >
        <img
          id={screenId}
          src={placeholderImage}
          alt={`Tela de ${formattedName}`}
          className="w-full object-cover"
          style={{ 
            aspectRatio: '4/3',
            maxHeight: '240px'
          }}
        />
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="text-xs font-medium bg-background/80 text-foreground px-2 py-1 rounded">Clique para expandir</span>
        </div>
      </div>
    </div>
  );
};

export default ScreenCard;

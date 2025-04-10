
import React from 'react';
import { cn } from '@/lib/utils';
import placeholderImage from '/placeholder.svg';

interface ScreenCardProps {
  name: string;
  isOwner?: boolean;
  onClick: () => void;
}

const ScreenCard: React.FC<ScreenCardProps> = ({ name, isOwner = false, onClick }) => {
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const screenId = `screen-${name.toLowerCase()}`;
  
  return (
    <div className="rounded-lg overflow-hidden bg-secondary border border-border hover:border-primary/50 transition-all duration-300">
      <div className="px-4 py-2 bg-muted flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground">{formattedName}</span>
          {isOwner && <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">Owner</span>}
        </div>
        <div className="h-2 w-2 rounded-full bg-green-500" title="Online"></div>
      </div>
      
      <div 
        className="relative cursor-pointer group"
        onClick={onClick}
      >
        <img
          id={screenId}
          src={placeholderImage}
          alt={`${formattedName}'s screen`}
          className="w-full aspect-[4/3] object-cover group-hover:opacity-90 transition-opacity"
        />
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="text-xs font-medium bg-background/80 text-foreground px-2 py-1 rounded">Click to expand</span>
        </div>
      </div>
    </div>
  );
};

export default ScreenCard;

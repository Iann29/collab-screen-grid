
import React, { useState, useEffect } from 'react';
import ScreenCard from './ScreenCard';
import ScreenModal from './ScreenModal';
import { websocketService } from '@/services/websocket';
import { useToast } from '@/hooks/use-toast';

const initialCollaborators = [
  { name: 'Ian', isOwner: true, label: 'Dev++++', isOffline: true },
  { name: 'Matheus', isOwner: false, label: 'Designer+', isOffline: true },
  { name: 'Andi', isOwner: false, label: 'Vagabundo', isOffline: true },
  { name: 'Giovani', isOwner: false, label: 'Trator', isOffline: true },
  { name: 'Julio', isOwner: false, label: 'Vadio', isOffline: true },
  { name: 'Pedro', isOwner: false, label: 'Unico que presta', isOffline: true },
  { name: 'Vini', isOwner: false, label: 'Nunca aparece', isOffline: true },
  { name: 'Dumb Dummy', isOwner: false, label: 'I.A', isOffline: true, labelColor: 'text-red-500 bg-red-100' }
];

const Dashboard: React.FC = () => {
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Connect to WebSocket when component mounts
    websocketService.connect();
    
    // Create event listener for screen status changes
    const handleScreenStatusChange = (event: CustomEvent<{ username: string, isOnline: boolean }>) => {
      const { username, isOnline } = event.detail;
      
      setCollaborators(prev => 
        prev.map(collaborator => 
          collaborator.name.toLowerCase() === username.toLowerCase()
            ? { ...collaborator, isOffline: !isOnline }
            : collaborator
        )
      );
      
      // Update selected screen status if it's the current one
      if (selectedScreen?.toLowerCase() === username.toLowerCase()) {
        setIsOffline(!isOnline);
      }
      
      // Show toast notification when a screen comes online
      if (isOnline) {
        toast({
          title: `${username.charAt(0).toUpperCase() + username.slice(1)} está online!`,
          description: "A tela agora está sendo transmitida em tempo real."
        });
      }
    };
    
    window.addEventListener('screen-status-change', handleScreenStatusChange as EventListener);
    
    // Cleanup function
    return () => {
      websocketService.disconnect();
      window.removeEventListener('screen-status-change', handleScreenStatusChange as EventListener);
    };
  }, [selectedScreen, toast]);
  
  const handleOpenModal = (name: string, offline: boolean) => {
    setSelectedScreen(name);
    setIsOffline(offline);
  };
  
  const handleCloseModal = () => {
    setSelectedScreen(null);
  };

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Painel de Colaboração</h1>
        <p className="text-muted-foreground">Monitore as telas da sua equipe em tempo real</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {collaborators.map((collaborator) => (
          <ScreenCard
            key={collaborator.name}
            name={collaborator.name}
            isOwner={collaborator.isOwner}
            customLabel={collaborator.label}
            isOffline={collaborator.isOffline}
            labelColor={collaborator.labelColor}
            onClick={() => handleOpenModal(collaborator.name, collaborator.isOffline)}
          />
        ))}
      </div>
      
      {selectedScreen && (
        <ScreenModal
          name={selectedScreen}
          isOpen={true}
          isOffline={isOffline}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Dashboard;

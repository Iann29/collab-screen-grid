import React, { useState } from 'react';
import ScreenCard from './ScreenCard';
import ScreenModal from './ScreenModal';

const collaborators = [
  { name: 'Ian', isOwner: true, label: 'Dev++++', isOffline: false },
  { name: 'Matheus', isOwner: false, label: 'Designer+', isOffline: true },
  { name: 'Andi', isOwner: false, label: 'Vagabundo', isOffline: true },
  { name: 'Giovani', isOwner: false, label: 'Trator', isOffline: true },
  { name: 'Julio', isOwner: false, label: 'Vadio', isOffline: true },
  { name: 'Pedro', isOwner: false, label: 'Unico que presta', isOffline: false },
  { name: 'Vini', isOwner: false, label: 'Nunca aparece', isOffline: true },
  { name: 'Dumb Dummy', isOwner: false, label: 'I.A', isOffline: true, labelColor: 'text-red-500 bg-red-100' }
];

const Dashboard: React.FC = () => {
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  
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

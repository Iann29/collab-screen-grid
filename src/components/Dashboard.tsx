
import React, { useState } from 'react';
import ScreenCard from './ScreenCard';
import ScreenModal from './ScreenModal';

const collaborators = [
  { name: 'Ian', isOwner: true, label: 'Dev++++' },
  { name: 'Matheus', isOwner: false, label: 'Designer+' },
  { name: 'Andi', isOwner: false, label: 'Vagabundo' },
  { name: 'Giovani', isOwner: false, label: 'Trator' },
  { name: 'Julio', isOwner: false, label: 'Vadio' },
  { name: 'Pedro', isOwner: false, label: 'Unico que presta' },
  { name: 'Vini', isOwner: false, label: 'Nunca aparece' }
];

const Dashboard: React.FC = () => {
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  
  const handleOpenModal = (name: string) => {
    setSelectedScreen(name);
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
      
      <div className="screen-grid">
        {collaborators.map((collaborator) => (
          <ScreenCard
            key={collaborator.name}
            name={collaborator.name}
            isOwner={collaborator.isOwner}
            customLabel={collaborator.label}
            onClick={() => handleOpenModal(collaborator.name)}
          />
        ))}
      </div>
      
      {selectedScreen && (
        <ScreenModal
          name={selectedScreen}
          isOpen={true}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Dashboard;

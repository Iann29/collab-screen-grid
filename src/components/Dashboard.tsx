import React, { useState, useEffect, useMemo } from 'react';
import ScreenCard from './ScreenCard';
import ScreenModal from './ScreenModal';
import { websocketService } from '@/services/websocket';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

// Configuração para notificações de status quando usuários ficam online/offline
const SHOW_NOTIFICATIONS = false; // Defina como true se quiser notificações toast

const initialCollaborators = [
  { name: 'Ian', isOwner: true, label: 'Dev++++', isOffline: true },
  { name: 'Matheus', isOwner: false, label: 'Designer+', isOffline: true },
  { name: 'Andi', isOwner: false, label: 'Vagabundo', isOffline: true },
  { name: 'Giovani', isOwner: false, label: 'Trator', isOffline: true },
  { name: 'Julio', isOwner: false, label: 'Vadio', isOffline: true },
  { name: 'Pedro', isOwner: false, label: 'Unico que presta', isOffline: true },
  { name: 'Vini', isOwner: false, label: 'Nunca aparece', isOffline: true },
  { name: 'Dumbdummy', isOwner: false, label: 'I.A', isOffline: true, labelColor: 'text-red-500 bg-red-100' }
];

const Dashboard: React.FC = () => {
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  
  // Rastreador de última notificação para evitar spam de notificações
  const lastNotificationRef = React.useRef<{[key: string]: boolean}>({});
  
  // Use um useEffect para inicializar a conexão WebSocket
  useEffect(() => {
    // Conectar ao WebSocket quando o componente é montado
    websocketService.connect();
    
    // Função de limpeza
    return () => {
      websocketService.disconnect();
    };
  }, []);
  
  // Handler separado para mudanças de status com debounce para melhor performance
  useEffect(() => {
    // Handler otimizado com limitação de rate para evitar atualizações excessivas
    const handleScreenStatusChange = (event: CustomEvent<{ username: string, isOnline: boolean }>) => {
      const { username, isOnline } = event.detail;
      const lowerUsername = username.toLowerCase();
      
      // Atualiza o status do colaborador
      setCollaborators(prev => 
        prev.map(collaborator => 
          collaborator.name.toLowerCase() === lowerUsername
            ? { ...collaborator, isOffline: !isOnline }
            : collaborator
        )
      );
      
      // Atualiza status da tela selecionada se for a atual
      if (selectedScreen?.toLowerCase() === lowerUsername) {
        setIsOffline(!isOnline);
      }
      
      // Gerencia notificações toast (opcional - controlado por SHOW_NOTIFICATIONS)
      if (SHOW_NOTIFICATIONS) {
        // Evita notificações repetidas para o mesmo status
        const lastStatus = lastNotificationRef.current[lowerUsername];
        if (lastStatus !== isOnline) {
          lastNotificationRef.current[lowerUsername] = isOnline;
          
          // Exibe notificação toast de acordo com o status
          if (isOnline) {
            toast({
              title: `${username.charAt(0).toUpperCase() + username.slice(1)} está online!`,
              description: "A tela agora está sendo transmitida em tempo real."
            });
          } else {
            toast({
              title: `${username.charAt(0).toUpperCase() + username.slice(1)} está offline`,
              description: "A tela não está mais sendo transmitida.",
              variant: "destructive"
            });
          }
        }
      }
    };
    
    // Registra o listener
    window.addEventListener('screen-status-change', handleScreenStatusChange as EventListener);
    
    // Remove o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('screen-status-change', handleScreenStatusChange as EventListener);
    };
  }, [selectedScreen, toast]);
  
  // Abre o modal para visualizar a tela de um colaborador
  const handleOpenModal = (name: string, offline: boolean) => {
    setSelectedScreen(name);
    setIsOffline(offline);
  };
  
  // Fecha o modal
  const handleCloseModal = () => {
    setSelectedScreen(null);
  };

  // Função para lidar com o logout
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: "Erro ao fazer logout",
        description: "Ocorreu um erro ao tentar desconectar",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Painel de Controle de Emuladores</h1>
          <p className="text-muted-foreground">Monitore e controle as ações dos emuladores em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium mr-2">Olá, {user?.username || 'Usuário'}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-1"
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
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
import { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  socket, 
  connectSocket, 
  disconnectSocket,
  joinDiagram as joinDiagramSocket,
  leaveDiagram as leaveDiagramSocket,
  emitShapeAdd,
  emitShapeUpdate,
  emitShapeDelete,
  emitCursorMove,
  emitViewUpdate,
} from '../socket';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();

  useEffect(() => {
    if (token) {
      // Connect socket when user is authenticated
      connectSocket(token);
    } else {
      // Disconnect socket when user logs out
      disconnectSocket();
    }

    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, [token]);

  const value = {
    socket,
    isConnected: socket?.connected || false,
    // Diagram room functions
    joinDiagram: (diagramId) => joinDiagramSocket(diagramId, user),
    leaveDiagram: (diagramId) => leaveDiagramSocket(diagramId, user?._id),
    // Shape functions
    emitShapeAdd,
    emitShapeUpdate,
    emitShapeDelete,
    // Collaboration functions
    emitCursorMove,
    emitViewUpdate,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 
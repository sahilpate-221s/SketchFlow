import { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  socket, 
  connectSocket, 
  disconnectSocket,
  joinDiagram,
  leaveDiagram,
  emitShapeAdd,
  emitShapeUpdate,
  emitShapeDelete,
  emitCursorUpdate,
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
    joinDiagram: (diagramId) => joinDiagram(diagramId, user),
    leaveDiagram,
    updateShape: emitShapeUpdate,
    addShape: emitShapeAdd,
    deleteShapes: emitShapeDelete,
    updateCursor: emitCursorUpdate,
    updateView: emitViewUpdate,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 
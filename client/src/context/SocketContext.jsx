import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Create socket instance with configuration
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Connect socket when user is authenticated
    if (isAuthenticated && user?.role !== 'guest') {
      newSocket.connect();
    }

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  const joinDiagram = (diagramId, mode = 'view') => {
    if (!socket) return;
    
    socket.emit('joinDiagram', {
      diagramId,
      user: {
        id: user?._id,
        name: user?.email || 'Guest',
        role: mode === 'edit' ? 'editor' : 'viewer'
      }
    });
  };

  const leaveDiagram = (diagramId) => {
    if (!socket) return;
    socket.emit('leaveDiagram', { diagramId, userId: user?._id });
  };

  const emitShapeAdd = (diagramId, shape) => {
    if (!socket) return;
    socket.emit('shapeAdd', { diagramId, shape });
  };

  const emitShapeUpdate = (diagramId, shape) => {
    if (!socket) return;
    socket.emit('shapeUpdate', { diagramId, shape });
  };

  const emitShapeDelete = (diagramId, ids) => {
    if (!socket) return;
    socket.emit('shapeDelete', { diagramId, ids });
  };

  const emitViewUpdate = (diagramId, { zoom, position }) => {
    if (!socket) return;
    socket.emit('viewUpdate', { diagramId, zoom, position });
  };

  const emitCursorMove = (diagramId, data) => {
    if (!socket) return;
    socket.emit('cursorUpdate', { diagramId, ...data });
  };

  const value = {
    socket,
    joinDiagram,
    leaveDiagram,
    emitShapeAdd,
    emitShapeUpdate,
    emitShapeDelete,
    emitViewUpdate,
    emitCursorMove
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}; 
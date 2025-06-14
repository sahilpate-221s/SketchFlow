import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useDispatch } from 'react-redux';
import { addCollaborator, removeCollaborator, updateCollaboratorPosition } from '../store/canvasSlice';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch();

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

    // Connect socket when user is authenticated or for guest access
    if (isAuthenticated || !user) {
      newSocket.connect();
    }

    // Set up collaboration event listeners
    newSocket.on('collaboratorJoined', (data) => {
      console.log('Collaborator joined:', data);
      dispatch(addCollaborator({
        id: data.id,
        ...data.user
      }));
    });

    newSocket.on('collaboratorLeft', (userId) => {
      console.log('Collaborator left:', userId);
      dispatch(removeCollaborator(userId));
    });

    newSocket.on('cursorUpdate', (data) => {
      console.log('Cursor update:', data);
      dispatch(updateCollaboratorPosition({
        id: data.id,
        position: data.position,
        color: data.color,
        name: data.name,
        tool: data.tool,
        selection: data.selection
      }));
    });

    newSocket.on('diagramState', (data) => {
      console.log('Received diagram state:', data);
      // Handle initial diagram state
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.off('collaboratorJoined');
        newSocket.off('collaboratorLeft');
        newSocket.off('cursorUpdate');
        newSocket.off('diagramState');
        newSocket.off('error');
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, user, dispatch]);

  const joinDiagram = (diagramId, mode = 'view', shareToken = null) => {
    if (!socket) return;
    
    const userInfo = {
      id: user?._id,
      name: user?.email || 'Guest',
      role: mode === 'edit' ? 'editor' : 'viewer'
    };

    console.log('Joining diagram:', { diagramId, userInfo });
    
    socket.emit('joinDiagram', {
      diagramId,
      user: userInfo
    });
  };

  const leaveDiagram = (diagramId) => {
    if (!socket) return;
    console.log('Leaving diagram:', diagramId);
    socket.emit('leaveDiagram', { diagramId });
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

  const emitViewUpdate = (diagramId, zoom, position) => {
    if (!socket) return;
    socket.emit('viewUpdate', { diagramId, zoom, position });
  };

  const emitCursorMove = (diagramId, position, selection, tool) => {
    if (!socket) return;
    socket.emit('cursorUpdate', { 
      diagramId, 
      position, 
      selection, 
      tool 
    });
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
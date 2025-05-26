import { io } from 'socket.io-client';
import { store } from './store';
import {
  addCollaborator,
  removeCollaborator,
  updateCollaboratorPosition,
  updateCanvas,
} from './store/canvasSlice';

// Create socket instance with configuration
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
  autoConnect: false, // Don't connect automatically
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Socket event handlers
socket.on('connect', () => {
  console.log('Socket connected');
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Canvas collaboration events
socket.on('canvasUpdate', (data) => {
  store.dispatch(updateCanvas(data));
});

socket.on('collaboratorJoined', (collaborator) => {
  store.dispatch(addCollaborator(collaborator));
});

socket.on('collaboratorLeft', (userId) => {
  store.dispatch(removeCollaborator(userId));
});

socket.on('collaboratorMoved', ({ userId, position, selection, tool }) => {
  store.dispatch(updateCollaboratorPosition({ 
    id: userId, 
    position,
    selection,
    tool,
    lastUpdate: Date.now()
  }));
});

// Helper functions for emitting events
export const emitCanvasUpdate = (diagramId, data) => {
  socket.emit('canvasUpdate', { diagramId, data });
};

export const emitCursorMove = (diagramId, data) => {
  const { position, selection, tool } = data;
  socket.emit('cursorMove', { 
    diagramId, 
    position,
    selection,
    tool,
    timestamp: Date.now()
  });
};

export const joinDiagram = (diagramId, user) => {
  socket.emit('joinDiagram', { 
    diagramId, 
    user,
    timestamp: Date.now()
  });
};

export const leaveDiagram = (diagramId, userId) => {
  socket.emit('leaveDiagram', { 
    diagramId, 
    userId,
    timestamp: Date.now()
  });
};

// Connect socket when user is authenticated
export const connectSocket = (token) => {
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
};

// Disconnect socket
export const disconnectSocket = () => {
  socket.disconnect();
};

export const emitShapeAdd = (diagramId, shapeData) => {
  socket.emit('shapeAdd', { diagramId, shapeData });
};

export const emitShapeUpdate = (diagramId, shapeData) => {
  socket.emit('shapeUpdate', { diagramId, shapeData });
};

export const emitShapeDelete = (diagramId, shapeIds) => {
  socket.emit('shapeDelete', { diagramId, shapeIds });
};

export const emitCursorUpdate = (diagramId, cursorData) => {
  socket.emit('cursorUpdate', { diagramId, cursorData });
};

export const emitViewUpdate = (diagramId, viewData) => {
  socket.emit('viewUpdate', { diagramId, viewData });
};

export const emitSelectionUpdate = (diagramId, selectionData) => {
  socket.emit('selectionUpdate', { 
    diagramId, 
    selectionData,
    timestamp: Date.now()
  });
};

export const emitToolUpdate = (diagramId, toolData) => {
  socket.emit('toolUpdate', { 
    diagramId, 
    toolData,
    timestamp: Date.now()
  });
};

export { socket };

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

socket.on('collaboratorMoved', ({ userId, position }) => {
  store.dispatch(updateCollaboratorPosition({ id: userId, position }));
});

// Helper functions for emitting events
export const emitCanvasUpdate = (diagramId, data) => {
  socket.emit('canvasUpdate', { diagramId, data });
};

export const emitCursorMove = (diagramId, position) => {
  socket.emit('cursorMove', { diagramId, position });
};

export const joinDiagram = (diagramId, user) => {
  socket.emit('joinDiagram', { diagramId, user });
};

export const leaveDiagram = (diagramId, userId) => {
  socket.emit('leaveDiagram', { diagramId, userId });
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

export { socket }; 
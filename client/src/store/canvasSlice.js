import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

const initialState = {
  shapes: [],
  selectedIds: [],
  history: [],
  historyIndex: -1,
  clipboard: [],
  tool: 'select', // select, rectangle, circle, line, arrow, text, freehand
  strokeStyle: 'solid', // solid, dashed
  strokeWidth: 2,
  strokeColor: '#000000',
  fillColor: '#ffffff',
  fontSize: 16,
  fontFamily: 'Handlee',
  gridSize: 20,
  zoom: 1,
  isGridSnap: true,
  isGridVisible: true,
  textAlign: 'left',
  stickyNotes: [],
  markdownContent: '',
  isMarkdownEditorVisible: false,
  collaborators: [], // Changed from {} to []
  selectedShape: null,
  isDragging: false,
  isPanning: false,
  lastMousePosition: { x: 0, y: 0 },
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // Canvas content
    updateCanvas: (state, action) => {
      const { shapes, stickyNotes } = action.payload;
      if (shapes) state.shapes = shapes;
      if (stickyNotes) state.stickyNotes = stickyNotes;
      // Add to history
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push({
        type: 'UPDATE_CANVAS',
        shapes: [...state.shapes],
        stickyNotes: [...state.stickyNotes],
      });
      state.historyIndex++;
    },
    // Shape actions
    addShape: (state, action) => {
      state.shapes.push(action.payload);
      // Clear redo history when new action is performed
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push({ type: 'ADD_SHAPE', shape: action.payload });
      state.historyIndex += 1;
    },
    updateShape: (state, action) => {
      const { id, ...updates } = action.payload;
      const shape = state.shapes.find(s => s.id === id);
      if (shape) {
        Object.assign(shape, updates);
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ type: 'UPDATE_SHAPE', id, updates });
        state.historyIndex += 1;
      }
    },
    deleteShapes: (state, action) => {
      const ids = action.payload;
      const deletedShapes = state.shapes.filter(s => ids.includes(s.id));
      state.shapes = state.shapes.filter(s => !ids.includes(s.id));
      state.selectedIds = state.selectedIds.filter(id => !ids.includes(id));
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push({ type: 'DELETE_SHAPES', shapes: deletedShapes });
      state.historyIndex += 1;
    },
    setGridVisible: (state, action) => {
      state.isGridVisible = action.payload;
      // Add to history
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push({ 
        type: 'SET_GRID_VISIBLE', 
        value: action.payload,
        previousValue: !action.payload 
      });
      state.historyIndex += 1;
    },

    // Selection actions
    setSelectedIds: (state, action) => {
      state.selectedIds = action.payload;
    },

    // Tool actions
    setTool: (state, action) => {
      state.tool = action.payload;
    },
    setStrokeStyle: (state, action) => {
      state.strokeStyle = action.payload;
    },
    setStrokeWidth: (state, action) => {
      state.strokeWidth = action.payload;
    },
    setStrokeColor: (state, action) => {
      state.strokeColor = action.payload;
    },
    setFillColor: (state, action) => {
      state.fillColor = action.payload;
    },
    setFontSize: (state, action) => {
      state.fontSize = action.payload;
    },

    // Grid and zoom actions
    setGridSnap: (state, action) => {
      state.isGridSnap = action.payload;
    },
    setZoom: (state, action) => {
      state.zoom = action.payload;
    },

    // Clipboard actions
    copyToClipboard: (state, action) => {
      const shapesToCopy = state.shapes.filter(shape => 
        state.selectedIds.includes(shape.id)
      );
      state.clipboard = shapesToCopy.map(shape => ({
        ...shape,
        id: uuidv4(), // Generate new IDs for pasted shapes
      }));
    },

    pasteFromClipboard: (state, action) => {
      const offset = action.payload || { x: 10, y: 10 };
      const pastedShapes = state.clipboard.map(shape => ({
        ...shape,
        x: shape.x + offset.x,
        y: shape.y + offset.y,
        id: uuidv4(), // Generate new IDs for pasted shapes
      }));
      state.shapes.push(...pastedShapes);
      state.selectedIds = pastedShapes.map(shape => shape.id);
    },

    // Export/Import actions
    exportCanvas: (state) => {
      const exportData = {
        shapes: state.shapes,
        stickyNotes: state.stickyNotes,
        version: '1.0',
        timestamp: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canvas-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    importCanvas: (state, action) => {
      const { shapes, stickyNotes } = action.payload;
      state.shapes = shapes.map(shape => ({
        ...shape,
        id: uuidv4(), // Generate new IDs for imported shapes
      }));
      state.stickyNotes = stickyNotes.map(note => ({
        ...note,
        id: uuidv4(), // Generate new IDs for imported notes
      }));
      state.selectedIds = [];
    },

    // Sticky Notes actions
    addStickyNote: (state, action) => {
      const newNote = {
        id: uuidv4(),
        text: '',
        color: action.payload.color || '#fef08a',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.stickyNotes.push(newNote);
      // Add to history
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push({ type: 'ADD_STICKY_NOTE', note: newNote });
      state.historyIndex += 1;
    },

    updateStickyNote: (state, action) => {
      const { id, ...updates } = action.payload;
      const note = state.stickyNotes.find(n => n.id === id);
      if (note) {
        const previousState = { ...note };
        Object.assign(note, updates, { updatedAt: new Date().toISOString() });
        // Add to history
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ 
          type: 'UPDATE_STICKY_NOTE', 
          id, 
          updates,
          previousState 
        });
        state.historyIndex += 1;
      }
    },

    deleteStickyNote: (state, action) => {
      const note = state.stickyNotes.find(n => n.id === action.payload);
      if (note) {
        state.stickyNotes = state.stickyNotes.filter(n => n.id !== action.payload);
        // Add to history
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ type: 'DELETE_STICKY_NOTE', note });
        state.historyIndex += 1;
      }
    },

    // Markdown Editor
    toggleMarkdownEditor: (state) => {
      state.isMarkdownEditorVisible = !state.isMarkdownEditorVisible;
    },
    updateMarkdownContent: (state, action) => {
      const previousContent = state.markdownContent;
      state.markdownContent = action.payload;
      // Add to history
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push({
        type: 'markdown',
        action: 'update',
        previousContent,
        newContent: action.payload,
      });
      state.historyIndex = state.history.length - 1;
    },

    // Collaboration
    addCollaborator: (state, action) => {
      const existingIndex = state.collaborators.findIndex(c => c.id === action.payload.id);
      if (existingIndex === -1) {
        state.collaborators.push(action.payload);
      } else {
        state.collaborators[existingIndex] = action.payload;
      }
    },
    removeCollaborator: (state, action) => {
      state.collaborators = state.collaborators.filter(
        (collaborator) => collaborator.id !== action.payload
      );
    },
    updateCollaboratorPosition: (state, action) => {
      const { id, position, color, name } = action.payload;
      const collaborator = state.collaborators.find((c) => c.id === id);
      if (collaborator) {
        collaborator.position = position;
        if (color) collaborator.color = color;
        if (name) collaborator.name = name;
      } else {
        // If collaborator doesn't exist, add them
        state.collaborators.push({
          id,
          position,
          color: color || '#ff0000',
          name: name || 'User',
        });
      }
    },

    // Selection
    setSelectedShape: (state, action) => {
      state.selectedShape = action.payload;
    },
    clearSelection: (state) => {
      state.selectedShape = null;
    },

    // Mouse State
    setIsDragging: (state, action) => {
      state.isDragging = action.payload;
    },
    setIsPanning: (state, action) => {
      state.isPanning = action.payload;
    },
    setLastMousePosition: (state, action) => {
      state.lastMousePosition = action.payload;
    },

    // Undo/Redo actions
    undo: (state) => {
      if (state.historyIndex > 0) {
        const action = state.history[state.historyIndex];
        state.historyIndex--;

        switch (action.type) {
          case 'shape':
            if (action.action === 'add') {
              state.shapes = state.shapes.filter((shape) => shape.id !== action.shapeId);
            } else if (action.action === 'update') {
              const shapeIndex = state.shapes.findIndex((shape) => shape.id === action.shapeId);
              if (shapeIndex !== -1) {
                state.shapes[shapeIndex] = action.previousState;
              }
            } else if (action.action === 'delete') {
              state.shapes.push(action.shape);
            }
            break;
          case 'stickyNote':
            if (action.action === 'add') {
              state.stickyNotes = state.stickyNotes.filter((note) => note.id !== action.noteId);
            } else if (action.action === 'update') {
              const noteIndex = state.stickyNotes.findIndex((note) => note.id === action.noteId);
              if (noteIndex !== -1) {
                state.stickyNotes[noteIndex] = action.previousState;
              }
            } else if (action.action === 'delete') {
              state.stickyNotes.push(action.note);
            }
            break;
          case 'markdown':
            state.markdownContent = action.previousContent;
            break;
          case 'grid':
            state.isGridVisible = action.previousState;
            break;
        }
      }
    },
    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const action = state.history[state.historyIndex];

        switch (action.type) {
          case 'shape':
            if (action.action === 'add') {
              state.shapes.push(action.shape);
            } else if (action.action === 'update') {
              const shapeIndex = state.shapes.findIndex((shape) => shape.id === action.shapeId);
              if (shapeIndex !== -1) {
                state.shapes[shapeIndex] = action.newState;
              }
            } else if (action.action === 'delete') {
              state.shapes = state.shapes.filter((shape) => shape.id !== action.shapeId);
            }
            break;
          case 'stickyNote':
            if (action.action === 'add') {
              state.stickyNotes.push(action.note);
            } else if (action.action === 'update') {
              const noteIndex = state.stickyNotes.findIndex((note) => note.id === action.noteId);
              if (noteIndex !== -1) {
                state.stickyNotes[noteIndex] = action.newState;
              }
            } else if (action.action === 'delete') {
              state.stickyNotes = state.stickyNotes.filter((note) => note.id !== action.noteId);
            }
            break;
          case 'markdown':
            state.markdownContent = action.newContent;
            break;
          case 'grid':
            state.isGridVisible = action.newState;
            break;
        }
      }
    },
    setTextAlign: (state, action) => {
      state.textAlign = action.payload;
    },
  },
});

export const {
  addShape,
  updateShape,
  deleteShapes,
  setSelectedIds,
  setTool,
  setStrokeStyle,
  setStrokeWidth,
  setStrokeColor,
  setFillColor,
  setFontSize,
  setTextAlign,
  setGridSnap,
  setGridVisible,
  setZoom,
  undo,
  redo,
  copyToClipboard,
  pasteFromClipboard,
  exportCanvas,
  importCanvas,
  addStickyNote,
  updateStickyNote,
  deleteStickyNote,
  toggleMarkdownEditor,
  updateMarkdownContent,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorPosition,
  setSelectedShape,
  clearSelection,
  setIsDragging,
  setIsPanning,
  setLastMousePosition,
  updateCanvas,
} = canvasSlice.actions;

export default canvasSlice.reducer; 
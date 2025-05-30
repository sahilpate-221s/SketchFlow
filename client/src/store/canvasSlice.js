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
  isGridSnap: false,
  isGridVisible: false,
  textAlign: 'left',
  stickyNotes: [],
  markdownContent: '',
  isMarkdownEditorVisible: false,
  collaborators: [], // Changed from {} to []
  selectedShape: null,
  isDragging: false,
  isPanning: false,
  lastMousePosition: { x: 0, y: 0 },
  canUndo: false,
  canRedo: false,
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
      state.canUndo = state.historyIndex > 0;
      state.canRedo = false;
    },
    // Shape actions
    addShape: (state, action) => {
      const newShape = action.payload;
      
      // Add default properties based on shape type
      switch (newShape.type) {
        case 'sticky':
          newShape.width = newShape.width || 200;
          newShape.height = newShape.height || 150;
          newShape.fill = newShape.fill || '#fef08a';
          newShape.text = newShape.text || '';
          newShape.fontSize = newShape.fontSize || 16;
          break;
        case 'markdown':
          newShape.width = newShape.width || 300;
          newShape.height = newShape.height || 200;
          newShape.fill = '#ffffff';
          newShape.text = newShape.text || '';
          newShape.fontSize = newShape.fontSize || 14;
          break;
        case 'text':
          newShape.width = newShape.width || 200;
          newShape.height = newShape.height || 50;
          newShape.text = newShape.text || '';
          newShape.fontSize = newShape.fontSize || 16;
          break;
        case 'rectangle':
          newShape.width = newShape.width || 100;
          newShape.height = newShape.height || 100;
          break;
        case 'circle':
          newShape.radius = newShape.radius || 50;
          break;
      }

      state.shapes.push(newShape);
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.shapes]);
      state.historyIndex++;
      state.canUndo = state.historyIndex > 0;
      state.canRedo = false;
    },
    updateShape: (state, action) => {
      const updatedShape = action.payload;
      const index = state.shapes.findIndex(s => s.id === updatedShape.id);
      if (index !== -1) {
        state.shapes[index] = updatedShape;
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push([...state.shapes]);
        state.historyIndex++;
        state.canUndo = state.historyIndex > 0;
        state.canRedo = false;
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
      state.canUndo = state.historyIndex > 0;
      state.canRedo = false;
    },
    setGridVisible: (state, action) => {
      const newValue = typeof action.payload === 'boolean' ? action.payload : !state.isGridVisible;
      state.isGridVisible = newValue;
      // Add to history with proper type
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push({
        type: 'grid',
        action: 'update',
        previousState: !newValue,
        newState: newValue
      });
      state.historyIndex++;
      state.canUndo = state.historyIndex > 0;
      state.canRedo = false;
    },

    // Selection actions
    setSelectedIds: (state, action) => {
      state.selectedIds = action.payload;
    },

    // Tool actions
    setTool: (state, action) => {
      state.tool = action.payload;
      if (action.payload === 'markdown') {
        state.isMarkdownEditorVisible = true;
      }
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
      state.canUndo = state.historyIndex > 0;
      state.canRedo = false;
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
        state.canUndo = state.historyIndex > 0;
        state.canRedo = false;
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
        state.canUndo = state.historyIndex > 0;
        state.canRedo = false;
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
      state.canUndo = state.historyIndex > 0;
      state.canRedo = false;
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
          case 'UPDATE_CANVAS':
            state.shapes = action.shapes;
            state.stickyNotes = action.stickyNotes;
            break;
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
        state.canUndo = state.historyIndex > 0;
        state.canRedo = true;
      }
    },
    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const action = state.history[state.historyIndex];

        switch (action.type) {
          case 'UPDATE_CANVAS':
            state.shapes = action.shapes;
            state.stickyNotes = action.stickyNotes;
            break;
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
        state.canUndo = true;
        state.canRedo = state.historyIndex < state.history.length - 1;
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
  setGridVisible,
  setGridSnap,
  setGridSize,
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
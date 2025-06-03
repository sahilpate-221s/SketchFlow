import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Line, Arrow, Text, Transformer, Group, Image, RegularPolygon } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  addShape,
  updateShape,
  deleteShapes,
  setSelectedIds,
  setZoom,
  copyToClipboard,
  pasteFromClipboard,
  exportCanvas,
  importCanvas,
  updateCollaboratorPosition,
  removeCollaborator,
  undo,
  redo,
  setTool,
  setIsDragging,
  setIsPanning,
  setLastMousePosition,
} from '../store/canvasSlice';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import StickyNotes from './StickyNotes';
import MarkdownEditor from './MarkdownEditor';
import { Portal } from 'react-konva-utils';
import ReactMarkdown from 'react-markdown';

const SMOOTHING_FACTOR = 0.3; // For freehand smoothing
const MIN_DISTANCE = 2; // Minimum distance between points for freehand
const POINT_THRESHOLD = 5; // Distance threshold for point reduction
const LINE_SMOOTHING = true; // Enable line smoothing

const Canvas = ({ readOnly = false }) => {
  const dispatch = useDispatch();
  const { id: diagramId } = useParams();
  const { socket, joinDiagram, leaveDiagram, emitShapeAdd, emitShapeUpdate, emitShapeDelete, emitViewUpdate, emitCursorMove } = useSocket();
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [editingTextPos, setEditingTextPos] = useState({ x: 0, y: 0 });
  const [stickyNoteImage, setStickyNoteImage] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isMarkdownPanelOpen, setIsMarkdownPanelOpen] = useState(false);
  const [editingMarkdownId, setEditingMarkdownId] = useState(null);
  const [editingMarkdownValue, setEditingMarkdownValue] = useState('');
  const [isPlacingStickyNote, setIsPlacingStickyNote] = useState(false);
  const markdownPanelRef = useRef(null);
  const [collaboratorCursors, setCollaboratorCursors] = useState({});
  const [collaboratorPresence, setCollaboratorPresence] = useState({});
  const cursorTimeoutRef = useRef({});
  const lastCursorUpdateRef = useRef({});
  const navigate = useNavigate();

  // Add stage width and height state with larger initial size
  const [stageWidth, setStageWidth] = useState(window.innerWidth * 2); // Make workspace larger
  const [stageHeight, setStageHeight] = useState(window.innerHeight * 2);

  // Update stage size on window resize
  useEffect(() => {
    const handleResize = () => {
      // Keep the workspace larger than the viewport
      setStageWidth(Math.max(window.innerWidth * 2, stageWidth));
      setStageHeight(Math.max(window.innerHeight * 2, stageHeight));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [stageWidth, stageHeight]);

  const {
    shapes,
    selectedIds,
    tool,
    strokeStyle,
    strokeWidth,
    strokeColor,
    fillColor,
    fontSize,
    isGridSnap,
    gridSize,
    zoom,
    isGridVisible,
    isDragging,
    isPanning,
    lastMousePosition,
    collaborators,
    canUndo,
    canRedo,
  } = useSelector((state) => state.canvas);

  // Add grid rendering constants
  const GRID_SIZE = 20; // Size of each grid cell
  const GRID_EXTENSION = 2000; // How far to extend the grid beyond the visible area

  // Add effect to handle undo/redo state changes - moved after state destructuring
  useEffect(() => {
    console.log('Undo/Redo state:', { canUndo, canRedo });
  }, [canUndo, canRedo]);

  // Initialize socket events
  useEffect(() => {
    if (!socket || !diagramId) return;

    joinDiagram(diagramId);

    socket.on('shapeUpdate', (data) => {
      dispatch(updateShape(data.shape));
    });

    socket.on('shapeAdd', (data) => {
      dispatch(addShape(data.shape));
    });

    socket.on('shapeDelete', (data) => {
      dispatch(deleteShapes(data.ids));
    });

    socket.on('view-update', (data) => {
      if (stageRef.current) {
        stageRef.current.scale({ x: data.zoom, y: data.zoom });
        stageRef.current.position(data.position);
        dispatch(setZoom(data.zoom));
      }
    });

    socket.on('collaborator-joined', (data) => {
      dispatch(addCollaborator(data.collaborator));
    });

    socket.on('collaborator-left', (data) => {
      dispatch(removeCollaborator(data.userId));
    });

    socket.on('collaborator-moved', (data) => {
      dispatch(updateCollaboratorPosition({ id: data.userId, position: data.position }));
    });

    // Handle cursor movement with throttling
    socket.on('cursorMove', (data) => {
      const { userId, position, user } = data;
      const now = Date.now();
      
      // Throttle cursor updates (max 30fps)
      if (lastCursorUpdateRef.current[userId] && now - lastCursorUpdateRef.current[userId] < 33) {
        return;
      }
      lastCursorUpdateRef.current[userId] = now;

      setCollaboratorCursors(prev => ({
        ...prev,
        [userId]: {
          position,
          user,
          lastUpdate: now
        }
      }));

      // Clear existing timeout
      if (cursorTimeoutRef.current[userId]) {
        clearTimeout(cursorTimeoutRef.current[userId]);
      }

      // Set timeout to remove cursor if no updates
      cursorTimeoutRef.current[userId] = setTimeout(() => {
        setCollaboratorCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[userId];
          return newCursors;
        });
      }, 2000); // Remove cursor after 2 seconds of inactivity
    });

    // Handle user presence
    socket.on('userPresence', (data) => {
      const { users } = data;
      setCollaboratorPresence(users);
    });

    // Handle user joined
    socket.on('userJoined', (data) => {
      const { user } = data;
      setCollaboratorPresence(prev => ({
        ...prev,
        [user.id]: user
      }));
    });

    // Handle user left
    socket.on('userLeft', (data) => {
      const { userId } = data;
      setCollaboratorPresence(prev => {
        const newPresence = { ...prev };
        delete newPresence[userId];
        return newPresence;
      });
      setCollaboratorCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[userId];
        return newCursors;
      });
    });

    return () => {
      leaveDiagram(diagramId);
      socket.off('shapeUpdate');
      socket.off('shapeAdd');
      socket.off('shapeDelete');
      socket.off('view-update');
      socket.off('collaborator-joined');
      socket.off('collaborator-left');
      socket.off('collaborator-moved');
      // Clear all timeouts
      Object.values(cursorTimeoutRef.current).forEach(clearTimeout);
      socket.off('cursorMove');
      socket.off('userPresence');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [socket, diagramId, dispatch, joinDiagram, leaveDiagram]);

  // Load sticky note background image
  useEffect(() => {
    const img = new window.Image();
    img.src = '/sticky-note-bg.svg';
    img.onload = () => setStickyNoteImage(img);
  }, []);

  // Update handleMouseMove to make freehand drawing smoother
  const handleMouseMove = useCallback((e) => {
    if (!socket || !diagramId) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    if (isDrawing && currentShape) {
      console.log('Updating shape during drag:', { tool, currentShape });
    }

    // Throttle cursor updates
    const now = Date.now();
    if (lastCursorUpdateRef.current['self'] && now - lastCursorUpdateRef.current['self'] < 16) { // 60fps
      return;
    }
    lastCursorUpdateRef.current['self'] = now;

    // Emit cursor position with user info and current state
    emitCursorMove(diagramId, {
      position: point,
      selection: selectedIds,
      tool,
      user: {
        id: socket.id,
        name: 'You',
        color: '#FF0000'
      }
    });

    if (readOnly) return;

    if (isPanning && lastMousePosition) {
      const dx = point.x - lastMousePosition.x;
      const dy = point.y - lastMousePosition.y;
      stage.position({
        x: stage.x() + dx,
        y: stage.y() + dy,
      });
      dispatch(setLastMousePosition(point));
      
      emitViewUpdate(diagramId, {
        zoom: stage.scaleX(),
        position: stage.position(),
      });
      return;
    }

    if (!isDrawing || !currentShape) return;

    // Get precise point position considering zoom and pan
    const stagePoint = {
      x: (point.x - stage.x()) / stage.scaleX(),
      y: (point.y - stage.y()) / stage.scaleY()
    };

    // For freehand, use exact mouse position without snapping
    // For other tools, snap only if not drawing to avoid odd shapes
    const pointToUse = tool === 'freehand' ? stagePoint : {
      x: isDrawing ? stagePoint.x : snapToGrid(stagePoint.x),
      y: isDrawing ? stagePoint.y : snapToGrid(stagePoint.y),
    };

    let updatedShape;
    switch (tool) {
      case 'rectangle': {
        const width = pointToUse.x - startPoint.x;
        const height = pointToUse.y - startPoint.y;
        updatedShape = {
          ...currentShape,
          x: width < 0 ? pointToUse.x : startPoint.x,
          y: height < 0 ? pointToUse.y : startPoint.y,
          width: Math.abs(width),
          height: Math.abs(height),
        };
        break;
      }
      case 'circle': {
        const radius = Math.sqrt(
          Math.pow(pointToUse.x - startPoint.x, 2) +
          Math.pow(pointToUse.y - startPoint.y, 2)
        );
        updatedShape = {
          ...currentShape,
          x: startPoint.x,
          y: startPoint.y,
          radius,
        };
        break;
      }
      case 'line':
      case 'arrow': {
        // Simplified line/arrow drawing - just use start and end points
        updatedShape = {
          ...currentShape,
          points: [startPoint.x, startPoint.y, pointToUse.x, pointToUse.y],
        };
        break;
      }
      case 'freehand': {
        // Improved freehand drawing with smoothing
        const points = currentShape.points;
        const lastPoint = points.slice(-2);
        
        const distance = Math.sqrt(
          Math.pow(pointToUse.x - lastPoint[0], 2) +
          Math.pow(pointToUse.y - lastPoint[1], 2)
        );
        
        if (distance >= MIN_DISTANCE) {
          const smoothedPoints = [...points];
          if (points.length >= 4) {
            const prevPoint = points.slice(-4, -2);
            const smoothedX = lastPoint[0] + (pointToUse.x - lastPoint[0]) * SMOOTHING_FACTOR;
            const smoothedY = lastPoint[1] + (pointToUse.y - lastPoint[1]) * SMOOTHING_FACTOR;
            
            smoothedPoints[smoothedPoints.length - 2] = smoothedX;
            smoothedPoints[smoothedPoints.length - 1] = smoothedY;
          }
          
          smoothedPoints.push(pointToUse.x, pointToUse.y);
          
          if (smoothedPoints.length > 6) {
            const reducedPoints = reducePoints(smoothedPoints, POINT_THRESHOLD);
            updatedShape = {
              ...currentShape,
              points: reducedPoints,
            };
          } else {
            updatedShape = {
              ...currentShape,
              points: smoothedPoints,
            };
          }
        } else {
          return;
        }
        break;
      }
      default:
        return;
    }

    if (updatedShape) {
      setCurrentShape(updatedShape);
      dispatch(updateShape(updatedShape));
      emitShapeUpdate(diagramId, updatedShape);
    }
  }, [socket, diagramId, readOnly, isPanning, lastMousePosition, isDrawing, currentShape, tool, startPoint, dispatch, emitCursorMove, emitViewUpdate, emitShapeUpdate, selectedIds, zoom]);

  // Add this helper function for point reduction
  const reducePoints = (points, threshold) => {
    if (points.length <= 4) return points;
    
    const result = [points[0], points[1]]; // Keep first point
    let lastPoint = [points[0], points[1]];
    
    for (let i = 2; i < points.length; i += 2) {
      const currentPoint = [points[i], points[i + 1]];
      const distance = Math.sqrt(
        Math.pow(currentPoint[0] - lastPoint[0], 2) +
        Math.pow(currentPoint[1] - lastPoint[1], 2)
      );
      
      if (distance >= threshold) {
        result.push(currentPoint[0], currentPoint[1]);
        lastPoint = currentPoint;
      }
    }
    
    // Always keep the last point
    if (result[result.length - 2] !== points[points.length - 2] ||
        result[result.length - 1] !== points[points.length - 1]) {
      result.push(points[points.length - 2], points[points.length - 1]);
    }
    
    return result;
  };

  // Handle space key for panning
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
        if (stageRef.current) {
          stageRef.current.container().style.cursor = 'grab';
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        if (stageRef.current && !isPanning) {
          stageRef.current.container().style.cursor = 'default';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, isPanning, readOnly]);

  // Update handleMouseUp to auto-select select tool after shape creation
  const handleMouseUp = (e) => {
    if (readOnly) return;

    if (isPanning) {
      dispatch(setIsPanning(false));
      if (stageRef.current) {
        stageRef.current.container().style.cursor = isSpacePressed ? 'grab' : 'default';
      }
      return;
    }

    if (isDrawing) {
      if (currentShape) {
        // For line and arrow tools, ensure we have valid points
        if (currentShape.type === 'line' || currentShape.type === 'arrow') {
          const points = currentShape.points;
          // Only create the shape if we have moved enough distance
          const dx = points[2] - points[0];
          const dy = points[3] - points[1];
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) { // Minimum distance threshold
            dispatch(updateShape(currentShape));
            emitShapeUpdate(diagramId, currentShape);
            // Select the newly created shape
            dispatch(setSelectedIds([currentShape.id]));
          } else {
            // If the line is too short, remove it
            dispatch(deleteShapes([currentShape.id]));
            emitShapeDelete(diagramId, [currentShape.id]);
          }
        } else {
          // For other shapes, update as normal
          dispatch(updateShape(currentShape));
          emitShapeUpdate(diagramId, currentShape);
          // Select the newly created shape
          dispatch(setSelectedIds([currentShape.id]));
        }
      }
      setIsDrawing(false);
      setCurrentShape(null);
      
      // Auto-select the select tool after shape creation
      dispatch(setTool('select'));
    }
  };

  // Update handleMouseDown to only handle markdown panel
  const handleMouseDown = (e) => {
    console.log('MouseDown event:', { tool, isDrawing, readOnly });
    
    if (readOnly) {
      console.log('Canvas is in read-only mode');
      return;
    }

    // Stop event propagation to prevent unwanted behavior
    e.cancelBubble = true;
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) {
      console.log('No stage found');
      return;
    }

    const point = stage.getPointerPosition();
    if (!point) {
      console.log('No pointer position found');
      return;
    }

    // Handle markdown tool separately - just open the panel
    if (tool === 'markdown') {
      setIsMarkdownPanelOpen(true);
      dispatch(setTool('select')); // Switch back to select tool after opening panel
      return;
    }

    // Handle eraser tool first
    if (tool === 'eraser') {
      const clickedShape = e.target;
      if (clickedShape !== stage) {
        const shapeId = clickedShape.id();
        if (shapeId) {
          console.log('Erasing shape:', shapeId);
          dispatch(deleteShapes([shapeId]));
          emitShapeDelete(diagramId, [shapeId]);
        }
      }
      return;
    }
    
    // Convert point to stage coordinates considering zoom and pan
    const stagePoint = {
      x: (point.x - stage.x()) / stage.scaleX(),
      y: (point.y - stage.y()) / stage.scaleY()
    };

    console.log('Stage point:', stagePoint);

    // For freehand, use exact mouse position without snapping
    const pointToUse = tool === 'freehand' ? stagePoint : {
      x: snapToGrid(stagePoint.x),
      y: snapToGrid(stagePoint.y),
    };

    // Handle panning first
    if (isSpacePressed || tool === 'pan') {
      console.log('Starting pan');
      dispatch(setIsPanning(true));
      dispatch(setLastMousePosition(point));
      stage.container().style.cursor = 'grabbing';
      return;
    }

    // Handle selection
    if (tool === 'select') {
      console.log('Handling selection');
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        dispatch(setSelectedIds([]));
      }
      return;
    }

    // If we're already drawing, don't start a new shape
    if (isDrawing) {
      console.log('Already drawing, ignoring mousedown');
      return;
    }

    // Start drawing new shape
    console.log('Starting to draw new shape with tool:', tool);
    setIsDrawing(true);
    setStartPoint(pointToUse);

    // Create new shape based on current tool
    const newShape = {
      id: uuidv4(),
      type: tool,
      x: pointToUse.x,
      y: pointToUse.y,
      stroke: strokeColor,
      strokeWidth: tool === 'freehand' ? 2 : strokeWidth,
      strokeStyle: tool === 'freehand' ? 'solid' : strokeStyle,
      fill: tool === 'sticky' ? '#fef08a' : fillColor,
      fontSize,
      draggable: !readOnly,
      rotation: 0,
    };

    console.log('Created new shape:', newShape);

    // Add tool-specific properties with initial minimal size
    switch (tool) {
      case 'rectangle':
        newShape.width = 0;
        newShape.height = 0;
        break;
      case 'circle':
        newShape.radius = 0;
        break;
      case 'line':
      case 'arrow':
        newShape.points = [pointToUse.x, pointToUse.y, pointToUse.x, pointToUse.y];
        break;
      case 'freehand':
        newShape.points = [pointToUse.x, pointToUse.y];
        break;
      case 'text':
        newShape.width = 0;
        newShape.height = 0;
        newShape.text = '';
        break;
      case 'sticky':
        newShape.width = 0;
        newShape.height = 0;
        newShape.text = 'Double click to edit...';
        break;
      case 'markdown':
        newShape.width = 0;
        newShape.height = 0;
        newShape.text = '';
        break;
      default:
        console.log('Invalid tool:', tool);
        dispatch(setTool('select'));
        setIsDrawing(false);
        return;
    }

    // Only proceed if we have a valid drawing tool
    if (['rectangle', 'circle', 'line', 'arrow', 'freehand', 'text', 'sticky', 'markdown'].includes(tool)) {
      console.log('Adding shape to canvas');
      setCurrentShape(newShape);
      dispatch(addShape(newShape));
      emitShapeAdd(diagramId, newShape);

      // Handle text-based tools
      if (tool === 'text' || tool === 'sticky' || tool === 'markdown') {
        handleTextEdit(newShape.id, newShape.text || '', pointToUse);
      }
    } else {
      console.log('Invalid drawing tool:', tool);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e) => {
      // Undo (Ctrl+Z)
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        console.log('Undoing last action');
        dispatch(undo());
        return;
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        console.log('Redoing last action');
        dispatch(redo());
        return;
      }

      // Copy (Ctrl+C)
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        dispatch(copyToClipboard());
        return;
      }

      // Paste (Ctrl+V)
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        dispatch(pasteFromClipboard());
        return;
      }

      // Delete selected shapes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          dispatch(deleteShapes(selectedIds));
          emitShapeDelete(diagramId, selectedIds);
          dispatch(setSelectedIds([]));
        }
        return;
      }

      // Tool shortcuts
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            dispatch(setTool('select'));
            break;
          case 'h':
            dispatch(setTool('pan'));
            break;
          case 'r':
            dispatch(setTool('rectangle'));
            break;
          case 'c':
            dispatch(setTool('circle'));
            break;
          case 'l':
            dispatch(setTool('line'));
            break;
          case 'a':
            dispatch(setTool('arrow'));
            break;
          case 'p':
            dispatch(setTool('freehand'));
            break;
          case 't':
            dispatch(setTool('text'));
            break;
          case 'n':
            dispatch(setTool('sticky'));
            break;
          case 'm':
            dispatch(setTool('markdown'));
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, socket, diagramId, selectedIds, readOnly, emitShapeDelete]);

  // Update snapToGrid function to be more lenient
  const snapToGrid = (value) => {
    if (!isGridSnap) return value;
    // Make snapping less aggressive
    const snapThreshold = gridSize / 2;
    const remainder = value % gridSize;
    if (remainder < snapThreshold) {
      return value - remainder;
    } else if (remainder > gridSize - snapThreshold) {
      return value + (gridSize - remainder);
    }
    return value;
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e) => {
    e.evt.preventDefault();
    if (!stageRef.current) return;

    const scaleBy = 1.05;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();

    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    stage.position(newPos);
    dispatch(setZoom(newScale));
    emitViewUpdate(diagramId, { zoom: newScale, position: newPos });
  };

  // Update handleTextEdit to properly handle sticky notes
  const handleTextEdit = (shapeId, text, position) => {
    if (readOnly) return;
    const stage = stageRef.current;
    if (!stage) return;

    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const absPos = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();
    
    setEditingTextId(shapeId);
    setEditingTextValue(text || '');
    
    // Calculate position considering stage transform and shape type
    const stagePoint = {
      x: (position.x - stage.x()) / scale,
      y: (position.y - stage.y()) / scale
    };
    
    // For sticky notes, adjust the position to be inside the note
    const textPos = {
      x: stagePoint.x + absPos.left + (shape.type === 'sticky' ? 10 : 0),
      y: stagePoint.y + absPos.top + (shape.type === 'sticky' ? 10 : 0),
    };
    
    setEditingTextPos(textPos);

    // If it's a sticky note, ensure it has a minimum size
    if (shape.type === 'sticky' && (!shape.width || shape.width < 100)) {
      const updatedShape = {
        ...shape,
        width: Math.max(shape.width || 0, 100),
        height: Math.max(shape.height || 0, 100),
      };
      dispatch(updateShape(updatedShape));
      emitShapeUpdate(diagramId, updatedShape);
    }
  };

  // Add cleanup effect for text editor
  useEffect(() => {
    return () => {
      // Cleanup text editor state when component unmounts
      setEditingTextId(null);
      setEditingTextValue('');
    };
  }, []);

  // Update text editor portal
  const renderTextEditor = () => {
    if (!editingTextId || readOnly) return null;

    const shape = shapes.find(s => s.id === editingTextId);
    if (!shape) return null;

    return (
      <Portal>
        <div
          className="fixed z-[1000]"
          style={{
            position: 'absolute',
            top: editingTextPos.y,
            left: editingTextPos.x,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <div className="relative">
            <textarea
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onBlur={() => {
                if (editingTextId) {
                  const shape = shapes.find(s => s.id === editingTextId);
                  if (shape) {
                    const updatedShape = {
                      ...shape,
                      text: editingTextValue,
                    };
                    dispatch(updateShape(updatedShape));
                    emitShapeUpdate(diagramId, updatedShape);
                  }
                  setEditingTextId(null);
                  setEditingTextValue('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.target.blur();
                }
              }}
              className="border border-gray-300 rounded p-1 bg-white shadow-lg min-w-[100px] min-h-[24px] resize-none"
              style={{
                fontSize: `${shape.fontSize || 16}px`,
                color: shape.stroke || '#000',
                width: shape.type === 'sticky' ? `${shape.width - 20}px` : 'auto',
                height: shape.type === 'sticky' ? `${shape.height - 20}px` : 'auto',
              }}
              autoFocus
            />
          </div>
        </div>
      </Portal>
    );
  };

  // Add helper function to calculate distance from point to line segment
  const distanceToLine = (x, y, x1, y1, x2, y2) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq !== 0) {
      param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  };

  // Update handleMarkdownSave to only manage notes in the panel
  const handleMarkdownSave = () => {
    if (!editingMarkdownValue.trim()) return;

    const bulletPoints = editingMarkdownValue
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.startsWith('- ') ? line : `- ${line}`);

    if (editingMarkdownId) {
      // Update existing note
      const updatedNote = {
        id: editingMarkdownId,
        type: 'markdown',
        text: bulletPoints.join('\n'),
        timestamp: Date.now(),
      };
      dispatch(updateShape(updatedNote));
    } else {
      // Create new note
      const newNote = {
        id: uuidv4(),
        type: 'markdown',
        text: bulletPoints.join('\n'),
        timestamp: Date.now(),
      };
      dispatch(addShape(newNote));
    }
    
    setEditingMarkdownId(null);
    setEditingMarkdownValue('');
  };

  // Update the collaborator cursor rendering
  const renderCollaboratorCursors = () => {
    return Object.entries(collaboratorCursors).map(([userId, data]) => {
      const { position, user, lastUpdate, selection, tool } = data;
      const isActive = Date.now() - lastUpdate < 1000;
      const isSelecting = tool === 'select' && selection?.length > 0;

      return (
        <Group key={userId} x={position.x} y={position.y}>
          {/* Cursor */}
          <RegularPolygon
            sides={3}
            radius={8}
            fill={user.color}
            rotation={-90}
            offsetY={-4}
            shadowColor="black"
            shadowBlur={4}
            shadowOpacity={0.2}
            shadowOffset={{ x: 0, y: 2 }}
          />
          {/* User label with tool info */}
          <Group x={15} y={-20}>
            <Rect
              fill={user.color}
              cornerRadius={4}
              width={120}
              height={24}
              shadowColor="black"
              shadowBlur={4}
              shadowOpacity={0.2}
              shadowOffset={{ x: 0, y: 2 }}
            />
            <Text
              text={`${user.name} (${tool})`}
              fill="white"
              fontSize={12}
              padding={6}
              width={120}
              align="center"
            />
          </Group>
          {/* Activity indicator */}
          {isActive && (
            <Circle
              x={0}
              y={0}
              radius={4}
              fill={user.color}
              opacity={0.6}
              shadowColor="black"
              shadowBlur={2}
              shadowOpacity={0.2}
            />
          )}
          {/* Selection highlight */}
          {isSelecting && selection.map(shapeId => {
            const shape = shapes.find(s => s.id === shapeId);
            if (!shape) return null;
            
            return (
              <Group key={shapeId} x={shape.x} y={shape.y}>
                <Rect
                  width={shape.width}
                  height={shape.height}
                  stroke={user.color}
                  strokeWidth={2}
                  dash={[5, 5]}
                  opacity={0.5}
                  fill="transparent"
                  shadowColor={user.color}
                  shadowBlur={4}
                  shadowOpacity={0.2}
                />
              </Group>
            );
          })}
        </Group>
      );
    });
  };

  // Update the collaborator presence panel
  const renderCollaboratorPresence = () => {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/95 rounded-lg shadow-lg p-3 space-y-2 backdrop-blur-sm border border-gray-200/50">
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Collaborators
          </h3>
          {Object.entries(collaboratorPresence).map(([userId, user]) => {
            const cursor = collaboratorCursors[userId];
            const isActive = cursor && Date.now() - cursor.lastUpdate < 2000;
            
            return (
              <div
                key={userId}
                className="flex items-center justify-between space-x-2 p-1 rounded-md hover:bg-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: user.color,
                      boxShadow: isActive ? `0 0 0 2px ${user.color}40` : 'none'
                    }}
                  />
                  <span className="text-sm text-gray-600">
                    {user.name}
                  </span>
                </div>
                {cursor && (
                  <span className="text-xs text-gray-500">
                    {cursor.tool}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Add effect to ensure tool state is properly initialized and maintained
  useEffect(() => {
    // Initialize tool state if not set
    if (!tool) {
      console.log('Initializing tool state to select');
      dispatch(setTool('select'));
    }

    // Log tool changes for debugging
    console.log('Tool changed to:', tool);

    // Update cursor based on tool
    if (stageRef.current) {
      const cursorMap = {
        select: 'default',
        rectangle: 'crosshair',
        circle: 'crosshair',
        line: 'crosshair',
        arrow: 'crosshair',
        freehand: 'crosshair',
        text: 'text',
        sticky: 'crosshair',
        markdown: 'crosshair',
        pan: 'grab',
        eraser: 'crosshair'
      };

      const cursor = cursorMap[tool] || 'default';
      console.log('Setting cursor to:', cursor);
      stageRef.current.container().style.cursor = cursor;
    }
  }, [dispatch, tool]);

  // Add effect to handle tool changes
  useEffect(() => {
    // Log tool changes for debugging
    console.log('Current tool:', tool);
  }, [tool]);

  // Update undo/redo functionality
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e) => {
      // Undo (Ctrl+Z)
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        console.log('Undoing last action');
        dispatch(undo());
        return;
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        console.log('Redoing last action');
        dispatch(redo());
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, readOnly]);

  return (
    <div className="relative w-full h-full bg-white">
      {/* Dashboard Button */}
      {/* Removed from top left */}

      {/* Markdown Notes Panel */}
      <div
        ref={markdownPanelRef}
        className={`fixed left-0 top-0 h-full bg-white shadow-xl transition-transform duration-300 ease-in-out z-50 ${
          isMarkdownPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '300px' }}
      >
        <div className="flex flex-col h-full">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200/90 bg-white/95">
            <h2 className="text-lg font-semibold text-gray-900">
              Quick Notes
            </h2>
            <button
              onClick={() => {
                setIsMarkdownPanelOpen(false);
                setEditingMarkdownId(null);
                setEditingMarkdownValue('');
              }}
              className="p-2 rounded-lg hover:bg-gray-100/90 text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Editor Content */}
          <div className="flex flex-col h-full bg-white/95">
            {/* Quick Input */}
            <div className="p-3 border-b border-gray-200/90">
              <textarea
                value={editingMarkdownValue}
                onChange={(e) => setEditingMarkdownValue(e.target.value)}
                className="w-full p-2 rounded-lg border border-gray-200/90 text-black resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/95"
                placeholder="Type your note here... (Press Enter for new bullet point)"
                rows={3}
                onKeyDown={(e) => {
                  // Only handle Enter and Tab keys, let all other keys work normally
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const currentValue = e.target.value;
                    const cursorPosition = e.target.selectionStart;
                    const textBeforeCursor = currentValue.substring(0, cursorPosition);
                    const textAfterCursor = currentValue.substring(cursorPosition);
                    
                    // Check if we're at the start of a line or after a bullet point
                    const isAtStartOfLine = textBeforeCursor.endsWith('\n') || textBeforeCursor === '';
                    const isAfterBullet = textBeforeCursor.endsWith('- ');
                    
                    if (isAtStartOfLine || isAfterBullet) {
                      setEditingMarkdownValue(textBeforeCursor + '- ' + textAfterCursor);
                      // Set cursor position after the new bullet point
                      setTimeout(() => {
                        e.target.selectionStart = cursorPosition + 2;
                        e.target.selectionEnd = cursorPosition + 2;
                      }, 0);
                    } else {
                      setEditingMarkdownValue(textBeforeCursor + '\n- ' + textAfterCursor);
                      // Set cursor position after the new bullet point
                      setTimeout(() => {
                        e.target.selectionStart = cursorPosition + 3;
                        e.target.selectionEnd = cursorPosition + 3;
                      }, 0);
                    }
                  } else if (e.key === 'Tab') {
                    e.preventDefault();
                    const currentValue = e.target.value;
                    const cursorPosition = e.target.selectionStart;
                    const textBeforeCursor = currentValue.substring(0, cursorPosition);
                    const textAfterCursor = currentValue.substring(cursorPosition);
                    
                    setEditingMarkdownValue(textBeforeCursor + '    ' + textAfterCursor);
                    // Set cursor position after the tab
                    setTimeout(() => {
                      e.target.selectionStart = cursorPosition + 4;
                      e.target.selectionEnd = cursorPosition + 4;
                    }, 0);
                  }
                }}
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={() => {
                    setEditingMarkdownId(null);
                    setEditingMarkdownValue('');
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100/95 text-gray-700 hover:bg-gray-200/95"
                >
                  Clear
                </button>
                <button
                  onClick={handleMarkdownSave}
                  className="px-3 py-1.5 text-sm rounded-lg bg-blue-600/95 text-white hover:bg-blue-700/95"
                >
                  {editingMarkdownId ? 'Update Note' : 'Add Note'}
                </button>
              </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-auto p-3">
              {shapes
                .filter(shape => shape.type === 'markdown')
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .map(note => (
                  <div
                    key={note.id}
                    className="mb-3 p-3 rounded-lg border border-gray-200/90 bg-white/95 hover:bg-gray-50/95 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-500">
                        {new Date(note.timestamp || Date.now()).toLocaleTimeString()}
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingMarkdownId(note.id);
                            setEditingMarkdownValue(note.text);
                          }}
                          className="p-1 rounded hover:bg-gray-100/95 text-gray-500 hover:text-blue-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            dispatch(deleteShapes([note.id]));
                          }}
                          className="p-1 rounded hover:bg-gray-100/95 text-gray-500 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none text-black">
                      <ReactMarkdown>{note.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className={`absolute inset-0 transition-all duration-300 ${
        isMarkdownPanelOpen ? 'left-[300px]' : 'left-0'
      }`}>
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          draggable={isPanning}
          className="bg-white"
        >
          {/* Grid Layer - Infinite grid */}
          {isGridVisible && (
            <Layer>
              {/* Calculate grid lines based on stage position and zoom */}
              {(() => {
                const stage = stageRef.current;
                if (!stage) return null;

                const stagePos = stage.position();
                const scale = stage.scaleX();
                
                // Calculate visible area with extension
                const startX = Math.floor((stagePos.x / scale - GRID_EXTENSION) / GRID_SIZE) * GRID_SIZE;
                const endX = Math.ceil((stagePos.x / scale + stageWidth / scale + GRID_EXTENSION) / GRID_SIZE) * GRID_SIZE;
                const startY = Math.floor((stagePos.y / scale - GRID_EXTENSION) / GRID_SIZE) * GRID_SIZE;
                const endY = Math.ceil((stagePos.y / scale + stageHeight / scale + GRID_EXTENSION) / GRID_SIZE) * GRID_SIZE;

                const lines = [];
                
                // Vertical lines
                for (let x = startX; x <= endX; x += GRID_SIZE) {
                  lines.push(
                    <Line
                      key={`v${x}`}
                      points={[x, startY, x, endY]}
                      stroke="#64748b"
                      strokeWidth={0.5}
                      opacity={0.7}
                      dash={[5, 5]}
                    />
                  );
                }
                
                // Horizontal lines
                for (let y = startY; y <= endY; y += GRID_SIZE) {
                  lines.push(
                    <Line
                      key={`h${y}`}
                      points={[startX, y, endX, y]}
                      stroke="#64748b"
                      strokeWidth={0.5}
                      opacity={0.7}
                      dash={[5, 5]}
                    />
                  );
                }
                
                return lines;
              })()}
            </Layer>
          )}

          {/* Shapes Layer */}
          <Layer>
            {shapes.map((shape) => {
              if (shape.type === 'markdown') return null; // Skip rendering markdown shapes
              const commonProps = {
                id: shape.id,
                draggable: !readOnly && tool === 'select',
                onClick: (e) => {
                  if (readOnly) return;
                  
                  // Stop event propagation to prevent stage click
                  e.cancelBubble = true;
                  
                  if (tool === 'select') {
                    if (e.evt.shiftKey) {
                      // Add to selection if shift is pressed
                      dispatch(setSelectedIds([...selectedIds, shape.id]));
                    } else {
                      // Select single shape
                      dispatch(setSelectedIds([shape.id]));
                    }
                  }
                },
                onTap: (e) => {
                  if (readOnly) return;
                  
                  // Stop event propagation
                  e.cancelBubble = true;
                  
                  if (tool === 'select') {
                    if (e.evt.shiftKey) {
                      dispatch(setSelectedIds([...selectedIds, shape.id]));
                    } else {
                      dispatch(setSelectedIds([shape.id]));
                    }
                  }
                },
                onDragStart: (e) => {
                  if (readOnly || tool !== 'select') return;
                  dispatch(setIsDragging(true));
                },
                onDragEnd: (e) => {
                  if (readOnly || tool !== 'select') return;
                  dispatch(setIsDragging(false));
                  const node = e.target;
                  const newShape = {
                    ...shape,
                    x: snapToGrid(node.x()),
                    y: snapToGrid(node.y()),
                  };
                  dispatch(updateShape(newShape));
                  emitShapeUpdate(diagramId, newShape);
                },
              };

              switch (shape.type) {
                case 'rectangle':
                  return (
                    <Rect
                      key={shape.id}
                      {...commonProps}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      fill={shape.fill}
                      stroke={selectedIds.includes(shape.id) ? '#3b82f6' : shape.stroke}
                      strokeWidth={selectedIds.includes(shape.id) ? Math.max(shape.strokeWidth, 3) : shape.strokeWidth}
                      strokeStyle={shape.strokeStyle}
                      shadowColor={selectedIds.includes(shape.id) ? '#3b82f6' : undefined}
                      shadowBlur={selectedIds.includes(shape.id) ? 10 : 0}
                      shadowOpacity={selectedIds.includes(shape.id) ? 0.6 : 0}
                    />
                  );
                case 'circle':
                  return (
                    <Circle
                      key={shape.id}
                      {...commonProps}
                      x={shape.x}
                      y={shape.y}
                      radius={shape.radius}
                      fill={shape.fill}
                      stroke={selectedIds.includes(shape.id) ? '#3b82f6' : shape.stroke}
                      strokeWidth={selectedIds.includes(shape.id) ? Math.max(shape.strokeWidth, 3) : shape.strokeWidth}
                      strokeStyle={shape.strokeStyle}
                      shadowColor={selectedIds.includes(shape.id) ? '#3b82f6' : undefined}
                      shadowBlur={selectedIds.includes(shape.id) ? 10 : 0}
                      shadowOpacity={selectedIds.includes(shape.id) ? 0.6 : 0}
                    />
                  );
                case 'line':
                case 'arrow':
                  return (
                    <Arrow
                      key={shape.id}
                      {...commonProps}
                      points={shape.points}
                      fill={selectedIds.includes(shape.id) ? '#3b82f6' : shape.stroke}
                      stroke={selectedIds.includes(shape.id) ? '#3b82f6' : shape.stroke}
                      strokeWidth={selectedIds.includes(shape.id) ? Math.max(shape.strokeWidth, 3) : shape.strokeWidth}
                      strokeStyle={shape.strokeStyle}
                      pointerLength={shape.type === 'arrow' ? 10 : 0}
                      pointerWidth={shape.type === 'arrow' ? 10 : 0}
                      shadowColor={selectedIds.includes(shape.id) ? '#3b82f6' : undefined}
                      shadowBlur={selectedIds.includes(shape.id) ? 10 : 0}
                      shadowOpacity={selectedIds.includes(shape.id) ? 0.6 : 0}
                    />
                  );
                case 'freehand':
                  return (
                    <Line
                      key={shape.id}
                      {...commonProps}
                      points={shape.points}
                      stroke={selectedIds.includes(shape.id) ? '#3b82f6' : shape.stroke}
                      strokeWidth={selectedIds.includes(shape.id) ? Math.max(shape.strokeWidth, 3) : shape.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation="source-over"
                      perfectDrawEnabled={false}
                      hitStrokeWidth={20}
                      listening={!readOnly}
                      bezier={false} // Disable bezier curves for more accurate freehand drawing
                      shadowColor={selectedIds.includes(shape.id) ? '#3b82f6' : undefined}
                      shadowBlur={selectedIds.includes(shape.id) ? 10 : 0}
                      shadowOpacity={selectedIds.includes(shape.id) ? 0.6 : 0}
                    />
                  );
                case 'text':
                  return (
                    <Text
                      key={shape.id}
                      {...commonProps}
                      x={shape.x}
                      y={shape.y}
                      text={shape.text}
                      fontSize={shape.fontSize}
                      fill={selectedIds.includes(shape.id) ? '#3b82f6' : shape.stroke}
                      onDblClick={(e) => {
                        const node = e.target;
                        const pos = node.getAbsolutePosition();
                        handleTextEdit(shape.id, shape.text, pos);
                      }}
                      shadowColor={selectedIds.includes(shape.id) ? '#3b82f6' : undefined}
                      shadowBlur={selectedIds.includes(shape.id) ? 10 : 0}
                      shadowOpacity={selectedIds.includes(shape.id) ? 0.6 : 0}
                    />
                  );
                case 'sticky':
                  return (
                    <Group 
                      key={shape.id} 
                      {...commonProps} 
                      x={shape.x} 
                      y={shape.y}
                      onClick={(e) => {
                        if (readOnly) return;
                        e.cancelBubble = true;
                        if (tool === 'select') {
                          if (e.evt.shiftKey) {
                            dispatch(setSelectedIds([...selectedIds, shape.id]));
                          } else {
                            dispatch(setSelectedIds([shape.id]));
                          }
                        }
                      }}
                      onDblClick={(e) => {
                        if (readOnly) return;
                        e.cancelBubble = true;
                        const node = e.target;
                        const pos = node.getAbsolutePosition();
                        // Ensure the shape exists and has text property
                        const stickyShape = shapes.find(s => s.id === shape.id);
                        if (stickyShape) {
                          handleTextEdit(shape.id, stickyShape.text || '', pos);
                        }
                      }}
                    >
                      <Rect
                        width={shape.width}
                        height={shape.height}
                        fill={shape.fill}
                        stroke={selectedIds.includes(shape.id) ? '#3b82f6' : shape.stroke}
                        strokeWidth={selectedIds.includes(shape.id) ? Math.max(shape.strokeWidth, 3) : shape.strokeWidth}
                        cornerRadius={8}
                        shadowColor={selectedIds.includes(shape.id) ? '#3b82f6' : 'rgba(0,0,0,0.2)'}
                        shadowBlur={selectedIds.includes(shape.id) ? 10 : 0}
                        shadowOffset={{ x: 2, y: 2 }}
                        shadowOpacity={selectedIds.includes(shape.id) ? 0.6 : 0.3}
                      />
                      <Text
                        text={shape.text || 'Double click to edit...'}
                        width={shape.width - 20}
                        height={shape.height - 20}
                        x={10}
                        y={10}
                        fontSize={shape.fontSize}
                        fill={selectedIds.includes(shape.id) ? '#3b82f6' : shape.stroke}
                        padding={10}
                        align="left"
                        verticalAlign="top"
                      />
                      {/* Resize handle */}
                      {!readOnly && tool === 'select' && selectedIds.includes(shape.id) && (
                        <Rect
                          x={shape.width - 20}
                          y={shape.height - 20}
                          width={20}
                          height={20}
                          fill="transparent"
                          stroke="transparent"
                          onMouseEnter={(e) => {
                            e.target.getStage().container().style.cursor = 'nwse-resize';
                          }}
                          onMouseLeave={(e) => {
                            e.target.getStage().container().style.cursor = 'default';
                          }}
                        />
                      )}
                    </Group>
                  );
                default:
                  return null;
              }
            })}

            {/* Transformer for selected shapes */}
            {!readOnly && selectedIds.length > 0 && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  const minSize = 100; // Minimum size for sticky notes
                  if (newBox.width < minSize || newBox.height < minSize) {
                    return oldBox;
                  }
                  return newBox;
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  
                  node.scaleX(1);
                  node.scaleY(1);
                  
                  const updatedShape = {
                    ...shapes.find(s => s.id === node.id()),
                    x: node.x(),
                    y: node.y(),
                    width: Math.round(node.width() * scaleX),
                    height: Math.round(node.height() * scaleY),
                    rotation: node.rotation(),
                  };
                  
                  dispatch(updateShape(updatedShape));
                  emitShapeUpdate(diagramId, updatedShape);
                }}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                keepRatio={false}
              />
            )}

            {/* Collaborator Cursors Layer */}
            {/* <Layer>
              {renderCollaboratorCursors()}
            </Layer> */}
          </Layer>
        </Stage>
      </div>

      {/* Text Editor Portal */}
      {renderTextEditor()}

      {/* Sticky Notes Panel */}
      <StickyNotes />

      <div className="fixed top-4 left-4 z-50 flex items-center space-x-4">
        {renderCollaboratorPresence()}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100"
          aria-label="Home"
          title="Home"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Canvas; 
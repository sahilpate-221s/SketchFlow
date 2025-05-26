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
  } = useSelector((state) => state.canvas);

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
        // Add smoothing for lines and arrows
        if (LINE_SMOOTHING) {
          const dx = pointToUse.x - startPoint.x;
          const dy = pointToUse.y - startPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Add intermediate points for smoother lines
          const numPoints = Math.max(2, Math.floor(distance / 10));
          const points = [];
          
          for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            points.push(
              startPoint.x + dx * t,
              startPoint.y + dy * t
            );
          }
          
          updatedShape = {
            ...currentShape,
            points,
          };
        } else {
          updatedShape = {
            ...currentShape,
            points: [startPoint.x, startPoint.y, pointToUse.x, pointToUse.y],
          };
        }
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
          // Apply smoothing to new points
          const smoothedPoints = [...points];
          if (points.length >= 4) {
            const prevPoint = points.slice(-4, -2);
            const smoothedX = lastPoint[0] + (pointToUse.x - lastPoint[0]) * SMOOTHING_FACTOR;
            const smoothedY = lastPoint[1] + (pointToUse.y - lastPoint[1]) * SMOOTHING_FACTOR;
            
            // Update last point with smoothed position
            smoothedPoints[smoothedPoints.length - 2] = smoothedX;
            smoothedPoints[smoothedPoints.length - 1] = smoothedY;
          }
          
          // Add new point
          smoothedPoints.push(pointToUse.x, pointToUse.y);
          
          // Reduce points if too many
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
          
          setCurrentShape(updatedShape);
        } else {
          return;
        }
        break;
      }
      default:
        return;
    }

    dispatch(updateShape(updatedShape));
    emitShapeUpdate(diagramId, updatedShape);
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

  // Update handleMouseUp to deselect shapes and reset state
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
        dispatch(updateShape(currentShape));
        emitShapeUpdate(diagramId, currentShape);
      }
      // Deselect the shape after creation or moving
      dispatch(setSelectedIds([]));
      setIsDrawing(false);
      setCurrentShape(null);
    }
  };

  // Update handleMouseDown to fix shape creation
  const handleMouseDown = (e) => {
    if (readOnly) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    // Convert point to stage coordinates considering zoom and pan
    const stagePoint = {
      x: (point.x - stage.x()) / stage.scaleX(),
      y: (point.y - stage.y()) / stage.scaleY()
    };

    // For freehand, use exact mouse position without snapping
    const pointToUse = tool === 'freehand' ? stagePoint : {
      x: snapToGrid(stagePoint.x),
      y: snapToGrid(stagePoint.y),
    };

    // If already drawing, don't start a new shape
    if (isDrawing) return;

    if (isSpacePressed || tool === 'pan') {
      dispatch(setIsPanning(true));
      dispatch(setLastMousePosition(point));
      stage.container().style.cursor = 'grabbing';
      return;
    }

    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        dispatch(setSelectedIds([]));
      }
      return;
    }

    // Start drawing new shape
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

    // Add tool-specific properties
    switch (tool) {
      case 'rectangle':
        newShape.width = 100;
        newShape.height = 100;
        break;
      case 'circle':
        newShape.radius = 50;
        break;
      case 'line':
      case 'arrow':
        newShape.points = [pointToUse.x, pointToUse.y, pointToUse.x, pointToUse.y];
        break;
      case 'freehand':
        newShape.points = [pointToUse.x, pointToUse.y];
        break;
      case 'text':
        newShape.width = 200;
        newShape.height = 50;
        newShape.text = '';
        break;
      case 'sticky':
        newShape.width = 200;
        newShape.height = 150;
        newShape.text = 'Double click to edit...';
        break;
      case 'markdown':
        newShape.width = 300;
        newShape.height = 200;
        newShape.text = '';
        break;
    }

    setCurrentShape(newShape);
    dispatch(addShape(newShape));
    emitShapeAdd(diagramId, newShape);

    // Handle text-based tools
    if (tool === 'text' || tool === 'sticky' || tool === 'markdown') {
      handleTextEdit(newShape.id, newShape.text || '', pointToUse);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e) => {
      // Undo (Ctrl+Z)
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        dispatch(undo());
        return;
      }

      // Redo (Ctrl+Y)
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
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

  // Add this function to handle text editing
  const handleTextEdit = (shapeId, text, position) => {
    if (readOnly) return;
    const stage = stageRef.current;
    if (!stage) return;

    const absPos = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();
    
    setEditingTextId(shapeId);
    setEditingTextValue(text);
    
    // Calculate position considering stage transform
    const stagePoint = {
      x: (position.x - stage.x()) / scale,
      y: (position.y - stage.y()) / scale
    };
    
    setEditingTextPos({
      x: stagePoint.x + absPos.left,
      y: stagePoint.y + absPos.top,
    });
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

  // Add markdown panel toggle handler
  const toggleMarkdownPanel = () => {
    setIsMarkdownPanelOpen(!isMarkdownPanelOpen);
  };

  // Update markdown handling
  const handleMarkdownEdit = (shapeId, text, position) => {
    if (readOnly) return;
    setEditingMarkdownId(shapeId);
    setEditingMarkdownValue(text || '');
    setIsMarkdownPanelOpen(true);
  };

  // Handle markdown save
  const handleMarkdownSave = () => {
    if (!editingMarkdownId) return;
    
    const shape = shapes.find((s) => s.id === editingMarkdownId);
    if (shape) {
      const updatedShape = {
        ...shape,
        text: editingMarkdownValue,
      };
      dispatch(updateShape(updatedShape));
      emitShapeUpdate(diagramId, updatedShape);
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

  // Add effect to ensure tool state is properly initialized
  useEffect(() => {
    // Initialize tool state if not set
    if (!tool) {
      dispatch(setTool('select'));
    }

    // Reset tool state when component unmounts
    return () => {
      dispatch(setTool('select'));
    };
  }, [dispatch, tool]);

  // Add effect to handle tool changes
  useEffect(() => {
    if (!stageRef.current) return;

    // Update cursor based on tool
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

    stageRef.current.container().style.cursor = cursorMap[tool] || 'default';
  }, [tool]);

  return (
    <div className="relative w-full h-full bg-white">
      {/* Dashboard Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="fixed top-4 left-4 z-50 flex items-center px-4 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-100"
      >
        <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-gray-700">Dashboard</span>
      </button>

      {/* Markdown Editor Panel */}
      <div
        ref={markdownPanelRef}
        className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out z-50 ${
          isMarkdownPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '400px' }}
      >
        <div className="flex flex-col h-full">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Markdown Editor
            </h2>
            <button
              onClick={() => {
                setIsMarkdownPanelOpen(false);
                setEditingMarkdownId(null);
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Editor Content */}
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
            {/* Editor */}
            <div className="flex-1 flex flex-col">
              <textarea
                value={editingMarkdownValue}
                onChange={(e) => setEditingMarkdownValue(e.target.value)}
                className="flex-1 w-full p-3 rounded-lg border border-gray-200 text-gray-900 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Write your markdown here..."
              />
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-auto p-3 rounded-lg border border-gray-200">
              <div className="prose max-w-none">
                <ReactMarkdown>{editingMarkdownValue}</ReactMarkdown>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setIsMarkdownPanelOpen(false);
                  setEditingMarkdownId(null);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkdownSave}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className={`absolute inset-0 transition-all duration-300 ${
        isMarkdownPanelOpen ? 'left-[400px]' : 'left-0'
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
          {/* Grid Layer - More subtle grid */}
          {isGridVisible && (
            <Layer>
              {Array.from({ length: Math.ceil(stageWidth / gridSize) + 1 }).map((_, i) => (
                <Line
                  key={`v${i}`}
                  points={[i * gridSize, 0, i * gridSize, stageHeight]}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                  opacity={0.3}
                  dash={[5, 5]} // Make grid lines dashed
                />
              ))}
              {Array.from({ length: Math.ceil(stageHeight / gridSize) + 1 }).map((_, i) => (
                <Line
                  key={`h${i}`}
                  points={[0, i * gridSize, stageWidth, i * gridSize]}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                  opacity={0.3}
                  dash={[5, 5]} // Make grid lines dashed
                />
              ))}
            </Layer>
          )}

          {/* Shapes Layer */}
          <Layer>
            {shapes.map((shape) => {
              const commonProps = {
                id: shape.id,
                draggable: !readOnly && tool === 'select', // Only draggable in select mode
                onClick: (e) => {
                  if (readOnly) return;
                  if (tool === 'select') {
                    e.cancelBubble = true;
                    if (e.evt.shiftKey) {
                      // Add to selection if shift is pressed
                      dispatch(setSelectedIds([...selectedIds, shape.id]));
                    } else {
                      // Select single shape
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
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      strokeStyle={shape.strokeStyle}
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
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      strokeStyle={shape.strokeStyle}
                    />
                  );
                case 'line':
                case 'arrow':
                  return (
                    <Arrow
                      key={shape.id}
                      {...commonProps}
                      points={shape.points}
                      fill={shape.stroke}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      strokeStyle={shape.strokeStyle}
                      pointerLength={shape.type === 'arrow' ? 10 : 0}
                      pointerWidth={shape.type === 'arrow' ? 10 : 0}
                    />
                  );
                case 'freehand':
                  return (
                    <Line
                      key={shape.id}
                      {...commonProps}
                      points={shape.points}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation="source-over"
                      perfectDrawEnabled={false}
                      hitStrokeWidth={20}
                      listening={!readOnly}
                      bezier={false} // Disable bezier curves for more accurate freehand drawing
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
                      fill={shape.stroke}
                      onDblClick={(e) => {
                        const node = e.target;
                        const pos = node.getAbsolutePosition();
                        handleTextEdit(shape.id, shape.text, pos);
                      }}
                    />
                  );
                case 'sticky':
                  return (
                    <Group key={shape.id} {...commonProps} x={shape.x} y={shape.y}>
                      <Rect
                        width={shape.width}
                        height={shape.height}
                        fill={shape.fill}
                        stroke={shape.stroke}
                        strokeWidth={shape.strokeWidth}
                        cornerRadius={8}
                        shadowColor="rgba(0,0,0,0.2)"
                        shadowBlur={10}
                        shadowOffset={{ x: 2, y: 2 }}
                        shadowOpacity={0.3}
                      />
                      <Text
                        text={shape.text || 'Double click to edit...'}
                        width={shape.width - 20}
                        height={shape.height - 20}
                        x={10}
                        y={10}
                        fontSize={shape.fontSize}
                        fill={shape.stroke}
                        padding={10}
                        align="left"
                        verticalAlign="top"
                        onDblClick={(e) => {
                          const node = e.target;
                          const pos = node.getAbsolutePosition();
                          handleTextEdit(shape.id, shape.text, pos);
                        }}
                      />
                      {/* Resize handle */}
                      {!readOnly && (
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
                case 'markdown':
                  return (
                    <Group key={shape.id} {...commonProps} x={shape.x} y={shape.y}>
                      <Rect
                        width={shape.width}
                        height={shape.height}
                        fill="#ffffff"
                        stroke={shape.stroke}
                        strokeWidth={shape.strokeWidth}
                        cornerRadius={8}
                        shadowColor="rgba(0,0,0,0.1)"
                        shadowBlur={5}
                        shadowOffset={{ x: 1, y: 1 }}
                        shadowOpacity={0.2}
                      />
                      <Text
                        text={shape.text}
                        width={shape.width - 20}
                        height={shape.height - 20}
                        x={10}
                        y={10}
                        fontSize={shape.fontSize}
                        fill={shape.stroke}
                        padding={10}
                        onDblClick={(e) => {
                          const node = e.target;
                          const pos = node.getAbsolutePosition();
                          handleMarkdownEdit(shape.id, shape.text, pos);
                        }}
                      />
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
      {editingTextId && !readOnly && (
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
            <input
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onBlur={() => {
                const shape = shapes.find((s) => s.id === editingTextId);
                if (shape) {
                  const updatedShape = {
                    ...shape,
                    text: editingTextValue,
                  };
                  dispatch(updateShape(updatedShape));
                  emitShapeUpdate(diagramId, updatedShape);
                }
                setEditingTextId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.target.blur();
                }
              }}
              className="border-none p-0 m-0 bg-transparent outline-none font-inherit"
              style={{
                fontSize: `${shapes.find(s => s.id === editingTextId)?.fontSize || 16}px`,
                color: shapes.find(s => s.id === editingTextId)?.stroke || '#000',
              }}
            />
          </div>
        </Portal>
      )}

      {/* Sticky Notes Panel */}
      <StickyNotes />

      {/* Markdown Editor Panel */}
      <MarkdownEditor />

      {/* Collaborator Presence Panel */}
      {renderCollaboratorPresence()}
    </div>
  );
};

export default Canvas; 
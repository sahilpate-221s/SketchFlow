import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Line, Arrow, Text, Transformer, Group } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
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
  setSelectedShape,
  clearSelection,
  setIsDragging,
  setIsPanning,
  setLastMousePosition,
} from '../store/canvasSlice';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import Toolbar from './Toolbar';

const Canvas = () => {
  const dispatch = useDispatch();
  const { id: diagramId } = useParams();
  const socket = useSocket();
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [editingTextPos, setEditingTextPos] = useState({ x: 0, y: 0 });

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
    selectedShape,
    isDragging,
    isPanning,
    lastMousePosition,
    collaborators,
  } = useSelector((state) => state.canvas);

  // Add state for panning and selection
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Initialize socket events
  useEffect(() => {
    if (!socket || !diagramId) return;

    socket.emit('join-diagram', diagramId);

    socket.on('shape-update', (shape) => {
      dispatch(updateShape(shape));
    });

    socket.on('shape-add', (shape) => {
      dispatch(addShape(shape));
    });

    socket.on('shape-delete', (ids) => {
      dispatch(deleteShapes(ids));
    });

    socket.on('view-update', ({ zoom: newZoom, position }) => {
      if (stageRef.current) {
        stageRef.current.scale({ x: newZoom, y: newZoom });
        stageRef.current.position(position);
        dispatch(setZoom(newZoom));
      }
    });

    return () => {
      socket.emit('leave-diagram', diagramId);
      socket.off('shape-update');
      socket.off('shape-add');
      socket.off('shape-delete');
      socket.off('view-update');
    };
  }, [socket, diagramId, dispatch]);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current) {
      const nodes = selectedIds.map(id => {
        const shape = shapes.find(s => s.id === id);
        return shape && stageRef.current.findOne(`#${id}`);
      }).filter(Boolean);

      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedIds, shapes]);

  const snapToGrid = (value) => {
    if (!isGridSnap) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  // Handle space key for panning
  useEffect(() => {
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
  }, [isSpacePressed, isPanning]);

  // Update getPointerPosition to handle zoom and pan correctly
  const getPointerPosition = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const scale = stage.scaleX();
    
    // Calculate the position relative to the stage container
    const x = (point.x - stage.x()) / scale;
    const y = (point.y - stage.y()) / scale;
    
    // Apply grid snapping if enabled
    return {
      x: snapToGrid(x),
      y: snapToGrid(y)
    };
  };

  // Update handleMouseDown
  const handleMouseDown = (e) => {
    e.evt.preventDefault();
    
    const pos = getPointerPosition(e);
    
    // Handle panning with space key or middle mouse button
    if (isSpacePressed || e.evt.button === 1) {
      dispatch(setIsPanning(true));
      dispatch(setLastMousePosition(pos));
      if (stageRef.current) {
        stageRef.current.container().style.cursor = 'grabbing';
      }
      return;
    }

    // Handle selection
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        if (!e.evt.shiftKey) {
          dispatch(setSelectedIds([]));
        }
      }
      return;
    }

    // Handle shape creation
    if (tool === 'eraser') {
      const shape = shapes.find(s => {
        if (s.type === 'line' || s.type === 'arrow' || s.type === 'freehand' || s.type === 'polygon') {
          if (s.type === 'polygon') {
            return isPointInPolygon(pos, s.points);
          }
          const points = s.points;
          for (let i = 0; i < points.length - 2; i += 2) {
            const x1 = points[i];
            const y1 = points[i + 1];
            const x2 = points[i + 2];
            const y2 = points[i + 3];
            const distance = distanceToLine(pos.x, pos.y, x1, y1, x2, y2);
            if (distance < 10) return true;
          }
        } else {
          return isPointInShape(pos, s);
        }
        return false;
      });

      if (shape) {
        dispatch(deleteShapes([shape.id]));
        socket?.emit('shape-delete', { ids: [shape.id], diagramId });
      }
      return;
    }

    // Start drawing
    setIsDrawing(true);
    setStartPoint(pos);

    const shapeId = uuidv4();
    let newShape = {
      id: shapeId,
      type: tool,
      x: tool === 'line' || tool === 'arrow' || tool === 'freehand' ? 0 : pos.x,
      y: tool === 'line' || tool === 'arrow' || tool === 'freehand' ? 0 : pos.y,
      stroke: strokeColor,
      strokeWidth,
      fill: fillColor,
      dash: strokeStyle === 'dashed' ? [10, 5] : strokeStyle === 'dotted' ? [2, 2] : [],
    };

    // Set initial shape properties based on tool
    switch (tool) {
      case 'rectangle':
        newShape = { ...newShape, width: 0, height: 0 };
        break;
      case 'circle':
        newShape = { ...newShape, radius: 0 };
        break;
      case 'line':
      case 'arrow':
        newShape = { ...newShape, points: [pos.x, pos.y, pos.x, pos.y] };
        break;
      case 'freehand':
        newShape = { ...newShape, points: [pos.x, pos.y] };
        break;
      case 'polygon':
        newShape = { 
          ...newShape, 
          points: [pos.x, pos.y],
          isDrawing: true,
          closed: false
        };
        break;
      case 'text':
        newShape = {
          ...newShape,
          text: 'Double-click to edit',
          fontSize,
          fontFamily: 'Handlee',
          align: 'left',
        };
        break;
      case 'diamond':
        const size = 50; // Initial diamond size
        const diamondPoints = [
          pos.x, pos.y - size/2, // top
          pos.x + size/2, pos.y, // right
          pos.x, pos.y + size/2, // bottom
          pos.x - size/2, pos.y, // left
        ];
        newShape = { 
          ...newShape, 
          points: diamondPoints,
          size: size // Store size for resizing
        };
        break;
    }

    setCurrentShape(newShape);
    dispatch(addShape(newShape));
    socket?.emit('shape-add', { ...newShape, diagramId });
  };

  // Update handleMouseMove
  const handleMouseMove = (e) => {
    if (isPanning) {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const newPos = {
        x: stage.x() + (e.evt.clientX - lastMousePosition.x),
        y: stage.y() + (e.evt.clientY - lastMousePosition.y),
      };

      stage.position(newPos);
      stage.batchDraw();
      dispatch(setLastMousePosition(newPos));

      socket?.emit('view-update', {
        diagramId,
        zoom: stage.scaleX(),
        position: newPos,
      });
      return;
    }

    if (!isDrawing || !currentShape) return;

    const pos = getPointerPosition(e);
    let updatedShape = { ...currentShape };

    switch (tool) {
      case 'rectangle':
        updatedShape = {
          ...updatedShape,
          x: Math.min(startPoint.x, pos.x),
          y: Math.min(startPoint.y, pos.y),
          width: Math.abs(pos.x - startPoint.x),
          height: Math.abs(pos.y - startPoint.y),
        };
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(pos.x - startPoint.x, 2) +
          Math.pow(pos.y - startPoint.y, 2)
        );
        updatedShape = {
          ...updatedShape,
          radius,
        };
        break;
      case 'line':
      case 'arrow':
        updatedShape = {
          ...updatedShape,
          points: [startPoint.x, startPoint.y, pos.x, pos.y],
        };
        break;
      case 'freehand':
        updatedShape = {
          ...updatedShape,
          points: [...updatedShape.points, pos.x, pos.y],
        };
        break;
      case 'polygon':
        if (currentShape.isDrawing) {
          const lastPoint = currentShape.points.slice(-2);
          const distance = Math.sqrt(
            Math.pow(pos.x - lastPoint[0], 2) +
            Math.pow(pos.y - lastPoint[1], 2)
          );
          if (distance > 10) { // Increased minimum distance for better control
            updatedShape = {
              ...updatedShape,
              points: [...currentShape.points, pos.x, pos.y],
            };
          }
        }
        break;
      case 'diamond':
        const dx = pos.x - startPoint.x;
        const dy = pos.y - startPoint.y;
        const size = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
        const diamondPoints = [
          startPoint.x, startPoint.y - size/2, // top
          startPoint.x + size/2, startPoint.y, // right
          startPoint.x, startPoint.y + size/2, // bottom
          startPoint.x - size/2, startPoint.y, // left
        ];
        updatedShape = {
          ...updatedShape,
          points: diamondPoints,
          size: size
        };
        break;
    }

    setCurrentShape(updatedShape);
    dispatch(updateShape(updatedShape));
    socket?.emit('shape-update', { ...updatedShape, diagramId });
  };

  // Update handleMouseUp
  const handleMouseUp = (e) => {
    if (isPanning) {
      dispatch(setIsPanning(false));
      if (stageRef.current && !isSpacePressed) {
        stageRef.current.container().style.cursor = 'default';
      }
      return;
    }

    if (!isDrawing || !currentShape) return;

    if (tool === 'polygon') {
      // Don't finish polygon on mouse up, wait for double click
      return;
    }

    setIsDrawing(false);
    setCurrentShape(null);
    setStartPoint(null);
  };

  const handleDblClick = (e) => {
    if (tool === 'polygon' && currentShape) {
      // Finish polygon on double click
      const updatedShape = {
        ...currentShape,
        isDrawing: false,
        closed: true,
        points: [...currentShape.points, currentShape.points[0], currentShape.points[1]] // Close the polygon
      };
      
      dispatch(updateShape(updatedShape));
      socket?.emit('shape-update', { ...updatedShape, diagramId });
      
      setIsDrawing(false);
      setCurrentShape(null);
      setStartPoint(null);
    }
  };

  // Helper functions for eraser tool
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

  // Helper function to check if point is inside polygon using ray-casting algorithm
  const isPointInPolygon = (point, polygonPoints) => {
    let inside = false;
    for (let i = 0, j = polygonPoints.length - 2; i < polygonPoints.length; j = i, i += 2) {
      const xi = polygonPoints[i], yi = polygonPoints[i + 1];
      const xj = polygonPoints[j], yj = polygonPoints[j + 1];
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const isPointInShape = (point, shape) => {
    switch (shape.type) {
      case 'rectangle':
        return (
          point.x >= shape.x &&
          point.x <= shape.x + shape.width &&
          point.y >= shape.y &&
          point.y <= shape.y + shape.height
        );
      case 'circle':
        const dx = point.x - shape.x;
        const dy = point.y - shape.y;
        return Math.sqrt(dx * dx + dy * dy) <= shape.radius;
      case 'text':
        // Approximate text area
        const textWidth = shape.text.length * (shape.fontSize || fontSize) * 0.6;
        const textHeight = (shape.fontSize || fontSize) * 1.2;
        return (
          point.x >= shape.x &&
          point.x <= shape.x + textWidth &&
          point.y >= shape.y &&
          point.y <= shape.y + textHeight
        );
      case 'polygon':
        return isPointInPolygon(point, shape.points);
      default:
        return false;
    }
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    // Calculate the point under the mouse before scaling
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Calculate new scale
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = oldScale * (1 + direction * 0.1);
    
    // Limit zoom between 0.1 and 5
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    // Apply new scale
    stage.scale({ x: clampedScale, y: clampedScale });

    // Calculate new position to keep the point under the mouse
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    // Update stage position
    stage.position(newPos);
    stage.batchDraw();

    // Update Redux state and emit socket event
    dispatch(setZoom(clampedScale));
    socket?.emit('view-update', {
      diagramId,
      zoom: clampedScale,
      position: newPos,
    });
  };

  const handleTextDblClick = (shape) => {
    setEditingTextId(shape.id);
    setEditingTextValue(shape.text);
    setEditingTextPos({ x: shape.x, y: shape.y });
  };

  const handleTextEditBlur = () => {
    if (editingTextId) {
      const updatedShape = shapes.find(s => s.id === editingTextId);
      if (updatedShape) {
        const newShape = { ...updatedShape, text: editingTextValue };
        dispatch(updateShape(newShape));
        socket?.emit('shape-update', { ...newShape, diagramId });
      }
    }
    setEditingTextId(null);
    setEditingTextValue('');
  };

  const renderShape = (shape) => {
    const commonProps = {
      id: shape.id,
      x: shape.x,
      y: shape.y,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      fill: shape.fill,
      dash: shape.dash,
      draggable: tool === 'select',
      onClick: (e) => {
        if (tool === 'select') {
          e.cancelBubble = true;
          if (e.evt.shiftKey) {
            dispatch(setSelectedIds([...selectedIds, shape.id]));
          } else {
            dispatch(setSelectedIds([shape.id]));
          }
        }
      },
      onDragEnd: (e) => {
        const node = e.target;
        const snappedPos = {
          x: snapToGrid(node.x()),
          y: snapToGrid(node.y()),
        };
        node.position(snappedPos);
        const updatedShape = {
          ...shape,
          x: snappedPos.x,
          y: snappedPos.y,
        };
        dispatch(updateShape(updatedShape));
        socket?.emit('shape-update', { ...updatedShape, diagramId });
      },
    };

    switch (shape.type) {
      case 'rectangle':
        return <Rect {...commonProps} width={shape.width} height={shape.height} />;
      case 'circle':
        return <Circle {...commonProps} radius={shape.radius} />;
      case 'diamond':
        return (
          <Line
            {...commonProps}
            points={shape.points}
            closed={true}
            perfectDrawEnabled={false}
            hitStrokeWidth={10}
          />
        );
      case 'line':
        return <Line {...commonProps} points={shape.points} />;
      case 'arrow':
        return <Arrow {...commonProps} points={shape.points} />;
      case 'freehand':
        return <Line {...commonProps} points={shape.points} tension={0.5} />;
      case 'polygon':
        return (
          <Line
            {...commonProps}
            points={shape.points}
            closed={shape.closed}
            perfectDrawEnabled={false}
            hitStrokeWidth={10}
          />
        );
      case 'text':
        return (
          <Text
            {...commonProps}
            text={shape.text}
            fontSize={shape.fontSize || fontSize}
            fontFamily="Handlee"
            fill={shape.fill}
            align={shape.align || 'left'}
            onDblClick={() => handleTextDblClick(shape)}
          />
        );
      default:
        return null;
    }
  };

  // Add this new function to calculate grid lines
  const getGridLines = () => {
    if (!isGridSnap) return null;

    const stage = stageRef.current;
    if (!stage) return null;

    const stageBox = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();
    const stagePos = stage.position();
    
    // Calculate visible area with padding
    const padding = 2000; // Increased padding for better infinite feel
    const startX = -stagePos.x / scale - padding;
    const endX = (stageBox.width - stagePos.x) / scale + padding;
    const startY = -stagePos.y / scale - padding;
    const endY = (stageBox.height - stagePos.y) / scale + padding;

    // Calculate grid lines
    const lines = [];
    const gridStep = gridSize;

    // Vertical lines
    const startGridX = Math.floor(startX / gridStep) * gridStep;
    const endGridX = Math.ceil(endX / gridStep) * gridStep;
    for (let x = startGridX; x <= endGridX; x += gridStep) {
      lines.push(
        <Line
          key={`v${x}`}
          points={[x, startY, x, endY]}
          stroke="#d1d5db"
          strokeWidth={1}
          opacity={0.5}
        />
      );
    }

    // Horizontal lines
    const startGridY = Math.floor(startY / gridStep) * gridStep;
    const endGridY = Math.ceil(endY / gridStep) * gridStep;
    for (let y = startGridY; y <= endGridY; y += gridStep) {
      lines.push(
        <Line
          key={`h${y}`}
          points={[startX, y, endX, y]}
          stroke="#d1d5db"
          strokeWidth={1}
          opacity={0.5}
        />
      );
    }

    return lines;
  };

  // Add keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Undo (Ctrl+Z)
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch(undo());
        return;
      }

      // Redo (Ctrl+Shift+Z)
      if (e.ctrlKey && e.key === 'z' && e.shiftKey) {
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
        socket?.emit('shapes-paste', { diagramId });
        return;
      }

      // Delete selected shapes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          dispatch(deleteShapes(selectedIds));
          socket?.emit('shape-delete', { ids: selectedIds, diagramId });
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
        }
      }

      // Export (Ctrl+E)
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, socket, diagramId, selectedIds]);

  // Handle export
  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Export as PNG
    const dataURL = stage.toDataURL();
    const link = document.createElement('a');
    link.download = `canvas-${new Date().toISOString()}.png`;
    link.href = dataURL;
    link.click();

    // Export as JSON
    dispatch(exportCanvas());
  }, [dispatch]);

  // Handle import
  const handleImport = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        dispatch(importCanvas(data));
        // Emit import event to other users
        socket?.emit('canvas-import', { diagramId, data });
      } catch (error) {
        console.error('Error importing canvas:', error);
      }
    };
    reader.readAsText(file);
  }, [dispatch, socket, diagramId]);

  // Update collaborator cursor position
  useEffect(() => {
    if (!socket || !diagramId) return;

    const updateCursor = (e) => {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const position = {
        x: (pointer.x - stage.x()) / stage.scaleX(),
        y: (pointer.y - stage.y()) / stage.scaleY(),
      };

      dispatch(updateCollaboratorPosition({
        id: socket.id,
        position,
        color: '#ff0000', // You can make this dynamic based on user
        name: 'User', // You can make this dynamic based on user
      }));

      socket.emit('cursor-update', { diagramId, position });
    };

    window.addEventListener('mousemove', updateCursor);
    return () => window.removeEventListener('mousemove', updateCursor);
  }, [socket, diagramId, dispatch]);

  // Handle collaborator cursors
  useEffect(() => {
    if (!socket || !diagramId) return;

    socket.on('cursor-update', ({ userId, position, color, name }) => {
      dispatch(updateCollaboratorPosition({
        id: userId,
        position,
        color,
        name,
      }));
    });

    socket.on('user-disconnected', (userId) => {
      dispatch(removeCollaborator(userId));
    });

    return () => {
      socket.off('cursor-update');
      socket.off('user-disconnected');
    };
  }, [socket, diagramId, dispatch]);

  // Render collaborator cursors
  const renderCollaboratorCursors = () => {
    return collaborators.map((collaborator) => {
      if (collaborator.id === socket?.id) return null; // Don't render own cursor
      return (
        <Group key={collaborator.id}>
          <Circle
            x={collaborator.position.x}
            y={collaborator.position.y}
            radius={5}
            fill={collaborator.color}
            stroke="#fff"
            strokeWidth={1}
          />
          <Text
            text={collaborator.name}
            fontSize={12}
            fill={collaborator.color}
            x={8}
            y={-5}
            padding={4}
            background="#fff"
            cornerRadius={4}
          />
        </Group>
      );
    });
  };

  const renderCanvas = () => {
    return (
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDblClick}
        onWheel={handleWheel}
        scale={{ x: zoom, y: zoom }}
        className={`touch-none ${isSpacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
      >
        <Layer>
          {/* Grid */}
          {getGridLines()}

          {/* Shapes */}
          {shapes.map(renderShape)}

          {/* Collaborator Cursors */}
          {renderCollaboratorCursors()}

          {/* Transformer for selection */}
          {tool === 'select' && selectedIds.length > 0 && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                const minSize = 5;
                if (newBox.width < minSize || newBox.height < minSize) {
                  return oldBox;
                }
                return newBox;
              }}
              rotateEnabled={true}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            />
          )}
        </Layer>
      </Stage>
    );
  };

  return (
    <div className="w-full h-screen bg-gray-100 overflow-hidden relative">
      <Toolbar onExport={handleExport} onImport={handleImport} />
      {editingTextId && (
        <div
          style={{
            position: 'absolute',
            top: editingTextPos.y,
            left: editingTextPos.x,
            zIndex: 100,
            background: 'white',
            border: '1px solid #ccc',
            fontFamily: 'Handlee',
            fontSize: fontSize,
            color: 'black',
            minWidth: 100,
          }}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTextEditBlur}
          onInput={e => setEditingTextValue(e.currentTarget.textContent)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleTextEditBlur();
            }
          }}
          autoFocus
        >
          {editingTextValue}
        </div>
      )}
      {renderCanvas()}
    </div>
  );
};

export default Canvas; 
import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer } from "react-konva";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
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
  setGridVisible,
} from "../store/canvasSlice";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import StickyNotes from "./StickyNotes";
import CollaboratorCursors from "./CollaboratorCursors";
import CollaboratorPresence from "./CollaboratorPresence";
import MarkdownNotesPanel from "./MarkdownNotesPanel";
import TextEditorPortal from "./TextEditorPortal";
import GridLayer from "./GridLayer";
import ShapeRenderer from "./ShapeRenderer";
import MarkdownEditor from "./MarkdownEditor";
import { Portal } from "react-konva-utils";
import ReactMarkdown from "react-markdown";
import { getCatmullRomSpline } from "../utils/catmullRom";

const SMOOTHING_FACTOR = 0.3; // For freehand smoothing
const MIN_DISTANCE = 2; // Minimum distance between points for freehand
const POINT_THRESHOLD = 5; // Distance threshold for point reduction
const LINE_SMOOTHING = true; // Enable line smoothing

const Canvas = ({ readOnly = false }) => {
  const dispatch = useDispatch();
  const { id: diagramId } = useParams();
  const {
    socket,
    joinDiagram,
    leaveDiagram,
    emitShapeAdd,
    emitShapeUpdate,
    emitShapeDelete,
    emitViewUpdate,
    emitCursorMove,
  } = useSocket();
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const shapesRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [editingTextPos, setEditingTextPos] = useState({ x: 0, y: 0 });
  const [stickyNoteImage, setStickyNoteImage] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isMarkdownPanelOpen, setIsMarkdownPanelOpen] = useState(false);
  const [editingMarkdownId, setEditingMarkdownId] = useState(null);
  const [editingMarkdownValue, setEditingMarkdownValue] = useState("");
  const [isPlacingStickyNote, setIsPlacingStickyNote] = useState(false);
  const [isMarkdownEditorOpen, setIsMarkdownEditorOpen] = useState(false);
  const [markdownEditorValue, setMarkdownEditorValue] = useState("");
  const markdownPanelRef = useRef(null);
  const [collaboratorCursors, setCollaboratorCursors] = useState({});
  const [collaboratorPresence, setCollaboratorPresence] = useState({});
  const cursorTimeoutRef = useRef({});
  const lastCursorUpdateRef = useRef({});
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(window.innerWidth);
  const [stageHeight, setStageHeight] = useState(window.innerHeight);

  // Responsive: update stage size to match container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageWidth(containerRef.current.offsetWidth);
        setStageHeight(containerRef.current.offsetHeight);
      } else {
        setStageWidth(window.innerWidth);
        setStageHeight(window.innerHeight);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

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
    isGridVisible = false, // default to false
    isDragging,
    isPanning,
    lastMousePosition,
    collaborators,
    canUndo,
    canRedo,
  } = useSelector((state) => state.canvas);

  // Add fallback values to prevent undefined states
  const safeZoom = zoom || 1;
  const safeTool = tool || 'select';
  const safeIsGridVisible = typeof isGridVisible === 'boolean' ? isGridVisible : false;

  // Add grid rendering constants
  const GRID_SIZE = 20; // Size of each grid cell
  const GRID_EXTENSION = 2000; // How far to extend the grid beyond the visible area

  // Add effect to handle undo/redo state changes - moved after state destructuring
  useEffect(() => {
    console.log("Undo/Redo state:", { canUndo, canRedo });
  }, [canUndo, canRedo]);

  // Ensure we have a default tool selected
  useEffect(() => {
    if (!safeTool) {
      dispatch(setTool('select'));
    }
  }, [safeTool, dispatch]);

  // Ensure we have a default zoom
  useEffect(() => {
    if (!safeZoom || safeZoom === 0) {
      dispatch(setZoom(1));
    }
  }, [safeZoom, dispatch]);

  // Initialize canvas state on mount
  useEffect(() => {
    // Ensure we have proper initial state
    if (!safeTool) {
      dispatch(setTool('select'));
    }
    if (!safeZoom || safeZoom === 0) {
      dispatch(setZoom(1));
    }
    if (typeof safeIsGridVisible !== 'boolean') {
      dispatch(setGridVisible(false));
    }
  }, [dispatch, safeTool, safeZoom, safeIsGridVisible]);

  // Ensure canvas is properly initialized
  useEffect(() => {
    // Force a re-render if stage dimensions are not set
    if (stageWidth === 0 || stageHeight === 0) {
      const timer = setTimeout(() => {
        setStageWidth(Math.max(window.innerWidth, 1200));
        setStageHeight(Math.max(window.innerHeight, 800));
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [stageWidth, stageHeight]);

  // Initialize socket events
  useEffect(() => {
    if (!socket || !diagramId) return;

    joinDiagram(diagramId);

    // Track locally changed shape IDs to avoid overwriting by socket events
    const localShapeIds = new Set();

    // Helper to add local shape ID and remove after delay
    const addLocalShapeId = (id) => {
      localShapeIds.add(id);
      setTimeout(() => {
        localShapeIds.delete(id);
      }, 3000); // 3 seconds buffer to ignore socket updates
    };

    socket.on("shapeUpdate", (data) => {
      if (localShapeIds.has(data.shape.id)) {
        // Ignore updates for locally changed shapes
        return;
      }
      dispatch(updateShape(data.shape));
    });

    socket.on("shapeAdd", (data) => {
      if (localShapeIds.has(data.shape.id)) {
        // Ignore adds for locally created shapes
        return;
      }
      dispatch(addShape(data.shape));
    });

    socket.on("shapeDelete", (data) => {
      dispatch(deleteShapes(data.ids));
    });

    socket.on("viewUpdate", (data) => {
      if (stageRef.current) {
        stageRef.current.scale({ x: data.zoom, y: data.zoom });
        stageRef.current.position(data.position);
        dispatch(setZoom(data.zoom));
      }
    });

    // Handle cursor movement with throttling
    socket.on("cursorUpdate", (data) => {
      const { id, position, color, name, tool, selection } = data;
      const now = Date.now();

      // Throttle cursor updates (max 30fps)
      if (
        lastCursorUpdateRef.current[id] &&
        now - lastCursorUpdateRef.current[id] < 33
      ) {
        return;
      }
      lastCursorUpdateRef.current[id] = now;

      setCollaboratorCursors((prev) => ({
        ...prev,
        [id]: {
          position,
          user: { color, name },
          lastUpdate: now,
          tool,
          selection,
        },
      }));

      // Clear existing timeout
      if (cursorTimeoutRef.current[id]) {
        clearTimeout(cursorTimeoutRef.current[id]);
      }

      // Set timeout to remove cursor if no updates
      cursorTimeoutRef.current[id] = setTimeout(() => {
        setCollaboratorCursors((prev) => {
          const newCursors = { ...prev };
          delete newCursors[id];
          return newCursors;
        });
      }, 2000); // Remove cursor after 2 seconds of inactivity
    });

    // Patch dispatch to add local shape IDs on addShape and updateShape
    const originalDispatch = dispatch;
    const wrappedDispatch = (action) => {
      if (action.type === 'canvas/addShape' || action.type === 'canvas/updateShape') {
        if (action.payload && action.payload.id) {
          addLocalShapeId(action.payload.id);
        }
      }
      return originalDispatch(action);
    };

    return () => {
      leaveDiagram(diagramId);
      socket.off("shapeUpdate");
      socket.off("shapeAdd");
      socket.off("shapeDelete");
      socket.off("viewUpdate");
      // Clear all timeouts
      Object.values(cursorTimeoutRef.current).forEach(clearTimeout);
      socket.off("cursorUpdate");
    };
  }, [socket, diagramId, dispatch, joinDiagram, leaveDiagram]);

  // Load sticky note background image
  useEffect(() => {
    const img = new window.Image();
    img.src = "/sticky-note-bg.svg";
    img.onload = () => setStickyNoteImage(img);
  }, []);

  // --- FREEHAND: Store raw points, smooth only for rendering ---
  const [rawFreehandPoints, setRawFreehandPoints] = useState([]);

  // --- FREEHAND SMOOTHING: Real-time Catmull-Rom spline ---
  const getSmoothedPoints = (points) => {
    if (!points || points.length < 4) return points;
    // Use Catmull-Rom spline for smooth freehand
    return getCatmullRomSpline(points, 8); // 8 interpolated points per segment
  };

  // Update handleMouseMove to make freehand drawing smoother
  const handleMouseMove = useCallback(
    (e) => {
      if (!socket || !diagramId) return;
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();

      if (isDrawing && currentShape) {
        console.log("Updating shape during drag:", { tool, currentShape, startPoint });
      }

      // Throttle cursor updates
      const now = Date.now();
      if (
        lastCursorUpdateRef.current["self"] &&
        now - lastCursorUpdateRef.current["self"] < 16
      ) {
        // 60fps
        return;
      }
      lastCursorUpdateRef.current["self"] = now;

      // Emit cursor position with user info and current state
      emitCursorMove(diagramId, point, selectedIds, tool);

      if (readOnly) return;
      if (isPanning && lastMousePosition) {
        const dx = point.x - lastMousePosition.x;
        const dy = point.y - lastMousePosition.y;
        stage.position({
          x: stage.x() + dx,
          y: stage.y() + dy,
        });
        dispatch(setLastMousePosition(point));

        emitViewUpdate(diagramId, stage.scaleX(), stage.position());
        return;
      }
      if (!isDrawing || !currentShape) {
        console.log("Not drawing or no current shape:", { isDrawing, currentShape });
        return;
      }
      if (!startPoint) {
        console.log("No start point:", { startPoint });
        return;
      }
      const stagePoint = {
        x: (point.x - stage.x()) / stage.scaleX(),
        y: (point.y - stage.y()) / stage.scaleY(),
      };
      const pointToUse =
        tool === "freehand"
          ? stagePoint
          : {
              x: isDrawing ? stagePoint.x : snapToGrid(stagePoint.x),
              y: isDrawing ? stagePoint.y : snapToGrid(stagePoint.y),
            };
      console.log("Calculating shape update:", { startPoint, pointToUse, tool });
      let updatedShape;
      switch (tool) {
        case "rectangle": {
          const width = pointToUse.x - startPoint.x;
          const height = pointToUse.y - startPoint.y;
          updatedShape = {
            ...currentShape,
            x: startPoint.x,
            y: startPoint.y,
            width: Math.abs(width) < 2 ? (width < 0 ? -2 : 2) : width,
            height: Math.abs(height) < 2 ? (height < 0 ? -2 : 2) : height,
          };
          console.log("Rectangle update:", updatedShape);
          break;
        }
        case "circle": {
          let radius = Math.sqrt(
            Math.pow(pointToUse.x - startPoint.x, 2) +
              Math.pow(pointToUse.y - startPoint.y, 2)
          );
          if (radius < 2) radius = 2;
          updatedShape = {
            ...currentShape,
            x: startPoint.x,
            y: startPoint.y,
            radius,
          };
          console.log("Circle update:", updatedShape);
          break;
        }
        case "line":
        case "arrow": {
          updatedShape = {
            ...currentShape,
            points: [startPoint.x, startPoint.y, pointToUse.x, pointToUse.y],
          };
          console.log("Line/Arrow update:", updatedShape);
          break;
        }
        case "freehand": {
          // Store raw points for freehand
          const newRawPoints = [...rawFreehandPoints, pointToUse.x, pointToUse.y];
          setRawFreehandPoints(newRawPoints);
          // Only smooth for rendering
          const smoothed = getSmoothedPoints(newRawPoints);
          updatedShape = {
            ...currentShape,
            points: smoothed,
          };
          console.log("Freehand update:", updatedShape);
          break;
        }
        default:
          console.log("Unknown tool:", tool);
          return;
      }
      if (updatedShape) {
        console.log("Dispatching shape update:", updatedShape);
        setCurrentShape(updatedShape);
        dispatch(updateShape(updatedShape));
        emitShapeUpdate(diagramId, updatedShape);
      }
    },
    [
      socket,
      diagramId,
      readOnly,
      isPanning,
      lastMousePosition,
      isDrawing,
      currentShape,
      tool,
      startPoint,
      dispatch,
      emitCursorMove,
      emitViewUpdate,
      emitShapeUpdate,
      selectedIds,
      zoom,
      rawFreehandPoints,
    ]
  );

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
    if (
      result[result.length - 2] !== points[points.length - 2] ||
      result[result.length - 1] !== points[points.length - 1]
    ) {
      result.push(points[points.length - 2], points[points.length - 1]);
    }

    return result;
  };

  // Handle space key for panning
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e) => {
      if (e.code === "Space" && !isSpacePressed) {
        setIsSpacePressed(true);
        if (stageRef.current) {
          stageRef.current.container().style.cursor = "grab";
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        if (stageRef.current && !isPanning) {
          stageRef.current.container().style.cursor = "default";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed, isPanning, readOnly]);

  // Update handleMouseUp to always switch to select and deselect
  const handleMouseUp = useCallback(
    (e) => {
      if (!isDrawing || !currentShape) {
        // Clear panning and dragging states even if not drawing
        dispatch(setIsPanning(false));
        dispatch(setIsDragging(false));
        return;
      }
      // Dispatch final updateShape to save the last shape state
      dispatch(updateShape(currentShape));
      setIsDrawing(false);
      setCurrentShape(null);
      setRawFreehandPoints([]); // Reset raw points
      dispatch(setTool("select"));
      dispatch(setSelectedIds([]));
      dispatch(setIsPanning(false));
      dispatch(setIsDragging(false));
    },
    [isDrawing, currentShape, dispatch]
  );

  // --- Selection and tool switching polish ---
  const handleMouseDown = (e) => {
    console.log('[Canvas] handleMouseDown fired', { tool, readOnly, target: e.target });
    if (readOnly) return;

    // Prevent shape creation if markdown panel is open and tool is markdown
    if (tool === 'markdown' && isMarkdownPanelOpen) {
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (!point) return;

    // Handle text tool: create a text shape and open the editor
    if (tool === 'text') {
      const newId = uuidv4();
      const newShape = {
        id: newId,
        type: 'text',
        x: point.x / safeZoom,
        y: point.y / safeZoom,
        width: 200,
        height: 50,
        text: '',
        fontSize: 18,
        fill: '#fff',
        stroke: '#23232b',
        strokeWidth: 2,
        draggable: true,
      };
      dispatch(addShape(newShape));
      setPendingTextId(newId);
      // Switch back to select tool after placing text
      dispatch(setTool('select'));
      return;
    }

    // Handle sticky tool: create a sticky note (do not open editor immediately)
    if (tool === 'sticky') {
      const newId = uuidv4();
      const newShape = {
        id: newId,
        type: 'sticky',
        x: point.x / safeZoom,
        y: point.y / safeZoom,
        width: 200,
        height: 150,
        text: '',
        fontSize: 16,
        fill: document.documentElement.classList.contains('dark') ? '#35352a' : '#d3d3c6',
        stroke: '#6e6e6e',
        strokeWidth: 2,
        draggable: true,
      };
      dispatch(addShape(newShape));
      // Switch back to select tool after placing sticky
      dispatch(setTool('select'));
      return;
    }

    e.cancelBubble = true;
    e.evt.preventDefault();

    console.log("handleMouseDown at point:", point, "tool:", tool);

    // Handle eraser tool
    if (tool === "eraser") {
      const clickedShape = e.target;
      if (clickedShape !== stage) {
        const shapeId = clickedShape.id();
        if (shapeId) {
          console.log("Deleting shape with id:", shapeId);
          dispatch(deleteShapes([shapeId]));
          emitShapeDelete(diagramId, [shapeId]);
        }
      }
      return;
    }

    // Convert point to stage coordinates
    const stagePoint = {
      x: (point.x - stage.x()) / stage.scaleX(),
      y: (point.y - stage.y()) / stage.scaleY(),
    };

    const pointToUse =
      tool === "freehand"
        ? stagePoint
        : {
            x: isDrawing ? stagePoint.x : snapToGrid(stagePoint.x),
            y: isDrawing ? stagePoint.y : snapToGrid(stagePoint.y),
          };

    // Handle panning
    if (isSpacePressed || tool === "pan") {
      dispatch(setIsPanning(true));
      dispatch(setLastMousePosition(point));
      stage.container().style.cursor = "grabbing";
      return;
    }

    // Handle selection: deselect on empty canvas click
    if (tool === "select") {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        dispatch(setSelectedIds([]));
      }
      return;
    }

    // Prevent new shape if already drawing
    if (isDrawing) return;
    setIsDrawing(true);
    setStartPoint(pointToUse);

    // For freehand, start with raw points
    if (tool === "freehand") setRawFreehandPoints([pointToUse.x, pointToUse.y]);

    // Create new shape based on tool
    const isDarkTheme = document.documentElement.classList.contains('dark');
    const defaultFill = isDarkTheme ? '#23272f' : '#b0b3b8';
    const defaultStroke = '#6e6e6e';
    const newShape = {
      id: uuidv4(),
      type: tool,
      x: pointToUse.x,
      y: pointToUse.y,
      stroke: ["freehand", "line", "arrow"].includes(tool)
        ? (strokeColor || defaultStroke)
        : (tool === "text" && (strokeColor.toLowerCase() === "#000000" || strokeColor.toLowerCase() === "#000")
          ? "#fff"
          : (strokeColor || defaultStroke)),
      strokeWidth: tool === "freehand" ? 3 : (["line", "arrow"].includes(tool) ? 3 : strokeWidth),
      strokeStyle: tool === "freehand" ? "solid" : strokeStyle,
      fill: tool === "sticky" ? (isDarkTheme ? '#35352a' : '#d3d3c6') : (fillColor || defaultFill),
      fontSize,
      draggable: !readOnly,
      rotation: 0,
    };

    // Add tool-specific properties with initial minimal size
    switch (tool) {
      case "rectangle":
        newShape.width = 60; // Minimum visible size
        newShape.height = 40;
        break;
      case "circle":
        newShape.radius = 30; // Minimum visible radius
        break;
      case "line":
      case "arrow":
        newShape.points = [
          pointToUse.x,
          pointToUse.y,
          pointToUse.x + 60,
          pointToUse.y + 1
        ];
        break;
      case "freehand":
        newShape.points = [pointToUse.x, pointToUse.y];
        break;
      case "text":
        newShape.width = 120;
        newShape.height = 40;
        newShape.text = "";
        break;
      case "sticky":
        newShape.width = 140;
        newShape.height = 100;
        newShape.text = "Double click to edit...";
        break;
      case "markdown":
        newShape.width = 300;
        newShape.height = 200;
        newShape.text = "";
        break;
      default:
        console.log("Invalid tool:", tool);
        dispatch(setTool("select"));
        setIsDrawing(false);
        return;
    }

    // Only proceed if we have a valid drawing tool
    if (
      [
        "rectangle",
        "circle",
        "line",
        "arrow",
        "freehand",
        "text",
        "sticky",
        "markdown",
      ].includes(tool)
    ) {
      console.log("Creating new shape:", newShape);
      setCurrentShape(newShape);
      dispatch(addShape(newShape));
      emitShapeAdd(diagramId, newShape);
      console.log("Shape created and dispatched");

      // Handle text-based tools
      if (tool === "text" || tool === "sticky" || tool === "markdown") {
        // Remove immediate call to handleTextEdit here
        setEditingTextId(newShape.id); // Set editingTextId to trigger useEffect
        dispatch(setSelectedIds([newShape.id])); // Select the new shape
        dispatch(setTool("select")); // Switch to select tool after creating text shape
      }
    } else {
      console.log("Invalid drawing tool:", tool);
    }
  };

  // Handler to open markdown editor
  const openMarkdownEditor = () => setIsMarkdownEditorOpen(true);
  const closeMarkdownEditor = () => setIsMarkdownEditorOpen(false);
  const saveMarkdownContent = (content) => {
    setMarkdownEditorValue(content);
    setIsMarkdownEditorOpen(false);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e) => {
      // Skip if focus is on input, textarea or contenteditable
      const target = e.target;
      const tagName = target.tagName;
      const isContentEditable = target.isContentEditable;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        isContentEditable
      ) {
        return;
      }

      // Undo (Ctrl+Z)
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        console.log("Undoing last action");
        dispatch(undo());
        return;
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if (
        (e.ctrlKey && e.key === "y") ||
        (e.ctrlKey && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        console.log("Redoing last action");
        dispatch(redo());
        return;
      }

      // Copy (Ctrl+C)
      if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        dispatch(copyToClipboard());
        return;
      }

      // Paste (Ctrl+V)
      if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        dispatch(pasteFromClipboard());
        return;
      }

      // Delete selected shapes
      if (e.key === "Delete" || e.key === "Backspace") {
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
          case "v":
            dispatch(setTool("select"));
            break;
          case "h":
            dispatch(setTool("pan"));
            break;
          case "r":
            dispatch(setTool("rectangle"));
            break;
          case "c":
            dispatch(setTool("circle"));
            break;
          case "l":
            dispatch(setTool("line"));
            break;
          case "a":
            dispatch(setTool("arrow"));
            break;
          case "p":
            dispatch(setTool("freehand"));
            break;
          case "t":
            dispatch(setTool("text"));
            break;
          case "n":
            dispatch(setTool("sticky"));
            break;
          case "m":
            dispatch(setTool("markdown"));
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    emitViewUpdate(diagramId, newScale, newPos);
  };

  // Update handleTextEdit to properly handle sticky notes
  const handleTextEdit = (shapeId, text, position) => {
    if (readOnly) return;
    const stage = stageRef.current;
    if (!stage) return;

    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    const absPos = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();

    setEditingTextValue(text || "");
    setEditingTextId(null); // Force close if already open
    setTimeout(() => {
      setEditingTextId(shapeId); // Re-open editor on every double-click
    }, 0);

    // Calculate position considering stage transform and shape type
    const stagePoint = {
      x: (position.x - stage.x()) / scale,
      y: (position.y - stage.y()) / scale,
    };

    // For sticky notes, adjust the position to be inside the note
    const textPos = {
      x: stagePoint.x + absPos.left + (shape.type === "sticky" ? 10 : 0),
      y: stagePoint.y + absPos.top + (shape.type === "sticky" ? 10 : 0),
    };

    setEditingTextPos(textPos);

    // If it's a sticky note, ensure it has a minimum size
    if (shape.type === "sticky" && (!shape.width || shape.width < 100)) {
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
      setEditingTextValue("");
    };
  }, []);
  
  // Add useEffect to call handleTextEdit when editingTextId changes and shape is available
  useEffect(() => {
    if (!editingTextId) return;
    const shape = shapes.find((s) => s.id === editingTextId);
    if (!shape) return;
    const stage = stageRef.current;
    if (!stage) return;
    const absPos = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();

    // Calculate position considering stage transform and shape type
    const stagePoint = {
      x: (shape.x - stage.x()) / scale,
      y: (shape.y - stage.y()) / scale,
    };

    // For sticky notes, adjust the position to be inside the note
    const textPos = {
      x: stagePoint.x + absPos.left + (shape.type === "sticky" ? 10 : 0),
      y: stagePoint.y + absPos.top + (shape.type === "sticky" ? 10 : 0),
    };

    setEditingTextValue(shape.text || "");
    setEditingTextPos(textPos);
  }, [editingTextId, shapes]);

  // Update text editor portal
  const renderTextEditor = () => {
    if (!editingTextId || readOnly) return null;

    const shape = shapes.find((s) => s.id === editingTextId);
    if (!shape) return null;

    return (
      <Portal>
        <div
          className="fixed z-[1000]"
          style={{
            position: "absolute",
            top: editingTextPos.y,
            left: editingTextPos.x,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          <div className="relative">
            <textarea
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onBlur={() => {
                if (editingTextId) {
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
                  setEditingTextValue("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.target.blur();
                }
              }}
              className="border border-gray-300 rounded p-1 bg-[#181818] shadow-lg min-w-[100px] min-h-[24px] resize-none"
              style={{
                fontSize: `${shape.fontSize || 16}px`,
                color: "#fff",
                width:
                  shape.type === "sticky" ? `${shape.width - 20}px` : "auto",
                height:
                  shape.type === "sticky" ? `${shape.height - 20}px` : "auto",
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
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => (line.startsWith("- ") ? line : `- ${line}`));

    if (editingMarkdownId) {
      // Update existing note
      const updatedNote = {
        id: editingMarkdownId,
        type: "markdown",
        text: bulletPoints.join("\n"),
        timestamp: Date.now(),
      };
      dispatch(updateShape(updatedNote));
    } else {
      // Create new note
      const newNote = {
        id: uuidv4(),
        type: "markdown",
        text: bulletPoints.join("\n"),
        timestamp: Date.now(),
      };
      dispatch(addShape(newNote));
    }

    setEditingMarkdownId(null);
    setEditingMarkdownValue("");
  };

  // Update the collaborator cursor rendering
  const renderCollaboratorCursors = () => {
    return Object.entries(collaboratorCursors).map(([userId, data]) => {
      const { position, user, lastUpdate, selection, tool } = data;
      const isActive = Date.now() - lastUpdate < 1000;
      const isSelecting = tool === "select" && selection?.length > 0;

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
          {isSelecting &&
            selection.map((shapeId) => {
              const shape = shapes.find((s) => s.id === shapeId);
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
        <div className="bg-gradient-to-br from-neutral-900/90 to-black/95 rounded-xl shadow-2xl p-4 space-y-2 backdrop-blur-lg border border-white/10">
          <h3 className="text-xs font-semibold text-neutral-300 mb-2 flex items-center tracking-wide uppercase">
            <svg
              className="w-4 h-4 mr-2 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Collaborators
          </h3>
          {Object.entries(collaboratorPresence).map(([userId, user]) => {
            const cursor = collaboratorCursors[userId];
            const isActive = cursor && Date.now() - cursor.lastUpdate < 2000;

            return (
              <div
                key={userId}
                className="flex items-center justify-between space-x-2 p-1 rounded-md hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-white/20 shadow"
                    style={{
                      backgroundColor: user.color,
                      boxShadow: isActive
                        ? `0 0 0 3px ${user.color}40`
                        : "none",
                    }}
                  />
                  <span className="text-xs text-neutral-100 font-medium drop-shadow-sm">
                    {user.name}
                  </span>
                </div>
                {cursor && (
                  <span className="text-[10px] text-neutral-400 font-mono px-1">
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

  // --- TRANSFORMER/RESIZE HANDLE LOGIC ---
  useEffect(() => {
    // Ensure transformer always appears for selected shapes
    if (transformerRef.current && shapesRef && shapesRef.current) {
      const selectedNodes = shapesRef.current.filter((node) =>
        selectedIds.includes(node.id())
      );
      if (selectedNodes.length > 0) {
        transformerRef.current.nodes(selectedNodes);
        transformerRef.current.getLayer().batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedIds, shapes]);

  // Update the cursor style effect
  useEffect(() => {
    if (stageRef.current) {
      if (tool === "eraser") {
        // Create a smaller, box-like eraser cursor SVG
        const eraserSVG = encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Simple box eraser with a slight angle -->
            <rect x="4" y="8" width="12" height="8" rx="1" 
                  fill="#f3f4f6" 
                  stroke="#23232b" 
                  stroke-width="1.5"
                  transform="rotate(-15 10 12)"/>
            <!-- Small grip detail -->
            <rect x="6" y="10" width="8" height="4" rx="0.5" 
                  fill="#23232b" 
                  stroke="#f3f4f6" 
                  stroke-width="1"
                  transform="rotate(-15 10 12)"/>
          </svg>
        `);
        stageRef.current.container().style.cursor = `url('data:image/svg+xml,${eraserSVG}') 6 6, auto`;
      } else {
        stageRef.current.container().style.cursor = {
          select: "default",
          rectangle: "crosshair",
          circle: "crosshair",
          line: "crosshair",
          arrow: "crosshair",
          freehand: "crosshair",
          text: "text",
          sticky: "crosshair",
          markdown: "crosshair",
          pan: "grab",
        }[tool] || "default";
      }
    }
  }, [tool]);

  // Update undo/redo functionality
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e) => {
      // Undo (Ctrl+Z)
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        console.log("Undoing last action");
        dispatch(undo());
        return;
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if (
        (e.ctrlKey && e.key === "y") ||
        (e.ctrlKey && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        console.log("Redoing last action");
        dispatch(redo());
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, readOnly]);

  // Debug shapes array changes
  useEffect(() => {
    console.log("Shapes array updated:", shapes);
  }, [shapes]);

  // Add useEffect to open the markdown panel when the tool is set to 'markdown'
  useEffect(() => {
    if (tool === 'markdown') {
      setIsMarkdownPanelOpen(true);
    }
  }, [tool]);

  // Add useEffect to close the markdown panel when clicking outside of it
  useEffect(() => {
    if (!isMarkdownPanelOpen) return;
    const handleClick = (e) => {
      if (markdownPanelRef.current && !markdownPanelRef.current.contains(e.target)) {
        setIsMarkdownPanelOpen(false);
        dispatch(setTool('select'));
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMarkdownPanelOpen, dispatch]);

  const [pendingTextId, setPendingTextId] = useState(null);

  // Add useEffect to open the text editor only when the new shape is present
  useEffect(() => {
    if (!pendingTextId) return;
    // Support both string and object for backward compatibility
    const id = typeof pendingTextId === 'string' ? pendingTextId : pendingTextId.id;
    const absX = typeof pendingTextId === 'object' ? pendingTextId.absX : null;
    const absY = typeof pendingTextId === 'object' ? pendingTextId.absY : null;
    const shape = shapes.find(s => s.id === id);
    if (!shape) return;
    setEditingTextId(id);
    setEditingTextValue("");
    setEditingTextPos(absX !== null && absY !== null
      ? { x: absX, y: absY }
      : { x: shape.x * safeZoom, y: shape.y * safeZoom });
    setPendingTextId(null);
  }, [pendingTextId, shapes, safeZoom]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Markdown Notes Panel */}
      <MarkdownNotesPanel
        ref={markdownPanelRef}
        isOpen={isMarkdownPanelOpen}
        onToggle={() => setIsMarkdownPanelOpen(!isMarkdownPanelOpen)}
        onOpenEditor={openMarkdownEditor}
        editingMarkdownId={editingMarkdownId}
        editingMarkdownValue={editingMarkdownValue}
        setEditingMarkdownId={setEditingMarkdownId}
        setEditingMarkdownValue={setEditingMarkdownValue}
        handleMarkdownSave={handleMarkdownSave}
        onClose={() => {
          setIsMarkdownPanelOpen(false);
          setEditingMarkdownId(null);
          setEditingMarkdownValue('');
          dispatch(setTool('select'));
        }}
        shapes={shapes}
        dispatch={dispatch}
      />

      {/* MarkdownEditor Modal in Portal */}
      {isMarkdownEditorOpen && (
        <Portal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-black rounded-2xl shadow-2xl p-7 w-full max-w-xl relative border border-white/15 text-neutral-100">
              <button
                className="absolute top-3 right-3 text-neutral-400 hover:text-white transition-colors"
                onClick={closeMarkdownEditor}
                title="Close"
                tabIndex={0}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-lg font-bold mb-4 text-white tracking-tight">
                Markdown Notes
              </h3>
              <textarea
                className="w-full min-h-[120px] max-h-60 bg-neutral-900 border border-white/10 rounded-lg p-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-inner resize-y placeholder-neutral-500 transition"
                placeholder="Write your notes in markdown..."
                value={markdownEditorValue}
                onChange={(e) => setMarkdownEditorValue(e.target.value)}
                tabIndex={0}
                style={{ fontFamily: "inherit", fontSize: "1rem" }}
              />
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  onClick={closeMarkdownEditor}
                  className="px-4 py-2 rounded-lg bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700/80 hover:text-white border border-white/10 transition font-medium shadow focus:outline-none focus:ring-2 focus:ring-white/20"
                  tabIndex={0}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (markdownEditorValue.trim()) {
                      saveMarkdownContent(markdownEditorValue);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-br from-neutral-700 via-neutral-800 to-black text-white font-semibold shadow-glossy border border-white/20 hover:from-neutral-600 hover:to-neutral-900 transition focus:outline-none focus:ring-2 focus:ring-white/20"
                  tabIndex={0}
                  disabled={!markdownEditorValue.trim()}
                  style={{
                    opacity: markdownEditorValue.trim() ? 1 : 0.5,
                    cursor: markdownEditorValue.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Save
                </button>
              </div>
              <div className="mt-6">
                <h4 className="text-neutral-200 font-semibold mb-2">Preview:</h4>
                <div className="prose max-w-none bg-neutral-950 p-3 rounded border border-white/10 text-neutral-100 prose-headings:text-white prose-p:text-neutral-200 prose-strong:text-white prose-code:bg-neutral-800 prose-code:text-neutral-200 prose-blockquote:border-neutral-700 prose-blockquote:text-neutral-400">
                  <ReactMarkdown>{markdownEditorValue}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Canvas Container - clean, open, no border/box, no overlays */}
      <div
        ref={containerRef}
        className={`absolute inset-0 transition-all duration-300 ${
          isMarkdownPanelOpen ? "left-[300px]" : "left-0"
        } bg-gradient-to-br from-black via-neutral-900 to-black pointer-events-auto overflow-hidden w-full h-full min-h-0 min-w-0 flex-1`}
        style={{ zIndex: 10 }}
      >
        {/* Fallback loading state if stage is not ready */}
        {!stageRef.current && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
          </div>
        )}
        
        {/* Fallback content if stage fails to render */}
        {stageRef.current && stageWidth === 0 && stageHeight === 0 && (
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center">
              <div className="text-lg mb-2">Canvas Loading...</div>
              <div className="text-sm text-gray-400">Please wait while the canvas initializes</div>
            </div>
          </div>
        )}
        
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          scaleX={safeZoom}
          scaleY={safeZoom}
          x={stageWidth / 4}
          y={stageHeight / 4}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          draggable={isPanning}
          className="bg-transparent pointer-events-auto w-full h-full"
        >
          {/* Grid Layer - Infinite grid */}
          <GridLayer
            isGridVisible={safeIsGridVisible}
            stageRef={stageRef}
            stageWidth={stageWidth}
            stageHeight={stageHeight}
            GRID_SIZE={gridSize}
            GRID_EXTENSION={GRID_EXTENSION}
          />

          {/* Shapes Layer */}
          <Layer>
            <ShapeRenderer
              shapes={shapes}
              selectedIds={selectedIds}
              tool={safeTool}
              readOnly={readOnly}
              dispatch={dispatch}
              emitShapeUpdate={emitShapeUpdate}
              emitShapeDelete={emitShapeDelete}
              setSelectedIds={setSelectedIds}
              setIsDragging={setIsDragging}
              snapToGrid={snapToGrid}
              handleTextEdit={handleTextEdit}
              diagramId={diagramId}
              transformerRef={transformerRef}
              shapesRef={shapesRef}
            />
          </Layer>

          {/* Collaborator Cursors Layer */}
          <CollaboratorCursors
            collaborators={collaborators}
            shapes={shapes}
            selectedIds={selectedIds}
            stageRef={stageRef}
            zoom={safeZoom}
          />
        </Stage>
      </div>

      {/* Text Editor Portal */}
      <TextEditorPortal
        editingTextId={editingTextId}
        editingTextValue={editingTextValue}
        editingTextPos={editingTextPos}
        setEditingTextId={setEditingTextId}
        setEditingTextValue={setEditingTextValue}
        shapes={shapes}
        dispatch={dispatch}
        emitShapeUpdate={emitShapeUpdate}
        diagramId={diagramId}
        readOnly={readOnly}
        zoom={zoom}
      />

      {/* Sticky Notes Panel removed as requested */}

      <div className="fixed top-4 left-4 z-50 flex items-center space-x-4">
        <CollaboratorPresence />
        {/* Home button hover area */}
        <div className="relative group" style={{ width: 56, height: 56 }}>
          <div
            className="absolute inset-0 rounded-xl group-hover:bg-white/10 transition-colors duration-200 cursor-pointer"
            aria-label="Show Home Button Hover Area"
          ></div>
          <button
            onClick={() => navigate("/dashboard")}
            className="opacity-0 group-hover:opacity-100 flex items-center p-2 bg-gradient-to-br from-neutral-800/90 to-black/90 rounded-lg shadow-xl hover:bg-neutral-800/80 backdrop-blur-md border border-white/40 transition-all duration-200 absolute top-1 left-1"
            aria-label="Home"
            title="Home"
            style={{ cursor: 'pointer', boxShadow: '0 2px 12px 0 rgba(255,255,255,0.08)' }}
          >
            <svg
              className="w-6 h-6 text-white"
              style={{ filter: 'brightness(1.25) drop-shadow(0 1px 2px #fff6)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Canvas;

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
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    isGridVisible = false, // default to false
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
    console.log("Undo/Redo state:", { canUndo, canRedo });
  }, [canUndo, canRedo]);

  // Initialize socket events
  useEffect(() => {
    if (!socket || !diagramId) return;

    joinDiagram(diagramId);

    socket.on("shapeUpdate", (data) => {
      dispatch(updateShape(data.shape));
    });

    socket.on("shapeAdd", (data) => {
      dispatch(addShape(data.shape));
    });

    socket.on("shapeDelete", (data) => {
      dispatch(deleteShapes(data.ids));
    });

    socket.on("view-update", (data) => {
      if (stageRef.current) {
        stageRef.current.scale({ x: data.zoom, y: data.zoom });
        stageRef.current.position(data.position);
        dispatch(setZoom(data.zoom));
      }
    });

    socket.on("collaborator-joined", (data) => {
      dispatch(addCollaborator(data.collaborator));
    });

    socket.on("collaborator-left", (data) => {
      dispatch(removeCollaborator(data.userId));
    });

    socket.on("collaborator-moved", (data) => {
      dispatch(
        updateCollaboratorPosition({ id: data.userId, position: data.position })
      );
    });

    // Handle cursor movement with throttling
    socket.on("cursorMove", (data) => {
      const { userId, position, user } = data;
      const now = Date.now();

      // Throttle cursor updates (max 30fps)
      if (
        lastCursorUpdateRef.current[userId] &&
        now - lastCursorUpdateRef.current[userId] < 33
      ) {
        return;
      }
      lastCursorUpdateRef.current[userId] = now;

      setCollaboratorCursors((prev) => ({
        ...prev,
        [userId]: {
          position,
          user,
          lastUpdate: now,
        },
      }));

      // Clear existing timeout
      if (cursorTimeoutRef.current[userId]) {
        clearTimeout(cursorTimeoutRef.current[userId]);
      }

      // Set timeout to remove cursor if no updates
      cursorTimeoutRef.current[userId] = setTimeout(() => {
        setCollaboratorCursors((prev) => {
          const newCursors = { ...prev };
          delete newCursors[userId];
          return newCursors;
        });
      }, 2000); // Remove cursor after 2 seconds of inactivity
    });

    // Handle user presence
    socket.on("userPresence", (data) => {
      const { users } = data;
      setCollaboratorPresence(users);
    });

    // Handle user joined
    socket.on("userJoined", (data) => {
      const { user } = data;
      setCollaboratorPresence((prev) => ({
        ...prev,
        [user.id]: user,
      }));
    });

    // Handle user left
    socket.on("userLeft", (data) => {
      const { userId } = data;
      setCollaboratorPresence((prev) => {
        const newPresence = { ...prev };
        delete newPresence[userId];
        return newPresence;
      });
      setCollaboratorCursors((prev) => {
        const newCursors = { ...prev };
        delete newCursors[userId];
        return newCursors;
      });
    });

    return () => {
      leaveDiagram(diagramId);
      socket.off("shapeUpdate");
      socket.off("shapeAdd");
      socket.off("shapeDelete");
      socket.off("view-update");
      socket.off("collaborator-joined");
      socket.off("collaborator-left");
      socket.off("collaborator-moved");
      // Clear all timeouts
      Object.values(cursorTimeoutRef.current).forEach(clearTimeout);
      socket.off("cursorMove");
      socket.off("userPresence");
      socket.off("userJoined");
      socket.off("userLeft");
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
        console.log("Updating shape during drag:", { tool, currentShape });
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
      emitCursorMove(diagramId, {
        position: point,
        selection: selectedIds,
        tool,
        user: {
          id: socket.id,
          name: "You",
          color: "#FF0000",
        },
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
      let updatedShape;
      switch (tool) {
        case "rectangle": {
          updatedShape = {
            ...currentShape,
            x: startPoint.x,
            y: startPoint.y,
            width: pointToUse.x - startPoint.x,
            height: pointToUse.y - startPoint.y,
          };
          break;
        }
        case "circle": {
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
        case "line":
        case "arrow": {
          updatedShape = {
            ...currentShape,
            points: [startPoint.x, startPoint.y, pointToUse.x, pointToUse.y],
          };
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
    if (readOnly) return;
    e.cancelBubble = true;
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (!point) return;

    // Handle markdown tool
    if (tool === "markdown") {
      setIsMarkdownPanelOpen(true);
      dispatch(setTool("select"));
      return;
    }

    // Handle eraser tool
    if (tool === "eraser") {
      const clickedShape = e.target;
      if (clickedShape !== stage) {
        const shapeId = clickedShape.id();
        if (shapeId) {
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
            x: snapToGrid(stagePoint.x),
            y: snapToGrid(stagePoint.y),
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
    const newShape = {
      id: uuidv4(),
      type: tool,
      x: pointToUse.x,
      y: pointToUse.y,
      stroke: ["freehand", "line", "arrow"].includes(tool) ? "#fff" : strokeColor,
      strokeWidth: tool === "freehand" ? 3 : strokeWidth,
      strokeStyle: tool === "freehand" ? "solid" : strokeStyle,
      fill: tool === "sticky" ? "#fef08a" : fillColor,
      fontSize,
      draggable: !readOnly,
      rotation: 0,
    };

    // Add tool-specific properties with initial minimal size
    switch (tool) {
      case "rectangle":
        newShape.width = 0;
        newShape.height = 0;
        break;
      case "circle":
        newShape.radius = 0;
        break;
      case "line":
      case "arrow":
        newShape.points = [
          pointToUse.x,
          pointToUse.y,
          pointToUse.x,
          pointToUse.y,
        ];
        break;
      case "freehand":
        newShape.points = [pointToUse.x, pointToUse.y];
        break;
      case "text":
        newShape.width = 0;
        newShape.height = 0;
        newShape.text = "";
        break;
      case "sticky":
        newShape.width = 0;
        newShape.height = 0;
        newShape.text = "Double click to edit...";
        break;
      case "markdown":
        newShape.width = 0;
        newShape.height = 0;
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
      setCurrentShape(newShape);
      dispatch(addShape(newShape));
      emitShapeAdd(diagramId, newShape);

      // Handle text-based tools
      if (tool === "text" || tool === "sticky" || tool === "markdown") {
        handleTextEdit(newShape.id, newShape.text || "", pointToUse);
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
    emitViewUpdate(diagramId, { zoom: newScale, position: newPos });
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

    setEditingTextId(shapeId);
    setEditingTextValue(text || "");

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
                color: shape.stroke || "#000",
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
        <div className="bg-[#181818]/95 rounded-lg shadow-lg p-3 space-y-2 backdrop-blur-sm border border-gray-800/50">
          <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
            <svg
              className="w-4 h-4 mr-2"
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
                className="flex items-center justify-between space-x-2 p-1 rounded-md hover:bg-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: user.color,
                      boxShadow: isActive
                        ? `0 0 0 2px ${user.color}40`
                        : "none",
                    }}
                  />
                  <span className="text-sm text-gray-100">{user.name}</span>
                </div>
                {cursor && (
                  <span className="text-xs text-gray-400">{cursor.tool}</span>
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

  // --- TOOL/CURSOR TRANSITIONS POLISH ---
  useEffect(() => {
    // Remove debug logs, ensure instant cursor update
    if (stageRef.current) {
      const cursorMap = {
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
        eraser: "crosshair",
      };
      stageRef.current.container().style.cursor = cursorMap[tool] || "default";
    }
  }, [tool]);

  // --- CLEANUP: Remove debug logs ---
  // Remove all console.log calls throughout the file

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

  return (
    <div className="relative w-full h-full min-h-screen min-w-screen bg-[#18181c] text-gray-100 font-sans">
      {/* Markdown Notes Panel */}
      <MarkdownNotesPanel
        isOpen={isMarkdownPanelOpen}
        panelRef={markdownPanelRef}
        editingId={editingMarkdownId}
        editingValue={editingMarkdownValue}
        setEditingId={setEditingMarkdownId}
        setEditingValue={setEditingMarkdownValue}
        onSave={handleMarkdownSave}
        shapes={shapes}
        dispatch={dispatch}
      />

      {/* Floating button to open MarkdownEditor */}
      <button
        className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg"
        onClick={openMarkdownEditor}
        title="Open Markdown Editor"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* MarkdownEditor Modal in Portal */}
      {isMarkdownEditorOpen && (
        <Portal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xl relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                onClick={closeMarkdownEditor}
                title="Close"
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
              <MarkdownEditor
                value={markdownEditorValue}
                onChange={setMarkdownEditorValue}
                onSave={saveMarkdownContent}
                onCancel={closeMarkdownEditor}
              />
              <div className="mt-4">
                <h4 className="text-gray-700 font-semibold mb-2">Preview:</h4>
                <div className="prose max-w-none bg-gray-50 p-3 rounded border border-gray-200">
                  <ReactMarkdown>{markdownEditorValue}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Canvas Container - clean, open, no border/box, no overlays */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          isMarkdownPanelOpen ? "left-[300px]" : "left-0"
        } bg-[#18181c] pointer-events-auto overflow-hidden`}
        style={{ zIndex: 10 }}
      >
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          draggable={isPanning}
          className="bg-transparent pointer-events-auto"
        >
          {/* Grid Layer - Infinite grid */}
          <GridLayer
            isGridVisible={isGridVisible}
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
              tool={tool}
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
            zoom={zoom}
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

      {/* Sticky Notes Panel */}
      <StickyNotes />

      <div className="fixed top-4 left-4 z-50 flex items-center space-x-4">
        <CollaboratorPresence
          collaboratorPresence={collaboratorPresence}
          collaboratorCursors={collaboratorCursors}
        />
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center p-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-glossy hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all"
          aria-label="Home"
          title="Home"
          style={{ cursor: 'pointer' }}
        >
          <svg
            className="w-6 h-6 text-white/80"
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
  );
};

export default Canvas;

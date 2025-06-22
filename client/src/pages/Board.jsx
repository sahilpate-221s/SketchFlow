import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Stage, Layer } from 'react-konva';
import Canvas from '../components/Canvas';
import Toolbar from '../components/Toolbar';
import Export from '../components/Export';
import Import from '../components/Import';
import MarkdownEditor from '../components/MarkdownEditor';
// import ThemeToggle from '../components/ThemeToggle';
import { 
  setTool, 
  setGridVisible, 
  setZoom,
  updateMarkdownContent,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorPosition,
  loadCanvas,
} from '../store/canvasSlice';
import { useAuth } from '../context/AuthContext';
import { useDiagram } from '../hooks/useDiagram';
import { Share2, Users, Lock, Unlock, LogIn } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { store } from '../store';

const Board = ({ mode = 'edit' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();
  const stageRef = useRef(null);
  const lastGridUpdateRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('viewer');
  const [shareError, setShareError] = useState('');
  const [isCanvasSaving, setIsCanvasSaving] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const shareToken = searchParams.get('shareToken');

  const {
    diagram,
    loading: diagramLoading,
    error: diagramError,
    updateDiagram,
    shareDiagram,
  } = useDiagram(id, shareToken);

  const {
    tool,
    isGridVisible,
    zoom,
    markdownContent,
    isMarkdownEditorVisible,
    collaborators,
  } = useSelector((state) => state.canvas);

  // Get shapes and stickyNotes for auto-save
  const { shapes, stickyNotes } = useSelector((state) => state.canvas);

  const { socket, joinDiagram, leaveDiagram } = useSocket();

  // Check if user has edit access
  const hasEditAccess = useMemo(() => {
    if (mode === 'view') return false;
    if (!diagram) return false;
    
    // If diagram is public and user has share token, allow edit access
    if (diagram.isPublic && shareToken) return true;
    
    // If user is authenticated, check ownership and collaboration
    if (isAuthenticated && user) {
      const ownerId = diagram.owner ? diagram.owner.toString() : null;
      const userId = user._id ? user._id.toString() : null;
      if (ownerId && userId && ownerId === userId) return true;
      
      // Check if user is an editor collaborator
      return diagram.collaborators.some(c => 
        c.user && c.user.toString() === userId && c.role === 'editor'
      );
    }
    
    return false;
  }, [isAuthenticated, diagram, user, mode, shareToken]);

  // Check if user has view access
  const hasViewAccess = useMemo(() => {
    if (!diagram) return false;
    
    // If diagram is public, allow view access
    if (diagram.isPublic) return true;
    
    // If user is authenticated, check ownership and collaboration
    if (isAuthenticated && user) {
      const ownerId = diagram.owner ? diagram.owner.toString() : null;
      const userId = user._id ? user._id.toString() : null;
      if (ownerId && userId && ownerId === userId) return true;
      
      // Check if user is a collaborator (viewer or editor)
      return diagram.collaborators.some(c => 
        c.user && c.user.toString() === userId
      );
    }
    
    // If user has share token, allow view access
    if (shareToken) return true;
    
    return false;
  }, [isAuthenticated, diagram, user, shareToken]);

  // Handle diagram updates
  const handleDiagramUpdate = useCallback((updates) => {
    if (!hasEditAccess) return;
    updateDiagram(updates);
  }, [updateDiagram, hasEditAccess]);

  // Handle share dialog
  const handleShare = async () => {
    try {
      setIsSharing(true);
      setShowShareDialog(true);
    } catch (error) {
      console.error('Error sharing diagram:', error);
      setError('Failed to share diagram');
    } finally {
      setIsSharing(false);
    }
  };

  // Manual save function
  const handleManualSave = async () => {
    if (!diagram || !hasEditAccess || !isAuthenticated) return;

    try {
      setIsCanvasSaving(true);
      const currentState = store.getState().canvas;
      
      await updateDiagram({
        canvas: {
          shapes: currentState.shapes,
          stickyNotes: currentState.stickyNotes,
          markdown: {
            content: currentState.markdownContent,
            lastEdited: new Date(),
          },
        },
      });
      console.log('Canvas data manually saved to database');
    } catch (err) {
      console.error('Failed to manually save canvas data:', err);
      setError('Failed to save canvas data');
    } finally {
      setIsCanvasSaving(false);
    }
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    setShareError('');

    try {
      setIsSaving(true);
      await shareDiagram({
        email: shareEmail,
        role: shareRole,
      });
      setShareEmail('');
      setShareRole('viewer');
      setShowShareDialog(false);
    } catch (error) {
      console.error('Error sharing diagram:', error);
      setShareError(error.message || 'Failed to share diagram');
    } finally {
      setIsSaving(false);
    }
  };

  // Load diagram data and initialize canvas state
  useEffect(() => {
    if (diagram) {
      // Update canvas state with diagram data
      if (diagram.canvas) {
        // Load all canvas data from database
        dispatch(loadCanvas({
          shapes: diagram.canvas.shapes || [],
          stickyNotes: diagram.canvas.stickyNotes || [],
          markdownContent: diagram.canvas.markdown?.content || '',
        }));
      }
      // Ensure we have a default tool selected
      if (!tool) {
        dispatch(setTool('select'));
      }
      // Ensure we have a default zoom
      if (!zoom || zoom === 0) {
        dispatch(setZoom(1));
      }
      setIsLoading(false);
    }
  }, [diagram, dispatch]);

  // Socket connection and collaboration
  useEffect(() => {
    if (!socket || !id) return;

    joinDiagram(id, mode, shareToken);

    socket.on('diagram-update', (updates) => {
      dispatch(updateDiagram(updates));
    });

    socket.on('user-joined', (user) => {
      dispatch(addCollaborator(user));
    });

    socket.on('user-left', (userId) => {
      dispatch(removeCollaborator(userId));
    });

    socket.on('grid-update', ({ isVisible, timestamp }) => {
      // Only update if the incoming update is newer than our last update
      if (!lastGridUpdateRef.current || timestamp > lastGridUpdateRef.current) {
        dispatch(setGridVisible(isVisible));
        lastGridUpdateRef.current = timestamp;
      }
    });

    return () => {
      leaveDiagram(id);
      socket.off('diagram-update');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('grid-update');
    };
  }, [socket, id, mode, shareToken, dispatch, joinDiagram, leaveDiagram]);

  // Handle grid visibility changes
  const handleGridToggle = useCallback(() => {
    const newVisibility = !isGridVisible;
    const timestamp = Date.now();
    dispatch(setGridVisible(newVisibility));
    lastGridUpdateRef.current = timestamp;
    if (socket) {
      socket.emit('grid-update', { 
        diagramId: id, 
        isVisible: newVisibility,
        timestamp
      });
    }
  }, [socket, id, isGridVisible, dispatch]);

  // Auto-save canvas data when shapes or sticky notes change
  useEffect(() => {
    if (!diagram || !hasEditAccess || !isAuthenticated) return;

    const isOwner = diagram.owner && user && diagram.owner.toString && user._id && user._id.toString && diagram.owner.toString() === user._id.toString();
    const isEditor = Array.isArray(diagram.collaborators) && user && user._id && user._id.toString && diagram.collaborators.some(
      c => c.user && c.user.toString && c.user.toString() === user._id.toString() && c.role === 'editor'
    );

    if (!isOwner && !isEditor) return;

    const saveTimeout = setTimeout(async () => {
      try {
        setIsCanvasSaving(true);
        // Get current canvas state from Redux
        const currentState = store.getState().canvas;
        
        await updateDiagram({
          canvas: {
            shapes: currentState.shapes,
            stickyNotes: currentState.stickyNotes,
            markdown: {
              content: currentState.markdownContent,
              lastEdited: new Date(),
            },
          },
        });
        console.log('Canvas data auto-saved to database');
      } catch (err) {
        console.error('Failed to auto-save canvas data:', err);
      } finally {
        setIsCanvasSaving(false);
      }
    }, 2000); // Auto-save every 2 seconds after changes

    return () => clearTimeout(saveTimeout);
  }, [shapes, stickyNotes, markdownContent, diagram, hasEditAccess, isAuthenticated, user, updateDiagram]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Tool shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              dispatch({ type: 'canvas/redo' });
            } else {
              dispatch({ type: 'canvas/undo' });
            }
            break;
          case 'c':
            e.preventDefault();
            dispatch({ type: 'canvas/copyToClipboard' });
            break;
          case 'v':
            e.preventDefault();
            dispatch({ type: 'canvas/pasteFromClipboard' });
            break;
          case 's':
            e.preventDefault();
            handleManualSave();
            break;
          case 'e':
            e.preventDefault();
            // Export
            break;
          case 'g':
            e.preventDefault();
            dispatch(setGridVisible(!isGridVisible));
            break;
        }
      } else {
        // Tool selection shortcuts
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
          case 't':
            dispatch(setTool('text'));
            break;
          case 'n':
            dispatch(setTool('sticky'));
            break;
          case 'm':
            dispatch({ type: 'canvas/toggleMarkdownEditor' });
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, isGridVisible, handleManualSave]);

  // Determine if we should show toolbars - be more permissive to prevent black screen
  const shouldShowToolbars = hasEditAccess || (diagram && diagram.isPublic) || shareToken;

  // Add a small delay to ensure everything is properly loaded
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  
  useEffect(() => {
    if (!diagramLoading && !isLoading && diagram) {
      const timer = setTimeout(() => {
        setIsFullyLoaded(true);
      }, 100); // Small delay to ensure state is properly initialized
      
      return () => clearTimeout(timer);
    }
  }, [diagramLoading, isLoading, diagram]);

  // Debug logging
  useEffect(() => {
    console.log('Board state:', {
      diagramLoading,
      isLoading,
      diagram: !!diagram,
      hasEditAccess,
      hasViewAccess,
      shouldShowToolbars,
      isFullyLoaded,
      mode,
      shareToken
    });
  }, [diagramLoading, isLoading, diagram, hasEditAccess, hasViewAccess, shouldShowToolbars, isFullyLoaded, mode, shareToken]);

  if (diagramLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-matte-black">
        <div className="absolute top-4 right-4">
          {/* <ThemeToggle /> */}
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400" />
      </div>
    );
  }

  // Check access before rendering
  if (diagram && !hasViewAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-matte-black">
        <div className="absolute top-4 right-4">
          {/* <ThemeToggle /> */}
        </div>
        <div className="text-center">
          <div className="text-red-500 dark:text-red-400 text-lg mb-4">
            Access Denied
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have permission to view this diagram.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (diagramError || error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-matte-black">
        <div className="absolute top-4 right-4">
          {/* <ThemeToggle /> */}
        </div>
        <div className="text-red-500 dark:text-red-400 text-lg mb-4">
          {diagramError?.message || error?.message || 'Failed to load diagram'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Main Canvas */}
      <Canvas readOnly={!hasEditAccess} />

      {/* Toolbar - show if user has edit access or if it's a public diagram */}
      {(shouldShowToolbars || isFullyLoaded) && (
        <Toolbar
          onExport={() => dispatch({ type: 'canvas/exportCanvas' })}
          onImport={(e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const data = JSON.parse(event.target.result);
                  dispatch({ type: 'canvas/importCanvas', payload: data });
                } catch (error) {
                  console.error('Error importing canvas:', error);
                }
              };
              reader.readAsText(file);
            }
          }}
          onShare={handleShare}
          collaborators={collaborators}
          onGridToggle={handleGridToggle}
          isGridVisible={isGridVisible}
        />
      )}

      {/* Share Dialog - only show if user has edit access */}
      {hasEditAccess && showShareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Share Canvas</h2>
            <form onSubmit={handleShareSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              {shareError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {shareError}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowShareDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg z-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-400 hover:text-red-500 dark:hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Board;
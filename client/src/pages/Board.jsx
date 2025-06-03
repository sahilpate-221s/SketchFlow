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
} from '../store/canvasSlice';
import { useAuth } from '../context/AuthContext';
import { useDiagram } from '../hooks/useDiagram';
import { Share2, Users, Lock, Unlock, LogIn } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const Board = () => {
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

  const {
    diagram,
    loading: diagramLoading,
    error: diagramError,
    updateDiagram,
    shareDiagram,
  } = useDiagram(id);

  const {
    tool,
    isGridVisible,
    zoom,
    markdownContent,
    isMarkdownEditorVisible,
    collaborators,
  } = useSelector((state) => state.canvas);

  const { socket, joinDiagram, leaveDiagram } = useSocket();

  // Check if user has edit access
  const hasEditAccess = useMemo(() => {
    if (!isAuthenticated || !diagram) return false;
    const ownerId = diagram.owner ? diagram.owner.toString() : null;
    const userId = user?._id ? user._id.toString() : null;
    if (!ownerId || !userId) return false;
    return ownerId === userId || diagram.collaborators.some(c => c.user && c.user.toString() === userId && c.role === 'editor');
  }, [isAuthenticated, diagram, user]);

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

  // Load diagram data
  useEffect(() => {
    if (diagram) {
      // Update canvas state with diagram data
      if (diagram.canvas) {
        // Update shapes, sticky notes, etc.
        // This will be implemented in the canvas slice
      }
      if (diagram.canvas?.markdown?.content) {
        dispatch(updateMarkdownContent(diagram.canvas.markdown.content));
      }
      setIsLoading(false);
    }
  }, [diagram, dispatch]);

  // Socket connection and collaboration
  useEffect(() => {
    if (!socket || !id) return;

    joinDiagram(id);

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
  }, [socket, id, dispatch, joinDiagram, leaveDiagram]);

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

  // Save diagram changes (only for authenticated users with edit access)
  useEffect(() => {
    if (!diagram || isLoading || !isAuthenticated) return;

    const isOwner = diagram.owner.toString() === user._id.toString();
    const isEditor = diagram.collaborators.some(
      c => c.user.toString() === user._id.toString() && c.role === 'editor'
    );

    if (!isOwner && !isEditor) return;

    const saveTimeout = setTimeout(async () => {
      try {
        await updateDiagram({
          canvas: {
            shapes: diagram.canvas.shapes,
            stickyNotes: diagram.canvas.stickyNotes,
            markdown: {
              content: markdownContent,
              lastEdited: new Date(),
            },
          },
        });
      } catch (err) {
        console.error('Failed to save diagram:', err);
      }
    }, 1000); // Debounce save for 1 second

    return () => clearTimeout(saveTimeout);
  }, [diagram, isLoading, isAuthenticated, user, markdownContent, updateDiagram]);

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
  }, [dispatch, isGridVisible]);

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
      <Canvas stageRef={stageRef} />

      {/* Toolbar */}
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

      {/* Share Dialog */}
      {showShareDialog && (
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
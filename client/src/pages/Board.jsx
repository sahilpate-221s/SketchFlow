import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Stage, Layer } from 'react-konva';
import { socket } from '../socket';
import Canvas from '../components/Canvas';
import Toolbar from '../components/Toolbar';
import Export from '../components/Export';
import Import from '../components/Import';
import MarkdownEditor from '../components/MarkdownEditor';
import ThemeToggle from '../components/ThemeToggle';
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
import { Share2, Users, Lock, Unlock } from 'lucide-react';

const Board = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const stageRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

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
    if (!user || !diagram) return;

    // Join the diagram room
    socket.emit('joinDiagram', { diagramId: id, user });

    // Handle collaborator events
    socket.on('collaboratorJoined', (collaborator) => {
      dispatch(addCollaborator(collaborator));
    });

    socket.on('collaboratorLeft', (userId) => {
      dispatch(removeCollaborator(userId));
    });

    socket.on('collaboratorMoved', ({ userId, position }) => {
      dispatch(updateCollaboratorPosition({ id: userId, position }));
    });

    // Cleanup
    return () => {
      socket.emit('leaveDiagram', { diagramId: id, userId: user._id });
      socket.off('collaboratorJoined');
      socket.off('collaboratorLeft');
      socket.off('collaboratorMoved');
    };
  }, [id, user, diagram, dispatch]);

  // Save diagram changes
  useEffect(() => {
    if (!diagram || isLoading) return;

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
  }, [diagram, markdownContent, isLoading, updateDiagram]);

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
          <ThemeToggle />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400" />
      </div>
    );
  }

  if (diagramError || error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-matte-black">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
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
    <div className="relative min-h-screen bg-gray-50 dark:bg-matte-black">
      {/* Main Toolbar */}
      <Toolbar />

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Canvas */}
      <div className="absolute inset-0 pt-16">
        <Stage
          ref={stageRef}
          width={window.innerWidth}
          height={window.innerHeight - 64}
          scaleX={zoom}
          scaleY={zoom}
        >
          <Layer>
            <Canvas />
          </Layer>
        </Stage>
      </div>

      {/* Right Sidebar */}
      <div className={`fixed right-0 top-16 bottom-0 w-80 bg-white dark:bg-dark-surface shadow-lg dark:shadow-black/30 transform transition-transform duration-300 ${
        isMarkdownEditorVisible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b dark:border-dark-border">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text">Markdown Notes</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <MarkdownEditor />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3">
        {/* Export/Import */}
        <div className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-lg rounded-xl shadow-lg border border-gray-100/50 dark:border-dark-border/50 p-2 flex items-center space-x-2">
          <Export stageRef={stageRef} />
          <div className="h-6 w-px bg-gray-200 dark:bg-dark-border" />
          <Import />
        </div>

        {/* Collaboration Controls */}
        <div className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-lg rounded-xl shadow-lg border border-gray-100/50 dark:border-dark-border/50 p-2 flex items-center space-x-2">
          <button
            onClick={() => setShowCollaborators(!showCollaborators)}
            className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-400 transition-all duration-200 hover:scale-105"
            title="Collaborators"
          >
            <Users size={20} />
            {collaborators.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 dark:bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {collaborators.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsSharing(!isSharing)}
            className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-400 transition-all duration-200 hover:scale-105"
            title={diagram?.isPublic ? 'Make Private' : 'Share'}
          >
            {diagram?.isPublic ? <Unlock size={20} /> : <Lock size={20} />}
          </button>
        </div>
      </div>

      {/* Collaborators Popover */}
      {showCollaborators && (
        <div className="absolute bottom-20 right-6 w-64 bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-gray-100 dark:border-dark-border p-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-dark-text mb-2">Collaborators</h3>
          <div className="space-y-2">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: collaborator.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{collaborator.name}</span>
                {collaborator.role === 'editor' && (
                  <span className="text-xs text-blue-500 dark:text-blue-400">(Editor)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {isSharing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">
              Share Diagram
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={diagram?.isPublic}
                  onChange={async (e) => {
                    try {
                      const { shareableLink } = await shareDiagram(e.target.checked);
                      if (shareableLink) {
                        navigator.clipboard.writeText(
                          `${window.location.origin}${shareableLink}`
                        );
                      }
                    } catch (err) {
                      console.error('Failed to update sharing settings:', err);
                    }
                  }}
                  className="rounded text-blue-500 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-600 dark:text-gray-400">
                  Make diagram public
                </label>
              </div>
              {diagram?.isPublic && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Shareable link:</p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/board/${id}`}
                      className="flex-1 text-sm bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 dark:text-dark-text"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/board/${id}`
                        );
                      }}
                      className="px-3 py-2 bg-blue-500 dark:bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSharing(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Board; 
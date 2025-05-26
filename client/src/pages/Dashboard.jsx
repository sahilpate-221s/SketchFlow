import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Search, Grid, List, Clock, Users, Lock, Unlock } from 'lucide-react';
import { leaveDiagram } from '../socket';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [editingDiagram, setEditingDiagram] = useState(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    fetchDiagrams();
  }, []);

  const fetchDiagrams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/diagrams`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch diagrams');
      }

      const data = await response.json();
      setDiagrams(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      setError('Failed to logout. Please try again.');
    }
  };

  const createNewDiagram = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/diagrams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Untitled Diagram',
          content: { shapes: [] }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create diagram');
      }

      const newDiagram = await response.json();
      setDiagrams([...diagrams, newDiagram]);
      navigate(`/board/${newDiagram._id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteDiagram = async (diagramId) => {
    if (!window.confirm('Are you sure you want to delete this diagram?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // First, try to leave the diagram room if we're in it
      try {
        leaveDiagram(diagramId, user?.id);
      } catch (socketErr) {
        console.warn('Socket cleanup failed:', socketErr);
        // Continue with deletion even if socket cleanup fails
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/diagrams/${diagramId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete diagram: ${response.status} ${response.statusText}`);
      }

      // Only update the UI if the deletion was successful
      setDiagrams(diagrams.filter(d => d._id !== diagramId));
    } catch (err) {
      console.error('Delete diagram error:', err);
      setError(err.message || 'Failed to delete diagram. Please try again.');
    }
  };

  const updateDiagramTitle = async (diagramId, newTitle) => {
    if (!newTitle.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/diagrams/${diagramId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });

      if (!response.ok) {
        throw new Error('Failed to update diagram title');
      }

      setDiagrams(diagrams.map(d => 
        d._id === diagramId ? { ...d, title: newTitle } : d
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTitleEdit = (diagram) => {
    setEditingDiagram(diagram._id);
    // Focus the input after it's rendered
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 0);
  };

  const handleTitleSubmit = (e, diagramId) => {
    e.preventDefault();
    const newTitle = e.target.value.trim();
    if (newTitle) {
      updateDiagramTitle(diagramId, newTitle);
    }
    setEditingDiagram(null);
  };

  const filteredDiagrams = diagrams.filter(diagram =>
    diagram.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-bg p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-dark-surface rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-50 dark:bg-dark-surface rounded-lg shadow p-6">
                  <div className="h-4 bg-slate-200 dark:bg-dark-border rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-dark-border rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Navigation */}
      <nav className="bg-white dark:bg-dark-surface shadow-sm border-b border-slate-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl font-handwriting bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                SketchFlow
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-600 dark:text-dark-text-secondary">
                Welcome, {user?.email || 'Guest'}
              </span>
              <button
                onClick={handleLogout}
                className="text-slate-600 dark:text-dark-text-secondary hover:text-emerald-600 dark:hover:text-dark-accent px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-handwriting text-slate-900 dark:text-dark-text">My Diagrams</h1>
          <button
            onClick={createNewDiagram}
            className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-4 py-2 rounded-lg hover:from-emerald-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-dark-bg transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Diagram</span>
          </button>
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search diagrams..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-dark-surface text-slate-900 dark:text-dark-text placeholder-slate-400 dark:placeholder-dark-text-secondary"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-dark-text-secondary h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center space-x-1 bg-white dark:bg-dark-surface rounded-lg border border-slate-200 dark:border-dark-border p-1 ml-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-emerald-50 dark:bg-dark-accent/20 text-emerald-600 dark:text-dark-accent'
                  : 'text-slate-600 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-border'
              }`}
              title="Grid View"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-emerald-50 dark:bg-dark-accent/20 text-emerald-600 dark:text-dark-accent'
                  : 'text-slate-600 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-border'
              }`}
              title="List View"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 mb-6 border border-red-100 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {filteredDiagrams.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 dark:text-dark-text mb-2">No diagrams yet</h3>
            <p className="text-slate-500 dark:text-dark-text-secondary mb-4">Create your first diagram to get started!</p>
            <button
              onClick={createNewDiagram}
              className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-4 py-2 rounded-lg hover:from-emerald-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-dark-bg transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              Create New Diagram
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDiagrams.map((diagram) => (
              <div
                key={diagram._id}
                className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-dark-border hover:shadow-md transition-all duration-200 group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    {editingDiagram === diagram._id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        defaultValue={diagram.title}
                        onBlur={(e) => handleTitleSubmit(e, diagram._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleTitleSubmit(e, diagram._id);
                          } else if (e.key === 'Escape') {
                            setEditingDiagram(null);
                          }
                        }}
                        className="flex-1 px-2 py-1 border border-emerald-500 dark:border-dark-accent rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-dark-accent bg-white dark:bg-dark-surface text-slate-900 dark:text-dark-text"
                      />
                    ) : (
                      <h3 
                        className="text-lg font-medium text-slate-900 dark:text-dark-text group-hover:text-emerald-600 dark:group-hover:text-dark-accent cursor-pointer truncate flex-1"
                        onDoubleClick={() => handleTitleEdit(diagram)}
                      >
                        {diagram.title}
                      </h3>
                    )}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleTitleEdit(diagram)}
                        className="p-1 text-slate-400 dark:text-dark-text-secondary hover:text-emerald-600 dark:hover:text-dark-accent transition-colors"
                        title="Edit title"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteDiagram(diagram._id)}
                        className="p-1 text-slate-400 dark:text-dark-text-secondary hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete diagram"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500 dark:text-dark-text-secondary">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(diagram.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>{diagram.collaborators?.length || 0}</span>
                    </div>
                  </div>
                  <Link
                    to={`/board/${diagram._id}`}
                    className="mt-4 block w-full text-center px-4 py-2 bg-slate-50 dark:bg-dark-border text-slate-700 dark:text-dark-text rounded-lg hover:bg-emerald-50 dark:hover:bg-dark-accent/20 hover:text-emerald-600 dark:hover:text-dark-accent transition-colors"
                  >
                    Open Diagram
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-dark-border">
              <thead className="bg-slate-50 dark:bg-dark-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-dark-text-secondary uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-dark-text-secondary uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-dark-text-secondary uppercase tracking-wider">
                    Collaborators
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-dark-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-surface divide-y divide-slate-200 dark:divide-dark-border">
                {filteredDiagrams.map((diagram) => (
                  <tr key={diagram._id} className="hover:bg-slate-50 dark:hover:bg-dark-border">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingDiagram === diagram._id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          defaultValue={diagram.title}
                          onBlur={(e) => handleTitleSubmit(e, diagram._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleTitleSubmit(e, diagram._id);
                            } else if (e.key === 'Escape') {
                              setEditingDiagram(null);
                            }
                          }}
                          className="px-2 py-1 border border-emerald-500 dark:border-dark-accent rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-dark-accent bg-white dark:bg-dark-surface text-slate-900 dark:text-dark-text"
                        />
                      ) : (
                        <div className="flex items-center space-x-3">
                          <span
                            className="text-sm font-medium text-slate-900 dark:text-dark-text cursor-pointer hover:text-emerald-600 dark:hover:text-dark-accent"
                            onDoubleClick={() => handleTitleEdit(diagram)}
                          >
                            {diagram.title}
                          </span>
                          <button
                            onClick={() => handleTitleEdit(diagram)}
                            className="p-1 text-slate-400 dark:text-dark-text-secondary hover:text-emerald-600 dark:hover:text-dark-accent transition-colors"
                            title="Edit title"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-dark-text-secondary">
                      {new Date(diagram.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-slate-400 dark:text-dark-text-secondary" />
                        <span className="text-sm text-slate-500 dark:text-dark-text-secondary">
                          {diagram.collaborators?.length || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/board/${diagram._id}`}
                          className="text-emerald-600 dark:text-dark-accent hover:text-emerald-700 dark:hover:text-dark-accent-hover"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => deleteDiagram(diagram._id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

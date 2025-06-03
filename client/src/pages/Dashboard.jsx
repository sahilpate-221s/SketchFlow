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

  // Compute total diagrams and last updated diagram
  const totalDiagrams = diagrams.length;
  const lastUpdatedDiagram = diagrams.reduce((latest, diagram) => {
    return new Date(diagram.updatedAt) > new Date(latest.updatedAt) ? diagram : latest;
  }, diagrams[0] || null);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>

        <div className="mb-4 flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search diagrams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full max-w-md"
          />
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-300' : ''}`}
            aria-label="Grid view"
          >
            <Grid />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-300' : ''}`}
            aria-label="List view"
          >
            <List />
          </button>
          <button
            onClick={createNewDiagram}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded flex items-center space-x-2"
          >
            <Plus />
            <span>New Diagram</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 text-red-600 font-semibold">
            {error}
          </div>
        )}

        {filteredDiagrams.length === 0 ? (
          <p className="text-gray-700 dark:text-gray-300">No diagrams found.</p>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDiagrams.map((diagram) => (
              <div key={diagram._id} className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 relative">
                {editingDiagram === diagram._id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    defaultValue={diagram.title}
                    onBlur={(e) => handleTitleSubmit(e, diagram._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTitleSubmit(e, diagram._id);
                      }
                    }}
                    className="border border-gray-300 rounded px-2 py-1 w-full"
                    autoFocus
                  />
                ) : (
                  <h2
                    className="text-xl font-semibold cursor-pointer"
                    onClick={() => handleTitleEdit(diagram)}
                  >
                    {diagram.title}
                  </h2>
                )}
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Last updated: {new Date(diagram.updatedAt).toLocaleString()}
                </p>
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button
                    onClick={() => navigate(`/board/${diagram._id}`)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Edit diagram"
                  >
                    <Edit2 />
                  </button>
                  <button
                    onClick={() => deleteDiagram(diagram._id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Delete diagram"
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredDiagrams.map((diagram) => (
              <li key={diagram._id} className="bg-white dark:bg-dark-surface rounded-lg shadow p-4 flex justify-between items-center">
                {editingDiagram === diagram._id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    defaultValue={diagram.title}
                    onBlur={(e) => handleTitleSubmit(e, diagram._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTitleSubmit(e, diagram._id);
                      }
                    }}
                    className="border border-gray-300 rounded px-2 py-1 w-full"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-lg font-semibold cursor-pointer"
                    onClick={() => handleTitleEdit(diagram)}
                  >
                    {diagram.title}
                  </span>
                )}
                <div className="flex space-x-4">
                  <button
                    onClick={() => navigate(`/board/${diagram._id}`)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Edit diagram"
                  >
                    <Edit2 />
                  </button>
                  <button
                    onClick={() => deleteDiagram(diagram._id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Delete diagram"
                  >
                    <Trash2 />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 text-gray-700 dark:text-gray-300">
          <p>Total diagrams: {totalDiagrams}</p>
          {lastUpdatedDiagram && (
            <p>Last updated diagram: {lastUpdatedDiagram.title} ({new Date(lastUpdatedDiagram.updatedAt).toLocaleString()})</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

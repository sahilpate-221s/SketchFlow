import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Grid, List, LogOut } from 'lucide-react';
import { leaveDiagram } from '../socket';

const sortOptions = [
  { label: 'Last Updated', value: 'updatedAt' },
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Name (Z-A)', value: 'nameDesc' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [editingDiagram, setEditingDiagram] = useState(null);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [showConfetti, setShowConfetti] = useState(false);
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
      if (!response.ok) throw new Error('Failed to fetch diagrams');
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
      if (!response.ok) throw new Error('Failed to create diagram');
      const newDiagram = await response.json();
      setDiagrams([...diagrams, newDiagram]);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1800);
      navigate(`/board/${newDiagram._id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteDiagram = async (diagramId) => {
    if (!window.confirm('Are you sure you want to delete this diagram?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      try { leaveDiagram(diagramId, user?.id); } catch {}
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
      setDiagrams(diagrams.filter(d => d._id !== diagramId));
    } catch (err) {
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
      if (!response.ok) throw new Error('Failed to update diagram title');
      setDiagrams(diagrams.map(d => d._id === diagramId ? { ...d, title: newTitle } : d));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTitleEdit = (diagram) => {
    setEditingDiagram(diagram._id);
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

  const sortedDiagrams = [...filteredDiagrams].sort((a, b) => {
    if (sortBy === 'updatedAt') {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    } else if (sortBy === 'name') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'nameDesc') {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  const totalDiagrams = diagrams.length;
  const lastUpdatedDiagram = diagrams.reduce((latest, diagram) => {
    return new Date(diagram.updatedAt) > new Date(latest.updatedAt) ? diagram : latest;
  }, diagrams[0] || null);

  // Keyboard shortcut for new diagram (N)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'n' && !editingDiagram) {
        createNewDiagram();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingDiagram, diagrams]);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#18181c] via-[#23232b] to-[#101014] text-gray-100 font-sans">
      {/* Progress Bar */}
      {loading && (
        <div className="fixed top-0 left-0 w-full h-1 z-50">
          <div className="h-full bg-gradient-to-r from-white/80 to-white/30 animate-progress-bar" style={{width: '100%'}}></div>
        </div>
      )}
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center">
          <div className="w-full h-32 animate-confetti"></div>
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-[#23232b]/90 to-[#18181c]/80 border-r border-[#23232b]/60 flex flex-col justify-between py-8 px-6 shadow-2xl rounded-r-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center mb-10">
            <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-gloss">SketchFlow</span>
          </div>
          <div className="mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#23232b] to-[#353545] flex items-center justify-center text-xl font-bold text-white border-2 border-white/20 shadow-glossy">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-semibold text-white/90">{user?.username || 'User'}</div>
                <div className="text-xs text-gray-400">{user?.email || ''}</div>
              </div>
            </div>
          </div>
          <div className="border-b border-white/10 mb-4"></div>
          <div className="mb-2 text-xs uppercase tracking-widest text-white/40 font-semibold pl-1">Quick Actions</div>
          <nav className="space-y-2">
            <button
              onClick={createNewDiagram}
              className="w-full flex items-center space-x-2 bg-gradient-to-r from-white/10 to-white/5 text-white font-bold py-2 px-4 rounded-lg shadow-glossy hover:shadow-xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all group relative overflow-hidden backdrop-blur-md"
              style={{ cursor: 'pointer' }}
            >
              <span className="absolute inset-0 group-hover:animate-pulse-glow pointer-events-none" />
              <Plus size={20} />
              <span>New Diagram</span>
            </button>
          </nav>
        </div>
        <div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 text-red-400 hover:text-red-600 py-2 px-4 rounded-lg transition-colors bg-white/5 hover:bg-white/10 backdrop-blur-md"
            style={{ cursor: 'pointer' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto min-h-screen bg-gradient-to-br from-[#18181c]/90 to-[#101014]/90 relative">
        {/* Glassy highlight overlay */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-3/4 h-32 bg-white/10 rounded-b-full blur-2xl opacity-40" />
          <div className="absolute right-0 bottom-0 w-1/3 h-24 bg-white/5 rounded-tl-3xl blur-2xl opacity-30" />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{backgroundImage: 'radial-gradient(circle at 20% 20%, #fff2 1px, transparent 1px), radial-gradient(circle at 80% 80%, #fff1 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
        <div className="relative z-10 bg-gradient-to-br from-[#23232b]/90 to-[#18181c]/80 border border-white/10 rounded-2xl shadow-2xl p-8 mb-8 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight drop-shadow-gloss">Your Diagrams</h1>
              <p className="text-white/70 text-base">Welcome back!! Create, manage, and edit your diagrams in a beautiful dark workspace.</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-2-2"/></svg>
                </span>
                <input
                  type="text"
                  placeholder="Search diagrams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#181A1B] border border-[#2D2D2D] text-gray-100 rounded-lg px-9 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-[#334155] transition placeholder-gray-500 shadow-sm"
                />
              </div>
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-[#181A1B] border border-[#2D2D2D] text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#334155] text-sm"
                title="Sort diagrams"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-[#2D2D2D] text-white shadow' : 'bg-[#181A1B] text-gray-400'} transition`}
                aria-label="Grid view"
              >
                <Grid />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-[#2D2D2D] text-white shadow' : 'bg-[#181A1B] text-gray-400'} transition`}
                aria-label="List view"
              >
                <List />
              </button>
            </div>
          </div>
        </div>
        {error && (
          <div className="mb-4 text-red-400 font-semibold bg-[#181b20] p-3 rounded border border-[#23262F] relative z-10">
            {error}
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 relative z-10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gradient-to-br from-[#23232b]/90 to-[#18181c]/80 rounded-2xl shadow-2xl p-8 animate-pulse border border-white/10">
                <div className="h-6 bg-white/10 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : sortedDiagrams.length === 0 ? (
          <div className="text-center text-white/60 mt-20 text-lg flex flex-col items-center gap-2 relative z-10">
            <svg width="48" height="48" fill="none" stroke="#fff5" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6v6H9z"/></svg>
            <span>No diagrams found.</span>
            <span className="text-xs text-white/40">Try creating a new diagram to get started!</span>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {sortedDiagrams.map((diagram) => (
              <div
                key={diagram._id}
                className={`bg-gradient-to-br from-[#23232b]/90 to-[#18181c]/80 rounded-2xl shadow-2xl p-6 relative group border border-white/10 ring-0 hover:ring-2 hover:ring-white/30 hover:shadow-2xl hover:-translate-y-1.5 active:scale-95 transition-all backdrop-blur-md overflow-hidden ${diagram._id === lastUpdatedDiagram?._id ? 'border-white/30' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/board/${diagram._id}`)}
              >
                {/* Glass reflection on card */}
                <div className="absolute left-0 top-0 w-full h-1/3 bg-white/10 rounded-t-2xl blur-md opacity-30 pointer-events-none" />
                {editingDiagram === diagram._id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    defaultValue={diagram.title}
                    onBlur={(e) => handleTitleSubmit(e, diagram._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSubmit(e, diagram._id);
                    }}
                    className="bg-[#101216] border border-[#23262F] text-gray-100 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-[#334155]"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-xl font-bold cursor-pointer text-gray-100 group-hover:text-[#7f5fff] truncate drop-shadow"
                      onClick={e => { e.stopPropagation(); handleTitleEdit(diagram); }}
                    >
                      {diagram.title}
                    </h2>
                    {diagram._id === lastUpdatedDiagram?._id && (
                      <span className="ml-1 px-2 py-0.5 text-xs rounded bg-[#334155] text-white font-semibold animate-bounce-slow shadow-lg">Recent</span>
                    )}
                  </div>
                )}
                <p className="text-gray-400 mt-2 text-xs">Last updated: {new Date(diagram.updatedAt).toLocaleString()}</p>
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/board/${diagram._id}`); }}
                    className="text-white/60 hover:text-white"
                    aria-label="Edit diagram"
                    style={{ cursor: 'pointer' }}
                  >
                    <Edit2 />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteDiagram(diagram._id); }}
                    className="text-red-400 hover:text-red-600"
                    aria-label="Delete diagram"
                    style={{ cursor: 'pointer' }}
                  >
                    <Trash2 />
                  </button>
                </div>
                {/* Open Canvas Button */}
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/board/${diagram._id}`); }}
                  className="mt-4 w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold py-2 rounded-lg shadow-glossy transition-all flex items-center justify-center gap-2 group/open backdrop-blur-md"
                  aria-label="Open diagram canvas"
                  style={{ cursor: 'pointer' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <span>Open Canvas</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-4 relative z-10">
            {sortedDiagrams.map((diagram) => (
              <li
                key={diagram._id}
                className={`bg-gradient-to-br from-[#23232b]/90 to-[#18181c]/80 rounded-2xl shadow-2xl p-4 flex justify-between items-center group border border-white/10 hover:border-white/30 transition hover:shadow-2xl hover:-translate-y-1.5 active:scale-95 backdrop-blur-md overflow-hidden ${diagram._id === lastUpdatedDiagram?._id ? 'border-white/30' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/board/${diagram._id}`)}
              >
                {/* Glass reflection on card */}
                <div className="absolute left-0 top-0 w-full h-1/3 bg-white/10 rounded-t-2xl blur-md opacity-30 pointer-events-none" />
                {editingDiagram === diagram._id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    defaultValue={diagram.title}
                    onBlur={(e) => handleTitleSubmit(e, diagram._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSubmit(e, diagram._id);
                    }}
                    className="bg-[#101216] border border-[#23262F] text-gray-100 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-[#334155]"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="text-lg font-bold cursor-pointer text-gray-100 group-hover:text-[#7f5fff] truncate drop-shadow"
                      onClick={e => { e.stopPropagation(); handleTitleEdit(diagram); }}
                    >
                      {diagram.title}
                    </span>
                    {diagram._id === lastUpdatedDiagram?._id && (
                      <span className="ml-1 px-2 py-0.5 text-xs rounded bg-[#334155] text-white font-semibold animate-bounce-slow shadow-lg">Recent</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/board/${diagram._id}`); }}
                    className="bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold px-3 py-1 rounded-lg shadow-glossy transition-all flex items-center gap-1 text-sm backdrop-blur-md"
                    aria-label="Open diagram canvas"
                    style={{ cursor: 'pointer' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    Open
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/board/${diagram._id}`); }}
                    className="text-white/60 hover:text-white"
                    aria-label="Edit diagram"
                    style={{ cursor: 'pointer' }}
                  >
                    <Edit2 />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteDiagram(diagram._id); }}
                    className="text-red-400 hover:text-red-600"
                    aria-label="Delete diagram"
                    style={{ cursor: 'pointer' }}
                  >
                    <Trash2 />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div className="text-gray-400 text-sm">Total diagrams: <span className="text-gray-200 font-bold">{totalDiagrams}</span></div>
          {lastUpdatedDiagram && (
            <div className="text-gray-400 text-sm">Last updated: <span className="text-gray-200 font-bold">{lastUpdatedDiagram.title}</span> ({new Date(lastUpdatedDiagram.updatedAt).toLocaleString()})</div>
          )}
        </div>
        {/* Floating New Diagram Button */}
        <button
          onClick={createNewDiagram}
          className="fixed bottom-8 right-8 z-40 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white rounded-full shadow-glossy p-4 flex items-center justify-center transition-all group backdrop-blur-md border border-white/10 ring-1 ring-white/10 hover:ring-white/30"
          title="Create New Diagram (N)"
          style={{ cursor: 'pointer', boxShadow: '0 8px 32px 0 rgba(255,255,255,0.10), 0 1.5px 4px 0 rgba(255,255,255,0.12)' }}
        >
          <Plus size={28} />
          <span className="sr-only">Create New Diagram</span>
        </button>
      </main>
    </div>
  );
};

// Tailwind custom animations (add to your tailwind.config.js):
// animate-progress-bar: {
//   '0%': { width: '0%' },
//   '100%': { width: '100%' },
// }
// animate-confetti: { ... } // Use a confetti library or simple CSS for effect
// animate-bounce-slow: {
//   '0%, 100%': { transform: 'translateY(0)' },
//   '50%': { transform: 'translateY(-8px)' },
// }

export default Dashboard;
/*
Add to your tailwind.config.js for custom shadows:
  boxShadow: {
    'glossy': '0 4px 32px 0 rgba(255,255,255,0.08), 0 1.5px 4px 0 rgba(255,255,255,0.10)'
  },
  dropShadow: {
    'gloss': '0 2px 8px rgba(255,255,255,0.10)'
  },
*/

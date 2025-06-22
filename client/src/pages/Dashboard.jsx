import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Grid, List, LogOut, Unlock, Lock, MoreVertical, Menu } from 'lucide-react';
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
  const [publicStatus, setPublicStatus] = useState({});
  const [menuOpen, setMenuOpen] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      // Set public status for each diagram
      const status = {};
      data.forEach(d => { status[d._id] = d.isPublic; });
      setPublicStatus(status);
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

  const makeDiagramPublic = async (diagramId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/diagrams/${diagramId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPublic: true })
      });
      if (!response.ok) throw new Error('Failed to make diagram public');
      setPublicStatus(prev => ({ ...prev, [diagramId]: true }));
    } catch (err) {
      setError(err.message || 'Failed to make diagram public.');
    }
  };

  const toggleMenu = (diagramId) => {
    setMenuOpen((prev) => ({ ...prev, [diagramId]: !prev[diagramId] }));
  };

  const closeMenu = (diagramId) => {
    setMenuOpen((prev) => ({ ...prev, [diagramId]: false }));
  };

  const makeDiagramPrivate = async (diagramId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/diagrams/${diagramId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPublic: false })
      });
      if (!response.ok) throw new Error('Failed to make diagram private');
      setPublicStatus(prev => ({ ...prev, [diagramId]: false }));
    } catch (err) {
      setError(err.message || 'Failed to make diagram private.');
    }
  };

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dashboard-menu-btn') && !event.target.closest('.dashboard-menu-dropdown')) {
        setMenuOpen({});
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-black via-neutral-900 to-black text-neutral-100 font-sans relative">
      {/* Sidebar Toggle Button (mobile only) */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-neutral-900/90 border border-neutral-700 rounded-full p-2 shadow-lg focus:outline-none"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
        style={{ zIndex: 60 }}
      >
        <Menu size={28} />
      </button>
      {/* Progress Bar */}
      {loading && (
        <div className="fixed top-0 left-0 w-full h-1 z-50">
          <div className="h-full bg-gradient-to-r from-neutral-200/80 to-neutral-200/30 animate-progress-bar" style={{width: '100%'}}></div>
        </div>
      )}
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center">
          <div className="w-full h-32 animate-confetti"></div>
        </div>
      )}
      {/* Sidebar */}
      <aside className={`fixed md:static top-0 left-0 h-full w-64 bg-gradient-to-b from-neutral-900/90 to-black/80 border-r border-neutral-800/60 flex flex-col justify-between py-8 px-6 shadow-2xl rounded-r-2xl backdrop-blur-md z-50 transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ zIndex: 55 }}
      >
        {/* Close button (mobile only) */}
        <button
          className="md:hidden absolute top-4 right-4 bg-neutral-900/90 border border-neutral-700 rounded-full p-2 shadow-lg focus:outline-none"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div>
          <div className="flex items-center mb-10">
            <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-gloss">SketchFlow</span>
          </div>
          <div className="mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-neutral-900 to-neutral-700 flex items-center justify-center text-xl font-bold text-white border-2 border-white/20 shadow-glossy">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-semibold text-white/90">{user?.username || 'User'}</div>
                <div className="text-xs text-neutral-400">{user?.email || ''}</div>
              </div>
            </div>
          </div>
          <div className="border-b border-white/10 mb-4"></div>
          <div className="mb-2 text-xs uppercase tracking-widest text-white/40 font-semibold pl-1">Quick Actions</div>
          <nav className="space-y-2">
            <button
              onClick={createNewDiagram}
              className="w-full flex items-center space-x-2 bg-gradient-to-r from-neutral-800/80 to-black/60 text-white font-bold py-2 px-4 rounded-lg shadow-glossy hover:shadow-xl hover:bg-neutral-800/80 focus:outline-none focus:ring-2 focus:ring-neutral-700/30 transition-all group relative overflow-hidden backdrop-blur-md border border-white/20"
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
            className="w-full flex items-center space-x-2 text-neutral-400 hover:text-neutral-200 py-2 px-4 rounded-lg transition-colors bg-neutral-800/60 hover:bg-neutral-700/80 backdrop-blur-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{ cursor: 'pointer' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      {/* Sidebar Backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar backdrop"
        />
      )}
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto min-h-screen bg-gradient-to-br from-black/90 to-neutral-900/90 relative">
        {/* Glassy highlight overlay */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-3/4 h-32 bg-white/10 rounded-b-full blur-2xl opacity-30" />
          <div className="absolute right-0 bottom-0 w-1/3 h-24 bg-white/5 rounded-tl-3xl blur-2xl opacity-20" />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 20%, #fff2 1px, transparent 1px), radial-gradient(circle at 80% 80%, #fff1 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
        <div className="relative z-10 bg-gradient-to-br from-neutral-900/90 to-black/80 border border-white/10 rounded-2xl shadow-2xl p-8 mb-8 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight drop-shadow-gloss">Your Diagrams</h1>
              <p className="text-white/70 text-base">Welcome back!! Create, manage, and edit your diagrams in a beautiful dark workspace.</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-2-2"/></svg>
                </span>
                <input
                  type="text"
                  placeholder="Search diagrams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-lg px-9 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-neutral-700 transition placeholder-neutral-500 shadow-sm"
                />
              </div>
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-700 text-sm"
                title="Sort diagrams"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg border border-white/10 ${viewMode === 'grid' ? 'bg-neutral-800 text-white shadow border-white/20' : 'bg-neutral-900 text-neutral-400'} transition`}
                aria-label="Grid view"
              >
                <Grid />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg border border-white/10 ${viewMode === 'list' ? 'bg-neutral-800 text-white shadow border-white/20' : 'bg-neutral-900 text-neutral-400'} transition`}
                aria-label="List view"
              >
                <List />
              </button>
            </div>
          </div>
        </div>
        {error && (
          <div className="mb-4 text-red-400 font-semibold bg-neutral-900 p-3 rounded border border-neutral-800 relative z-10">
            {error}
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 relative z-10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gradient-to-br from-neutral-900/90 to-black/80 rounded-2xl shadow-2xl p-8 animate-pulse border border-white/10">
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
                className={`bg-gradient-to-br from-neutral-900/90 to-black/80 rounded-2xl shadow-2xl p-6 relative group border border-white/10 ring-0 hover:ring-2 hover:ring-white/30 hover:shadow-2xl hover:-translate-y-1.5 active:scale-95 transition-all backdrop-blur-md overflow-hidden ${diagram._id === lastUpdatedDiagram?._id ? 'border-white/30' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/board/${diagram._id}`)}
              >
                {/* Glass reflection on card */}
                <div className="absolute left-0 top-0 w-full h-1/3 bg-white/10 rounded-t-2xl blur-md opacity-20 pointer-events-none" />
                {editingDiagram === diagram._id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    defaultValue={diagram.title}
                    onBlur={(e) => handleTitleSubmit(e, diagram._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSubmit(e, diagram._id);
                    }}
                    className="bg-black border border-neutral-800 text-neutral-100 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-neutral-700"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-xl font-bold cursor-pointer text-neutral-100 group-hover:text-neutral-200 truncate drop-shadow"
                      onClick={e => { e.stopPropagation(); handleTitleEdit(diagram); }}
                    >
                      {diagram.title}
                    </h2>
                    {diagram._id === lastUpdatedDiagram?._id && (
                      <span className="ml-1 px-2 py-0.5 text-xs rounded bg-neutral-800 text-neutral-200 font-semibold animate-bounce-slow shadow-lg">Recent</span>
                    )}
                    <div className="absolute top-4 right-4 flex space-x-1 group-hover:opacity-100 opacity-90 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); toggleMenu(diagram._id); }}
                        className="text-neutral-300 hover:text-white border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-white/20 bg-black/30 transition duration-75 hover:bg-neutral-800/60 p-1 dashboard-menu-btn"
                        aria-label="More options"
                        style={{ cursor: 'pointer' }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {menuOpen[diagram._id] && (
                        <div className="absolute right-0 mt-2 w-40 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-50 dashboard-menu-dropdown">
                          <button
                            onClick={e => { e.stopPropagation(); closeMenu(diagram._id); navigate(`/board/${diagram._id}`); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800 rounded-t-lg"
                          >
                            <Edit2 size={15} /> Edit
                          </button>
                          {publicStatus[diagram._id] ? (
                            <button
                              onClick={e => { e.stopPropagation(); closeMenu(diagram._id); makeDiagramPrivate(diagram._id); }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
                            >
                              <Lock size={15} /> Make Private
                            </button>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); closeMenu(diagram._id); makeDiagramPublic(diagram._id); }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
                            >
                              <Unlock size={15} /> Make Public
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); closeMenu(diagram._id); deleteDiagram(diagram._id); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-700 rounded-b-lg"
                          >
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Open Canvas Button */}
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/board/${diagram._id}`); }}
                  className="mt-4 w-full bg-gradient-to-r from-neutral-800/80 to-black/60 hover:from-neutral-700/80 hover:to-neutral-800/80 text-white font-semibold py-2 rounded-lg shadow-glossy transition-all flex items-center justify-center gap-2 group/open backdrop-blur-md border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
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
                className={`bg-gradient-to-br from-neutral-900/90 to-black/80 rounded-2xl shadow-2xl p-4 flex justify-between items-center group border border-white/10 hover:border-white/30 transition hover:shadow-2xl hover:-translate-y-1.5 active:scale-95 backdrop-blur-md overflow-hidden ${diagram._id === lastUpdatedDiagram?._id ? 'border-white/30' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/board/${diagram._id}`)}
              >
                {/* Glass reflection on card */}
                <div className="absolute left-0 top-0 w-full h-1/3 bg-white/10 rounded-t-2xl blur-md opacity-20 pointer-events-none" />
                {editingDiagram === diagram._id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    defaultValue={diagram.title}
                    onBlur={(e) => handleTitleSubmit(e, diagram._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSubmit(e, diagram._id);
                    }}
                    className="bg-black border border-neutral-800 text-neutral-100 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-neutral-700"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="text-lg font-bold cursor-pointer text-neutral-100 group-hover:text-neutral-200 truncate drop-shadow"
                      onClick={e => { e.stopPropagation(); handleTitleEdit(diagram); }}
                    >
                      {diagram.title}
                    </span>
                    {diagram._id === lastUpdatedDiagram?._id && (
                      <span className="ml-1 px-2 py-0.5 text-xs rounded bg-neutral-800 text-neutral-200 font-semibold animate-bounce-slow shadow-lg">Recent</span>
                    )}
                    <div className="absolute top-4 right-4 flex space-x-1 group-hover:opacity-100 opacity-90 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); toggleMenu(diagram._id); }}
                        className="text-neutral-300 hover:text-white border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-white/20 bg-black/30 transition duration-75 hover:bg-neutral-800/60 p-1 dashboard-menu-btn"
                        aria-label="More options"
                        style={{ cursor: 'pointer' }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {menuOpen[diagram._id] && (
                        <div className="absolute right-0 mt-2 w-40 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-50 dashboard-menu-dropdown">
                          <button
                            onClick={e => { e.stopPropagation(); closeMenu(diagram._id); navigate(`/board/${diagram._id}`); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800 rounded-t-lg"
                          >
                            <Edit2 size={15} /> Edit
                          </button>
                          {publicStatus[diagram._id] ? (
                            <button
                              onClick={e => { e.stopPropagation(); closeMenu(diagram._id); makeDiagramPrivate(diagram._id); }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
                            >
                              <Lock size={15} /> Make Private
                            </button>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); closeMenu(diagram._id); makeDiagramPublic(diagram._id); }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
                            >
                              <Unlock size={15} /> Make Public
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); closeMenu(diagram._id); deleteDiagram(diagram._id); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-700 rounded-b-lg"
                          >
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div className="text-neutral-400 text-sm">Total diagrams: <span className="text-neutral-200 font-bold">{totalDiagrams}</span></div>
          {lastUpdatedDiagram && (
            <div className="text-neutral-400 text-sm">Last updated: <span className="text-neutral-200 font-bold">{lastUpdatedDiagram.title}</span> ({new Date(lastUpdatedDiagram.updatedAt).toLocaleString()})</div>
          )}
        </div>
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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDiagrams } from '../hooks/useDiagrams';
import { Plus, Search, Grid, List, Clock, Star, Users, Lock, Unlock } from 'lucide-react';
// import ThemeToggle from '../components/ThemeToggle';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { diagrams, loading, error, createDiagram } = useDiagrams();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated'); // 'updated', 'created', 'title'

  const filteredDiagrams = diagrams
    .filter((diagram) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        diagram.title.toLowerCase().includes(searchLower) ||
        diagram.description?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'updated':
        default:
          return new Date(b.metadata.updatedAt) - new Date(a.metadata.updatedAt);
      }
    });

  const handleCreateDiagram = async () => {
    try {
      const newDiagram = await createDiagram({
        title: 'Untitled Diagram',
        description: '',
        canvas: {
          shapes: [],
          stickyNotes: [],
          markdown: { content: '' },
        },
      });
      navigate(`/board/${newDiagram._id}`);
    } catch (err) {
      console.error('Failed to create diagram:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-matte-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-matte-black">
        <div className="absolute top-4 right-4">
          {/* <ThemeToggle /> */}
        </div>
        <div className="text-red-500 dark:text-red-400 text-lg mb-4">{error.message}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-matte-black py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">My Diagrams</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create and manage your diagrams
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* <ThemeToggle /> */}
            <button
              onClick={handleCreateDiagram}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 shadow-sm shadow-blue-500/20"
            >
              <Plus size={20} />
              <span>New Diagram</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search diagrams..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-surface dark:text-dark-text dark:placeholder-gray-400"
              />
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4 ml-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-surface dark:text-dark-text"
            >
              <option value="updated">Last Updated</option>
              <option value="created">Created Date</option>
              <option value="title">Title</option>
            </select>
            <div className="flex items-center space-x-1 bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border'
                }`}
                title="Grid View"
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border'
                }`}
                title="List View"
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Diagrams Grid/List */}
        {filteredDiagrams.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-4">No diagrams found</div>
            <button
              onClick={handleCreateDiagram}
              className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 font-medium"
            >
              Create your first diagram
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDiagrams.map((diagram) => (
              <div
                key={diagram._id}
                onClick={() => navigate(`/board/${diagram._id}`)}
                className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-t-xl overflow-hidden">
                  {diagram.metadata.thumbnail ? (
                    <img
                      src={diagram.metadata.thumbnail}
                      alt={diagram.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                      No preview
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-dark-text group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                      {diagram.title}
                    </h3>
                    {diagram.isPublic ? (
                      <Unlock size={16} className="text-gray-400 dark:text-gray-500" />
                    ) : (
                      <Lock size={16} className="text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  {diagram.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {diagram.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Clock size={14} />
                      <span>
                        {new Date(diagram.metadata.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users size={14} />
                      <span>{diagram.collaborators.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Collaborators
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
                {filteredDiagrams.map((diagram) => (
                  <tr
                    key={diagram._id}
                    onClick={() => navigate(`/board/${diagram._id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
                          {diagram.title}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {diagram.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(diagram.metadata.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Users size={16} className="text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {diagram.collaborators.length}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {diagram.isPublic ? (
                        <span className="px-2 py-1 text-xs font-medium text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full">
                          Public
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-gray-800 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full">
                          Private
                        </span>
                      )}
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

export default Home; 
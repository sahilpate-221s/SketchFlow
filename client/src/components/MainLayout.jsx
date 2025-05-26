import { useNavigate } from 'react-router-dom';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import StickyNotes from './StickyNotes';
import MarkdownEditor from './MarkdownEditor';
// import ThemeToggle from './ThemeToggle';

const MainLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-matte-black font-handlee">
      {/* Toolbar Sidebar */}
      <div className="flex-shrink-0">
        <Toolbar />
      </div>

      {/* Canvas Main Area */}
      <main className="flex-grow relative">
        {/* Header Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
          <ThemeToggle />
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            title="Go to Dashboard"
          >
            Dashboard
          </button>
        </div>
        <Canvas />
        <StickyNotes />
        <MarkdownEditor />
      </main>
    </div>
  );
};

export default MainLayout;

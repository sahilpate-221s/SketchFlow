import { useNavigate } from 'react-router-dom';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import StickyNotes from './StickyNotes';
import MarkdownEditor from './MarkdownEditor';
// import ThemeToggle from './ThemeToggle';

const MainLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 dark:bg-matte-black font-handlee">
      {/* Toolbar Sidebar */}
      <div className="flex-shrink-0 w-full md:w-auto">
        <Toolbar />
      </div>

      {/* Canvas Main Area */}
      <main className="flex-grow relative w-full min-w-0">
        {/* Header Controls */}
        <div className="absolute top-2 right-2 z-50 flex items-center space-x-2 p-2 md:top-4 md:right-4">
          {/* <ThemeToggle /> */}
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors text-sm md:text-base"
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

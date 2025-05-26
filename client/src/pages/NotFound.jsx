import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
// import ThemeToggle from '../components/ThemeToggle';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-matte-black flex flex-col items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="text-center">
        <h1 className="text-9xl font-bold text-blue-500 dark:text-blue-400">404</h1>
        <h2 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-dark-text">
          Page not found
        </h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="mt-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent 
                       text-base font-medium rounded-md text-white 
                       bg-blue-500 hover:bg-blue-600 
                       dark:bg-blue-600 dark:hover:bg-blue-700 
                       transition-colors duration-200"
          >
            <Home size={20} className="mr-2" />
            Go back home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 
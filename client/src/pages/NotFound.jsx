import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-matte-black">
      <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        404
      </div>
      <div className="text-xl text-gray-600 dark:text-gray-400 mb-8">
        Page not found
      </div>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
      >
        Return Home
      </button>
    </div>
  );
};

export default NotFound; 
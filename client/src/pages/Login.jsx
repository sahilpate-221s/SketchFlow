import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // Redirect to dashboard by default, or to the attempted URL if it exists
        const from = location.state?.from?.pathname || '/';
        // If the attempted URL is login or register, redirect to dashboard
        const redirectPath = (from === '/login' || from === '/register') ? '/' : from;
        navigate(redirectPath, { replace: true });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-matte-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-dark-surface p-8 rounded-xl shadow-lg">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div>
          <h2 className="mt-6 text-center text-3xl font-handwriting text-gray-900 dark:text-dark-text">
            Welcome back to SketchFlow
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link to="/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-neutral-800 placeholder-neutral-500 text-neutral-100 bg-neutral-900 rounded-t-md focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-400 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-neutral-800 placeholder-neutral-500 text-neutral-100 bg-neutral-900 rounded-b-md focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-400 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-neutral-800 text-sm font-medium rounded-md text-white bg-gradient-to-br from-black via-neutral-900 to-black/70 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-600 dark:ring-offset-dark-surface disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="font-medium bg-gradient-to-br from-black via-neutral-900 to-black/70 text-white px-4 py-2 rounded-md hover:bg-neutral-800 transition-colors"
            >
              Continue as guest
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
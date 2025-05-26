import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import ThemeToggle from '../components/ThemeToggle';
import { 
  ArrowRight, 
  Github, 
  Zap, 
  Users, 
  Lock, 
  Unlock, 
  PenTool, 
  Share2, 
  Clock, 
  Code,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { login, register, logout } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error);
        }
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }
        const result = await register(email, password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    try {
      // Clear any existing auth state
      await logout();
      // Navigate to dashboard as guest
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to continue as guest. Please try again.');
    }
  };

  const features = [
    {
      icon: <PenTool className="h-6 w-6" />,
      title: "Intuitive Drawing Tools",
      description: "Create beautiful diagrams with our easy-to-use drawing tools and templates."
    },
    {
      icon: <Share2 className="h-6 w-6" />,
      title: "Real-time Collaboration",
      description: "Work together with your team in real-time, no matter where you are."
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Version History",
      description: "Track changes and revert to previous versions with our version control system."
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Developer Friendly",
      description: "Built with modern technologies and open for contributions."
    }
  ];

  const testimonials = [
    {
      quote: "SketchFlow has revolutionized how our team collaborates on diagrams. The real-time features are incredible!",
      author: "Sarah Chen",
      role: "Product Manager"
    },
    {
      quote: "As a developer, I love how easy it is to create and share technical diagrams with my team.",
      author: "Michael Rodriguez",
      role: "Software Engineer"
    },
    {
      quote: "The best diagramming tool I've used. Simple yet powerful, perfect for our design team.",
      author: "Emma Thompson",
      role: "UX Designer"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl font-handwriting bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                SketchFlow
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleGuestAccess}
                className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-4 py-2 rounded-lg transition-colors"
              >
                Continue as guest
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Hero Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-slate-900 dark:text-white">
                  Create Beautiful Diagrams
                  <span className="block bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Together</span>
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-300">
                  SketchFlow is a collaborative diagramming tool that helps teams visualize ideas, 
                  create flowcharts, and work together in real-time.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <span>Real-time collaboration</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                  <Zap className="h-5 w-5 text-emerald-500" />
                  <span>Lightning fast</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                  <Lock className="h-5 w-5 text-emerald-500" />
                  <span>Secure & private</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <a
                  href="https://github.com/yourusername/sketchflow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Github className="h-5 w-5 mr-2" />
                  Star on GitHub
                </a>
                <button
                  onClick={() => setIsLogin(false)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg hover:from-emerald-700 hover:to-teal-600 transition-all duration-200 shadow-lg shadow-emerald-500/20"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            </div>

            {/* Right Column - Auth Form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-700">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                    {isLogin ? 'Welcome back' : 'Create your account'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {isLogin ? (
                      <>
                        Don't have an account?{' '}
                        <button
                          onClick={() => setIsLogin(false)}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium"
                        >
                          Sign up
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{' '}
                        <button
                          onClick={() => setIsLogin(true)}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-100 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                               transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                               transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder="Enter your password"
                    />
                  </div>

                  {!isLogin && (
                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Confirm Password
                      </label>
                      <input
                        id="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 
                                 bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                                 focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                                 transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                        placeholder="Confirm your password"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg 
                             hover:from-emerald-700 hover:to-teal-600 focus:outline-none focus:ring-2 
                             focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 
                             disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/20"
                  >
                    {loading
                      ? isLogin
                        ? 'Signing in...'
                        : 'Creating account...'
                      : isLogin
                        ? 'Sign in'
                        : 'Create account'}
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      Or continue with
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGuestAccess}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg 
                           text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 
                           transition-colors flex items-center justify-center space-x-2"
                >
                  <Unlock className="h-5 w-5" />
                  <span>Continue as guest</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Everything you need to create amazing diagrams
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              Powerful features to help you and your team work better together
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-100 dark:border-slate-700
                         hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
              >
                <div className="text-emerald-500 mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Loved by teams worldwide
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              See what our users have to say about SketchFlow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-100 dark:border-slate-700"
              >
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {testimonial.author[0]}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {testimonial.author}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 italic">
                  "{testimonial.quote}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-emerald-600 to-teal-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to start creating?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Join thousands of teams using SketchFlow to create amazing diagrams
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => setIsLogin(false)}
              className="w-full sm:w-auto px-8 py-3 bg-white text-emerald-600 rounded-lg 
                       hover:bg-emerald-50 transition-colors font-medium shadow-lg"
            >
              Get Started for Free
            </button>
            <button
              onClick={handleGuestAccess}
              className="w-full sm:w-auto px-8 py-3 border-2 border-white text-white rounded-lg 
                       hover:bg-white/10 transition-colors font-medium"
            >
              Try as Guest
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                SketchFlow
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Create beautiful diagrams together with your team.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                Product
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    Enterprise
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                Resources
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                Company
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-slate-600 dark:text-slate-300">
              © 2024 SketchFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing; 
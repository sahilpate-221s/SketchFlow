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
import '../shadowPulse.css';

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
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-black text-white relative overflow-hidden">
      {/* Animated Black Texture Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="w-full h-full opacity-20 shadowPulse mix-blend-normal" style={{
          background: 'radial-gradient(circle at 20% 30%, rgba(30,30,30,0.25) 0, transparent 60%), radial-gradient(circle at 80% 70%, rgba(60,60,60,0.18) 0, transparent 60%), repeating-linear-gradient(135deg, rgba(0,0,0,0.18) 0px, rgba(30,30,30,0.12) 2px, transparent 2px, transparent 24px)',
          backgroundSize: '1000px 1000px, 800px 800px, 32px 32px',
          backgroundPosition: 'center center, right bottom, 0 0',
          backgroundRepeat: 'no-repeat, no-repeat, repeat',
          filter: 'drop-shadow(0 0 32px #0008)'
        }} />
      </div>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-black via-neutral-900 to-black/90 backdrop-blur border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl font-handwriting bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                SketchFlow
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGuestAccess}
                className="text-neutral-300 hover:text-white px-4 py-2 rounded-lg transition-colors border border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
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
                <h1 className="text-5xl font-bold text-white">
                  Create Beautiful Diagrams
                  <span className="block bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Together</span>
                </h1>
                <p className="text-xl text-slate-300">
                  SketchFlow is a collaborative diagramming tool that helps teams visualize ideas, 
                  create flowcharts, and work together in real-time.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Users className="h-5 w-5 text-white" />
                  <span>Real-time collaboration</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Zap className="h-5 w-5 text-white" />
                  <span>Lightning fast</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Lock className="h-5 w-5 text-white" />
                  <span>Secure & private</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href="https://github.com/yourusername/sketchflow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-gradient-to-br from-black via-neutral-900 to-black/70 px-4 py-2 border border-white/40 rounded-lg text-slate-200 hover:bg-neutral-300 transition-all duration-200"
                >
                  <Github className="h-5 w-5 mr-2" />
                  Star on GitHub
                </a>
                <button
                  onClick={() => setIsLogin(false)}
                  className="inline-flex items-center px-6 py-3 border bg-gradient-to-br from-black via-neutral-900 to-black/70 text-white rounded-lg hover:bg-neutral-300 transition-all duration-200 shadow-lg cursor-pointer"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            </div>
            {/* Right Column - Auth Form */}
            <div className="bg-gradient-to-br from-black via-neutral-900 to-black/90 rounded-2xl shadow-2xl p-14 border border-white/40 flex flex-col items-center max-w-xl w-full mx-auto z-10" style={{ minWidth: 420 }}>
              <div className="w-full space-y-7">
                <div className="text-center">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent mb-1">
                    {isLogin ? 'Welcome back' : 'Create your account'}
                  </h2>
                  <p className="mt-2 text-base text-slate-400">
                    {isLogin ? (
                      <>
                        Don't have an account?{' '}
                        <button
                          onClick={() => setIsLogin(false)}
                          className="text-white hover:underline font-semibold"
                        >
                          Sign up
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{' '}
                        <button
                          onClick={() => setIsLogin(true)}
                          className="text-white hover:underline font-semibold"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5 w-full">
                  {error && (
                    <div className="rounded-lg bg-red-900/30 p-4 border border-red-800">
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-200 mb-1">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border border-white/40 bg-black/20 text-white focus:ring-2 focus:ring-white focus:border-white transition-colors placeholder-slate-500 shadow-sm focus:shadow-md outline-none"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-200 mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border border-white/40 bg-black/20 text-white focus:ring-2 focus:ring-white focus:border-white transition-colors placeholder-slate-500 shadow-sm focus:shadow-md outline-none"
                      placeholder="Enter your password"
                    />
                  </div>
                  {!isLogin && (
                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-200 mb-1">
                        Confirm Password
                      </label>
                      <input
                        id="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full px-4 py-3 rounded-lg border border-white/40 bg-black/20 text-white focus:ring-2 focus:ring-white focus:border-white transition-colors placeholder-slate-500 shadow-sm focus:shadow-md outline-none"
                        placeholder="Confirm your password"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-black/40  text-white border border-slate-500 rounded-lg font-semibold text-lg shadow-lg hover:bg-gradient-to-br hover:cursor-pointer from-black via-neutral-900 to-black/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
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
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center ">
                    <div className="w-full border-t border-white/30"></div>
                  </div>
                  <div className="relative flex justify-center text-sm ">
                    <span className="px-2 bg-slate-950 text-white">
                      Or continue with
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleGuestAccess}
                  className="w-full px-4 py-3 border border-slate-800 rounded-lg text-white bg-gradient-to-bl from-black/40 via-neutral-900 to-black hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 font-semibold shadow-sm"
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
      <div className="py-24 bg-gradient-to-br from-black via-neutral-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent mb-4">
              Everything you need to create amazing diagrams
            </h2>
            <p className="text-xl text-neutral-400">
              Powerful features to help you and your team work better together
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-black via-neutral-900 to-black/90 rounded-xl p-6 shadow-lg border border-neutral-800 hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
              >
                <div className="text-white mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Testimonials Section */}
      <div className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent mb-4">
              Loved by teams worldwide
            </h2>
            <p className="text-xl text-neutral-400">
              See what our users have to say about SketchFlow
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-black via-neutral-900 to-black/90 rounded-xl p-6 shadow-lg border border-neutral-800"
              >
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {testimonial.author[0]}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                      {testimonial.author}
                    </h4>
                    <p className="text-sm text-neutral-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className="text-neutral-300 italic">
                  "{testimonial.quote}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-black via-neutral-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent mb-4">
            Ready to start creating?
          </h2>
          <p className="text-xl text-neutral-400 mb-8">
            Join thousands of teams using SketchFlow to create amazing diagrams
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 ">
            <button
              onClick={() => setIsLogin(false)}
              className="w-full sm:w-auto px-8 py-3 bg-white text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors font-medium shadow-lg cursor-pointer"
            >
              Get Started for Free
            </button>
            <button
              onClick={handleGuestAccess}
              className="w-full sm:w-auto px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-medium cursor-pointer "
            >
              Try as Guest
            </button>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="bg-neutral-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent mb-4">
                SketchFlow
              </h3>
              <p className="text-neutral-400">
                Create beautiful diagrams together with your team.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Product
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white">
                    Enterprise
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Resources
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Company
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-neutral-800">
            <p className="text-center text-neutral-400">
              © 2024 SketchFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
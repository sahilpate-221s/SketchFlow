import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Provider } from 'react-redux'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { ThemeProvider } from './context/ThemeContext'
import { store } from './store'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Board from './pages/Board'
import NotFound from './pages/NotFound'
import { useAuth } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
// import ThemeToggle from './components/ThemeToggle'

// Custom route component for board access
const BoardRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Allow access if user is authenticated or if trying to access a public diagram
  // The actual access control will be handled by the server
  return children;
};

const App = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <SocketProvider>
              <div className="min-h-screen font-handwriting transition-colors duration-300
                            bg-white text-gray-900
                            dark:bg-black dark:text-gray-100">
                {/* <ThemeToggle /> */}
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Landing />} />

                  {/* Protected routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/board/:id"
                    element={
                      <BoardRoute>
                        <Board />
                      </BoardRoute>
                    }
                  />

                  {/* Fallback routes */}
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </div>
            </SocketProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default App

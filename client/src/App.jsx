import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { ThemeProvider } from './context/ThemeContext'
import { store } from './store'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Canvas from './components/Canvas'
import MainLayout from './components/MainLayout'
import PrivateRoute from './components/PrivateRoute'
import Board from './pages/Board'
import NotFound from './pages/NotFound'

// Import pages (to be created)
const DiagramEditor = () => <div className="p-4">Diagram Editor Page</div>

const App = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <SocketProvider>
              <div className="min-h-screen font-handwriting transition-colors duration-300
                            bg-gray-100 text-gray-900
                            dark:bg-matte-black dark:text-dark-text">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/home"
                    element={
                      <PrivateRoute>
                        <Home />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/board/:id"
                    element={
                      <PrivateRoute>
                        <Board />
                      </PrivateRoute>
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

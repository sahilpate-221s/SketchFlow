import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
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
import React from 'react'

// Update the BoardRoute component to handle different access modes
const BoardRoute = ({ children, mode = 'edit' }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Clone the children and pass the mode prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { mode });
    }
    return child;
  });

  return childrenWithProps;
};

// Add a component to handle the legacy route redirect
const LegacyBoardRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/diagram/${id}/edit`} replace />;
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

                  {/* Diagram routes with different access modes */}
                  <Route
                    path="/diagram/:id/edit"
                    element={
                      <BoardRoute mode="edit">
                        <Board />
                      </BoardRoute>
                    }
                  />
                  <Route
                    path="/diagram/:id/view"
                    element={
                      <BoardRoute mode="view">
                        <Board />
                      </BoardRoute>
                    }
                  />
                  
                  {/* Legacy board route - redirect to edit mode */}
                  <Route
                    path="/board/:id"
                    element={<LegacyBoardRedirect />}
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

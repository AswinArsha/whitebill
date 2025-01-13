import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Login';
import Home from './Home';
import AdminHome from './AdminHome';  // Import the AdminHome component
import ProtectedRoute from './ProtectedRoute';
import Unauthorized from './Unauthorized';
import { Loader } from 'lucide-react';

function App() {
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedRole = localStorage.getItem('role');
    const savedUserId = localStorage.getItem('userId');
    if (savedRole && savedUserId) {
      setRole(savedRole);
      setUserId(Number(savedUserId));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );
  }

  // Helper function to determine which home component to render
  const getHomeComponent = (role) => {
    if (role === 'superadmin') {
      return <AdminHome role={role} userId={userId} isAuthenticated={isAuthenticated} />;
    }
    return <Home role={role} userId={userId} isAuthenticated={isAuthenticated} />;
  };

  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route
          path="/"
          element={
            <Login
              setRole={setRole}
              setIsAuthenticated={setIsAuthenticated}
              setUserId={setUserId}
            />
          }
        />

        {/* Protected routes */}
        <Route
          path="/home/*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              role={role}
              requiredRole="user"
            >
              {getHomeComponent(role)}
            </ProtectedRoute>
          }
        />

        {/* Admin specific route */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              role={role}
              requiredRole="superadmin"
            >
              <AdminHome role={role} userId={userId} isAuthenticated={isAuthenticated} />
            </ProtectedRoute>
          }
        />

        {/* Unauthorized Access Route */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Fallback to login page if route doesn't match */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Login';
import Home from './Home';
import ProtectedRoute from './ProtectedRoute';  // Import the protected route component
import Unauthorized from './Unauthorized'; // Import the Unauthorized component
import { Loader } from 'lucide-react'; // Import loader for loading state

function App() {
  const [role, setRole] = useState(null); // State to store user role
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Store auth status
  const [userId, setUserId] = useState(null); // State to store user ID
  const [loading, setLoading] = useState(true); // Loading state for initial session check

  // Simulating login persistence for demo purposes
  useEffect(() => {
    const savedRole = localStorage.getItem('role');
    const savedUserId = localStorage.getItem('userId');
    if (savedRole && savedUserId) {
      setRole(savedRole);
      setUserId(Number(savedUserId)); // Ensure userId is a number
      setIsAuthenticated(true);
    }
    setLoading(false); // Set loading to false after session is checked
  }, []);

  // Show loading spinner while session is being checked
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="animate-spin h-10 w-10 text-gray-500" /> {/* Spinner component */}
      </div>
    );
  }

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
  
        {/* Protected route */}
        <Route
          path="/home/*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              role={role}
              requiredRole="user"
            >
              <Home role={role} userId={userId} isAuthenticated={isAuthenticated} />
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

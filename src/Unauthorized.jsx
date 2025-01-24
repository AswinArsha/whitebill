// ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Role hierarchy where higher numbers represent higher privileges.
 * Adjust as needed for additional roles.
 */
const roleHierarchy = {
  user: 1,
  admin: 2,
  superadmin: 3  // Added superadmin with highest privilege level
};

/**
 * ProtectedRoute component ensures that only authenticated users
 * with the appropriate role can access certain routes.
 *
 * Props:
 * - isAuthenticated: Boolean indicating if the user is authenticated.
 * - role: String representing the user's role.
 * - requiredRole: (Optional) String representing the minimum required role.
 * - children: The component(s) to render if access is granted.
 */
const ProtectedRoute = ({ isAuthenticated, role, requiredRole, children }) => {
  if (!isAuthenticated) {
    // Redirect unauthenticated users to the login page
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    const userRoleLevel = roleHierarchy[role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      // Redirect users who don't have sufficient privileges
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Render the protected component(s) if authenticated and authorized
  return children;
};

export default ProtectedRoute;

// Unauthorized.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './components/ui/button'; // Adjust the import path as necessary

const Unauthorized = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-4">Unauthorized Access</h1>
      <p className="text-lg mb-8">You do not have permission to view this page.</p>
      <Link to="/home">
        <Button>Go to Home</Button>
      </Link>
    </div>
  );
};

export default Unauthorized;

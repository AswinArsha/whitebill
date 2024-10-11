// ./components/ProfileDropdown.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom"; // For navigation
import { supabase } from "../supabase"; // Ensure the correct path

/**
 * ProfileDropdown Component
 *
 * Displays the first letter of the user's name within a styled circle.
 * Provides a dropdown menu with user details and a logout option.
 *
 * Props:
 * - userId: Number representing the logged-in user's ID.
 */
const ProfileDropdown = ({ userId }) => {
  const [userDetails, setUserDetails] = useState({
    name: "",
    department: "",
    position: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId) {
        setError("User ID is missing.");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("name, department, position")
          .eq("id", userId)
          .single();

        if (error) {
          throw error;
        }

        setUserDetails({
          name: data.name,
          department: data.department,
          position: data.position,
        });
      } catch (err) {
        console.error("Error fetching user details:", err);
        setError("Failed to load user details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  const handleLogout = () => {
    // Implement logout logic here (e.g., clearing session)
    console.log("Logging out...");
    // Clear local storage
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    navigate("/"); // Redirect to the login page
    // Optionally, reset other authentication states if using context or state management
  };

  /**
   * Extracts the first letter of the user's name.
   * Returns "?" if the name is not available.
   */
  const getInitial = () => {
    if (isLoading) return "…";
    if (error || !userDetails.name) return "?";
    return userDetails.name.charAt(0).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="none"
          className="flex items-center justify-center rounded-full w-10 h-10 bg-black hover:bg-gray-900 text-white "
        >
          {getInitial()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-white rounded-md shadow-lg p-4"
        align="end"
        forceMount
      >
        {/* User Details Section */}
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {userDetails.name}
            </h3>
            <p className="text-sm text-gray-600">
              {userDetails.position} 
            </p>
          </div>
        )}

        <DropdownMenuSeparator />

        {/* Logout Option */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center p-2 hover:bg-gray-100 cursor-pointer rounded-md"
        >
          <LogOut className="mr-2 h-4 w-4 text-gray-700" />
          <span className="text-gray-700">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;

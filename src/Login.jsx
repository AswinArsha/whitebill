import React, { useState } from "react";
import { supabase } from "./supabase";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader } from "lucide-react";
import { motion } from "framer-motion";

const Login = ({ setRole, setIsAuthenticated, setUserId }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    let valid = true;
    const newErrors = { username: "", password: "" };

    if (!username.trim()) {
      newErrors.username = "Username is required.";
      valid = false;
    }

    if (!password) {
      newErrors.password = "Password is required.";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({ username: "", password: "" });

    try {
      // Get user data
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("show", true)
        .single();

      if (userError || !user || user.password !== password) {
        setErrors({ username: "Invalid username or password.", password: "" });
        setIsSubmitting(false);
        return;
      }

      // Allow superadmin to login regardless of subscription status
      if (user.role === 'superadmin') {
        handleSuccessfulLogin(user);
        return;
      }

      // Check subscription status for non-superadmin users
      if (!user.subscription_status) {
        setErrors({
          username: "Your account is inactive. Please contact your administrator.",
          password: ""
        });
        setIsSubmitting(false);
        return;
      }

      // Check if user has an organization assigned
      if (!user.organization_id) {
        setErrors({
          username: "No organization assigned. Please contact your administrator.",
          password: ""
        });
        setIsSubmitting(false);
        return;
      }

      // If all checks pass, proceed with login
      handleSuccessfulLogin(user);

    } catch (err) {
      console.error("Login error:", err);
      setErrors({ username: "An unexpected error occurred.", password: "" });
      setIsSubmitting(false);
    }
  };

  const handleSuccessfulLogin = (user) => {
    setRole(user.role);
    setUserId(user.id);
    setIsAuthenticated(true);

    if (rememberMe) {
      localStorage.setItem("role", user.role);
      localStorage.setItem("userId", user.id);
    }

    // Navigate based on role
    if (user.role === 'superadmin') {
      navigate("/admin");
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 px-4">
      <Card className="w-full max-w-md shadow-lg rounded-lg bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-black">White Bill</CardTitle>
          <p className="mt-2 text-gray-600">Welcome! Please login to your account.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Field */}
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border ${
                  errors.username ? "border-red-500" : "border-gray-300"
                } rounded-md shadow-sm`}
                aria-invalid={errors.username ? "true" : "false"}
              />
              {errors.username && (
                <motion.p
                  className="mt-1 text-sm text-red-500"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {errors.username}
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <motion.p
                  className="mt-1 text-sm text-red-500"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {errors.password}
                </motion.p>
              )}
            </div>

      

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium"
            >
              {isSubmitting ? (
                <motion.div
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Loader className="animate-spin" />
                  <span>Logging in...</span>
                </motion.div>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
// Attendance.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  Clock,
  XCircle,
  MoreVertical,
  Plus, 
  Eye, 
  Trash2, 
  Save 
} from "lucide-react";
import { supabase } from "../supabase";
import { Input } from "@/components/ui/input";

import AlertNotification from "./AlertNotification";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  min,
} from "date-fns";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import DownloadPDFButton from "./DownloadPDFButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import toast, { Toaster } from 'react-hot-toast';
import { Label } from "@/components/ui/label";

// Import framer-motion components
import { motion, AnimatePresence } from "framer-motion";

const Attendance = ({ role, userId }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [present, setPresent] = useState(0);
  const [absent, setAbsent] = useState(0);
  const [late, setLate] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // State for adding new staff
  const [newName, setNewName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user"); // Default role
  const [selectedUser, setSelectedUser] = useState(null); // To hold user data

  // Dialog states
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'MMMM yyyy');
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  // Edit Card states
  const [isEditCardOpen, setIsEditCardOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    department: "",
    position: "",
    username: "",
    role: "user",
    password: "", // Added password field
  });

  const navigate = useNavigate();

  const officeStartTime = "10:00";
  const lateThreshold = "10:10";

  // Debugging: Log role and userId
  useEffect(() => {
    console.log("Attendance Component Mounted");
    console.log("Role:", role);
    console.log("User ID:", userId);
  }, [role, userId]);

  useEffect(() => {
    fetchAttendanceDataForMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, role, userId]);

  const fetchAttendanceDataForMonth = async () => {
    // Defensive check to ensure userId is defined for regular users
    if (role === "user" && (userId === null || userId === undefined)) {
      console.error("User ID is undefined for a regular user.");
      alert("User ID is undefined. Please log in again.");
      return;
    }

    const [month, year] = selectedMonth.split(" ");
    const firstDay = startOfMonth(new Date(`${month} 1, ${year}`));
    const lastDay = endOfMonth(firstDay);
    const today = new Date();
    const lastRelevantDay = min([lastDay, today]);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastRelevantDay });

    try {
      // Fetch users based on role
      let usersQuery = supabase
        .from("users")
        .select("*")
        .eq("show", true); // Only fetch users with 'show = true'

      if (role === "user") {
        usersQuery = usersQuery.eq("id", userId); // Regular users see only themselves
      }

      const { data: usersData, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      if (role === "user" && usersData.length === 0) {
        console.error("User not found or not authorized.");
        alert("User not found or not authorized.");
        return;
      }

      // Fetch attendance data based on role
      let attendanceQuery = supabase
        .from("attendance")
        .select("user_id, date, time")
        .gte("date", format(firstDay, "yyyy-MM-dd"))
        .lte("date", format(lastRelevantDay, "yyyy-MM-dd"));

      if (role === "user") {
        attendanceQuery = attendanceQuery.eq("user_id", userId); // Regular users see only their attendance
      }

      const { data: attendanceData, error: attendanceError } = await attendanceQuery;
      if (attendanceError) throw attendanceError;

      // Debugging: Log fetched data
      console.log("Fetched Users Data:", usersData);
      console.log("Fetched Attendance Data:", attendanceData);

      // Create a map of users
      const userMap = usersData.reduce((acc, user) => {
        acc[user.id] = {
          id: user.id,
          name: user.name,
          department: user.department,
          position: user.position,
          username: user.username,
          role: user.role,
          daysPresent: 0,
          daysLate: 0,
          daysAbsent: daysInMonth.length,
          totalCheckInTime: 0,
          checkInCount: 0,
          status: "Absent",
          checkIn: "-",
          checkOut: "-",
        };
        return acc;
      }, {});

      // Iterate through each day and calculate attendance
      daysInMonth.forEach((day) => {
        const dayAttendance = attendanceData.filter((record) =>
          isSameDay(parseISO(record.date), day)
        );

        usersData.forEach((user) => {
          const userDayAttendance = dayAttendance.filter(
            (record) => record.user_id === user.id
          );

          if (userDayAttendance.length > 0) {
            const checkInTime = userDayAttendance[0].time;
            const checkOutTime = userDayAttendance[userDayAttendance.length - 1].time;
            const status = checkInTime <= lateThreshold ? "Present" : "Late";

            userMap[user.id].daysAbsent -= 1;
            userMap[user.id].daysPresent += 1;
            if (status === "Late") {
              userMap[user.id].daysLate += 1;
            }
            // Convert time to decimal hours
            const [checkInHour, checkInMinute] = checkInTime.split(":").map(Number);
            const checkInDecimal = checkInHour + checkInMinute / 60;
            userMap[user.id].totalCheckInTime += checkInDecimal;
            userMap[user.id].checkInCount += 1;

            if (isSameDay(day, today) && user.id === userId) {
              userMap[user.id].status = status;
              userMap[user.id].checkIn = checkInTime;
              userMap[user.id].checkOut = checkOutTime;
            }
          }
        });
      });

      // Calculate average check-in time
      Object.values(userMap).forEach((user) => {
        user.averageCheckIn =
          user.checkInCount > 0
            ? format(
                new Date(
                  0,
                  0,
                  0,
                  0,
                  Math.round((user.totalCheckInTime * 60) / user.checkInCount)
                ),
                "HH:mm"
              )
            : "-";
      });

      const userList = Object.values(userMap);
      const presentCount = userList.filter(
        (user) => user.status === "Present" || user.status === "Late"
      ).length;
      const lateCount = userList.filter((user) => user.status === "Late").length;
      const absentCount = userList.filter((user) => user.status === "Absent").length;

      setAttendanceData(userList);
      setTotalStaff(role === "admin" ? usersData.length : 1);
      setPresent(presentCount);
      setLate(lateCount);
      setAbsent(absentCount);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      alert("Failed to fetch attendance data. Please try again.");
    }
  };

  const handleAddStaff = async () => {
    if (
      newName.trim() &&
      newDepartment.trim() &&
      newPosition.trim() &&
      newUsername.trim() &&
      newPassword.trim()
    ) {
      try {
        // Insert into users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .insert([
            {
              username: newUsername.trim(),
              password: newPassword.trim(), // Consider hashing passwords in a real app
              role: newRole,
              name: newName.trim(),
              department: newDepartment.trim(),
              position: newPosition.trim(),
              show: true, // Default to true for new staff
            },
          ])
          .select()
          .single();
      
        if (userError) throw userError;
      
        // Reset form fields and close dialog
        setNewName("");
        setNewDepartment("");
        setNewPosition("");
        setNewUsername("");
        setNewPassword("");
        setNewRole("user");
        setIsDialogOpen(false);
      
        // Refresh attendance data
        fetchAttendanceDataForMonth();
      
        // Show success toast
        toast.success("Staff added successfully! 🎉");
      } catch (error) {
        console.error("Error adding new staff:", error);
        toast.error("Failed to add new staff. Please try again.");
      }
    } else {
      toast.error("Please fill in all fields.");
    }
  };

  const handleEdit = async () => {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          name: editForm.name,
          department: editForm.department,
          position: editForm.position,
          username: editForm.username,
          role: editForm.role,
          password: editForm.password, // Include password in the update
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      // Close edit card and refresh data
      setIsEditCardOpen(false);
      fetchAttendanceDataForMonth();
      toast.success("User details updated successfully! ✏️");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user details.");
    }
  };

  const openEditCard = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      department: user.department,
      position: user.position,
      username: user.username,
      role: user.role,
      password: user.password || "", // Populate password field
    });
    setIsEditCardOpen(true);
  };

  const handleDeleteStaff = async () => {
    if (selectedUser) {
      try {
        // Begin deletion process

        // 1. Delete attendance records
        const { error: attendanceError } = await supabase
          .from("attendance")
          .delete()
          .eq("user_id", selectedUser.id);

        if (attendanceError) throw attendanceError;

        // 2. Delete user record
        const { error: userError } = await supabase
          .from("users")
          .delete()
          .eq("id", selectedUser.id);

        if (userError) throw userError;

        // Close alert dialog and reset selectedUser
        setIsAlertDialogOpen(false);
        setSelectedUser(null);

        // Refresh attendance data
        fetchAttendanceDataForMonth();

        // Show success toast
        toast.success("Staff deleted successfully! 🗑️");
      } catch (error) {
        console.error("Error deleting staff and related records:", error);
        toast.error("Failed to delete staff member. Please try again.");
      }
    }
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setIsAlertDialogOpen(true);
  };

  const handleViewReport = (userId) => {
    navigate(`/home/attendance/${userId}`); // Redirect to individual attendance report
  };

  const filteredAttendanceData = attendanceData.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      options.push(format(date, "MMMM yyyy"));
    }
    return options;
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = 'auto';
    };
  }, []);

  // useEffect for resetting edit form when edit card closes
  useEffect(() => {
    if (!isEditCardOpen) {
      setEditingUser(null);
      setEditForm({
        name: "",
        department: "",
        position: "",
        username: "",
        role: "user",
        password: "", // Reset password field
      });
    }
  }, [isEditCardOpen]);

  return (
    <div className="h-auto relative">
      <Toaster position="bottom-center" reverseOrder={false} />

      {/* Header */}
      <div className="flex justify-between items-center ">
        <div className="flex space-x-5 mb-4">
          <AlertNotification />
        </div>
      </div>

      {/* Statistics Cards */}
      {role === "admin" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStaff}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{present}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{late}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{absent}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Details Table */}
      <Card className="bg-gray-50">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <CardTitle>Attendance Details</CardTitle>
            <div className="flex items-center space-x-4">
              {/* Month Selector */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search Input */}
              {role === "admin" && (
                <Input
                  id="search"
                  placeholder="Enter user name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[200px]"
                />
              )}

              {/* Add Staff Dialog */}
              {role === "admin" && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Staff</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Staff</DialogTitle>
                      <DialogDescription>
                        Fill in the details of the new staff member.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddStaff(); }}>
                      {/* Name */}
                      <div className="mb-4">
                        <Label htmlFor="new-name" className="block mb-1">
                          Name
                        </Label>
                        <Input
                          id="new-name"
                          placeholder="Enter name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          required
                        />
                      </div>

                      {/* Department */}
                      <div className="mb-4">
                        <Label htmlFor="new-department" className="block mb-1">
                          Department
                        </Label>
                        <Input
                          id="new-department"
                          placeholder="Enter department"
                          value={newDepartment}
                          onChange={(e) => setNewDepartment(e.target.value)}
                          required
                        />
                      </div>

                      {/* Position */}
                      <div className="mb-4">
                        <Label htmlFor="new-position" className="block mb-1">
                          Position
                        </Label>
                        <Input
                          id="new-position"
                          placeholder="Enter position"
                          value={newPosition}
                          onChange={(e) => setNewPosition(e.target.value)}
                          required
                        />
                      </div>

                      {/* Username */}
                      <div className="mb-4">
                        <Label htmlFor="new-username" className="block mb-1">
                          Username
                        </Label>
                        <Input
                          id="new-username"
                          placeholder="Enter username"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          required
                        />
                      </div>

                      {/* Password */}
                      <div className="mb-4">
                        <Label htmlFor="new-password" className="block mb-1">
                          Password
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Enter password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>

                      {/* Role */}
                      <div className="mb-4">
                        <Label htmlFor="new-role" className="block mb-1">
                          Role
                        </Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Submit Button */}
                      <Button type="submit" className="w-full flex items-center space-x-2">
                        <Plus className="h-4 w-4" />
                        <span>Add Staff</span>
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {/* Download PDF Button */}
              <DownloadPDFButton
                data={filteredAttendanceData}
                selectedMonth={selectedMonth}
                role={role}
                userId={userId}
              />
            </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table className="bg-white rounded-xl ">
              <TableHeader>
                <TableRow className="hover:bg-white">
                  <TableHead>Name</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Present</TableHead>
                  <TableHead>Days Absent</TableHead>
                  <TableHead>Days Late</TableHead>
                  <TableHead>Avg Check-in</TableHead>
                  <TableHead>Actions</TableHead> {/* Always render "Actions" header */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendanceData.map((user) => (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-gray-100">
                    <TableCell className="font-medium flex items-center space-x-2">
                      {user.name}
                      {user.role === "admin" && (
                        <Badge variant="" className="ml-2">
                          Admin
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.checkIn}</TableCell>
                    <TableCell>{user.checkOut}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "Present"
                            ? "default"
                            : user.status === "Late"
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{user.daysPresent}</TableCell>
                    <TableCell className="text-center">{user.daysAbsent}</TableCell>
                    <TableCell className="text-center">{user.daysLate}</TableCell>
                    <TableCell className="text-center">{user.averageCheckIn}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <MoreVertical className="h-5 w-5 cursor-pointer" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            className="cursor-pointer font-medium flex items-center space-x-2"
                            onClick={() => handleViewReport(user.id)}
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </DropdownMenuItem>

                          {role === "admin" && (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer font-medium flex items-center space-x-2"
                                onClick={() => openEditCard(user)}
                              >
                                <Save className="h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer font-medium flex items-center space-x-2 text-red-600"
                                onClick={() => openDeleteDialog(user)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                                <span className="text-red-600">Delete</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Editable Card for Editing Staff Details with Animation */}
        <AnimatePresence>
          {isEditCardOpen && editingUser && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="bg-white w-full sm:w-96 p-6 overflow-auto h-full relative"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Edit Staff Details</h2>
                  <button
                    onClick={() => setIsEditCardOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    &#10005;
                  </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }}>
                  {/* Name */}
                  <div className="mb-4">
                    <Label htmlFor="edit-name" className="block mb-1">
                      Name
                    </Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Department */}
                  <div className="mb-4">
                    <Label htmlFor="edit-department" className="block mb-1">
                      Department
                    </Label>
                    <Input
                      id="edit-department"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      required
                    />
                  </div>

                  {/* Position */}
                  <div className="mb-4">
                    <Label htmlFor="edit-position" className="block mb-1">
                      Position
                    </Label>
                    <Input
                      id="edit-position"
                      value={editForm.position}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      required
                    />
                  </div>

                  {/* Username */}
                  <div className="mb-4">
                    <Label htmlFor="edit-username" className="block mb-1">
                      Username
                    </Label>
                    <Input
                      id="edit-username"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="mb-4">
                    <Label htmlFor="edit-password" className="block mb-1">
                      Password
                    </Label>
                    <Input
                      id="edit-password"
                      type="password"
                      placeholder="Enter new password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      required
                    />
                  </div>

                  {/* Role */}
                  <div className="mb-4">
                    <Label htmlFor="edit-role" className="block mb-1">
                      Role
                    </Label>
                    <Select 
                      value={editForm.role} 
                      onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" className="w-full flex items-center space-x-2 mb-2">
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </Button>
                </form>
                {/* Optional: Close Button */}
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditCardOpen(false)} 
                  className="mt-2 w-full flex items-center justify-center"
                >
                  Close
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Staff Alert Dialog */}
        {role === "admin" && selectedUser && (
          <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you sure you want to delete this staff member?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone and will permanently delete the
                  staff member, their user account, and all related attendance records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-500 flex items-center space-x-2 hover:bg-red-400" 
                  onClick={handleDeleteStaff}
                >
                  <Trash2 className="h-4 w-4 text-white" />
                  <span className="text-white">Delete</span>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );

  };

export default Attendance;

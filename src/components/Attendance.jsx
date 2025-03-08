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
  Save,
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
  getDay,
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
import toast, { Toaster } from "react-hot-toast";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import AttendanceBadge from "./AttendanceBadge";
import OffDaysManager from "./OffDaysManager";
import ShiftManager from "./ShiftManager";

// Helper: Parse time string into a Date object.
const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const Attendance = ({ userId }) => {
  // State for attendance and user data
  const [attendanceData, setAttendanceData] = useState([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [present, setPresent] = useState(0);
  const [absent, setAbsent] = useState(0);
  const [late, setLate] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);

  // States for adding new staff
  const [newName, setNewName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newShift, setNewShift] = useState("");

  // States for editing staff details
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    department: "",
    position: "",
    username: "",
    role: "user",
    password: "",
    shift_id: "",
  });

  // Sheet state for Add Staff (converted from Dialog)
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  // Other states
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, "MMMM yyyy");
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [shifts, setShifts] = useState([]);

  const navigate = useNavigate();

  // Default office times
  const officeStartTime = "10:00";
  const lateThreshold = "10:15";

  // -------------------------
  // FETCH USER DETAILS & SHIFTS
  // -------------------------
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const { data: userData, error } = await supabase
          .from("users")
          .select("role, organization_id")
          .eq("id", userId)
          .single();

        if (error) throw error;
        if (userData) {
          setUserRole(userData.role);
          setOrganizationId(userData.organization_id);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        toast.error("Failed to fetch user details");
      }
    };

    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  useEffect(() => {
    if (organizationId) {
      fetchShifts();
    }
  }, [organizationId]);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("created_at", { ascending: true }); // Order by created_at for consistency
  
      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      toast.error("Failed to fetch shifts");
    }
  };
  

  // -------------------------
  // ATTENDANCE FETCH & PROCESSING
  // -------------------------
  useEffect(() => {
    if (userRole && organizationId) {
      fetchAttendanceDataForMonth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, userRole, organizationId]);

  // Helper: Format time string into "hh:mm a"
  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    const [hour, minute] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute);
    return format(date, "hh:mm a");
  };

  // Helper: Check if a given date is an off day (using weekday or specific date)
  const isOffDay = async (date, organizationId) => {
    const dayOfWeek = getDay(date);
    const dateStr = format(date, "yyyy-MM-dd");

    try {
      const { data, error } = await supabase
        .from("off_days")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .or(`weekday.eq.${dayOfWeek},specific_date.eq.${dateStr}`);

      if (error) throw error;
      return data.length > 0;
    } catch (error) {
      console.error("Error checking off day:", error);
      return false;
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchShifts();
  
      const shiftChannel = supabase
        .channel(`shifts-realtime-${organizationId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shifts", filter: `organization_id=eq.${organizationId}` },
          (payload) => {
            console.log("Shift Change Detected:", payload);
            fetchShifts(); // Fetch latest shifts on any insert, update, or delete
          }
        )
        .subscribe();
  
      return () => {
        supabase.removeChannel(shiftChannel);
      };
    }
  }, [organizationId]);
  

  const fetchAttendanceDataForMonth = async () => {
    if (!userId || !userRole || !organizationId) {
      console.error("Missing required data:", { userId, userRole, organizationId });
      return;
    }
  
    const [month, year] = selectedMonth.split(" ");
    const firstDay = startOfMonth(new Date(`${month} 1, ${year}`));
    const lastDay = endOfMonth(firstDay);
    const today = new Date();
    const lastRelevantDay = min([lastDay, today]);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastRelevantDay });
  
    try {
      // Step 1: Fetch users with their shift information
      let usersQuery = supabase
        .from("users")
        .select(
          `
          id,
          name,
          department,
          position,
          username,
          role,
          shift_id,
          shifts (
            id,
            name,
            check_in_time,
            check_out_time,
            late_threshold_minutes
          )
        `
        )
        .eq("show", true)
        .eq("organization_id", organizationId);
  
      if (userRole === "user") {
        usersQuery = usersQuery.eq("id", userId);
      } else if (userRole === "admin") {
        usersQuery = usersQuery.neq("role", "superadmin");
      }
  
      const { data: usersData, error: usersError } = await usersQuery;
      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }
  
      // Step 2: Fetch attendance data
      let attendanceQuery = supabase
        .from("attendance")
        .select("user_id, date, check_in, check_out")
        .gte("date", format(firstDay, "yyyy-MM-dd"))
        .lte("date", format(lastRelevantDay, "yyyy-MM-dd"));
  
      if (userRole === "user") {
        attendanceQuery = attendanceQuery.eq("user_id", userId);
      }
  
      const { data: attendanceData, error: attendanceError } = await attendanceQuery;
      if (attendanceError) {
        console.error("Error fetching attendance:", attendanceError);
        throw attendanceError;
      }
  
      // Step 3: Process user data into a map for quick lookup
      const userMap = usersData.reduce((acc, user) => {
        acc[user.id] = {
          id: user.id,
          name: user.name,
          department: user.department,
          position: user.position,
          username: user.username,
          role: user.role,
          shift: user.shifts,
          daysPresent: 0,
          daysLate: 0,
          daysAbsent: 0,
          totalCheckInTime: 0,
          checkInCount: 0,
          status: "Absent",
          checkIn: "-",
          checkOut: "-",
          averageCheckIn: "-",
        };
        return acc;
      }, {});
  
      // Step 4: Process attendance for each day
      for (const day of daysInMonth) {
        const isOff = await isOffDay(day, organizationId);
        if (!isOff) {
          const dayAttendance = attendanceData.filter((record) =>
            isSameDay(parseISO(record.date), day)
          );
  
          usersData.forEach((user) => {
            const userDayAttendance = dayAttendance.filter(
              (record) => record.user_id === user.id
            );
  
            if (userDayAttendance.length > 0) {
              const checkInTime = userDayAttendance[0].check_in;
              const checkOutTime =
                userDayAttendance[userDayAttendance.length - 1].check_out;
  
              const formattedCheckIn = formatTime(checkInTime);
              const formattedCheckOut = formatTime(checkOutTime);
  
              let status = "Absent";
              if (checkInTime) {
                const shift = user.shifts;
                if (shift) {
                  const shiftStart = shift.check_in_time;
                  // Calculate the allowed late check-in time using the shift's late threshold
                  const allowedLateTime = new Date(
                    parseTime(shiftStart).getTime() +
                      shift.late_threshold_minutes * 60000
                  )
                    .toTimeString()
                    .slice(0, 5);
                  status = checkInTime <= allowedLateTime ? "Present" : "Late";
                } else {
                  // Use default times if no shift is assigned
                  status = checkInTime <= lateThreshold ? "Present" : "Late";
                }
                
                // Add check-in time to total for calculating average
                if (checkInTime) {
                  const checkInMinutes = convertTimeToMinutes(checkInTime);
                  userMap[user.id].totalCheckInTime += checkInMinutes;
                  userMap[user.id].checkInCount += 1;
                }
              }
  
              // Update statistics
              if (status !== "Absent") {
                userMap[user.id].daysPresent += 1;
                if (status === "Late") {
                  userMap[user.id].daysLate += 1;
                }
              } else {
                userMap[user.id].daysAbsent += 1;
              }
  
              // Update today's status if applicable
              if (isSameDay(day, new Date()) && (userRole === "admin" || user.id === userId)) {
                userMap[user.id].status = status;
                userMap[user.id].checkIn = formattedCheckIn;
                userMap[user.id].checkOut = formattedCheckOut;
              }
            } else {
              userMap[user.id].daysAbsent += 1;
            }
          });
        }
      }
  
      // Step 5: Calculate average check-in time for each user
      Object.values(userMap).forEach(user => {
        if (user.checkInCount > 0) {
          const avgMinutes = Math.round(user.totalCheckInTime / user.checkInCount);
          user.averageCheckIn = formatMinutesToTime(avgMinutes);
        }
      });
  
      // Step 6: Update state with processed data
      const userList = Object.values(userMap);
      setAttendanceData(userList);
      setTotalStaff(userRole === "admin" ? usersData.length : 1);
      setPresent(userList.filter((u) => u.status === "Present").length);
      setLate(userList.filter((u) => u.status === "Late").length);
      setAbsent(userList.filter((u) => u.status === "Absent").length);
    } catch (error) {
      console.error("Detailed error in fetchAttendanceDataForMonth:", error);
      toast.error(`Failed to fetch attendance data: ${error.message}`);
    }
  };
  
  // Add these helper functions if they aren't already present
  // Convert "HH:mm" to total minutes 
  const convertTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hour, minute] = timeStr.split(":").map(Number);
    return hour * 60 + minute;
  };
  
  // Format total minutes back to "hh:mm a"
  const formatMinutesToTime = (totalMinutes) => {
    if (isNaN(totalMinutes) || totalMinutes === 0) return "-";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const date = new Date();
    date.setHours(hours, minutes);
    return format(date, "hh:mm a");
  };

  // -------------------------
  // HANDLERS: ADD, EDIT & DELETE STAFF
  // -------------------------
  const handleAddStaff = async () => {
    if (!userRole || userRole !== "admin") {
      toast.error("Unauthorized action");
      return;
    }

    if (
      newName.trim() &&
      newDepartment.trim() &&
      newPosition.trim() &&
      newUsername.trim() &&
      newPassword.trim()
    ) {
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .insert([
            {
              username: newUsername.trim(),
              password: newPassword.trim(),
              role: newRole,
              name: newName.trim(),
              department: newDepartment.trim(),
              position: newPosition.trim(),
              shift_id: newShift || null,
              show: true,
              organization_id: organizationId,
            },
          ])
          .select()
          .single();

        if (userError) throw userError;

        // Reset form fields and close the sheet
        setNewName("");
        setNewDepartment("");
        setNewPosition("");
        setNewUsername("");
        setNewPassword("");
        setNewRole("user");
        setNewShift("");
        setIsAddSheetOpen(false);

        fetchAttendanceDataForMonth();
        toast.success("Staff added successfully! 🎉");
      } catch (error) {
        console.error("Error adding new staff:", error);
        toast.error("Failed to add new staff");
      }
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handleEdit = async () => {
    if (!userRole || userRole !== "admin") {
      toast.error("Unauthorized action");
      return;
    }
  
    try {
      const { error } = await supabase
        .from("users")
        .update({
          name: editForm.name,
          department: editForm.department,
          position: editForm.position,
          username: editForm.username,
          role: editForm.role,
          // Convert shift_id to an integer if it is not "none", otherwise set it to null
          shift_id:
            editForm.shift_id === "none" || editForm.shift_id === undefined
              ? null
              : parseInt(editForm.shift_id, 10),
          password: editForm.password || undefined,
        })
        .eq("id", editingUser.id)
        .eq("organization_id", organizationId);
  
      if (error) throw error;
  
      setIsEditSheetOpen(false);
      fetchAttendanceDataForMonth();
      toast.success("User details updated successfully! ✏️");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user details");
    }
  };
  

  const handleDeleteStaff = async () => {
    if (!userRole || userRole !== "admin") {
      toast.error("Unauthorized action");
      return;
    }

    if (selectedUser && selectedUser.role === "superadmin") {
      toast.error("Cannot delete superadmin users");
      return;
    }

    try {
      const { error: attendanceError } = await supabase
        .from("attendance")
        .delete()
        .eq("user_id", selectedUser.id);

      if (attendanceError) throw attendanceError;

      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", selectedUser.id)
        .eq("organization_id", organizationId);

      if (userError) throw userError;

      setSelectedUser(null);
      fetchAttendanceDataForMonth();
      toast.success("Staff deleted successfully! 🗑️");
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error("Failed to delete staff member");
    }
  };

  const openEditSheet = (user) => {
    if (userRole !== "admin") {
      toast.error("Unauthorized action");
      return;
    }

    if (user.role === "superadmin") {
      toast.error("Cannot edit superadmin users");
      return;
    }

    setEditingUser(user);
    setEditForm({
      name: user.name,
      department: user.department,
      position: user.position,
      username: user.username,
      role: user.role,
      password: "",
      shift_id: user.shift ? user.shift.id.toString() : "none",
    });
    setIsEditSheetOpen(true);
  };

  const openDeleteDialog = (user) => {
    if (userRole !== "admin") {
      toast.error("Unauthorized action");
      return;
    }

    if (user.role === "superadmin") {
      toast.error("Cannot delete superadmin users");
      return;
    }

    setSelectedUser(user);
  };

  const handleViewReport = (userId) => {
    navigate(`/home/attendance/${userId}`);
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

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <div className="h-auto relative">
      <Toaster position="bottom-center" reverseOrder={false} />

      <div className="flex justify-between items-center">
        <div className="flex space-x-5 mb-4">
          <AlertNotification />
        </div>
      </div>

      {userRole === "admin" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStaff}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{present}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{late}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{absent}</div>
            </CardContent>
          </Card>
        </div>
      )}

<Card className="bg-gray-50  ">
  <CardHeader>

  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
    {/* Left Section */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center w-full sm:w-auto">
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-full sm:w-[160px]">
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

      {userRole === "admin" && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Input
            id="search"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[200px]"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <OffDaysManager 
            className="w-full sm:w-auto"
              organizationId={organizationId} 
              userId={userId} 
              userRole={userRole} 
            />
            <ShiftManager 
              organizationId={organizationId} 
              userId={userId} 
              userRole={userRole} 
            />
          </div>
        </div>
      )}
    </div>

    {/* Right Section */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {userRole === "admin" && (
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setIsAddSheetOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      )}

      <div className="w-full sm:w-auto">
        <DownloadPDFButton
     
          data={filteredAttendanceData}
          selectedMonth={selectedMonth}
          role={userRole}
          userId={userId}
        />
      </div>
    </div>
  </div>

  </CardHeader>

        <CardContent>
          <Table className="bg-white rounded-xl">
            <TableHeader>
              <TableRow className="hover:bg-white">
                <TableCell>Name</TableCell>
                <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Days Present</TableCell>
                <TableCell>Days Absent</TableCell>
                <TableCell>Days Late</TableCell>
                <TableCell>Avg Check-in</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendanceData.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <TableCell className="font-medium flex items-center space-x-2">
                    {user.name}
                    {user.role === "admin" && (
                      <Badge variant="outline" className="ml-2">
                        Admin
                      </Badge>
                    )}
                    {user.role === "superadmin" && (
                      <Badge variant="default" className="ml-2">
                        Super Admin
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.checkIn}</TableCell>
                  <TableCell>{user.checkOut}</TableCell>
                  <TableCell>
                    <AttendanceBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    {user.daysPresent}
                  </TableCell>
                  <TableCell className="text-center">
                    {user.daysAbsent}
                  </TableCell>
                  <TableCell className="text-center">
                    {user.daysLate}
                  </TableCell>
                  <TableCell>{user.averageCheckIn}</TableCell>
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

                        {userRole === "admin" &&
                          user.role !== "superadmin" && (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer font-medium flex items-center space-x-2"
                                onClick={() => openEditSheet(user)}
                              >
                                <Save className="h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer font-medium flex items-center space-x-2 text-red-600"
                                onClick={() => openDeleteDialog(user)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                                <span>Delete</span>
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

      {/* -------------------------
          Add Staff Sheet
      ------------------------- */}
      <AnimatePresence>
        {isAddSheetOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full sm:w-96 p-6 overflow-auto h-full"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add New Staff</h2>
                <button
                  onClick={() => setIsAddSheetOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddStaff();
                }}
              >
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

                {/* Shift Selection */}
                <div className="mb-4">
                  <Label htmlFor="new-shift">Shift</Label>
                  <Select
                    value={newShift || "none"}
                    onValueChange={(value) => setNewShift(value === "none" ? null : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Shift (Default)</SelectItem>
                      {shifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id.toString()}>
                          {shift.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                {/* Role Selection */}
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

                <Button type="submit" className="w-full flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Staff</span>
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------
          Edit Staff Sheet
      ------------------------- */}
      <AnimatePresence>
        {isEditSheetOpen && editingUser && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full sm:w-96 p-6 overflow-auto h-full"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Staff Details</h2>
                <button
                  onClick={() => setIsEditSheetOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEdit();
                }}
              >
                <div className="mb-4">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="mb-4">
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm({ ...editForm, department: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="mb-4">
                  <Label htmlFor="edit-position">Position</Label>
                  <Input
                    id="edit-position"
                    value={editForm.position}
                    onChange={(e) =>
                      setEditForm({ ...editForm, position: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="mb-4">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="mb-4">
                  <Label htmlFor="edit-password">Password</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    placeholder="Enter new password (leave empty to keep current)"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                  />
                </div>

                <div className="mb-4">
                  <Label htmlFor="edit-shift">Shift</Label>
                  <Select
                    value={editForm.shift_id || "none"}
                    onValueChange={(value) => setEditForm({ ...editForm, shift_id: value === "none" ? null : value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Shift (Default)</SelectItem>
                      {shifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id.toString()}>
                          {shift.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                <div className="mb-4">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full mb-2">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsEditSheetOpen(false)}
                >
                  Cancel
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      {selectedUser && (
        <AlertDialog
          open={Boolean(selectedUser)}
          onOpenChange={(open) => {
            if (!open) setSelectedUser(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedUser.name}? This action cannot be undone
                and will permanently delete all associated attendance records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDeleteStaff}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default Attendance;

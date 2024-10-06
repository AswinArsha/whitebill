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
} from "lucide-react";
import { supabase } from "../supabase";
import { Input } from "@/components/ui/input";
import NotificationDropdown from "./NotificationDropdown";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import ProfileDropdown from "./ProfileDropdown";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Attendance = ({ role }) => {
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

  // State for editing staff
  const [selectedUser, setSelectedUser] = useState(null); // To hold user data
  const [isLoading, setIsLoading] = useState(false); // Loading state

  // Dialog states
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'MMMM yyyy');
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  const navigate = useNavigate();

  const officeStartTime = "10:00";
  const lateThreshold = "10:10";

  useEffect(() => {
    fetchAttendanceDataForMonth();
  }, [selectedMonth]);

  const fetchAttendanceDataForMonth = async () => {
    const [month, year] = selectedMonth.split(" ");
    const firstDay = startOfMonth(new Date(`${month} 1, ${year}`));
    const lastDay = endOfMonth(firstDay);
    const today = new Date();
    const lastRelevantDay = min([lastDay, today]);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastRelevantDay });

    try {
      // Fetch users who are marked to show in the UI
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("show", true); // Only fetch users with 'show = true'
      if (usersError) throw usersError;

      // Fetch attendance data for the selected month
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("user_id, date, time")
        .gte("date", format(firstDay, "yyyy-MM-dd"))
        .lte("date", format(lastRelevantDay, "yyyy-MM-dd"));
      if (attendanceError) throw attendanceError;

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

            if (isSameDay(day, today)) {
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
      setTotalStaff(usersData.length);
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
      } catch (error) {
        console.error("Error adding new staff:", error);
        alert("Failed to add new staff. Please try again.");
      }
    } else {
      alert("Please fill in all fields.");
    }
  };

  const handleEditStaff = async () => {
    if (
      selectedUser?.name?.trim() &&
      selectedUser?.department?.trim() &&
      selectedUser?.position?.trim() &&
      selectedUser?.username?.trim()
    ) {
      try {
        // Prepare update data
        const updateData = {
          username: selectedUser.username.trim(),
          role: selectedUser.role,
          name: selectedUser.name.trim(),
          department: selectedUser.department.trim(),
          position: selectedUser.position.trim(),
        };

        if (selectedUser.password?.trim()) {
          updateData.password = selectedUser.password.trim(); // Consider hashing
        }

        // Update users table
        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", selectedUser.id);

        if (updateError) throw updateError;

        // Close edit dialog
        setIsEditDialogOpen(false);
        setSelectedUser(null);

        // Refresh attendance data
        fetchAttendanceDataForMonth();
      } catch (error) {
        console.error("Error editing staff:", error);
        alert("Failed to edit staff. Please try again.");
      }
    } else {
      alert("Please fill in all required fields.");
    }
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
      } catch (error) {
        console.error("Error deleting staff and related records:", error);
        alert("Failed to delete staff member. Please try again.");
      }
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user); // Set the selected user's full details
    setIsEditDialogOpen(true); // Open the edit dialog
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

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center ">
        <h1 className="text-2xl font-bold ml-2 md:-ml-0">Attendance Report</h1>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-5 mb-4">
            <ProfileDropdown />
            <AlertNotification />
            <NotificationDropdown />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
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

      {/* Attendance Details Table */}
      <Card>
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
              <Input
                id="search"
                placeholder="Enter user name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[200px]"
              />

              {/* Conditionally render "Add Staff" button for admin */}
              {role === "admin" && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Add Staff</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Staff</DialogTitle>
                      <DialogDescription>
                        Fill in the details of the new staff member.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddStaff(); }}>
                      {/* Form content */}
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {/* Download PDF Button */}
              <DownloadPDFButton
                data={filteredAttendanceData}
                selectedMonth={selectedMonth}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Days Present</TableHead>
                <TableHead>Days Absent</TableHead>
                <TableHead>Days Late</TableHead>
                <TableHead>Avg Check-in</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendanceData.map((user) => (
                <TableRow key={user.id} className="cursor-pointer hover:bg-gray-100">
                  <TableCell className="font-medium">{user.name}</TableCell>
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
                          className="cursor-pointer font-medium"
                          onClick={() => handleViewReport(user.id)}
                        >
                          View
                        </DropdownMenuItem>

                        {/* Conditionally render "Edit" and "Delete" buttons for admin */}
                        {role === "admin" && (
                          <>
                            <DropdownMenuItem
                              className="cursor-pointer font-medium"
                              onClick={() => openEditDialog(user)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer font-medium"
                              onClick={() => openDeleteDialog(user)}
                            >
                              Delete
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

        {/* Edit Staff Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Staff</DialogTitle>
              <DialogDescription>
                Update the details of the staff member.
              </DialogDescription>
            </DialogHeader>

            {selectedUser ? (
              <form onSubmit={(e) => { e.preventDefault(); handleEditStaff(); }}>
                {/* Name */}
                <div className="mb-4">
                  <Label htmlFor="edit-name" className="block mb-1">
                    Name
                  </Label>
                  <Input
                    id="edit-name"
                    placeholder="Enter name"
                    value={selectedUser.name || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, name: e.target.value })
                    }
                  />
                </div>

                {/* Department */}
                <div className="mb-4">
                  <Label htmlFor="edit-department" className="block mb-1">
                    Department
                  </Label>
                  <Input
                    id="edit-department"
                    placeholder="Enter department"
                    value={selectedUser.department || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, department: e.target.value })
                    }
                  />
                </div>

                {/* Position */}
                <div className="mb-4">
                  <Label htmlFor="edit-position" className="block mb-1">
                    Position
                  </Label>
                  <Input
                    id="edit-position"
                    placeholder="Enter position"
                    value={selectedUser.position || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, position: e.target.value })
                    }
                  />
                </div>

                {/* Username */}
                <div className="mb-4">
                  <Label htmlFor="edit-username" className="block mb-1">
                    Username
                  </Label>
                  <Input
                    id="edit-username"
                    placeholder="Enter username"
                    value={selectedUser.username || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, username: e.target.value })
                    }
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
                    value={selectedUser.password || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, password: e.target.value })
                    }
                  />
                </div>

                {/* Role Switch */}
                <div className="flex items-center mb-4">
                  <Switch
                    id="edit-role-switch"
                    checked={selectedUser.role === "admin"}
                    onCheckedChange={(checked) =>
                      setSelectedUser({ ...selectedUser, role: checked ? "admin" : "user" })
                    }
                  />
                  <Label htmlFor="edit-role-switch" className="ml-2">
                    {selectedUser.role === "admin" ? "Admin" : "User"}
                  </Label>
                </div>

                {/* Save Button */}
                <Button className="w-full" type="submit">Save</Button>
              </form>
            ) : (
              <div>Loading...</div> // Show loading indicator while fetching data
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Staff Alert Dialog */}
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
              <AlertDialogAction className="bg-red-500" onClick={handleDeleteStaff}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  export default Attendance;

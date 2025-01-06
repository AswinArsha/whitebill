// IndividualAttendanceReport.jsx

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfMonth, getDay, addDays } from "date-fns";
import { toast } from "react-hot-toast";
import { supabase } from "../supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AlertNotification from "./AlertNotification";
import { Calendar as CalendarIcon, Clock, UserCheck, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import the AttendanceBadge component
import AttendanceBadge from "./AttendanceBadge";

const IndividualAttendanceReport = ({ role, userId }) => {
  const { id } = useParams(); // Get user_id from route parameters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, "MMMM yyyy");
  });
  const [user, setUser] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({
    daysPresent: 0,
    daysAbsent: 0,
    daysLate: 0,
    averageCheckInTime: "-",
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state

  // New state for attendance modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState(false);
  const [checkOutStatus, setCheckOutStatus] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    if (id) {
      fetchUserDetails();
      fetchAttendanceDetails();
    }
  }, [id, selectedMonth]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), "hh:mm a")); // Changed to 12-hour format
    }, 60000);

    setCurrentTime(format(new Date(), "hh:mm a")); // Initialize current time

    return () => clearInterval(timer);
  }, []);

  const fetchUserDetails = async () => {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      console.error("Invalid user ID:", id);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user details:", error);
      setLoading(false);
      return;
    }

    setUser(data);
  };

  const fetchAttendanceDetails = async () => {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      console.error("Invalid user ID:", id);
      setLoading(false);
      return;
    }

    const [month, year] = selectedMonth.split(" ");
    const firstDay = startOfMonth(new Date(`${month} 1, ${year}`));
    const lastDay = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth() + 1,
      0
    );
    const today = new Date(); // Today's date

    const { data, error } = await supabase
      .from("attendance")
      .select("date, check_in, check_out")
      .eq("user_id", userId)
      .gte("date", format(firstDay, "yyyy-MM-dd"))
      .lte("date", format(lastDay, "yyyy-MM-dd"));

    if (error) {
      console.error("Error fetching attendance details:", error);
      setLoading(false);
      return;
    }

    const attendanceMap = {};
    data.forEach((record) => {
      const dateStr = format(parseISO(record.date), "yyyy-MM-dd");
      attendanceMap[dateStr] = {
        check_in: record.check_in,
        check_out: record.check_out,
      };
    });

    const daysInMonth = lastDay.getDate();
    const tempAttendanceData = [];
    let daysPresent = 0;
    let daysAbsent = 0;
    let daysLate = 0;
    let totalCheckInMinutes = 0;
    let checkInCount = 0;

    const tempCalendarData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(
        firstDay.getFullYear(),
        firstDay.getMonth(),
        day
      );
      const dateStr = format(currentDate, "yyyy-MM-dd");

      // Skip future days
      if (currentDate > today) {
        tempCalendarData.push({ date: day, status: "future" });
        continue;
      }

      const record = attendanceMap[dateStr];
      let checkIn = "-";
      let checkOut = "-";
      let status = "Absent";

      if (record && (record.check_in || record.check_out)) {
        checkIn = record.check_in ? formatTime(record.check_in) : "-";
        checkOut = record.check_out ? formatTime(record.check_out) : "-";

        if (record.check_in) {
          if (record.check_in <= "10:15") { // Adjust the threshold as needed
            status = "Present";
          } else {
            status = "Late";
            daysLate += 1;
          }
          daysPresent += 1;

          const checkInMinutes = convertTimeToMinutes(record.check_in);
          totalCheckInMinutes += checkInMinutes;
          checkInCount += 1;
        }
      } else {
        daysAbsent += 1;
      }

      tempAttendanceData.push({
        date: dateStr,
        checkIn,
        checkOut,
        status,
      });

      tempCalendarData.push({
        date: day,
        status: status.toLowerCase(),
      });
    }

    const averageCheckInTime =
      checkInCount > 0
        ? formatMinutesToTime(Math.round(totalCheckInMinutes / checkInCount))
        : "-";

    setAttendanceStats({
      daysPresent,
      daysAbsent,
      daysLate,
      averageCheckInTime,
    });

    const paddedCalendarData = padCalendarWithEmptyDays(
      tempCalendarData,
      firstDay
    );

    setAttendanceData(tempAttendanceData);
    setCalendarData(paddedCalendarData);
    setLoading(false);
  };

  // Helper Functions

  // Format time from "HH:mm" to "hh:mm a"
  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hour, 10), parseInt(minute, 10));
    return format(date, "hh:mm a");
  };

  // Convert "HH:mm" to total minutes
  const convertTimeToMinutes = (timeStr) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    return hour * 60 + minute;
  };

  // Format total minutes back to "hh:mm a"
  const formatMinutesToTime = (totalMinutes) => {
    if (isNaN(totalMinutes)) return "-";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const date = new Date();
    date.setHours(hours, minutes);
    return format(date, "hh:mm a");
  };

  // Pad the calendar with empty days based on the first day of the month
  const padCalendarWithEmptyDays = (calendarData, firstDayOfMonth) => {
    const dayOfWeek = getDay(firstDayOfMonth);
    const paddedData = [];

    // Add padding days for the days before the first day of the month
    for (let i = 0; i < dayOfWeek; i++) {
      paddedData.push({ date: null, status: "empty" });
    }

    return [...paddedData, ...calendarData];
  };

  // Generate month options for the Select component
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      options.push(format(date, "MMMM yyyy"));
    }
    return options;
  };

  // Handle clicking on a date in the calendar
  const handleDateClick = async (day) => {
    if (!day.date || day.status === "future" || day.status === "empty") return;

    const [month, year] = selectedMonth.split(" ");
    const clickedDate = new Date(`${month} ${day.date}, ${year}`);

    // Fetch existing attendance for this date
    const { data: existingAttendance, error } = await supabase
      .from("attendance")
      .select("check_in, check_out")
      .eq("user_id", id)
      .eq("date", format(clickedDate, "yyyy-MM-dd"))
      .single();

    if (error && error.code !== "PGRST116") { // Ignore no rows found error
      console.error("Error fetching attendance for the date:", error);
      toast.error("Failed to fetch attendance data for the selected date.");
      return;
    }

    setCheckInStatus(!!existingAttendance?.check_in);
    setCheckOutStatus(!!existingAttendance?.check_out);
    setSelectedDate(clickedDate);
    setIsModalOpen(true);
  };

  // Handle saving attendance (check-in/check-out)
  const handleSaveAttendance = async () => {
    if (!selectedDate) return;

    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const currentTimeStr = format(new Date(), "HH:mm");

    try {
      // Check if a record exists for this date
      const { data: existingRecord, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", id)
        .eq("date", formattedDate)
        .single();

      if (error && error.code !== "PGRST116") { // Ignore no rows found error
        throw error;
      }

      if (existingRecord) {
        // Update existing record
        const updates = {};
        if (checkInStatus && !existingRecord.check_in) {
          updates.check_in = currentTimeStr;
        }
        if (checkOutStatus && !existingRecord.check_out) {
          updates.check_out = currentTimeStr;
        }

        if (Object.keys(updates).length === 0) {
          toast.info("No changes to save.");
          return;
        }

        const { error: updateError } = await supabase
          .from("attendance")
          .update(updates)
          .eq("id", existingRecord.id);

        if (updateError) throw updateError;
      } else {
        // Create new record
        await supabase
          .from("attendance")
          .insert({
            user_id: id,
            date: formattedDate,
            check_in: checkInStatus ? currentTimeStr : null,
            check_out: checkOutStatus ? currentTimeStr : null,
          });
      }

      toast.success("Attendance updated successfully!");
      setIsModalOpen(false);
      fetchAttendanceDetails(); // Refresh the data
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance.");
    }
  };

  // Render Calendar with Clickable Dates
  const renderCalendar = () => (
    <div className="grid grid-cols-7 gap-2">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div key={day} className="text-center font-medium text-sm">
          {day}
        </div>
      ))}
      {calendarData.map((day, index) => (
        <div
          key={index}
          onClick={() => handleDateClick(day)}
          className={`aspect-square flex items-center justify-center rounded-full text-sm cursor-pointer
            ${
              day.status === "present"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : day.status === "absent"
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                : day.status === "late"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                : day.status === "future"
                ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                : day.status === "empty"
                ? "bg-transparent cursor-default"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
        >
          {day.date}
        </div>
      ))}
    </div>
  );

  // Conditional check to display skeleton loaders if data is still loading
  if (loading || !user) {
    return (
      <div className="container mx-auto p-4">
        {/* Skeleton Loader for Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-8 w-[180px]" />
        </div>

        {/* Skeleton Loader for Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Skeleton className="h-[125px] w-full rounded-xl" />
          <Skeleton className="h-[125px] w-full rounded-xl" />
          <Skeleton className="h-[125px] w-full rounded-xl" />
          <Skeleton className="h-[125px] w-full rounded-xl" />
        </div>

        {/* Skeleton Loader for Calendar */}
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">
            {user.position}, {user.department}
          </p>
          <AlertNotification />
        </div>
        <div className="flex items-center justify-end space-x-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] mt-4 md:mt-0">
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
        </div>
      </div>

      {/* Attendance Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Cards for Days Present, Absent, Late, and Avg Check-in */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Present</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceStats.daysPresent}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Absent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceStats.daysAbsent}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.daysLate}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Check-in</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceStats.averageCheckInTime}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Attendance Calendar */}
        <Card className="h-auto">
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            {renderCalendar()}
          </CardContent>
        </Card>

        {/* Attendance Details Table */}
        <Card className="h-auto">
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-[460px]">
            <Table className="relative">
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(parseISO(record.date), "dd-MM-yyyy")}</TableCell>
                    <TableCell>{record.checkIn}</TableCell>
                    <TableCell>{record.checkOut}</TableCell>
                    <TableCell>
                      <AttendanceBadge status={record.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Update Attendance - {selectedDate ? format(selectedDate, "dd MMMM yyyy") : ""}
            </DialogTitle>
            <DialogDescription>
              Select check-in and/or check-out options for the selected date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="check-in"
                checked={checkInStatus}
                onCheckedChange={(checked) => setCheckInStatus(checked)}
              />
              <label htmlFor="check-in" className="text-sm font-medium">
                Check In
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="check-out"
                checked={checkOutStatus}
                onCheckedChange={(checked) => setCheckOutStatus(checked)}
              />
              <label htmlFor="check-out" className="text-sm font-medium">
                Check Out
              </label>
            </div>
            
            <div className="text-sm text-gray-500">
              Current time: {currentTime}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAttendance}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

};


export default IndividualAttendanceReport;

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
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfMonth, getDay, addDays,endOfMonth ,min ,eachDayOfInterval ,isSameDay } from "date-fns";
import { toast } from "react-hot-toast";
import { supabase } from "../supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AlertNotification from "./AlertNotification";
import { Calendar as CalendarIcon, Clock, UserCheck, AlertTriangle,ArrowLeft  } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import the AttendanceBadge component
import AttendanceBadge from "./AttendanceBadge";

const IndividualAttendanceReport = ({ role, userId: currentUserId }) => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [userShift, setUserShift] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, "MMMM yyyy");
  });
  const [attendanceStats, setAttendanceStats] = useState({
    daysPresent: 0,
    daysAbsent: 0,
    daysLate: 0,
    averageCheckInTime: "-",
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [offDays, setOffDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingOffDays, setIsLoadingOffDays] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState(false);
  const [checkOutStatus, setCheckOutStatus] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const navigate = useNavigate();

  // Fetch user and organization details first
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select(`
            *,
            organizations(*),
            shifts (
              id,
              name,
              check_in_time,
              check_out_time,
              late_threshold_minutes
            )
          `)
          .eq("id", id)
          .single();

        if (userError) throw userError;

        setUser(userData);
        setUserShift(userData.shifts);
        setOrganizationId(userData.organization_id);
      } catch (error) {
        console.error("Error fetching user details:", error);
        toast.error("Failed to fetch user details");
      }
    };

    if (id) {
      fetchUserDetails();
    }
  }, [id]);


  // Fetch off days after we have the organization ID
  useEffect(() => {
    const fetchOffDays = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from('off_days')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (error) throw error;
        setOffDays(data || []);
      } catch (error) {
        console.error('Error fetching off days:', error);
        toast.error('Failed to fetch off days');
      } finally {
        setIsLoadingOffDays(false);
      }
    };

    if (organizationId) {
      fetchOffDays();
    }
  }, [organizationId]);

  // Fetch attendance data after we have both user and off days data
  useEffect(() => {
    if (organizationId && !isLoadingOffDays) {
      fetchAttendanceDetails();
    }
  }, [selectedMonth, organizationId, isLoadingOffDays]);

  const isOffDay = (date) => {
    const dayOfWeek = getDay(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return offDays.some(offDay => 
      (offDay.day_type === 'weekly' && offDay.weekday === dayOfWeek) ||
      (offDay.day_type === 'specific' && offDay.specific_date === dateStr)
    );
  };


  const getAttendanceStatus = (checkInTime, shift) => {
    if (!checkInTime) return "Absent";
    
    if (shift) {
      const shiftStart = shift.check_in_time;
      const lateTime = addMinutes(
        parseTime(shiftStart), 
        shift.late_threshold_minutes
      ).toTimeString().slice(0, 5);
      return checkInTime <= lateTime ? "Present" : "Late";
    } else {
      // Default times if no shift assigned
      return checkInTime <= "10:15" ? "Present" : "Late";
    }
  };

  const fetchAttendanceDetails = async () => {
    if (!id || !organizationId) return;
  
    setLoading(true);
  
    const [month, year] = selectedMonth.split(" ");
    const firstDay = startOfMonth(new Date(`${month} 1, ${year}`));
    const lastDay = endOfMonth(firstDay);
    const today = new Date();
    const lastRelevantDay = min([lastDay, today]);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastRelevantDay });
  
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("date, check_in, check_out")
        .eq("user_id", id)
        .gte("date", format(firstDay, "yyyy-MM-dd"))
        .lte("date", format(lastRelevantDay, "yyyy-MM-dd"));
  
      if (attendanceError) throw attendanceError;
  
      const tempAttendanceData = [];
      let daysPresent = 0;
      let daysAbsent = 0;
      let daysLate = 0;
      let totalCheckInMinutes = 0;
      let checkInCount = 0;
  
      const tempCalendarData = [];
  
      for (const currentDate of daysInMonth) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const dayOff = await isOffDay(currentDate, organizationId);
  
        const dayAttendance = attendanceData.filter(record =>
          isSameDay(parseISO(record.date), currentDate)
        );
  
        let checkIn = "-";
        let checkOut = "-";
        let status = dayOff ? "OffDay" : "Absent";
  
        if (dayAttendance.length > 0) {
          checkIn = dayAttendance[0].check_in ? formatTime(dayAttendance[0].check_in) : "-";
          checkOut = dayAttendance[0].check_out ? formatTime(dayAttendance[0].check_out) : "-";
  
          if (dayAttendance[0].check_in) {
            status = getAttendanceStatus(dayAttendance[0].check_in, userShift);
            
            if (status !== "Absent") {
              daysPresent += 1;
              if (status === "Late") {
                daysLate += 1;
              }
  
              const checkInMinutes = convertTimeToMinutes(dayAttendance[0].check_in);
              totalCheckInMinutes += checkInMinutes;
              checkInCount += 1;
            }
          }
        } else if (!dayOff && currentDate <= today) {
          daysAbsent += 1;
        }
  
        const day = currentDate.getDate();
        
        tempAttendanceData.push({
          date: dateStr,
          checkIn,
          checkOut,
          status,
          isOffDay: dayOff
        });
  
        tempCalendarData.push({
          date: day,
          status: status.toLowerCase(),
          isOffDay: dayOff
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
  
      const paddedCalendarData = padCalendarWithEmptyDays(tempCalendarData, firstDay);
      setAttendanceData(tempAttendanceData);
      setCalendarData(paddedCalendarData);
    } catch (error) {
      console.error("Error fetching attendance details:", error);
      toast.error("Failed to fetch attendance data");
    } finally {
      setLoading(false);
    }
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

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const addMinutes = (date, minutes) => {
    return new Date(date.getTime() + minutes * 60000);
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
    if (!day.date || day.status === "future" || day.status === "empty" || day.isOffDay) return;

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

  const renderAttendanceTable = () => (
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
              {record.isOffDay ? (
                <Badge variant="secondary">
                <span className="sm:hidden">Off</span>
                <span className="hidden sm:inline">Off Day</span>
              </Badge>
              
              ) : (
                <AttendanceBadge status={record.status} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // Handle saving attendance (check-in/check-out)
  const handleSaveAttendance = async () => {
    if (!selectedDate) return;

    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const currentTimeStr = format(new Date(), "HH:mm");

    try {
      const { data: existingRecord, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", id)
        .eq("date", formattedDate)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (existingRecord) {
        const updates = {};
        if (checkInStatus && !existingRecord.check_in) {
          updates.check_in = currentTimeStr;
        }
        if (checkOutStatus && !existingRecord.check_out) {
          updates.check_out = currentTimeStr;
        }

        if (Object.keys(updates).length === 0) {
         
          return;
        }

        const { error: updateError } = await supabase
          .from("attendance")
          .update(updates)
          .eq("id", existingRecord.id);

        if (updateError) throw updateError;
      } else {
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
      fetchAttendanceDetails();
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
              day.status === "empty"
                ? "bg-transparent cursor-default"
                : day.isOffDay
                ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                : day.status === "present"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : day.status === "absent"
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                : day.status === "late"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                : day.status === "future"
                ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
        >
          {day.date}
          {day.isOffDay && (
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-gray-500 rounded-full" />
          )}
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
        <Button
  variant="outline"
  className="mb-4 px-4 py-2 text-sm -mt-10 sm:-mt-22 -ml-2 font-medium flex items-center"
  onClick={() => navigate("/home/attendance")}
>
  <ArrowLeft className="w-5 h-5" /> {/* Adjust icon size */}
  <span>Back</span> {/* Clearer text */}
</Button>
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">
            {user.position}, {user.department}
          </p>
          {userShift && (
            <Badge variant="secondary" className="mt-2">
              {userShift.name} ({formatTime(userShift.check_in_time)} - {formatTime(userShift.check_out_time)})
            </Badge>
          )}
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
            {isLoadingOffDays ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : (
              renderCalendar()
            )}
          </CardContent>
        </Card>

        {/* Attendance Details Table */}
        <Card className="h-auto">
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-[460px]">
            {isLoadingOffDays ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : (
              renderAttendanceTable()
            )}
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


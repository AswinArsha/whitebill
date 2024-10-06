// IndividualAttendanceReport.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, UserCheck, AlertTriangle } from "lucide-react";
import { supabase } from "../supabase";
import { format, parseISO } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

const IndividualAttendanceReport = () => {
  const { id } = useParams(); // Get user_id from route parameters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'MMMM yyyy');
  });
  const [user, setUser] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({
    daysPresent: 0,
    daysAbsent: 0,
    daysLate: 0,
    averageCheckInTime: '-',
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state

  const officeStartTime = "10:10"; // Adjust based on your office start time

  useEffect(() => {
    if (id) {
      fetchUserDetails();
      fetchAttendanceDetails();
    }
  }, [id, selectedMonth]);

  const fetchUserDetails = async () => {
    // Ensure that 'id' is an integer
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      console.error("Invalid user ID:", id);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching user details:", error);
      setLoading(false);
      return;
    }

    setUser(data);
  };

  const fetchAttendanceDetails = async () => {
    // Ensure that 'id' is an integer
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      console.error("Invalid user ID:", id);
      setLoading(false);
      return;
    }

    const [month, year] = selectedMonth.split(' ');
    const firstDay = new Date(`${month} 1, ${year}`);
    const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
    const today = new Date();  // Today's date
  
    const { data, error } = await supabase
      .from('attendance')
      .select('date, time')
      .eq('user_id', userId)
      .gte('date', format(firstDay, 'yyyy-MM-dd'))
      .lte('date', format(lastDay, 'yyyy-MM-dd'));

    if (error) {
      console.error("Error fetching attendance details:", error);
      setLoading(false);
      return;
    }

    // Organize attendance records by date
    const attendanceMap = {};
    data.forEach(record => {
      const dateStr = format(parseISO(record.date), 'yyyy-MM-dd');
      if (!attendanceMap[dateStr]) {
        attendanceMap[dateStr] = [];
      }
      attendanceMap[dateStr].push(record.time);
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
      const currentDate = new Date(firstDay.getFullYear(), firstDay.getMonth(), day);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Skip future days
      if (currentDate > today) {
        tempCalendarData.push({ date: day, status: 'future' });
        continue;
      }

      const records = attendanceMap[dateStr] || [];
      let checkIn = '-';
      let checkOut = '-';
      let status = 'Absent';

      if (records.length > 0) {
        checkIn = formatTime(records[0]);
        checkOut = formatTime(records[records.length - 1]);

        // If the employee checked in after the office start time, they are late
        if (records[0] <= officeStartTime) {
          status = 'Present';
        } else {
          status = 'Late';
          daysLate += 1;
        }

        daysPresent += 1;  // Increment "Present" for both Present and Late days

        const checkInMinutes = convertTimeToMinutes(records[0]);
        totalCheckInMinutes += checkInMinutes;
        checkInCount += 1;
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

    const averageCheckInTime = checkInCount > 0
      ? formatMinutesToTime(Math.round(totalCheckInMinutes / checkInCount))
      : '-';

    setAttendanceStats({
      daysPresent,  // Includes both "Present" and "Late" days
      daysAbsent,
      daysLate,
      averageCheckInTime,
    });

    setAttendanceData(tempAttendanceData);
    setCalendarData(tempCalendarData);
    setLoading(false); // Set loading to false after fetching data
  };

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hour, 10), parseInt(minute, 10));
    return format(date, 'hh:mm a');
  };

  const convertTimeToMinutes = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
  };

  const formatMinutesToTime = (totalMinutes) => {
    if (isNaN(totalMinutes)) return "-";  // Safeguard for invalid values
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const date = new Date();
    date.setHours(hours, minutes);
    return format(date, 'hh:mm a');
  };

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      options.push(format(date, 'MMMM yyyy'));
    }
    return options;
  };

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
        </div>
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

      {/* Attendance Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Present</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.daysPresent}</div>
          </CardContent>
        </Card>
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Absent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.daysAbsent}</div>
          </CardContent>
        </Card>
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.daysLate}</div>
          </CardContent>
        </Card>
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Check-in</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.averageCheckInTime}</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Calendar and Details */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Attendance Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-medium text-sm">{day}</div>
              ))}
              {calendarData.map((day, index) => (
                <div 
                  key={index}
                  className={`aspect-square flex items-center justify-center rounded-full text-sm
                    ${
                      day.status === 'present' ? 'bg-green-100 text-green-800' :
                      day.status === 'absent' ? 'bg-red-100 text-red-800' :
                      day.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100'
                    }`}
                >
                  {day.date}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto h-[85%]"> 
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
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.checkIn}</TableCell>
                    <TableCell>{record.checkOut}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === 'Present' ? 'default' :
                          record.status === 'Late' ? 'warning' :
                          'destructive'
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IndividualAttendanceReport;

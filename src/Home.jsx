import React, { useState, useEffect } from "react";
import { Link, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./components/ui/card";
import { Button } from "./components/ui/button";
import {
  ReceiptText,
  Calendar as CalendarIcon,
  ReceiptIndianRupee,
  Users,
  AlarmClock,
  CheckCircle,
  Menu,
  ClipboardCheck,
} from "lucide-react";
import Billing from "./components/Billing";
import CalendarSection from "./components/CalendarSection";
import MonthlyExpenses from "./components/MonthlyExpenses/MonthlyExpenses";
import Clients from "./components/Clients";
import Ledger from "./components/Ledger";
import Remainders from "./components/Remainders";
import Attendance from "./components/Attendance";
import IndividualAttendanceReport from "./components/IndividualAttendanceReport";
import TaskSection from "./components/TaskSection";
import { supabase } from "./supabase";
import AlertNotification from "./components/AlertNotification";
import ProfileDropdown from "./components/ProfileDropdown";
import NotificationDropdown from "./components/NotificationDropdown";
import MobileNavigation from "./MobileNavigation"; 
import Notes from "./components/Notes";

const Home = ({ role, userId, isAuthenticated }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [unreadTaskCount, setUnreadTaskCount] = useState(0);

  useEffect(() => {
    const checkDeviceSize = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width < 1024);
      setIsMobile(width < 768);
    };

    checkDeviceSize();
    window.addEventListener("resize", checkDeviceSize);

    return () => window.removeEventListener("resize", checkDeviceSize);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadTaskCount();
      subscribeToTaskAssignments();
    }
    return () => {
      supabase.removeAllChannels();
    };
  }, [isAuthenticated]);

  const fetchUnreadTaskCount = async () => {
    try {
      const { count, error } = await supabase
        .from("task_assignments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Error fetching unread task count:", error);
        return;
      }

      setUnreadTaskCount(count);
    } catch (err) {
      console.error("Error fetching unread task count:", err);
    }
  };

  const subscribeToTaskAssignments = () => {
    const channel = supabase
      .channel(`user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignments", filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log("Change received!", payload);
          fetchUnreadTaskCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSidebarClick = () => {
    if (isTablet) setIsCollapsed(!isCollapsed);
  };

  const sidebarVariants = {
    expanded: { width: 180 },
    collapsed: { width: 80 },
  };

  const textVariants = {
    hidden: { opacity: 0, width: 0 },
    visible: { opacity: 1, width: "auto" },
  };

  const transitionSpeed = 0.07;

  const routeNameMap = {
    "/home/calendar": "Calendar",
    "/home/billing": "Billing",
    "/home/monthly-expenses": "Expenses & Income",
    "/home/clients": "Clients",
    "/home/clients/:clientId/ledger": "Ledger",
    "/home/clients/:clientId/notes": "Client Notes", // Add this line
    "/home/remainders": "Remainders",
    "/home/attendance": "Attendance",
    "/home/tasks": "Task Manager",
  };

  const getCurrentSection = () => {
    const path = location.pathname;
    for (const route in routeNameMap) {
      const regex = new RegExp(`^${route.replace(/:\w+/g, '\\w+')}$`);
      if (regex.test(path)) {
        return routeNameMap[route];
      }
    }
    return "";
  };

  const navItems = [
    { path: "calendar", icon: <CalendarIcon className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Calendar" },
    ...(role === "admin" || role === "superadmin"
      ? [
          { path: "billing", icon: <ReceiptText className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Billing" },
          { path: "monthly-expenses", icon: <ReceiptIndianRupee className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Expenses" },
          { path: "clients", icon: <Users className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Clients" },
          { path: "remainders", icon: <AlarmClock className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Remainders" },
        ]
      : []),
    { path: "attendance", icon: <CheckCircle className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Attendance" },
    {
      path: "tasks",
      icon: (
        <div className="relative">
          <ClipboardCheck className="w-6 h-6 -ml-1 flex-shrink-0" />
          {unreadTaskCount > 0 && (
            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
              {unreadTaskCount}
            </span>
          )}
        </div>
      ),
      label: "Tasks",
    },
  ];

  return (
    <div className="flex h-screen relative">
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <motion.div
          className="h-full bg-white shadow-md flex flex-col justify-between fixed z-20"
          animate={isCollapsed ? "collapsed" : "expanded"}
          variants={sidebarVariants}
          initial="collapsed"
          transition={{ duration: transitionSpeed }}
          onMouseEnter={!isTablet ? () => setIsCollapsed(false) : undefined}
          onMouseLeave={!isTablet ? () => setIsCollapsed(true) : undefined}
        >
          <Card className="p-4 flex flex-col h-full">
            <nav className="space-y-4">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  asChild
                  variant="ghost"
                  className={`w-full mt-14 justify-start ${
                    location.pathname === `/home/${item.path}` || location.pathname.startsWith(`/home/${item.path}/`)
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <Link to={`/home/${item.path}`} className="w-full text-left flex items-center space-x-2">
                    {item.icon}
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          variants={textVariants}
                          transition={{ duration: transitionSpeed }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </Button>
              ))}
            </nav>
          </Card>
        </motion.div>
      )}

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation
          role={role}
          unreadTaskCount={unreadTaskCount}
        />
      )}

      {/* Main Content */}
      <div 
        className={`flex-1 p-6 overflow-auto ${
          isMobile ? "pb-20" : "ml-20"
        }`}
      >
        <div className="flex justify-between items-center mb-0 md:mb-2">
          <h1 className="text-2xl font-bold -mb-2 ml-2 md:-ml-0">{getCurrentSection()}</h1>
          <div className="flex space-x-6">
            <NotificationDropdown />
            <ProfileDropdown userId={userId} />
          </div>
        </div>

        <Routes>
          <Route path="billing" element={<Billing role={role} userId={userId} />} />
          <Route path="calendar" element={<CalendarSection role={role} userId={userId} />} />
          <Route path="monthly-expenses" element={<MonthlyExpenses role={role} userId={userId} />} />
          <Route path="clients/*" element={<Clients role={role} userId={userId} />} />
          <Route path="remainders" element={<Remainders role={role} userId={userId} />} />
          <Route path="attendance/*" element={<Attendance role={role} userId={userId} />} />
          <Route path="attendance/:id" element={<IndividualAttendanceReport role={role} userId={userId} />} />
          <Route
            path="tasks"
            element={<TaskSection role={role} userId={userId} onTasksRead={fetchUnreadTaskCount} />}
          />
          <Route path="clients/:clientId/ledger" element={<Ledger role={role} userId={userId} />} />
          <Route path="clients/:clientId/notes" element={<Notes role={role} userId={userId} />} />
          <Route index element={<Navigate to="calendar" />} />
        </Routes>
      </div>
    </div>
  );
};

export default Home;

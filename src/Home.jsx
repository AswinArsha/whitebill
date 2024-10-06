import React, { useState, useEffect } from "react";
import { Link, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ReceiptText,
  Calendar,
  ReceiptIndianRupee,
  Users,
  AlarmClock,
  CheckCircle,
  EllipsisVertical,
} from "lucide-react";
import Billing from "./components/Billing";
import CalendarSection from "./components/CalendarSection";
import MonthlyExpenses from "./components/MonthlyExpenses/MonthlyExpenses";
import Clients from "./components/Clients";
import Remainders from "./components/Remainders";
import Attendance from "./components/Attendance";
import IndividualAttendanceReport from "./components/IndividualAttendanceReport"; 

const Home = ({ role }) => { // Accept role as a prop
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleSidebarClick = () => {
    if (isTablet) setIsCollapsed(!isCollapsed);
  };

  const handleHamburgerClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleIconClick = (path) => {
    if (isMobile) {
      setSidebarOpen(false);
      window.location.pathname = `/home/${path}`;
    }
  };

  const handleOutsideClick = (e) => {
    if (isMobile && sidebarOpen) {
      const sidebar = document.getElementById("sidebar");
      if (sidebar && !sidebar.contains(e.target)) {
        setSidebarOpen(false);
      }
    }
  };

  useEffect(() => {
    if (isMobile) {
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      if (isMobile) {
        document.removeEventListener("touchstart", handleOutsideClick);
      }
    };
  }, [sidebarOpen, isMobile]);

  const sidebarVariants = {
    expanded: { width: isMobile ? 250 : 180 },
    collapsed: { width: isMobile ? 80 : 80 },
  };

  const textVariants = {
    hidden: { opacity: 0, width: 0 },
    visible: { opacity: 1, width: "auto" },
  };

  const transitionSpeed = 0.07;

  // Conditionally render icons based on user role
  const navItems = [
    { path: "calendar", icon: <Calendar className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Calendar" },
    { path: "attendance", icon: <CheckCircle className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Attendance" },
    ...(role === "admin"
      ? [
          { path: "billing", icon: <ReceiptText className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Billing" },
          { path: "monthly-expenses", icon: <ReceiptIndianRupee className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Expenses" },
          { path: "clients", icon: <Users className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Clients" },
          { path: "remainders", icon: <AlarmClock className="w-6 h-6 -ml-1 flex-shrink-0" />, label: "Remainders" },
       
        ]
      : []),
  ];

  return (
    <div className="flex h-screen relative">
      {isMobile && (
        <div className="fixed top-5 z-30">
          <Button variant="outline" className="p-0 rounded-l-none" onClick={handleHamburgerClick}>
            <div className="flex">
              <EllipsisVertical />
            </div>
          </Button>
        </div>
      )}

      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <motion.div
        id="sidebar"
        className={`h-full bg-white shadow-md flex flex-col justify-between absolute z-20 ${isMobile && !sidebarOpen ? "hidden" : ""}`}
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        initial="collapsed"
        transition={{ duration: transitionSpeed }}
        onMouseEnter={!isTablet && !isMobile ? () => setIsCollapsed(false) : undefined}
        onMouseLeave={!isTablet && !isMobile ? () => setIsCollapsed(true) : undefined}
      >
        <Card className="p-4 flex flex-col h-full">
          <nav className="space-y-4">
            {navItems.map((item) => (
              <Button
                key={item.path}
                asChild
                variant="ghost"
                className={`w-full mt-14 justify-start ${location.pathname === `/home/${item.path}` ? "bg-gray-200" : "hover:bg-gray-100"}`}
                onClick={() => handleIconClick(item.path)}
              >
                <Link to={item.path} className="w-full text-left flex items-center space-x-2">
                  {item.icon}
                  <AnimatePresence>
                    {!isCollapsed && !isMobile && (
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

      <div className={`flex-1 p-6 overflow-auto ${isMobile ? "ml-0 " : "ml-20"}`}>
        <Routes>
          <Route path="billing" element={<Billing />} />
          <Route path="calendar" element={<CalendarSection />} />
          <Route path="monthly-expenses" element={<MonthlyExpenses />} />
          <Route path="clients" element={<Clients />} />
          <Route path="remainders" element={<Remainders />} />
          <Route path="attendance" element={<Attendance role={role} />} /> 
          <Route path="attendance/:id" element={<IndividualAttendanceReport />} />
          <Route index element={<Navigate to="calendar" />} />
        </Routes>
      </div>
    </div>
  );
};

export default Home;

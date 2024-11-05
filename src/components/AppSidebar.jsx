// components/AppSidebar.jsx

import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"; // Ensure correct path
import {
  ReceiptText,
  Calendar as CalendarIcon,
  ReceiptIndianRupee,
  Users,
  AlarmClock,
  CheckCircle,
  ClipboardCheck,
  EllipsisVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

const AppSidebar = ({ role, userId, unreadTaskCount }) => {
  const location = useLocation();

  // Define navigation items
  const navItems = [
    {
      title: "Calendar",
      path: "/home/calendar",
      icon: <CalendarIcon className="w-5 h-5" />,
    },
    ...(role === "admin"
      ? [
          {
            title: "Billing",
            path: "/home/billing",
            icon: <ReceiptText className="w-5 h-5" />,
          },
          {
            title: "Expenses & Income",
            path: "/home/monthly-expenses",
            icon: <ReceiptIndianRupee className="w-5 h-5" />,
          },
          {
            title: "Clients",
            path: "/home/clients",
            icon: <Users className="w-5 h-5" />,
          },
          {
            title: "Remainders",
            path: "/home/remainders",
            icon: <AlarmClock className="w-5 h-5" />,
          },
        ]
      : []),
    {
      title: "Attendance",
      path: "/home/attendance",
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      title: "Tasks",
      path: "/home/tasks",
      icon: (
        <div className="relative">
          <ClipboardCheck className="w-5 h-5" />
          {unreadTaskCount > 0 && (
            <span className="absolute -top-1 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
              {unreadTaskCount}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        {/* Sidebar Header */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 py-2 text-xl font-semibold">
              MyApp
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.path} className="flex items-center space-x-3">
                        {item.icon}
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer */}
        <SidebarContent className="mt-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/home/profile" className="flex items-center space-x-3">
                      <EllipsisVertical className="w-5 h-5" />
                      <span className="font-medium">Profile</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};

export default AppSidebar;

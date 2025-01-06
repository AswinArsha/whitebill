// AttendanceBadge.jsx
import React from "react";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  present: {
    label: "Present",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  late: {
    label: "Late",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  absent: {
    label: "Absent",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

const AttendanceBadge = ({ status }) => {
  const config = statusConfig[status.toLowerCase()] || {
    label: "Unknown",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };

  return (
    <Badge
      variant="outline"
      className={`px-2 py-1 rounded-full font-medium ${config.color}`}
    >
      {config.label}
    </Badge>
  );
};

export default AttendanceBadge;

import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { X as CloseIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import notificationSound from "../assets/notification.mp3";

const AlertNotification = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();

    const notificationsSubscription = supabase
      .channel("notifications-alert") // Unique channel name
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" }, // Listen only to INSERT events
        () => {
          fetchNotifications();
          playNotificationSound();
        }
      )
      .subscribe();

    // Optional: Handle page visibility
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(notificationsSubscription);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Fetch notifications that have not been dismissed
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("dismissed", false)
        .gte("created_at", subDays(new Date(), 1).toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Dismiss the alert and update the notification as dismissed in the database
  const dismissAlert = async (id) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ dismissed: true })
        .eq("id", id);

      if (error) throw error;

      // Remove the notification from the state
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== id)
      );
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  };

  // Play sound when a new notification is triggered
  const playNotificationSound = () => {
    const audio = new Audio(notificationSound);
    audio.play();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-4 max-h-80 overflow-y-auto">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="bg-green-100 border border-green-300 text-green-700 p-4 rounded-lg shadow-lg flex justify-between items-center transition-transform transform slide-in"
          style={{ 
            animation: `slideIn 0.5s ease-out ${index * 0.1}s`, // Stagger animation by index
            marginTop: index > 0 ? '8px' : '0' // Slight offset for stacked notifications
          }}
        >
          <div className="flex-1">
            <p className="font-semibold text-lg">{notification.message}</p>
            <p className="text-xs text-gray-500">
              {format(new Date(notification.created_at), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
          <button
            className="ml-4 p-2 rounded-full hover:bg-blue-200"
            onClick={() => dismissAlert(notification.id)}
          >
            <CloseIcon className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertNotification;

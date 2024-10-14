// Remainders.jsx
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/supabase";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { useMediaQuery } from "./hooks/useMediaQuery";

import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar as CalendarIcon,
  Trash2 as TrashIcon,
  Plus,
  Check,
  X,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AlertNotification from "./AlertNotification";

import { useToast } from "@/components/ui/use-toast";

// Define the time zone for India
const timeZone = "Asia/Kolkata";

const Remainders = ({ role, userId }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date()); // Use Date object directly
  const [time, setTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [completedReminders, setCompletedReminders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { toast } = useToast();

  useEffect(() => {
    fetchReminders();

    const remindersSubscription = supabase
      .channel("reminders")
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, () => {
        fetchReminders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(remindersSubscription);
    };
  }, []);

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("completed", false);
    if (error) {
      console.error("Error fetching reminders:", error);
      toast({
        title: "Error",
        description: "Failed to load reminders.",
        variant: "destructive",
      });
    } else {
      setReminders(data);
    }

    const { data: completedData, error: completedError } = await supabase
      .from("reminders")
      .select("*")
      .eq("completed", true);
    if (completedError) {
      console.error("Error fetching completed reminders:", completedError);
      toast({
        title: "Error",
        description: "Failed to load completed reminders.",
        variant: "destructive",
      });
    } else {
      setCompletedReminders(completedData);
    }
  };

  const saveReminder = async () => {
    if (!title || !date || !time) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    // Combine date and time
    const [hours, minutes] = time.split(":").map(Number);
    const reminderDate = new Date(date);
    reminderDate.setHours(hours, minutes, 0, 0);

    // Convert to UTC from the specified time zone
    const reminderDateTimeString = reminderDate.toLocaleString('en-US', { timeZone });
    const reminderDateTime = new Date(reminderDateTimeString);

    const newReminder = {
      title,
      date: reminderDateTime.toISOString(),
      completed: false,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? "monthly" : "none",
    };

    const { data, error } = await supabase.from("reminders").insert([newReminder]);

    if (error) {
      console.error("Error saving reminder:", error);
      toast({
        title: "Error",
        description: "Failed to save reminder.",
        variant: "destructive",
      });
      return;
    }

    if (data && data.length > 0) {
      setTitle("");
      setDate(new Date()); // Reset to current date
      setTime("");
      setIsRecurring(false);
      toast({
        title: "Success",
        description: "Reminder added successfully.",
        variant: "positive",
      });
    } else {
      console.error("No data returned after insert.");
      toast({
        title: "Error",
        description: "Failed to save reminder.",
        variant: "destructive",
      });
    }
    setOpen(false);
  };

  const showNotification = async (reminder) => {
    if (Notification.permission === "granted") {
      console.log("Notification will be triggered:", reminder.title);
      try {
        new Notification("Reminder", {
          body: ` ${reminder.title}`,
          icon: "/path/to/icon.png", // Add an icon if needed
          tag: reminder.id, // Unique identifier for the notification
        });
      } catch (e) {
        console.error("Notification error:", e);
      }
    } else {
      console.warn("Notifications are not permitted in this browser.");
    }
    await addNotification(reminder.title, reminder.id);
  };

  const addNotification = async (message, reminderId) => {
    const newNotification = { message, reminder_id: reminderId, read: false };

    const { data, error } = await supabase.from("notifications").insert([newNotification]);

    if (error) {
      console.error("Error saving notification:", error);
      toast({
        title: "Error",
        description: "Failed to save notification.",
        variant: "destructive",
      });
      return;
    }
  };

  const completeReminder = async (id, reminder) => {
    const { error } = await supabase
      .from("reminders")
      .update({ completed: true })
      .eq("id", id);

    if (error) {
      console.error("Error completing reminder:", error);
      toast({
        title: "Error",
        description: "Failed to complete reminder.",
        variant: "destructive",
      });
      return;
    }

    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
    setCompletedReminders((prev) => [...prev, { ...reminder, completed: true }]);

    toast({
      title: "Reminder Completed",
      description: `${reminder.title} has been marked as completed.`,
      variant: "positive",
    });

    // If the reminder is recurring, create the next occurrence
    if (reminder.is_recurring && reminder.recurrence_interval === "monthly") {
      const reminderDateTime = new Date(reminder.date);
      const nextDate = new Date(reminderDateTime);
      nextDate.setMonth(nextDate.getMonth() + 1);

      const newReminder = {
        title: reminder.title,
        date: nextDate.toISOString(),
        completed: false,
        is_recurring: true,
        recurrence_interval: "monthly",
      };

      const { data: newData, error: newError } = await supabase
        .from("reminders")
        .insert([newReminder]);

      if (newError) {
        console.error("Error creating recurring reminder:", newError);
        toast({
          title: "Error",
          description: "Failed to create recurring reminder.",
          variant: "destructive",
        });
      } else {
        setReminders((prev) => [...prev, ...newData]);
        toast({
          title: "Recurring Reminder",
          description: "Next occurrence has been scheduled.",
          variant: "default",
        });
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      reminders.forEach((reminder) => {
        const reminderTime = new Date(reminder.date);
        if (reminderTime <= now && !reminder.completed) {
          showNotification(reminder);
          completeReminder(reminder.id, reminder);
        }
      });
    }, 1000); // Check every 1 second

    return () => clearInterval(interval);
  }, [reminders]);

  const deleteReminder = async (id) => {
    const { error } = await supabase.from("reminders").delete().eq("id", id);

    if (error) {
      console.error("Error deleting reminder:", error);
      toast({
        title: "Error",
        description: "Failed to delete reminder.",
        variant: "destructive",
      });
      return;
    }

    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
    setCompletedReminders((prev) => prev.filter((reminder) => reminder.id !== id));

    toast({
      title: "Success",
      description: "Reminder deleted successfully.",
      variant: "positive",
    });
  };

  const filteredReminders = reminders.filter((reminder) =>
    reminder.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompletedReminders = completedReminders.filter((reminder) =>
    reminder.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Custom handler to reset form fields when dialog/drawer is closed
  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      // Reset form fields when the dialog opens
      setTitle("");
      setDate(new Date()); // Reset to current date
      setTime("");
      setIsRecurring(false);
    }
    setOpen(isOpen);
  };
  

  return (
    <div className="flex flex-col h-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        {/* Additional header content if needed */}
        <div className="flex space-x-5">
          <AlertNotification />
        </div>
      </div>

      {/* Main Card */}
      <Card className="bg-gray-50 p-6 shadow-none">
        {/* Search and Add Reminder Button */}
        <div className="flex justify-between mb-6">
          <Input
            type="text"
            placeholder="Search Reminders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full mr-4 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isDesktop ? (
            <Dialog open={open} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Reminder</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] bg-white rounded-lg shadow-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-gray-800">
                    Add Reminder
                  </DialogTitle>
                </DialogHeader>
                <AddReminderForm
                  title={title}
                  setTitle={setTitle}
                  date={date}
                  setDate={setDate}
                  time={time}
                  setTime={setTime}
                  isRecurring={isRecurring}
                  setIsRecurring={setIsRecurring}
                  saveReminder={saveReminder}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer open={open} onOpenChange={handleOpenChange}>
              <DrawerTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Reminder</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-white rounded-lg shadow-md">
                <DrawerHeader className="text-left">
                  <DrawerTitle className="text-xl font-semibold text-gray-800">
                    Add Reminder
                  </DrawerTitle>
                </DrawerHeader>
                <div className="p-4">
                  <AddReminderForm
                    title={title}
                    setTitle={setTitle}
                    date={date}
                    setDate={setDate}
                    time={time}
                    setTime={setTime}
                    isRecurring={isRecurring}
                    setIsRecurring={setIsRecurring}
                    saveReminder={saveReminder}
                  />
                </div>
                <DrawerFooter className="pt-2">
                  <DrawerClose asChild>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
        </div>

        {/* Tabs for Upcoming and Completed Reminders */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Reminders</TabsTrigger>
            <TabsTrigger value="completed">Completed Reminders</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <ul className="mt-4">
              {filteredReminders.length > 0 ? (
                filteredReminders
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((reminder) => (
                    <CardContent
                      key={reminder.id}
                      className="mb-2 p-4 shadow-sm rounded-md flex justify-between items-center bg-white"
                    >
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={reminder.completed}
                          onCheckedChange={() => completeReminder(reminder.id, reminder)}
                        />
                        <div>
                          <div className="text-gray-900 text-base font-medium">
                            {reminder.title}
                          </div>
                          <div className="text-gray-600 text-xs">
                            {format(new Date(reminder.date), "dd/MM/yyyy HH:mm")}
                          </div>
                          {reminder.is_recurring && (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-[2px] -ml-1 rounded-full">
                              Recurring Monthly
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" onClick={() => deleteReminder(reminder.id)}>
                        <TrashIcon className="h-5 w-5 text-red-600" />
                      </Button>
                    </CardContent>
                  ))
              ) : (
                <p className="text-center text-gray-500">No upcoming reminders found.</p>
              )}
            </ul>
          </TabsContent>

          <TabsContent value="completed">
            <ul className="mt-4">
              {filteredCompletedReminders.length > 0 ? (
                filteredCompletedReminders
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((reminder) => (
                    <CardContent
                      key={reminder.id}
                      className="mb-2 p-4 shadow-sm rounded-md flex justify-between items-center bg-white"
                    >
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="text-gray-900 text-base font-medium line-through">
                            {reminder.title}
                          </div>
                          <div className="text-gray-600 text-xs">
                            {format(new Date(reminder.date), "dd/MM/yyyy HH:mm")}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" onClick={() => deleteReminder(reminder.id)}>
                        <TrashIcon className="h-5 w-5 text-red-600" />
                      </Button>
                    </CardContent>
                  ))
              ) : (
                <p className="text-center text-gray-500">No completed reminders found.</p>
              )}
            </ul>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

const AddReminderForm = ({
  title,
  setTitle,
  date,
  setDate,
  time,
  setTime,
  isRecurring,
  setIsRecurring,
  saveReminder,
}) => {
  return (
    <div>
      {/* Reminder Title */}
      <div className="mb-4">
        <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Reminder Title
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter reminder title"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Date Picker */}
      <div className="mb-4">
        <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => {
                setDate(selectedDate);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Input */}
      <div className="mb-4">
        <Label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
          Time
        </Label>
        <Input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Recurring Checkbox */}
      <div className="mb-4 flex items-center">
        <Checkbox
          id="recurring"
          checked={isRecurring}
          onCheckedChange={(checked) => setIsRecurring(checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <Label htmlFor="recurring" className="ml-2 block text-sm text-gray-700">
          Repeat Monthly
        </Label>
      </div>

      {/* Save Button */}
      <Button onClick={saveReminder} className="flex items-center space-x-2 w-full text-white ">
        <Check className="h-4 w-4" />
        <span>Save Reminder</span>
      </Button>
    </div>
  );
};

export default Remainders;

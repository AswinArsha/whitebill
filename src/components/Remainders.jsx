
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/supabase";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { useMediaQuery } from "./hooks/useMediaQuery";
import NotificationDropdown from "./NotificationDropdown";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Trash2 as TrashIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AlertNotification from "./AlertNotification";
import ProfileDropdown from "./ProfileDropdown";

const Remainders = () => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(null);
  const [time, setTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [completedReminders, setCompletedReminders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
    const { data, error } = await supabase.from("reminders").select("*").eq("completed", false);
    if (error) console.error("Error fetching reminders:", error);
    else setReminders(data);

    const completedData = await supabase.from("reminders").select("*").eq("completed", true);
    if (completedData.error) console.error("Error fetching completed reminders:", completedData.error);
    else setCompletedReminders(completedData.data);
  };

  const saveReminder = async () => {
    if (!title || !date || !time) {
      alert("Please fill in all fields.");
      return;
    }

    const reminderDateTime = new Date(`${date}T${time}`);
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
      return;
    }

    if (data && data.length > 0) {
      setTitle("");
      setDate(null);
      setTime("");
      setIsRecurring(false);
    } else {
      console.error("No data returned after insert.");
    }
    setOpen(false);
  };

  const showNotification = async (reminder) => {
    if (Notification.permission === "granted") {
      console.log("Notification will be triggered:", reminder.title);
      try {
        new Notification("Reminder", {
          body: ` ${reminder.title}`,
          icon: "path/to/icon.png", // Add an icon if needed
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
      return;
    }
  };

  const completeReminder = async (id, reminder) => {
    const { error } = await supabase.from("reminders").update({ completed: true }).eq("id", id);

    if (error) {
      console.error("Error completing reminder:", error);
      return;
    }

    const completedReminder = reminders.find((r) => r.id === id);
    setCompletedReminders((prev) => [...prev, completedReminder]);

    // If the reminder is recurring, create the next occurrence
    if (reminder.is_recurring && reminder.recurrence_interval === "monthly") {
      const nextDate = new Date(reminder.date);
      nextDate.setMonth(nextDate.getMonth() + 1);

      const newReminder = {
        title: reminder.title,
        date: nextDate.toISOString(),
        completed: false,
        is_recurring: true,
        recurrence_interval: "monthly",
      };

      await supabase.from("reminders").insert([newReminder]);
    }
  };

  const deleteReminder = async (id) => {
    const { error } = await supabase.from("reminders").delete().eq("id", id);

    if (error) {
      console.error("Error deleting reminder:", error);
      return;
    }

    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
    setCompletedReminders((prev) => prev.filter((reminder) => reminder.id !== id));
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
    }, 10000); // Check every 10 seconds
  
    return () => clearInterval(interval);
  }, [reminders]);
  

  const filteredReminders = reminders.filter((reminder) =>
    reminder.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex mb-4 justify-between items-center">
        <h2 className="text-2xl font-bold  ml-2 md:-ml-0">Reminders</h2>
        <div className="flex space-x-5 mb-4">
          <div className="">
            <ProfileDropdown />
          </div>
          <AlertNotification />
          <NotificationDropdown />
        </div>
      </div>
      <Card className="bg-gray-50 p-6 shadow-none">
        <div className="flex justify-between mb-6">
          <Input
            type="text"
            placeholder="Search Reminders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full mr-4 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isDesktop ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="">Add Reminder</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-white rounded-lg shadow-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-gray-800">Add Reminder</DialogTitle>
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
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>
                <Button className="">Add Reminder</Button>
              </DrawerTrigger>
              <DrawerContent className="bg-white rounded-lg shadow-md">
                <DrawerHeader className="text-left">
                  <DrawerTitle className="text-xl font-semibold text-gray-800">Add Reminder</DrawerTitle>
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
                    <Button variant="outline" className="text-lg">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Reminders</TabsTrigger>
            <TabsTrigger value="completed">Completed Reminders</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <ul className="mt-4">
              {filteredReminders.map((reminder) => (
                <CardContent
                  key={reminder.id}
                  className="mb-2 p-4 shadow-sm rounded-md flex justify-between items-center bg-white"
                >
                  <div className="text-gray-900">{reminder.title}</div>
                  <div className="text-gray-600">{format(new Date(reminder.date), "dd/MM/yyyy HH:mm")}</div>
                  <Button variant="ghost" onClick={() => deleteReminder(reminder.id)}>
                    <TrashIcon className="h-5 w-5 text-red-600" />
                  </Button>
                </CardContent>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="completed">
            <ul className="mt-4">
              {completedReminders.map((reminder) => (
                <CardContent
                  key={reminder.id}
                  className="mb-2 p-4 shadow-sm rounded-md flex justify-between items-center bg-white"
                >
                  <div className="text-gray-900">{reminder.title}</div>
                  <div className="text-gray-600">{format(new Date(reminder.date), "dd/MM/yyyy HH:mm")}</div>
                  <Button variant="ghost" onClick={() => deleteReminder(reminder.id)}>
                    <TrashIcon className="h-5 w-5 text-red-600" />
                  </Button>
                </CardContent>
              ))}
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
      <div className="mb-6">
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

      <div className="mb-6">
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
              {date ? format(new Date(date), "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date ? new Date(date) : undefined}
              onSelect={(selectedDate) => {
                const adjustedDate = new Date(selectedDate);
                adjustedDate.setHours(12, 0, 0, 0); // Set to noon to avoid time zone issues
                setDate(adjustedDate.toISOString().split('T')[0]);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mb-6">
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

      <div className="mb-6 ">
        <Label htmlFor="recurring" className="block text-sm font-medium text-gray-700 mb-2">
          Recurring Reminder
        </Label>
        <div className="space-x-2 ">
          <Checkbox
            id="recurring"
            checked={isRecurring}
            onCheckedChange={(checked) => setIsRecurring(checked)}
          />
          <span>Repeat Monthly</span>
        </div>
      </div>

      <Button onClick={saveReminder} className="mt-4 w-full text-white  rounded-md py-2 transition-colors">
        Save Reminder
      </Button>
    </div>
  );
};

export default Remainders;



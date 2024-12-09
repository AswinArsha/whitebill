// CalendarSection.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import MarkAsDone from "./MarkAsDone"; // Ensure the path is correct

import { supabase } from "../supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Menu, Trash2, Plus, Save, Printer } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import AlertNotification from "./AlertNotification";
import jsPDF from "jspdf";

const CATEGORIES = [
  { value: "shoot", label: "Shoot" },
  { value: "meeting", label: "Meeting" },
  { value: "post", label: "Post" },
  { value: "editing", label: "Editing" },
  { value: "ad_campaign", label: "Ad Campaign" },
  { value: "poster_design", label: "Poster Design" },
  { value: "task", label: "Task" }, 
];

const FILTER_CATEGORIES = [{ value: "all", label: "All Categories" }, ...CATEGORIES];

const getCategoryColor = (category, isDone) => {
  if (isDone) return "#4caf50"; // Green for done events
  switch (category) {
    case "shoot":
      return "#f06543";  
    case "meeting":
      return "#0582ca";  
    case "post":
      return "#f48c06"; 
    case "editing":
      return "#9d4edd";  
    case "ad_campaign":
      return "#ad2831";  
    case "poster_design":
      return "#ffc300";  
    case "task":
      return "#335c67";  
    default:
      return "#6c757d";  
  }
};

const CalendarSection = ({ role, userId }) => {
  // Existing state variables
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    id: "",
    title: "",
    description: "",
    start: "",
    end: "",
    location: "",
    category: "",
    allDay: false,
    isDone: false,
    clientName: "",
    assignedUserIds: [], // Using array to store assigned user IDs
  });
  const [mode, setMode] = useState(null); // 'add', 'edit', 'view'
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterClientName, setFilterClientName] = useState(""); // Initialize as empty string
  const [isPrinting, setIsPrinting] = useState(false);
  const [errors, setErrors] = useState({ title: "", category: "" });
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]); // New state for users
  // Removed filterClientPopoverOpen as it's no longer needed
  const calendarRef = useRef(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);

  // Fetch clients (unchanged)
  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("client_name")
      .order("client_name");
    if (error) {
      console.error("Error fetching clients:", error);
    } else {
      setClients(
        data.map((client) => ({
          value: client.client_name,
          label: client.client_name,
        }))
      );
    }
  };

  // Fetch users with show = true (updated function)
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name")
      .eq("show", true) // Filter by 'show' column
      .order("name");

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(
        data.map((user) => ({
          value: user.id,
          label: user.name,
        }))
      );
    }
  };

  useEffect(() => {
    fetchClients();
    fetchUsers(); // Fetch users on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Fetch events (modified to include assigned_user_ids)
  const fetchEvents = useCallback(async () => {
    let query = supabase.from("events").select("*");

    if (role === "user") {
      query = query.contains("assigned_user_ids", [userId]);
    }

    if (searchTerm) {
      query = query.or(
        `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,client_name.ilike.%${searchTerm}%`
      );
    }

    if (filterCategory && filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    if (filterClientName && filterClientName !== "all") { // Updated condition
      query = query.eq("client_name", filterClientName);
    }

    // No longer filtering by assigned_user_ids beyond admin/user roles

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching events:", error);
    } else {
      const formattedEvents = data.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start_time,
        end: event.end_time,
        allDay: event.all_day,
        backgroundColor: getCategoryColor(event.category, event.is_done),
        borderColor: getCategoryColor(event.category, event.is_done),
        extendedProps: {
          description: event.description,
          location: event.location,
          category: event.category,
          isDone: event.is_done,
          clientName: event.client_name,
          assignedUserIds: event.assigned_user_ids, // Include assignedUserIds
        },
      }));
      setEvents(formattedEvents);
    }
  }, [
    role,
    userId,
    searchTerm,
    filterCategory,
    filterClientName,
  ]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle opening the dialog for adding an event
  const handleDateSelect = (selectInfo) => {
    if (role !== "admin") return;
    setMode("add");
    setNewEvent({
      id: "",
      title: "",
      description: "",
      start: selectInfo.startStr,
      end: selectInfo.endStr || selectInfo.startStr,
      location: "",
      category: "",
      allDay: selectInfo.allDay,
      isDone: false,
      clientName: "",
      assignedUserIds: [], // Initialize as empty array
    });
    setIsModalOpen(true);
  };

  // Handle opening the dialog for editing/viewing an event
  const handleEventClick = (clickInfo) => {
    if (role === "admin") {
      setMode("edit");
    } else {
      setMode("view");
    }
    setNewEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      description: clickInfo.event.extendedProps.description,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr || clickInfo.event.startStr,
      location: clickInfo.event.extendedProps.location,
      category: clickInfo.event.extendedProps.category,
      allDay: clickInfo.event.allDay,
      isDone: clickInfo.event.extendedProps.isDone,
      clientName: clickInfo.event.extendedProps.clientName,
      assignedUserIds: clickInfo.event.extendedProps.assignedUserIds || [], // Fetch assigned users
    });
    setIsModalOpen(true);
  };

  // Validation and event handlers remain unchanged
  const validateEvent = () => {
    let isValid = true;
    const newErrors = { title: "", category: "" };
  
    if (mode !== 'view') { // Skip validation in 'view' mode
      if (!newEvent.title) {
        newErrors.title = "Event title is required.";
        isValid = false;
      }
  
      if (!newEvent.category) {
        newErrors.category = "Event category is required.";
        isValid = false;
      }
    }
  
    setErrors(newErrors);
    return isValid;
  };

  const handleEventAddOrUpdate = async () => {
    // In 'view' mode, we only update the 'is_done' status
    if (mode === 'view') {
      const eventToSubmit = {
        is_done: newEvent.isDone,
      };

      const { error } = await supabase
        .from("events")
        .update(eventToSubmit)
        .eq("id", newEvent.id);

      if (error) {
        console.error("Error updating event status:", error);
        toast.error("Failed to update event status. Please try again.");
      } else {
        setEvents((currentEvents) =>
          currentEvents.map((event) =>
            event.id === newEvent.id
              ? {
                  ...event,
                  isDone: newEvent.isDone,
                  backgroundColor: getCategoryColor(
                    event.extendedProps.category,
                    newEvent.isDone
                  ),
                  borderColor: getCategoryColor(
                    event.extendedProps.category,
                    newEvent.isDone
                  ),
                  extendedProps: {
                    ...event.extendedProps,
                    isDone: newEvent.isDone,
                  },
                }
              : event
          )
        );
        setIsModalOpen(false);
        toast.success(
          newEvent.isDone 
            ? "Task completed successfully! 🎉" 
            : "Task marked as incomplete.", 
          { duration: 3000 }
        );
        
      }
      return; // Exit the function after handling 'view' mode
    }

    // Existing logic for 'edit' and 'add' modes
    if (validateEvent()) {
      const eventToSubmit = {
        title: newEvent.title,
        description: newEvent.description,
        start_time: newEvent.allDay
          ? `${newEvent.start}T00:00:00Z`
          : newEvent.start,
        end_time: newEvent.allDay
          ? `${newEvent.end}T23:59:59Z`
          : newEvent.end,
        location: newEvent.location,
        category: newEvent.category,
        all_day: newEvent.allDay,
        is_done: newEvent.isDone, // This value is now updated correctly
        client_name: newEvent.clientName,
        assigned_user_ids: newEvent.assignedUserIds, // Include assignedUserIds
      };

      if (mode === 'edit' && role === "admin") {
        const { error } = await supabase
          .from("events")
          .update(eventToSubmit)
          .eq("id", newEvent.id);

        if (error) {
          console.error("Error updating event:", error);
          toast.error("Failed to update event. Please try again.");
        } else {
          // Update the local state immediately
          setEvents((currentEvents) =>
            currentEvents.map((event) =>
              event.id === newEvent.id
                ? {
                    ...event,
                    ...eventToSubmit,
                    backgroundColor: getCategoryColor(
                      eventToSubmit.category,
                      eventToSubmit.is_done
                    ),
                    borderColor: getCategoryColor(
                      eventToSubmit.category,
                      eventToSubmit.is_done
                    ),
                    extendedProps: {
                      ...event.extendedProps,
                      isDone: eventToSubmit.is_done, // Update the isDone property locally
                      category: eventToSubmit.category,
                      assignedUserIds: eventToSubmit.assigned_user_ids, // Update assignedUserIds
                    },
                  }
                : event
            )
          );
          setIsModalOpen(false);
          toast.success('Event updated successfully! ✏️', {
            duration: 3000,
          });
        }
      } else if (mode === 'add' && role === "admin") {
        const { data, error } = await supabase
          .from("events")
          .insert([eventToSubmit])
          .select();

        if (error) {
          console.error("Error adding event:", error);
          toast.error("Failed to add event. Please try again.");
        } else {
          const newFormattedEvent = {
            id: data[0].id,
            title: data[0].title,
            start: data[0].start_time,
            end: data[0].end_time,
            allDay: data[0].all_day,
            backgroundColor: getCategoryColor(data[0].category, data[0].is_done),
            borderColor: getCategoryColor(data[0].category, data[0].is_done),
            extendedProps: {
              description: data[0].description,
              location: data[0].location,
              category: data[0].category,
              isDone: data[0].is_done,
              clientName: data[0].client_name,
              assignedUserIds: data[0].assigned_user_ids, // Include assignedUserIds
            },
          };
          setEvents((currentEvents) => [...currentEvents, newFormattedEvent]);
          setIsModalOpen(false);
          toast.success('Event added successfully! 🎉', {
            duration: 3000,
          });
        }
      }
    }
  };

  // Handle Event Deletion (unchanged)
  const handleEventDelete = async () => {
    if (mode === 'edit' && role === "admin") {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", newEvent.id);
  
      if (error) {
        console.error("Error deleting event:", error);
        toast.error("Failed to delete event. Please try again.");
      } else {
        setEvents((currentEvents) =>
          currentEvents.filter((event) => event.id !== newEvent.id)
        );
        setIsModalOpen(false);
        toast.success('Event deleted successfully! 🗑️ ', {
          duration: 3000,
          
        });
        
      }
    }
  };

  // Handle Event Drop (unchanged)
  const handleEventDrop = async (dropInfo) => {
    if (role !== "admin") return; // Only admins can move events
    const updatedEvent = {
      id: dropInfo.event.id,
      start_time: dropInfo.event.allDay
        ? `${dropInfo.event.startStr}T00:00:00Z`
        : dropInfo.event.startStr,
      end_time: dropInfo.event.allDay
        ? `${dropInfo.event.endStr || dropInfo.event.startStr}T23:59:59Z`
        : dropInfo.event.endStr || dropInfo.event.startStr,
      all_day: dropInfo.event.allDay,
    };

    const { error } = await supabase
      .from("events")
      .update(updatedEvent)
      .eq("id", updatedEvent.id);

    if (error) {
      console.error("Error updating event timing:", error);
      alert("Failed to update event timing. Please try again.");
    } else {
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === updatedEvent.id
            ? {
                ...event,
                start: updatedEvent.start_time,
                end: updatedEvent.end_time,
                allDay: updatedEvent.all_day,
                backgroundColor: getCategoryColor(
                  event.extendedProps.category,
                  event.extendedProps.isDone
                ),
                borderColor: getCategoryColor(
                  event.extendedProps.category,
                  event.extendedProps.isDone
                ),
                extendedProps: {
                  ...event.extendedProps,
                  start_time: updatedEvent.start_time,
                  end_time: updatedEvent.end_time,
                },
              }
            : event
        )
      );
    }
  };

  // Handle Event Resize (unchanged)
  const handleEventResize = async (resizeInfo) => {
    if (role !== "admin") return; // Only admins can resize events
    const updatedEvent = {
      id: resizeInfo.event.id,
      start_time: resizeInfo.event.allDay
        ? `${resizeInfo.event.startStr}T00:00:00Z`
        : resizeInfo.event.startStr,
      end_time: resizeInfo.event.allDay
        ? `${resizeInfo.event.endStr || resizeInfo.event.startStr}T23:59:59Z`
        : resizeInfo.event.endStr || resizeInfo.event.startStr,
      all_day: resizeInfo.event.allDay,
    };

    const { error } = await supabase
      .from("events")
      .update(updatedEvent)
      .eq("id", updatedEvent.id);

    if (error) {
      console.error("Error updating event resizing:", error);
      alert("Failed to resize event. Please try again.");
    } else {
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === updatedEvent.id
            ? {
                ...event,
                start: updatedEvent.start_time,
                end: updatedEvent.end_time,
                allDay: updatedEvent.all_day,
                backgroundColor: getCategoryColor(
                  event.extendedProps.category,
                  event.extendedProps.isDone
                ),
                borderColor: getCategoryColor(
                  event.extendedProps.category,
                  event.extendedProps.isDone
                ),
                extendedProps: {
                  ...event.extendedProps,
                  start_time: updatedEvent.start_time,
                  end_time: updatedEvent.end_time,
                },
              }
            : event
        )
      );
    }
  };

  // Handle Event Change (unchanged)
  const handleEventChange = async (changeInfo) => {
    if (role !== "admin") return; // Only admins can change event details
    const updatedEvent = {
      id: changeInfo.event.id,
      start_time: changeInfo.event.allDay
        ? `${changeInfo.event.startStr}T00:00:00Z`
        : changeInfo.event.startStr,
      end_time: changeInfo.event.allDay
        ? `${changeInfo.event.endStr || changeInfo.event.startStr}T23:59:59Z`
        : changeInfo.event.endStr || changeInfo.event.startStr,
      all_day: changeInfo.event.allDay,
      category: changeInfo.event.extendedProps.category,
      is_done: changeInfo.event.extendedProps.isDone,
      client_name: changeInfo.event.extendedProps.clientName,
      assigned_user_ids: changeInfo.event.extendedProps.assignedUserIds, // Include assigned_user_ids
    };

    const { error } = await supabase
      .from("events")
      .update(updatedEvent)
      .eq("id", updatedEvent.id);

    if (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    } else {
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === updatedEvent.id
            ? {
                ...event,
                start: updatedEvent.start_time,
                end: updatedEvent.end_time,
                allDay: updatedEvent.all_day,
                backgroundColor: getCategoryColor(
                  updatedEvent.category,
                  updatedEvent.is_done
                ),
                borderColor: getCategoryColor(
                  updatedEvent.category,
                  updatedEvent.is_done
                ),
                extendedProps: {
                  ...event.extendedProps,
                  start_time: updatedEvent.start_time,
                  end_time: updatedEvent.end_time,
                  category: updatedEvent.category,
                  isDone: updatedEvent.is_done,
                  clientName: updatedEvent.client_name,
                  assignedUserIds: updatedEvent.assigned_user_ids, // Update assignedUserIds
                },
              }
            : event
        )
      );
    }
  };

  // PDF Generation (unchanged)
  const generateEnhancedCalendarPDF = () => {
    // ... existing PDF generation code
    // You may want to include assigned users in the PDF if needed
  };

  const triggerPrint = useCallback(() => {
    generateEnhancedCalendarPDF();
  }, [filterClientName, events, currentMonth]);

  const handleMonthChange = (arg) => {
    setCurrentMonth(arg.view.currentStart);
  };

  useEffect(() => {
    if (isPrinting) {
      triggerPrint();
      setIsPrinting(false);
    }
  }, [isPrinting, triggerPrint]);

  // Centralized function to close the dialog and reset state
  const handleCloseDialog = () => {
    setIsModalOpen(false);
    setMode(null);
    setNewEvent({
      id: "",
      title: "",
      description: "",
      start: "",
      end: "",
      location: "",
      category: "",
      allDay: false,
      isDone: false,
      clientName: "",
      assignedUserIds: [], // Reset assignedUserIds
    });
    setErrors({ title: "", category: "" });
  };

  return (
    <div>
      <Toaster position="bottom-center" reverseOrder={false} />
      {/* Custom CSS for FullCalendar popover */}
      <style jsx>{`
        .fc-popover {
          z-index: 1000 !important; /* Set the z-index lower than the dialog's */
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center ">
        <div className="flex space-x-5 mb-4">
          <div>
            {/* Additional header content if needed */}
          </div>
          <AlertNotification />
        </div>
      </div>
      <Card className="bg-gray-50 p-4">
        {/* Mobile: Show a hamburger menu to toggle the filter */}
        <div className="md:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            type="button"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        {/* Filters are hidden on mobile unless the menu is toggled */}
        <div
          className={`md:flex mb-4 space-x-2 ${
            showFilters ? "block" : "hidden"
          } md:block`}
        >
          {/* Search Input */}
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyUp={fetchEvents}
            className="mb-2 md:mb-0"
          />

          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Client Name Filter - Replaced Popover with Select */}
          <Select
            value={filterClientName || "all"}
            onValueChange={(value) => setFilterClientName(value === "all" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all" value="all">
                All Clients
              </SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.value} value={client.value}>
                  {client.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assign To Filter (Optional: If you want to filter by assigned users) */}
          {/* You can implement a similar Select here if needed */}

          {/* Download PDF Button */}
          {role === "admin" && (
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setIsPrinting(true)}
                className="flex items-center space-x-2"
                type="button"
              >
                <Printer className="h-5 w-5 text-white" />
                <span>Print Calendar</span>
              </Button>
            </div>
          )}
        </div>

        {/* Conditionally Render the Dialog */}
        {isModalOpen && (
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            if (!open) {
              handleCloseDialog();
            }
          }}>
            <DialogContent className=" z-[1001] max-w-3xl p-6 bg-white rounded-lg shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold mb-2">
                  {mode === "edit"
                    ? "Edit Event"
                    : mode === "add"
                    ? "Add New Event"
                    : "View Event"}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  {mode === "edit"
                    ? "Update the details of the event."
                    : mode === "add"
                    ? "Fill in the details of the new event."
                    : "View the details of the event and mark it as done."}
                </DialogDescription>
              </DialogHeader>

              {/* Dialog Form */}
              <div className="space-y-6">
                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Event Title */}
                  <div>
                    <Label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Event Title
                    </Label>
                    {mode === "view" ? (
                      <Input
                        id="title"
                        value={newEvent.title}
                        readOnly
                        className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:ring-0 cursor-not-allowed"
                      />
                    ) : (
                      <Input
                        id="title"
                        value={newEvent.title}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, title: e.target.value })
                        }
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    )}
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Client Name */}
                  <div>
                    <Label
                      htmlFor="clientName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Client Name
                    </Label>
                    {mode === "view" ? (
                      <Input
                        id="clientName"
                        value={newEvent.clientName}
                        readOnly
                        className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:ring-0 cursor-not-allowed"
                      />
                    ) : (
                      <Select
                        value={newEvent.clientName || "all"}
                        onValueChange={(value) =>
                          setNewEvent({ ...newEvent, clientName: value === "all" ? "" : value })
                        }
                        required
                        className="mt-1"
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent className="relative z-[1050]">
                          <SelectItem key="all" value="all">
                            All Clients
                          </SelectItem>
                          {clients.map((client) => (
                            <SelectItem
                              key={client.value}
                              value={client.value}
                            >
                              {client.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                {/* Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <Label
                      htmlFor="category"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Category
                    </Label>
                    {mode === "view" ? (
                      <Input
                        id="category"
                        value={newEvent.category}
                        readOnly
                        className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:ring-0 cursor-not-allowed"
                      />
                    ) : (
                      <Select
                        value={newEvent.category}
                        onValueChange={(value) =>
                          setNewEvent({ ...newEvent, category: value })
                        }
                        required
                        className="mt-1"
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="relative z-[1050]">
                          {CATEGORIES.map((category) => (
                            <SelectItem
                              key={category.value}
                              value={category.value}
                            >
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.category}
                      </p>
                    )}
                  </div>
                        {/* Assign To (Updated Section) */}
           
                      {/* Assign To */}
                      <div>
                        <Label
                          htmlFor="assignedUser"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Assign To
                        </Label>
                        {mode === "view" ? (
                          <Input
                            id="assignedUser"
                            value={
                              users
                                .filter(user => newEvent.assignedUserIds.includes(user.value))
                                .map(user => user.label)
                                .join(", ")
                            }
                            readOnly
                            className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:ring-0 cursor-not-allowed"
                          />
                        ) : (
                          <Select
                            value={newEvent.assignedUserIds.length > 0 ? newEvent.assignedUserIds[0].toString() : ""}
                            onValueChange={(value) =>
                              setNewEvent({ ...newEvent, assignedUserIds: value ? [Number(value)] : [] })
                            }
                            className="mt-1"
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 relative z-[1050]">
                              {users.map((user) => (
                                <SelectItem
                                  key={user.value}
                                  value={user.value.toString()}
                                >
                                  {user.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                  
                
                </div>
                {/* Remarks, Location, and Assign To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Remarks */}
                  <div>
                    <Label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Remarks
                    </Label>
                    {mode === "view" ? (
                      <Textarea
                        id="description"
                        value={newEvent.description}
                        readOnly
                        className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:ring-0 cursor-not-allowed"
                      />
                    ) : (
                      <Textarea
                        id="description"
                        value={newEvent.description}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            description: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <Label
                      htmlFor="location"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Location
                    </Label>
                    {mode === "view" ? (
                      <Input
                        id="location"
                        value={newEvent.location}
                        readOnly
                        className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:ring-0 cursor-not-allowed"
                      />
                    ) : (
                      <Input
                        id="location"
                        value={newEvent.location}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            location: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    )}
                  </div>
                </div>

    

                {/* Mark as Done */}
                <MarkAsDone
                  isDone={newEvent.isDone}
                  eventId={newEvent.id}
                  setEvents={setEvents}
                  onMarkDone={() => setNewEvent((prevEvent) => ({ ...prevEvent, isDone: !prevEvent.isDone }))}
                />

              </div>

              {/* Dialog Footer */}
              <DialogFooter className="mt-6 flex justify-end space-x-3">
                {mode === "edit" && role === "admin" && (
                  <Button
                    variant="destructive"
                    onClick={handleEventDelete}
                    className="flex items-center space-x-2 flex-1 md:flex-none"
                    type="button"
                  >
                    <Trash2
                      className="h-4 w-4 text-white"
                      aria-hidden="true"
                    />
                    <span>Delete</span>
                  </Button>
                )}
                <Button
                  onClick={handleEventAddOrUpdate}
                  className="flex items-center space-x-2 flex-1 md:flex-none"
                  type="button"
                >
                  {mode === "edit" ? (
                    <>
                      <Save
                        className="h-4 w-4 text-white"
                        aria-hidden="true"
                      />
                      <span>Update Event</span>
                    </>
                  ) : mode === "add" ? (
                    <>
                      <Plus
                        className="h-4 w-4 text-white"
                        aria-hidden="true"
                      />
                      <span>Add Event</span>
                    </>
                  ) : (
                    <>
                      <Save
                        className="h-4 w-4 text-white"
                        aria-hidden="true"
                      />
                      <span>Update Event</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* FullCalendar Component */}
        <div className="bg-white shadow-none ">
          <FullCalendar
            ref={(element) => (calendarRef.current = element)}
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              listPlugin,
              interactionPlugin,
            ]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listYear",
            }}
            events={events}
            selectable={role === "admin"}
            select={handleDateSelect}
            eventClick={handleEventClick}
            editable={role === "admin"}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventChange={handleEventChange}
            eventResizableFromStart={true}
            aspectRatio={1.5}
            contentHeight="auto"
            timeZone="Asia/Kolkata"
            handleWindowResize={true}
            stickyHeaderDates={true}
            dayMaxEvents={2}
            moreLinkClick="popover"
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              meridiem: "short",
            }}
            dayCellClassNames="border-2 border-gray-300"
            eventClassNames="mb-1 font-semibold"
            dayHeaderClassNames="bg-gray-200 text-gray-700 uppercase"
            datesSet={handleMonthChange}
          />
        </div>
      </Card>
    </div>
  );
};

export default CalendarSection;

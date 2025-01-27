import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import CustomCalendar from "./CustomCalendar";
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
import { Check, ChevronsUpDown, Menu, Trash2, Plus, Save, Printer } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import AlertNotification from "./AlertNotification";
import jsPDF from "jspdf";
import { startOfMonth, endOfMonth } from 'date-fns';

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
    case "shoot": return "#f06543";  
    case "meeting": return "#0582ca";  
    case "post": return "#f48c06"; 
    case "editing": return "#9d4edd";  
    case "ad_campaign": return "#ad2831";  
    case "poster_design": return "#ffc300";  
    case "task": return "#335c67";  
    default: return "#6c757d";  
  }
};

const CalendarSection = ({ role, userId }) => {
  // State variables
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
    assignedUserIds: [],
  });
  const [mode, setMode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterClientName, setFilterClientName] = useState("");
  const [filterAssignedUser, setFilterAssignedUser] = useState("all");
  const [isPrinting, setIsPrinting] = useState(false);
  const [errors, setErrors] = useState({ title: "", category: "" });
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const calendarRef = useRef(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);

  // Fetch clients
  const fetchClients = async () => {
    const { data, error } = await supabase.from("clients").select("client_name").order("client_name");
    if (error) console.error("Error fetching clients:", error);
    else {
      setClients(data.map((client) => ({ value: client.client_name, label: client.client_name })));
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("id, name").eq("show", true).order("name");
    if (error) console.error("Error fetching users:", error);
    else {
      setUsers(data.map((user) => ({ value: user.id, label: user.name })));
    }
  };

  useEffect(() => {
    fetchClients();
    fetchUsers();
  }, [role]);

  // Handler to update currentMonth state
  const handleMonthChange = useCallback((newMonthStartDate) => {
    setCurrentMonth(newMonthStartDate);
  }, []);

  // Fetch events based on the current month without applying additional filters
  const fetchEvents = useCallback(async () => {
    try {
      const rangeStart = startOfMonth(currentMonth).toISOString();
      const rangeEnd = endOfMonth(currentMonth).toISOString();

      let query = supabase
        .from("events")
        .select("*")
        .gte('start_time', rangeStart)
        .lte('start_time', rangeEnd);

      if (role === "user") {
        query = query.contains('assigned_user_ids', [userId]);
      }

      const { data: allEvents, error: baseError } = await query;
      if (baseError) throw baseError;

     

      // Process the fetched events
      const processedEvents = allEvents.map(event => {
        let assignedIds = [];
        if (Array.isArray(event.assigned_user_ids)) {
          assignedIds = event.assigned_user_ids;
        } else if (typeof event.assigned_user_ids === 'string') {
          try {
            assignedIds = JSON.parse(event.assigned_user_ids);
          } catch {
            assignedIds = [];
          }
        }
        return { ...event, assigned_user_ids: assignedIds };
      });

     

      const formattedEvents = processedEvents.map((event) => {
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);

        return {
          id: event.id,
          uniqueKey: `${event.id}-${event.title}`,
          title: event.title || 'No Title',
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          allDay: event.all_day || false,
          backgroundColor: getCategoryColor(event.category, event.is_done) || '#6c757d',
          borderColor: getCategoryColor(event.category, event.is_done) || '#6c757d',
          extendedProps: {
            description: event.description || '',
            location: event.location || '',
            category: event.category || 'unknown',
            isDone: event.is_done || false,
            clientName: event.client_name || 'N/A',
            assignedUserIds: event.assigned_user_ids || [],
          },
        };
      }).filter(event => event !== null);

     

      setEvents(formattedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events. Please try again.");
    }
  }, [role, userId, currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, currentMonth]);

  // Realtime subscription to listen for changes in the events table
  useEffect(() => {
    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
      
          fetchEvents(); // Re-fetch events on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
  const handleEventClick = ({ event }) => {
    if (role === "admin") {
      setMode("edit");
    } else {
      setMode("view");
    }
    setNewEvent({
      id: event.id,
      title: event.title,
      description: event.extendedProps.description,
      start: event.start,                           // Use event.start
      end: event.end || event.start,                // Use event.end or fallback
      location: event.extendedProps.location,
      category: event.extendedProps.category,
      allDay: event.allDay,
      isDone: event.extendedProps.isDone,
      clientName: event.extendedProps.clientName,
      assignedUserIds: event.extendedProps.assignedUserIds || [],
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
              assignedUserIds: data[0].assigned_user_ids,
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
    if (role !== "admin") return;
    
    const updatedEvent = {
      start_time: dropInfo.event.start,
      end_time: dropInfo.event.end,
      all_day: dropInfo.event.allDay
    };
  
    const { error } = await supabase
      .from("events")
      .update(updatedEvent)
      .eq("id", dropInfo.event.id);
  
    if (error) {
      console.error("Error updating event timing:", error);
      toast.error("Failed to update event timing. Please try again.");
    } else {
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === dropInfo.event.id
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
              }
            : event
        )
      );
      toast.success('Event moved successfully! 📅', {
        duration: 3000,
      });
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

  // PDF Generation (unchanged)
  const generateEnhancedCalendarPDF = () => {
    // ... existing PDF generation code
    // You may want to include assigned users in the PDF if needed
  };

  const triggerPrint = useCallback(() => {
    generateEnhancedCalendarPDF();
  }, [filterClientName, events, currentMonth]);

  const handleMonthChangeLocal = (arg) => {
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

  // Client-side Filtering
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Filter by category
      if (filterCategory !== "all" && event.extendedProps.category !== filterCategory) {
        return false;
      }
  
      // Filter by client name
      if (filterClientName && event.extendedProps.clientName !== filterClientName) {
        return false;
      }
  
      // Filter by assigned user
      if (filterAssignedUser !== "all") {
        // Ensure assignedUserIds is an array and convert to strings for comparison
        const assignedUserIds = event.extendedProps.assignedUserIds || [];
        const assignedUserStrings = assignedUserIds.map(id => id.toString());
        
        if (!assignedUserStrings.includes(filterAssignedUser)) {
          return false;
        }
      }
  
      // Search by title (case-insensitive)
      if (searchTerm && 
          !event.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
  
      return true;
    });
  }, [events, filterCategory, filterClientName, filterAssignedUser, searchTerm]);

  useEffect(() => {
  
  }, [filteredEvents]);

  useEffect(() => {
  
  }, [currentMonth]);

  useEffect(() => {
    events.forEach(event => {
     
    });
  }, [events]);

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
            <SelectContent className="h-100 overflow-y-auto relative z-[1050]">
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

          {/* Assign To Filter - New Select Box */}
          {role === "admin" && (
          <Select
            value={filterAssignedUser}
            onValueChange={(value) => setFilterAssignedUser(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Assigned Users" />
            </SelectTrigger>
            <SelectContent className="max-h-80 overflow-y-auto relative z-[1050]">
              <SelectItem key="all" value="all">
                All Assigned Users
              </SelectItem>
              {users.filter(user => user.label.toLowerCase() !== 'admin').map((user) => (
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

          {/* Download PDF Button */}
          {role === "admin" && (
            <div className="flex justify-end mb-4">
              {/* <Button
                onClick={() => setIsPrinting(true)}
                className="flex items-center space-x-2"
                type="button"
              >
                <Printer className="h-5 w-5 text-white" />
                <span>Print Calendar</span>
              </Button> */}
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
            <DialogContent className="z-[1001] w-full sm:max-w-3xl p-4 sm:p-6 bg-white rounded-lg shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-xl  sm:text-2xl font-semibold mb-2">
                  {mode === "edit"
                    ? "Edit Event"
                    : mode === "add"
                    ? "Add New Event"
                    : "View Event"}
                </DialogTitle>
                <DialogDescription className="text-gray-600 text-sm sm:text-base">
                  {mode === "edit"
                    ? "Update the details of the event."
                    : mode === "add"
                    ? "Fill in the details of the new event."
                    : "View the details of the event and mark it as done."}
                </DialogDescription>
              </DialogHeader>

              {/* Dialog Form */}
              <div className="space-y-4 sm:space-y-6">
                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Event Title */}
                  <div>
                    <Label htmlFor="title" className="block text-sm font-medium text-gray-700">
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
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    )}
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                    )}
                  </div>

                  {/* Client Name */}
                  <div>
                    <Label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
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
                        <SelectContent className="max-h-60 overflow-y-auto relative z-[1050]">
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
                    )}
                  </div>
                </div>

                {/* Category and Assign To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Category */}
                  <div>
                    <Label htmlFor="category" className="block text-sm font-medium text-gray-700">
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
                        <SelectContent className="max-h-60 overflow-y-auto relative z-[1050]">
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                    )}
                  </div>

                  {/* Assign To */}
                  <div>
                    <Label htmlFor="assignedUser" className="block text-sm font-medium text-gray-700">
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
                        <SelectContent className="max-h-60 overflow-y-auto relative z-[1050]">
                          {users.filter(user => user.label.toLowerCase() !== 'admin').map((user) => (
                            <SelectItem key={user.value} value={user.value.toString()}>
                              {user.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Remarks and Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Remarks */}
                  <div>
                    <Label htmlFor="description" className="block text-sm font-medium text-gray-700">
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
                    <Label htmlFor="location" className="block text-sm font-medium text-gray-700">
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
                  onMarkDone={() =>
                    setNewEvent((prevEvent) => ({ ...prevEvent, isDone: !prevEvent.isDone }))
                  }
                />
              </div>

              {/* Dialog Footer */}
              <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                {mode === "edit" && role === "admin" && (
                  <Button
                    variant="destructive"
                    onClick={handleEventDelete}
                    className="flex items-center space-x-2 w-full sm:w-auto"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4 text-white" aria-hidden="true" />
                    <span>Delete</span>
                  </Button>
                )}
                <Button
                  onClick={handleEventAddOrUpdate}
                  className="flex items-center space-x-2 w-full sm:w-auto"
                  type="button"
                >
                  {mode === "edit" ? (
                    <>
                      <Save className="h-4 w-4 text-white" aria-hidden="true" />
                      <span>Update Event</span>
                    </>
                  ) : mode === "add" ? (
                    <>
                      <Plus className="h-4 w-4 text-white" aria-hidden="true" />
                      <span>Add Event</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 text-white" aria-hidden="true" />
                      <span>Update Event</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Temporary Event List for Debugging */}
        {/* <div className="mt-6 p-4 bg-white shadow rounded">
          <h2 className="text-lg font-semibold mb-2">Today's Events</h2>
          {filteredEvents.length > 0 ? (
            <ul>
              {filteredEvents.map(event => (
                <li key={event.id} className="mb-2 p-2 border rounded">
                  <span className="font-medium">{event.title}</span> - {new Date(event.start).toLocaleTimeString()} to {new Date(event.end).toLocaleTimeString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No events scheduled for today.</p>
          )}
        </div> */}

        {/* Calendar Component */}
        <div className="bg-white shadow-none ">
          <CustomCalendar
            events={filteredEvents} // Pass filteredEvents
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            onEventDrop={handleEventDrop}
            role={role}
            currentMonth={currentMonth} // Pass currentMonth for dynamic fetching
            onMonthChange={handleMonthChange} // Pass the handler
          />
        </div>
      </Card>
    </div>
  );
};

export default CalendarSection;

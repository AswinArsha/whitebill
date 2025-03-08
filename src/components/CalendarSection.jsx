// CalendarSection.jsx
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
import MarkAsDone from "./MarkAsDone";
import { Switch } from "@/components/ui/switch";
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

// Import the new Category Manager dialog component
import CategoryManagerDialog from "./CategoryManagerDialog";

const CalendarSection = ({ role, userId }) => {
  // -----------------------
  // State variables
  // -----------------------
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    id: "",
    title: "",
    description: "",
    start: "",
    end: "",
    location: "",
    category: "", // Now this will store a category UUID
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

  // NEW: Manage categories loaded from Supabase.
  const [categories, setCategories] = useState([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // -----------------------
  // Helper: Get category color
  // -----------------------
  const getCategoryColor = (categoryId, isDone) => {
    if (isDone) return "#4caf50"; // Green for done events
    // Try to find the category from the loaded list:
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.color : "#6c757d";
  };

  // Helper: Format category label (convert underscores to spaces and capitalize)
  const formatCategoryLabel = (label) => {
    if (!label) return "";
    return label
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // -----------------------
  // Fetch categories from Supabase
  // -----------------------
  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("label");
    if (error) console.error("Error fetching categories:", error);
    else setCategories(data);
  };

  // -----------------------
  // Fetch clients
  // -----------------------
  const fetchClients = async () => {
    const { data, error } = await supabase.from("clients").select("client_name").order("client_name");
    if (error) console.error("Error fetching clients:", error);
    else {
      setClients(data.map((client) => ({ value: client.client_name, label: client.client_name })));
    }
  };

  // -----------------------
  // Fetch users
  // -----------------------
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
    fetchCategories();
  }, [role]);

  // -----------------------
  // Update currentMonth state
  // -----------------------
  const handleMonthChange = useCallback((newMonthStartDate) => {
    setCurrentMonth(newMonthStartDate);
  }, []);

  // -----------------------
  // Fetch events based on the current month (without additional filters)
  // -----------------------
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
  
      // Format events for the calendar with proper timezone handling
      const formattedEvents = processedEvents.map((event) => {
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
  
        return {
          id: event.id,
          uniqueKey: `${event.id}-${event.title}`,
          title: event.title || 'No Title',
          start: startDate.toISOString(), // Keep ISO format for consistent handling
          end: endDate.toISOString(),
          allDay: event.all_day || false,
          backgroundColor: getCategoryColor(event.category, event.is_done) || '#6c757d',
          borderColor: getCategoryColor(event.category, event.is_done) || '#6c757d',
          extendedProps: {
            description: event.description || '',
            location: event.location || '',
            category: event.category || null,
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
  }, [role, userId, currentMonth, categories]);

  const formatToUTCString = (date, isEndTime = false) => {
    if (!date) return null;
    
    // Create a new date object to avoid modifying the original
    const d = new Date(date);
    
    // Create a UTC date to ensure consistent timezone handling
    const utcDate = new Date(
      Date.UTC(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        isEndTime ? 23 : 0, 
        isEndTime ? 59 : 0,
        isEndTime ? 59 : 0
      )
    );
    
    return utcDate.toISOString();
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, currentMonth]);

  // -----------------------
  // Realtime subscription for events table
  // -----------------------
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

  // -----------------------
  // Event Handlers for opening dialogs
  // -----------------------
  const handleDateSelect = (selectInfo) => {
    if (role !== "admin") return;
    setMode("add");
    
    // Create date objects from the selected date, ensuring we preserve the timezone
    const startDate = new Date(selectInfo.startStr);
    const endDate = new Date(selectInfo.endStr || selectInfo.startStr);
    
    setNewEvent({
      id: "",
      title: "",
      description: "",
      start: startDate.toISOString(), // Use ISO format to preserve timezone information
      end: endDate.toISOString(),
      location: "",
      category: "",
      allDay: selectInfo.allDay,
      isDone: false,
      clientName: "",
      assignedUserIds: [],
    });
    setIsModalOpen(true);
  };

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
      start: event.start,
      end: event.end || event.start,
      location: event.extendedProps.location,
      category: event.extendedProps.category, // a UUID
      allDay: event.allDay,
      isDone: event.extendedProps.isDone,
      clientName: event.extendedProps.clientName,
      assignedUserIds: event.extendedProps.assignedUserIds || [],
    });
    setIsModalOpen(true);
  };

  // -----------------------
  // Validate event form (skip in view )
  // -----------------------
  const validateEvent = () => {
    let isValid = true;
    const newErrors = { title: "", category: "" };

    if (mode !== 'view') {
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

  // -----------------------
  // Handle add/update (and view-mode “done” update)
  // -----------------------
  const handleEventAddOrUpdate = async () => {
    if (mode === 'view') {
      const eventToSubmit = { is_done: newEvent.isDone };
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
                  backgroundColor: getCategoryColor(event.extendedProps.category, newEvent.isDone),
                  borderColor: getCategoryColor(event.extendedProps.category, newEvent.isDone),
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
      return;
    }

    if (validateEvent()) {
      // Create properly localized date objects
      const startDate = new Date(newEvent.start);
      const endDate = new Date(newEvent.end);
      
      // Format the dates properly for storage
      let formattedStartTime, formattedEndTime;
      
      if (newEvent.allDay) {
        // For all-day events, set to start of day in UTC
        formattedStartTime = new Date(
          Date.UTC(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(), 
            0, 0, 0
          )
        ).toISOString();
        
        // For all-day events, set to end of day in UTC
        formattedEndTime = new Date(
          Date.UTC(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            23, 59, 59
          )
        ).toISOString();
      } else {
        // For time-specific events, just use the ISO strings directly
        formattedStartTime = startDate.toISOString();
        formattedEndTime = endDate.toISOString();
      }
  
 
      const eventToSubmit = {
        title: newEvent.title,
        description: newEvent.description,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        location: newEvent.location,
        category: newEvent.category,
        all_day: newEvent.allDay,
        is_done: newEvent.isDone,
        client_name: newEvent.clientName,
        assigned_user_ids: newEvent.assignedUserIds,
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
          setEvents((currentEvents) =>
            currentEvents.map((event) =>
              event.id === newEvent.id
                ? {
                    ...event,
                    ...eventToSubmit,
                    backgroundColor: getCategoryColor(eventToSubmit.category, eventToSubmit.is_done),
                    borderColor: getCategoryColor(eventToSubmit.category, eventToSubmit.is_done),
                    extendedProps: {
                      ...event.extendedProps,
                      isDone: eventToSubmit.is_done,
                      category: eventToSubmit.category,
                      assignedUserIds: eventToSubmit.assigned_user_ids,
                    },
                  }
                : event
            )
          );
          setIsModalOpen(false);
          toast.success('Event updated successfully! ✏️', { duration: 3000 });
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
          toast.success('Event added successfully! 🎉', { duration: 3000 });
        }
      }
    }
  };

  // -----------------------
  // Delete event
  // -----------------------
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
        toast.success('Event deleted successfully! 🗑️', { duration: 3000 });
      }
    }
  };

  // -----------------------
  // Event Drop & Resize (unchanged)
  // -----------------------
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
                backgroundColor: getCategoryColor(event.extendedProps.category, event.extendedProps.isDone),
                borderColor: getCategoryColor(event.extendedProps.category, event.extendedProps.isDone),
              }
            : event
        )
      );
      toast.success('Event moved successfully! 📅', { duration: 3000 });
    }
  };

  const handleEventResize = async (resizeInfo) => {
    if (role !== "admin") return;
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
                backgroundColor: getCategoryColor(event.extendedProps.category, event.extendedProps.isDone),
                borderColor: getCategoryColor(event.extendedProps.category, event.extendedProps.isDone),
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

  // -----------------------
  // PDF Generation & Month Change (unchanged)
  // -----------------------
  const generateEnhancedCalendarPDF = () => {
    // ... existing PDF generation code
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

  // -----------------------
  // Close dialog and reset state
  // -----------------------
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
      assignedUserIds: [],
    });
    setErrors({ title: "", category: "" });
  };

  // -----------------------
  // Client-side Filtering
  // -----------------------
  const filterCategories = useMemo(() => {
    return [
      { value: "all", label: "All Categories" },
      ...categories.map(cat => ({
        value: cat.id,
        label: formatCategoryLabel(cat.label)
      }))
    ];
  }, [categories]);

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

  useEffect(() => { }, [filteredEvents]);
  useEffect(() => { }, [currentMonth]);
  useEffect(() => {
    events.forEach(event => { });
  }, [events]);

  return (
    <div>
      <Toaster position="bottom-center" reverseOrder={false} />
      <style jsx>{`
        .fc-popover {
          z-index: 1000 !important;
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center ">
        <div className="flex space-x-5 mb-4">
          <div>{/* Additional header content if needed */}</div>
          <AlertNotification />
        </div>
      </div>
      <Card className="bg-gray-50 p-4">
        {/* Mobile hamburger for filters */}
        <div className="md:hidden mb-4">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} type="button">
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        {/* Filters */}
        <div className={`flex flex-col md:flex-row md:items-center mb-4 space-y-2 md:space-y-0 md:space-x-4 ${showFilters ? "block" : "hidden"} md:flex`}>
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm"
          />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full px-3 py-2 text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {filterCategories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
              <Button
                variant="outline"
                className="flex items-center gap-2 px-4 py-2 w-full"
                onClick={() => setIsCategoryManagerOpen(true)}
              >
                <Plus className="w-5 h-5 text-gray-700" />
                <span className="text-gray-800 font-medium">Add Category</span>
              </Button>
            </SelectContent>
          </Select>
          <Select
            value={filterClientName || "all"}
            onValueChange={(value) => setFilterClientName(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-full px-3 py-2 text-sm">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent className="max-h-80 overflow-y-auto">
              <SelectItem key="all" value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.value} value={client.value}>{client.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {role === "admin" && (
            <Select value={filterAssignedUser} onValueChange={setFilterAssignedUser}>
              <SelectTrigger className="w-full px-3 py-2 text-sm">
                <SelectValue placeholder="All Assigned Users" />
              </SelectTrigger>
              <SelectContent className="max-h-80 overflow-y-auto">
                <SelectItem key="all" value="all">All Assigned Users</SelectItem>
                {users.filter(user => user.label.toLowerCase() !== 'admin').map((user) => (
                  <SelectItem key={user.value} value={user.value.toString()}>{user.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Category Manager Dialog */}
        {isCategoryManagerOpen && (
          <CategoryManagerDialog
            onClose={() => {
              setIsCategoryManagerOpen(false);
              fetchCategories(); // refresh categories
            }}
          />
        )}

        {/* Event Dialog */}
        {isModalOpen && (
          <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
            <DialogContent className="z-[1001] w-full sm:max-w-3xl p-4 sm:p-6 bg-white rounded-lg shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-semibold mb-2">
                  {mode === "edit" ? "Edit Event" : mode === "add" ? "Add New Event" : "View Event"}
                </DialogTitle>
                <DialogDescription className="text-gray-600 text-sm hidden sm:block sm:text-base">
                  {mode === "edit"
                    ? "Update the details of the event."
                    : mode === "add"
                      ? "Fill in the details of the new event."
                      : "View the details of the event and mark it as done."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 sm:space-y-6">
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
                    {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
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
                          <SelectItem key="all" value="all">All Clients</SelectItem>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Category */}
                  <div>
                    <Label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </Label>
                    {mode === "view" ? (
                      <Input
                        id="category"
                        value={formatCategoryLabel(categories.find(c => c.id === newEvent.category)?.label || "")}
                        readOnly
                        className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:ring-0 cursor-not-allowed"
                      />
                    ) : (
                      <div className="flex">
                        <Select
                          value={newEvent.category}
                          onValueChange={(value) =>
                            setNewEvent({ ...newEvent, category: value })
                          }
                          required
                          className="mt-1 flex-1"
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto relative z-[1050]">
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {formatCategoryLabel(cat.label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
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
                          setNewEvent({ ...newEvent, description: e.target.value })
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
                          setNewEvent({ ...newEvent, location: e.target.value })
                        }
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    )}
                  </div>
                </div>

                <MarkAsDone
                  isDone={newEvent.isDone}
                  eventId={newEvent.id}
                  setEvents={setEvents}
                  onMarkDone={() =>
                    setNewEvent((prevEvent) => ({ ...prevEvent, isDone: !prevEvent.isDone }))
                  }
                />
              </div>

              <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                {/* New Close Button */}
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex items-center space-x-2 w-full sm:w-auto"
                  type="button"
                >
                  <span>Close</span>
                </Button>
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

        {/* Calendar Component */}
        <div className="bg-white shadow-none ">
          <CustomCalendar
            events={filteredEvents}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            onEventDrop={handleEventDrop}
            role={role}
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
          />
        </div>
      </Card>
    </div>
  );
};

export default CalendarSection;

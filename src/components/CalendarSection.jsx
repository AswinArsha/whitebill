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
import { supabase } from "../supabase";
import { Card } from "@/components/ui/card";
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
import { Check, ChevronsUpDown, Menu } from "lucide-react"; // Added Menu Icon
import NotificationDropdown from "./NotificationDropdown";
import AlertNotification from "./AlertNotification";
import jsPDF from "jspdf";
import ProfileDropdown from "./ProfileDropdown";

const CATEGORIES = [
  { value: "shoot", label: "Shoot" },
  { value: "meeting", label: "Meeting" },
  { value: "post", label: "Post" },
  { value: "editing", label: "Editing" }, // New category added
];

const FILTER_CATEGORIES = [{ value: "all", label: "All" }, ...CATEGORIES];

const getCategoryColor = (category, isDone) => {
  if (isDone) return "#4caf50";
  switch (category) {
    case "shoot":
      return "#f06543";
    case "meeting":
      return "#0582ca";
    case "post":
      return "#f48c06";
    case "editing": // Assigning color to the new "editing" category
      return "#9d4edd";
    default:
      return "#6c757d";
  }
};

const CalendarSection = () => {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
    location: "",
    category: "",
    allDay: false,
    isDone: false,
    clientName: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterClientName, setFilterClientName] = useState("");
  const [printClientName, setPrintClientName] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [errors, setErrors] = useState({ title: "", category: "" });
  const [clients, setClients] = useState([]);
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const calendarRef = useRef(null);
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Track the displayed month
  const [showFilters, setShowFilters] = useState(false); // State for mobile filter toggle

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

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchEvents = useCallback(async () => {
    let query = supabase.from("events").select("*");

    if (searchTerm) {
      query = query.or(
        `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,client_name.ilike.%${searchTerm}%`
      );
    }

    if (filterCategory && filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    if (filterClientName) {
      query = query.eq("client_name", filterClientName);
    }

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
        },
      }));
      setEvents(formattedEvents);
    }
  }, [searchTerm, filterCategory, filterClientName]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDateSelect = (selectInfo) => {
    setIsModalOpen(true);
    setNewEvent({
      title: "",
      description: "",
      start: selectInfo.startStr,
      end: selectInfo.endStr || selectInfo.startStr,
      location: "",
      category: "",
      allDay: selectInfo.allDay,
      isDone: false,
      clientName: "",
    });
    setIsEditing(false);
  };

  const handleEventClick = (clickInfo) => {
    setIsModalOpen(true);
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
    });
    setIsEditing(true);
  };

  const validateEvent = () => {
    let isValid = true;
    const newErrors = { title: "", category: "" };

    if (!newEvent.title) {
      newErrors.title = "Event title is required.";
      isValid = false;
    }

    if (!newEvent.category) {
      newErrors.category = "Event category is required.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleEventAdd = async () => {
    if (validateEvent()) {
      const eventToAdd = {
        title: newEvent.title,
        description: newEvent.description,
        start_time: newEvent.allDay
          ? `${newEvent.start}T00:00:00Z`
          : newEvent.start,
        end_time: newEvent.allDay ? `${newEvent.end}T23:59:59Z` : newEvent.end,
        location: newEvent.location,
        category: newEvent.category,
        all_day: newEvent.allDay,
        is_done: newEvent.isDone,
        client_name: newEvent.clientName,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("events")
          .update(eventToAdd)
          .eq("id", newEvent.id);
        if (error) console.error("Error updating event:", error);
        else {
          setEvents((currentEvents) =>
            currentEvents.map((event) =>
              event.id === newEvent.id
                ? {
                    ...event,
                    ...eventToAdd,
                    allDay: newEvent.allDay,
                    backgroundColor: getCategoryColor(
                      newEvent.category,
                      newEvent.isDone
                    ),
                    borderColor: getCategoryColor(
                      newEvent.category,
                      newEvent.isDone
                    ),
                    extendedProps: {
                      ...event.extendedProps,
                      ...eventToAdd,
                      isDone: newEvent.isDone,
                      clientName: newEvent.clientName,
                    },
                  }
                : event
            )
          );
        }
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert([eventToAdd])
          .select();
        if (error) console.error("Error adding event:", error);
        else {
          const newFormattedEvent = {
            id: data[0].id,
            title: data[0].title,
            start: data[0].start_time,
            end: data[0].end_time,
            allDay: data[0].all_day,
            backgroundColor: getCategoryColor(
              data[0].category,
              data[0].is_done
            ),
            borderColor: getCategoryColor(data[0].category, data[0].is_done),
            extendedProps: {
              description: data[0].description,
              location: data[0].location,
              category: data[0].category,
              isDone: data[0].is_done,
              clientName: data[0].client_name,
            },
          };
          setEvents((currentEvents) => [...currentEvents, newFormattedEvent]);
        }
      }

      setIsModalOpen(false);
      setNewEvent({
        title: "",
        description: "",
        start: "",
        end: "",
        location: "",
        category: "",
        allDay: false,
        isDone: false,
        clientName: "",
      });
    }
  };

  const handleEventDelete = async () => {
    if (isEditing && newEvent.id) {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", newEvent.id);
      if (error) console.error("Error deleting event:", error);
      else {
        setIsModalOpen(false);
        setEvents((currentEvents) =>
          currentEvents.filter((event) => event.id !== newEvent.id)
        );
      }
    }
  };

  const handleEventDrop = async (dropInfo) => {
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
      console.error("Error updating event:", error);
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

  const handleEventResize = async (resizeInfo) => {
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
      console.error("Error updating event:", error);
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

  const handleEventChange = async (changeInfo) => {
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
    };

    const { error } = await supabase
      .from("events")
      .update(updatedEvent)
      .eq("id", updatedEvent.id);

    if (error) {
      console.error("Error updating event:", error);
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
                },
              }
            : event
        )
      );
    }
  };

  const generateEnhancedCalendarPDF = () => {
    const doc = new jsPDF("landscape");

    // Font and styling variables
    const baseFont = "helvetica";
    const titleFontSize = 22;
    const dayLabelFontSize = 12;
    const dateFontSize = 10;
    const eventFontSize = 12;
    const gridLineColor = "#353535";
    const dayHeaderBg = "#353535";
    const dayHeaderTextColor = "#f8f9fa";
    const textColor = "#333333";

    const startX = 14;
    const startY = 30;
    const cellWidth = 40;
    const cellHeight = 35;

    // Use the current displayed date in the FullCalendar component
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const lastDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    // Get the day of the week the month starts on
    const firstWeekDay = firstDay.getDay();

    doc.setFont(baseFont, "bold");
    doc.setFontSize(titleFontSize);
    doc.setTextColor(textColor);
    doc.text(
      `Monthly Chart ${filterClientName ? `- ${filterClientName}` : ""}`,
      148,
      15,
      { align: "center" }
    );

    // Days of the Week Header with black border
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    daysOfWeek.forEach((day, index) => {
      // Black border for headers
      doc.setDrawColor("#000000"); // Black border
      doc.rect(startX + index * cellWidth, startY - 10, cellWidth, 10); // Border of day header

      doc.setFillColor(dayHeaderBg); // Background color for the day headers
      doc.setTextColor(dayHeaderTextColor); // Text color for the day headers
      doc.rect(startX + index * cellWidth, startY - 10, cellWidth, 10, "F"); // Fill rectangle with color
      doc.setFontSize(dayLabelFontSize);

      doc.text(day, startX + index * cellWidth + 12, startY - 2, {
        align: "center",
      });
    });

    // Calendar Grid
    let currentWeek = 0;

    // Start with empty cells before the first day of the month
    for (let i = 0; i < firstWeekDay; i++) {
      const x = startX + i * cellWidth;
      const y = startY + currentWeek * cellHeight;

      // Draw empty cell
      doc.setFillColor("#FFFFFF"); // Empty cell background
      doc.rect(x, y, cellWidth, cellHeight);
      doc.setDrawColor(gridLineColor);
      doc.setLineWidth(0.1);
      doc.rect(x, y, cellWidth, cellHeight);
    }

    // Fill in the current month's days
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const x = startX + dayOfWeek * cellWidth;
      const y = startY + currentWeek * cellHeight;

      // Draw calendar cell for the current month
      doc.setFillColor("#FFFFFF"); // White background for current month
      doc.rect(x, y, cellWidth, cellHeight);

      doc.setDrawColor(gridLineColor);
      doc.setLineWidth(0.1);
      doc.rect(x, y, cellWidth, cellHeight);

      // Add date number for current month
      doc.setFontSize(dateFontSize);
      doc.setTextColor(textColor);
      doc.text(d.getDate().toString(), x + cellWidth - 8, y + 10);

      // Add events for the day
      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.start);
        return (
          eventDate.getDate() === d.getDate() &&
          eventDate.getMonth() === d.getMonth() &&
          eventDate.getFullYear() === d.getFullYear()
        );
      });

      // Display events as plain text
      doc.setFontSize(eventFontSize);
      dayEvents.forEach((event, index) => {
        if (index < 2) {
          // Limit to 2 events per day for clarity
          doc.text(event.title, x + 4, y + 14 + index * 6, {
            maxWidth: cellWidth - 8,
          });
        }
      });

      if (dayOfWeek === 6) currentWeek++;
    }

    // Fill the remaining cells after the last day of the month with empty cells
    const lastWeekDay = lastDay.getDay();
    if (lastWeekDay < 6) {
      for (let i = lastWeekDay + 1; i <= 6; i++) {
        const x = startX + i * cellWidth;
        const y = startY + currentWeek * cellHeight;

        // Draw empty cell
        doc.setFillColor("#FFFFFF"); // Empty cell background
        doc.rect(x, y, cellWidth, cellHeight);
        doc.setDrawColor(gridLineColor);
        doc.setLineWidth(0.1);
        doc.rect(x, y, cellWidth, cellHeight);
      }
    }

    // Save the PDF
    doc.save(`monthly_chart_${filterClientName || "client"}.pdf`);
  };

  const triggerPrint = useCallback(() => {
    generateEnhancedCalendarPDF();
  }, [filterClientName, events, currentMonth]);

  // Track month change in FullCalendar
  const handleMonthChange = (arg) => {
    setCurrentMonth(arg.view.currentStart);
  };

  useEffect(() => {
    if (isPrinting) {
      triggerPrint();
    }
  }, [isPrinting, triggerPrint]);

  return (
    <div>
      <div className="flex justify-between items-center ">
        <h2 className="text-2xl font-bold mb-4 ml-2 md:-ml-0">
          Event Calendar
        </h2>
        <div className="flex space-x-5 mb-4">
          <div className="">
            <ProfileDropdown />
          </div>
          <AlertNotification />
          <NotificationDropdown />
        </div>
      </div>
      <Card className="bg-gray-50 p-4">
        {/* Mobile: Show a hamburger menu to toggle the filter */}
        <div className="md:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
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
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyUp={fetchEvents}
            className="mb-2 md:mb-0"
          />
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
          <Popover
            open={openClientCombobox}
            onOpenChange={setOpenClientCombobox}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openClientCombobox}
                className="w-full justify-between"
              >
                {filterClientName || "Filter by Client"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[390px] p-0">
              <Command>
                <CommandInput placeholder="Search clients..." />
                <CommandList>
                  <CommandEmpty>No client found.</CommandEmpty>
                  <CommandGroup>
                    {clients.map((client) => (
                      <CommandItem
                        key={client.value}
                        value={client.value}
                        onSelect={(currentValue) => {
                          setFilterClientName(
                            currentValue === filterClientName
                              ? ""
                              : currentValue
                          );
                          setOpenClientCombobox(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filterClientName === client.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {client.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button onClick={triggerPrint}>Print Calendar</Button>
        </div>
        <div className="bg-white shadow-none">
          <FullCalendar
            ref={(element) => (calendarRef.current = element)} // Correctly setting the ref
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
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            editable={true}
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
            dayHeaderClassNames="bg-gray-200 text-gray-700 uppercase tracking-wider"
            datesSet={handleMonthChange} // Listen for month changes
          />
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Event" : "Add New Event"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                />
                {errors.title && <p className="text-red-500">{errors.title}</p>}
              </div>
              <div>
                <Label htmlFor="description">Remarks</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newEvent.category}
                  onValueChange={(value) =>
                    setNewEvent({ ...newEvent, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-red-500">{errors.category}</p>
                )}
              </div>
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openClientCombobox}
                      className="w-full justify-between"
                    >
                      {newEvent.clientName || "Select a client"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[460px] p-0">
                    <Command>
                      <CommandInput placeholder="Search clients..." />
                      <CommandList>
                        <CommandEmpty>No client found.</CommandEmpty>
                        <CommandGroup>
                          {clients.map((client) => (
                            <CommandItem
                              key={client.value}
                              value={client.value}
                              onSelect={(currentValue) => {
                                setNewEvent({
                                  ...newEvent,
                                  clientName: currentValue,
                                });
                                setOpenClientCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newEvent.clientName === client.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {client.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDone"
                  checked={newEvent.isDone}
                  onCheckedChange={(checked) =>
                    setNewEvent({ ...newEvent, isDone: checked })
                  }
                />
                <Label htmlFor="isDone">Mark as Done</Label>
              </div>
            </div>

            <DialogFooter className={"mt-4"}>
              {isEditing && (
                <Button
                  variant="destructive"
                  className="mr-auto"
                  onClick={handleEventDelete}
                >
                  Delete
                </Button>
              )}
              <Button className="ml-auto" onClick={handleEventAdd}>
                {isEditing ? "Update" : "Add"} Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default CalendarSection;

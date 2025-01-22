import React, { useState, useEffect, useCallback , useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { 
  format, addDays, startOfWeek, endOfWeek, 
  startOfDay, endOfDay, isWithinInterval, isSameDay,
  isWeekend, parseISO
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to format dates to UTC strings
const formatToUTCString = (date, isEndTime = false) => {
  if (!date) return null;
  const d = new Date(date);
  if (isEndTime) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
};

const EventItem = ({ event, onClick, isDraggable = false, inPopover = false }) => {
  const { attributes, listeners, setNodeRef, isDragging, active } = useDraggable({
    id: event.id,
    data: { event, type: 'event' },
    disabled: !isDraggable
  });

  // If this item is being dragged, render an invisible placeholder
  if (isDragging && active?.id === event.id) {
    return (
      <div 
        ref={setNodeRef}
        className="opacity-0 invisible h-6"
        {...attributes}
        {...listeners}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "text-xs text-white font-medium p-1 rounded shadow-sm group relative",
        "transition-all duration-200 ease-in-out",
        "hover:opacity-90 hover:scale-105 hover:shadow-md",
        isDraggable && "hover:pl-6",
        inPopover ? "mb-2 last:mb-0" : ""
      )}
      style={{ 
        backgroundColor: event.backgroundColor,
        pointerEvents: isDragging ? 'none' : 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick({ event });
      }}
      {...attributes}
      title={event.title}
    >
      {isDraggable && (
        <div 
          className={cn(
            "absolute left-1 top-1/2 -translate-y-1/2 bg-white rounded-full h-3 w-3",
            "opacity-0 group-hover:opacity-70 cursor-grab active:cursor-grabbing",
            "transition-opacity duration-200 ease-in-out"
          )}
          {...listeners}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        />
      )}
      <span className="cursor-default truncate block">{event.title}</span>
    </div>
  );
};

const MoreEventsPopover = ({ events, role, onEventClick, onClosePopover }) => {
  const [open, setOpen] = useState(false);

  const handleClose = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    setOpen(false);
    if (onClosePopover) onClosePopover();
  };

  return (
    <Popover 
      open={open} 
      onOpenChange={(open) => {
        setOpen(open);
        if (!open && onClosePopover) onClosePopover();
      }}
    >
      <PopoverTrigger asChild>
        <Button 
          type="button"
          variant="ghost" 
          className="text-xs text-gray-500 w-full h-6 p-1 transition-all duration-200 rounded-full hover:bg-gray-200 hover:scale-105"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          +{events.length} more
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 transition-transform duration-200 ease-out mb-6 backdrop-blur-sm bg-white/90" 
        align="start"
      >
        <div className="flex justify-between items-center">
          <h3 className="font-semibold ml-2">More Events</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose}
            className="hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-64 w-full p-2">
          {events.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              onClick={(e) => {
                onEventClick(e);
                setOpen(false);
              }}
              isDraggable={role === 'admin'}
              inPopover={true}
            />
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

const DayCell = ({ day, dayEvents, onDateClick, role, onEventClick, ignoreNextDateClick, onClosePopover }) => {
  const isToday = isSameDay(new Date(), day.date);
  const cellId = day.date.toISOString();
  
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { date: day.date, type: 'cell' }
  });

  const MAX_VISIBLE_EVENTS = 3;
  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
  const hiddenEvents = dayEvents.slice(MAX_VISIBLE_EVENTS);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-32 p-2 border border-gray-300 transition-all duration-200 ease-in-out",
        !day.isCurrentMonth && "bg-gray-50 text-gray-500",
        day.isWeekend && "bg-gray-50",
        isOver && " scale-102",
        "hover:bg-blue-50",
        "relative"
      )}
      onClick={() => {
        if (!ignoreNextDateClick) {
          onDateClick(day.date);
        }
      }}
      role="gridcell"
      aria-label={format(day.date, 'PPPP')}
      tabIndex={0}
    >
      {/* Today indicator border - placed behind content */}
      {isToday && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-md -m-px pointer-events-none" />
      )}
      
      {/* Cell content - always on top */}
      <div className="relative z-10">
        <div className={cn(
          "flex items-center justify-between mb-1",
          isToday && "text-blue-600 font-semibold"
        )}>
          <span className={cn(
            "text-sm inline-flex items-center justify-center",
            isToday && "bg-blue-500 text-white w-6 h-6 rounded-full"
          )}>
            {format(day.date, 'd')}
          </span>
          {isToday && (
            <span className="text-xs text-blue-600 font-medium">
              Today
            </span>
          )}
        </div>
        <div className={cn(
          "space-y-1",
          isToday && "bg-blue-50/30"
        )}>
          {visibleEvents.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              onClick={onEventClick}
              isDraggable={role === 'admin'}
            />
          ))}
          {hiddenEvents.length > 0 && (
            <MoreEventsPopover
              events={hiddenEvents}
              role={role}
              onEventClick={onEventClick}
              onClosePopover={onClosePopover}
            />
          )}
        </div>
      </div>
      
      {/* Drag overlay indicator */}
      {isOver && (
        <div className="absolute inset-0 border border-blue-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};

const DayView = ({ events, onEventClick, role }) => {
  const sortedEvents = [...events].sort((a, b) => 
    parseISO(a.start).getTime() - parseISO(b.start).getTime()
  );

  return (
    <div className="p-4 space-y-4">
      {sortedEvents.length > 0 ? (
        sortedEvents.map(event => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            onClick={() => onEventClick({ event })}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: event.backgroundColor }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{event.title}</h3>
              
              </div>
            </div>
          </motion.div>
        ))
      ) : (
        <div className="text-center text-gray-500 py-8">
          No events scheduled for today
        </div>
      )}
    </div>
  );
};

const CustomCalendar = ({
  events,
  onEventClick,
  onDateSelect,
  onEventDrop,
  role,
  theme = {
    headerBg: 'bg-white',
    todayRing: 'ring-blue-500',
    weekendBg: 'bg-gray-50',
    hoverBg: 'hover:bg-blue-50'
  }
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState('month');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [ignoreNextDateClick, setIgnoreNextDateClick] = useState(false);
  const [localEvents, setLocalEvents] = useState(events);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const dragTimeoutRef = useRef(null);

  useEffect(() => {
    // Force re-render of events periodically to ensure visibility
    const interval = setInterval(() => {
      setLocalEvents(prev => [...prev]);
    }, 1000);
  
    return () => clearInterval(interval);
  }, []);
  

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const navigateMonth = useCallback((direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch(e.key) {
        case 'ArrowLeft':
          navigateMonth(-1);
          break;
        case 'ArrowRight':
          navigateMonth(1);
          break;
        case 't':
        case 'T':
          if (e.ctrlKey || e.metaKey) {
            setCurrentDate(new Date());
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateMonth]);

  const getEventsForDate = useCallback((date) => {
    return localEvents.filter(event => {
      const eventStartDate = new Date(event.start);
      return (
        eventStartDate.getDate() === date.getDate() &&
        eventStartDate.getMonth() === date.getMonth() &&
        eventStartDate.getFullYear() === date.getFullYear()
      );
    });
  }, [localEvents]);
  
  const getCalendarDays = useCallback(() => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const start = startOfWeek(firstDayOfMonth);
    const end = endOfWeek(lastDayOfMonth);
    const days = [];
    let day = new Date(start);
    while (day <= end) {
      days.push({
        date: new Date(day),
        isCurrentMonth: day.getMonth() === currentDate.getMonth(),
        isWeekend: isWeekend(day)
      });
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const handleDateClick = (date) => {
    if (role !== 'admin') return;
    const startStr = formatToUTCString(date);
    const endStr = formatToUTCString(date, true);
    onDateSelect({ startStr, endStr, allDay: true });
  };

  const handleDragStart = (event) => {
    if (role !== 'admin') return;
    const eventData = localEvents.find(e => e.id === event.active.id);
    setActiveId(event.active.id);
    setDraggedEvent(eventData);
  };

  const handleDragEnd = async (event) => {
    if (role !== 'admin') return;
    const { active, over } = event;
    
    if (!over) {
      // Clear dragged state after a short delay
      dragTimeoutRef.current = setTimeout(() => {
        setActiveId(null);
        setDraggedEvent(null);
      }, 50);
      return;
    }

    const draggedEvent = localEvents.find(e => e.id === active.id);
    const targetDate = new Date(over.id);

    if (draggedEvent) {
      const originalStart = new Date(draggedEvent.start);
      const originalEnd = new Date(draggedEvent.end);
      const timeDiff = originalEnd.getTime() - originalStart.getTime();

      const newStart = startOfDay(targetDate);
      if (!draggedEvent.allDay) {
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0);
      }
      const newEnd = new Date(newStart.getTime() + timeDiff);

      const updatedEvent = {
        ...draggedEvent,
        start: formatToUTCString(newStart),
        end: formatToUTCString(newEnd, true),
        allDay: draggedEvent.allDay
      };

      // Clear drag state first
      setActiveId(null);
      setDraggedEvent(null);

      // Update local state
      setLocalEvents(prev => 
        prev.map(e => (e.id === draggedEvent.id ? updatedEvent : e))
      );

      try {
        await onEventDrop({ event: updatedEvent });
      } catch (error) {
        console.error('Error updating event:', error);
        setLocalEvents(prev =>
          prev.map(e => (e.id === draggedEvent.id ? draggedEvent : e))
        );
      }
    }
  };

  // Cleanup drag timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  const handleClosePopover = () => {
    setIgnoreNextDateClick(true);
    setTimeout(() => setIgnoreNextDateClick(false), 300);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Calendar Header */}
        <div className={cn("p-4 flex flex-col md:flex-row justify-between items-center gap-4", theme.headerBg)}>
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 md:flex-none items-center space-x-2"
              onClick={() => setIsDatePickerOpen(true)}
            >
              <CalendarIcon className="h-4 w-4 hidden md:inline" />
              <span className="font-semibold">
                {format(currentDate, 'MMMM yyyy')}
              </span>
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex space-x-2 w-full md:w-auto justify-end">
            <Button variant="secondary" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <div className="flex space-x-2">
              {['month', 'day'].map(mode => (
                <Button
                  key={mode}
                  variant={view === mode ? 'default' : 'outline'}
                  onClick={() => setView(mode)}
                  className="text-sm"
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}-${currentDate.toISOString()}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200"
          >
            {view === 'month' ? (
              <div className="w-full">
                {/* Week day headers - only show on md and above */}
                <div className="hidden md:grid md:grid-cols-7 w-full">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div 
                      key={day} 
                      className="p-2 text-center font-semibold bg-gray-100 text-sm border-b border-gray-200"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="md:grid md:grid-cols-7 flex flex-col">
                  {getCalendarDays().map(day => (
                    <DayCell
                      key={day.date.toISOString()}
                      day={day}
                      dayEvents={getEventsForDate(day.date)}
                      onDateClick={handleDateClick}
                      onEventClick={onEventClick}
                      role={role}
                      ignoreNextDateClick={ignoreNextDateClick}
                      onClosePopover={handleClosePopover}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <DayView 
                events={getEventsForDate(currentDate)}
                onEventClick={onEventClick}
                role={role}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <DragOverlay modifiers={[restrictToWindowEdges]}>
          {draggedEvent && (
            <div
              className="text-xs p-2 rounded-lg shadow-xl bg-white border-2 pointer-events-none"
              style={{ 
                backgroundColor: draggedEvent.backgroundColor,
                transform: 'scale(1.05)',
                transition: 'transform 200ms cubic-bezier(0.18, 0.67, 0.6, 1.22)'
              }}
            >
              <span className="font-medium">{draggedEvent.title}</span>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default CustomCalendar;
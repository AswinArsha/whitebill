// OffDaysManager.jsx
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import shadcn calendar & popover components
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const OffDaysManager = ({ organizationId, userId, userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRepeat, setIsRepeat] = useState(true);
  const [selectedWeekday, setSelectedWeekday] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null); // Will store a Date object when using specific dates
  const [offDays, setOffDays] = useState([]);

  useEffect(() => {
    if (organizationId) {
      fetchOffDays();
    }
  }, [organizationId]);

  const fetchOffDays = async () => {
    try {
      const { data, error } = await supabase
        .from('off_days')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;
      setOffDays(data);
    } catch (error) {
      console.error('Error fetching off days:', error);
      toast.error('Failed to fetch off days');
    }
  };

  const handleSubmit = async () => {
    if (!organizationId || userRole !== 'admin') {
      toast.error('Unauthorized action');
      return;
    }
  
    if (!isRepeat && !selectedDate) {
      toast.error('Please select a date');
      return;
    }
  
    try {
      const newOffDay = {
        organization_id: organizationId,
        day_type: isRepeat ? 'weekly' : 'specific',
        weekday: isRepeat ? selectedWeekday : null,
        // Use format to store the date as a string without time zone conversion
        specific_date: !isRepeat && selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        is_active: true,
        created_by: userId,
      };
  
      const { error } = await supabase
        .from('off_days')
        .insert([newOffDay]);
  
      if (error) throw error;
  
      toast.success('Off day added successfully!');
      setIsOpen(false);
      fetchOffDays();
      setSelectedDate(null); // Reset date selection if needed
    } catch (error) {
      console.error('Error adding off day:', error);
      toast.error('Failed to add off day');
    }
  };
  const handleDelete = async (id) => {
    if (!organizationId || userRole !== 'admin') {
      toast.error('Unauthorized action');
      return;
    }

    try {
      const { error } = await supabase
        .from('off_days')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Off day removed successfully!');
      fetchOffDays();
    } catch (error) {
      console.error('Error removing off day:', error);
      toast.error('Failed to remove off day');
    }
  };

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Manage Off Days
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Off Day</DialogTitle>
            <DialogDescription>
              Set recurring weekly off days or specific dates as holidays.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="repeat-toggle">Repeat Weekly</Label>
              <Switch
                id="repeat-toggle"
                checked={isRepeat}
                onCheckedChange={setIsRepeat}
              />
            </div>

            {isRepeat ? (
              <div className="grid gap-2">
                <Label>Select Weekday</Label>
                <Select
                  value={selectedWeekday.toString()}
                  onValueChange={(value) => setSelectedWeekday(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full text-left">
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Display current off days */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Day/Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offDays.map((offDay) => (
                  <TableRow key={offDay.id}>
                    <TableCell>
                      {offDay.day_type === 'weekly' ? 'Weekly' : 'Specific Date'}
                    </TableCell>
                    <TableCell>
                      {offDay.day_type === 'weekly'
                        ? WEEKDAYS.find((day) => day.value === offDay.weekday)?.label
                        : format(parseISO(offDay.specific_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() => handleDelete(offDay.id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Add Off Day</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OffDaysManager;

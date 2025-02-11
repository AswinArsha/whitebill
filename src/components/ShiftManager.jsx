import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const ShiftManager = ({ organizationId, userId, userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [newShift, setNewShift] = useState({
    name: '',
    checkInTime: '',
    checkOutTime: '',
    lateThreshold: 15
  });

  useEffect(() => {
    if (organizationId) {
      fetchShifts();
    }
  }, [organizationId]);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;
      setShifts(data);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to fetch shifts');
    }
  };

  const handleAddShift = async () => {
    if (!organizationId || userRole !== 'admin') {
      toast.error('Unauthorized action');
      return;
    }

    try {
      const { error } = await supabase
        .from('shifts')
        .insert([{
          name: newShift.name,
          check_in_time: newShift.checkInTime,
          check_out_time: newShift.checkOutTime,
          late_threshold_minutes: parseInt(newShift.lateThreshold),
          organization_id: organizationId
        }]);

      if (error) throw error;

      toast.success('Shift added successfully!');
      setNewShift({
        name: '',
        checkInTime: '',
        checkOutTime: '',
        lateThreshold: 15
      });
      fetchShifts();
    } catch (error) {
      console.error('Error adding shift:', error);
      toast.error('Failed to add shift');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!organizationId || userRole !== 'admin') {
      toast.error('Unauthorized action');
      return;
    }

    try {
      const { error } = await supabase
        .from('shifts')
        .update({ is_active: false })
        .eq('id', shiftId);

      if (error) throw error;

      toast.success('Shift removed successfully!');
      fetchShifts();
    } catch (error) {
      console.error('Error removing shift:', error);
      toast.error('Failed to remove shift');
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Clock className="h-4 w-4 mr-2" />
          Manage Shifts
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl ">
        <DialogHeader>
          <DialogTitle>Shift Management</DialogTitle>
          <DialogDescription className="hidden sm:block" >
            Add and manage work shifts for your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="sm:space-y-4 ">
          {/* Add New Shift Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:space-y-2">
              <Label htmlFor="shift-name">Shift Name</Label>
              <Input
                id="shift-name"
                value={newShift.name}
                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                placeholder="e.g., Morning Shift"
                className="w-full"
              />
            </div>
            <div className="sm:space-y-2">
              <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
              <Input
                id="late-threshold"
                type="number"
                value={newShift.lateThreshold}
                onChange={(e) => setNewShift({ ...newShift, lateThreshold: e.target.value })}
                min="0"
                className="w-full"
              />
            </div>
            <div className="sm:space-y-2">
              <Label htmlFor="check-in">Check-in Time</Label>
              <Input
                id="check-in"
                type="time"
                value={newShift.checkInTime}
                onChange={(e) => setNewShift({ ...newShift, checkInTime: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="sm:space-y-2">
              <Label htmlFor="check-out">Check-out Time</Label>
              <Input
                id="check-out"
                type="time"
                value={newShift.checkOutTime}
                onChange={(e) => setNewShift({ ...newShift, checkOutTime: e.target.value })}
                className="w-full"
              />
            </div>
          </div>

          <Button onClick={handleAddShift} className="w-full my-2 sm:mt-0">Add Shift</Button>

          {/* Responsive Table/Card View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Check-out Time</TableHead>
                  <TableHead>Late After</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{shift.name}</TableCell>
                    <TableCell>{formatTime(shift.check_in_time)}</TableCell>
                    <TableCell>{formatTime(shift.check_out_time)}</TableCell>
                    <TableCell>{shift.late_threshold_minutes} minutes</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() => handleDeleteShift(shift.id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <ScrollArea className="h-72 sm:hidden rounded-md border">
          <div className=" space-y-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="bg-white rounded-lg border p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{shift.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    onClick={() => handleDeleteShift(shift.id)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="text-sm space-y-1">
                  <p className="flex justify-between">
                    <span className="text-gray-500">Check-in:</span>
                    <span>{formatTime(shift.check_in_time)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Check-out:</span>
                    <span>{formatTime(shift.check_out_time)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Late After:</span>
                    <span>{shift.late_threshold_minutes} minutes</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftManager;
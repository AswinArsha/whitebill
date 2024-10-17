// DatePicker.jsx
import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

const DatePicker = ({ label, selectedDate, onDateChange }) => (
  <div className="flex flex-col space-y-2">
    <Label>{label}</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-[280px] justify-start text-left font-normal ${
            !selectedDate ? "text-muted-foreground" : ""
          }`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(new Date(selectedDate), "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={new Date(selectedDate)}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  </div>
);

export default DatePicker;

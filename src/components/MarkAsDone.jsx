import React, { useState, useRef } from "react";
import { Check, PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "../supabase";

const MarkAsDone = ({ isDone, onMarkDone, eventId, setEvents }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();
  const buttonRef = useRef(null); // Reference to the button element

  const handleMarkAsDone = async () => {
    const updatedIsDone = !isDone; // Toggle the done state

    if (updatedIsDone) {
      // Trigger confetti only when marking as done
      const buttonRect = buttonRef.current.getBoundingClientRect();

      confetti({
        particleCount: 60,
        startVelocity: 17,
        spread: 60,
        origin: {
          x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth,
          y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight,
        },
        zIndex: 10000, // Ensure the confetti is above everything
      });

      toast({
        title: "Good job!",
        description: "Task Completed 🎉 Ready for the next one?",
        variant: "positive",
        icon: <PartyPopper className="h-5 w-5 text-green-600" />,
      });
    }

    // Update the event in Supabase
    const { error } = await supabase
      .from("events")
      .update({ is_done: updatedIsDone })
      .eq("id", eventId);

    if (error) {
      toast.error("Failed to update event status. Please try again.");
    } else {
      // Update local state after successful update
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === eventId ? { ...event, isDone: updatedIsDone } : event
        )
      );
    }

    // Trigger the mark as done logic
    onMarkDone();
  };

  return (
    <div className="relative">
      {/* Mark as Done Button */}
      <div className="flex items-center space-x-3">
        <button
          ref={buttonRef} // Attach ref to the button
          onClick={handleMarkAsDone}
          className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform transform ${
            isDone ? "bg-green-500 border-green-500 scale-110" : "border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-green-300`}
          aria-label="Mark as Done"
        >
          {isDone && (
            <Check className="h-4 w-4 text-white transition-opacity duration-300" />
          )}
        </button>
        <Label
          htmlFor="isDone"
          className="text-sm font-medium text-gray-700 cursor-pointer"
          onClick={handleMarkAsDone}
        >
          {isDone ? "Task Completed! 🎉" : "Mark as Done"}
        </Label>
      </div>
    </div>
  );
};

export default MarkAsDone;


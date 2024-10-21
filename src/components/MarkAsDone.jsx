import React, { useRef } from "react";
import { Check } from "lucide-react";
import confetti from "canvas-confetti";
import { Label } from "@/components/ui/label";
import toast from 'react-hot-toast'; // Import react-hot-toast

const compliments = [
  "Great job! Keep going! 💪",
  "You’re crushing it! 🚀",
  "Well done, superstar! 🌟",
  "Amazing work! 🎉",
  "You’re unstoppable! 🔥",
  "Keep up the momentum! 🎯",
  "You're a productivity wizard! 🧙‍♂️",
  "Incredible effort! 👏",
  "You make it look easy! 😎",
  "Bravo! You nailed it! 💥",
  "You’re on fire today! 🔥",
  "Keep smashing those goals! 🎯",
  "You're a rockstar! 🎸",
  "Unstoppable energy! ⚡️",
  "What a legend! 🏆",
  "Boom! Another one down! 💥",
  "You’re making magic happen! ✨",
  "Master of productivity! 🎩",
  "Look at you go! 👏",
  "Crushing it like a pro! 🏅",
  "Keep that momentum rolling! 🔥",
  "Absolutely killing it! 💀",
  "You're a machine! 🤖",
  "Your hard work is paying off! 💪",
  "The future is yours! 🌟",
  "You've got this! 👊",
  "You’re building an empire! 🏛️",
  "Shining like a star! 🌟",
  "Boss mode activated! 💼",
  "You're unstoppable! 🌪️",
  "Onwards and upwards! 🚀",
  "Mission accomplished! 🎖️"
];


const MarkAsDone = ({ isDone, onMarkDone }) => {
  const buttonRef = useRef(null); // Reference to the button element

  const handleMarkAsDone = () => {
    const updatedIsDone = !isDone; // Toggle the done state

    // Immediately update the UI
    onMarkDone();

    if (updatedIsDone) {
      // Trigger confetti with a short delay to sync with the UI change
      const buttonRect = buttonRef.current.getBoundingClientRect();
      
      // Use a setTimeout of 100ms to slightly delay confetti trigger
      setTimeout(() => {
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
      }, 100); // Small delay to ensure the button state changes instantly

      // Show toast notification with a random compliment or motivational phrase
      const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];
      toast.success(` ${randomCompliment}`, { duration: 2000 });
    }
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
          <Check
            className={`h-4 w-4 text-white transition-opacity duration-100 ${
              isDone ? "opacity-100" : "opacity-0"
            }`}
          />
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

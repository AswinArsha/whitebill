import React, { useRef } from "react";
import { Check } from "lucide-react";
import confetti from "canvas-confetti";
import { Label } from "@/components/ui/label";
import toast from 'react-hot-toast'; // Import react-hot-toast

const compliments = [
  "You're a trailblazer! 🏞️",
  "Legendary effort! 🌟",
  "You’re rewriting the rulebook! 📖",
  "Making waves and breaking barriers! 🌊",
  "You’re a one-person powerhouse! ⚡",
  "Superb work—nothing can stop you! 🛡️",
  "Champion-level performance! 🏆",
  "You’ve got skills for days! 🛠️",
  "An icon in the making! 🎬",
  "You’re outshining the stars! ✨",
  "Taking things to the next level! 📈",
  "Your effort is pure gold! 🏅",
  "Smashing goals like a champ! 🥊",
  "You’re a game-changer! 🎮",
  "Unleashing awesomeness! 🌟",
  "You’re paving the way for greatness! 🚧",
  "Remarkable work—simply unmatched! 🏅",
  "You’re lighting up the world! 💡",
  "A true inspiration! 🌈",
  "You’ve got the magic touch! ✨",
  "Top-tier execution! 🏛️",
  "You’re setting the bar sky-high! 🎯",
  "Unbelievable focus and dedication! 🔍",
  "You’re a force to be reckoned with! 💪",
  "Your perseverance is incredible! 🏔️",
  "You’re shaping the future! 🔮",
  "Next-level brilliance! 🌟",
  "You're turning heads everywhere! 🙌",
  "Your determination is unstoppable! 🚀",
  "Every step is a masterpiece! 🎨",
  "You make the impossible possible! 🌌",
  "Radiating pure confidence! 🌟",
  "You're writing history! 📜",
  "Absolute genius at work! 🧠",
  "Taking the world by storm! 🌪️",
  "Your energy is contagious! ⚡️",
  "Smashing it like a boss! 💼",
  "Brilliance personified! 💎",
  "You're hitting all the right notes! 🎵",
  "Epic performance—every single time! 🎭",
  "You’re on a winning streak! 🎉",
  "You're an idea factory! 🏭",
  "Perfection in motion! 🕺",
  "You make success look easy! 🪞",
  "You're climbing the ladder of greatness! 🪜",
  "Dominating the game like a pro! 🎮",
  "You’re the gold standard! 🏆",
  "Your vibe is pure magic! 🪄",
  "Trailblazing through challenges! 🚵‍♂️",
  "You're the architect of success! 🏗️",
  "Confidence looks amazing on you! 💎",
  "Inspiring greatness everywhere you go! ✨",
  "You're a master at what you do! 🎯",
  "Breaking records and barriers! 🏅",
  "Your hustle is unmatched! 🚀",
  "Making dreams a reality! 🌟",
  "You're turning visions into victories! 👑",
  "Your positivity is magnetic! 🌈",
  "You’re carving out a legacy! 🏛️",
  "Leading the charge with brilliance! ⚔️",
  "Innovation at its finest! 🧠",
  "You're the secret sauce to success! 🍝",
  "Incredible stamina and focus! 🔥",
  "You're the MVP every day! 🏀",
  "A shining beacon of determination! 🗼",
  "Every move is a masterstroke! 🎨",
  "You're a trendsetter of excellence! 🚩",
  "You’re rewriting the playbook! 📘",
  "You turn challenges into triumphs! 🏔️",
  "Visionary leadership at its best! 🌌",
  "You’ve got an eye for greatness! 👁️",
  "Unleashing excellence with every step! 🚶‍♂️",
  "Your enthusiasm is a game-changer! 🌠",
  "You're an unstoppable achiever! 🎖️",
  "Making a lasting impact—every time! 🌍",
  "You're a role model of success! 🏅",
  "Your brilliance lights the way! 🔦",
  "Empowering others with your energy! ⚡️",
  "You're a catalyst for innovation! ⚙️",
  "The definition of persistence! 🏔️",
  "Raising the bar with every move! 📈",
  "You’re a star in your own league! 🌟",
  "Your effort speaks volumes! 📢",
  "Making magic look effortless! 🪄",
  "Every action is a power play! 🥇",
  "You’ve got an unbeatable work ethic! 🛠️",
  "You're the epitome of excellence! 🌟",
  "Your creativity is limitless! ✨",
  "You inspire greatness in everyone! 🌈",
  "You're paving paths for others to follow! 🚶‍♀️",
  "Delivering excellence like clockwork! ⏰",
  "A powerhouse of ideas and execution! 💥",
  "Your brilliance is a force of nature! 🌪️",
  "You're making history with every move! 🏛️",
  "The sky isn’t the limit—it’s just the beginning! 🌌",
  "You're a beacon of positivity and progress! 🔥",
  "Every day you outdo yourself! 🏆",
  "You make the extraordinary look routine! 🧙‍♂️"
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

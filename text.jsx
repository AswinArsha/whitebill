<Link
key={item.path}
to={`/home/${item.path}`}
className={`relative flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${
  isActive 
    ? 'text-primary bg-gray-100 dark:bg-gray-900 shadow-lg scale-105' 
    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
}`}
>
{/* Animated Icon with Smooth Scale & Hover Tilt */}
<motion.div 
  className="transition-transform"
  animate={{
    scale: isActive ? 1.2 : 1,
    rotate: isActive ? 0 : 0, // Keeps it aligned but can be adjusted
  }}
  whileHover={{ rotate: isActive ? 0 : 5 }} // Slight tilt effect
  transition={{ type: "spring", stiffness: 200, damping: 10 }}
>
  {item.icon}
</motion.div>

{/* Label with Smooth Font Transition */}
<motion.span 
  className={`text-xs mt-1 transition-all duration-300 ${
    isActive ? 'font-bold tracking-wide' : 'font-medium'
  }`}
  animate={{ opacity: isActive ? 1 : 0.7, scale: isActive ? 1.1 : 1 }}
>
  {item.label}
</motion.span>

{/* Enhanced Glowing Underline */}
{isActive && (
  <motion.div
    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full"
    style={{
      background: "linear-gradient(90deg, rgba(80,80,80,1) 0%, rgba(0,0,0,1) 100%)",
      filter: "blur(0.5px)", // Creates a soft glow
    }}
    initial={{ width: 0, opacity: 0 }}
    animate={{ width: "100%", opacity: 1 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  />
)}

{/* Badge Indicator with Pop Effect */}
{item.badge > 0 && (
  <motion.span
    className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center shadow-md"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 10 }}
  >
    {item.badge}
  </motion.span>
)}
</Link>

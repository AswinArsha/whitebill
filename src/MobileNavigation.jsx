import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Menu,
  X,
  ReceiptText,
  Calendar,
  ReceiptIndianRupee,
  Users,
  AlarmClock,
  CheckCircle,
  ClipboardCheck
} from 'lucide-react';

const MotionLink = ({ item, isActive }) => {
  const iconVariants = {
    initial: { scale: 1, y: 0 },
    active: { scale: 1.1, y: -2 },
    hover: { scale: 1.05, y: -1 },
    tap: { scale: 0.95, y: 1 }
  };

  const underlineVariants = {
    initial: { width: '0%', left: '50%', x: '-50%' },
    active: { width: '100%', left: '50%', x: '-50%' },
    hover: { width: '65%', left: '50%', x: '-50%' }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ 
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="relative"
    >
      <Link
        to={`/home/${item.path}`}
        className={`
          relative flex flex-col items-center p-2
          transition-all duration-300 ease-out
          rounded-xl
          ${isActive ? 'text-primary' : 'text-gray-600'}
        `}
      >
        {/* Background Glow */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              layoutId="navBackground"
              className="absolute inset-0 bg-primary/5 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        <motion.div
          variants={iconVariants}
          initial="initial"
          animate={isActive ? "active" : "initial"}
          whileHover="hover"
          whileTap="tap"
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20
          }}
          className="relative z-10"
        >
          {item.icon}
          
          {/* Badge */}
          <AnimatePresence>
            {item.badge > 0 && (
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  transition: {
                    type: "spring",
                    stiffness: 500,
                    damping: 25
                  }
                }}
                exit={{ 
                  scale: 0.5, 
                  opacity: 0,
                  transition: { duration: 0.2 }
                }}
                className="absolute -top-1 -right-1 bg-red-500 text-white 
                  text-xs rounded-full w-4 h-4 flex items-center justify-center
                  shadow-lg shadow-red-500/20"
              >
                {item.badge}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Label */}
        <motion.span
          initial={false}
          animate={{
            scale: isActive ? 1.05 : 1,
            fontWeight: isActive ? 500 : 400
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
          className="text-xs mt-1 z-10"
        >
          {item.label}
        </motion.span>

        {/* Animated Underline */}
        <motion.div
          className="absolute bottom-0 bg-gradient-to-r from-primary/40 via-primary to-primary/40 w-12 h-[0.15rem] rounded-full"
          style={{
            background: "linear-gradient(90deg, rgba(80,80,80,1) 0%, rgba(0,0,0,1) 100%)",
            filter: "blur(0.4px)", // Creates a soft glow
          }}
          initial="initial"
          animate={isActive ? "active" : "initial"}
          whileHover={!isActive ? "hover" : "active"}
          variants={underlineVariants}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30
          }}
        />
      </Link>
    </motion.div>
  );
};

const MobileNavigation = ({ role, unreadTaskCount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "calendar", icon: <Calendar className="w-5 h-5" />, label: "Calendar" },
    ...(role === "admin" || role === "superadmin"
      ? [
          { path: "billing", icon: <ReceiptText className="w-5 h-5" />, label: "Billing" },
          { path: "monthly-expenses", icon: <ReceiptIndianRupee className="w-5 h-5" />, label: "Expenses" },
          { path: "clients", icon: <Users className="w-5 h-5" />, label: "Clients" },
          { path: "remainders", icon: <AlarmClock className="w-5 h-5" />, label: "Remainders" },
        ]
      : []),
    { path: "attendance", icon: <CheckCircle className="w-5 h-5" />, label: "Attendance" },
    { path: "tasks", icon: <ClipboardCheck className="w-5 h-5" />, label: "Tasks", badge: unreadTaskCount }
  ];

  const isActivePath = (path) => location.pathname === `/home/${path}`;

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const menuVariants = {
    hidden: { x: '100%' },
    visible: { 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      x: '100%',
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40
      }
    }
  };

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16 px-4">
          {navItems.slice(0, 4).map((item) => (
            <MotionLink
              key={item.path}
              item={item}
              isActive={isActivePath(item.path)}
            />
          ))}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="ghost" 
              className={`flex flex-col items-center gap-1 p-2 ${
                isOpen ? 'text-primary' : 'text-gray-600'
              }`} 
              onClick={() => setIsOpen(true)}
            >
              <Menu className="h-5 w-5" />
             
            </Button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
          >
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute right-0 top-0 bottom-0 w-64 bg-white"
            >
              <Card className="h-full overflow-y-auto">
                <motion.div 
                  className="p-4 border-b"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Menu</h2>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOpen(false)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
                <div className="p-4 space-y-2">
                  {navItems.slice(4).map((item, index) => {
                    const isActive = isActivePath(item.path);
                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                      >
                        <Button
                          asChild
                          variant={isActive ? "secondary" : "ghost"}
                          className={`w-full justify-start transition-all duration-200 ${
                            isActive ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          <Link
                            to={`/home/${item.path}`}
                            className="flex items-center space-x-3 relative"
                          >
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className={isActive ? 'text-primary' : ''}
                            >
                              {item.icon}
                            </motion.div>
                            <span className={isActive ? 'font-medium' : ''}>
                              {item.label}
                            </span>
                            {item.badge > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1"
                              >
                                {item.badge}
                              </motion.span>
                            )}
                          </Link>
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNavigation;
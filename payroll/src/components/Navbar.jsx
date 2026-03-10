// Navbar.jsx (Redesigned - Professional 3D Glassmorphism with Firestore Password Change)
import React, { useState, useContext } from "react";
import { 
  MdDashboard, 
  MdTaskAlt, 
  MdSend, 
  MdDownload, 
  MdPrint, 
  MdLogout,
  MdMenu,
  MdClose,
  MdKeyboardArrowDown,
  MdNotificationsNone,
  MdSettings,
  MdHelpOutline,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdClose as MdCloseIcon
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { setOpenSidebar, logout } from "../redux/slices/authSlice";
import { SidebarContext } from "../App";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "./UserAvatar";
import logo from "../assets/logo1.png";
import { db } from '../config/firebase';
import { doc, updateDoc, getDoc } from "firebase/firestore";

// MTO Office Links
const mtoLinks = [
  {
    label: "Dashboard",
    link: "dashboard",
    icon: <MdDashboard size={25} />,
    description: "Overview & analytics"
  },
  {
    label: "Send File",
    link: "send-file",
    icon: <MdSend size={25} />,
    description: "Transfer documents"
  },
  {
    label: "Receive File",
    link: "file",
    icon: <MdDownload size={25} />,
    description: "Incoming files"
  }
];

// MDDRMO Specific Link
const mdrrmoLinks = [
  {
    label: "Send File (MDRRMO)",
    link: "SendFile_MDRRMO",
    icon: <MdSend size={20} />,
    description: "Send MDRRMO files"
  },
  {
    label: "Receive File",
    link: "receive-file-mdrrmo",
    icon: <MdDownload size={20} />,
    description: "Receive MDRRMO files"
  }
];

// RHU Specific Link
const rhuLinks = [
  {
    label: "Send File (RHU)",
    link: "SendFile_RHU",
    icon: <MdSend size={20} />,
    description: "Send RHU files"
  }
];

// MAYOR Specific Link
const mayorLinks = [
  {
    label: "Send File (MAYOR)",
    link: "SendFile_MAYOR",
    icon: <MdSend size={20} />,
    description: "Send MAYOR files"
  }
];

// Accounting Office Links
const accountingLinks = [
  {
    label: "Tasks",
    link: "tasks",
    icon: <MdTaskAlt size={20} />,
    description: "Manage tasks"
  },
  {
    label: "Receive File",
    link: "receive-file",
    icon: <MdDownload size={20} />,
    description: "Incoming files"
  },
  {
    label: "Send File",
    link: "file-send",
    icon: <MdSend size={20} />,
    description: "Transfer documents"
  },
];

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useContext(SidebarContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isHovering, setIsHovering] = useState(null);
  
  // Change Password States
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const path = location.pathname.split("/")[1];

  const getCurrentUser = () => {
    if (user) return user;
    try {
      const storedUser = localStorage.getItem("auth_user_v1");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  };

  const currentUser = getCurrentUser();
  const userOffice = currentUser?.office || '';

  // Sample notifications data
  const notifications = [
    {
      id: 1,
      title: "New File Received",
      message: "Budget Report Q1 2024",
      time: "5 minutes ago",
      type: "receive",
      read: false
    },
    {
      id: 2,
      title: "File Sent Successfully",
      message: "Annual Financial Statement",
      time: "1 hour ago",
      type: "send",
      read: false
    },
    {
      id: 3,
      title: "Print Job Completed",
      message: "Payroll Summary - March",
      time: "3 hours ago",
      type: "print",
      read: true
    },
    {
      id: 4,
      title: "Task Assigned",
      message: "Review Q2 Documents",
      time: "1 day ago",
      type: "task",
      read: true
    }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  // Determine which links to show based on office
  const getOfficeLinks = () => {
    if (userOffice === 'Accounting') return accountingLinks;
    if (userOffice === 'MDRRMO') return mdrrmoLinks;
    if (userOffice === 'RHU') return rhuLinks;
    if (userOffice === 'MAYOR') return mayorLinks;
    return mtoLinks; // Default to MTO links
  };

  const sidebarLinks = getOfficeLinks();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/log-in');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = 'unset';
  };

  // Change Password Functions - FIRESTORE VERSION
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the current user ID from localStorage or Redux
      const userId = currentUser?.id || currentUser?.uid;
      
      if (!userId) {
        setPasswordError("User ID not found");
        setIsLoading(false);
        return;
      }
      
      // Reference to the user document in Firestore
      const userRef = doc(db, "users", userId);
      
      // Get the current user data to verify old password
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        setPasswordError("User not found in database");
        setIsLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      
      // Verify current password matches the one in Firestore
      if (userData.password !== passwordData.currentPassword) {
        setPasswordError("Current password is incorrect");
        setIsLoading(false);
        return;
      }
      
      // Update password in Firestore
      await updateDoc(userRef, {
        password: passwordData.newPassword,
        passwordUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Update local storage if user data is stored there
      const storedUser = localStorage.getItem("auth_user_v1");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.password = passwordData.newPassword; // Update password in localStorage
        localStorage.setItem("auth_user_v1", JSON.stringify(parsedUser));
      }
      
      setPasswordSuccess("Password changed successfully in Firestore!");
      
      // Clear form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordSuccess("");
      }, 2000);
      
    } catch (error) {
      console.error("Password change error:", error);
      setPasswordError("Failed to change password: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const NotificationIcon = ({ type }) => {
    switch(type) {
      case 'receive':
        return <MdDownload className="text-green-400" size={16} />;
      case 'send':
        return <MdSend className="text-blue-400" size={16} />;
      case 'print':
        return <MdPrint className="text-purple-400" size={16} />;
      case 'task':
        return <MdTaskAlt className="text-yellow-400" size={16} />;
      default:
        return <MdNotificationsNone className="text-gray-400" size={16} />;
    }
  };

  const NavLink = ({ el, isMobile = false }) => {
    const isActive = path === el.link.split("/")[0];

    return (
      <Link
        to={el.link}
        onClick={closeMobileMenu}
        onMouseEnter={() => setIsHovering(el.label)}
        onMouseLeave={() => setIsHovering(null)}
        className={`
          relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300
          ${isActive 
            ? 'text-white shadow-lg' 
            : 'text-gray-300 hover:text-white'
          }
          ${isMobile ? 'w-full' : ''}
          group overflow-hidden
        `}
        style={{
          // Added 3px margin between buttons
          marginRight: !isMobile ? '3px' : '0',
        }}
      >
        {/* Background gradient with 3D effect */}
        <motion.div
          animate={{
            background: isActive 
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))'
              : isHovering === el.label
              ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))'
              : 'none'
          }}
          className="absolute inset-0 rounded-xl"
          style={{
            boxShadow: isActive 
              ? '0 10px 30px -5px rgba(59, 130, 246, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
              : isHovering === el.label
              ? '0 5px 15px -5px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)'
              : 'none',
            transform: isActive || isHovering === el.label ? 'translateY(-1px)' : 'translateY(0)',
            transition: 'all 0.3s ease'
          }}
        />

        {/* Shine effect on hover */}
        <motion.div
          animate={{
            x: isHovering === el.label ? ['-100%', '200%'] : '0%',
          }}
          transition={{
            duration: 1.5,
            repeat: isHovering === el.label ? Infinity : 0,
            ease: "linear"
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />

        {/* Icon with 3D effect */}
        <motion.span
          animate={{
            scale: isHovering === el.label ? 1.1 : 1,
            rotate: isHovering === el.label ? 5 : 0
          }}
          className={`
            relative z-10 transition-colors duration-300
            ${isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}
          `}
        >
          {el.icon}
        </motion.span>

        {/* Label */}
        <span className="relative z-10 font-medium whitespace-nowrap">
          {el.label}
        </span>

        {/* Active indicator with 3D effect */}
        {isActive && (
          <motion.div
            layoutId="activeNavIndicator"
            style={{
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
              filter: 'blur(0.5px)'
            }}
          />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Main Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* 3D Depth Layers */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        
        {/* Animated gradient overlay */}
        <motion.div
          animate={{
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 70% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 70%)'
          }}
        />

        {/* Glassmorphism shine effect */}
        <motion.div
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
            delay: 2
          }}
          className="absolute top-0 left-0 w-60 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
        />

        {/* Navbar Content */}
        <div className="relative z-10 px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left Section - Logo and Mobile Menu Button */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMobileMenu}
              className="lg:hidden text-white text-2xl p-2 rounded-xl transition-all duration-300"
              style={{
                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
              }}
            >
              {isMobileMenuOpen ? <MdClose /> : <MdMenu />}
            </motion.button>

            {/* Logo and Title with 3D effect */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                {/* 3D Logo Container */}
                <div className="w-11 h-11 rounded-xl overflow-hidden"
                  style={{
                    boxShadow: '8px 8px 15px #0a0f1a, -8px -8px 15px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.1)',
                  }}
                >
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-20 blur-sm" />
              </div>
              
              <div className="hidden sm:block">
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                  style={{
                    textShadow: '0 2px 5px rgba(0,0,0,0.3)'
                  }}
                >
                  PAYROLL
                </span>
                <p className="text-[10px] text-gray-500 tracking-wider">DOCUMENT TRACKING</p>
              </div>
            </motion.div>
          </div>

          {/* Center - Desktop Navigation Links - UPDATED: Added 3px gap between buttons */}
          <div className="hidden lg:flex items-center px-4 py-1.5 rounded-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(10px)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05), 0 10px 20px -10px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.03)',
              gap: '30px' // Added 3px gap between flex items
            }}
          >
            {sidebarLinks.map((link, index) => (
              <NavLink key={link.label} el={link} />
            ))}
          </div>

          {/* Right Section - User Info and Avatar */}
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:block p-2.5 rounded-xl text-gray-400 hover:text-white transition-all duration-300"
              style={{
                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
              }}
            >
              <MdHelpOutline size={18} />
            </motion.button>

            {/* Standalone Notification Bell */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2.5 rounded-xl text-gray-400 hover:text-white transition-all duration-300"
                style={{
                  background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                  boxShadow: isNotificationOpen 
                    ? 'inset 3px 3px 6px #0a0f1a, inset -3px -3px 6px #1e2a3a'
                    : '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                }}
              >
                <MdNotificationsNone size={20} />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                    style={{
                      boxShadow: '0 2px 5px rgba(239, 68, 68, 0.5)',
                      border: '2px solid #0f172a'
                    }}
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </motion.button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {isNotificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-96 rounded-2xl overflow-hidden z-50"
                    style={{
                      background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
                      boxShadow: '20px 20px 40px -10px #0a0f1a, -20px -20px 40px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-white font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                          className={`p-4 border-b border-white/5 cursor-pointer transition-colors duration-200 ${
                            !notification.read ? 'bg-blue-500/5' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                              ${notification.type === 'receive' ? 'bg-green-500/10' : ''}
                              ${notification.type === 'send' ? 'bg-blue-500/10' : ''}
                              ${notification.type === 'print' ? 'bg-purple-500/10' : ''}
                              ${notification.type === 'task' ? 'bg-yellow-500/10' : ''}
                            `}>
                              <NotificationIcon type={notification.type} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-white">
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-1">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/5">
                      <button className="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        Mark all as read
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu with 3D effect */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 p-1.5 pl-3 rounded-xl transition-all duration-300"
                style={{
                  background: isUserMenuOpen 
                    ? 'linear-gradient(145deg, #1a2535, #0f1a2a)'
                    : 'linear-gradient(145deg, #1e293b, #0f172a)',
                  boxShadow: isUserMenuOpen
                    ? 'inset 3px 3px 6px #0a0f1a, inset -3px -3px 6px #1e2a3a'
                    : '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                
                <div className="hidden md:block text-left">
                  <p className="text-xs text-gray-400">Welcome back,</p>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    {currentUser?.name?.split(' ')[0] || 'User'}
                    
                    {/* Office Badge with 3D effect */}
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded-md"
                      style={{
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      {userOffice || 'MTO'}
                    </span>
                  </p>
                </div>

                <motion.div
                  animate={{ rotate: isUserMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <MdKeyboardArrowDown className="text-gray-400" size={18} />
                </motion.div>
              </motion.button>

              {/* User Dropdown Menu with 3D effect */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-72 rounded-2xl overflow-hidden z-50"
                    style={{
                      background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
                      boxShadow: '20px 20px 40px -10px #0a0f1a, -20px -20px 40px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}
                  >
                    {/* Header with user info */}
                    <div className="p-5 border-b border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{currentUser?.name || 'User'}</p>
                          <p className="text-xs text-gray-400">{currentUser?.email || ''}</p>
                          <div className="mt-2 inline-block px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-white/5">
                            <span className="text-xs font-medium text-blue-300">
                              {userOffice || 'MTO Office'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 space-y-1">
                      <motion.button
                        whileHover={{ x: 5 }}
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsChangePasswordOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-300 hover:text-white transition-all duration-300"
                        style={{
                          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                          boxShadow: '3px 3px 6px #0a0f1a, -3px -3px 6px #1e2a3a'
                        }}
                      >
                        <MdLock size={18} className="text-gray-400" />
                        <span className="text-sm">Change Password</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ x: 5 }}
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-300 hover:text-white transition-all duration-300"
                        style={{
                          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                          boxShadow: '3px 3px 6px #0a0f1a, -3px -3px 6px #1e2a3a'
                        }}
                      >
                        <MdLogout size={18} className="text-gray-400" />
                        <span className="text-sm">Logout</span>
                      </motion.button>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/5">
                      <p className="text-[10px] text-center text-gray-500">
                        Version 2.0.0 • Secure System
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Mobile Menu Panel with 3D effect */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 z-50 lg:hidden overflow-y-auto"
              style={{
                background: 'linear-gradient(145deg, #0f172a, #1a2535)',
                boxShadow: '20px 0 40px -10px rgba(0,0,0,0.5), inset -1px 0 2px rgba(255,255,255,0.05)',
                borderRight: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              {/* Mobile Menu Header with 3D effect */}
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl overflow-hidden"
                      style={{
                        boxShadow: '8px 8px 15px #0a0f1a, -8px -8px 15px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.1)',
                      }}
                    >
                      <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-20 blur-sm" />
                  </div>
                  <div>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      PAYROLL
                    </span>
                    <div className="mt-1 inline-block px-2 py-0.5 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-xs font-medium text-blue-300">
                        {userOffice || 'MTO Office'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="p-3 space-y-1">
                {sidebarLinks.map((link) => (
                  <NavLink key={link.label} el={link} isMobile={true} />
                ))}
              </div>

              {/* Mobile User Info with 3D effect */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5"
                style={{
                  background: 'linear-gradient(0deg, #0f172a, transparent)'
                }}
              >
                <div className="flex items-center gap-3 p-2 rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                    boxShadow: 'inset 2px 2px 5px #0a0f1a, inset -2px -2px 5px #1e2a3a'
                  }}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden">
                    
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{currentUser?.name || 'User'}</p>
                    <p className="text-xs text-gray-400 truncate">{currentUser?.email || ''}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                    style={{
                      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                      boxShadow: '3px 3px 6px #0a0f1a, -3px -3px 6px #1e2a3a'
                    }}
                  >
                    <MdLogout size={18} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Change Password Modal - FIRESTORE VERSION */}
      <AnimatePresence>
        {isChangePasswordOpen && (
          <>
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChangePasswordOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101]"
            >
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
                  boxShadow: '30px 30px 60px -15px #000000, -30px -30px 60px -15px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <MdLock className="text-blue-400" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Change Password</h3>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsChangePasswordOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
                    style={{
                      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                      boxShadow: '3px 3px 6px #0a0f1a, -3px -3px 6px #1e2a3a'
                    }}
                  >
                    <MdCloseIcon size={20} />
                  </motion.button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        className="w-full px-4 py-3 pr-10 rounded-xl text-white placeholder-gray-500 transition-all duration-300"
                        style={{
                          background: 'linear-gradient(145deg, #0f172a, #1a2535)',
                          boxShadow: 'inset 3px 3px 6px #0a0f1a, inset -3px -3px 6px #1e2a3a',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPasswords.current ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className="w-full px-4 py-3 pr-10 rounded-xl text-white placeholder-gray-500 transition-all duration-300"
                        style={{
                          background: 'linear-gradient(145deg, #0f172a, #1a2535)',
                          boxShadow: 'inset 3px 3px 6px #0a0f1a, inset -3px -3px 6px #1e2a3a',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPasswords.new ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className="w-full px-4 py-3 pr-10 rounded-xl text-white placeholder-gray-500 transition-all duration-300"
                        style={{
                          background: 'linear-gradient(145deg, #0f172a, #1a2535)',
                          boxShadow: 'inset 3px 3px 6px #0a0f1a, inset -3px -3px 6px #1e2a3a',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPasswords.confirm ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {passwordError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <p className="text-sm text-red-400">{passwordError}</p>
                    </motion.div>
                  )}

                  {/* Success Message */}
                  {passwordSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                    >
                      <p className="text-sm text-green-400">{passwordSuccess}</p>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setIsChangePasswordOpen(false)}
                      className="flex-1 px-4 py-3 rounded-xl text-gray-300 hover:text-white transition-all duration-300"
                      style={{
                        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                        boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                        border: '1px solid rgba(255,255,255,0.03)'
                      }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all duration-300 relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.5)',
                        opacity: isLoading ? 0.7 : 1
                      }}
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto"
                        />
                      ) : (
                        "Change Password"
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer to push content below fixed navbar */}
      <div className="h-[76px]" />
    </>
  );
};

export default Navbar;
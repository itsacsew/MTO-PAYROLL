import React, { useState, useContext } from "react";
import {
  MdDashboard,
  MdTaskAlt,
  MdSend,
  MdDownload,
  MdPrint,
  MdChevronLeft,
  MdChevronRight,
  MdLogout,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { setOpenSidebar, logout } from "../redux/slices/authSlice";
import clsx from "clsx";
import { SidebarContext } from "../App";
import { motion, AnimatePresence } from "framer-motion";

import logo from "../assets/logo1.png";

// MTO Office Links
const mtoLinks = [
  {
    label: "Dashboard",
    link: "dashboard",
    icon: <MdDashboard size={22} />,
    description: "Overview & analytics"
  },
  {
    label: "Send File",
    link: "send-file",
    icon: <MdSend size={22} />,
    description: "Transfer documents"
  },
  {
    label: "Receive File",
    link: "file",
    icon: <MdDownload size={22} />,
    description: "Incoming files"
  },
  {
    label: "Print File",
    link: "print-file",
    icon: <MdPrint size={22} />,
    description: "Print documents"
  },
];

// Accounting Office Links
const accountingLinks = [
  {
    label: "Tasks",
    link: "tasks",
    icon: <MdTaskAlt size={22} />,
    description: "Manage tasks"
  },
  {
    label: "Receive File",
    link: "receive-file",
    icon: <MdDownload size={22} />,
    description: "Incoming files"
  },
  {
    label: "Send File",
    link: "file-send",
    icon: <MdSend size={22} />,
    description: "Transfer documents"
  },
];

const Sidebar = ({ userOffice, onToggleSidebar }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();

  const { isSidebarCollapsed, setIsSidebarCollapsed } = useContext(SidebarContext);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);

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
  const userOfficeLocal = currentUser?.office || userOffice || '';

  const sidebarLinks = userOfficeLocal === 'Accounting' ? accountingLinks : mtoLinks;

  const closeSidebar = () => {
    dispatch(setOpenSidebar(false));
  };

  const toggleSidebar = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    const newCollapsedState = !isSidebarCollapsed;

    setIsSidebarCollapsed(newCollapsedState);

    if (onToggleSidebar) {
      onToggleSidebar(newCollapsedState);
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const NavLink = ({ el, index }) => {
    const isActive = path === el.link.split("/")[0];

    return (
      <div
        className="relative"
        onMouseEnter={() => isSidebarCollapsed && setShowTooltip(index)}
        onMouseLeave={() => setShowTooltip(null)}
      >
        <Link
          to={el.link}
          onClick={closeSidebar}
          className={clsx(
            "flex gap-3 py-2.5 rounded-xl items-center text-sm font-medium overflow-hidden relative",
            isSidebarCollapsed ? "w-12 justify-center" : "w-full px-3",
            isAnimating && "transition-all duration-300 ease-out",
            isActive 
              ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white" 
              : "text-gray-300 hover:bg-white/5"
          )}
        >
          {/* Icon */}
          <span className={clsx(
            "relative z-10",
            isActive ? "text-white" : "text-gray-400"
          )}>
            {el.icon}
          </span>

          {/* Label */}
          <span className={clsx(
            "relative z-10 font-medium whitespace-nowrap",
            isSidebarCollapsed ? "hidden" : "block",
            isActive ? "text-white" : "text-gray-300"
          )}>
            {el.label}
          </span>

          {/* Active indicator line */}
          {isActive && (
            <div className="absolute left-0 w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full" />
          )}
        </Link>

        {/* Tooltip for collapsed state */}
        {isSidebarCollapsed && showTooltip === index && (
          <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-xl border border-gray-700">
            <div className="font-medium">{el.label}</div>
            <div className="text-gray-400 text-[10px]">{el.description}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      animate={{ width: isSidebarCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={clsx(
        "text-white h-full relative overflow-hidden",
        "rounded-tr-2xl rounded-br-2xl",
        "shadow-2xl"
      )}
      style={{
        background: 'radial-gradient(circle at 0% 0%, #1E3A5F, #0A1A2F), linear-gradient(135deg, #1E3A5F 0%, #2A4A6A 30%, #3A5A7A 50%, #2A4A6A 70%, #1A3A5A 100%)',
      }}
    >
      {/* Animated gradient overlay */}
      <motion.div
        animate={{
          opacity: [0.1, 0.15, 0.1],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 70% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)'
        }}
      />

      {/* Glassmorphism shine effect */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
          delay: 2
        }}
        className="absolute top-0 left-0 w-40 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
      />

      {/* Header with Logo and PAYROLL Text */}
      <div className="flex items-center justify-between mb-6 p-4 relative z-10">
        <div className="flex gap-2 items-center w-full relative">
          {/* Logo */}
          <div
            className={clsx(
              "rounded-xl overflow-hidden flex-shrink-0",
              "ring-2 ring-white/20 shadow-xl",
              isAnimating && "transition-all duration-300 ease-out"
            )}
            style={{
              width: isSidebarCollapsed ? '40px' : '48px',
              height: isSidebarCollapsed ? '40px' : '48px',
            }}
          >
            <img
              src={logo}
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* PAYROLL Text Container */}
          <div
            className={clsx(
              "flex items-center justify-between flex-1",
              isSidebarCollapsed && "hidden"
            )}
          >
            {/* PAYROLL Label with gradient text */}
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              PAYROLL
            </span>

            {/* Toggle Button with animations */}
            <motion.button
              onClick={toggleSidebar}
              disabled={isAnimating}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={{
                rotate: isSidebarCollapsed ? 0 : 180
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 flex-shrink-0 ml-2 backdrop-blur-sm border border-white/10 shadow-lg transition-colors duration-200"
              title="Collapse Sidebar"
            >
              <MdChevronLeft size={18} className="text-white" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Expand button when collapsed */}
      {isSidebarCollapsed && (
        <div className="flex justify-center mb-6 px-4 relative z-10">
          <motion.button
            onClick={toggleSidebar}
            disabled={isAnimating}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 shadow-lg transition-colors duration-200"
            title="Expand Sidebar"
          >
            <MdChevronRight size={18} className="text-white" />
          </motion.button>
        </div>
      )}

      {/* Office Badge */}
      {!isSidebarCollapsed && (
        <div className="mb-6 px-4 relative z-10">
          <div className="p-3 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-xl border border-white/20 shadow-xl">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Logged in as</p>
            <p className="text-base font-bold text-white capitalize truncate drop-shadow-md">
              {userOfficeLocal || 'Unknown Office'}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5">
              {userOfficeLocal === 'Accounting' ? 'Financial Management' : 'File Operations'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 flex flex-col gap-1 px-3 relative z-10">
        {sidebarLinks.map((link, index) => (
          <NavLink el={link} key={link.label} index={index} />
        ))}
      </div>

      {/* User Info */}
      {!isSidebarCollapsed && (
        <div className="mt-4 pt-4 border-t border-white/10 px-4 relative z-10">
          <div className="p-2 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-lg">
                <span className="text-white text-xs font-bold">
                  {currentUser?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/70">Welcome back,</p>
                <p className="text-sm font-semibold text-white truncate drop-shadow-md">
                  {currentUser?.name || 'User'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors duration-200"
                title="Logout"
              >
                <MdLogout size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact user info when collapsed */}
      {isSidebarCollapsed && (
        <div className="mt-4 pt-4 border-t border-white/10 px-4 relative z-10">
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center ring-2 ring-white/20 shadow-lg">
              <span className="text-white text-xs font-bold">
                {currentUser?.name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Sidebar;
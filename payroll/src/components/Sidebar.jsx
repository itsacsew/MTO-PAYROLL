import React, { useState, useContext } from "react";
import {
  MdDashboard,
  MdTaskAlt,
  MdSend,
  MdDownload,
  MdPrint,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { setOpenSidebar } from "../redux/slices/authSlice";
import clsx from "clsx";
import { SidebarContext } from "../App";

import logo from "../assets/logo1.png";

// MTO Office Links
const mtoLinks = [
  {
    label: "Dashboard",
    link: "dashboard",
    icon: <MdDashboard size={25} />,
  },
  {
    label: "Send File",
    link: "send-file",
    icon: <MdSend size={25} />,
  },
  {
    label: "Receive File",
    link: "file", // IMPORTANTE: i-change gikan sa 'receive-file' padung sa 'file-received'
    icon: <MdDownload size={25} />,
  },
  {
    label: "Print File",
    link: "print-file",
    icon: <MdPrint size={25} />,
  },
];

// Accounting Office Links
const accountingLinks = [
  {
    label: "Tasks",
    link: "tasks",
    icon: <MdTaskAlt size={25} />,
  },
  {
    label: "Receive File",
    link: "receive-file",
    icon: <MdDownload size={25} />,
  },
  {
    label: "Send File",
    link: "file-send",
    icon: <MdSend size={25} />,
  },
];

const Sidebar = ({ userOffice, onToggleSidebar }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useContext(SidebarContext);
  const [isAnimating, setIsAnimating] = useState(false);

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

  const NavLink = ({ el, index }) => {
    const delay = index * 60;
    
    return (
      <Link
        to={el.link}
        onClick={closeSidebar}
        className={clsx(
          "flex gap-3 py-3 rounded-lg items-center text-[#80ED99] text-base hover:bg-[#80ed997a] overflow-hidden relative",
          path === el.link.split("/")[0] ? "bg-[#80ed997a] text-[#80ED99] shadow-md" : "hover:text-[#80ED99]",
          isSidebarCollapsed ? "w-12 justify-center" : "w-full px-4",
          isAnimating && "transition-all duration-300 ease-out"
        )}
        style={{
          transitionDelay: isAnimating ? `${delay}ms` : '0ms'
        }}
        title={isSidebarCollapsed ? el.label : ""}
      >
        <span className={clsx(
          path === el.link.split("/")[0] ? "text-[#80ED99]" : "text-[#80ED99]",
          "flex-shrink-0",
          isAnimating && "transition-all duration-300 ease-out"
        )}>
          {el.icon}
        </span>
        
        <span className={clsx(
          "font-medium whitespace-nowrap",
          isSidebarCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto ml-2",
          isAnimating && "transition-all duration-300 ease-out"
        )}
        style={{
          transitionDelay: isAnimating ? `${delay + 100}ms` : '0ms'
        }}>
          {el.label}
        </span>
      </Link>
    );
  };

  return (
    <div
  className={clsx(
    "text-white h-full bg-gradient-to-b from-[#0D3721] to-[#0F1E2E] relative overflow-hidden w-full",
    isSidebarCollapsed ? "w-20" : "w-64",
    isAnimating && "transition-all duration-500 ease-out",
    "rounded-tr-2xl rounded-br-2xl"
  )}
>

      {/* Header with Logo and PAYROLL Text */}
      <div className="flex items-center justify-between mb-8 p-4">
        <div className="flex gap-2 items-center w-full relative">
          {/* Logo image - always visible */}
          <div className={clsx(
            "rounded-full overflow-hidden flex-shrink-0 z-10",
            isAnimating && "transition-all duration-300 ease-out"
          )}
          style={{
            width: isSidebarCollapsed ? '40px' : '48px',
            height: isSidebarCollapsed ? '40px' : '48px',
          }}>
            <img
              src={logo}
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* PAYROLL Text Container */}
          <div className={clsx(
            "flex items-center justify-between flex-1",
            isAnimating && "transition-all duration-300 ease-out"
          )}
          style={{
            marginLeft: isSidebarCollapsed ? '0' : '12px',
          }}>
            {/* PAYROLL Label - hide when collapsed */}
            {!isSidebarCollapsed && (
              <span className={clsx(
                "text-2xl font-extrabold text-[#80ED99] tracking-wide drop-shadow-sm whitespace-nowrap",
                isAnimating && "transition-all duration-300 ease-out"
              )}>
                PAYROLL
              </span>
            )}
            
            {/* Toggle Button - only show when expanded */}
            {!isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                disabled={isAnimating}
                className={clsx(
                  "p-2 rounded-md bg-[#80ed997a] hover:bg-[#1d6c2f] flex-shrink-0 z-10 ml-2",
                  isAnimating && "transition-all duration-300 ease-out"
                )}
                title="Collapse Sidebar"
              >
                <MdChevronLeft size={20} className="text-[#80ED99]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* When collapsed, show toggle button */}
      {isSidebarCollapsed && (
        <div className="flex justify-center mb-8 px-4">
          <button
            onClick={toggleSidebar}
            disabled={isAnimating}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
            title="Expand Sidebar"
          >
            <MdChevronRight size={20} className="text-white" />
          </button>
        </div>
      )}

      {/* Office Badge - hide when collapsed */}
      {!isSidebarCollapsed && (
        <div className={clsx(
          "mb-8 px-4",
          isAnimating && "transition-all duration-300 ease-out"
        )}>
          <div className="p-4 bg-[#80ED99] rounded-lg">
            <p className="text-sm text-black">Logged in as:</p>
            <p className="text-lg font-bold text-black capitalize truncate">
              {userOfficeLocal || 'Unknown Office'}
            </p>
            <p className="text-xs text-black mt-1">
              {userOfficeLocal === 'Accounting' ? 'Financial Management' : 'File Operations'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 flex flex-col gap-y-2 px-4">
        {sidebarLinks.map((link, index) => (
          <NavLink el={link} key={link.label} index={index} />
        ))}
      </div>

      {/* User Info - hide when collapsed */}
      {!isSidebarCollapsed && (
        <div className="mt-4 pt-5 border-t border-[#80ED99] px-4">
          <div className="text-center">
            <p className="text-sm text-[#80ED99]">Welcome back,</p>
            <p className="font-semibold text-[#80ED99] truncate">
              {currentUser?.name || 'User'}
            </p>
            <p className="text-xs text-[#80ED99] truncate">
              {currentUser?.email || ''}
            </p>
          </div>
        </div>
      )}
      
      {/* Compact user info when collapsed */}
      {isSidebarCollapsed && (
        <div className="mt-4 pt-5 border-t border-gray-600 px-4">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-2">
              <span className="text-white text-xs font-bold">
                {currentUser?.name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
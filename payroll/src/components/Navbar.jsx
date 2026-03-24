// Navbar.jsx (with Real-time Chat Feature and Database Link)
import React, { useState, useContext, useEffect, useRef } from "react";
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
  MdChat,
  MdSettings,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdClose as MdCloseIcon,
  MdWaves,
  MdAccessTime,
  MdPerson,
  MdAttachFile,
  MdEmojiEmotions,
  MdStorage // Added for Database icon
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { setOpenSidebar, logout } from "../redux/slices/authSlice";
import { SidebarContext } from "../App";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "./UserAvatar";
import logo from "../assets/logo1.png";
import { db } from '../config/firebase';
import { 
  doc, 
  updateDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  limit,
  getDocs,
  where
} from "firebase/firestore";

// MTO Office Links (Updated with Database)
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
  },
  {
    label: "Database",
    link: "database",
    icon: <MdStorage size={25} />,
    description: "View all data records"
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

// Accounting Office Links (Updated with Database)
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
  {
    label: "Database",
    link: "database",
    icon: <MdStorage size={20} />,
    description: "View all data records"
  }
];

// Real-time Clock Component
const RealtimeClock = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time to 12-hour format with AM/PM
  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    // Add leading zeros
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
    
    return `${hours}:${formattedMinutes}:${formattedSeconds} ${ampm}`;
  };
  
  // Format date
  const formatDate = (date) => {
    const options = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2 rounded-xl"
      style={{
        background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
        boxShadow: 'inset 2px 2px 5px #050505, inset -2px -2px 5px #1f1f2a',
        border: '1px solid rgba(255,255,255,0.03)'
      }}
    >
      <MdAccessTime className="text-orange-400" size={18} />
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-white">
          {formatTime(time)}
        </span>
        <span className="text-[10px] text-gray-400">
          {formatDate(time)}
        </span>
      </div>
    </motion.div>
  );
};

// Chat Message Component
const ChatMessage = ({ message, isOwnMessage }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {!isOwnMessage && (
          <div className="flex items-center gap-2 mb-1 ml-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {message.senderName?.charAt(0) || 'U'}
              </span>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {message.senderName}
            </span>
            <span className="text-[10px] text-gray-500">
              {message.formattedTime}
            </span>
          </div>
        )}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwnMessage
              ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
              : 'bg-gray-800 text-gray-200'
          }`}
          style={{
            boxShadow: isOwnMessage 
              ? '0 4px 12px rgba(249, 115, 22, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          <p className="text-sm break-words">{message.text}</p>
        </div>
        {isOwnMessage && (
          <div className="flex items-center justify-end gap-1 mt-1 mr-1">
            <span className="text-[10px] text-gray-500">
              {message.formattedTime}
            </span>
            {/* Seen Status Indicator */}
            {message.read && (
              <div className="flex items-center gap-0.5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[10px] text-blue-400"
                  title="Seen"
                >
                  ✓✓
                </motion.div>
              </div>
            )}
            {!message.read && message.sender !== message.receiver && (
              <div className="text-[10px] text-gray-500" title="Sent">
                ✓
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Chat Component
// Chat Component - With Auto Read Functionality
const ChatComponent = ({ currentUser, onClose, onUnreadCountUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [offices, setOffices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);

  const currentOffice = currentUser?.office || 'MTO';
  
  // Fetch all available offices from users collection
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        const uniqueOffices = new Set();
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.office && userData.office !== currentOffice) {
            uniqueOffices.add(userData.office);
          }
        });
        setOffices(Array.from(uniqueOffices));
        if (uniqueOffices.size > 0) {
          setSelectedOffice(Array.from(uniqueOffices)[0]);
        }
      } catch (error) {
        console.error("Error fetching offices:", error);
      }
    };
    fetchOffices();
  }, [currentOffice]);

  // Function to mark messages as read
  const markMessagesAsRead = async (chatId) => {
    if (!chatId || !selectedOffice) return;
    
    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(
        messagesRef, 
        where("receiver", "==", currentOffice),
        where("read", "==", false)
      );
      
      const unreadMessages = await getDocs(q);
      
      // Update each unread message with read status and read timestamp
      const updatePromises = unreadMessages.docs.map(async (messageDoc) => {
        const messageRef = doc(db, "chats", chatId, "messages", messageDoc.id);
        await updateDoc(messageRef, {
          read: true,
          readAt: serverTimestamp(),
          readBy: currentOffice
        });
      });
      
      await Promise.all(updatePromises);
      
      if (unreadMessages.docs.length > 0) {
        console.log(`Marked ${unreadMessages.docs.length} messages as read`);
        // Notify parent to update unread count
        if (onUnreadCountUpdate) {
          onUnreadCountUpdate();
        }
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Subscribe to messages between current office and selected office with real-time updates
  useEffect(() => {
    if (!selectedOffice) return;

    const chatId = [currentOffice, selectedOffice].sort().join('_');
    
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = [];
      snapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() });
      });
      setMessages(newMessages);
      scrollToBottom();
      
      // Auto-mark messages as read when new messages arrive and chat is open
      if (hasMarkedRead) {
        markMessagesAsRead(chatId);
      }
    }, (error) => {
      console.error("Error fetching messages:", error);
    });
    
    // Mark messages as read when chat is opened or office changes
    const markRead = async () => {
      await markMessagesAsRead(chatId);
      setHasMarkedRead(true);
    };
    
    markRead();
    
    return () => unsubscribe();
  }, [selectedOffice, currentOffice]);

  // Effect to mark messages as read when chat is focused
  useEffect(() => {
    if (!selectedOffice || !hasMarkedRead) return;
    
    const chatId = [currentOffice, selectedOffice].sort().join('_');
    
    // Mark any new unread messages as read when component updates
    const markNewMessages = async () => {
      await markMessagesAsRead(chatId);
    };
    
    markNewMessages();
  }, [messages, selectedOffice, hasMarkedRead]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatReadTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedOffice) return;
    
    setIsLoading(true);
    
    try {
      const chatId = [currentOffice, selectedOffice].sort().join('_');
      const messagesRef = collection(db, "chats", chatId, "messages");
      
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        sender: currentOffice,
        senderName: currentUser?.name || currentOffice,
        receiver: selectedOffice,
        timestamp: serverTimestamp(),
        read: false,
        readAt: null
      });
      
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unread count for current chat
  const getUnreadCount = () => {
    return messages.filter(msg => 
      msg.receiver === currentOffice && 
      !msg.read && 
      msg.sender !== currentOffice
    ).length;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed bottom-24 right-6 w-[380px] h-[550px] rounded-2xl overflow-hidden z-[100] shadow-2xl flex flex-col"
      style={{
        background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
        border: '1px solid rgba(255,255,255,0.03)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Chat Header - FIXED AT TOP */}
      <div 
        className="relative z-10 p-4 border-b border-white/5 flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(236, 72, 153, 0.1))'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
              <MdChat className="text-white" size={18} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Office Chat</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400">
                  {selectedOffice ? `Chatting with ${selectedOffice}` : 'Select an office'}
                </p>
                {getUnreadCount() > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">
                    {getUnreadCount()} unread
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '3px 3px 6px #050505, -3px -3px 6px #1f1f2a'
            }}
          >
            <MdClose size={18} />
          </button>
        </div>
      </div>

      {/* Office Selector - FIXED BELOW HEADER */}
      <div className="relative z-10 p-3 border-b border-white/5 flex-shrink-0">
        <select
          value={selectedOffice}
          onChange={(e) => setSelectedOffice(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-white text-sm bg-transparent border border-white/10 focus:border-orange-500 transition-colors"
          style={{
            background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)'
          }}
        >
          {offices.map(office => (
            <option key={office} value={office} className="bg-gray-900">
              {office}
            </option>
          ))}
        </select>
      </div>

      {/* Messages Container - SCROLLABLE AREA */}
      <div 
        ref={chatContainerRef}
        className="relative z-10 flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MdChat className="text-gray-600 text-4xl mb-2" />
            <p className="text-gray-400 text-sm">No messages yet</p>
            <p className="text-gray-500 text-xs">Start a conversation with {selectedOffice}</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={{
                ...message,
                formattedTime: formatTime(message.timestamp),
                readTime: message.readAt ? formatReadTime(message.readAt) : null
              }}
              isOwnMessage={message.sender === currentOffice}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - FIXED AT BOTTOM */}
      <form onSubmit={handleSendMessage} className="relative z-10 p-3 border-t border-white/5 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${selectedOffice || 'office'}...`}
            disabled={!selectedOffice}
            className="flex-1 px-4 py-2 rounded-xl text-white placeholder-gray-500 text-sm transition-all duration-300"
            style={{
              background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
              boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!selectedOffice || !newMessage.trim() || isLoading}
            className="px-4 py-2 rounded-xl text-white font-medium transition-all duration-200 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f97316, #ec4899)',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
            }}
          >
            <MdSend size={18} />
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useContext(SidebarContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isHovering, setIsHovering] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  
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

  // Track mouse position for parallax effects
  React.useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 10,
        y: (e.clientY / window.innerHeight - 0.5) * 10
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

  // Subscribe to unread messages count
  // Update the unreadChatCount useEffect sa Navbar
useEffect(() => {
  if (!userOffice) return;

  const fetchUnreadCount = async () => {
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const otherOffices = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.office && userData.office !== userOffice) {
          otherOffices.push(userData.office);
        }
      });

      let totalUnread = 0;
      for (const office of otherOffices) {
        const chatId = [userOffice, office].sort().join('_');
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, where("receiver", "==", userOffice), where("read", "==", false));
        const snapshot = await getDocs(q);
        totalUnread += snapshot.size;
      }
      setUnreadChatCount(totalUnread);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  fetchUnreadCount();
  
  // Set up real-time listener for unread messages
  const setupUnreadListener = async () => {
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const otherOffices = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.office && userData.office !== userOffice) {
          otherOffices.push(userData.office);
        }
      });

      // Set up listeners for each chat
      const unsubscribes = [];
      for (const office of otherOffices) {
        const chatId = [userOffice, office].sort().join('_');
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, where("receiver", "==", userOffice), where("read", "==", false));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          // Update total unread count
          setUnreadChatCount(prev => {
            // Recalculate all unread counts
            const recalculateUnread = async () => {
              let newTotal = 0;
              for (const otherOffice of otherOffices) {
                const otherChatId = [userOffice, otherOffice].sort().join('_');
                const otherMessagesRef = collection(db, "chats", otherChatId, "messages");
                const otherQ = query(otherMessagesRef, where("receiver", "==", userOffice), where("read", "==", false));
                const otherSnapshot = await getDocs(otherQ);
                newTotal += otherSnapshot.size;
              }
              return newTotal;
            };
            recalculateUnread().then(setUnreadChatCount);
            return prev;
          });
        });
        
        unsubscribes.push(unsubscribe);
      }
      
      return () => {
        unsubscribes.forEach(unsubscribe => unsubscribe());
      };
    } catch (error) {
      console.error("Error setting up unread listener:", error);
    }
  };
  
  setupUnreadListener();
}, [userOffice]);

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
  const refreshUnreadCount = async () => {
  if (!userOffice) return;
  
  try {
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    const otherOffices = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.office && userData.office !== userOffice) {
        otherOffices.push(userData.office);
      }
    });

    let totalUnread = 0;
    for (const office of otherOffices) {
      const chatId = [userOffice, office].sort().join('_');
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, where("receiver", "==", userOffice), where("read", "==", false));
      const snapshot = await getDocs(q);
      totalUnread += snapshot.size;
    }
    setUnreadChatCount(totalUnread);
  } catch (error) {
    console.error("Error refreshing unread count:", error);
  }
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
      const userId = currentUser?.id || currentUser?.uid;
      
      if (!userId) {
        setPasswordError("User ID not found");
        setIsLoading(false);
        return;
      }
      
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        setPasswordError("User not found in database");
        setIsLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      
      if (userData.password !== passwordData.currentPassword) {
        setPasswordError("Current password is incorrect");
        setIsLoading(false);
        return;
      }
      
      await updateDoc(userRef, {
        password: passwordData.newPassword,
        passwordUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      const storedUser = localStorage.getItem("auth_user_v1");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.password = passwordData.newPassword;
        localStorage.setItem("auth_user_v1", JSON.stringify(parsedUser));
      }
      
      setPasswordSuccess("Password changed successfully!");
      
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
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

  const NavLink = ({ el, isMobile = false }) => {
    const currentPath = location.pathname;
    const linkPath = `/${el.link}`;
    const isActive = currentPath === linkPath || 
                     currentPath === `/${el.link}/` || 
                     (el.link === 'dashboard' && (currentPath === '/' || currentPath === '/dashboard'));

    return (
      <Link
        to={el.link === 'dashboard' ? '/' : el.link}
        onClick={closeMobileMenu}
        className={`
          relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
          ${isMobile ? 'w-full' : ''}
          group
        `}
        style={{
          marginRight: !isMobile ? '3px' : '0',
          backgroundColor: isActive ? '#f97316' : 'transparent',
          color: isActive ? '#ffffff' : '#9ca3af',
        }}
      >
        {isActive && (
          <div 
            className="absolute inset-0 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #f97316, #ec4899)',
              boxShadow: '0 10px 20px -5px rgba(249, 115, 22, 0.3)',
            }}
          />
        )}
        <span className="relative z-10" style={{ color: isActive ? '#ffffff' : '#9ca3af' }}>
          {el.icon}
        </span>
        <span className="relative z-10 font-medium whitespace-nowrap" style={{ color: isActive ? '#ffffff' : '#9ca3af' }}>
          {el.label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* Main Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'linear-gradient(145deg, #0a0a0f 0%, #1a1a2a 50%, #0a0a0f 100%)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.03)'
        }}
      >
        {/* Abstract sphere background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: mousePosition.x,
              y: mousePosition.y,
            }}
            transition={{ type: "spring", stiffness: 50, damping: 30 }}
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(249, 115, 22, 0.15), transparent 70%)',
              filter: 'blur(60px)',
              pointerEvents: 'none'
            }}
          />
          
          <motion.div
            animate={{
              x: -mousePosition.x * 0.5,
              y: -mousePosition.y * 0.5,
            }}
            transition={{ type: "spring", stiffness: 50, damping: 30 }}
            className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.15), transparent 70%)',
              filter: 'blur(60px)',
              pointerEvents: 'none'
            }}
          />
          
          <motion.div
            animate={{
              x: mousePosition.x * 0.3,
              y: mousePosition.y * 0.3,
            }}
            transition={{ type: "spring", stiffness: 50, damping: 30 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1), transparent 70%)',
              filter: 'blur(80px)',
              pointerEvents: 'none'
            }}
          />
        </div>

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
          className="absolute top-0 left-0 w-60 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"
        />

        {/* Navbar Content */}
        <div className="relative z-10 px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left Section - Logo and Mobile Menu Button */}
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMobileMenu}
              className="lg:hidden text-white text-2xl p-2 rounded-xl transition-all duration-300"
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
              }}
            >
              {isMobileMenuOpen ? <MdClose /> : <MdMenu />}
            </motion.button>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-xl overflow-hidden"
                  style={{
                    boxShadow: '8px 8px 15px #050505, -8px -8px 15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.1)',
                  }}
                >
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl opacity-20 blur-sm" />
              </div>
              
              <div className="hidden sm:block">
                <span className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent"
                  style={{
                    textShadow: '0 2px 10px rgba(249, 115, 22, 0.3)'
                  }}
                >
                  PAYROLL
                </span>
                <p className="text-[10px] text-gray-500 tracking-wider">DOCUMENT TRACKING</p>
              </div>
            </motion.div>
          </div>

          {/* Center - Desktop Navigation Links */}
          <div className="hidden lg:flex items-center px-4 py-1.5 rounded-2xl"
            style={{
              background: 'rgba(10, 10, 15, 0.6)',
              backdropFilter: 'blur(10px)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05), 0 10px 20px -10px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.03)',
              gap: '30px'
            }}
          >
            {sidebarLinks.map((link, index) => (
              <NavLink key={link.label} el={link} />
            ))}
          </div>

          {/* Right Section - User Info, Clock, and Avatar */}
          <div className="flex items-center gap-2">
            {/* Real-time Clock */}
            <RealtimeClock />

            {/* Chat Button - REPLACED notification bell */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="relative p-2.5 rounded-xl text-gray-400 hover:text-white transition-all duration-300"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: isChatOpen 
                    ? 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a'
                    : '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                }}
              >
                <MdChat size={20} />
                {unreadChatCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                    style={{
                      boxShadow: '0 2px 5px rgba(249, 115, 22, 0.5)',
                      border: '2px solid #0a0a0f'
                    }}
                  >
                    {unreadChatCount}
                  </motion.span>
                )}
              </motion.button>
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
                    ? 'linear-gradient(145deg, #1a1a2a, #0a0a0f)'
                    : 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: isUserMenuOpen
                    ? 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a'
                    : '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <div className="hidden md:block text-left">
                  <p className="text-xs text-gray-400">Welcome back,</p>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    {currentUser?.name?.split(' ')[0] || 'User'}
                    
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-orange-300 rounded-md"
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

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-72 rounded-2xl overflow-hidden z-50"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: '20px 20px 40px -10px #050505, -20px -20px 40px -10px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}
                  >
                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-2xl pointer-events-none" />
                    
                    <div className="relative z-10 p-5 border-b border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-xl overflow-hidden"
                            style={{
                              background: 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                              boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.05)'
                            }}
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-2xl font-bold text-orange-400">
                                {currentUser?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl opacity-20 blur-sm" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{currentUser?.name || 'User'}</p>
                          <p className="text-xs text-gray-400">{currentUser?.email || ''}</p>
                          <div className="mt-2 inline-block px-2 py-1 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-lg border border-white/5">
                            <span className="text-xs font-medium text-orange-300">
                              {userOffice || 'MTO Office'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 p-2 space-y-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsChangePasswordOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-300 hover:text-white transition-all duration-200"
                        style={{
                          background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                          boxShadow: '3px 3px 6px #050505, -3px -3px 6px #1f1f2a'
                        }}
                      >
                        <MdLock size={18} className="text-gray-400" />
                        <span className="text-sm">Change Password</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-300 hover:text-white transition-all duration-200"
                        style={{
                          background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                          boxShadow: '3px 3px 6px #050505, -3px -3px 6px #1f1f2a'
                        }}
                      >
                        <MdLogout size={18} className="text-gray-400" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>

                    <div className="relative z-10 p-3 border-t border-white/5">
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 z-50 lg:hidden overflow-y-auto"
              style={{
                background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
                boxShadow: '20px 0 40px -10px rgba(0,0,0,0.5), inset -1px 0 2px rgba(255,255,255,0.05)',
                borderRight: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
              
              <div className="relative z-10 p-5 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl overflow-hidden"
                      style={{
                        boxShadow: '8px 8px 15px #050505, -8px -8px 15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.1)',
                      }}
                    >
                      <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl opacity-20 blur-sm" />
                  </div>
                  <div>
                    <span className="text-xl font-bold bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
                      PAYROLL
                    </span>
                    <div className="mt-1 inline-block px-2 py-0.5 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-xs font-medium text-orange-300">
                        {userOffice || 'MTO Office'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 p-3 space-y-1">
                {sidebarLinks.map((link) => (
                  <NavLink key={link.label} el={link} isMobile={true} />
                ))}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5"
                style={{
                  background: 'linear-gradient(0deg, #0a0a0f, transparent)'
                }}
              >
                <div className="relative z-10 flex items-center gap-3 p-2 rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    boxShadow: 'inset 2px 2px 5px #050505, inset -2px -2px 5px #1f1f2a'
                  }}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                      boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.05)'
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-lg font-bold text-orange-400">
                        {currentUser?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{currentUser?.name || 'User'}</p>
                    <p className="text-xs text-gray-400 truncate">{currentUser?.email || ''}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: '3px 3px 6px #050505, -3px -3px 6px #1f1f2a'
                    }}
                  >
                    <MdLogout size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
     <AnimatePresence>
  {isChatOpen && (
    <ChatComponent 
      currentUser={currentUser} 
      onClose={() => setIsChatOpen(false)}
      onUnreadCountUpdate={refreshUnreadCount}
    />
  )}
</AnimatePresence>


      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangePasswordOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChangePasswordOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />

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
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '30px 30px 60px -15px #000000, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />
                
                <div className="relative z-10 p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <MdLock className="text-orange-400" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Change Password</h3>
                  </div>
                  <button
                    onClick={() => setIsChangePasswordOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: '3px 3px 6px #050505, -3px -3px 6px #1f1f2a'
                    }}
                  >
                    <MdCloseIcon size={20} />
                  </button>
                </div>

                <form onSubmit={handlePasswordChange} className="relative z-10 p-6 space-y-4">
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
                          background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
                          boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
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
                          background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
                          boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
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
                          background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
                          boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
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

                  {passwordError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <p className="text-sm text-red-400">{passwordError}</p>
                    </motion.div>
                  )}

                  {passwordSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                    >
                      <p className="text-sm text-green-400">{passwordSuccess}</p>
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsChangePasswordOpen(false)}
                      className="flex-1 px-4 py-3 rounded-xl text-gray-300 hover:text-white transition-all duration-200"
                      style={{
                        background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                        boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                        border: '1px solid rgba(255,255,255,0.03)'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all duration-200 relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #ec4899)',
                        boxShadow: '0 10px 20px -5px #f97316',
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
                    </button>
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
// Budgets.jsx - Updated with 5-step flow: SENT → CHECKED → RECEIVED → CHECKED → PROCESSED
// This page only SHOWS the latest file status, no checking functionality

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../config/firebase'
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MdDownload, 
  MdInsertDriveFile,
  MdCheckCircle,
  MdSchedule,
  MdArrowForward,
  MdClose,
  MdVisibility,
  MdPending,
  MdAnalytics,
  MdWaves,
  MdBusiness,
  MdAttachMoney
} from 'react-icons/md'

const Budget = () => {
  const navigate = useNavigate()
  const [pendingFilesCount, setPendingFilesCount] = useState(0)
  const [latestFile, setLatestFile] = useState(null)
  const [allFiles, setAllFiles] = useState([])
  const [showAllFilesModal, setShowAllFilesModal] = useState(false)
  const [hoveredCard, setHoveredCard] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Track mouse position for parallax effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 10,
        y: (e.clientY / window.innerHeight - 0.5) * 10
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Load files and latest file status from Firestore
  useEffect(() => {
    const loadFileStatus = async () => {
      try {
        console.log('Loading file status from Firestore...')
        
        const q = query(
          collection(db, 'sentFiles'), 
          orderBy('timestamp', 'desc')
        )
        
        const querySnapshot = await getDocs(q)
        const files = []
        
        querySnapshot.forEach((doc) => {
          const fileData = doc.data()
          files.push({
            id: doc.id,
            fileName: fileData.fileName || 'Unknown File',
            status: fileData.status || 'sent',
            timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
            updatedEmployees: fileData.updatedEmployees || [],
            seniorEmployees: fileData.seniorEmployees || [],
            lastCheckedAt: fileData.lastCheckedAt || null,
            lastUpdatedAt: fileData.lastUpdatedAt || null,
            lastReceivedAt: fileData.receivedAt?.toDate?.() || fileData.lastReceivedAt || null,
            secondCheckedAt: fileData.secondCheckedAt || null
          })
        })
        
        // Count files that are sent but not yet checked
        const pendingCount = files.filter(file => 
          file.status === 'sent' || file.status === 'pending'
        ).length
        
        console.log('Pending files (sent):', pendingCount)
        
        setPendingFilesCount(pendingCount)
        setAllFiles(files)
        
        if (files.length > 0) {
          setLatestFile(files[0])
        } else {
          setLatestFile(null)
        }
        
      } catch (error) {
        console.error('Error loading file status from Firestore:', error)
      }
    }

    loadFileStatus()

    try {
      const q = query(
        collection(db, 'sentFiles'), 
        orderBy('timestamp', 'desc')
      )
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const files = []
          snapshot.forEach((doc) => {
            const fileData = doc.data()
            files.push({
              id: doc.id,
              fileName: fileData.fileName || 'Unknown File',
              status: fileData.status || 'sent',
              timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
              updatedEmployees: fileData.updatedEmployees || [],
              seniorEmployees: fileData.seniorEmployees || [],
              lastCheckedAt: fileData.lastCheckedAt || null,
              lastUpdatedAt: fileData.lastUpdatedAt || null,
              lastReceivedAt: fileData.receivedAt?.toDate?.() || fileData.lastReceivedAt || null,
              secondCheckedAt: fileData.secondCheckedAt || null
            })
          })
          
          const pendingCount = files.filter(file => 
            file.status === 'sent' || file.status === 'pending'
          ).length
          
          setPendingFilesCount(pendingCount)
          setAllFiles(files)
          
          if (files.length > 0) {
            setLatestFile(files[0])
          } else {
            setLatestFile(null)
          }
        },
        (error) => {
          console.error('Real-time listener error:', error)
        }
      )

      return () => unsubscribe()
    } catch (listenerError) {
      console.error('Error setting up real-time listener:', listenerError)
    }
  }, [])

  const handleReceiveFile = () => {
    console.log('Receive File clicked')
    navigate('/receive-file')
  }

  // Navigate to Gross1.jsx (the checker page with CHECKED button)
  const handleTotalGross = () => {
    console.log('Total Gross clicked - Navigating to Gross1.jsx (Checker page)')
    navigate('/gross')  // This should route to Gross1.jsx where checking happens
  }

  const getStepStatus = (fileStatus) => {
  if (!fileStatus) {
    return [false, false, false, false, false]
  }

  switch (fileStatus) {
    case 'sent':
    case 'pending':
      return [true, false, false, false, false]  // Step 1 only
    case 'checked':  // First check (can be checked multiple times)
      return [true, true, false, false, false]   // SENT + CHECKED
    case 'received':  // Received after first check
    case 'mark as received':
      return [true, true, true, false, false]    // SENT + CHECKED + RECEIVED
    case 'checked2':  // Second check (can be checked multiple times)
    case 'final_checked':
      return [true, true, true, true, false]     // SENT + CHECKED + RECEIVED + CHECKED2
    case 'processed':  // Final processed
      return [true, true, true, true, true]      // All 5 steps completed
    default:
      return [true, false, false, false, false]
  }
};

  const [fileSent, firstChecked, received, secondChecked, processed] = latestFile ? getStepStatus(latestFile.status) : [false, false, false, false, false]

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status description text
  const getStatusDescription = (file) => {
  if (!file) return 'No files have been sent yet. Go to Send File to start.'
  
  switch (file.status) {
    case 'sent':
    case 'pending':
      return 'File has been sent to Firestore. Waiting to be checked by Gross1/Budget Office.'
    case 'checked':
      return 'File has been checked by Gross1/Budget Office. Ready to be received by Accounting. (You can check again if needed, status will remain CHECKED)'
    case 'received':
    case 'mark as received':
      return 'File has been received by Accounting. Waiting for final check. (You can still edit the file)'
    case 'checked2':
    case 'final_checked':
      return 'File has been checked by Accounting. Ready for processing by MTO. (You can check again if needed, status will remain CHECKED2)'
    case 'processed':
      return 'File processing is complete! All steps done by MTO.'
    default:
      return `File status: ${file.status || 'unknown'}`
  }
};
  // Update getStatusInfo function
const getStatusInfo = (status) => {
  switch (status) {
    case 'sent':
    case 'pending':
      return { 
        icon: <MdSchedule size={18} />, 
        color: 'text-orange-400', 
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        gradient: 'from-orange-500 to-pink-500'
      }
    case 'checked':
      return { 
        icon: <MdCheckCircle size={18} />, 
        color: 'text-amber-400', 
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        gradient: 'from-amber-500 to-orange-500'
      }
    case 'received':
    case 'mark as received':
      return { 
        icon: <MdDownload size={18} />, 
        color: 'text-green-400', 
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        gradient: 'from-green-500 to-emerald-500'
      }
    case 'checked2':
    case 'final_checked':
      return { 
        icon: <MdCheckCircle size={18} />, 
        color: 'text-purple-400', 
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        gradient: 'from-purple-500 to-indigo-500'
      }
    case 'processed':
      return { 
        icon: <MdCheckCircle size={18} />, 
        color: 'text-cyan-400', 
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
        gradient: 'from-cyan-500 to-blue-500'
      }
    default:
      return { 
        icon: <MdInsertDriveFile size={18} />, 
        color: 'text-gray-400', 
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/20',
        gradient: 'from-gray-500 to-slate-500'
      }
  }
};

  // Status bar component for reuse - 5 steps: SENT → CHECKED → RECEIVED → CHECKED → PROCESSED
  const StatusBar = ({ file, showFileName = false }) => {
    const [sent, firstChecked, received, secondChecked, processed] = getStepStatus(file?.status)
    const statusInfo = getStatusInfo(file?.status)
    
    return (
      <div className="space-y-4">
        {showFileName && (
          <div 
            className={`p-4 rounded-xl ${statusInfo.bgColor} border ${statusInfo.borderColor} relative overflow-hidden`}
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.08)'
            }}
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500/10 to-purple-500/10 blur-2xl" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                      boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.05)'
                    }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${statusInfo.gradient} opacity-20`} />
                    <span className={`relative z-10 ${statusInfo.color}`}>{statusInfo.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      {file.fileName}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor} backdrop-blur-sm`}>
                        {file.status?.toUpperCase() || 'SENT'}
                      </span>
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MdSchedule size={12} />
                        Sent: {formatDate(file.timestamp)}
                      </p>
                      {file.lastCheckedAt && (
                        <p className="text-xs text-amber-400 flex items-center gap-1">
                          <MdCheckCircle size={12} />
                          Checked 1: {formatDate(file.lastCheckedAt)}
                        </p>
                      )}
                      {file.lastReceivedAt && (
                        <p className="text-xs text-green-400 flex items-center gap-1">
                          <MdDownload size={12} />
                          Received: {formatDate(file.lastReceivedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Status Steps - 5 steps: SENT → CHECKED → RECEIVED → CHECKED → PROCESSED */}
        <div className="relative px-2 py-4">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-700/50 -translate-y-1/2" 
            style={{
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)'
            }}
          />
          
          <div className="relative flex justify-between items-center">
            {/* Step 1: SENT */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                animate={{
                  scale: sent ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2`}
                style={{
                  background: sent 
                    ? 'linear-gradient(135deg, #f97316, #ec4899)'
                    : 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                  boxShadow: sent 
                    ? '0 10px 20px -5px rgba(249, 115, 22, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {sent ? (
                  <MdCheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">1</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${sent ? 'text-orange-400' : 'text-gray-500'}`}>
                SENT
              </span>
            </motion.div>

            {/* Step 2: CHECKED (First Check) */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                animate={{
                  scale: firstChecked ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2`}
                style={{
                  background: firstChecked 
                    ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                    : 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                  boxShadow: firstChecked 
                    ? '0 10px 20px -5px rgba(245, 158, 11, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {firstChecked ? (
                  <MdCheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">2</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${firstChecked ? 'text-amber-400' : 'text-gray-500'}`}>
                CHECKED
              </span>
            </motion.div>

            {/* Step 3: RECEIVED */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                animate={{
                  scale: received ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2`}
                style={{
                  background: received 
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                  boxShadow: received 
                    ? '0 10px 20px -5px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {received ? (
                  <MdCheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">3</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${received ? 'text-green-400' : 'text-gray-500'}`}>
                RECEIVED
              </span>
            </motion.div>

            {/* Step 4: CHECKED (Second Check) */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                animate={{
                  scale: secondChecked ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2`}
                style={{
                  background: secondChecked 
                    ? 'linear-gradient(135deg, #a855f7, #8b5cf6)'
                    : 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                  boxShadow: secondChecked 
                    ? '0 10px 20px -5px rgba(168, 85, 247, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {secondChecked ? (
                  <MdCheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">4</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${secondChecked ? 'text-purple-400' : 'text-gray-500'}`}>
                CHECKED
              </span>
            </motion.div>

            {/* Step 5: PROCESSED */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                animate={{
                  scale: processed ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2`}
                style={{
                  background: processed 
                    ? 'linear-gradient(135deg, #06b6d4, #0284c7)'
                    : 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                  boxShadow: processed 
                    ? '0 10px 20px -5px rgba(6, 182, 212, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {processed ? (
                  <MdCheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">5</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${processed ? 'text-cyan-400' : 'text-gray-500'}`}>
                PROCESSED
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Animated abstract sphere background */}
      <div className="fixed inset-0 overflow-hidden">
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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent"
              style={{
                textShadow: '0 2px 10px rgba(249, 115, 22, 0.3)'
              }}
            >
              Budget Management
            </h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <MdWaves className="text-orange-400" />
              Manage and track your file operations
            </p>
          </div>
          
          {/* Stats Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="px-6 py-3 rounded-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '15px 15px 30px #050505, -15px -15px 30px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-purple-500/20 blur-xl" />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Files</p>
                <p className="text-2xl font-bold text-white">{allFiles.length}</p>
              </div>
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-700 to-transparent" />
              <div className="text-right">
                <p className="text-xs text-gray-400">Pending (Sent)</p>
                <p className="text-2xl font-bold text-orange-400">{pendingFilesCount}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content - Simple 2-Column Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - File Operations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-2xl" />
            
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
              <MdAnalytics className="text-orange-400" />
              File Operations
            </h2>

            <div className="space-y-4 relative z-10">
              {/* Receive File Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setHoveredCard('receive')}
                onHoverEnd={() => setHoveredCard(null)}
                onClick={handleReceiveFile}
                className="relative w-full overflow-hidden rounded-xl p-8 text-left"
                style={{
                  background: hoveredCard === 'receive' 
                    ? 'linear-gradient(145deg, rgba(249, 115, 22, 0.15), #1a1a2a)'
                    : 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: hoveredCard === 'receive'
                    ? '15px 15px 30px #050505, -15px -15px 30px #1f1f2a, 0 0 30px rgba(249, 115, 22, 0.2)'
                    : '10px 10px 20px #050505, -10px -10px 20px #1f1f2a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <AnimatePresence>
                  {pendingFilesCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #ec4899)',
                        boxShadow: '0 5px 15px rgba(249, 115, 22, 0.3)',
                        border: '2px solid #0a0a0f'
                      }}
                    >
                      <span className="text-white text-xs font-bold">{pendingFilesCount}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  animate={{
                    x: hoveredCard === 'receive' ? ['-100%', '200%'] : '0%',
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: hoveredCard === 'receive' ? Infinity : 0,
                    ease: "linear"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                />

                {hoveredCard === 'receive' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/30 to-pink-500/30 blur-xl"
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-center gap-6">
                    <motion.div 
                      animate={{
                        rotate: hoveredCard === 'receive' ? [0, 5, -5, 0] : 0,
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #ec4899)',
                        boxShadow: '0 10px 20px -5px rgba(249, 115, 22, 0.3)'
                      }}
                    >
                      <MdDownload className="w-8 h-8 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-white">Receive File</h3>
                      <p className="text-gray-400 mt-2 text-lg">Get files after they've been checked</p>
                      <div className="flex items-center gap-1 mt-4 text-orange-400 text-base">
                        <span>View checked files</span>
                        <MdArrowForward className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Total Gross Button - Navigates to Gross1.jsx (Checker with CHECKED button) */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setHoveredCard('gross')}
                onHoverEnd={() => setHoveredCard(null)}
                onClick={handleTotalGross}
                className="relative w-full overflow-hidden rounded-xl p-8 text-left"
                style={{
                  background: hoveredCard === 'gross' 
                    ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.15), #1a1a2a)'
                    : 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: hoveredCard === 'gross'
                    ? '15px 15px 30px #050505, -15px -15px 30px #1f1f2a, 0 0 30px rgba(16, 185, 129, 0.2)'
                    : '10px 10px 20px #050505, -10px -10px 20px #1f1f2a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <motion.div
                  animate={{
                    x: hoveredCard === 'gross' ? ['-100%', '200%'] : '0%',
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: hoveredCard === 'gross' ? Infinity : 0,
                    ease: "linear"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                />

                {hoveredCard === 'gross' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 blur-xl"
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-center gap-6">
                    <motion.div 
                      animate={{
                        rotate: hoveredCard === 'gross' ? [0, 5, -5, 0] : 0,
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <MdAttachMoney className="w-8 h-8 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-white">Check File</h3>
                      <p className="text-gray-400 mt-2 text-lg">Check and validate sent files</p>
                      <div className="flex items-center gap-1 mt-4 text-green-400 text-base">
                        <span>Go to checker page</span>
                        <MdArrowForward className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Right Column - File Processing Status (Latest File Status Only) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MdPending className="text-orange-400" />
                  Latest File Status
                </h2>
                {allFiles.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAllFilesModal(true)}
                    className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      boxShadow: '0 5px 15px -5px #f97316',
                    }}
                  >
                    <MdVisibility size={14} />
                    View All ({allFiles.length})
                  </motion.button>
                )}
              </div>
              
              {/* Latest File Status with 5 steps: SENT → CHECKED → RECEIVED → CHECKED → PROCESSED */}
              {latestFile ? (
                <div className="space-y-4">
                  <StatusBar file={latestFile} />
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 rounded-xl text-center"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <MdInsertDriveFile className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-lg">
                    No files sent yet.
                  </p>
                </motion.div>
              )}

              {/* Status Description */}
              {latestFile && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    border: '1px solid rgba(249, 115, 22, 0.1)'
                  }}
                >
                  <p className="text-sm text-gray-300">
                    {getStatusDescription(latestFile)}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* All Files Modal */}
      <AnimatePresence>
        {showAllFilesModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllFilesModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="w-full max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden relative"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl" />
                <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl" />
                
                <div className="relative z-10 flex justify-between items-center p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MdInsertDriveFile className="text-orange-400" />
                    All Files Status
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAllFilesModal(false)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                    }}
                  >
                    <MdClose className="text-gray-400" size={20} />
                  </motion.button>
                </div>
                
                <div className="relative z-10 p-6 overflow-y-auto max-h-[60vh]">
                  {allFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <MdInsertDriveFile className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No files found.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {allFiles.map((file, index) => (
                        <div key={file.id}>
                          <StatusBar file={file} showFileName={true} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="relative z-10 flex justify-end p-6 border-t border-white/5">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAllFilesModal(false)}
                    className="px-6 py-2.5 rounded-xl text-white font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      boxShadow: '0 10px 20px -5px #f97316',
                    }}
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Budget
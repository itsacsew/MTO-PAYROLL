// Dashboard.jsx (Redesigned - Professional 3D Glassmorphism)
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../config/firebase'
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MdSend, 
  MdDownload, 
  MdPrint, 
  MdInsertDriveFile,
  MdCheckCircle,
  MdPending,
  MdSchedule,
  MdArrowForward,
  MdClose,
  MdVisibility,
  MdAnalytics
} from 'react-icons/md'

const Dashboard = () => {
  const navigate = useNavigate()
  const [pendingFilesCount, setPendingFilesCount] = useState(0)
  const [latestFile, setLatestFile] = useState(null)
  const [allFiles, setAllFiles] = useState([])
  const [showAllFilesModal, setShowAllFilesModal] = useState(false)
  const [hoveredCard, setHoveredCard] = useState(null)

  // Load files and latest file status from Firestore
  useEffect(() => {
    const loadFileStatus = async () => {
      try {
        console.log('Loading file status from Firestore...')
        
        // Create query with ordering by timestamp (newest first)
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
            status: fileData.status || 'pending',
            timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
            updatedEmployees: fileData.updatedEmployees || [],
            seniorEmployees: fileData.seniorEmployees || [],
            lastCheckedAt: fileData.lastCheckedAt || null,
            lastUpdatedAt: fileData.lastUpdatedAt || null
          })
        })
        
        // Count only files with status 'pending' or no status
        const pendingCount = files.filter(file => 
          file.status === 'pending' || !file.status
        ).length
        
        console.log('Pending files found:', pendingCount)
        console.log('Total files:', files.length)
        console.log('Latest file:', files[0])
        
        setPendingFilesCount(pendingCount)
        setAllFiles(files)
        
        // Get the latest file (most recent)
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

    // Real-time listener for new files
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
              status: fileData.status || 'pending',
              timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
              updatedEmployees: fileData.updatedEmployees || [],
              seniorEmployees: fileData.seniorEmployees || [],
              lastCheckedAt: fileData.lastCheckedAt || null,
              lastUpdatedAt: fileData.lastUpdatedAt || null
            })
          })
          
          // Count only files with status 'pending' or no status
          const pendingCount = files.filter(file => 
            file.status === 'pending' || !file.status
          ).length
          
          console.log('Real-time update - pending files count:', pendingCount)
          console.log('Real-time update - total files:', files.length)
          console.log('Real-time update - latest file:', files[0])
          
          setPendingFilesCount(pendingCount)
          setAllFiles(files)
          
          // Get the latest file (most recent)
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

      // Cleanup
      return () => unsubscribe()
    } catch (listenerError) {
      console.error('Error setting up real-time listener:', listenerError)
    }
  }, [])

  const handleSendFile = () => {
    console.log('Send File clicked');
    navigate('/send-file');
  };

  const handleReceiveFile = () => {
    console.log('Receive File clicked');
    navigate('/file');
  };

  const handlePrintFile = () => {
    console.log('Print File clicked');
    // Add your print file logic here
  };

  // Determine which steps are completed based on file status
  const getStepStatus = (fileStatus) => {
    if (!fileStatus) {
      return [false, false, false, false]
    }

    switch (fileStatus) {
      case 'sent':
      case 'pending':
        return [true, false, false, false] // File Sent only
      case 'received':
        return [true, true, false, false] // Sent + Received
      case 'checked':
      case 'updated': // 'updated' status from ModalSend Check File
        return [true, true, true, false] // Sent + Received + Checked
      case 'processed':
        return [true, true, true, true] // All steps completed
      default:
        return [true, false, false, false]
    }
  }

  const [fileSent, received, checked, processed] = latestFile ? getStepStatus(latestFile.status) : [false, false, false, false]

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
        return 'File has been sent to Firestore and is pending receipt.'
      case 'received':
        return 'File has been received and marked as received.'
      case 'checked':
        return 'File has been checked and validated. Ready for processing.'
      case 'updated':
        return 'File has been checked and updated in Firestore.'
      case 'processed':
        return 'File processing is complete!'
      default:
        return `File status: ${file.status || 'unknown'}`
    }
  }

  // Get status icon and color based on status
  const getStatusInfo = (status) => {
    switch (status) {
      case 'sent':
      case 'pending':
        return { 
          icon: <MdSchedule size={18} />, 
          color: 'text-blue-400', 
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          gradient: 'from-blue-500 to-cyan-500'
        }
      case 'received':
        return { 
          icon: <MdDownload size={18} />, 
          color: 'text-green-400', 
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          gradient: 'from-green-500 to-emerald-500'
        }
      case 'checked':
      case 'updated':
        return { 
          icon: <MdCheckCircle size={18} />, 
          color: 'text-purple-400', 
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
          gradient: 'from-purple-500 to-pink-500'
        }
      case 'processed':
        return { 
          icon: <MdCheckCircle size={18} />, 
          color: 'text-teal-400', 
          bgColor: 'bg-teal-500/10',
          borderColor: 'border-teal-500/20',
          gradient: 'from-teal-500 to-emerald-500'
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
  }

  // Status bar component for reuse
  const StatusBar = ({ file, showFileName = false }) => {
    const [sent, received, checked, processed] = getStepStatus(file?.status)
    const statusInfo = getStatusInfo(file?.status)
    
    return (
      <div className="space-y-4">
        {showFileName && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl ${statusInfo.bgColor} border ${statusInfo.borderColor}`}
            style={{
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusInfo.bgColor} border ${statusInfo.borderColor}`}
                  >
                    <span className={statusInfo.color}>{statusInfo.icon}</span>
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      {file.fileName}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor}`}>
                        {file.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MdSchedule size={12} />
                        Sent: {formatDate(file.timestamp)}
                      </p>
                      {file.lastCheckedAt && (
                        <p className="text-xs text-purple-400 flex items-center gap-1">
                          <MdCheckCircle size={12} />
                          Checked: {formatDate(file.lastCheckedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Status Steps with 3D effect */}
        <div className="relative px-2 py-4">
          {/* Background track */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-700/50 -translate-y-1/2" 
            style={{
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)'
            }}
          />
          
          <div className="relative flex justify-between items-center">
            {/* Step 1: File Sent */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                animate={{
                  scale: sent ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative`}
                style={{
                  background: sent 
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #374151, #1f2937)',
                  boxShadow: sent 
                    ? '0 10px 20px -5px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0f172a, -5px -5px 10px #1e293b, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {sent ? (
                  <MdCheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">1</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${sent ? 'text-green-400' : 'text-gray-500'}`}>
                Sent
              </span>
            </motion.div>

            {/* Step 2: Received */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                animate={{
                  scale: received ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative`}
                style={{
                  background: received 
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #374151, #1f2937)',
                  boxShadow: received 
                    ? '0 10px 20px -5px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0f172a, -5px -5px 10px #1e293b, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {received ? (
                  <MdCheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">2</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${received ? 'text-green-400' : 'text-gray-500'}`}>
                Received
              </span>
            </motion.div>

            {/* Step 3: Checked */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                animate={{
                  scale: checked ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative`}
                style={{
                  background: checked 
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #374151, #1f2937)',
                  boxShadow: checked 
                    ? '0 10px 20px -5px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0f172a, -5px -5px 10px #1e293b, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {checked ? (
                  <MdCheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">3</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${checked ? 'text-green-400' : 'text-gray-500'}`}>
                Checked
              </span>
            </motion.div>

            {/* Step 4: Processed */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                animate={{
                  scale: processed ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative`}
                style={{
                  background: processed 
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #374151, #1f2937)',
                  boxShadow: processed 
                    ? '0 10px 20px -5px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0f172a, -5px -5px 10px #1e293b, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {processed ? (
                  <MdCheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">4</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${processed ? 'text-green-400' : 'text-gray-500'}`}>
                Processed
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#0f172a] p-6 overflow-y-auto">
      {/* Animated background gradient */}
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
        className="fixed inset-0"
        style={{
          background: 'radial-gradient(circle at 70% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Header with 3D effect */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              style={{
                textShadow: '0 2px 5px rgba(0,0,0,0.3)'
              }}
            >
              MTO Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Financial management and Payroll tracking</p>
          </div>
          
          {/* Stats Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="px-6 py-3 rounded-2xl"
            style={{
              background: 'linear-gradient(145deg, #1e293b, #0f172a)',
              boxShadow: '10px 10px 20px #0a0f1a, -10px -10px 20px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Files</p>
                <p className="text-2xl font-bold text-white">{allFiles.length}</p>
              </div>
              <div className="w-px h-8 bg-gray-700/50" />
              <div className="text-right">
                <p className="text-xs text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingFilesCount}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Services */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
              boxShadow: '20px 20px 40px -10px #0a0f1a, -20px -20px 40px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <MdAnalytics className="text-blue-400" />
              File Operations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Send File Card */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setHoveredCard('send')}
                onHoverEnd={() => setHoveredCard(null)}
                onClick={handleSendFile}
                className="relative group overflow-hidden rounded-xl p-6 text-left"
                style={{
                  background: hoveredCard === 'send' 
                    ? 'linear-gradient(145deg, #2563eb20, #1e293b)'
                    : 'linear-gradient(145deg, #1e293b, #0f172a)',
                  boxShadow: hoveredCard === 'send'
                    ? '15px 15px 30px #0a0f1a, -15px -15px 30px #1e2a3a, 0 0 20px rgba(37, 99, 235, 0.2)'
                    : '10px 10px 20px #0a0f1a, -10px -10px 20px #1e2a3a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                {/* Shine effect */}
                <motion.div
                  animate={{
                    x: hoveredCard === 'send' ? ['-100%', '200%'] : '0%',
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: hoveredCard === 'send' ? Infinity : 0,
                    ease: "linear"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                />

                <div className="relative z-10">
                  <div className="flex items-start gap-4">
                    <motion.div 
                      animate={{
                        rotate: hoveredCard === 'send' ? [0, 5, -5, 0] : 0,
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      <MdSend className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Send File</h3>
                      <p className="text-sm text-gray-400 mt-1">Securely transfer files to recipients</p>
                      <div className="flex items-center gap-1 mt-3 text-blue-400 text-sm">
                        <span>Start sending</span>
                        <MdArrowForward className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Receive File Card */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setHoveredCard('receive')}
                onHoverEnd={() => setHoveredCard(null)}
                onClick={handleReceiveFile}
                className="relative group overflow-hidden rounded-xl p-6 text-left"
                style={{
                  background: hoveredCard === 'receive' 
                    ? 'linear-gradient(145deg, #10b98120, #1e293b)'
                    : 'linear-gradient(145deg, #1e293b, #0f172a)',
                  boxShadow: hoveredCard === 'receive'
                    ? '15px 15px 30px #0a0f1a, -15px -15px 30px #1e2a3a, 0 0 20px rgba(16, 185, 129, 0.2)'
                    : '10px 10px 20px #0a0f1a, -10px -10px 20px #1e2a3a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                {/* Notification Badge */}
                <AnimatePresence>
                  {pendingFilesCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #ec4899)',
                        boxShadow: '0 5px 15px rgba(239, 68, 68, 0.3)',
                        border: '2px solid #0f172a'
                      }}
                    >
                      <span className="text-white text-xs font-bold">{pendingFilesCount}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Shine effect */}
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

                <div className="relative z-10">
                  <div className="flex items-start gap-4">
                    <motion.div 
                      animate={{
                        rotate: hoveredCard === 'receive' ? [0, 5, -5, 0] : 0,
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <MdDownload className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Receive File</h3>
                      <p className="text-sm text-gray-400 mt-1">Get files sent to you safely</p>
                      <div className="flex items-center gap-1 mt-3 text-green-400 text-sm">
                        <span>View incoming</span>
                        <MdArrowForward className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>

          {/* Print File Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.button
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              onHoverStart={() => setHoveredCard('print')}
              onHoverEnd={() => setHoveredCard(null)}
              onClick={handlePrintFile}
              className="relative w-full overflow-hidden rounded-xl p-6 text-left"
              style={{
                background: hoveredCard === 'print' 
                  ? 'linear-gradient(145deg, #8b5cf620, #1e293b)'
                  : 'linear-gradient(145deg, #1e293b, #0f172a)',
                boxShadow: hoveredCard === 'print'
                  ? '15px 15px 30px #0a0f1a, -15px -15px 30px #1e2a3a, 0 0 20px rgba(139, 92, 246, 0.2)'
                  : '10px 10px 20px #0a0f1a, -10px -10px 20px #1e2a3a',
                border: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              {/* Shine effect */}
              <motion.div
                animate={{
                  x: hoveredCard === 'print' ? ['-100%', '200%'] : '0%',
                }}
                transition={{
                  duration: 1.5,
                  repeat: hoveredCard === 'print' ? Infinity : 0,
                  ease: "linear"
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
              />

              <div className="relative z-10 flex items-center gap-6">
                <motion.div 
                  animate={{
                    rotate: hoveredCard === 'print' ? [0, 5, -5, 0] : 0,
                  }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                    boxShadow: '0 10px 20px -5px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  <MdPrint className="w-7 h-7 text-white" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">Database</h3>
                  <p className="text-gray-400 mt-1">Database </p>
                  <div className="flex items-center gap-1 mt-2 text-purple-400 text-sm">
                    <span>Secure every fileData</span>
                    <MdArrowForward className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.button>
          </motion.div>
        </div>

        {/* Right Column - File Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* File Processing Status Section */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
              boxShadow: '20px 20px 40px -10px #0a0f1a, -20px -20px 40px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MdInsertDriveFile className="text-blue-400" />
                Latest File Status
              </h2>
              {allFiles.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllFilesModal(true)}
                  className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                  style={{
                    background: 'linear-gradient(145deg, #2563eb, #1d4ed8)',
                    boxShadow: '0 5px 15px -5px #2563eb',
                  }}
                >
                  <MdVisibility size={14} />
                  View All ({allFiles.length})
                </motion.button>
              )}
            </div>
            
            {/* Show latest file info */}
            {latestFile ? (
              <div className="space-y-4">
                <StatusBar file={latestFile} />
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 rounded-xl text-center"
                style={{
                  background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <MdInsertDriveFile className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  No files sent yet. Send your first file to see status tracking.
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
                  background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                  border: '1px solid rgba(59, 130, 246, 0.1)'
                }}
              >
                <p className="text-sm text-gray-300">
                  {getStatusDescription(latestFile)}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* All Files Modal */}
      <AnimatePresence>
        {showAllFilesModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllFilesModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="w-full max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
                  boxShadow: '30px 30px 60px -10px #0a0f1a, -30px -30px 60px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MdInsertDriveFile className="text-blue-400" />
                    All Files Status
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAllFilesModal(false)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                      boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                    }}
                  >
                    <MdClose className="text-gray-400" size={20} />
                  </motion.button>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {allFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <MdInsertDriveFile className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No files found.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {allFiles.map((file, index) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <StatusBar file={file} showFileName={true} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Modal Footer */}
                <div className="flex justify-end p-6 border-t border-white/5">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAllFilesModal(false)}
                    className="px-6 py-2.5 rounded-xl text-white font-medium"
                    style={{
                      background: 'linear-gradient(145deg, #2563eb, #1d4ed8)',
                      boxShadow: '0 10px 20px -5px #2563eb',
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

export default Dashboard
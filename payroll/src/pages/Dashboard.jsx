// Dashboard.jsx (Redesigned - Professional 3D Glassmorphism with Abstract Gradient Theme)
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
  MdAnalytics,
  MdFingerprint,
  MdWaves,
  MdGrain,
  MdBlurCircular,
  MdLensBlur
} from 'react-icons/md'

const Dashboard = () => {
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
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
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

  // Get status icon and color based on status - Updated with new gradient colors
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
      case 'received':
        return { 
          icon: <MdDownload size={18} />, 
          color: 'text-amber-400', 
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
          gradient: 'from-amber-500 to-orange-500'
        }
      case 'checked':
      case 'updated':
        return { 
          icon: <MdCheckCircle size={18} />, 
          color: 'text-rose-400', 
          bgColor: 'bg-rose-500/10',
          borderColor: 'border-rose-500/20',
          gradient: 'from-rose-500 to-purple-500'
        }
      case 'processed':
        return { 
          icon: <MdCheckCircle size={18} />, 
          color: 'text-purple-400', 
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
          gradient: 'from-purple-500 to-indigo-500'
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

  // Status bar component for reuse - MODIFIED: Removed animations from file name display
  const StatusBar = ({ file, showFileName = false, isModal = false }) => {
    const [sent, received, checked, processed] = getStepStatus(file?.status)
    const statusInfo = getStatusInfo(file?.status)
    
    return (
      <div className="space-y-4">
        {showFileName && (
          // Removed motion.div animation, using regular div instead
          <div 
            className={`p-4 rounded-xl ${statusInfo.bgColor} border ${statusInfo.borderColor} relative overflow-hidden`}
            style={{
              background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.08)'
            }}
          >
            {/* Abstract sphere overlay */}
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500/10 to-purple-500/10 blur-2xl" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {/* Removed animation from icon */}
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
                        {file.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MdSchedule size={12} />
                        Sent: {formatDate(file.timestamp)}
                      </p>
                      {file.lastCheckedAt && (
                        <p className="text-xs text-rose-400 flex items-center gap-1">
                          <MdCheckCircle size={12} />
                          Checked: {formatDate(file.lastCheckedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Status Steps with 3D effect and abstract sphere theme - Keep animations here as they're part of the main UI */}
        <div className="relative px-2 py-4">
          {/* Background track with gradient */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
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
                  boxShadow: sent 
                    ? ['0 0 20px rgba(249, 115, 22, 0.3)', '0 0 30px rgba(249, 115, 22, 0.5)', '0 0 20px rgba(249, 115, 22, 0.3)']
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a'
                }}
                transition={{ 
                  duration: 2,
                  repeat: sent ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative overflow-hidden`}
                style={{
                  background: sent 
                    ? 'linear-gradient(135deg, #f97316, #ec4899)'
                    : 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                  boxShadow: sent 
                    ? '0 10px 20px -5px rgba(249, 115, 22, 0.5), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {/* Abstract sphere effect */}
                <div className={`absolute inset-0 bg-gradient-to-br from-orange-500 to-pink-500 opacity-20 blur-sm`} />
                {sent ? (
                  <MdCheckCircle className="w-5 h-5 text-white relative z-10" />
                ) : (
                  <span className="text-white font-bold text-sm relative z-10">1</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${sent ? 'text-orange-400' : 'text-gray-500'}`}>
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
                  boxShadow: received 
                    ? ['0 0 20px rgba(245, 158, 11, 0.3)', '0 0 30px rgba(245, 158, 11, 0.5)', '0 0 20px rgba(245, 158, 11, 0.3)']
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a'
                }}
                transition={{ 
                  duration: 2,
                  repeat: received ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative overflow-hidden`}
                style={{
                  background: received 
                    ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                    : 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                  boxShadow: received 
                    ? '0 10px 20px -5px rgba(245, 158, 11, 0.5), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {/* Abstract sphere effect */}
                <div className={`absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-20 blur-sm`} />
                {received ? (
                  <MdCheckCircle className="w-5 h-5 text-white relative z-10" />
                ) : (
                  <span className="text-white font-bold text-sm relative z-10">2</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${received ? 'text-amber-400' : 'text-gray-500'}`}>
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
                  boxShadow: checked 
                    ? ['0 0 20px rgba(244, 63, 94, 0.3)', '0 0 30px rgba(244, 63, 94, 0.5)', '0 0 20px rgba(244, 63, 94, 0.3)']
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a'
                }}
                transition={{ 
                  duration: 2,
                  repeat: checked ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative overflow-hidden`}
                style={{
                  background: checked 
                    ? 'linear-gradient(135deg, #f43f5e, #a855f7)'
                    : 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                  boxShadow: checked 
                    ? '0 10px 20px -5px rgba(244, 63, 94, 0.5), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {/* Abstract sphere effect */}
                <div className={`absolute inset-0 bg-gradient-to-br from-rose-500 to-purple-500 opacity-20 blur-sm`} />
                {checked ? (
                  <MdCheckCircle className="w-5 h-5 text-white relative z-10" />
                ) : (
                  <span className="text-white font-bold text-sm relative z-10">3</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${checked ? 'text-rose-400' : 'text-gray-500'}`}>
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
                  boxShadow: processed 
                    ? ['0 0 20px rgba(168, 85, 247, 0.3)', '0 0 30px rgba(168, 85, 247, 0.5)', '0 0 20px rgba(168, 85, 247, 0.3)']
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a'
                }}
                transition={{ 
                  duration: 2,
                  repeat: processed ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative overflow-hidden`}
                style={{
                  background: processed 
                    ? 'linear-gradient(135deg, #a855f7, #6366f1)'
                    : 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                  boxShadow: processed 
                    ? '0 10px 20px -5px rgba(168, 85, 247, 0.5), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '5px 5px 10px #0a0a0a, -5px -5px 10px #2a2a2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {/* Abstract sphere effect */}
                <div className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-500 opacity-20 blur-sm`} />
                {processed ? (
                  <MdCheckCircle className="w-5 h-5 text-white relative z-10" />
                ) : (
                  <span className="text-white font-bold text-sm relative z-10">4</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium ${processed ? 'text-purple-400' : 'text-gray-500'}`}>
                Processed
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
        {/* Main gradient spheres */}
        <motion.div
          animate={{
            x: mousePosition.x,
            y: mousePosition.y,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(249, 115, 22, 0.15), transparent 70%)',
            filter: 'blur(60px)'
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
            filter: 'blur(60px)'
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
            filter: 'blur(80px)'
          }}
        />

        {/* Floating particles effect */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.sin(i) * 20, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 5 + i,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, rgba(${Math.random() * 255}, ${Math.random() * 100}, ${Math.random() * 255}, 0.05), transparent)`,
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }}
          />
        ))}
      </div>

      {/* Header with 3D effect and abstract theme */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent"
              style={{
                textShadow: '0 2px 10px rgba(249, 115, 22, 0.3)'
              }}
            >
              MTO Dashboard
            </h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <MdWaves className="text-orange-400" />
              Financial management and Payroll tracking
            </p>
          </div>
          
          {/* Stats Card with abstract sphere design */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="px-6 py-3 rounded-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))',
              backdropFilter: 'blur(10px)',
              boxShadow: '15px 15px 30px #050505, -15px -15px 30px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            {/* Abstract sphere overlay */}
            <div className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-purple-500/20 blur-xl" />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Files</p>
                <p className="text-2xl font-bold text-white">{allFiles.length}</p>
              </div>
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-700 to-transparent" />
              <div className="text-right">
                <p className="text-xs text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-orange-400">{pendingFilesCount}</p>
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
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))',
              backdropFilter: 'blur(10px)',
              boxShadow: '25px 25px 50px -15px #050505, -25px -25px 50px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            {/* Abstract sphere overlay */}
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500/10 to-rose-500/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-2xl" />
            
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
              <MdAnalytics className="text-orange-400" />
              File Operations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
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
                    ? 'linear-gradient(145deg, rgba(249, 115, 22, 0.15), rgba(30, 30, 40, 0.9))'
                    : 'linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))',
                  boxShadow: hoveredCard === 'send'
                    ? '15px 15px 30px #050505, -15px -15px 30px #1f1f2a, 0 0 30px rgba(249, 115, 22, 0.2)'
                    : '15px 15px 30px #050505, -15px -15px 30px #1f1f2a',
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

                {/* Abstract sphere overlay on hover */}
                {hoveredCard === 'send' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/30 to-rose-500/30 blur-xl"
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-start gap-4">
                    <motion.div 
                      animate={{
                        rotate: hoveredCard === 'send' ? [0, 5, -5, 0] : 0,
                        scale: hoveredCard === 'send' ? [1, 1.1, 1] : 1,
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                        boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.05)'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-rose-500 opacity-30" />
                      <MdSend className="w-6 h-6 text-white relative z-10" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Send File</h3>
                      <p className="text-sm text-gray-400 mt-1">Securely transfer files to recipients</p>
                      <div className="flex items-center gap-1 mt-3 text-orange-400 text-sm">
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
                    ? 'linear-gradient(145deg, rgba(245, 158, 11, 0.15), rgba(30, 30, 40, 0.9))'
                    : 'linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))',
                  boxShadow: hoveredCard === 'receive'
                    ? '15px 15px 30px #050505, -15px -15px 30px #1f1f2a, 0 0 30px rgba(245, 158, 11, 0.2)'
                    : '15px 15px 30px #050505, -15px -15px 30px #1f1f2a',
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
                        background: 'linear-gradient(135deg, #f97316, #ec4899)',
                        boxShadow: '0 5px 15px rgba(249, 115, 22, 0.5)',
                        border: '2px solid #0a0a0f'
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

                {/* Abstract sphere overlay on hover */}
                {hoveredCard === 'receive' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 blur-xl"
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-start gap-4">
                    <motion.div 
                      animate={{
                        rotate: hoveredCard === 'receive' ? [0, 5, -5, 0] : 0,
                        scale: hoveredCard === 'receive' ? [1, 1.1, 1] : 1,
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                        boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.05)'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-30" />
                      <MdDownload className="w-6 h-6 text-white relative z-10" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Receive File</h3>
                      <p className="text-sm text-gray-400 mt-1">Get files sent to you safely</p>
                      <div className="flex items-center gap-1 mt-3 text-amber-400 text-sm">
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
                  ? 'linear-gradient(145deg, rgba(168, 85, 247, 0.15), rgba(30, 30, 40, 0.9))'
                  : 'linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))',
                boxShadow: hoveredCard === 'print'
                  ? '20px 20px 40px #050505, -20px -20px 40px #1f1f2a, 0 0 30px rgba(168, 85, 247, 0.2)'
                  : '20px 20px 40px #050505, -20px -20px 40px #1f1f2a',
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

              {/* Abstract sphere overlay on hover */}
              {hoveredCard === 'print' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 blur-xl"
                />
              )}

              <div className="relative z-10 flex items-center gap-6">
                <motion.div 
                  animate={{
                    rotate: hoveredCard === 'print' ? [0, 5, -5, 0] : 0,
                    scale: hoveredCard === 'print' ? [1, 1.1, 1] : 1,
                  }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 rounded-xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
                    boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.05)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-500 opacity-30" />
                  <MdPrint className="w-7 h-7 text-white relative z-10" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">Database</h3>
                  <p className="text-gray-400 mt-1">Secure database management</p>
                  <div className="flex items-center gap-1 mt-2 text-purple-400 text-sm">
                    <span>Manage file data</span>
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
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))',
              backdropFilter: 'blur(10px)',
              boxShadow: '25px 25px 50px -15px #050505, -25px -25px 50px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            {/* Abstract sphere overlays */}
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500/10 to-rose-500/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MdInsertDriveFile className="text-orange-400" />
                  Latest File Status
                </h2>
                {allFiles.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAllFilesModal(true)}
                    className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 relative overflow-hidden"
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
              
              {/* Show latest file info */}
              {latestFile ? (
                <div className="space-y-4">
                  <StatusBar file={latestFile} />
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 rounded-xl text-center relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))',
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
                  className="mt-4 p-4 rounded-xl relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))',
                    border: '1px solid rgba(249, 115, 22, 0.1)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-purple-500/5" />
                  <p className="text-sm text-gray-300 relative z-10">
                    {getStatusDescription(latestFile)}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* All Files Modal - MODIFIED: Removed all animations */}
      <AnimatePresence>
        {showAllFilesModal && (
          <>
            {/* Backdrop - Keep fade animation for modal entrance/exit */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllFilesModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />

            {/* Modal - Keep entrance animation for the modal itself */}
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
                  background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.95), rgba(20, 20, 30, 0.98))',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                {/* Abstract sphere overlays */}
                <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-rose-500/10 blur-3xl" />
                <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl" />
                
                {/* Modal Header */}
                <div className="relative z-10 flex justify-between items-center p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MdInsertDriveFile className="text-orange-400" />
                    All Files Status
                  </h2>
                  {/* Removed animation from close button */}
                  <button
                    onClick={() => setShowAllFilesModal(false)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center relative overflow-hidden hover:opacity-80 transition-opacity"
                    style={{
                      background: 'linear-gradient(145deg, #2a2a3a, #1a1a2a)',
                      boxShadow: '5px 5px 10px #050505, -5px -5px 10px #2a2a3a',
                    }}
                  >
                    <MdClose className="text-gray-400" size={20} />
                  </button>
                </div>
                
                {/* Modal Body - MODIFIED: Removed all animations from file list items */}
                <div className="relative z-10 p-6 overflow-y-auto max-h-[60vh]">
                  {allFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <MdInsertDriveFile className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No files found.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {allFiles.map((file, index) => (
                        // MODIFIED: Removed motion.div animation wrapper, using regular div
                        <div key={file.id}>
                          {/* Pass isModal prop to StatusBar to handle internal animations */}
                          <StatusBar file={file} showFileName={true} isModal={true} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Modal Footer */}
                <div className="relative z-10 flex justify-end p-6 border-t border-white/5">
                  {/* Removed animation from close button */}
                  <button
                    onClick={() => setShowAllFilesModal(false)}
                    className="px-6 py-2.5 rounded-xl text-white font-medium relative overflow-hidden hover:opacity-90 transition-opacity"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      boxShadow: '0 10px 20px -5px #f97316',
                    }}
                  >
                    Close
                  </button>
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
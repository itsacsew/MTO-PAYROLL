import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../config/firebase'
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore'

const Tasks = () => {
  const navigate = useNavigate()
  const [pendingFilesCount, setPendingFilesCount] = useState(0)
  const [latestFile, setLatestFile] = useState(null)
  const [allFiles, setAllFiles] = useState([])
  const [showAllFilesModal, setShowAllFilesModal] = useState(false)

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

  const handleReceiveFile = () => {
    console.log('Receive File clicked')
    navigate('/receive-file')
  }

  const handleSendFile = () => {
    console.log('Send File clicked')
    navigate('/file-send') // Changed from '/send-file' to '/file-send'
  }
  const handlePrintFile = () => {
    console.log('Print File clicked')
  }

  const handleCreateTask = () => {
    console.log('Create Task clicked')
    navigate('/create-task')
  }

  const handleViewReports = () => {
    console.log('View Reports clicked')
    navigate('/reports')
  }

  const handleManageInvoices = () => {
    console.log('Manage Invoices clicked')
    navigate('/invoices')
  }

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

  const [fileSent, pending, received, processed] = latestFile ? getStepStatus(latestFile.status) : [false, false, false, false]

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
        return { icon: '📤', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' }
      case 'received':
        return { icon: '📥', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
      case 'checked':
      case 'updated':
        return { icon: '✓', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' }
      case 'processed':
        return { icon: '✅', color: 'text-teal-600', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' }
      default:
        return { icon: '📄', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
    }
  }

  // Status bar component for reuse
  const StatusBar = ({ file, showFileName = false }) => {
    const [sent, received, checked, processed] = getStepStatus(file?.status)
    const statusInfo = getStatusInfo(file?.status)
    
    return (
      <div className="mb-4">
        {showFileName && (
          <div className={`mb-3 p-3 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.fileName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Sent: {formatDate(file.timestamp)}
                </p>
                {file.lastCheckedAt && (
                  <p className="text-xs text-purple-600 mt-1">
                    Checked: {formatDate(file.lastCheckedAt)}
                  </p>
                )}
                {file.lastUpdatedAt && (
                  <p className="text-xs text-blue-600 mt-1">
                    Updated: {formatDate(file.lastUpdatedAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg ${statusInfo.color}`}>
                  {statusInfo.icon}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor} border`}>
                  {file.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
            </div>
            
            
          </div>
        )}
        
        {/* Status Steps */}
        <div className="flex justify-between items-center">
          {/* Step 1: File Sent */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              sent ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {sent ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-white font-bold text-xs">1</span>
              )}
            </div>
            <span className={`text-xs font-medium ${sent ? 'text-green-600' : 'text-gray-500'}`}>
              Sent
            </span>
          </div>

          {/* Connecting Line */}
          <div className={`flex-1 h-1 ${sent ? 'bg-green-500' : 'bg-gray-300'}`}></div>

          {/* Step 2: Received */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              received ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {received ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-white font-bold text-xs">2</span>
              )}
            </div>
            <span className={`text-xs font-medium ${received ? 'text-green-600' : 'text-gray-500'}`}>
              Received
            </span>
          </div>

          {/* Connecting Line */}
          <div className={`flex-1 h-1 ${received ? 'bg-green-500' : 'bg-gray-300'}`}></div>

          {/* Step 3: Checked */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              checked ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {checked ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-white font-bold text-xs">3</span>
              )}
            </div>
            <span className={`text-xs font-medium ${checked ? 'text-green-600' : 'text-gray-500'}`}>
              Checked
            </span>
          </div>

          {/* Connecting Line */}
          <div className={`flex-1 h-1 ${checked ? 'bg-green-500' : 'bg-gray-300'}`}></div>

          {/* Step 4: Processed */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              processed ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {processed ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-white font-bold text-xs">4</span>
              )}
            </div>
            <span className={`text-xs font-medium ${processed ? 'text-green-600' : 'text-gray-500'}`}>
              Processed
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Accounting Dashboard</h1>
        <p className="text-gray-600 mt-2">Financial management and task tracking</p>
      </div>

      {/* Main Content - CENTERED CONTAINERS */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* File Operations Container */}
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-md">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">File Operations</h2>
                <div>
                  {/* Receive File Button */}
                  <button 
                    onClick={handleReceiveFile}
                    className="bg-green-50 hover:bg-green-100 text-green-800 rounded-lg p-4 transition duration-200 ease-in-out border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 w-full text-left relative"
                  >
                    {/* Notification Badge - Only show for pending files */}
                    {pendingFilesCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {pendingFilesCount}
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-md font-medium">Receive File</h3>
                        <p className="text-green-600 text-sm mt-1">Get files sent to you safely</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* File Processing Status Container */}
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-md p-6 w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-700">File Processing Status</h2>
                  {allFiles.length > 0 && (
                    <button 
                      onClick={() => setShowAllFilesModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View All ({allFiles.length})
                    </button>
                  )}
                </div>
                
                {/* Show latest file info */}
                {latestFile ? (
                  <div className="mb-4">
                    <div className={`p-3 rounded-lg border mb-3 ${getStatusInfo(latestFile.status).bgColor} ${getStatusInfo(latestFile.status).borderColor}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {latestFile.fileName}
                          </p>
                          
                          {latestFile.lastCheckedAt && (
                            <p className="text-xs text-purple-600 mt-1">
                              Checked: {formatDate(latestFile.lastCheckedAt)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${getStatusInfo(latestFile.status).color}`}>
                            {getStatusInfo(latestFile.status).icon}
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusInfo(latestFile.status).bgColor} ${getStatusInfo(latestFile.status).color} ${getStatusInfo(latestFile.status).borderColor} border`}>
                            {latestFile.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                      </div>
                      
                      
                    </div>
                    
                    {/* Status Bar for Latest File */}
                    <StatusBar file={latestFile} />
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-700">
                      No files sent yet. Send your first file to see status tracking.
                    </p>
                  </div>
                )}

                {/* Status Description */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    {getStatusDescription(latestFile)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Print File & Manage Invoices Section (Optional, pwede nimo i-delete kung gusto) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Empty for now as per original design */}
          </div>
        </div>
      </div>

      {/* All Files Modal */}
      {showAllFilesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-700">All Files Status</h2>
              <button 
                onClick={() => setShowAllFilesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {allFiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No files found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {allFiles.map((file, index) => (
                    <div key={file.id} className="border-b pb-4 last:border-b-0">
                      <StatusBar file={file} showFileName={true} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-6 border-t bg-gray-50">
              <button 
                onClick={() => setShowAllFilesModal(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tasks
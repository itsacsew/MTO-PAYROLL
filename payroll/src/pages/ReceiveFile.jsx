import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { saveAs } from 'file-saver';
import { db } from '../config/firebase';
import { collection, getDocs, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';
import ModalSend from './modalSend';
import ModalSend_MDRRMO from './ModalSend_MDRRMO';
import ModalSend_MAYOR from './ModalSend_MAYOR';
import ModalSend_RHU from './ModalSend_RHU'; // Added import for RHU modal
import { 
  MdDownload, 
  MdVisibility, 
  MdDelete, 
  MdRefresh, 
  MdClose,
  MdCheckCircle,
  MdWarning,
  MdBusiness,
  MdPerson,
  MdFolder,
  MdWaves,
  MdAccessTime,
  MdMoreVert,
  MdFilterList
} from 'react-icons/md';

const ReceiveFile = () => {
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showModalSend, setShowModalSend] = useState(false);
  const [modalComponent, setModalComponent] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const dropdownRefs = useRef({});
  const statusFilterRef = useRef(null);

  // Track mouse position for parallax effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 10,
        y: (e.clientY / window.innerHeight - 0.5) * 10
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Get current logged-in user from localStorage
  const getCurrentUser = () => {
    try {
      const userData = localStorage.getItem('auth_user_v1');
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  // Function to determine which modal to use based on office category
  const getModalComponentForOffice = (officeCategory) => {
    switch (officeCategory) {
      case 'MDDRMO/MEO/MPDO/MSWDO':
        return 'MDRRMO';
      case 'SB/MTO/MENRO':
        return 'SB';
      case 'RHU/MASO/MCR/HRMO': // Added case for RHU
        return 'RHU';
      case 'MAYOR/ACCT/MBO/MASSO':
        return 'MAYOR';
      default:
        return 'DEFAULT';
    }
  };

  // Filter files based on selected status
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredFiles(receivedFiles);
    } else {
      const filtered = receivedFiles.filter(file => {
        if (statusFilter === 'sent') return file.status === 'sent';
        if (statusFilter === 'received') return file.status === 'received' || file.status === 'mark as received';
        if (statusFilter === 'checked') return file.status === 'checked';
        return true;
      });
      setFilteredFiles(filtered);
    }
  }, [receivedFiles, statusFilter]);

  // Load received files from Firestore
  useEffect(() => {
    const loadReceivedFiles = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Loading files from Firestore...');
        
        const q = query(
          collection(db, 'sentFiles'), 
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const files = [];
        
        querySnapshot.forEach((doc) => {
          const fileData = doc.data();
          console.log('Found document:', doc.id, fileData);
          
          // Extract sender information from the file data
          const senderInfo = fileData.sender || {};
          
          files.push({
            id: doc.id,
            fileName: fileData.fileName || 'Unknown File',
            fileData: fileData.fileData,
            timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
            updatedEmployees: fileData.updatedEmployees || [],
            status: fileData.status || 'sent',
            originalFileName: fileData.originalFileName || '',
            fileSize: fileData.fileSize || 0,
            
            // OFFICE INFORMATION
            officeCategory: fileData.officeCategory || fileData.office || 'N/A',
            office: fileData.office || fileData.officeCategory || 'N/A',
            officeDisplay: fileData.officeDisplay || fileData.officeCategory || 'N/A',
            
            // SENDER INFORMATION
            senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
            senderEmail: senderInfo.email || fileData.senderEmail || '',
            senderOffice: senderInfo.office || fileData.senderOffice || '',
            senderId: senderInfo.id || fileData.senderId || '',
            
            // Receiver information (who marked as received)
            receivedBy: fileData.receivedBy || null,
            receivedAt: fileData.receivedAt || null,
            
            // Checker information
            checkedBy: fileData.checkedBy || null,
            checkedAt: fileData.checkedAt || null,
            
            markedAsReceived: fileData.markedAsReceived || false,
            checked: fileData.checked || false
          });
        });

        console.log('Total files loaded:', files.length);
        setReceivedFiles(files);
        
      } catch (error) {
        console.error('Error loading files from Firestore:', error);
        setError('Error loading files from Firestore. Please check your connection.');
        alert('Error loading files from Firestore. Please check your Firebase configuration.');
      } finally {
        setLoading(false);
      }
    };

    loadReceivedFiles();

    // Real-time listener for new files
    try {
      const q = query(
        collection(db, 'sentFiles'), 
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          console.log('Real-time update received from Firestore');
          const files = [];
          snapshot.forEach((doc) => {
            const fileData = doc.data();
            
            // Extract sender information from the file data
            const senderInfo = fileData.sender || {};
            
            files.push({
              id: doc.id,
              fileName: fileData.fileName || 'Unknown File',
              fileData: fileData.fileData,
              timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
              updatedEmployees: fileData.updatedEmployees || [],
              status: fileData.status || 'sent',
              originalFileName: fileData.originalFileName || '',
              fileSize: fileData.fileSize || 0,
              
              // OFFICE INFORMATION
              officeCategory: fileData.officeCategory || fileData.office || 'N/A',
              office: fileData.office || fileData.officeCategory || 'N/A',
              officeDisplay: fileData.officeDisplay || fileData.officeCategory || 'N/A',
              
              // SENDER INFORMATION
              senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
              senderEmail: senderInfo.email || fileData.senderEmail || '',
              senderOffice: senderInfo.office || fileData.senderOffice || '',
              senderId: senderInfo.id || fileData.senderId || '',
              
              // Receiver information (who marked as received)
              receivedBy: fileData.receivedBy || null,
              receivedAt: fileData.receivedAt || null,
              
              // Checker information
              checkedBy: fileData.checkedBy || null,
              checkedAt: fileData.checkedAt || null,
              
              markedAsReceived: fileData.markedAsReceived || false,
              checked: fileData.checked || false
            });
          });
          
          setReceivedFiles(files);
          setLoading(false);
        },
        (error) => {
          console.error('Real-time listener error:', error);
          setError('Real-time updates disabled due to error.');
        }
      );

      return () => unsubscribe();
    } catch (listenerError) {
      console.error('Error setting up real-time listener:', listenerError);
    }
  }, []);

  // Toggle dropdown for a specific file
  const toggleDropdown = (fileId, e) => {
    if (e) e.stopPropagation();
    setDropdownOpen(dropdownOpen === fileId ? null : fileId);
    setShowStatusFilter(false);
  };

  // Toggle status filter dropdown
  const toggleStatusFilter = (e) => {
    if (e) e.stopPropagation();
    setShowStatusFilter(!showStatusFilter);
    setDropdownOpen(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsideActionDropdown = Object.values(dropdownRefs.current).some(ref => 
        ref && ref.contains(event.target)
      );
      
      const isClickInsideStatusFilter = statusFilterRef.current && statusFilterRef.current.contains(event.target);
      
      if (!isClickInsideActionDropdown && !isClickInsideStatusFilter) {
        setDropdownOpen(null);
        setShowStatusFilter(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Download file function
  const handleDownloadFile = (file) => {
    try {
      console.log('Downloading file:', file.fileName);
      
      if (!file.fileData) {
        alert('Error: File data is missing. Cannot download.');
        return;
      }

      const binaryString = atob(file.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, file.fileName);
      
      alert(`✅ File "${file.fileName}" downloaded successfully!`);
      setDropdownOpen(null);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('❌ Error downloading file. Please try again.');
    }
  };

  // Handle View Assessment (View File Details)
  const handleViewAssessment = (file) => {
    setSelectedFile(file);
    setShowFileDetails(true);
    setDropdownOpen(null);
  };

  // Open appropriate modal based on office category
  const handleOpenModalSend = (file) => {
    setSelectedFile(file);
    
    // Determine which modal component to use based on office category
    const modalType = getModalComponentForOffice(file.officeCategory);
    setModalComponent(modalType);
    setShowModalSend(true);
    setDropdownOpen(null);
  };

  // Close ModalSend
  const handleCloseModalSend = () => {
    setShowModalSend(false);
    setSelectedFile(null);
    setModalComponent(null);
  };

  // Close file details modal
  const handleCloseFileDetails = () => {
    setShowFileDetails(false);
    setSelectedFile(null);
  };

  // Update file status to "checked" with checker information
  const handleUpdateStatus = async (fileId, newStatus) => {
    try {
      console.log('Updating file status:', fileId, newStatus);
      
      const updateData = {
        status: newStatus
      };
      
      // Add additional fields based on status
      if (newStatus === 'received' || newStatus === 'mark as received') {
        const currentUser = getCurrentUser();
        if (currentUser) {
          updateData.receivedBy = {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            office: currentUser.office,
            role: currentUser.role,
            receivedAt: new Date()
          };
        }
        updateData.markedAsReceived = true;
        updateData.receivedAt = new Date();
      } else if (newStatus === 'checked') {
        const currentUser = getCurrentUser();
        if (currentUser) {
          updateData.checkedBy = {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            office: currentUser.office,
            role: currentUser.role,
            checkedAt: new Date()
          };
        }
        updateData.checked = true;
        updateData.checkedAt = new Date();
        updateData.lastCheckedAt = new Date();
      }
      
      await updateDoc(doc(db, 'sentFiles', fileId), updateData);

      setReceivedFiles(prevFiles => 
        prevFiles.map(file => {
          if (file.id === fileId) {
            const updatedFile = {
              ...file,
              status: newStatus,
              markedAsReceived: newStatus === 'received' || newStatus === 'mark as received' ? true : file.markedAsReceived,
              checked: newStatus === 'checked' ? true : file.checked
            };
            
            if (newStatus === 'received' || newStatus === 'mark as received') {
              const currentUser = getCurrentUser();
              if (currentUser) {
                updatedFile.receivedBy = {
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email,
                  office: currentUser.office,
                  role: currentUser.role
                };
                updatedFile.receivedAt = new Date();
              }
            }
            
            if (newStatus === 'checked') {
              const currentUser = getCurrentUser();
              if (currentUser) {
                updatedFile.checkedBy = {
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email,
                  office: currentUser.office,
                  role: currentUser.role
                };
                updatedFile.checkedAt = new Date();
                updatedFile.lastCheckedAt = new Date();
              }
            }
            
            return updatedFile;
          }
          return file;
        })
      );

      alert(`✅ File status updated to "${newStatus}"!`);
      setDropdownOpen(null);
    } catch (error) {
      console.error('Error updating file status:', error);
      alert('❌ Error updating file status.');
    }
  };

  // Delete file function
  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file from Firestore?')) {
      return;
    }

    try {
      console.log('Deleting file from Firestore:', fileId);
      await deleteDoc(doc(db, 'sentFiles', fileId));
      
      setReceivedFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      
      alert('✅ File deleted successfully from Firestore!');
      setDropdownOpen(null);
      setShowFileDetails(false);
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('❌ Error deleting file from Firestore.');
    }
  };

  // Clear all files
  const handleClearAllFiles = async () => {
    if (receivedFiles.length === 0) {
      alert('No files to clear.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete ALL files from Firestore? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const deletePromises = receivedFiles.map(file => 
        deleteDoc(doc(db, 'sentFiles', file.id))
      );
      
      await Promise.all(deletePromises);
      setReceivedFiles([]);
      alert('✅ All files deleted successfully from Firestore!');
    } catch (error) {
      console.error('Error clearing files:', error);
      alert('❌ Error clearing files from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh files
  const handleRefreshFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const q = query(collection(db, 'sentFiles'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const files = [];
      
      querySnapshot.forEach((doc) => {
        const fileData = doc.data();
        
        const senderInfo = fileData.sender || {};
        
        files.push({
          id: doc.id,
          fileName: fileData.fileName || 'Unknown File',
          fileData: fileData.fileData,
          timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
          updatedEmployees: fileData.updatedEmployees || [],
          status: fileData.status || 'sent',
          originalFileName: fileData.originalFileName || '',
          fileSize: fileData.fileSize || 0,
          
          // OFFICE INFORMATION
          officeCategory: fileData.officeCategory || fileData.office || 'N/A',
          office: fileData.office || fileData.officeCategory || 'N/A',
          officeDisplay: fileData.officeDisplay || fileData.officeCategory || 'N/A',
          
          // SENDER INFORMATION
          senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
          senderEmail: senderInfo.email || fileData.senderEmail || '',
          senderOffice: senderInfo.office || fileData.senderOffice || '',
          senderId: senderInfo.id || fileData.senderId || '',
          
          receivedBy: fileData.receivedBy || null,
          receivedAt: fileData.receivedAt || null,
          
          checkedBy: fileData.checkedBy || null,
          checkedAt: fileData.checkedAt || null,
          
          markedAsReceived: fileData.markedAsReceived || false,
          checked: fileData.checked || false
        });
      });

      setReceivedFiles(files);
      
      
    } catch (error) {
      console.error('Error refreshing files:', error);
      setError('Error refreshing files from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status badge class based on status - UPDATED COLORS
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'received':
      case 'mark as received':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'checked':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get status display text
  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'sent':
        return 'SENT';
      case 'received':
      case 'mark as received':
        return 'RECEIVED';
      case 'checked':
        return 'CHECKED';
      default:
        return status.toUpperCase();
    }
  };

  // Get filter display text
  const getFilterDisplayText = (filter) => {
    switch (filter) {
      case 'all':
        return 'ALL STATUS';
      case 'sent':
        return 'SENT';
      case 'received':
        return 'RECEIVED';
      case 'checked':
        return 'CHECKED';
      default:
        return 'ALL STATUS';
    }
  };

  // Get office badge color based on office category - UPDATED COLORS
  const getOfficeBadgeClass = (officeCategory) => {
    switch (officeCategory) {
      case 'MDDRMO/MEO/MPDO/MSWDO':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'SB/MTO/MENRO':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'RHU/MASO/MCR/HRMO': // Added case for RHU
        return 'bg-pink-100 text-pink-800 border border-pink-200';
      case 'MAYOR/ACCT/MBO/MASSO':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Function to render the appropriate modal based on office category
  const renderModal = () => {
    if (!showModalSend || !selectedFile) return null;

    switch (modalComponent) {
      case 'MDRRMO':
        return (
          <ModalSend_MDRRMO 
            file={selectedFile} 
            onClose={handleCloseModalSend}
            markedAsReceived={selectedFile.markedAsReceived}
            onMarkAsReceived={() => handleUpdateStatus(selectedFile.id, 'received')}
          />
        );
      
      case 'MAYOR':
        return (
          <ModalSend_MAYOR 
            file={selectedFile} 
            onClose={handleCloseModalSend}
            markedAsReceived={selectedFile.markedAsReceived}
            onMarkAsReceived={() => handleUpdateStatus(selectedFile.id, 'received')}
          />
        );
      
      case 'RHU': // Added case for RHU
        return (
          <ModalSend_RHU 
            file={selectedFile} 
            onClose={handleCloseModalSend}
            markedAsReceived={selectedFile.markedAsReceived}
            onMarkAsReceived={() => handleUpdateStatus(selectedFile.id, 'received')}
          />
        );
      
      case 'SB':
      case 'DEFAULT':
      default:
        return (
          <ModalSend 
            file={selectedFile} 
            onClose={handleCloseModalSend}
            markedAsReceived={selectedFile.markedAsReceived}
            onMarkAsReceived={() => handleUpdateStatus(selectedFile.id, 'received')}
          />
        );
    }
  };

  // NEW: Render modal using React Portal para sure nga naa sa ibabaw
  const renderModalWithPortal = () => {
    if (!showModalSend || !selectedFile) return null;
    
    return ReactDOM.createPortal(
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          pointerEvents: 'none'
        }}
      >
        {/* Dark overlay - click to close */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          style={{ pointerEvents: 'auto' }}
          onClick={handleCloseModalSend}
        />
        
        {/* Modal content container - centered */}
        <div 
          className="relative flex items-center justify-center p-4 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            {renderModal()}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="bg-[#0a0a0f] p-6 overflow-y-auto relative">
      {/* Animated abstract sphere background */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Main gradient spheres */}
        <div 
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(249, 115, 22, 0.15), transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }}
        />
        
        <div 
          className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.15), transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }}
        />
        
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1), transparent 70%)',
            filter: 'blur(80px)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Dynamic Modal Based on Office Category - GAMIT ANG PORTAL */}
      {renderModalWithPortal()}

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header with Refresh button on the side */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent"
              style={{
                textShadow: '0 2px 10px rgba(249, 115, 22, 0.3)'
              }}
            >
              Received Files
            </h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <MdWaves className="text-orange-400" />
              Download files that were sent from the Send File page
            </p>
          </div>
          
          <button 
            onClick={handleRefreshFiles}
            disabled={loading}
            className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-white transition-all duration-200 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #f97316, #ec4899)',
              boxShadow: '0 10px 20px -5px #f97316'
            }}
            title="Refresh files"
          >
            <MdRefresh className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Files Count */}
        <div className="mb-4 text-sm text-gray-400">
          Showing {filteredFiles.length} of {receivedFiles.length} file(s)
          {statusFilter !== 'all' && ` (Filtered by: ${getFilterDisplayText(statusFilter)})`}
        </div>
        
        {/* Files Table */}
        <div 
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
            boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          {/* Abstract sphere overlay */}
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />
          
          {/* Table Header */}
          <div className="relative z-10 grid grid-cols-12 border-b border-white/5 px-6 py-4 text-sm font-semibold text-gray-300">
            <div className="col-span-1 text-center">NO.</div>
            <div className="col-span-3">FILE NAME</div>
            <div className="col-span-2">NAME OF SENDER</div>
            <div className="col-span-2">OFFICE</div>
            <div className="col-span-2">DATE</div>
            
            {/* STATUS HEADER - DROPDOWN */}
            <div className="col-span-1 relative" ref={statusFilterRef}>
              <button
                onClick={toggleStatusFilter}
                className="flex items-center justify-between w-full text-left hover:text-orange-400 transition-colors"
              >
                <span>STATUS</span>
                <MdFilterList className="h-4 w-4 ml-1" />
              </button>

              {/* Status Filter Dropdown Menu */}
              {showStatusFilter && (
                <div 
                  className="fixed z-50 w-48 rounded-xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    boxShadow: '20px 20px 40px -10px #050505, -20px -20px 40px -10px #1f1f2a',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setShowStatusFilter(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-orange-500/10 hover:text-orange-400 flex items-center justify-between"
                    >
                      <span>ALL STATUS</span>
                      {statusFilter === 'all' && (
                        <MdCheckCircle className="h-4 w-4 text-orange-400" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setStatusFilter('sent');
                        setShowStatusFilter(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-orange-500/10 hover:text-orange-400 flex items-center justify-between"
                    >
                      <span>SENT</span>
                      {statusFilter === 'sent' && (
                        <MdCheckCircle className="h-4 w-4 text-orange-400" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setStatusFilter('received');
                        setShowStatusFilter(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-orange-500/10 hover:text-orange-400 flex items-center justify-between"
                    >
                      <span>RECEIVED</span>
                      {statusFilter === 'received' && (
                        <MdCheckCircle className="h-4 w-4 text-orange-400" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setStatusFilter('checked');
                        setShowStatusFilter(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-orange-500/10 hover:text-orange-400 flex items-center justify-between"
                    >
                      <span>CHECKED</span>
                      {statusFilter === 'checked' && (
                        <MdCheckCircle className="h-4 w-4 text-orange-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="col-span-1 text-center">ACTION</div>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="relative z-10 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading files from Firestore...</p>
              <p className="text-sm text-gray-500 mt-2">Checking for sent files...</p>
            </div>
          )}

          {/* Table Body */}
          {!loading && filteredFiles.length === 0 ? (
            <div className="relative z-10 py-16 text-center">
              <MdFolder className="mx-auto h-16 w-16 text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-white">No files found</h3>
              <p className="mt-2 text-gray-400 max-w-md mx-auto">
                {statusFilter === 'all' ? (
                  <>
                    Files sent from the Send File page will appear here.<br />
                    Go to the Send File page to create and send files to Firestore.
                  </>
                ) : (
                  `No files found with status "${getFilterDisplayText(statusFilter)}".`
                )}
              </p>
              <div className="mt-4 flex gap-3 justify-center">
                {statusFilter !== 'all' && (
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className="px-4 py-2 rounded-xl font-medium text-white"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      boxShadow: '0 10px 20px -5px #f97316'
                    }}
                  >
                    Show All Files
                  </button>
                )}
                <button 
                  onClick={handleRefreshFiles}
                  className="px-4 py-2 rounded-xl font-medium text-white"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  Check Again
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 divide-y divide-white/5">
              {filteredFiles.map((file, index) => (
                <div key={file.id} className="grid grid-cols-12 items-center px-6 py-4 hover:bg-white/5 transition-colors relative">
                  {/* NO. */}
                  <div className="col-span-1 text-center text-gray-400 font-medium">
                    {index + 1}
                  </div>

                  {/* FILE NAME */}
                  <div className="col-span-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-br from-orange-500/20 to-pink-500/20 p-2 rounded-lg">
                        <MdFolder className="h-5 w-5 text-orange-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white truncate">{file.fileName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {file.fileSize > 0 && (
                            <span className="mr-3">{formatFileSize(file.fileSize)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NAME OF SENDER */}
                  <div className="col-span-2">
                    <div className="font-medium text-white truncate">{file.senderName}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="truncate">{file.senderEmail}</span>
                      {file.senderOffice && (
                        <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">
                          {file.senderOffice}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* OFFICE with dynamic color */}
                  <div className="col-span-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${getOfficeBadgeClass(file.officeCategory)}`}>
                      {file.officeCategory}
                    </span>
                  </div>

                  {/* DATE */}
                  <div className="col-span-2">
                    <div className="text-gray-300">{formatDate(file.timestamp)}</div>
                  </div>

                  {/* STATUS */}
                  <div className="col-span-1">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(file.status)}`}>
                      {getStatusDisplayText(file.status)}
                    </span>
                  </div>

                  {/* ACTION - DROPDOWN BUTTON */}
                  <div className="col-span-1 relative">
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => toggleDropdown(file.id, e)}
                        className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                        title="Actions"
                      >
                        <MdMoreVert className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Dropdown Menu */}
                    {dropdownOpen === file.id && (
                      <div 
                        ref={el => dropdownRefs.current[file.id] = el}
                        className="fixed z-50 mt-1 w-48 rounded-xl overflow-hidden"
                        style={{
                          background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                          boxShadow: '20px 20px 40px -10px #050505, -20px -20px 40px -10px #1f1f2a',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-1">
                          <button
                            onClick={() => handleOpenModalSend(file)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-orange-500/10 hover:text-orange-400 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Assessment
                          </button>
                          
                          <button
                            onClick={() => handleViewAssessment(file)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-orange-500/10 hover:text-orange-400 flex items-center gap-2"
                          >
                            <MdVisibility className="h-4 w-4" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-orange-500/10 hover:text-orange-400 flex items-center gap-2"
                          >
                            <MdDownload className="h-4 w-4" />
                            Download
                          </button>

                          {/* Update Status Options in Dropdown */}
                          {file.status !== 'checked' && (
                            <button
                              onClick={() => handleUpdateStatus(file.id, 'checked')}
                              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-orange-500/10 hover:text-orange-400 flex items-center gap-2 mt-2 border-t border-white/5"
                            >
                              <MdCheckCircle className="h-4 w-4" />
                              Mark as Checked
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File Details Modal */}
        {showFileDetails && selectedFile && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div 
              className="rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative"
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: '30px 30px 60px -15px #000000, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              {/* Abstract sphere overlay */}
              <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />
              
              {/* Modal Header */}
              <div className="relative z-10 px-6 py-4 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      boxShadow: '0 10px 20px -5px #f97316'
                    }}
                  >
                    <MdVisibility className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">File Assessment - {selectedFile.fileName}</h3>
                </div>
                <button 
                  onClick={handleCloseFileDetails}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <MdClose className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="relative z-10 p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column - File Details */}
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">File Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-400">File Name:</label>
                        <p className="mt-1 text-white">{selectedFile.fileName}</p>
                      </div>
                      
                      {/* OFFICE DETAILS */}
                      <div>
                        <label className="text-sm font-medium text-gray-400">Office:</label>
                        <p className="mt-1">
                          <span className={`${getOfficeBadgeClass(selectedFile.officeCategory)} px-3 py-1 rounded-full text-xs`}>
                            {selectedFile.officeCategory}
                          </span>
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">Original File Name:</label>
                        <p className="mt-1 text-white">{selectedFile.originalFileName || selectedFile.fileName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">File Size:</label>
                        <p className="mt-1 text-white">{formatFileSize(selectedFile.fileSize)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Status:</label>
                        <span className={`mt-1 inline-block px-3 py-1 rounded-full text-sm ${getStatusBadgeClass(selectedFile.status)}`}>
                          {getStatusDisplayText(selectedFile.status)}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-medium text-white mt-6 mb-4">Sender Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-400">Sender Name:</label>
                        <p className="mt-1 text-white">{selectedFile.senderName}</p>
                      </div>
                      {selectedFile.senderEmail && (
                        <div>
                          <label className="text-sm font-medium text-gray-400">Sender Email:</label>
                          <p className="mt-1 text-white">{selectedFile.senderEmail}</p>
                        </div>
                      )}
                      {selectedFile.senderOffice && (
                        <div>
                          <label className="text-sm font-medium text-gray-400">Sender Office:</label>
                          <p className="mt-1 text-white">{selectedFile.senderOffice}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-400">Sent Date:</label>
                        <p className="mt-1 text-white">{formatDate(selectedFile.timestamp)}</p>
                      </div>
                    </div>

                    {/* Receiver Information */}
                    {selectedFile.receivedBy && (
                      <div className="mt-6">
                        <h4 className="text-lg font-medium text-white mb-4">Received By</h4>
                        <div className="space-y-3 p-4 rounded-xl"
                          style={{
                            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.1), #1a1a2a)',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <div>
                            <label className="text-sm font-medium text-gray-400">Receiver Name:</label>
                            <p className="mt-1 text-white">{selectedFile.receivedBy.name}</p>
                          </div>
                          {selectedFile.receivedBy.email && (
                            <div>
                              <label className="text-sm font-medium text-gray-400">Receiver Email:</label>
                              <p className="mt-1 text-white">{selectedFile.receivedBy.email}</p>
                            </div>
                          )}
                          {selectedFile.receivedBy.office && (
                            <div>
                              <label className="text-sm font-medium text-gray-400">Receiver Office:</label>
                              <p className="mt-1 text-white">{selectedFile.receivedBy.office}</p>
                            </div>
                          )}
                          {selectedFile.receivedAt && (
                            <div>
                              <label className="text-sm font-medium text-gray-400">Received Date:</label>
                              <p className="mt-1 text-white">{formatDate(selectedFile.receivedAt)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Checker Information */}
                    {selectedFile.checkedBy && (
                      <div className="mt-6">
                        <h4 className="text-lg font-medium text-white mb-4">Checked By</h4>
                        <div className="space-y-3 p-4 rounded-xl"
                          style={{
                            background: 'linear-gradient(145deg, rgba(168, 85, 247, 0.1), #1a1a2a)',
                            border: '1px solid rgba(168, 85, 247, 0.2)'
                          }}
                        >
                          <div>
                            <label className="text-sm font-medium text-gray-400">Checker Name:</label>
                            <p className="mt-1 text-white">{selectedFile.checkedBy.name}</p>
                          </div>
                          {selectedFile.checkedBy.email && (
                            <div>
                              <label className="text-sm font-medium text-gray-400">Checker Email:</label>
                              <p className="mt-1 text-white">{selectedFile.checkedBy.email}</p>
                            </div>
                          )}
                          {selectedFile.checkedBy.office && (
                            <div>
                              <label className="text-sm font-medium text-gray-400">Checker Office:</label>
                              <p className="mt-1 text-white">{selectedFile.checkedBy.office}</p>
                            </div>
                          )}
                          {selectedFile.checkedAt && (
                            <div>
                              <label className="text-sm font-medium text-gray-400">Checked Date:</label>
                              <p className="mt-1 text-white">{formatDate(selectedFile.checkedAt)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Actions & Updates */}
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">File Actions</h4>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), #1a1a2a)',
                          border: '1px solid rgba(249, 115, 22, 0.2)'
                        }}
                      >
                        <p className="text-sm text-orange-400 mb-3">You can download this file or update its status.</p>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => {
                              handleDownloadFile(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2"
                            style={{
                              background: 'linear-gradient(135deg, #f97316, #ec4899)',
                              boxShadow: '0 10px 20px -5px #f97316'
                            }}
                          >
                            <MdDownload className="h-4 w-4" />
                            Download File
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.1), #1a1a2a)',
                          border: '1px solid rgba(236, 72, 153, 0.2)'
                        }}
                      >
                        <h5 className="font-medium text-pink-400 mb-2">Update Status</h5>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleUpdateStatus(selectedFile.id, 'sent')}
                            className={`w-full px-4 py-2 rounded-md text-left flex items-center justify-between ${
                              selectedFile.status === 'sent' ? 'bg-orange-500/20' : 'hover:bg-white/5'
                            }`}
                          >
                            <span className={selectedFile.status === 'sent' ? 'text-orange-400' : 'text-gray-300'}>
                              SENT
                            </span>
                            {selectedFile.status === 'sent' && (
                              <MdCheckCircle className="h-4 w-4 text-orange-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedFile.id, 'received')}
                            className={`w-full px-4 py-2 rounded-md text-left flex items-center justify-between ${
                              (selectedFile.status === 'received' || selectedFile.status === 'mark as received') ? 'bg-green-500/20' : 'hover:bg-white/5'
                            }`}
                          >
                            <span className={(selectedFile.status === 'received' || selectedFile.status === 'mark as received') ? 'text-green-400' : 'text-gray-300'}>
                              RECEIVED
                            </span>
                            {(selectedFile.status === 'received' || selectedFile.status === 'mark as received') && (
                              <MdCheckCircle className="h-4 w-4 text-green-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedFile.id, 'checked')}
                            className={`w-full px-4 py-2 rounded-md text-left flex items-center justify-between ${
                              selectedFile.status === 'checked' ? 'bg-purple-500/20' : 'hover:bg-white/5'
                            }`}
                          >
                            <span className={selectedFile.status === 'checked' ? 'text-purple-400' : 'text-gray-300'}>
                              CHECKED
                            </span>
                            {selectedFile.status === 'checked' && (
                              <MdCheckCircle className="h-4 w-4 text-purple-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {selectedFile.updatedEmployees && selectedFile.updatedEmployees.length > 0 && (
                        <div className="p-4 rounded-xl"
                          style={{
                            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.1), #1a1a2a)',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <h5 className="font-medium text-green-400 mb-2">Updated Employees:</h5>
                          <ul className="space-y-1">
                            {selectedFile.updatedEmployees.map((employee, idx) => (
                              <li key={idx} className="text-sm text-green-300 flex items-center">
                                <MdCheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                {employee}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), #1a1a2a)',
                          border: '1px solid rgba(249, 115, 22, 0.2)'
                        }}
                      >
                        <h5 className="font-medium text-orange-400 mb-2">Document Information:</h5>
                        <p className="text-sm text-gray-300">
                          <strong>Document ID:</strong> {selectedFile.id}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          <strong>Collection:</strong> sentFiles
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          <strong>Office:</strong> {selectedFile.officeCategory}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="mt-8 pt-6 border-t border-white/5">
                  <button 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this file?')) {
                        handleDeleteFile(selectedFile.id);
                        handleCloseFileDetails();
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #ec4899)',
                      boxShadow: '0 10px 20px -5px #ef4444'
                    }}
                  >
                    <MdDelete className="h-4 w-4" />
                    Delete File from Firestore
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiveFile;
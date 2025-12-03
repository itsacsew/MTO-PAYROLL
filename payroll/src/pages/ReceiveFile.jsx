import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { db } from '../config/firebase';
import { collection, getDocs, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';
import ModalSend from './modalSend';

const ReceiveFile = () => {
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'sent', 'received', 'checked'
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showModalSend, setShowModalSend] = useState(false);
  
  const dropdownRefs = useRef({});
  const statusFilterRef = useRef(null);

  // Get current logged-in user
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
            status: fileData.status || 'sent', // Default to 'sent'
            originalFileName: fileData.originalFileName || '',
            fileSize: fileData.fileSize || 0,
            
            // SENDER INFORMATION - Updated to use sender object
            senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
            senderEmail: senderInfo.email || fileData.senderEmail || '',
            senderOffice: senderInfo.office || fileData.senderOffice || '',
            senderId: senderInfo.id || fileData.senderId || '',
            
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
              
              // SENDER INFORMATION - Updated to use sender object
              senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
              senderEmail: senderInfo.email || fileData.senderEmail || '',
              senderOffice: senderInfo.office || fileData.senderOffice || '',
              senderId: senderInfo.id || fileData.senderId || '',
              
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
    setShowStatusFilter(false); // Close status filter dropdown
  };

  // Toggle status filter dropdown
  const toggleStatusFilter = (e) => {
    if (e) e.stopPropagation();
    setShowStatusFilter(!showStatusFilter);
    setDropdownOpen(null); // Close all action dropdowns
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any action dropdown
      const isClickInsideActionDropdown = Object.values(dropdownRefs.current).some(ref => 
        ref && ref.contains(event.target)
      );
      
      // Check if click is outside status filter dropdown
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

  // Open ModalSend with file data
  const handleOpenModalSend = (file) => {
    setSelectedFile(file);
    setShowModalSend(true);
    setDropdownOpen(null);
  };

  // Close ModalSend
  const handleCloseModalSend = () => {
    setShowModalSend(false);
    setSelectedFile(null);
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
        updateData.markedAsReceived = true;
        updateData.receivedAt = new Date();
      } else if (newStatus === 'checked') {
        // Get current logged-in user for checker information
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
            
            // Add checker information if status is checked
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
      
      // Remove from local state
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
          
          // SENDER INFORMATION - Updated to use sender object
          senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
          senderEmail: senderInfo.email || fileData.senderEmail || '',
          senderOffice: senderInfo.office || fileData.senderOffice || '',
          senderId: senderInfo.id || fileData.senderId || '',
          
          // Checker information
          checkedBy: fileData.checkedBy || null,
          checkedAt: fileData.checkedAt || null,
          
          markedAsReceived: fileData.markedAsReceived || false,
          checked: fileData.checked || false
        });
      });

      setReceivedFiles(files);
      alert(`✅ Refreshed! Found ${files.length} file(s).`);
      
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

  // Get status badge class based on status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-gray-100 text-gray-800';
      case 'received':
      case 'mark as received':
        return 'bg-green-100 text-green-800';
      case 'checked':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Get status display text
  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'sent':
        return 'SENT';
      case 'received':
      case 'mark as received':
        return 'MARK AS RECEIVED';
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
        return 'MARK AS RECEIVED';
      case 'checked':
        return 'CHECKED';
      default:
        return 'ALL STATUS';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* ModalSend Component */}
      {showModalSend && selectedFile && (
        <ModalSend 
          file={selectedFile} 
          onClose={handleCloseModalSend}
          markedAsReceived={selectedFile.markedAsReceived}
          onMarkAsReceived={() => handleUpdateStatus(selectedFile.id, 'received')}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header with Refresh button on the side */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Received Files</h1>
            <p className="text-gray-600 mt-2">Download files that were sent from the Send File page (Firestore)</p>
          </div>
          
          <button 
            onClick={handleRefreshFiles}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 disabled:bg-gray-400"
            title="Refresh files"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {/* Files Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredFiles.length} of {receivedFiles.length} file(s)
          {statusFilter !== 'all' && ` (Filtered by: ${getFilterDisplayText(statusFilter)})`}
        </div>
        
        {/* Files Table - ALWAYS SHOW TABLE STRUCTURE */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Table Header - ALWAYS VISIBLE */}
          <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 px-6 py-4 text-sm font-semibold text-gray-700">
            <div className="col-span-1 text-center">NO.</div>
            <div className="col-span-3">FILE NAME</div>
            <div className="col-span-3">NAME OF SENDER</div>
            <div className="col-span-2">DATE</div>
            
            {/* STATUS HEADER - NOW A DROPDOWN (OVERFLOW STYLE) */}
            <div className="col-span-1 relative" ref={statusFilterRef}>
              <button
                onClick={toggleStatusFilter}
                className="flex items-center justify-between w-full text-left hover:text-blue-600 transition-colors"
              >
                <span>STATUS</span>
                <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Status Filter Dropdown Menu - FIXED POSITION LIKE ACTION DROPDOWN */}
              {showStatusFilter && (
                <div 
                  className="fixed z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-200"
                  style={{
                    position: 'fixed',
                    zIndex: 9999
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setShowStatusFilter(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between"
                    >
                      <span>ALL STATUS</span>
                      {statusFilter === 'all' && (
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setStatusFilter('sent');
                        setShowStatusFilter(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between"
                    >
                      <span>SENT</span>
                      {statusFilter === 'sent' && (
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setStatusFilter('received');
                        setShowStatusFilter(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between"
                    >
                      <span>RECEIVED</span>
                      {statusFilter === 'received' && (
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setStatusFilter('checked');
                        setShowStatusFilter(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between"
                    >
                      <span>CHECKED</span>
                      {statusFilter === 'checked' && (
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="col-span-2 text-center">ACTION</div>
          </div>
          
          {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading files from Firestore...</p>
            <p className="text-sm text-gray-500 mt-2">Checking for sent files...</p>
          </div>
        )}


          {/* Table Body - SHOWS FILES OR EMPTY STATE */}
          {!loading && filteredFiles.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No files found</h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">
                {statusFilter === 'all' ? (
                  <>
                    Files sent from the Send File page will appear here.<br />
                    Go to the Send File page to create and send files to Firestore.
                  </>
                ) : (
                  `No files found with status "${getFilterDisplayText(statusFilter)}".`
                )}
              </p>
              {statusFilter !== 'all' && (
                <button 
                  onClick={() => setStatusFilter('all')}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
                >
                  Show All Files
                </button>
              )}
              <button 
                onClick={handleRefreshFiles}
                className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Check Again
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredFiles.map((file, index) => (
                <div key={file.id} className="grid grid-cols-12 items-center px-6 py-4 hover:bg-gray-50 transition-colors relative">
                  {/* NO. */}
                  <div className="col-span-1 text-center text-gray-600 font-medium">
                    {index + 1}
                  </div>

                  {/* FILE NAME */}
                  <div className="col-span-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 truncate">{file.fileName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {file.fileSize > 0 && (
                            <span className="mr-3">{formatFileSize(file.fileSize)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NAME OF SENDER - Updated to show sender office */}
                  <div className="col-span-3">
                    <div className="font-medium text-gray-900 truncate">{file.senderName}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="truncate">{file.senderEmail}</span>
                      {file.senderOffice && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                          {file.senderOffice}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DATE */}
                  <div className="col-span-2">
                    <div className="text-gray-700">{formatDate(file.timestamp)}</div>
                  </div>

                  {/* STATUS (REGULAR BADGE) */}
                  <div className="col-span-1">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(file.status)}`}>
                      {getStatusDisplayText(file.status)}
                    </span>
                    {file.markedAsReceived && file.status !== 'checked' && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs">
                        
                      </span>
                    )}
                  </div>

                  {/* ACTION - DROPDOWN BUTTON */}
                  <div className="col-span-2 relative">
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => toggleDropdown(file.id, e)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Actions"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>

                    {/* Dropdown Menu */}
                    {dropdownOpen === file.id && (
                      <div 
                        ref={el => dropdownRefs.current[file.id] = el}
                        className="fixed z-50 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200"
                        style={{
                          position: 'fixed',
                          zIndex: 9999
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-1">
                          <button
                            onClick={() => handleOpenModalSend(file)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Assessment
                          </button>
                          
                          <button
                            onClick={() => handleViewAssessment(file)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>

                          {/* Update Status Options in Dropdown */}
                          {file.status !== 'checked' && (
                            <button
                              onClick={() => handleUpdateStatus(file.id, 'checked')}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 mt-2 border-t"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">File Assessment - {selectedFile.fileName}</h3>
                <button 
                  onClick={handleCloseFileDetails}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column - File Details */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-4">File Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">File Name:</label>
                        <p className="mt-1 text-gray-900">{selectedFile.fileName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Original File Name:</label>
                        <p className="mt-1 text-gray-900">{selectedFile.originalFileName || selectedFile.fileName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">File Size:</label>
                        <p className="mt-1 text-gray-900">{formatFileSize(selectedFile.fileSize)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status:</label>
                        <span className={`mt-1 inline-block px-3 py-1 rounded-full text-sm ${getStatusBadgeClass(selectedFile.status)}`}>
                          {getStatusDisplayText(selectedFile.status)}
                        </span>
                        {selectedFile.markedAsReceived && selectedFile.status !== 'checked' && (
                          <span className="ml-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                            
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-lg font-medium text-gray-800 mt-6 mb-4">Sender Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Sender Name:</label>
                        <p className="mt-1 text-gray-900">{selectedFile.senderName}</p>
                      </div>
                      {selectedFile.senderEmail && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Sender Email:</label>
                          <p className="mt-1 text-gray-900">{selectedFile.senderEmail}</p>
                        </div>
                      )}
                      {selectedFile.senderOffice && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Sender Office:</label>
                          <p className="mt-1 text-gray-900">{selectedFile.senderOffice}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-600">Sent Date:</label>
                        <p className="mt-1 text-gray-900">{formatDate(selectedFile.timestamp)}</p>
                      </div>
                    </div>

                    {/* Checker Information */}
                    {selectedFile.checkedBy && (
                      <div className="mt-6">
                        <h4 className="text-lg font-medium text-gray-800 mb-4">Checked By</h4>
                        <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Checker Name:</label>
                            <p className="mt-1 text-gray-900">{selectedFile.checkedBy.name}</p>
                          </div>
                          {selectedFile.checkedBy.email && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Checker Email:</label>
                              <p className="mt-1 text-gray-900">{selectedFile.checkedBy.email}</p>
                            </div>
                          )}
                          {selectedFile.checkedBy.office && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Checker Office:</label>
                              <p className="mt-1 text-gray-900">{selectedFile.checkedBy.office}</p>
                            </div>
                          )}
                          {selectedFile.checkedAt && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Checked Date:</label>
                              <p className="mt-1 text-gray-900">{formatDate(selectedFile.checkedAt)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Actions & Updates */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-4">File Actions</h4>
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-800 mb-3">You can download this file or update its status.</p>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => {
                              handleDownloadFile(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium flex-1"
                          >
                            Download File
                          </button>
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h5 className="font-medium text-yellow-800 mb-2">Update Status</h5>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleUpdateStatus(selectedFile.id, 'sent')}
                            className={`w-full px-4 py-2 rounded-md text-left flex items-center justify-between ${selectedFile.status === 'sent' ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'}`}
                          >
                            <span>SENT</span>
                            {selectedFile.status === 'sent' && (
                              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedFile.id, 'received')}
                            className={`w-full px-4 py-2 rounded-md text-left flex items-center justify-between ${(selectedFile.status === 'received' || selectedFile.status === 'mark as received') ? 'bg-green-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                          >
                            <span>MARK AS RECEIVED</span>
                            {(selectedFile.status === 'received' || selectedFile.status === 'mark as received') && (
                              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedFile.id, 'checked')}
                            className={`w-full px-4 py-2 rounded-md text-left flex items-center justify-between ${selectedFile.status === 'checked' ? 'bg-blue-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                          >
                            <span>CHECKED</span>
                            {selectedFile.status === 'checked' && (
                              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {selectedFile.updatedEmployees && selectedFile.updatedEmployees.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h5 className="font-medium text-green-800 mb-2">Updated Employees:</h5>
                          <ul className="space-y-1">
                            {selectedFile.updatedEmployees.map((employee, idx) => (
                              <li key={idx} className="text-sm text-green-700 flex items-center">
                                <svg className="h-4 w-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {employee}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h5 className="font-medium text-yellow-800 mb-2">Document Information:</h5>
                        <p className="text-sm text-yellow-700">
                          <strong>Document ID:</strong> {selectedFile.id}
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          <strong>Collection:</strong> sentFiles
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this file?')) {
                        handleDeleteFile(selectedFile.id);
                        handleCloseFileDetails();
                      }
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-medium"
                  >
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
import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { db } from '../config/firebase';
import { collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MdInsertDriveFile, 
  MdDownload, 
  MdPrint, 
  MdVisibility, 
  MdClose,
  MdCheckCircle,
  MdReceipt,
  MdRefresh,
  MdMoreVert,
  MdPerson,
  MdDateRange,
  MdDescription,
  MdAnalytics
} from 'react-icons/md';

const FileReceived = () => {
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [hoveredRow, setHoveredRow] = useState(null);
  
  // PRINT PREVIEW STATES
  const [excelData, setExcelData] = useState(null);
  const [excelSheets, setExcelSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  
  const buttonRefs = useRef({});
  const navigate = useNavigate();

  // Load only checked files from Firestore
  useEffect(() => {
    const loadCheckedFiles = async () => {
      try {
        setLoading(true);
        setError('');
        
        const q = query(
          collection(db, 'sentFiles'), 
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const files = [];
        
        querySnapshot.forEach((doc) => {
          const fileData = doc.data();
          
          if (fileData.status === 'checked') {
            const senderInfo = fileData.sender || {};
            const receiverInfo = fileData.receivedBy || {};
            const checkerInfo = fileData.checkedBy || {};
            
            files.push({
              id: doc.id,
              fileName: fileData.fileName || 'Unknown File',
              fileData: fileData.fileData,
              timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
              updatedEmployees: fileData.updatedEmployees || [],
              status: fileData.status || 'checked',
              originalFileName: fileData.originalFileName || '',
              fileSize: fileData.fileSize || 0,
              
              senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
              senderEmail: senderInfo.email || fileData.senderEmail || '',
              senderOffice: senderInfo.office || fileData.senderOffice || '',
              senderId: senderInfo.id || fileData.senderId || '',
              
              receivedBy: fileData.receivedBy || null,
              receivedAt: fileData.receivedAt || null,
              
              checkedBy: receiverInfo.id ? receiverInfo : checkerInfo,
              checkedAt: fileData.checkedAt || fileData.receivedAt || null,
              
              markedAsReceived: fileData.markedAsReceived || false,
              checked: fileData.checked || true
            });
          }
        });

        setReceivedFiles(files);
        
      } catch (error) {
        console.error('Error loading checked files from Firestore:', error);
        setError('Error loading checked files from Firestore. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadCheckedFiles();

    try {
      const q = query(
        collection(db, 'sentFiles'), 
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const files = [];
          snapshot.forEach((doc) => {
            const fileData = doc.data();
            
            if (fileData.status === 'checked') {
              const senderInfo = fileData.sender || {};
              const receiverInfo = fileData.receivedBy || {};
              const checkerInfo = fileData.checkedBy || {};
              
              files.push({
                id: doc.id,
                fileName: fileData.fileName || 'Unknown File',
                fileData: fileData.fileData,
                timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
                updatedEmployees: fileData.updatedEmployees || [],
                status: fileData.status || 'checked',
                originalFileName: fileData.originalFileName || '',
                fileSize: fileData.fileSize || 0,
                
                senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
                senderEmail: senderInfo.email || fileData.senderEmail || '',
                senderOffice: senderInfo.office || fileData.senderOffice || '',
                senderId: senderInfo.id || fileData.senderId || '',
                
                receivedBy: fileData.receivedBy || null,
                receivedAt: fileData.receivedAt || null,
                
                checkedBy: receiverInfo.id ? receiverInfo : checkerInfo,
                checkedAt: fileData.checkedAt || fileData.receivedAt || null,
                
                markedAsReceived: fileData.markedAsReceived || false,
                checked: fileData.checked || true
              });
            }
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

  // Function to parse Excel file from Firebase base64 data
  const parseExcelFile = (base64Data) => {
    try {
      if (!base64Data) {
        console.error('No file data found');
        return null;
      }

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      setExcelSheets(sheetNames);
      
      const sheet = workbook.Sheets[sheetNames[activeSheet]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      setExcelData(jsonData);
      return jsonData;
      
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setPreviewError(`Error parsing Excel file: ${error.message}`);
      return null;
    }
  };

  // Function to print Excel data as table
  const handlePrintExcel = () => {
    if (!excelData || excelData.length === 0) {
      alert('No Excel data available to print');
      return;
    }

    try {
      const headers = excelData[0] || [];
      const rows = excelData.slice(1);
      
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Excel: ${selectedFile?.fileName || 'File'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            .file-info { margin-bottom: 20px; color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #2b6cb0; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f8f9fa; }
            .print-footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${selectedFile?.fileName || 'Excel File'}</h1>
          <div class="file-info">
            <p><strong>Sender:</strong> ${selectedFile?.senderName || 'N/A'}</p>
            <p><strong>Checked By:</strong> ${selectedFile?.checkedBy?.name || selectedFile?.receivedBy?.name || 'N/A'}</p>
            <p><strong>Date:</strong> ${selectedFile ? formatDate(selectedFile.timestamp) : new Date().toLocaleDateString()}</p>
            <p><strong>Sheet:</strong> ${excelSheets[activeSheet] || 'Sheet1'}</p>
            <p><strong>Rows:</strong> ${rows.length} | <strong>Columns:</strong> ${headers.length}</p>
          </div>
      `;
      
      if (headers.length > 0) {
        html += `
          <table>
            <thead>
              <tr>
                ${headers.map(header => `<th>${header || ''}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  ${headers.map((_, index) => `<td>${row[index] !== undefined ? row[index] : ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        html += '<p>No data available in this sheet.</p>';
      }
      
      html += `
          <div class="print-footer">
            Printed on ${new Date().toLocaleString()} | Excel Print Preview
          </div>
          <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #2b6cb0; color: white; border: none; cursor: pointer;">Print Now</button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; cursor: pointer; margin-left: 10px;">Close</button>
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      
    } catch (error) {
      console.error('Error printing Excel:', error);
      alert('Error printing Excel data. Please try again.');
    }
  };

  // Download original Excel file function
  const handleDownloadFile = (file) => {
    try {
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
      
      alert(`✅ Excel file "${file.fileName}" downloaded successfully!`);
      setDropdownOpen(null);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('❌ Error downloading file. Please try again.');
    }
  };

  // Function to switch Excel sheet
  const handleSwitchSheet = async (index, file) => {
    if (!file || !file.fileData) return;

    try {
      setActiveSheet(index);
      
      const binaryString = atob(file.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheetName = workbook.SheetNames[index];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      setExcelData(jsonData);
      
    } catch (error) {
      console.error('Error switching sheet:', error);
      setPreviewError(`Error switching sheet: ${error.message}`);
    }
  };

  // Handle View Print Preview
  const handleViewPrintPreview = (file) => {
    setSelectedFile(file);
    setShowPrintPreview(true);
    setDropdownOpen(null);
    
    setExcelData(null);
    setExcelSheets([]);
    setActiveSheet(0);
    setPreviewError('');
    
    setTimeout(() => {
      parseExcelFile(file.fileData);
    }, 300);
  };

  // Function to handle View Payslip
  const handleViewPayslip = (file) => {
    setSelectedFile(file);
    setDropdownOpen(null);
    
    navigate(`/payslip/${file.id}`, {
      state: {
        fileData: file
      }
    });
  };

  // Close Print Preview Modal
  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
    setExcelData(null);
    setPreviewError('');
  };

  // Toggle dropdown for a specific file
  const toggleDropdown = (fileId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
      
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      
      // Calculate position - dropdown will appear below the button
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX - 200 + rect.width / 2, // Center under button (200px width / 2 = 100px offset)
      });
      
      // Find the selected file
      const file = receivedFiles.find(f => f.id === fileId);
      if (file) {
        setSelectedFile(file);
      }
    }
    
    setDropdownOpen(dropdownOpen === fileId ? null : fileId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen) {
        // Check if click is on the button that opened it
        const button = buttonRefs.current[dropdownOpen];
        if (button && button.contains(event.target)) {
          return; // Don't close if clicking the same button
        }
        
        // Close dropdown for any other outside click
        setDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Handle Create Voucher
  const handleCreateVoucher = (file) => {
    setSelectedFile(file);
    setDropdownOpen(null);
    
    navigate('/voucher', {
      state: {
        fileData: file
      }
    });
  };

  // Handle View File Details
  const handleViewFileDetails = (file) => {
    setSelectedFile(file);
    setShowFileDetails(true);
    setDropdownOpen(null);
  };

  // Close file details modal
  const handleCloseFileDetails = () => {
    setShowFileDetails(false);
    setSelectedFile(null);
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
        
        if (fileData.status === 'checked') {
          const senderInfo = fileData.sender || {};
          const receiverInfo = fileData.receivedBy || {};
          const checkerInfo = fileData.checkedBy || {};
          
          files.push({
            id: doc.id,
            fileName: fileData.fileName || 'Unknown File',
            fileData: fileData.fileData,
            timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
            updatedEmployees: fileData.updatedEmployees || [],
            status: fileData.status || 'checked',
            originalFileName: fileData.originalFileName || '',
            fileSize: fileData.fileSize || 0,
            
            senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
            senderEmail: senderInfo.email || fileData.senderEmail || '',
            senderOffice: senderInfo.office || fileData.senderOffice || '',
            senderId: senderInfo.id || fileData.senderId || '',
            
            receivedBy: fileData.receivedBy || null,
            receivedAt: fileData.receivedAt || null,
            
            checkedBy: receiverInfo.id ? receiverInfo : checkerInfo,
            checkedAt: fileData.checkedAt || fileData.receivedAt || null,
            
            markedAsReceived: fileData.markedAsReceived || false,
            checked: fileData.checked || true
          });
        }
      });

      setReceivedFiles(files);
     
      
    } catch (error) {
      console.error('Error refreshing files:', error);
      setError('Error refreshing checked files from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Invalid Date';
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status badge class based on status
  const getStatusInfo = (status) => {
    switch (status) {
      case 'checked':
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          border: 'border-blue-500/20',
          icon: <MdCheckCircle size={14} />
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          text: 'text-gray-400',
          border: 'border-gray-500/20',
          icon: <MdInsertDriveFile size={14} />
        };
    }
  };

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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Checked Files
            </h1>
            <p className="text-gray-400 mt-2">Files that have been marked as "Checked" from the Receive File page</p>
          </div>
          
          {/* Stats and Refresh */}
          <div className="flex items-center gap-4">
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
                  <p className="text-xs text-gray-400">Showing</p>
                  <p className="text-2xl font-bold text-white">{receivedFiles.length} checked file(s)</p>
                </div>
              </div>
            </motion.div>

            {/* Refresh Button */}
            <motion.button 
              whileHover={{ scale: 1.05, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefreshFiles}
              disabled={loading}
              className="w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-50"
              style={{
                background: 'linear-gradient(145deg, #2563eb, #1d4ed8)',
                boxShadow: '0 10px 20px -5px #2563eb, inset 0 1px 2px rgba(255,255,255,0.2)',
              }}
              title="Refresh checked files"
            >
              <MdRefresh className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Files Table Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-visible" // Changed from overflow-hidden to overflow-visible
          style={{
            background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
            boxShadow: '20px 20px 40px -10px #0a0f1a, -20px -20px 40px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          {/* Loading State */}
          {loading && (
            <div className="p-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto rounded-xl"
                style={{
                  background: 'linear-gradient(145deg, #2563eb, #3b82f6)',
                  boxShadow: '0 10px 30px -5px #2563eb'
                }}
              >
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-purple-500" />
              </motion.div>
              <p className="mt-4 text-gray-400">Loading checked files from Firestore...</p>
              <p className="text-sm text-gray-500 mt-2">Looking for files marked as "Checked"...</p>
            </div>
          )}

          {/* Table Header */}
          {!loading && receivedFiles.length > 0 && (
            <div 
              className="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-medium"
              style={{
                background: 'linear-gradient(145deg, #1e293b, #0f1f2f)',
                borderBottom: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <div className="col-span-1 text-gray-400">NO.</div>
              <div className="col-span-3 text-gray-400">FILE NAME</div>
              <div className="col-span-3 text-gray-400">NAME OF SENDER</div>
              <div className="col-span-2 text-gray-400">DATE CHECKED</div>
              <div className="col-span-2 text-gray-400">CHECKED BY</div>
              <div className="col-span-1 text-gray-400 text-center">ACTION</div>
            </div>
          )}

          {/* Table Body */}
          {!loading && (
            <>
              {receivedFiles.length === 0 ? (
                <div className="py-16 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                      boxShadow: '10px 10px 20px #0a0f1a, -10px -10px 20px #1e2a3a',
                    }}
                  >
                    <MdInsertDriveFile className="w-10 h-10 text-gray-600" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-white">No checked files found</h3>
                  <p className="mt-2 text-gray-400 max-w-md mx-auto text-sm">
                    Files marked as "Checked" in the Receive File page will appear here.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRefreshFiles}
                    className="mt-6 px-6 py-2.5 rounded-xl text-white font-medium"
                    style={{
                      background: 'linear-gradient(145deg, #2563eb, #1d4ed8)',
                      boxShadow: '0 10px 20px -5px #2563eb',
                    }}
                  >
                    Check Again
                  </motion.button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {receivedFiles.map((file, index) => {
                    const statusInfo = getStatusInfo(file.status);
                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onHoverStart={() => setHoveredRow(file.id)}
                        onHoverEnd={() => setHoveredRow(null)}
                        className="grid grid-cols-12 gap-4 px-6 py-4 relative overflow-visible" // Changed to overflow-visible
                        style={{
                          background: hoveredRow === file.id 
                            ? 'linear-gradient(145deg, #1e293b, #1a2535)'
                            : 'transparent',
                          transition: 'background 0.3s ease'
                        }}
                      >
                        {/* Hover Effect */}
                        <motion.div
                          animate={{
                            x: hoveredRow === file.id ? ['-100%', '200%'] : '0%',
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: hoveredRow === file.id ? Infinity : 0,
                            ease: "linear"
                          }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"
                        />

                        {/* NO. */}
                        <div className="col-span-1 flex items-center">
                          <span className="text-gray-400 font-mono text-sm">{(index + 1).toString().padStart(2, '0')}</span>
                        </div>

                        {/* FILE NAME */}
                        <div className="col-span-3 flex items-center gap-3">
                          <motion.div 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(145deg, #2563eb, #1d4ed8)',
                              boxShadow: '0 5px 15px -5px #2563eb'
                            }}
                          >
                            <MdInsertDriveFile className="w-5 h-5 text-white" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{file.fileName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {file.fileSize > 0 && (
                                <span className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border} flex items-center gap-1`}>
                                {statusInfo.icon}
                                CHECKED
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* NAME OF SENDER */}
                        <div className="col-span-3 flex items-center">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{file.senderName}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                              <span className="truncate">{file.senderEmail}</span>
                              {file.senderOffice && (
                                <span className={`px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border} text-[10px]`}>
                                  {file.senderOffice}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* DATE CHECKED */}
                        <div className="col-span-2 flex items-center">
                          <div className="flex items-center gap-2">
                            <MdDateRange className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-300 text-sm">
                              {file.checkedAt ? formatDate(file.checkedAt) : 
                               file.receivedAt ? formatDate(file.receivedAt) : 
                               formatDate(file.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* CHECKED BY */}
                        <div className="col-span-2 flex items-center">
                          {file.checkedBy ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <MdPerson className="w-4 h-4 text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm truncate">{file.checkedBy.name || 'Unknown Checker'}</p>
                                {file.checkedBy.office && (
                                  <p className="text-xs text-gray-400 truncate">{file.checkedBy.office}</p>
                                )}
                                <p className="text-xs text-gray-500">(Receiver)</p>
                              </div>
                            </div>
                          ) : file.receivedBy ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                <MdPerson className="w-4 h-4 text-green-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm truncate">{file.receivedBy.name}</p>
                                {file.receivedBy.office && (
                                  <p className="text-xs text-gray-400 truncate">{file.receivedBy.office}</p>
                                )}
                                <p className="text-xs text-gray-500">(Receiver)</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-sm">Not recorded</span>
                          )}
                        </div>

                        {/* ACTION - 3 DOTS BUTTON */}
                        <div className="col-span-1 flex items-center justify-center">
                          <motion.button
                            ref={el => buttonRefs.current[file.id] = el}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => toggleDropdown(file.id, e)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                              background: dropdownOpen === file.id 
                                ? 'linear-gradient(145deg, #2563eb, #1d4ed8)'
                                : 'linear-gradient(145deg, #1e293b, #0f172a)',
                              boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                            }}
                          >
                            <MdMoreVert className={`w-4 h-4 ${dropdownOpen === file.id ? 'text-white' : 'text-gray-400'}`} />
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Global Dropdown Menu - Fixed position outside table */}
      <AnimatePresence>
        {dropdownOpen && selectedFile && (
          <>
            {/* Backdrop for dropdown */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(null)}
            />
            
            {/* Dropdown Menu - positioned absolutely based on button click */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed z-50 w-56 rounded-xl overflow-hidden"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                boxShadow: '10px 10px 30px -5px #0a0f1a, -10px -10px 30px -5px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.03)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-2">
                {/* View Print Preview */}
                <motion.button
                  whileHover={{ x: 5 }}
                  onClick={() => {
                    handleViewPrintPreview(selectedFile);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white flex items-center gap-3"
                  style={{
                    background: 'transparent',
                    transition: 'all 0.2s'
                  }}
                  onHoverStart={(e) => e.currentTarget.style.background = 'linear-gradient(145deg, #2563eb20, transparent)'}
                  onHoverEnd={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MdPrint className="w-4 h-4 text-blue-400" />
                  View Print Preview
                </motion.button>
                
                {/* View Payslip */}
                <motion.button
                  whileHover={{ x: 5 }}
                  onClick={() => {
                    handleViewPayslip(selectedFile);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white flex items-center gap-3"
                  style={{
                    background: 'transparent',
                    transition: 'all 0.2s'
                  }}
                  onHoverStart={(e) => e.currentTarget.style.background = 'linear-gradient(145deg, #10b98120, transparent)'}
                  onHoverEnd={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MdReceipt className="w-4 h-4 text-green-400" />
                  View Payslip
                </motion.button>
                
                {/* Create Voucher */}
                <motion.button
                  whileHover={{ x: 5 }}
                  onClick={() => {
                    handleCreateVoucher(selectedFile);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white flex items-center gap-3"
                  style={{
                    background: 'transparent',
                    transition: 'all 0.2s'
                  }}
                  onHoverStart={(e) => e.currentTarget.style.background = 'linear-gradient(145deg, #8b5cf620, transparent)'}
                  onHoverEnd={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MdDescription className="w-4 h-4 text-purple-400" />
                  Create Voucher / Payslip
                </motion.button>
                
                {/* View Details */}
                <motion.button
                  whileHover={{ x: 5 }}
                  onClick={() => {
                    handleViewFileDetails(selectedFile);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white flex items-center gap-3"
                  style={{
                    background: 'transparent',
                    transition: 'all 0.2s'
                  }}
                  onHoverStart={(e) => e.currentTarget.style.background = 'linear-gradient(145deg, #f59e0b20, transparent)'}
                  onHoverEnd={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MdVisibility className="w-4 h-4 text-yellow-400" />
                  View Details
                </motion.button>
                
                {/* Download Excel */}
                <motion.button
                  whileHover={{ x: 5 }}
                  onClick={() => {
                    handleDownloadFile(selectedFile);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white flex items-center gap-3"
                  style={{
                    background: 'transparent',
                    transition: 'all 0.2s'
                  }}
                  onHoverStart={(e) => e.currentTarget.style.background = 'linear-gradient(145deg, #ef444420, transparent)'}
                  onHoverEnd={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MdDownload className="w-4 h-4 text-red-400" />
                  Download Excel
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PRINT PREVIEW MODAL */}
      <AnimatePresence>
        {showPrintPreview && selectedFile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClosePrintPreview}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div
                className="w-full max-w-7xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
                  boxShadow: '30px 30px 60px -10px #0a0f1a, -30px -30px 60px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                {/* Modal content... (same as before) */}
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MdPrint className="text-blue-400" />
                    Print Preview - {selectedFile.fileName}
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleClosePrintPreview}
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                      boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                    }}
                  >
                    <MdClose className="text-gray-400" size={20} />
                  </motion.button>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="flex justify-end gap-4 mb-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePrintExcel}
                      disabled={!excelData || excelData.length === 0}
                      className="px-4 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(145deg, #2563eb, #1d4ed8)',
                        boxShadow: '0 10px 20px -5px #2563eb',
                      }}
                    >
                      <MdPrint className="w-4 h-4" />
                      PRINT EXCEL
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDownloadFile(selectedFile)}
                      className="px-4 py-2.5 rounded-xl text-white font-medium flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(145deg, #10b981, #059669)',
                        boxShadow: '0 10px 20px -5px #10b981',
                      }}
                    >
                      <MdDownload className="w-4 h-4" />
                      DOWNLOAD EXCEL
                    </motion.button>
                  </div>
                  {excelSheets.length > 1 && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-400 mb-3">Select Sheet:</p>
                      <div className="flex flex-wrap gap-2">
                        {excelSheets.map((sheet, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSwitchSheet(index, selectedFile)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              activeSheet === index 
                                ? 'text-white' 
                                : 'text-gray-400'
                            }`}
                            style={{
                              background: activeSheet === index
                                ? 'linear-gradient(145deg, #2563eb, #1d4ed8)'
                                : 'linear-gradient(145deg, #1e293b, #0f172a)',
                              boxShadow: activeSheet === index
                                ? '0 10px 20px -5px #2563eb'
                                : '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                              border: '1px solid rgba(255,255,255,0.03)'
                            }}
                          >
                            {sheet}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div 
                    className="p-4 rounded-xl mb-6"
                    style={{
                      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                      border: '1px solid rgba(59, 130, 246, 0.1)'
                    }}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Sender</p>
                        <p className="text-sm text-white mt-1">{selectedFile.senderName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Checked By</p>
                        <p className="text-sm text-white mt-1">
                          {selectedFile?.checkedBy?.name || selectedFile?.receivedBy?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Date</p>
                        <p className="text-sm text-white mt-1">{formatDate(selectedFile.timestamp)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Sheet</p>
                        <p className="text-sm text-white mt-1">{excelSheets[activeSheet] || 'Sheet1'}</p>
                      </div>
                    </div>
                  </div>
                  {previewError && (
                    <div 
                      className="p-4 rounded-xl mb-6"
                      style={{
                        background: 'linear-gradient(145deg, #ef444420, #dc262620)',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                      }}
                    >
                      <p className="text-red-400 text-sm">{previewError}</p>
                    </div>
                  )}
                  {excelData && excelData.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            {(excelData[0] || []).map((header, idx) => (
                              <th
                                key={idx}
                                className="px-4 py-3 text-left text-gray-300 font-medium"
                                style={{
                                  background: 'linear-gradient(145deg, #1e293b, #0f1f2f)',
                                  borderBottom: '1px solid rgba(255,255,255,0.03)'
                                }}
                              >
                                {header || ''}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {excelData.slice(1).map((row, rowIdx) => (
                            <tr
                              key={rowIdx}
                              className="hover:bg-white/5 transition-colors"
                              style={{
                                borderBottom: '1px solid rgba(255,255,255,0.03)'
                              }}
                            >
                              {(excelData[0] || []).map((_, colIdx) => (
                                <td key={colIdx} className="px-4 py-3 text-gray-400">
                                  {row[colIdx] !== undefined ? row[colIdx] : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="flex justify-end p-6 border-t border-white/5">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClosePrintPreview}
                    className="px-6 py-2.5 rounded-xl text-white font-medium"
                    style={{
                      background: 'linear-gradient(145deg, #4b5563, #374151)',
                      boxShadow: '0 10px 20px -5px #4b5563',
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

      {/* File Details Modal */}
      <AnimatePresence>
        {showFileDetails && selectedFile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseFileDetails}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div
                className="w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
                  boxShadow: '30px 30px 60px -10px #0a0f1a, -30px -30px 60px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MdInsertDriveFile className="text-blue-400" />
                    File Details - {selectedFile.fileName}
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCloseFileDetails}
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                      boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                    }}
                  >
                    <MdClose className="text-gray-400" size={20} />
                  </motion.button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                        <MdDescription className="text-blue-400" />
                        File Information
                      </h3>
                      <div 
                        className="p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">File Name:</span>
                            <span className="text-white text-sm">{selectedFile.fileName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Original Name:</span>
                            <span className="text-white text-sm">{selectedFile.originalFileName || selectedFile.fileName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">File Size:</span>
                            <span className="text-white text-sm">{formatFileSize(selectedFile.fileSize)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Status:</span>
                            <span className={`text-sm px-3 py-1 rounded-full ${getStatusInfo(selectedFile.status).bg} ${getStatusInfo(selectedFile.status).text} border ${getStatusInfo(selectedFile.status).border}`}>
                              CHECKED
                            </span>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-white font-medium mb-4 flex items-center gap-2 mt-6">
                        <MdPerson className="text-green-400" />
                        Sender Information
                      </h3>
                      <div 
                        className="p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Name:</span>
                            <span className="text-white text-sm">{selectedFile.senderName}</span>
                          </div>
                          {selectedFile.senderEmail && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-sm">Email:</span>
                              <span className="text-white text-sm">{selectedFile.senderEmail}</span>
                            </div>
                          )}
                          {selectedFile.senderOffice && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-sm">Office:</span>
                              <span className="text-white text-sm">{selectedFile.senderOffice}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Sent Date:</span>
                            <span className="text-white text-sm">{formatDate(selectedFile.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      {selectedFile.checkedBy && (
                        <>
                          <h3 className="text-white font-medium mb-4 flex items-center gap-2 mt-6">
                            <MdCheckCircle className="text-purple-400" />
                            Checked By (Receiver)
                          </h3>
                          <div 
                            className="p-4 rounded-xl"
                            style={{
                              background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                              border: '1px solid rgba(139, 92, 246, 0.1)'
                            }}
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-gray-400 text-sm">Name:</span>
                                <span className="text-white text-sm">{selectedFile.checkedBy.name || 'Unknown'}</span>
                              </div>
                              {selectedFile.checkedBy.email && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400 text-sm">Email:</span>
                                  <span className="text-white text-sm">{selectedFile.checkedBy.email}</span>
                                </div>
                              )}
                              {selectedFile.checkedBy.office && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400 text-sm">Office:</span>
                                  <span className="text-white text-sm">{selectedFile.checkedBy.office}</span>
                                </div>
                              )}
                              {selectedFile.checkedAt && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400 text-sm">Checked Date:</span>
                                  <span className="text-white text-sm">{formatDate(selectedFile.checkedAt)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                        <MdAnalytics className="text-yellow-400" />
                        File Actions
                      </h3>
                      <div 
                        className="p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}
                      >
                        <p className="text-sm text-gray-400 mb-4">You can perform the following actions on this checked file:</p>
                        <div className="grid grid-cols-1 gap-3">
                          <motion.button
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              handleViewPrintPreview(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="w-full px-4 py-3 rounded-xl text-white font-medium flex items-center gap-3"
                            style={{
                              background: 'linear-gradient(145deg, #2563eb, #1d4ed8)',
                              boxShadow: '0 10px 20px -5px #2563eb',
                            }}
                          >
                            <MdPrint className="w-5 h-5" />
                            View Print Preview (Excel)
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              handleViewPayslip(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="w-full px-4 py-3 rounded-xl text-white font-medium flex items-center gap-3"
                            style={{
                              background: 'linear-gradient(145deg, #10b981, #059669)',
                              boxShadow: '0 10px 20px -5px #10b981',
                            }}
                          >
                            <MdReceipt className="w-5 h-5" />
                            View Payslip
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              handleCreateVoucher(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="w-full px-4 py-3 rounded-xl text-white font-medium flex items-center gap-3"
                            style={{
                              background: 'linear-gradient(145deg, #8b5cf6, #7c3aed)',
                              boxShadow: '0 10px 20px -5px #8b5cf6',
                            }}
                          >
                            <MdDescription className="w-5 h-5" />
                            Create Voucher
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              handleDownloadFile(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="w-full px-4 py-3 rounded-xl text-white font-medium flex items-center gap-3"
                            style={{
                              background: 'linear-gradient(145deg, #ef4444, #dc2626)',
                              boxShadow: '0 10px 20px -5px #ef4444',
                            }}
                          >
                            <MdDownload className="w-5 h-5" />
                            Download Excel File
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileReceived;
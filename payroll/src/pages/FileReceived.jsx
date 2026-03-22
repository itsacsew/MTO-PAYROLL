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
  MdAnalytics,
  MdWaves,
  MdBusiness,
  MdFolder
} from 'react-icons/md';

const FileReceived = () => {
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // PRINT PREVIEW STATES
  const [excelData, setExcelData] = useState(null);
  const [excelSheets, setExcelSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  
  const dropdownRefs = useRef({});
  const statusFilterRef = useRef(null);
  const navigate = useNavigate();

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
              
              // OFFICE INFORMATION
              officeCategory: fileData.officeCategory || fileData.office || 'N/A',
              office: fileData.office || fileData.officeCategory || 'N/A',
              officeDisplay: fileData.officeDisplay || fileData.officeCategory || 'N/A',
              
              senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
              senderEmail: senderInfo.email || fileData.senderEmail || '',
              senderOffice: senderInfo.office || fileData.senderOffice || '',
              senderId: senderInfo.id || fileData.senderId || '',
              
              receivedBy: fileData.receivedBy || null,
              receivedAt: fileData.receivedAt || null,
              
              checkedBy: receiverInfo.id ? receiverInfo : checkerInfo,
              checkedAt: fileData.checkedAt || fileData.receivedAt || null,
              
              // ✅ GAMITON ANG lastCheckedAt PARA SA DATE CHECKED
              lastCheckedAt: fileData.lastCheckedAt?.toDate?.() || fileData.checkedAt?.toDate?.() || fileData.receivedAt?.toDate?.() || null,
              
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
                
                // OFFICE INFORMATION
                officeCategory: fileData.officeCategory || fileData.office || 'N/A',
                office: fileData.office || fileData.officeCategory || 'N/A',
                officeDisplay: fileData.officeDisplay || fileData.officeCategory || 'N/A',
                
                senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
                senderEmail: senderInfo.email || fileData.senderEmail || '',
                senderOffice: senderInfo.office || fileData.senderOffice || '',
                senderId: senderInfo.id || fileData.senderId || '',
                
                receivedBy: fileData.receivedBy || null,
                receivedAt: fileData.receivedAt || null,
                
                checkedBy: receiverInfo.id ? receiverInfo : checkerInfo,
                checkedAt: fileData.checkedAt || fileData.receivedAt || null,
                
                // ✅ GAMITON ANG lastCheckedAt PARA SA DATE CHECKED
                lastCheckedAt: fileData.lastCheckedAt?.toDate?.() || fileData.checkedAt?.toDate?.() || fileData.receivedAt?.toDate?.() || null,
                
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
            body { font-family: Arial, sans-serif; margin: 20px; background: #0a0a0f; color: #fff; }
            h1 { color: #f97316; margin-bottom: 10px; }
            .file-info { margin-bottom: 20px; color: #9ca3af; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: linear-gradient(135deg, #f97316, #ec4899); color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border: 1px solid #374151; color: #d1d5db; }
            tr:nth-child(even) { background-color: #1a1a2a; }
            .print-footer { margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
            @media print {
              body { margin: 0; padding: 10px; background: white; color: black; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${selectedFile?.fileName || 'Excel File'}</h1>
          <div class="file-info">
            <p><strong>Sender:</strong> ${selectedFile?.senderName || 'N/A'}</p>
            <p><strong>Checked By:</strong> ${selectedFile?.checkedBy?.name || selectedFile?.receivedBy?.name || 'N/A'}</p>
            <p><strong>Date Checked:</strong> ${selectedFile ? formatDate(selectedFile.lastCheckedAt || selectedFile.checkedAt || selectedFile.timestamp) : new Date().toLocaleDateString()}</p>
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
            <button onclick="window.print()" style="padding: 10px 20px; background: linear-gradient(135deg, #f97316, #ec4899); color: white; border: none; cursor: pointer; border-radius: 8px;">Print Now</button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #374151; color: white; border: none; cursor: pointer; margin-left: 10px; border-radius: 8px;">Close</button>
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

  // ✅ UPDATED: Function to handle View Payslip - Now checks multiple office categories
  const handleViewPayslip = (file) => {
    setSelectedFile(file);
    setDropdownOpen(null);
    
    // Get office category and convert to lowercase for comparison
    const officeCategory = (file.officeCategory || '').toLowerCase();
    
    // Check if office category is SB, MTO, or MENRO → go to payslip2
    if (officeCategory.includes('sb') || 
        officeCategory.includes('mto') || 
        officeCategory.includes('menro')) {
      
      // Navigate to payslip2 for SB, MTO, MENRO
      navigate(`/payslip2/${file.id}`, {
        state: {
          fileData: file
        }
      });
    }
    // Check if office category is RHU, MASO, MCR, or HRMO → go to payslip3
    else if (officeCategory.includes('rhu') || 
             officeCategory.includes('maso') || 
             officeCategory.includes('mcr') || 
             officeCategory.includes('hrmo')) {
      
      // Navigate to payslip3 for RHU, MASO, MCR, HRMO
      navigate(`/payslip3/${file.id}`, {
        state: {
          fileData: file
        }
      });
    }
    // ✅ NEW: Check if office category is MAYOR, ACCT, MBO, or MASSO → go to payslip4
    else if (officeCategory.includes('mayor') || 
             officeCategory.includes('acct') || 
             officeCategory.includes('mbo') || 
             officeCategory.includes('masso')) {
      
      // Navigate to payslip4 for MAYOR, ACCT, MBO, MASSO
      navigate(`/payslip4/${file.id}`, {
        state: {
          fileData: file
        }
      });
    }
    // Otherwise go to regular payslip
    else {
      navigate(`/payslip/${file.id}`, {
        state: {
          fileData: file
        }
      });
    }
  };

  // Close Print Preview Modal
  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
    setExcelData(null);
    setPreviewError('');
  };

  // Toggle dropdown for a specific file
  const toggleDropdown = (fileId, e) => {
    if (e) e.stopPropagation();
    setDropdownOpen(dropdownOpen === fileId ? null : fileId);
    setShowStatusFilter(false);
    
    // Find and set the selected file
    const file = receivedFiles.find(f => f.id === fileId);
    if (file) {
      setSelectedFile(file);
    }
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
            
            // OFFICE INFORMATION
            officeCategory: fileData.officeCategory || fileData.office || 'N/A',
            office: fileData.office || fileData.officeCategory || 'N/A',
            officeDisplay: fileData.officeDisplay || fileData.officeCategory || 'N/A',
            
            senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
            senderEmail: senderInfo.email || fileData.senderEmail || '',
            senderOffice: senderInfo.office || fileData.senderOffice || '',
            senderId: senderInfo.id || fileData.senderId || '',
            
            receivedBy: fileData.receivedBy || null,
            receivedAt: fileData.receivedAt || null,
            
            checkedBy: receiverInfo.id ? receiverInfo : checkerInfo,
            checkedAt: fileData.checkedAt || fileData.receivedAt || null,
            
            // ✅ GAMITON ANG lastCheckedAt PARA SA DATE CHECKED
            lastCheckedAt: fileData.lastCheckedAt?.toDate?.() || fileData.checkedAt?.toDate?.() || fileData.receivedAt?.toDate?.() || null,
            
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
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          border: 'border-purple-500/20',
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

  // Get office badge color based on office category - Like ReceiveFile.jsx
  const getOfficeBadgeClass = (officeCategory) => {
    switch (officeCategory) {
      case 'MDDRMO/MEO/MPDO/MSWDO':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'SB/MTO/MENRO':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'RHU/MASO/MCR/HRMO':
        return 'bg-pink-100 text-pink-800 border border-pink-200';
      case 'MAYOR/ACCT/MBO/MASSO':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <div className="">
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
              Checked Files
            </h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <MdWaves className="text-orange-400" />
              Files that have been marked as "Checked" from the Receive File page
            </p>
          </div>
          
          {/* Stats and Refresh */}
          <div className="flex items-center gap-4">
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
                background: 'linear-gradient(135deg, #f97316, #ec4899)',
                boxShadow: '0 10px 20px -5px #f97316, inset 0 1px 2px rgba(255,255,255,0.2)',
              }}
              title="Refresh checked files"
            >
              <MdRefresh className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Files Count */}
      <div className="relative z-10 mb-4 text-sm text-gray-400">
        Showing {receivedFiles.length} checked file(s)
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Files Table Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-visible relative"
          style={{
            background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
            boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          {/* Abstract sphere overlay */}
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />
          
          {/* Loading State */}
          {loading && (
            <div className="relative z-10 p-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ec4899)',
                  boxShadow: '0 10px 30px -5px #f97316'
                }}
              />
              <p className="mt-4 text-gray-400">Loading checked files from Firestore...</p>
              <p className="text-sm text-gray-500 mt-2">Looking for files marked as "Checked"...</p>
            </div>
          )}

          {/* Table Header - Like ReceiveFile.jsx */}
          {!loading && receivedFiles.length > 0 && (
            <div 
              className="relative z-10 grid grid-cols-12 gap-4 px-6 py-4 text-sm font-medium border-b border-white/5"
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0f0f1a)',
              }}
            >
              <div className="col-span-1 text-gray-400">NO.</div>
              <div className="col-span-3 text-gray-400">FILE NAME</div>
              <div className="col-span-2 text-gray-400">NAME OF SENDER</div>
              <div className="col-span-2 text-gray-400">OFFICE</div>
              <div className="col-span-2 text-gray-400">DATE CHECKED</div>
              <div className="col-span-1 text-gray-400">CHECKED BY</div>
              <div className="col-span-1 text-gray-400 text-center">ACTION</div>
            </div>
          )}

          {/* Table Body */}
          {!loading && (
            <>
              {receivedFiles.length === 0 ? (
                <div className="relative z-10 py-16 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: '10px 10px 20px #050505, -10px -10px 20px #1f1f2a',
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
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      boxShadow: '0 10px 20px -5px #f97316',
                    }}
                  >
                    Check Again
                  </motion.button>
                </div>
              ) : (
                <div className="relative z-10 divide-y divide-white/5">
                  {receivedFiles.map((file, index) => {
                    const statusInfo = getStatusInfo(file.status);
                    return (
                      <div
                        key={file.id}
                        className="grid grid-cols-12 gap-4 px-6 py-4 relative overflow-visible hover:bg-white/5 transition-colors"
                      >
                        {/* NO. */}
                        <div className="col-span-1 flex items-center">
                          <span className="text-gray-400 font-mono text-sm">{(index + 1).toString().padStart(2, '0')}</span>
                        </div>

                        {/* FILE NAME - Like ReceiveFile.jsx */}
                        <div className="col-span-3 flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, #f97316, #ec4899)',
                              boxShadow: '0 5px 15px -5px #f97316'
                            }}
                          >
                            <MdInsertDriveFile className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{file.fileName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {file.fileSize > 0 && (
                                <span className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* NAME OF SENDER - Like ReceiveFile.jsx */}
                        <div className="col-span-2 flex items-center">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{file.senderName}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                              <span className="truncate">{file.senderEmail}</span>
                            </div>
                          </div>
                        </div>

                        {/* OFFICE - Like ReceiveFile.jsx */}
                        <div className="col-span-2 flex items-center">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${getOfficeBadgeClass(file.officeCategory)}`}>
                            {file.officeCategory}
                          </span>
                        </div>

                        {/* DATE CHECKED - GAMIT ANG lastCheckedAt */}
                        <div className="col-span-2 flex items-center">
                          <div className="flex items-center gap-2">
                            <MdDateRange className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-300 text-sm">
                              {file.lastCheckedAt ? formatDate(file.lastCheckedAt) : 
                               file.checkedAt ? formatDate(file.checkedAt) : 
                               file.receivedAt ? formatDate(file.receivedAt) : 
                               formatDate(file.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* CHECKED BY - Like ReceiveFile.jsx */}
                        <div className="col-span-1 flex items-center">
                          {file.checkedBy ? (
                            <div className="flex items-center gap-1">
                              <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <MdPerson className="w-3 h-3 text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs truncate">{file.checkedBy.name?.split(' ')[0] || 'Checker'}</p>
                              </div>
                            </div>
                          ) : file.receivedBy ? (
                            <div className="flex items-center gap-1">
                              <div className="w-6 h-6 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                <MdPerson className="w-3 h-3 text-green-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs truncate">{file.receivedBy.name?.split(' ')[0] || 'Receiver'}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-xs">N/A</span>
                          )}
                        </div>

                        {/* ACTION - 3 DOTS BUTTON - Like ReceiveFile.jsx */}
                        <div className="col-span-1 flex items-center justify-center relative">
                          <button
                            ref={el => dropdownRefs.current[file.id] = el}
                            onClick={(e) => toggleDropdown(file.id, e)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                            style={{
                              background: dropdownOpen === file.id 
                                ? 'linear-gradient(135deg, #f97316, #ec4899)'
                                : 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                              boxShadow: dropdownOpen === file.id
                                ? '0 5px 15px -3px #f97316'
                                : '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                            }}
                          >
                            <MdMoreVert className={`w-4 h-4 ${dropdownOpen === file.id ? 'text-white' : 'text-gray-400'}`} />
                          </button>

                          {/* Dropdown Menu - Like ReceiveFile.jsx */}
                          {dropdownOpen === file.id && (
                            <div 
                              className="absolute z-50 mt-1 w-48 rounded-xl overflow-hidden"
                              style={{
                                top: '100%',
                                right: '0',
                                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                                boxShadow: '10px 10px 30px -5px #050505, -10px -10px 30px -5px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.03)'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleViewPrintPreview(file);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white flex items-center gap-2 hover:bg-orange-500/10"
                                >
                                  <MdPrint className="w-4 h-4 text-orange-400" />
                                  View Print Preview
                                </button>
                                
                                <button
                                  onClick={() => {
                                    handleViewPayslip(file);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white flex items-center gap-2 hover:bg-green-500/10"
                                >
                                  <MdReceipt className="w-4 h-4 text-green-400" />
                                  View Payslip
                                </button>
                                
                                <button
                                  onClick={() => {
                                    handleCreateVoucher(file);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white flex items-center gap-2 hover:bg-purple-500/10"
                                >
                                  <MdDescription className="w-4 h-4 text-purple-400" />
                                  Create Voucher
                                </button>
                                
                                <button
                                  onClick={() => {
                                    handleViewFileDetails(file);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white flex items-center gap-2 hover:bg-pink-500/10"
                                >
                                  <MdVisibility className="w-4 h-4 text-pink-400" />
                                  View Details
                                </button>
                                
                                <button
                                  onClick={() => {
                                    handleDownloadFile(file);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white flex items-center gap-2 hover:bg-red-500/10"
                                >
                                  <MdDownload className="w-4 h-4 text-red-400" />
                                  Download Excel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* PRINT PREVIEW MODAL - Keep existing modal code */}
      <AnimatePresence>
        {showPrintPreview && selectedFile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClosePrintPreview}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div
                className="w-full max-w-7xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col relative"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <div className="relative z-10 flex justify-between items-center p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MdPrint className="text-orange-400" />
                    Print Preview - {selectedFile.fileName}
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleClosePrintPreview}
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                    }}
                  >
                    <MdClose className="text-gray-400" size={20} />
                  </motion.button>
                </div>
                <div className="relative z-10 flex-1 p-6 overflow-y-auto">
                  <div className="flex justify-end gap-4 mb-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePrintExcel}
                      disabled={!excelData || excelData.length === 0}
                      className="px-4 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #ec4899)',
                        boxShadow: '0 10px 20px -5px #f97316',
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
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 10px 20px -5px #10b981',
                      }}
                    >
                      <MdDownload className="w-4 h-4" />
                      DOWNLOAD EXCEL
                    </motion.button>
                  </div>
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div
                className="w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden relative"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <div className="relative z-10 flex justify-between items-center p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MdInsertDriveFile className="text-orange-400" />
                    File Details - {selectedFile.fileName}
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCloseFileDetails}
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                    }}
                  >
                    <MdClose className="text-gray-400" size={20} />
                  </motion.button>
                </div>
                <div className="relative z-10 p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
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
import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { db } from '../config/firebase';
import { collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom'; // Added for navigation

const FileReceived = () => {
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  
  // PRINT PREVIEW STATES (Excel only, no PDF)
  const [excelData, setExcelData] = useState(null);
  const [excelSheets, setExcelSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  
  const dropdownRefs = useRef({});
  
  const navigate = useNavigate(); // For navigation to payslip page

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
              fileData: fileData.fileData, // IMPORTANTE: Base64 Excel data
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

      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create workbook from Excel data
      const workbook = XLSX.read(bytes, { type: 'array' });
      
      // Get sheet names
      const sheetNames = workbook.SheetNames;
      setExcelSheets(sheetNames);
      
      // Get data from active sheet
      const sheet = workbook.Sheets[sheetNames[activeSheet]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      console.log(`Parsed Excel data from sheet ${sheetNames[activeSheet]}:`, jsonData);
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
      // Create a printable HTML table
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
      
      // Open print window
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
      console.log('Downloading Excel file:', file.fileName);
      
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
      
      // Parse the new sheet
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

  // Handle View Print Preview - OPEN PRINT PREVIEW MODAL (Excel only)
  const handleViewPrintPreview = (file) => {
    setSelectedFile(file);
    setShowPrintPreview(true);
    setDropdownOpen(null);
    
    // Reset states
    setExcelData(null);
    setExcelSheets([]);
    setActiveSheet(0);
    setPreviewError('');
    
    // Parse Excel data
    setTimeout(() => {
      parseExcelFile(file.fileData);
    }, 300);
  };

  // Function to handle View Payslip - REDIRECT TO PAYSLIP PAGE
  const handleViewPayslip = (file) => {
    setSelectedFile(file);
    setDropdownOpen(null);
    
    // Navigate to payslip page with file data
    navigate(`/payslip/${file.id}`, {
      state: {
        fileData: file // Pass the file data via state
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
    if (e) e.stopPropagation();
    setDropdownOpen(dropdownOpen === fileId ? null : fileId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsideActionDropdown = Object.values(dropdownRefs.current).some(ref => 
        ref && ref.contains(event.target)
      );
      
      if (!isClickInsideActionDropdown) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Update ang handleCreateVoucher function:
  const handleCreateVoucher = (file) => {
    setSelectedFile(file);
    setDropdownOpen(null);
    
    // Navigate to the voucher/payslip generator page
    navigate('/voucher', {
      state: {
        fileData: file // Pass the file data via state
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
      alert(`✅ Refreshed! Found ${files.length} checked file(s).`);
      
    } catch (error) {
      console.error('Error refreshing files:', error);
      setError('Error refreshing checked files from Firestore.');
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
      case 'checked':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status display text
  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'checked':
        return 'CHECKED';
      default:
        return status.toUpperCase();
    }
  };

  return (
    <div className="bg-green-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Refresh button on the side */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Checked Files</h1>
            <p className="text-gray-600 mt-2">Files that have been marked as "Checked" from the Receive File page</p>
          </div>
          
          <button 
            onClick={handleRefreshFiles}
            disabled={loading}
            className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-[#0D3721] transition-colors font-medium flex items-center space-x-2 disabled:bg-gray-400"
            title="Refresh checked files"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {/* Files Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {receivedFiles.length} checked file(s)
        </div>
        
        {/* Files Table */}
        <div className="bg-white rounded-lg overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.2)] border border-gray-400">
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-400 px-6 py-4 text-sm font-semibold text-gray-700">
            <div className="col-span-1 text-center">NO.</div>
            <div className="col-span-3">FILE NAME</div>
            <div className="col-span-3">NAME OF SENDER</div>
            <div className="col-span-2">DATE CHECKED</div>
            <div className="col-span-2">CHECKED BY</div>
            <div className="col-span-1 text-center">ACTION</div>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading checked files from Firestore...</p>
              <p className="text-sm text-gray-500 mt-2">Looking for files marked as "Checked"...</p>
            </div>
          )}

          {/* Table Body */}
          {!loading && receivedFiles.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No checked files found</h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">
                Files marked as "Checked" in the Receive File page will appear here.<br />
                Go to the Receive File page to mark files as "Checked".
              </p>
              <button 
                onClick={handleRefreshFiles}
                className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Check Again
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {receivedFiles.map((file, index) => (
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
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(file.status)}`}>
                            {getStatusDisplayText(file.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NAME OF SENDER */}
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

                  {/* DATE CHECKED */}
                  <div className="col-span-2">
                    <div className="text-gray-700">
                      {file.checkedAt ? formatDate(file.checkedAt) : 
                       file.receivedAt ? formatDate(file.receivedAt) : 
                       formatDate(file.timestamp)}
                    </div>
                  </div>

                  {/* CHECKED BY */}
                  <div className="col-span-2">
                    {file.checkedBy ? (
                      <div>
                        <div className="font-medium text-gray-900 truncate">
                          {file.checkedBy.name || 'Unknown Checker'}
                        </div>
                        {file.checkedBy.office && (
                          <div className="text-xs text-gray-500">{file.checkedBy.office}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          (Receiver)
                        </div>
                      </div>
                    ) : file.receivedBy ? (
                      <div>
                        <div className="font-medium text-gray-900 truncate">
                          {file.receivedBy.name}
                        </div>
                        {file.receivedBy.office && (
                          <div className="text-xs text-gray-500">{file.receivedBy.office}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          (Receiver)
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 italic">Not recorded</div>
                    )}
                  </div>

                  {/* ACTION - DROPDOWN BUTTON */}
                  <div className="col-span-1 relative">
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
                        className="fixed z-50 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200"
                        style={{
                          position: 'fixed',
                          zIndex: 9999
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-1">
                          <button
                            onClick={() => handleViewPrintPreview(file)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            View Print Preview
                          </button>
                          
                          {/* View Payslip Option - REDIRECTS TO PAYSLIP PAGE */}
                          <button
                            onClick={() => handleViewPayslip(file)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            View Payslip
                          </button>
                          
                          <button
                            onClick={() => {
                              // Navigate to voucher generator
                              navigate('/voucher', {
                                state: {
                                  fileData: file // Pass file data
                                }
                              });
                              setDropdownOpen(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Create Voucher / Payslip
                          </button>
                          
                          <button
                            onClick={() => handleViewFileDetails(file)}
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
                            Download Excel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRINT PREVIEW MODAL (Excel only) */}
        {/* PRINT PREVIEW MODAL (Excel only) */}
{showPrintPreview && selectedFile && (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
      {/* Modal Header */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <h3 className="text-lg font-semibold text-center">PRINT PREVIEW</h3>
      </div>
      
      {/* Main Content Area - Buttons at Top */}
      <div className="p-6 flex flex-col flex-1">
        {/* Top Section - Action Buttons */}
        <div className="flex justify-end gap-4 mb-6">
          <button
            onClick={handlePrintExcel}
            disabled={!excelData || excelData.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm disabled:bg-gray-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            PRINT EXCEL
          </button>
          
          <button
            onClick={() => handleDownloadFile(selectedFile)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            DOWNLOAD EXCEL
          </button>
        </div>

        

        

        {/* Error Message */}
        {previewError && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{previewError}</p>
          </div>
        )}
      </div>

      {/* Close Button */}
      <div className="border-t px-6 py-4 flex justify-end">
        <button
          onClick={handleClosePrintPreview}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

        {/* File Details Modal */}
        {showFileDetails && selectedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">File Details - {selectedFile.fileName}</h3>
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
                        <h4 className="text-lg font-medium text-gray-800 mb-4">
                          Checked By (Receiver)
                        </h4>
                        <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Checker/Receiver Name:</label>
                            <p className="mt-1 text-gray-900">{selectedFile.checkedBy.name || 'Unknown'}</p>
                          </div>
                          {selectedFile.checkedBy.email && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Checker/Receiver Email:</label>
                              <p className="mt-1 text-gray-900">{selectedFile.checkedBy.email}</p>
                            </div>
                          )}
                          {selectedFile.checkedBy.office && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Checker/Receiver Office:</label>
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

                  {/* Right Column - Actions */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-4">File Actions</h4>
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-800 mb-3">You can perform the following actions on this checked file:</p>
                        <div className="grid grid-cols-1 gap-2">
                          <button 
                            onClick={() => {
                              handleViewPrintPreview(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            View Print Preview (Excel)
                          </button>
                          
                          {/* View Payslip Button */}
                          <button 
                            onClick={() => {
                              handleViewPayslip(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            View Payslip
                          </button>
                          
                          <button 
                            onClick={() => {
                              handleCreateVoucher(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Create Voucher
                          </button>
                          
                          <button 
                            onClick={() => {
                              handleDownloadFile(selectedFile);
                              handleCloseFileDetails();
                            }}
                            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Excel File
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileReceived;
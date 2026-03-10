import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as ExcelJS from 'exceljs';
import { 
  MdUpload, 
  MdSend, 
  MdBusiness,
  MdWarning,
  MdFolder,
  MdPerson,
  MdClose,
  MdEdit
} from 'react-icons/md';

const SendFile = () => {
  const navigate = useNavigate();
  
  // State for file handling
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [editableFileName, setEditableFileName] = useState('');
  const [excelData, setExcelData] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // State for send modal
  const [showSendModal, setShowSendModal] = useState(false);
  
  // State for office input inside modal
  const [officeInput, setOfficeInput] = useState('');

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

  // Handle select file button click
  const handleSelectFileClick = () => {
    document.getElementById('file-upload').click();
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setSelectedFile(file);
      setFileName(file.name);
      setEditableFileName(file.name); // Set initial editable filename
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data);
          
          setExcelData({
            workbook,
            originalData: data
          });
          
          setHasError(false);
          
          // Show the send modal after file is loaded
          setShowSendModal(true);
          
        } catch (error) {
          console.error('Error reading file:', error);
          alert('Error reading Excel file. Please make sure it\'s a valid Excel file.');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('File upload error:', error);
      setHasError(true);
      setErrorMessage(error.message);
    }
  }, []);

  // Handle cancel/close modal - RESET ALL FILE STATES
  const handleCancelSend = () => {
    setShowSendModal(false);
    setSelectedFile(null);
    setFileName('');
    setEditableFileName('');
    setExcelData(null);
    setOfficeInput('');
  };

  // Handle send file to Firestore
  const handleSendFile = async () => {
    if (!excelData) {
      alert('No file data to send.');
      return;
    }

    if (!officeInput.trim()) {
      alert('Please enter an office category.');
      return;
    }

    if (!editableFileName.trim()) {
      alert('Please enter a filename.');
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('You must be logged in to send a file. Please log in first.');
      navigate('/login');
      return;
    }

    setIsSending(true);

    try {
      // Write buffer from the loaded workbook
      const buffer = await excelData.workbook.xlsx.writeBuffer();
      const base64String = arrayBufferToBase64(buffer);
      
      // Use the editable filename
      const finalFileName = editableFileName.endsWith('.xlsx') ? editableFileName : `${editableFileName}.xlsx`;
      
      const fileData = {
        fileName: finalFileName,
        fileData: base64String,
        timestamp: serverTimestamp(),
        status: 'sent',
        createdAt: new Date().toISOString(),
        fileSize: base64String.length,
        originalFileName: fileName,
        
        // Office information - from text input
        officeCategory: officeInput,
        office: officeInput,
        officeDisplay: officeInput,
        
        sender: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          office: currentUser.office,
          role: currentUser.role,
          sentAt: new Date().toISOString()
        }
      };

      const docRef = await addDoc(collection(db, 'sentFiles'), fileData);

      console.log('File successfully sent to Firestore with ID:', docRef.id);
      
      // Close modal and show success message
      setShowSendModal(false);
      
      alert(`✅ File "${finalFileName}" sent successfully to Firestore!\n\nOffice: ${officeInput}\nSender: ${currentUser.name}`);
      
      // Reset states after successful send
      setSelectedFile(null);
      setFileName('');
      setEditableFileName('');
      setExcelData(null);
      setOfficeInput('');
      
    } catch (error) {
      console.error('Error sending file to Firestore:', error);
      alert('❌ Error sending file to Firestore. Please check your Firebase configuration and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Send File Modal Component
  const SendFileModal = () => {
    if (!showSendModal) return null;
    
    const currentUser = getCurrentUser();

    // Add .xlsx extension if not present
    const ensureXlsxExtension = (filename) => {
      if (!filename.toLowerCase().endsWith('.xlsx')) {
        return `${filename}.xlsx`;
      }
      return filename;
    };

    return (
      <>
        <div 
          onClick={handleCancelSend}
          className="fixed inset-0 bg-black/70 z-50"
        />

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
              boxShadow: '30px 30px 60px -10px #0a0f1a, -30px -30px 60px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 10px 20px -5px #10b981'
                  }}
                >
                  <MdSend className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Send File</h2>
              </div>
              <button
                onClick={handleCancelSend}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Office Input - TEXT INPUT not dropdown */}
              <div>
                 <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-1">
                  <MdEdit className="w-4 h-4" />
                  Office Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={officeInput}
                  onChange={(e) => setOfficeInput(e.target.value)}
                  placeholder="e.g., SB/MTO/MENRO, MAYOR/ACCT, etc."
                  className="w-full px-4 py-3 bg-[#1a2535] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{
                    boxShadow: 'inset 5px 5px 10px #0a0f1a, inset -5px -5px 10px #1e2a3a'
                  }}
                />
                
              </div>

              {/* File Information - EDITABLE FILENAME */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-1">
                  <MdEdit className="w-4 h-4" />
                  File Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editableFileName}
                    onChange={(e) => setEditableFileName(e.target.value)}
                    placeholder="Enter filename"
                    className="w-full px-4 py-3 bg-[#1a2535] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{
                      boxShadow: 'inset 5px 5px 10px #0a0f1a, inset -5px -5px 10px #1e2a3a'
                    }}
                  />
                </div>
                
              </div>

              {/* Sender Information */}
              {currentUser && (
                <div className="p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, #10b98110, #1e293b)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <MdPerson className="w-4 h-4" />
                    <span className="text-xs font-semibold">SENDER</span>
                  </div>
                  <p className="text-white font-medium">{currentUser.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{currentUser.email} • {currentUser.office}</p>
                </div>
              )}

              {/* Confirmation Message */}
              <div className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(145deg, #f59e0b10, #1e293b)',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}
              >
                <p className="text-yellow-400 text-sm">
                  Are you sure you want to send this file to Firestore?
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-white/5">
              <button
                onClick={handleCancelSend}
                className="px-4 py-2 rounded-lg text-gray-300 font-medium"
                style={{
                  background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                  boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendFile}
                disabled={isSending || !officeInput.trim() || !editableFileName.trim()}
                className="px-6 py-2 rounded-lg font-medium flex items-center gap-2 text-white"
                style={{
                  background: (isSending || !officeInput.trim() || !editableFileName.trim())
                    ? 'linear-gradient(145deg, #6b7280, #4b5563)'
                    : 'linear-gradient(145deg, #10b981, #059669)',
                  boxShadow: (isSending || !officeInput.trim() || !editableFileName.trim())
                    ? '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a'
                    : '0 10px 20px -5px #10b981',
                  opacity: (isSending || !officeInput.trim() || !editableFileName.trim()) ? 0.5 : 1,
                  cursor: (isSending || !officeInput.trim() || !editableFileName.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSending ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <MdSend className="w-4 h-4" />
                    Confirm Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Error display
  if (hasError) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div
          className="bg-[#1a2535] rounded-2xl p-8 max-w-2xl"
          style={{
            boxShadow: '30px 30px 60px -10px #0a0f1a, -30px -30px 60px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #ec4899)',
                boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.3)'
              }}
            >
              <MdWarning className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Error Occurred</h1>
              <p className="text-gray-400 text-sm mt-1">Something went wrong</p>
            </div>
          </div>
          
          <p className="text-gray-300 mb-8 p-4 rounded-xl"
            style={{
              background: 'linear-gradient(145deg, #1e293b, #0f172a)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            {errorMessage}
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={() => {
                setHasError(false);
                setErrorMessage('');
              }}
              className="px-6 py-3 rounded-xl font-medium text-white"
              style={{
                background: 'linear-gradient(145deg, #3b82f6, #2563eb)',
                boxShadow: '0 10px 20px -5px #3b82f6'
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => {
                setHasError(false);
                setErrorMessage('');
                setSelectedFile(null);
                setFileName('');
                setEditableFileName('');
                setExcelData(null);
                setOfficeInput('');
              }}
              className="px-6 py-3 rounded-xl font-medium text-white"
              style={{
                background: 'linear-gradient(145deg, #6b7280, #4b5563)',
                boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a'
              }}
            >
              Clear and Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className=" bg-[#0f172a] p-6 overflow-y-auto">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        }}
      />

      <SendFileModal />

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              style={{
                textShadow: '0 2px 5px rgba(0,0,0,0.3)'
              }}
            >
              Payroll File Manager
            </h1>
            <p className="text-gray-400 mt-2">Send payroll Excel files directly to Firestore</p>
          </div>

         
        </div>

        {/* Empty State - Laging naka-display kung walang file */}
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
            boxShadow: '30px 30px 60px -10px #0a0f1a, -30px -30px 60px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 20px 30px -10px #3b82f6'
            }}
          >
            <MdUpload className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">No File Selected</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Click the "Select File" button to choose a payroll Excel file to send.
          </p>

          <button
            onClick={handleSelectFileClick}
            className="px-8 py-4 rounded-xl font-medium inline-flex items-center gap-2 text-white mx-auto"
            style={{
              background: 'linear-gradient(145deg, #3b82f6, #2563eb)',
              boxShadow: '0 10px 20px -5px #3b82f6'
            }}
          >
            <MdUpload className="w-5 h-5" />
            Select File Now
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        id="file-upload" 
        name="file-upload" 
        type="file" 
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="sr-only" 
      />
    </div>
  );
};

export default SendFile;
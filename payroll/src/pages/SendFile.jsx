import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as ExcelJS from 'exceljs';
import { 
  MdUpload, 
  MdSend, 
  MdBusiness,
  MdCheckCircle,
  MdWarning,
  MdFolder,
  MdPerson,
  MdClose,
  MdWaves,
  MdAccessTime
} from 'react-icons/md';

const SendFile = () => {
  const navigate = useNavigate();
  
  // State for office selection
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [selectedOfficeCategory, setSelectedOfficeCategory] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [isOfficeSelected, setIsOfficeSelected] = useState(false);
  
  // State for file handling
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [excelData, setExcelData] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // State for send modal
  const [showSendModal, setShowSendModal] = useState(false);

  // Office categories (buttons)
  const officeCategories = [
    'SB/MTO/MENRO',
    'MDDRMO/MEO/MPDO/MSWDO',
    'RHU/MASO/MCR/HRMO',
    'MAYOR/ACCT/MBO/MASSO'
  ];

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

  // Handle select office button click
  const handleSelectOfficeClick = () => {
    setShowOfficeModal(true);
    setSelectedOfficeCategory('');
    setSelectedOffice('');
  };

  // Handle office category button click
  const handleOfficeCategorySelect = (category) => {
    setSelectedOfficeCategory(category);
    setSelectedOffice(category);
  };

  // Handle confirm office selection
  const handleConfirmOffice = () => {
    if (!selectedOfficeCategory) {
      alert('Please select an office category first.');
      return;
    }
    
    setIsOfficeSelected(true);
    setShowOfficeModal(false);
    
    // After confirming office, automatically open file picker
    setTimeout(() => {
      document.getElementById('file-upload').click();
    }, 100);
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setSelectedFile(file);
      setFileName(file.name);
      
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

  // Handle send file directly to Firestore
  const handleSendFile = async () => {
    if (!excelData) {
      alert('No file data to send.');
      return;
    }

    if (!selectedOfficeCategory) {
      alert('Office category is missing. Please select an office first.');
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
      // Write buffer directly from the loaded workbook
      const buffer = await excelData.workbook.xlsx.writeBuffer();
      const base64String = arrayBufferToBase64(buffer);
      
      // Use the original filename
      const finalFileName = fileName;
      
      const fileData = {
        fileName: finalFileName,
        fileData: base64String,
        timestamp: serverTimestamp(),
        status: 'sent',
        createdAt: new Date().toISOString(),
        fileSize: base64String.length,
        originalFileName: fileName,
        
        // Office information - send all three fields as requested
        officeCategory: selectedOfficeCategory,
        office: selectedOffice,
        officeDisplay: selectedOfficeCategory,
        
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
      
      let alertMessage = `✅ File "${finalFileName}" sent successfully to Firestore!\n\n`;
      alertMessage += `Document ID: ${docRef.id}\n`;
      alertMessage += `Office: ${selectedOfficeCategory}\n`;
      alertMessage += `Sender: ${currentUser.name} (${currentUser.office})`;
      
      alert(alertMessage);
      
      // Reset states after successful send
      setSelectedFile(null);
      setFileName('');
      setExcelData(null);
      setSelectedOfficeCategory('');
      setSelectedOffice('');
      setIsOfficeSelected(false);
      
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

  // Office Selection Modal Component - Updated colors
  const OfficeSelectionModal = () => {
    if (!showOfficeModal) return null;

    return (
      <>
        <div 
          onClick={() => setShowOfficeModal(false)}
          className="fixed inset-0 bg-black/70 z-50"
        />

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            {/* Abstract sphere overlay */}
            <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-4 p-6 border-b border-white/5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ec4899)',
                  boxShadow: '0 10px 20px -5px rgba(249, 115, 22, 0.3)'
                }}
              >
                <MdBusiness className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Select Office Category</h2>
                <p className="text-gray-400 text-sm mt-1">Choose which office this file belongs to</p>
              </div>
            </div>

            <div className="relative z-10 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {officeCategories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => handleOfficeCategorySelect(category)}
                    className={`p-6 text-left rounded-xl transition-all duration-200 ${
                      selectedOfficeCategory === category
                        ? 'ring-2 ring-orange-500'
                        : ''
                    }`}
                    style={{
                      background: selectedOfficeCategory === category
                        ? 'linear-gradient(145deg, rgba(249, 115, 22, 0.15), #1a1a2a)'
                        : 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: selectedOfficeCategory === category
                        ? '15px 15px 30px #050505, -15px -15px 30px #1f1f2a, 0 0 20px rgba(249, 115, 22, 0.2)'
                        : '10px 10px 20px #050505, -10px -10px 20px #1f1f2a',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #f97316, #ec4899)',
                          boxShadow: '0 5px 15px -5px #f97316'
                        }}
                      >
                        <MdBusiness className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-white font-semibold">{category}</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedOfficeCategory && (
                <div className="p-4 rounded-xl mb-6"
                  style={{
                    background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), #1a1a2a)',
                    border: '1px solid rgba(249, 115, 22, 0.2)'
                  }}
                >
                  <p className="text-orange-400 flex items-center gap-2">
                    <MdCheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Selected:</span>
                    <span className="text-white">{selectedOfficeCategory}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="relative z-10 flex justify-end gap-4 p-6 border-t border-white/5">
              <button
                onClick={() => setShowOfficeModal(false)}
                className="px-6 py-3 rounded-xl text-gray-300 font-medium"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOffice}
                disabled={!selectedOfficeCategory}
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
                  selectedOfficeCategory
                    ? 'text-white'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  background: selectedOfficeCategory
                    ? 'linear-gradient(135deg, #f97316, #ec4899)'
                    : 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: selectedOfficeCategory
                    ? '0 10px 20px -5px #f97316'
                    : '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                }}
              >
                <MdCheckCircle className="w-5 h-5" />
                Confirm & Select File
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Send File Modal Component - Updated colors
  const SendFileModal = () => {
    if (!showSendModal) return null;
    
    const currentUser = getCurrentUser();

    return (
      <>
        <div 
          onClick={() => setShowSendModal(false)}
          className="fixed inset-0 bg-black/70 z-50"
        />

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            {/* Abstract sphere overlay */}
            <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />
            
            {/* Modal Header */}
            <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ec4899)',
                    boxShadow: '0 10px 20px -5px #f97316'
                  }}
                >
                  <MdSend className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Send File</h2>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="relative z-10 p-6 space-y-4">
              {/* Office Information */}
              <div className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), #1a1a2a)',
                  border: '1px solid rgba(249, 115, 22, 0.2)'
                }}
              >
                <div className="flex items-center gap-2 text-orange-400 mb-2">
                  <MdBusiness className="w-4 h-4" />
                  <span className="text-xs font-semibold">OFFICE</span>
                </div>
                <p className="text-white font-medium">{selectedOfficeCategory}</p>
              </div>

              {/* File Information */}
              <div className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(145deg, rgba(168, 85, 247, 0.1), #1a1a2a)',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}
              >
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <MdFolder className="w-4 h-4" />
                  <span className="text-xs font-semibold">FILE</span>
                </div>
                <p className="text-white font-medium break-all">{fileName}</p>
              </div>

              {/* Sender Information */}
              {currentUser && (
                <div className="p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.1), #1a1a2a)',
                    border: '1px solid rgba(236, 72, 153, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 text-pink-400 mb-2">
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
                  background: 'linear-gradient(145deg, rgba(244, 114, 182, 0.1), #1a1a2a)',
                  border: '1px solid rgba(244, 114, 182, 0.2)'
                }}
              >
                <p className="text-pink-400 text-sm">
                  Are you sure you want to send this file to Firestore?
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="relative z-10 flex justify-end gap-3 p-6 border-t border-white/5">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 rounded-lg text-gray-300 font-medium"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendFile}
                disabled={isSending}
                className="px-6 py-2 rounded-lg font-medium flex items-center gap-2 text-white"
                style={{
                  background: isSending
                    ? 'linear-gradient(145deg, #6b7280, #4b5563)'
                    : 'linear-gradient(135deg, #f97316, #ec4899)',
                  boxShadow: isSending
                    ? '5px 5px 10px #050505, -5px -5px 10px #1f1f2a'
                    : '0 10px 20px -5px #f97316',
                  opacity: isSending ? 0.5 : 1
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

  // Error display - Updated colors
  if (hasError) {
    return (
      <div className=" bg-[#0a0a0f] flex items-center justify-center p-6">
        <div
          className="bg-[#1a1a2a] rounded-2xl p-8 max-w-2xl relative overflow-hidden"
          style={{
            boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          {/* Abstract sphere overlay */}
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
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
                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
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
                  background: 'linear-gradient(135deg, #f97316, #ec4899)',
                  boxShadow: '0 10px 20px -5px #f97316'
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
                  setExcelData(null);
                }}
                className="px-6 py-3 rounded-xl font-medium text-white"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a'
                }}
              >
                Clear and Start Over
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
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

      <OfficeSelectionModal />
      <SendFileModal />

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent"
              style={{
                textShadow: '0 2px 10px rgba(249, 115, 22, 0.3)'
              }}
            >
              Payroll File Manager
            </h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <MdWaves className="text-orange-400" />
              Send payroll Excel files directly to Firestore
            </p>
          </div>
        </div>

        {/* Office Selection Status - Updated colors */}
        {isOfficeSelected && selectedOfficeCategory && (
          <div className="mb-6 p-4 rounded-xl inline-block relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), #1a1a2a)',
              border: '1px solid rgba(249, 115, 22, 0.2)'
            }}
          >
            <div className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-xl pointer-events-none" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ec4899)',
                  boxShadow: '0 5px 10px -3px #f97316'
                }}
              >
                <MdBusiness className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-gray-400 text-sm">Selected Office:</span>
                <span className="ml-2 text-white font-semibold">{selectedOfficeCategory}</span>
              </div>
              <button
                onClick={() => {
                  setIsOfficeSelected(false);
                  setSelectedOfficeCategory('');
                  setSelectedOffice('');
                  setSelectedFile(null);
                  setFileName('');
                  setExcelData(null);
                }}
                className="ml-4 text-xs text-pink-400 hover:text-pink-300 font-medium"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Empty State - Updated colors */}
        {!selectedFile && (
          <div
            className="rounded-2xl p-12 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            {/* Abstract sphere overlays */}
            <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ec4899)',
                  boxShadow: '0 20px 30px -10px #f97316'
                }}
              >
                <MdUpload className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">No File Selected</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                {isOfficeSelected 
                  ? 'Click "Choose Excel File" to select a payroll Excel file to send.'
                  : 'Please select an office category first, then choose your Excel file.'}
              </p>

              {!isOfficeSelected && (
                <button
                  onClick={handleSelectOfficeClick}
                  className="px-8 py-4 rounded-xl font-medium inline-flex items-center gap-2 text-white mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ec4899)',
                    boxShadow: '0 10px 20px -5px #f97316'
                  }}
                >
                  <MdBusiness className="w-5 h-5" />
                  Select Office First
                </button>
              )}
            </div>
          </div>
        )}
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
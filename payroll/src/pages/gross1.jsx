// Gross1.jsx - Modified ACTION COLUMN with DROPDOWN containing CHECKED and OBS buttons
// Dropdown is ALWAYS CLICKABLE

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';  // Add this import
import { saveAs } from 'file-saver';
import { db } from '../config/firebase';
import { collection, getDocs, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
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
  MdFilterList,
  MdAttachMoney,
  MdCalculate,
  MdErrorOutline
} from 'react-icons/md';

const Gross = () => {
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [officeFilter, setOfficeFilter] = useState('all');
  const [showOfficeFilter, setShowOfficeFilter] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [calculatingGross, setCalculatingGross] = useState({});
  const [checkingFile, setCheckingFile] = useState({});
  const [observingFile, setObservingFile] = useState({});
  // New state to track which files have been checked locally (button becomes disabled)
  const [checkedLocally, setCheckedLocally] = useState({});
  // New state to track which files have been observed
  const [observedLocally, setObservedLocally] = useState({});
  
  const dropdownRefs = useRef({});
  const officeFilterRef = useRef(null);
  const navigate = useNavigate(); 

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

  // Function to extract office-specific gross amounts from Excel file
  const extractOfficeGross = async (fileData, fileOfficeCategory) => {
    try {
      console.log(`Extracting office gross for file category: ${fileOfficeCategory}`);
      
      if (!fileData) {
        console.error('No file data available');
        return [];
      }

      // Convert base64 to binary
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Parse Excel file
      const workbook = XLSX.read(bytes, { type: 'array' });
      const results = [];

      // Determine which sheet to look for based on file category
      const sheetNames = workbook.SheetNames;
      
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        console.log(`Processing sheet: ${sheetName}, rows: ${data.length}`);
        console.log(`File category: ${fileOfficeCategory}`);
        
        // ==================== SB/MTO/MENRO ====================
        if (fileOfficeCategory === 'SB/MTO/MENRO') {
          console.log('Processing SB/MTO/MENRO file - extracting from cells C2, D2, C3');
          
          // Get SB Total from cell C2 - row index 1, column index 2
          if (data[1] && data[1][2] !== undefined && data[1][2] !== '') {
            let sbTotal = data[1][2];
            if (typeof sbTotal === 'number') {
              results.push({
                office: 'SB',
                totalGross: sbTotal,
                totalGrossFormatted: `₱${sbTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'C2 cell'
              });
            } else if (typeof sbTotal === 'string' && sbTotal.trim() !== '') {
              let cleanedValue = sbTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'SB',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'C2 cell'
                });
              }
            }
          }
          
          // Get MTO Total from cell D2 - row index 1, column index 3
          if (data[1] && data[1][3] !== undefined && data[1][3] !== '') {
            let mtoTotal = data[1][3];
            if (typeof mtoTotal === 'number') {
              results.push({
                office: 'MTO',
                totalGross: mtoTotal,
                totalGrossFormatted: `₱${mtoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'D2 cell'
              });
            } else if (typeof mtoTotal === 'string' && mtoTotal.trim() !== '') {
              let cleanedValue = mtoTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MTO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'D2 cell'
                });
              }
            }
          }
          
          // Get MENRO Total from cell C3 - row index 2, column index 2
          if (data[2] && data[2][2] !== undefined && data[2][2] !== '') {
            let menroTotal = data[2][2];
            if (typeof menroTotal === 'number') {
              results.push({
                office: 'MENRO',
                totalGross: menroTotal,
                totalGrossFormatted: `₱${menroTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'C3 cell'
              });
            } else if (typeof menroTotal === 'string' && menroTotal.trim() !== '') {
              let cleanedValue = menroTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MENRO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'C3 cell'
                });
              }
            }
          }
          
          console.log(`Extracted from specific cells:`, results);
          if (results.length > 0) break;
        }
        
        // ==================== RHU/MASO/MCR/HRMO ====================
        if (fileOfficeCategory === 'RHU/MASO/MCR/HRMO') {
          console.log('Processing RHU/MASO/MCR/HRMO file - extracting from cells C2, C3, D2, D3');
          
          // Get RHU Total from cell C2 - row index 1, column index 2
          if (data[1] && data[1][2] !== undefined && data[1][2] !== '') {
            let rhuTotal = data[1][2];
            if (typeof rhuTotal === 'number') {
              results.push({
                office: 'RHU',
                totalGross: rhuTotal,
                totalGrossFormatted: `₱${rhuTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'C2 cell'
              });
            } else if (typeof rhuTotal === 'string' && rhuTotal.trim() !== '') {
              let cleanedValue = rhuTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'RHU',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'C2 cell'
                });
              }
            }
          }
          
          // Get MASO Total from cell C3 - row index 2, column index 2
          if (data[2] && data[2][2] !== undefined && data[2][2] !== '') {
            let masoTotal = data[2][2];
            if (typeof masoTotal === 'number') {
              results.push({
                office: 'MASO',
                totalGross: masoTotal,
                totalGrossFormatted: `₱${masoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'C3 cell'
              });
            } else if (typeof masoTotal === 'string' && masoTotal.trim() !== '') {
              let cleanedValue = masoTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MASO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'C3 cell'
                });
              }
            }
          }
          
          // Get MCR Total from cell D2 - row index 1, column index 3
          if (data[1] && data[1][3] !== undefined && data[1][3] !== '') {
            let mcrTotal = data[1][3];
            if (typeof mcrTotal === 'number') {
              results.push({
                office: 'MCR',
                totalGross: mcrTotal,
                totalGrossFormatted: `₱${mcrTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'D2 cell'
              });
            } else if (typeof mcrTotal === 'string' && mcrTotal.trim() !== '') {
              let cleanedValue = mcrTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MCR',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'D2 cell'
                });
              }
            }
          }
          
          // Get HRMO Total from cell D3 - row index 2, column index 3
          if (data[2] && data[2][3] !== undefined && data[2][3] !== '') {
            let hrmoTotal = data[2][3];
            if (typeof hrmoTotal === 'number') {
              results.push({
                office: 'HRMO',
                totalGross: hrmoTotal,
                totalGrossFormatted: `₱${hrmoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'D3 cell'
              });
            } else if (typeof hrmoTotal === 'string' && hrmoTotal.trim() !== '') {
              let cleanedValue = hrmoTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'HRMO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'D3 cell'
                });
              }
            }
          }
          
          console.log(`Extracted from specific cells for RHU/MASO/MCR/HRMO:`, results);
          if (results.length > 0) break;
        }
        
        // ==================== MAYOR/ACCT/MBO/MASSO ====================
        if (fileOfficeCategory === 'MAYOR/ACCT/MBO/MASSO') {
          console.log('Processing MAYOR/ACCT/MBO/MASSO file - extracting from cells C2, C3, D2, D3');
          
          // Get MAYOR Total from cell C2 - row index 1, column index 2
          if (data[1] && data[1][2] !== undefined && data[1][2] !== '') {
            let mayorTotal = data[1][2];
            if (typeof mayorTotal === 'number') {
              results.push({
                office: 'MAYOR',
                totalGross: mayorTotal,
                totalGrossFormatted: `₱${mayorTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'C2 cell'
              });
            } else if (typeof mayorTotal === 'string' && mayorTotal.trim() !== '') {
              let cleanedValue = mayorTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MAYOR',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'C2 cell'
                });
              }
            }
          }
          
          // Get ACCT Total from cell C3 - row index 2, column index 2
          if (data[2] && data[2][2] !== undefined && data[2][2] !== '') {
            let acctTotal = data[2][2];
            if (typeof acctTotal === 'number') {
              results.push({
                office: 'ACCT',
                totalGross: acctTotal,
                totalGrossFormatted: `₱${acctTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'C3 cell'
              });
            } else if (typeof acctTotal === 'string' && acctTotal.trim() !== '') {
              let cleanedValue = acctTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'ACCT',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'C3 cell'
                });
              }
            }
          }
          
          // Get MBO Total from cell D2 - row index 1, column index 3
          if (data[1] && data[1][3] !== undefined && data[1][3] !== '') {
            let mboTotal = data[1][3];
            if (typeof mboTotal === 'number') {
              results.push({
                office: 'MBO',
                totalGross: mboTotal,
                totalGrossFormatted: `₱${mboTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'D2 cell'
              });
            } else if (typeof mboTotal === 'string' && mboTotal.trim() !== '') {
              let cleanedValue = mboTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MBO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'D2 cell'
                });
              }
            }
          }
          
          // Get MASSO Total from cell D3 - row index 2, column index 3
          if (data[2] && data[2][3] !== undefined && data[2][3] !== '') {
            let massoTotal = data[2][3];
            if (typeof massoTotal === 'number') {
              results.push({
                office: 'MASSO',
                totalGross: massoTotal,
                totalGrossFormatted: `₱${massoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'D3 cell'
              });
            } else if (typeof massoTotal === 'string' && massoTotal.trim() !== '') {
              let cleanedValue = massoTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MASSO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'D3 cell'
                });
              }
            }
          }
          
          console.log(`Extracted from specific cells for MAYOR/ACCT/MBO/MASSO:`, results);
          if (results.length > 0) break;
        }
        
        // ==================== MDDRMO/MEO/MPDO/MSWDO ====================
        if (fileOfficeCategory === 'MDDRMO/MEO/MPDO/MSWDO') {
          console.log('Processing MDDRMO/MEO/MPDO/MSWDO file - extracting from cells C2, C3, D2, D3');
          
          // Get MDDRMO Total from cell C2 - row index 1, column index 2
          if (data[1] && data[1][2] !== undefined && data[1][2] !== '') {
            let mddrmoTotal = data[1][2];
            console.log(`Raw cell C2 value for MDDRMO:`, mddrmoTotal);
            
            if (typeof mddrmoTotal === 'number') {
              results.push({
                office: 'MDDRMO',
                totalGross: mddrmoTotal,
                totalGrossFormatted: `₱${mddrmoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'C2 cell'
              });
            } else if (typeof mddrmoTotal === 'string' && mddrmoTotal.trim() !== '') {
              let cleanedValue = mddrmoTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MDDRMO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'C2 cell'
                });
              }
            }
          }
          
          // Get MEO Total from cell C3 - row index 2, column index 2
          if (data[2] && data[2][2] !== undefined && data[2][2] !== '') {
            let meoTotal = data[2][2];
            console.log(`Raw cell C3 value for MEO:`, meoTotal);
            
            if (typeof meoTotal === 'number') {
              results.push({
                office: 'MEO',
                totalGross: meoTotal,
                totalGrossFormatted: `₱${meoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'C3 cell'
              });
            } else if (typeof meoTotal === 'string' && meoTotal.trim() !== '') {
              let cleanedValue = meoTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MEO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'C3 cell'
                });
              }
            }
          }
          
          // Get MPDO Total from cell D2 - row index 1, column index 3
          if (data[1] && data[1][3] !== undefined && data[1][3] !== '') {
            let mpdoTotal = data[1][3];
            console.log(`Raw cell D2 value for MPDO:`, mpdoTotal);
            
            if (typeof mpdoTotal === 'number') {
              results.push({
                office: 'MPDO',
                totalGross: mpdoTotal,
                totalGrossFormatted: `₱${mpdoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'D2 cell'
              });
            } else if (typeof mpdoTotal === 'string' && mpdoTotal.trim() !== '') {
              let cleanedValue = mpdoTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MPDO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'D2 cell'
                });
              }
            }
          }
          
          // Get MSWDO Total from cell D3 - row index 2, column index 3
          if (data[2] && data[2][3] !== undefined && data[2][3] !== '') {
            let mswdoTotal = data[2][3];
            console.log(`Raw cell D3 value for MSWDO:`, mswdoTotal);
            
            if (typeof mswdoTotal === 'number') {
              results.push({
                office: 'MSWDO',
                totalGross: mswdoTotal,
                totalGrossFormatted: `₱${mswdoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                fileId: null,
                fileName: null,
                fileCategory: fileOfficeCategory,
                source: 'D3 cell'
              });
            } else if (typeof mswdoTotal === 'string' && mswdoTotal.trim() !== '') {
              let cleanedValue = mswdoTotal.replace(/[₱,]/g, '').trim();
              let numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue) && numericValue > 0) {
                results.push({
                  office: 'MSWDO',
                  totalGross: numericValue,
                  totalGrossFormatted: `₱${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  fileId: null,
                  fileName: null,
                  fileCategory: fileOfficeCategory,
                  source: 'D3 cell'
                });
              }
            }
          }
          
          console.log(`Extracted from specific cells for MDDRMO/MEO/MPDO/MSWDO:`, results);
          if (results.length > 0) break;
        }
        
        // ==================== OTHER CATEGORIES (Calculation based on designation) ====================
        const officeConfigs = {};
        const config = officeConfigs[fileOfficeCategory];
        
        if (fileOfficeCategory === 'SB/MTO/MENRO' || 
            fileOfficeCategory === 'RHU/MASO/MCR/HRMO' || 
            fileOfficeCategory === 'MAYOR/ACCT/MBO/MASSO' ||
            fileOfficeCategory === 'MDDRMO/MEO/MPDO/MSWDO') {
          const officesFound = results.map(r => r.office);
          console.log(`Found offices from specific cells: ${officesFound.join(', ')}`);
          break;
        }
        
        if (!config) {
          console.log('No configuration found for category:', fileOfficeCategory);
          return await detectSectionsFromData(data, fileOfficeCategory);
        }
        
        break;
      }
      
      return results;
      
    } catch (error) {
      console.error('Error extracting office gross:', error);
      return [];
    }
  };
  
  // Fallback function to detect sections from data
  const detectSectionsFromData = async (data, fileOfficeCategory) => {
    const results = [];
    const possibleOffices = ['SB', 'MTO', 'MENRO', 'MAYOR', 'ACCT', 'MBO', 'MASSO', 'MDDRMO', 'MEO', 'MPDO', 'MSWDO', 'RHU', 'MASO', 'MCR', 'HRMO'];
    
    let currentSection = null;
    let sectionAmounts = {};
    let amountCol = 7;
    
    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i];
      if (row) {
        for (let j = 0; j < row.length; j++) {
          const cell = row[j] ? String(row[j]).toLowerCase() : '';
          if (cell.includes('amount') && cell.includes('accrued')) {
            amountCol = j;
            break;
          }
        }
      }
    }
    
    let dataStartRow = -1;
    for (let i = 0; i < data.length && i < 50; i++) {
      const row = data[i];
      if (row && row[0] && !isNaN(parseFloat(row[0])) && row[0] !== '' && row[0] !== 'NUMBER') {
        dataStartRow = i;
        break;
      }
    }
    if (dataStartRow === -1) dataStartRow = 12;
    
    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const rowText = row.map(cell => cell ? String(cell) : '').join(' ');
      for (const office of possibleOffices) {
        if (rowText.toUpperCase().includes(office) && rowText.length < 50) {
          currentSection = office;
          if (!sectionAmounts[currentSection]) {
            sectionAmounts[currentSection] = 0;
          }
          break;
        }
      }
      
      const hasNumber = row[0] && !isNaN(parseFloat(row[0])) && row[0] !== '';
      if (hasNumber && currentSection) {
        let amount = null;
        if (row[amountCol] && typeof row[amountCol] === 'number') {
          amount = row[amountCol];
        } else if (row[amountCol] && !isNaN(parseFloat(row[amountCol]))) {
          amount = parseFloat(row[amountCol]);
        }
        
        if (amount && amount > 0 && !isNaN(amount)) {
          sectionAmounts[currentSection] += amount;
        }
      }
    }
    
    for (const [office, amount] of Object.entries(sectionAmounts)) {
      if (amount > 0) {
        results.push({
          office: office,
          totalGross: amount,
          totalGrossFormatted: `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          fileId: null,
          fileName: null,
          fileCategory: fileOfficeCategory
        });
      }
    }
    
    return results;
  };

  // Function to process all files and extract office-specific amounts
  const processAllFiles = async (files) => {
    const allOfficeEntries = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setCalculatingGross(prev => ({ ...prev, [file.id]: true }));
      
      try {
        const officeEntries = await extractOfficeGross(file.fileData, file.officeCategory);
        
        const categoryOfficeMapping = {
          'SB/MTO/MENRO': ['SB', 'MTO', 'MENRO'],
          'MAYOR/ACCT/MBO/MASSO': ['MAYOR', 'ACCT', 'MBO', 'MASSO'],
          'MDDRMO/MEO/MPDO/MSWDO': ['MDDRMO', 'MEO', 'MPDO', 'MSWDO'],
          'RHU/MASO/MCR/HRMO': ['RHU', 'MASO', 'MCR', 'HRMO']
        };
        
        const expectedOffices = categoryOfficeMapping[file.officeCategory] || [];
        console.log(`File category: ${file.officeCategory}, Expected offices:`, expectedOffices);
        console.log(`Extracted entries:`, officeEntries.map(e => ({ office: e.office, gross: e.totalGross })));
        
        const grossMap = {};
        officeEntries.forEach(entry => {
          grossMap[entry.office] = entry.totalGross;
        });
        
        for (const expectedOffice of expectedOffices) {
          const extractedEntry = officeEntries.find(entry => entry.office === expectedOffice);
          
          if (extractedEntry) {
            allOfficeEntries.push({
              ...extractedEntry,
              fileId: file.id,
              fileName: file.fileName,
              fileTimestamp: file.timestamp,
              fileCategory: file.officeCategory,
              senderName: file.senderName,
              senderEmail: file.senderEmail,
              senderOffice: file.senderOffice,
              status: file.status,
              fileSize: file.fileSize,
              timestamp: file.timestamp,
              fileData: file.fileData
            });
          } else {
            let foundValue = null;
            
            if (file.officeCategory === 'RHU/MASO/MCR/HRMO') {
              const officeNameMapping = {
                'RHU': ['RHU', 'RURAL HEALTH', 'MHO', 'HEALTH'],
                'MASO': ['MASO', 'AGRICULTURE', 'AGRICULTURIST'],
                'MCR': ['MCR', 'CIVIL REGISTRAR', 'REGISTRY'],
                'HRMO': ['HRMO', 'HUMAN RESOURCES', 'PERSONNEL']
              };
              
              for (const extracted of officeEntries) {
                const extractedUpper = extracted.office.toUpperCase();
                for (const [expected, keywords] of Object.entries(officeNameMapping)) {
                  if (keywords.some(keyword => extractedUpper.includes(keyword))) {
                    foundValue = extracted;
                    break;
                  }
                }
                if (foundValue) break;
              }
            }
            
            if (foundValue) {
              allOfficeEntries.push({
                ...foundValue,
                office: expectedOffice,
                fileId: file.id,
                fileName: file.fileName,
                fileTimestamp: file.timestamp,
                fileCategory: file.officeCategory,
                senderName: file.senderName,
                senderEmail: file.senderEmail,
                senderOffice: file.senderOffice,
                status: file.status,
                fileSize: file.fileSize,
                timestamp: file.timestamp,
                fileData: file.fileData
              });
            } else {
              allOfficeEntries.push({
                office: expectedOffice,
                totalGross: 0,
                totalGrossFormatted: '₱0.00',
                fileId: file.id,
                fileName: file.fileName,
                fileTimestamp: file.timestamp,
                fileCategory: file.officeCategory,
                senderName: file.senderName,
                senderEmail: file.senderEmail,
                senderOffice: file.senderOffice,
                status: file.status,
                fileSize: file.fileSize,
                timestamp: file.timestamp,
                fileData: file.fileData,
                source: 'no data'
              });
            }
          }
        }
        
      } catch (error) {
        console.error(`Error processing file ${file.fileName}:`, error);
      }
      
      setCalculatingGross(prev => ({ ...prev, [file.id]: false }));
    }
    
    allOfficeEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log('All office entries processed:', allOfficeEntries.map(e => ({ office: e.office, gross: e.totalGross, category: e.fileCategory })));
    return allOfficeEntries;
  };

  // NEW FUNCTION: Handle Check File - Update status to 'checked' but keep file visible (button becomes disabled)
  const handleCheckFile = async (entry) => {
    if (!entry.fileId) return;
    
    // Check if already checked locally
    if (checkedLocally[entry.fileId] || observedLocally[entry.fileId]) {
      alert('This file has already been processed.');
      return;
    }

    if (!window.confirm(`Are you sure you want to mark this file as CHECKED?\n\nFile: ${entry.fileName}\nOffice: ${entry.office}`)) {
      return;
    }

    try {
      console.log('Checking file:', entry.fileId);
      
      setCheckingFile(prev => ({ ...prev, [entry.fileId]: true }));
      
      const currentUser = getCurrentUser();
      
      const updateData = {
        status: 'checked',
        lastCheckedAt: serverTimestamp(),
        checkedBy: currentUser ? {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          office: currentUser.office,
          role: currentUser.role
        } : null
      };
      
      await updateDoc(doc(db, 'sentFiles', entry.fileId), updateData);
      
      alert(`✅ File "${entry.fileName}" has been marked as CHECKED!`);
      
      // Mark this file as checked locally (button will become disabled)
      setCheckedLocally(prev => ({ ...prev, [entry.fileId]: true }));
      
      // Update the local state to reflect the new status but KEEP the file
      setReceivedFiles(prev => prev.map(f => 
        f.id === entry.fileId ? { ...f, status: 'checked' } : f
      ));
      
      setFilteredFiles(prev => prev.map(e => 
        e.fileId === entry.fileId ? { ...e, status: 'checked' } : e
      ));
      
      setDropdownOpen(null);
      
    } catch (error) {
      console.error('Error checking file:', error);
      alert('❌ Error updating file status. Please try again.');
    } finally {
      setCheckingFile(prev => ({ ...prev, [entry.fileId]: false }));
    }
  };

// HANDLE OBSERVATION - Navigate to OBS page with file data
// HANDLE OBSERVATION - Navigate to OBS page with file data (NO Firestore update)
const handleObsFile = async (entry) => {
  if (!entry.fileId) return;
  
  // Check if already processed
  if (checkedLocally[entry.fileId] || observedLocally[entry.fileId]) {
    alert('This file has already been processed.');
    return;
  }

  try {
    // Get the full file data from receivedFiles
    const file = receivedFiles.find(f => f.id === entry.fileId);
    
    if (!file || !file.fileData) {
      alert('❌ File data not found. Cannot open OBS.');
      return;
    }

    console.log('Opening OBS for file:', file.fileName);
    console.log('Office:', entry.office);
    console.log('Category:', file.officeCategory);

    // Navigate to OBS page with the file data
    navigate('/obs', { 
      state: { 
        fileData: {
          fileName: file.fileName,
          fileData: file.fileData,
          officeCategory: file.officeCategory,
          office: entry.office,
          fileId: entry.fileId
        }
      }
    });
    
    setDropdownOpen(null);
    
  } catch (error) {
    console.error('Error opening OBS:', error);
    alert('❌ Error opening OBS. Please try again.');
  }
};

  // Load and process files from Firestore - SHOW ALL FILES
  useEffect(() => {
    const loadAndProcessFiles = async () => {
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
          const senderInfo = fileData.sender || {};
          
          // INCLUDE ALL FILES
          if (fileData.status !== 'deleted') {
            files.push({
              id: doc.id,
              fileName: fileData.fileName || 'Unknown File',
              fileData: fileData.fileData,
              timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
              updatedEmployees: fileData.updatedEmployees || [],
              status: fileData.status || 'sent',
              originalFileName: fileData.originalFileName || '',
              fileSize: fileData.fileSize || 0,
              totalGross: fileData.totalGross || 0,
              totalGrossFormatted: fileData.totalGrossFormatted || 'Calculating...',
              officeCategory: fileData.officeCategory || fileData.office || 'N/A',
              office: fileData.office || fileData.officeCategory || 'N/A',
              officeDisplay: fileData.officeDisplay || fileData.officeCategory || 'N/A',
              senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
              senderEmail: senderInfo.email || fileData.senderEmail || '',
              senderOffice: senderInfo.office || fileData.senderOffice || '',
              senderId: senderInfo.id || fileData.senderId || '',
              receivedBy: fileData.receivedBy || null,
              receivedAt: fileData.receivedAt?.toDate?.() || (fileData.receivedAt instanceof Date ? fileData.receivedAt : null),
              checkedBy: fileData.checkedBy || null,
              checkedAt: fileData.checkedAt?.toDate?.() || (fileData.checkedAt instanceof Date ? fileData.checkedAt : null),
              markedAsReceived: fileData.markedAsReceived || false,
              checked: fileData.checked || false,
              lastUpdatedAt: fileData.lastUpdatedAt || null
            });
            
            // If status is 'checked', mark it as locally checked
            if (fileData.status === 'checked') {
              setCheckedLocally(prev => ({ ...prev, [doc.id]: true }));
            }
            // If status is 'observation', mark it as locally observed
            if (fileData.status === 'observation') {
              setObservedLocally(prev => ({ ...prev, [doc.id]: true }));
            }
          }
        });

        console.log('Total files loaded:', files.length);
        setReceivedFiles(files);
        
        // Process files to extract office-specific amounts
        const officeEntries = await processAllFiles(files);
        setFilteredFiles(officeEntries);
        
      } catch (error) {
        console.error('Error loading files from Firestore:', error);
        setError('Error loading files from Firestore. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadAndProcessFiles();

    // Real-time listener for new files and updates
    try {
      const q = query(
        collection(db, 'sentFiles'), 
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, 
        async (snapshot) => {
          console.log('🔥🔥🔥 REAL-TIME UPDATE RECEIVED! 🔥🔥🔥');
          const files = [];
          snapshot.forEach((doc) => {
            const fileData = doc.data();
            const senderInfo = fileData.sender || {};
            
            // INCLUDE ALL FILES
            if (fileData.status !== 'deleted') {
              files.push({
                id: doc.id,
                fileName: fileData.fileName || 'Unknown File',
                fileData: fileData.fileData,
                timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
                updatedEmployees: fileData.updatedEmployees || [],
                status: fileData.status || 'sent',
                originalFileName: fileData.originalFileName || '',
                fileSize: fileData.fileSize || 0,
                totalGross: fileData.totalGross || 0,
                totalGrossFormatted: fileData.totalGrossFormatted || 'Calculating...',
                officeCategory: fileData.officeCategory || fileData.office || 'N/A',
                office: fileData.office || fileData.officeCategory || 'N/A',
                officeDisplay: fileData.officeDisplay || fileData.officeCategory || 'N/A',
                senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
                senderEmail: senderInfo.email || fileData.senderEmail || '',
                senderOffice: senderInfo.office || fileData.senderOffice || '',
                senderId: senderInfo.id || fileData.senderId || '',
                receivedBy: fileData.receivedBy || null,
                receivedAt: fileData.receivedAt?.toDate?.() || (fileData.receivedAt instanceof Date ? fileData.receivedAt : null),
                checkedBy: fileData.checkedBy || null,
                checkedAt: fileData.checkedAt?.toDate?.() || (fileData.checkedAt instanceof Date ? fileData.checkedAt : null),
                markedAsReceived: fileData.markedAsReceived || false,
                checked: fileData.checked || false,
                lastUpdatedAt: fileData.lastUpdatedAt || null
              });
              
              // If status is 'checked', mark it as locally checked
              if (fileData.status === 'checked') {
                setCheckedLocally(prev => ({ ...prev, [doc.id]: true }));
              }
              // If status is 'observation', mark it as locally observed
              if (fileData.status === 'observation') {
                setObservedLocally(prev => ({ ...prev, [doc.id]: true }));
              }
            }
          });
          
          console.log('Files after real-time update:', files.length);
          setReceivedFiles(files);
          const officeEntries = await processAllFiles(files);
          setFilteredFiles(officeEntries);
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

  // Recalculate gross for a specific file
  const handleRecalculateGross = async (fileEntry) => {
    const file = receivedFiles.find(f => f.id === fileEntry.fileId);
    if (!file) return;
    
    setCalculatingGross(prev => ({ ...prev, [file.id]: true }));
    
    try {
      const officeEntries = await extractOfficeGross(file.fileData, file.officeCategory);
      
      const updatedEntries = filteredFiles.filter(entry => entry.fileId !== file.id);
      officeEntries.forEach(entry => {
        updatedEntries.push({
          ...entry,
          fileId: file.id,
          fileName: file.fileName,
          fileTimestamp: file.timestamp,
          fileCategory: file.officeCategory,
          senderName: file.senderName,
          senderEmail: file.senderEmail,
          senderOffice: file.senderOffice,
          status: file.status,
          fileSize: file.fileSize,
          timestamp: file.timestamp,
          fileData: file.fileData
        });
      });
      
      updatedEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setFilteredFiles(updatedEntries);
      alert(`✅ Gross amounts recalculated for file: ${file.fileName}`);
    } catch (error) {
      console.error('Error recalculating gross:', error);
      alert('❌ Error recalculating gross amounts.');
    }
    
    setCalculatingGross(prev => ({ ...prev, [file.id]: false }));
    setDropdownOpen(null);
  };

  // Toggle dropdown for a specific file entry
  const toggleDropdown = (entryKey, e) => {
    if (e) e.stopPropagation();
    setDropdownOpen(dropdownOpen === entryKey ? null : entryKey);
    setShowOfficeFilter(false);
  };

  // Toggle office filter dropdown
  const toggleOfficeFilter = (e) => {
    if (e) e.stopPropagation();
    setShowOfficeFilter(!showOfficeFilter);
    setDropdownOpen(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsideActionDropdown = Object.values(dropdownRefs.current).some(ref => 
        ref && ref.contains(event.target)
      );
      
      const isClickInsideOfficeFilter = officeFilterRef.current && officeFilterRef.current.contains(event.target);
      
      if (!isClickInsideActionDropdown && !isClickInsideOfficeFilter) {
        setDropdownOpen(null);
        setShowOfficeFilter(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Download file function
  const handleDownloadFile = (fileEntry) => {
    const file = receivedFiles.find(f => f.id === fileEntry.fileId);
    if (!file) return;
    
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

  // Handle View Details
  const handleViewDetails = (fileEntry) => {
    const file = receivedFiles.find(f => f.id === fileEntry.fileId);
    if (file) {
      setSelectedFile({
        ...file,
        officeGross: fileEntry.totalGross,
        officeGrossFormatted: fileEntry.totalGrossFormatted,
        officeName: fileEntry.office
      });
    }
    setShowFileDetails(true);
    setDropdownOpen(null);
  };

  // Close file details modal
  const handleCloseFileDetails = () => {
    setShowFileDetails(false);
    setSelectedFile(null);
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
      setFilteredFiles(prevEntries => prevEntries.filter(entry => entry.fileId !== fileId));
      
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
      setFilteredFiles([]);
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
        
        // INCLUDE ALL FILES
        if (fileData.status !== 'deleted') {
          files.push({
            id: doc.id,
            fileName: fileData.fileName || 'Unknown File',
            fileData: fileData.fileData,
            timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
            updatedEmployees: fileData.updatedEmployees || [],
            status: fileData.status || 'sent',
            originalFileName: fileData.originalFileName || '',
            fileSize: fileData.fileSize || 0,
            totalGross: fileData.totalGross || 0,
            totalGrossFormatted: fileData.totalGrossFormatted || 'Calculating...',
            officeCategory: fileData.officeCategory || fileData.office || 'N/A',
            office: fileData.office || fileData.officeCategory || 'N/A',
            officeDisplay: fileData.officeDisplay || fileData.officeCategory || 'N/A',
            senderName: senderInfo.name || fileData.senderName || 'Unknown Sender',
            senderEmail: senderInfo.email || fileData.senderEmail || '',
            senderOffice: senderInfo.office || fileData.senderOffice || '',
            senderId: senderInfo.id || fileData.senderId || '',
            receivedBy: fileData.receivedBy || null,
            receivedAt: fileData.receivedAt?.toDate?.() || (fileData.receivedAt instanceof Date ? fileData.receivedAt : null),
            checkedBy: fileData.checkedBy || null,
            checkedAt: fileData.checkedAt?.toDate?.() || (fileData.checkedAt instanceof Date ? fileData.checkedAt : null),
            markedAsReceived: fileData.markedAsReceived || false,
            checked: fileData.checked || false,
            lastUpdatedAt: fileData.lastUpdatedAt || null
          });
          
          // If status is 'checked', mark it as locally checked
          if (fileData.status === 'checked') {
            setCheckedLocally(prev => ({ ...prev, [doc.id]: true }));
          }
          // If status is 'observation', mark it as locally observed
          if (fileData.status === 'observation') {
            setObservedLocally(prev => ({ ...prev, [doc.id]: true }));
          }
        }
      });

      setReceivedFiles(files);
      const officeEntries = await processAllFiles(files);
      setFilteredFiles(officeEntries);
      
      console.log('Files refreshed successfully');
      
    } catch (error) {
      console.error('Error refreshing files:', error);
      setError('Error refreshing files from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get office badge color based on office
  const getOfficeBadgeClass = (office) => {
    const officeColors = {
      'SB': 'bg-orange-100 text-orange-800 border border-orange-200',
      'MTO': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'MENRO': 'bg-green-100 text-green-800 border border-green-200',
      'RHU': 'bg-red-100 text-red-800 border border-red-200',
      'MASO': 'bg-blue-100 text-blue-800 border border-blue-200',
      'MCR': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      'HRMO': 'bg-purple-100 text-purple-800 border border-purple-200',
      'MAYOR': 'bg-pink-100 text-pink-800 border border-pink-200',
      'ACCT': 'bg-cyan-100 text-cyan-800 border border-cyan-200',
      'MBO': 'bg-teal-100 text-teal-800 border border-teal-200',
      'MASSO': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      'MDDRMO': 'bg-amber-100 text-amber-800 border border-amber-200',
      'MEO': 'bg-lime-100 text-lime-800 border border-lime-200',
      'MPDO': 'bg-rose-100 text-rose-800 border border-rose-200',
      'MSWDO': 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200'
    };
    return officeColors[office] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'checked':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'observation':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
  };

  // Get gross badge color based on amount
  const getGrossBadgeClass = (totalGross) => {
    if (!totalGross || totalGross === 0) return 'bg-gray-100 text-gray-600';
    if (totalGross < 50000) return 'bg-green-100 text-green-800';
    if (totalGross < 150000) return 'bg-blue-100 text-blue-800';
    if (totalGross < 300000) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Calculate total of all gross
  const totalOverallGross = filteredFiles.reduce((sum, file) => sum + (file.totalGross || 0), 0);

  // Helper function to check if file is checked (button should be disabled)
  const isFileProcessed = (fileId) => {
    const file = receivedFiles.find(f => f.id === fileId);
    return checkedLocally[fileId] || observedLocally[fileId] || file?.status === 'checked' || file?.status === 'observation';
  };

  // Get status text for a file
  const getFileStatusText = (fileId) => {
    if (checkedLocally[fileId]) return '✓ CHECKED';
    if (observedLocally[fileId]) return '📋 OBSERVATION';
    const file = receivedFiles.find(f => f.id === fileId);
    if (file?.status === 'checked') return '✓ CHECKED';
    if (file?.status === 'observation') return '📋 OBSERVATION';
    return '';
  };

  return (
    <div className="p-6">
      {/* Animated abstract sphere background */}
      <div className="fixed inset-0 overflow-hidden">
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

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent"
              style={{
                textShadow: '0 2px 10px rgba(249, 115, 22, 0.3)'
              }}
            >
              Check Files - Review & Process
            </h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <MdMoreVert className="text-orange-400" />
              Click the 3-dot menu to CHECK or OBSERVE files
            </p>
            <p className="text-xs text-gray-500 mt-1">
              * Use CHECK for approved files | Use OBSERVATION for files that need revision
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div 
            className="rounded-xl p-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '10px 10px 20px -5px #050505, -10px -10px 20px -5px #1f1f2a',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-orange-500/10 blur-2xl" />
            <div className="relative">
              <p className="text-gray-400 text-sm">Total Files</p>
              <p className="text-3xl font-bold text-white">{[...new Set(filteredFiles.map(f => f.fileId))].length}</p>
              <p className="text-xs text-gray-500 mt-1">All uploaded files</p>
            </div>
          </div>
          
          <div 
            className="rounded-xl p-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '10px 10px 20px -5px #050505, -10px -10px 20px -5px #1f1f2a',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-green-500/10 blur-2xl" />
            <div className="relative">
              <p className="text-gray-400 text-sm">Office Entries</p>
              <p className="text-3xl font-bold text-white">{filteredFiles.length}</p>
              <p className="text-xs text-gray-500 mt-1">Separated by specific office</p>
            </div>
          </div>
          
          <div 
            className="rounded-xl p-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '10px 10px 20px -5px #050505, -10px -10px 20px -5px #1f1f2a',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative">
              <p className="text-gray-400 text-sm">Total Gross Amount</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                ₱{totalOverallGross.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">All offices combined</p>
            </div>
          </div>
          
          <div 
            className="rounded-xl p-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '10px 10px 20px -5px #050505, -10px -10px 20px -5px #1f1f2a',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-purple-500/10 blur-2xl" />
            <div className="relative">
              <p className="text-gray-400 text-sm">Processed Files</p>
              <p className="text-3xl font-bold text-white">
                {Object.keys(checkedLocally).length + Object.keys(observedLocally).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Checked + Observation</p>
            </div>
          </div>
        </div>
        
        {/* Files Count */}
        <div className="mb-4 text-sm text-gray-400">
          Showing {filteredFiles.length} office entries from {[...new Set(filteredFiles.map(f => f.fileId))].length} file(s)
          {filteredFiles.some(f => f.source === 'C2 cell' || f.source === 'D2 cell' || f.source === 'C3 cell') && (
            <span className="ml-2 text-orange-400">(SB/MTO/MENRO totals from specific cells)</span>
          )}
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
            <div className="col-span-2">FILE NAME</div>
            <div className="col-span-2">SPECIFIC OFFICE</div>
            <div className="col-span-2">FILE CATEGORY</div>
            <div className="col-span-2">SENDER</div>
            <div className="col-span-1">DATE</div>
            <div className="col-span-1 text-center">TOTAL GROSS</div>
            <div className="col-span-1 text-center">ACTION</div>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="relative z-10 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading files from Firestore...</p>
              <p className="text-sm text-gray-500 mt-2">Extracting office-specific gross amounts...</p>
            </div>
          )}

          {/* Table Body */}
          {!loading && filteredFiles.length === 0 ? (
            <div className="relative z-10 py-16 text-center">
              <MdCheckCircle className="mx-auto h-16 w-16 text-green-500/50" />
              <h3 className="mt-4 text-lg font-medium text-white">No files found</h3>
              <p className="mt-2 text-gray-400 max-w-md mx-auto">
                No files have been uploaded yet. Files will appear here when sent from Dashboard.
              </p>
              <div className="mt-4 flex gap-3 justify-center">
                <button 
                  onClick={handleRefreshFiles}
                  className="px-4 py-2 rounded-xl font-medium text-white"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ec4899)',
                    boxShadow: '0 10px 20px -5px #f97316'
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 divide-y divide-white/5">
              {filteredFiles.map((entry, index) => {
                const isProcessed = isFileProcessed(entry.fileId);
                const entryKey = `${entry.fileId}-${entry.office}`;
                const statusText = getFileStatusText(entry.fileId);
                
                return (
                  <div key={entryKey} className="grid grid-cols-12 items-center px-6 py-4 hover:bg-white/5 transition-colors relative">
                    {/* NO. */}
                    <div className="col-span-1 text-center text-gray-400 font-medium">
                      {index + 1}
                    </div>

                    {/* FILE NAME */}
                    <div className="col-span-2">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-br from-orange-500/20 to-pink-500/20 p-2 rounded-lg">
                          <MdFolder className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white truncate max-w-[200px]" title={entry.fileName}>
                            {entry.fileName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {entry.fileSize > 0 && formatFileSize(entry.fileSize)}
                          </div>
                          {entry.source && (
                            <div className="text-xs text-orange-400 mt-0.5">
                              {entry.source === 'C2 cell' && '📊 from C2'}
                              {entry.source === 'D2 cell' && '📊 from D2'}
                              {entry.source === 'C3 cell' && '📊 from C3'}
                            </div>
                          )}
                          {isProcessed && (
                            <div className={`text-xs mt-0.5 ${statusText.includes('CHECKED') ? 'text-green-400' : 'text-yellow-400'}`}>
                              {statusText}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SPECIFIC OFFICE */}
                    <div className="col-span-2">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${getOfficeBadgeClass(entry.office)}`}>
                        {entry.office}
                      </span>
                    </div>

                    {/* FILE CATEGORY */}
                    <div className="col-span-2">
                      <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {entry.fileCategory}
                      </span>
                    </div>

                    {/* SENDER */}
                    <div className="col-span-2">
                      <div className="font-medium text-white truncate">{entry.senderName}</div>
                      <div className="text-xs text-gray-500 truncate">{entry.senderEmail}</div>
                    </div>

                    {/* DATE */}
                    <div className="col-span-1">
                      <div className="text-gray-300 text-sm">{formatDate(entry.timestamp)}</div>
                    </div>

                    {/* TOTAL GROSS */}
                    <div className="col-span-1 text-center">
                      {calculatingGross[entry.fileId] ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-400"></div>
                        </div>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getGrossBadgeClass(entry.totalGross)}`}>
                          {entry.totalGrossFormatted}
                        </span>
                      )}
                    </div>

                    {/* ACTION - DROPDOWN - ALWAYS CLICKABLE */}
                    <div className="col-span-1">
                      <div className="flex justify-center">
                        <div className="relative" ref={el => dropdownRefs.current[entryKey] = el}>
                          <button
                            onClick={(e) => toggleDropdown(entryKey, e)}
                            // REMOVED disabled={isProcessed} - ALWAYS CLICKABLE NOW
                            className="p-2 rounded-lg transition-all duration-200 bg-white/10 text-white hover:bg-white/20"
                            title="Actions"
                          >
                            <MdMoreVert className="h-5 w-5" />
                          </button>
                          
                          {/* Dropdown Menu - Always shows, but buttons are conditionally enabled/disabled */}
                          {dropdownOpen === entryKey && (
                            <div className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden z-50"
                              style={{
                                background: 'linear-gradient(145deg, #1f1f2a, #15151e)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 20px 35px -10px rgba(0,0,0,0.5)'
                              }}
                            >
                              <div className="py-2">
                                {/* CHECKED Button - Disabled if already processed */}
                                <button
                                  onClick={() => {
                                    handleCheckFile(entry);
                                    setDropdownOpen(null);
                                  }}
                                  disabled={checkingFile[entry.fileId] || isProcessed}
                                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 text-sm transition-colors ${
                                    isProcessed 
                                      ? 'text-gray-500 cursor-not-allowed bg-transparent' 
                                      : 'text-white hover:bg-white/10'
                                  }`}
                                >
                                  {checkingFile[entry.fileId] ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      <span>Processing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <MdCheckCircle className={`h-5 w-5 ${isProcessed ? 'text-gray-500' : 'text-green-400'}`} />
                                      <span>CHECKED</span>
                                      {isProcessed && <span className="text-xs ml-auto">(done)</span>}
                                    </>
                                  )}
                                </button>
                                
                                {/* OBS (Observation) Button - Disabled if already processed */}
                                <button
                                  onClick={() => {
                                    handleObsFile(entry);
                                    setDropdownOpen(null);
                                  }}
                                  disabled={observingFile[entry.fileId] || isProcessed}
                                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 text-sm transition-colors ${
                                    isProcessed 
                                      ? 'text-gray-500 cursor-not-allowed bg-transparent' 
                                      : 'text-white hover:bg-white/10'
                                  }`}
                                >
                                  {observingFile[entry.fileId] ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      <span>Processing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <MdErrorOutline className={`h-5 w-5 ${isProcessed ? 'text-gray-500' : 'text-yellow-400'}`} />
                                      <span>OBSERVATION</span>
                                      {isProcessed && <span className="text-xs ml-auto">(done)</span>}
                                    </>
                                  )}
                                </button>
                                
                                {/* Divider */}
                                <div className="border-t border-white/10 my-2"></div>
                                
                                {/* View Details Option - Always enabled */}
                                <button
                                  onClick={() => {
                                    handleViewDetails(entry);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3 text-sm"
                                >
                                  <MdVisibility className="h-5 w-5 text-blue-400" />
                                  <span>View Details</span>
                                </button>
                                
                                {/* Download Option - Always enabled */}
                                <button
                                  onClick={() => {
                                    handleDownloadFile(entry);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3 text-sm"
                                >
                                  <MdDownload className="h-5 w-5 text-purple-400" />
                                  <span>Download File</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    <MdAttachMoney className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Gross Details - {selectedFile.officeName}</h3>
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
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">Specific Office:</label>
                        <p className="mt-1">
                          <span className={`${getOfficeBadgeClass(selectedFile.officeName)} px-3 py-1 rounded-full text-xs`}>
                            {selectedFile.officeName}
                          </span>
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">File Category:</label>
                        <p className="mt-1">
                          <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            {selectedFile.officeCategory}
                          </span>
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">File Size:</label>
                        <p className="mt-1 text-white">{formatFileSize(selectedFile.fileSize)}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">Status:</label>
                        <p className="mt-1">
                          <span className={`px-3 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedFile.status)}`}>
                            {selectedFile.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </p>
                      </div>
                      
                      {selectedFile.lastUpdatedAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-400">Last Updated:</label>
                          <p className="mt-1 text-white">{formatDate(selectedFile.lastUpdatedAt)}</p>
                        </div>
                      )}
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
                  </div>

                  {/* Right Column - Gross Details */}
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">Gross Amount Details</h4>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), #1a1a2a)',
                          border: '1px solid rgba(249, 115, 22, 0.2)'
                        }}
                      >
                        <label className="text-sm font-medium text-gray-400">Total Gross ({selectedFile.officeName} Office):</label>
                        <p className="text-3xl font-bold text-white mt-2">
                          {selectedFile.officeGrossFormatted}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          {selectedFile.officeCategory === 'SB/MTO/MENRO' && selectedFile.officeName === 'SB' && 'Extracted from cell C2'}
                          {selectedFile.officeCategory === 'SB/MTO/MENRO' && selectedFile.officeName === 'MTO' && 'Extracted from cell D2'}
                          {selectedFile.officeCategory === 'SB/MTO/MENRO' && selectedFile.officeName === 'MENRO' && 'Extracted from cell C3'}
                          {selectedFile.officeCategory !== 'SB/MTO/MENRO' && 'Sum of Amount Accrued for all employees under this office'}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.1), #1a1a2a)',
                          border: '1px solid rgba(236, 72, 153, 0.2)'
                        }}
                      >
                        <h5 className="font-medium text-pink-400 mb-2">Actions</h5>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              const entry = filteredFiles.find(e => e.fileId === selectedFile.id && e.office === selectedFile.officeName);
                              if (entry) {
                                handleRecalculateGross(entry);
                                handleCloseFileDetails();
                              }
                            }}
                            className="w-full px-4 py-2 rounded-lg text-left text-white flex items-center gap-2"
                            style={{
                              background: 'linear-gradient(135deg, #f97316, #ec4899)',
                              boxShadow: '0 10px 20px -5px #f97316'
                            }}
                          >
                            <MdCalculate className="h-4 w-4" />
                            Recalculate Gross
                          </button>
                          
                          <button
                            onClick={() => {
                              const entry = filteredFiles.find(e => e.fileId === selectedFile.id && e.office === selectedFile.officeName);
                              if (entry) {
                                handleDownloadFile(entry);
                                handleCloseFileDetails();
                              }
                            }}
                            className="w-full px-4 py-2 rounded-lg text-left text-white flex items-center gap-2"
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                              boxShadow: '0 10px 20px -5px #3b82f6'
                            }}
                          >
                            <MdDownload className="h-4 w-4" />
                            Download File
                          </button>

                          {!isFileProcessed(selectedFile.id) && (
                            <>
                              <button
                                onClick={() => {
                                  const entry = filteredFiles.find(e => e.fileId === selectedFile.id && e.office === selectedFile.officeName);
                                  if (entry) {
                                    handleCloseFileDetails();
                                    handleCheckFile(entry);
                                  }
                                }}
                                className="w-full px-4 py-2 rounded-lg text-left text-white flex items-center gap-2"
                                style={{
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  boxShadow: '0 10px 20px -5px #10b981'
                                }}
                              >
                                <MdCheckCircle className="h-4 w-4" />
                                CHECK FILE
                              </button>
                              
                              <button
                                onClick={() => {
                                  const entry = filteredFiles.find(e => e.fileId === selectedFile.id && e.office === selectedFile.officeName);
                                  if (entry) {
                                    handleCloseFileDetails();
                                    handleObsFile(entry);
                                  }
                                }}
                                className="w-full px-4 py-2 rounded-lg text-left text-white flex items-center gap-2"
                                style={{
                                  background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                                  boxShadow: '0 10px 20px -5px #eab308'
                                }}
                              >
                                <MdErrorOutline className="h-4 w-4" />
                                OBSERVATION
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.1), #1a1a2a)',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}
                      >
                        <h5 className="font-medium text-green-400 mb-2">Document Information:</h5>
                        <p className="text-sm text-gray-300">
                          <strong>Document ID:</strong> {selectedFile.id}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          <strong>Collection:</strong> sentFiles
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          <strong>Specific Office:</strong> {selectedFile.officeName}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          <strong>File Category:</strong> {selectedFile.officeCategory}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          <strong>Gross Source:</strong> {selectedFile.officeCategory === 'SB/MTO/MENRO' 
                            ? `Cell ${selectedFile.officeName === 'SB' ? 'C2' : selectedFile.officeName === 'MTO' ? 'D2' : 'C3'} value` 
                            : 'Sum of Amount Accrued column for employees in this office'}
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

export default Gross;
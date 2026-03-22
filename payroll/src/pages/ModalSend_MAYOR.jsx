import React, { useState, useCallback, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MdWarning,
  MdCheckCircle,
  MdDownload,
  MdClose,
  MdEdit,
  MdSave,
  MdVisibility,
  MdSchedule,
  MdAnalytics,
  MdWaves
} from 'react-icons/md';

const ModalSend_MAYOR = ({ file, onClose, markedAsReceived, onMarkAsReceived }) => {
  const [excelData, setExcelData] = useState(null);
  const [employeeData, setEmployeeData] = useState({});
  const [allEmployeeChanges, setAllEmployeeChanges] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [lastFocusedInput, setLastFocusedInput] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [paperSize, setPaperSize] = useState("A3");
  const [orientation, setOrientation] = useState("landscape");
  
  // New state for editing control
  const [editingEnabled, setEditingEnabled] = useState(markedAsReceived || false);
  
  const inputRefs = useRef({});
  const tableRef = useRef(null);

  // Paper size dimensions (in pixels for 96 DPI)
  const paperDimensions = {
    "A3": { portrait: { width: "1123px", height: "1587px" }, landscape: { width: "1587px", height: "1123px" } },
    "A4": { portrait: { width: "793px", height: "1122px" }, landscape: { width: "1122px", height: "793px" } },
    "Legal": { portrait: { width: "816px", height: "1344px" }, landscape: { width: "1344px", height: "816px" } },
    "Letter": { portrait: { width: "816px", height: "1056px" }, landscape: { width: "1056px", height: "816px" } },
    "Tabloid": { portrait: { width: "1056px", height: "1632px" }, landscape: { width: "1632px", height: "1056px" } }
  };

  // Font size scaling based on paper size and orientation
  const getFontSizes = () => {
    switch(paperSize) {
      case "A3":
        return {
          main: orientation === "landscape" ? 10 : 11,
          small: orientation === "landscape" ? 9 : 9.5,
          header: orientation === "landscape" ? 18 : 20,
          medium: orientation === "landscape" ? 11.5 : 12,
          number: orientation === "landscape" ? 12 : 13
        };
      case "Legal":
      case "Tabloid":
        return {
          main: orientation === "landscape" ? 10 : 11,
          small: orientation === "landscape" ? 8.5 : 9,
          header: orientation === "landscape" ? 17 : 19,
          medium: orientation === "landscape" ? 11 : 12,
          number: orientation === "landscape" ? 12 : 13
        };
      case "Letter":
        return {
          main: orientation === "landscape" ? 9 : 10,
          small: orientation === "landscape" ? 8 : 8.5,
          header: orientation === "landscape" ? 16 : 17,
          medium: orientation === "landscape" ? 10.5 : 11,
          number: orientation === "landscape" ? 11 : 12
        };
      default: // A4
        return {
          main: orientation === "landscape" ? 8.5 : 9,
          small: orientation === "landscape" ? 7.5 : 8,
          header: orientation === "landscape" ? 15 : 16,
          medium: orientation === "landscape" ? 9.5 : 10,
          number: orientation === "landscape" ? 11 : 12
        };
    }
  };

  const fontSizes = getFontSizes();
  const dimensions = paperDimensions[paperSize][orientation];

  // Function to format date from Excel serial to DD-MMM-YYYY
  const formatDate = (excelDate) => {
    if (!excelDate) return '';

    let dateValue = excelDate;
    
    if (typeof excelDate === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const daysOffset = excelDate > 60 ? excelDate - 2 : excelDate - 1;
      dateValue = new Date(excelEpoch.setDate(excelEpoch.getDate() + daysOffset));
    } else {
      dateValue = new Date(excelDate);
    }

    if (dateValue instanceof Date && !isNaN(dateValue)) {
      const day = dateValue.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[dateValue.getMonth()];
      const year = dateValue.getFullYear();
      return `${day}-${month}-${year}`;
    }
    
    return excelDate?.toString() || '';
  };

  // Load Excel data from base64
  useEffect(() => {
    if (!file?.fileData) return;

    const loadExcelFromBase64 = async () => {
      try {
        const binaryString = atob(file.fileData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(bytes);
        
        const worksheet = workbook.getWorksheet(1);
        
        const employees = extractEmployeeData(worksheet);
        
        setExcelData({
          workbook,
          worksheet,
          originalData: bytes
        });

        setEmployeeData(employees);
        setAllEmployeeChanges({});
        setCustomFileName(file.fileName.replace('.xlsx', '_edited'));
        
        console.log('Excel loaded from base64 data - MAYOR/ACCT/MBO/MASSO Format');
        
      } catch (error) {
        console.error('Error loading Excel from base64:', error);
        alert('Error loading the Excel file.');
      }
    };

    loadExcelFromBase64();
  }, [file]);

  // Update editingEnabled when markedAsReceived changes
  useEffect(() => {
    setEditingEnabled(markedAsReceived || false);
  }, [markedAsReceived]);

  // MAYOR/ACCT/MBO/MASSO specific employee rows based on PAYROLL4.xlsx
  const extractEmployeeData = (worksheet) => {
    const employees = {};
    
    // Employee rows based on PAYROLL4.xlsx structure for MAYOR/ACCT/MBO/MASSO
    const employeeRows = [
      // MAYOR's Office Section - Rows 15-18
      15, // JONNA C. ADAN - Mun. Mayor
      16, // OLIVER B. TE - Sen.Adm. Asst III/Private Sec. II
      17, // MARISSA M. PAVO - Utility I
      18, // JOSEPHINE A. REBAYLA - Utility I
      
      // ACCOUNTING OFFICE Section - Rows 22-24
      22, // ELLA MAE S. APOLE - Mun. Accountant
      23, // JOCELYN U. GLICO - Mun. Bookkeeper
      24, // ANECITA M. ESPINA - Acctg. Clerk
      
      // MUN. BUDGET OFFICE Section - Rows 28-29
      28, // KRYSTEL RUTH C. RANARIO - Mun. Budget Officer
      29, // NOVALDIN P. LAPLANA - Budgeting Aide
      
      // MASSO Section - Row 33
      33, // BIANCA MARIE D. CHUA - Mun. Assessor
    ];
    
    employeeRows.forEach(row => {
      try {
        const nameCell = worksheet.getCell(`C${row}`);
        if (nameCell && nameCell.value && nameCell.value.toString().trim() !== '') {
          const employeeName = nameCell.value.toString().trim();
          
          // Skip empty or header rows
          if (employeeName === '' || employeeName === 'NAME' || employeeName.includes('SALARY')) {
            return;
          }
          
          employees[employeeName] = {
            row: row,
            name: employeeName,
            section: row <= 18 ? 'MAYOR' : 
                     row <= 24 ? 'ACCOUNTING' : 
                     row <= 29 ? 'BUDGET' : 'MASSO',
            number: getCellValue(worksheet, `A${row}`),
            designation: getCellValue(worksheet, `D${row}`),
            periodFrom: formatDate(getCellRawValue(worksheet, `E${row}`)),
            periodTo: formatDate(getCellRawValue(worksheet, `F${row}`)),
            monthlyRate: getCellValue(worksheet, `G${row}`), // Column G for Monthly Rate
            amountAccrued: getCellValue(worksheet, `H${row}`), // Column H for Amount Accrued
            gsisEduLoan: getCellValue(worksheet, `I${row}`), // Column I for GSIS EDUC LOAN
            gsisMplLoan: getCellValue(worksheet, `J${row}`), // Column J for GSIS MPL LOAN
            philhealthPersonal: getCellValue(worksheet, `K${row}`), // Column K for PhilHealth Personal
            philhealthGovernment: getCellValue(worksheet, `L${row}`), // Column L for PhilHealth Government
            gsisPersonal: getCellValue(worksheet, `M${row}`), // Column M for GSIS Personal
            gsisGovernment: getCellValue(worksheet, `N${row}`), // Column N for GSIS Government
            pagibigPersonal: getCellValue(worksheet, `O${row}`), // Column O for Pag-IBIG Personal
            pagibigGovernment: getCellValue(worksheet, `P${row}`), // Column P for Pag-IBIG Government
            lbpLoan: getCellValue(worksheet, `Q${row}`), // Column Q for LBP LOAN
            gfalLoan: getCellValue(worksheet, `R${row}`), // Column R for GFAL LOAN
            gsisLiteLoan: getCellValue(worksheet, `S${row}`), // Column S for GSIS LITE
            pagibigMpl: getCellValue(worksheet, `T${row}`), // Column T for Pag-IBIG MPL
            ec: getCellValue(worksheet, `U${row}`), // Column U for E.C.
            paidInCash: getCellValue(worksheet, `W${row}`), // Column W for Paid in Cash
          };
        }
      } catch (error) {
        console.error(`Error extracting data for row ${row}:`, error);
      }
    });
    
    return employees;
  };

  const getCellValue = (worksheet, cellAddress) => {
    try {
      const cell = worksheet.getCell(cellAddress);
      if (cell && cell.value !== null && cell.value !== undefined) {
        if (cell.value.result) {
          return cell.value.result.toString();
        }
        if (typeof cell.value === 'object' && cell.value.text) {
          return cell.value.text;
        }
        if (typeof cell.value === 'number') {
          return cell.value.toString();
        }
        return cell.value.toString();
      }
      return '';
    } catch (error) {
      console.error(`Error getting cell value ${cellAddress}:`, error);
      return '';
    }
  };

  const getCellRawValue = (worksheet, cellAddress) => {
    try {
      const cell = worksheet.getCell(cellAddress);
      return cell?.value;
    } catch (error) {
      return null;
    }
  };

  // ========== CALCULATION LOGIC FROM MODALSEND.JSX ==========
  // Formula Functions (based on PAYROLL.xlsx)
  const calculateAmountAccrued = (monthlyRate) => {
    const rate = parseFloat(monthlyRate) || 0;
    return (rate / 2).toFixed(2);
  };

  const calculatePhilhealthShare = (monthlyRate) => {
    const rate = parseFloat(monthlyRate) || 0;
    return (rate * 0.025).toFixed(2);
  };

  const calculateGSISPersonal = (monthlyRate) => {
    const rate = parseFloat(monthlyRate) || 0;
    return (rate * 0.09).toFixed(2);
  };

  const calculateGSISGovernment = (monthlyRate) => {
    const rate = parseFloat(monthlyRate) || 0;
    return (rate * 0.12).toFixed(2);
  };

  const calculatePagibigPersonal = (monthlyRate) => {
    const rate = parseFloat(monthlyRate) || 0;
    return (rate * 0.02).toFixed(2);
  };

  const calculatePagibigGovernment = () => {
    return "200.00";
  };

  const calculatePaidInCash = (employee) => {
    // Formula: = H - I - J - K - M - O - Q - R - S - T - U
    // Includes ALL deductions and loans:
    // H = Amount Accrued
    // I = GSIS EDUC LOAN
    // J = GSIS MPL LOAN
    // K = PHILHEALTH Personal
    // M = GSIS Personal
    // O = Pag-ibig Personal
    // Q = LBP LOAN
    // R = GFAL LOAN
    // S = GSIS MPL Lite
    // T = Pag-ibig LOAN (MPL)
    // U = E.C.
    
    const h = parseFloat(employee.amountAccrued) || 0;
    const i = parseFloat(employee.gsisEduLoan) || 0;
    const j = parseFloat(employee.gsisMplLoan) || 0;
    const k = parseFloat(employee.philhealthPersonal) || 0;
    const m = parseFloat(employee.gsisPersonal) || 0;
    const o = parseFloat(employee.pagibigPersonal) || 0;
    const q = parseFloat(employee.lbpLoan) || 0;
    const r = parseFloat(employee.gfalLoan) || 0;
    const s = parseFloat(employee.gsisLiteLoan) || 0;
    const t = parseFloat(employee.pagibigMpl) || 0;
    const u = parseFloat(employee.ec) || 0;
    
    return (h - i - j - k - m - o - q - r - s - t - u).toFixed(2);
  };
  // ========== END OF CALCULATION LOGIC ==========

  // Handle checkbox change for senior citizen status
  const handleCheckboxChange = useCallback((employeeName, isSenior) => {
    if (!editingEnabled) {
      alert('⚠️ Please mark this file as received first before making changes.');
      return;
    }

    try {
      setAllEmployeeChanges(prev => {
        const employeeChanges = prev[employeeName] || {};
        return {
          ...prev,
          [employeeName]: {
            ...employeeChanges,
            citizenType: isSenior ? 'senior' : 'non-senior'
          }
        };
      });
    } catch (error) {
      console.error('Error in handleCheckboxChange:', error);
    }
  }, [editingEnabled]);

  // Memoized input change handler with auto-calculation
  const handleInputChange = useCallback((employeeName, field, value) => {
    if (!editingEnabled) {
      alert('⚠️ Please mark this file as received first before editing.');
      return;
    }

    try {
      setAllEmployeeChanges(prev => {
        const employeeChanges = prev[employeeName] || {};
        const currentData = employeeData[employeeName] || {};
        
        // Get the updated monthly rate (either from changes or original)
        let monthlyRate;
        if (field === 'monthlyRate') {
          monthlyRate = value;
        } else {
          monthlyRate = employeeChanges.monthlyRate !== undefined ? 
            employeeChanges.monthlyRate : currentData.monthlyRate;
        }
        
        // Create base changes
        const newChanges = {
          ...employeeChanges,
          [field]: value
        };
        
        // Auto-calculate dependent fields if monthlyRate changed
        if (field === 'monthlyRate') {
          const rate = parseFloat(value) || 0;
          
          // Auto-calculate all formula-based fields
          newChanges.amountAccrued = calculateAmountAccrued(rate);
          newChanges.philhealthPersonal = calculatePhilhealthShare(rate);
          newChanges.philhealthGovernment = calculatePhilhealthShare(rate);
          newChanges.gsisPersonal = calculateGSISPersonal(rate);
          newChanges.gsisGovernment = calculateGSISGovernment(rate);
          newChanges.pagibigPersonal = calculatePagibigPersonal(rate);
          newChanges.pagibigGovernment = calculatePagibigGovernment();
        }
        
        // Create updated employee object with ALL fields for Paid in Cash calculation
        const updatedEmployee = {
          ...currentData,
          ...newChanges,
          // Ensure all loan fields are included
          gsisEduLoan: newChanges.gsisEduLoan !== undefined ? newChanges.gsisEduLoan : currentData.gsisEduLoan,
          gsisMplLoan: newChanges.gsisMplLoan !== undefined ? newChanges.gsisMplLoan : currentData.gsisMplLoan,
          lbpLoan: newChanges.lbpLoan !== undefined ? newChanges.lbpLoan : currentData.lbpLoan,
          gfalLoan: newChanges.gfalLoan !== undefined ? newChanges.gfalLoan : currentData.gfalLoan,
          gsisLiteLoan: newChanges.gsisLiteLoan !== undefined ? newChanges.gsisLiteLoan : currentData.gsisLiteLoan,
          pagibigMpl: newChanges.pagibigMpl !== undefined ? newChanges.pagibigMpl : currentData.pagibigMpl,
          ec: newChanges.ec !== undefined ? newChanges.ec : currentData.ec,
          amountAccrued: newChanges.amountAccrued !== undefined ? newChanges.amountAccrued : currentData.amountAccrued,
          philhealthPersonal: newChanges.philhealthPersonal !== undefined ? newChanges.philhealthPersonal : currentData.philhealthPersonal,
          gsisPersonal: newChanges.gsisPersonal !== undefined ? newChanges.gsisPersonal : currentData.gsisPersonal,
          pagibigPersonal: newChanges.pagibigPersonal !== undefined ? newChanges.pagibigPersonal : currentData.pagibigPersonal,
        };
        
        // Recalculate Paid in Cash after any changes to deductions or loans
        newChanges.paidInCash = calculatePaidInCash(updatedEmployee);
        
        return {
          ...prev,
          [employeeName]: newChanges
        };
      });
    } catch (error) {
      console.error('Error in handleInputChange:', error);
    }
  }, [editingEnabled, employeeData]);

  const getEmployeeValue = useCallback((employeeName, field) => {
    try {
      if (allEmployeeChanges[employeeName] && allEmployeeChanges[employeeName][field] !== undefined) {
        return allEmployeeChanges[employeeName][field];
      }
      return employeeData[employeeName]?.[field] || '';
    } catch (error) {
      console.error(`Error getting value for ${employeeName}.${field}:`, error);
      return '';
    }
  }, [allEmployeeChanges, employeeData]);

  // Get citizen type (senior or non-senior)
  const getCitizenType = useCallback((employeeName) => {
    if (allEmployeeChanges[employeeName] && allEmployeeChanges[employeeName].citizenType) {
      return allEmployeeChanges[employeeName].citizenType;
    }
    return 'non-senior';
  }, [allEmployeeChanges]);

  const calculateAmountAccruedOld = useCallback((monthlyRate) => {
    try {
      if (monthlyRate) {
        return (parseFloat(monthlyRate) / 2).toFixed(2);
      }
      return '';
    } catch (error) {
      console.error('Error calculating amount accrued:', error);
      return '0.00';
    }
  }, []);

  const calculatePhilhealth = useCallback((monthlyRate) => {
    try {
      if (monthlyRate) {
        const rate = parseFloat(monthlyRate);
        const share = (rate * 0.025).toFixed(2);
        return {
          personal: share,
          government: share
        };
      }
      return { personal: '0.00', government: '0.00' };
    } catch (error) {
      console.error('Error calculating Philhealth:', error);
      return { personal: '0.00', government: '0.00' };
    }
  }, []);

  const calculateGSISPremiums = useCallback((monthlyRate, citizenType) => {
    try {
      if (monthlyRate && citizenType === 'non-senior') {
        const rate = parseFloat(monthlyRate);
        return {
          personal: (rate * 0.09).toFixed(2),
          government: (rate * 0.12).toFixed(2)
        };
      }
      return { personal: '0.00', government: '0.00' };
    } catch (error) {
      console.error('Error calculating GSIS premiums:', error);
      return { personal: '0.00', government: '0.00' };
    }
  }, []);

  const calculatePagibig = useCallback((monthlyRate, citizenType) => {
    try {
      if (monthlyRate && citizenType === 'non-senior') {
        const rate = parseFloat(monthlyRate);
        return {
          personal: (rate * 0.02).toFixed(2),
          government: '200.00'
        };
      }
      return { personal: '0.00', government: '0.00' };
    } catch (error) {
      console.error('Error calculating Pag-IBIG:', error);
      return { personal: '0.00', government: '0.00' };
    }
  }, []);

  // Focus management effect
  useEffect(() => {
    if (lastFocusedInput) {
      const { employeeName, field } = lastFocusedInput;
      const inputKey = `${employeeName}-${field}`;
      const inputElement = inputRefs.current[inputKey];
      if (inputElement) {
        setTimeout(() => {
          try {
            inputElement.focus();
          } catch (error) {
            console.error('Error focusing input:', error);
          }
        }, 10);
      }
    }
  }, [allEmployeeChanges, lastFocusedInput]);

  // Memoized EditableCell component - UPDATED COLORS
  const EditableCell = useCallback(({ 
    value, 
    onChange, 
    type = 'text', 
    className = '', 
    placeholder = '',
    employeeName,
    field,
    disabled = false
  }) => {
    const inputKey = `${employeeName}-${field}`;
    
    const handleFocus = (e) => {
      if (disabled) {
        e.target.blur();
        return;
      }
      setLastFocusedInput({ employeeName, field });
    };

    const handleChange = (e) => {
      if (disabled) return;
      
      if (type === 'number') {
        const inputValue = e.target.value;
        if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
          onChange(e);
          setLastFocusedInput({ employeeName, field });
        }
      } else {
        onChange(e);
        setLastFocusedInput({ employeeName, field });
      }
    };

    const handleKeyDown = (e) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      
      if (type === 'number') {
        const allowedKeys = [
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
          '.', 'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight',
          'Home', 'End'
        ];
        
        if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      }
    };

    const handleClick = (e) => {
      if (disabled) {
        e.preventDefault();
        alert('⚠️ Please mark this file as received first before editing.');
      }
    };

    return (
      <input
        ref={el => inputRefs.current[inputKey] = el}
        type={type === 'number' ? 'text' : type}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={value || ''}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={disabled}
        className={`w-full px-1 py-0.5 border ${disabled ? 'bg-gray-100 border-gray-200 text-gray-500' : 'border-orange-300 bg-white'} rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-300 text-right ${className}`}
        style={{ minWidth: '60px', height: '22px' }}
      />
    );
  }, []);

  // Memoized Checkbox component - UPDATED COLORS
  const SeniorCheckbox = useCallback(({ employeeName, disabled = false }) => {
    const citizenType = getCitizenType(employeeName);
    const isSenior = citizenType === 'senior';

    const handleChange = (e) => {
      if (disabled) {
        e.preventDefault();
        alert('⚠️ Please mark this file as received first before making changes.');
        return;
      }
      handleCheckboxChange(employeeName, e.target.checked);
    };

    const handleClick = (e) => {
      if (disabled) {
        e.preventDefault();
        alert('⚠️ Please mark this file as received first before making changes.');
      }
    };

    return (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSenior}
          onChange={handleChange}
          onClick={handleClick}
          disabled={disabled}
          className={`w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-1 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        />
      </div>
    );
  }, [getCitizenType, handleCheckboxChange]);

  // DisplayCell component for non-editable cells
  const DisplayCell = useCallback(({ value, className = '' }) => (
    <div className={`w-full px-1 py-0.5 text-right text-xs bg-gray-50 ${className}`}>
      {formatNumber(value)}
    </div>
  ), []);

  // FormulaCell component for auto-calculated cells
  const FormulaCell = useCallback(({ value, className = '', bgColor = 'bg-gray-50' }) => (
    <div className={`w-full px-1 py-0.5 text-right text-xs ${bgColor} ${className}`}>
      {formatNumber(value)}
    </div>
  ), []);

  // Format number with commas (for regular rows - show empty if zero)
  const formatNumber = (value) => {
    if (value === undefined || value === null || value === '' || value === 0 || value === '0') {
      return '';
    }
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Format total number with commas (show dash if zero)
  const formatTotal = (value) => {
    if (value === undefined || value === null || value === '' || value === 0 || value === '0') {
      return '-';
    }
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return '-';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Handle Mark as Received button click
  const handleMarkAsReceived = () => {
    if (onMarkAsReceived) {
      onMarkAsReceived();
      setEditingEnabled(true);
      alert('✅ File marked as received! You can now edit the file.');
    }
  };

  const updateExcelWithInputs = async () => {
    if (!excelData) return null;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelData.originalData);
      
      const worksheet = workbook.getWorksheet(1);

      Object.keys(allEmployeeChanges).forEach(employeeName => {
        try {
          const changes = allEmployeeChanges[employeeName];
          const employeeRow = employeeData[employeeName]?.row;
          if (!employeeRow) return;

          const employeeCitizenType = changes.citizenType || 'non-senior';

          // Period From - Column E
          if (changes.periodFrom !== undefined) {
            const cell = worksheet.getCell(`E${employeeRow}`);
            cell.value = changes.periodFrom;
          }
          
          // Period To - Column F
          if (changes.periodTo !== undefined) {
            const cell = worksheet.getCell(`F${employeeRow}`);
            cell.value = changes.periodTo;
          }

          // Monthly Rate - Column G
          if (changes.monthlyRate !== undefined) {
            const cellG = worksheet.getCell(`G${employeeRow}`);
            cellG.value = parseFloat(changes.monthlyRate) || 0;
            
            // Amount Accrued - Column H (auto-calculated)
            const cellH = worksheet.getCell(`H${employeeRow}`);
            const accruedAmount = (parseFloat(changes.monthlyRate) / 2).toFixed(2);
            cellH.value = parseFloat(accruedAmount) || 0;
          }

          // GSIS EDUC Loan - Column I
          if (changes.gsisEduLoan !== undefined) {
            const cell = worksheet.getCell(`I${employeeRow}`);
            cell.value = parseFloat(changes.gsisEduLoan) || 0;
          }
          
          // GSIS MPL Loan - Column J
          if (changes.gsisMplLoan !== undefined) {
            const cell = worksheet.getCell(`J${employeeRow}`);
            cell.value = parseFloat(changes.gsisMplLoan) || 0;
          }

          // Get monthly rate for calculations
          const monthlyRate = changes.monthlyRate !== undefined ? changes.monthlyRate : employeeData[employeeName].monthlyRate;
          const rate = monthlyRate ? parseFloat(monthlyRate) : 0;
          
          // PhilHealth - Columns K & L (auto-calculated)
          const philhealthShare = (rate * 0.025).toFixed(2);
          
          const cellK = worksheet.getCell(`K${employeeRow}`);
          const cellL = worksheet.getCell(`L${employeeRow}`);
          cellK.value = parseFloat(philhealthShare) || 0;
          cellL.value = parseFloat(philhealthShare) || 0;

          // GSIS Premiums - Columns M & N
          const cellM = worksheet.getCell(`M${employeeRow}`);
          const cellN = worksheet.getCell(`N${employeeRow}`);
          
          if (employeeCitizenType === 'non-senior') {
            cellM.value = parseFloat((rate * 0.09).toFixed(2)) || 0;
            cellN.value = parseFloat((rate * 0.12).toFixed(2)) || 0;
          } else {
            cellM.value = 0;
            cellN.value = 0;
          }

          // Pag-IBIG - Columns O & P
          const cellO = worksheet.getCell(`O${employeeRow}`);
          const cellP = worksheet.getCell(`P${employeeRow}`);
          
          if (employeeCitizenType === 'non-senior') {
            cellO.value = parseFloat((rate * 0.02).toFixed(2)) || 0;
            cellP.value = 200.00;
          } else {
            cellO.value = 0;
            cellP.value = 0;
          }

          // LBP Loan - Column Q
          if (changes.lbpLoan !== undefined) {
            const cell = worksheet.getCell(`Q${employeeRow}`);
            cell.value = parseFloat(changes.lbpLoan) || 0;
          }
          
          // GFAL Loan - Column R
          if (changes.gfalLoan !== undefined) {
            const cell = worksheet.getCell(`R${employeeRow}`);
            cell.value = parseFloat(changes.gfalLoan) || 0;
          }
          
          // GSIS Lite Loan - Column S
          if (changes.gsisLiteLoan !== undefined) {
            const cell = worksheet.getCell(`S${employeeRow}`);
            cell.value = parseFloat(changes.gsisLiteLoan) || 0;
          }
          
          // Pag-IBIG MPL - Column T
          if (changes.pagibigMpl !== undefined) {
            const cell = worksheet.getCell(`T${employeeRow}`);
            cell.value = parseFloat(changes.pagibigMpl) || 0;
          }
          
          // E.C. - Column U
          if (changes.ec !== undefined) {
            const cell = worksheet.getCell(`U${employeeRow}`);
            cell.value = parseFloat(changes.ec) || 0;
          }
        } catch (error) {
          console.error(`Error updating Excel for ${employeeName}:`, error);
        }
      });

      return workbook;
    } catch (error) {
      console.error('Error updating Excel:', error);
      alert('Error updating Excel file.');
      return null;
    }
  };

  // Handle Check button click
  // Handle Check button click
const handleCheckFile = async () => {
  if (!editingEnabled) {
    alert('⚠️ Please mark this file as received first before checking.');
    return;
  }

  if (!excelData) {
    alert('Please upload an Excel file first.');
    return;
  }

  setIsSending(true);

  try {
    let updatedWorkbook = null;
    
    if (Object.keys(allEmployeeChanges).length > 0) {
      updatedWorkbook = await updateExcelWithInputs();
      if (!updatedWorkbook) {
        alert('Error updating Excel file.');
        setIsSending(false);
        return;
      }
    }

    const updateData = {
      timestamp: serverTimestamp(),
      status: 'checked', // Always "checked" regardless of updates
      lastCheckedAt: new Date().toISOString(),
    };

    if (Object.keys(allEmployeeChanges).length > 0) {
      const buffer = await updatedWorkbook.xlsx.writeBuffer();
      const base64String = arrayBufferToBase64(buffer);
      
      const updatedEmployees = Object.keys(allEmployeeChanges);
      const seniorEmployees = updatedEmployees.filter(name => 
        allEmployeeChanges[name]?.citizenType === 'senior'
      );

      Object.assign(updateData, {
        fileData: base64String,
        updatedEmployees: updatedEmployees,
        seniorEmployees: seniorEmployees,
        // REMOVED: status: 'updated', so status remains "checked"
        originalFileName: file.originalFileName || file.fileName
      });
    }

    await updateDoc(doc(db, 'sentFiles', file.id), updateData);

    let successMessage = `✅ File "${file.fileName}" checked successfully!\n\n`;
    
    if (Object.keys(allEmployeeChanges).length > 0) {
      const updatedEmployees = Object.keys(allEmployeeChanges).join(', ');
      successMessage += `Updated employees: ${updatedEmployees}\n`;
      
      const seniorEmployees = Object.keys(allEmployeeChanges).filter(name => 
        allEmployeeChanges[name]?.citizenType === 'senior'
      );
      
      if (seniorEmployees.length > 0) {
        successMessage += `\nSenior Citizens (No GSIS/Pag-IBIG): ${seniorEmployees.join(', ')}`;
      }
    } else {
      successMessage += `No changes detected. File remains as is.`;
    }

    alert(successMessage);
    
    // 🔥 I-RESET ANG MGA CHANGES UG I-CLOSE ANG MODAL
    setAllEmployeeChanges({});
    
    // ✅ GAMITAG setTimeout PARA SIGURADONG MAKITA ANG ALERT BEFORE CLOSE
    setTimeout(() => {
      onClose();
    }, 100);
    
  } catch (error) {
    console.error('Error checking/updating file in Firestore:', error);
    alert(`❌ Error ${Object.keys(allEmployeeChanges).length > 0 ? 'updating' : 'checking'} file in Firestore. Please try again.`);
    setIsSending(false);
  } finally {
    setIsSending(false);
  }
};

  // Show filename modal for Save Excel
  const showFileNameInput = () => {
    if (!editingEnabled) {
      alert('⚠️ Please mark this file as received first before saving changes.');
      return;
    }

    if (Object.keys(allEmployeeChanges).length === 0) {
      alert('No changes to save. Please make changes first.');
      return;
    }

    if (!excelData) {
      alert('Please upload an Excel file first.');
      return;
    }

    setShowFileNameModal(true);
  };

  // Handle save excel with custom filename
  const handleSaveExcel = async () => {
    if (!customFileName.trim()) {
      alert('Please enter a filename.');
      return;
    }

    const updatedWorkbook = await updateExcelWithInputs();
    if (!updatedWorkbook) {
      alert('Error updating Excel file.');
      return;
    }

    try {
      const buffer = await updatedWorkbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const finalFileName = customFileName.endsWith('.xlsx') ? customFileName : `${customFileName}.xlsx`;
      saveAs(blob, finalFileName);
      
      const updatedEmployees = Object.keys(allEmployeeChanges).join(', ');
      alert(`✅ Excel file "${finalFileName}" downloaded successfully!\n\nUpdated employees: ${updatedEmployees}`);
      
      setShowFileNameModal(false);
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving Excel file.');
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

  // Filename Modal Component - UPDATED COLORS
  const FilenameModal = () => {
    if (!showFileNameModal) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-[#1a1a2a] to-[#0a0a0f] rounded-2xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden border border-white/5"
          style={{
            boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a',
          }}
        >
          {/* Abstract sphere overlay */}
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ec4899)',
                  boxShadow: '0 10px 20px -5px #f97316'
                }}
              >
                <MdSave className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Save Excel File</h2>
                <p className="text-gray-400 text-sm">Enter a filename for the Excel file that will be downloaded to your computer.</p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 font-semibold mb-2">
                Enter File Name:
              </label>
              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 transition-all duration-300"
                style={{
                  background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
                  boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
                placeholder="Enter filename"
                autoFocus
              />
              <div className="text-sm text-gray-500 mt-2">
                File will be saved as: <span className="font-mono font-bold text-orange-400">{customFileName}.xlsx</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowFileNameModal(false)}
                className="px-4 py-2 rounded-xl text-gray-300 font-medium transition-all duration-200"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExcel}
                className="px-4 py-2 rounded-xl text-white font-medium flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ec4899)',
                  boxShadow: '0 10px 20px -5px #f97316',
                }}
              >
                <MdDownload className="w-4 h-4" />
                Download Excel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  if (!file || !excelData) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-[#1a1a2a] to-[#0a0a0f] rounded-2xl shadow-2xl max-w-4xl w-full p-6 relative overflow-hidden border border-white/5">
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Loading Excel Data (MAYOR/ACCT/MBO/MASSO Format)...</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <MdClose size={24} />
            </button>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading file data...</p>
          </div>
        </div>
      </div>
    );
  }

  const employeesList = Object.values(employeeData);
  
  // Group employees by section
  const mayorEmployees = employeesList.filter(emp => emp.section === 'MAYOR');
  const accountingEmployees = employeesList.filter(emp => emp.section === 'ACCOUNTING');
  const budgetEmployees = employeesList.filter(emp => emp.section === 'BUDGET');
  const massoEmployees = employeesList.filter(emp => emp.section === 'MASSO');

  // Calculate totals for each section
  const calculateSectionTotals = (sectionEmployees) => {
    return sectionEmployees.reduce((totals, emp) => {
      // Get current values (either changed or original)
      const getValue = (field) => {
        const changed = allEmployeeChanges[emp.name]?.[field];
        return changed !== undefined ? parseFloat(changed) || 0 : parseFloat(emp[field]) || 0;
      };

      return {
        monthlyRate: totals.monthlyRate + getValue('monthlyRate'),
        amountAccrued: totals.amountAccrued + getValue('amountAccrued'),
        gsisEduLoan: totals.gsisEduLoan + getValue('gsisEduLoan'),
        gsisMplLoan: totals.gsisMplLoan + getValue('gsisMplLoan'),
        philhealthPersonal: totals.philhealthPersonal + getValue('philhealthPersonal'),
        philhealthGovernment: totals.philhealthGovernment + getValue('philhealthGovernment'),
        gsisPersonal: totals.gsisPersonal + getValue('gsisPersonal'),
        gsisGovernment: totals.gsisGovernment + getValue('gsisGovernment'),
        pagibigPersonal: totals.pagibigPersonal + getValue('pagibigPersonal'),
        pagibigGovernment: totals.pagibigGovernment + getValue('pagibigGovernment'),
        lbpLoan: totals.lbpLoan + getValue('lbpLoan'),
        gfalLoan: totals.gfalLoan + getValue('gfalLoan'),
        gsisLiteLoan: totals.gsisLiteLoan + getValue('gsisLiteLoan'),
        pagibigMpl: totals.pagibigMpl + getValue('pagibigMpl'),
        ec: totals.ec + getValue('ec'),
        paidInCash: totals.paidInCash + getValue('paidInCash')
      };
    }, {
      monthlyRate: 0,
      amountAccrued: 0,
      gsisEduLoan: 0,
      gsisMplLoan: 0,
      philhealthPersonal: 0,
      philhealthGovernment: 0,
      gsisPersonal: 0,
      gsisGovernment: 0,
      pagibigPersonal: 0,
      pagibigGovernment: 0,
      lbpLoan: 0,
      gfalLoan: 0,
      gsisLiteLoan: 0,
      pagibigMpl: 0,
      ec: 0,
      paidInCash: 0
    });
  };

  const mayorTotals = calculateSectionTotals(mayorEmployees);
  const accountingTotals = calculateSectionTotals(accountingEmployees);
  const budgetTotals = calculateSectionTotals(budgetEmployees);
  const massoTotals = calculateSectionTotals(massoEmployees);

  // Calculate grand totals
  const grandTotals = {
    monthlyRate: mayorTotals.monthlyRate + accountingTotals.monthlyRate + budgetTotals.monthlyRate + massoTotals.monthlyRate,
    amountAccrued: mayorTotals.amountAccrued + accountingTotals.amountAccrued + budgetTotals.amountAccrued + massoTotals.amountAccrued,
    gsisEduLoan: mayorTotals.gsisEduLoan + accountingTotals.gsisEduLoan + budgetTotals.gsisEduLoan + massoTotals.gsisEduLoan,
    gsisMplLoan: mayorTotals.gsisMplLoan + accountingTotals.gsisMplLoan + budgetTotals.gsisMplLoan + massoTotals.gsisMplLoan,
    philhealthPersonal: mayorTotals.philhealthPersonal + accountingTotals.philhealthPersonal + budgetTotals.philhealthPersonal + massoTotals.philhealthPersonal,
    philhealthGovernment: mayorTotals.philhealthGovernment + accountingTotals.philhealthGovernment + budgetTotals.philhealthGovernment + massoTotals.philhealthGovernment,
    gsisPersonal: mayorTotals.gsisPersonal + accountingTotals.gsisPersonal + budgetTotals.gsisPersonal + massoTotals.gsisPersonal,
    gsisGovernment: mayorTotals.gsisGovernment + accountingTotals.gsisGovernment + budgetTotals.gsisGovernment + massoTotals.gsisGovernment,
    pagibigPersonal: mayorTotals.pagibigPersonal + accountingTotals.pagibigPersonal + budgetTotals.pagibigPersonal + massoTotals.pagibigPersonal,
    pagibigGovernment: mayorTotals.pagibigGovernment + accountingTotals.pagibigGovernment + budgetTotals.pagibigGovernment + massoTotals.pagibigGovernment,
    lbpLoan: mayorTotals.lbpLoan + accountingTotals.lbpLoan + budgetTotals.lbpLoan + massoTotals.lbpLoan,
    gfalLoan: mayorTotals.gfalLoan + accountingTotals.gfalLoan + budgetTotals.gfalLoan + massoTotals.gfalLoan,
    gsisLiteLoan: mayorTotals.gsisLiteLoan + accountingTotals.gsisLiteLoan + budgetTotals.gsisLiteLoan + massoTotals.gsisLiteLoan,
    pagibigMpl: mayorTotals.pagibigMpl + accountingTotals.pagibigMpl + budgetTotals.pagibigMpl + massoTotals.pagibigMpl,
    ec: mayorTotals.ec + accountingTotals.ec + budgetTotals.ec + massoTotals.ec,
    paidInCash: mayorTotals.paidInCash + accountingTotals.paidInCash + budgetTotals.paidInCash + massoTotals.paidInCash
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
      <FilenameModal />
      
      <div className="bg-gradient-to-br from-[#1a1a2a] to-[#0a0a0f] rounded-2xl shadow-2xl max-w-[98vw] w-full max-h-[95vh] overflow-hidden relative border border-white/5"
        style={{
          boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a',
        }}
      >
        {/* Abstract sphere overlays */}
        <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />
        
        {/* Modal Header - UPDATED COLORS */}
        <div className="relative z-10 px-6 py-3 flex justify-between items-center border-b border-white/5"
          style={{
            background: 'linear-gradient(145deg, #1a1a2a, #0f0f1a)',
          }}
        >
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500"></span>
              MAYOR/ACCT/MBO/MASSO - {file.fileName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-400">Edit payroll data - NUMBER column is non-editable</p>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                editingEnabled 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                  : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
              }`}>
                {editingEnabled ? '✓ Editable' : 'Read-only'}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-white/5"
            style={{
              background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
            }}
          >
            <MdClose className="text-gray-400 hover:text-white" size={20} />
          </button>
        </div>

        {/* Paper Size and Orientation Controls - UPDATED COLORS */}
        <div className="relative z-10 px-6 py-2 border-b border-white/5 flex gap-4 items-center bg-[#0f0f1a]">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-400">Paper Size:</label>
            <select 
              value={paperSize} 
              onChange={(e) => setPaperSize(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-[#1a1a2a] text-white border-white/10"
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: 'inset 2px 2px 5px #050505, inset -2px -2px 5px #1f1f2a',
              }}
            >
              <option value="A3">A3 (297 × 420 mm)</option>
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
              <option value="Legal">Legal (8.5 × 14 in)</option>
              <option value="Tabloid">Tabloid (11 × 17 in)</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-400">Orientation:</label>
            <div className="flex">
              <button
                onClick={() => setOrientation("portrait")}
                className={`px-3 py-1 text-sm border ${orientation === "portrait" ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' : 'bg-[#1a1a2a] text-gray-400'} border-white/5`}
                style={{
                  boxShadow: orientation === "portrait" ? '0 5px 15px -5px #f97316' : 'inset 2px 2px 5px #050505, inset -2px -2px 5px #1f1f2a',
                }}
              >
                Portrait
              </button>
              <button
                onClick={() => setOrientation("landscape")}
                className={`px-3 py-1 text-sm border ${orientation === "landscape" ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' : 'bg-[#1a1a2a] text-gray-400'} border-white/5`}
                style={{
                  boxShadow: orientation === "landscape" ? '0 5px 15px -5px #f97316' : 'inset 2px 2px 5px #050505, inset -2px -2px 5px #1f1f2a',
                }}
              >
                Landscape
              </button>
            </div>
          </div>
          
          <div className="flex-1"></div>
          
          <span className="text-sm text-gray-400">
            Employees: <span className="font-bold text-orange-400">{employeesList.length}</span>
          </span>
        </div>

        {/* Mark as Received Banner - SHOWN ONLY WHEN NOT MARKED - UPDATED COLORS */}
        {!editingEnabled && (
          <div className="relative z-10 border-b border-orange-500/20 px-6 py-3"
            style={{
              background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), #1a1a2a)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ec4899)',
                    boxShadow: '0 5px 15px -3px #f97316'
                  }}
                >
                  <MdWarning className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-orange-400 text-sm">File Not Ready for Editing</h3>
                  <p className="text-xs text-orange-400/70">You need to mark this file as received before you can edit it.</p>
                </div>
              </div>
              <button
                onClick={handleMarkAsReceived}
                className="px-4 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 text-white transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ec4899)',
                  boxShadow: '0 10px 20px -5px #f97316',
                }}
              >
                <MdCheckCircle className="h-4 w-4" />
                Mark as Received
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons - UPDATED COLORS */}
        <div className="relative z-10 px-6 py-2 border-b border-white/5 flex justify-between items-center bg-[#0f0f1a]">
          <div>
            <span className="text-sm text-gray-400">
              Employees: <span className="font-bold text-orange-400">{employeesList.length}</span></span>
            <div></div>
            <span className="text-sm text-gray-400">
              Changes: <span className="font-bold text-orange-400">{Object.keys(allEmployeeChanges).length}</span> employee(s)
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={showFileNameInput}
              disabled={!editingEnabled}
              className={`px-4 py-1.5 rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2 ${
                editingEnabled
                  ? 'text-white'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                background: editingEnabled
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: editingEnabled
                  ? '0 10px 20px -5px #10b981'
                  : '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
              }}
            >
              <MdSave className="w-4 h-4" />
              Save Excel
            </button>
            <button 
              onClick={handleCheckFile}
              disabled={!editingEnabled || isSending}
              className={`px-4 py-1.5 rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2 ${
                editingEnabled
                  ? 'text-white'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                background: editingEnabled
                  ? isSending
                    ? 'linear-gradient(145deg, #6b7280, #4b5563)'
                    : 'linear-gradient(135deg, #f97316, #ec4899)'
                  : 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: editingEnabled && !isSending
                  ? '0 10px 20px -5px #f97316'
                  : '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
              }}
            >
              {isSending ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-1"></span>
                  Checking...
                </>
              ) : (
                <>
                  <MdCheckCircle className="w-4 h-4" />
                  Check File
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Payslip Container */}
        <div 
          className="bg-[#0a0a0f] mx-auto overflow-auto p-4"
          style={{
            maxHeight: 'calc(95vh - 160px)',
          }}
        >
          <div
            ref={tableRef}
            className="bg-white mx-auto"
            style={{
              width: dimensions.width,
              minHeight: dimensions.height,
              maxWidth: dimensions.width,
              fontSize: `${fontSizes.main}px`,
              fontFamily: "Arial, sans-serif"
            }}
          >
            {/* HEADER - Top Section */}
            <div className="text-right mb-1 mt-3 mr-48">
              <div 
                className="font-bold mb-0"
                style={{ 
                  fontSize: `${fontSizes.header}px`,
                  marginRight: paperSize === "A3" && orientation === "landscape" ? "450px" : 
                              paperSize === "A3" ? "350px" : 
                              orientation === "landscape" ? "400px" : "384px"
                }}
              >
                PAYROLL
              </div>
            </div>
            
            <div className="text-center mb-1">
              <div className={`flex ${orientation === "landscape" ? "justify-between" : "justify-between"} items-start`}>
                <div 
                  className="font-bold mb-0 text-center"
                  style={{ 
                    fontSize: `${fontSizes.main}px`,
                    marginLeft: paperSize === "A3" && orientation === "landscape" ? "500px" : 
                               paperSize === "A3" ? "300px" : 
                               orientation === "landscape" ? "200px" : "384px",
                    paddingLeft: paperSize === "A3" && orientation === "landscape" ? "80px" : 
                                paperSize === "A3" ? "100px" : 
                                orientation === "landscape" ? "64px" : "128px"
                  }}
                >
                  MUNICIPALITY OF LILOAN<br/>
                  (Provincial, City or Municipal)
                </div>
                
                <div 
                  className="mb-2 text-right mr-56"
                  style={{ fontSize: `${fontSizes.small}px` }}
                >
                  Provincial Form No. 38(A)<br/>
                  (Revised March, 1973)<br/>
                  Sheet No.________________
                </div>
              </div>
              
              <div 
                className="leading-tight mb-5"
                style={{ 
                  fontSize: `${fontSizes.small}px`,
                  marginLeft: paperSize === "A3" && orientation === "landscape" ? "50px" : 
                             paperSize === "A3" ? "60px" : 
                             orientation === "landscape" ? "40px" : "80px",
                  marginRight: paperSize === "A3" && orientation === "landscape" ? "50px" : "40px"
                }}
              >
                We hereby acknowledge to have received from, <b>DANNIE LYN I. VILLAFLOR</b> Mun. Treasurer of, 
                <b>LILOAN, SOUTHERN LEYTE</b> the sums herein specified opposite our respective names, 
                the same, being full 
                <div>compensation for our services rendered during the period stated below, 
                to the correctness of which we hereby severally certify</div>
              </div>
            </div>

            {/* MAIN TABLE - Updated to match payslip.jsx header structure and include Signature of Payee */}
            <table 
              className="w-full border-collapse border border-black" 
              style={{ fontSize: `${fontSizes.small}px`, tableLayout: 'auto' }}
            >
              <thead>
                <tr>
                  <th rowSpan={3} className="border border-black p-0 align-middle text-center" style={{ width: '30px', padding: '4px 1px' }}>
                    <div className="flex flex-col items-center justify-center" style={{ fontSize: `${fontSizes.number}px` }}>
                      <span>N</span>
                      <span>U</span>
                      <span>M</span>
                      <span>B</span>
                      <span>E</span>
                      <span>R</span>
                    </div>
                  </th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1">NAME</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1">DESIGNATION</th>
                  <th colSpan={2} className="border border-black p-0 px-1 text-center">PERIOD OF SERVICE<br/>(Inclusive Dates)</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">Monthly<br/>Rate of Pay</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">Amount<br/>Accrued<br/>for the<br/>Period</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">GSIS<br/>EDUC<br/>LOAN</th>
                  <th rowSpan={3} className="border border-black text-center align-middle" style={{ padding: '2px 2px' }}>GSIS<br/>MPL<br/>LOAN</th>
                  <th colSpan={6} className="border border-black p-0 align-middle text-center" rowSpan={1}></th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">GSIS<br/>MPL<br/>Lite</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">LBP<br/>LOAN</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">GFAL<br/>LOAN</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">Pag-ibig<br/>LOAN</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center" style={{ width: '25px' }}>E.C.</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">Amount<br/>Paid<br/>In<br/>Cash<br/>(Cr. A-1)</th>
                  <th rowSpan={3} className="border border-black p-0 align-middle text-center" style={{ width: '25px' }}>
                    <div className="flex flex-col items-center justify-center" style={{ fontSize: `${fontSizes.number}px` }}>
                      <span>N</span>
                      <span>U</span>
                      <span>M</span>
                      <span>B</span>
                      <span>E</span>
                      <span>R</span>
                    </div>
                  </th>
                  <th rowSpan={3} className="border border-black p-0 align-middle px-5 text-center">Signature<br/>of<br/>Payee</th>
                </tr>
                
                <tr>
                  <th rowSpan={2} className="border border-black text-center align-middle" style={{ padding: '2px 2px' }}>From _____</th>
                  <th rowSpan={2} className="border border-black p-0 px-1 text-center align-middle">To ______</th>
                  <th colSpan={2} className="border border-black p-0 text-center">PHILHEALTH</th>
                  <th colSpan={2} className="border border-black p-0 text-center">GSIS Premiums</th>
                  <th colSpan={2} className="border border-black p-0 text-center">Pag-ibig</th>
                </tr>
                
                <tr>
                  <th className="border border-black text-center align-middle" style={{ padding: '4px 1px' }}>Personal<br/>Share</th>
                  <th className="border border-black p-0 px-1 text-center align-middle">Government<br/>Share</th>
                  <th className="border border-black p-0 px-1 text-center align-middle">Personal<br/>Share</th>
                  <th className="border border-black p-0 px-1 text-center align-middle">Government<br/>Share</th>
                  <th className="border border-black p-0 px-1 text-center align-middle">Personal<br/>Share</th>
                  <th className="border border-black p-0 px-1 text-center align-middle">Government<br/>Share</th>
                </tr>
              </thead>

              <tbody>
                {/* MAYOR'S OFFICE SECTION */}
                {mayorEmployees.map((emp, index) => {
                  // Get current values (either changed or original)
                  const currentValues = {
                    periodFrom: getEmployeeValue(emp.name, 'periodFrom'),
                    periodTo: getEmployeeValue(emp.name, 'periodTo'),
                    monthlyRate: getEmployeeValue(emp.name, 'monthlyRate'),
                    amountAccrued: getEmployeeValue(emp.name, 'amountAccrued'),
                    gsisEduLoan: getEmployeeValue(emp.name, 'gsisEduLoan'),
                    gsisMplLoan: getEmployeeValue(emp.name, 'gsisMplLoan'),
                    philhealthPersonal: getEmployeeValue(emp.name, 'philhealthPersonal'),
                    philhealthGovernment: getEmployeeValue(emp.name, 'philhealthGovernment'),
                    gsisPersonal: getEmployeeValue(emp.name, 'gsisPersonal'),
                    gsisGovernment: getEmployeeValue(emp.name, 'gsisGovernment'),
                    pagibigPersonal: getEmployeeValue(emp.name, 'pagibigPersonal'),
                    pagibigGovernment: getEmployeeValue(emp.name, 'pagibigGovernment'),
                    gsisLiteLoan: getEmployeeValue(emp.name, 'gsisLiteLoan'),
                    lbpLoan: getEmployeeValue(emp.name, 'lbpLoan'),
                    gfalLoan: getEmployeeValue(emp.name, 'gfalLoan'),
                    pagibigMpl: getEmployeeValue(emp.name, 'pagibigMpl'),
                    ec: getEmployeeValue(emp.name, 'ec'),
                    paidInCash: getEmployeeValue(emp.name, 'paidInCash')
                  };
                  
                  const citizenType = getCitizenType(emp.name);
                  const isSeniorRow = citizenType === 'senior';

                  return (
                    <tr key={`mayor-${index}`} className={isSeniorRow ? 'bg-orange-50' : ''}>
                      <td className="border border-black text-center align-middle bg-gray-100" style={{ padding: '2px 2px', fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                      <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>
                        <EditableCell
                          value={currentValues.periodFrom}
                          onChange={(e) => handleInputChange(emp.name, 'periodFrom', e.target.value)}
                          placeholder="DD-MMM-YYYY"
                          className="text-center"
                          employeeName={emp.name}
                          field="periodFrom"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>
                        <EditableCell
                          value={currentValues.periodTo}
                          onChange={(e) => handleInputChange(emp.name, 'periodTo', e.target.value)}
                          placeholder="DD-MMM-YYYY"
                          className="text-center"
                          employeeName={emp.name}
                          field="periodTo"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.monthlyRate}
                          onChange={(e) => handleInputChange(emp.name, 'monthlyRate', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="monthlyRate"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.amountAccrued} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisEduLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisEduLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisEduLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisMplLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisMplLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisMplLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.philhealthPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.philhealthGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.gsisPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.gsisGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.pagibigPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.pagibigGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisLiteLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisLiteLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisLiteLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.lbpLoan}
                          onChange={(e) => handleInputChange(emp.name, 'lbpLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="lbpLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gfalLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gfalLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gfalLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.pagibigMpl}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigMpl', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="pagibigMpl"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.ec}
                          onChange={(e) => handleInputChange(emp.name, 'ec', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-center"
                          employeeName={emp.name}
                          field="ec"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.paidInCash} />
                      </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"></td>
                    </tr>
                  );
                })}
                
                {/* MAYOR'S OFFICE TOTAL ROW */}
                {mayorEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 text-right pr-1 align-middle">P</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mayorTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{mayorEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"></td>
                  </tr>
                )}

                {/* ACCOUNTING OFFICE SECTION HEADER */}
                {accountingEmployees.length > 0 && (
                  <tr>
                    <td className="border border-black text-center align-middle font-bold"></td>
                    <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>ACCOUNTING OFFICE</td>
                    <td colSpan={21} className="border border-black p-0 align-middle"></td>
                  </tr>
                )}
                
                {/* ACCOUNTING OFFICE ROWS */}
                {accountingEmployees.map((emp, index) => {
                  const currentValues = {
                    periodFrom: getEmployeeValue(emp.name, 'periodFrom'),
                    periodTo: getEmployeeValue(emp.name, 'periodTo'),
                    monthlyRate: getEmployeeValue(emp.name, 'monthlyRate'),
                    amountAccrued: getEmployeeValue(emp.name, 'amountAccrued'),
                    gsisEduLoan: getEmployeeValue(emp.name, 'gsisEduLoan'),
                    gsisMplLoan: getEmployeeValue(emp.name, 'gsisMplLoan'),
                    philhealthPersonal: getEmployeeValue(emp.name, 'philhealthPersonal'),
                    philhealthGovernment: getEmployeeValue(emp.name, 'philhealthGovernment'),
                    gsisPersonal: getEmployeeValue(emp.name, 'gsisPersonal'),
                    gsisGovernment: getEmployeeValue(emp.name, 'gsisGovernment'),
                    pagibigPersonal: getEmployeeValue(emp.name, 'pagibigPersonal'),
                    pagibigGovernment: getEmployeeValue(emp.name, 'pagibigGovernment'),
                    gsisLiteLoan: getEmployeeValue(emp.name, 'gsisLiteLoan'),
                    lbpLoan: getEmployeeValue(emp.name, 'lbpLoan'),
                    gfalLoan: getEmployeeValue(emp.name, 'gfalLoan'),
                    pagibigMpl: getEmployeeValue(emp.name, 'pagibigMpl'),
                    ec: getEmployeeValue(emp.name, 'ec'),
                    paidInCash: getEmployeeValue(emp.name, 'paidInCash')
                  };
                  
                  const citizenType = getCitizenType(emp.name);
                  const isSeniorRow = citizenType === 'senior';

                  return (
                    <tr key={`accounting-${index}`} className={isSeniorRow ? 'bg-orange-50' : ''}>
                      <td className="border border-black text-center align-middle bg-gray-100" style={{ padding: '2px 2px', fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                      <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>
                        <EditableCell
                          value={currentValues.periodFrom}
                          onChange={(e) => handleInputChange(emp.name, 'periodFrom', e.target.value)}
                          placeholder="DD-MMM-YYYY"
                          className="text-center"
                          employeeName={emp.name}
                          field="periodFrom"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>
                        <EditableCell
                          value={currentValues.periodTo}
                          onChange={(e) => handleInputChange(emp.name, 'periodTo', e.target.value)}
                          placeholder="DD-MMM-YYYY"
                          className="text-center"
                          employeeName={emp.name}
                          field="periodTo"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.monthlyRate}
                          onChange={(e) => handleInputChange(emp.name, 'monthlyRate', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="monthlyRate"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.amountAccrued} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisEduLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisEduLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisEduLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisMplLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisMplLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisMplLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.philhealthPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.philhealthGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.gsisPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.gsisGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.pagibigPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.pagibigGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisLiteLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisLiteLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisLiteLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.lbpLoan}
                          onChange={(e) => handleInputChange(emp.name, 'lbpLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="lbpLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gfalLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gfalLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gfalLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.pagibigMpl}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigMpl', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="pagibigMpl"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.ec}
                          onChange={(e) => handleInputChange(emp.name, 'ec', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-center"
                          employeeName={emp.name}
                          field="ec"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.paidInCash} />
                      </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"></td>
                    </tr>
                  );
                })}
                
                {/* ACCOUNTING OFFICE TOTAL ROW */}
                {accountingEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 align-middle"></td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(accountingTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{mayorEmployees.length + accountingEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"></td>
                  </tr>
                )}

                {/* BUDGET OFFICE SECTION HEADER */}
                {budgetEmployees.length > 0 && (
                  <tr>
                    <td className="border border-black text-center align-middle font-bold"></td>
                    <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>MUN. BUDGET OFFICE</td>
                    <td colSpan={21} className="border border-black p-0 align-middle"></td>
                  </tr>
                )}
                
                {/* BUDGET OFFICE ROWS */}
                {budgetEmployees.map((emp, index) => {
                  const currentValues = {
                    periodFrom: getEmployeeValue(emp.name, 'periodFrom'),
                    periodTo: getEmployeeValue(emp.name, 'periodTo'),
                    monthlyRate: getEmployeeValue(emp.name, 'monthlyRate'),
                    amountAccrued: getEmployeeValue(emp.name, 'amountAccrued'),
                    gsisEduLoan: getEmployeeValue(emp.name, 'gsisEduLoan'),
                    gsisMplLoan: getEmployeeValue(emp.name, 'gsisMplLoan'),
                    philhealthPersonal: getEmployeeValue(emp.name, 'philhealthPersonal'),
                    philhealthGovernment: getEmployeeValue(emp.name, 'philhealthGovernment'),
                    gsisPersonal: getEmployeeValue(emp.name, 'gsisPersonal'),
                    gsisGovernment: getEmployeeValue(emp.name, 'gsisGovernment'),
                    pagibigPersonal: getEmployeeValue(emp.name, 'pagibigPersonal'),
                    pagibigGovernment: getEmployeeValue(emp.name, 'pagibigGovernment'),
                    gsisLiteLoan: getEmployeeValue(emp.name, 'gsisLiteLoan'),
                    lbpLoan: getEmployeeValue(emp.name, 'lbpLoan'),
                    gfalLoan: getEmployeeValue(emp.name, 'gfalLoan'),
                    pagibigMpl: getEmployeeValue(emp.name, 'pagibigMpl'),
                    ec: getEmployeeValue(emp.name, 'ec'),
                    paidInCash: getEmployeeValue(emp.name, 'paidInCash')
                  };
                  
                  const citizenType = getCitizenType(emp.name);
                  const isSeniorRow = citizenType === 'senior';

                  return (
                    <tr key={`budget-${index}`} className={isSeniorRow ? 'bg-orange-50' : ''}>
                      <td className="border border-black text-center align-middle bg-gray-100" style={{ padding: '2px 2px', fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                      <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>
                        <EditableCell
                          value={currentValues.periodFrom}
                          onChange={(e) => handleInputChange(emp.name, 'periodFrom', e.target.value)}
                          placeholder="DD-MMM-YYYY"
                          className="text-center"
                          employeeName={emp.name}
                          field="periodFrom"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>
                        <EditableCell
                          value={currentValues.periodTo}
                          onChange={(e) => handleInputChange(emp.name, 'periodTo', e.target.value)}
                          placeholder="DD-MMM-YYYY"
                          className="text-center"
                          employeeName={emp.name}
                          field="periodTo"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.monthlyRate}
                          onChange={(e) => handleInputChange(emp.name, 'monthlyRate', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="monthlyRate"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.amountAccrued} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisEduLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisEduLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisEduLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisMplLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisMplLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisMplLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.philhealthPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.philhealthGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.gsisPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.gsisGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.pagibigPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.pagibigGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisLiteLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisLiteLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisLiteLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.lbpLoan}
                          onChange={(e) => handleInputChange(emp.name, 'lbpLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="lbpLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gfalLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gfalLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gfalLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.pagibigMpl}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigMpl', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="pagibigMpl"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.ec}
                          onChange={(e) => handleInputChange(emp.name, 'ec', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-center"
                          employeeName={emp.name}
                          field="ec"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.paidInCash} />
                      </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"></td>
                    </tr>
                  );
                })}
                
                {/* BUDGET OFFICE TOTAL ROW */}
                {budgetEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 align-middle"></td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(budgetTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{mayorEmployees.length + accountingEmployees.length + budgetEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"></td>
                  </tr>
                )}

                {/* MASSO SECTION HEADER */}
                {massoEmployees.length > 0 && (
                  <tr>
                    <td className="border border-black text-center align-middle font-bold"></td>
                    <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>MASSO</td>
                    <td colSpan={21} className="border border-black p-0 align-middle"></td>
                  </tr>
                )}
                
                {/* MASSO ROWS */}
                {massoEmployees.map((emp, index) => {
                  const currentValues = {
                    periodFrom: getEmployeeValue(emp.name, 'periodFrom'),
                    periodTo: getEmployeeValue(emp.name, 'periodTo'),
                    monthlyRate: getEmployeeValue(emp.name, 'monthlyRate'),
                    amountAccrued: getEmployeeValue(emp.name, 'amountAccrued'),
                    gsisEduLoan: getEmployeeValue(emp.name, 'gsisEduLoan'),
                    gsisMplLoan: getEmployeeValue(emp.name, 'gsisMplLoan'),
                    philhealthPersonal: getEmployeeValue(emp.name, 'philhealthPersonal'),
                    philhealthGovernment: getEmployeeValue(emp.name, 'philhealthGovernment'),
                    gsisPersonal: getEmployeeValue(emp.name, 'gsisPersonal'),
                    gsisGovernment: getEmployeeValue(emp.name, 'gsisGovernment'),
                    pagibigPersonal: getEmployeeValue(emp.name, 'pagibigPersonal'),
                    pagibigGovernment: getEmployeeValue(emp.name, 'pagibigGovernment'),
                    gsisLiteLoan: getEmployeeValue(emp.name, 'gsisLiteLoan'),
                    lbpLoan: getEmployeeValue(emp.name, 'lbpLoan'),
                    gfalLoan: getEmployeeValue(emp.name, 'gfalLoan'),
                    pagibigMpl: getEmployeeValue(emp.name, 'pagibigMpl'),
                    ec: getEmployeeValue(emp.name, 'ec'),
                    paidInCash: getEmployeeValue(emp.name, 'paidInCash')
                  };
                  
                  const citizenType = getCitizenType(emp.name);
                  const isSeniorRow = citizenType === 'senior';

                  return (
                    <tr key={`masso-${index}`} className={isSeniorRow ? 'bg-orange-50' : ''}>
                      <td className="border border-black text-center align-middle bg-gray-100" style={{ padding: '2px 2px', fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                      <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>
                        <EditableCell
                          value={currentValues.periodFrom}
                          onChange={(e) => handleInputChange(emp.name, 'periodFrom', e.target.value)}
                          placeholder="DD-MMM-YYYY"
                          className="text-center"
                          employeeName={emp.name}
                          field="periodFrom"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>
                        <EditableCell
                          value={currentValues.periodTo}
                          onChange={(e) => handleInputChange(emp.name, 'periodTo', e.target.value)}
                          placeholder="DD-MMM-YYYY"
                          className="text-center"
                          employeeName={emp.name}
                          field="periodTo"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.monthlyRate}
                          onChange={(e) => handleInputChange(emp.name, 'monthlyRate', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="monthlyRate"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.amountAccrued} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisEduLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisEduLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisEduLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisMplLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisMplLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisMplLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.philhealthPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.philhealthGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.gsisPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.gsisGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.pagibigPersonal} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.pagibigGovernment} />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gsisLiteLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gsisLiteLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gsisLiteLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.lbpLoan}
                          onChange={(e) => handleInputChange(emp.name, 'lbpLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="lbpLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.gfalLoan}
                          onChange={(e) => handleInputChange(emp.name, 'gfalLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="gfalLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.pagibigMpl}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigMpl', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={emp.name}
                          field="pagibigMpl"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <EditableCell
                          value={currentValues.ec}
                          onChange={(e) => handleInputChange(emp.name, 'ec', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-center"
                          employeeName={emp.name}
                          field="ec"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell value={currentValues.paidInCash} />
                      </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"></td>
                    </tr>
                  );
                })}
                
                {/* MASSO TOTAL ROW */}
                {massoEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 align-middle"></td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(massoTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{mayorEmployees.length + accountingEmployees.length + budgetEmployees.length + massoEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"></td>
                  </tr>
                )}

                {/* GRAND TOTAL ROW */}
                {employeesList.length > 0 && (
                  <tr className="font-bold">
                    <td colSpan={5} className="border border-black align-middle font-bold" style={{ padding: '4px 2px', fontSize: `${fontSizes.number}px` }}>Total or Carried forward</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{employeesList.length + 3}</td>
                    <td className="border border-black p-0 align-middle"></td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* FOOTER AND SIGNATURES SECTION - UPDATED TO MATCH PAYROLL4.xlsx */}
            <div className="mt-8 space-y-1" style={{ fontSize: `${fontSizes.small}px` }}>
              {/* First Row of Signatures */}
              <div className={`grid ${paperSize === "A3" ? "grid-cols-3 gap-3" : orientation === "landscape" ? "grid-cols-3 gap-2" : "grid-cols-3 gap-1"}`}>
                <div>
                  <div className="leading-tight ml-4 mt-1">
                    <p className="pl-5">(1) I HEREBY CERTIFY on my official oath that the above PAYROLL is correct, 
                    and that services</p> <p className="mt-1"> above stated have been duly rendered. Payment for such services 
                    is also hereby approved from the </p><p className="mt-1">appropriation indicated.</p>
                  </div>
                  <div className="mt-2 ml-4">
                    <div className="inline-block"></div>
                    <div className="ml-2">_____________________ , 20______</div>
                    <div className="ml-2 mt-1">(2) APPROVED for payment subject to preaudit:</div>
                  </div>
                  <div className="text-left pl-80 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>JONNA C. ADAN</div>
                    <div className="text-left ml-10 pl-72">Municipal Mayor</div>
                </div>
                
                <div>
                  <div className="mt-3 ml-4">
                    <div>(4) APPROVED:</div>
                  </div>
                  <div className="mt-11 ml-20 pl-24 pt-2 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>JONNA C. ADAN</div>
                  <div className="ml-7 pl-40">Municipal Mayor</div>
                </div>
                
                <div>
                  <div className="mt-1">
                    <p className="pl-5">(5) I HEREBY CERTIFY on my official oath that I have paid in cash to each official 
                      and employee whose name</p> <p>appears on the above roll the amount opposite his name,
                      under column 19, they having signed or marked his </p><p className="mt-1">name under column 24 above, 
                      in my presence and at the time that payment was made to him in acknowledgment </p><p className="mt-1">
                      of receipt of the money paid him.</p>
                  </div>
                  <div className="mt-1 ml-56 text-center">
                    <div className="inline-block"></div>
                    <div className="font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>DANNIE LYN I. VILLAFLOR</div>
                    <div>Municipal Treasurer</div>
                  </div>
                  <div className="ml-10">__________________________________ , 20_________________</div>
                </div>
                
                <div>
                  <div>_____________________ , 20 ____________________________ Treasurer</div>
                </div>
              </div>
              
              {/* Second Row of Signatures */}
              <div className={`grid ${paperSize === "A3" ? "grid-cols-3 gap-3" : orientation === "landscape" ? "grid-cols-3 gap-2" : "grid-cols-3 gap-1"} mt-1`}>
                <div>
                  <div className="mt-2">
                    (3) Preaudit and approved for payment in the month of<p className="mt-1"><p className="mt-1">
                    _____________________ (P_________________ ) pesos only.</p></p> 
                  </div>
                  <div className="mt-3">_____________________ , 20 ____________________________ </div>
                   <div className="ml-40">Provincial Auditor</div>
                  
                     <div className="font-bold pl-80" style={{ fontSize: `${fontSizes.medium}px` }}>BIANCA MARIE D. CHUA</div>
                    <div className="pl-80 ml-3">Municipal Assessor</div>
                </div>
                
                <div>
                  <div className="font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>KRYSTEL RUTH C. RANARIO</div>
                  <div className="pl-5 ml-3">Mun. Budget Officer</div>
                </div>            
                
                <div>
                  <div>
                    <p className="pl-5">(6) I HEREBY CERTIFY on my official oath that each employee whose name appears 
                      on the above roll has been</p><p className="mt-1"> paid in cash or in check, and in no other mode, 
                      the amount shown under column 19 above, opposite his name. The total of the 
                      payments made by means this payroll amounts to __________________________________ 
                      </p><p className="mt-1">( P ___________________ ) pesos only.</p>
                  </div>
                  <div className="mt-1 ml-56 text-center">
                    <div className="mt-3"></div>
                    <div className="font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>DANNIE LYN I. VILLAFLOR</div>
                    <div>Municipal Treasurer</div>
                  </div>
                  <div className="ml-10">__________________________________ , 20_________________</div>
                </div>
              </div>
              
              <div className="pl-72 ml-52">
                <div className="font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>ELLA MAE S. APOLE</div>
                <div className="pl-3">Mun. Accountant</div>
              </div>
              
              {/* Bottom Slogan */}
              <div className="pl-80 ml-96 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>
                IPAKITA SA MUNDO, UMAASENSO NA TAYO.
              </div>
            </div>
          </div>
        </div>

        {/* Instructions - UPDATED COLORS */}
        <div className="relative z-10 border-t border-white/5 px-6 py-3 bg-[#0f0f1a]">
          <div className="text-sm text-gray-400">
            <ul className="list-disc list-inside space-y-1">
              <li><span className="text-orange-400">Click "Mark as Received" button</span> to enable editing</li>
              <li><span className="text-orange-400">Edit white input boxes</span> to change values (when enabled)</li>
              <li><strong className="text-gray-300">Gray boxes are auto-calculated</strong> - Amount Accrued, PHILHEALTH, GSIS Premiums, Pag-IBIG Government, and Paid in Cash</li>
              <li><span className="text-orange-400">Editable loans:</span> GSIS EDUC LOAN, GSIS MPL LOAN, LBP LOAN, GFAL LOAN, GSIS MPL Lite, Pag-IBIG LOAN, E.C.</li>
              <li><span className="text-green-400">💾 Save Excel:</span> Download edited file to computer</li>
              <li><span className="text-orange-400">✓ Check File:</span> Validate file and update in Firestore</li>
              <li><strong className="text-gray-300">Formulas:</strong> Monthly Rate / 2 = Amount Accrued | Monthly Rate × 2.5% = PHILHEALTH | Monthly Rate × 9% = GSIS Personal | Monthly Rate × 12% = GSIS Government | Monthly Rate × 2% = Pag-IBIG Personal | Pag-IBIG Government = ₱200 | Paid in Cash = Amount Accrued - All Deductions</li>
            </ul>
          </div>
          {!editingEnabled && (
            <div className="mt-3 p-3 rounded-xl"
              style={{
                background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), #1a1a2a)',
                border: '1px solid rgba(249, 115, 22, 0.2)'
              }}
            >
              <p className="text-orange-400 text-sm font-medium flex items-center gap-2">
                <MdWarning className="w-4 h-4" />
                <strong>Note:</strong> You must click <strong>"Mark as Received"</strong> before you can edit or check this file.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalSend_MAYOR;
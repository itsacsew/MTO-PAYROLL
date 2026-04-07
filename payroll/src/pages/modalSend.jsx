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
  MdAnalytics
} from 'react-icons/md';

const ModalSend = ({ file, onClose, markedAsReceived, onMarkAsReceived }) => {
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

  // Employee rows as per payslip.jsx
  const employeeRows = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 30, 31, 32, 35];

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
        
        console.log('Excel loaded from base64 data');
        
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

  const extractEmployeeData = (worksheet) => {
    const employees = {};
    
    employeeRows.forEach(row => {
      try {
        const nameCell = worksheet.getCell(`C${row}`);
        if (nameCell && nameCell.value) {
          const employeeName = nameCell.value.toString().trim();
          
          // Skip if name is empty or is a header
          if (!employeeName || employeeName === 'NAME' || employeeName.length < 2) {
            return;
          }
          
          employees[employeeName] = {
            row: row,
            name: employeeName,
            section: row <= 26 ? 'SB' : row <= 32 ? 'MTO' : 'MENRO',
            number: getCellValue(worksheet, `A${row}`),
            designation: getCellValue(worksheet, `D${row}`),
            periodFrom: formatDate(getCellRawValue(worksheet, `E${row}`)),
            periodTo: formatDate(getCellRawValue(worksheet, `F${row}`)),
            monthlyRate: getCellValue(worksheet, `H${row}`),
            amountAccrued: getCellValue(worksheet, `I${row}`),
            gsisEduLoan: getCellValue(worksheet, `J${row}`),
            gsisMplLoan: getCellValue(worksheet, `K${row}`),
            philhealthPersonal: getCellValue(worksheet, `L${row}`),
            philhealthGovernment: getCellValue(worksheet, `M${row}`),
            gsisPersonal: getCellValue(worksheet, `N${row}`),
            gsisGovernment: getCellValue(worksheet, `O${row}`),
            pagibigPersonal: getCellValue(worksheet, `P${row}`),
            pagibigGovernment: getCellValue(worksheet, `Q${row}`),
            lbpLoan: getCellValue(worksheet, `R${row}`),
            gfalLoan: getCellValue(worksheet, `S${row}`),
            gsisLiteLoan: getCellValue(worksheet, `T${row}`),
            pagibigMpl: getCellValue(worksheet, `U${row}`),
            ec: getCellValue(worksheet, `V${row}`),
            paidInCash: getCellValue(worksheet, `X${row}`),
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
    // Formula: = I - J - K - L - N - P - R - S - T - U - V
    // Includes ALL deductions and loans:
    // I = Amount Accrued
    // J = GSIS EDUC LOAN
    // K = GSIS MPL LOAN
    // L = PHILHEALTH Personal
    // N = GSIS Personal
    // P = Pag-ibig Personal
    // R = LBP LOAN
    // S = GFAL LOAN
    // T = GSIS MPL Lite
    // U = Pag-ibig LOAN (MPL)
    // V = E.C.
    
    const i = parseFloat(employee.amountAccrued) || 0;
    const j = parseFloat(employee.gsisEduLoan) || 0;
    const k = parseFloat(employee.gsisMplLoan) || 0;
    const l = parseFloat(employee.philhealthPersonal) || 0;
    const n = parseFloat(employee.gsisPersonal) || 0;
    const p = parseFloat(employee.pagibigPersonal) || 0;
    const r = parseFloat(employee.lbpLoan) || 0;
    const s = parseFloat(employee.gfalLoan) || 0;
    const t = parseFloat(employee.gsisLiteLoan) || 0;
    const u = parseFloat(employee.pagibigMpl) || 0;
    const v = parseFloat(employee.ec) || 0;
    
    return (i - j - k - l - n - p - r - s - t - u - v).toFixed(2);
  };

  // Handle input change with auto-calculation
  // Sa modalSend.jsx, pangitaa ang handleInputChange function (around line 350-430)
const handleInputChange = useCallback((employeeName, field, value) => {
  if (!editingEnabled) {
    alert('⚠️ Please mark this file as received first before editing.');
    return;
  }

  try {
    console.log(`🟡 INPUT CHANGE: Employee: ${employeeName}, Field: ${field}, New Value: ${value}`);
    
    setAllEmployeeChanges(prev => {
      const employeeChanges = prev[employeeName] || {};
      const currentData = employeeData[employeeName] || {};
      
      console.log(`   Current ${field} value:`, currentData[field]);
      console.log(`   Existing changes for ${employeeName}:`, employeeChanges);
      
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
        
        console.log(`   🔄 Monthly Rate changed to: ${rate}, auto-calculating...`);
        
        // Auto-calculate all formula-based fields
        const newAmountAccrued = calculateAmountAccrued(rate);
        const newPhilhealthPersonal = calculatePhilhealthShare(rate);
        const newPhilhealthGovernment = calculatePhilhealthShare(rate);
        const newGsisPersonal = calculateGSISPersonal(rate);
        const newGsisGovernment = calculateGSISGovernment(rate);
        const newPagibigPersonal = calculatePagibigPersonal(rate);
        const newPagibigGovernment = calculatePagibigGovernment();
        
        console.log(`   ✅ Auto-calculated values:`);
        console.log(`      - Amount Accrued: ${newAmountAccrued}`);
        console.log(`      - PhilHealth Personal: ${newPhilhealthPersonal}`);
        console.log(`      - PhilHealth Government: ${newPhilhealthGovernment}`);
        console.log(`      - GSIS Personal: ${newGsisPersonal}`);
        console.log(`      - GSIS Government: ${newGsisGovernment}`);
        console.log(`      - Pag-IBIG Personal: ${newPagibigPersonal}`);
        console.log(`      - Pag-IBIG Government: ${newPagibigGovernment}`);
        
        newChanges.amountAccrued = newAmountAccrued;
        newChanges.philhealthPersonal = newPhilhealthPersonal;
        newChanges.philhealthGovernment = newPhilhealthGovernment;
        newChanges.gsisPersonal = newGsisPersonal;
        newChanges.gsisGovernment = newGsisGovernment;
        newChanges.pagibigPersonal = newPagibigPersonal;
        newChanges.pagibigGovernment = newPagibigGovernment;
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
        philhealthGovernment: newChanges.philhealthGovernment !== undefined ? newChanges.philhealthGovernment : currentData.philhealthGovernment,
        gsisPersonal: newChanges.gsisPersonal !== undefined ? newChanges.gsisPersonal : currentData.gsisPersonal,
        gsisGovernment: newChanges.gsisGovernment !== undefined ? newChanges.gsisGovernment : currentData.gsisGovernment,
        pagibigPersonal: newChanges.pagibigPersonal !== undefined ? newChanges.pagibigPersonal : currentData.pagibigPersonal,
        pagibigGovernment: newChanges.pagibigGovernment !== undefined ? newChanges.pagibigGovernment : currentData.pagibigGovernment,
      };
      
      // Recalculate Paid in Cash after any changes to deductions or loans
      const newPaidInCash = calculatePaidInCash(updatedEmployee);
      newChanges.paidInCash = newPaidInCash;
      
      console.log(`   💰 New Paid in Cash calculated: ${newPaidInCash}`);
      console.log(`   📝 Final changes for ${employeeName}:`, newChanges);
      
      return {
        ...prev,
        [employeeName]: newChanges
      };
    });
  } catch (error) {
    console.error('❌ Error in handleInputChange:', error);
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

  // EditableCell component
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

  // DisplayCell component for non-editable cells
  const DisplayCell = useCallback(({ value, className = '' }) => (
    <div className={`w-full px-1 py-0.5 text-center text-xs bg-gray-100 ${className}`}>
      {value}
    </div>
  ), []);

  // FormulaCell component - NOW EDITABLE for PHILHEALTH, GSIS, Pag-IBIG
  // BUT Amount Accrued (I) and Paid in Cash (X) remain DISPLAY-ONLY
  const FormulaCell = useCallback(({ 
    value, 
    onChange, 
    employeeName, 
    field, 
    className = '', 
    bgColor = 'bg-gray-50',
    disabled = false,
    type = 'number'
  }) => {
    // If this is amountAccrued or paidInCash field, ALWAYS display-only (no editing)
    if (field === 'amountAccrued' || field === 'paidInCash') {
      return (
        <div className={`w-full px-1 py-0.5 text-right text-xs ${bgColor} ${className}`}>
          {value}
        </div>
      );
    }
    
    if (disabled) {
      return (
        <div className={`w-full px-1 py-0.5 text-right text-xs ${bgColor} ${className}`}>
          {value}
        </div>
      );
    }
    
    return (
      <EditableCell
        value={value}
        onChange={onChange}
        type={type}
        placeholder="0.00"
        className={`text-right ${className}`}
        employeeName={employeeName}
        field={field}
        disabled={false}
      />
    );
  }, [EditableCell]);

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
  // In ModalSend.jsx - Update the handleMarkAsReceived function
const handleMarkAsReceived = () => {
  console.log('🔵 Mark as Received clicked for file:', file?.id, file?.fileName);
  
  if (onMarkAsReceived) {
    // Call the parent function which will update Firestore
    onMarkAsReceived();
    setEditingEnabled(true);
    alert('✅ File marked as received! You can now edit the file.');
  } else {
    console.error('❌ onMarkAsReceived callback is not available');
    alert('Error: Unable to mark file as received. Please try again.');
  }
};

const updateExcelWithInputs = async () => {
  if (!excelData) return null;

  try {
    console.log('🟢 Starting Excel update with inputs...');
    console.log('   Changes to apply:', allEmployeeChanges);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelData.originalData);
    
    const worksheet = workbook.getWorksheet(1);
    let updatedCellsCount = 0;
    
    // Track which rows were updated para ma-recalculate ang totals
    const updatedRows = new Set();

    Object.keys(allEmployeeChanges).forEach(employeeName => {
      try {
        const changes = allEmployeeChanges[employeeName];
        const employeeRow = employeeData[employeeName]?.row;
        
        console.log(`   📍 Processing employee: ${employeeName}, Row: ${employeeRow}`);
        
        if (!employeeRow) {
          console.warn(`   ⚠️ No row found for employee: ${employeeName}`);
          return;
        }
        
        updatedRows.add(employeeRow);

        // Update all changed fields
        Object.entries(changes).forEach(([field, value]) => {
          let cellAddress;
          switch(field) {
            case 'periodFrom': cellAddress = `E${employeeRow}`; break;
            case 'periodTo': cellAddress = `F${employeeRow}`; break;
            case 'monthlyRate': cellAddress = `H${employeeRow}`; break;
            case 'amountAccrued': cellAddress = `I${employeeRow}`; break;
            case 'gsisEduLoan': cellAddress = `J${employeeRow}`; break;
            case 'gsisMplLoan': cellAddress = `K${employeeRow}`; break;
            case 'philhealthPersonal': cellAddress = `L${employeeRow}`; break;
            case 'philhealthGovernment': cellAddress = `M${employeeRow}`; break;
            case 'gsisPersonal': cellAddress = `N${employeeRow}`; break;
            case 'gsisGovernment': cellAddress = `O${employeeRow}`; break;
            case 'pagibigPersonal': cellAddress = `P${employeeRow}`; break;
            case 'pagibigGovernment': cellAddress = `Q${employeeRow}`; break;
            case 'lbpLoan': cellAddress = `R${employeeRow}`; break;
            case 'gfalLoan': cellAddress = `S${employeeRow}`; break;
            case 'gsisLiteLoan': cellAddress = `T${employeeRow}`; break;
            case 'pagibigMpl': cellAddress = `U${employeeRow}`; break;
            case 'ec': cellAddress = `V${employeeRow}`; break;
            case 'paidInCash': cellAddress = `X${employeeRow}`; break;
            default: return;
          }
          
          const cell = worksheet.getCell(cellAddress);
          const numericValue = parseFloat(value) || 0;
          
          console.log(`      ✏️ Updating ${cellAddress} (${field}): ${numericValue} (from: ${value})`);
          
          cell.value = numericValue;
          updatedCellsCount++;
        });
      } catch (error) {
        console.error(`   ❌ Error updating Excel for ${employeeName}:`, error);
      }
    });
    
    // After updating cells, recalculate the formula cells
    console.log('🔄 Recalculating formula cells...');
    
    // Get the current values from the updated rows para ma-recalculate ang SUM
    // For SB employees (rows 15-26)
    let sbSum = 0;
    for (let row = 15; row <= 26; row++) {
      const amountCell = worksheet.getCell(`I${row}`);
      let amount = 0;
      if (amountCell.value && typeof amountCell.value === 'object' && amountCell.value.result !== undefined) {
        amount = parseFloat(amountCell.value.result) || 0;
      } else if (typeof amountCell.value === 'number') {
        amount = amountCell.value;
      } else if (typeof amountCell.value === 'string') {
        amount = parseFloat(amountCell.value) || 0;
      }
      sbSum += amount;
    }
    console.log(`   📊 SB Sum (I15:I26): ₱${sbSum.toLocaleString()}`);
    
    // For MTO employees (rows 30-32)
    let mtoSum = 0;
    for (let row = 30; row <= 32; row++) {
      const amountCell = worksheet.getCell(`I${row}`);
      let amount = 0;
      if (amountCell.value && typeof amountCell.value === 'object' && amountCell.value.result !== undefined) {
        amount = parseFloat(amountCell.value.result) || 0;
      } else if (typeof amountCell.value === 'number') {
        amount = amountCell.value;
      } else if (typeof amountCell.value === 'string') {
        amount = parseFloat(amountCell.value) || 0;
      }
      mtoSum += amount;
    }
    console.log(`   📊 MTO Sum (I30:I32): ₱${mtoSum.toLocaleString()}`);
    
    // For MENRO employee (row 35)
    let menroSum = 0;
    const menroCell = worksheet.getCell('I35');
    if (menroCell.value && typeof menroCell.value === 'object' && menroCell.value.result !== undefined) {
      menroSum = parseFloat(menroCell.value.result) || 0;
    } else if (typeof menroCell.value === 'number') {
      menroSum = menroCell.value;
    } else if (typeof menroCell.value === 'string') {
      menroSum = parseFloat(menroCell.value) || 0;
    }
    console.log(`   📊 MENRO Sum (I35): ₱${menroSum.toLocaleString()}`);
    
    // Update the formula cells with new values
    const sbFormulaCell = worksheet.getCell('C2');
    const mtoFormulaCell = worksheet.getCell('D2');
    const menroFormulaCell = worksheet.getCell('C3');
    
    // Set the values directly (ExcelJS will handle the formula)
    // But we need to ensure the formulas are set correctly
    if (sbFormulaCell.value && typeof sbFormulaCell.value === 'object' && sbFormulaCell.value.formula) {
      console.log(`   📐 Cell C2 formula: ${sbFormulaCell.value.formula}`);
      // Force recalculation by setting the value
      sbFormulaCell.value = { formula: sbFormulaCell.value.formula, result: sbSum };
    }
    
    if (mtoFormulaCell.value && typeof mtoFormulaCell.value === 'object' && mtoFormulaCell.value.formula) {
      console.log(`   📐 Cell D2 formula: ${mtoFormulaCell.value.formula}`);
      mtoFormulaCell.value = { formula: mtoFormulaCell.value.formula, result: mtoSum };
    }
    
    if (menroFormulaCell.value && typeof menroFormulaCell.value === 'object' && menroFormulaCell.value.formula) {
      console.log(`   📐 Cell C3 formula: ${menroFormulaCell.value.formula}`);
      menroFormulaCell.value = { formula: menroFormulaCell.value.formula, result: menroSum };
    }
    
    console.log(`✅ Excel update completed! Updated ${updatedCellsCount} cells.`);
    
    // Get the updated gross totals (now with formula results)
    const grossTotals = getUpdatedGrossTotals(workbook, file.officeCategory);
    
    return { workbook, grossTotals };
    
  } catch (error) {
    console.error('❌ Error updating Excel:', error);
    alert('Error updating Excel file.');
    return null;
  }
};

// Update the handleCheckFile function - DIRECT TO CHECKED2
const handleCheckFile = async () => {
  console.log('🔵 ========== CHECK FILE STARTED ==========');
  console.log('   Editing enabled:', editingEnabled);
  console.log('   Has changes:', Object.keys(allEmployeeChanges).length > 0);
  console.log('   Current file status:', file?.status);
  
  if (!editingEnabled) {
    console.warn('⚠️ Editing not enabled!');
    alert('⚠️ Please mark this file as received first before checking.');
    return;
  }

  if (!excelData) {
    console.warn('⚠️ No Excel data!');
    alert('Please upload an Excel file first.');
    return;
  }

  setIsSending(true);

  try {
    let updatedWorkbook = null;
    let updatedBase64 = null;
    let grossTotals = null;
    
    if (Object.keys(allEmployeeChanges).length > 0) {
      console.log('🟡 Updating Excel with changes...');
      const result = await updateExcelWithInputs();
      if (!result) {
        console.error('❌ Failed to update Excel workbook');
        alert('Error updating Excel file.');
        setIsSending(false);
        return;
      }
      
      updatedWorkbook = result.workbook;
      grossTotals = result.grossTotals;
      
      console.log('🟡 Converting workbook to base64...');
      const buffer = await updatedWorkbook.xlsx.writeBuffer();
      updatedBase64 = arrayBufferToBase64(buffer);
      console.log(`   Base64 length: ${updatedBase64.length}`);
    }

    // ========== DIRECT TO CHECKED2 - NO PROGRESSION LOGIC ==========
    // Always set status to 'checked2' regardless of current status
    const nextStatus = 'checked2';
    console.log('📌 Setting status to: CHECKED2 (direct)');

    const updateData = {
      timestamp: serverTimestamp(),
      status: nextStatus,
      lastCheckedAt: new Date().toISOString(),
    };
    
    // Add checker information
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Set as second check always (since we're using checked2)
      updateData.secondCheckedBy = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        office: currentUser.office,
        role: currentUser.role
      };
      updateData.secondCheckedAt = serverTimestamp();
      
      // Also set as checked by for compatibility
      updateData.checkedBy = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        office: currentUser.office,
        role: currentUser.role
      };
      updateData.checkedAt = serverTimestamp();
    }
    
    console.log('📦 Update data prepared:', {
      status: updateData.status,
      lastCheckedAt: updateData.lastCheckedAt,
      hasFileData: !!updatedBase64,
      fileDataLength: updatedBase64?.length,
    });

    if (Object.keys(allEmployeeChanges).length > 0) {
      const updatedEmployees = Object.keys(allEmployeeChanges);
      const seniorEmployees = updatedEmployees.filter(name => 
        allEmployeeChanges[name]?.citizenType === 'senior'
      );

      Object.assign(updateData, {
        fileData: updatedBase64,
        updatedEmployees: updatedEmployees,
        seniorEmployees: seniorEmployees,
        originalFileName: file.originalFileName || file.fileName,
        officeGrossTotals: grossTotals
      });
      
      console.log('📝 Updated employees:', updatedEmployees);
      console.log('👴 Senior employees:', seniorEmployees);
      
      if (grossTotals && grossTotals.length > 0) {
        console.log('\n💰 ========== UPDATED GROSS TOTALS ==========');
        grossTotals.forEach(total => {
          console.log(`   ${total.office}: ₱${total.totalGross.toLocaleString()} (from ${total.source})`);
        });
        const totalGross = grossTotals.reduce((sum, t) => sum + (t.totalGross || 0), 0);
        console.log(`   TOTAL: ₱${totalGross.toLocaleString()}`);
        console.log('==========================================\n');
      }
    } else {
      console.log('📝 No changes detected, updating status only');
    }

    console.log('🟢 Updating Firestore document:', file.id);
    await updateDoc(doc(db, 'sentFiles', file.id), updateData);
    console.log('✅ Firestore update successful!');

    let successMessage = `✅ File "${file.fileName}" checked successfully!\n\n`;
    successMessage += `📌 Status updated to: CHECKED2\n`;
    
    if (Object.keys(allEmployeeChanges).length > 0) {
      const updatedEmployees = Object.keys(allEmployeeChanges).join(', ');
      successMessage += `\nUpdated employees: ${updatedEmployees}\n`;
      console.log(`   Updated employees: ${updatedEmployees}`);
      
      if (grossTotals && grossTotals.length > 0) {
        successMessage += `\n📊 Updated Gross Totals:\n`;
        grossTotals.forEach(total => {
          if (total.totalGross > 0) {
            successMessage += `   ${total.office}: ₱${total.totalGross.toLocaleString()}\n`;
          }
        });
      }
      
      const seniorEmployees = Object.keys(allEmployeeChanges).filter(name => 
        allEmployeeChanges[name]?.citizenType === 'senior'
      );
      
      if (seniorEmployees.length > 0) {
        successMessage += `\nSenior Citizens (No GSIS/Pag-IBIG): ${seniorEmployees.join(', ')}`;
        console.log(`   Senior citizens: ${seniorEmployees.join(', ')}`);
      }
    } else {
      successMessage += `No changes detected. File remains as is.`;
    }

    alert(successMessage);
    console.log('🔵 ========== CHECK FILE COMPLETED ==========');
    
    setAllEmployeeChanges({});
    
    setTimeout(() => {
      console.log('🟡 Closing modal...');
      onClose();
    }, 100);
    
  } catch (error) {
    console.error('❌ ========== ERROR IN CHECK FILE ==========');
    console.error('   Error details:', error);
    console.error('   Error stack:', error.stack);
    alert(`❌ Error ${Object.keys(allEmployeeChanges).length > 0 ? 'updating' : 'checking'} file in Firestore. Please try again.`);
    setIsSending(false);
  } finally {
    setIsSending(false);
  }
};
// Add this function at the top of each modal component
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
  // Sa modalSend.jsx, pangitaa ang handleSaveExcel function
const handleSaveExcel = async () => {
  console.log('💾 ========== SAVE EXCEL STARTED ==========');
  console.log('   Custom filename:', customFileName);
  console.log('   Changes to save:', allEmployeeChanges);
  
  if (!customFileName.trim()) {
    alert('Please enter a filename.');
    return;
  }

  console.log('🟡 Updating Excel with changes for save...');
  const result = await updateExcelWithInputs();
  if (!result) {
    console.error('❌ Failed to update Excel workbook');
    alert('Error updating Excel file.');
    return;
  }
  
  const updatedWorkbook = result.workbook;
  const grossTotals = result.grossTotals;

  try {
    console.log('🟡 Writing Excel buffer...');
    const buffer = await updatedWorkbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const finalFileName = customFileName.endsWith('.xlsx') ? customFileName : `${customFileName}.xlsx`;
    console.log(`💾 Saving file as: ${finalFileName}`);
    saveAs(blob, finalFileName);
    
    const updatedEmployees = Object.keys(allEmployeeChanges).join(', ');
    console.log(`✅ Excel file saved! Updated employees: ${updatedEmployees}`);
    
    // Display gross totals summary
    if (grossTotals && grossTotals.length > 0) {
      console.log('\n💰 ========== GROSS TOTALS IN SAVED FILE ==========');
      grossTotals.forEach(total => {
        console.log(`   ${total.office}: ₱${total.totalGross.toLocaleString()} (from ${total.source})`);
      });
      const totalGross = grossTotals.reduce((sum, t) => sum + (t.totalGross || 0), 0);
      console.log(`   TOTAL: ₱${totalGross.toLocaleString()}`);
      console.log('==========================================\n');
    }
    
    alert(`✅ Excel file "${finalFileName}" downloaded successfully!\n\nUpdated employees: ${updatedEmployees}`);
    
    setShowFileNameModal(false);
    console.log('💾 ========== SAVE EXCEL COMPLETED ==========');
  } catch (error) {
    console.error('❌ Error saving file:', error);
    alert('Error saving Excel file.');
  }
};
  // Sa modalSend.jsx, pangitaa ang arrayBufferToBase64 function (around line 615-620)
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  console.log(`   📊 Buffer to Base64: ${len} bytes -> ${base64.length} chars`);
  return base64;
};

  // Filename Modal Component
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
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-auto">
        <div 
          className="bg-gradient-to-br from-[#1a1a2a] to-[#0a0a0f] rounded-2xl shadow-2xl max-w-[98vw] w-full max-h-[95vh] overflow-hidden relative border border-white/5"
          style={{
            boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a',
            zIndex: 100000
          }}
        >
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Loading Excel Data...</h2>
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
  
  // Group employees by section as per payslip.jsx
  const sbEmployees = employeesList.filter(emp => emp.section === 'SB');
  const mtoEmployees = employeesList.filter(emp => emp.section === 'MTO');
  const menroEmployees = employeesList.filter(emp => emp.section === 'MENRO');

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

  const sbTotals = calculateSectionTotals(sbEmployees);
  const mtoTotals = calculateSectionTotals(mtoEmployees);
  const menroTotals = calculateSectionTotals(menroEmployees);

  // Calculate grand totals
  const grandTotals = {
    monthlyRate: sbTotals.monthlyRate + mtoTotals.monthlyRate + menroTotals.monthlyRate,
    amountAccrued: sbTotals.amountAccrued + mtoTotals.amountAccrued + menroTotals.amountAccrued,
    gsisEduLoan: sbTotals.gsisEduLoan + mtoTotals.gsisEduLoan + menroTotals.gsisEduLoan,
    gsisMplLoan: sbTotals.gsisMplLoan + mtoTotals.gsisMplLoan + menroTotals.gsisMplLoan,
    philhealthPersonal: sbTotals.philhealthPersonal + mtoTotals.philhealthPersonal + menroTotals.philhealthPersonal,
    philhealthGovernment: sbTotals.philhealthGovernment + mtoTotals.philhealthGovernment + menroTotals.philhealthGovernment,
    gsisPersonal: sbTotals.gsisPersonal + mtoTotals.gsisPersonal + menroTotals.gsisPersonal,
    gsisGovernment: sbTotals.gsisGovernment + mtoTotals.gsisGovernment + menroTotals.gsisGovernment,
    pagibigPersonal: sbTotals.pagibigPersonal + mtoTotals.pagibigPersonal + menroTotals.pagibigPersonal,
    pagibigGovernment: sbTotals.pagibigGovernment + mtoTotals.pagibigGovernment + menroTotals.pagibigGovernment,
    lbpLoan: sbTotals.lbpLoan + mtoTotals.lbpLoan + menroTotals.lbpLoan,
    gfalLoan: sbTotals.gfalLoan + mtoTotals.gfalLoan + menroTotals.gfalLoan,
    gsisLiteLoan: sbTotals.gsisLiteLoan + mtoTotals.gsisLiteLoan + menroTotals.gsisLiteLoan,
    pagibigMpl: sbTotals.pagibigMpl + mtoTotals.pagibigMpl + menroTotals.pagibigMpl,
    ec: sbTotals.ec + mtoTotals.ec + menroTotals.ec,
    paidInCash: sbTotals.paidInCash + mtoTotals.paidInCash + menroTotals.paidInCash
  };
  // Sa modalSend.jsx, idugang ni nga function (example sa extractOfficeGross pero simplified)
// Sa modalSend.jsx, i-update ang getUpdatedGrossTotals function
const getUpdatedGrossTotals = (workbook, officeCategory) => {
  try {
    console.log('🔍 ========== GETTING UPDATED GROSS TOTALS ==========');
    console.log('   Office Category:', officeCategory);
    
    const worksheet = workbook.getWorksheet(1);
    const results = [];
    
    // For SB/MTO/MENRO category, get totals from specific cells
    if (officeCategory === 'SB/MTO/MENRO') {
      
      // Get SB Total from cell C2 - row index 1, column index 2
      const sbCell = worksheet.getCell('C2');
      console.log('   📍 Cell C2 details:');
      console.log('      - Raw value:', sbCell.value);
      console.log('      - Type:', typeof sbCell.value);
      console.log('      - Has result?', sbCell.value?.result !== undefined);
      
      let sbTotal = 0;
      
      // Check if it's a formula with result
      if (sbCell.value && typeof sbCell.value === 'object' && sbCell.value.result !== undefined) {
        // This is a formula cell with result
        sbTotal = parseFloat(sbCell.value.result);
        console.log(`   ✅ SB Total from C2 (formula result): ₱${sbTotal.toLocaleString()}`);
        console.log(`      Formula: ${sbCell.value.formula}`);
      } 
      // Check if it's a direct number
      else if (typeof sbCell.value === 'number') {
        sbTotal = sbCell.value;
        console.log(`   ✅ SB Total from C2 (number): ₱${sbTotal.toLocaleString()}`);
      } 
      // Check if it's a string that can be parsed
      else if (typeof sbCell.value === 'string') {
        let cleanedValue = sbCell.value.replace(/[₱,]/g, '').trim();
        sbTotal = parseFloat(cleanedValue);
        if (!isNaN(sbTotal)) {
          console.log(`   ✅ SB Total from C2 (string): ₱${sbTotal.toLocaleString()}`);
        }
      }
      
      // Get MTO Total from cell D2 - row index 1, column index 3
      const mtoCell = worksheet.getCell('D2');
      console.log('   📍 Cell D2 details:');
      console.log('      - Raw value:', mtoCell.value);
      console.log('      - Type:', typeof mtoCell.value);
      console.log('      - Has result?', mtoCell.value?.result !== undefined);
      
      let mtoTotal = 0;
      
      if (mtoCell.value && typeof mtoCell.value === 'object' && mtoCell.value.result !== undefined) {
        mtoTotal = parseFloat(mtoCell.value.result);
        console.log(`   ✅ MTO Total from D2 (formula result): ₱${mtoTotal.toLocaleString()}`);
        console.log(`      Formula: ${mtoCell.value.formula}`);
      } else if (typeof mtoCell.value === 'number') {
        mtoTotal = mtoCell.value;
        console.log(`   ✅ MTO Total from D2 (number): ₱${mtoTotal.toLocaleString()}`);
      } else if (typeof mtoCell.value === 'string') {
        let cleanedValue = mtoCell.value.replace(/[₱,]/g, '').trim();
        mtoTotal = parseFloat(cleanedValue);
        if (!isNaN(mtoTotal)) {
          console.log(`   ✅ MTO Total from D2 (string): ₱${mtoTotal.toLocaleString()}`);
        }
      }
      
      // Get MENRO Total from cell C3 - row index 2, column index 2
      const menroCell = worksheet.getCell('C3');
      console.log('   📍 Cell C3 details:');
      console.log('      - Raw value:', menroCell.value);
      console.log('      - Type:', typeof menroCell.value);
      console.log('      - Has result?', menroCell.value?.result !== undefined);
      
      let menroTotal = 0;
      
      if (menroCell.value && typeof menroCell.value === 'object' && menroCell.value.result !== undefined) {
        menroTotal = parseFloat(menroCell.value.result);
        console.log(`   ✅ MENRO Total from C3 (formula result): ₱${menroTotal.toLocaleString()}`);
        console.log(`      Formula: ${menroCell.value.formula}`);
      } else if (typeof menroCell.value === 'number') {
        menroTotal = menroCell.value;
        console.log(`   ✅ MENRO Total from C3 (number): ₱${menroTotal.toLocaleString()}`);
      } else if (typeof menroCell.value === 'string') {
        let cleanedValue = menroCell.value.replace(/[₱,]/g, '').trim();
        menroTotal = parseFloat(cleanedValue);
        if (!isNaN(menroTotal)) {
          console.log(`   ✅ MENRO Total from C3 (string): ₱${menroTotal.toLocaleString()}`);
        }
      }
      
      results.push(
        { office: 'SB', totalGross: sbTotal, source: 'C2 cell (SUM of Amount Accrued for SB employees)' },
        { office: 'MTO', totalGross: mtoTotal, source: 'D2 cell (SUM of Amount Accrued for MTO employees)' },
        { office: 'MENRO', totalGross: menroTotal, source: 'C3 cell (SUM of Amount Accrued for MENRO employee)' }
      );
      
      console.log('\n📊 ========== FINAL GROSS TOTALS (FORMULA RESULTS) ==========');
      console.log(`   🧮 SB TOTAL: ₱${sbTotal.toLocaleString()} (from cell C2)`);
      console.log(`      Formula: =SUM(I15:I26) - Total Amount Accrued for SB employees`);
      console.log(`   🧮 MTO TOTAL: ₱${mtoTotal.toLocaleString()} (from cell D2)`);
      console.log(`      Formula: =SUM(I30:I32) - Total Amount Accrued for MTO employees`);
      console.log(`   🧮 MENRO TOTAL: ₱${menroTotal.toLocaleString()} (from cell C3)`);
      console.log(`      Formula: =SUM(I35) - Total Amount Accrued for MENRO employee`);
      
      const totalAll = sbTotal + mtoTotal + menroTotal;
      console.log(`\n   💰 GRAND TOTAL: ₱${totalAll.toLocaleString()}`);
      console.log('========================================================\n');
      
    } else {
      // For other categories, calculate from employee rows
      console.log('   Other category, calculating from employee rows...');
      // Add calculation logic for other categories if needed
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Error getting gross totals:', error);
    return [];
  }
};

  // The return statement continues with the table - but due to length, I'll show the key changes needed in the table rows
  // In the SB, MTO, and MENRO sections, replace the FormulaCell components for PHILHEALTH, GSIS, and Pag-IBIG with editable versions

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
        
        {/* Modal Header */}
        <div className="relative z-10 px-6 py-3 flex justify-between items-center border-b border-white/5"
          style={{
            background: 'linear-gradient(145deg, #1a1a2a, #0f0f1a)',
          }}
        >
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500"></span>
              Edit Payroll - {file.fileName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-400">Edit payroll data - All columns are now editable</p>
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

        {/* Mark as Received Banner */}
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

        {/* Action Buttons */}
        <div className="relative z-10 px-6 py-2 border-b border-white/5 flex justify-between items-center bg-[#0f0f1a]">
          <div>
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

            {/* MAIN TABLE */}
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
                {/* SB SECTION - UPDATED with editable PHILHEALTH, GSIS, Pag-IBIG */}
                {sbEmployees.map((emp, index) => {
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
                  
                  return (
                    <tr key={`sb-${index}`}>
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
                        <FormulaCell 
                          value={formatNumber(currentValues.amountAccrued)}
                          field="amountAccrued"
                          disabled={true}
                        />
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
                      {/* PHILHEALTH Personal - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.philhealthPersonal)}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* PHILHEALTH Government - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.philhealthGovernment)}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Personal - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.gsisPersonal)}
                          onChange={(e) => handleInputChange(emp.name, 'gsisPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="gsisPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Government - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.gsisGovernment)}
                          onChange={(e) => handleInputChange(emp.name, 'gsisGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="gsisGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Personal - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.pagibigPersonal)}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Government - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.pagibigGovernment)}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigGovernment"
                          disabled={!editingEnabled}
                        />
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
                        <FormulaCell 
                          value={formatNumber(currentValues.paidInCash)}
                          field="paidInCash"
                          disabled={true}
                        />
                      </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"></td>
                    </tr>
                  );
                })}
                
                {/* SB TOTAL ROW */}
                {sbEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 text-right pr-1 align-middle">P</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.pagibigMpl)}</td>
                                        <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"></td>
                  </tr>
                )}
                
                {/* MTO SECTION HEADER */}
                {mtoEmployees.length > 0 && (
                  <tr>
                    <td className="border border-black text-center align-middle font-bold"></td>
                    <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>MTO</td>
                    <td colSpan={21} className="border border-black p-0 align-middle"></td>
                  </tr>
                )}
                
                {/* MTO ROWS - with editable PHILHEALTH, GSIS, Pag-IBIG */}
                {mtoEmployees.map((emp, index) => {
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
                  
                  return (
                    <tr key={`mto-${index}`}>
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
                        <FormulaCell 
                          value={formatNumber(currentValues.amountAccrued)}
                          field="amountAccrued"
                          disabled={true}
                        />
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
                      {/* PHILHEALTH Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.philhealthPersonal)}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* PHILHEALTH Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.philhealthGovernment)}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.gsisPersonal)}
                          onChange={(e) => handleInputChange(emp.name, 'gsisPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="gsisPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.gsisGovernment)}
                          onChange={(e) => handleInputChange(emp.name, 'gsisGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="gsisGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.pagibigPersonal)}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.pagibigGovernment)}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigGovernment"
                          disabled={!editingEnabled}
                        />
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
                        <FormulaCell 
                          value={formatNumber(currentValues.paidInCash)}
                          field="paidInCash"
                          disabled={true}
                        />
                      </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"></td>
                    </tr>
                  );
                })}
                
                {/* MTO TOTAL ROW */}
                {mtoEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 align-middle"></td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbEmployees.length + mtoEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"></td>
                  </tr>
                )}
                
                {/* MENRO SECTION HEADER */}
                {menroEmployees.length > 0 && (
                  <tr>
                    <td className="border border-black text-center align-middle font-bold"></td>
                    <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>MENRO</td>
                    <td colSpan={21} className="border border-black p-0 align-middle"></td>
                  </tr>
                )}
                
                {/* MENRO ROWS - with editable PHILHEALTH, GSIS, Pag-IBIG */}
                {menroEmployees.map((emp, index) => {
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
                  
                  return (
                    <tr key={`menro-${index}`}>
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
                        <FormulaCell 
                          value={formatNumber(currentValues.amountAccrued)}
                          field="amountAccrued"
                          disabled={true}
                        />
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
                      {/* PHILHEALTH Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.philhealthPersonal)}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* PHILHEALTH Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.philhealthGovernment)}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.gsisPersonal)}
                          onChange={(e) => handleInputChange(emp.name, 'gsisPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="gsisPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.gsisGovernment)}
                          onChange={(e) => handleInputChange(emp.name, 'gsisGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="gsisGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.pagibigPersonal)}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={formatNumber(currentValues.pagibigGovernment)}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigGovernment"
                          disabled={!editingEnabled}
                        />
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
                        <FormulaCell 
                          value={formatNumber(currentValues.paidInCash)}
                          field="paidInCash"
                          disabled={true}
                        />
                      </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"></td>
                    </tr>
                  );
                })}
                
                {/* MENRO TOTAL ROW */}
                {menroEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 align-middle"></td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(menroTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbEmployees.length + mtoEmployees.length + menroEmployees.length + 1}</td>
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

            {/* FOOTER AND SIGNATURES SECTION */}
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
                  <div className="text-left pl-80 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>BENITA B. DIPAY</div>
                    <div className="text-left ml-14 pl-72">MENRO</div>
                </div>
                
                <div>
                  <div className="mt-3 ml-4">
                    <div>(4) APPROVED:</div>
                  </div>
                  <div className="mt-11 ml-20 pl-20 pt-2 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>JONNA C. ADAN</div>
                  <div className="ml-7 pl-36">Municipal Mayor</div>
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
                  
                     <div className="font-bold pl-80" style={{ fontSize: `${fontSizes.medium}px` }}>SHIRLITA Y. CHONG</div>
                    <div className="pl-80 ml-3">Municipal Vice-Mayor</div>
                </div>
                
                <div></div>            
                
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
                <div className="font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>DANNIE LYN I. VILLAFLOR</div>
                <div className="pl-3">Municipal Treasurer</div>
              </div>
              
              {/* Bottom Slogan */}
              <div className="pl-80 ml-96 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>
                IPAKITA SA MUNDO, UMAASENSO NA TAYO.
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="relative z-10 border-t border-white/5 px-6 py-3 bg-[#0f0f1a]">
          <div className="text-sm text-gray-400">
            <ul className="list-disc list-inside space-y-1">
              <li><span className="text-orange-400">Click "Mark as Received" button</span> to enable editing</li>
              <li><span className="text-orange-400">Edit white input boxes</span> to change values (when enabled)</li>
              <li><strong className="text-green-400">All columns are now editable!</strong> Including PHILHEALTH, GSIS Premiums, and Pag-IBIG (Personal and Government shares)</li>
              <li><strong className="text-gray-300">Gray boxes are auto-calculated</strong> - Amount Accrued and Paid in Cash</li>
              <li><span className="text-orange-400">Editable loans:</span> GSIS EDUC LOAN, GSIS MPL LOAN, LBP LOAN, GFAL LOAN, GSIS MPL Lite, Pag-IBIG LOAN, E.C.</li>
              <li><span className="text-green-400">💾 Save Excel:</span> Download edited file to computer</li>
              <li><span className="text-orange-400">✓ Check File:</span> Validate file and update in Firestore</li>
              <li><strong className="text-gray-300">Formulas:</strong> Monthly Rate / 2 = Amount Accrued | Monthly Rate × 2.5% = PHILHEALTH (auto) | Monthly Rate × 9% = GSIS Personal (auto) | Monthly Rate × 12% = GSIS Government (auto) | Monthly Rate × 2% = Pag-IBIG Personal (auto) | Pag-IBIG Government = ₱200 (auto) | Paid in Cash = Amount Accrued - All Deductions</li>
              <li><span className="text-blue-400">✏️ Manual override:</span> You can manually edit PHILHEALTH, GSIS Premiums, and Pag-IBIG fields. When Monthly Rate changes, these fields will auto-update unless you've manually edited them.</li>
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

export default ModalSend;
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

const ModalSend_RHU = ({ file, onClose, markedAsReceived, onMarkAsReceived }) => {
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
  // Add this function after the calculatePaidInCash function (around line 280-300)
const getUpdatedGrossTotals = (workbook, officeCategory) => {
  try {
    console.log('🔍 ========== GETTING UPDATED GROSS TOTALS (RHU/MASO/MCR/HRMO) ==========');
    console.log('   Office Category:', officeCategory);
    
    const worksheet = workbook.getWorksheet(1);
    const results = [];
    
    // For RHU/MASO/MCR/HRMO category, get totals from specific cells
    // RHU: C2, MASO: C3, MCR: D2, HRMO: D3
    
    // Get RHU Total from cell C2
    const rhuCell = worksheet.getCell('C2');
    console.log('   📍 Cell C2 (RHU Total) details:');
    console.log('      - Raw value:', rhuCell.value);
    console.log('      - Type:', typeof rhuCell.value);
    console.log('      - Has result?', rhuCell.value?.result !== undefined);
    
    let rhuTotal = 0;
    if (rhuCell.value && typeof rhuCell.value === 'object' && rhuCell.value.result !== undefined) {
      rhuTotal = parseFloat(rhuCell.value.result);
      console.log(`   ✅ RHU Total from C2 (formula result): ₱${rhuTotal.toLocaleString()}`);
      console.log(`      Formula: ${rhuCell.value.formula}`);
    } else if (typeof rhuCell.value === 'number') {
      rhuTotal = rhuCell.value;
      console.log(`   ✅ RHU Total from C2 (number): ₱${rhuTotal.toLocaleString()}`);
    } else if (typeof rhuCell.value === 'string') {
      let cleanedValue = rhuCell.value.replace(/[₱,]/g, '').trim();
      rhuTotal = parseFloat(cleanedValue);
      if (!isNaN(rhuTotal)) {
        console.log(`   ✅ RHU Total from C2 (string): ₱${rhuTotal.toLocaleString()}`);
      }
    }
    
    // Get MASO Total from cell C3
    const masoCell = worksheet.getCell('C3');
    console.log('   📍 Cell C3 (MASO Total) details:');
    console.log('      - Raw value:', masoCell.value);
    console.log('      - Type:', typeof masoCell.value);
    console.log('      - Has result?', masoCell.value?.result !== undefined);
    
    let masoTotal = 0;
    if (masoCell.value && typeof masoCell.value === 'object' && masoCell.value.result !== undefined) {
      masoTotal = parseFloat(masoCell.value.result);
      console.log(`   ✅ MASO Total from C3 (formula result): ₱${masoTotal.toLocaleString()}`);
      console.log(`      Formula: ${masoCell.value.formula}`);
    } else if (typeof masoCell.value === 'number') {
      masoTotal = masoCell.value;
      console.log(`   ✅ MASO Total from C3 (number): ₱${masoTotal.toLocaleString()}`);
    } else if (typeof masoCell.value === 'string') {
      let cleanedValue = masoCell.value.replace(/[₱,]/g, '').trim();
      masoTotal = parseFloat(cleanedValue);
      if (!isNaN(masoTotal)) {
        console.log(`   ✅ MASO Total from C3 (string): ₱${masoTotal.toLocaleString()}`);
      }
    }
    
    // Get MCR Total from cell D2
    const mcrCell = worksheet.getCell('D2');
    console.log('   📍 Cell D2 (MCR Total) details:');
    console.log('      - Raw value:', mcrCell.value);
    console.log('      - Type:', typeof mcrCell.value);
    console.log('      - Has result?', mcrCell.value?.result !== undefined);
    
    let mcrTotal = 0;
    if (mcrCell.value && typeof mcrCell.value === 'object' && mcrCell.value.result !== undefined) {
      mcrTotal = parseFloat(mcrCell.value.result);
      console.log(`   ✅ MCR Total from D2 (formula result): ₱${mcrTotal.toLocaleString()}`);
      console.log(`      Formula: ${mcrCell.value.formula}`);
    } else if (typeof mcrCell.value === 'number') {
      mcrTotal = mcrCell.value;
      console.log(`   ✅ MCR Total from D2 (number): ₱${mcrTotal.toLocaleString()}`);
    } else if (typeof mcrCell.value === 'string') {
      let cleanedValue = mcrCell.value.replace(/[₱,]/g, '').trim();
      mcrTotal = parseFloat(cleanedValue);
      if (!isNaN(mcrTotal)) {
        console.log(`   ✅ MCR Total from D2 (string): ₱${mcrTotal.toLocaleString()}`);
      }
    }
    
    // Get HRMO Total from cell D3
    const hrmoCell = worksheet.getCell('D3');
    console.log('   📍 Cell D3 (HRMO Total) details:');
    console.log('      - Raw value:', hrmoCell.value);
    console.log('      - Type:', typeof hrmoCell.value);
    console.log('      - Has result?', hrmoCell.value?.result !== undefined);
    
    let hrmoTotal = 0;
    if (hrmoCell.value && typeof hrmoCell.value === 'object' && hrmoCell.value.result !== undefined) {
      hrmoTotal = parseFloat(hrmoCell.value.result);
      console.log(`   ✅ HRMO Total from D3 (formula result): ₱${hrmoTotal.toLocaleString()}`);
      console.log(`      Formula: ${hrmoCell.value.formula}`);
    } else if (typeof hrmoCell.value === 'number') {
      hrmoTotal = hrmoCell.value;
      console.log(`   ✅ HRMO Total from D3 (number): ₱${hrmoTotal.toLocaleString()}`);
    } else if (typeof hrmoCell.value === 'string') {
      let cleanedValue = hrmoCell.value.replace(/[₱,]/g, '').trim();
      hrmoTotal = parseFloat(cleanedValue);
      if (!isNaN(hrmoTotal)) {
        console.log(`   ✅ HRMO Total from D3 (string): ₱${hrmoTotal.toLocaleString()}`);
      }
    }
    
    results.push(
      { office: 'RHU', totalGross: rhuTotal, source: 'C2 cell (SUM of Amount Accrued for RHU employees)' },
      { office: 'MASO', totalGross: masoTotal, source: 'C3 cell (SUM of Amount Accrued for MASO employees)' },
      { office: 'MCR', totalGross: mcrTotal, source: 'D2 cell (SUM of Amount Accrued for MCR employees)' },
      { office: 'HRMO', totalGross: hrmoTotal, source: 'D3 cell (SUM of Amount Accrued for HRMO employees)' }
    );
    
    console.log('\n📊 ========== FINAL GROSS TOTALS (FORMULA RESULTS) ==========');
    console.log(`   🧮 RHU TOTAL: ₱${rhuTotal.toLocaleString()} (from cell C2)`);
    console.log(`      Formula: =SUM(Amount Accrued for RHU employees)`);
    console.log(`   🧮 MASO TOTAL: ₱${masoTotal.toLocaleString()} (from cell C3)`);
    console.log(`      Formula: =SUM(Amount Accrued for MASO employees)`);
    console.log(`   🧮 MCR TOTAL: ₱${mcrTotal.toLocaleString()} (from cell D2)`);
    console.log(`      Formula: =SUM(Amount Accrued for MCR employees)`);
    console.log(`   🧮 HRMO TOTAL: ₱${hrmoTotal.toLocaleString()} (from cell D3)`);
    console.log(`      Formula: =SUM(Amount Accrued for HRMO employees)`);
    
    const totalAll = rhuTotal + masoTotal + mcrTotal + hrmoTotal;
    console.log(`\n   💰 GRAND TOTAL: ₱${totalAll.toLocaleString()}`);
    console.log('========================================================\n');
    
    return results;
    
  } catch (error) {
    console.error('❌ Error getting gross totals:', error);
    return [];
  }
};

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
        
        console.log('Excel loaded from base64 data - SB/MTO/MENRO/MASO/LCRO/MSWDO Format');
        
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

  // Extract employee data based on PAYROLL3.xlsx structure
  const extractEmployeeData = (worksheet) => {
    const employees = {};
    
    // Employee rows based on PAYROLL3.xlsx structure
    const employeeRows = [
      // SB/MTO/MENRO Section - Rows 15-21
      15, // MARIA LORENDA B. ROYO - MHO I
      16, // IAN JOHN PAUL B. PANAL - Nurse II
      17, // MARGIE F. BINONDO - Midwife II
      18, // DARLENE C. LILANG - San. Inspector
      19, // NIMFA V. DELA PEÑA - Midwife II
      20, // MAY S. SANTIZAS - Midwife II
      21, // VIBERLYN V. AGAPITO - Midwife I
      
      // MASO Section - Rows 25-28
      25, // NANNETH A. AQUIATAN - Mun. Agriculturist
      26, // MARIA LILIANEE C. DELOSO - Meat Inspector I
      27, // ELLAH MAE N. ABLAS - Agri. Technologist
      28, // DARIUS KARL M. DESTRIZA - Agri. Technologist
      
      // LCRO Section - Rows 32-33
      32, // RAQUEL M. CERO - MCR
      33, // JANINE C. LUPAZ - Reg. Officer I
      
      // MSWDO Section - Rows 37-38
      37, // ANNE MARIE C. SERDAN - MGDH I
      38, // MARY ANN B. HABITAN - HRMA
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
          
          // Determine section based on row number
          let section = '';
          if (row >= 15 && row <= 21) section = 'SB/MTO/MENRO';
          else if (row >= 25 && row <= 28) section = 'MASO';
          else if (row >= 32 && row <= 33) section = 'LCRO';
          else if (row >= 37 && row <= 38) section = 'MSWDO';
          
          employees[employeeName] = {
            row: row,
            name: employeeName,
            section: section,
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

  // ========== CALCULATION LOGIC ==========
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
          philhealthGovernment: newChanges.philhealthGovernment !== undefined ? newChanges.philhealthGovernment : currentData.philhealthGovernment,
          gsisPersonal: newChanges.gsisPersonal !== undefined ? newChanges.gsisPersonal : currentData.gsisPersonal,
          gsisGovernment: newChanges.gsisGovernment !== undefined ? newChanges.gsisGovernment : currentData.gsisGovernment,
          pagibigPersonal: newChanges.pagibigPersonal !== undefined ? newChanges.pagibigPersonal : currentData.pagibigPersonal,
          pagibigGovernment: newChanges.pagibigGovernment !== undefined ? newChanges.pagibigGovernment : currentData.pagibigGovernment,
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

  // Memoized EditableCell component
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

  // FormulaCell component - NOW EDITABLE for PHILHEALTH, GSIS, Pag-IBIG
  // BUT Amount Accrued (H) and Paid in Cash (W) remain DISPLAY-ONLY
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
          {formatNumber(value)}
        </div>
      );
    }
    
    if (disabled) {
      return (
        <div className={`w-full px-1 py-0.5 text-right text-xs ${bgColor} ${className}`}>
          {formatNumber(value)}
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

  // In ModalSend_RHU.jsx - Update the handleMarkAsReceived function
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

 // Replace the updateExcelWithInputs function (around line 430-500) with this updated version
const updateExcelWithInputs = async () => {
  if (!excelData) return null;

  try {
    console.log('🟢 Starting Excel update with inputs...');
    console.log('   Changes to apply:', allEmployeeChanges);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelData.originalData);
    
    const worksheet = workbook.getWorksheet(1);
    let updatedCellsCount = 0;

    Object.keys(allEmployeeChanges).forEach(employeeName => {
      try {
        const changes = allEmployeeChanges[employeeName];
        const employeeRow = employeeData[employeeName]?.row;
        
        console.log(`   📍 Processing employee: ${employeeName}, Row: ${employeeRow}`);
        
        if (!employeeRow) {
          console.warn(`   ⚠️ No row found for employee: ${employeeName}`);
          return;
        }

        // Update all changed fields
        Object.entries(changes).forEach(([field, value]) => {
          let cellAddress;
          switch(field) {
            case 'periodFrom': cellAddress = `E${employeeRow}`; break;
            case 'periodTo': cellAddress = `F${employeeRow}`; break;
            case 'monthlyRate': cellAddress = `G${employeeRow}`; break;
            case 'amountAccrued': cellAddress = `H${employeeRow}`; break;
            case 'gsisEduLoan': cellAddress = `I${employeeRow}`; break;
            case 'gsisMplLoan': cellAddress = `J${employeeRow}`; break;
            case 'philhealthPersonal': cellAddress = `K${employeeRow}`; break;
            case 'philhealthGovernment': cellAddress = `L${employeeRow}`; break;
            case 'gsisPersonal': cellAddress = `M${employeeRow}`; break;
            case 'gsisGovernment': cellAddress = `N${employeeRow}`; break;
            case 'pagibigPersonal': cellAddress = `O${employeeRow}`; break;
            case 'pagibigGovernment': cellAddress = `P${employeeRow}`; break;
            case 'lbpLoan': cellAddress = `Q${employeeRow}`; break;
            case 'gfalLoan': cellAddress = `R${employeeRow}`; break;
            case 'gsisLiteLoan': cellAddress = `S${employeeRow}`; break;
            case 'pagibigMpl': cellAddress = `T${employeeRow}`; break;
            case 'ec': cellAddress = `U${employeeRow}`; break;
            case 'paidInCash': cellAddress = `W${employeeRow}`; break;
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
    console.log('🔄 Recalculating formula cells for RHU/MASO/MCR/HRMO...');
    
    // Get the current values from the updated rows
    // Define row ranges for each section based on PAYROLL3.xlsx
    // RHU employees: rows 15-21
    let rhuSum = 0;
    for (let row = 15; row <= 21; row++) {
      const amountCell = worksheet.getCell(`H${row}`);
      let amount = 0;
      if (amountCell.value && typeof amountCell.value === 'object' && amountCell.value.result !== undefined) {
        amount = parseFloat(amountCell.value.result) || 0;
      } else if (typeof amountCell.value === 'number') {
        amount = amountCell.value;
      } else if (typeof amountCell.value === 'string') {
        amount = parseFloat(amountCell.value) || 0;
      }
      rhuSum += amount;
    }
    console.log(`   📊 RHU Sum (H15:H21): ₱${rhuSum.toLocaleString()}`);
    
    // MASO employees: rows 25-28
    let masoSum = 0;
    for (let row = 25; row <= 28; row++) {
      const amountCell = worksheet.getCell(`H${row}`);
      let amount = 0;
      if (amountCell.value && typeof amountCell.value === 'object' && amountCell.value.result !== undefined) {
        amount = parseFloat(amountCell.value.result) || 0;
      } else if (typeof amountCell.value === 'number') {
        amount = amountCell.value;
      } else if (typeof amountCell.value === 'string') {
        amount = parseFloat(amountCell.value) || 0;
      }
      masoSum += amount;
    }
    console.log(`   📊 MASO Sum (H25:H28): ₱${masoSum.toLocaleString()}`);
    
    // MCR employees: rows 32-33
    let mcrSum = 0;
    for (let row = 32; row <= 33; row++) {
      const amountCell = worksheet.getCell(`H${row}`);
      let amount = 0;
      if (amountCell.value && typeof amountCell.value === 'object' && amountCell.value.result !== undefined) {
        amount = parseFloat(amountCell.value.result) || 0;
      } else if (typeof amountCell.value === 'number') {
        amount = amountCell.value;
      } else if (typeof amountCell.value === 'string') {
        amount = parseFloat(amountCell.value) || 0;
      }
      mcrSum += amount;
    }
    console.log(`   📊 MCR Sum (H32:H33): ₱${mcrSum.toLocaleString()}`);
    
    // HRMO employees: rows 37-38
    let hrmoSum = 0;
    for (let row = 37; row <= 38; row++) {
      const amountCell = worksheet.getCell(`H${row}`);
      let amount = 0;
      if (amountCell.value && typeof amountCell.value === 'object' && amountCell.value.result !== undefined) {
        amount = parseFloat(amountCell.value.result) || 0;
      } else if (typeof amountCell.value === 'number') {
        amount = amountCell.value;
      } else if (typeof amountCell.value === 'string') {
        amount = parseFloat(amountCell.value) || 0;
      }
      hrmoSum += amount;
    }
    console.log(`   📊 HRMO Sum (H37:H38): ₱${hrmoSum.toLocaleString()}`);
    
    // Update the formula cells with new values
    const rhuFormulaCell = worksheet.getCell('C2');
    const masoFormulaCell = worksheet.getCell('C3');
    const mcrFormulaCell = worksheet.getCell('D2');
    const hrmoFormulaCell = worksheet.getCell('D3');
    
    // Set the values directly (ExcelJS will handle the formula)
    if (rhuFormulaCell.value && typeof rhuFormulaCell.value === 'object' && rhuFormulaCell.value.formula) {
      console.log(`   📐 Cell C2 formula: ${rhuFormulaCell.value.formula}`);
      rhuFormulaCell.value = { formula: rhuFormulaCell.value.formula, result: rhuSum };
    }
    
    if (masoFormulaCell.value && typeof masoFormulaCell.value === 'object' && masoFormulaCell.value.formula) {
      console.log(`   📐 Cell C3 formula: ${masoFormulaCell.value.formula}`);
      masoFormulaCell.value = { formula: masoFormulaCell.value.formula, result: masoSum };
    }
    
    if (mcrFormulaCell.value && typeof mcrFormulaCell.value === 'object' && mcrFormulaCell.value.formula) {
      console.log(`   📐 Cell D2 formula: ${mcrFormulaCell.value.formula}`);
      mcrFormulaCell.value = { formula: mcrFormulaCell.value.formula, result: mcrSum };
    }
    
    if (hrmoFormulaCell.value && typeof hrmoFormulaCell.value === 'object' && hrmoFormulaCell.value.formula) {
      console.log(`   📐 Cell D3 formula: ${hrmoFormulaCell.value.formula}`);
      hrmoFormulaCell.value = { formula: hrmoFormulaCell.value.formula, result: hrmoSum };
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
  // Find the handleSaveExcel function and update it
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

  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-[#1a1a2a] to-[#0a0a0f] rounded-2xl shadow-2xl max-w-4xl w-full p-6 relative overflow-hidden border border-white/5">
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Loading Excel Data (SB/MTO/MENRO/MASO/LCRO/MSWDO Format)...</h2>
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
  const sbMtoMenroEmployees = employeesList.filter(emp => emp.section === 'SB/MTO/MENRO');
  const masoEmployees = employeesList.filter(emp => emp.section === 'MASO');
  const lcroEmployees = employeesList.filter(emp => emp.section === 'LCRO');
  const mswdoEmployees = employeesList.filter(emp => emp.section === 'MSWDO');

  // Calculate totals for each section
  const calculateSectionTotals = (sectionEmployees) => {
    return sectionEmployees.reduce((totals, emp) => {
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

  const sbMtoMenroTotals = calculateSectionTotals(sbMtoMenroEmployees);
  const masoTotals = calculateSectionTotals(masoEmployees);
  const lcroTotals = calculateSectionTotals(lcroEmployees);
  const mswdoTotals = calculateSectionTotals(mswdoEmployees);

  // Calculate grand totals
  const grandTotals = {
    monthlyRate: sbMtoMenroTotals.monthlyRate + masoTotals.monthlyRate + lcroTotals.monthlyRate + mswdoTotals.monthlyRate,
    amountAccrued: sbMtoMenroTotals.amountAccrued + masoTotals.amountAccrued + lcroTotals.amountAccrued + mswdoTotals.amountAccrued,
    gsisEduLoan: sbMtoMenroTotals.gsisEduLoan + masoTotals.gsisEduLoan + lcroTotals.gsisEduLoan + mswdoTotals.gsisEduLoan,
    gsisMplLoan: sbMtoMenroTotals.gsisMplLoan + masoTotals.gsisMplLoan + lcroTotals.gsisMplLoan + mswdoTotals.gsisMplLoan,
    philhealthPersonal: sbMtoMenroTotals.philhealthPersonal + masoTotals.philhealthPersonal + lcroTotals.philhealthPersonal + mswdoTotals.philhealthPersonal,
    philhealthGovernment: sbMtoMenroTotals.philhealthGovernment + masoTotals.philhealthGovernment + lcroTotals.philhealthGovernment + mswdoTotals.philhealthGovernment,
    gsisPersonal: sbMtoMenroTotals.gsisPersonal + masoTotals.gsisPersonal + lcroTotals.gsisPersonal + mswdoTotals.gsisPersonal,
    gsisGovernment: sbMtoMenroTotals.gsisGovernment + masoTotals.gsisGovernment + lcroTotals.gsisGovernment + mswdoTotals.gsisGovernment,
    pagibigPersonal: sbMtoMenroTotals.pagibigPersonal + masoTotals.pagibigPersonal + lcroTotals.pagibigPersonal + mswdoTotals.pagibigPersonal,
    pagibigGovernment: sbMtoMenroTotals.pagibigGovernment + masoTotals.pagibigGovernment + lcroTotals.pagibigGovernment + mswdoTotals.pagibigGovernment,
    lbpLoan: sbMtoMenroTotals.lbpLoan + masoTotals.lbpLoan + lcroTotals.lbpLoan + mswdoTotals.lbpLoan,
    gfalLoan: sbMtoMenroTotals.gfalLoan + masoTotals.gfalLoan + lcroTotals.gfalLoan + mswdoTotals.gfalLoan,
    gsisLiteLoan: sbMtoMenroTotals.gsisLiteLoan + masoTotals.gsisLiteLoan + lcroTotals.gsisLiteLoan + mswdoTotals.gsisLiteLoan,
    pagibigMpl: sbMtoMenroTotals.pagibigMpl + masoTotals.pagibigMpl + lcroTotals.pagibigMpl + mswdoTotals.pagibigMpl,
    ec: sbMtoMenroTotals.ec + masoTotals.ec + lcroTotals.ec + mswdoTotals.ec,
    paidInCash: sbMtoMenroTotals.paidInCash + masoTotals.paidInCash + lcroTotals.paidInCash + mswdoTotals.paidInCash
  };

  // Due to the length of the file, the return statement with the table needs to be updated
  // to replace the FormulaCell components for PHILHEALTH, GSIS, and Pag-IBIG with editable versions.
  // Here are the key changes needed in the table rows:

  // In the SB/MTO/MENRO section, replace the PHILHEALTH, GSIS, and Pag-IBIG cells with:
  /*
  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
    <FormulaCell 
      value={currentValues.philhealthPersonal}
      onChange={(e) => handleInputChange(emp.name, 'philhealthPersonal', e.target.value)}
      employeeName={emp.name}
      field="philhealthPersonal"
      disabled={!editingEnabled}
    />
  </td>
  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
    <FormulaCell 
      value={currentValues.philhealthGovernment}
      onChange={(e) => handleInputChange(emp.name, 'philhealthGovernment', e.target.value)}
      employeeName={emp.name}
      field="philhealthGovernment"
      disabled={!editingEnabled}
    />
  </td>
  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
    <FormulaCell 
      value={currentValues.gsisPersonal}
      onChange={(e) => handleInputChange(emp.name, 'gsisPersonal', e.target.value)}
      employeeName={emp.name}
      field="gsisPersonal"
      disabled={!editingEnabled}
    />
  </td>
  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
    <FormulaCell 
      value={currentValues.gsisGovernment}
      onChange={(e) => handleInputChange(emp.name, 'gsisGovernment', e.target.value)}
      employeeName={emp.name}
      field="gsisGovernment"
      disabled={!editingEnabled}
    />
  </td>
  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
    <FormulaCell 
      value={currentValues.pagibigPersonal}
      onChange={(e) => handleInputChange(emp.name, 'pagibigPersonal', e.target.value)}
      employeeName={emp.name}
      field="pagibigPersonal"
      disabled={!editingEnabled}
    />
  </td>
  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
    <FormulaCell 
      value={currentValues.pagibigGovernment}
      onChange={(e) => handleInputChange(emp.name, 'pagibigGovernment', e.target.value)}
      employeeName={emp.name}
      field="pagibigGovernment"
      disabled={!editingEnabled}
    />
  </td>
  */

  // The same changes need to be applied to all sections: MASO, LCRO, MSWDO
  // Amount Accrued (H) and Paid in Cash (W) remain display-only (gray boxes)

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
              SB/MTO/MENRO/MASO/LCRO/HRMO - {file.fileName}
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
                {/* SB/MTO/MENRO ROWS */}
                {sbMtoMenroEmployees.map((emp, index) => {
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
                    <tr key={`sb-${index}`} className={isSeniorRow ? 'bg-orange-50' : ''}>
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
                          value={currentValues.amountAccrued}
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
                          value={currentValues.philhealthPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthPersonal"
                          disabled={!editingEnabled}
                        />
                       </td>
                      {/* PHILHEALTH Government - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.philhealthGovernment}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthGovernment"
                          disabled={!editingEnabled}
                        />
                       </td>
                      {/* GSIS Personal - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.gsisPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'gsisPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="gsisPersonal"
                          disabled={!editingEnabled}
                        />
                       </td>
                      {/* GSIS Government - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.gsisGovernment}
                          onChange={(e) => handleInputChange(emp.name, 'gsisGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="gsisGovernment"
                          disabled={!editingEnabled}
                        />
                       </td>
                      {/* Pag-IBIG Personal - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.pagibigPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigPersonal"
                          disabled={!editingEnabled}
                        />
                       </td>
                      {/* Pag-IBIG Government - Now Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.pagibigGovernment}
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
                          value={currentValues.paidInCash}
                          field="paidInCash"
                          disabled={true}
                        />
                       </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                       </td>
                      <td className="border border-black p-0 align-middle"> </td>
                    </tr>
                  );
                })}
                
                {/* SB/MTO/MENRO TOTAL ROW */}
                {sbMtoMenroEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 text-right pr-1 align-middle">P</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbMtoMenroEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"> </td>
                  </tr>
                )}

                {/* MASO SECTION HEADER */}
                {masoEmployees.length > 0 && (
                  <tr>
                    <td className="border border-black text-center align-middle font-bold"> </td>
                    <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>MASO</td>
                    <td colSpan={21} className="border border-black p-0 align-middle"> </td>
                  </tr>
                )}
                
                {/* MASO ROWS */}
                {masoEmployees.map((emp, index) => {
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
                    <tr key={`maso-${index}`} className={isSeniorRow ? 'bg-orange-50' : ''}>
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
                          value={currentValues.amountAccrued}
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
                          value={currentValues.philhealthPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* PHILHEALTH Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.philhealthGovernment}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.gsisPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'gsisPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="gsisPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.gsisGovernment}
                          onChange={(e) => handleInputChange(emp.name, 'gsisGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="gsisGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.pagibigPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.pagibigGovernment}
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
                          value={currentValues.paidInCash}
                          field="paidInCash"
                          disabled={true}
                        />
                      </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"> </td>
                    </tr>
                  );
                })}
                
                {/* MASO TOTAL ROW */}
                {masoEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 text-right pr-1 align-middle"> </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbMtoMenroEmployees.length + masoEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"> </td>
                  </tr>
                )}

                {/* LCRO SECTION HEADER */}
                {lcroEmployees.length > 0 && (
                  <tr>
                    <td className="border border-black text-center align-middle font-bold"> </td>
                    <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>LCRO</td>
                    <td colSpan={21} className="border border-black p-0 align-middle"> </td>
                  </tr>
                )}
                
                {/* LCRO ROWS */}
                {lcroEmployees.map((emp, index) => {
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
                    <tr key={`lcro-${index}`} className={isSeniorRow ? 'bg-orange-50' : ''}>
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
                          value={currentValues.amountAccrued}
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
                          value={currentValues.philhealthPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* PHILHEALTH Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.philhealthGovernment}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.gsisPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'gsisPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="gsisPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.gsisGovernment}
                          onChange={(e) => handleInputChange(emp.name, 'gsisGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="gsisGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.pagibigPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.pagibigGovernment}
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
                          value={currentValues.paidInCash}
                          field="paidInCash"
                          disabled={true}
                        />
                      </td>
                                            <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"> </td>
                    </tr>
                  );
                })}
                
                {/* LCRO TOTAL ROW */}
                {lcroEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 text-right pr-1 align-middle"> </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbMtoMenroEmployees.length + masoEmployees.length + lcroEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"> </td>
                  </tr>
                )}

                {/* MSWDO SECTION HEADER */}
                {mswdoEmployees.length > 0 && (
                  <tr>
                    <td className="border border-black text-center align-middle font-bold"> </td>
                    <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>HRMO</td>
                    <td colSpan={21} className="border border-black p-0 align-middle"> </td>
                  </tr>
                )}
                
                {/* MSWDO ROWS */}
                {mswdoEmployees.map((emp, index) => {
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
                    <tr key={`mswdo-${index}`} className={isSeniorRow ? 'bg-orange-50' : ''}>
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
                          value={currentValues.amountAccrued}
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
                          value={currentValues.philhealthPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* PHILHEALTH Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.philhealthGovernment}
                          onChange={(e) => handleInputChange(emp.name, 'philhealthGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="philhealthGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.gsisPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'gsisPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="gsisPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* GSIS Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.gsisGovernment}
                          onChange={(e) => handleInputChange(emp.name, 'gsisGovernment', e.target.value)}
                          employeeName={emp.name}
                          field="gsisGovernment"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Personal - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.pagibigPersonal}
                          onChange={(e) => handleInputChange(emp.name, 'pagibigPersonal', e.target.value)}
                          employeeName={emp.name}
                          field="pagibigPersonal"
                          disabled={!editingEnabled}
                        />
                      </td>
                      {/* Pag-IBIG Government - Editable */}
                      <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                        <FormulaCell 
                          value={currentValues.pagibigGovernment}
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
                          value={currentValues.paidInCash}
                          field="paidInCash"
                          disabled={true}
                        />
                      </td>
                      <td className="border border-black text-center p-0 align-middle bg-gray-100" style={{ fontSize: `${fontSizes.number}px` }}>
                        {emp.number}
                      </td>
                      <td className="border border-black p-0 align-middle"> </td>
                    </tr>
                  );
                })}
                
                {/* MSWDO TOTAL ROW */}
                {mswdoEmployees.length > 0 && (
                  <tr className="border border-black text-center align-middle font-bold">
                    <td colSpan={5} className="border border-black p-0 text-right pr-1 align-middle"> </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbMtoMenroEmployees.length + masoEmployees.length + lcroEmployees.length + mswdoEmployees.length + 1}</td>
                    <td className="border border-black p-0 align-middle"> </td>
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
                    <td className="border border-black p-0 align-middle"> </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* FOOTER AND SIGNATURES SECTION - Based on PAYROLL3.xlsx */}
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
                  
                     <div className="font-bold pl-80" style={{ fontSize: `${fontSizes.medium}px` }}>MARIA LORENDA B. ROYO</div>
                    <div className="pl-80 ml-3">Municipal Health Officer I</div>
                </div>
                
                <div>
                  <div className="font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>NANNETH A. AQUIATAN</div>
                  <div className="pl-5 ml-3">Mun. Agriculturist</div>
                  
                  <div className="mt-3 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>ANNE MARIE C. SERDAN</div>
                  <div className="pl-5 ml-3">MGDH I</div>
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

export default ModalSend_RHU;
                      
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SendFile_RHU = () => {
  const navigate = useNavigate();
  const [excelData, setExcelData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [employeeData, setEmployeeData] = useState({});
  const [allEmployeeChanges, setAllEmployeeChanges] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [lastFocusedInput, setLastFocusedInput] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [fileActionType, setFileActionType] = useState('');
  
  // State for office selection
  const [selectedOfficeCategory, setSelectedOfficeCategory] = useState('RHU/MASO/MCR/HRMO');
  const [selectedOffice, setSelectedOffice] = useState('RHU/MASO/MCR/HRMO');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const inputRefs = useRef({});

  // Office categories (for reference)
  const officeCategories = [
    'SB/MTO/MENRO',
    'MDDRMO/MEO/MPDO/MSWDO',
    'RHU/MASO/MCR/HRMO',
    'MAYOR/ACCT/MBO/MASSO'
  ];

  // Automatically open file picker when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialized) {
        setIsInitialized(true);
        document.getElementById('file-upload-rhu').click();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isInitialized]);

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

  // Initialize custom filename when file is uploaded
  useEffect(() => {
    if (fileName) {
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      setCustomFileName(`${baseName}_updated`);
    }
  }, [fileName]);

  // Error boundary
  useEffect(() => {
    const handleError = (error) => {
      console.error('Error caught:', error);
      setHasError(true);
      setErrorMessage(error.message);
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Handle choose file button click
  const handleChooseFileClick = () => {
    document.getElementById('file-upload-rhu').click();
  };

  // Memoized file upload handler
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
          
          const worksheet = workbook.getWorksheet(1);
          
          const employees = extractEmployeeData(worksheet);
          
          setExcelData({
            workbook,
            worksheet,
            originalData: data
          });

          setEmployeeData(employees);
          setAllEmployeeChanges({});
          setHasError(false);
          
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

  const extractEmployeeData = (worksheet) => {
    const employees = {};
    
    // Employee rows based on PAYROLL3.xlsx structure for RHU/MASO/MCR/HRMO
    const employeeRows = [
      // RHU Section - Rows 15-21
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
      
      // MCR Section - Rows 32-33
      32, // RAQUEL M. CERO - MCR
      33, // JANINE C. LUPAZ - Reg. Officer I
      
      // HRMO Section - Rows 37-38
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
          
          employees[employeeName] = {
            row: row,
            name: employeeName,
            designation: getCellValue(worksheet, `D${row}`),
            periodFrom: getCellValue(worksheet, `E${row}`),
            periodTo: getCellValue(worksheet, `F${row}`),
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
            number: getCellValue(worksheet, `A${row}`), // Column A for Number
            isSenior: false
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
        // Handle formula results
        if (cell.value.result) {
          return cell.value.result.toString();
        }
        // Handle rich text
        if (typeof cell.value === 'object' && cell.value.text) {
          return cell.value.text;
        }
        // Handle numbers
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

  // Handle checkbox change for senior citizen status
  const handleCheckboxChange = useCallback((employeeName, isSenior) => {
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
      setHasError(true);
      setErrorMessage(`Error updating senior status: ${error.message}`);
    }
  }, []);

  // Memoized input change handler
  const handleInputChange = useCallback((employeeName, field, value) => {
    try {
      setAllEmployeeChanges(prev => {
        const employeeChanges = prev[employeeName] || {};
        return {
          ...prev,
          [employeeName]: {
            ...employeeChanges,
            [field]: value
          }
        };
      });
    } catch (error) {
      console.error('Error in handleInputChange:', error);
      setHasError(true);
      setErrorMessage(`Error updating ${field}: ${error.message}`);
    }
  }, []);

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

  const calculateAmountAccrued = useCallback((monthlyRate) => {
    try {
      if (monthlyRate) {
        const amount = (parseFloat(monthlyRate) / 2).toFixed(2);
        return parseFloat(amount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
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
          personal: parseFloat(share).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          government: parseFloat(share).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
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
          personal: parseFloat((rate * 0.09).toFixed(2)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          government: parseFloat((rate * 0.12).toFixed(2)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
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
          personal: parseFloat((rate * 0.02).toFixed(2)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
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

  // Memoized EditableCell component
  const EditableCell = useCallback(({ 
    value, 
    onChange, 
    type = 'text', 
    className = '', 
    placeholder = '',
    employeeName,
    field
  }) => {
    const inputKey = `${employeeName}-${field}`;
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    
    // Function to format number with commas
    const formatWithCommas = (numStr) => {
      if (!numStr) return '';
      
      const cleanStr = numStr.replace(/,/g, '');
      
      if (cleanStr === '' || cleanStr === '.') return cleanStr;
      
      const num = parseFloat(cleanStr);
      if (isNaN(num)) return cleanStr;
      
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };
    
    // Function to remove commas for editing
    const removeCommas = (formattedStr) => {
      return formattedStr.replace(/,/g, '');
    };
    
    // Initialize display value
    useEffect(() => {
      if (type === 'number') {
        if (isFocused) {
          setDisplayValue(removeCommas(value || ''));
        } else {
          setDisplayValue(formatWithCommas(value || ''));
        }
      } else {
        setDisplayValue(value || '');
      }
    }, [value, type, isFocused]);
    
    const handleFocus = (e) => {
      try {
        setIsFocused(true);
        setLastFocusedInput({ employeeName, field });
        
        if (type === 'number') {
          const rawValue = removeCommas(value || '');
          setDisplayValue(rawValue);
        }
      } catch (error) {
        console.error('Error in handleFocus:', error);
      }
    };
    
    const handleBlur = (e) => {
      try {
        setIsFocused(false);
        
        if (type === 'number') {
          const formatted = formatWithCommas(displayValue);
          setDisplayValue(formatted);
          
          const rawValue = removeCommas(displayValue);
          if (rawValue !== value) {
            onChange({ target: { value: rawValue } });
          }
        }
      } catch (error) {
        console.error('Error in handleBlur:', error);
      }
    };
    
    const handleChange = (e) => {
      try {
        const inputValue = e.target.value;
        
        if (type === 'number') {
          if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
            setDisplayValue(inputValue);
            onChange({ target: { value: inputValue } });
            setLastFocusedInput({ employeeName, field });
          }
        } else {
          setDisplayValue(inputValue);
          onChange(e);
          setLastFocusedInput({ employeeName, field });
        }
      } catch (error) {
        console.error('Error in handleChange:', error);
        setHasError(true);
        setErrorMessage(`Error updating ${field}: ${error.message}`);
      }
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (type === 'number') {
          const formatted = formatWithCommas(displayValue);
          setDisplayValue(formatted);
          
          const rawValue = removeCommas(displayValue);
          if (rawValue !== value) {
            onChange({ target: { value: rawValue } });
          }
        }
        
        e.target.blur();
      }
      
      if (type === 'number') {
        const allowedKeys = [
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
          '.', 'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight',
          'Home', 'End', 'Enter'
        ];
        
        if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      }
    };
    
    return (
      <input
        ref={el => inputRefs.current[inputKey] = el}
        type="text"
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-200 ${className} ${
          type === 'number' ? 'text-right' : ''
        } ${isFocused ? 'border-blue-500' : ''}`}
        style={{ minWidth: '120px' }}
      />
    );
  }, []);

  // Memoized Checkbox component
  const SeniorCheckbox = useCallback(({ employeeName }) => {
    const citizenType = getCitizenType(employeeName);
    const isSenior = citizenType === 'senior';

    const handleChange = (e) => {
      handleCheckboxChange(employeeName, e.target.checked);
    };

    return (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSenior}
          onChange={handleChange}
          className="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
          title={isSenior ? "Senior Citizen - No GSIS & Pag-IBIG deductions" : "Non-Senior Citizen - With GSIS & Pag-IBIG deductions"}
        />
      </div>
    );
  }, [getCitizenType, handleCheckboxChange]);

  // Memoized DisplayCell component
  const DisplayCell = useCallback(({ value, className = '' }) => {
    const formatNumberWithCommas = (val) => {
      if (!val) return '';
      
      const num = parseFloat(val);
      if (isNaN(num)) return val;
      
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };
    
    const isNumeric = (str) => {
      if (typeof str !== 'string') return false;
      return !isNaN(str) && !isNaN(parseFloat(str));
    };
    
    const displayValue = isNumeric(value) ? formatNumberWithCommas(value) : value;
    
    return (
      <div className={`w-full px-4 py-3 bg-gray-100 rounded-lg text-base font-medium ${className}`}>
        {displayValue}
      </div>
    );
  }, []);

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

  // Show filename modal
  const showFileNameInput = (actionType) => {
    if (Object.keys(allEmployeeChanges).length === 0) {
      alert('No changes to save. Please make changes first.');
      return;
    }

    if (!excelData) {
      alert('Please upload an Excel file first.');
      return;
    }

    const currentUser = getCurrentUser();
    if (actionType === 'send' && !currentUser) {
      alert('You must be logged in to send a file. Please log in first.');
      navigate('/login');
      return;
    }

    setFileActionType(actionType);
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

  // Handle send file with custom filename
  const handleSendFile = async () => {
    if (!customFileName.trim()) {
      alert('Please enter a filename.');
      return;
    }

    const updatedWorkbook = await updateExcelWithInputs();
    if (!updatedWorkbook) {
      alert('Error updating Excel file.');
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
      const buffer = await updatedWorkbook.xlsx.writeBuffer();
      const base64String = arrayBufferToBase64(buffer);
      
      const finalFileName = customFileName.endsWith('.xlsx') ? customFileName : `${customFileName}.xlsx`;
      
      // In the handleSendFile function of SendFile_RHU.jsx, update the fileData object:

const fileData = {
  fileName: finalFileName,
  fileData: base64String,
  timestamp: serverTimestamp(),
  updatedEmployees: Object.keys(allEmployeeChanges),
  seniorEmployees: Object.keys(allEmployeeChanges).filter(name => 
    allEmployeeChanges[name]?.citizenType === 'senior'
  ),
  status: 'sent',
  createdAt: new Date().toISOString(),
  fileSize: base64String.length,
  originalFileName: fileName,
  
  // Office information
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
      console.log('Office selected:', selectedOfficeCategory);
      console.log('Sender info stored:', {
        senderName: currentUser.name,
        senderOffice: currentUser.office,
        senderEmail: currentUser.email
      });
      
      const updatedEmployees = Object.keys(allEmployeeChanges).join(', ');
      const seniorEmployees = Object.keys(allEmployeeChanges).filter(name => 
        allEmployeeChanges[name]?.citizenType === 'senior'
      );
      
      let alertMessage = `✅ File "${finalFileName}" sent successfully to Firestore!\n\n`;
      alertMessage += `Document ID: ${docRef.id}\n`;
      alertMessage += `Office: ${selectedOfficeCategory}\n`;
      alertMessage += `Sender: ${currentUser.name} (${currentUser.office})\n`;
      alertMessage += `Updated employees: ${updatedEmployees}`;
      
      if (seniorEmployees.length > 0) {
        alertMessage += `\n\nSenior Citizens (No GSIS/Pag-IBIG): ${seniorEmployees.join(', ')}`;
      }
      
      alert(alertMessage);
      
      setAllEmployeeChanges({});
      setShowFileNameModal(false);
      navigate('/receive-file');
      
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

  // Filename Modal Component
  const FilenameModal = () => {
    if (!showFileNameModal) return null;

    const isSaveAction = fileActionType === 'save';
    const actionText = isSaveAction ? 'Save Excel File' : 'Send File to Firestore';
    const actionIcon = isSaveAction ? '💾' : '📤';
    const actionButtonText = isSaveAction ? '💾 Download Excel' : '📤 Send to Firestore';
    const actionDescription = isSaveAction 
      ? 'Enter a filename for the Excel file that will be downloaded to your computer.'
      : 'Enter a filename for the Excel file that will be sent to Firestore.';

    const currentUser = getCurrentUser();

    const handleAction = () => {
      if (isSaveAction) {
        handleSaveExcel();
      } else {
        handleSendFile();
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl">{actionIcon}</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{actionText}</h2>
              <p className="text-gray-600 text-sm">{actionDescription}</p>
            </div>
          </div>
          
          {selectedOfficeCategory && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                <span>🏢</span>
                Office Information
              </h3>
              <div className="text-sm">
                <span className="text-gray-600">Selected Office:</span>
                <div className="font-semibold">{selectedOfficeCategory}</div>
              </div>
            </div>
          )}
          
          {!isSaveAction && currentUser && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                <span>👤</span>
                Sender Information
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <div className="font-semibold">{currentUser.name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Office:</span>
                  <div className="font-semibold">{currentUser.office}</div>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <div className="font-semibold">{currentUser.email}</div>
                </div>
                <div>
                  <span className="text-gray-600">Role:</span>
                  <div className="font-semibold">{currentUser.role}</div>
                </div>
              </div>
            </div>
          )}

          {!isSaveAction && !currentUser && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 font-medium">
                ⚠️ You must be logged in to send a file. Please log in first.
              </p>
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-gray-700 text-lg font-semibold mb-3">
              Enter File Name:
            </label>
            <div className="relative">
              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500"
                placeholder="Enter filename (e.g., payroll_rhu_jan2024)"
                autoFocus
              />
              <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                <span className="text-gray-400">📝</span>
                <span>File will be saved as: <span className="font-mono font-bold">{customFileName}.xlsx</span></span>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">💡 Tips:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Use descriptive names like "payroll_rhu_january_2024"</li>
                <li>• Include office and date for easy reference</li>
                <li>• ".xlsx" extension will be added automatically</li>
                <li>• Office: <span className="font-semibold">{selectedOfficeCategory}</span></li>
                {!isSaveAction && (
                  <li>• Sender information will be recorded with the file</li>
                )}
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowFileNameModal(false)}
              className="px-6 py-3 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAction}
              disabled={(isSending && !isSaveAction) || (!isSaveAction && !currentUser)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isSaveAction 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } ${(isSending && !isSaveAction) || (!isSaveAction && !currentUser) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSending && !isSaveAction ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Sending...
                </>
              ) : (
                <>
                  {actionButtonText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Error display
  if (hasError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl">
          <h1 className="text-3xl font-bold text-red-600 mb-4">⚠️ Error Occurred</h1>
          <p className="text-gray-700 mb-6">{errorMessage}</p>
          <div className="space-y-4">
            <button 
              onClick={() => {
                setHasError(false);
                setErrorMessage('');
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={() => {
                setHasError(false);
                setErrorMessage('');
                setExcelData(null);
                setEmployeeData({});
                setAllEmployeeChanges({});
              }}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors ml-4"
            >
              Clear and Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-100 p-6 min-h-screen">
      <FilenameModal />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">RHU/MASO/MCR/HRMO - Payroll Processing</h1>
          <p className="text-gray-600 mt-2">Upload payroll Excel file and update employee data (PAYROLL3.xlsx format)</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleChooseFileClick}
            className="cursor-pointer bg-green-700 text-white px-8 py-4 rounded-lg hover:bg-[#0D3721] transition-colors font-medium shadow-lg text-lg"
          >
            📁 Choose Excel File
          </button>
          <input 
            id="file-upload-rhu" 
            name="file-upload-rhu" 
            type="file" 
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="sr-only" 
          />
        </div>
      </div>

      <div className="max-w-full mx-auto">
        {excelData && Object.keys(employeeData).length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl p-8">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-300">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">PAYROLL3.xlsx Data Table</h2>
                <p className="text-gray-600 mt-2">Office: <span className="font-semibold text-blue-600">{selectedOfficeCategory}</span></p>
              </div>
              <div className="flex gap-6">
                <button 
                  onClick={() => showFileNameInput('save')}
                  className="bg-green-600 text-white px-10 py-4 rounded-xl hover:bg-green-700 transition-colors font-bold shadow-lg flex items-center gap-3 text-lg"
                >
                  💾 Save Excel
                </button>
                <button 
                  onClick={() => showFileNameInput('send')}
                  disabled={isSending}
                  className={`px-10 py-4 rounded-xl transition-colors font-bold shadow-lg flex items-center gap-3 text-lg ${
                    isSending 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSending ? '⏳ Sending...' : '📤 Send File'}
                </button>
              </div>
            </div>

            {/* Main Table - Based on PAYROLL3.xlsx column structure */}
            <div className="overflow-x-auto border-2 border-gray-400 rounded-xl bg-white">
              <table className="min-w-full border-collapse text-base">
                <thead className="bg-green-100">
                  <tr>
                    <th className="border-2 border-gray-500 px-4 py-4 font-extrabold text-gray-900 text-center text-lg" rowSpan="2" style={{ minWidth: '60px' }}>SENIOR</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" rowSpan="2" style={{ minWidth: '80px' }}>NO.</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" rowSpan="2" style={{ minWidth: '200px' }}>NAME</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" rowSpan="2" style={{ minWidth: '180px' }}>DESIGNATION</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" colSpan="2" style={{ minWidth: '300px' }}>PERIOD OF SERVICE</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" rowSpan="2" style={{ minWidth: '150px' }}>MONTHLY RATE</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" rowSpan="2" style={{ minWidth: '150px' }}>AMOUNT ACCRUED</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" colSpan="2" style={{ minWidth: '250px' }}>GSIS LOANS</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" colSpan="2" style={{ minWidth: '250px' }}>PHILHEALTH</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" colSpan="2" style={{ minWidth: '250px' }}>GSIS PREMIUMS</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" colSpan="2" style={{ minWidth: '250px' }}>PAG-IBIG</th>
                    <th className="border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" colSpan="5" style={{ minWidth: '600px' }}>OTHER DEDUCTIONS</th>
                    <th className="bg-green-200 border-2 border-gray-500 px-6 py-4 font-extrabold text-gray-900 text-center text-lg" rowSpan="2" style={{ minWidth: '150px' }}>PAID IN CASH</th>
                  </tr>
                  <tr>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '150px' }}>FROM</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '150px' }}>TO</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '125px' }}>EDUC LOAN</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '125px' }}>MPL LOAN</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '125px' }}>PERSONAL</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '125px' }}>GOVERNMENT</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '125px' }}>PERSONAL</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '125px' }}>GOVERNMENT</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '125px' }}>PERSONAL</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '125px' }}>GOVERNMENT</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '120px' }}>LBP LOAN</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '120px' }}>GFAL LOAN</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '120px' }}>GSIS LITE</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '120px' }}>PAG-IBIG MPL</th>
                    <th className="border-2 border-gray-500 px-5 py-3 font-bold text-gray-800 text-center" style={{ minWidth: '120px' }}>E.C.</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(employeeData).map((employeeName) => {
                    const employee = employeeData[employeeName];
                    const monthlyRate = getEmployeeValue(employeeName, 'monthlyRate');
                    const citizenType = getCitizenType(employeeName);
                    const philhealth = calculatePhilhealth(monthlyRate);
                    const gsisPremiums = calculateGSISPremiums(monthlyRate, citizenType);
                    const pagibig = calculatePagibig(monthlyRate, citizenType);
                    const amountAccrued = calculateAmountAccrued(monthlyRate);

                    const isSeniorRow = citizenType === 'senior';
                    const rowClass = isSeniorRow 
                      ? "hover:bg-blue-50 bg-blue-50 transition-colors duration-200" 
                      : "hover:bg-blue-50 transition-colors duration-200";

                    return (
                      <tr key={employeeName} className={rowClass}>
                        {/* Senior Checkbox */}
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <SeniorCheckbox employeeName={employeeName} />
                        </td>
                        
                        {/* Number - Column A */}
                        <td className="border-2 border-gray-400 px-6 py-4 text-center font-bold bg-green-100 text-lg">
                          {employee.number}
                        </td>
                        
                        {/* Name - Column C */}
                        <td className="border-2 border-gray-400 px-6 py-4 font-bold bg-white text-gray-900 text-lg">
                          {employeeName}
                        </td>
                        
                        {/* Designation - Column D */}
                        <td className="border-2 border-gray-400 px-6 py-4 bg-white text-gray-800">
                          {employee.designation}
                        </td>
                        
                        {/* Period From - Column E */}
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'periodFrom')}
                            onChange={(e) => handleInputChange(employeeName, 'periodFrom', e.target.value)}
                            placeholder="MM/DD/YYYY"
                            className="text-center text-lg"
                            employeeName={employeeName}
                            field="periodFrom"
                          />
                        </td>
                        
                        {/* Period To - Column F */}
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'periodTo')}
                            onChange={(e) => handleInputChange(employeeName, 'periodTo', e.target.value)}
                            placeholder="MM/DD/YYYY"
                            className="text-center text-lg"
                            employeeName={employeeName}
                            field="periodTo"
                          />
                        </td>
                        
                        {/* Monthly Rate - Column G */}
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={monthlyRate}
                            onChange={(e) => handleInputChange(employeeName, 'monthlyRate', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-lg font-medium"
                            employeeName={employeeName}
                            field="monthlyRate"
                          />
                        </td>
                        
                        {/* Amount Accrued - Column H */}
                        <td className="border-2 border-gray-400 p-2 bg-green-100">
                          <DisplayCell value={amountAccrued} className="text-right text-lg font-bold bg-[#ffffff]" />
                        </td>
                        
                        {/* GSIS Loans - Columns I (EDUC) & J (MPL) */}
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'gsisEduLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'gsisEduLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-lg font-medium"
                            employeeName={employeeName}
                            field="gsisEduLoan"
                          />
                        </td>
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'gsisMplLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'gsisMplLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-lg font-medium"
                            employeeName={employeeName}
                            field="gsisMplLoan"
                          />
                        </td>
                        
                        {/* PhilHealth - Columns K (Personal) & L (Government) */}
                        <td className="border-2 border-gray-400 p-2 bg-green-100">
                          <DisplayCell value={philhealth.personal} className="text-right text-lg font-bold bg-[#ffffff]" />
                        </td>
                        <td className="border-2 border-gray-400 p-2 bg-green-100">
                          <DisplayCell value={philhealth.government} className="text-right text-lg font-bold bg-[#ffffff]" />
                        </td>
                        
                        {/* GSIS Premiums - Columns M (Personal) & N (Government) */}
                        <td className="border-2 border-gray-400 p-2 bg-green-100">
                          <DisplayCell 
                            value={gsisPremiums.personal} 
                            className={`text-right text-lg font-bold ${isSeniorRow ? 'text-red-600 line-through' : ''} bg-[#ffffff]`}
                          />
                        </td>
                        <td className="border-2 border-gray-400 p-2 bg-green-100">
                          <DisplayCell 
                            value={gsisPremiums.government} 
                            className={`text-right text-lg font-bold ${isSeniorRow ? 'text-red-600 line-through' : ''} bg-[#ffffff]`}
                          />
                        </td>
                        
                        {/* Pag-IBIG - Columns O (Personal) & P (Government) */}
                        <td className="border-2 border-gray-400 p-2 bg-green-100">
                          <DisplayCell 
                            value={pagibig.personal} 
                            className={`text-right text-lg font-bold ${isSeniorRow ? 'text-red-600 line-through' : ''} bg-[#ffffff]`}
                          />
                        </td>
                        <td className="border-2 border-gray-400 p-2 bg-green-100">
                          <DisplayCell 
                            value={pagibig.government} 
                            className={`text-right text-lg font-bold ${isSeniorRow ? 'text-red-600 line-through' : ''} bg-[#ffffff]`}
                          />
                        </td>
                        
                        {/* Other Deductions - Columns Q through U */}
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'lbpLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'lbpLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-lg font-medium"
                            employeeName={employeeName}
                            field="lbpLoan"
                          />
                        </td>
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'gfalLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'gfalLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-lg font-medium"
                            employeeName={employeeName}
                            field="gfalLoan"
                          />
                        </td>
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'gsisLiteLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'gsisLiteLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-lg font-medium"
                            employeeName={employeeName}
                            field="gsisLiteLoan"
                          />
                        </td>
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'pagibigMpl')}
                            onChange={(e) => handleInputChange(employeeName, 'pagibigMpl', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-lg font-medium"
                            employeeName={employeeName}
                            field="pagibigMpl"
                          />
                        </td>
                        <td className="border-2 border-gray-400 p-2 bg-white">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'ec')}
                            onChange={(e) => handleInputChange(employeeName, 'ec', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-lg font-medium"
                            employeeName={employeeName}
                            field="ec"
                          />
                        </td>
                        
                        {/* Paid in Cash - Column W (Note: No Column V in PAYROLL3.xlsx, skips to W) */}
                        <td className="border-2 border-gray-400 p-2 bg-green-200">
                          <DisplayCell value={employee.paidInCash} className="text-right text-lg font-bold" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Instructions */}
            <div className="mt-10 p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl">
              <h3 className="font-black text-blue-900 mb-4 text-2xl">💡 INSTRUCTIONS:</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-blue-800">
                <div>
                  <h4 className="font-bold mb-3 text-xl">📝 Editing:</h4>
                  <ul className="list-disc list-inside space-y-2 text-lg">
                    <li><strong>Click on any white input box</strong> to edit the value</li>
                    <li><strong>Check the SENIOR checkbox</strong> to exempt from GSIS & Pag-IBIG</li>
                    <li><strong>Gray boxes are auto-calculated</strong> and cannot be edited</li>
                    <li><strong>Numbers automatically format with commas</strong> (e.g., 1,000.00)</li>
                    <li>Press <strong>Enter key</strong> to format number and lose focus</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-3 text-xl">⚡ Actions:</h4>
                  <ul className="list-disc list-inside space-y-2 text-lg">
                    <li><strong>💾 Save Excel:</strong> Downloads file with original Excel formatting</li>
                    <li><strong>📤 Send File:</strong> Shares the updated file via Firestore</li>
                    <li><strong>Office selected:</strong> <span className="font-semibold">{selectedOfficeCategory}</span></li>
                    <li><strong>Sender information will be recorded</strong> with the file</li>
                    <li><strong>Senior Citizen rows</strong> are highlighted in blue</li>
                    <li>All calculations update in <strong>real-time</strong></li>
                    <li><strong>PAYROLL3.xlsx format:</strong> Uses columns G through W</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendFile_RHU;
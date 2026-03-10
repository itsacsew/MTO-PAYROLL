import React, { useState, useCallback, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  MdUpload, 
  MdSave, 
  MdSend, 
  MdClose,
  MdCheckCircle,
  MdWarning,
  MdBusiness,
  MdFolder,
  MdEdit,
  MdCalendarToday,
  MdAttachMoney,
  MdPerson,
  MdArrowBack,
  MdArrowForward,
  MdInfo,
  MdHelp
} from 'react-icons/md';

const SendFile = () => {
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
  const [hoveredCard, setHoveredCard] = useState(null);
  
  // State for office selection
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [selectedOfficeCategory, setSelectedOfficeCategory] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Flag to track if office is selected
  const [isOfficeSelected, setIsOfficeSelected] = useState(false);

  const inputRefs = useRef({});

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
  };

  // Handle choose file button click
  const handleChooseFileClick = () => {
    if (!isOfficeSelected) {
      alert('Please select an office category first.');
      return;
    }

    // For MDDRMO category, navigate to MDDRMO component
    if (selectedOfficeCategory === 'MDDRMO/MEO/MPDO/MSWDO') {
      navigate('/SendFile_MDRRMO');
      return;
    }

    // For RHU category, navigate to RHU component
    if (selectedOfficeCategory === 'RHU/MASO/MCR/HRMO') {
      navigate('/SendFile_RHU');
      return;
    }

    // For MAYOR category, navigate to MAYOR component
    if (selectedOfficeCategory === 'MAYOR/ACCT/MBO/MASSO') {
      navigate('/SendFile_MAYOR');
      return;
    }

    // For other categories (SB/MTO/MENRO), open file picker here
    document.getElementById('file-upload').click();
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

  // Standard extract function for PAYROLL.xlsx
  const extractEmployeeData = (worksheet) => {
    const employees = {};
    
    // Standard employee rows from PAYROLL.xlsx
    const employeeRows = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 30, 31, 32, 35];
    
    employeeRows.forEach(row => {
      try {
        const nameCell = worksheet.getCell(`C${row}`);
        if (nameCell && nameCell.value) {
          const employeeName = nameCell.value.toString().trim();
          
          employees[employeeName] = {
            row: row,
            name: employeeName,
            designation: getCellValue(worksheet, `D${row}`),
            periodFrom: getCellValue(worksheet, `E${row}`),
            periodTo: getCellValue(worksheet, `F${row}`),
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
            number: getCellValue(worksheet, `A${row}`),
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
        if (cell.value.result) {
          return cell.value.result.toString();
        }
        if (typeof cell.value === 'object' && cell.value.text) {
          return cell.value.text;
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
    
    const removeCommas = (formattedStr) => {
      return formattedStr.replace(/,/g, '');
    };
    
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
        className={`w-full px-3 py-2 bg-[#1a2535] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${className} ${
          type === 'number' ? 'text-right' : ''
        } ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
        style={{ 
          minWidth: '100px',
          boxShadow: 'inset 2px 2px 5px #0a0f1a, inset -2px -2px 5px #1e2a3a'
        }}
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
          className="w-5 h-5 rounded bg-[#1a2535] border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-2 cursor-pointer"
          style={{
            boxShadow: 'inset 2px 2px 5px #0a0f1a, inset -2px -2px 5px #1e2a3a'
          }}
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
      <div className={`w-full px-3 py-2 bg-[#1e293b] rounded-lg text-white text-sm font-medium ${className}`}
        style={{
          boxShadow: 'inset 2px 2px 5px #0a0f1a, inset -2px -2px 5px #1e2a3a'
        }}
      >
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

          if (changes.periodFrom !== undefined) {
            const cell = worksheet.getCell(`E${employeeRow}`);
            cell.value = changes.periodFrom;
          }
          
          if (changes.periodTo !== undefined) {
            const cell = worksheet.getCell(`F${employeeRow}`);
            cell.value = changes.periodTo;
          }

          if (changes.monthlyRate !== undefined) {
            const cellH = worksheet.getCell(`H${employeeRow}`);
            cellH.value = parseFloat(changes.monthlyRate) || 0;
            
            const cellI = worksheet.getCell(`I${employeeRow}`);
            const accruedAmount = (parseFloat(changes.monthlyRate) / 2).toFixed(2);
            cellI.value = parseFloat(accruedAmount) || 0;
          }

          if (changes.gsisEduLoan !== undefined) {
            const cell = worksheet.getCell(`J${employeeRow}`);
            cell.value = parseFloat(changes.gsisEduLoan) || 0;
          }
          
          if (changes.gsisMplLoan !== undefined) {
            const cell = worksheet.getCell(`K${employeeRow}`);
            cell.value = parseFloat(changes.gsisMplLoan) || 0;
          }

          const monthlyRate = changes.monthlyRate !== undefined ? changes.monthlyRate : employeeData[employeeName].monthlyRate;
          const philhealthRate = monthlyRate ? parseFloat(monthlyRate) : 0;
          const philhealthShare = (philhealthRate * 0.025).toFixed(2);
          
          const cellL = worksheet.getCell(`L${employeeRow}`);
          const cellM = worksheet.getCell(`M${employeeRow}`);
          cellL.value = parseFloat(philhealthShare) || 0;
          cellM.value = parseFloat(philhealthShare) || 0;

          const gsisRate = monthlyRate ? parseFloat(monthlyRate) : 0;
          const cellN = worksheet.getCell(`N${employeeRow}`);
          const cellO = worksheet.getCell(`O${employeeRow}`);
          
          if (employeeCitizenType === 'non-senior') {
            cellN.value = parseFloat((gsisRate * 0.09).toFixed(2)) || 0;
            cellO.value = parseFloat((gsisRate * 0.12).toFixed(2)) || 0;
          } else {
            cellN.value = 0;
            cellO.value = 0;
          }

          const cellP = worksheet.getCell(`P${employeeRow}`);
          const cellQ = worksheet.getCell(`Q${employeeRow}`);
          
          if (employeeCitizenType === 'non-senior') {
            cellP.value = parseFloat((gsisRate * 0.02).toFixed(2)) || 0;
            cellQ.value = 200.00;
          } else {
            cellP.value = 0;
            cellQ.value = 0;
          }

          if (changes.lbpLoan !== undefined) {
            const cell = worksheet.getCell(`R${employeeRow}`);
            cell.value = parseFloat(changes.lbpLoan) || 0;
          }
          
          if (changes.gfalLoan !== undefined) {
            const cell = worksheet.getCell(`S${employeeRow}`);
            cell.value = parseFloat(changes.gfalLoan) || 0;
          }
          
          if (changes.gsisLiteLoan !== undefined) {
            const cell = worksheet.getCell(`T${employeeRow}`);
            cell.value = parseFloat(changes.gsisLiteLoan) || 0;
          }
          
          if (changes.pagibigMpl !== undefined) {
            const cell = worksheet.getCell(`U${employeeRow}`);
            cell.value = parseFloat(changes.pagibigMpl) || 0;
          }
          
          if (changes.ec !== undefined) {
            const cell = worksheet.getCell(`V${employeeRow}`);
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

    // Add validation for office selection
    if (!selectedOfficeCategory) {
      alert('Please select an office category first.');
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
      
      const updatedEmployees = Object.keys(allEmployeeChanges).join(', ');
      const seniorEmployees = Object.keys(allEmployeeChanges).filter(name => 
        allEmployeeChanges[name]?.citizenType === 'senior'
      );
      
      let alertMessage = `✅ File "${finalFileName}" sent successfully to Firestore!\n\n`;
      alertMessage += `Document ID: ${docRef.id}\n`;
      alertMessage += `Office Category: ${selectedOfficeCategory}\n`;
      alertMessage += `Sender: ${currentUser.name} (${currentUser.office})\n`;
      alertMessage += `Updated employees: ${updatedEmployees}`;
      
      if (seniorEmployees.length > 0) {
        alertMessage += `\n\nSenior Citizens: ${seniorEmployees.join(', ')}`;
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

  // Office Selection Modal Component (without animations)
  const OfficeSelectionModal = () => {
    if (!showOfficeModal) return null;

    return (
      <>
        {/* Simple backdrop - no animation */}
        <div 
          onClick={() => setShowOfficeModal(false)}
          className="fixed inset-0 bg-black/70 z-50"
        />

        {/* Simple modal - no animation */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
              boxShadow: '30px 30px 60px -10px #0a0f1a, -30px -30px 60px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-4 p-6 border-b border-white/5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                  boxShadow: '0 10px 20px -5px rgba(139, 92, 246, 0.3)'
                }}
              >
                <MdBusiness className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Select Office Category</h2>
                <p className="text-gray-400 text-sm mt-1">Choose which office this file belongs to</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {officeCategories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => handleOfficeCategorySelect(category)}
                    className={`p-6 text-left rounded-xl transition-all duration-200 ${
                      selectedOfficeCategory === category
                        ? 'ring-2 ring-blue-500'
                        : ''
                    }`}
                    style={{
                      background: selectedOfficeCategory === category
                        ? 'linear-gradient(145deg, #2563eb20, #1e293b)'
                        : 'linear-gradient(145deg, #1e293b, #0f172a)',
                      boxShadow: selectedOfficeCategory === category
                        ? '15px 15px 30px #0a0f1a, -15px -15px 30px #1e2a3a, 0 0 20px rgba(37, 99, 235, 0.2)'
                        : '10px 10px 20px #0a0f1a, -10px -10px 20px #1e2a3a',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                          boxShadow: '0 5px 15px -5px #3b82f6'
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
                    background: 'linear-gradient(145deg, #2563eb10, #1e293b)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <p className="text-blue-400 flex items-center gap-2">
                    <MdCheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Selected:</span>
                    <span className="text-white">{selectedOfficeCategory}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-4 p-6 border-t border-white/5">
              <button
                onClick={() => setShowOfficeModal(false)}
                className="px-6 py-3 rounded-xl text-gray-300 font-medium"
                style={{
                  background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                  boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
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
                    ? 'linear-gradient(145deg, #10b981, #059669)'
                    : 'linear-gradient(145deg, #374151, #1f2937)',
                  boxShadow: selectedOfficeCategory
                    ? '0 10px 20px -5px #10b981'
                    : '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                }}
              >
                <MdCheckCircle className="w-5 h-5" />
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Filename Modal Component (without animations)
  const FilenameModal = () => {
    if (!showFileNameModal) return null;

    const isSaveAction = fileActionType === 'save';
    const actionIcon = isSaveAction ? <MdSave className="w-6 h-6 text-white" /> : <MdSend className="w-6 h-6 text-white" />;
    const actionButtonText = isSaveAction ? 'Download Excel' : 'Send to Firestore';
    const actionGradient = isSaveAction 
      ? 'linear-gradient(135deg, #10b981, #059669)'
      : 'linear-gradient(135deg, #3b82f6, #8b5cf6)';

    const currentUser = getCurrentUser();

    const handleAction = () => {
      if (isSaveAction) {
        handleSaveExcel();
      } else {
        handleSendFile();
      }
    };

    return (
      <>
        {/* Simple backdrop */}
        <div 
          onClick={() => setShowFileNameModal(false)}
          className="fixed inset-0 bg-black/70 z-50"
        />

        {/* Simple modal */}
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
            <div className="flex items-center gap-4 p-6 border-b border-white/5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: actionGradient, boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.3)' }}
              >
                {actionIcon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {isSaveAction ? 'Save Excel File' : 'Send File'}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {isSaveAction 
                    ? 'Enter a filename for the Excel file'
                    : 'Enter a filename for the file to send'}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Office Information */}
              {selectedOfficeCategory && (
                <div className="p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, #2563eb10, #1e293b)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <MdBusiness className="w-4 h-4" />
                    <span className="text-xs font-semibold">OFFICE</span>
                  </div>
                  <p className="text-white font-medium">{selectedOfficeCategory}</p>
                </div>
              )}

              {/* Sender Information */}
              {!isSaveAction && currentUser && (
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

              {/* Filename Input */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a2535] border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., payroll_january_2024"
                  style={{
                    boxShadow: 'inset 5px 5px 10px #0a0f1a, inset -5px -5px 10px #1e2a3a'
                  }}
                  autoFocus
                />
                <p className="text-gray-500 text-xs mt-2">
                  File will be saved as: <span className="text-blue-400 font-mono">{customFileName || 'filename'}.xlsx</span>
                </p>
              </div>

              {/* Tips */}
              <div className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(145deg, #8b5cf610, #1e293b)',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}
              >
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <MdInfo className="w-4 h-4" />
                  <span className="text-xs font-semibold">TIPS</span>
                </div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Use descriptive names like "payroll_january_2024"</li>
                  <li>• Include office and date for easy reference</li>
                  <li>• .xlsx extension will be added automatically</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-4 p-6 border-t border-white/5">
              <button
                onClick={() => setShowFileNameModal(false)}
                className="px-6 py-3 rounded-xl text-gray-300 font-medium"
                style={{
                  background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                  boxShadow: '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={(isSending && !isSaveAction) || (!isSaveAction && !currentUser)}
                className="px-6 py-3 rounded-xl font-medium flex items-center gap-2 text-white"
                style={{
                  background: actionGradient,
                  boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.3)',
                  opacity: (isSending && !isSaveAction) || (!isSaveAction && !currentUser) ? 0.5 : 1
                }}
              >
                {isSending && !isSaveAction ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    {actionIcon}
                    {actionButtonText}
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
                setExcelData(null);
                setEmployeeData({});
                setAllEmployeeChanges({});
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
      {/* Animated background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        }}
      />

      <OfficeSelectionModal />
      <FilenameModal />

      {/* Header */}
      <div className="relative z-10 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              style={{
                textShadow: '0 2px 5px rgba(0,0,0,0.3)'
              }}
            >
              Payroll File Manager
            </h1>
            <p className="text-gray-400 mt-2">Upload, edit, and send payroll Excel files</p>
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Select Office Button */}
            <button
              onClick={handleSelectOfficeClick}
              className="px-6 py-3 rounded-xl font-medium flex items-center gap-2"
              style={{
                background: isOfficeSelected
                  ? 'linear-gradient(145deg, #8b5cf6, #7c3aed)'
                  : 'linear-gradient(145deg, #1e293b, #0f172a)',
                boxShadow: isOfficeSelected
                  ? '0 10px 20px -5px #8b5cf6'
                  : '10px 10px 20px #0a0f1a, -10px -10px 20px #1e2a3a',
                border: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <MdBusiness className={`w-5 h-5 ${isOfficeSelected ? 'text-white' : 'text-purple-400'}`} />
              <span className={isOfficeSelected ? 'text-white' : 'text-gray-300'}>
                {isOfficeSelected ? selectedOfficeCategory : 'Select Office'}
              </span>
            </button>

            {/* Choose File Button */}
            <button
              onClick={handleChooseFileClick}
              disabled={!isOfficeSelected}
              className="px-6 py-3 rounded-xl font-medium flex items-center gap-2"
              style={{
                background: isOfficeSelected
                  ? 'linear-gradient(145deg, #10b981, #059669)'
                  : 'linear-gradient(145deg, #374151, #1f2937)',
                boxShadow: isOfficeSelected
                  ? '0 10px 20px -5px #10b981'
                  : '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a',
                opacity: isOfficeSelected ? 1 : 0.5,
                border: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <MdUpload className="w-5 h-5 text-white" />
              <span className="text-white">Choose Excel File</span>
            </button>
            
            <input 
              id="file-upload" 
              name="file-upload" 
              type="file" 
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="sr-only" 
            />
          </div>
        </div>

        {/* Office Selection Status */}
        {isOfficeSelected && selectedOfficeCategory && (
          <div className="mt-4 p-4 rounded-xl inline-block"
            style={{
              background: 'linear-gradient(145deg, #2563eb10, #1e293b)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  boxShadow: '0 5px 10px -3px #3b82f6'
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
                }}
                className="ml-4 text-xs text-red-400 hover:text-red-300 font-medium"
              >
                Change
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {excelData && Object.keys(employeeData).length > 0 ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a2535, #0f1a2a)',
              boxShadow: '30px 30px 60px -10px #0a0f1a, -30px -30px 60px -10px #1e2a3a, inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            {/* Table Header with Actions */}
            <div className="p-6 border-b border-white/5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      boxShadow: '0 5px 15px -5px #3b82f6'
                    }}
                  >
                    <MdFolder className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{fileName}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {Object.keys(employeeData).length} employees • {Object.keys(allEmployeeChanges).length} changes
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => showFileNameInput('save')}
                    className="px-6 py-3 rounded-xl font-medium flex items-center gap-2 text-white"
                    style={{
                      background: 'linear-gradient(145deg, #10b981, #059669)',
                      boxShadow: '0 10px 20px -5px #10b981'
                    }}
                  >
                    <MdSave className="w-5 h-5" />
                    Save Excel
                  </button>
                  <button
                    onClick={() => showFileNameInput('send')}
                    disabled={isSending}
                    className="px-6 py-3 rounded-xl font-medium flex items-center gap-2 text-white"
                    style={{
                      background: isSending
                        ? 'linear-gradient(145deg, #6b7280, #4b5563)'
                        : 'linear-gradient(145deg, #3b82f6, #2563eb)',
                      boxShadow: isSending
                        ? '5px 5px 10px #0a0f1a, -5px -5px 10px #1e2a3a'
                        : '0 10px 20px -5px #3b82f6',
                      opacity: isSending ? 0.5 : 1
                    }}
                  >
                    {isSending ? (
                      <>
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <MdSend className="w-5 h-5" />
                        Send File
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  {/* First Header Row */}
                  <tr>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      rowSpan="2">Senior</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      rowSpan="2">No.</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      rowSpan="2">Name</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      rowSpan="2">Designation</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      colSpan="2">Period</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      rowSpan="2">Monthly Rate</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      rowSpan="2">Amount Accrued</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      colSpan="2">GSIS Loans</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      colSpan="2">PhilHealth</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      colSpan="2">GSIS Premiums</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      colSpan="2">Pag-IBIG</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      colSpan="5">Other Deductions</th>
                    <th className="p-3 text-xs font-semibold text-gray-400 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
                      rowSpan="2">Paid in Cash</th>
                  </tr>
                  
                  {/* Second Header Row */}
                  <tr>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>From</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>To</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>Edu</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>MPL</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>Personal</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>Govt</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>Personal</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>Govt</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>Personal</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>Govt</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>LBP</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>GFAL</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>Lite</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>MPL</th>
                    <th className="p-2 text-xs font-medium text-gray-500 text-center border-b border-white/5"
                      style={{ background: 'linear-gradient(145deg, #1a2535, #0f1a2a)' }}>E.C.</th>
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

                    return (
                      <tr key={employeeName} className={isSeniorRow ? 'bg-blue-500/5' : ''}>
                        <td className="p-2 border-b border-white/5">
                          <SeniorCheckbox employeeName={employeeName} />
                        </td>
                        <td className="p-2 text-center text-white border-b border-white/5">{employee.number}</td>
                        <td className="p-2 text-white border-b border-white/5">{employeeName}</td>
                        <td className="p-2 text-gray-300 border-b border-white/5">{employee.designation}</td>
                        
                        {/* Period From */}
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'periodFrom')}
                            onChange={(e) => handleInputChange(employeeName, 'periodFrom', e.target.value)}
                            placeholder="MM/DD/YYYY"
                            className="text-center text-xs"
                            employeeName={employeeName}
                            field="periodFrom"
                          />
                        </td>
                        
                        {/* Period To */}
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'periodTo')}
                            onChange={(e) => handleInputChange(employeeName, 'periodTo', e.target.value)}
                            placeholder="MM/DD/YYYY"
                            className="text-center text-xs"
                            employeeName={employeeName}
                            field="periodTo"
                          />
                        </td>
                        
                        {/* Monthly Rate */}
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={monthlyRate}
                            onChange={(e) => handleInputChange(employeeName, 'monthlyRate', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-xs"
                            employeeName={employeeName}
                            field="monthlyRate"
                          />
                        </td>
                        
                        {/* Amount Accrued */}
                        <td className="p-1 border-b border-white/5">
                          <DisplayCell value={amountAccrued} className="text-right text-xs" />
                        </td>
                        
                        {/* GSIS Loans */}
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'gsisEduLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'gsisEduLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-xs"
                            employeeName={employeeName}
                            field="gsisEduLoan"
                          />
                        </td>
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'gsisMplLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'gsisMplLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-xs"
                            employeeName={employeeName}
                            field="gsisMplLoan"
                          />
                        </td>
                        
                        {/* PhilHealth */}
                        <td className="p-1 border-b border-white/5">
                          <DisplayCell value={philhealth.personal} className="text-right text-xs" />
                        </td>
                        <td className="p-1 border-b border-white/5">
                          <DisplayCell value={philhealth.government} className="text-right text-xs" />
                        </td>
                        
                        {/* GSIS Premiums */}
                        <td className="p-1 border-b border-white/5">
                          <DisplayCell 
                            value={gsisPremiums.personal} 
                            className={`text-right text-xs ${isSeniorRow ? 'text-red-400 line-through' : ''}`}
                          />
                        </td>
                        <td className="p-1 border-b border-white/5">
                          <DisplayCell 
                            value={gsisPremiums.government} 
                            className={`text-right text-xs ${isSeniorRow ? 'text-red-400 line-through' : ''}`}
                          />
                        </td>
                        
                        {/* Pag-IBIG */}
                        <td className="p-1 border-b border-white/5">
                          <DisplayCell 
                            value={pagibig.personal} 
                            className={`text-right text-xs ${isSeniorRow ? 'text-red-400 line-through' : ''}`}
                          />
                        </td>
                        <td className="p-1 border-b border-white/5">
                          <DisplayCell 
                            value={pagibig.government} 
                            className={`text-right text-xs ${isSeniorRow ? 'text-red-400 line-through' : ''}`}
                          />
                        </td>
                        
                        {/* Other Deductions */}
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'lbpLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'lbpLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-xs"
                            employeeName={employeeName}
                            field="lbpLoan"
                          />
                        </td>
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'gfalLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'gfalLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-xs"
                            employeeName={employeeName}
                            field="gfalLoan"
                          />
                        </td>
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'gsisLiteLoan')}
                            onChange={(e) => handleInputChange(employeeName, 'gsisLiteLoan', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-xs"
                            employeeName={employeeName}
                            field="gsisLiteLoan"
                          />
                        </td>
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'pagibigMpl')}
                            onChange={(e) => handleInputChange(employeeName, 'pagibigMpl', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-xs"
                            employeeName={employeeName}
                            field="pagibigMpl"
                          />
                        </td>
                        <td className="p-1 border-b border-white/5">
                          <EditableCell
                            value={getEmployeeValue(employeeName, 'ec')}
                            onChange={(e) => handleInputChange(employeeName, 'ec', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-right text-xs"
                            employeeName={employeeName}
                            field="ec"
                          />
                        </td>
                        
                        {/* Paid in Cash */}
                        <td className="p-2 border-b border-white/5">
                          <DisplayCell value={employee.paidInCash} className="text-right text-xs" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Instructions */}
            <div className="p-6 border-t border-white/5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <MdEdit className="w-4 h-4" />
                    Editing Tips
                  </h3>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Click on white input boxes to edit values</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Check Senior checkbox to exempt from GSIS & Pag-IBIG</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Gray boxes are auto-calculated and cannot be edited</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <MdHelp className="w-4 h-4" />
                    Actions
                  </h3>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      <span>Save Excel: Downloads file with your changes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      <span>Send File: Shares the updated file via Firestore</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      <span>Senior Citizen rows are highlighted in blue</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Empty State
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
            
            <h2 className="text-2xl font-bold text-white mb-2">No File Uploaded</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {isOfficeSelected 
                ? 'Click "Choose Excel File" to upload a payroll Excel file and start editing.'
                : 'Please select an office category first, then upload your Excel file.'}
            </p>

            {!isOfficeSelected && (
              <button
                onClick={handleSelectOfficeClick}
                className="px-8 py-4 rounded-xl font-medium inline-flex items-center gap-2 text-white mx-auto"
                style={{
                  background: 'linear-gradient(145deg, #8b5cf6, #7c3aed)',
                  boxShadow: '0 10px 20px -5px #8b5cf6'
                }}
              >
                <MdBusiness className="w-5 h-5" />
                Select Office First
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SendFile;
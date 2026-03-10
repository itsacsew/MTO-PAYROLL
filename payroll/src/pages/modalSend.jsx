import React, { useState, useCallback, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

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

  // Function to check if a row contains actual employee data with valid designation
  const isValidEmployeeRow = (row, rowNumber) => {
    try {
      const nameCell = row.getCell(3); // Column C
      const designationCell = row.getCell(4); // Column D
      
      if (!nameCell || !nameCell.value) return false;
      if (!designationCell || !designationCell.value) return false;
      
      const employeeName = nameCell.value.toString().trim();
      const designation = designationCell.value.toString().trim();
      
      // Skip if name or designation is empty or too short
      if (!employeeName || employeeName.length < 2) return false;
      if (!designation || designation.length < 2) return false;
      
      // Skip headers and section markers
      if (employeeName === 'NAME' || 
          employeeName.includes('MTO') || 
          employeeName.includes('MENRO') ||
          employeeName.includes('SB') ||
          employeeName === 'MTO' ||
          employeeName === 'MENRO') {
        return false;
      }
      
      // Skip total rows and carried forward
      if (employeeName.toLowerCase().includes('total') ||
          employeeName.toLowerCase().includes('carried forward')) {
        return false;
      }
      
      // Skip rows that are likely not employees (like signature text, certifications, etc.)
      if (employeeName.includes('CERTIFY') ||
          employeeName.includes('APPROVED') ||
          employeeName.includes('PREAUDIT') ||
          employeeName.includes('MUNICIPAL') ||
          employeeName.includes('TREASURER') ||
          employeeName.includes('MAYOR') ||
          employeeName.includes('AUDITOR') ||
          employeeName.includes('VICE-MAYOR') ||
          employeeName.includes('PAYROLL') ||
          employeeName.includes('MUNICIPALITY') ||
          employeeName.includes('LILOAN') ||
          employeeName.includes('IPAKITA')) {
        return false;
      }
      
      // Check if designation looks like a valid job title (not a placeholder or empty)
      if (designation.includes('_____') || 
          designation.includes('____') || 
          designation.includes('___') ||
          designation === '-' ||
          designation.length < 3) {
        return false;
      }
      
      // Check if the row has some numeric values in key columns (likely an employee row)
      const monthlyRate = row.getCell(8)?.value; // Column H
      const amountAccrued = row.getCell(9)?.value; // Column I
      
      // If it has monthly rate or amount accrued, it's definitely an employee
      if (monthlyRate || amountAccrued) {
        return true;
      }
      
      // Check if name has proper format (has at least one space for full name)
      if (!employeeName.includes(' ') && employeeName.length > 15) return false;
      
      return true; // Accept if it passed all other checks
    } catch (error) {
      return false;
    }
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
    
    // Get all rows that contain valid employee data
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      try {
        // Start checking from row 10 onwards (skip very top rows)
        if (rowNumber < 10) return;
        
        if (isValidEmployeeRow(row, rowNumber)) {
          const nameCell = row.getCell(3); // Column C
          const designationCell = row.getCell(4); // Column D
          
          const employeeName = nameCell.value.toString().trim();
          const designation = designationCell.value.toString().trim();
          
          // Double-check we don't already have this employee
          if (employees[employeeName]) return;
          
          // Only add if both name and designation are valid
          if (employeeName && employeeName.length > 2 && designation && designation.length > 2) {
            employees[employeeName] = {
              row: rowNumber,
              name: employeeName,
              number: getCellValue(worksheet, `A${rowNumber}`),
              designation: designation,
              periodFrom: formatDate(getCellRawValue(worksheet, `E${rowNumber}`)),
              periodTo: formatDate(getCellRawValue(worksheet, `F${rowNumber}`)),
              monthlyRate: getCellValue(worksheet, `H${rowNumber}`),
              amountAccrued: getCellValue(worksheet, `I${rowNumber}`),
              gsisEduLoan: getCellValue(worksheet, `J${rowNumber}`),
              gsisMplLoan: getCellValue(worksheet, `K${rowNumber}`),
              philhealthPersonal: getCellValue(worksheet, `L${rowNumber}`),
              philhealthGovernment: getCellValue(worksheet, `M${rowNumber}`),
              gsisPersonal: getCellValue(worksheet, `N${rowNumber}`),
              gsisGovernment: getCellValue(worksheet, `O${rowNumber}`),
              pagibigPersonal: getCellValue(worksheet, `P${rowNumber}`),
              pagibigGovernment: getCellValue(worksheet, `Q${rowNumber}`),
              lbpLoan: getCellValue(worksheet, `R${rowNumber}`),
              gfalLoan: getCellValue(worksheet, `S${rowNumber}`),
              gsisLiteLoan: getCellValue(worksheet, `T${rowNumber}`),
              pagibigMpl: getCellValue(worksheet, `U${rowNumber}`),
              ec: getCellValue(worksheet, `V${rowNumber}`),
              paidInCash: getCellValue(worksheet, `X${rowNumber}`),
            };
          }
        }
      } catch (error) {
        console.error(`Error extracting data for row ${rowNumber}:`, error);
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

  // Handle input change
  const handleInputChange = useCallback((employeeName, field, value) => {
    if (!editingEnabled) {
      alert('⚠️ Please mark this file as received first before editing.');
      return;
    }

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
    }
  }, [editingEnabled]);

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
        className={`w-full px-1 py-0.5 border ${disabled ? 'bg-gray-100 border-gray-200 text-gray-500' : 'border-blue-300 bg-white'} rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 text-right ${className}`}
        style={{ minWidth: '60px', height: '22px' }}
      />
    );
  }, []);

  // DisplayCell component for non-editable cells
  const DisplayCell = useCallback(({ value, className = '' }) => (
    <div className={`w-full px-1 py-0.5 text-right text-xs ${className}`}>
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

          if (changes.number !== undefined) {
            const cell = worksheet.getCell(`A${employeeRow}`);
            cell.value = changes.number;
          }
          
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
          
          cellN.value = parseFloat((gsisRate * 0.09).toFixed(2)) || 0;
          cellO.value = parseFloat((gsisRate * 0.12).toFixed(2)) || 0;

          const cellP = worksheet.getCell(`P${employeeRow}`);
          const cellQ = worksheet.getCell(`Q${employeeRow}`);
          
          cellP.value = parseFloat((gsisRate * 0.02).toFixed(2)) || 0;
          cellQ.value = 200.00;

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
        status: 'checked',
        lastCheckedAt: new Date().toISOString(),
      };

      if (Object.keys(allEmployeeChanges).length > 0) {
        const buffer = await updatedWorkbook.xlsx.writeBuffer();
        const base64String = arrayBufferToBase64(buffer);
        
        const updatedEmployees = Object.keys(allEmployeeChanges);

        Object.assign(updateData, {
          fileData: base64String,
          updatedEmployees: updatedEmployees,
          status: 'updated',
          originalFileName: file.originalFileName || file.fileName
        });
      }

      await updateDoc(doc(db, 'sentFiles', file.id), updateData);

      let successMessage = `✅ File "${file.fileName}" checked successfully!\n\n`;
      
      if (Object.keys(allEmployeeChanges).length > 0) {
        const updatedEmployees = Object.keys(allEmployeeChanges).join(', ');
        successMessage += `Updated employees: ${updatedEmployees}\n`;
      } else {
        successMessage += `No changes detected. File remains as is.`;
      }

      alert(successMessage);
      
      if (Object.keys(allEmployeeChanges).length === 0) {
        setAllEmployeeChanges({});
        onClose();
      } else {
        setAllEmployeeChanges({});
      }
      
    } catch (error) {
      console.error('Error checking/updating file in Firestore:', error);
      alert(`❌ Error ${Object.keys(allEmployeeChanges).length > 0 ? 'updating' : 'checking'} file in Firestore. Please try again.`);
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

  // Filename Modal Component
  const FilenameModal = () => {
    if (!showFileNameModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">💾</div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Save Excel File</h2>
              <p className="text-gray-600 text-sm">Enter a filename for the Excel file that will be downloaded to your computer.</p>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Enter File Name:
            </label>
            <input
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
              placeholder="Enter filename"
              autoFocus
            />
            <div className="text-sm text-gray-500 mt-1">
              File will be saved as: <span className="font-mono font-bold">{customFileName}.xlsx</span>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowFileNameModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveExcel}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              💾 Download Excel
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!file || !excelData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Loading Excel Data...</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading file data...</p>
          </div>
        </div>
      </div>
    );
  }

  const employeesList = Object.values(employeeData);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
      <FilenameModal />
      
      <div className="bg-white rounded-lg shadow-xl max-w-[98vw] w-full max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-blue-600 text-white px-6 py-3 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Edit Payroll - {file.fileName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-blue-200">Showing only employees with valid names and designations</p>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                editingEnabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {editingEnabled ? '✓ Editable' : 'Read-only'}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Paper Size and Orientation Controls */}
        <div className="bg-gray-100 px-6 py-2 border-b flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Paper Size:</label>
            <select 
              value={paperSize} 
              onChange={(e) => setPaperSize(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="A3">A3 (297 × 420 mm)</option>
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
              <option value="Legal">Legal (8.5 × 14 in)</option>
              <option value="Tabloid">Tabloid (11 × 17 in)</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Orientation:</label>
            <div className="flex">
              <button
                onClick={() => setOrientation("portrait")}
                className={`px-3 py-1 text-sm border ${orientation === "portrait" ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                Portrait
              </button>
              <button
                onClick={() => setOrientation("landscape")}
                className={`px-3 py-1 text-sm border ${orientation === "landscape" ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                Landscape
              </button>
            </div>
          </div>
          
          <div className="flex-1"></div>
          
          <span className="text-sm text-gray-600">
            Employees: <span className="font-bold">{employeesList.length}</span>
          </span>
        </div>

        {/* Mark as Received Banner - SHOWN ONLY WHEN NOT MARKED */}
        {!editingEnabled && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-1.5 rounded-full">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-yellow-800 text-sm">File Not Ready for Editing</h3>
                  <p className="text-xs text-yellow-700">You need to mark this file as received before you can edit it.</p>
                </div>
              </div>
              <button
                onClick={handleMarkAsReceived}
                className="bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mark as Received
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-gray-50 px-6 py-2 border-b flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-600">
              Changes: <span className="font-bold">{Object.keys(allEmployeeChanges).length}</span> employee(s)
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={showFileNameInput}
              disabled={!editingEnabled}
              className={`px-4 py-1.5 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${
                editingEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
            >
              💾 Save Excel
            </button>
            <button 
              onClick={handleCheckFile}
              disabled={!editingEnabled || isSending}
              className={`px-4 py-1.5 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${
                editingEnabled
                  ? (isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white')
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-1"></span>
                  Checking...
                </>
              ) : (
                '✓ Check File'
              )}
            </button>
          </div>
        </div>

        {/* Main Payslip Container */}
        <div 
          className="bg-white mx-auto overflow-auto p-4"
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

            {/* MAIN TABLE - Only shows actual employee data with valid designations */}
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
                {employeesList.map((emp, index) => (
                  <tr key={`emp-${index}`}>
                    <td className="border border-black text-center align-middle" style={{ padding: '2px 2px', fontSize: `${fontSizes.number}px` }}>
                      <EditableCell
                        value={getEmployeeValue(emp.name, 'number')}
                        onChange={(e) => handleInputChange(emp.name, 'number', e.target.value)}
                        type="text"
                        className="text-center"
                        employeeName={emp.name}
                        field="number"
                        disabled={!editingEnabled}
                      />
                    </td>
                    <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                    <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>
                      <EditableCell
                        value={getEmployeeValue(emp.name, 'periodFrom')}
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
                        value={getEmployeeValue(emp.name, 'periodTo')}
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
                        value={getEmployeeValue(emp.name, 'monthlyRate')}
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
                      <DisplayCell value={emp.amountAccrued} />
                    </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                      <EditableCell
                        value={getEmployeeValue(emp.name, 'gsisEduLoan')}
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
                        value={getEmployeeValue(emp.name, 'gsisMplLoan')}
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
                      <DisplayCell value={emp.philhealthPersonal} />
                    </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                      <DisplayCell value={emp.philhealthGovernment} />
                    </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                      <DisplayCell value={emp.gsisPersonal} />
                    </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                      <DisplayCell value={emp.gsisGovernment} />
                    </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                      <DisplayCell value={emp.pagibigPersonal} />
                    </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>
                      <DisplayCell value={emp.pagibigGovernment} />
                    </td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                      <EditableCell
                        value={getEmployeeValue(emp.name, 'gsisLiteLoan')}
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
                        value={getEmployeeValue(emp.name, 'lbpLoan')}
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
                        value={getEmployeeValue(emp.name, 'gfalLoan')}
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
                        value={getEmployeeValue(emp.name, 'pagibigMpl')}
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
                        value={getEmployeeValue(emp.name, 'ec')}
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
                      <DisplayCell value={emp.paidInCash} />
                    </td>
                    <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>
                      <EditableCell
                        value={getEmployeeValue(emp.name, 'number')}
                        onChange={(e) => handleInputChange(emp.name, 'number', e.target.value)}
                        type="text"
                        className="text-center"
                        employeeName={emp.name}
                        field="number"
                        disabled={!editingEnabled}
                      />
                    </td>
                    <td className="border border-black p-0 align-middle"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* FOOTER AND SIGNATURES SECTION - Completely outside the table */}
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
        <div className="border-t border-gray-300 px-6 py-3 bg-gray-50">
          <div className="text-sm text-gray-600">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Click "Mark as Received" button</strong> to enable editing</li>
              <li><strong>Edit white input boxes</strong> to change values (when enabled)</li>
              <li><strong>Gray boxes are from Excel (non-editable)</strong></li>
              <li><strong>💾 Save Excel:</strong> Download edited file to computer</li>
              <li><strong>✓ Check File:</strong> Validate file and update in Firestore</li>
              <li><strong>Note:</strong> Only employees with valid names AND designations are shown in the table</li>
            </ul>
          </div>
          {!editingEnabled && (
            <div className="mt-3 p-2 bg-yellow-100 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 text-sm font-medium">
                ⚠️ <strong>Note:</strong> You must click <strong>"Mark as Received"</strong> before you can edit or check this file.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalSend;
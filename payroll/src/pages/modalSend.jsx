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
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [fileActionType, setFileActionType] = useState('');
  
  // New state for editing control
  const [editingEnabled, setEditingEnabled] = useState(markedAsReceived || false);
  
  const inputRefs = useRef({});

  // Load Excel data from base64
  useEffect(() => {
    if (!file?.fileData) return;

    const loadExcelFromBase64 = async () => {
      try {
        // Convert base64 back to ArrayBuffer
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
      setHasError(true);
      setErrorMessage(`Error updating senior status: ${error.message}`);
    }
  }, [editingEnabled]);

  // Memoized input change handler
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
      setHasError(true);
      setErrorMessage(`Error updating ${field}: ${error.message}`);
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
      
      try {
        setLastFocusedInput({ employeeName, field });
      } catch (error) {
        console.error('Error in handleFocus:', error);
      }
    };

    const handleChange = (e) => {
      if (disabled) return;
      
      try {
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
      } catch (error) {
        console.error('Error in handleChange:', error);
        setHasError(true);
        setErrorMessage(`Error updating ${field}: ${error.message}`);
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
        className={`w-full px-3 py-2 border-2 ${disabled ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300 text-gray-900'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 ${className}`}
        style={{ minWidth: '100px' }}
        title={disabled ? "Mark file as received to enable editing" : ""}
      />
    );
  }, []);

  // Memoized Checkbox component
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
          className={`w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          title={disabled ? "Mark file as received to enable editing" : (isSenior ? "Senior Citizen - No GSIS & Pag-IBIG deductions" : "Non-Senior Citizen - With GSIS & Pag-IBIG deductions")}
        />
      </div>
    );
  }, [getCitizenType, handleCheckboxChange]);

  // Memoized DisplayCell component
  const DisplayCell = useCallback(({ value, className = '' }) => (
    <div className={`w-full px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium ${className}`}>
      {value}
    </div>
  ), []);

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

  // Handle Check button click (formerly Update in Firestore)
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
      
      // If there are changes, update the Excel with inputs
      if (Object.keys(allEmployeeChanges).length > 0) {
        updatedWorkbook = await updateExcelWithInputs();
        if (!updatedWorkbook) {
          alert('Error updating Excel file.');
          setIsSending(false);
          return;
        }
      }

      // Prepare the data to update in Firestore
      const updateData = {
        timestamp: serverTimestamp(),
        status: 'checked',
        lastCheckedAt: new Date().toISOString(),
      };

      // If there are changes, include them in the update
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
          status: 'updated',
          originalFileName: file.originalFileName || file.fileName
        });
      }

      // Update the document in Firestore
      await updateDoc(doc(db, 'sentFiles', file.id), updateData);

      // Show success message
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
      
      // Reset changes and close modal if no changes were made
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

  // Show filename modal for Save Excel only
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

    setFileActionType('save');
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

  // Filename Modal Component (only for Save Excel)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <FilenameModal />
      
      <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Assessment - {file.fileName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-blue-200">Edit payroll data and save changes</p>
              <span className={`px-2 py-1 rounded-full text-xs ${
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

        {/* Mark as Received Banner - SHOWN ONLY WHEN NOT MARKED */}
        {!editingEnabled && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-yellow-800">File Not Ready for Editing</h3>
                  <p className="text-sm text-yellow-700">You need to mark this file as received before you can edit it.</p>
                </div>
              </div>
              <button
                onClick={handleMarkAsReceived}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
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
        <div className="bg-gray-50 px-6 py-3 border-b flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-600">
              Changes: <span className="font-bold">{Object.keys(allEmployeeChanges).length}</span> employee(s)
            </span>
            
          </div>
          <div className="flex gap-3">
            <button 
              onClick={showFileNameInput}
              disabled={!editingEnabled}
              className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                editingEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
              title={!editingEnabled ? "Mark file as received to enable saving" : ""}
            >
              💾 Save Excel
            </button>
            <button 
              onClick={handleCheckFile}
              disabled={!editingEnabled || isSending}
              className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                editingEnabled
                  ? (isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white')
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
              title={!editingEnabled ? "Mark file as received to enable checking" : ""}
            >
              {isSending ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Checking...
                </>
              ) : (
                '✓ Check File'
              )}
            </button>
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-auto max-h-[calc(90vh-8rem)] p-4">
          <div className="min-w-max">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '50px' }}>SENIOR</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '60px' }}>NO.</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900" style={{ minWidth: '150px' }}>NAME</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900" style={{ minWidth: '120px' }}>DESIGNATION</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '100px' }}>FROM</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '100px' }}>TO</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '100px' }}>MONTHLY RATE</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '100px' }}>AMOUNT ACCRUED</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>EDU LOAN</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>MPL LOAN</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>PHILHEALTH P</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>PHILHEALTH G</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>GSIS P</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>GSIS G</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>PAG-IBIG P</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>PAG-IBIG G</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>LBP LOAN</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>GFAL LOAN</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>GSIS LITE</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>PAG-IBIG MPL</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>E.C.</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold text-gray-900 text-center" style={{ minWidth: '80px' }}>PAID IN CASH</th>
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
                    ? "hover:bg-blue-50 bg-blue-50" 
                    : "hover:bg-gray-50";

                  return (
                    <tr key={employeeName} className={rowClass}>
                      <td className="border border-gray-300 p-1 bg-white">
                        <SeniorCheckbox employeeName={employeeName} disabled={!editingEnabled} />
                      </td>
                      
                      <td className="border border-gray-300 px-2 py-1 text-center bg-gray-100">
                        {employee.number}
                      </td>
                      
                      <td className="border border-gray-300 px-2 py-1 font-medium">
                        {employeeName}
                      </td>
                      
                      <td className="border border-gray-300 px-2 py-1">
                        {employee.designation}
                      </td>
                      
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={getEmployeeValue(employeeName, 'periodFrom')}
                          onChange={(e) => handleInputChange(employeeName, 'periodFrom', e.target.value)}
                          placeholder="MM/DD/YYYY"
                          className="text-center"
                          employeeName={employeeName}
                          field="periodFrom"
                          disabled={!editingEnabled}
                        />
                      </td>
                      
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={getEmployeeValue(employeeName, 'periodTo')}
                          onChange={(e) => handleInputChange(employeeName, 'periodTo', e.target.value)}
                          placeholder="MM/DD/YYYY"
                          className="text-center"
                          employeeName={employeeName}
                          field="periodTo"
                          disabled={!editingEnabled}
                        />
                      </td>
                      
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={monthlyRate}
                          onChange={(e) => handleInputChange(employeeName, 'monthlyRate', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={employeeName}
                          field="monthlyRate"
                          disabled={!editingEnabled}
                        />
                      </td>
                      
                      <td className="border border-gray-300 p-1 bg-gray-100">
                        <DisplayCell value={amountAccrued} className="text-right" />
                      </td>
                      
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={getEmployeeValue(employeeName, 'gsisEduLoan')}
                          onChange={(e) => handleInputChange(employeeName, 'gsisEduLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={employeeName}
                          field="gsisEduLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={getEmployeeValue(employeeName, 'gsisMplLoan')}
                          onChange={(e) => handleInputChange(employeeName, 'gsisMplLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={employeeName}
                          field="gsisMplLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      
                      <td className="border border-gray-300 p-1 bg-gray-100">
                        <DisplayCell value={philhealth.personal} className="text-right" />
                      </td>
                      <td className="border border-gray-300 p-1 bg-gray-100">
                        <DisplayCell value={philhealth.government} className="text-right" />
                      </td>
                      
                      <td className="border border-gray-300 p-1 bg-gray-100">
                        <DisplayCell 
                          value={gsisPremiums.personal} 
                          className={`text-right ${isSeniorRow ? 'text-red-600 line-through' : ''}`}
                        />
                      </td>
                      <td className="border border-gray-300 p-1 bg-gray-100">
                        <DisplayCell 
                          value={gsisPremiums.government} 
                          className={`text-right ${isSeniorRow ? 'text-red-600 line-through' : ''}`}
                        />
                      </td>
                      
                      <td className="border border-gray-300 p-1 bg-gray-100">
                        <DisplayCell 
                          value={pagibig.personal} 
                          className={`text-right ${isSeniorRow ? 'text-red-600 line-through' : ''}`}
                        />
                      </td>
                      <td className="border border-gray-300 p-1 bg-gray-100">
                        <DisplayCell 
                          value={pagibig.government} 
                          className={`text-right ${isSeniorRow ? 'text-red-600 line-through' : ''}`}
                        />
                      </td>
                      
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={getEmployeeValue(employeeName, 'lbpLoan')}
                          onChange={(e) => handleInputChange(employeeName, 'lbpLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={employeeName}
                          field="lbpLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={getEmployeeValue(employeeName, 'gfalLoan')}
                          onChange={(e) => handleInputChange(employeeName, 'gfalLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={employeeName}
                          field="gfalLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={getEmployeeValue(employeeName, 'gsisLiteLoan')}
                          onChange={(e) => handleInputChange(employeeName, 'gsisLiteLoan', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={employeeName}
                          field="gsisLiteLoan"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={getEmployeeValue(employeeName, 'pagibigMpl')}
                          onChange={(e) => handleInputChange(employeeName, 'pagibigMpl', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={employeeName}
                          field="pagibigMpl"
                          disabled={!editingEnabled}
                        />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <EditableCell
                          value={getEmployeeValue(employeeName, 'ec')}
                          onChange={(e) => handleInputChange(employeeName, 'ec', e.target.value)}
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          employeeName={employeeName}
                          field="ec"
                          disabled={!editingEnabled}
                        />
                      </td>
                      
                      <td className="border border-gray-300 p-1 bg-gray-100">
                        <DisplayCell value={employee.paidInCash} className="text-right" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t border-gray-300 px-6 py-4 bg-gray-50">
          <h3 className="font-bold text-gray-800 mb-2">💡 Instructions:</h3>
          <div className="text-sm text-gray-600 grid grid-cols-2 gap-4">
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Click "Mark as Received" button</strong> to enable editing</li>
                <li><strong>Edit white input boxes</strong> to change values (when enabled)</li>
                <li><strong>Check SENIOR checkbox</strong> for no GSIS/Pag-IBIG</li>
                <li><strong>Gray boxes are auto-calculated</strong></li>
              </ul>
            </div>
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>💾 Save Excel:</strong> Download edited file to computer</li>
                <li><strong>✓ Check File:</strong> Validate file and update in Firestore (auto-updates if changes exist)</li>
                <li><strong>Senior Citizen rows</strong> are highlighted in blue</li>
              </ul>
            </div>
          </div>
          {!editingEnabled && (
            <div className="mt-3 p-3 bg-yellow-100 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 font-medium">
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
import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase'; // Import Firebase
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const FileSend = () => {
  const navigate = useNavigate();
  const [excelData, setExcelData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [citizenType, setCitizenType] = useState('non-senior');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeData, setEmployeeData] = useState({});
  const [userInputs, setUserInputs] = useState({
    periodFrom: '',
    periodTo: '',
    monthlyRate: '',
    gsisEduLoan: '',
    gsisMplLoan: '',
    lbpLoan: '',
    gfalLoan: '',
    gsisLiteLoan: '',
    pagibigMpl: '',
    ec: ''
  });
  
  const [allEmployeeChanges, setAllEmployeeChanges] = useState({});
  const [isSending, setIsSending] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

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
        
        if (Object.keys(employees).length > 0) {
          const firstEmployee = Object.keys(employees)[0];
          setSelectedEmployee(firstEmployee);
          prefillDataFromExcel(employees[firstEmployee]);
        }
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading Excel file. Please make sure it\'s a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const extractEmployeeData = (worksheet) => {
    const employees = {};
    
    const employeeRows = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 30, 31, 32, 35];
    
    employeeRows.forEach(row => {
      const nameCell = worksheet.getCell(`C${row}`);
      if (nameCell && nameCell.value) {
        const employeeName = nameCell.value.toString().trim();
        
        employees[employeeName] = {
          row: row,
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
          ec: getCellValue(worksheet, `V${row}`)
        };
      }
    });
    
    return employees;
  };

  const getCellValue = (worksheet, cellAddress) => {
    const cell = worksheet.getCell(cellAddress);
    if (cell && cell.value !== null && cell.value !== undefined) {
      return cell.value.toString();
    }
    return '';
  };

  const handleEmployeeChange = (employeeName) => {
    setSelectedEmployee(employeeName);
    if (employeeData[employeeName]) {
      if (allEmployeeChanges[employeeName]) {
        setUserInputs(allEmployeeChanges[employeeName]);
      } else {
        prefillDataFromExcel(employeeData[employeeName]);
      }
    }
  };

  const prefillDataFromExcel = (employee) => {
    const inputs = {
      periodFrom: employee.periodFrom || '',
      periodTo: employee.periodTo || '',
      monthlyRate: employee.monthlyRate || '',
      gsisEduLoan: employee.gsisEduLoan || '',
      gsisMplLoan: employee.gsisMplLoan || '',
      lbpLoan: employee.lbpLoan || '',
      gfalLoan: employee.gfalLoan || '',
      gsisLiteLoan: employee.gsisLiteLoan || '',
      pagibigMpl: employee.pagibigMpl || '',
      ec: employee.ec || ''
    };

    setUserInputs(inputs);
  };

  const handleInputChange = (field, value) => {
    setUserInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveCurrentEmployee = () => {
    if (!selectedEmployee) {
      alert('Please select an employee first.');
      return;
    }

    setAllEmployeeChanges(prev => ({
      ...prev,
      [selectedEmployee]: { ...userInputs, citizenType }
    }));

    alert(`Changes saved for ${selectedEmployee}! You can continue editing other employees.`);
  };

  const calculateAmountAccrued = () => {
    if (userInputs.monthlyRate) {
      return (parseFloat(userInputs.monthlyRate) / 2).toFixed(2);
    }
    return '';
  };

  const calculatePhilhealth = () => {
    if (userInputs.monthlyRate) {
      const rate = parseFloat(userInputs.monthlyRate);
      const share = (rate * 0.025).toFixed(2);
      return {
        personal: share,
        government: share
      };
    }
    return { 
      personal: '0.00', 
      government: '0.00' 
    };
  };

  const calculateGSISPremiums = () => {
    const employeeCitizenType = allEmployeeChanges[selectedEmployee]?.citizenType || citizenType;
    if (userInputs.monthlyRate && employeeCitizenType === 'non-senior') {
      const rate = parseFloat(userInputs.monthlyRate);
      return {
        personal: (rate * 0.09).toFixed(2),
        government: (rate * 0.12).toFixed(2)
      };
    }
    return { 
      personal: '0.00', 
      government: '0.00' 
    };
  };

  const calculatePagibig = () => {
    const employeeCitizenType = allEmployeeChanges[selectedEmployee]?.citizenType || citizenType;
    if (userInputs.monthlyRate && employeeCitizenType === 'non-senior') {
      const rate = parseFloat(userInputs.monthlyRate);
      return {
        personal: (rate * 0.02).toFixed(2),
        government: '200.00'
      };
    }
    return { 
      personal: '0.00', 
      government: '0.00' 
    };
  };

  const updateExcelWithInputs = async () => {
    if (!excelData) return null;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelData.originalData);
      
      const worksheet = workbook.getWorksheet(1);

      Object.keys(allEmployeeChanges).forEach(employeeName => {
        const changes = allEmployeeChanges[employeeName];
        const employeeRow = employeeData[employeeName].row;
        const employeeCitizenType = changes.citizenType;

        if (changes.periodFrom) {
          const cell = worksheet.getCell(`E${employeeRow}`);
          cell.value = changes.periodFrom;
        }
        
        if (changes.periodTo) {
          const cell = worksheet.getCell(`F${employeeRow}`);
          cell.value = changes.periodTo;
        }

        if (changes.monthlyRate) {
          const cellH = worksheet.getCell(`H${employeeRow}`);
          cellH.value = parseFloat(changes.monthlyRate);
          
          const cellI = worksheet.getCell(`I${employeeRow}`);
          const accruedAmount = (parseFloat(changes.monthlyRate) / 2).toFixed(2);
          cellI.value = parseFloat(accruedAmount);
        }

        if (changes.gsisEduLoan) {
          const cell = worksheet.getCell(`J${employeeRow}`);
          cell.value = parseFloat(changes.gsisEduLoan);
        }
        
        if (changes.gsisMplLoan) {
          const cell = worksheet.getCell(`K${employeeRow}`);
          cell.value = parseFloat(changes.gsisMplLoan);
        }

        const philhealthRate = changes.monthlyRate ? parseFloat(changes.monthlyRate) : 0;
        const philhealthShare = (philhealthRate * 0.025).toFixed(2);
        const cellL = worksheet.getCell(`L${employeeRow}`);
        const cellM = worksheet.getCell(`M${employeeRow}`);
        cellL.value = parseFloat(philhealthShare);
        cellM.value = parseFloat(philhealthShare);

        const gsisRate = changes.monthlyRate ? parseFloat(changes.monthlyRate) : 0;
        const cellN = worksheet.getCell(`N${employeeRow}`);
        const cellO = worksheet.getCell(`O${employeeRow}`);
        if (employeeCitizenType === 'non-senior') {
          cellN.value = parseFloat((gsisRate * 0.09).toFixed(2));
          cellO.value = parseFloat((gsisRate * 0.12).toFixed(2));
        } else {
          cellN.value = 0;
          cellO.value = 0;
        }

        const cellP = worksheet.getCell(`P${employeeRow}`);
        const cellQ = worksheet.getCell(`Q${employeeRow}`);
        if (employeeCitizenType === 'non-senior') {
          cellP.value = parseFloat((gsisRate * 0.02).toFixed(2));
          cellQ.value = 200.00;
        } else {
          cellP.value = 0;
          cellQ.value = 0;
        }

        if (changes.lbpLoan) {
          const cell = worksheet.getCell(`R${employeeRow}`);
          cell.value = parseFloat(changes.lbpLoan);
        }
        
        if (changes.gfalLoan) {
          const cell = worksheet.getCell(`S${employeeRow}`);
          cell.value = parseFloat(changes.gfalLoan);
        }
        
        if (changes.gsisLiteLoan) {
          const cell = worksheet.getCell(`T${employeeRow}`);
          cell.value = parseFloat(changes.gsisLiteLoan);
        }
        
        if (changes.pagibigMpl) {
          const cell = worksheet.getCell(`U${employeeRow}`);
          cell.value = parseFloat(changes.pagibigMpl);
        }
        
        if (changes.ec) {
          const cell = worksheet.getCell(`V${employeeRow}`);
          cell.value = parseFloat(changes.ec);
        }
      });

      return workbook;
    } catch (error) {
      console.error('Error updating Excel:', error);
      alert('Error updating Excel file.');
      return null;
    }
  };

  const handleSaveExcel = async () => {
    if (Object.keys(allEmployeeChanges).length === 0) {
      alert('No changes to save. Please make changes and click "Save" first.');
      return;
    }

    const updatedWorkbook = await updateExcelWithInputs();
    if (!updatedWorkbook) {
      alert('Please upload an Excel file first.');
      return;
    }

    try {
      const buffer = await updatedWorkbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const newFileName = fileName.replace('.xlsx', '_updated.xlsx') || 'payroll_updated.xlsx';
      saveAs(blob, newFileName);
      
      const updatedEmployees = Object.keys(allEmployeeChanges).join(', ');
      alert(`Excel file downloaded successfully!\n\nUpdated employees: ${updatedEmployees}`);
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving Excel file.');
    }
  };

  // SEND FILE TO FIRESTORE - FIXED VERSION
  const handleSendFile = async () => {
    if (Object.keys(allEmployeeChanges).length === 0) {
      alert('No changes to send. Please make changes and click "Save" first.');
      return;
    }

    const updatedWorkbook = await updateExcelWithInputs();
    if (!updatedWorkbook) {
      alert('Please upload an Excel file first.');
      return;
    }

    setIsSending(true);

    try {
      // Convert workbook to buffer
      const buffer = await updatedWorkbook.xlsx.writeBuffer();
      
      // Convert buffer to base64 string
      const base64String = arrayBufferToBase64(buffer);
      
      const newFileName = fileName.replace('.xlsx', '_sent.xlsx') || 'payroll_sent.xlsx';
      
      console.log('Sending file to Firestore...', {
        fileName: newFileName,
        fileSize: base64String.length,
        updatedEmployees: Object.keys(allEmployeeChanges)
      });

      // Save file data to Firestore
      const docRef = await addDoc(collection(db, 'sentFiles'), {
        fileName: newFileName,
        fileData: base64String, // Store as base64 string
        timestamp: serverTimestamp(),
        updatedEmployees: Object.keys(allEmployeeChanges),
        status: 'sent',
        createdAt: new Date().toISOString(),
        fileSize: base64String.length,
        originalFileName: fileName
      });

      console.log('File successfully sent to Firestore with ID:', docRef.id);
      
      const updatedEmployees = Object.keys(allEmployeeChanges).join(', ');
      alert(`✅ File sent successfully to Firestore!\n\nDocument ID: ${docRef.id}\nUpdated employees: ${updatedEmployees}`);
      
      // Reset form and navigate
      setAllEmployeeChanges({});
      navigate('/receive-file');
      
    } catch (error) {
      console.error('Error sending file to Firestore:', error);
      alert('❌ Error sending file to Firestore. Please check your Firebase configuration and try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Helper function to convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const InputField = ({ label, value, onChange, field, type = 'text', placeholder = '', readOnly = false }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          readOnly ? 'bg-gray-100' : ''
        }`}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header Section with File Upload Button on the right */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Send File - Payroll Processing</h1>
          <p className="text-gray-600 mt-2">Upload payroll Excel file and update employee data</p>
        </div>
        <div className="flex items-center gap-4">
          {fileName && (
            <p className="text-sm text-green-600">Selected: {fileName}</p>
          )}
          <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Choose Excel File
          </label>
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

      <div className="max-w-7xl mx-auto">
        {/* Show form and actions only when file is uploaded */}
        {excelData && Object.keys(employeeData).length > 0 && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Employee Information Form */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Update Employee Payroll Information</h2>
                
                {Object.keys(allEmployeeChanges).length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      <strong>Saved changes for:</strong> {Object.keys(allEmployeeChanges).join(', ')}
                    </p>
                  </div>
                )}

                <p className="text-sm text-green-600 mb-6">
                  
                </p>
                
                {/* Select Employee and Citizen Type side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Employee
                    </label>
                    <select 
                      value={selectedEmployee}
                      onChange={(e) => handleEmployeeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.keys(employeeData).map(employeeName => (
                        <option key={employeeName} value={employeeName}>
                          {employeeName} (Row {employeeData[employeeName].row})
                          {allEmployeeChanges[employeeName] && ' ✓'}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-600 mt-1">
                      Currently editing: <strong>{selectedEmployee}</strong> (Row {employeeData[selectedEmployee]?.row})
                      {allEmployeeChanges[selectedEmployee] && ' - Changes saved ✓'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Citizen Type
                    </label>
                    <select 
                      value={citizenType}
                      onChange={(e) => setCitizenType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="non-senior">Non-Senior Citizen</option>
                      <option value="senior">Senior Citizen</option>
                    </select>
                    <p className="text-sm text-gray-600 mt-1">
                      {citizenType === 'senior' 
                        ? 'Senior Citizen: PhilHealth deductions only (No GSIS, No Pag-IBIG)' 
                        : 'Non-Senior Citizen: All deductions apply (PhilHealth, GSIS, Pag-IBIG)'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">PERIOD OF SERVICE (Inclusive Dates)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                         label={<strong>From</strong>}
                        value={userInputs.periodFrom}
                        onChange={handleInputChange}
                        field="periodFrom"
                        placeholder="MM/DD/YYYY"
                      />
                      <InputField
                       label={<strong>To</strong>}
                        value={userInputs.periodTo}
                        onChange={handleInputChange}
                        field="periodTo"
                        placeholder="MM/DD/YYYY"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label={`Monthly Rate of Pay (Cell H${employeeData[selectedEmployee]?.row})`}
                      value={userInputs.monthlyRate}
                      onChange={handleInputChange}
                      field="monthlyRate"
                      type="number"
                      placeholder="0.00"
                    />
                    <InputField
                      label={`Amount Accrued for the Period (Cell I${employeeData[selectedEmployee]?.row}) - Auto-calculated`}
                      value={calculateAmountAccrued()}
                      onChange={() => {}}
                      field="amountAccrued"
                      readOnly={true}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label={`GSIS EDUC LOAN (Cell J${employeeData[selectedEmployee]?.row})`}
                      value={userInputs.gsisEduLoan}
                      onChange={handleInputChange}
                      field="gsisEduLoan"
                      type="number"
                      placeholder="0.00"
                    />
                    <InputField
                      label={`GSIS MPL LOAN (Cell K${employeeData[selectedEmployee]?.row})`}
                      value={userInputs.gsisMplLoan}
                      onChange={handleInputChange}
                      field="gsisMplLoan"
                      type="number"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Deductions ({citizenType === 'senior' ? 'Senior Citizen - PhilHealth Only' : 'Non-Senior Citizen - All Deductions'})
                  </h3>
                  
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-3">
                      PHILHEALTH (Required for Both)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label={`Personal Share (Cell L${employeeData[selectedEmployee]?.row})`}
                        value={calculatePhilhealth().personal}
                        onChange={() => {}}
                        field="philhealthPersonal"
                        readOnly={true}
                      />
                      <InputField
                        label={`Government Share (Cell M${employeeData[selectedEmployee]?.row})`}
                        value={calculatePhilhealth().government}
                        onChange={() => {}}
                        field="philhealthGovernment"
                        readOnly={true}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-3">
                      GSIS PREMIUMS {citizenType === 'senior' ? '(Not Applicable for Senior Citizen)' : '(For Non-Senior Citizen)'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label={`Personal Share 9% (Cell N${employeeData[selectedEmployee]?.row})`}
                        value={calculateGSISPremiums().personal}
                        onChange={() => {}}
                        field="gsisPersonal"
                        readOnly={true}
                      />
                      <InputField
                        label={`Government Share 12% (Cell O${employeeData[selectedEmployee]?.row})`}
                        value={calculateGSISPremiums().government}
                        onChange={() => {}}
                        field="gsisGovernment"
                        readOnly={true}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-3">
                      PAG-IBIG {citizenType === 'senior' ? '(Not Applicable for Senior Citizen)' : '(For Non-Senior Citizen)'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label={`Personal Share 2% (Cell P${employeeData[selectedEmployee]?.row})`}
                        value={calculatePagibig().personal}
                        onChange={() => {}}
                        field="pagibigPersonal"
                        readOnly={true}
                      />
                      <InputField
                        label={`Government Share (Cell Q${employeeData[selectedEmployee]?.row})`}
                        value={calculatePagibig().government}
                        onChange={() => {}}
                        field="pagibigGovernment"
                        readOnly={true}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-3">OTHER LOANS (Applicable for Both)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <InputField
                        label={`LBP LOAN (Cell R${employeeData[selectedEmployee]?.row})`}
                        value={userInputs.lbpLoan}
                        onChange={handleInputChange}
                        field="lbpLoan"
                        type="number"
                        placeholder="0.00"
                      />
                      <InputField
                        label={`GFAL LOAN (Cell S${employeeData[selectedEmployee]?.row})`}
                        value={userInputs.gfalLoan}
                        onChange={handleInputChange}
                        field="gfalLoan"
                        type="number"
                        placeholder="0.00"
                      />
                      <InputField
                        label={`GSIS LITE LOAN (Cell T${employeeData[selectedEmployee]?.row})`}
                        value={userInputs.gsisLiteLoan}
                        onChange={handleInputChange}
                        field="gsisLiteLoan"
                        type="number"
                        placeholder="0.00"
                      />
                      <InputField
                        label={`PAG-IBIG MPL (Cell U${employeeData[selectedEmployee]?.row})`}
                        value={userInputs.pagibigMpl}
                        onChange={handleInputChange}
                        field="pagibigMpl"
                        type="number"
                        placeholder="0.00"
                      />
                      <InputField
                        label={`E.C. (Cell V${employeeData[selectedEmployee]?.row})`}
                        value={userInputs.ec}
                        onChange={handleInputChange}
                        field="ec"
                        type="number"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Action Buttons at the bottom right */}
            <div className="lg:w-80 flex flex-col justify-end">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Actions</h3>
                
                <button 
                  onClick={handleSaveCurrentEmployee}
                  className="w-full bg-yellow-600 text-white px-6 py-3 rounded-md hover:bg-yellow-700 transition-colors font-medium mb-4"
                >
                  Save Current Employee Changes
                </button>
                <p className="text-sm text-gray-600 mb-6">
                  Click this to save changes for <strong>{selectedEmployee}</strong> without downloading the file.
                  You can continue editing other employees.
                </p>

                <button 
                  onClick={handleSaveExcel}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium mb-4"
                >
                  Save Updated Excel (Download)
                </button>

                <button 
                  onClick={handleSendFile}
                  disabled={isSending}
                  className={`w-full px-6 py-3 rounded-md transition-colors font-medium ${
                    isSending 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSending ? 'Sending to Firestore...' : 'Send File to Firestore'}
                </button>

                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Save Updated Excel:</strong> Downloads Excel file with ALL saved employee changes</p>
                  <p><strong>Send File to Firestore:</strong> Sends the file to Firebase Firestore for receiving</p>
                  
                  {Object.keys(allEmployeeChanges).length > 0 && (
                    <p className="text-green-600 mt-2">
                      <strong>Ready to send:</strong> {Object.keys(allEmployeeChanges).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileSend;
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';
import logo from '../assets/logo1.png';

function PayslipGenerator() {
  const [payslips, setPayslips] = useState([]);
  const [excelData, setExcelData] = useState(null);
  const location = useLocation();

  // Function to convert base64 to Excel data
  const convertBase64ToExcel = (base64Data) => {
    try {
      if (!base64Data) return null;

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const workbook = XLSX.read(bytes, { type: 'array' });
      return workbook;
    } catch (error) {
      console.error('Error converting base64 to Excel:', error);
      return null;
    }
  };

  // Function to extract employee data using same logic as payslip.jsx
  const extractEmployeeDataFromExcel = (workbook) => {
    if (!workbook) return [];
    
    try {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Same employee rows as payslip.jsx
      const employeeRows = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 30, 31, 32, 35];
      const employees = [];
      
      employeeRows.forEach(row => {
        try {
          // Get cell values - using same column mapping as payslip.jsx
          const cellC = firstSheet[`C${row}`];
          const cellA = firstSheet[`A${row}`];
          const cellD = firstSheet[`D${row}`];
          const cellE = firstSheet[`E${row}`];
          const cellF = firstSheet[`F${row}`];
          const cellH = firstSheet[`H${row}`];
          const cellI = firstSheet[`I${row}`];
          const cellJ = firstSheet[`J${row}`];
          const cellK = firstSheet[`K${row}`];
          const cellL = firstSheet[`L${row}`];
          const cellM = firstSheet[`M${row}`];
          const cellN = firstSheet[`N${row}`];
          const cellO = firstSheet[`O${row}`];
          const cellP = firstSheet[`P${row}`];
          const cellQ = firstSheet[`Q${row}`];
          const cellR = firstSheet[`R${row}`];
          const cellS = firstSheet[`S${row}`];
          const cellT = firstSheet[`T${row}`];
          const cellU = firstSheet[`U${row}`];
          const cellV = firstSheet[`V${row}`];
          const cellX = firstSheet[`X${row}`];
          
          if (cellC && cellC.v) {
            const employeeName = cellC.v.toString().trim();
            
            // Calculate earnings (Basic Salary + Amount Accrued)
            const monthlyRate = parseFloat(cellH?.v || 0);
            const amountAccrued = parseFloat(cellI?.v || 0);
            const totalEarnings = monthlyRate + amountAccrued;
            
            // Calculate total deductions (sum of all deduction columns)
            const gsisEduLoan = parseFloat(cellJ?.v || 0);
            const gsisMplLoan = parseFloat(cellK?.v || 0);
            const philhealthPersonal = parseFloat(cellL?.v || 0);
            const philhealthGovernment = parseFloat(cellM?.v || 0);
            const gsisPersonal = parseFloat(cellN?.v || 0);
            const gsisGovernment = parseFloat(cellO?.v || 0);
            const pagibigPersonal = parseFloat(cellP?.v || 0);
            const pagibigGovernment = parseFloat(cellQ?.v || 0);
            const lbpLoan = parseFloat(cellR?.v || 0);
            const gfalLoan = parseFloat(cellS?.v || 0);
            const gsisLiteLoan = parseFloat(cellT?.v || 0);
            const pagibigMpl = parseFloat(cellU?.v || 0);
            const ec = parseFloat(cellV?.v || 0);
            
            const totalDeductions = 
              gsisEduLoan + gsisMplLoan + 
              philhealthPersonal + philhealthGovernment + 
              gsisPersonal + gsisGovernment + 
              pagibigPersonal + pagibigGovernment +
              lbpLoan + gfalLoan + gsisLiteLoan + pagibigMpl + ec;
            
            const netPay = totalEarnings - totalDeductions;
            
            employees.push({
              name: employeeName,
              id: cellA?.v?.toString() || 'N/A',
              dept: '', // Not available in original data
              pos: cellD?.v?.toString() || 'N/A',
              period: `${cellE?.v?.toString() || ''} to ${cellF?.v?.toString() || ''}`,
              
              // Earnings breakdown
              earnings: [
                { name: "Monthly Rate", value: monthlyRate.toFixed(2) },
              ].filter(item => parseFloat(item.value) > 0),
              
              // Deductions breakdown - include only those with values > 0
              deductions: [
                { name: "GSIS Edu Loan", value: gsisEduLoan.toFixed(2) },
                { name: "GSIS MPL Loan", value: gsisMplLoan.toFixed(2) },
                { name: "PhilHealth Personal", value: philhealthPersonal.toFixed(2) },
                { name: "PhilHealth Govt", value: philhealthGovernment.toFixed(2) },
                { name: "GSIS Personal", value: gsisPersonal.toFixed(2) },
                { name: "GSIS Government", value: gsisGovernment.toFixed(2) },
                { name: "Pag-IBIG Personal", value: pagibigPersonal.toFixed(2) },
                { name: "Pag-IBIG Govt", value: pagibigGovernment.toFixed(2) },
                { name: "LBP Loan", value: lbpLoan.toFixed(2) },
                { name: "GFAL Loan", value: gfalLoan.toFixed(2) },
                { name: "GSIS Lite Loan", value: gsisLiteLoan.toFixed(2) },
                { name: "Pag-IBIG MPL", value: pagibigMpl.toFixed(2) },
                { name: "E.C.", value: ec.toFixed(2) }
              ].filter(deduction => parseFloat(deduction.value) > 0),
              
              totalEarnings: totalEarnings.toFixed(2),
              totalDeductions: totalDeductions.toFixed(2),
              netPay: netPay.toFixed(2),
              paidInCash: cellX?.v ? parseFloat(cellX.v).toFixed(2) : '0.00'
            });
          }
        } catch (error) {
          console.error(`Error extracting data for row ${row}:`, error);
        }
      });
      
      return employees;
    } catch (error) {
      console.error('Error extracting employee data:', error);
      return [];
    }
  };

  // Auto-load data from navigation state
  useEffect(() => {
    if (location.state?.fileData) {
      const fileData = location.state.fileData;
      console.log('Auto-loading file data:', fileData.fileName);
      
      if (fileData.fileData) {
        const workbook = convertBase64ToExcel(fileData.fileData);
        if (workbook) {
          setExcelData(workbook);
          const employees = extractEmployeeDataFromExcel(workbook);
          setPayslips(employees);
          
          console.log(`Loaded ${employees.length} employees:`, 
            employees.map(emp => emp.name));
        }
      }
    }
  }, [location.state]);

  const handleFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      setExcelData(workbook);
      const employees = extractEmployeeDataFromExcel(workbook);
      setPayslips(employees);
    };

    reader.readAsArrayBuffer(file);
  };

  const printAll = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Start HTML content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payslips - ${payslips.length} Employee(s)</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          
          #payslips-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            width: 100%;
            box-sizing: border-box;
          }
          
          .payslip {
            border: 1px solid #000;
            width: 100%;
            height: 31.5vh;
            padding: 8px;
            box-sizing: border-box;
            page-break-inside: avoid;
            background-color: white;
            font-size: 11px;
          }
          
          .header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 5px;
          }
          
          .header img {
            max-width: 50px;
            height: auto;
          }
          
          .header-text {
            font-size: 10px;
            line-height: 1.2;
            text-align: center;
            width: 100%;
          }
          
          .header-text div {
            font-weight: bold;
          }
          
          h3 {
            text-align: center;
            font-size: 14px;
            margin: 4px 0;
          }
          
          .row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          
          .pay-details {
            display: flex;
            gap: 8px;
            margin-top: 5px;
          }
          
          .earnings, .deductions {
            width: 50%;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 11px;
            margin-top: 4px;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 2px;
          }
          
          .total-deductions {
            color: #dc2626;
            font-weight: bold;
            margin-top: 4px;
          }
          
          .paid-cash {
            color: #2563eb;
            font-weight: bold;
            margin-top: 4px;
          }
          
          .footer {
            font-size: 10px;
            margin-top: 8px;
            border-top: 1px dashed #ccc;
            padding-top: 4px;
          }
          
          .footer-table {
            width: 100%;
            font-size: 10px;
          }
          
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
            
            .payslip {
              page-break-inside: avoid !important;
            }
          }
          
          @page {
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div id="payslips-container">
    `);
    
    // Add each payslip to the print window
    payslips.forEach((slip, index) => {
      printWindow.document.write(`
        <div class="payslip">
          <div>
            <div class="header">
              <img src="${logo}" alt="Logo" />
              <div class="header-text">
                <div>REPUBLIC OF THE PHILIPPINES</div>
                <div>PROVINCE OF SOUTHERN LEYTE</div>
                <div>MUNICIPALITY OF LILOAN</div>
                OFFICE OF THE MUNICIPAL TREASURER
              </div>
            </div>
            
            <h3>Payslip</h3>
            
            <div class="row">
              <strong>Name:</strong>
              <span>${slip.name || 'N/A'}</span>
            </div>
            
            <div class="row">
              <strong>Position:</strong>
              <span>${slip.pos}</span>
            </div>
            
            <div class="row">
              <strong>Period:</strong>
              <span>${slip.period}</span>
            </div>
            
            <div class="pay-details">
              <div class="earnings">
                <div class="section-title">Earnings</div>
                ${slip.earnings.length > 0 ? 
                  slip.earnings.map(earning => `
                    <div class="row">
                      <span class="truncate">${earning.name}</span>
                      <span class="whitespace-nowrap">${formatCurrency(earning.value)}</span>
                    </div>
                  `).join('') : 
                  '<div class="row text-gray-500 italic">No Earnings</div>'
                }
              </div>
              
              <div class="deductions">
                <div class="section-title">Deductions</div>
                ${slip.deductions.length > 0 ? 
                  slip.deductions.map(deduction => `
                    <div class="row">
                      <span class="truncate">${deduction.name}</span>
                      <span class="whitespace-nowrap">${formatCurrency(deduction.value)}</span>
                    </div>
                  `).join('') : 
                  '<div class="row text-gray-500 italic">No Deductions</div>'
                }
              </div>
            </div>

            <div class="row total-deductions">
              <span>Total Deductions:</span>
              <span>${formatCurrency(slip.totalDeductions)}</span>
            </div>
            
            ${slip.paidInCash !== '0.00' ? `
              <div class="row paid-cash">
                <span>Net Pay:</span>
                <span>${formatCurrency(slip.paidInCash)}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <table class="footer-table">
              <tbody>
                <tr>
                  <td class="align-top">
                    <strong>Prepared by:</strong><br /><br />
                    (SGD) LIANA JOY C. ADONA<br />
                    Administrative Aide
                  </td>
                  <td class="text-right align-top">
                    <strong>Certified True:</strong><br /><br />
                    (SGD) DANNIE LYN I. VILLAFLOR<br />
                    Municipal Treasurer
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `);
    });
    
    // Close HTML and print
    printWindow.document.write(`
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for images to load then print
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  const handleManualUpload = () => {
    document.getElementById('upload').click();
  };

  // Format currency with commas
  const formatCurrency = (value) => {
    if (!value) return '0.00';
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Liloan Payslip Generator</h1>
      
      <div className="mb-4">
        <input 
          type="file" 
          id="upload" 
          accept=".xlsx,.xls" 
          onChange={handleFile}
          className="hidden"
        />
        
        
        {!location.state?.fileData && (
          <button
            onClick={handleManualUpload}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            📁 Upload Excel File
          </button>
        )}
      </div>
      
      <div className="controls mb-4 flex justify-between">
        <div className="text-sm text-gray-600">
          {payslips.length > 0 ? `Showing ${payslips.length} employee payslip(s)` : 'No payslips to display'}
        </div>
        <button 
          onClick={printAll}
          disabled={payslips.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          🖨️ Print All Payslips ({payslips.length})
        </button>
      </div>
      
      <div id="payslips-container" className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-0">
        {payslips.length > 0 ? (
          payslips.map((slip, index) => (
            <div key={index} className="payslip border border-black flex flex-col justify-between h-[31.5vh] p-2 box-border bg-white">
              <div>
                <div className="header flex items-center gap-2">
                  <img 
                    src={logo} 
                    alt="Logo" 
                    className="max-w-[60px] h-auto print:max-w-[50px]"
                  />
                  <div className="header-text text-[10px] leading-tight text-center w-full">
                    <div className="font-bold">REPUBLIC OF THE PHILIPPINES</div>
                    <div className="font-bold">PROVINCE OF SOUTHERN LEYTE</div>
                    <div className="font-bold">MUNICIPALITY OF LILOAN</div>
                    OFFICE OF THE MUNICIPAL TREASURER
                  </div>
                </div>
                
                <h3 className="text-center text-[14px] my-1">Payslip</h3>
                
                <div className="row flex justify-between text-[11px]">
                  <strong>Name:</strong>
                  <span>{slip.name || 'N/A'}</span>
                </div>
                
                <div className="row flex justify-between text-[11px]">
                  <strong>Position:</strong>
                  <span>{slip.pos}</span>
                </div>
                
                <div className="row flex justify-between text-[11px]">
                  <strong>Period:</strong>
                  <span>{slip.period}</span>
                </div>
                
                <div className="pay-details flex text-[11px] gap-2">
                  <div className="earnings w-1/2">
                    <div className="section-title font-bold text-[11px] mt-1 border-b border-dashed border-gray-400">
                      Earnings
                    </div>
                    {slip.earnings.length > 0 ? (
                      slip.earnings.map((earning, idx) => (
                        <div key={idx} className="row flex justify-between">
                          <span className="truncate">{earning.name}</span>
                          <span className="whitespace-nowrap">{formatCurrency(earning.value)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="row text-gray-500 italic text-[10px]">
                        No Earnings
                      </div>
                    )}
                  </div>
                  
                  <div className="deductions w-1/2">
                    <div className="section-title font-bold text-[11px] mt-1 border-b border-dashed border-gray-400">
                      Deductions
                    </div>
                    {slip.deductions.length > 0 ? (
                      slip.deductions.map((deduction, idx) => (
                        <div key={idx} className="row flex justify-between">
                          <span className="truncate">{deduction.name}</span>
                          <span className="whitespace-nowrap">{formatCurrency(deduction.value)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="row text-gray-500 italic text-[10px]">
                        No Deductions
                      </div>
                    )}
                  </div>
                </div>

                <div className="row total-deductions flex justify-between text-red-600 font-bold text-[11px]">
                  <span>Total Deductions:</span>
                  <span>{formatCurrency(slip.totalDeductions)}</span>
                </div>
                
                {slip.paidInCash !== '0.00' && (
                  <div className="row paid-cash flex justify-between text-blue-600 font-bold text-[11px]">
                    <span>Net Pay:</span>
                    <span>{formatCurrency(slip.paidInCash)}</span>
                  </div>
                )}
              </div>
              
              <div className="footer text-[10px] mt-1 border-t border-dashed border-gray-400 pt-1">
                <table className="footer-table w-full text-[10px]">
                  <tbody>
                    <tr>
                      <td className="align-top pt-1">
                        <strong>Prepared by:</strong><br /><br />
                        (SGD) LIANA JOY C. ADONA<br />
                        Administrative Aide
                      </td>
                      <td className="text-right align-top pt-1">
                        <strong>Certified True:</strong><br /><br />
                        (SGD) DANNIE LYN I. VILLAFLOR<br />
                        Municipal Treasurer
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No payslips to display</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              {location.state?.fileData 
                ? "The Excel file doesn't contain payroll data in the expected format."
                : "Please upload an Excel file with payroll data to generate payslips."
              }
            </p>
            {!location.state?.fileData && (
              <button
                onClick={handleManualUpload}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                📁 Upload Excel File
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PayslipGenerator;

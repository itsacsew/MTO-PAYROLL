import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';
import logo from '../assets/logo1.png';

function PayslipGenerator4() {
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

  // Function to extract employee data from PAYROLL4.xlsx format
  const extractEmployeeDataFromExcel = (workbook) => {
    if (!workbook) return [];
    
    try {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Employee rows based on PAYROLL4.xlsx structure
      // Rows: MAYOR section, ACCOUNTING section, MUN. BUDGET OFFICE section, MASSO section
      const employeeRows = [15, 16, 17, 18, 22, 23, 24, 28, 29, 33];
      const employees = [];
      
      employeeRows.forEach(row => {
        try {
          // Get cell values from PAYROLL4 format
          const cellA = firstSheet[`A${row}`];  // NUMBER
          const cellC = firstSheet[`C${row}`];  // NAME
          const cellD = firstSheet[`D${row}`];  // DESIGNATION
          const cellE = firstSheet[`E${row}`];  // PERIOD FROM
          const cellF = firstSheet[`F${row}`];  // PERIOD TO
          const cellG = firstSheet[`G${row}`];  // SALARY AMOUNT ACCRUED
          const cellH = firstSheet[`H${row}`];  // AMOUNT ACCRUED FOR THE PERIOD
          const cellI = firstSheet[`I${row}`];  // EDUC LOAN
          const cellJ = firstSheet[`J${row}`];  // GSIS MPL
          const cellK = firstSheet[`K${row}`];  // PHILHEALTH Personal Share
          const cellL = firstSheet[`L${row}`];  // PHILHEALTH Government Share
          const cellM = firstSheet[`M${row}`];  // GSIS Premiums Personal Share
          const cellN = firstSheet[`N${row}`];  // GSIS Premiums Government Share
          const cellO = firstSheet[`O${row}`];  // Pag-ibig Personal Share
          const cellP = firstSheet[`P${row}`];  // Pag-ibig Government Share
          const cellQ = firstSheet[`Q${row}`];  // LBP LOAN
          const cellR = firstSheet[`R${row}`];  // GFAL LOAN
          const cellS = firstSheet[`S${row}`];  // GSIS MPL Lite
          const cellT = firstSheet[`T${row}`];  // Pag-ibig MPL
          const cellU = firstSheet[`U${row}`];  // E.C.
          const cellW = firstSheet[`W${row}`];  // AMOUNT PAID
          const cellX = firstSheet[`X${row}`];  // NUMBER (for signature)
          
          if (cellC && cellC.v) {
            const employeeName = cellC.v.toString().trim();
            
            // Calculate earnings - in PAYROLL4, the monthly rate is in column G (SALARY)
            let monthlyRate = 0;
            let amountAccrued = 0;
            
            if (cellH && cellH.v) {
              // If there's an Amount Accrued column, use that
              amountAccrued = parseFloat(cellH.v) || 0;
            }
            
            if (cellG && cellG.v) {
              // Column G is the salary amount for the period
              monthlyRate = parseFloat(cellG.v) || 0;
            }
            
            const totalEarnings = monthlyRate + amountAccrued;
            
            // Calculate total deductions
            const educLoan = parseFloat(cellI?.v || 0);
            const gsisMpl = parseFloat(cellJ?.v || 0);
            const philhealthPersonal = parseFloat(cellK?.v || 0);
            const philhealthGovernment = parseFloat(cellL?.v || 0);
            const gsisPersonal = parseFloat(cellM?.v || 0);
            const gsisGovernment = parseFloat(cellN?.v || 0);
            const pagibigPersonal = parseFloat(cellO?.v || 0);
            const pagibigGovernment = parseFloat(cellP?.v || 0);
            const lbpLoan = parseFloat(cellQ?.v || 0);
            const gfalLoan = parseFloat(cellR?.v || 0);
            const gsisLiteLoan = parseFloat(cellS?.v || 0);
            const pagibigMpl = parseFloat(cellT?.v || 0);
            const ec = parseFloat(cellU?.v || 0);
            
            const totalDeductions = 
              educLoan + gsisMpl + 
              philhealthPersonal + philhealthGovernment + 
              gsisPersonal + gsisGovernment + 
              pagibigPersonal + pagibigGovernment +
              lbpLoan + gfalLoan + gsisLiteLoan + pagibigMpl + ec;
            
            const netPay = totalEarnings - totalDeductions;
            const paidAmount = cellW?.v ? parseFloat(cellW.v) : netPay;
            
            // Build deductions array with all items
            const allDeductions = [
              { name: "EDUC Loan", value: educLoan.toFixed(2) },
              { name: "GSIS MPL", value: gsisMpl.toFixed(2) },
              { name: "PhilHealth Personal", value: philhealthPersonal.toFixed(2) },
              { name: "PhilHealth Government", value: philhealthGovernment.toFixed(2) },
              { name: "GSIS Personal", value: gsisPersonal.toFixed(2) },
              { name: "GSIS Government", value: gsisGovernment.toFixed(2) },
              { name: "Pag-IBIG Personal", value: pagibigPersonal.toFixed(2) },
              { name: "Pag-IBIG Government", value: pagibigGovernment.toFixed(2) },
              { name: "LBP Loan", value: lbpLoan.toFixed(2) },
              { name: "GFAL Loan", value: gfalLoan.toFixed(2) },
              { name: "GSIS Lite Loan", value: gsisLiteLoan.toFixed(2) },
              { name: "Pag-IBIG MPL", value: pagibigMpl.toFixed(2) },
              { name: "E.C.", value: ec.toFixed(2) }
            ];
            
            // Build earnings array
            const earnings = [];
            if (monthlyRate > 0) {
              earnings.push({ name: "Monthly Salary", value: monthlyRate.toFixed(2) });
            }
            if (amountAccrued > 0) {
              earnings.push({ name: "Amount Accrued", value: amountAccrued.toFixed(2) });
            }
            
            // Format period
            let periodStr = '';
            const fromDate = cellE?.v ? cellE.v.toString() : '';
            const toDate = cellF?.v ? cellF.v.toString() : '';
            if (fromDate || toDate) {
              periodStr = `${fromDate} to ${toDate}`;
            }
            
            employees.push({
              name: employeeName,
              id: cellA?.v?.toString() || (row - 14).toString(),
              dept: '', // Department not directly available
              pos: cellD?.v?.toString() || 'N/A',
              period: periodStr || 'Not specified',
              
              // Earnings breakdown
              earnings: earnings,
              
              // Deductions breakdown
              deductions: allDeductions,
              
              totalEarnings: totalEarnings.toFixed(2),
              totalDeductions: totalDeductions.toFixed(2),
              netPay: netPay.toFixed(2),
              paidInCash: paidAmount.toFixed(2)
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
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: white;
            width: 100%;
            min-height: 100vh;
          }
          
          #payslips-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          
          .payslip {
            border: 1px solid #000;
            padding: 12px;
            box-sizing: border-box;
            page-break-inside: avoid;
            background-color: white;
            font-size: 11px;
            height: auto;
            min-height: auto;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
          }
          
          .header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
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
            gap: 12px;
            margin-top: 8px;
            flex-wrap: wrap;
          }
          
          .earnings, .deductions {
            flex: 1;
            min-width: 120px;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 11px;
            margin-top: 6px;
            margin-bottom: 4px;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 2px;
          }
          
          .total-deductions {
            color: #dc2626;
            font-weight: bold;
            margin-top: 8px;
            padding-top: 4px;
            border-top: 1px dashed #eee;
          }
          
          .paid-cash {
            color: #2563eb;
            font-weight: bold;
            margin-top: 4px;
          }
          
          .footer {
            font-size: 10px;
            margin-top: 12px;
            border-top: 1px dashed #ccc;
            padding-top: 8px;
          }
          
          .footer-table {
            width: 100%;
            font-size: 10px;
          }
          
          .deduction-item {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          
          .deduction-zero {
            color: #9ca3af;
          }
          
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
            
            .payslip {
              page-break-inside: avoid !important;
              break-inside: avoid;
            }
            
            #payslips-container {
              gap: 0;
            }
          }
          
          @page {
            margin: 0.5cm;
          }
        </style>
      </head>
      <body>
        <div id="payslips-container">
    `);
    
    // Add each payslip to the print window
    payslips.forEach((slip, index) => {
      const nonZeroDeductions = slip.deductions.filter(d => parseFloat(d.value) !== 0);
      const displayDeductions = nonZeroDeductions.length > 0 ? nonZeroDeductions : slip.deductions;
      
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
              <span>${escapeHtml(slip.name || 'N/A')}</span>
            </div>
            
            <div class="row">
              <strong>Position:</strong>
              <span>${escapeHtml(slip.pos)}</span>
            </div>
            
            <div class="row">
              <strong>Period:</strong>
              <span>${escapeHtml(slip.period)}</span>
            </div>
            
            <div class="pay-details">
              <div class="earnings">
                <div class="section-title">Earnings</div>
                ${slip.earnings.length > 0 ? 
                  slip.earnings.map(earning => `
                    <div class="row">
                      <span>${escapeHtml(earning.name)}</span>
                      <span>${formatCurrency(earning.value)}</span>
                    </div>
                  `).join('') : 
                  '<div class="row" style="color: #9ca3af; font-style: italic;">No Earnings</div>'
                }
                <div class="row" style="font-weight: bold; margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 2px;">
                  <span>Total Earnings:</span>
                  <span>${formatCurrency(slip.totalEarnings)}</span>
                </div>
              </div>
              
              <div class="deductions">
                <div class="section-title">Deductions</div>
                ${displayDeductions.length > 0 ? 
                  displayDeductions.map(deduction => {
                    const value = parseFloat(deduction.value);
                    const isZero = value === 0;
                    return `
                      <div class="deduction-item ${isZero ? 'deduction-zero' : ''}">
                        <span>${escapeHtml(deduction.name)}</span>
                        <span>${formatCurrency(deduction.value)}</span>
                      </div>
                    `;
                  }).join('') : 
                  '<div class="row" style="color: #9ca3af; font-style: italic;">No Deductions</div>'
                }
              </div>
            </div>

            <div class="row total-deductions">
              <span>Total Deductions:</span>
              <span>${formatCurrency(slip.totalDeductions)}</span>
            </div>
            
            <div class="row paid-cash" style="font-weight: bold; font-size: 12px; margin-top: 6px;">
              <span>Net Pay:</span>
              <span>${formatCurrency(slip.paidInCash !== '0.00' ? slip.paidInCash : slip.netPay)}</span>
            </div>
          </div>
          
          <div class="footer">
            <table class="footer-table">
              <tbody>
                <tr>
                  <td style="vertical-align: top; width: 50%;">
                    <strong>Prepared by:</strong><br /><br />
                    (SGD) LIANA JOY C. ADONA<br />
                    Administrative Aide
                    </td>
                  <td style="vertical-align: top; text-align: right; width: 50%;">
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
  
  // Helper to escape HTML
  const escapeHtml = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const handleManualUpload = () => {
    document.getElementById('upload').click();
  };

  // Format currency with commas
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '0.00';
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#0a0a0f] overflow-auto">
      {/* Remove all padding and margins */}
      <div className="w-full h-full min-h-screen">
        <div className="w-full px-3 pt-20 mt-2">
          <h1 className="text-2xl font-bold mb-2 text-white">Liloan Payslip Generator (PAYROLL4 Format - MAYOR/ACCT/MBO/MASSO)</h1>
          
          <div className="mb-2">
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
                📁 Upload PAYROLL4 Excel File
              </button>
            )}
          </div>
          
          <div className="controls mb-1 flex justify-between items-center flex-wrap gap-2">
            <div className="text-sm text-gray-300">
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
          
          {/* Full width grid with responsive columns - no margin, no padding */}
          <div id="payslips-container" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3 w-full">
            {payslips.length > 0 ? (
              payslips.map((slip, index) => {
                const nonZeroDeductions = slip.deductions.filter(d => parseFloat(d.value) !== 0);
                const displayDeductions = nonZeroDeductions.length > 0 ? nonZeroDeductions : slip.deductions;
                
                return (
                  <div key={index} className="payslip border border-gray-700 bg-white rounded-lg shadow-lg flex flex-col p-3 w-full">
                    <div>
                      <div className="header flex items-center gap-2 mb-2">
                        <img 
                          src={logo} 
                          alt="Logo" 
                          className="max-w-[45px] h-auto"
                        />
                        <div className="header-text text-[10px] leading-tight text-center w-full">
                          <div className="font-bold">REPUBLIC OF THE PHILIPPINES</div>
                          <div className="font-bold">PROVINCE OF SOUTHERN LEYTE</div>
                          <div className="font-bold">MUNICIPALITY OF LILOAN</div>
                          OFFICE OF THE MUNICIPAL TREASURER
                        </div>
                      </div>
                      
                      <h3 className="text-center text-sm font-bold my-1">Payslip</h3>
                      
                      <div className="row flex justify-between text-[11px] mb-1">
                        <strong>Name:</strong>
                        <span className="text-right break-words max-w-[60%]">{slip.name || 'N/A'}</span>
                      </div>
                      
                      <div className="row flex justify-between text-[11px] mb-1">
                        <strong>Position:</strong>
                        <span className="text-right break-words max-w-[60%]">{slip.pos}</span>
                      </div>
                      
                      <div className="row flex justify-between text-[11px] mb-2">
                        <strong>Period:</strong>
                        <span className="text-right break-words max-w-[60%]">{slip.period}</span>
                      </div>
                      
                      <div className="pay-details flex flex-col sm:flex-row gap-3 text-[11px]">
                        <div className="earnings flex-1">
                          <div className="section-title font-bold text-[11px] mt-1 border-b border-dashed border-gray-300 pb-0.5">
                            Earnings
                          </div>
                          {slip.earnings.length > 0 ? (
                            <>
                              {slip.earnings.map((earning, idx) => (
                                <div key={idx} className="row flex justify-between mt-0.5">
                                  <span className="truncate">{earning.name}</span>
                                  <span className="whitespace-nowrap ml-2">{formatCurrency(earning.value)}</span>
                                </div>
                              ))}
                              <div className="row flex justify-between font-bold mt-1 pt-0.5 border-t border-dashed border-gray-300">
                                <span>Total Earnings:</span>
                                <span>{formatCurrency(slip.totalEarnings)}</span>
                              </div>
                            </>
                          ) : (
                            <div className="row text-gray-500 italic text-[10px] mt-1">
                              No Earnings
                            </div>
                          )}
                        </div>
                        
                        <div className="deductions flex-1">
                          <div className="section-title font-bold text-[11px] mt-1 border-b border-dashed border-gray-300 pb-0.5">
                            Deductions
                          </div>
                          {displayDeductions.length > 0 ? (
                            displayDeductions.map((deduction, idx) => {
                              const valueNum = parseFloat(deduction.value);
                              const isZero = valueNum === 0;
                              return (
                                <div key={idx} className={`row flex justify-between mt-0.5 ${isZero ? 'text-gray-400' : ''}`}>
                                  <span className="truncate">{deduction.name}</span>
                                  <span className="whitespace-nowrap ml-2">{formatCurrency(deduction.value)}</span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="row text-gray-500 italic text-[10px] mt-1">
                              No Deductions
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="row total-deductions flex justify-between text-red-600 font-bold text-[11px] mt-2 pt-1 border-t border-dashed border-gray-300">
                        <span>Total Deductions:</span>
                        <span>{formatCurrency(slip.totalDeductions)}</span>
                      </div>
                      
                      <div className="row paid-cash flex justify-between text-blue-600 font-bold text-[12px] mt-1">
                        <span>Net Pay:</span>
                        <span>{formatCurrency(slip.paidInCash !== '0.00' ? slip.paidInCash : slip.netPay)}</span>
                      </div>
                    </div>
                    
                    <div className="footer text-[10px] mt-3 pt-2 border-t border-dashed border-gray-300">
                      <table className="footer-table w-full text-[10px]">
                        <tbody>
                          <tr>
                            <td className="align-top pt-1 w-1/2">
                              <strong>Prepared by:</strong><br /><br />
                              (SGD) LIANA JOY C. ADONA<br />
                              Administrative Aide
                            </td>
                            <td className="text-right align-top pt-1 w-1/2">
                              <strong>Certified True:</strong><br /><br />
                              (SGD) DANNIE LYN I. VILLAFLOR<br />
                              Municipal Treasurer
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-1 sm:col-span-2 text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-white">No payslips to display</h3>
                <p className="mt-2 text-gray-400 max-w-md mx-auto">
                  {location.state?.fileData 
                    ? "The Excel file doesn't contain payroll data in the PAYROLL4 format."
                    : "Please upload a PAYROLL4 Excel file with payroll data to generate payslips."
                  }
                </p>
                {!location.state?.fileData && (
                  <button
                    onClick={handleManualUpload}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    📁 Upload PAYROLL4 Excel File
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayslipGenerator4;
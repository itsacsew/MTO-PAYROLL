import React, { useState, useEffect, useRef } from "react";
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function Payslip() {
  const [paperSize, setPaperSize] = useState("A3");
  const [orientation, setOrientation] = useState("landscape");
  const [employees, setEmployees] = useState([]);
  const [excelData, setExcelData] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});
  const tableRef = useRef(null);
  const location = useLocation();
  const printRef = useRef(null);

  // Paper size dimensions (in pixels for 96 DPI)
  const paperDimensions = {
    "A3": { portrait: { width: "1123px", height: "1587px" }, landscape: { width: "1587px", height: "1123px" } },
    "A4": { portrait: { width: "793px", height: "1122px" }, landscape: { width: "1122px", height: "793px" } },
    "Legal": { portrait: { width: "816px", height: "1344px" }, landscape: { width: "1344px", height: "816px" } },
    "Letter": { portrait: { width: "816px", height: "1056px" }, landscape: { width: "1056px", height: "816px" } },
    "Tabloid": { portrait: { width: "1056px", height: "1632px" }, landscape: { width: "1632px", height: "1056px" } }
  };

  // Function to format date from Excel serial to DD-MMM-YYYY
  const formatDate = (excelDate) => {
    if (!excelDate) return '';

    // Handle if it's already a string or number
    let dateValue = excelDate;
    
    // If it's an Excel serial number (number)
    if (typeof excelDate === 'number') {
      // Excel's date system starts from 1900-01-01
      const excelEpoch = new Date(1900, 0, 1);
      // Adjust for Excel's leap year bug (1900 is treated as leap year)
      const daysOffset = excelDate > 60 ? excelDate - 2 : excelDate - 1;
      dateValue = new Date(excelEpoch.setDate(excelEpoch.getDate() + daysOffset));
    } else {
      // Try to parse as string
      dateValue = new Date(excelDate);
    }

    // Check if date is valid
    if (dateValue instanceof Date && !isNaN(dateValue)) {
      const day = dateValue.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[dateValue.getMonth()];
      const year = dateValue.getFullYear();
      return `${day}-${month}-${year}`;
    }
    
    return excelDate?.toString() || '';
  };

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

  // Function to extract employee data from Excel
  const extractEmployeeDataFromExcel = (workbook) => {
    if (!workbook) return [];
    
    try {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Employee rows as per slip.jsx
      const employeeRows = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 30, 31, 32, 35];
      const employees = [];
      
      employeeRows.forEach(row => {
        try {
          // Get cell values
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
            
            employees.push({
              number: cellA?.v?.toString() || '',
              name: employeeName,
              designation: cellD?.v?.toString() || '',
              periodFrom: formatDate(cellE?.v), // Apply date formatting here
              periodTo: formatDate(cellF?.v),   // Apply date formatting here
              monthlyRate: cellH?.v || 0,
              amountAccrued: cellI?.v || 0,
              gsisEduLoan: cellJ?.v || 0,
              gsisMplLoan: cellK?.v || 0,
              philhealthPersonal: cellL?.v || 0,
              philhealthGovernment: cellM?.v || 0,
              gsisPersonal: cellN?.v || 0,
              gsisGovernment: cellO?.v || 0,
              pagibigPersonal: cellP?.v || 0,
              pagibigGovernment: cellQ?.v || 0,
              lbpLoan: cellR?.v || 0,
              gfalLoan: cellS?.v || 0,
              gsisLiteLoan: cellT?.v || 0,
              pagibigMpl: cellU?.v || 0,
              ec: cellV?.v || 0,
              paidInCash: cellX?.v || 0,
              section: row <= 26 ? 'SB' : row <= 32 ? 'MTO' : 'MENRO'
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
          const employeesData = extractEmployeeDataFromExcel(workbook);
          setEmployees(employeesData);
          console.log(`Loaded ${employeesData.length} employees`);
        }
      }
    }
  }, [location.state]);

  // Group employees by section
  const sbEmployees = employees.filter(emp => emp.section === 'SB');
  const mtoEmployees = employees.filter(emp => emp.section === 'MTO');
  const menroEmployees = employees.filter(emp => emp.section === 'MENRO');

  // Calculate totals for each section
  const calculateSectionTotals = (sectionEmployees) => {
    return sectionEmployees.reduce((totals, emp) => {
      return {
        monthlyRate: totals.monthlyRate + (parseFloat(emp.monthlyRate) || 0),
        amountAccrued: totals.amountAccrued + (parseFloat(emp.amountAccrued) || 0),
        gsisEduLoan: totals.gsisEduLoan + (parseFloat(emp.gsisEduLoan) || 0),
        gsisMplLoan: totals.gsisMplLoan + (parseFloat(emp.gsisMplLoan) || 0),
        philhealthPersonal: totals.philhealthPersonal + (parseFloat(emp.philhealthPersonal) || 0),
        philhealthGovernment: totals.philhealthGovernment + (parseFloat(emp.philhealthGovernment) || 0),
        gsisPersonal: totals.gsisPersonal + (parseFloat(emp.gsisPersonal) || 0),
        gsisGovernment: totals.gsisGovernment + (parseFloat(emp.gsisGovernment) || 0),
        pagibigPersonal: totals.pagibigPersonal + (parseFloat(emp.pagibigPersonal) || 0),
        pagibigGovernment: totals.pagibigGovernment + (parseFloat(emp.pagibigGovernment) || 0),
        lbpLoan: totals.lbpLoan + (parseFloat(emp.lbpLoan) || 0),
        gfalLoan: totals.gfalLoan + (parseFloat(emp.gfalLoan) || 0),
        gsisLiteLoan: totals.gsisLiteLoan + (parseFloat(emp.gsisLiteLoan) || 0),
        pagibigMpl: totals.pagibigMpl + (parseFloat(emp.pagibigMpl) || 0),
        ec: totals.ec + (parseFloat(emp.ec) || 0),
        paidInCash: totals.paidInCash + (parseFloat(emp.paidInCash) || 0)
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

  // Format number with commas (for regular rows - show empty if zero)
  const formatNumber = (value) => {
    if (value === undefined || value === null || value === '' || value === 0) {
      return '';
    }
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Format total with commas or dash (for total rows)
  const formatTotal = (value) => {
    if (value === undefined || value === null || value === '' || value === 0) {
      return '-';
    }
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return '-';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Check if column has any non-zero values
  const hasColumnData = (employees, field) => {
    return employees.some(emp => {
      const value = parseFloat(emp[field]);
      return value && value > 0;
    });
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
          number: orientation === "landscape" ? 12 : 13 // Increased from 8/9 to 12/13
        };
      case "Legal":
      case "Tabloid":
        return {
          main: orientation === "landscape" ? 10 : 11,
          small: orientation === "landscape" ? 8.5 : 9,
          header: orientation === "landscape" ? 17 : 19,
          medium: orientation === "landscape" ? 11 : 12,
          number: orientation === "landscape" ? 12 : 13 // Increased from 7.5/8 to 12/13
        };
      case "Letter":
        return {
          main: orientation === "landscape" ? 9 : 10,
          small: orientation === "landscape" ? 8 : 8.5,
          header: orientation === "landscape" ? 16 : 17,
          medium: orientation === "landscape" ? 10.5 : 11,
          number: orientation === "landscape" ? 11 : 12 // Increased from 7/7.5 to 11/12
        };
      default: // A4
        return {
          main: orientation === "landscape" ? 8.5 : 9,
          small: orientation === "landscape" ? 7.5 : 8,
          header: orientation === "landscape" ? 15 : 16,
          medium: orientation === "landscape" ? 9.5 : 10,
          number: orientation === "landscape" ? 11 : 12 // Increased from 6.5/7 to 11/12
        };
    }
  };

  const fontSizes = getFontSizes();
  const dimensions = paperDimensions[paperSize][orientation];

  // Check which columns have data
  const hasGsisEduData = hasColumnData([...sbEmployees, ...mtoEmployees, ...menroEmployees], 'gsisEduLoan');
  const hasGsisMplData = hasColumnData([...sbEmployees, ...mtoEmployees, ...menroEmployees], 'gsisMplLoan');
  const hasGsisLiteData = hasColumnData([...sbEmployees, ...mtoEmployees, ...menroEmployees], 'gsisLiteLoan');
  const hasLbpData = hasColumnData([...sbEmployees, ...mtoEmployees, ...menroEmployees], 'lbpLoan');
  const hasGfalData = hasColumnData([...sbEmployees, ...mtoEmployees, ...menroEmployees], 'gfalLoan');
  const hasPagibigMplData = hasColumnData([...sbEmployees, ...mtoEmployees, ...menroEmployees], 'pagibigMpl');
  const hasEcData = hasColumnData([...sbEmployees, ...mtoEmployees, ...menroEmployees], 'ec');

  // Print function
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    // Get the HTML content of the payslip
    const payslipContent = printRef.current?.outerHTML || '';
    
    // Get current styles
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    let stylesHTML = '';
    styles.forEach(style => {
      if (style.tagName === 'STYLE') {
        stylesHTML += style.outerHTML;
      } else if (style.tagName === 'LINK' && style.rel === 'stylesheet') {
        stylesHTML += style.outerHTML;
      }
    });

    // Create print-friendly HTML
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payroll - ${employees.length} Employees</title>
        ${stylesHTML}
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif;
            background: white;
          }
          
          /* Print-specific styles */
          @media print {
            body { 
              margin: 0 !important; 
              padding: 0 !important;
            }
            
            .print-only { 
              display: block !important; 
            }
            
            .no-print { 
              display: none !important; 
            }
            
            /* Ensure borders print */
            .border, .border-black, .border-gray-300 {
              border: 1px solid black !important;
            }
          }
          
          /* Container for the payslip */
          .print-container {
            width: 100%;
            background: white;
            padding: 0;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-only" style="font-size: ${fontSizes.main}px;">
            ${payslipContent}
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 500);
          };
        <\/script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="p-4">
      {/* Controls Section */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Paper Size:</label>
            <select 
              value={paperSize} 
              onChange={(e) => setPaperSize(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="A3">A3 (297 × 420 mm) - Recommended</option>
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
              <option value="Legal">Legal (8.5 × 14 in)</option>
              <option value="Tabloid">Tabloid (11 × 17 in)</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-1 font-medium">Orientation:</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setOrientation("portrait")}
                className={`flex-1 border rounded px-3 py-2 ${orientation === "portrait" ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                Portrait
              </button>
              <button
                onClick={() => setOrientation("landscape")}
                className={`flex-1 border rounded px-3 py-2 ${orientation === "landscape" ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                Landscape
              </button>
            </div>
          </div>
        </div>
        
        {/* Print Button and File Info */}
        <div className="mt-3 flex items-center justify-between">
          <div className="p-2 bg-green-50 border border-green-200 rounded flex-1 mr-3">
            <p className="text-sm text-green-700">
              📁 Loaded: {location.state?.fileData?.fileName || 'No file'} ({employees.length} employees)
            </p>
          </div>
          
          <button
            onClick={handlePrint}
            disabled={employees.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            🖨️ Print Payroll ({employees.length})
          </button>
        </div>
      </div>

      {/* Main Payslip Container */}
      <div 
        ref={printRef}
        className="bg-white mx-auto px-8"
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

        {/* MAIN TABLE - With Dynamic Column Widths */}
        <table 
          ref={tableRef}
          className="w-full border-collapse border border-black" 
          style={{ fontSize: `${fontSizes.small}px`, tableLayout: 'auto' }}
        >
          <thead>
            <tr>
              <th rowSpan={3} className="border border-black p-0 align-middle text-center" style={{ width: '30px', padding: '8px 2px', height: '60px' }}>
                
                <div className="flex flex-col items-center justify-center h-full" style={{ fontSize: `${fontSizes.number}px` }}>
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
              {hasGsisEduData && (
                <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">GSIS<br/>EDUC<br/>LOAN</th>
              )}
              {hasGsisMplData && (
                <th rowSpan={3} className="border border-black text-center align-middle" 
    style={{ padding: '2px 2px', height: '5px'}}>GSIS<br/>MPL<br/>LOAN</th>
              )}
              <th colSpan={6} className="border border-black p-0 align-middle text-center" rowSpan={1}></th>
              {hasGsisLiteData && (
                <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">GSIS<br/>MPL<br/>Lite</th>
              )}
              {hasLbpData && (
                <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">LBP<br/>LOAN</th>
              )}
              {hasGfalData && (
                <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">GFAL<br/>LOAN</th>
              )}
              {hasPagibigMplData && (
                <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">Pag-ibig<br/>LOAN</th>
              )}
              {hasEcData && (
                <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center" style={{ width: '25px' }}>E.C.</th>
              )}
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center">Amount<br/>Paid<br/>In<br/>Cash<br/>(Cr. A-1)</th>
              <th rowSpan={3} className="border border-black p-0 align-middle text-center" style={{ width: '25px' }}>
                <div className="flex flex-col items-center justify-center h-full" style={{ fontSize: `${fontSizes.number}px` }}>
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
            
            <tr >
              <th rowSpan={2} className="border border-black text-center align-middle" 
    style={{ padding: '2px 2px', height: '10px'}}>From _____</th>
              <th rowSpan={2} className="border border-black p-0 px-1 text-center align-middle">To ______</th>
              <th colSpan={2} className="border border-black p-0 text-center">PHILHEALTH</th>
              <th colSpan={2} className="border border-black p-0 text-center">GSIS Premiums</th>
              <th colSpan={2} className="border border-black p-0 text-center">Pag-ibig</th>
            </tr>
            
            <tr>
              <th rowSpan={2} className="border border-black text-center align-middle" 
    style={{ padding: '8px 2px', height: '30px' }}>Personal<br/>Share</th>
              <th className="border border-black p-0 px-1 text-center align-middle">Government<br/>Share</th>
              <th className="border border-black p-0 px-1 text-center align-middle">Personal<br/>Share</th>
              <th className="border border-black p-0 px-1 text-center align-middle">Government<br/>Share</th>
              <th className="border border-black p-0 px-1 text-center align-middle">Personal<br/>Share</th>
              <th className="border border-black p-0 px-1 text-center align-middle">Government<br/>Share</th>
            </tr>
          </thead>

          <tbody>
            {/* SB SECTION */}
            {sbEmployees.map((emp, index) => (
              <tr key={`sb-${index}`}>
                <td className="border border-black text-center align-middle" 
    style={{ padding: '2px 2px', height: '10px', fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodFrom || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodTo || ''}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.monthlyRate)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.amountAccrued)}</td>
                {hasGsisEduData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisEduLoan)}</td>
                )}
                {hasGsisMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisMplLoan)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigGovernment)}</td>
                {hasGsisLiteData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisLiteLoan)}</td>
                )}
                {hasLbpData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.lbpLoan)}</td>
                )}
                {hasGfalData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gfalLoan)}</td>
                )}
                {hasPagibigMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigMpl)}</td>
                )}
                {hasEcData && (
                  <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.ec)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            ))}
            
            {/* SB TOTAL ROW */}
            {sbEmployees.length > 0 && (
              <tr className="border border-black text-center align-middle font-bold" 
    style={{ padding: '2px 2px', height: '10px' }}>
                <td colSpan={5} className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>P</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.monthlyRate)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.amountAccrued)}</td>
                {hasGsisEduData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisEduLoan)}</td>
                )}
                {hasGsisMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisMplLoan)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.philhealthPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.philhealthGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.pagibigPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.pagibigGovernment)}</td>
                {hasGsisLiteData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gsisLiteLoan)}</td>
                )}
                {hasLbpData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.lbpLoan)}</td>
                )}
                {hasGfalData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.gfalLoan)}</td>
                )}
                {hasPagibigMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.pagibigMpl)}</td>
                )}
                {hasEcData && (
                  <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.ec)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbTotals.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbEmployees.length + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* MTO SECTION HEADER */}
            {mtoEmployees.length > 0 && (
              <tr>
                <td className="border border-black text-center align-middle font-bold" 
    style={{ padding: '2px 2px', height: '10px' }}></td>
                <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>MTO</td>
                <td colSpan={21} className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* MTO ROWS */}
            {mtoEmployees.map((emp, index) => (
              <tr key={`mto-${index}`}>
                <td className="border border-black text-center align-middle" 
    style={{ padding: '2px 2px', height: '10px', fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodFrom || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodTo || ''}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.monthlyRate)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.amountAccrued)}</td>
                {hasGsisEduData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisEduLoan)}</td>
                )}
                {hasGsisMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisMplLoan)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigGovernment)}</td>
                {hasGsisLiteData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisLiteLoan)}</td>
                )}
                {hasLbpData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.lbpLoan)}</td>
                )}
                {hasGfalData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gfalLoan)}</td>
                )}
                {hasPagibigMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigMpl)}</td>
                )}
                {hasEcData && (
                  <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.ec)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            ))}
            
            {/* MTO TOTAL ROW */}
            {mtoEmployees.length > 0 && (
              <tr className="border border-black text-center align-middle font-bold" 
    style={{padding: '2px 2px', height: '10px' }}>
                <td colSpan={5} className="border border-black p-0 align-middle"></td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.monthlyRate)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.amountAccrued)}</td>
                {hasGsisEduData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisEduLoan)}</td>
                )}
                {hasGsisMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisMplLoan)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.philhealthPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.philhealthGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.pagibigPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.pagibigGovernment)}</td>
                {hasGsisLiteData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gsisLiteLoan)}</td>
                )}
                {hasLbpData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.lbpLoan)}</td>
                )}
                {hasGfalData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.gfalLoan)}</td>
                )}
                {hasPagibigMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.pagibigMpl)}</td>
                )}
                {hasEcData && (
                  <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.ec)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mtoTotals.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbEmployees.length + mtoEmployees.length + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* MENRO SECTION HEADER */}
            {menroEmployees.length > 0 && (
              <tr>
                <td className="border border-black text-center align-middle font-bold" 
    style={{ padding: '2px 2px', height: '10px' }}></td>
                <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>MENRO</td>
                <td colSpan={21} className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* MENRO ROWS */}
            {menroEmployees.map((emp, index) => (
              <tr key={`menro-${index}`}>
                <td className="border border-black text-center align-middle" 
    style={{ padding: '2px 2px', height: '10px', fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodFrom || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodTo || ''}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.monthlyRate)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.amountAccrued)}</td>
                {hasGsisEduData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisEduLoan)}</td>
                )}
                {hasGsisMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisMplLoan)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigGovernment)}</td>
                {hasGsisLiteData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisLiteLoan)}</td>
                )}
                {hasLbpData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.lbpLoan)}</td>
                )}
                {hasGfalData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gfalLoan)}</td>
                )}
                {hasPagibigMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigMpl)}</td>
                )}
                {hasEcData && (
                  <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.ec)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            ))}
            
            {/* GRAND TOTAL ROW */}
            {employees.length > 0 && (
              <tr className="font-bold">
                <td colSpan={5} className="border border-black align-middle font-bold" 
    style={{ padding: '4px 2px', height: '20px', fontSize: `${fontSizes.number}px` }}>Total or Carried forward</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.monthlyRate)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.amountAccrued)}</td>
                {hasGsisEduData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisEduLoan)}</td>
                )}
                {hasGsisMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisMplLoan)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.philhealthPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.philhealthGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.pagibigPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.pagibigGovernment)}</td>
                {hasGsisLiteData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisLiteLoan)}</td>
                )}
                {hasLbpData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.lbpLoan)}</td>
                )}
                {hasGfalData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gfalLoan)}</td>
                )}
                {hasPagibigMplData && (
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.pagibigMpl)}</td>
                )}
                {hasEcData && (
                  <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.ec)}</td>
                )}
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{employees.length + 3}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FOOTER AND SIGNATURES SECTION */}
        <div className="mt-2 space-y-1" style={{ fontSize: `${fontSizes.small}px` }}>
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
            
            <div >
            <div className="mt-3 ml-4">
              <div>(4) APPROVED:</div>
              </div>
              <div className="mt-11 ml-20 pl-20 pt-2 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>JONNA C. ADAN</div>
              <div className="ml-7 pl-36">Municipal Mayor</div>
              
            </div>
            <div>
              <div className=" mt-1">
              <p className="pl-5">(5) I HEREBY CERTIFY on my official oath that I have paid in cash to each official 
                and employee whose name</p> <p>appears on the above  roll the amount opposite his name,
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
            <div className="">
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
              
                 <div className=" font-bold pl-80" style={{ fontSize: `${fontSizes.medium}px` }}>SHIRLITA Y. CHONG</div>
                <div className="pl-80 ml-3">Municipal Vice-Mayor</div>
              
            </div>
            <div></div>            
            <div className="">
              <div className="">
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
          <div className=" pl-72 ml-52">
                <div className="font-bold"style={{ fontSize: `${fontSizes.medium}px` }}>DANNIE LYN I. VILLAFLOR</div>
                <div className="pl-3">Municipal Treasurer</div>
              </div>
          {/* Bottom Slogan */}
          <div className="pl-80 ml-96 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>
            IPAKITA SA MUNDO, UMAASENSO NA TAYO.
          </div>
          
          
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { 
  MdPrint,
  MdDescription,
  MdWaves,
  MdAccessTime
} from 'react-icons/md';

export default function Payslip3() {
  const [paperSize, setPaperSize] = useState("A3");
  const [orientation, setOrientation] = useState("landscape");
  const [employees, setEmployees] = useState([]);
  const [excelData, setExcelData] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const tableRef = useRef(null);
  const location = useLocation();
  const printRef = useRef(null);

  // Track mouse position for parallax effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 10,
        y: (e.clientY / window.innerHeight - 0.5) * 10
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

  // Function to extract employee data from Excel - UPDATED to match PAYROLL3.xlsx structure
  const extractEmployeeDataFromExcel = (workbook) => {
    if (!workbook) return [];
    
    try {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Employee rows based on PAYROLL3.xlsx
      const employeeRows = [15, 16, 17, 18, 19, 20, 21, 25, 26, 27, 28, 32, 33, 37, 38];
      const employees = [];
      
      employeeRows.forEach(row => {
        try {
          // Get cell values based on the actual Excel structure
          const cellA = firstSheet[`A${row}`]; // Number
          const cellC = firstSheet[`C${row}`]; // Name
          const cellD = firstSheet[`D${row}`]; // Designation
          const cellE = firstSheet[`E${row}`]; // Period From
          const cellF = firstSheet[`F${row}`]; // Period To
          const cellG = firstSheet[`G${row}`]; // Monthly Rate
          const cellH = firstSheet[`H${row}`]; // Amount Accrued
          const cellI = firstSheet[`I${row}`]; // GSIS EDUC LOAN
          const cellJ = firstSheet[`J${row}`]; // GSIS MPL LOAN
          const cellK = firstSheet[`K${row}`]; // PHILHEALTH Personal
          const cellL = firstSheet[`L${row}`]; // PHILHEALTH Government
          const cellM = firstSheet[`M${row}`]; // GSIS Premiums Personal
          const cellN = firstSheet[`N${row}`]; // GSIS Premiums Government
          const cellO = firstSheet[`O${row}`]; // Pag-ibig Personal
          const cellP = firstSheet[`P${row}`]; // Pag-ibig Government
          const cellQ = firstSheet[`Q${row}`]; // LBP LOAN
          const cellR = firstSheet[`R${row}`]; // GFAL LOAN
          const cellS = firstSheet[`S${row}`]; // GSIS MPL Lite
          const cellT = firstSheet[`T${row}`]; // Pag-ibig MPL
          const cellU = firstSheet[`U${row}`]; // E.C.
          const cellV = firstSheet[`V${row}`]; // (usually blank or formula)
          const cellW = firstSheet[`W${row}`]; // Amount Paid In Cash
          const cellX = firstSheet[`X${row}`]; // Number (duplicate)
          
          if (cellC && cellC.v) {
            const employeeName = cellC.v.toString().trim();
            
            // Skip empty rows or section headers
            if (employeeName === '' || employeeName === 'MASO' || employeeName === 'LCRO' || employeeName === 'MSWDO') {
              return;
            }
            
            // Determine section based on row ranges from PAYROLL3.xlsx
            let section = '';
            if (row >= 15 && row <= 22) section = 'SB MTO MENRO';
            else if (row >= 25 && row <= 29) section = 'MASO';
            else if (row >= 32 && row <= 34) section = 'LCRO';
            else if (row >= 37 && row <= 39) section = 'MSWDO';
            
            employees.push({
              number: cellA?.v?.toString() || '',
              name: employeeName,
              designation: cellD?.v?.toString() || '',
              periodFrom: formatDate(cellE?.v),
              periodTo: formatDate(cellF?.v),
              monthlyRate: cellG?.v || 0,
              amountAccrued: cellH?.v || 0,
              gsisEduLoan: cellI?.v || 0,
              gsisMplLoan: cellJ?.v || 0,
              philhealthPersonal: cellK?.v || 0,
              philhealthGovernment: cellL?.v || 0,
              gsisPersonal: cellM?.v || 0,
              gsisGovernment: cellN?.v || 0,
              pagibigPersonal: cellO?.v || 0,
              pagibigGovernment: cellP?.v || 0,
              lbpLoan: cellQ?.v || 0,
              gfalLoan: cellR?.v || 0,
              gsisLiteLoan: cellS?.v || 0,
              pagibigMpl: cellT?.v || 0,
              ec: cellU?.v || 0,
              paidInCash: cellW?.v || 0,
              section: section
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
  const sbMtoMenroEmployees = employees.filter(emp => emp.section === 'SB MTO MENRO');
  const masoEmployees = employees.filter(emp => emp.section === 'MASO');
  const lcroEmployees = employees.filter(emp => emp.section === 'LCRO');
  const mswdoEmployees = employees.filter(emp => emp.section === 'MSWDO');

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

  // Check which columns have data
  const hasGsisEduData = hasColumnData(employees, 'gsisEduLoan');
  const hasGsisMplData = hasColumnData(employees, 'gsisMplLoan');
  const hasGsisLiteData = hasColumnData(employees, 'gsisLiteLoan');
  const hasLbpData = hasColumnData(employees, 'lbpLoan');
  const hasGfalData = hasColumnData(employees, 'gfalLoan');
  const hasPagibigMplData = hasColumnData(employees, 'pagibigMpl');
  const hasEcData = hasColumnData(employees, 'ec');

  // Print function
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    const payslipContent = printRef.current?.outerHTML || '';
    
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    let stylesHTML = '';
    styles.forEach(style => {
      if (style.tagName === 'STYLE') {
        stylesHTML += style.outerHTML;
      } else if (style.tagName === 'LINK' && style.rel === 'stylesheet') {
        stylesHTML += style.outerHTML;
      }
    });

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
            background: #0a0a0f;
            color: white;
          }
          
          @media print {
            body { 
              margin: 0 !important; 
              padding: 0 !important;
              background: white;
              color: black;
            }
            
            .print-only { 
              display: block !important; 
            }
            
            .no-print { 
              display: none !important; 
            }
            
            .border, .border-black, .border-gray-300 {
              border: 1px solid black !important;
            }
          }
          
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
     <div className="fixed inset-0 w-full h-full bg-[#0a0a0f] overflow-auto">
      {/* Animated abstract sphere background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: mousePosition.x,
            y: mousePosition.y,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(249, 115, 22, 0.15), transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }}
        />
        
        <motion.div
          animate={{
            x: -mousePosition.x * 0.5,
            y: -mousePosition.y * 0.5,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.15), transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }}
        />
        
        <motion.div
          animate={{
            x: mousePosition.x * 0.3,
            y: mousePosition.y * 0.3,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1), transparent 70%)',
            filter: 'blur(80px)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Controls Section */}
      <div className="relative z-10 mb-4 p-3 rounded-lg bg-gradient-to-br from-[#1a1a2a] to-[#0a0a0f] border border-white/5 mx-4 mt-24"
  style={{
    boxShadow: '30px 30px 60px -15px #050505, -30px -30px 60px -15px #1f1f2a',
  }}
>
        
        
        {/* Print Button and File Info */}
        <div className="mt-3 flex items-center justify-between">
          <div className="p-2 rounded-lg flex-1 mr-3"
            style={{
              background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), #1a1a2a)',
              border: '1px solid rgba(249, 115, 22, 0.2)'
            }}
          >
            <p className="text-sm text-orange-400 flex items-center gap-2">
              <MdDescription className="w-4 h-4" />
              📁 Loaded: {location.state?.fileData?.fileName || 'No file'} ({employees.length} employees)
            </p>
          </div>
          
          <button
            onClick={handlePrint}
            disabled={employees.length === 0}
            className="px-6 py-2 rounded-lg font-medium flex items-center gap-2 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: employees.length > 0 
                ? 'linear-gradient(135deg, #f97316, #ec4899)'
                : 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
              boxShadow: employees.length > 0 
                ? '0 10px 20px -5px #f97316'
                : '5px 5px 10px #050505, -5px -5px 10px #1f1f2a',
            }}
          >
            <MdPrint className="w-5 h-5" />
            🖨️ Print Payroll ({employees.length})
          </button>
        </div>
      </div>

      {/* Main Payslip Container */}
      <div 
        ref={printRef}
        className="bg-white mx-auto px-8 relative z-10"
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
                          orientation === "landscape" ? "400px" : "384px",
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
                            orientation === "landscape" ? "64px" : "128px",
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
              marginRight: paperSize === "A3" && orientation === "landscape" ? "50px" : "40px",
            }}
          >
            We hereby acknowledge to have received from, <span style={{ fontWeight: 'bold' }}>DANNIE LYN I. VILLAFLOR</span> Mun. Treasurer of, 
            <span style={{ fontWeight: 'bold' }}> LILOAN, SOUTHERN LEYTE</span> the sums herein specified opposite our respective names, 
            the same, being full 
            <div>compensation for our services rendered during the period stated below, 
            to the correctness of which we hereby severally certify</div>
          </div>
        </div>

        {/* MAIN TABLE - UPDATED to match PAYROLL3.xlsx structure */}
        <table 
          ref={tableRef}
          className="w-full border-collapse border border-black" 
          style={{ fontSize: `${fontSizes.small}px`, tableLayout: 'auto' }}
        >
          <thead>
            <tr>
              <th rowSpan={3} className="border border-black p-0 align-middle text-center bg-gray-100" style={{ width: '30px', padding: '8px 2px', height: '60px' }}>
                <div className="flex flex-col items-center justify-center h-full" style={{ fontSize: `${fontSizes.number}px` }}>
                  <span>N</span>
                  <span>U</span>
                  <span>M</span>
                  <span>B</span>
                  <span>E</span>
                  <span>R</span>
                </div>
              </th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 bg-gray-100">NAME</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 bg-gray-100">DESIGNATION</th>
              <th colSpan={2} className="border border-black p-0 px-1 text-center bg-gray-100">PERIOD OF SERVICE<br/>(Inclusive Dates)</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center bg-gray-100">Monthly<br/>Rate</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center bg-gray-100">Amount<br/>Accrued</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center bg-gray-100">GSIS<br/>EDUC<br/>LOAN</th>
              <th rowSpan={3} className="border border-black text-center align-middle bg-gray-100" style={{ padding: '2px 2px', height: '5px'}}>GSIS<br/>MPL<br/>LOAN</th>
              <th colSpan={2} className="border border-black p-0 text-center bg-gray-100">PHILHEALTH</th>
              <th colSpan={2} className="border border-black p-0 text-center bg-gray-100">GSIS Premiums</th>
              <th colSpan={2} className="border border-black p-0 text-center bg-gray-100">Pag-ibig</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center bg-gray-100">LBP<br/>LOAN</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center bg-gray-100">GFAL<br/>LOAN</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center bg-gray-100">GSIS<br/>MPL<br/>Lite</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center bg-gray-100">Pag-ibig<br/>MPL</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center bg-gray-100" style={{ width: '25px' }}>E.C.</th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-1 text-center bg-gray-100">Amount<br/>Paid<br/>In<br/>Cash</th>
              <th rowSpan={3} className="border border-black p-0 align-middle text-center bg-gray-100" style={{ width: '25px' }}>
                <div className="flex flex-col items-center justify-center h-full" style={{ fontSize: `${fontSizes.number}px` }}>
                  <span>N</span>
                  <span>U</span>
                  <span>M</span>
                  <span>B</span>
                  <span>E</span>
                  <span>R</span>
                </div>
              </th>
              <th rowSpan={3} className="border border-black p-0 align-middle px-5 text-center bg-gray-100">Signature<br/>of<br/>Payee</th>
            </tr>
            
            <tr>
              <th rowSpan={2} className="border border-black text-center align-middle bg-gray-100" style={{ padding: '2px 2px', height: '10px'}}>From _____</th>
              <th rowSpan={2} className="border border-black p-0 px-1 text-center align-middle bg-gray-100">To ______</th>
              <th rowSpan={2} className="border border-black text-center align-middle bg-gray-100" style={{ padding: '8px 2px', height: '30px' }}>Personal<br/>Share</th>
              <th rowSpan={2} className="border border-black p-0 px-1 text-center align-middle bg-gray-100">Government<br/>Share</th>
              <th rowSpan={2} className="border border-black p-0 px-1 text-center align-middle bg-gray-100">Personal<br/>Share</th>
              <th rowSpan={2} className="border border-black p-0 px-1 text-center align-middle bg-gray-100">Government<br/>Share</th>
              <th rowSpan={2} className="border border-black p-0 px-1 text-center align-middle bg-gray-100">Personal<br/>Share</th>
              <th rowSpan={2} className="border border-black p-0 px-1 text-center align-middle bg-gray-100">Government<br/>Share</th>
            </tr>
          </thead>

          <tbody>
            {/* SB MTO MENRO SECTION */}
            {sbMtoMenroEmployees.length > 0 && (
              <>
                {sbMtoMenroEmployees.map((emp, index) => (
                  <tr key={`sb-${index}`}>
                    <td className="border border-black text-center align-middle bg-gray-50" style={{ padding: '2px 2px', height: '10px', fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                    <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                    <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodFrom || ''}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodTo || ''}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.monthlyRate)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.amountAccrued)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisEduLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisMplLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigPersonal)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigGovernment)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.lbpLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gfalLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisLiteLoan)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigMpl)}</td>
                    <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.ec)}</td>
                    <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.paidInCash)}</td>
                    <td className="border border-black text-center p-0 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                    <td className="border border-black p-0 align-middle"></td>
                  </tr>
                ))}
                
                {/* SB MTO MENRO TOTAL ROW */}
                <tr className="border border-black text-center align-middle font-bold" style={{ padding: '2px 2px', height: '10px' }}>
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
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.lbpLoan)}</td>
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.gfalLoan)}</td>
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.gsisLiteLoan)}</td>
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.pagibigMpl)}</td>
                  <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.ec)}</td>
                  <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(sbMtoMenroTotals.paidInCash)}</td>
                  <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbMtoMenroEmployees.length + 1}</td>
                  <td className="border border-black p-0 align-middle"></td>
                </tr>
              </>
            )}
            
            {/* MASO SECTION HEADER */}
            {masoEmployees.length > 0 && (
              <tr>
                <td className="border border-black text-center align-middle font-bold" style={{ padding: '2px 2px', height: '10px' }}></td>
                <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>MASO</td>
                <td colSpan={21} className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* MASO ROWS */}
            {masoEmployees.map((emp, index) => (
              <tr key={`maso-${index}`}>
                <td className="border border-black text-center align-middle bg-gray-50" style={{ padding: '2px 2px', height: '10px', fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodFrom || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodTo || ''}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.monthlyRate)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.amountAccrued)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisEduLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisMplLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.lbpLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gfalLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisLiteLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigMpl)}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.ec)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            ))}
            
            {/* MASO TOTAL ROW */}
            {masoEmployees.length > 0 && (
              <tr className="border border-black text-center align-middle font-bold" style={{padding: '2px 2px', height: '10px' }}>
                <td colSpan={5} className="border border-black p-0 align-middle"></td>
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
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.lbpLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.gfalLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.gsisLiteLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.pagibigMpl)}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.ec)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(masoTotals.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbMtoMenroEmployees.length + masoEmployees.length + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* LCRO SECTION HEADER */}
            {lcroEmployees.length > 0 && (
              <tr>
                <td className="border border-black text-center align-middle font-bold" style={{ padding: '2px 2px', height: '10px' }}></td>
                <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>LCRO</td>
                <td colSpan={21} className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* LCRO ROWS */}
            {lcroEmployees.map((emp, index) => (
              <tr key={`lcro-${index}`}>
                <td className="border border-black text-center align-middle bg-gray-50" style={{ padding: '2px 2px', height: '10px', fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodFrom || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodTo || ''}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.monthlyRate)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.amountAccrued)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisEduLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisMplLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.lbpLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gfalLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisLiteLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigMpl)}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.ec)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            ))}
            
            {/* LCRO TOTAL ROW */}
            {lcroEmployees.length > 0 && (
              <tr className="border border-black text-center align-middle font-bold" style={{padding: '2px 2px', height: '10px' }}>
                <td colSpan={5} className="border border-black p-0 align-middle"></td>
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
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.lbpLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.gfalLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.gsisLiteLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.pagibigMpl)}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.ec)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(lcroTotals.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbMtoMenroEmployees.length + masoEmployees.length + lcroEmployees.length + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* MSWDO SECTION HEADER */}
            {mswdoEmployees.length > 0 && (
              <tr>
                <td className="border border-black text-center align-middle font-bold" style={{ padding: '2px 2px', height: '10px' }}></td>
                <td className="border border-black p-0 pl-1 font-bold align-middle" style={{ fontSize: `${fontSizes.main}px` }}>MSWDO</td>
                <td colSpan={21} className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* MSWDO ROWS */}
            {mswdoEmployees.map((emp, index) => (
              <tr key={`mswdo-${index}`}>
                <td className="border border-black text-center align-middle bg-gray-50" style={{ padding: '2px 2px', height: '10px', fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.name || ''}</td>
                <td className="border border-black p-0 pl-1 align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.designation || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodFrom || ''}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.main}px` }}>{emp.periodTo || ''}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.monthlyRate)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.amountAccrued)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisEduLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisMplLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.philhealthGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigPersonal)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigGovernment)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.lbpLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gfalLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.gsisLiteLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.pagibigMpl)}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.ec)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{formatNumber(emp.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle bg-gray-50" style={{ fontSize: `${fontSizes.number}px` }}>{emp.number || index + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            ))}
            
            {/* MSWDO TOTAL ROW */}
            {mswdoEmployees.length > 0 && (
              <tr className="border border-black text-center align-middle font-bold" style={{padding: '2px 2px', height: '10px' }}>
                <td colSpan={5} className="border border-black p-0 align-middle"></td>
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
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.lbpLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.gfalLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.gsisLiteLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.pagibigMpl)}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.ec)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(mswdoTotals.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{sbMtoMenroEmployees.length + masoEmployees.length + lcroEmployees.length + mswdoEmployees.length + 1}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            )}
            
            {/* GRAND TOTAL ROW */}
            {employees.length > 0 && (
              <tr className="font-bold">
                <td colSpan={5} className="border border-black align-middle font-bold" style={{ padding: '4px 2px', height: '20px', fontSize: `${fontSizes.number}px` }}>Total or Carried forward</td>
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
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.lbpLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gfalLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.gsisLiteLoan)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.pagibigMpl)}</td>
                <td className="border border-black p-0 text-center align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.ec)}</td>
                <td className="border border-black p-0 text-right pr-1 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{formatTotal(grandTotals.paidInCash)}</td>
                <td className="border border-black text-center p-0 align-middle" style={{ fontSize: `${fontSizes.number}px` }}>{employees.length + 4}</td>
                <td className="border border-black p-0 align-middle"></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FOOTER AND SIGNATURES SECTION - Updated to match PAYROLL3.xlsx */}
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
              <div className="text-left pl-80 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>MARIA LORENDA B. ROYO</div>
                <div className="text-left ml-14 pl-72">Municipal Health Officer I</div>
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
              
                 <div className=" font-bold pl-80" style={{ fontSize: `${fontSizes.medium}px` }}>ANNE MARIE C. SERDAN</div>
                <div className="pl-80 ml-12">MGDH I</div>
              
            </div>
            <div>
              <div className="font-bold pl-1" style={{ fontSize: `${fontSizes.medium}px` }}>RAQUEL M. CERO</div>
              <div className=" ml-3">Mun. Civil Registrar</div>
            </div>            
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
                <div className="font-bold"style={{ fontSize: `${fontSizes.medium}px` }}>NANNETH A. AQUIATAN</div>
                <div className="pl-4">Municipal Agriculturist</div>
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
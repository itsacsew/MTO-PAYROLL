import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { MdPrint, MdDescription, MdRefresh, MdPreview } from 'react-icons/md';

export default function OBS() {
  const [paperSize, setPaperSize] = useState('A3');
  const [orientation, setOrientation] = useState('landscape');
  const [voucherData, setVoucherData] = useState(null);
  const [formData, setFormData] = useState({
    republic: 'Republic of the Philippines',
    province: 'Province of Southern Leyte',
    municipality: 'MUNICIPALITY OF LILOAN',
    voucherNo: '',
    modeCheck: false,
    modeCash: false,
    modeOthers: false,
    payee: '',
    tin: '',
    address: 'Liloan, Southern Leyte',
    toDescription: '',
    totalAmount: '',
    signature1: '',
    printedName1: 'ELLA MAE S. APOLE',
    position1: 'Municipal Accountant',
    position1Sub: 'Head Accounting/Authorized Representative',
    date1: '',
    signature2: '',
    printedName2: 'DANNIE LYN I. VILLAFLOR',
    position2: 'Municipal Treasurer',
    position2Sub: 'Treasurer/Authorized Representative',
    date2: '',
    signature3: '',
    printedName3: 'JONNA C. ADAN',
    position3: 'Municipal Mayor',
    position3Sub: 'Agency Head/Authorized Representative',
    date3: '',
    checkNo: '',
    bankName: '',
    receivedDate: '',
    signatureOverPrintedName: '',
    orOtherDocs: '',
    jevNo: '',
    jevDate: '',
    obligationNo: '',
    responsibilityCenter: '',
    officeUnitProject: '',
    code: '',
  });
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const printRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 10,
        y: (e.clientY / window.innerHeight - 0.5) * 10,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const paperDimensions = {
    A3: { portrait: { width: '1123px', height: '1587px' }, landscape: { width: '1587px', height: '1123px' } },
    A4: { portrait: { width: '793px', height: '1122px' }, landscape: { width: '1122px', height: '793px' } },
    Legal: { portrait: { width: '816px', height: '1344px' }, landscape: { width: '1344px', height: '816px' } },
    Letter: { portrait: { width: '816px', height: '1056px' }, landscape: { width: '1056px', height: '816px' } },
    Tabloid: { portrait: { width: '1056px', height: '1632px' }, landscape: { width: '1632px', height: '1056px' } },
  };

  const convertBase64ToExcel = (base64Data) => {
    try {
      if (!base64Data) return null;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return XLSX.read(bytes, { type: 'array' });
    } catch (error) {
      console.error('Error converting base64 to Excel:', error);
      return null;
    }
  };

  const extractVoucherData = (workbook) => {
    if (!workbook) return null;
    try {
      const sheetName = workbook.SheetNames.find((name) => name === 'Voucher') || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const getCell = (ref) => {
        const cell = sheet[ref];
        return cell ? cell.v : '';
      };
      return {
        republic: getCell('A2'),
        province: getCell('A3'),
        municipality: getCell('A4'),
        voucherNo: getCell('K6'),
        modeCheck: getCell('B8') === 'Check' || getCell('B8') === true,
        modeCash: getCell('D8') === 'Cash' || getCell('D8') === true,
        modeOthers: getCell('F8') === 'Others' || getCell('F8') === true,
        payee: getCell('B9'),
        tin: getCell('G9'),
        obligationNo: getCell('K9'),
        address: getCell('B11'),
        responsibilityCenter: getCell('G12'),
        officeUnitProject: getCell('G13'),
        code: getCell('K13'),
        toDescription: getCell('B16'),
        totalAmount: getCell('B28'),
        signature1: getCell('B33'),
        printedName1: getCell('B36'),
        position1: getCell('B37'),
        position1Sub: getCell('B38'),
        date1: getCell('G36'),
        signature2: getCell('G33'),
        printedName2: getCell('G36'),
        position2: getCell('G37'),
        position2Sub: getCell('G38'),
        date2: getCell('K36'),
        signature3: getCell('B42'),
        printedName3: getCell('B44'),
        position3: getCell('B45'),
        position3Sub: getCell('B46'),
        date3: getCell('G44'),
        checkNo: getCell('G42'),
        bankName: getCell('I42'),
        receivedDate: getCell('K42'),
        signatureOverPrintedName: getCell('G44'),
        orOtherDocs: getCell('B49'),
        jevNo: getCell('G49'),
        jevDate: getCell('K49'),
      };
    } catch (error) {
      console.error('Error extracting voucher data:', error);
      return null;
    }
  };

  useEffect(() => {
    if (location.state?.fileData) {
      const fileData = location.state.fileData;
      if (fileData.fileData) {
        const workbook = convertBase64ToExcel(fileData.fileData);
        if (workbook) {
          const extractedData = extractVoucherData(workbook);
          setVoucherData(extractedData);
          if (extractedData) {
            setFormData(prev => ({
              ...prev,
              ...extractedData,
              modeCheck: extractedData.modeCheck === 'Check' || extractedData.modeCheck === true,
              modeCash: extractedData.modeCash === 'Cash' || extractedData.modeCash === true,
              modeOthers: extractedData.modeOthers === 'Others' || extractedData.modeOthers === true,
            }));
          }
        }
      }
    }
  }, [location.state]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleReset = () => {
    setFormData({
      republic: 'Republic of the Philippines',
      province: 'Province of Southern Leyte',
      municipality: 'MUNICIPALITY OF LILOAN',
      voucherNo: '',
      modeCheck: false,
      modeCash: false,
      modeOthers: false,
      payee: '',
      tin: '',
      obligationNo: '',
      address: 'Liloan, Southern Leyte',
      responsibilityCenter: '',
      officeUnitProject: '',
      code: '',
      toDescription: '',
      totalAmount: '',
      signature1: '',
      printedName1: 'ELLA MAE S. APOLE',
      position1: 'Municipal Accountant',
      position1Sub: 'Head Accounting/Authorized Representative',
      date1: '',
      signature2: '',
      printedName2: 'DANNIE LYN I. VILLAFLOR',
      position2: 'Municipal Treasurer',
      position2Sub: 'Treasurer/Authorized Representative',
      date2: '',
      signature3: '',
      printedName3: 'JONNA C. ADAN',
      position3: 'Municipal Mayor',
      position3Sub: 'Agency Head/Authorized Representative',
      date3: '',
      checkNo: '',
      bankName: '',
      receivedDate: '',
      signatureOverPrintedName: '',
      orOtherDocs: '',
      jevNo: '',
      jevDate: '',
    });
  };

  const getFontSizes = () => {
    switch (paperSize) {
      case 'A3': return { main: 11, small: 9, header: 18, medium: 12 };
      case 'Legal': case 'Tabloid': return { main: 10, small: 8.5, header: 17, medium: 11 };
      default: return { main: 9, small: 8, header: 16, medium: 10 };
    }
  };

  const fontSizes = getFontSizes();
  const dimensions = paperDimensions[paperSize][orientation];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const voucherContent = printRef.current?.outerHTML || '';
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    let stylesHTML = '';
    styles.forEach((style) => {
      if (style.tagName === 'STYLE') stylesHTML += style.outerHTML;
      else if (style.tagName === 'LINK' && style.rel === 'stylesheet') stylesHTML += style.outerHTML;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Disbursement Voucher</title>${stylesHTML}
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
        @media print { body { margin: 0; padding: 0; } }
        .border-b { border-bottom: 1px solid black !important; }
        .border-t { border-top: 1px solid black !important; }
        .border-l { border-left: 1px solid black !important; }
        .border-r { border-right: 1px solid black !important; }
        .border-all { border: 1px solid black !important; }
        td, th { padding: 4px; vertical-align: top; }
        .check-box { display: inline-block; width: 14px; height: 14px; border: 1px solid black; margin-right: 5px; text-align: center; line-height: 14px; font-size: 12px; }
        .signature-line { border-bottom: 1px solid black; min-width: 150px; display: inline-block; width: 100%; }
        .underline { border-bottom: 1px solid black; display: inline-block; min-width: 80px; }
      </style>
      </head>
      <body><div class="print-container">${voucherContent}</div>
      <script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 500); };<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // Helper function for checkboxes
  const Checkbox = ({ checked }) => (
    <span className="check-box">{checked ? '✓' : ''}</span>
  );

  return (
    <div className="fixed inset-0 w-full h-full bg-[#0a0a0f] overflow-auto">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: mousePosition.x, y: mousePosition.y }} transition={{ type: 'spring', stiffness: 50, damping: 30 }}
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle at 30% 30%, rgba(249, 115, 22, 0.15), transparent 70%)', filter: 'blur(60px)' }} />
        <motion.div animate={{ x: -mousePosition.x * 0.5, y: -mousePosition.y * 0.5 }} transition={{ type: 'spring', stiffness: 50, damping: 30 }}
          className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.15), transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 flex h-full">
        {/* LEFT SIDE - USER INPUTS */}
        <div className="w-1/2 h-full overflow-auto bg-gradient-to-br from-[#1a1a2a] to-[#0a0a0f] border-r border-white/10 p-4">
          <div className="sticky top-0 bg-[#1a1a2a]/90 backdrop-blur-sm pb-3 mb-3 border-b border-white/10">
            <h2 className="text-xl font-bold text-orange-400 flex items-center gap-2">
              <MdDescription className="w-6 h-6" />
              User Inputs
            </h2>
            <p className="text-gray-400 text-sm mt-1">Mode of Payment | Payee | TIN | Address | To: | Approved By | Received By</p>
          </div>

          <div className="space-y-4">
            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Mode of Payment</h3>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-white"><input type="checkbox" name="modeCheck" checked={formData.modeCheck} onChange={handleInputChange} className="w-5 h-5" /> Check</label>
                <label className="flex items-center gap-2 text-white"><input type="checkbox" name="modeCash" checked={formData.modeCash} onChange={handleInputChange} className="w-5 h-5" /> Cash</label>
                <label className="flex items-center gap-2 text-white"><input type="checkbox" name="modeOthers" checked={formData.modeOthers} onChange={handleInputChange} className="w-5 h-5" /> Others</label>
              </div>
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Voucher No.</h3>
              <input type="text" name="voucherNo" value={formData.voucherNo} onChange={handleInputChange} placeholder="Voucher Number" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Payee</h3>
              <input type="text" name="payee" value={formData.payee} onChange={handleInputChange} placeholder="Name of Payee" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">TIN/Employee No.</h3>
              <input type="text" name="tin" value={formData.tin} onChange={handleInputChange} placeholder="TIN/Employee Number" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Obligation Request No.</h3>
              <input type="text" name="obligationNo" value={formData.obligationNo} onChange={handleInputChange} placeholder="Obligation Request No." className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Address</h3>
              <input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="Address" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Responsibility Center</h3>
              <input type="text" name="responsibilityCenter" value={formData.responsibilityCenter} onChange={handleInputChange} placeholder="Responsibility Center" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Office/Unit Project</h3>
              <input type="text" name="officeUnitProject" value={formData.officeUnitProject} onChange={handleInputChange} placeholder="Office/Unit Project" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Code</h3>
              <input type="text" name="code" value={formData.code} onChange={handleInputChange} placeholder="Code" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">To: (Description)</h3>
              <textarea name="toDescription" value={formData.toDescription} onChange={handleInputChange} placeholder="Description of payment" rows="4" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"></textarea>
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Total Amount</h3>
              <input type="text" name="totalAmount" value={formData.totalAmount} onChange={handleInputChange} placeholder="Total Amount" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Approved For Payment (Municipal Mayor)</h3>
              <div className="space-y-3">
                <input type="text" name="signature3" value={formData.signature3} onChange={handleInputChange} placeholder="Signature" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
                <input type="text" name="printedName3" value={formData.printedName3} onChange={handleInputChange} placeholder="Printed Name" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
                <input type="text" name="date3" value={formData.date3} onChange={handleInputChange} placeholder="Date" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
              </div>
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">Received Payment</h3>
              <div className="space-y-3">
                <input type="text" name="checkNo" value={formData.checkNo} onChange={handleInputChange} placeholder="Check No." className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
                <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} placeholder="Bank Name" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
                <input type="text" name="receivedDate" value={formData.receivedDate} onChange={handleInputChange} placeholder="Date" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
                <input type="text" name="signatureOverPrintedName" value={formData.signatureOverPrintedName} onChange={handleInputChange} placeholder="Signature Over Printed Name" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
              </div>
            </div>

            <div className="bg-[#1a1a2a]/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-orange-400 font-semibold mb-3">OR/Other Documents & JEV</h3>
              <div className="space-y-3">
                <input type="text" name="orOtherDocs" value={formData.orOtherDocs} onChange={handleInputChange} placeholder="OR/Other Documents" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
                <input type="text" name="jevNo" value={formData.jevNo} onChange={handleInputChange} placeholder="JEV No." className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
                <input type="text" name="jevDate" value={formData.jevDate} onChange={handleInputChange} placeholder="JEV Date" className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white" />
              </div>
            </div>

            <div className="flex gap-3 sticky bottom-0 bg-[#1a1a2a]/90 backdrop-blur-sm py-3">
              <button onClick={handleReset} className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white flex items-center justify-center gap-2"><MdRefresh /> Reset</button>
              <button onClick={handlePrint} className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center gap-2"><MdPrint /> Print</button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - PREVIEW (EXACT EXCEL LAYOUT) */}
        <div className="w-1/2 h-full overflow-auto bg-[#0f0f15] p-4">
          <div className="sticky top-0 bg-[#0f0f15]/90 backdrop-blur-sm pb-3 mb-3 border-b border-white/10">
            <h2 className="text-xl font-bold text-orange-400 flex items-center gap-2">
              <MdPreview className="w-6 h-6" />
              PREVIEW - Exact Excel Layout
            </h2>
          </div>

          <div className="flex justify-center items-start">
            <div ref={printRef} className="bg-white mx-auto shadow-2xl" style={{ width: dimensions.width, maxWidth: '100%', fontSize: `${fontSizes.main}px`, fontFamily: 'Arial, sans-serif' }}>
              <div style={{ padding: '0.4in' }}>
                
                {/* EXACT COPY OF EXCEL LAYOUT MATCHING SCREENSHOT */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                  {/* Row 1: Republic of the Philippines */}
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', fontWeight: 'bold', padding: '2px', border: 'none', fontSize: `${fontSizes.main + 1}px` }}>
                      {formData.republic}
                    </td>
                  </tr>
                  {/* Row 2: Province of Southern Leyte */}
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', fontWeight: 'bold', padding: '2px', border: 'none', fontSize: `${fontSizes.main + 1}px` }}>
                      {formData.province}
                    </td>
                  </tr>
                  {/* Row 3: MUNICIPALITY OF LILOAN */}
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: `${fontSizes.header}px`, padding: '2px', border: 'none' }}>
                      {formData.municipality}
                    </td>
                  </tr>
                  <tr><td colSpan="12" style={{ padding: '4px', border: 'none' }}></td></tr>
                  
                  {/* Row 5: DISBURSEMENT VOUCHER and No. */}
                  <tr>
                    <td colSpan="10" style={{ fontSize: `${fontSizes.header}px`, fontWeight: 'bold', textAlign: 'center', border: 'none' }}>
                      DISBURSEMENT VOUCHER
                    </td>
                    <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold', border: 'none' }}>
                      No.: <span style={{ borderBottom: '1px solid black', minWidth: '100px', display: 'inline-block' }}>{formData.voucherNo || '________'}</span>
                    </td>
                  </tr>
                  <tr><td colSpan="12" style={{ padding: '4px', border: 'none' }}></td></tr>

                  {/* Row 7: Mode of Payment */}
                  <tr>
                    <td colSpan="3" style={{ fontWeight: 'bold', border: 'none' }}>Mode of Payment</td>
                    <td colSpan="2" style={{ border: 'none' }}><span className="check-box" style={{ border: '1px solid black', padding: '2px 6px', marginRight: '5px' }}>{formData.modeCheck ? '✓' : ''}</span> Check</td>
                    <td colSpan="2" style={{ border: 'none' }}><span className="check-box" style={{ border: '1px solid black', padding: '2px 6px', marginRight: '5px' }}>{formData.modeCash ? '✓' : ''}</span> Cash</td>
                    <td colSpan="5" style={{ border: 'none' }}><span className="check-box" style={{ border: '1px solid black', padding: '2px 6px', marginRight: '5px' }}>{formData.modeOthers ? '✓' : ''}</span> Others</td>
                  </tr>
                  
                  {/* Row 8-9: Payee, TIN, Obligation Request No. */}
                  <tr>
                    <td colSpan="2" style={{ fontWeight: 'bold', border: '1px solid black', padding: '6px' }}>Payee</td>
                    <td colSpan="4" style={{ border: '1px solid black', padding: '6px' }}>{formData.payee || '____________________________'}</td>
                    <td colSpan="3" style={{ fontWeight: 'bold', border: '1px solid black', padding: '6px' }}>TIN/Employee No.</td>
                    <td colSpan="3" style={{ border: '1px solid black', padding: '6px' }}>{formData.tin || '______________'}</td>
                  </tr>
                  <tr>
                    <td colSpan="2" style={{ fontWeight: 'bold', border: '1px solid black', padding: '6px' }}>Address</td>
                    <td colSpan="4" style={{ border: '1px solid black', padding: '6px' }}>{formData.address || '__________________________________________________'}</td>
                    <td colSpan="3" style={{ fontWeight: 'bold', border: '1px solid black', padding: '6px' }}>Obligation Request No.</td>
                    <td colSpan="3" style={{ border: '1px solid black', padding: '6px' }}>{formData.obligationNo || '______________'}</td>
                  </tr>
                  
                  <tr><td colSpan="12" style={{ padding: '4px', border: 'none' }}></td></tr>

                  {/* Row 12-13: Responsibility Center, Office/Unit Project, Code */}
                  <tr>
                    <td colSpan="3" style={{ fontWeight: 'bold', border: '1px solid black', padding: '6px' }}>Responsibility Center</td>
                    <td colSpan="3" style={{ border: '1px solid black', padding: '6px' }}>{formData.responsibilityCenter || '____________________'}</td>
                    <td colSpan="3" style={{ fontWeight: 'bold', border: '1px solid black', padding: '6px' }}>Office/Unit Project</td>
                    <td colSpan="3" style={{ border: '1px solid black', padding: '6px' }}>{formData.officeUnitProject || '__________________________'}</td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{ fontWeight: 'bold', border: '1px solid black', padding: '6px' }}>Code</td>
                    <td colSpan="9" style={{ border: '1px solid black', padding: '6px' }}>{formData.code || '______'}</td>
                  </tr>
                  
                  <tr><td colSpan="12" style={{ padding: '8px', border: 'none' }}></td></tr>

                  {/* Row 16: To: Section with border bottom only */}
                  <tr>
                    <td colSpan="1" style={{ fontWeight: 'bold', verticalAlign: 'top', border: 'none', width: '8%' }}>To:</td>
                    <td colSpan="11" style={{ borderBottom: '1px solid black', minHeight: '80px', height: '80px', verticalAlign: 'top' }}>
                      {formData.toDescription || ''}
                    </td>
                  </tr>
                  
                  <tr><td colSpan="12" style={{ padding: '8px', border: 'none' }}></td></tr>

                  {/* TOTAL Amount */}
                  <tr>
                    <td colSpan="9" style={{ border: 'none' }}></td>
                    <td colSpan="1" style={{ fontWeight: 'bold', textAlign: 'right', border: 'none' }}>TOTAL</td>
                    <td colSpan="2" style={{ borderBottom: '1px solid black', textAlign: 'right', paddingRight: '8px' }}>₱ {formData.totalAmount || '0.00'}</td>
                  </tr>
                  
                  <tr><td colSpan="12" style={{ padding: '12px', border: 'none' }}></td></tr>

                  {/* TWO COLUMN CERTIFIED SECTION - SIDE BY SIDE */}
                  <tr>
                    {/* Left CERTIFIED Column */}
                    <td colSpan="5" style={{ border: '1px solid black', verticalAlign: 'top', padding: '0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tr>
                          <td style={{ fontWeight: 'bold', textAlign: 'center', padding: '6px', borderBottom: '1px solid black' }}>CERTIFIED</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px' }}>
                            <span className="check-box" style={{ border: '1px solid black', display: 'inline-block', width: '14px', height: '14px', marginRight: '6px', textAlign: 'center' }}>✓</span> Allotment obligated for the purpose as indicated above<br /><br />
                            <span className="check-box" style={{ border: '1px solid black', display: 'inline-block', width: '14px', height: '14px', marginRight: '6px', textAlign: 'center' }}>✓</span> Supporting documents complete
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px' }}>
                            <div style={{ borderBottom: '1px solid black', width: '80%', marginBottom: '6px' }}>{formData.signature1 || '___________________'}</div>
                            <div style={{ fontWeight: 'bold' }}>{formData.printedName1}</div>
                            <div>{formData.position1}</div>
                            <div style={{ fontSize: `${fontSizes.small}px`, fontStyle: 'italic' }}>{formData.position1Sub}</div>
                            <div style={{ marginTop: '6px' }}>Date: {formData.date1 || '________'}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    
                    {/* Spacer column */}
                    <td colSpan="2" style={{ border: 'none' }}></td>
                    
                    {/* Right CERTIFIED Column */}
                    <td colSpan="5" style={{ border: '1px solid black', verticalAlign: 'top', padding: '0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tr>
                          <td style={{ fontWeight: 'bold', textAlign: 'center', padding: '6px', borderBottom: '1px solid black' }}>CERTIFIED</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px' }}>
                            <span className="check-box" style={{ border: '1px solid black', display: 'inline-block', width: '14px', height: '14px', marginRight: '6px', textAlign: 'center' }}>✓</span> Funds Available
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px' }}>
                            <div style={{ borderBottom: '1px solid black', width: '80%', marginBottom: '6px' }}>{formData.signature2 || '___________________'}</div>
                            <div style={{ fontWeight: 'bold' }}>{formData.printedName2}</div>
                            <div>{formData.position2}</div>
                            <div style={{ fontSize: `${fontSizes.small}px`, fontStyle: 'italic' }}>{formData.position2Sub}</div>
                            <div style={{ marginTop: '6px' }}>Date: {formData.date2 || '________'}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr><td colSpan="12" style={{ padding: '8px', border: 'none' }}></td></tr>

                  {/* APPROVED FOR PAYMENT & RECEIVED PAYMENT - TWO COLUMNS */}
                  <tr>
                    {/* Left APPROVED FOR PAYMENT */}
                    <td colSpan="5" style={{ border: '1px solid black', verticalAlign: 'top', padding: '0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tr>
                          <td style={{ fontWeight: 'bold', textAlign: 'center', padding: '6px', borderBottom: '1px solid black' }}>APPROVED FOR PAYMENT</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px' }}>
                            <div style={{ borderBottom: '1px solid black', width: '80%', marginBottom: '6px' }}>{formData.signature3 || '___________________'}</div>
                            <div style={{ fontWeight: 'bold' }}>{formData.printedName3}</div>
                            <div>{formData.position3}</div>
                            <div style={{ fontSize: `${fontSizes.small}px`, fontStyle: 'italic' }}>{formData.position3Sub}</div>
                            <div style={{ marginTop: '6px' }}>Date: {formData.date3 || '________'}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    
                    <td colSpan="2" style={{ border: 'none' }}></td>
                    
                    {/* Right RECEIVED PAYMENT */}
                    <td colSpan="5" style={{ border: '1px solid black', verticalAlign: 'top', padding: '0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tr>
                          <td style={{ fontWeight: 'bold', textAlign: 'center', padding: '6px', borderBottom: '1px solid black' }}>RECEIVED PAYMENT</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                <tr><td style={{ fontWeight: 'bold', width: '35%' }}>Check No.:</td><td style={{ borderBottom: '1px solid black' }}>{formData.checkNo || '________'}</td></tr>
                                <tr><td style={{ fontWeight: 'bold' }}>Bank Name:</td><td style={{ borderBottom: '1px solid black' }}>{formData.bankName || '________'}</td></tr>
                                <tr><td style={{ fontWeight: 'bold' }}>Date:</td><td style={{ borderBottom: '1px solid black' }}>{formData.receivedDate || '________'}</td></tr>
                              </tbody>
                            </table>
                            <div style={{ marginTop: '10px' }}>
                              <div style={{ borderBottom: '1px solid black', width: '100%', marginBottom: '4px' }}>{formData.signatureOverPrintedName || '___________________________'}</div>
                              <div style={{ fontSize: `${fontSizes.small}px`, fontStyle: 'italic' }}>Signature Over Printed Name</div>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                              <tbody>
                                <tr><td style={{ fontWeight: 'bold', width: '40%' }}>OR/Other Documents:</td><td style={{ borderBottom: '1px solid black' }}>{formData.orOtherDocs || '________'}</td></tr>
                                <tr><td style={{ fontWeight: 'bold' }}>JEV No.:</td><td style={{ borderBottom: '1px solid black' }}>{formData.jevNo || '________'}</td></tr>
                                <tr><td style={{ fontWeight: 'bold' }}>Date:</td><td style={{ borderBottom: '1px solid black' }}>{formData.jevDate || '________'}</td></tr>
                              </tbody>
                            </table>
                           </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr><td colSpan="12" style={{ padding: '8px', border: 'none' }}> </td>
                  </tr>

                  {/* Footer */}
                  <tr>
                    <td colSpan="12" style={{ borderTop: '1px solid black', textAlign: 'center', padding: '8px', fontSize: `${fontSizes.small}px` }}>
                      (This space is intentionally left blank)
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
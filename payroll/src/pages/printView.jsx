import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx'; // For reading Excel files
import { saveAs } from 'file-saver'; // For downloading files

const PrintView = () => {
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [excelData, setExcelData] = useState(null);
  const [excelSheets, setExcelSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const navigate = useNavigate();
  const tableRef = useRef(null);

  useEffect(() => {
    // Get file data from localStorage
    const storedFileData = localStorage.getItem('printFileData');
    
    if (storedFileData) {
      try {
        const parsedData = JSON.parse(storedFileData);
        setFileData(parsedData);
        
        // Parse and display Excel file
        parseExcelFile(parsedData);
      } catch (error) {
        console.error('Error parsing file data:', error);
      }
    }
    
    setLoading(false);
  }, []);

  const parseExcelFile = (fileData) => {
    try {
      if (!fileData.fileData) {
        console.error('No file data found');
        return;
      }

      console.log('Parsing Excel file data...');
      
      // Convert base64 to binary
      const binaryString = atob(fileData.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create workbook from Excel data
      const workbook = XLSX.read(bytes, { type: 'array' });
      
      // Get sheet names
      const sheetNames = workbook.SheetNames;
      setExcelSheets(sheetNames);
      
      // Get data from first sheet
      const firstSheet = workbook.Sheets[sheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      console.log('Excel data loaded:', jsonData);
      setExcelData(jsonData);
      
    } catch (error) {
      console.error('Error parsing Excel file:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleExportToPDF = () => {
    // For now, we'll trigger the browser's print to PDF
    // In a real implementation, you would use a library like jsPDF
    window.print();
  };

  const handleDownloadExcel = () => {
    try {
      if (!fileData.fileData) {
        alert('Error: File data is missing.');
        return;
      }

      const binaryString = atob(fileData.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, fileData.fileName);
      
      alert(`✅ File "${fileData.fileName}" downloaded successfully!`);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('❌ Error downloading file. Please try again.');
    }
  };

  const handleSwitchSheet = (index) => {
    if (fileData && fileData.fileData) {
      try {
        const binaryString = atob(fileData.fileData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheetName = excelSheets[index];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        setExcelData(jsonData);
        setActiveSheet(index);
      } catch (error) {
        console.error('Error switching sheet:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className=" bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Excel file...</p>
        </div>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className=" bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No file data found</h3>
          <p className="mt-2 text-gray-500">Please select a file from the File Received page.</p>
          <button
            onClick={handleGoBack}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className=" bg-gray-50 p-4 md:p-8">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Excel File Preview</h1>
          <p className="text-gray-600">File: {fileData.fileName}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
              {formatFileSize(fileData.fileSize)}
            </span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
              {excelSheets.length} sheet(s)
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {excelSheets.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">Sheet:</span>
              <select
                value={activeSheet}
                onChange={(e) => handleSwitchSheet(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {excelSheets.map((sheet, index) => (
                  <option key={index} value={index}>
                    {sheet}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleGoBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
          <button
            onClick={handleDownloadExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Excel
          </button>
          <button
            onClick={handleExportToPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export to PDF
          </button>
        </div>
      </div>

      {/* Excel File Content */}
      <div className="bg-white rounded-lg shadow-sm print:shadow-none overflow-hidden">
        {/* File Header */}
        <div className="border-b px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{fileData.fileName}</h2>
              <p className="text-gray-600 text-sm mt-1">
                Original: {fileData.originalFileName || fileData.fileName} • 
                Size: {formatFileSize(fileData.fileSize)} • 
                Received: {formatDate(fileData.checkedAt || fileData.receivedAt || fileData.timestamp)}
              </p>
            </div>
            <div className="text-right">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg inline-block">
                <span className="font-bold">ACTIVE SHEET:</span> {excelSheets[activeSheet] || 'Sheet1'}
              </div>
            </div>
          </div>
        </div>

        {/* Excel Table */}
        <div className="overflow-x-auto">
          {excelData && excelData.length > 0 ? (
            <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {excelData[0] && (
                  <tr>
                    {excelData[0].map((header, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b print:border-black print:text-black"
                      >
                        {header || `Column ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {excelData.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 last:border-r-0 print:border print:border-black print:text-black"
                      >
                        {cell !== null && cell !== undefined ? cell.toString() : ''}
                      </td>
                    ))}
                    {/* Fill empty cells if row has fewer columns than header */}
                    {excelData[0] && row.length < excelData[0].length && 
                      Array.from({ length: excelData[0].length - row.length }).map((_, index) => (
                        <td
                          key={`empty-${index}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 border-r border-gray-200 last:border-r-0 print:border print:border-black"
                        >
                          -
                        </td>
                      ))
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No data in Excel file</h3>
              <p className="mt-2 text-gray-500">The Excel file appears to be empty.</p>
            </div>
          )}
        </div>

        {/* File Information Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 print:bg-transparent">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-sm text-gray-600">
              <p><strong>Sender:</strong> {fileData.senderName} ({fileData.senderOffice || 'N/A'})</p>
              <p><strong>Receiver/Checker:</strong> {fileData.checkedBy?.name || fileData.receivedBy?.name || 'N/A'} ({fileData.checkedBy?.office || fileData.receivedBy?.office || 'N/A'})</p>
              <p><strong>Document ID:</strong> {fileData.id}</p>
            </div>
            <div className="text-sm text-gray-600 text-right">
              <p><strong>Sheets:</strong> {excelSheets.join(', ')}</p>
              <p><strong>Rows:</strong> {excelData ? excelData.length - 1 : 0}</p>
              <p><strong>Columns:</strong> {excelData && excelData[0] ? excelData[0].length : 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination for multiple sheets (only show in UI, not in print) */}
      {excelSheets.length > 1 && (
        <div className="print:hidden mt-4 bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Sheets in this Workbook</h3>
          <div className="flex flex-wrap gap-2">
            {excelSheets.map((sheet, index) => (
              <button
                key={index}
                onClick={() => handleSwitchSheet(index)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeSheet === index 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sheet}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            color: #000;
            background-color: #fff;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-black {
            border-color: #000 !important;
          }
          
          .print\\:text-black {
            color: #000 !important;
          }
          
          .print\\:bg-transparent {
            background-color: transparent !important;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
          }
          
          th, td {
            border: 1px solid #000 !important;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold;
          }
          
          tr:nth-child(even) {
            background-color: #f9f9f9 !important;
          }
          
          @page {
            margin: 15mm;
            size: A4 landscape;
          }
          
          @page :first {
            margin-top: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintView;
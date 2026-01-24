import React, { useState } from "react";

export default function Payslip() {
  const [paperSize, setPaperSize] = useState("A3");
  const [orientation, setOrientation] = useState("landscape");

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
          main: orientation === "landscape" ? 9 : 10,
          small: orientation === "landscape" ? 8 : 8.5,
          header: orientation === "landscape" ? 17 : 19,
          medium: orientation === "landscape" ? 10.5 : 11
        };
      case "Legal":
      case "Tabloid":
        return {
          main: orientation === "landscape" ? 9 : 10,
          small: orientation === "landscape" ? 7.5 : 8,
          header: orientation === "landscape" ? 16 : 18,
          medium: orientation === "landscape" ? 10 : 11
        };
      case "Letter":
        return {
          main: orientation === "landscape" ? 8.5 : 9,
          small: orientation === "landscape" ? 7 : 7.5,
          header: orientation === "landscape" ? 15 : 16,
          medium: orientation === "landscape" ? 9.5 : 10
        };
      default: // A4
        return {
          main: orientation === "landscape" ? 7.5 : 8,
          small: orientation === "landscape" ? 6.5 : 7,
          header: orientation === "landscape" ? 14 : 15,
          medium: orientation === "landscape" ? 8.5 : 9
        };
    }
  };

  const fontSizes = getFontSizes();
  const dimensions = paperDimensions[paperSize][orientation];

  // Adjust table column widths for paper sizes
  const getColumnWidths = () => {
    if (paperSize === "A3") {
      if (orientation === "landscape") {
        return {
          numberCol: "3.5%",
          nameCol: "14%",
          designationCol: "11%",
          dateCol: "4%",
          rateCol: "5.5%",
          amountCol: "6.5%",
          loanCol: "3.5%",
          shareCol: "4%",
          signatureCol: "7%"
        };
      } else {
        return {
          numberCol: "3.2%",
          nameCol: "13%",
          designationCol: "10.5%",
          dateCol: "3.8%",
          rateCol: "5%",
          amountCol: "6%",
          loanCol: "3.2%",
          shareCol: "3.8%",
          signatureCol: "6.5%"
        };
      }
    } else if (orientation === "landscape") {
      return {
        numberCol: "4%",
        nameCol: "15%",
        designationCol: "12%",
        dateCol: "5%",
        rateCol: "6%",
        amountCol: "7%",
        loanCol: "4%",
        shareCol: "4%",
        signatureCol: "8%"
      };
    }
    return {
      numberCol: "3%",
      nameCol: "12%",
      designationCol: "10%",
      dateCol: "4%",
      rateCol: "5%",
      amountCol: "6%",
      loanCol: "3%",
      shareCol: "3.5%",
      signatureCol: "6%"
    };
  };

  const colWidths = getColumnWidths();

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
      </div>

      {/* Main Payslip Container */}
      <div 
        className="bg-white mx-auto border border-gray-300 p-1 font-sans shadow-lg"
        style={{
          width: dimensions.width,
          minHeight: dimensions.height,
          maxWidth: dimensions.width,
          fontSize: `${fontSizes.main}px`,
          fontFamily: "Arial, sans-serif"
        }}
      >
        {/* HEADER - Top Section */}
        <div className="text-right mb-1 mt-2 mr-48">
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

        {/* MAIN TABLE - With Fixed Borders */}
        <table className="w-full border-collapse border border-black" style={{ fontSize: `${fontSizes.small}px` }}>
          <thead>
            <tr>
              <th rowSpan={3} className="border border-black p-1 align-middle" style={{ width: colWidths.numberCol }}>
                N <br />U <br />M <br />B <br />E <br />R
              </th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.nameCol }}>NAME</th>
              <th rowSpan={3} className="border border-black p-1 align-middle" style={{ width: colWidths.designationCol }}>DESIGNATION</th>
              <th colSpan={2} className="border border-black p-1">PERIOD OF SERVICE <br />(Inclusive Dates)</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.rateCol }}>Monthly<br/>Rate of Pay</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.amountCol }}>Amount<br/>Accrued<br/>for the<br/>Period</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.loanCol }}>GSIS<br/>EDUC<br/>LOAN</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.loanCol }}>GSIS<br/>MPL<br/>LOAN</th>
              {/* BLANK ROW ABOVE PHILHEALTH, GSIS, PAG-IBIG, LOANS, E.C. */}
              <th colSpan={6} className="border border-black p-0 align-middle" rowSpan={1}></th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.loanCol }}>LBP<br/>LOAN</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.loanCol }}>GFAL<br/>LOAN</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.loanCol }}>GSIS<br/>MPL<br/>Lite</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.loanCol }}>Pag-ibig<br/>LOAN</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: "3%" }}>E.C.</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.amountCol }}>Amount<br/>Paid<br/>In<br/>Cash<br/>(Cr. A-1)</th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.numberCol }}>
                N <br />U <br />M <br />B <br />E <br />R
              </th>
              <th rowSpan={3} className="border border-black p-0 align-middle" style={{ width: colWidths.signatureCol }}>Signature<br/>of<br/>Payee</th>
            </tr>
            
            <tr>
              <th rowSpan={2} className="border border-black p-2 align-middle" style={{ width: colWidths.dateCol }}>From _____</th>
              <th rowSpan={2} className="border border-black p-2 align-middle" style={{ width: colWidths.dateCol }}>To ______</th>
              <th colSpan={2} className="border border-black p-0">PHILHEALTH</th>
              <th colSpan={2} className="border border-black p-0">GSIS Premiums</th>
              <th colSpan={2} className="border border-black p-0">Pag-ibig</th>
            </tr>
            
            <tr>
              <th rowSpan={1} className="border border-black p-0 align-middle" style={{ width: colWidths.shareCol }}>Personal<br/>Share</th>
              <th rowSpan={1} className="border border-black p-0 align-middle" style={{ width: colWidths.shareCol }}>Government<br/>Share</th>
              <th rowSpan={1} className="border border-black p-0 align-middle" style={{ width: colWidths.shareCol }}>Personal<br/>Share</th>
              <th rowSpan={1} className="border border-black p-0 align-middle" style={{ width: colWidths.shareCol }}>Government<br/>Share</th>
              <th rowSpan={1} className="border border-black p-0 align-middle" style={{ width: colWidths.shareCol }}>Personal<br/>Share</th>
              <th rowSpan={1} className="border border-black p-0 align-middle" style={{ width: colWidths.shareCol }}>Government<br/>Share</th>
            </tr>
          </thead>

          <tbody>
            {/* SB SECTION */}
            {/* Row 1 - SHIRLITA Y. CHONG */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">1</td>
              <td className="border border-black p-0 pl-1 align-middle">SHIRLITA Y. CHONG</td>
              <td className="border border-black p-0 pl-1 align-middle">Mun. Vice Mayor</td>
              <td className="border border-black p-0 text-center align-middle">=D14</td>
              <td className="border border-black p-0 text-center align-middle">=E14</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">87,166</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">43,583.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">2,179.15</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">2,179.15</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">39,224.70</td>
              <td className="border border-black text-center p-0 align-middle">1</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 2 - RUEL M. BARBA */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">2</td>
              <td className="border border-black p-0 pl-1 align-middle">RUEL M. BARBA</td>
              <td className="border border-black p-0 pl-1 align-middle">SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=E15</td>
              <td className="border border-black p-0 text-center align-middle">=F15</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">75,306</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">37,653.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">3,383.27</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">4,511.04</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,506.12</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">26,569.92</td>
              <td className="border border-black text-center p-0 align-middle">2</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 3 - ALEX C. LIM */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">3</td>
              <td className="border border-black p-0 pl-1 align-middle">ALEX C. LIM</td>
              <td className="border border-black p-0 pl-1 align-middle">SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=E15</td>
              <td className="border border-black p-0 text-center align-middle">=F15</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">79,054</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">39,527.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,976.35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,976.35</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">35,574.30</td>
              <td className="border border-black text-center p-0 align-middle">3</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 4 - RODOLFO C. CUARES */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">4</td>
              <td className="border border-black p-0 pl-1 align-middle">RODOLFO C. CUARES</td>
              <td className="border border-black p-0 pl-1 align-middle">SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=E15</td>
              <td className="border border-black p-0 text-center align-middle">=F15</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">77,784</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">38,892.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,944.60</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,944.60</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">35,002.80</td>
              <td className="border border-black text-center p-0 align-middle">4</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 5 - VICTOR L. CHUA, JR. */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">5</td>
              <td className="border border-black p-0 pl-1 align-middle">VICTOR L. CHUA, JR.</td>
              <td className="border border-black p-0 pl-1 align-middle">SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=E18</td>
              <td className="border border-black p-0 text-center align-middle">=F18</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">76,534</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">38,267.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,913.35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,913.35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">3,444.03</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">4,592.04</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,530.68</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">7,262.40</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">19,811.55</td>
              <td className="border border-black text-center p-0 align-middle">5</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 6 - JOHN WILBEN C. CHUA */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">6</td>
              <td className="border border-black p-0 pl-1 align-middle">JOHN WILBEN C. CHUA</td>
              <td className="border border-black p-0 pl-1 align-middle">SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=D14</td>
              <td className="border border-black p-0 text-center align-middle">=E14</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">75,306</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">37,653.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">3,383.27</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">4,511.04</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,506.12</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">26,569.92</td>
              <td className="border border-black text-center p-0 align-middle">6</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 7 - THELMA E. COMABIG */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">7</td>
              <td className="border border-black p-0 pl-1 align-middle">THELMA E. COMABIG</td>
              <td className="border border-black p-0 pl-1 align-middle">SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=D14</td>
              <td className="border border-black p-0 text-center align-middle">=E14</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">75,306</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">37,653.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">35,888.70</td>
              <td className="border border-black text-center p-0 align-middle">7</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 8 - RESTITUTO E. HANDAYAN */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">8</td>
              <td className="border border-black p-0 pl-1 align-middle">RESTITUTO E. HANDAYAN</td>
              <td className="border border-black p-0 pl-1 align-middle">SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=D15</td>
              <td className="border border-black p-0 text-center align-middle">=E15</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">77,784</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">38,892.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,944.60</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,944.60</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">35,002.80</td>
              <td className="border border-black text-center p-0 align-middle">8</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 9 - EDUARDO I. CERO */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">9</td>
              <td className="border border-black p-0 pl-1 align-middle">EDUARDO I. CERO</td>
              <td className="border border-black p-0 pl-1 align-middle">SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=D16</td>
              <td className="border border-black p-0 text-center align-middle">=E16</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">75,306</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">37,653.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">3,383.27</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">4,511.04</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">27,776.04</td>
              <td className="border border-black text-center p-0 align-middle">9</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 10 - MANUEL B. UY-OCO, JR. */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">10</td>
              <td className="border border-black p-0 pl-1 align-middle">MANUEL B. UY-OCO, JR.</td>
              <td className="border border-black p-0 pl-1 align-middle">ABCPres./SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=E22</td>
              <td className="border border-black p-0 text-center align-middle">=F22</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">77,784</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">38,892.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,944.60</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,944.60</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">3,500.28</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">4,667.04</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,555.68</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">9,202.06</td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">17,438.74</td>
              <td className="border border-black text-center p-0 align-middle">10</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 11 - RECHEL A. NIEPES */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">11</td>
              <td className="border border-black p-0 pl-1 align-middle">RECHEL A. NIEPES</td>
              <td className="border border-black p-0 pl-1 align-middle">PPSKPres/ SB Member</td>
              <td className="border border-black p-0 text-center align-middle">=E26</td>
              <td className="border border-black p-0 text-center align-middle">=F15</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">75,306</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">37,653.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">3,383.27</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">4,511.04</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,506.12</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">26,569.92</td>
              <td className="border border-black text-center p-0 align-middle">11</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* Row 12 - INDERA C. SOMBREO */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">12</td>
              <td className="border border-black p-0 pl-1 align-middle">INDERA C. SOMBREO</td>
              <td className="border border-black p-0 pl-1 align-middle">SB Secretary</td>
              <td className="border border-black p-0 text-center align-middle">=E15</td>
              <td className="border border-black p-0 text-center align-middle">=F15</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">75,306</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">37,653.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,882.65</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">3,383.27</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">4,511.04</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,506.12</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">960.34</td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">25,609.58</td>
              <td className="border border-black text-center p-0 align-middle">12</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* SB TOTAL ROW */}
            <tr className="font-bold">
              <td colSpan={5} className="border border-black p-0 text-right pr-1 align-middle">P</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(H15:H26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(I15:I26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(J15:J26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(K15:K26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(L15:L26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(M15:M26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(N15:N26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(O15:O26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(P15:P26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(Q15:Q26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(R15:R26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(S15:S26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(T15:T25)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(U15:U26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(V15:V26)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(X15:X26)</td>
              <td className="border border-black text-center p-0 align-middle">=A27</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* MTO SECTION HEADER */}
            <tr>
              <td className="border border-black text-center p-0 align-middle"></td>
              <td className="border border-black p-0 pl-1 font-bold align-middle">MTO</td>
              <td colSpan={21} className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* MTO ROW 16 - DANNIE LYN I. VILLAFLOR */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">16</td>
              <td className="border border-black p-0 pl-1 align-middle">DANNIE LYN I. VILLAFLOR</td>
              <td className="border border-black p-0 pl-1 align-middle">Mun. Treasurer</td>
              <td className="border border-black p-0 text-center align-middle">=E32</td>
              <td className="border border-black p-0 text-center align-middle">=F32</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">76,534</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">38,267.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">10,000.00</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,913.35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,913.35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">3,444.03</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">4,592.04</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,530.68</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">6,000.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">10,573.55</td>
              <td className="border border-black text-center p-0 align-middle">16</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* MTO ROW 17 - ANN MARSHA S. BAYON */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">17</td>
              <td className="border border-black p-0 pl-1 align-middle">ANN MARSHA S. BAYON</td>
              <td className="border border-black p-0 pl-1 align-middle">Rev. Coll. Clerk I</td>
              <td className="border border-black p-0 text-center align-middle">=E26</td>
              <td className="border border-black p-0 text-center align-middle">=F26</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">14,411</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">7,205.50</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">245.17</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">360.27</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">360.28</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,296.99</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,729.32</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">288.22</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">2,333.33</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">2,816.74</td>
              <td className="border border-black text-center p-0 align-middle">17</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* MTO ROW 18 - JOHN LEANDRO P. CAPOTE */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">18</td>
              <td className="border border-black p-0 pl-1 align-middle">JOHN LEANDRO P. CAPOTE</td>
              <td className="border border-black p-0 pl-1 align-middle">Rev. Coll. Clerk I</td>
              <td className="border border-black p-0 text-center align-middle">=E31</td>
              <td className="border border-black p-0 text-center align-middle">=F26</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">13,977</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">6,988.50</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">349.42</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">349.43</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,257.93</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,677.24</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">279.54</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">2,972.94</td>
              <td className="border border-black text-center p-0 align-middle">18</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* MTO TOTAL ROW */}
            <tr className="font-bold">
              <td colSpan={5} className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(H30:H32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(I30:I32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(J30:J32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(K30:K32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(L30:L32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(M30:M32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(N30:N32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(O30:O32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(P30:P32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(Q30:Q32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(R30:R32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=S30+S31+S32</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(T30:T32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(U30:U32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(V30:V32)</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=SUM(X30:X32)</td>
              <td className="border border-black text-center p-0 align-middle">19</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* MENRO SECTION HEADER */}
            <tr>
              <td className="border border-black text-center p-0 align-middle"></td>
              <td className="border border-black p-0 pl-1 font-bold align-middle">MENRO</td>
              <td colSpan={21} className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* MENRO ROW 21 - BENITA B. DIPAY */}
            <tr>
              <td className="border border-black text-center p-0 align-middle">21</td>
              <td className="border border-black p-0 pl-1 align-middle">BENITA B. DIPAY</td>
              <td className="border border-black p-0 pl-1 align-middle">MENRO</td>
              <td className="border border-black p-0 text-center align-middle">=E30</td>
              <td className="border border-black p-0 text-center align-middle">=F32</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">76,534</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">38,267.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">5,000.00</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,913.35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,913.35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">6,888.06</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">9,184.08</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,530.68</td>
              <td className="border border-black p-0 text-center align-middle">200</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">5,129.00</td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 align-middle"></td>
              <td className="border border-black p-0 text-right pr-1 align-middle">1,125.54</td>
              <td className="border border-black p-0 text-center align-middle">100</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">5,276.04</td>
              <td className="border border-black text-center p-0 align-middle">21</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
            
            {/* GRAND TOTAL ROW */}
            <tr className="font-bold">
              <td colSpan={5} className="border border-black p-0 pl-1 align-middle">Total or Carried forward</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=H27+H33+H35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=I27+I33+I35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=J27+J33</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=K27+K33+K35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=L27+L33+L35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=M27+M33+M35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=N27+N33+N35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=O27+O33+O35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=P27+P33+P35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=Q27+Q33+Q35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=R27+R33+R35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=S27+S33+S35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=T27+T33</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=U27+U33+U35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=V27+V33+V35</td>
              <td className="border border-black p-0 text-right pr-1 align-middle">=X27+X33+X35</td>
              <td className="border border-black text-center p-0 align-middle">23</td>
              <td className="border border-black p-0 align-middle"></td>
            </tr>
          </tbody>
        </table>

        {/* FOOTER AND SIGNATURES SECTION */}
        <div className="mt-2 space-y-1" style={{ fontSize: `${fontSizes.small}px` }}>
          {/* First Row of Signatures */}
          <div className={`grid ${paperSize === "A3" ? "grid-cols-3 gap-3" : orientation === "landscape" ? "grid-cols-3 gap-2" : "grid-cols-3 gap-1"}`}>
            <div>
              <div className="leading-tight ml-4 mt-1">
                <p className="pl-5">(1) I HEREBY CERTIFY on my official oath that the above PAYROLL is correct, 
                and that services above stated have been </p><p className="mt-1">duly rendered. Payment for such services 
                is also hereby approved from the appropriation indicated.</p>
              </div>
              <div className="mt-14 ml-4">
                <div className="border-b border-black inline-block"></div>
                <div className="ml-2">_____________________ , 20______</div>
                <div className="ml-2 mt-1">(2) APPROVED for payment subject to preaudit:</div>
              </div>
              <div className="text-left pl-72 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>BENITA B. DIPAY</div>
                <div className="text-left ml-12 pl-64">MENRO</div>
            </div>
            
            <div >
            <div className="mt-3 ml-4">
              <div>(4) APPROVED:</div>
              </div>
              <div className="mt-12 ml-14 pl-20 pt-2 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>JONNA C. ADAN</div>
              <div className="ml-19 pl-36">Municipal Mayor</div>
              
            </div>
            
            <div>
              <div className="leading-tight mt-1">
              <p className="pl-5">(5) I HEREBY CERTIFY on my official oath that I have paid in cash to each official 
                and employee whose name appears on the</p> <p className="mt-1">above  roll the amount opposite his name, 
                under column 19, they having signed or marked his name under column 24 above, 
                in my </p><p className="mt-1">presence and at the time that payment was made to him in acknowledgment 
                of receipt of the money paid him.</p>
              </div>
              <div className="mt-10 ml-56 text-center">
                <div className="border-b border-black inline-block"></div>
                <div className="font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>DANNIE LYN I. VILLAFLOR</div>
                <div>Municipal Treasurer</div>
              </div>
              <div className="ml-10">__________________________________ , 20_________________</div>
            </div>
          </div>
          
          {/* Second Row of Signatures */}
          <div className={`grid ${paperSize === "A3" ? "grid-cols-3 gap-3" : orientation === "landscape" ? "grid-cols-3 gap-2" : "grid-cols-3 gap-1"} mt-1`}>
            <div>
              
              <div className="mt-1">
                <div>_____________________ , 20 ____________________________ Treasurer</div>
              </div>
            </div>
            <div></div>            
            <div className="">
              <div className="leading-tight">
              <p className="pl-5">(6) I HEREBY CERTIFY on my official oath that each employee whose name appears 
                on the above roll has been paid in cash </p><p className="mt-1"> or in check, and in no other mode, 
                the amount shown under column 19 above, opposite his name. The total of the 
                payments made</p><p className="mt-1"> by means this payroll amounts to __________________________________ 
                ( P ___________________ ) pesos only.</p>
              </div>
            </div>
            
            <div >
              <div className="leading-tight">
                (3) Preaudit and approved for payment in the month of<p className="mt-1"><p className="mt-1">
                _____________________ (P______________ ) pesos only.</p></p> 
              </div>
              <div className="mt-1 pl-72">
                
                <div>SHIRLITA Y. CHONG</div>
                <div>Municipal Vice-Mayor</div>
                <div className="mt-2 pl-20 ml-11">
                
                <div>DANNIE LYN I. VILLAFLOR</div>
                <div className="pl-3">Municipal Treasurer</div>
              </div>
              </div>
              <div className="mt-1 text-left">
                <div className="border-b border-black inline-block"></div>
                <div>____________________________ , 20 ____________________________</div>
                <div>Provincial Auditor</div>
              </div>
            </div>
          </div>
          
          {/* Bottom Slogan */}
          <div className="text-center mt-2 font-bold" style={{ fontSize: `${fontSizes.medium}px` }}>
            IPAKITA SA MUNDO, UMAASENSO NA TAYO.
          </div>
          
          <div className="text-center mt-1">
            <div className="border-b border-black w-32 inline-block"></div>
            <div>DANNIE LYN I. VILLAFLOR</div>
            <div>Municipal Treasurer</div>
            <div className="mt-1">
              <div className="border-b border-black w-full inline-block"></div>
              <div>____________________________ , 20 ___________________</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Instructions */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
        <p className="font-bold mb-1">Printing Instructions:</p>
        <ul className="list-disc pl-5">
          <li>Select your desired paper size and orientation above</li>
          <li>Use <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl+P</kbd> to print</li>
          <li>In print settings, set:
            <ul className="list-circle pl-5 mt-1">
              <li>Paper size: <strong>{paperSize}</strong></li>
              <li>Orientation: <strong>{orientation === "portrait" ? "Portrait" : "Landscape"}</strong></li>
              <li>Margins: <strong>Minimum or 0.5cm</strong></li>
              <li>Scale: <strong>100% or Actual Size</strong></li>
              <li>Headers and Footers: <strong>Unchecked</strong></li>
            </ul>
          </li>
          <li className="mt-1"><strong>Tip:</strong> Use A3 Landscape for the best fit of all columns</li>
        </ul>
      </div>
    </div>
  );
}
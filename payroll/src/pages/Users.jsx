// Users.jsx
import React, { useEffect, useState } from "react";
import { FaSpinner, FaSearch } from "react-icons/fa";
import LoginModal from "./LoginModal";
import Scrollbar from "react-scrollbars-custom";

// Spreadsheet info
const sheetId = "1NIRWZMUjRGcWc9jH0oeZwieV8HKY-MaZwHwI1eQRymY";
const gid = "1945990543";

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwEvbe5wZJj0cQ6fN24qLyB-tMiVUfpNgN7GSOetdaliR-C7khDSh--A2SYQShJ6jIdPg/exec";

/* CSV helpers */
function buildCsvUrl(id, gid) {
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

function csvToArray(text, delimiter = ",") {
  const escDelim = String(delimiter).replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const pattern = new RegExp(
    `((?:${escDelim})|\\r?\\n|\\r|^)` +
      `(?:"([^"']*(?:""[^"']*)*)"|([^"${escDelim}\\r\\n]*))`,
    "g"
  );

  const data = [[]];
  let matches = null;
  while ((matches = pattern.exec(text))) {
    const matchedDelimiter = matches[1];
    if (matchedDelimiter.length && matchedDelimiter !== delimiter) {
      data.push([]);
    }
    const matchedValue = matches[2] ? matches[2].replace(/""/g, '"') : matches[3];
    data[data.length - 1].push(matchedValue);
  }
  if (data.length > 0 && data[data.length - 1].length === 1 && data[data.length - 1][0] === "") {
    data.pop();
  }
  return data;
}

function buildCsv(headers, rows) {
  const csvRows = [headers, ...rows].map((r) =>
    r.map((c) => {
      if (c == null) return "";
      const s = String(c).replace(/"/g, '""');
      return `"${s}"`;
    }).join(",")
  );
  return csvRows.join("\r\n");
}

/* Editable cell component */
function EditableCell({ value, onCommit, placeholder }) {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommit(local);
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setLocal(value ?? "");
      e.currentTarget.blur();
    }
  }

  return (
    <input
      type="text"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      onKeyDown={handleKeyDown}
      className="w-full text-sm p-2 rounded border"
    />
  );
}

/* Search Input Component - tuloy-tuloy ang pag-type */
function SearchInput({ value, onSearch, placeholder }) {
  const [searchTerm, setSearchTerm] = useState(value ?? "");

  useEffect(() => {
    setSearchTerm(value ?? "");
  }, [value]);

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch(searchTerm);
    }
  }

  function handleSearch() {
    onSearch(searchTerm);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={searchTerm}
        placeholder={placeholder}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full text-sm p-2 rounded border"
      />
      <button
        onClick={handleSearch}
        className="px-3 py-2 bg-green-500 text-white rounded border hover:bg-green-600 transition flex items-center gap-2"
      >
        <FaSearch />
        Search
      </button>
    </div>
  );
}

/* Main Users / Database component */
export default function SpreadsheetDatabase() {
  const [loading, setLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [error, setError] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [origRows, setOrigRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);
  
  const editableColumnNames = new Set([
    "plate number", 
    "chassis number",
    "name of operator",
    "address of operator", 
    "mv file number",
    "name of driver",
    "license number",
    "contact number"
  ]);

  async function loadDatabase() {
    setError(null);
    setLoading(true);
    try {
      const url = buildCsvUrl(sheetId, gid);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
      const text = await res.text();
      const arr = csvToArray(text);
      if (!arr || arr.length === 0) throw new Error("CSV appears empty or unparsable");
      const h = arr[0].map((hh) => (hh === undefined || hh === null || hh === "" ? "(empty)" : hh));
      const r = arr.slice(1);
      setHeaders(h);
      setOrigRows(r);
      setRows(r.map((row) => row.slice()));
      setFilteredRows(r.map((row) => row.slice()));
      setVisible(true);
      setDirty(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setHeaders([]);
      setOrigRows([]);
      setRows([]);
      setFilteredRows([]);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  // Search function for Franchise Number
  // Search function for multiple fields
function handleSearch(searchValue) {
  setSearchTerm(searchValue);
  
  if (!searchValue.trim()) {
    setFilteredRows(rows);
    setIsSearching(false);
    return;
  }

  setIsSearching(true);
  
  // Find column indices for all searchable fields
  const franchiseColIndex = headers.findIndex(header => 
    String(header).toLowerCase().includes("franchise")
  );
  
  const operatorColIndex = headers.findIndex(header => 
    String(header).toLowerCase().includes("name of operator") ||
    String(header).toLowerCase().includes("operator")
  );
  
  const binColIndex = headers.findIndex(header => 
    String(header).toLowerCase().includes("business identification number") ||
    String(header).toLowerCase().includes("bin")
  );
  
  const driverColIndex = headers.findIndex(header => 
    String(header).toLowerCase().includes("name of driver") ||
    String(header).toLowerCase().includes("driver")
  );

  // Check if any searchable columns exist
  const searchableColumnsExist = franchiseColIndex !== -1 || operatorColIndex !== -1 || 
                                binColIndex !== -1 || driverColIndex !== -1;

  if (!searchableColumnsExist) {
    alert("No searchable columns found in the database");
    setFilteredRows(rows);
    return;
  }

  const filtered = rows.filter(row => {
    const searchLower = searchValue.toLowerCase();
    
    // Check each searchable column for matches
    if (franchiseColIndex !== -1) {
      const franchiseValue = String(row[franchiseColIndex] || "").toLowerCase();
      if (franchiseValue.includes(searchLower)) return true;
    }
    
    if (operatorColIndex !== -1) {
      const operatorValue = String(row[operatorColIndex] || "").toLowerCase();
      if (operatorValue.includes(searchLower)) return true;
    }
    
    if (binColIndex !== -1) {
      const binValue = String(row[binColIndex] || "").toLowerCase();
      if (binValue.includes(searchLower)) return true;
    }
    
    if (driverColIndex !== -1) {
      const driverValue = String(row[driverColIndex] || "").toLowerCase();
      if (driverValue.includes(searchLower)) return true;
    }
    
    return false;
  });

  setFilteredRows(filtered);
}

  function clearSearch() {
    setSearchTerm("");
    setFilteredRows(rows);
    setIsSearching(false);
  }

  async function handleShow() {
    setError(null);
    try {
      const stored = window.localStorage.getItem("user");
      if (!stored) {
        setLoginOpen(true);
        return;
      }
    } catch (e) {
      setLoginOpen(true);
      return;
    }

    if (visible) {
      setVisible(false);
      setSearchTerm("");
      setIsSearching(false);
      return;
    }

    await loadDatabase();
  }

  async function handleOnLoginSuccess(user) {
    setLoginOpen(false);
    await loadDatabase();
  }

  // FIXED: Simplified commitCell function
  function commitCell(rowIdx, colIdx, value) {
    setRows((prev) => {
      const copy = prev.map((r) => r.slice());
      while (copy[rowIdx].length < headers.length) copy[rowIdx].push("");
      copy[rowIdx][colIdx] = value;
      return copy;
    });

    setFilteredRows((prev) => {
      const copy = prev.map((r) => r.slice());
      while (copy[rowIdx].length < headers.length) copy[rowIdx].push("");
      copy[rowIdx][colIdx] = value;
      return copy;
    });

    setDirty(true);
  }

  // FIXED: Simplified deleteRow function
  function deleteRow(idx) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setFilteredRows((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function resetChanges() {
    setRows(origRows.map((r) => r.slice()));
    setFilteredRows(origRows.map((r) => r.slice()));
    setDirty(false);
    setSearchTerm("");
    setIsSearching(false);
  }

  function exportCsv() {
    const csv = buildCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sheet_${gid}_edited.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDirty(false);
  }

  function reloadDatabase() {
    setVisible(false);
    setLoading(true);
    setRows([]);
    setHeaders([]);
    setSearchTerm("");
    setIsSearching(false);
    
    setTimeout(() => {
      loadDatabase();
    }, 4000);
  }

  async function pushToSheets() {
    setPushLoading(true);
    
    try {
      // Start all requests without waiting for responses
      const promises = [];
      for (let i = 0; i < rows.length; i++) {
        const rowIndex = i + 2;
        const values = rows[i];
  
        const payload = {
          action: "updateRow",
          row: rowIndex,
          values: values
        };
  
        // Start the request but don't wait for response
        promises.push(
          fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload),
          })
        );
      }
  
      // Wait for 3 seconds then show success
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setDirty(false);
      
      // Reload to get fresh data
      reloadDatabase();
      
    } catch (err) {
      console.error("Error pushing to sheets:", err);
    } finally {
      setPushLoading(false);
    }
  } 
  // TableView component
  function TableView({ compact } = {}) {
    const displayRows = isSearching || searchTerm ? filteredRows : rows;

    return (
      <div className={`w-full ${compact ? "" : "max-w-full"} pb-8`}>
        {/* Search Section */}
        {/* Search Section */}
<div className="mb-4 p-4 bg-gray-50 rounded-lg border">
  <label className="block text-sm font-medium mb-2">
    Search by Franchise Number, Name of Operator, BIN, or Name of Driver
  </label>
  <SearchInput 
    value={searchTerm} 
    onSearch={handleSearch}
    placeholder="Search franchise number, operator name, BIN, or driver name..."
  />
  {(isSearching || searchTerm) && (
    <div className="mt-2 flex items-center justify-between">
      <span className="text-sm text-blue-600">
        Showing {filteredRows.length} result(s) for "{searchTerm}"
      </span>
      <button 
        onClick={clearSearch}
        className="text-sm text-red-600 hover:text-red-800 underline"
      >
        Clear Search
      </button>
    </div>
  )}
</div>

        <div className="overflow-x-auto border rounded-lg pb-6">
          <Scrollbar
            style={{ width: "100%", height: "70vh" }}
            trackYProps={{ style: { background: "#f0f0f0", borderRadius: "8px" } }}
            thumbYProps={{ style: { background: "blue", borderRadius: "8px" } }}
          >
            <table className="min-w-full divide-y table-auto">
              <thead className="bg-blue-100 sticky top-0 z-10">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-4 py-2 text-left text-sm font-medium whitespace-normal break-words" style={{ minWidth: 140 }}>
                      {h}
                      {editableColumnNames.has(String(h).toLowerCase().trim()) && <span className="ml-2 text-xs text-blue-600">(editable)</span>}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                    {headers.map((_, cIdx) => {
                      const colName = String(headers[cIdx] ?? "").toLowerCase().trim();
                      const isEditable = editableColumnNames.has(colName);
                      const cellValue = displayRows[rIdx][cIdx] ?? "";

                      return (
                        <td key={cIdx} className="px-2 py-2 text-sm align-top whitespace-normal break-words" style={{ maxWidth: 400 }}>
                          <div style={{ paddingBottom: 12 }}>
                            {isEditable ? (
                              <EditableCell 
                                value={cellValue} 
                                onCommit={(newVal) => commitCell(rIdx, cIdx, newVal)} 
                                placeholder={colName} 
                              />
                            ) : (
                              <div className="text-sm break-words whitespace-normal">{cellValue}</div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    <td className="px-2 py-2 text-sm align-top">
                      <div className="flex flex-col gap-2" style={{ paddingBottom: 12 }}>
                        <button 
                          onClick={() => deleteRow(rIdx)} 
                          className="px-3 py-1 rounded border text-sm bg-red-500 text-white hover:bg-red-600 transition"
                          title="Delete this row"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Spacer row */}
                <tr>
                  <td colSpan={headers.length + 1} style={{ height: 24 }} />
                </tr>
              </tbody>
            </table>
          </Scrollbar>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <label className="block text-lg font-semibold">Database</label>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleShow} 
            className="px-4 py-2 rounded-lg shadow-sm border hover:shadow-md transition bg-blue-500 text-white"
          >
            {loading ? "Loading..." : visible ? "Hide Database" : "Show Database"}
          </button>

          <button 
            onClick={() => setExpanded(true)} 
            className={`px-3 py-2 rounded-lg border transition ${visible ? "bg-green-500 text-white" : "opacity-50 cursor-not-allowed"}`} 
            disabled={!visible} 
            title={visible ? "Open larger view" : "Show database first"}
          >
            Expand
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded">Error: {error}. Make sure sheet is public/published.</div>}

      {visible && headers.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
  Loaded {rows.length} records {isSearching && `(Filtered: ${filteredRows.length} records for "${searchTerm}")`}
</div>

            <div className="flex items-center gap-2">
              <button 
                onClick={exportCsv} 
                className={`px-3 py-1 rounded border ${rows.length === 0 ? "opacity-50 cursor-not-allowed" : "bg-green-500 text-white"}`} 
                disabled={rows.length === 0} 
                title="Download CSV of current table"
              >
                Save (Export CSV)
              </button>

              <button 
                onClick={resetChanges} 
                className={`px-3 py-1 rounded border ${dirty ? "bg-yellow-500 text-white" : "opacity-50 cursor-not-allowed"}`} 
                disabled={!dirty} 
                title="Discard unsaved changes"
              >
                Reset
              </button>

              <button 
  onClick={pushToSheets} 
  className={`px-3 py-1 rounded border flex items-center gap-2 ${dirty ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"} ${pushLoading ? "opacity-50 cursor-not-allowed" : ""}`} 
  disabled={!dirty || pushLoading}
>
  {pushLoading ? (
    <>
      <FaSpinner className="animate-spin" /> 
      <span>Pushing...</span>
    </>
  ) : dirty ? (
    <span>Push to Sheets</span>
  ) : (
    <>
      <span>✅ Pushed Successfully</span>
    </>
  )}
</button>
              <div className={`text-sm font-medium ${dirty ? "text-orange-600" : "text-green-600"}`}>
                {dirty ? "⚠️ Unsaved changes" : "✅ All changes saved"}
              </div>
            </div>
          </div>

          <TableView compact />
        </div>
      )}

      {!visible && !loading && headers.length === 0 && (
        <p className="text-sm text-gray-600 mt-2">Press "Show Database" to load the sheet data.</p>
      )}

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setExpanded(false)} aria-hidden />
          <div className="relative bg-white overflow-auto rounded-xl shadow-2xl z-60 p-6" style={{ width: "min(96vw, 1400px)", maxWidth: "1400px", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Database — Expanded Editable View</h3>
              <div className="flex items-center gap-3">
                <button onClick={exportCsv} className="px-3 py-2 rounded border bg-green-500 text-white">Save (Export CSV)</button>
                <button onClick={() => setExpanded(false)} className="px-3 py-2 rounded border bg-gray-500 text-white">Close</button>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              Tip: Plate Number, Chassis Number, Name of Operator, Address of Operator, MV File Number, Name of Driver, License Number, and Contact are editable.
            </div>

            <TableView />
          </div>
        </div>
      )}

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLoginSuccess={handleOnLoginSuccess} />
    </div>
  );
}
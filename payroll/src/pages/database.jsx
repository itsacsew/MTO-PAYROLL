// Database.jsx - Fetches data specifically from sentFiles collection
import React, { useState, useEffect } from "react";
import { 
  MdSearch, 
  MdRefresh, 
  MdDownload, 
  MdPrint, 
  MdFilterList,
  MdClose,
  MdArrowDropDown,
  MdArrowDropUp,
  MdVisibility,
  MdDelete,
  MdEdit,
  MdSend,
  MdDownload as MdReceive,
  MdCheckCircle,
  MdSchedule,
  MdPerson,
  MdBusiness,
  MdAttachFile
} from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../config/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  doc,
  deleteDoc,
  updateDoc,
  where,
  onSnapshot
} from "firebase/firestore";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const Database = () => {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editData, setEditData] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [uniqueOffices, setUniqueOffices] = useState([]);
  const [uniqueStatuses, setUniqueStatuses] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    received: 0,
    checked: 0,
    processed: 0
  });

  // Fetch data from sentFiles collection with real-time listener
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const sentFilesRef = collection(db, "sentFiles");
        const q = query(sentFilesRef, orderBy("timestamp", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const data = [];
          snapshot.forEach((doc) => {
            const fileData = doc.data();
            data.push({
              id: doc.id,
              fileName: fileData.fileName || 'Unknown File',
              fileUrl: fileData.fileUrl || '',
              fileType: fileData.fileType || 'unknown',
              fileSize: fileData.fileSize || 0,
              status: fileData.status || 'pending',
              timestamp: fileData.timestamp?.toDate?.() || new Date(fileData.createdAt || Date.now()),
              senderOffice: fileData.senderOffice || fileData.office || 'MTO',
              receiverOffice: fileData.receiverOffice || '',
              description: fileData.description || '',
              updatedEmployees: fileData.updatedEmployees || [],
              seniorEmployees: fileData.seniorEmployees || [],
              lastCheckedAt: fileData.lastCheckedAt?.toDate?.() || fileData.lastCheckedAt || null,
              lastUpdatedAt: fileData.lastUpdatedAt?.toDate?.() || fileData.lastUpdatedAt || null,
              checkedBy: fileData.checkedBy || '',
              checkedByName: fileData.checkedByName || '',
              receivedAt: fileData.receivedAt?.toDate?.() || fileData.receivedAt || null,
              processedAt: fileData.processedAt?.toDate?.() || fileData.processedAt || null
            });
          });
          
          setAllData(data);
          
          // Extract unique values for filters
          const offices = [...new Set(data.map(item => item.senderOffice || item.receiverOffice).filter(Boolean))];
          const statuses = [...new Set(data.map(item => item.status).filter(Boolean))];
          setUniqueOffices(offices);
          setUniqueStatuses(statuses);
          
          // Calculate stats
          const total = data.length;
          const pending = data.filter(item => item.status === 'pending' || item.status === 'sent').length;
          const received = data.filter(item => item.status === 'received').length;
          const checked = data.filter(item => item.status === 'checked' || item.status === 'updated').length;
          const processed = data.filter(item => item.status === 'processed').length;
          
          setStats({ total, pending, received, checked, processed });
          setLoading(false);
        }, (error) => {
          console.error("Real-time listener error:", error);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters and search
  useEffect(() => {
    applyFiltersAndSearch();
  }, [allData, searchTerm, statusFilter, officeFilter, dateRange, sortConfig]);

  const applyFiltersAndSearch = () => {
    let filtered = [...allData];
    
    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(item => {
        return Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // Apply office filter (check both sender and receiver)
    if (officeFilter !== "all") {
      filtered = filtered.filter(item => 
        item.senderOffice === officeFilter || item.receiverOffice === officeFilter
      );
    }
    
    // Apply date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(item => {
        const itemDate = item.timestamp ? new Date(item.timestamp) : null;
        return itemDate && itemDate >= startDate;
      });
    }
    
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(item => {
        const itemDate = item.timestamp ? new Date(item.timestamp) : null;
        return itemDate && itemDate <= endDate;
      });
    }
    
    // Apply sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle dates
        if (aValue instanceof Date) {
          aValue = aValue.getTime();
          bValue = bValue ? bValue.getTime() : 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExportExcel = () => {
    // Prepare data for export
    const exportData = filteredData.map(item => {
      const exportItem = { ...item };
      // Remove id if not needed
      delete exportItem.id;
      // Format dates
      if (exportItem.timestamp) {
        exportItem.timestamp = new Date(exportItem.timestamp).toLocaleString();
      }
      if (exportItem.lastCheckedAt) {
        exportItem.lastCheckedAt = new Date(exportItem.lastCheckedAt).toLocaleString();
      }
      if (exportItem.receivedAt) {
        exportItem.receivedAt = new Date(exportItem.receivedAt).toLocaleString();
      }
      if (exportItem.processedAt) {
        exportItem.processedAt = new Date(exportItem.processedAt).toLocaleString();
      }
      // Convert arrays to string
      if (exportItem.updatedEmployees) {
        exportItem.updatedEmployees = exportItem.updatedEmployees.join(', ');
      }
      if (exportItem.seniorEmployees) {
        exportItem.seniorEmployees = exportItem.seniorEmployees.join(', ');
      }
      return exportItem;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SentFiles");
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `sentFiles_data_${new Date().toISOString()}.xlsx`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Sent Files Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #fff; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f97316; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            h1 { color: #333; }
            .header { margin-bottom: 20px; }
            .date { color: #666; }
            .status-pending { color: #f97316; }
            .status-received { color: #f59e0b; }
            .status-checked { color: #a855f7; }
            .status-processed { color: #10b981; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sent Files Export</h1>
            <p class="date">Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Records: ${filteredData.length}</p>
          </div>
          ${generatePrintTable()}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintTable = () => {
    if (filteredData.length === 0) return '<p>No data available</p>';
    
    const headers = ['File Name', 'Status', 'Sender Office', 'Receiver Office', 'Date Sent', 'Description', 'Checked By'];
    
    let html = '<table><thead>起源于';
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</thead><tbody>';
    
    filteredData.forEach(item => {
      html += '<tr>';
      html += `<td>${item.fileName || '-'}</td>`;
      html += `<td class="status-${item.status}">${item.status?.toUpperCase() || 'PENDING'}</td>`;
      html += `<td>${item.senderOffice || '-'}</td>`;
      html += `<td>${item.receiverOffice || '-'}</td>`;
      html += `<td>${item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}</td>`;
      html += `<td>${item.description || '-'}</td>`;
      html += `<td>${item.checkedByName || item.checkedBy || '-'}</td>`;
      html += '</tr>';
    });
    
    html += '</tbody>}</div>';
    return html;
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteDoc(doc(db, "sentFiles", itemToDelete.id));
      // Data will update automatically via real-time listener
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document: " + error.message);
    }
  };

  const handleEdit = async () => {
    if (!editingItem) return;
    
    try {
      const docRef = doc(db, "sentFiles", editingItem.id);
      await updateDoc(docRef, editData);
      // Data will update automatically via real-time listener
      setShowEditModal(false);
      setEditingItem(null);
      setEditData({});
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Failed to update document: " + error.message);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    // Remove id and non-editable fields
    const { id, timestamp, lastCheckedAt, lastUpdatedAt, receivedAt, processedAt, ...editable } = item;
    setEditData(editable);
    setShowEditModal(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setOfficeFilter("all");
    setDateRange({ start: "", end: "" });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: <MdSchedule size={14} /> },
      sent: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: <MdSend size={14} /> },
      received: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <MdReceive size={14} /> },
      checked: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: <MdCheckCircle size={14} /> },
      updated: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: <MdCheckCircle size={14} /> },
      processed: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: <MdCheckCircle size={14} /> },
      default: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: <MdAttachFile size={14} /> }
    };
    
    const config = statusConfig[status] || statusConfig.default;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg} border ${config.border}`}>
        {config.icon}
        {status?.toUpperCase() || 'PENDING'}
      </span>
    );
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const StatCard = ({ title, value, color, icon }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
        boxShadow: '10px 10px 20px #050505, -10px -10px 20px #1f1f2a',
        border: '1px solid rgba(255,255,255,0.03)'
      }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      </div>
    </motion.div>
  );

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Sent Files Database
          </h1>
          <p className="text-gray-400">View and manage all sent files from Firestore</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <StatCard 
            title="Total Files" 
            value={stats.total} 
            color="text-white"
            icon={<div className="w-full h-full bg-gradient-to-r from-orange-500 to-pink-500" />}
          />
          <StatCard 
            title="Pending" 
            value={stats.pending} 
            color="text-orange-400"
            icon={<div className="w-full h-full bg-orange-500" />}
          />
          <StatCard 
            title="Received" 
            value={stats.received} 
            color="text-amber-400"
            icon={<div className="w-full h-full bg-amber-500" />}
          />
          <StatCard 
            title="Checked" 
            value={stats.checked} 
            color="text-purple-400"
            icon={<div className="w-full h-full bg-purple-500" />}
          />
          <StatCard 
            title="Processed" 
            value={stats.processed} 
            color="text-green-400"
            icon={<div className="w-full h-full bg-green-500" />}
          />
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by file name, office, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                />
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 rounded-xl flex items-center gap-2"
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a'
              }}
            >
              <MdFilterList className="text-orange-400" />
              <span className="text-white">Filters</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.reload()}
              className="px-4 py-3 rounded-xl flex items-center gap-2"
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a'
              }}
            >
              <MdRefresh className="text-gray-400" />
              <span className="text-white">Refresh</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportExcel}
              className="px-4 py-3 rounded-xl flex items-center gap-2"
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a'
              }}
            >
              <MdDownload className="text-green-400" />
              <span className="text-white">Export Excel</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrint}
              className="px-4 py-3 rounded-xl flex items-center gap-2"
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: '5px 5px 10px #050505, -5px -5px 10px #1f1f2a'
              }}
            >
              <MdPrint className="text-blue-400" />
              <span className="text-white">Print</span>
            </motion.button>
          </div>
          
          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl space-y-3"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-white text-sm"
                        style={{
                          background: '#0a0a0f',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <option value="all">All Status</option>
                        {uniqueStatuses.map(status => (
                          <option key={status} value={status}>{status.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Office</label>
                      <select
                        value={officeFilter}
                        onChange={(e) => setOfficeFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-white text-sm"
                        style={{
                          background: '#0a0a0f',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <option value="all">All Offices</option>
                        {uniqueOffices.map(office => (
                          <option key={office} value={office}>{office}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Items per page</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg text-white text-sm"
                        style={{
                          background: '#0a0a0f',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <option value={10}>10 rows</option>
                        <option value={25}>25 rows</option>
                        <option value={50}>50 rows</option>
                        <option value={100}>100 rows</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Date From</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-white text-sm"
                        style={{
                          background: '#0a0a0f',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Date To</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-white text-sm"
                        style={{
                          background: '#0a0a0f',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Data Table */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
                />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-20">
                <MdAttachFile className="text-gray-600 text-5xl mx-auto mb-3" />
                <p className="text-gray-400">No sent files found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('fileName')}>
                      <div className="flex items-center gap-1">
                        FILE NAME
                        {sortConfig.key === 'fileName' && (sortConfig.direction === 'asc' ? <MdArrowDropUp /> : <MdArrowDropDown />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">
                        STATUS
                        {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <MdArrowDropUp /> : <MdArrowDropDown />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('senderOffice')}>
                      <div className="flex items-center gap-1">
                        SENDER
                        {sortConfig.key === 'senderOffice' && (sortConfig.direction === 'asc' ? <MdArrowDropUp /> : <MdArrowDropDown />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('receiverOffice')}>
                      <div className="flex items-center gap-1">
                        RECEIVER
                        {sortConfig.key === 'receiverOffice' && (sortConfig.direction === 'asc' ? <MdArrowDropUp /> : <MdArrowDropDown />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('timestamp')}>
                      <div className="flex items-center gap-1">
                        DATE SENT
                        {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? <MdArrowDropUp /> : <MdArrowDropDown />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                      DESCRIPTION
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedRow(selectedRow === item.id ? null : item.id)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <MdAttachFile className="text-orange-400" size={16} />
                          <span className="font-medium">{item.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <MdBusiness size={14} className="text-gray-500" />
                          {item.senderOffice}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <MdPerson size={14} className="text-gray-500" />
                          {item.receiverOffice || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatDate(item.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                        {item.description || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(item);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                            title="Edit"
                          >
                            <MdEdit className="text-blue-400" size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
                            <MdDelete className="text-red-400" size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          {!loading && filteredData.length > 0 && (
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-gray-400">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    boxShadow: '3px 3px 6px #050505, -3px -3px 6px #1f1f2a'
                  }}
                >
                  Previous
                </button>
                <span className="px-4 py-1 rounded-lg text-white"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a'
                  }}
                >
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                    boxShadow: '3px 3px 6px #050505, -3px -3px 6px #1f1f2a'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[201]"
            >
              <div className="relative rounded-2xl overflow-hidden p-6"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '30px 30px 60px -15px #000000',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete "{itemToDelete?.fileName}"? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl text-gray-300 hover:text-white transition-colors"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: '3px 3px 6px #050505, -3px -3px 6px #1f1f2a'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 rounded-xl text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-[201]"
            >
              <div className="relative rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                  boxShadow: '30px 30px 60px -15px #000000',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                <div className="p-6 border-b border-white/5">
                  <h3 className="text-xl font-bold text-white">Edit File Information</h3>
                  <p className="text-sm text-gray-400 mt-1">Editing: {editingItem.fileName}</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {Object.entries(editData).map(([key, value]) => {
                      // Skip certain fields
                      if (key === 'id' || key === 'timestamp' || key === 'createdAt' || key === 'updatedEmployees' || key === 'seniorEmployees') return null;
                      
                      return (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {key.replace(/_/g, ' ').toUpperCase()}
                          </label>
                          {key === 'description' ? (
                            <textarea
                              value={value || ''}
                              onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl text-white placeholder-gray-500"
                              rows={3}
                              style={{
                                background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
                                boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
                                border: '1px solid rgba(255,255,255,0.03)'
                              }}
                            />
                          ) : key === 'status' ? (
                            <select
                              value={value || 'pending'}
                              onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl text-white"
                              style={{
                                background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
                                boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
                                border: '1px solid rgba(255,255,255,0.03)'
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="sent">Sent</option>
                              <option value="received">Received</option>
                              <option value="checked">Checked</option>
                              <option value="processed">Processed</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={value || ''}
                              onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl text-white placeholder-gray-500"
                              style={{
                                background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
                                boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
                                border: '1px solid rgba(255,255,255,0.03)'
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="p-6 border-t border-white/5 flex gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl text-gray-300 hover:text-white transition-colors"
                    style={{
                      background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                      boxShadow: '3px 3px 6px #050505, -3px -3px 6px #1f1f2a'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    className="flex-1 px-4 py-2 rounded-xl text-white font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Database;
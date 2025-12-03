import React, { useState } from 'react';
import Login from './pages/Login';
import { Route, Routes, Navigate, Outlet, useLocation } from 'react-router-dom';
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Users from "./pages/Users";

import FileReceived from "./pages/FileReceived";
import SendFile from "./pages/SendFile";
import ReceiveFile from "./pages/ReceiveFile";
import { Toaster } from "sonner";
import { useSelector } from 'react-redux';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import FileSend from "./pages/FileSend";

// Create a context to share sidebar state
export const SidebarContext = React.createContext();

function Layout() {
  const { user } = useSelector(state => state.auth);
  const location = useLocation();
  
  // State para sa sidebar collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  console.log("Layout - Redux user:", user);
  console.log("Layout - localStorage user:", localStorage.getItem("auth_user_v1"));

  const getCurrentUser = () => {
    if (user) return user;
    
    try {
      const storedUser = localStorage.getItem("auth_user_v1");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return {
          name: parsedUser?.name || parsedUser?.username || parsedUser?.email || 'User',
          email: parsedUser?.email || '',
          role: parsedUser?.role || 'user',
          office: parsedUser?.office || '',
          isAdmin: parsedUser?.isAdmin || parsedUser?.role === 'admin' || false,
          ...parsedUser
        };
      }
      return null;
    } catch (error) {
      console.error("Error parsing stored user:", error);
      return null;
    }
  };

  const currentUser = getCurrentUser();

  if (currentUser && (!currentUser.name || typeof currentUser.name !== 'string')) {
    console.warn("Invalid user data structure:", currentUser);
    currentUser.name = currentUser.name || currentUser.email || 'User';
  }

  return currentUser ? (
    <SidebarContext.Provider value={{ isSidebarCollapsed, setIsSidebarCollapsed }}>
      <div className="w-full h-screen flex flex-col md:flex-row">
        {/* Sidebar - wala'y padding diri */}
        <div className={`h-screen bg-white sticky top-0 ${isSidebarCollapsed ? 'w-20' : 'w-64'} hidden md:block transition-all duration-500 ease-out overflow-hidden`}>
          <Sidebar userOffice={currentUser.office} onToggleSidebar={setIsSidebarCollapsed} />
        </div>

        {/* Main Content - wala'y extra margin */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <Navbar userOffice={currentUser.office} />
          <div className="p-0"> {/* Remove padding here */}
            <Outlet />
          </div>
        </div>
      </div>
    </SidebarContext.Provider>
  ) : (
    <Navigate to='/log-in' state={{ from: location }} replace />
  );
}

function OfficeRoute({ office, mtoComponent, accountingComponent }) {
  const { user } = useSelector(state => state.auth);
  
  const getCurrentUser = () => {
    if (user) return user;
    try {
      const storedUser = localStorage.getItem("auth_user_v1");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  };

  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    return <Navigate to='/log-in' replace />;
  }

  if (currentUser.office === 'MTO') {
    return mtoComponent;
  } else if (currentUser.office === 'Accounting') {
    return accountingComponent;
  } else {
    return <Navigate to='/dashboard' replace />;
  }
}

function App() {
  return (
    <main className='w-full min-h-screen bg-[#f3f4f6]'>
      <Routes>
        <Route element={<Layout/>}>
          <Route index path='/' element={
            <OfficeRoute 
              mtoComponent={<Navigate to='/dashboard' />}
              accountingComponent={<Navigate to='/tasks' />}
            />
          }/>
          
          <Route path='/dashboard' element={
            <OfficeRoute 
              mtoComponent={<Dashboard />}
              accountingComponent={<Navigate to='/tasks' />}
            />
          }/>
          
          <Route path='/tasks' element={
            <OfficeRoute 
              mtoComponent={<Navigate to='/dashboard' />}
              accountingComponent={<Tasks />}
            />
          }/>

          <Route path='/send-file' element={
            <OfficeRoute 
              mtoComponent={<SendFile />}
              accountingComponent={<Navigate to='/tasks' />}
            />
          }/>

          <Route path='/receive-file' element={
            <OfficeRoute 
              mtoComponent={<Navigate to='/dashboard' />}
              accountingComponent={<ReceiveFile />}
            />
          }/>
          
          <Route path='/file-send' element={
            <OfficeRoute 
              mtoComponent={<FileSend />}
              accountingComponent={<FileSend />}
            />
          }/>
          
          <Route path='/team' element={<Users/>}/>
          <Route path='/file' element={<FileReceived/>}/>

          <Route path='/create-task' element={
            <OfficeRoute 
              mtoComponent={<Navigate to='/dashboard' />}
              accountingComponent={<div>Create Task Page - Under Development</div>}
            />
          }/>
          <Route path='/reports' element={
            <OfficeRoute 
              mtoComponent={<Navigate to='/dashboard' />}
              accountingComponent={<div>Reports Page - Under Development</div>}
            />
          }/>
          <Route path='/invoices' element={
            <OfficeRoute 
              mtoComponent={<Navigate to='/dashboard' />}
              accountingComponent={<div>Invoices Page - Under Development</div>}
            />
          }/>
        </Route>

        <Route path='/log-in' element={<Login/>}/>
        
        <Route path='*' element={<Navigate to='/' />} />
      </Routes>

      <Toaster richColors />
    </main>
  );
}

export default App;
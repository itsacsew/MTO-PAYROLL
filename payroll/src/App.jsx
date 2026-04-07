// App.jsx (Updated with Budget Route - Same as Accounting)
// Budget office users will be redirected to Budget page automatically

import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import { Route, Routes, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Users from "./pages/Users";
import FileReceived from "./pages/FileReceived";
import SendFile from "./pages/SendFile";
import ReceiveFile from "./pages/ReceiveFile";
import Budget from "./pages/Budgets"; // ADDED BUDGET IMPORT
import Gross from './pages/gross1';  // Add this import
import { Toaster } from "sonner";
import { useSelector, useDispatch } from 'react-redux';
import { logout } from './redux/slices/authSlice';
import Navbar from './components/Navbar';
import FileSend from "./pages/FileSend";
import PrintView from './pages/printView';
import Payslip from './pages/payslip';
import Payslip2 from './pages/payslip2';
import Payslip3 from './pages/payslip3';
import Payslip4 from './pages/payslip4';
import VoucherGenerator from './pages/slip';
import Slip2Generator from './pages/slip2';
import Slip3Generator from './pages/slip3';
import Slip4Generator from './pages/slip4';
import SendFile_MDRRMO from './pages/SendFile_MDRRMO';
import SendFile_RHU from './pages/SendFile_RHU'; 
import SendFile_MAYOR_Component from './pages/SendFile_MAYOR';
import Database from './pages/database';
import useIdleTimer from './hooks/useIdleTimer';
import OBS from './pages/obs';  // Make sure the path is correct
import ModalSend_MDRRMO from './pages/ModalSend_MDRRMO';
import ModalSend_MAYOR from './pages/ModalSend_MAYOR';

export const SidebarContext = React.createContext();

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useSelector(state => state.auth);
  const location = useLocation();
  
  const getCurrentUser = () => {
    if (user) return user;
    try {
      const storedUser = localStorage.getItem("auth_user_v1");
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    sessionStorage.removeItem('lastLocation');
    return <Navigate to="/log-in" state={{ from: location }} replace />;
  }
  
  return children;
};

// Navigation Guard Component to prevent back navigation after logout
const NavigationGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    sessionStorage.setItem('lastLocation', location.pathname);
    
    const handlePopState = () => {
      const isLoggedIn = checkAuthStatus();
      
      if (!isLoggedIn && location.pathname !== '/log-in') {
        navigate('/log-in', { replace: true });
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location, navigate]);
  
  const checkAuthStatus = () => {
    const storedUser = localStorage.getItem("auth_user_v1");
    return !!storedUser;
  };
  
  return null;
};

// Idle Timer Wrapper Component (No Warning)
const IdleTimerWrapper = ({ children }) => {
  const { user } = useSelector(state => state.auth);
  
  // Initialize idle timer - diretso logout after 1 minute
  useIdleTimer(60) // 1 minute timeout, no warning
  
  // Only show idle timer for authenticated users
  if (!user && !localStorage.getItem("auth_user_v1")) {
    return children;
  }
  
  return children;
};

function Layout() {
  const { user } = useSelector(state => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
  
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem("auth_user_v1");
      if (!storedUser && !user) {
        dispatch(logout());
        navigate('/log-in', { replace: true });
      }
    };
    
    checkAuth();
  }, [user, navigate, dispatch]);

  if (currentUser && (!currentUser.name || typeof currentUser.name !== 'string')) {
    console.warn("Invalid user data structure:", currentUser);
    currentUser.name = currentUser.name || currentUser.email || 'User';
  }

  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  const isBudget = location.pathname === '/budget';
  const isTasks = location.pathname === '/tasks';

  return currentUser ? (
    <SidebarContext.Provider value={{ isSidebarCollapsed, setIsSidebarCollapsed }}>
      <div className="w-full min-h-screen bg-[#0a0a0f] relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(249, 115, 22, 0.15), transparent 70%)',
              filter: 'blur(60px)'
            }}
          />
          
          <div 
            className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.15), transparent 70%)',
              filter: 'blur(60px)'
            }}
          />
          
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1), transparent 70%)',
              filter: 'blur(80px)'
            }}
          />

          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-float-slow"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, rgba(${Math.random() * 255}, ${Math.random() * 100}, ${Math.random() * 255}, 0.05), transparent)`,
                filter: 'blur(30px)',
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${5 + i}s`
              }}
            />
          ))}
        </div>

        <Navbar />
        
        {/* Budget page should have same layout as Dashboard (no extra padding) */}
        {(isDashboard || isBudget || isTasks) ? (
          <Outlet />
        ) : (
          <div className="relative z-10 pt-4 px-4 md:px-6 lg:px-8">
            <Outlet />
          </div>
        )}
      </div>
    </SidebarContext.Provider>
  ) : (
    <Navigate to='/log-in' state={{ from: location }} replace />
  );
}

function OfficeRoute({ office, mtoComponent, accountingComponent, budgetComponent }) {
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

  // Budget office users should see Budget component
  if (currentUser.office === 'Budget') {
    return budgetComponent;
  }
  
  // Accounting office users should see Tasks
  else if (currentUser.office === 'Accounting') {
    return accountingComponent;
  }
  
  // All other offices (MTO, MDRRMO, RHU, MAYOR, etc.) should see MTO component
  else {
    return mtoComponent;
  }
}

function App() {
  return (
    <main className='w-full min-h-screen bg-[#0a0a0f]'>
      <NavigationGuard />
      <IdleTimerWrapper>
        <Routes>
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            {/* Root path - redirect based on office */}
            <Route index path='/' element={
              <OfficeRoute 
                mtoComponent={<Dashboard />}
                accountingComponent={<Navigate to='/tasks' />}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>
            
            {/* Dashboard path */}
            <Route path='/dashboard' element={
              <OfficeRoute 
                mtoComponent={<Dashboard />}
                accountingComponent={<Navigate to='/tasks' />}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>
            
            {/* Tasks path - for Accounting only */}
            <Route path='/tasks' element={
              <OfficeRoute 
                mtoComponent={<Navigate to='/dashboard' />}
                accountingComponent={<Tasks />}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>
            
            {/* Budget path - for Budget office only */}
            <Route path='/budget' element={
              <OfficeRoute 
                mtoComponent={<Navigate to='/dashboard' />}
                accountingComponent={<Navigate to='/tasks' />}
                budgetComponent={<Budget />}
              />
            }/>

            <Route path='/send-file' element={
              <OfficeRoute 
                mtoComponent={<SendFile />}
                accountingComponent={<Navigate to='/tasks' />}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>

            <Route path='/SendFile_MDRRMO' element={
              <OfficeRoute 
                mtoComponent={<SendFile_MDRRMO />}
                accountingComponent={<Navigate to='/tasks' />}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>

            <Route path='/SendFile_RHU' element={
              <OfficeRoute 
                mtoComponent={<SendFile_RHU />}
                accountingComponent={<Navigate to='/tasks' />}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>

            <Route path='/SendFile_MAYOR' element={
              <OfficeRoute 
                mtoComponent={<SendFile_MAYOR_Component />}
                accountingComponent={<Navigate to='/tasks' />}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>
            <Route path='/obs' element={<OBS />} />

            <Route path='/receive-file' element={
  <OfficeRoute 
    mtoComponent={<Navigate to='/dashboard' />}
    accountingComponent={<ReceiveFile />}
    budgetComponent={<ReceiveFile />}  // <-- CHANGE: Allow Budget users to access ReceiveFile
  />
}/>
<Route path='/gross' element={
  <OfficeRoute 
    mtoComponent={<Navigate to='/dashboard' />}
    accountingComponent={<Navigate to='/tasks' />}
    budgetComponent={<Gross />}  // Import Gross component first: import Gross from './pages/gross1'
  />
}/>
            <Route path='/modal-mdrrmo' element={
              <OfficeRoute 
                mtoComponent={<ModalSend_MDRRMO />}
                accountingComponent={<Navigate to='/tasks' />}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>

            <Route path='/modal-mayor' element={
              <OfficeRoute 
                mtoComponent={<ModalSend_MAYOR />}
                accountingComponent={<Navigate to='/tasks' />}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>
            
            <Route path='/file-send' element={
              <OfficeRoute 
                mtoComponent={<FileSend />}
                accountingComponent={<FileSend />}
                budgetComponent={<FileSend />}
              />
            }/>

            <Route path='/print' element={<PrintView />} />
            <Route path='/payslip/:id' element={<Payslip />} />
            <Route path='/payslip2/:id' element={<Payslip2 />} />
            <Route path='/payslip3/:id' element={<Payslip3 />} />
            <Route path='/payslip4/:id' element={<Payslip4 />} />
            <Route path='/slip2' element={<Slip2Generator />} />
            <Route path='/slip3' element={<Slip3Generator />} />
            <Route path='/slip4' element={<Slip4Generator />} />
            <Route path='/voucher' element={<VoucherGenerator />} />
            <Route path='/team' element={<Users/>}/>
            <Route path='/file' element={<FileReceived/>}/>
            <Route path='/database' element={<Database />} />
            <Route path='/Budgets' element={<Budget />} />
            

            <Route path='/create-task' element={
              <OfficeRoute 
                mtoComponent={<Navigate to='/dashboard' />}
                accountingComponent={<div>Create Task Page - Under Development</div>}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>

            <Route path='/reports' element={
              <OfficeRoute 
                mtoComponent={<Navigate to='/dashboard' />}
                accountingComponent={<div>Reports Page - Under Development</div>}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>

            <Route path='/invoices' element={
              <OfficeRoute 
                mtoComponent={<Navigate to='/dashboard' />}
                accountingComponent={<div>Invoices Page - Under Development</div>}
                budgetComponent={<Navigate to='/budget' />}
              />
            }/>
          </Route>

          <Route path='/log-in' element={<Login/>}/>
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </IdleTimerWrapper>

      <Toaster richColors position="top-right" 
        toastOptions={{
          style: {
            background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.95), rgba(20, 20, 30, 0.98))',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.03)',
            color: '#fff',
          },
        }}
      />
    </main>
  );
}

export default App;
// hooks/useIdleTimer.js (No Warning - Direct Logout)
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/slices/authSlice';

const useIdleTimer = (timeoutMinutes = 1) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  // Convert minutes to milliseconds
  const timeoutMs = timeoutMinutes * 60 * 1000;

  // Function to handle logout
  const handleLogout = useCallback(() => {
    // Clear all stored data
    localStorage.removeItem("auth_user_v1");
    sessionStorage.clear();
    
    // Dispatch logout to clear Redux state
    dispatch(logout());
    
    // Navigate to login with replace to prevent back navigation
    navigate('/log-in', { replace: true });
    
    // Clear timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Show toast notification if available
    try {
      const { toast } = require('sonner');
      toast.info('Session expired due to inactivity', {
        duration: 3000,
      });
    } catch (e) {
      // Ignore if sonner not available
    }
  }, [dispatch, navigate]);

  // Function to reset timer
  const resetTimer = useCallback(() => {
    // Clear existing timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Set new logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [handleLogout, timeoutMs]);

  // Track user activity
  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Set up event listeners
  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'keypress',
      'wheel',
      'user-activity' // Custom event for programmatic activity
    ];
    
    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    // Initialize timer
    resetTimer();
    
    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleActivity, resetTimer]);

  return {}; // No state to return now
};

export default useIdleTimer;
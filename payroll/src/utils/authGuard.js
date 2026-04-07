// utils/authGuard.js
export const isAuthenticated = () => {
  try {
    const storedUser = localStorage.getItem("auth_user_v1");
    if (!storedUser) return false;
    
    const user = JSON.parse(storedUser);
    return user && (user.id || user.uid);
  } catch (error) {
    return false;
  }
};

export const logout = (navigate) => {
  localStorage.removeItem("auth_user_v1");
  sessionStorage.clear();
  
  if (navigate) {
    navigate('/log-in', { replace: true });
  }
  
  // Prevent back navigation
  window.history.pushState(null, '', '/log-in');
};

// Prevent back button after logout
export const preventBackNavigation = () => {
  window.history.pushState(null, '', window.location.href);
  window.addEventListener('popstate', function() {
    window.history.pushState(null, '', window.location.href);
  });
};
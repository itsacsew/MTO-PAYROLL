// components/IdleWarningModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdWarning, MdAccessTime } from 'react-icons/md';

const IdleWarningModal = ({ isOpen, onClose, onStay, onLogout }) => {
  const [countdown, setCountdown] = React.useState(10);
  
  React.useEffect(() => {
    let interval;
    if (isOpen && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    
    if (countdown === 0) {
      onLogout();
    }
    
    return () => clearInterval(interval);
  }, [isOpen, countdown, onLogout]);
  
  React.useEffect(() => {
    if (isOpen) {
      setCountdown(10);
    }
  }, [isOpen]);
  
  const handleStay = () => {
    onStay();
    onClose();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[201]"
          >
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
                boxShadow: '30px 30px 60px -15px #000000, -30px -30px 60px -15px #1f1f2a',
                border: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-3xl" />
              <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-3xl" />
              
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-center mb-4">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                    className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500/20 to-pink-500/20 flex items-center justify-center"
                    style={{
                      boxShadow: '0 0 30px rgba(249, 115, 22, 0.3)'
                    }}
                  >
                    <MdWarning className="text-orange-400" size={40} />
                  </motion.div>
                </div>
                
                <h3 className="text-2xl font-bold text-center text-white mb-2">
                  Session Expiring Soon
                </h3>
                
                <p className="text-gray-400 text-center mb-4">
                  You've been inactive for a while. For security reasons, you will be logged out in:
                </p>
                
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <MdAccessTime className="text-orange-400" size={24} />
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-bold text-white"
                    >
                      {countdown}
                    </motion.div>
                    <span className="text-gray-400 text-lg">seconds</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onLogout}
                    className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    Logout Now
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStay}
                    className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
                    }}
                  >
                    Stay Logged In
                  </motion.button>
                </div>
                
                <p className="text-center text-xs text-gray-500 mt-4">
                  Click "Stay Logged In" to continue your session
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default IdleWarningModal;
// Login.jsx - Redesigned with Professional 3D Glassmorphism - Full Screen Version
// UPDATED with Navbar color scheme - NO CLOCK - NO SHINE - WITH ORANGE GLOW

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/slices/authSlice";
import { motion, AnimatePresence } from "framer-motion";

// Firebase imports
import { db } from "../config/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

import back12 from "../assets/pic.png";
import { 
  MdEmail, 
  MdLock, 
  MdBusiness, 
  MdPerson, 
  MdVisibility, 
  MdVisibilityOff,
  MdArrowForward,
  MdCheckCircle,
  MdError,
  MdDashboard
} from "react-icons/md";

/* ------------------ Main component ------------------ */
export default function AuthWithSheet() {
  const dispatch = useDispatch();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse position for parallax effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 10,
        y: (e.clientY / window.innerHeight - 0.5) * 10
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem("auth_user_v1", JSON.stringify(userData));
    dispatch(setUser(userData));
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-start relative overflow-hidden pt-14 md:pt-10"
      style={{
        background: 'linear-gradient(145deg, #0a0a0f 0%, #1a1a2a 50%, #0a0a0f 100%)',
      }}
    >
      {/* Abstract sphere background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating spheres with mouse parallax */}
        <motion.div
          animate={{
            x: mousePosition.x,
            y: mousePosition.y,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(249, 115, 22, 0.15), transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }}
        />
        
        <motion.div
          animate={{
            x: -mousePosition.x * 0.5,
            y: -mousePosition.y * 0.5,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.15), transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }}
        />
        
        <motion.div
          animate={{
            x: mousePosition.x * 0.3,
            y: mousePosition.y * 0.3,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1), transparent 70%)',
            filter: 'blur(80px)',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div className="w-full max-w-md px-4 relative z-10">
        {/* ORANGE GLOW BEHIND THE FORM BOX */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -inset-4 bg-gradient-to-r from-orange-500/30 via-rose-500/20 to-purple-500/30 rounded-3xl blur-2xl"
          style={{
            filter: 'blur(30px)',
            zIndex: -1
          }}
        />
        
        {/* SECOND GLOW LAYER FOR MORE INTENSITY */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          className="absolute -inset-10 bg-orange-500/20 rounded-full blur-3xl"
          style={{
            zIndex: -2
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
            boxShadow: '30px 30px 60px -15px #000000, -30px -30px 60px -15px #1f1f2a, inset 0 1px 2px rgba(255,255,255,0.05), 0 0 30px rgba(249, 115, 22, 0.3)',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          <div className="p-8">
            <AuthForms onLogin={handleLogin} />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

/* ------------------ AuthForms / Login / Signup ------------------ */
function AuthForms({ onLogin }) {
  const [mode, setMode] = useState("login");
  
  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent"
            style={{
              textShadow: '0 2px 10px rgba(249, 115, 22, 0.3)'
            }}
          >
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {mode === "login" ? "Sign in to continue to dashboard" : "Register to get started"}
          </p>
        </div>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="text-sm"
        >
          {mode === "login" ? (
            <motion.button 
              whileHover={{ x: 2 }}
              onClick={() => setMode("signup")}
              className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
            >
              Sign up <MdArrowForward />
            </motion.button>
          ) : (
            <motion.button 
              whileHover={{ x: -2 }}
              onClick={() => setMode("login")}
              className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
            >
              <MdArrowForward className="rotate-180" /> Sign in
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
          transition={{ duration: 0.2 }}
        >
          {mode === "login" ? (
            <LoginForm onLogin={onLogin} />
          ) : (
            <SignupForm
              onSignupSuccess={() => setMode("login")}
              onLogin={onLogin}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 pt-4 border-t border-white/5"
      >
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <MdDashboard className="text-orange-400/50" />
          <span>Secured by MTO Financial System</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------ Firebase Auth Functions ------------------ */
async function signupWithFirebase({ name, email, password, office }) {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { status: "error", message: "User already exists with this email" };
    }

    const docRef = await addDoc(collection(db, "users"), {
      name: name.trim(),
      email: email.trim(),
      password: password,
      office: office,
      role: "user",
      createdAt: new Date(),
      isActive: true
    });

    return { 
      status: "success", 
      message: "User registered successfully",
      userId: docRef.id 
    };
  } catch (error) {
    console.error("Firebase signup error:", error);
    return { status: "error", message: error.message };
  }
}

async function loginWithFirebase({ email, password, office }) {
  try {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef, 
      where("email", "==", email),
      where("office", "==", office)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { status: "error", message: "User not found or office doesn't match" };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.password !== password) {
      return { status: "error", message: "Invalid password" };
    }

    if (userData.isActive === false) {
      return { status: "error", message: "Account is deactivated" };
    }

    return {
      status: "success",
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        office: userData.office,
        role: userData.role || "user",
        isAdmin: userData.role === "admin"
      }
    };
  } catch (error) {
    console.error("Firebase login error:", error);
    return { status: "error", message: error.message };
  }
}

/* ------------------ Input Field Component (Reusable) ------------------ */
function InputField({ 
  icon: Icon, 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder,
  error,
  ...props 
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  
  return (
    <div className="">
      <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
        <Icon className="text-orange-400" size={16} />
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 rounded-xl text-white placeholder-gray-500
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-orange-500/50
            ${error ? 'ring-2 ring-red-500/50' : ''}
          `}
          style={{
            background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
            boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
          >
            {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------ Select Field Component ------------------ */
function SelectField({ icon: Icon, label, value, onChange, options, error }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
        <Icon className="text-orange-400" size={16} />
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className={`
            w-full px-4 py-3 rounded-xl text-white appearance-none
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-orange-500/50
            ${error ? 'ring-2 ring-red-500/50' : ''}
          `}
          style={{
            background: 'linear-gradient(145deg, #0a0a0f, #1a1a2a)',
            boxShadow: 'inset 3px 3px 6px #050505, inset -3px -3px 6px #1f1f2a',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          <option value="" className="bg-[#1a1a2a]">Select Office</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[#1a1a2a]">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          ▼
        </div>
      </div>
    </div>
  );
}

/* ------------------ Signup Form ------------------ */
function SignupForm({ onSignupSuccess, onLogin }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [office, setOffice] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setSuccessMsg(null);
    
    if (!name.trim() || !email.trim() || !password || !office) {
      return setErr("Please fill out all fields.");
    }
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");
    if (!["MTO", "Accounting", "MDRRMO", "RHU", "MAYOR"].includes(office)) {
      return setErr("Please select a valid office.");
    }

    try {
      setLoading(true);
      const res = await signupWithFirebase({ 
        name: name.trim(), 
        email: email.trim(), 
        password: password,
        office: office
      });
      
      if (res && res.status === "success") {
        setSuccessMsg("🎉 Successfully Registered! Redirecting to login...");
        setTimeout(() => {
          setSuccessMsg(null);
          if (typeof onSignupSuccess === "function") onSignupSuccess();
        }, 1200);
      } else {
        throw new Error(res.message || "Signup failed");
      }
    } catch (error) {
      setErr(error.message || "Signup error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AnimatePresence>
        {err && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 rounded-xl flex items-center gap-2 text-sm text-red-400"
            style={{
              background: 'linear-gradient(145deg, #2a1a1a, #1a0f0f)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)'
            }}
          >
            <MdError size={18} />
            {err}
          </motion.div>
        )}
        
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 rounded-xl flex items-center gap-2 text-sm text-green-400"
            style={{
              background: 'linear-gradient(145deg, #1a2a1a, #0f1a0f)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)'
            }}
          >
            <MdCheckCircle size={18} />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <InputField
        icon={MdPerson}
        label="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        error={err && !name}
      />
      
      <InputField
        icon={MdEmail}
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        error={err && !email}
      />

      <SelectField
        icon={MdBusiness}
        label="Office"
        value={office}
        onChange={(e) => setOffice(e.target.value)}
        options={[
          { value: "MTO", label: "MTO" },
          { value: "Accounting", label: "Accounting" },
          { value: "MDRRMO", label: "MDRRMO" },
          { value: "RHU", label: "RHU" },
          { value: "MAYOR", label: "MAYOR" }
        ]}
        error={err && !office}
      />

      <InputField
        icon={MdLock}
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPw(e.target.value)}
        placeholder="••••••"
        error={err && !password}
      />
      
      <InputField
        icon={MdLock}
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="••••••"
        error={err && password !== confirm}
      />

      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={loading} 
        className="w-full py-3.5 rounded-xl text-white font-medium relative overflow-hidden group mt-2"
        style={{
          background: 'linear-gradient(135deg, #f97316, #ec4899)',
          boxShadow: '0 10px 20px -5px #f97316',
        }}
      >
        <motion.div
          animate={{
            x: loading ? ['-100%', '200%'] : '0%',
          }}
          transition={{
            duration: 1.5,
            repeat: loading ? Infinity : 0,
            ease: "linear"
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
        />
        <span className="relative z-10">
          {loading ? "Creating account..." : "Create account"}
        </span>
      </motion.button>
    </form>
  );
}

/* ------------------ Login Form ------------------ */
function LoginForm({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [office, setOffice] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || !password || !office) return setErr("Please fill out all fields.");

    try {
      setLoading(true);
      const res = await loginWithFirebase({ 
        email: email.trim(), 
        password: password,
        office: office 
      });
      
      if (res && res.status === "success") {
        const userData = res.user;
        
        if (typeof onLogin === "function") {
          onLogin(userData);
        }
        
        // Redirect to dashboard with animation
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      } else {
        throw new Error(res.message || "Login failed");
      }
    } catch (error) {
      setErr(error.message || "Login error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AnimatePresence>
        {err && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 rounded-xl flex items-center gap-2 text-sm text-red-400"
            style={{
              background: 'linear-gradient(145deg, #2a1a1a, #1a0f0f)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)'
            }}
          >
            <MdError size={18} />
            {err}
          </motion.div>
        )}
      </AnimatePresence>
      
      <InputField
        icon={MdEmail}
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        error={err && !email}
      />

      <SelectField
        icon={MdBusiness}
        label="Office"
        value={office}
        onChange={(e) => setOffice(e.target.value)}
        options={[
          { value: "MTO", label: "MTO" },
          { value: "Accounting", label: "Accounting" },
          { value: "MDRRMO", label: "MDRRMO" },
          { value: "RHU", label: "RHU" },
          { value: "MAYOR", label: "MAYOR" }
        ]}
        error={err && !office}
      />
      
      <InputField
        icon={MdLock}
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••"
        error={err && !password}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input 
            type="checkbox" 
            checked={remember} 
            onChange={(e) => setRemember(e.target.checked)} 
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
          />
          <span>Remember me</span>
        </label>
        
        <motion.button
          whileHover={{ x: 2 }}
          type="button"
          onClick={() => {/* Forgot password logic */}}
          className="text-sm text-orange-400 hover:text-orange-300"
        >
          Forgot password?
        </motion.button>
      </div>

      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={loading} 
        className="w-full py-3.5 rounded-xl text-white font-medium relative overflow-hidden group mt-2"
        style={{
          background: 'linear-gradient(135deg, #f97316, #ec4899)',
          boxShadow: '0 10px 20px -5px #f97316',
        }}
      >
        <motion.div
          animate={{
            x: loading ? ['-100%', '200%'] : '0%',
          }}
          transition={{
            duration: 1.5,
            repeat: loading ? Infinity : 0,
            ease: "linear"
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
        />
        <span className="relative z-10">
          {loading ? "Signing in..." : "Sign in"}
        </span>
      </motion.button>

      {/* Demo credentials hint */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 p-3 rounded-xl text-center"
        style={{
          background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
          border: '1px solid rgba(255,255,255,0.03)',
          boxShadow: 'inset 2px 2px 5px #050505, inset -2px -2px 5px #1f1f2a'
        }}
      >
        <p className="text-xs text-gray-400">
          Demo: admin@example.com / MTO / password123
        </p>
      </motion.div>
    </form>
  );
}

/* ------------------ Footer Component ------------------ */
function Footer() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <>
      {/* Corner logos with 3D effect */}
      <motion.img
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        src="/assets/logo.png"
        alt="left-corner"
        className="hidden md:block absolute bottom-2 left-3 w-12 h-12 rounded-full shadow-lg bg-[#1a1a2a] p-1 object-contain z-40"
        style={{
          boxShadow: '10px 10px 20px #050505, -10px -10px 20px #1f1f2a',
          border: '1px solid rgba(255,255,255,0.03)'
        }}
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
      <motion.img
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        src="/assets/mto-right.png"
        alt="right-corner"
        className="hidden md:block absolute bottom-2 right-3 w-12 h-12 rounded-full shadow-lg bg-[#1a1a2a] p-1 object-contain z-40"
        style={{
          boxShadow: '10px 10px 20px #050505, -10px -10px 20px #1f1f2a',
          border: '1px solid rgba(255,255,255,0.03)'
        }}
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />

      {/* FOOTER */}
      <footer className="absolute bottom-0 left-0 right-0 w-full z-30">
        <div 
          className="flex flex-col md:flex-row items-start md:items-center justify-between px-8 py-4 relative"
          style={{
            background: 'linear-gradient(145deg, #1a1a2a, #0a0a0f)',
            boxShadow: '0 -10px 30px -10px #050505',
            borderTop: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          {/* LEFT SIDE */}
          <div className="text-left flex-1">
            <div className="font-semibold text-lg bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
              BPLO 2025
            </div>
            
            <div className="mt-2">
              <a
                href="https://form.jotform.com/240957550026052"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-orange-400 hover:text-orange-300 transition-colors underline"
              >
                Send Feedback
              </a>
            </div>
          </div>

          {/* CENTER SIDE */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center">
            <div className="text-sm text-gray-400">Powered by</div>
            <div className="text-white font-semibold mt-1 bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
              MTO
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="text-right flex-1">
            <div className="text-sm text-gray-400">{dateStr}</div>
            <div className="text-2xl font-semibold mt-1 text-white">{timeStr}</div>
            <div className="text-xs text-gray-500 mt-1">
              PHILIPPINE STANDARD TIME
            </div>
            
          </div>
        </div>
      </footer>
    </>
  );
}
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/slices/authSlice";

// Firebase imports
import { db } from "../config/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

import back12 from "../assets/pic.png"

/* ------------------ Main component ------------------ */
export default function AuthWithSheet() {
  const dispatch = useDispatch();

  const handleLogin = (userData) => {
    localStorage.setItem("auth_user_v1", JSON.stringify(userData));
    dispatch(setUser(userData));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-6 pb-32">
      <div className="max-w-md w-full mt-8 mb-8">
        <div className="bg-white shadow-lg rounded-2xl p-6">
          <AuthForms onLogin={handleLogin} />
        </div>
      </div>

      {/* Footer fixed to bottom */}
      <Footer />
    </div>
  );
}

/* ------------------ AuthForms / Login / Signup ------------------ */
function AuthForms({ onLogin }) {
  const [mode, setMode] = useState("login");
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">{mode === "login" ? "Sign in" : "Create account"}</h2>
        <div className="text-sm text-gray-500">
          {mode === "login" ? (
            <>New here? <button className="text-green-600" onClick={() => setMode("signup")}>Sign up</button></>
          ) : (
            <>Have an account? <button className="text-green-600" onClick={() => setMode("login")}>Sign in</button></>
          )}
        </div>
      </div>

      {mode === "login" ? (
        <LoginForm onLogin={onLogin} />
      ) : (
        <SignupForm
          onSignupSuccess={() => setMode("login")}
          onLogin={onLogin}
        />
      )}

      <hr className="my-4" />
      <div className="text-xs text-gray-400">This system uses Firebase Firestore as the backend.</div>
    </div>
  );
}

/* ------------------ Firebase Auth Functions ------------------ */
async function signupWithFirebase({ name, email, password, office }) {
  try {
    // Check if user already exists
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { status: "error", message: "User already exists with this email" };
    }

    // Add new user to Firestore
    const docRef = await addDoc(collection(db, "users"), {
      name: name.trim(),
      email: email.trim(),
      password: password, // Note: In production, you should hash this
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

    // Check password (in production, use proper hashing)
    if (userData.password !== password) {
      return { status: "error", message: "Invalid password" };
    }

    // Check if user is active
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

/* ------------------ Signup Form ------------------ */
function SignupForm({ onSignupSuccess, onLogin }) {
  const navigate = typeof useNavigate === "function" ? useNavigate() : null;
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
    if (!["MTO", "Accounting"].includes(office)) {
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
      {err && <div className="text-sm text-red-600">{err}</div>}
      {successMsg && <div className="text-sm text-green-600">{successMsg}</div>}

      <label className="block">
        <div className="text-sm text-gray-600">Full name</div>
        <input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className="mt-1 w-full border rounded px-3 py-2" 
          placeholder="Jane Doe" 
        />
      </label>
      
      <label className="block">
        <div className="text-sm text-gray-600">Email</div>
        <input 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          type="email" 
          className="mt-1 w-full border rounded px-3 py-2" 
          placeholder="you@example.com" 
        />
      </label>

      <label className="block">
        <div className="text-sm text-gray-600">Office</div>
        <select 
          value={office} 
          onChange={(e) => setOffice(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 bg-white"
        >
          <option value="">Select Office</option>
          <option value="MTO">MTO</option>
          <option value="Accounting">Accounting</option>
        </select>
      </label>

      <label className="block">
        <div className="text-sm text-gray-600">Password</div>
        <input 
          value={password} 
          onChange={(e) => setPw(e.target.value)} 
          type="password" 
          className="mt-1 w-full border rounded px-3 py-2" 
          placeholder="••••••" 
        />
      </label>
      
      <label className="block">
        <div className="text-sm text-gray-600">Confirm password</div>
        <input 
          value={confirm} 
          onChange={(e) => setConfirm(e.target.value)} 
          type="password" 
          className="mt-1 w-full border rounded px-3 py-2" 
          placeholder="••••••" 
        />
      </label>

      <button 
        disabled={loading} 
        className="w-full py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create account"}
      </button>
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
        
        // Redirect to dashboard
        window.location.href = "/dashboard";
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
      {err && <div className="text-sm text-red-600">{err}</div>}
      
      <label className="block">
        <div className="text-sm text-gray-600">Email</div>
        <input 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          type="email" 
          className="mt-1 w-full border rounded px-3 py-2" 
          placeholder="you@example.com" 
        />
      </label>

      <label className="block">
        <div className="text-sm text-gray-600">Office</div>
        <select 
          value={office} 
          onChange={(e) => setOffice(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 bg-white"
        >
          <option value="">Select Office</option>
          <option value="MTO">MTO</option>
          <option value="Accounting">Accounting</option>
        </select>
      </label>
      
      <label className="block">
        <div className="text-sm text-gray-600">Password</div>
        <input 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          type="password" 
          className="mt-1 w-full border rounded px-3 py-2" 
          placeholder="••••••" 
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input 
          type="checkbox" 
          checked={remember} 
          onChange={(e) => setRemember(e.target.checked)} 
        />
        <span>Remember me</span>
      </label>

      <button 
        disabled={loading} 
        className="w-full py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
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
      {/* Optional extreme-corner logos */}
      <img
        src="/assets/logo.png"
        alt="left-corner"
        className="hidden md:block fixed bottom-2 left-3 w-12 h-12 rounded-full shadow-lg bg-white p-1 object-contain z-40"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
      <img
        src="/assets/mto-right.png"
        alt="right-corner"
        className="hidden md:block fixed bottom-2 right-3 w-12 h-12 rounded-full shadow-lg bg-white p-1 object-contain z-40"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#2F2F2F] text-gray-200 w-full z-30">
        {/* IMAGE ABOVE FOOTER - GIHIMO NAKONG HIDDEN SA MGA SMALL SCREENS */}
        <div className="relative flex items-center justify-center md:block">
          <img
            src={back12}
            alt="Philippines banner"
            className="w-full max-h-32 object-cover"
          />
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-8 py-4 relative">
          {/* LEFT SIDE */}
          <div className="text-left flex-1">
            <div className="font-semibold text-lg">BPLO 2025</div>
            <div className="text-sm text-gray-400 mt-1">
              All Contents is in the public domain unless otherwise stated.
            </div>
            <div className="mt-2">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm text-blue-300 underline"
              >
                Send Feedback
              </a>
            </div>
          </div>

          {/* CENTER SIDE */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center">
            <div className="text-sm text-gray-300">Powered by</div>
            <div className="text-white font-semibold mt-1">MTO</div>
          </div>

          {/* RIGHT SIDE */}
          <div className="text-right flex-1">
            <div className="text-sm md:text-base">{dateStr}</div>
            <div className="text-2xl font-semibold mt-1">{timeStr}</div>
            <div className="text-xs text-gray-400 mt-1">
              PHILIPPINE STANDARD TIME
            </div>
            <div className="mt-2 text-sm text-gray-300">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="underline mr-2"
              >
                Privacy Policy
              </a>
              <span className="mx-1">|</span>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="underline ml-2"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Spacer */}
      <div style={{ height: 120 }} aria-hidden />
    </>
  );
}
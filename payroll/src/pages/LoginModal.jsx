import React, { useState } from "react";

// Firebase imports
import { db } from "../config/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [office, setOffice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  /* ----- Firebase Auth Functions ----- */
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

      // Check password
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

  /* ----- submit handlers ----- */
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const identifier = email.trim();
      const pwd = password;
      const selectedOffice = office;

      if (!identifier || !pwd || !selectedOffice) {
        setError("Please enter email, password, and select office");
        setLoading(false);
        return;
      }

      const result = await loginWithFirebase({ 
        email: identifier, 
        password: pwd,
        office: selectedOffice 
      });

      if (result.status === "success") {
        // success — tell parent and close modal
        onLoginSuccess && onLoginSuccess(result.user);
        onClose && onClose();
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to login");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!username || !email || !password || !office) {
      setError("Please fill out all fields");
      setLoading(false);
      return;
    }

    if (!["MTO", "Accounting"].includes(office)) {
      setError("Please select a valid office");
      setLoading(false);
      return;
    }

    const result = await signupWithFirebase({
      name: username,
      email: email,
      password: password,
      office: office
    });

    if (result.status === "success") {
      setMode("login");
      setError("");
      alert("Registered successfully. Please login.");
    } else {
      setError(result.message || "Register failed");
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">
          {mode === "login" ? "Login" : "Register"}
        </h2>

        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 rounded"
            />
            
            <select 
              value={office} 
              onChange={(e) => setOffice(e.target.value)}
              className="border p-2 rounded bg-white"
            >
              <option value="">Select Office</option>
              <option value="MTO">MTO</option>
              <option value="Accounting">Accounting</option>
            </select>
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border p-2 rounded"
            />
            
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <button
                type="button"
                className="text-green-600 hover:underline"
                onClick={() => setMode("register")}
              >
                Sign up
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Full Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 rounded"
            />
            
            <select 
              value={office} 
              onChange={(e) => setOffice(e.target.value)}
              className="border p-2 rounded bg-white"
            >
              <option value="">Select Office</option>
              <option value="MTO">MTO</option>
              <option value="Accounting">Accounting</option>
            </select>
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border p-2 rounded"
            />
            
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register"}
            </button>
            
            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <button
                type="button"
                className="text-green-600 hover:underline"
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-400 text-white p-2 rounded hover:bg-gray-500"
        >
          Close
        </button>
      </div>
    </div>
  );
}
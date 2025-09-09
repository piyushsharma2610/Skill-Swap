import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom"; // ✅ Already imported useNavigate
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import "./Auth.css";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg]           = useState("");

  const navigate = useNavigate(); // ✅ Added navigate

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await fetch("http://127.0.0.1:8000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        setMsg(data.message || "Signup successful ✅");
        localStorage.setItem("username", username);
        navigate("/dashboard"); // ✅ Redirect user after signup
      } else {
        setMsg(data.detail || "Signup failed ❌");
      }
    } catch (err) {
      console.error(err);
      setMsg("Could not reach backend ❌");
    }
  };

  return (
       <div className="auth-container">
      <div className="auth-box">
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <FaUser />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <FaEnvelope />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <FaLock />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn">Sign Up</button>
        </form>
        <p className="switch-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
            {/* ✅ Added Back to Home button */}
         <button 
          type="button" 
          className="home-btn" 
          onClick={() => navigate("/")}
        >
          ⬅ Back to Home
        </button>
        {/* ✅ Show error or success messages */}
        {msg && <p className="error-text">{msg}</p>}
      </div>
    </div>
  );
  
}

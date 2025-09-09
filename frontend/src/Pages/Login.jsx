import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import "./Auth.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg]           = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        setMsg(data.message || "Login successful ✅");
        setTimeout(() => navigate("/dashboard"), 400);
      } else {
        setMsg(data.detail || "Login failed ❌");
      }
    } catch (err) {
      console.error(err);
      setMsg("Could not reach backend ❌");
    }
  };

  return (
   <div className="auth-container">
      <div className="auth-box">
        <h2>Welcome Back</h2>
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
            <FaLock />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn">Login</button>
        </form>
        <p className="switch-text">
          Don’t have an account? <Link to="/signup">Sign Up</Link>
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

// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Dashboard from "./Pages/Dashboard";
import Profile from "./Pages/Profile";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import Landing from "./Pages/Landing";
import Onboarding from "./Pages/Onboarding";
import Settings from "./Pages/Settings"; // ✅ Import the new component

export default function App() {
  // ✅ MODIFIED: Load theme from localStorage on initial load
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    return JSON.parse(savedMode) || false;
  });

useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      // ✅ ADDED: Save theme choice to localStorage
      localStorage.setItem("darkMode", JSON.stringify(true));
    } else {
      document.body.classList.remove("dark-mode");
      // ✅ ADDED: Save theme choice to localStorage
      localStorage.setItem("darkMode", JSON.stringify(false));
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Pages without sidebar */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Pages with sidebar */}
        <Route
          path="/dashboard"
          element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />}
        />
        <Route
          path="/profile"
          element={<Profile darkMode={darkMode} setDarkMode={setDarkMode} />}
        />
        <Route
          path="/onboarding"
          element={<Onboarding darkMode={darkMode} setDarkMode={setDarkMode} />}
        />
        {/* ✅ Add the new route for the settings page */}
        <Route
          path="/settings"
          element={<Settings darkMode={darkMode} setDarkMode={setDarkMode} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
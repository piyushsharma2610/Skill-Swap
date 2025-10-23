import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import Dashboard from "./Pages/Dashboard";
import Profile from "./Pages/Profile";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import Landing from "./Pages/Landing";
import Onboarding from "./Pages/Onboarding";
import Settings from "./Pages/Settings";
import MySkills from "./Pages/MySkills";
import Notifications from "./Pages/Notifications";

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    return JSON.parse(savedMode) || false;
  });

  const [notifications, setNotifications] = useState([]);
  const [latestSkill, setLatestSkill] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Theme management
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("darkMode", JSON.stringify(true));
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("darkMode", JSON.stringify(false));
    }
  }, [darkMode]);

  // WebSocket connection management
  useEffect(() => {
    let socket = null; // Use a local variable within the effect
    const token = localStorage.getItem("token");

    if (token) {
      try {
          const clientId = jwtDecode(token).sub;
          socket = new WebSocket(`ws://127.0.0.1:8000/ws/${clientId}`);
          socketRef.current = socket; // Store the current socket instance

          socket.onopen = () => console.log(`WebSocket connection established for ${clientId}!`);

          socket.onmessage = (event) => {
              try {
                  const message = JSON.parse(event.data);
                  console.log("App.jsx received message:", message); // Debug log
                  if (message.type === 'new_skill') {
                      setLatestSkill(message.data);
                  } else if (message.type === 'new_request' || message.type === 'request_response') {
                      setNotifications(prev => [message, ...prev]);
                  }
              } catch (e) {
                  console.error("Failed to parse WebSocket message:", e);
              }
          };

          socket.onclose = (event) => {
              console.log(`WebSocket connection closed for ${clientId}. Code: ${event.code}, Reason: ${event.reason}`);
              // Check if the current ref still points to this closing socket before nulling it
              if (socketRef.current === socket) {
                socketRef.current = null;
              }
          };

          socket.onerror = (error) => {
              console.error(`WebSocket error for ${clientId}:`, error);
          };

      } catch (e) {
          console.error("Failed to decode token or connect WebSocket:", e);
      }
    }

    // Cleanup function: Close the socket when the component unmounts or the effect re-runs
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket connection in cleanup.");
        socket.close();
      }
       // We don't nullify socketRef here anymore, onclose handles it
    };
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Pass the necessary props to each component */}
        <Route path="/dashboard" element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} notifications={notifications} latestSkill={latestSkill} />} />
        <Route path="/profile" element={<Profile darkMode={darkMode} setDarkMode={setDarkMode} notifications={notifications} />} />
        <Route path="/onboarding" element={<Onboarding darkMode={darkMode} setDarkMode={setDarkMode} notifications={notifications} />} />
        <Route path="/settings" element={<Settings darkMode={darkMode} setDarkMode={setDarkMode} notifications={notifications} />} />
        <Route path="/myskills" element={<MySkills darkMode={darkMode} setDarkMode={setDarkMode} notifications={notifications} />} />
        <Route path="/notifications" element={<Notifications darkMode={darkMode} setDarkMode={setDarkMode} notifications={notifications} setNotifications={setNotifications} socket={socketRef.current} />} />
      </Routes>
    </BrowserRouter>
  );
}
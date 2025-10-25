import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaBook, FaUser, FaCog, FaSignOutAlt,FaTasks, FaBell , FaCommentDots } from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import './Settings.css';


// A reusable toggle switch component
const ToggleSwitch = ({ label, checked, onChange }) => (
  <label className="toggle-switch">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="slider"></span>
    {label}
  </label>
);

export default function Settings({ darkMode, setDarkMode }) {
  // State for Password Change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });

  // State for Privacy Settings
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [emailVisibility, setEmailVisibility] = useState("hidden");
  const [privacyMessage, setPrivacyMessage] = useState({ text: "", type: "" });

  // State for Notification Settings
  const [notifications, setNotifications] = useState({
    onNewRequest: true,
    onRequestUpdate: true,
    onNewSuggestion: false,
  });
  const [notificationMessage, setNotificationMessage] = useState({ text: "", type: "" });

  // Fetch current settings on page load
  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://127.0.0.1:8000/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setProfileVisibility(data.profileVisibility || "public");
          setEmailVisibility(data.emailVisibility || "hidden");
          if (data.notificationSettings) {
            setNotifications(data.notificationSettings);
          }
        }
      } catch (err) {
        console.error("Could not fetch settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ text: "", type: "" });
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://127.0.0.1:8000/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({ text: data.message, type: "success" });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else { throw new Error(data.detail); }
    } catch (err) {
      setPasswordMessage({ text: err.message, type: "error" });
    }
  };

  const handleSavePrivacy = async (e) => {
    e.preventDefault();
    setPrivacyMessage({ text: "", type: "" });
    const token = localStorage.getItem("token");
    try {
        const res = await fetch("http://127.0.0.1:8000/profile/privacy", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ profileVisibility, emailVisibility })
        });
        const data = await res.json();
        if(res.ok) {
            setPrivacyMessage({ text: data.message, type: "success"});
        } else { throw new Error(data.detail); }
    } catch(err) {
        setPrivacyMessage({ text: err.message, type: "error"});
    }
  };
  
  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    setNotificationMessage({ text: "", type: "" });
    const token = localStorage.getItem("token");
    try {
        const res = await fetch("http://127.0.0.1:8000/profile/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(notifications)
        });
        const data = await res.json();
        if(res.ok) {
            setNotificationMessage({ text: data.message, type: "success"});
        } else { throw new Error(data.detail); }
    } catch(err) {
        setNotificationMessage({ text: err.message, type: "error"});
    }
  };

  return (
    <div className="settings-layout">
      {/* ✅ --- CORRECTED SIDEBAR --- */}
      <aside className="sidebar">
        <h2 className="logo">SkillSwap 🚀</h2>
        <nav>
          <ul>
            <li><Link to="/dashboard"><FaHome /> Home</Link></li>
            <li><Link to="/onboarding"><FaBook /> My Interests & Skills</Link></li>
            <li><Link to="/myskills"><FaTasks /> My Skills</Link></li>
            <li><Link to="/profile"><FaUser /> Profile</Link></li>
            <li><Link to="/settings"><FaCog /> Settings</Link></li>
            <li>
              <Link to="/notifications" className="notification-link">
                <FaBell /> Notifications
                {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
              </Link>
            </li>
            <li><Link to="/chats"><FaCommentDots /> Chats</Link></li>
            <li><Link to="/login"><FaSignOutAlt /> Logout</Link></li>
          </ul>
        </nav>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`toggle-btn ${darkMode ? "dark" : "light"}`}
        >
          <Sun size={18} />
          <Moon size={18} />
          <div className="toggle-circle">
            {darkMode ? <Moon size={16} /> : <Sun size={16} />}
          </div>
        </button>
      </aside>

      <main className="settings-main">
        <h1>Settings</h1>
        
        {/* Account Management Card */}
        <div className="settings-card">
          <h2>🔐 Account Management</h2>
          <form onSubmit={handleChangePassword}>
            <p className="form-description">Change your password.</p>
            <div className="form-group">
              <label htmlFor="current-password">Current Password</label>
              <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="primary">Update Password</button>
            {passwordMessage.text && <p className={`message ${passwordMessage.type}`}>{passwordMessage.text}</p>}
          </form>
        </div>

        {/* Privacy Settings Card */}
        <div className="settings-card">
          <h2>👁️ Profile & Privacy</h2>
          <form onSubmit={handleSavePrivacy}>
            <div className="form-group">
              <label>Profile Visibility</label>
              <p className="form-description">Control who can see your full profile details.</p>
              <div className="radio-group">
                <label><input type="radio" name="profileVisibility" value="public" checked={profileVisibility === 'public'} onChange={(e) => setProfileVisibility(e.target.value)} /> Public (Visible to all logged-in users)</label>
                <label><input type="radio" name="profileVisibility" value="peers" checked={profileVisibility === 'peers'} onChange={(e) => setProfileVisibility(e.target.value)} /> Peers Only (Only visible to users you've connected with)</label>
              </div>
            </div>
            <div className="form-group">
              <label>Email Visibility</label>
              <p className="form-description">Control when your email address is shared.</p>
              <div className="radio-group">
                <label><input type="radio" name="emailVisibility" value="hidden" checked={emailVisibility === 'hidden'} onChange={(e) => setEmailVisibility(e.target.value)} /> Hidden (Your email is never shown to other users)</label>
                <label><input type="radio" name="emailVisibility" value="onRequest" checked={emailVisibility === 'onRequest'} onChange={(e) => setEmailVisibility(e.target.value)} /> On Request (Shared only after you accept a skill exchange)</label>
              </div>
            </div>
            <button type="submit" className="primary">Save Privacy Settings</button>
            {privacyMessage.text && <p className={`message ${privacyMessage.type}`}>{privacyMessage.text}</p>}
          </form>
        </div>
        
        {/* Notifications Card */}
        <div className="settings-card">
          <h2>🔔 Notification Settings</h2>
          <form onSubmit={handleSaveNotifications}>
            <p className="form-description">Choose how you receive notifications from SkillSwap.</p>
            <div className="form-group">
                <ToggleSwitch label="Email me for a new skill exchange request." checked={notifications.onNewRequest} onChange={() => setNotifications(p => ({...p, onNewRequest: !p.onNewRequest}))} />
            </div>
            <div className="form-group">
                <ToggleSwitch label="Email me when a request is accepted or declined." checked={notifications.onRequestUpdate} onChange={() => setNotifications(p => ({...p, onRequestUpdate: !p.onRequestUpdate}))} />
            </div>
            <div className="form-group">
                <ToggleSwitch label="Email me with weekly skill suggestions." checked={notifications.onNewSuggestion} onChange={() => setNotifications(p => ({...p, onNewSuggestion: !p.onNewSuggestion}))} />
            </div>
            <button type="submit" className="primary">Save Notifications</button>
            {notificationMessage.text && <p className={`message ${notificationMessage.type}`}>{notificationMessage.text}</p>}
          </form>
        </div>
      </main>
    </div>
  );
}
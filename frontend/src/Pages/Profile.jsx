import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaHome, FaBook, FaUser, FaCog, FaSignOutAlt, FaEdit, FaPlus, FaTasks, FaBell } from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import "./Profile.css";


const BACKEND_URL = "http://127.0.0.1:8000";

export default function Notifications({ darkMode, setDarkMode, notifications, setNotifications }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({});
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get(`${BACKEND_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setProfile(res.data);
        setBio(res.data.bio || "");
        setSkills(res.data.skills_offered?.join(", ") || "");
        setPreviewImage(res.data.profile_pic ? `${BACKEND_URL}${res.data.profile_pic}` : "/default-profile.png");
      })
      .catch((err) => console.error("Profile fetch failed", err));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    let uploadedPicUrl = profile.profile_pic;
    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      try {
        const res = await axios.post(`${BACKEND_URL}/profile/picture`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
        });
        uploadedPicUrl = res.data.profile_pic_url;
      } catch (err) {
        alert("Error uploading image ❌");
        return;
      }
    }
    const skillsArray = skills.split(",").map((s) => s.trim()).filter(s => s);
    try {
      await axios.put(`${BACKEND_URL}/profile`, {
        bio,
        skills_offered: skillsArray,
        profile_pic: uploadedPicUrl,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setProfile(prev => ({ ...prev, bio, skills_offered: skillsArray, profile_pic: uploadedPicUrl }));
      setIsEditing(false);
      setSelectedFile(null);
      alert("Profile updated ✅");
    } catch (err) {
      alert("Error updating profile ❌");
    }
  };

  const handleCancel = () => {
    setBio(profile.bio || "");
    setSkills(profile.skills_offered?.join(", ") || "");
    setPreviewImage(profile.profile_pic ? `${BACKEND_URL}${profile.profile_pic}` : "/default-profile.png");
    setSelectedFile(null);
    setIsEditing(false);
  };

  return (
    <div className="profile-layout">
      <aside className="sidebar">
        <h2 className="logo">SkillSwap 🚀</h2>
        <nav>
          <ul>
            <li><Link to="/dashboard"><FaHome /> Home</Link></li>
            <li><Link to="/onboarding"><FaBook /> My Interests & Skills</Link></li>
            <li><Link to="/myskills"><FaTasks /> My Skills</Link></li>
            <li>
              <Link to="/notifications" className="notification-link">
                <FaBell /> Notifications
                {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
              </Link>
            </li>
            <li><Link to="/profile"><FaUser /> Profile</Link></li>
            <li><Link to="/settings"><FaCog /> Settings</Link></li>
            <li><Link to="/login"><FaSignOutAlt /> Logout</Link></li>
          </ul>
        </nav>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`toggle-btn ${darkMode ? "dark" : "light"}`}
        >
          <Sun size={18} />
          <Moon size={18} />
          <div className="toggle-circle">{darkMode ? <Moon size={16} /> : <Sun size={16} />}</div>
        </button>
      </aside>
      <main className="profile-main-redesigned">
        <div className="profile-card">
          <div className="profile-banner"></div>
          <div className="profile-picture-wrapper">
            <img src={previewImage} alt="Profile" className="profile-picture" />
            {isEditing && (
              <button className="picture-edit-btn" onClick={() => fileInputRef.current.click()}>
                <FaPlus />
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="profile-form-redesigned">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
              <input type="text" value={profile.username || ""} disabled className="username-display"/>
              <textarea placeholder="Your bio..." rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
              <input type="text" placeholder="Your skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} />
              <div className="form-actions">
                <button className="secondary-btn" onClick={handleCancel}>Cancel</button>
                <button className="primary save-btn" onClick={handleSave}>Save</button>
              </div>
            </div>
          ) : (
            <div className="profile-content">
              <div className="profile-header-redesigned">
                <h2 className="username-display">{profile.username || "Your Name"}</h2>
                <button className="edit-profile-btn" onClick={() => setIsEditing(true)}><FaEdit /> Edit Profile</button>
              </div>
              <p className="bio-display">{profile.bio || "No bio yet. Click 'Edit Profile' to add one."}</p>
              <div className="skills-section">
                <h3>Skills Offered</h3>
                <div className="tag-container">
                  {profile.skills_offered && profile.skills_offered.length > 0 ?
                    profile.skills_offered.map((skill, i) => <span key={i} className="tag">{skill}</span>) :
                    <p className="muted-text">No skills listed.</p>
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
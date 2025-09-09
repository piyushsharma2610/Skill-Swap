import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FaHome,
  FaBook,
  FaUser,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Sun, Moon } from "lucide-react";

import "./Profile.css";

export default function Profile() {

  
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState({});
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [analytics, setAnalytics] = useState({
    skillsCount: 0,
    usersReached: 0,
    progress: 0,
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  // Load profile
  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get("http://127.0.0.1:8000/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setProfile(res.data);
        setBio(res.data.bio || "");
        setSkills(res.data.skills_offered?.join(", ") || "");
        setProfilePic(res.data.profile_pic || "");
      })
      .catch((err) => console.error(err));
  }, []);

  // Fake analytics data
  useEffect(() => {
    setAnalytics({
      skillsCount: 12,
      usersReached: 45,
      progress: 68,
    });
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        "http://127.0.0.1:8000/profile",
        {
          bio,
          skills_offered: skills.split(",").map((s) => s.trim()),
          profile_pic: profilePic,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Profile updated ✅");
    } catch (err) {
      alert("Error updating profile ❌");
    }
  };

  // Chart Data
  const chartData = [
    { name: "Skills", value: analytics.skillsCount },
    { name: "Users", value: analytics.usersReached },
    { name: "Progress", value: analytics.progress },
  ];

  
 

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("⚠️ No token found. Redirect to login maybe?");
      return;
    }

    axios
      .get("http://127.0.0.1:8000/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setProfile(res.data))
      .catch((err) => console.error("❌ Profile fetch failed", err));
  }, []);

  return (
    <div className="profile-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">SkillSwap 🚀</h2>
        <nav>
          <ul>
            <li>
              <Link to="/dashboard"><FaHome /> Home</Link>
            </li>
            <li>
              <Link to="/skills"><FaBook /> Skills</Link>
            </li>
            <li>
              <Link to="/profile"><FaUser /> Profile</Link>
            </li>
            <li>
              <Link to="/settings"><FaCog /> Settings</Link>
            </li>
            <li>
              <Link to="/login"><FaSignOutAlt /> Logout</Link>
            </li>
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

      {/* Main Profile Area */}
      <main className="profile-main">
        {/* Left side - Profile Form */}
        <div className="profile-left">
          <div className="profile-header">
            <div className="profile-pic-wrapper">
              <img
                
                src="/default-profile.png"
                alt="Profile"
                className="profile-pic"
               />
            </div>
            <h2>{profile.username || "Your Name"}</h2>
            <p className="tagline">{bio || "Write something about yourself..."}</p>
          </div>

          <div className="profile-form">
            <h3>Edit Profile</h3>
            <label>Profile Picture URL</label>
            <input
              type="text"
              value={profilePic}
              onChange={(e) => setProfilePic(e.target.value)}
            />

            <label>Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />

            <label>Skills Offered</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />

            <button className="primary save-btn" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>

        {/* Right side - Analytics */}
        <div className="profile-right">
          <h3>Your Analytics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Skills</h4>
              <p>{analytics.skillsCount}</p>
            </div>
            <div className="stat-card">
              <h4>Users Reached</h4>
              <p>{analytics.usersReached}</p>
            </div>
            <div className="stat-card">
              <h4>Progress</h4>
              <p>{analytics.progress}%</p>
            </div>
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="var(--text-color)" />
                <YAxis stroke="var(--text-color)" />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

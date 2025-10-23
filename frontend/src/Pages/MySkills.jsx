import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMySkills, deleteSkill } from '../../services/api';
import { FaHome, FaBook, FaUser, FaCog, FaSignOutAlt, FaTasks, FaBell, FaTrash } from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import './MySkills.css';


// ✅ MODIFIED: Added 'notifications' to the props
export default function Notifications({ darkMode, setDarkMode, notifications, setNotifications }) {
  const [mySkills, setMySkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  useEffect(() => {
    const fetchMySkills = async () => {
      try {
        setIsLoading(true);
        const data = await getMySkills();
        setMySkills(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error("Failed to fetch skills:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMySkills();
  }, []);

  const handleDelete = async (skillId) => {
    if (window.confirm("Are you sure you want to delete this skill? This action cannot be undone.")) {
      try {
        await deleteSkill(skillId);
        setMySkills(currentSkills => currentSkills.filter(skill => skill.id !== skillId));
      } catch (err) {
        alert("Failed to delete skill: " + err.message);
      }
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <p>Loading your skills...</p>;
    }
    if (error) {
      return <p className="error-text">Error: {error}</p>;
    }
    if (mySkills.length === 0) {
      return (
        <div className="no-skills-message">
          <p>You haven't offered any skills yet.</p>
          <button className="primary" onClick={() => navigate('/dashboard')}>Add Your First Skill</button>
        </div>
      );
    }
    return (
      <div className="skills-grid">
        {mySkills.map(skill => (
          <div key={skill.id} className="skill-card">
            <div className="skill-card-header">
              <h3>{skill.title}</h3>
              <span className="category-tag">{skill.category}</span>
            </div>
            <p className="skill-description">{skill.description}</p>
            <div className="skill-card-footer">
              <span className="availability">Availability: {skill.availability}</span>
              <button className="delete-btn" onClick={() => handleDelete(skill.id)}>
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="my-skills-layout">
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
      <main className="my-skills-main">
        <h1>My Offered Skills</h1>
        {renderContent()}
      </main>
    </div>
  );
}
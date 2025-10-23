import React, { useEffect, useState } from "react";
import ReactDOM from 'react-dom'; // Import ReactDOM for Portals
import { Link } from "react-router-dom";
import "./Dashboard.css";
import { FaHome, FaBook, FaUser, FaCog, FaSignOutAlt, FaTasks, FaBell } from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { getSummary, getMarketSkills, addSkill, requestExchange } from "../../services/api";

export default function Dashboard({ darkMode, setDarkMode, notifications, latestSkill }) {
  const [summary, setSummary] = useState(null);
  const [market, setMarket] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", availability: "" });
  
  let username = "Learner";
  const token = localStorage.getItem("token");
  if (token) {
    try {
      username = jwtDecode(token).sub;
    } catch (err) {
      console.error("Invalid token on Dashboard", err);
    }
  }

  // Effect to handle incoming 'latestSkill' from WebSocket via props
  useEffect(() => {
    // Add the new skill only if it exists and wasn't created by the current user
    if (latestSkill && latestSkill.owner !== username) {
      // Add to the beginning of the market list
      setMarket(prevMarket => [latestSkill, ...prevMarket]);
    }
  }, [latestSkill, username]); // Rerun when latestSkill or username changes
  
  // Effect for theme management
  useEffect(() => {
    if (darkMode) { document.body.classList.add("dark-mode"); } 
    else { document.body.classList.remove("dark-mode"); }
  }, [darkMode]);

  // Effect for initial data load (summary and marketplace)
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [summaryData, marketData] = await Promise.all([getSummary(), getMarketSkills()]);
        setSummary(summaryData);
        setMarket(marketData);
      } catch (e) {
        setErr(e.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []); // Run only once on mount

  // Handler for submitting the 'Add Skill' form
  async function handleAddSkill(e) {
    e.preventDefault();
    try {
      await addSkill(form);
      setShowModal(false);
      setForm({ title: "", description: "", category: "", availability: "" });
      // No need to manually refresh market, WebSocket broadcast handles it
    } catch (e) {
      alert("Failed to add skill: " + e.message);
    }
  }

  // Handler for clicking the 'Request Exchange' button
  async function handleRequest(skillId) {
    const message = window.prompt("Enter an optional message for your request:");
    if (message === null) return; // User clicked cancel
    try {
      await requestExchange(skillId, message);
      alert("Request sent successfully!");
      // Backend handles sending the notification
    } catch (e) {
      alert("Failed to send request: " + e.message);
    }
  }
  
  // Component to display a single skill card in the marketplace
  function SkillCard({ skill, onRequest, currentUser }) {
    const [expanded, setExpanded] = useState(false);
    const maxLength = 120;

    return (
      <div className="market-card">
        <h3>{skill.title}</h3>
        <p className="muted">{skill.category} • {skill.availability}</p>
        <p>
          {expanded ? skill.description : skill.description.length > maxLength ? skill.description.slice(0, maxLength) + "..." : skill.description}
        </p>
        {skill.description.length > maxLength && (
          <button className="show-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show Less" : "Show More"}
          </button>
        )}
        <div className="owner">By: {skill.owner}</div>
        
        {/* Show button only if the skill is not owned by the current user */}
        {skill.owner !== currentUser && (
          <button className="primary" onClick={() => onRequest(skill.id)}>
            Request Exchange
          </button>
        )}
      </div>
    );
  }

  // Calculate the count of incoming request notifications for the badge
  const incomingRequestCount = notifications ? notifications.filter(n => n.type === 'new_request').length : 0;

  return (
    <div className="dashboard-container">
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
                {/* Use the calculated count for the badge */}
                {incomingRequestCount > 0 && <span className="notification-badge">{incomingRequestCount}</span>}
              </Link>
            </li>
            <li><Link to="/profile"><FaUser /> Profile</Link></li>
            <li><Link to="/settings"><FaCog /> Settings</Link></li>
            <li><Link to="/login"><FaSignOutAlt /> Logout</Link></li>
          </ul>
        </nav>
        <button onClick={() => setDarkMode(!darkMode)} className={`toggle-btn ${darkMode ? "dark" : "light"}`}>
          <Sun size={18} />
          <Moon size={18} />
          <div className="toggle-circle">{darkMode ? <Moon size={16} /> : <Sun size={16} />}</div>
        </button>
      </aside>

      <main className="main-content">
        <header className="welcome-banner">
          <h1>Welcome back, {summary?.username || username}! 🌟</h1>
          <p>Ready to boost your skills today?</p>
        </header>

        {/* --- SUMMARY CARDS --- */}
        <section className="cards">
         <div className="card">
            <h3>📚 Continue Learning</h3>
            <p>
              {summary?.last_active_skill
                ? `Pick up where you left off in "${summary.last_active_skill}".`
                : "Start your first skill today!"}
            </p>
          </div>
          <div className="card">
            <h3>🏆 Your Progress</h3>
            <p>
              {summary
                ? `${summary.totals.completed} skills completed, ${summary.totals.in_progress} in progress.`
                : "Loading..."}
            </p>
          </div>
          <div className="card">
            <h3>💡 AI Suggestion</h3>
            <p>{summary?.ai_suggestion || "Loading suggestion..."}</p>
          </div>
        </section>
        {/* --- END SUMMARY CARDS --- */}

        {/* --- MARKETPLACE SECTION --- */}
        <section className="market-wrap">
          <h2>Skills Marketplace</h2>
          {err && <p className="error-text">{err}</p>}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="market-grid">
              {market.map((s) => (
                <SkillCard key={s.id} skill={s} onRequest={handleRequest} currentUser={username} />
              ))}
              {market.length === 0 && <p>No skills available yet. Be the first to add one!</p>}
            </div>
          )}
        </section>
        {/* --- END MARKETPLACE SECTION --- */}
        
        {/* --- FLOATING ACTION BUTTON --- */}
        <button className="fab" onClick={() => setShowModal(true)}>＋</button>
        {/* --- END FLOATING ACTION BUTTON --- */}

        {/* --- ADD SKILL MODAL (Using Portal) --- */}
        {showModal && ReactDOM.createPortal(
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Add a New Skill</h3>
              <form onSubmit={handleAddSkill} className="modal-form">
                <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <textarea placeholder="Description" rows={3} value={form.description} maxLength={200} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 200) })} required />
                <small>{form.description.length}/200 characters</small>
                <input placeholder="Category (e.g., Web Dev, Music)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
                <input placeholder="Availability (e.g., Evenings, Weekends)" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} required />
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="primary" type="submit">Save</button>
                </div>
              </form>
            </div>
          </div>,
          document.body // Renders the modal outside the main div
        )}
        {/* --- END ADD SKILL MODAL --- */}
      </main>
    </div>
  );
}
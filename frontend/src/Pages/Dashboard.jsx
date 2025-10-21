import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import { FaHome, FaBook, FaUser, FaCog, FaSignOutAlt } from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { getSummary, getMarketSkills, addSkill, requestExchange, getSkills } from "../../services/api";

// ✅ FINAL FIX: Component now correctly accepts props
export default function Dashboard({ darkMode, setDarkMode }) {
  
  // The incorrect local state has been removed.

  // This useEffect now correctly uses the prop passed from App.jsx
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const token = localStorage.getItem("token");
  let username = "Learner";

  if (token) {
    try {
      const decoded = jwtDecode(token);
      username = decoded.sub || "Learner";
    } catch (err) {
      console.error("Invalid token", err);
    }
  }

  const [summary, setSummary] = useState(null);
  const [market, setMarket] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [skills, setSkills] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    availability: "",
  });

  // Load summary + market
  useEffect(() => {
    (async () => {
      try {
        const [s, m] = await Promise.all([getSummary(), getMarketSkills()]);
        setSummary(s);
        setMarket(m);
      } catch (e) {
        setErr(e.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load user skills
  useEffect(() => {
    fetchSkills();
  }, []);

  async function fetchSkills() {
    try {
      const data = await getSkills();
      setSkills(data.skills || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddSkill(e) {
    e.preventDefault();
    try {
      await addSkill(form);
      setShowModal(false);
      setForm({ title: "", description: "", category: "", availability: "" });
      // Refresh marketplace + summary
      const [s, m] = await Promise.all([getSummary(), getMarketSkills()]);
      setSummary(s);
      setMarket(m);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleRequest(skillId) {
    try {
      await requestExchange(skillId);
      alert("Request sent successfully!");
    } catch (e) {
      alert("Failed to request exchange: " + e.message);
    }
  }

  // Skill Card Component
  function SkillCard({ skill, onRequest }) {
    const [expanded, setExpanded] = useState(false);
    const maxLength = 120;

    return (
      <div className="market-card">
        <h3>{skill.title}</h3>
        <p className="muted">
          {skill.category} • {skill.availability}
        </p>
        <p>
          {expanded
            ? skill.description
            : skill.description.length > maxLength
            ? skill.description.slice(0, maxLength) + "..."
            : skill.description}
        </p>
        {skill.description.length > maxLength && (
          <button className="show-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show Less" : "Show More"}
          </button>
        )}
        <div className="owner">By: {skill.owner}</div>
        {skill.owner !== "You" && (
          <button
            className="primary"
            onClick={() => onRequest(skill.id)}
          >
            Request Exchange
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">SkillSwap 🚀</h2>
        <nav>
          <ul>
            <li>
              <Link to="/dashboard">
                <FaHome /> Home
              </Link>
            </li>
            <li>
              <Link to="/onboarding">
                <FaBook /> My Interests & Skills
              </Link>
            </li>
            <li>
              <Link to="/profile">
                <FaUser /> Profile
              </Link>
            </li>
            <li>
              <Link to="/settings">
                <FaCog /> Settings
              </Link>
            </li>
            <li>
              <Link to="/login">
                <FaSignOutAlt /> Logout
              </Link>
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

      {/* Main Content */}
      <main className="main-content">
        <header className="welcome-banner">
          <h1>Welcome back, {summary?.username || username}! 🌟</h1>
          <p>Ready to boost your skills today?</p>
        </header>

        {/* Cards */}
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

        {/* Marketplace */}
        <section className="market-wrap">
          <h2>Skills Marketplace</h2>
          {err && <p className="error-text">{err}</p>}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="market-grid">
              {market.map((s) => (
                <SkillCard key={s.id} skill={s} onRequest={handleRequest} />
              ))}
              {market.length === 0 && (
                <p>No skills available yet. Be the first to add one!</p>
              )}
            </div>
          )}
        </section>

        {/* Floating Add Button */}
        <button className="fab" onClick={() => setShowModal(true)}>
          ＋
        </button>

        {/* Add Skill Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Add a New Skill</h3>
              <form onSubmit={handleAddSkill} className="modal-form">
                <input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Description"
                  rows={3}
                  value={form.description}
                  maxLength={200}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value.slice(0, 200),
                    })
                  }
                  required
                />
                <small>{form.description.length}/200 characters</small>
                <input
                  placeholder="Category (e.g., Web Dev, Music)"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  required
                />
                <input
                  placeholder="Availability (e.g., Evenings, Weekends)"
                  value={form.availability}
                  onChange={(e) =>
                    setForm({ ...form, availability: e.target.value })
                  }
                  required
                />
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button className="primary" type="submit">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
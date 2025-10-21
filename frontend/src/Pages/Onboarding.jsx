import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaHome, FaBook, FaUser, FaCog, FaSignOutAlt, FaEdit } from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import './Onboarding.css'; // We'll use the same CSS file

export default function Onboarding({ darkMode, setDarkMode }) {
  // ✅ --- NEW STATE MANAGEMENT ---
  const [isEditing, setIsEditing] = useState(false); // To toggle between display and edit views
  const [isLoading, setIsLoading] = useState(true);   // To show a loading message
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    learningGoals: [],
    interests: [],
    hobbies: [],
    preferredTimings: []
  });
  const [currentInput, setCurrentInput] = useState("");
  const navigate = useNavigate();

  // ✅ --- NEW: FETCH USER DATA ON LOAD ---
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        const res = await fetch("http://127.0.0.1:8000/profile", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        
        // Check if user has already filled out their preferences
        if (data.learningGoals && data.learningGoals.length > 0) {
          setFormData({
            learningGoals: data.learningGoals || [],
            interests: data.interests || [],
            hobbies: data.hobbies || [],
            preferredTimings: data.preferredTimings || []
          });
          setIsEditing(false); // Show the display view
        } else {
          setIsEditing(true); // Show the form for the first time
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
        setIsEditing(true); // If fetch fails, show form anyway
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [navigate]); // Rerun if navigate function changes

  
  const handleInputChange = (e) => {
    setCurrentInput(e.target.value);
  };

  const handleAddItem = (field) => {
    if (currentInput.trim() !== "" && !formData[field].includes(currentInput.trim())) {
      setFormData(prev => ({ ...prev, [field]: [...prev[field], currentInput.trim()] }));
      setCurrentInput("");
    }
  };

  // ✅ NEW: Function to remove an item
  const handleRemoveItem = (field, itemToRemove) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item !== itemToRemove)
    }));
  };
  
  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const timings = checked
        ? [...prev.preferredTimings, value]
        : prev.preferredTimings.filter(t => t !== value);
      return { ...prev, preferredTimings: timings };
    });
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Authentication error: No token found. Please log in again.");
      navigate("/login");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/profile/interests", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert("Your preferences have been saved!");
        setIsEditing(false); // ✅ Switch back to display mode after saving
        setStep(1); // Reset step for next time
      } else {
        const data = await res.json();
        throw new Error(data.detail || "Failed to save preferences.");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // ✅ --- NEW: RENDER FUNCTION FOR THE MULTI-STEP EDIT FORM ---
  const renderEditForm = () => {
    // Re-populate currentInput when switching steps
    const currentField = ['learningGoals', 'interests'][step - 1];
    
    switch (step) {
      case 1:
        return (
          <div>
            <h2>What do you want to learn?</h2>
            <p>List some topics or skills you're eager to learn.</p>
            <div className="tag-input">
              <input type="text" value={currentInput} onChange={handleInputChange} placeholder="e.g., Python, React, Public Speaking" />
              <button onClick={() => handleAddItem('learningGoals')}>Add</button>
            </div>
            <div className="tag-container">
              {formData.learningGoals.map((item, i) => <span key={i} className="tag" onClick={() => handleRemoveItem('learningGoals', item)}>{item} ✖</span>)}
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2>What are your interests & hobbies?</h2>
            <p>This helps us recommend like-minded people.</p>
            <div className="tag-input">
              <input type="text" value={currentInput} onChange={handleInputChange} placeholder="e.g., Technology, Music, Hiking" />
              <button onClick={() => handleAddItem('interests')}>Add</button>
            </div>
            <div className="tag-container">
              {formData.interests.map((item, i) => <span key={i} className="tag" onClick={() => handleRemoveItem('interests', item)}>{item} ✖</span>)}
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h2>When are you usually available?</h2>
            <p>Select all that apply.</p>
            <div className="checkbox-group">
              <label><input type="checkbox" value="Weekdays" onChange={handleCheckboxChange} checked={formData.preferredTimings.includes("Weekdays")} /> Weekdays</label>
              <label><input type="checkbox" value="Weekends" onChange={handleCheckboxChange} checked={formData.preferredTimings.includes("Weekends")} /> Weekends</label>
              <label><input type="checkbox" value="Evenings" onChange={handleCheckboxChange} checked={formData.preferredTimings.includes("Evenings")} /> Evenings</label>
              <label><input type="checkbox" value="Flexible" onChange={handleCheckboxChange} checked={formData.preferredTimings.includes("Flexible")} /> Flexible</label>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <h2>All set!</h2>
            <p>Click save to update your profile.</p>
            <button className="primary" onClick={handleSubmit}>Save Preferences</button>
          </div>
        );
      default: return null;
    }
  };

  // ✅ --- NEW: RENDER FUNCTION FOR DISPLAYING SAVED PREFERENCES ---
  const renderDisplayView = () => (
    <div className="display-view">
      <div className="display-header">
        <h2>Your Interests & Skills</h2>
        <button className="edit-btn" onClick={() => setIsEditing(true)}><FaEdit /> Edit</button>
      </div>

      <div className="display-section">
        <h3>You want to learn:</h3>
        <div className="tag-container">
          {formData.learningGoals.length > 0 ? formData.learningGoals.map((item, i) => <span key={i} className="tag">{item}</span>) : <p className="muted-text">No learning goals added yet.</p>}
        </div>
      </div>
      
      <div className="display-section">
        <h3>Your interests & hobbies:</h3>
        <div className="tag-container">
          {formData.interests.length > 0 ? formData.interests.map((item, i) => <span key={i} className="tag">{item}</span>) : <p className="muted-text">No interests added yet.</p>}
        </div>
      </div>
      
      <div className="display-section">
        <h3>Your availability:</h3>
        <div className="tag-container">
          {formData.preferredTimings.length > 0 ? formData.preferredTimings.map((item, i) => <span key={i} className="tag">{item}</span>) : <p className="muted-text">No availability set yet.</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="onboarding-layout">
      <aside className="sidebar">
        <h2 className="logo">SkillSwap 🚀</h2>
        <nav>
          <ul>
            <li><Link to="/dashboard"><FaHome /> Home</Link></li>
            <li><Link to="/onboarding"><FaBook /> My Interests & Skills</Link></li>
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
          <div className="toggle-circle">
            {darkMode ? <Moon size={16} /> : <Sun size={16} />}
          </div>
        </button>
      </aside>
      <main className="onboarding-main">
        <div className="onboarding-box">
          {isLoading ? (
            <p>Loading your preferences...</p>
          ) : isEditing ? (
            <>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
              </div>
              <div className="step-content">{renderEditForm()}</div>
              <div className="step-navigation">
                {step > 1 && <button onClick={prevStep}>Back</button>}
                {step < 4 && <button className="primary" onClick={nextStep}>Next</button>}
                {step === 4 && <button onClick={() => setIsEditing(false)}>Cancel</button>}
              </div>
            </>
          ) : (
            renderDisplayView()
          )}
        </div>
      </main>
    </div>
  );
}
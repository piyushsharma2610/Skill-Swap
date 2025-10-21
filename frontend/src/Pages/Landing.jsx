import React from "react";
import "./Landing.css";
import { FaChalkboardTeacher, FaHandsHelping, FaLaptopCode } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing">
      <div className="overlay">
        <header className="navbar">
          <h1 className="logo">SkillSwap</h1>
          <nav>
            <Link to="/login" className="nav-btn">Login</Link>
            <Link to="/signup" className="nav-btn">Sign Up</Link>
          </nav>
        </header>

        <section className="hero">
          <h2 className="hero-title">Exchange Skills. Learn. Grow. Together.</h2>
          <p className="hero-quote">
            A community-driven platform where learning is fun and knowledge is shared.
          </p>
          <Link to="/signup" className="get-started">🚀 Get Started</Link>
        </section>
      </div>

      <section className="features">
        <div className="feature-card">
          <FaChalkboardTeacher className="feature-icon" />
          <h3>Learn Anytime</h3>
          <p>Connect with peers and mentors to gain real-world skills.</p>
        </div>
        <div className="feature-card">
          <FaHandsHelping className="feature-icon" />
          <h3>Share Knowledge</h3>
          <p>Teach others your skills and grow together in a supportive community.</p>
        </div>
        <div className="feature-card">
          <FaLaptopCode className="feature-icon" />
          <h3>AI Suggestions</h3>
          <p>Smart recommendations help you find the right mentor and skills faster.</p>
        </div>
      </section>
    </div>
  );
}
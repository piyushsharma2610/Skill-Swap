import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaBook, FaUser, FaCog, FaSignOutAlt, FaTasks, FaBell, FaCommentDots } from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import { getChatConnections } from '../../services/api';
import ChatWindow from '../components/ChatWindow';
import './Chats.css'; // Correctly imports its own CSS

// Receives socketRef from App.jsx
export default function Chats({ darkMode, setDarkMode, notifications, socketRef }) {
    const [connections, setConnections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeChat, setActiveChat] = useState(null); // Stores { requestId, otherUser }

    // Fetch the list of accepted connections when the page loads
    useEffect(() => {
        const fetchConnections = async () => {
            try {
                setIsLoading(true);
                const data = await getChatConnections();
                setConnections(data);
                setError(null);
            } catch (err) {
                setError(err.message);
                console.error("Failed to fetch chat connections:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConnections();
    }, []); // Fetch only once on mount

    // Calculate notification count for the sidebar badge
    const incomingRequestsCount = notifications ? notifications.filter(n => n.type === 'new_request').length : 0;

    return (
        <div className="chats-layout">
            {/* --- Full Sidebar --- */}
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
                                {incomingRequestsCount > 0 && <span className="notification-badge">{incomingRequestsCount}</span>}
                            </Link>
                        </li>
                        <li><Link to="/chats"><FaCommentDots /> Chats</Link></li>
                        <li><Link to="/profile"><FaUser /> Profile</Link></li>
                        <li><Link to="/settings"><FaCog /> Settings</Link></li>
                        <li><Link to="/login"><FaSignOutAlt /> Logout</Link></li>
                    </ul>
                </nav>
                <button onClick={() => setDarkMode(!darkMode)} className={`toggle-btn ${darkMode ? "dark" : "light"}`}>
                    <Sun size={18} /><Moon size={18} />
                    <div className="toggle-circle">{darkMode ? <Moon size={16} /> : <Sun size={16} />}</div>
                </button>
            </aside>
            {/* --- End Sidebar --- */}

            {/* --- Main Chat Area --- */}
            <main className="chats-main">
                {/* --- Connections List (Left Column) --- */}
                <div className="connections-list">
                    <h2>Connections</h2>
                    <div className="connections-scroll-area">
                        {isLoading && <p>Loading connections...</p>}
                        {error && <p className="error-text">Error: {error}</p>}
                        {connections.length > 0 ? (
                            connections.map(conn => (
                                <div
                                    key={conn.request_id}
                                    className={`connection-item ${activeChat?.requestId === conn.request_id ? 'active' : ''}`}
                                    // Set the active chat when a connection is clicked
                                    onClick={() => setActiveChat({ requestId: conn.request_id, otherUser: conn.other_user })}
                                >
                                    <img src="/default-profile.png" alt="" className="conn-avatar" />
                                    <div className="conn-info">
                                        <span className="conn-user">{conn.other_user}</span>
                                        <span className="conn-skill">{conn.skill_title}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            !isLoading && <p className="no-connections">No active chats yet.</p>
                        )}
                    </div>
                </div>
                {/* --- End Connections List --- */}

                {/* --- Chat Window Area (Right Column) --- */}
                <div className="chat-window-area">
                    {activeChat ? (
                        // Render ChatWindow when a chat is active, passing the socketRef
                        <ChatWindow
                            key={activeChat.requestId} // Key forces re-mount when chat changes
                            requestId={activeChat.requestId}
                            otherUser={activeChat.otherUser}
                            onClose={() => setActiveChat(null)} // Optional close functionality
                            socketRef={socketRef} // Pass the ref object
                        />
                    ) : (
                        <div className="no-chat-selected">
                            <FaCommentDots size={50} />
                            <p>Select a connection to start chatting.</p>
                        </div>
                    )}
                </div>
                 {/* --- End Chat Window Area --- */}
            </main>
             {/* --- End Main Chat Area --- */}
        </div>
    );
}
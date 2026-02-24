import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaBook, FaUser, FaCog, FaSignOutAlt, FaTasks, FaBell, FaCommentDots } from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import { respondToRequest, getSentRequests, getIncomingRequests, getNotifications, markNotificationRead } from '../../services/api';
import './Notifications.css';

export default function Notifications({ darkMode, setDarkMode, notifications, setNotifications }) {
  const [acceptedRequests, setAcceptedRequests] = useState({});
  const [sentRequests, setSentRequests] = useState([]);

  // Fetch sent requests on initial load
  useEffect(() => {
    const fetchSent = async () => {
      try {
        const data = await getSentRequests();
        setSentRequests(data);
      } catch (err) {
        console.error("Failed to fetch sent requests:", err);
      }
    };
    fetchSent();
  }, []); // Empty array ensures this runs only once on mount

  // Fetch incoming requests from backend on mount to cover missed websocket notifications
  useEffect(() => {
    const fetchIncoming = async () => {
      try {
        const incoming = await getIncomingRequests();
        if (incoming && incoming.length > 0) {
          // Convert DB request docs into notification objects used by websocket
          const notifObjs = incoming.map(r => ({
            type: 'new_request',
            request_id: r._id,
            from_user: r.from_user,
            to_user: r.to_user,
            skill_title: r.skill_title || r.skill_id,
            skill_id: r.skill_id,
            message: r.message || ''
          }));
          // Merge with existing notifications, avoiding duplicates by request_id
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.request_id));
            const merged = [...prev];
            notifObjs.forEach(n => { if (!existingIds.has(n.request_id)) merged.push(n); });
            return merged;
          });
        }
      } catch (err) {
        console.error('Failed to fetch incoming requests:', err);
      }
    };
    fetchIncoming();
  }, [setNotifications]);

  // Fetch persisted notifications (history/unread) and merge into notifications state
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const notifs = await getNotifications();
        if (notifs && notifs.length > 0) {
          // Convert DB notifications to client format and merge
          const mapped = notifs.map(n => ({
            type: n.type,
            request_id: n.request_id || (n.request_id === undefined ? n.request_id : null),
            notification_id: n._id,
            from_user: n.from_user,
            to_user: n.to_user,
            skill_title: n.skill_title,
            skill_id: n.skill_id,
            message: n.message || '',
            delivered: !!n.delivered,
            read: !!n.read
          }));
          setNotifications(prev => {
            const existingNotifIds = new Set(prev.map(p => p.notification_id || p.request_id));
            const merged = [...prev];
            mapped.forEach(m => { if (!existingNotifIds.has(m.notification_id || m.request_id)) merged.push(m); });
            return merged;
          });
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifs();
  }, [setNotifications]);

  // Update sent requests list based on incoming response notifications
  useEffect(() => {
    const responseNotif = notifications.find(n => n.type === 'request_response');
    if (responseNotif) {
      setSentRequests(prev =>
        prev.map(req =>
          // Use _id for comparison as that's what getSentRequests returns
          req._id && responseNotif.request_id && req._id === responseNotif.request_id
            ? { ...req, status: responseNotif.status } // Update status
            : req
        )
      );
      // Remove the processed response notification from the main list
      setNotifications(prev => prev.filter(n => n.type !== 'request_response'));
    }
  }, [notifications, setNotifications]); // Rerun when notifications change

  // Handle accepting or declining an incoming request
  const handleResponse = async (requestId, action) => {
    if (!requestId) {
        console.error("Cannot respond: Invalid request ID provided.", requestId);
        alert("Error: Could not identify the request to respond to.");
        return;
    }
    try {
      await respondToRequest(requestId, action);
      if (action === 'accepted') {
        // Mark as accepted locally to change button state
        setAcceptedRequests(prev => ({ ...prev, [requestId]: true }));
      } else {
        // If declined, remove immediately
        setNotifications(prev => prev.filter(notif => notif.request_id !== requestId));
      }
    } catch (err) {
      alert("Failed to respond to request: " + err.message);
    }
  };

  // Placeholder for future chat feature
  const handleOpenChat = (requestId, otherUser) => {
    console.log(`Placeholder: Open chat for request ${requestId} with user ${otherUser}`);
    alert("Chat feature coming soon!");
  };

  // Filter notifications to get only incoming requests
  const incomingRequests = notifications.filter(n => n.type === 'new_request');

  // Debug log to check the state
  console.log("Incoming Requests State:", incomingRequests);

  return (
    <div className="notifications-layout">
      {/* --- Full Sidebar --- */}
      <aside className="sidebar">
         <h2 className="logo">SkillSwap </h2>
        <nav>
          <ul>
            <li><Link to="/dashboard"><FaHome /> Home</Link></li>
            <li><Link to="/onboarding"><FaBook /> My Interests & Skills</Link></li>
            <li><Link to="/myskills"><FaTasks /> My Skills</Link></li>
            <li>
              <Link to="/notifications" className="notification-link">
                <FaBell /> Notifications
                {/* Badge shows count of only incoming requests */}
                {incomingRequests && incomingRequests.length > 0 && <span className="notification-badge">{incomingRequests.length}</span>}
              </Link>
            </li>
            <li><Link to="/chats"><FaCommentDots /> Chats</Link></li>
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
      {/* --- End Sidebar --- */}

      <main className="notifications-main">
        <div className="notifications-header"><h1>Notifications</h1></div>

        {/* --- Incoming Requests Section --- */}
        <section className="notification-section">
          <h2>Incoming Requests</h2>
          <div className="notifications-list">
            {incomingRequests.length > 0 ? (
              incomingRequests.map((notif) => {
                // Debug log inside the map
                console.log("Rendering Notification Card for:", notif);
                // Use request_id for the key as it's unique for incoming notifications
                const keyId = notif.request_id || Math.random(); // Fallback key
                return (
                  <div key={keyId} className="notification-card">
                      {/* Delivered/read status */}
                      {notif.delivered === false && <div className="notif-status">(Pending delivery)</div>}
                      {notif.read && <div className="notif-read">(Read)</div>}
                    <div className="notification-icon"><FaBell /></div>
                    <div className="notification-content">
                      <p><strong>{notif.from_user}</strong> wants to connect for skill: <strong>{notif.skill_title}</strong>.</p>
                      {notif.message && <p className="notification-message">"{notif.message}"</p>}
                      <div className="notification-actions">
                        {acceptedRequests[notif.request_id] ? (
                          <button className="chat-btn" onClick={() => handleOpenChat(notif.request_id, notif.from_user)}>
                            <FaCommentDots /> Want to Chat?
                          </button>
                        ) : (
                          <>
                            {/* Ensure notif.request_id is passed */}
                            <button className="primary" onClick={() => handleResponse(notif.request_id, 'accepted')}>Accept</button>
                            <button className="secondary-btn" onClick={() => handleResponse(notif.request_id, 'declined')}>Decline</button>
                            {/* Mark as read button (if persisted) */}
                            {notif.notification_id && !notif.read && (
                              <button className="mark-read" onClick={async () => {
                                try {
                                  await markNotificationRead(notif.notification_id);
                                  // update local notifications state
                                  setNotifications(prev => prev.map(n => (n.notification_id === notif.notification_id ? { ...n, read: true } : n)));
                                } catch (e) { console.error('Mark read failed', e); }
                              }}>Mark read</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : ( <p className="no-notifications">No new incoming requests.</p> )}
          </div>
        </section>
        {/* --- End Incoming Requests Section --- */}

        {/* --- Sent Requests Section --- */}
        <section className="notification-section">
          <h2>My Sent Requests</h2>
          <div className="notifications-list">
            {sentRequests.length > 0 ? (
              sentRequests.map(req => (
                // Use MongoDB's _id for the key here
                <div key={req._id} className="notification-card-sent">
                  <p>Your request for <strong>{req.skill_title}</strong> to <strong>{req.to_user}</strong> is <span className={`status-badge ${req.status}`}>{req.status}</span>.</p>
                </div>
              ))
            ) : ( <p className="no-notifications">You haven't sent any requests yet.</p> )}
          </div>
        </section>
        {/* --- End Sent Requests Section --- */}
      </main>
      {/* No ChatWindow modal needed for now */}
    </div>
  );
}
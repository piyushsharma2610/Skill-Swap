import React, { useEffect, useState, useRef } from 'react';
import { getChatHistory } from '../../services/api'; // Correct path to api.js
import { jwtDecode } from 'jwt-decode';
import './ChatWindow.css'; // Correctly imports its own CSS

// Receives socketRef from the Chats page
export default function ChatWindow({ requestId, otherUser, onClose, socketRef }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState("");
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const messagesEndRef = useRef(null); // Ref to auto-scroll to the bottom

    // Get current user's name from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                setCurrentUser(jwtDecode(token).sub);
            } catch (error) {
                console.error("Invalid token:", error);
                // Handle invalid token, maybe redirect to login
            }
        }
    }, []);

    // Fetch chat history when the component mounts or requestId changes
    useEffect(() => {
        if (!requestId) return; // Don't fetch if no request ID

        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const history = await getChatHistory(requestId);
                setMessages(history);
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [requestId]); // Re-fetch if the selected chat changes

    // Listen for incoming live chat messages via WebSocket using the ref
    useEffect(() => {
        const currentSocket = socketRef?.current; // Safely access current socket
        if (!currentSocket) {
            console.warn("ChatWindow: WebSocket connection not available.");
            return; // Exit if socket isn't ready
        }

        const messageHandler = (event) => {
            try {
                const message = JSON.parse(event.data);
                // Check if the incoming message has a 'from_user' field (indicating chat)
                // and belongs to the currently active chat
                if (message.from_user && message.request_id === requestId) {
                    setMessages(prev => [...prev, message]);
                }
            } catch (e) {
                console.error("Failed to parse incoming chat message:", e);
            }
        };

        console.log("ChatWindow: Adding message listener for request:", requestId);
        currentSocket.addEventListener('message', messageHandler);

        // Cleanup function
        return () => {
            console.log("ChatWindow: Removing message listener for request:", requestId);
            if (currentSocket) { // Check if socket still exists on cleanup
                currentSocket.removeEventListener('message', messageHandler);
            }
        };
    }, [socketRef, requestId]); // Rerun if socketRef or requestId changes

    // Auto-scroll to the bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle sending a new message
    const handleSendMessage = (e) => {
        e.preventDefault();
        const currentSocket = socketRef?.current; // Get the current socket connection from the ref

        // Check message content AND socket status right here
        if (newMessage.trim() === "" || !currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
            console.error("Cannot send message: Empty message or socket not open. Socket:", currentSocket, "State:", currentSocket?.readyState);
            alert("Connection issue: Cannot send message right now. Please ensure you are connected.");
            return;
        }

        const messagePayload = {
            type: "chat_message",
            to: otherUser,
            content: newMessage,
            request_id: requestId
        };

        // Send the message payload
        currentSocket.send(JSON.stringify(messagePayload));

        // Optimistically add the sent message to the UI
        const myMessage = {
            _id: `temp-${Date.now()}`, // Temporary ID for React key
            request_id: requestId,
            from_user: currentUser,
            to_user: otherUser,
            content: newMessage,
            timestamp: new Date().toISOString() // Use ISO string for consistency
        };
        setMessages(prev => [...prev, myMessage]);
        setNewMessage(""); // Clear input
    };

    return (
        // --- Full Chat Window JSX ---
        <div className="chat-window-container"> {/* Added a container class */}
            <div className="chat-header">
                <h3>Chat with {otherUser}</h3>
                {/* Optional: Add a close button if needed, calling onClose */}
                {/* <button onClick={onClose} className="close-btn">&times;</button> */}
            </div>
            <div className="chat-messages">
                {isLoadingHistory ? (
                    <p>Loading history...</p>
                ) : (
                    messages.map((msg, index) => (
                        <div key={msg._id || index} className={`message-bubble ${msg.from_user === currentUser ? 'sent' : 'received'}`}>
                            {msg.content}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} /> {/* Element to scroll to */}
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    aria-label="Chat message input"
                />
                <button type="submit" className="primary">Send</button>
            </form>
        </div>
        // --- End Chat Window JSX ---
    );
}
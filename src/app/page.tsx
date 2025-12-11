"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isSystem?: boolean;
}

let socket: Socket;

export default function Home() {
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize socket connection
    socketInitializer();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const socketInitializer = async () => {
    // We connect to the same server
    socket = io();

    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("update_users", (activeUsers: string[]) => {
      setUsers(activeUsers);
    });

    socket.on("load_history", (history: Message[]) => {
      setMessages(history);
    });

    socket.on("receive_message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("system_message", (msg: any) => {
      // Handle string or object
      const text = typeof msg === 'string' ? msg : msg.text;
      const timestamp = typeof msg === 'object' && msg.timestamp ? msg.timestamp : new Date().toISOString();

      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        text,
        sender: "System",
        timestamp,
        isSystem: true
      }]);
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = () => {
    if (username.trim()) {
      setIsJoined(true);
      socket.emit("join", username);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputValue.trim() && username) {
      socket.emit("send_message", { text: inputValue, sender: username });
      setInputValue("");
    }
  };

  return (
    <main>
      <div className="container">
        {/* Login Screen */}
        <div className={`login-screen ${isJoined ? "hidden" : ""}`}>
          <h1 className="login-title">MiniChat</h1>
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter your username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button onClick={handleJoin}>Join Chat</button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Sidebar */}
          <div className="sidebar">
            <div className="sidebar-header">
              <h2>Online Users ({users.length})</h2>
            </div>
            <div className="user-list">
              {users.map((user, idx) => (
                <div key={idx} className={`user-item ${user === username ? 'me' : ''}`}>
                  <div className="user-avatar">{user.charAt(0).toUpperCase()}</div>
                  <div className="user-name">
                    {user} {user === username && "(You)"}
                  </div>
                  <div className="user-status"></div>
                </div>
              ))}
              {users.length === 0 && <div className="no-users">Waiting for others...</div>}
            </div>
          </div>

          {/* Chat Room */}
          <div className="chat-room">
            <div className="chat-header">
              <div className="chat-title">Global Room</div>
              <div className="status-indicator" title="Online"></div>
            </div>

            <div className="messages-area">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.isSystem ? "system" : msg.sender === username ? "self" : "other"
                    }`}
                >
                  {!msg.isSystem && msg.sender !== username && (
                    <div className="message-sender">{msg.sender}</div>
                  )}
                  <div className="message-content">{msg.text}</div>
                  {!msg.isSystem && (
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button type="submit" className="send-btn">
                ➤
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

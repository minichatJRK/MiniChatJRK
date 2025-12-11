const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory message storage (reset when server restarts)
let messages = [];
const MAX_HISTORY = 100;

// JSONBin Config
// Note: Using keys provided by user. For production, please use environment variables.
const BIN_ID = process.env.JSONBIN_BIN_ID || "693a1e6c43b1c97be9e5a4f5";
const API_KEY = process.env.JSONBIN_API_KEY || "$2a$10$bsyh01U9/tssWDUyUoBwDuzrhjfiSbWBGg6ttDxKYgGbv5exHjrNK";

// Helper: Load from Cloud
async function loadHistory() {
    if (!BIN_ID || !API_KEY) {
        console.log("⚠️ JSONBin keys not found. Using in-memory only.");
        return;
    }
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Master-Key': API_KEY }
        });
        if (res.ok) {
            const data = await res.json();
            // JSONBin returns data wrapped in "record" object
            messages = Array.isArray(data.record) ? data.record : [];
            console.log(`✅ Loaded ${messages.length} messages from JSONBin.`);
        } else {
            console.error("❌ Failed to load from JSONBin:", res.statusText);
        }
    } catch (err) {
        console.error("❌ Error loading history:", err.message);
    }
}

// Helper: Save to Cloud (Fire & Forget)
async function saveHistory() {
    if (!BIN_ID || !API_KEY) return;

    // Simple fire-and-forget save
    fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY
        },
        body: JSON.stringify(messages)
    }).catch(err => console.error("Error saving to JSONBin:", err.message));
}

app.prepare().then(async () => {
    // Load history before starting server
    await loadHistory();

    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(httpServer, {
        // Optional: setup CORS if needed for external hosting context
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        // User List Management
        const onlineUsers = new Set();

        // Helper to broadcast users
        const broadcastUsers = () => {
            const users = [];
            io.sockets.sockets.forEach((s) => {
                if (s.data.username) users.push(s.data.username);
            });
            // Remove duplicates if any
            io.emit("update_users", [...new Set(users)]);
        };

        socket.on("join", (username) => {
            socket.data.username = username;

            // Broadcast new user list
            broadcastUsers();

            // Send existing history to the new user
            socket.emit("load_history", messages);

            // Announce user joined
            const joinMsg = {
                id: Date.now().toString(),
                text: `${username} joined the chat`,
                sender: "System",
                timestamp: new Date().toISOString(),
                isSystem: true
            };

            // Store locally
            messages.push(joinMsg);
            if (messages.length > MAX_HISTORY) messages.shift();

            saveHistory(); // Async save

            io.emit("system_message", joinMsg);
        });

        socket.on("send_message", (data) => {
            const messagePayload = {
                id: Date.now().toString(),
                text: data.text,
                sender: data.sender,
                timestamp: new Date().toISOString(),
                isSystem: false
            };

            // Store locally
            messages.push(messagePayload);
            if (messages.length > MAX_HISTORY) messages.shift();

            saveHistory(); // Async save

            io.emit("receive_message", messagePayload);
        });

        socket.on("disconnect", () => {
            if (socket.data.username) {
                const leaveMsg = {
                    id: Date.now().toString(),
                    text: `${socket.data.username} left the chat`,
                    sender: "System",
                    timestamp: new Date().toISOString(),
                    isSystem: true
                };

                // Store locally
                messages.push(leaveMsg);
                if (messages.length > MAX_HISTORY) messages.shift();

                io.emit("system_message", leaveMsg);

                // Update user list
                broadcastUsers();

                saveHistory(); // Async save
            }
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});

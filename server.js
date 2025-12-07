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
const messages = [];
const MAX_HISTORY = 100;

app.prepare().then(() => {
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
        console.log("Client connected:", socket.id);

        socket.on("join", (username) => {
            socket.data.username = username;

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
            }
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});

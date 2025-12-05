require('dotenv').config();
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// MongoDB Connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://minichat:minichat@minichat.pcqcyju.mongodb.net/?appName=MiniChat';

// Mongoose Schema
const messageSchema = new mongoose.Schema({
    text: String,
    sender: String,
    timestamp: { type: Date, default: Date.now },
    isSystem: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', messageSchema);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }

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

    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("join", async (username) => {
            socket.data.username = username;

            // Load chat history (last 50 messages)
            try {
                const messages = await Message.find()
                    .sort({ timestamp: -1 })
                    .limit(50)
                    .lean();

                // Send history to the user who just joined (reverse to show oldest first)
                const history = messages.reverse().map(msg => ({
                    id: msg._id.toString(),
                    text: msg.text,
                    sender: msg.sender,
                    timestamp: msg.timestamp.toISOString(),
                    isSystem: msg.isSystem
                }));

                socket.emit("load_history", history);

                // Announce user joined
                const joinMsg = new Message({
                    text: `${username} joined the chat`,
                    sender: "System",
                    isSystem: true
                });
                await joinMsg.save();

                io.emit("system_message", {
                    text: joinMsg.text,
                    timestamp: joinMsg.timestamp.toISOString()
                });

            } catch (err) {
                console.error("Error loading history:", err);
            }
        });

        socket.on("send_message", async (data) => {
            const messagePayload = {
                id: Date.now().toString(), // Temporary ID
                text: data.text,
                sender: data.sender,
                timestamp: new Date().toISOString(),
                isSystem: false
            };

            try {
                const newMessage = new Message({
                    text: data.text,
                    sender: data.sender,
                    isSystem: false
                });

                const savedMessage = await newMessage.save();
                // Update ID with actual DB ID if successful
                messagePayload.id = savedMessage._id.toString();
            } catch (err) {
                console.error("Error saving message to DB (sending to client anyway):", err.message);
            }

            // Emit to everyone regardless of DB status
            io.emit("receive_message", messagePayload);
        });

        socket.on("disconnect", async () => {
            if (socket.data.username) {
                const leaveMsg = new Message({
                    text: `${socket.data.username} left the chat`,
                    sender: "System",
                    isSystem: true
                });
                await leaveMsg.save();

                io.emit("system_message", {
                    text: leaveMsg.text,
                    timestamp: leaveMsg.timestamp.toISOString()
                });
            }
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});

// Import Dependencies
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const { nanoid } = require('nanoid');

// Initialize Sequelize
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './chat_app.sqlite'
});

// Secret and Port Configuration (Hardcoded)
const JWT_SECRET = 'your_secure_jwt_secret'; // Replace with your actual secret
const PORT = 3000; // Replace with your desired port

// Initialize Express App
const app = express();

// Configure CORS for Express
app.use(cors({
    origin: 'http://localhost:5173', // Replace with your client origin
    methods: ['GET', 'POST'],
    credentials: true
}));

// Create HTTP Server
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Replace with your client origin
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware
app.use(express.json());

// Define User Model
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    uniqueCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    timestamps: false
});

// Unique Code Generator Using nanoid
const generateUnique = async () => {
    let unique = nanoid(8); // 8-character unique ID
    let user = await User.findOne({ where: { uniqueCode: unique } });
    while (user) {
        unique = nanoid(8);
        user = await User.findOne({ where: { uniqueCode: unique } });
    }
    return unique;
};

// Sync Database
sequelize.sync()
    .then(() => console.log('SQLite database connected'))
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

// Registration Endpoint
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const uniqueCode = name + '-' + await generateUnique();
        const newUser = await User.create({ name, email, password: hashedPassword, uniqueCode });

        return res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
});

// Login Endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Socket.io Connection Handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('private message', ({ content, to }) => {
        console.log(`Private message from ${socket.id} to user ${to}: ${content}`);

        // Emit the message to the recipient's socket
        io.to(to).emit('private message', { content, from: socket.id });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Search user by uniqueCode
app.get('/user', async (req, res) => {
    const { uniqueCode } = req.query;

    if (!uniqueCode) {
        return res.status(400).json({ message: 'Unique code is required' });
    }

    try {
        const user = await User.findOne({
            where: { uniqueCode },
            attributes: ['id', 'name', 'email', 'uniqueCode']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
});

// Start Server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

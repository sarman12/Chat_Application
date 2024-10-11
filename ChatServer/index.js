// Import necessary modules
const express = require('express');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io server with CORS settings
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './chat_app.sqlite',
});

// Constants
const PORT = 3000;

// Middleware setup
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true, // Ensures the email format is valid
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, { timestamps: false });

// Message model
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  room: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sender: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, { timestamps: true });

// Sync database
sequelize.sync()
  .then(() => console.log('SQLite database connected'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Utility function to create consistent room names
const createRoomName = (email1, email2) => {
  return [email1, email2].sort().join('-');
};

// Registration route
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Basic input validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({ name, email, password: hashedPassword });

    // Respond with success
    return res.status(201).json({ 
      message: 'User registered successfully', 
      user: { id: newUser.id, name: newUser.name, email: newUser.email } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic input validation
  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });

    // If user not found
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Respond with user info (no token)
    return res.status(200).json({ 
      message: 'Login successful', 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by email
app.get('/user', async (req, res) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Exclude password from the response
    const { password, ...userData } = user.toJSON();
    return res.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`A user connected: Socket ID = ${socket.id}`);

  // Handle room joining
  socket.on('join-room', ({ senderEmail, recipientEmail }) => {
    if (!senderEmail || !recipientEmail) {
      socket.emit('error', 'Both sender and recipient emails are required to join a room');
      return;
    }

    // Create a consistent room name based on user emails
    const room = createRoomName(senderEmail, recipientEmail);

    // Join the room
    socket.join(room);
    console.log(`User ${senderEmail} joined room: ${room}`);

    // Optionally, notify others in the room
    socket.to(room).emit('user-joined', { user: senderEmail });
  });

  // Handle private messages
socket.on('private-message', async ({ room, message, senderEmail, recipientEmail }) => {
  // Input validation
  if (!room || !message || !senderEmail || !recipientEmail) {
    socket.emit('error', 'Room, message, senderEmail, and recipientEmail are required');
    return;
  }

  try {
    // Validate that both users exist
    const senderUser = await User.findOne({ where: { email: senderEmail } });
    const recipientUser = await User.findOne({ where: { email: recipientEmail } });

    if (!senderUser || !recipientUser) {
      socket.emit('error', 'Sender or recipient user not found');
      return;
    }

    // Save the message to the database
    const newMessage = await Message.create({ 
      room, 
      sender: senderEmail, 
      text: message 
    });

    console.log(`Message from ${senderEmail} to ${recipientEmail} in room ${room}: ${message}`);

    // Emit the message to the room (send to all users in the room)
    io.to(room).emit('receive-message', { 
      room, 
      message: newMessage.text, 
      sender: newMessage.sender,
      createdAt: newMessage.createdAt
    });
  } catch (error) {
    console.error('Error handling private-message:', error);
    socket.emit('error', 'An error occurred while sending the message');
  }
});


  socket.on('fetch-messages', async ({ senderEmail, recipientEmail }) => {
  if (!senderEmail || !recipientEmail) {
    socket.emit('error', 'Both sender and recipient emails are required to fetch messages');
    return;
  }

  try {
    const room = createRoomName(senderEmail, recipientEmail);
    const messages = await Message.findAll({
      where: { room },
      order: [['createdAt', 'ASC']],
    });
    socket.emit('message-history', { room, messages });
  } catch (error) {
    console.error('Error fetching message history:', error);
    socket.emit('error', 'An error occurred while fetching messages');
  }
});

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`A user disconnected: Socket ID = ${socket.id}`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

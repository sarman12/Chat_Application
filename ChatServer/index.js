// Import necessary modules
const express = require('express');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './chat_app.sqlite',
});

const PORT = 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

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
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, { timestamps: false });

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

sequelize.sync()
  .then(() => console.log('SQLite database connected'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

const createRoomName = (email1, email2) => {
  return [email1, email2].sort().join('-');
};

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
    const newUser = await User.create({ name, email, password: hashedPassword });

    return res.status(201).json({ 
      message: 'User registered successfully', 
      user: { id: newUser.id, name: newUser.name, email: newUser.email } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.status(200).json({ 
      message: 'Login successful', 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/user', async (req, res) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { password, ...userData } = user.toJSON();
    return res.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});


app.post('/contacts', async (req, res) => {
  const { userId, contactEmail } = req.body;

  if (!userId || !contactEmail) {
    return res.status(400).json({ message: 'User ID and contact email are required.' });
  }

  try {
    const contactUser = await User.findOne({ where: { email: contactEmail } });
    if (!contactUser) {
      return res.status(404).json({ message: 'Contact not found.' });
    }
    res.status(201).json({ message: 'Contact added successfully.' });
  } catch (error) {
    console.error('Error adding contact:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/contacts/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const contacts = await User.findAll({ 
      where: { id: { [Sequelize.Op.ne]: userId } } 
    });
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});






io.on('connection', (socket) => {
  console.log(`A user connected: Socket ID = ${socket.id}`);

  socket.on('join-room', ({ senderEmail, recipientEmail }) => {
    if (!senderEmail || !recipientEmail) {
      socket.emit('error', 'Both sender and recipient emails are required to join a room');
      return;
    }

    const room = createRoomName(senderEmail, recipientEmail);
    socket.join(room);
    console.log(`User ${senderEmail} joined room: ${room}`);
    socket.to(room).emit('user-joined', { user: senderEmail });
  });

  socket.on('private-message', async ({ room, message, senderEmail, recipientEmail }) => {
    if (!room || !message || !senderEmail || !recipientEmail) {
      socket.emit('error', 'Room, message, senderEmail, and recipientEmail are required');
      return;
    }

    try {
      const senderUser = await User.findOne({ where: { email: senderEmail } });
      const recipientUser = await User.findOne({ where: { email: recipientEmail } });

      if (!senderUser || !recipientUser) {
        socket.emit('error', 'Sender or recipient user not found');
        return;
      }

      const newMessage = await Message.create({ 
        room, 
        sender: senderEmail, 
        text: message 
      });

      console.log(`Message from ${senderEmail} to ${recipientEmail} in room ${room}: ${message}`);

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

  socket.on('disconnect', () => {
    console.log(`A user disconnected: Socket ID = ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

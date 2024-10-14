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
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
});

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './chat_app.sqlite',
});

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  addedPerson: { type: DataTypes.JSON, defaultValue: [] },
}, { timestamps: false });

const Message = sequelize.define('Message', {
  room: DataTypes.STRING,
  sender: DataTypes.STRING,
  text: DataTypes.TEXT,
}, { timestamps: true });

sequelize.sync({ alter: false }).catch(err => {
  console.error(err);
  process.exit(1);
});

const createRoomName = (email1, email2) => [email1, email2].sort().join('-');

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true,
}));
app.use(express.json());

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required' });
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'All fields are required' });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid credentials' });
    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/user', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email required' });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/user/add-contact', async (req, res) => {
  const { userId, contactEmail } = req.body;
  if (!userId || !contactEmail) return res.status(400).json({ message: 'Missing fields' });
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.addedPerson.includes(contactEmail)) return res.status(400).json({ message: 'Contact already added' });
    const contactUser = await User.findOne({ where: { email: contactEmail } });
    if (!contactUser) return res.status(404).json({ message: 'Contact not found' });
    user.addedPerson = [...user.addedPerson, contactEmail];
    await user.save();
    res.status(200).json({ message: 'Contact added', addedPerson: user.addedPerson });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

io.on('connection', (socket) => {
  socket.on('join-room', ({ senderEmail, recipientEmail }) => {
    const room = createRoomName(senderEmail, recipientEmail);
    socket.join(room);
    socket.to(room).emit('user-joined', { user: senderEmail });
  });

  socket.on('private-message', async ({ room, message, senderEmail, recipientEmail }) => {
    try {
      await Message.create({ room, sender: senderEmail, text: message });
      io.to(room).emit('receive-message', { room, message, sender: senderEmail });
    } catch (error) {
      socket.emit('error', 'Message error');
    }
  });

  socket.on('fetch-messages', async ({ senderEmail, recipientEmail }) => {
    try {
      const room = createRoomName(senderEmail, recipientEmail);
      const messages = await Message.findAll({ where: { room }, order: [['createdAt', 'ASC']] });
      socket.emit('message-history', { room, messages });
    } catch (error) {
      socket.emit('error', 'Message fetch error');
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

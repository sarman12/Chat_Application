require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Sequelize, DataTypes, Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const PORT = process.env.PORT || 3000;

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.SQLITE_FILE || './chat_app.sqlite',
  logging: false,
});

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
}, {
  timestamps: true,
});

const Contact = sequelize.define('Contact', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  contactId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['contactId'] },
    { fields: ['userId', 'contactId'], unique: true },
  ],
});

const Message = sequelize.define('Message', {
  room: { type: DataTypes.STRING, allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  senderEmail: { type: DataTypes.STRING, allowNull: false },
  recipientId: { type: DataTypes.INTEGER, allowNull: false },
  recipientEmail: { type: DataTypes.STRING, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
}, {
  timestamps: true,
  indexes: [
    { fields: ['room'] },
    { fields: ['senderId'] },
    { fields: ['recipientId'] },
  ],
});

User.belongsToMany(User, {
  through: Contact,
  as: 'Contacts',
  foreignKey: 'userId',
  otherKey: 'contactId'
});

User.belongsToMany(User, {
  through: Contact,
  as: 'ContactOf',
  foreignKey: 'contactId',
  otherKey: 'userId'
});

Contact.belongsTo(User, { foreignKey: 'contactId', as: 'ContactUser' });
Contact.belongsTo(User, { foreignKey: 'userId', as: 'OwnerUser' });

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Database & tables ready.');
  } catch (err) {
    console.error('DB error:', err);
    process.exit(1);
  }
})();

const app = express();
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

function normalizeEmail(e) { return String(e || '').trim().toLowerCase(); }
function createRoomName(emailA, emailB) {
  return [normalizeEmail(emailA), normalizeEmail(emailB)].sort().join('__');
}
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
async function getSafeUser(userInstance) {
  if (!userInstance) return null;
  const u = userInstance.toJSON();
  delete u.password;
  return u;
}

async function authenticateRest(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }
    const normalized = normalizeEmail(email);
    const exists = await User.findOne({ where: { email: normalized }});
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: normalized, password: hashed });
    const safeUser = await getSafeUser(user);
    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.status(201).json({ message: 'Registered', user: safeUser, token });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'All fields required' });
    const normalized = normalizeEmail(email);
    const user = await User.findOne({ where: { email: normalized }});
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const safeUser = await getSafeUser(user);
    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({ message: 'Login successful', user: safeUser, token });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/me', authenticateRest, async (req, res) => {
  try {
    const user = await User.findByPk(req.auth.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(await getSafeUser(user));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/user/search', authenticateRest, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email query parameter required' });

    const user = await User.findOne({
      where: { email: normalizeEmail(email) },
      attributes: ['id', 'name', 'email']
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('user search error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/contacts', authenticateRest, async (req, res) => {
  try {
    const { contactEmail } = req.body;
    if (!contactEmail) return res.status(400).json({ message: 'contactEmail required' });

    const owner = await User.findByPk(req.auth.id);
    if (!owner) return res.status(404).json({ message: 'User not found' });

    const normalized = normalizeEmail(contactEmail);
    const contactUser = await User.findOne({ where: { email: normalized }});
    if (!contactUser) return res.status(404).json({ message: 'Contact user not found' });

    if (contactUser.id === owner.id) {
      return res.status(400).json({ message: 'Cannot add yourself' });
    }

    const existing = await Contact.findOne({
      where: { userId: owner.id, contactId: contactUser.id }
    });
    if (existing) return res.status(400).json({ message: 'Contact already added' });

    await Contact.create({ userId: owner.id, contactId: contactUser.id });

    res.json({
      message: 'Contact added',
      contact: {
        id: contactUser.id,
        name: contactUser.name,
        email: contactUser.email
      }
    });
  } catch (err) {
    console.error('add contact', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/contacts', authenticateRest, async (req, res) => {
  try {
    const userId = req.auth.id;
    const contacts = await Contact.findAll({
      where: { userId },
      include: [{
        model: User,
        as: 'ContactUser',
        attributes: ['id', 'name', 'email'],
        required: true
      }]
    });
    const result = contacts.map(c => ({
      id: c.ContactUser.id,
      name: c.ContactUser.name,
      email: c.ContactUser.email
    }));
    res.json({ contacts: result });
  } catch (err) {
    console.error('get contacts', err);
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/api/messages', authenticateRest, async (req, res) => {
  try {
    const { otherEmail, limit = 50, before } = req.query;
    if (!otherEmail) return res.status(400).json({ message: 'otherEmail required' });

    const room = createRoomName(req.auth.email, otherEmail);
    const messagesQuery = {
      where: { room },
      order: [['createdAt', 'DESC']],
      limit: Math.min(200, Number(limit)),
    };
    if (before) messagesQuery.where.createdAt = { [Op.lt]: new Date(before) };

    const messages = await Message.findAll(messagesQuery);
    res.json({ room, messages: messages.reverse() });
  } catch (err) {
    console.error('fetch messages rest', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const socketUserMap = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: token required'));
    const payload = jwt.verify(token, JWT_SECRET);
    socket.authUser = payload;
    return next();
  } catch (err) {
    return next(new Error('Authentication error: invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.authUser;
  socketUserMap.set(socket.id, user.id);
  console.log(`Socket connected: ${socket.id} user:${user.email}`);

  socket.on('join-room', async ({ otherEmail }) => {
    try {
      const normalizedOther = normalizeEmail(otherEmail);
      const room = createRoomName(user.email, normalizedOther);

      // Check both users exist
      const otherUser = await User.findOne({ where: { email: normalizedOther }});
      if (!otherUser)
        return socket.emit('error', 'Other user not found');

      socket.join(room);
      socket.to(room).emit('user-joined', { email: user.email });
      socket.emit('joined', { room });
    } catch (err) {
      console.error('join-room error', err);
      socket.emit('error', 'join-room failed');
    }
  });

  socket.on('private-message', async ({ otherEmail, text }) => {
    try {
      if (!text || !otherEmail) return socket.emit('error', 'Invalid payload');

      const normalizedOther = normalizeEmail(otherEmail);
      const room = createRoomName(user.email, normalizedOther);

      const recipient = await User.findOne({ where: { email: normalizedOther }});
      if (!recipient) return socket.emit('error', 'Recipient not found');

      const messageRow = await Message.create({
        room,
        senderId: user.id,
        senderEmail: user.email,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        text,
      });

      io.to(room).emit('receive-message', {
        id: messageRow.id,
        room,
        senderEmail: user.email,
        recipientEmail: recipient.email,
        text,
        createdAt: messageRow.createdAt,
      });
    } catch (err) {
      console.error('private-message error', err);
      socket.emit('error', 'message failed');
    }
  });

  socket.on('fetch-messages', async ({ otherEmail, limit = 100 }) => {
    try {
      const normalizedOther = normalizeEmail(otherEmail);
      const room = createRoomName(user.email, normalizedOther);

      const messages = await Message.findAll({
        where: { room },
        order: [['createdAt', 'ASC']],
        limit: Math.min(1000, Number(limit)),
      });

      socket.emit('message-history', { room, messages });
    } catch (err) {
      console.error('fetch-messages socket', err);
      socket.emit('error', 'fetch messages failed');
    }
  });

  socket.on('disconnect', (reason) => {
    socketUserMap.delete(socket.id);
    console.log(`Socket disconnected ${socket.id} reason=${reason}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

import { useEffect, useState } from 'react';
import './Chat.css';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

// Initialize socket connection
const socket = io('http://localhost:3000');

interface Message {
  text: string;
  sender: 'left' | 'right';
}

interface User {
  id: number;
  name: string;
  email: string;
}

function Chat() {
  const location = useLocation();
  const user: User = location.state?.user;

  const [message, setMessage] = useState<string>('');
  const [arrayMessage, setArrayMessage] = useState<Message[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [addedUsers, setAddedUsers] = useState<User[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>('');

  const navigate = useNavigate();

  // Add logs to see if messages are received
  useEffect(() => {
    // Listen for new messages
    socket.on('receive-message', (data) => {
      const { room, message, sender } = data;
      console.log('Received message:', message, 'from', sender);

      // Auto-switch to the new room if it's different from the current one
      if (room !== activeRoom) {
        setActiveRoom(room);
        setRecipientEmail(sender);

        // Join the new room
        socket.emit('join-room', { senderEmail: user.email, recipientEmail: sender });

        // Fetch messages for the new room
        socket.emit('fetch-messages', { senderEmail: user.email, recipientEmail: sender });
      }

      // Update message list, avoid adding your own message twice
      if (sender !== user.email) {
        setArrayMessage((prevMessages) => [
          ...prevMessages,
          { text: message, sender: 'left' }, // Always 'left' if it is from another user
        ]);
      }
    });

    // Clean up socket event listener when the component unmounts
    return () => {
      socket.off('receive-message');
    };
  }, [activeRoom, user?.email]); // Ensure user email exists

  const handleSendMessage = () => {
    if (message.trim() !== '' && activeRoom && recipientEmail) {
      // Log the message before sending
      console.log('Sending message:', message, 'to', recipientEmail);

      // Add the message locally
      setArrayMessage((prevMessages) => [
        ...prevMessages,
        { text: message, sender: 'right' }, // 'right' denotes current user’s message
      ]);

      // Emit the message to the server
      socket.emit('private-message', {
        room: activeRoom,
        message,
        senderEmail: user.email,
        recipientEmail,
      });

      setMessage(''); // Clear the input
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleSelectUser = async (email: string) => {
    const room = `${[user.email, email].sort().join('-')}`;
    setActiveRoom(room);
    setRecipientEmail(email);

    // Join the room
    socket.emit('join-room', { senderEmail: user.email, recipientEmail: email });

    // Fetch existing messages for the room
    socket.emit('fetch-messages', { senderEmail: user.email, recipientEmail: email });
  };

  const handleSearchUser = async () => {
    if (searchEmail.trim() !== '') {
      try {
        const response = await axios.get(`http://localhost:3000/user?email=${searchEmail}`);
        if (response.data) {
          setSearchedUser(response.data);
        } else {
          setSearchedUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setSearchedUser(null);
      }
    }
  };

  const handleAddUser = () => {
    if (searchedUser && !addedUsers.some((user) => user.email === searchedUser.email)) {
      setAddedUsers((prevUsers) => [...prevUsers, searchedUser]);
      setSearchedUser(null);
      setSearchEmail('');
    }
  };

  useEffect(() => {
    if (activeRoom) {
      socket.on('message-history', (data) => {
        if (data.room === activeRoom) {
          setArrayMessage(data.messages.map((msg: any) => ({
            text: msg.text,
            sender: msg.sender === user.email ? 'right' : 'left',
          })));
        }
      });

      return () => {
        socket.off('message-history');
      };
    }
  }, [activeRoom, user.email]);

  return (
    <div className="chat-container">
      <div className="search-div">
        <input
          type="text"
          className="search-input"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          placeholder="Search by Email"
        />
        <button onClick={handleSearchUser}>Search</button>
      </div>
      {searchedUser && (
        <div className="searched-user">
          <p>Name: {searchedUser.name}</p>
          <button onClick={handleAddUser}>Add User</button>
        </div>
      )}
      <div className="heading">
        <h1>{user.name}'s Inbox</h1>
        <div className="profile-img" onClick={toggleDetails}>
          <img src="https://via.placeholder.com/100" alt="Profile" />
        </div>
      </div>
      <div className="chat-content">
        {showDetails && (
          <div className="user-details">
            <p>Name: {user.name}</p>
            <p>Email: {user.email}</p>
          </div>
        )}
        <div className="added-users">
          {addedUsers.map((addedUser, index) => (
            <div key={index} className="added-user" onClick={() => handleSelectUser(addedUser.email)}>
              <p>{addedUser.name}</p>
            </div>
          ))}
        </div>
        <div className="message-container">
          {arrayMessage.map((msg, index) => (
            <div key={index} className="message">
              <p className={`${msg.sender === 'left' ? 'left' : 'right'}`}>
                {msg.text}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="input-section">
        <input
          type="text"
          className="form-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}

export default Chat;

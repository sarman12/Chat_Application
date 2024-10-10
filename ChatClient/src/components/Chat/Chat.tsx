import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './Chat.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Message {
  text: string;
  sender: 'left' | 'right';
}

interface PrivateMessage {
  content: string;
  from: number; // userId of sender
}

interface User {
  id: number;
  name: string;
  email: string;
  uniqueCode: string;
}

function Chat() {
  const [message, setMessage] = useState<string>('');
  const [arrayMessage, setArrayMessage] = useState<Message[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [recipientUniqueCode, setRecipientUniqueCode] = useState<string>('');
  const [recipient, setRecipient] = useState<User | null>(null); // Selected recipient
  const [contacts, setContacts] = useState<User[]>([]); // List of contacts

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login if no token
      navigate('/login');
      return;
    }

    const newSocket = io('http://localhost:3000', {
      auth: {
        token: token,
      },
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
    });

    newSocket.on('private message', (msg: PrivateMessage) => {
      if (recipient && msg.from === recipient.id) {
        console.log('Private message received:', msg);
        setArrayMessage((prevMessages) => [
          ...prevMessages,
          { text: msg.content, sender: 'left' },
        ]);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Cleanup on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, [navigate, recipient]);

  const handleSendMessage = () => {
    if (message.trim() !== '' && recipient && socket) {
      // Send the message to the server with recipient's userId
      socket.emit('private message', {
        content: message,
        to: recipient.id,
      });

      // Add the message to the current user's chat (sender: 'right')
      setArrayMessage([...arrayMessage, { text: message, sender: 'right' }]);
      setMessage('');
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
  };

  const handleSearchUser = async () => {
    if (recipientUniqueCode.trim() === '') {
      alert('Please enter a unique code to search.');
      return;
    }

    try {
      const response = await axios.get('http://localhost:3000/user', {
        params: { uniqueCode: recipientUniqueCode },
      });

      if (response.data) {
        const foundUser: User = response.data;

        // Check if the user is already in the contact list
        const alreadyAdded = contacts.some(
          (contact) => contact.id === foundUser.id
        );

        if (!alreadyAdded) {
          setContacts([...contacts, foundUser]); // Add the found user to contacts
        }

        setRecipient(foundUser); // Set the recipient to the found user
        setArrayMessage([]); // Clear previous messages
      }
    } catch (error: any) {
      console.error('Error fetching user:', error);
      alert(error.response?.data?.message || 'User not found.');
    }
  };

  const handleSelectContact = (contact: User) => {
    setRecipient(contact);
    setArrayMessage([]); // Clear messages when switching to a new chat
  };

  return (
    <div className="chat-container">
      <div className={`search-div ${showSearch ? 'active' : ''}`}>
        <input
          type="text"
          placeholder="Enter Recipient's Unique Code"
          value={recipientUniqueCode}
          onChange={(e) => setRecipientUniqueCode(e.target.value)}
        />
        <button onClick={handleSearchUser}>Search</button>
      </div>

      <div className="heading">
        <button className="add-btn" onClick={toggleSearch}>+</button>
        <h1>Chat</h1>
        <div className="profile-img" onClick={toggleDetails}>
          <img src="https://via.placeholder.com/100" alt="Profile" />
        </div>
      </div>

      {showDetails && recipient && (
        <div className="user-details">
          <p>Name: {recipient.name}</p>
          <p>Email: {recipient.email}</p>
          <p>Unique Code: {recipient.uniqueCode}</p>
        </div>
      )}

      <div className="chat-content">
        <div className="contact-list">
          <ul>
            {contacts.map((contact) => (
              <li
                key={contact.id}
                onClick={() => handleSelectContact(contact)}
                className={`contact-item ${
                  recipient?.id === contact.id ? 'active' : ''
                }`}
              >
                {contact.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="chat-section">
          <div className="message-container">
            {arrayMessage.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>

          <div className="input-section">
            <input
              className="form-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
            />
            <button className="btn" onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;

import { useEffect, useState } from 'react';
import './Chat.css';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

interface Message {
  text: string;
  sender: 'left' | 'right';
}

interface User {
  id: number;
  name: string;
  email: string;
  uniqueCode: string;
}

function Chat() {
  const location = useLocation();
  const user = location.state?.user;

  const [message, setMessage] = useState<string>('');
  const [arrayMessage, setArrayMessage] = useState<Message[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [searchId, setSearchId] = useState<string>('');
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [addedUsers, setAddedUsers] = useState<User[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }

    socket.on('receive-message', (data) => {
      if (data.room === activeRoom) {
        setArrayMessage((prevMessages) => [
          ...prevMessages,
          { text: data.message, sender: 'left' },
        ]);
      }
    });

    return () => {
      socket.off('receive-message');
    };
  }, [activeRoom, navigate]);

  const handleSendMessage = () => {
    if (message.trim() !== '' && activeRoom) {
      setArrayMessage((prevMessages) => [
        ...prevMessages,
        { text: message, sender: 'right' },
      ]);

      socket.emit('private-message', { room: activeRoom, message });
      setMessage('');
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleSelectUser = (uniqueCode: string) => {
    const room = `${[user.uniqueCode, uniqueCode].sort().join('-')}`;
    setActiveRoom(room);
    socket.emit('join-room', { room });
  };

  const handleSearchUser = async () => {
    if (searchId.trim() !== '') {
      try {
        const response = await axios.get(`http://localhost:3000/user?uniqueCode=${searchId}`);
        if (response.data) {
          setSearchedUser(response.data);
        } else {
          setSearchedUser(null); // If no user found, set to null
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setSearchedUser(null);
      }
    }
  };

  const handleAddUser = () => {
    if (searchedUser && !addedUsers.some(user => user.uniqueCode === searchedUser.uniqueCode)) {
      setAddedUsers((prevUsers) => [...prevUsers, searchedUser]);
      setSearchedUser(null);
      setSearchId('');
    }
  };

  return (
    <div className="chat-container">
      <div className="search-div">
        <input
          type="text"
          className="search-input"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Search by Unique ID"
        />
        <button onClick={handleSearchUser}>
          Search
        </button>
      </div>
      {searchedUser && (
        <div className="searched-user">
          <p>Name: {searchedUser.name}</p>
          <button onClick={handleAddUser}>
            Add User
          </button>
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
            <p>Your Unique ID: {user.uniqueCode}</p>
          </div>
        )}
        <div className="added-users">
          {addedUsers.map((addedUser, index) => (
            <div key={index} className="added-user" onClick={() => handleSelectUser(addedUser.uniqueCode)}>
              <p>{addedUser.name}</p>
            </div>
          ))}
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
              placeholder="Enter a message"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
            />
            <button className="btn" onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;

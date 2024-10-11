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
}

function Chat() {
  const location = useLocation();
  const user = location.state?.user;

  const [message, setMessage] = useState<string>('');
  const [arrayMessage, setArrayMessage] = useState<Message[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [searchEmail, setSearchEmail] = useState<string>('');
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

  const handleSelectUser = (email: string) => {
    const room = `${[user.email, email].sort().join('-')}`;
    setActiveRoom(room);
    socket.emit('join-room', { room });
    
    // Clear previous messages when switching rooms
    setArrayMessage([]);
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
    if (searchedUser && !addedUsers.some(user => user.email === searchedUser.email)) {
      setAddedUsers((prevUsers) => [...prevUsers, searchedUser]);
      setSearchedUser(null);
      setSearchEmail('');
    }
  };

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

import { useEffect, useState } from 'react';
import './Chat.css';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

interface Message {
  text: string;
  sender: 'left' | 'right';
  time: string; 
}

interface User {
  id: number;
  name: string;
  email: string;
}

function Chat() {
  const location = useLocation();
  const user: User = location.state?.user;
  const navigate = useNavigate();

  const [message, setMessage] = useState<string>('');
  const [arrayMessage, setArrayMessage] = useState<Message[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [addedUsers, setAddedUsers] = useState<User[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [activeUserEmail, setActiveUserEmail] = useState<string>(''); 
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLoading(false); 
      try {
        const response = await axios.get(`http://localhost:3000/contacts/${user.id}`);
        setAddedUsers(response.data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }
    };

    loadInitialData();
  }, [user.id]);

  useEffect(() => {
    socket.on('receive-message', (data) => {
      const { room, message, sender } = data;
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); 

      console.log('Received message:', message, 'from', sender);

      if (room !== activeRoom) {
        setActiveRoom(room);
        setRecipientEmail(sender);

        socket.emit('join-room', { senderEmail: user.email, recipientEmail: sender });
        socket.emit('fetch-messages', { senderEmail: user.email, recipientEmail: sender });
      }

      if (sender !== user.email) {
        setArrayMessage((prevMessages) => [
          ...prevMessages,
          { text: message, sender: 'left', time: currentTime },
        ]);
      }
    });

    return () => {
      socket.off('receive-message');
    };
  }, [activeRoom, user?.email]);

  const handleSendMessage = () => {
    if (message.trim() !== '' && activeRoom && recipientEmail) {
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' ,hour12:false}); 

      setArrayMessage((prevMessages) => [
        ...prevMessages,
        { text: message, sender: 'right', time: currentTime },
      ]);
      socket.emit('private-message', {
        room: activeRoom,
        message,
        senderEmail: user.email,
        recipientEmail,
      });

      setMessage(''); 
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleSelectUser = async (email: string) => {
    const room = `${[user.email, email].sort().join('-')}`;
    setActiveRoom(room);
    setRecipientEmail(email);
    setActiveUserEmail(email); 

    socket.emit('join-room', { senderEmail: user.email, recipientEmail: email });
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

  const handleAddUser = async () => {
    if (searchedUser && !addedUsers.some((u) => u.email === searchedUser.email)) {
      setAddedUsers((prevUsers) => [...prevUsers, searchedUser]);
      await axios.post('http://localhost:3000/contacts', {
        userId: user.id,
        contactEmail: searchedUser.email,
      });

      setSearchedUser(null);
      setSearchEmail('');
    }
  };

//   const handleRemoveContact = async (contactId: number) => { // Expecting contactId as a number
//   try {
//     const response = await axios.delete('http://localhost:3000/contacts', {
//       data: { userId: user.id, contactId: contactId }, // Use the user.id and the contactId
//     });
//     console.log(response.data.message); // Show success message
//     // Remove contact from state
//     setAddedUsers(addedUsers.filter(contact => contact.id !== contactId));
//   } catch (error) {
//     console.error('Error removing contact:', error);
//     // Handle error (optional: show a message to the user)
//   }
// };



  useEffect(() => {
    if (activeRoom) {
      socket.on('message-history', (data) => {
        if (data.room === activeRoom) {
          setArrayMessage(data.messages.map((msg: any) => ({
            text: msg.text,
            sender: msg.sender === user.email ? 'right' : 'left',
            time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })));
        }
      });

      return () => {
        socket.off('message-history');
      };
    }
  }, [activeRoom, user.email]);

   return (
    <>
      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="chat-container">
          <div className="search-div">
            <input
              type="text"
              className="search-input"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search by Email"
              autoComplete="email"
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
              <img src={`https://via.placeholder.com/40?text=${user.name.charAt(0)}`} alt={user.name} />
            </div>
          </div>
          <div className="chat-content">
            {showDetails && (
              <div className="user-details">
                <p>Name: {user.name}</p>
                <p>Email: {user.email}</p>
                {/* <p>Change Color: <ul>
                                <li><div style={{color: "red",width:'20px',border}}></div></li>
                            </ul></p> */}
                <button onClick={() => navigate('/register')}>Log Out</button>
              </div>
            )}
              <div className="added-users">
                 {addedUsers.map((addedUser, index) => (
                    <div key={index}  className={`added-user ${activeUserEmail === addedUser.email ? 'active' : ''}`}  onClick={() => handleSelectUser(addedUser.email)}>                    
                      <img src={`https://via.placeholder.com/40?text=${addedUser.name.charAt(0)}`} alt={addedUser.name} />
                      <p>{addedUser.name}</p>
                        {/* <button onClick={() => handleRemoveContact(addedUser.id)}>X</button> */}
                      </div>
                    ))}
            </div>
            <div className="message-content">
              <div className="message-container">
                {arrayMessage.map((msg, index) => (
                  <div key={index} className="message">
                    <p className={`${msg.sender === 'left' ? 'left' : 'right'}`}>
                      {msg.text}
                      <span className="message-time">{msg.time}</span>
                    </p>
                  </div>
                ))}
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
          </div>
        </div>
      )}
    </>
  );
}

export default Chat;

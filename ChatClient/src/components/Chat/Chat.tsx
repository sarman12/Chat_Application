import { useEffect, useState } from 'react';
import './Chat.css';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { BsArchive, BsCircle, BsGear, BsPlus, BsSearch, BsSend } from 'react-icons/bs';
// import background from '../../assets/background.png'

const socket = io('http://localhost:3000');

interface Message {
  text: string;
  sender: 'left' | 'right';
  time: string;
  date: string;
}


interface User {
  id: number;
  name: string;
  email: string;
  addedPerson: string[];
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
  const [activeUserName, setActiveUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
  const fetchAddedUsers = async () => {
    if (user.addedPerson?.length) {
      try {
        const promises = user.addedPerson.map(email => axios.get(`http://localhost:3000/user?email=${email}`));
        const responses = await Promise.all(promises);
        const users = responses.map(res => res.data);
        setAddedUsers(users);

        if (users.length > 0) {
          const defaultUser = users[0];
          const room = `${[user.email, defaultUser.email].sort().join('-')}`;
          setActiveRoom(room);
          setRecipientEmail(defaultUser.email);
          setActiveUserEmail(defaultUser.email);
          setActiveUserName(defaultUser.name);
          socket.emit('join-room', { senderEmails: user.email, recipientEmail: defaultUser.email });
          socket.emit('fetch-messages', { senderEmail: user.email, recipientEmail: defaultUser.email });
        }
      } catch (error) {
        console.error('Error fetching added users:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };
  fetchAddedUsers();
}, [user.addedPerson]);


  useEffect(() => {
    socket.on('receive-message', (data) => {
  const { room, message, sender } = data;
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString();

  if (room !== activeRoom) {
    setActiveRoom(room);
    setRecipientEmail(sender);
    socket.emit('join-room', { senderEmail: user.email, recipientEmail: sender });
    socket.emit('fetch-messages', { senderEmail: user.email, recipientEmail: sender });
  }

  if (sender !== user.email) {
    setArrayMessage((prevMessages) => [
      ...prevMessages,
      { text: message, sender: 'left', time: currentTime, date: currentDate },
    ]);
  }
});


    return () => {
      socket.off('receive-message');
    };
  }, [activeRoom, user.email]);

  const handleSendMessage = () => {
  if (message.trim() && activeRoom && recipientEmail) {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentDate = new Date().toLocaleDateString();

    setArrayMessage(prevMessages => [
      ...prevMessages,
      { text: message, sender: 'right', time: currentTime, date: currentDate },
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


  const handleSelectUser = async (email: string,name:string) => {
    const room = `${[user.email, email].sort().join('-')}`;
    setActiveRoom(room);
    setRecipientEmail(email);
    setActiveUserEmail(email);
    setActiveUserName(name);

    socket.emit('join-room', { senderEmail: user.email, recipientEmail: email });
    socket.emit('fetch-messages', { senderEmail: user.email, recipientEmail: email });
  };

  const handleSearchUser = async () => {
    if (searchEmail.trim()) {
      try {
        const response = await axios.get(`http://localhost:3000/user?email=${searchEmail}`);
        setSearchedUser(response.data || null);
      } catch (error) {
        console.error('Error fetching user:', error);
        setSearchedUser(null);
      }
    }
  };

  const handleAddUser = async () => {
    if (searchedUser && !addedUsers.some(u => u.email === searchedUser.email)) {
      try {
        const response = await axios.patch('http://localhost:3000/user/add-contact', {
          userId: user.id,
          contactEmail: searchedUser.email,
        });

        if (response.data) {
          setAddedUsers(prevUsers => [...prevUsers, searchedUser]);
          setSearchedUser(null);
          setSearchEmail('');
        }
      } catch (error) {
        console.error('Error adding contact:', error);
      }
    }
  };

  useEffect(() => {
    if (activeRoom) {
      socket.on('message-history', (data) => {
        if (data.room === activeRoom) {
          setArrayMessage(data.messages.map((msg: any) => ({
            text: msg.text,
            sender: msg.sender === user.email ? 'right' : 'left',
            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        
          
          
          
          <div className="chat-content">
            <div className="settings">
              <div className="profile-img" onClick={() => setShowDetails(!showDetails)}>
              <img src={`https://via.placeholder.com/40?text=${user.name.charAt(0)}`} alt={user.name} />
              </div>
              <div className="sidebar">
                <BsArchive title="Archive" className='fa' />
                <BsCircle title="Status" className='fa' />
                <BsGear title="Settings" className='fa' />

              </div>
                

            </div>

            {showDetails && (
              <div className="user-details">
                <p>Name: {user.name}</p>
                <p>Email: {user.email}</p>
                <button onClick={() => navigate('/register')}>Log Out</button>
              </div>
            )}
            <div className="added-users">
              <h3>Chat</h3>

              {/* Search Bar */}
              <div className="search">
                <div className="search-div">
                <input
                  type="text"
                  className="search-input"
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  placeholder="Search by Email"
                  autoComplete="email"
                />
                <BsSearch className="fa" onClick={handleSearchUser}/>
                </div>
              {searchedUser && (
              <div className="searched-user">

                <p>Name: {searchedUser.name}</p>
                <BsPlus className="fa" onClick={handleAddUser} />
              </div>
              
          )}

              
              
              </div>

              {/* {Added Users} */}

              {addedUsers.map((addedUser, index) => (
                <div key={index} className={`added-user ${activeUserEmail === addedUser.email ? 'active' : ''}`} onClick={() => handleSelectUser(addedUser.email,addedUser.name)}>
                    <img src={`https://via.placeholder.com/40?text=${addedUser.name.charAt(0)}`} alt={addedUser.name} />
                    <p>{addedUser.name}</p>
                  </div>
                ))}
              </div>

              {/* Messages part */}
              <div className="messages">
                <div className="heading">
                    <h2>{activeUserName}</h2>
                </div>
                <div className="message-content">
                  
                  <div className="message-container">
                    {arrayMessage.map((msg, index) => (
                      <div key={index} className="message">
                        <p className={`${msg.sender === 'left' ? 'left' : 'right'}`}>
                          {msg.sender === 'left' ? <span className="left_sender_name" >{activeUserName}</span> : <span className="right_sender_name" >{user.name}</span>}
                          {msg.text}
                          <span className="message-time">{msg.time}</span>
                          <span className="message-date">{msg.date}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="input-section">
                    <input
                      type="text"
                      className="form-input"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Type a message"
                    />
                    <BsSend className="fa" onClick={handleSendMessage}/>
                  </div>
                </div>

              </div>
            

          </div>
        </div>
      )}
    </>
  );
}

export default Chat;

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { 
  BsEmojiKiss, 
  BsPlus, 
  BsSearch, 
  BsSend,
  BsThreeDots,
  BsPaperclip,
  BsMic
} from 'react-icons/bs';
import { Menu } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface Message {
  id?: number;
  text: string;
  sender: 'left' | 'right';
  time: string;
  date: string;
  createdAt?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  addedPerson?: string[];
}

function Chat() {
  const location = useLocation();
  const user: User = location.state?.user;
  const navigate = useNavigate();

  const [message, setMessage] = useState<string>('');
  const [arrayMessage, setArrayMessage] = useState<Message[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [addedUsers, setAddedUsers] = useState<User[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [activeUserEmail, setActiveUserEmail] = useState<string>('');
  const [activeUserName, setActiveUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      navigate('/');
      return;
    }

    const newSocket = io('http://localhost:3000', {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  // Fetch contacts and initialize chat
  const fetchAddedUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.contacts) {
        setAddedUsers(response.data.contacts);
        
        // Select first contact by default if none selected
        if (response.data.contacts.length > 0 && !activeUserEmail) {
          const defaultUser = response.data.contacts[0];
          handleSelectUser(defaultUser.email, defaultUser.name);
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [activeUserEmail]);

  useEffect(() => {
    if (socket) {
      fetchAddedUsers();
    }
  }, [socket, fetchAddedUsers]);

  useEffect(() => {
    if (!socket) return;

    const messageHandler = (data: any) => {
      const { text, senderEmail, createdAt, id } = data;
      const currentTime = new Date(createdAt).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const currentDate = new Date(createdAt).toLocaleDateString();

      setArrayMessage(prev => {
        const isDuplicate = prev.some(msg => 
          (msg.id && msg.id === id) || 
          (msg.text === text && msg.time === currentTime && msg.sender === (senderEmail === user?.email ? 'right' : 'left'))
        );

        return isDuplicate ? prev : [
          ...prev,
          { 
            id,
            text, 
            sender: senderEmail === user?.email ? 'right' : 'left', 
            time: currentTime, 
            date: currentDate,
            createdAt
          }
        ];
      });
    };

    const historyHandler = (data: any) => {
      const formattedMessages = data.messages.map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.senderEmail === user?.email ? 'right' : 'left',
        time: new Date(msg.createdAt).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        date: new Date(msg.createdAt).toLocaleDateString(),
        createdAt: msg.createdAt
      }));
      setArrayMessage(formattedMessages);
    };

    socket.on('receive-message', messageHandler);
    socket.on('message-history', historyHandler);
    socket.on('error', (err) => setError(err));

    return () => {
      socket.off('receive-message', messageHandler);
      socket.off('message-history', historyHandler);
      socket.off('error');
    };
  }, [socket, user?.email]);

  const handleSelectUser = useCallback((email: string, name: string) => {
    if (!socket || !user) return;

    setActiveUserEmail(email);
    setActiveUserName(name);
    setRecipientEmail(email);
    setArrayMessage([]);
    setSidebarOpen(false);

    const room = `${[user.email, email].sort().join('__')}`;
    setActiveRoom(room);

    socket.emit('join-room', { otherEmail: email });
    socket.emit('fetch-messages', { otherEmail: email, limit: 100 });
  }, [socket, user]);

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) {
      setError('Please enter an email');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/api/user/search?email=${searchEmail}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSearchedUser(response.data);
      setError('');
    } catch (error: any) {
      setSearchedUser(null);
      setError(error.response?.data?.message || 'User not found');
    }
  };

  const handleAddUser = async () => {
    if (!searchedUser) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:3000/api/contacts',
        { contactEmail: searchedUser.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchAddedUsers();

      setSearchedUser(null);
      setSearchEmail('');
      setError('');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add contact');
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !socket || !recipientEmail || !user) return;

    const msg = message;
    setMessage('');

    socket.emit('private-message', { 
      otherEmail: recipientEmail, 
      text: msg 
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 font-sans overflow-hidden">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-gray-800 border-r border-gray-700 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer flex-1 p-2 rounded-xl transition-all duration-200 hover:bg-gray-700"
            onClick={() => setShowDetails(!showDetails)}
          >
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">{user?.name || 'User'}</h3>
              <span className="text-xs text-green-400">Online</span>
            </div>
          </div>
        </div>

        {showDetails && user && (
          <div className="absolute top-16 left-4 right-4 bg-gray-700 rounded-xl shadow-lg z-50 border border-gray-600">
            <div className="p-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="font-medium text-gray-300 text-sm">Name:</span>
                <span className="text-white text-sm">{user.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="font-medium text-gray-300 text-sm">Email:</span>
                <span className="text-white text-sm">{user.email}</span>
              </div>
              <button 
                className="w-full p-3 bg-red-600 text-white border-none rounded-lg font-medium cursor-pointer transition-all duration-200 mt-4 hover:bg-red-700"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex flex-col gap-3">
            <div className="relative flex gap-2">
              <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={14} />
              <input
                type="text"
                className="flex-1 pl-9 pr-3 py-2.5 border border-gray-600 rounded-lg outline-none text-sm bg-gray-700 text-white placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:bg-gray-600"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search by email..."
                autoComplete="off"
                onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
              />
              <button 
                className="px-4 py-2.5 bg-blue-600 text-white border-none rounded-lg font-medium cursor-pointer transition-all duration-200 text-sm hover:bg-blue-700"
                onClick={handleSearchUser}
              >
                Search
              </button>
            </div>
            
            {error && (
              <div className="p-2 px-3 bg-red-900/50 text-red-300 rounded-md text-xs border border-red-800">
                {error}
              </div>
            )}
            
            {searchedUser && (
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-xs">
                      {searchedUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium text-white text-sm">{searchedUser.name}</span>
                </div>
                {!addedUsers.some(u => u.email === searchedUser.email) && (
                  <button 
                    className="w-8 h-8 bg-green-600 text-white border-none rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-green-700"
                    onClick={handleAddUser}
                  >
                    <BsPlus size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-700">
            <h4 className="text-lg font-semibold text-white">Chats</h4>
            <span className="bg-gray-600 text-gray-300 px-2 py-1 rounded-xl text-xs font-medium">
              {addedUsers.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {addedUsers.map((addedUser) => (
              <div 
                key={addedUser.email} 
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 border-l-3 ${
                  activeUserEmail === addedUser.email 
                    ? 'bg-blue-900/50 border-l-blue-500' 
                    : 'border-l-transparent hover:bg-gray-700'
                }`}
                onClick={() => handleSelectUser(addedUser.email, addedUser.name)}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {addedUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white leading-tight">{addedUser.name}</h4>
                  <p className="text-xs text-gray-400 truncate">Click to start chatting</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-500">now</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-900 relative">
        {activeUserName ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
                >
                  <Menu size={20} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {activeUserName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white leading-tight">{activeUserName}</h3>
                  <span className="text-xs text-green-400 font-medium">Online</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="w-9 h-9 border-none bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 text-gray-400 hover:bg-gray-600 hover:text-white" title="Search in chat">
                  <BsSearch size={16} />
                </button>
                <button className="w-9 h-9 border-none bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 text-gray-400 hover:bg-gray-600 hover:text-white" title="More options">
                  <BsThreeDots size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden bg-gray-900 relative">
              <div className="h-full overflow-y-auto p-4 flex flex-col gap-4">
                {arrayMessage.map((msg, index) => (
                  <div key={msg.id ?? index} className={`flex items-end gap-2 ${msg.sender === 'left' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl relative break-words ${
                      msg.sender === 'left' 
                        ? 'bg-gray-700 text-gray-100 rounded-bl-md' 
                        : 'bg-blue-600 text-white rounded-br-md'
                    }`}>
                      <div className="text-sm leading-relaxed mb-1">
                        {msg.text}
                      </div>
                      <div className={`text-xs block text-right ${msg.sender === 'left' ? 'text-gray-400' : 'text-blue-200'}`}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-4 z-50 rounded-xl overflow-hidden shadow-lg">
                <EmojiPicker 
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                />
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <div className="flex items-center gap-3 bg-gray-700 rounded-2xl px-4 py-2 border border-gray-600 transition-all duration-200 focus-within:border-blue-500">
                <button 
                  className="w-8 h-8 border-none bg-transparent rounded-full flex items-center justify-center cursor-pointer text-gray-400 transition-all duration-200 flex-shrink-0 hover:bg-gray-600 hover:text-white"
                  title="Attach file"
                >
                  <BsPaperclip size={16} />
                </button>
                <button
                  className={`w-8 h-8 border-none bg-transparent rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 hover:bg-gray-600 ${
                    showEmojiPicker ? 'text-yellow-500' : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add emoji"
                >
                  <BsEmojiKiss size={16} />
                </button>
                <div className="flex-1">
                  <input
                    type="text"
                    className="w-full border-none outline-none bg-transparent text-sm py-2 text-white placeholder-gray-400"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                </div>
                {message.trim() ? (
                  <button 
                    className="w-8 h-8 border-none bg-blue-600 rounded-full flex items-center justify-center cursor-pointer text-white transition-all duration-200 flex-shrink-0 hover:bg-blue-700 hover:scale-105"
                    onClick={handleSendMessage}
                    title="Send message"
                  >
                    <BsSend size={14} />
                  </button>
                ) : (
                  <button 
                    className="w-8 h-8 border-none bg-transparent rounded-full flex items-center justify-center cursor-pointer text-gray-400 transition-all duration-200 flex-shrink-0 hover:bg-gray-600 hover:text-white"
                    title="Voice message"
                  >
                    <BsMic size={16} />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center max-w-md p-10">
              <div className="text-6xl mb-5 opacity-50">💬</div>
              <h3 className="text-2xl font-semibold text-white mb-3">Welcome to Chat</h3>
              <p className="text-base text-gray-400 mb-6">Select a contact to start messaging</p>
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                View Contacts
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
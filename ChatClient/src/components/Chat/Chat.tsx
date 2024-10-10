import { useState } from 'react';
import './Chat.css';

interface Message {
  text: string;
  sender: 'left' | 'right';
}




function Chat() {
  const [message, setMessage] = useState<string>('');
  const [arrayMessage, setArrayMessage] = useState<Message[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const handleSendMessage = () => {
    if (message.trim() !== '') {
      setArrayMessage([...arrayMessage, { text: message, sender: 'right' }]);
      setMessage('');
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };


  return (
    <div className="chat-container">
      <div className="heading">
        <button className="add-btn">+</button>
        <h1>Guest</h1>
        <div className="profile-img" onClick={toggleDetails}>
          <img src="https://via.placeholder.com/100" alt="Profile" />
        </div>
      </div>

      {showDetails && (
        <div className="user-details">
          <p>Name: Guest</p>
          <p>Email: Guest@gmail.com</p>
          <p>Unique Code: 1234</p>
        </div>
      )}

      <div className="chat-content">
        <div className="contact-list">
          <ul>
            <li>User 1</li>
            <li>User 2</li>
            <li>User 3</li>
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
            />
            <button className="btn" onClick={handleSendMessage}>send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;

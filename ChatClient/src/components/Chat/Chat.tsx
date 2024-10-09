import  { useState } from 'react';
import './Chat.css';

interface Message {
  text: string;
  sender: 'left' | 'right';
}

function Chat() {
  const [message, setMessage] = useState<string>('');
  const [arrayMessage, setArrayMessage] = useState<Message[]>([]);

  const handleSendMessage = () => {
    if (message.trim() !== '') {
      setArrayMessage([...arrayMessage, { text: message, sender: 'right' }]);
      setMessage('');
    }
  };

  return (
    <div className="chat-container">
      <div className="heading">
        <h1>Chat</h1>
      </div>

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

            <div className="message left">
              <p>hello</p>
            </div>
            <div className="message right">
              <p>hi There</p>
            </div>
          </div>

          <div className="input-section">
            <input
              className="form-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button className="btn" onClick={handleSendMessage}>send</button>
            {/* <FaSend className="btn" onClick={handleSendMessage} /> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;

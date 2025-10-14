import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import api from '@landinghub/api';
import '../styles/ChatModal.css';

const ChatModal = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Xin chào! Tôi là trợ lý AI của LandingHub. Tôi có thể giúp gì cho bạn?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto resize textarea
  useEffect(() => {
    const textarea = document.querySelector('.chat-footer textarea');
    if (!textarea) return;

    const handleInput = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    textarea.addEventListener('input', handleInput);
    return () => textarea.removeEventListener('input', handleInput);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/api/chat', { message: input });
      const aiMessage = { sender: 'ai', text: res.data.reply };
      setMessages(prev => [...prev, aiMessage]);
    } catch {
      const errorMessage = { sender: 'ai', text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-modal-overlay">
      <div className="chat-modal-container">
        <div className="chat-header">
          <h4>🤖 Trợ lý AI</h4>
          <button className="chat-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="chat-body">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.sender}`}>
              <div className="chat-bubble">{msg.text}</div>
            </div>
          ))}
          {isLoading && (
            <div className="chat-message ai typing-indicator">
              <span></span><span></span><span></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-footer">
          <form onSubmit={handleSubmit}>
            <textarea
              placeholder="Nhập câu hỏi của bạn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              rows="1"
            />
            <button type="submit" disabled={isLoading}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;

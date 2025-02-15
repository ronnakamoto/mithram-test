import React, { useEffect, useState, useRef } from 'react';
import { XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { config } from '../config/api';

const Chat = ({ onClose, patientId, analysisId, accessToken }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hello! I am Mithram, your medical AI assistant. I\'m here to help you with any medical questions or concerns.',
    timestamp: new Date()
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    const initialize = async () => {
      if (!patientId || !analysisId || !accessToken || isInitialized) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Initialize chat
        const response = await fetch(`${config.apiUrl}/chat/${patientId}/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ analysisId })
        });

        if (!response.ok) {
          throw new Error('Failed to initialize chat');
        }

        const data = await response.json();
        setContext(data.context);

        // Get history
        const historyResponse = await fetch(`${config.apiUrl}/chat/${patientId}/history`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        let hasHistory = false;
        if (historyResponse.ok) {
          const { history } = await historyResponse.json();
          if (history && history.length > 0) {
            setMessages(history);
            hasHistory = true;
          }
        }

        if (!hasHistory) {
          setMessages([{
            role: 'assistant',
            content: 'I have reviewed your medical history and analysis details. I\'m ready to assist you with any questions or concerns you may have.',
            timestamp: new Date()
          }]);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setError('Failed to initialize chat. Please try again later.');
        setMessages(prev => prev.filter(msg => !msg.isLoading));
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      document.body.style.overflow = 'unset';
      setIsInitialized(false);
      setContext(null);
      setMessages([{
        role: 'assistant',
        content: 'Hello! I am Mithram, your medical AI assistant. I\'m here to help you with any medical questions or concerns.',
        timestamp: new Date()
      }]);
    };
  }, [patientId, analysisId, accessToken]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !isInitialized || !context) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    // Show typing indicator
    setIsTyping(true);
    setIsLoading(true);

    try {
      const response = await fetch(`${config.apiUrl}/chat/${patientId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          message: userMessage,
          context: context 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { response: aiResponse } = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className={`fixed inset-y-0 right-0 w-[420px] transform transition-all duration-300 ease-out ${
          isMinimized ? 'translate-x-[360px]' : 'translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                {error ? 'Chat Error' : 'Chat with Mithram'}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100/80 transition-colors duration-200 cursor-pointer"
                  aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                >
                  {isMinimized ? (
                    <PlusIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <MinusIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100/80 transition-colors duration-200 cursor-pointer"
                  aria-label="Close chat"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-white/60 backdrop-blur-md">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex items-start space-x-3 ${message.role === 'assistant' ? '' : 'justify-end'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white font-medium">M</span>
                    </div>
                  )}
                  <div className={`flex flex-col ${message.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                    <div className={`rounded-2xl px-4 py-2 max-w-[75%] ${
                      message.role === 'assistant' 
                        ? 'bg-white shadow-sm border border-gray-100' 
                        : 'bg-blue-500 text-white'
                    } ${message.isError ? 'bg-red-50 border-red-100 text-red-600' : ''}`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <span className="text-xs text-gray-400 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-medium">M</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="rounded-2xl px-4 py-2 bg-white shadow-sm border border-gray-100">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 mt-1">
                      Mithram is typing...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-200/50">
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  // Auto-adjust height
                  e.target.style.height = 'inherit';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                }}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="w-full pr-28 py-3 pl-4 bg-gray-50/80 rounded-xl resize-none overflow-y-auto text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-colors duration-200"
                style={{
                  minHeight: '44px',
                  maxHeight: '150px'
                }}
                disabled={!isInitialized || isLoading}
              />
              <div className="absolute right-3 bottom-2 flex items-center">
                <button
                  onClick={sendMessage}
                  disabled={!isInitialized || isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                    !isInitialized || isLoading
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md active:scale-95'
                  }`}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>

          {/* Minimized Tab */}
          <div 
            onClick={() => setIsMinimized(false)}
            className={`absolute top-4 left-0 transform -translate-x-full ${
              isMinimized ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } transition-opacity duration-200 cursor-pointer`}
          >
            <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-l-lg shadow-sm border border-gray-200/50 border-r-0">
              <span className="text-sm font-medium text-gray-700">Chat with Mithram</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

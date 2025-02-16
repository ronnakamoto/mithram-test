import React, { useEffect, useState, useRef } from 'react';
import { XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { config } from '../config/api';
import { db } from '../services/db';

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="flex items-start space-x-3">
      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
    <div className="flex items-start justify-end space-x-3">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/3 ml-auto"></div>
      </div>
    </div>
  </div>
);

const TypingIndicator = () => (
  <div className="flex items-center space-x-2 text-gray-500 text-sm">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
    <span>Mithram is typing...</span>
  </div>
);

const Chat = ({ onClose, patientId, analysisId, accessToken }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hello, I am Mithram AI. I have analyzed the patient\'s medical data and am ready to assist you with insights and recommendations.',
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

        // Load messages from IndexedDB
        const savedMessages = await db.getMessages(patientId, analysisId);
        
        if (savedMessages && savedMessages.length > 0) {
          setMessages(savedMessages);
        } else {
          const welcomeMessage = {
            role: 'assistant',
            content: 'I have analyzed the patient\'s medical history and current data. I\'m ready to assist you with clinical insights and recommendations.',
            timestamp: new Date()
          };
          await db.saveMessage(patientId, analysisId, welcomeMessage);
          setMessages([welcomeMessage]);
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
    };
  }, [patientId, analysisId, accessToken]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !isInitialized || !context) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setInputValue('');
    
    // Save user message to IndexedDB and update state
    await db.saveMessage(patientId, analysisId, userMessage);
    setMessages(prev => [...prev, userMessage]);

    try {
      setIsLoading(true);
      setIsTyping(true);

      const response = await fetch(`${config.apiUrl}/chat/${patientId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          message: userMessage.content,
          context: context 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { response: aiResponse } = await response.json();
      
      const assistantMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      // Save assistant message to IndexedDB and update state
      await db.saveMessage(patientId, analysisId, assistantMessage);
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      await db.saveMessage(patientId, analysisId, errorMessage);
      setMessages(prev => [...prev, errorMessage]);
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
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gradient-to-r hover:from-blue-400 hover:to-blue-600 hover:text-white transition-all duration-200 cursor-pointer group"
                  aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                >
                  {isMinimized ? (
                    <PlusIcon className="h-5 w-5 text-gray-500 group-hover:text-white" />
                  ) : (
                    <MinusIcon className="h-5 w-5 text-gray-500 group-hover:text-white" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gradient-to-r hover:from-blue-400 hover:to-blue-600 hover:text-white transition-all duration-200 cursor-pointer group"
                  aria-label="Close chat"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500 group-hover:text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-white/60 backdrop-blur-md">
            {error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                    <XMarkIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-gray-600">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg hover:from-blue-500 hover:to-blue-700 transition-all duration-200"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex items-start space-x-3 ${message.role === 'assistant' ? '' : 'justify-end'}`}>
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                        M
                      </div>
                    )}
                    <div 
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.role === 'assistant' 
                          ? 'bg-white shadow-sm' 
                          : 'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
                      } ${message.isError ? 'bg-red-50 text-red-600 border border-red-200' : ''}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="mt-1 text-xs opacity-60">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                      M
                    </div>
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex items-center space-x-2 text-gray-500 text-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span>Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-200/50">
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isInitialized ? "Ask about patient analysis or request recommendations..." : "Initializing..."}
                disabled={!isInitialized || isLoading}
                className={`w-full px-4 py-3 rounded-xl border ${
                  isInitialized ? 'border-gray-200 focus:border-blue-400' : 'border-gray-100 bg-gray-50'
                } focus:ring-2 focus:ring-blue-400/20 focus:outline-none resize-none transition-all duration-200`}
                rows="1"
              />
              <button
                onClick={sendMessage}
                disabled={!isInitialized || isLoading || !inputValue.trim()}
                className={`absolute right-2 bottom-2 px-4 py-1.5 rounded-lg ${
                  isInitialized && inputValue.trim() 
                    ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white hover:from-blue-500 hover:to-blue-700' 
                    : 'bg-gray-100 text-gray-400'
                } transition-all duration-200`}
              >
                Send
              </button>
            </div>
          </div>

          {/* Minimized Tab */}
          <div 
            onClick={() => setIsMinimized(false)}
            className={`absolute top-4 left-0 transform -translate-x-full ${
              isMinimized ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } transition-opacity duration-200 cursor-pointer`}
          >
            <div className="bg-gradient-to-r from-blue-400 to-blue-600 px-4 py-2 rounded-l-lg shadow-sm">
              <span className="text-sm font-medium text-white">Chat with Mithram</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

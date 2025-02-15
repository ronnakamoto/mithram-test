import React, { useEffect, useState } from 'react';
import { XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

const Chat = ({ onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
              <h2 className="text-lg font-medium text-gray-900">Chat with Mithram</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100/80 transition-colors duration-200"
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
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100/80 transition-colors duration-200"
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
              {/* Assistant Message */}
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">M</span>
                </div>
                <div className="flex-1">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
                    <p className="text-gray-700">
                      Welcome to Mithram Chat! How can I assist you today?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-200/50">
            <div className="relative">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 px-3 py-1 text-blue-600 hover:text-blue-700 font-medium">
                Send
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
  );
};

export default Chat;

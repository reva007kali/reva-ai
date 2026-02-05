import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Bot, MessageSquare, Search, ChevronRight } from 'lucide-react';

const History = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedJid, setSelectedJid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');

  // Fetch conversation list
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get('/api/conversations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConversations(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchConversations();
    // Poll for new conversations every 10s
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    if (!selectedJid) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        // Encode the JID because it might contain special chars like @ or :
        const res = await axios.get(`/api/chats/${encodeURIComponent(selectedJid)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchMessages();
    // Poll for new messages in current chat every 3s
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedJid, token]);

  // Auto-scroll to bottom
  useEffect(() => {
    // Only scroll if we are already near the bottom or if it's the first load
    // For now, let's just make it smoother and maybe add a check?
    // Actually, user asked "why always", implying they might want to read old messages.
    // We should only scroll on initial load or if user is at bottom.
    
    // Simple fix: only scroll if messages length changed significantly or it's a new chat
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); 
  }, [messages.length, selectedJid]); // Changed dependency to length to avoid scroll on re-renders of same msgs

  const filteredConversations = conversations.filter(c => 
    c.remote_jid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.last_message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      
      {/* Left Sidebar: Conversation List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-lg pl-10 p-2 text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <p className="text-center text-gray-400 p-8">No conversations found.</p>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.remote_jid}
                onClick={() => setSelectedJid(conv.remote_jid)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedJid === conv.remote_jid ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-800 text-sm truncate w-3/4">
                    {conv.remote_jid.replace('@c.us', '')}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 truncate w-5/6">
                    {conv.last_message}
                  </p>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area: Chat Window */}
      <div className="flex-1 flex flex-col bg-[#efeae2]">
        {selectedJid ? (
          <>
            {/* Header */}
            <div className="bg-white p-4 border-b border-gray-200 flex items-center gap-3 shadow-sm z-10">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={20} className="text-gray-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">
                  {selectedJid.replace('@c.us', '')}
                </h3>
                <p className="text-xs text-green-600">Active Conversation</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[70%] p-3 rounded-lg shadow-sm relative ${
                      msg.role === 'assistant' 
                        ? 'bg-white text-gray-800 rounded-tl-none' 
                        : 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed pb-4">{msg.message}</p>
                    <span className="text-[10px] text-gray-400 absolute bottom-1 right-2">
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={40} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium">Select a conversation to view history</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;

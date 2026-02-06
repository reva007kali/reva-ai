import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Bot, MessageSquare, Search, ChevronRight, Plus, Mic, Lock } from 'lucide-react';

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
    <div className="h-screen flex bg-[#111b21] overflow-hidden text-[#e9edef]">
      
      {/* Left Sidebar: Conversation List */}
      <div className={`w-full md:w-[350px] lg:w-[400px] border-r border-[#202c33] flex flex-col bg-[#111b21] ${selectedJid ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Sidebar Header */}
        <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center">
               <User size={24} className="text-white" />
             </div>
             <h2 className="font-bold text-[#e9edef]">Chats</h2>
          </div>
          <div className="flex gap-4 text-[#aebac1]">
            <MessageSquare size={20} />
            <Bot size={20} />
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-2 border-b border-[#202c33]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aebac1]" size={18} />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#202c33] rounded-lg pl-12 pr-4 py-2 text-sm text-[#d1d7db] placeholder-[#8696a0] focus:outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#8696a0]">
              <p>No chats found.</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.remote_jid}
                onClick={() => setSelectedJid(conv.remote_jid)}
                className={`flex items-center p-3 cursor-pointer hover:bg-[#202c33] transition-colors ${
                  selectedJid === conv.remote_jid ? 'bg-[#2a3942]' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#6a7175] flex items-center justify-center shrink-0 mr-3">
                  <User size={24} className="text-[#cfd4d6]" />
                </div>
                <div className="flex-1 min-w-0 border-b border-[#222d34] pb-3 justify-center flex flex-col h-full">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-[#e9edef] font-normal truncate text-base">
                      {conv.remote_jid.replace('@c.us', '')}
                    </h3>
                    <span className="text-xs text-[#8696a0] shrink-0 ml-2">
                      {new Date(conv.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-[#8696a0] truncate">
                    {conv.last_message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area: Chat Window */}
      <div className={`flex-1 flex flex-col bg-[#0b141a] relative ${!selectedJid ? 'hidden md:flex' : 'flex'}`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }}></div>

        {selectedJid ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between shrink-0 z-10 border-l border-[#222d34]">
              <div className="flex items-center gap-4">
                {/* Mobile Back Button */}
                <button onClick={() => setSelectedJid(null)} className="md:hidden text-[#aebac1]">
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                
                <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center">
                  <User size={20} className="text-[#cfd4d6]" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-[#e9edef] font-normal">
                    {selectedJid.replace('@c.us', '')}
                  </h3>
                  <p className="text-xs text-[#8696a0]">click here for contact info</p>
                </div>
              </div>
              <div className="flex gap-6 text-[#aebac1]">
                <Search size={20} />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 z-10 relative">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[85%] md:max-w-[65%] px-2 py-1.5 rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative text-sm ${
                      msg.role === 'assistant' 
                        ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none' 
                        : 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed px-1 pb-4">{msg.message}</p>
                    <span className={`text-[10px] absolute bottom-1 right-2 ${msg.role === 'assistant' ? 'text-[#8696a0]' : 'text-[#8696a0]'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Placeholder (Visual Only) */}
            <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 z-10">
               <div className="p-2 text-[#8696a0]">
                 <Plus size={24} />
               </div>
               <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 text-[#8696a0] text-sm cursor-not-allowed">
                 Type a message (Read-only view)
               </div>
               <div className="p-2 text-[#8696a0]">
                 <Mic size={24} />
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0] z-10 border-b-[6px] border-green-500">
            <div className="max-w-[80%] text-center">
              <h2 className="text-3xl font-light text-[#e9edef] mb-4">Reva AI for Windows</h2>
              <p className="text-sm">Send and receive messages without keeping your phone online.</p>
              <p className="text-sm mt-1">Use Reva AI on up to 4 linked devices and 1 phone.</p>
              <div className="mt-8 flex items-center justify-center gap-2 text-xs">
                <Lock size={12} /> End-to-end encrypted
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;

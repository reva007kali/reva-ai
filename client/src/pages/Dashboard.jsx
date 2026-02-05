import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';
import axios from 'axios';
import { Power, Activity, Smartphone, Clock, PieChart, Plus, Trash2, SmartphoneCharging } from 'lucide-react';

const socket = io();

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [botEnabled, setBotEnabled] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: 10000 });
  const [currentModel, setCurrentModel] = useState('gpt-3.5-turbo');
  const [token] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Fetch initial settings and sessions
    const fetchInitialData = async () => {
      try {
        const [settingsRes, sessionsRes] = await Promise.all([
          axios.get('/api/settings', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/sessions', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setBotEnabled(settingsRes.data.bot_enabled === 'true');
        setScheduleEnabled(settingsRes.data.schedule_enabled === 'true');
        setTokenUsage({
          used: parseInt(settingsRes.data.tokens_used_today || 0),
          limit: parseInt(settingsRes.data.token_limit_daily || 10000)
        });
        setCurrentModel(settingsRes.data.openai_model || 'gpt-3.5-turbo');
        setSessions(sessionsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitialData();

    // Socket listeners
    socket.on('all_sessions', (data) => {
      setSessions(data);
    });
    
    socket.on('session_update', (data) => {
      setSessions(prev => {
        const index = prev.findIndex(s => s.session_id === data.sessionId);
        if (index === -1) {
          // New session appeared? Refresh list or add it if we have all fields
          return [...prev, { session_id: data.sessionId, status: data.status, qr: data.qr }];
        }
        const newSessions = [...prev];
        newSessions[index] = { ...newSessions[index], status: data.status, qr: data.qr };
        return newSessions;
      });
    });

    return () => {
      socket.off('all_sessions');
      socket.off('session_update');
    };
  }, [token]);

  const toggleBot = async () => {
    const newState = !botEnabled;
    setBotEnabled(newState);
    await axios.post('/api/settings', 
      { key: 'bot_enabled', value: newState },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  const addSession = async () => {
    if (!newSessionName) return;
    const id = newSessionName.toLowerCase().replace(/\s+/g, '-');
    try {
      await axios.post('/api/sessions', 
        { session_id: id, description: newSessionName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAddModal(false);
      setNewSessionName('');
    } catch (err) {
      alert('Failed to create session');
    }
  };

  const deleteSession = async (id) => {
    if (!window.confirm('Disconnect and remove this device?')) return;
    try {
      await axios.delete(`/api/sessions/${id}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessions(prev => prev.filter(s => s.session_id !== id));
    } catch (err) {
      alert('Failed to remove session');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'authenticated': return 'text-green-500';
      case 'scan_qr': return 'text-yellow-500';
      default: return 'text-red-500';
    }
  };

  const calculateEstimatedCost = () => {
    let pricePerMillion = 1.0; 
    if (currentModel.includes('gpt-4o-mini')) pricePerMillion = 0.40;
    else if (currentModel.includes('gpt-4o')) pricePerMillion = 5.00;
    
    const cost = (tokenUsage.used / 1000000) * pricePerMillion;
    return cost < 0.0001 && cost > 0 ? '< $0.0001' : `$${cost.toFixed(4)}`;
  };

  return (
    <div className="p-8 pb-20 overflow-y-auto h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h2>
      
      {/* Top Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Bot Control */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-500 text-sm">Bot Control</p>
              <h3 className="text-xl font-bold text-gray-800">{botEnabled ? 'Active' : 'Paused'}</h3>
            </div>
            <button 
              onClick={toggleBot}
              className={`p-3 rounded-lg transition-colors ${botEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
            >
              <Power size={24} />
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {scheduleEnabled ? 'Controlled by Schedule' : 'Manual Control'}
          </p>
        </div>

        {/* Token Usage */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-500 text-sm">Daily Token Usage</p>
              <h3 className="text-xl font-bold text-gray-800">
                {Math.round((tokenUsage.used / tokenUsage.limit) * 100)}%
              </h3>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <PieChart size={24} />
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min((tokenUsage.used / tokenUsage.limit) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400">
            {tokenUsage.used.toLocaleString()} / {tokenUsage.limit.toLocaleString()} tokens
            <span className="block mt-1 font-semibold text-gray-500">
              Est. Cost: {calculateEstimatedCost()}
            </span>
          </p>
        </div>
      </div>

      {/* Connected Devices Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Connected Devices</h3>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 flex items-center gap-2"
          >
            <Plus size={18} /> Add Device
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map(session => (
            <div key={session.session_id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-50 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${session.status === 'online' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    <SmartphoneCharging size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{session.description || session.session_id}</h4>
                    <p className={`text-sm font-medium capitalize ${getStatusColor(session.status)}`}>
                      {session.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteSession(session.session_id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Disconnect"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* QR Code Area */}
              {(session.status === 'scan_qr' || (session.status === 'disconnected' && session.qr)) && (
                <div className="p-6 bg-gray-50 flex flex-col items-center justify-center text-center">
                  <div className="bg-white p-2 rounded-lg shadow-sm mb-3">
                    <QRCodeSVG value={session.qr || 'loading'} size={180} />
                  </div>
                  <p className="text-xs text-gray-500">Scan with WhatsApp</p>
                </div>
              )}
              
              {session.status === 'online' && (
                <div className="p-6 bg-green-50/50 flex flex-col items-center justify-center flex-1 min-h-[150px]">
                  <Activity className="text-green-500 mb-2" size={32} />
                  <p className="text-green-700 font-medium">Device Active</p>
                  <p className="text-xs text-green-600 mt-1">Ready to reply</p>
                </div>
              )}
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="col-span-full bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
              <Smartphone size={48} className="mx-auto mb-4 opacity-50" />
              <p>No devices connected. Click "Add Device" to start.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add New Device</h3>
            <input
              type="text"
              placeholder="Device Name (e.g. Sales Support)"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:border-green-500"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={addSession}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

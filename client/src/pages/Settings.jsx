import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Clock, Bot, Cpu, ShieldAlert } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({
    system_prompt: '',
    openai_model: 'gpt-3.5-turbo',
    token_limit_daily: '10000',
    schedule_start: '09:00',
    schedule_end: '17:00',
    schedule_enabled: 'false'
  });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSettings(prev => ({ ...prev, ...res.data }));
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:3001/api/settings/bulk', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Settings saved successfully');
    } catch (err) {
      alert('Failed to save settings');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 pb-20 overflow-y-auto h-screen">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Settings</h2>
        <button 
          onClick={saveSettings}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save size={20} /> {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Behavior */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Bot size={20} /> AI Behavior (System Prompt)
          </h3>
          <p className="text-sm text-gray-500 mb-2">Define how the AI should behave, its persona, and rules.</p>
          <textarea
            value={settings.system_prompt}
            onChange={(e) => handleChange('system_prompt', e.target.value)}
            className="w-full border rounded-lg p-4 h-40 font-mono text-sm focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Model Selection */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Cpu size={20} /> Model Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI Model</label>
              <select
                value={settings.openai_model}
                onChange={(e) => handleChange('openai_model', e.target.value)}
                className="w-full border rounded-lg p-2 focus:outline-none focus:border-green-500 bg-white"
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Cheap)</option>
                <option value="gpt-4o">GPT-4o (Smartest)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (Balanced)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Token Limits */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <ShieldAlert size={20} /> Safety Limits
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Token Limit</label>
            <input
              type="number"
              value={settings.token_limit_daily}
              onChange={(e) => handleChange('token_limit_daily', e.target.value)}
              className="w-full border rounded-lg p-2 focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">Prevents excessive API usage costs.</p>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={20} /> Auto-ON Schedule
          </h3>
          
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.schedule_enabled === 'true'}
                onChange={(e) => handleChange('schedule_enabled', e.target.checked ? 'true' : 'false')}
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-gray-700 font-medium">Enable Schedule</span>
            </label>
          </div>

          <div className={`grid grid-cols-2 gap-4 ${settings.schedule_enabled !== 'true' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (24h)</label>
              <input
                type="time"
                value={settings.schedule_start}
                onChange={(e) => handleChange('schedule_start', e.target.value)}
                className="w-full border rounded-lg p-2 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time (24h)</label>
              <input
                type="time"
                value={settings.schedule_end}
                onChange={(e) => handleChange('schedule_end', e.target.value)}
                className="w-full border rounded-lg p-2 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

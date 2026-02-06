import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Clock, Bot, Cpu, ShieldAlert, Briefcase, Smile, Coffee, Sparkles } from 'lucide-react';

const PRESETS = [
  {
    id: 'formal',
    title: 'Professional',
    icon: Briefcase,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-900/20',
    temp: 0.3,
    prompt: "You are a highly professional and polite assistant. Your responses should be concise, formal, and free of emojis. Focus on accuracy and business-appropriate language."
  },
  {
    id: 'friendly',
    title: 'Friendly Helper',
    icon: Smile,
    color: 'text-green-400',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-900/20',
    temp: 0.7,
    prompt: "You are a helpful and friendly assistant. Use a warm tone and feel free to use occasional emojis to make the conversation engaging. Be supportive and clear."
  },
  {
    id: 'casual',
    title: 'Chill Dude',
    icon: Coffee,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-900/20',
    temp: 0.9,
    prompt: "You are a chill, casual assistant. Speak like a friend. Use slang where appropriate, keep it short, and use emojis freely. Don't be too stiff."
  },
  {
    id: 'creative',
    title: 'Creative Spark',
    icon: Sparkles,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-900/20',
    temp: 1.0,
    prompt: "You are an enthusiastic and creative assistant. Be imaginative, verbose if necessary, and think outside the box. Use vivid language and express excitement."
  }
];

const Settings = () => {
  const [settings, setSettings] = useState({
    system_prompt: '',
    openai_model: 'gpt-3.5-turbo',
    token_limit_daily: '10000',
    schedule_start: '09:00',
    schedule_end: '17:00',
    schedule_enabled: 'false',
    temperature: 0.7
  });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings', {
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

  const applyPreset = (preset) => {
    setSettings(prev => ({
      ...prev,
      system_prompt: preset.prompt,
      temperature: preset.temp
    }));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await axios.post('/api/settings/bulk', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Settings saved successfully');
    } catch (err) {
      alert('Failed to save settings');
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 pb-20 overflow-y-auto h-screen text-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Settings</h2>
        <button 
          onClick={saveSettings}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          <Save size={20} /> {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Behavior */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700 lg:col-span-2">
          <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2">
            <Bot size={20} className="text-green-400" /> AI Behavior & Persona
          </h3>
          
          {/* Preset Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-105 ${
                  settings.system_prompt === preset.prompt 
                    ? `${preset.borderColor} ${preset.bgColor}` 
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <preset.icon className={`${preset.color} mb-3`} size={28} />
                <h4 className="font-bold text-white mb-1">{preset.title}</h4>
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>Temp: {preset.temp}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* System Prompt Textarea */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">System Prompt (Persona)</label>
              <textarea
                value={settings.system_prompt}
                onChange={(e) => handleChange('system_prompt', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-4 h-40 font-mono text-sm focus:outline-none focus:border-green-500 leading-relaxed"
                placeholder="You are a helpful assistant..."
              />
            </div>

            {/* Temperature Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Creativity (Temperature): <span className="text-green-400 font-bold">{settings.temperature}</span>
              </label>
              <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1" 
                  value={settings.temperature || 0.7} 
                  onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Precise (0.0)</span>
                  <span>Balanced (1.0)</span>
                  <span>Random (2.0)</span>
                </div>
                <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                  Lower values make the AI more deterministic and focused. Higher values make it more random and creative.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700">
          <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
            <Cpu size={20} className="text-blue-400" /> Model Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">OpenAI Model</label>
              <select
                value={settings.openai_model}
                onChange={(e) => handleChange('openai_model', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:outline-none focus:border-green-500"
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Cheap)</option>
                <option value="gpt-4o">GPT-4o (Smartest)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (Balanced)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Token Limits */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700">
          <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-400" /> Safety Limits
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Daily Token Limit</label>
            <input
              type="number"
              value={settings.token_limit_daily}
              onChange={(e) => handleChange('token_limit_daily', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">Prevents excessive API usage costs.</p>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700 lg:col-span-2">
          <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-purple-400" /> Auto-ON Schedule
          </h3>
          
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.schedule_enabled === 'true'}
                onChange={(e) => handleChange('schedule_enabled', e.target.checked ? 'true' : 'false')}
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500 bg-gray-900 border-gray-600"
              />
              <span className="text-gray-200 font-medium">Enable Schedule</span>
            </label>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${settings.schedule_enabled !== 'true' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Start Time (24h)</label>
              <input
                type="time"
                value={settings.schedule_start}
                onChange={(e) => handleChange('schedule_start', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">End Time (24h)</label>
              <input
                type="time"
                value={settings.schedule_end}
                onChange={(e) => handleChange('schedule_end', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

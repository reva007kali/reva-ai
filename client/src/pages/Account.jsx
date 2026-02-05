import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Lock, Upload, Save, CheckCircle } from 'lucide-react';

const Account = () => {
  const [user, setUser] = useState({
    username: '',
    email: '',
    display_name: '',
    logo_path: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passMessage, setPassMessage] = useState('');
  
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
        if (res.data.logo_path) {
          setLogoPreview(`http://localhost:3001${res.data.logo_path}`);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, [token]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('display_name', user.display_name || '');
    formData.append('email', user.email || '');
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    try {
      const res = await axios.post('http://localhost:3001/api/account/update', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success) {
        setMessage('Profile updated successfully!');
        if (res.data.logo_path) {
          setUser(prev => ({ ...prev, logo_path: res.data.logo_path }));
        }
      }
    } catch (err) {
      setMessage('Failed to update profile.');
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassMessage('New passwords do not match.');
      return;
    }
    
    setPassLoading(true);
    setPassMessage('');

    try {
      await axios.post('http://localhost:3001/api/account/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPassMessage('Password updated successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPassMessage(err.response?.data?.error || 'Failed to update password.');
    }
    setPassLoading(false);
  };

  return (
    <div className="p-8 pb-20 overflow-y-auto h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Account Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profile Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
            <User size={20} /> Profile Information
          </h3>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            {/* Logo Upload */}
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-gray-400" />
                )}
              </div>
              <div>
                <label className="cursor-pointer bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Upload size={16} /> Change Logo
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
                <p className="text-xs text-gray-400 mt-2">Recommended: 200x200px (PNG/JPG)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={user.display_name || ''}
                  onChange={(e) => setUser({ ...user, display_name: e.target.value })}
                  className="w-full border rounded-lg pl-10 p-2 focus:outline-none focus:border-green-500"
                  placeholder="e.g. Reva Assistant"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={user.email || ''}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  className="w-full border rounded-lg pl-10 p-2 focus:outline-none focus:border-green-500"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 w-full justify-center"
              >
                {loading ? 'Saving...' : <><Save size={18} /> Save Profile</>}
              </button>
              {message && (
                <p className={`text-center text-sm mt-3 ${message.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                  {message}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
            <Lock size={20} /> Security
          </h3>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                className="w-full border rounded-lg p-2 focus:outline-none focus:border-green-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full border rounded-lg p-2 focus:outline-none focus:border-green-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full border rounded-lg p-2 focus:outline-none focus:border-green-500"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={passLoading}
                className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 flex items-center gap-2 w-full justify-center"
              >
                {passLoading ? 'Updating...' : 'Update Password'}
              </button>
              {passMessage && (
                <p className={`text-center text-sm mt-3 ${passMessage.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                  {passMessage}
                </p>
              )}
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Account;

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Database, Settings, MessageSquare, LogOut, User, ChevronLeft, ChevronRight, X } from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobile, isOpen, setIsOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/knowledge', icon: Database, label: 'Knowledge Base' },
    { path: '/history', icon: MessageSquare, label: 'History' },
    { path: '/account', icon: User, label: 'Account' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Mobile Drawer Overlay
  if (isMobile && !isOpen) return null;

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`
        bg-gray-900 text-white h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 border-r border-gray-800
        ${isMobile ? 'w-64' : (isCollapsed ? 'w-20' : 'w-64')}
      `}>
        <div className="p-4 flex items-center justify-between border-b border-gray-800 h-16">
          {!isCollapsed && (
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-green-400">Reva AI</h1>
              {!isMobile && <p className="text-[10px] text-gray-500">Admin Panel</p>}
            </div>
          )}
          {isCollapsed && !isMobile && (
             <h1 className="text-xl font-bold text-green-400 mx-auto">R</h1>
          )}

          {/* Mobile Close Button */}
          {isMobile && (
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          )}
        </div>
        
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => isMobile && setIsOpen(false)}
              className={`flex items-center p-3 rounded-lg transition-all group relative ${
                location.pathname === item.path
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              } ${isCollapsed && !isMobile ? 'justify-center' : 'space-x-3'}`}
            >
              <item.icon size={20} className="min-w-[20px]" />
              {(!isCollapsed || isMobile) && <span>{item.label}</span>}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && !isMobile && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className={`flex items-center w-full p-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors ${
              isCollapsed && !isMobile ? 'justify-center' : 'space-x-3'
            }`}
          >
            <LogOut size={20} className="min-w-[20px]" />
            {(!isCollapsed || isMobile) && <span>Logout</span>}
          </button>
          
          {/* Desktop Collapse Toggle */}
          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="mt-2 flex items-center justify-center w-full p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import Settings from './pages/Settings';
import History from './pages/History';
import Account from './pages/Account';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

function Layout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false); // Reset mobile state on desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex bg-gray-900 min-h-screen text-gray-100">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 flex items-center px-4 z-40">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold text-green-400 text-lg">Reva AI</span>
        </div>
      )}

      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        isMobile={isMobile}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <div className={`flex-1 transition-all duration-300 ${
        isMobile ? 'mt-16 ml-0' : (isCollapsed ? 'ml-20' : 'ml-64')
      }`}>
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/knowledge" element={<Layout><KnowledgeBase /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/history" element={<Layout><History /></Layout>} />
          <Route path="/account" element={<Layout><Account /></Layout>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

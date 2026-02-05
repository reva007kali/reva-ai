import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import Settings from './pages/Settings';
import History from './pages/History';
import Account from './pages/Account';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

function Layout({ children }) {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64">
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

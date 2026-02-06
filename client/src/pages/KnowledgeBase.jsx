import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, FolderPlus, FileText, Pencil } from 'lucide-react';

const KnowledgeBase = () => {
  const [categories, setCategories] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newKnowledge, setNewKnowledge] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const [catsRes, knowRes] = await Promise.all([
        axios.get('/api/categories', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/knowledge', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCategories(catsRes.data);
      setKnowledge(knowRes.data);
      if (catsRes.data.length > 0 && !selectedCat) setSelectedCat(catsRes.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addCategory = async () => {
    if (!newCatName) return;
    try {
      await axios.post('/api/categories', 
        { name: newCatName, description: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewCatName('');
      fetchData();
    } catch (err) {
      alert('Failed to add category');
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await axios.delete(`/api/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  const addKnowledge = async () => {
    if (!newKnowledge || !selectedCat) return;
    setLoading(true);
    try {
      if (editingId) {
        await axios.put(`/api/knowledge/${editingId}`, 
          { content: newKnowledge },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditingId(null);
      } else {
        await axios.post('/api/knowledge', 
          { category_id: selectedCat, content: newKnowledge },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setNewKnowledge('');
      fetchData();
    } catch (err) {
      alert('Failed to save knowledge');
    }
    setLoading(false);
  };

  const startEdit = (item) => {
    setNewKnowledge(item.content);
    setEditingId(item.id);
    setSelectedCat(item.category_id);
  };

  const cancelEdit = () => {
    setNewKnowledge('');
    setEditingId(null);
  };

  const deleteKnowledge = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await axios.delete(`/api/knowledge/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  const filteredKnowledge = knowledge.filter(k => k.category_id === parseInt(selectedCat));

  return (
    <div className="p-4 md:p-8 h-screen flex flex-col text-gray-100 overflow-hidden">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Knowledge Base</h2>
      
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-full md:w-1/3 bg-gray-800 rounded-xl shadow-sm border border-gray-700 flex flex-col max-h-[300px] md:max-h-none">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
              <FolderPlus size={20} className="text-blue-400" /> Categories
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New Category Name"
                className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500"
              />
              <button 
                onClick={addCategory}
                className="bg-green-600 text-white p-1 rounded hover:bg-green-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2">
            {categories.map(cat => (
              <div 
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer mb-1 transition-colors ${
                  parseInt(selectedCat) === cat.id 
                    ? 'bg-green-900/30 text-green-400 border border-green-800' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="font-medium">{cat.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge Content */}
        <div className="w-full md:w-2/3 flex flex-col gap-6 overflow-hidden">
          {/* Add Knowledge Form */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700 shrink-0">
            <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-yellow-400" /> {editingId ? 'Edit Knowledge' : 'Add Knowledge'}
            </h3>
            <textarea
              value={newKnowledge}
              onChange={(e) => setNewKnowledge(e.target.value)}
              placeholder="Enter knowledge text here..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm min-h-[100px] mb-3 text-white focus:outline-none focus:border-green-500 placeholder-gray-500"
            />
            <div className="flex justify-end gap-2">
              {editingId && (
                <button 
                  onClick={cancelEdit}
                  className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={addKnowledge}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {loading ? 'Processing...' : <>{editingId ? <Pencil size={18} /> : <Plus size={18} />} {editingId ? 'Update' : 'Add to Database'}</>}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 bg-gray-800/50">
              <h3 className="font-bold text-gray-200">
                Items in "{categories.find(c => c.id === parseInt(selectedCat))?.name}"
              </h3>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {filteredKnowledge.map(item => (
                <div key={item.id} className="p-4 border border-gray-700 rounded-lg hover:border-green-500/50 transition-colors group relative bg-gray-900/50">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{item.content}</p>
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(item)}
                      className="text-gray-500 hover:text-blue-400"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => deleteKnowledge(item.id)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredKnowledge.length === 0 && (
                <p className="text-gray-500 text-center py-8">No knowledge items in this category yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;

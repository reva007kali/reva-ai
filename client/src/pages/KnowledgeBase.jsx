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
    <div className="p-8 h-screen flex flex-col">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Knowledge Base</h2>
      
      <div className="flex gap-8 flex-1 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <FolderPlus size={20} /> Categories
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New Category Name"
                className="flex-1 border rounded px-2 py-1 text-sm"
              />
              <button 
                onClick={addCategory}
                className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
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
                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer mb-1 ${
                  parseInt(selectedCat) === cat.id ? 'bg-green-50 text-green-700 border border-green-200' : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{cat.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge Content */}
        <div className="w-2/3 flex flex-col gap-6">
          {/* Add Knowledge Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <FileText size={20} /> {editingId ? 'Edit Knowledge' : 'Add Knowledge'}
            </h3>
            <textarea
              value={newKnowledge}
              onChange={(e) => setNewKnowledge(e.target.value)}
              placeholder="Enter knowledge text here..."
              className="w-full border rounded-lg p-3 text-sm min-h-[100px] mb-3 focus:outline-none focus:border-green-500"
            />
            <div className="flex justify-end gap-2">
              {editingId && (
                <button 
                  onClick={cancelEdit}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={addKnowledge}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Processing...' : <>{editingId ? <Pencil size={18} /> : <Plus size={18} />} {editingId ? 'Update' : 'Add to Database'}</>}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-700">
                Items in "{categories.find(c => c.id === parseInt(selectedCat))?.name}"
              </h3>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {filteredKnowledge.map(item => (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:border-green-200 transition-colors group relative">
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{item.content}</p>
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(item)}
                      className="text-gray-300 hover:text-blue-500"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => deleteKnowledge(item.id)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredKnowledge.length === 0 && (
                <p className="text-gray-400 text-center py-8">No knowledge items in this category yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;

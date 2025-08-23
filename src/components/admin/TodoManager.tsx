"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconCheck, 
  IconSearch
} from '@tabler/icons-react';

interface Todo {
  _id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  category: 'bug' | 'feature' | 'improvement' | 'maintenance' | 'other';
  assignedTo?: { _id: string; username: string; name: string };
  dueDate?: string;
  tags: string[];
  isPublic: boolean;
  createdBy: { _id: string; username: string; name: string };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedBy?: { _id: string; username: string; name: string };
}

interface TodoStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface CreateTodoData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'bug' | 'feature' | 'improvement' | 'maintenance' | 'other';
  assignedTo?: string;
  dueDate?: string;
  tags: string[];
  isPublic: boolean;
}

export default function TodoManager() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: ''
  });

  const [newTodo, setNewTodo] = useState<CreateTodoData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    tags: [],
    isPublic: true
  });

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const [todosResponse, statsResponse] = await Promise.all([
        axios.get('/api/admin/todos'),
        axios.get('/api/admin/todos/stats')
      ]);

      setTodos(todosResponse.data.todos);
      setStats(statsResponse.data.stats);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleCreateTodo = async () => {
    try {
      if (!newTodo.title.trim()) return;

      await axios.post('/api/admin/todos', newTodo);
      setNewTodo({
        title: '',
        description: '',
        priority: 'medium',
        category: 'other',
        tags: [],
        isPublic: true
      });
      setShowCreateForm(false);
      fetchTodos();
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  const handleUpdateTodo = async (todoId: string, updates: Partial<Todo>) => {
    try {
      await axios.put(`/api/admin/todos/${todoId}`, updates);
      setEditingTodo(null);
      fetchTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a todo-t?')) return;

    try {
      await axios.delete(`/api/admin/todos/${todoId}`);
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'admin-badge-danger';
      case 'high': return 'admin-badge-warning';
      case 'medium': return 'admin-badge-info';
      case 'low': return 'admin-badge-secondary';
      default: return 'admin-badge-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'admin-badge-success';
      case 'in-progress': return 'admin-badge-info';
      case 'cancelled': return 'admin-badge-outline';
      default: return 'admin-badge-warning';
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filters.status && todo.status !== filters.status) return false;
    if (filters.priority && todo.priority !== filters.priority) return false;
    if (filters.category && todo.category !== filters.category) return false;
    if (filters.search && !todo.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="admin-glass-card">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Todo-k betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="admin-glass-card text-center">
            <h3 className="text-lg font-semibold text-primary">Összes</h3>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="admin-glass-card text-center">
            <h3 className="text-lg font-semibold text-warning">Függőben</h3>
            <p className="text-3xl font-bold">{stats.pending}</p>
          </div>
          <div className="admin-glass-card text-center">
            <h3 className="text-lg font-semibold text-info">Folyamatban</h3>
            <p className="text-3xl font-bold">{stats.inProgress}</p>
          </div>
          <div className="admin-glass-card text-center">
            <h3 className="text-lg font-semibold text-success">Kész</h3>
            <p className="text-3xl font-bold">{stats.completed}</p>
          </div>
        </div>
      )}

      {/* Filters and Create Button */}
      <div className="admin-glass-card">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Státusz</span>
              </label>
              <select
                className="admin-select w-full"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Minden státusz</option>
                <option value="pending">Függőben</option>
                <option value="in-progress">Folyamatban</option>
                <option value="completed">Kész</option>
                <option value="cancelled">Törölve</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prioritás</span>
              </label>
              <select
                className="admin-select w-full"
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">Minden prioritás</option>
                <option value="critical">Kritikus</option>
                <option value="high">Magas</option>
                <option value="medium">Közepes</option>
                <option value="low">Alacsony</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Kategória</span>
              </label>
              <select
                className="admin-select w-full"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Minden kategória</option>
                <option value="bug">Hiba</option>
                <option value="feature">Új funkció</option>
                <option value="improvement">Fejlesztés</option>
                <option value="maintenance">Karbantartás</option>
                <option value="other">Egyéb</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Keresés</span>
              </label>
              <div className="relative">
                <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Keresés..."
                  className="admin-input w-full pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateForm(true)}
              className="admin-btn-primary btn-xs"
            >
              <IconPlus />
              <span className="ml-1">Új Todo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Todo Form */}
      {showCreateForm && (
        <div className="admin-glass-card">
          <h3 className="text-lg font-semibold mb-4">Új Todo létrehozása</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Cím *</span>
              </label>
              <input
                type="text"
                className="admin-input w-full"
                value={newTodo.title}
                onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Todo címe..."
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Kategória</span>
              </label>
              <select
                className="admin-select w-full"
                value={newTodo.category}
                onChange={(e) => setNewTodo(prev => ({ ...prev, category: e.target.value as any }))}
              >
                <option value="bug">Hiba</option>
                <option value="feature">Új funkció</option>
                <option value="improvement">Fejlesztés</option>
                <option value="maintenance">Karbantartás</option>
                <option value="other">Egyéb</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prioritás</span>
              </label>
              <select
                className="admin-select w-full"
                value={newTodo.priority}
                onChange={(e) => setNewTodo(prev => ({ ...prev, priority: e.target.value as any }))}
              >
                <option value="low">Alacsony</option>
                <option value="medium">Közepes</option>
                <option value="high">Magas</option>
                <option value="critical">Kritikus</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Határidő</span>
              </label>
              <input
                type="date"
                className="admin-input w-full"
                value={newTodo.dueDate}
                onChange={(e) => setNewTodo(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2 form-control">
              <label className="label">
                <span className="label-text font-medium">Leírás</span>
              </label>
              <textarea
                className="admin-input w-full"
                rows={3}
                value={newTodo.description}
                onChange={(e) => setNewTodo(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Részletes leírás..."
              />
            </div>

            <div className="md:col-span-2 form-control">
              <label className="label">
                <span className="label-text font-medium">Címkék (vesszővel elválasztva)</span>
              </label>
              <input
                type="text"
                className="admin-input w-full"
                value={newTodo.tags.join(', ')}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Ha a felhasználó vesszőt ír, automatikusan hozzáadjuk a címkét
                  if (inputValue.endsWith(',')) {
                    const newTag = inputValue.slice(0, -1).trim();
                    if (newTag && !newTodo.tags.includes(newTag)) {
                      setNewTodo(prev => ({ 
                        ...prev, 
                        tags: [...prev.tags, newTag]
                      }));
                    }
                  } else {
                    // Egyébként frissítjük a címkék listáját
                    const tags = inputValue.split(',').map(tag => tag.trim()).filter(Boolean);
                    setNewTodo(prev => ({ ...prev, tags }));
                  }
                }}
                onKeyDown={(e) => {
                  // Enter gombra is hozzáadhatjuk a címkét
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    e.preventDefault();
                    const newTag = (e.target as HTMLInputElement).value.trim();
                    if (newTag && !newTodo.tags.includes(newTag)) {
                      setNewTodo(prev => ({ 
                        ...prev, 
                        tags: [...prev.tags, newTag]
                      }));
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                placeholder="címke1, címke2, címke3... (Enter vagy vessző a hozzáadáshoz)"
              />
              {/* Címkék megjelenítése */}
              {newTodo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newTodo.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="admin-badge-outline text-sm cursor-pointer hover:bg-error/10 hover:text-error"
                      onClick={() => setNewTodo(prev => ({
                        ...prev,
                        tags: prev.tags.filter((_, i) => i !== index)
                      }))}
                      title="Kattintson a törléshez"
                    >
                      {tag} ×
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              onClick={handleCreateTodo}
              className="admin-btn-primary btn-xs w-full sm:w-auto"
              disabled={!newTodo.title.trim()}
            >
              <IconPlus />
              <span className="ml-1">Létrehozás</span>
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="admin-btn-ghost btn-xs w-full sm:w-auto"
            >
              Mégse
            </button>
          </div>
        </div>
      )}

      {/* Todos List */}
      <div className="admin-glass-card">
        <h3 className="text-lg font-semibold mb-4">Todo-k ({filteredTodos.length})</h3>
        
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-base-content/60">
            Nincsenek todo-k a kiválasztott szűrőkkel.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTodos.map((todo) => (
              <div key={todo._id} className="border border-base-300 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{todo.title}</h4>
                      <span className={`admin-badge ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                      <span className={`admin-badge ${getStatusColor(todo.status)}`}>
                        {todo.status}
                      </span>
                      <span className="admin-badge-outline">
                        {todo.category}
                      </span>
                    </div>

                    {todo.description && (
                      <p className="text-base-content/70 mb-2">{todo.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 text-sm text-base-content/60">
                      <span>Létrehozta: {todo.createdBy.name || todo.createdBy.username}</span>
                      {todo.assignedTo && (
                        <span>• Hozzárendelve: {todo.assignedTo.name || todo.assignedTo.username}</span>
                      )}
                      {todo.dueDate && (
                        <span>• Határidő: {new Date(todo.dueDate).toLocaleDateString('hu-HU')}</span>
                      )}
                      {todo.tags.length > 0 && (
                        <span>• Címkék: {todo.tags.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 ml-4">
                    <button
                      onClick={() => setEditingTodo(todo)}
                      className="admin-btn-info btn-xs w-full sm:w-auto"
                    >
                      <IconEdit />
                      <span className="hidden sm:inline ml-1">Szerkesztés</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTodo(todo._id)}
                      className="admin-btn-danger btn-xs w-full sm:w-auto"
                    >
                      <IconTrash />
                      <span className="hidden sm:inline ml-1">Törlés</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Todo Modal */}
      {editingTodo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="admin-glass-card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Todo szerkesztése</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Cím</span>
                </label>
                <input
                  type="text"
                  className="admin-input w-full"
                  value={editingTodo.title}
                  onChange={(e) => setEditingTodo(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Státusz</span>
                </label>
                <select
                  className="admin-select w-full"
                  value={editingTodo.status}
                  onChange={(e) => setEditingTodo(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                >
                  <option value="pending">Függőben</option>
                  <option value="in-progress">Folyamatban</option>
                  <option value="completed">Kész</option>
                  <option value="cancelled">Törölve</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Prioritás</span>
                </label>
                <select
                  className="admin-select w-full"
                  value={editingTodo.priority}
                  onChange={(e) => setEditingTodo(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                >
                  <option value="low">Alacsony</option>
                  <option value="medium">Közepes</option>
                  <option value="high">Magas</option>
                  <option value="critical">Kritikus</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Kategória</span>
                </label>
                <select
                  className="admin-select w-full"
                  value={editingTodo.category}
                  onChange={(e) => setEditingTodo(prev => prev ? { ...prev, category: e.target.value as any } : null)}
                >
                  <option value="bug">Hiba</option>
                  <option value="feature">Új funkció</option>
                  <option value="improvement">Fejlesztés</option>
                  <option value="maintenance">Karbantartás</option>
                  <option value="other">Egyéb</option>
                </select>
              </div>

              <div className="md:col-span-2 form-control">
                <label className="label">
                  <span className="label-text font-medium">Leírás</span>
                </label>
                <textarea
                  className="admin-input w-full"
                  rows={3}
                  value={editingTodo.description || ''}
                  onChange={(e) => setEditingTodo(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button
                onClick={() => {
                  if (editingTodo) {
                    handleUpdateTodo(editingTodo._id, {
                      title: editingTodo.title,
                      description: editingTodo.description,
                      priority: editingTodo.priority,
                      status: editingTodo.status,
                      category: editingTodo.category
                    });
                  }
                }}
                className="admin-btn-primary btn-xs w-full sm:w-auto"
              >
                <IconCheck />
                <span className="ml-1">Mentés</span>
              </button>
              <button
                onClick={() => setEditingTodo(null)}
                className="admin-btn-ghost btn-xs w-full sm:w-auto"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconCheck, 
  IconSearch,
  IconLayoutKanban,
  IconList,
  IconClock,
  IconUser,
  IconCalendar,
  IconX,
  IconAlertCircle,
  IconCircleCheck,
  IconProgress,
  IconCircleX
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
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filters, setFilters] = useState({
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

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { color: 'bg-error text-error-content', icon: IconAlertCircle, label: 'Kritikus' };
      case 'high':
        return { color: 'bg-warning text-warning-content', icon: IconAlertCircle, label: 'Magas' };
      case 'medium':
        return { color: 'bg-info text-info-content', icon: IconAlertCircle, label: 'Közepes' };
      case 'low':
        return { color: 'bg-success text-success-content', icon: IconAlertCircle, label: 'Alacsony' };
      default:
        return { color: 'bg-base-300 text-base-content', icon: IconAlertCircle, label: 'Ismeretlen' };
    }
  };



  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'bug':
        return { emoji: '', label: 'Hiba', color: 'bg-error/10 text-error' };
      case 'feature':
        return { emoji: '', label: 'Új funkció', color: 'bg-primary/10 text-primary' };
      case 'improvement':
        return { emoji: '', label: 'Fejlesztés', color: 'bg-info/10 text-info' };
      case 'maintenance':
        return { emoji: '', label: 'Karbantartás', color: 'bg-warning/10 text-warning' };
      default:
        return { emoji: '', label: 'Egyéb', color: 'bg-base-300/10 text-base-content' };
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filters.priority && todo.priority !== filters.priority) return false;
    if (filters.category && todo.category !== filters.category) return false;
    if (filters.search && !todo.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const todosByStatus = {
    pending: filteredTodos.filter(t => t.status === 'pending'),
    'in-progress': filteredTodos.filter(t => t.status === 'in-progress'),
    completed: filteredTodos.filter(t => t.status === 'completed'),
    cancelled: filteredTodos.filter(t => t.status === 'cancelled')
  };

  const TodoCard = ({ todo }: { todo: Todo }) => {
    const priorityConfig = getPriorityConfig(todo.priority);
    const categoryConfig = getCategoryConfig(todo.category);
    const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status !== 'completed';

    return (
      <div className="bg-base-100 border border-base-300 rounded-xl p-4 hover:shadow-lg transition-all duration-300 group">
        {/* Priority Badge */}
        <div className="flex items-start justify-between mb-3">
          <span className={`${priorityConfig.color} px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1`}>
            <priorityConfig.icon size={14} />
            {priorityConfig.label}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setEditingTodo(todo)}
              className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <IconEdit size={14} />
            </button>
            <button
              onClick={() => handleDeleteTodo(todo._id)}
              className="btn btn-ghost btn-xs text-error md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <IconTrash size={14} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 className="font-bold text-base-content mb-2 line-clamp-2">{todo.title}</h4>

        {/* Description */}
        {todo.description && (
          <p className="text-sm text-base-content/60 mb-3 line-clamp-2">{todo.description}</p>
        )}

        {/* Category */}
        <div className="mb-3">
          <span className={`${categoryConfig.color} px-2 py-1 rounded-lg text-xs font-medium`}>
            {categoryConfig.emoji} {categoryConfig.label}
          </span>
        </div>

        {/* Tags */}
        {todo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {todo.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="badge badge-sm badge-outline">
                {tag}
              </span>
            ))}
            {todo.tags.length > 3 && (
              <span className="badge badge-sm badge-outline">+{todo.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-base-content/60 pt-3 border-t border-base-300">
          {todo.dueDate && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-error font-bold' : ''}`}>
              <IconCalendar size={14} />
              {new Date(todo.dueDate).toLocaleDateString('hu-HU')}
            </div>
          )}
          {todo.assignedTo && (
            <div className="flex items-center gap-1">
              <IconUser size={14} />
              {todo.assignedTo.name || todo.assignedTo.username}
            </div>
          )}
        </div>
      </div>
    );
  };

  const KanbanColumn = ({ 
    status, 
    title, 
    icon: Icon,
    color 
  }: { 
    status: string; 
    title: string; 
    icon: any;
    color: string;
  }) => {
    const todosInColumn = todosByStatus[status as keyof typeof todosByStatus];

    return (
      <div className="flex flex-col h-full">
        {/* Column Header */}
        <div className={`${color} rounded-xl p-4 mb-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Icon size={20} />
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <span className="badge badge-lg">{todosInColumn.length}</span>
        </div>

        {/* Column Content */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          {todosInColumn.length === 0 ? (
            <div className="text-center py-8 text-base-content/40">
              <Icon size={48} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nincs {title.toLowerCase()}</p>
            </div>
          ) : (
            todosInColumn.map(todo => (
              <TodoCard key={todo._id} todo={todo} />
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="text-base-content/60">Todo-k betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{stats.total}</div>
            <div className="text-sm text-base-content/70 font-medium">Összes Todo</div>
          </div>
          <div className="bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-warning mb-2">{stats.pending}</div>
            <div className="text-sm text-base-content/70 font-medium">Függőben</div>
          </div>
          <div className="bg-gradient-to-br from-info/20 to-info/5 border border-info/30 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-info mb-2">{stats.inProgress}</div>
            <div className="text-sm text-base-content/70 font-medium">Folyamatban</div>
          </div>
          <div className="bg-gradient-to-br from-success/20 to-success/5 border border-success/30 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-success mb-2">{stats.completed}</div>
            <div className="text-sm text-base-content/70 font-medium">Befejezve</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-base-100 border border-base-300 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('kanban')}
              className={`btn btn-sm gap-2 ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <IconLayoutKanban size={18} />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`btn btn-sm gap-2 ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <IconList size={18} />
              Lista
            </button>
          </div>

          {/* Filters */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              className="select select-bordered select-sm w-full"
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">Minden prioritás</option>
              <option value="critical">Kritikus</option>
              <option value="high">Magas</option>
              <option value="medium">Közepes</option>
              <option value="low">Alacsony</option>
            </select>

            <select
              className="select select-bordered select-sm w-full"
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

            <div className="relative">
              <input
                type="text"
                placeholder="Keresés..."
                className="input input-bordered input-sm w-full pl-10"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary btn-sm gap-2 whitespace-nowrap"
          >
            <IconPlus size={18} />
            Új Todo
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <KanbanColumn
            status="pending"
            title="Függőben"
            icon={IconClock}
            color="bg-warning/10 border border-warning/30"
          />
          <KanbanColumn
            status="in-progress"
            title="Folyamatban"
            icon={IconProgress}
            color="bg-info/10 border border-info/30"
          />
          <KanbanColumn
            status="completed"
            title="Befejezve"
            icon={IconCircleCheck}
            color="bg-success/10 border border-success/30"
          />
          <KanbanColumn
            status="cancelled"
            title="Törölve"
            icon={IconCircleX}
            color="bg-base-300/10 border border-base-300/30"
          />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-base-100 border border-base-300 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Todo-k ({filteredTodos.length})</h3>
          
          {filteredTodos.length === 0 ? (
            <div className="text-center py-12">
              <IconList size={64} className="mx-auto mb-4 text-base-content/20" />
              <p className="text-base-content/60">Nincsenek todo-k a kiválasztott szűrőkkel</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTodos.map(todo => (
                <TodoCard key={todo._id} todo={todo} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Todo Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-base-100 border-b border-base-300 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Új Todo létrehozása</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Cím *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Todo címe..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Kategória</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
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
                    <span className="label-text font-bold">Prioritás</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={newTodo.priority}
                    onChange={(e) => setNewTodo(prev => ({ ...prev, priority: e.target.value as any }))}
                  >
                    <option value="low">Alacsony</option>
                    <option value="medium">Közepes</option>
                    <option value="high">Magas</option>
                    <option value="critical">Kritikus</option>
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Határidő</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={newTodo.dueDate}
                  onChange={(e) => setNewTodo(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Leírás</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-32"
                  value={newTodo.description}
                  onChange={(e) => setNewTodo(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Részletes leírás..."
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Címkék</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Címke hozzáadása (Enter)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const newTag = input.value.trim();
                      if (newTag && !newTodo.tags.includes(newTag)) {
                        setNewTodo(prev => ({ 
                          ...prev, 
                          tags: [...prev.tags, newTag]
                        }));
                        input.value = '';
                      }
                    }
                  }}
                />
                {newTodo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newTodo.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="badge badge-lg gap-2 cursor-pointer hover:badge-error"
                        onClick={() => setNewTodo(prev => ({
                          ...prev,
                          tags: prev.tags.filter((_, i) => i !== index)
                        }))}
                      >
                        {tag}
                        <IconX size={14} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-base-100 border-t border-base-300 p-6 flex gap-3">
              <button
                onClick={handleCreateTodo}
                className="btn btn-primary flex-1 gap-2"
                disabled={!newTodo.title.trim()}
              >
                <IconPlus size={18} />
                Létrehozás
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn btn-ghost"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Todo Modal */}
      {editingTodo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-base-100 border-b border-base-300 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Todo szerkesztése</h3>
              <button
                onClick={() => setEditingTodo(null)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Cím</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editingTodo.title}
                  onChange={(e) => setEditingTodo(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Státusz</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
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
                    <span className="label-text font-bold">Prioritás</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={editingTodo.priority}
                    onChange={(e) => setEditingTodo(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                  >
                    <option value="low">Alacsony</option>
                    <option value="medium">Közepes</option>
                    <option value="high">Magas</option>
                    <option value="critical">Kritikus</option>
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Kategória</span>
                </label>
                <select
                  className="select select-bordered w-full"
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

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Leírás</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-32"
                  value={editingTodo.description || ''}
                  onChange={(e) => setEditingTodo(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-base-100 border-t border-base-300 p-6 flex gap-3">
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
                className="btn btn-primary flex-1 gap-2"
              >
                <IconCheck size={18} />
                Mentés
              </button>
              <button
                onClick={() => setEditingTodo(null)}
                className="btn btn-ghost"
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

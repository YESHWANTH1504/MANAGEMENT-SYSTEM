import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PlusCircle, Trash2, Calendar, User, Clock, AlertTriangle } from 'lucide-react';

const KanbanBoard = () => {
  const { user } = useAuth();
  const { showToast, confirm } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to_id: '',
    due_date: ''
  });

  const isAdmin = user?.role === 'admin';

  const loadTasks = async () => {
    try {
      const res = await api.get('/tasks/');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    try {
      const [internsRes, employeesRes] = await Promise.all([
        api.get('/interns'),
        api.get('/employees')
      ]);
      const mapped = [
        ...internsRes.data.map(i => ({ id: i.user_id, name: `${i.full_name} (Intern)` })),
        ...employeesRes.data.map(e => ({ id: e.user_id, name: `${e.full_name} (Employee)` }))
      ];
      setUsersList(mapped);
      if (mapped.length > 0) {
        setForm(prev => ({ ...prev, assigned_to_id: mapped[0].id.toString() }));
      }
    } catch (err) {
      console.error('Failed to load assignable users', err);
    }
  };

  useEffect(() => {
    loadTasks();
    if (isAdmin) {
      loadUsers();
    }
  }, []);

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleMoveTask = async (taskId, targetStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: targetStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));
      showToast('Task status updated.', 'success');
    } catch (err) {
      showToast('Failed to update task column.', 'error');
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr, 10);
    handleMoveTask(taskId, targetStatus);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Please enter a task title.', 'warning');
      return;
    }
    if (!form.assigned_to_id) {
      showToast('Please assign this task to a user.', 'warning');
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        assigned_to_id: parseInt(form.assigned_to_id, 10),
        due_date: form.due_date || null
      };

      const res = await api.post('/tasks/', payload);
      setTasks(prev => [res.data, ...prev]);
      setShowAddModal(false);
      setForm({ title: '', description: '', assigned_to_id: usersList[0]?.id?.toString() || '', due_date: '' });
      showToast('Task assigned successfully.', 'success');
    } catch (err) {
      showToast('Failed to create task.', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    const isConfirmed = await confirm('Are you sure you want to delete this task?', {
      title: 'Delete Task',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      showToast('Task deleted successfully.', 'success');
    } catch (err) {
      showToast('Failed to delete task.', 'error');
    }
  };

  const columns = [
    { id: 'todo', label: 'To Do', color: 'border-t-slate-400 bg-slate-100/30 dark:bg-slate-900/20' },
    { id: 'in_progress', label: 'In Progress', color: 'border-t-blue-500 bg-blue-50/10 dark:bg-blue-950/5' },
    { id: 'done', label: 'Done', color: 'border-t-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Workspace Task Board (Kanban)</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Drag and drop cards to update progress columns</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 text-xs px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all shadow-sm"
          >
            <PlusCircle size={14} />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl border border-slate-200/60 dark:border-slate-800/80 border-t-4 p-4 min-h-[300px] flex flex-col ${col.color}`}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{col.label}</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800 text-slate-655 dark:text-slate-400 font-bold rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[400px] pr-1">
                {colTasks.map(t => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-850 transition-all cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{t.title}</h4>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                        {t.description}
                      </p>
                    )}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-[9px] text-slate-400">
                      <span className="flex items-center space-x-1 font-semibold text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20 px-2 py-0.5 rounded-md">
                        <User size={10} className="mr-0.5" />
                        <span>{t.assigned_to_name}</span>
                      </span>
                      {t.due_date && (
                        <span className="flex items-center space-x-1 text-slate-500">
                          <Calendar size={10} className="mr-0.5" />
                          <span>{t.due_date}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="h-28 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[10px] text-slate-400">
                    No tasks in this column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateTask}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl animate-slide-up"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Assign Workspace Task</h3>
            
            <div className="space-y-4">
              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Refactor API endpoints"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-405 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Task specifications..."
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-405 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Assignee Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Assign To</label>
                <select
                  value={form.assigned_to_id}
                  onChange={(e) => setForm(prev => ({ ...prev, assigned_to_id: e.target.value }))}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                  {usersList.length === 0 && (
                    <option value="">No assignable users</option>
                  )}
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-lg shadow"
              >
                Assign Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;

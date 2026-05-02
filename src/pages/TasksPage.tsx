import { useEffect, useState } from 'react';
import { Plus, Filter, Search, Clock, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { supabase, Task, Project } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TaskModal from '../components/TaskModal';

type Props = {
  projects: Project[];
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'text-red-400 bg-red-400/10 border-red-400/20',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  low: 'text-green-400 bg-green-400/10 border-green-400/20',
};

export default function TasksPage({ projects }: Props) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, projects(*), assignee:profiles!tasks_assignee_id_fkey(*)')
      .or(`creator_id.eq.${user!.id},assignee_id.eq.${user!.id}`)
      .order('created_at', { ascending: false });

    setTasks((data as Task[]) || []);
    setLoading(false);
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setMenuOpen(null);
  }

  async function updateStatus(task: Task, status: Task['status']) {
    await supabase.from('tasks').update({ status }).eq('id', task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
  }

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Tasks</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} tasks</p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Priority</option>
          {['urgent', 'high', 'medium', 'low'].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {/* Tasks list */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-white font-medium mb-1">No tasks found</h3>
          <p className="text-gray-500 text-sm">Create a task or adjust your filters.</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Task</div>
            <div className="col-span-2">Project</div>
            <div className="col-span-2">Assignee</div>
            <div className="col-span-1">Priority</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y divide-gray-700/50">
            {filtered.map((task) => {
              const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
              return (
                <div key={task.id} className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-gray-750 transition-colors items-center group">
                  {/* Title & due date */}
                  <div className="col-span-12 md:col-span-4">
                    <p className="text-sm text-white font-medium">{task.title}</p>
                    {task.due_date && (
                      <p className={`text-xs flex items-center gap-1 mt-1 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3" />
                        {isOverdue ? 'Overdue · ' : ''}
                        {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {/* Project */}
                  <div className="hidden md:flex col-span-2 items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.projects?.color || '#6b7280' }} />
                    <span className="text-xs text-gray-400 truncate">{task.projects?.name || '-'}</span>
                  </div>

                  {/* Assignee */}
                  <div className="hidden md:block col-span-2">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {task.assignee.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="text-xs text-gray-400 truncate">{task.assignee.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">Unassigned</span>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="hidden md:block col-span-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="hidden md:block col-span-2">
                    <select
                      value={task.status}
                      onChange={(e) => updateStatus(task, e.target.value as Task['status'])}
                      className="bg-gray-700 border border-gray-600 rounded text-xs text-white px-2 py-1 focus:outline-none focus:border-blue-500"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="hidden md:flex col-span-1 justify-end relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
                      className="text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all p-1 rounded"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === task.id && (
                      <div className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-10 py-1 min-w-32">
                        <button
                          onClick={() => { setEditingTask(task); setShowModal(true); setMenuOpen(null); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-600 w-full"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-600 w-full"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <TaskModal
          task={editingTask}
          projects={projects}
          onClose={() => { setShowModal(false); setEditingTask(null); }}
          onSaved={fetchTasks}
        />
      )}
    </div>
  );
}

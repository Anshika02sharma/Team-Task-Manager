import { useEffect, useState } from 'react';
import { Plus, MoreVertical, Pencil, Trash2, User } from 'lucide-react';
import { supabase, Task, Project, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TaskModal from '../components/TaskModal';

type Props = {
  project: Project;
  projects: Project[];
};

type Column = {
  id: Task['status'];
  label: string;
  color: string;
};

const COLUMNS: Column[] = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', label: 'Review', color: 'bg-yellow-500' },
  { id: 'done', label: 'Done', color: 'bg-green-500' },
];

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'text-red-400 bg-red-400/10',
  high: 'text-orange-400 bg-orange-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  low: 'text-green-400 bg-green-400/10',
};

export default function ProjectPage({ project, projects }: Props) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Task['status']>('todo');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [project.id]);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assignee_id_fkey(*)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    setTasks((data as Task[]) || []);
    setLoading(false);
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setMenuOpen(null);
  }

  async function moveTask(taskId: string, newStatus: Task['status']) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e: React.DragEvent, colId: Task['status']) {
    e.preventDefault();
    if (draggedId) moveTask(draggedId, colId);
    setDraggedId(null);
    setDragOverCol(null);
  }

  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="text-gray-400 text-sm mt-0.5">{project.description}</p>}
          </div>
        </div>
        <button
          onClick={() => { setEditingTask(null); setDefaultStatus('todo'); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${col.color}`} />
            <span className="text-xs text-gray-400">{col.label}: <span className="text-white font-medium">{tasks.filter((t) => t.status === col.id).length}</span></span>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`bg-gray-800/60 rounded-xl border transition-colors min-h-48 ${
                dragOverCol === col.id ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700'
              }`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.color}`} />
                  <span className="text-sm font-medium text-white">{col.label}</span>
                  <span className="text-xs text-gray-500 bg-gray-700 rounded-full px-1.5 py-0.5">{colTasks.length}</span>
                </div>
                <button
                  onClick={() => { setEditingTask(null); setDefaultStatus(col.id); setShowModal(true); }}
                  className="text-gray-600 hover:text-blue-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks */}
              <div className="p-2 space-y-2">
                {colTasks.map((task) => {
                  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
                  const assignee = task.assignee as Profile | undefined;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all group ${
                        draggedId === task.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white font-medium leading-tight flex-1">{task.title}</p>
                        <div className="relative shrink-0">
                          <button
                            onClick={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
                            className="text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {menuOpen === task.id && (
                            <div className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-10 py-1 min-w-28">
                              <button
                                onClick={() => { setEditingTask(task); setShowModal(true); setMenuOpen(null); }}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-600 w-full"
                              >
                                <Pencil className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-gray-600 w-full"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_STYLES[task.priority]}`}>
                          {task.priority}
                        </span>
                        <div className="flex items-center gap-2">
                          {task.due_date && (
                            <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                              {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {assignee ? (
                            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold" title={assignee.full_name}>
                              {assignee.full_name?.charAt(0) || '?'}
                            </div>
                          ) : (
                            <div className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-gray-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <TaskModal
          task={editingTask}
          projectId={project.id}
          projects={projects}
          onClose={() => { setShowModal(false); setEditingTask(null); }}
          onSaved={fetchTasks}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase, Task, Project, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  task?: Task | null;
  projectId?: string;
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
};

const STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export default function TaskModal({ task, projectId, projects, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<Task['status']>(task?.status || 'todo');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [selectedProjectId, setSelectedProjectId] = useState(task?.project_id || projectId || projects[0]?.id || '');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const [dueDate, setDueDate] = useState(task?.due_date || '');
  const [members, setMembers] = useState<Profile[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProjectId) fetchMembers(selectedProjectId);
  }, [selectedProjectId]);

  async function fetchMembers(pid: string) {
    const { data: proj } = await supabase
      .from('projects')
      .select('owner_id, profiles!projects_owner_id_fkey(*)')
      .eq('id', pid)
      .maybeSingle();

    const { data: memberData } = await supabase
      .from('project_members')
      .select('profiles(*)')
      .eq('project_id', pid);

    const ownerProfile = (proj as { profiles: Profile } | null)?.profiles;
    const memberProfiles = (memberData as { profiles: Profile }[] | null)?.map((m) => m.profiles) || [];

    const all: Profile[] = [];
    if (ownerProfile) all.push(ownerProfile);
    memberProfiles.forEach((p) => {
      if (!all.find((a) => a.id === p.id)) all.push(p);
    });
    setMembers(all);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!selectedProjectId) { setError('Select a project'); return; }
    setLoading(true);
    setError('');

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      project_id: selectedProjectId,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
    };

    if (task) {
      const { error: err } = await supabase.from('tasks').update(payload).eq('id', task.id);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { error: err } = await supabase.from('tasks').insert({ ...payload, creator_id: user!.id });
      if (err) { setError(err.message); setLoading(false); return; }
    }

    onSaved();
    onClose();
  }

  const labelClass = 'block text-xs font-medium text-gray-400 mb-1.5';
  const inputClass = 'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';
  const selectClass = inputClass;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Task['status'])} className={selectClass}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])} className={selectClass}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Project</label>
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={selectClass}>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Assignee</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={selectClass}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.id.slice(0, 8)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { CheckSquare, Clock, AlertCircle, TrendingUp, FolderOpen, ChevronRight } from 'lucide-react';
import { supabase, Task, Project } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  projects: Project[];
  onNavigate: (page: { type: 'project'; id: string }) => void;
};

type Stats = {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
};

export default function Dashboard({ projects, onNavigate }: Props) {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  async function fetchData() {
    const { data } = await supabase
      .from('tasks')
      .select('*, projects(*), assignee:profiles!tasks_assignee_id_fkey(*)')
      .or(`creator_id.eq.${user!.id},assignee_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
      .limit(20);

    const taskList = (data as Task[]) || [];
    setTasks(taskList);

    const today = new Date().toISOString().split('T')[0];
    setStats({
      total: taskList.length,
      todo: taskList.filter((t) => t.status === 'todo').length,
      inProgress: taskList.filter((t) => t.status === 'in_progress').length,
      done: taskList.filter((t) => t.status === 'done').length,
      overdue: taskList.filter((t) => t.due_date && t.due_date < today && t.status !== 'done').length,
    });
    setLoading(false);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const priorityColor = (p: string) => ({
    urgent: 'text-red-400 bg-red-400/10',
    high: 'text-orange-400 bg-orange-400/10',
    medium: 'text-yellow-400 bg-yellow-400/10',
    low: 'text-green-400 bg-green-400/10',
  }[p] || 'text-gray-400 bg-gray-400/10');

  const statusColor = (s: string) => ({
    todo: 'text-gray-400 bg-gray-400/10',
    in_progress: 'text-blue-400 bg-blue-400/10',
    review: 'text-yellow-400 bg-yellow-400/10',
    done: 'text-green-400 bg-green-400/10',
  }[s] || '');

  const statusLabel = (s: string) => ({
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
  }[s] || s);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const recentTasks = tasks.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-gray-400 mt-1">Here's what's happening with your projects today.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: stats.total, icon: CheckSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
          { label: 'Completed', value: stats.done, icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent tasks */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between p-5 border-b border-gray-700">
            <h2 className="font-semibold text-white">Recent Tasks</h2>
            <span className="text-xs text-gray-500">{tasks.length} total</span>
          </div>
          <div className="divide-y divide-gray-700/50">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No tasks yet. Create a project to get started.</p>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-gray-750 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{task.projects?.name || 'Unknown project'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(task.status)}`}>
                      {statusLabel(task.status)}
                    </span>
                    {task.due_date && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Projects list */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between p-5 border-b border-gray-700">
            <h2 className="font-semibold text-white">Projects</h2>
            <span className="text-xs text-gray-500">{projects.length} total</span>
          </div>
          <div className="divide-y divide-gray-700/50">
            {projects.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No projects yet</p>
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onNavigate({ type: 'project', id: project.id })}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-750 transition-colors text-left"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="flex-1 text-sm text-white truncate">{project.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

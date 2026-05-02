import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/TasksPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import ProjectPage from './pages/ProjectPage';
import CreateProjectModal from './components/CreateProjectModal';
import { supabase, Project } from './lib/supabase';

type Page = 'dashboard' | 'tasks' | 'team' | 'settings' | { type: 'project'; id: string };

function AppInner() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  async function fetchProjects() {
    setProjectsLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true });
    setProjects((data as Project[]) || []);
    setProjectsLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const activeProject =
    typeof currentPage === 'object' && currentPage.type === 'project'
      ? projects.find((p) => p.id === currentPage.id)
      : null;

  function renderPage() {
    if (activeProject) {
      return <ProjectPage project={activeProject} projects={projects} />;
    }
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            projects={projects}
            onNavigate={(page) => setCurrentPage(page)}
          />
        );
      case 'tasks':
        return <TasksPage projects={projects} />;
      case 'team':
        return <TeamPage projects={projects} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard projects={projects} onNavigate={(page) => setCurrentPage(page)} />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        projects={projects}
        onCreateProject={() => setShowCreateProject(true)}
      />

      {/* Main content */}
      <main className="flex-1 lg:ml-60 min-h-screen">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8 max-w-screen-2xl">
          {projectsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            renderPage()
          )}
        </div>
      </main>

      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onCreated={() => {
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

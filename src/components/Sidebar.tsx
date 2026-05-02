import { useState } from 'react';
import {
  CheckSquare, LayoutDashboard, FolderKanban, Users, Settings,
  ChevronDown, Plus, LogOut, X, Menu
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../lib/supabase';

type Page = 'dashboard' | 'tasks' | 'team' | 'settings' | { type: 'project'; id: string };

type Props = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  projects: Project[];
  onCreateProject: () => void;
};

export default function Sidebar({ currentPage, onNavigate, projects, onCreateProject }: Props) {
  const { profile, signOut } = useAuth();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (page: Page) => {
    if (typeof page === 'string' && typeof currentPage === 'string') return page === currentPage;
    if (typeof page === 'object' && typeof currentPage === 'object') return page.id === currentPage.id;
    return false;
  };

  const navItem = (label: string, page: Page, icon: React.ReactNode) => (
    <button
      key={label}
      onClick={() => { onNavigate(page); setMobileOpen(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive(page)
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <CheckSquare className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">TaskFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItem('Dashboard', 'dashboard', <LayoutDashboard className="w-4 h-4" />)}
        {navItem('My Tasks', 'tasks', <CheckSquare className="w-4 h-4" />)}
        {navItem('Team', 'team', <Users className="w-4 h-4" />)}

        {/* Projects section */}
        <div className="pt-4">
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
          >
            <span>Projects</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${projectsOpen ? '' : '-rotate-90'}`} />
          </button>
          {projectsOpen && (
            <div className="mt-1 space-y-0.5">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => { onNavigate({ type: 'project', id: project.id }); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive({ type: 'project', id: project.id })
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
              <button
                onClick={() => { onCreateProject(); setMobileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-blue-400 hover:bg-gray-800/50 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                New Project
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        {navItem('Settings', 'settings', <Settings className="w-4 h-4" />)}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{profile?.full_name || 'User'}</p>
          </div>
          <button
            onClick={signOut}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-white"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-gray-900 h-full z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-60 bg-gray-900 border-r border-gray-800 flex-col h-screen fixed left-0 top-0">
        {sidebarContent}
      </div>
    </>
  );
}

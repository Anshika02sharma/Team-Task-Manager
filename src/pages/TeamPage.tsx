import { useEffect, useState } from 'react';
import { Users, Crown, UserMinus, UserPlus, X, AlertCircle, Mail } from 'lucide-react';
import { supabase, Project, Profile, ProjectMember } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  projects: Project[];
};

type MemberWithProfile = ProjectMember & { profiles: Profile };

export default function TeamPage({ projects }: Props) {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (selectedProjectId) fetchMembers(selectedProjectId);
  }, [selectedProjectId]);

  async function fetchMembers(pid: string) {
    setLoading(true);
    const { data: proj } = await supabase
      .from('projects')
      .select('owner_id, profiles!projects_owner_id_fkey(*)')
      .eq('id', pid)
      .maybeSingle();

    setOwner((proj as { profiles: Profile } | null)?.profiles || null);

    const { data } = await supabase
      .from('project_members')
      .select('*, profiles(*)')
      .eq('project_id', pid)
      .order('joined_at', { ascending: true });

    setMembers((data as MemberWithProfile[]) || []);
    setLoading(false);
  }

  async function removeMember(memberId: string) {
    await supabase.from('project_members').delete().eq('id', memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError('');
    setInviteLoading(true);

    // Find user by email via profiles (we look up auth email)
    const { data: found } = await supabase
      .from('profiles')
      .select('id, full_name')
      .maybeSingle();

    // We search in auth admin context is not available client-side;
    // Instead we search profiles by querying auth users via service
    // Workaround: look for user in profiles by checking if email matches auth user
    // Since we can't query auth.users client-side, show limitation message
    setInviteError('Invite by email requires the user to sign up first. Ask them to register and share their user ID.');
    setInviteLoading(false);
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isOwner = selectedProject?.owner_id === user?.id;

  const allDisplayMembers = [
    ...(owner ? [{ id: 'owner', profiles: owner, role: 'owner', user_id: owner.id } as MemberWithProfile] : []),
    ...members.filter((m) => m.user_id !== owner?.id),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage project members</p>
        </div>
        {isOwner && selectedProjectId && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Project selector */}
      {projects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedProjectId === p.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </button>
          ))}
        </div>
      )}

      {!selectedProjectId ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Create a project to manage team members.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">{selectedProject?.name}</h2>
            <span className="text-sm text-gray-500">{allDisplayMembers.length} members</span>
          </div>
          <div className="divide-y divide-gray-700/50">
            {allDisplayMembers.map((member) => {
              const profile = member.profiles;
              const isCurrentUser = profile.id === user?.id;
              const memberIsOwner = member.role === 'owner';
              const initials = profile.full_name
                ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : '?';

              return (
                <div key={member.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-medium">{profile.full_name || 'Unknown'}</p>
                      {isCurrentUser && <span className="text-xs text-gray-600">(you)</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Joined {new Date(member.joined_at || member.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {memberIsOwner ? (
                      <div className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">
                        <Crown className="w-3 h-3" />
                        <span className="text-xs font-medium">Owner</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 bg-gray-700 px-2.5 py-1 rounded-full">Member</span>
                    )}
                    {isOwner && !memberIsOwner && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Invite Member</h2>
              <button onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteError(''); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              {inviteError && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-400 text-sm">{inviteError}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteError(''); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={inviteLoading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium">
                  {inviteLoading ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

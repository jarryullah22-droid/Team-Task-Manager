import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Returns the caller's role in a team, or null when they are not a member.
async function roleInTeam(teamId, userId) {
  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role ?? null;
}

// GET /teams - every team the current user belongs to, with members + task counts.
export const listTeams = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const { data: memberships, error: mErr } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId);
  if (mErr) throw mErr;

  const teamIds = memberships.map((m) => m.team_id);
  if (teamIds.length === 0) return res.json({ teams: [] });

  const [{ data: teams, error: tErr }, { data: members, error: memErr }, { data: tasks, error: taskErr }] =
    await Promise.all([
      supabase.from('teams').select('id, name, description, owner_id, created_at')
        .in('id', teamIds).order('created_at', { ascending: false }),
      supabase.from('team_members')
        .select('team_id, role, user:users!team_members_user_id_fkey(id, name, email)')
        .in('team_id', teamIds),
      supabase.from('tasks').select('id, team_id, status').in('team_id', teamIds),
    ]);

  if (tErr) throw tErr;
  if (memErr) throw memErr;
  if (taskErr) throw taskErr;

  const roleMap = Object.fromEntries(memberships.map((m) => [m.team_id, m.role]));

  const enriched = teams.map((team) => {
    const teamTasks = tasks.filter((t) => t.team_id === team.id);
    return {
      ...team,
      role: roleMap[team.id],
      members: members
        .filter((m) => m.team_id === team.id)
        .map((m) => ({ ...m.user, role: m.role })),
      task_counts: {
        total: teamTasks.length,
        todo: teamTasks.filter((t) => t.status === 'todo').length,
        in_progress: teamTasks.filter((t) => t.status === 'in_progress').length,
        done: teamTasks.filter((t) => t.status === 'done').length,
      },
    };
  });

  res.json({ teams: enriched });
});

// POST /teams
export const createTeam = asyncHandler(async (req, res) => {
  const { name, description = null } = req.body;
  const userId = req.user.id;

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ name, description, owner_id: userId })
    .select('id, name, description, owner_id, created_at')
    .single();
  if (error) throw error;

  // Creator automatically becomes the team admin.
  const { error: memberErr } = await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: userId, role: 'admin' });
  if (memberErr) throw memberErr;

  res.status(201).json({
    team: {
      ...team,
      role: 'admin',
      members: [{ id: userId, name: req.user.name, email: req.user.email, role: 'admin' }],
      task_counts: { total: 0, todo: 0, in_progress: 0, done: 0 },
    },
  });
});

// GET /teams/:id
export const getTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const role = await roleInTeam(id, req.user.id);
  if (!role) return res.status(403).json({ error: 'You are not a member of this team' });

  const { data: team, error } = await supabase
    .from('teams').select('id, name, description, owner_id, created_at').eq('id', id).single();
  if (error) throw error;

  const { data: members, error: memErr } = await supabase
    .from('team_members')
    .select('role, user:users!team_members_user_id_fkey(id, name, email)')
    .eq('team_id', id);
  if (memErr) throw memErr;

  res.json({
    team: { ...team, role, members: members.map((m) => ({ ...m.user, role: m.role })) },
  });
});

// POST /teams/:id/members
export const addMember = asyncHandler(async (req, res) => {
  const { id: teamId } = req.params;
  const { email, role = 'member' } = req.body;

  const callerRole = await roleInTeam(teamId, req.user.id);
  if (!callerRole) return res.status(403).json({ error: 'You are not a member of this team' });
  if (callerRole !== 'admin') {
    return res.status(403).json({ error: 'Only team admins can add members' });
  }

  const { data: user, error: userErr } = await supabase
    .from('users').select('id, name, email').eq('email', email).maybeSingle();
  if (userErr) throw userErr;
  if (!user) return res.status(404).json({ error: 'No user found with that email' });

  const { error } = await supabase
    .from('team_members')
    .upsert({ team_id: teamId, user_id: user.id, role }, { onConflict: 'team_id,user_id' });
  if (error) throw error;

  res.status(201).json({ member: { ...user, role } });
});

// DELETE /teams/:id/members/:userId
export const removeMember = asyncHandler(async (req, res) => {
  const { id: teamId, userId } = req.params;

  const callerRole = await roleInTeam(teamId, req.user.id);
  if (callerRole !== 'admin') {
    return res.status(403).json({ error: 'Only team admins can remove members' });
  }

  const { data: team } = await supabase.from('teams').select('owner_id').eq('id', teamId).maybeSingle();
  if (team && team.owner_id === userId) {
    return res.status(400).json({ error: 'The team owner cannot be removed' });
  }

  const { error } = await supabase
    .from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
  if (error) throw error;

  res.json({ message: 'Member removed' });
});

// DELETE /teams/:id
export const deleteTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: team } = await supabase.from('teams').select('owner_id').eq('id', id).maybeSingle();
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the team owner can delete the team' });
  }

  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;

  res.json({ message: 'Team deleted' });
});

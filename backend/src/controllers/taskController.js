import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Shared select shape: pulls in the assignee, creator and team names.
const TASK_SELECT = [
  'id', 'team_id', 'title', 'description', 'status', 'priority',
  'due_date', 'created_at', 'updated_at',
  'assignee:users!tasks_assignee_id_fkey(id, name, email)',
  'creator:users!tasks_created_by_fkey(id, name, email)',
  'team:teams(id, name)',
].join(', ');

async function roleInTeam(teamId, userId) {
  const { data, error } = await supabase
    .from('team_members').select('role')
    .eq('team_id', teamId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.role ?? null;
}

// GET /tasks?team_id=&assignee_id=&status=&priority=&search=
export const listTasks = asyncHandler(async (req, res) => {
  const { team_id, assignee_id, status, priority, search } = req.query;

  const { data: memberships, error: mErr } = await supabase
    .from('team_members').select('team_id').eq('user_id', req.user.id);
  if (mErr) throw mErr;

  const myTeamIds = memberships.map((m) => m.team_id);
  if (myTeamIds.length === 0) return res.json({ tasks: [] });

  if (team_id && !myTeamIds.includes(team_id)) {
    return res.status(403).json({ error: 'You are not a member of this team' });
  }

  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .in('team_id', team_id ? [team_id] : myTeamIds)
    .order('created_at', { ascending: false });

  if (assignee_id) query = query.eq('assignee_id', assignee_id);
  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) throw error;

  res.json({ tasks: data });
});

// POST /tasks
export const createTask = asyncHandler(async (req, res) => {
  const {
    team_id,
    title,
    description = null,
    status = 'todo',
    priority = 'medium',
    assignee_id = null,
    due_date = null,
  } = req.body;

  const role = await roleInTeam(team_id, req.user.id);
  if (!role) return res.status(403).json({ error: 'You are not a member of this team' });

  if (assignee_id && !(await roleInTeam(team_id, assignee_id))) {
    return res.status(400).json({ error: 'Assignee must be a member of the team' });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({ team_id, title, description, status, priority, assignee_id, due_date, created_by: req.user.id })
    .select(TASK_SELECT)
    .single();
  if (error) throw error;

  res.status(201).json({ task: data });
});

// GET /tasks/:id
export const getTask = asyncHandler(async (req, res) => {
  const { data: task, error } = await supabase
    .from('tasks').select(TASK_SELECT).eq('id', req.params.id).maybeSingle();
  if (error) throw error;
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!(await roleInTeam(task.team_id, req.user.id))) {
    return res.status(403).json({ error: 'You are not a member of this team' });
  }

  res.json({ task });
});

// PATCH /tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing, error: eErr } = await supabase
    .from('tasks').select('id, team_id').eq('id', id).maybeSingle();
  if (eErr) throw eErr;
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  if (!(await roleInTeam(existing.team_id, req.user.id))) {
    return res.status(403).json({ error: 'You are not a member of this team' });
  }

  const allowed = ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date'];
  const patch = {};
  for (const key of allowed) {
    if (key in req.body) patch[key] = req.body[key];
  }

  if ('assignee_id' in patch && patch.assignee_id) {
    if (!(await roleInTeam(existing.team_id, patch.assignee_id))) {
      return res.status(400).json({ error: 'Assignee must be a member of the team' });
    }
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('tasks').update(patch).eq('id', id).select(TASK_SELECT).single();
  if (error) throw error;

  res.json({ task: data });
});

// DELETE /tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing, error: eErr } = await supabase
    .from('tasks').select('id, team_id, created_by').eq('id', id).maybeSingle();
  if (eErr) throw eErr;
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const role = await roleInTeam(existing.team_id, req.user.id);
  if (!role) return res.status(403).json({ error: 'You are not a member of this team' });
  if (role !== 'admin' && existing.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Only the task creator or a team admin can delete this task' });
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;

  res.json({ message: 'Task deleted' });
});

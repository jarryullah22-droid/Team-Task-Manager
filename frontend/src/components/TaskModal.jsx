import { useEffect, useState } from 'react';

const EMPTY = {
  title: '',
  description: '',
  team_id: '',
  assignee_id: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
};

export default function TaskModal({ open, task, teams, defaultTeamId, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        team_id: task.team_id || '',
        assignee_id: task.assignee_id || task.assignee?.id || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        due_date: task.due_date ? String(task.due_date).slice(0, 10) : '',
      });
    } else {
      setForm({ ...EMPTY, team_id: defaultTeamId || '' });
    }
    setError('');
  }, [open, task, defaultTeamId]);

  if (!open) return null;

  const selectedTeam = teams.find((t) => t.id === form.team_id);
  const members = selectedTeam?.members || [];

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) return setError('Title is required');
    if (!form.team_id) return setError('Please choose a team');

    setBusy(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || null,
        team_id: form.team_id,
        assignee_id: form.assignee_id || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
      });
    } catch (err) {
      setError(err?.message || 'Could not save the task');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="card w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {task ? 'Edit task' : 'New task'}
          </h2>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            &#10005;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="task-title">Title</label>
            <input
              id="task-title"
              className="input"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Ship the login page"
            />
          </div>

          <div>
            <label className="label" htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              className="input min-h-[80px]"
              value={form.description}
              onChange={set('description')}
              placeholder="Add more detail..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="task-team">Team</label>
              <select
                id="task-team"
                className="input"
                value={form.team_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, team_id: e.target.value, assignee_id: '' }))
                }
              >
                <option value="">Select a team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="task-assignee">Assignee</label>
              <select
                id="task-assignee"
                className="input"
                value={form.assignee_id}
                onChange={set('assignee_id')}
                disabled={!form.team_id}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="task-status">Status</label>
              <select id="task-status" className="input" value={form.status} onChange={set('status')}>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="task-priority">Priority</label>
              <select id="task-priority" className="input" value={form.priority} onChange={set('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="task-due">Due date</label>
              <input
                id="task-due"
                type="date"
                className="input"
                value={form.due_date}
                onChange={set('due_date')}
              />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving...' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

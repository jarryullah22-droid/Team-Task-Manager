import { useState } from 'react';
import { teamsApi, getErrorMessage } from '../lib/api.js';

export default function TeamList({ teams, selectedTeamId, onSelect, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [memberEmail, setMemberEmail] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberBusy, setMemberBusy] = useState(false);

  const createTeam = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await teamsApi.create({ name, description: description || null });
      setName('');
      setDescription('');
      setShowForm(false);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    setMemberError('');
    setMemberBusy(true);
    try {
      await teamsApi.addMember(selectedTeamId, { email: memberEmail });
      setMemberEmail('');
      await onChanged();
    } catch (err) {
      setMemberError(getErrorMessage(err));
    } finally {
      setMemberBusy(false);
    }
  };

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <aside className="card flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Teams</h2>
        <button
          type="button"
          className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTeam} className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3">
          <input
            className="input"
            placeholder="Team name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating...' : 'Create team'}
          </button>
        </form>
      )}

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
            selectedTeamId === '' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          All teams
        </button>

        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => onSelect(team.id)}
            className={`w-full rounded-lg px-3 py-2 text-left ${
              selectedTeamId === team.id ? 'bg-brand-50' : 'hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">{team.name}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {team.task_counts?.total ?? 0}
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {team.members?.length ?? 0} member{(team.members?.length ?? 0) === 1 ? '' : 's'}
            </span>
          </button>
        ))}

        {teams.length === 0 && !showForm && (
          <p className="px-1 py-4 text-sm text-slate-500">
            No teams yet. Create your first team to start adding tasks.
          </p>
        )}
      </div>

      {selectedTeam && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Members of {selectedTeam.name}
          </h3>
          <ul className="mb-3 space-y-1">
            {selectedTeam.members?.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{m.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>

          {selectedTeam.role === 'admin' && (
            <form onSubmit={addMember} className="space-y-2">
              <input
                className="input"
                type="email"
                placeholder="Add member by email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                required
              />
              {memberError && <p className="text-xs text-red-600">{memberError}</p>}
              <button type="submit" className="btn-ghost w-full" disabled={memberBusy}>
                {memberBusy ? 'Adding...' : 'Add member'}
              </button>
            </form>
          )}
        </div>
      )}
    </aside>
  );
}

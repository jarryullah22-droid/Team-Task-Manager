export default function FilterBar({ teams, members, filters, onChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="card mb-4 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="filter-search">Search</label>
          <input
            id="filter-search"
            type="search"
            className="input"
            placeholder="Search by task title..."
            value={filters.search}
            onChange={set('search')}
          />
        </div>

        <div>
          <label className="label" htmlFor="filter-team">Team</label>
          <select id="filter-team" className="input" value={filters.teamId} onChange={set('teamId')}>
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-assignee">Assignee</label>
          <select
            id="filter-assignee"
            className="input"
            value={filters.assigneeId}
            onChange={set('assigneeId')}
          >
            <option value="">Anyone</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-status">Status</label>
          <select id="filter-status" className="input" value={filters.status} onChange={set('status')}>
            <option value="">All statuses</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
          onClick={() => onChange({ search: '', teamId: '', assigneeId: '', status: '' })}
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

const PRIORITY_STYLES = {
  low: 'bg-sky-100 text-sky-700',
  medium: 'bg-indigo-100 text-indigo-700',
  high: 'bg-rose-100 text-rose-700',
};

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

export default function TaskList({ tasks, onEdit, onDelete, onStatusChange, busyId }) {
  if (tasks.length === 0) {
    return (
      <div className="card grid place-items-center p-10 text-center">
        <p className="text-sm font-medium text-slate-600">No tasks match your filters.</p>
        <p className="mt-1 text-xs text-slate-400">Try adjusting the search or create a new task.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => (
        <article key={task.id} className="card flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{task.title}</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_STYLES[task.priority] || ''}`}>
              {task.priority}
            </span>
          </div>

          {task.description && (
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">{task.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLES[task.status] || ''}`}>
              {STATUS_LABELS[task.status] || task.status}
            </span>
            {task.team?.name && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                {task.team.name}
              </span>
            )}
            {formatDate(task.due_date) && (
              <span className="text-slate-500">Due {formatDate(task.due_date)}</span>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Assignee:{' '}
            <span className="font-medium text-slate-700">
              {task.assignee?.name || 'Unassigned'}
            </span>
          </p>

          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
            <select
              className="input !w-auto flex-1 py-1 text-xs"
              value={task.status}
              disabled={busyId === task.id}
              onChange={(e) => onStatusChange(task, e.target.value)}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => onEdit(task)}>
              Edit
            </button>
            <button
              type="button"
              className="btn-danger px-2 py-1 text-xs"
              disabled={busyId === task.id}
              onClick={() => onDelete(task)}
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import TeamList from '../components/TeamList.jsx';
import TaskList from '../components/TaskList.jsx';
import TaskModal from '../components/TaskModal.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { teamsApi, tasksApi, getErrorMessage } from '../lib/api.js';

const EMPTY_FILTERS = { search: '', teamId: '', assigneeId: '', status: '' };

export default function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadTeams = useCallback(async () => {
    const { teams: list } = await teamsApi.list();
    setTeams(list);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    setError('');
    try {
      const params = {};
      if (filters.teamId) params.team_id = filters.teamId;
      if (filters.assigneeId) params.assignee_id = filters.assigneeId;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const { tasks: list } = await tasksApi.list(params);
      setTasks(list);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingTasks(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTeams().catch((err) => setError(getErrorMessage(err)));
  }, [loadTeams]);

  // Debounce the search box so we do not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(loadTasks, filters.search ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadTasks, filters.search]);

  // Assignees available for the current filter context.
  const members = useMemo(() => {
    const source = filters.teamId
      ? teams.filter((t) => t.id === filters.teamId)
      : teams;
    const map = new Map();
    source.forEach((team) => (team.members || []).forEach((m) => map.set(m.id, m)));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, filters.teamId]);

  const openCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const saveTask = async (payload) => {
    try {
      if (editingTask) {
        await tasksApi.update(editingTask.id, payload);
      } else {
        await tasksApi.create(payload);
      }
      setModalOpen(false);
      setEditingTask(null);
      await Promise.all([loadTasks(), loadTeams()]);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setBusyId(task.id);
    try {
      await tasksApi.remove(task.id);
      await Promise.all([loadTasks(), loadTeams()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (task, status) => {
    setBusyId(task.id);
    try {
      await tasksApi.update(task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
      loadTeams().catch(() => {});
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const refreshTeams = async () => {
    await loadTeams();
    await loadTasks();
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">
              {totalTasks} task{totalTasks === 1 ? '' : 's'} shown · {doneTasks} done
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={openCreate}
            disabled={teams.length === 0}
            title={teams.length === 0 ? 'Create a team first' : ''}
          >
            + New task
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <TeamList
            teams={teams}
            selectedTeamId={filters.teamId}
            onSelect={(teamId) => setFilters((f) => ({ ...f, teamId, assigneeId: '' }))}
            onChanged={refreshTeams}
          />

          <section>
            <FilterBar teams={teams} members={members} filters={filters} onChange={setFilters} />

            {loadingTasks ? (
              <div className="card grid place-items-center p-10">
                <span className="h-6 w-6 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              </div>
            ) : (
              <TaskList
                tasks={tasks}
                busyId={busyId}
                onEdit={openEdit}
                onDelete={deleteTask}
                onStatusChange={changeStatus}
              />
            )}
          </section>
        </div>
      </main>

      <TaskModal
        open={modalOpen}
        task={editingTask}
        teams={teams}
        defaultTeamId={filters.teamId}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={saveTask}
      />
    </div>
  );
}

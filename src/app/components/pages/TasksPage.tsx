import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useNavigation } from '@/app/contexts/NavigationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Plus, Loader2, Pencil, Trash2, MessageSquare, RefreshCw, ClipboardList } from 'lucide-react';
import { apiRequest } from '@/lib/api';

type TaskPriority = 'low' | 'medium' | 'high';
type TaskStatus = 'pending' | 'in-progress' | 'reviewing' | 'revision' | 'completed';
type TaskFilter = 'all' | TaskStatus;
type TaskSort = 'deadline-asc' | 'deadline-desc' | 'priority-desc' | 'priority-asc' | 'status';

interface Task {
  id: number;
  title: string;
  description: string;
  assignedToId: number;
  assignedToName: string;
  assignedById: number;
  assignedByName: string;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
}

interface InternOption {
  id: number;
  name: string;
}

interface TaskFormState {
  title: string;
  description: string;
  assignedToId: string;
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
}

const initialFormState: TaskFormState = {
  title: '',
  description: '',
  assignedToId: '',
  deadline: '',
  priority: 'medium',
  status: 'pending',
};

const taskBoardColumns: Array<{
  status: TaskStatus;
  title: string;
  tone: string;
  countTone: string;
  emptyLabel: string;
  surface: string;
  border: string;
}> = [
  {
    status: 'pending',
    title: 'To Do',
    tone: 'bg-violet-500',
    countTone: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    emptyLabel: 'No tasks waiting to start.',
    surface: 'bg-violet-50/50',
    border: 'border-violet-200',
  },
  {
    status: 'in-progress',
    title: 'In Progress',
    tone: 'bg-amber-500',
    countTone: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    emptyLabel: 'Nothing actively in progress.',
    surface: 'bg-amber-50/50',
    border: 'border-amber-200',
  },
  {
    status: 'reviewing',
    title: 'Reviewing',
    tone: 'bg-sky-500',
    countTone: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    emptyLabel: 'No tasks waiting for review.',
    surface: 'bg-sky-50/50',
    border: 'border-sky-200',
  },
  {
    status: 'revision',
    title: 'Revision',
    tone: 'bg-rose-500',
    countTone: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    emptyLabel: 'No tasks sent back for revision.',
    surface: 'bg-rose-50/50',
    border: 'border-rose-200',
  },
  {
    status: 'completed',
    title: 'Done',
    tone: 'bg-emerald-500',
    countTone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    emptyLabel: 'No completed tasks yet.',
    surface: 'bg-emerald-50/50',
    border: 'border-emerald-200',
  },
];

function updateTaskFormField(
  setFormData: React.Dispatch<React.SetStateAction<TaskFormState>>,
  field: keyof TaskFormState,
  value: string,
) {
  setFormData((current) => ({ ...current, [field]: value }));
}

function formatStatusLabel(status: TaskStatus) {
  return status === 'in-progress'
    ? 'In Progress'
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function parseTaskDeadline(deadline: string) {
  const trimmed = deadline.trim();

  if (!trimmed) {
    return null;
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTaskDeadlineInputValue(deadline: string | null) {
  if (!deadline) {
    return '';
  }

  const dateOnlyMatch = String(deadline).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const parsed = parseTaskDeadline(String(deadline));

  if (!parsed) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTaskDeadline(deadline: string | null, options: Intl.DateTimeFormatOptions) {
  if (!deadline) {
    return 'No deadline';
  }

  const parsed = parseTaskDeadline(deadline);

  if (!parsed) {
    return 'No deadline';
  }

  return parsed.toLocaleDateString('en-US', options);
}

export function TasksPage() {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interns, setInterns] = useState<InternOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskStatusDraft, setTaskStatusDraft] = useState<TaskStatus>('pending');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskFilter>('all');
  const [sortBy, setSortBy] = useState<TaskSort>('deadline-asc');
  const [searchQuery, setSearchQuery] = useState('');

  const isSupervisorView = user?.role === 'supervisor' || user?.role === 'admin';

  const loadTasks = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await apiRequest<{ tasks: Task[] }>('/tasks');
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInterns = async () => {
    if (!isSupervisorView) {
      return;
    }

    try {
      const data = await apiRequest<{ interns: InternOption[] }>('/tasks/interns');
      setInterns(data.interns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interns.');
    }
  };

  useEffect(() => {
    loadTasks();
    loadInterns();
  }, [user?.role]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'reviewing':
        return 'secondary';
      case 'revision':
        return 'destructive';
      case 'in-progress':
        return 'default';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  const getDeadlinePillClasses = (task: Task) => {
    if (!task.deadline) {
      return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = parseTaskDeadline(task.deadline);

    if (!deadline) {
      return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
    }

    deadline.setHours(0, 0, 0, 0);

    if (deadline.getTime() < today.getTime() && task.status !== 'completed') {
      return 'bg-rose-100 text-rose-700 ring-1 ring-rose-200';
    }

    return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
  };

  const getPriorityChipClasses = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
      case 'medium':
        return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    }
  };

  const getPriorityWeight = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
      default:
        return 1;
    }
  };

  const getSortableTaskDate = (task: Task) => {
    const parsed = parseTaskDeadline(task.deadline ?? task.createdAt);
    return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
  };

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    inProgress: tasks.filter((task) => task.status === 'in-progress').length,
    reviewing: tasks.filter((task) => task.status === 'reviewing').length,
    revision: tasks.filter((task) => task.status === 'revision').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);

  const filterCounts: Record<TaskFilter, number> = {
    all: stats.total,
    pending: stats.pending,
    'in-progress': stats.inProgress,
    reviewing: stats.reviewing,
    revision: stats.revision,
    completed: stats.completed,
  };

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const statusScopedTasks = statusFilter === 'all'
      ? tasks
      : tasks.filter((task) => task.status === statusFilter);

    const searchScopedTasks = normalizedQuery
      ? statusScopedTasks.filter((task) =>
          task.title.toLowerCase().includes(normalizedQuery)
          || task.description.toLowerCase().includes(normalizedQuery)
          || task.assignedToName.toLowerCase().includes(normalizedQuery)
          || task.assignedByName.toLowerCase().includes(normalizedQuery),
        )
      : statusScopedTasks;

    return searchScopedTasks
      .slice()
      .sort((left, right) => {
        if (sortBy === 'priority-desc') {
          return getPriorityWeight(right.priority) - getPriorityWeight(left.priority);
        }

        if (sortBy === 'priority-asc') {
          return getPriorityWeight(left.priority) - getPriorityWeight(right.priority);
        }

        if (sortBy === 'status') {
          return formatStatusLabel(left.status).localeCompare(formatStatusLabel(right.status));
        }

        const leftTime = getSortableTaskDate(left);
        const rightTime = getSortableTaskDate(right);

        return sortBy === 'deadline-desc'
          ? rightTime - leftTime
          : leftTime - rightTime;
      });
  }, [tasks, statusFilter, searchQuery, sortBy]);

  const renderTaskDialog = (task: Task, trigger: React.ReactNode) => (
    <Dialog key={task.id} onOpenChange={(open) => (!open ? setSelectedTask(null) : openTaskDetails(task))}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>Task Details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Description</Label>
            <p className="mt-2 text-sm text-gray-600">{task.description || 'No description provided.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <p className="mt-2 text-sm">
                <Badge variant={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </p>
            </div>
            <div>
              <Label>Status</Label>
              <p className="mt-2 text-sm">
                <Badge variant={getStatusColor(task.status)}>
                  {formatStatusLabel(task.status)}
                </Badge>
              </p>
            </div>
          </div>
          <div>
            <Label>Assigned To</Label>
            <p className="mt-2 text-sm text-gray-600">{task.assignedToName}</p>
          </div>
          {isSupervisorView && (
            <div>
              <Label>Assigned By</Label>
              <p className="mt-2 text-sm text-gray-600">{task.assignedByName}</p>
            </div>
          )}
          <div>
            <Label>Deadline</Label>
            <p className="mt-2 text-sm text-gray-600">
              {formatTaskDeadline(task.deadline, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {!isSupervisorView && task.status !== 'completed' && selectedTask?.id === task.id && (
            <div className="space-y-2 border-t pt-4">
              <Label>Update Status</Label>
                <Select value={taskStatusDraft} onValueChange={(value: TaskStatus) => setTaskStatusDraft(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="reviewing">Submit for Review</SelectItem>
                    <SelectItem value="revision">Needs Revision</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          {!isSupervisorView && task.status !== 'completed' && selectedTask?.id === task.id && (
            <Button onClick={handleUpdateTaskStatus}>Update Status</Button>
          )}
          {isSupervisorView && (
            <>
              <Button variant="outline" onClick={() => openEditDialog(task)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteTask(task)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const openCreateDialog = () => {
    setEditingTask(null);
    setFormData(initialFormState);
    setError('');
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description ?? '',
      assignedToId: String(task.assignedToId),
      deadline: getTaskDeadlineInputValue(task.deadline),
      priority: task.priority,
      status: task.status,
    });
    setError('');
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingTask(null);
    setFormData(initialFormState);
    setError('');
  };

  const handleSubmitTask = async () => {
    setIsSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        assignedToId: Number(formData.assignedToId),
      };

      if (editingTask) {
        await apiRequest(`/tasks/${editingTask.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      closeDialog();
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    const confirmed = window.confirm(`Delete task "${task.title}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/tasks/${task.id}`, { method: 'DELETE' });

      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }

      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task.');
    }
  };

  const handleUpdateTaskStatus = async () => {
    if (!selectedTask) {
      return;
    }

    try {
      await apiRequest(`/tasks/${selectedTask.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: taskStatusDraft,
        }),
      });

      await loadTasks();
      setSelectedTask((current) => (current ? { ...current, status: taskStatusDraft } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status.');
    }
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setTaskStatusDraft(task.status);
    setError('');
  };

  return (
    <div className="p-6 space-y-6">
      {error && !isCreateDialogOpen && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex w-full flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
                <div className="min-w-[200px] space-y-1">
                  <Label htmlFor="task-filter" className="text-xs text-muted-foreground">Filter</Label>
                  <Select value={statusFilter} onValueChange={(value: TaskFilter) => setStatusFilter(value)}>
                    <SelectTrigger id="task-filter" className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ({filterCounts.all})</SelectItem>
                      <SelectItem value="pending">To Do ({filterCounts.pending})</SelectItem>
                      <SelectItem value="in-progress">In Progress ({filterCounts['in-progress']})</SelectItem>
                      <SelectItem value="reviewing">Reviewing ({filterCounts.reviewing})</SelectItem>
                      <SelectItem value="revision">Revision ({filterCounts.revision})</SelectItem>
                      <SelectItem value="completed">Done ({filterCounts.completed})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[220px] space-y-1">
                  <Label htmlFor="task-sort" className="text-xs text-muted-foreground">Sort cards by</Label>
                  <Select value={sortBy} onValueChange={(value: TaskSort) => setSortBy(value)}>
                    <SelectTrigger id="task-sort" className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deadline-asc">Deadline, nearest first</SelectItem>
                      <SelectItem value="deadline-desc">Deadline, farthest first</SelectItem>
                      <SelectItem value="priority-desc">Priority, highest first</SelectItem>
                      <SelectItem value="priority-asc">Priority, lowest first</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="w-full max-w-[360px] space-y-1">
                <Label htmlFor="task-search" className="text-xs text-muted-foreground">Search tasks</Label>
                <Input
                  id="task-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, details, or assignee"
                  className="bg-white"
                />
              </div>
            </div>
            {isSupervisorView && (
              <div className="xl:pl-6">
                <Label className="text-xs text-transparent select-none">Create</Label>
                <>
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                  <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (!open ? closeDialog() : setIsCreateDialogOpen(true))}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                        <DialogDescription>
                          {editingTask ? 'Update the task details.' : 'Assign a new task to an intern.'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="task-title">Task Title</Label>
                          <Input
                            id="task-title"
                            placeholder="Enter task title"
                            value={formData.title}
                            onChange={(e) => updateTaskFormField(setFormData, 'title', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="task-description">Description</Label>
                          <Textarea
                            id="task-description"
                            placeholder="Describe the task"
                            rows={4}
                            value={formData.description}
                            onChange={(e) => updateTaskFormField(setFormData, 'description', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="assign-to">Assign To</Label>
                            <Select value={formData.assignedToId} onValueChange={(value) => updateTaskFormField(setFormData, 'assignedToId', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select intern" />
                              </SelectTrigger>
                              <SelectContent>
                                {interns.map((intern) => (
                                  <SelectItem key={intern.id} value={String(intern.id)}>
                                    {intern.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deadline">Deadline</Label>
                            <Input
                              id="deadline"
                              type="date"
                              value={formData.deadline}
                              onChange={(e) => updateTaskFormField(setFormData, 'deadline', e.target.value)}
                              onInput={(e) => updateTaskFormField(setFormData, 'deadline', e.currentTarget.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select value={formData.priority} onValueChange={(value: TaskPriority) => updateTaskFormField(setFormData, 'priority', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={formData.status} onValueChange={(value: TaskStatus) => updateTaskFormField(setFormData, 'status', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="reviewing">Reviewing</SelectItem>
                                <SelectItem value="revision">Revision</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {error && (
                          <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                            {error}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
                          Cancel
                        </Button>
                        <Button onClick={handleSubmitTask} disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editingTask ? 'Save Changes' : 'Create Task'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading tasks...
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-base font-medium text-foreground">
                    {isSupervisorView ? 'No tasks match this view yet' : 'No tasks assigned yet'}
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    {isSupervisorView
                      ? 'Adjust the filters or create a task to build out your department workload.'
                      : 'Your supervisor has not assigned any work yet. Check messages for updates or refresh this page in a moment.'}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {!isSupervisorView && (
                      <Button variant="outline" onClick={() => navigate('messages')}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Check Messages
                      </Button>
                    )}
                    <Button variant={isSupervisorView ? 'default' : 'outline'} onClick={loadTasks}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Tasks
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-0 xl:grid-cols-5 md:grid-cols-2 overflow-hidden rounded-2xl border bg-white items-stretch">
                    {taskBoardColumns.map((column) => {
                      const columnTasks = filteredTasks.filter((task) => task.status === column.status);

                      return (
                        <div
                          key={column.status}
                          className={`min-w-0 ${column.surface} ${column.border} flex h-full min-h-[300px] flex-col border-r last:border-r-0`}
                        >
                          <div className={`${column.tone} px-4 py-3 text-white`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-base font-semibold">{column.title}</p>
                              </div>
                              <div className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                                {columnTasks.length}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 bg-[linear-gradient(to_bottom,transparent_47px,#e5e7eb_48px)] bg-[length:100%_48px]">
                            {columnTasks.length === 0 ? (
                              <div className="flex h-full min-h-[220px] items-center justify-center px-4 py-6 text-center text-sm text-slate-500">
                                {column.emptyLabel}
                              </div>
                            ) : (
                              columnTasks.map((task) =>
                                renderTaskDialog(
                                  task,
                                  <button
                                    type="button"
                                    className="m-2 w-[calc(100%-1rem)] rounded-lg border border-white bg-white px-3 py-2.5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-colors hover:border-slate-300 hover:bg-slate-50/80"
                                  >
                                    <div className="space-y-1.5">
                                      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                                        <div className="min-w-0">
                                          <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{task.title}</h4>
                                        </div>
                                        <Badge variant={getPriorityColor(task.priority)} className="self-start">
                                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                        </Badge>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                        <span className={`inline-flex rounded-md px-2 py-0.5 font-medium ${getPriorityChipClasses(task.priority)}`}>
                                          {task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'}
                                        </span>
                                        <span className={`inline-flex rounded-md px-2 py-0.5 font-medium ${getDeadlinePillClasses(task)}`}>
                                          {task.deadline ? formatTaskDeadline(task.deadline, { month: 'short', day: 'numeric' }) : 'No deadline'}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-[1fr_auto] items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                                        <div className="flex min-w-0 items-center gap-2">
                                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-700">
                                            {(isSupervisorView ? task.assignedToName : task.assignedByName)
                                              .split(' ')
                                              .map((part) => part[0])
                                              .slice(0, 2)
                                              .join('')
                                              .toUpperCase()}
                                          </div>
                                          <span className="truncate">
                                            {isSupervisorView ? task.assignedToName : task.assignedByName}
                                          </span>
                                        </div>
                                        <span>{formatTaskDeadline(task.createdAt, { month: 'short', day: 'numeric' })}</span>
                                      </div>
                                    </div>
                                  </button>,
                                ),
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

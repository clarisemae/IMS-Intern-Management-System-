import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Plus, Calendar, User, AlertCircle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';

type TaskPriority = 'low' | 'medium' | 'high';
type TaskStatus = 'pending' | 'in-progress' | 'completed';

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

export function TasksPage() {
  const { user } = useAuth();
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

  const filterTasksByStatus = (status: string) => {
    if (status === 'all') {
      return tasks;
    }

    return tasks.filter((task) => task.status === status);
  };

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
      case 'in-progress':
        return 'default';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    inProgress: tasks.filter((task) => task.status === 'in-progress').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);

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
      deadline: task.deadline ? String(task.deadline).slice(0, 10) : '',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Tasks</h1>
          <p className="mt-1 text-gray-600">
            {isSupervisorView ? 'Manage and assign tasks to interns' : 'View and manage your assigned tasks'}
          </p>
        </div>
        {isSupervisorView && (
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
                      onChange={(e) => setFormData((current) => ({ ...current, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea
                      id="task-description"
                      placeholder="Describe the task"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assign-to">Assign To</Label>
                      <Select value={formData.assignedToId} onValueChange={(value) => setFormData((current) => ({ ...current, assignedToId: value }))}>
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
                        onChange={(e) => setFormData((current) => ({ ...current, deadline: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={formData.priority} onValueChange={(value: TaskPriority) => setFormData((current) => ({ ...current, priority: value }))}>
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
                      <Select value={formData.status} onValueChange={(value: TaskStatus) => setFormData((current) => ({ ...current, status: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
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
        )}
      </div>

      {error && !isCreateDialogOpen && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Tasks</p>
            <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="mt-2 text-3xl font-semibold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="mt-2 text-3xl font-semibold">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="mt-2 text-3xl font-semibold">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <CardDescription>View and manage tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading tasks...
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              {['all', 'pending', 'in-progress', 'completed'].map((status) => (
                <TabsContent key={status} value={status} className="mt-4 space-y-3">
                  {filterTasksByStatus(status).map((task) => (
                    <Dialog key={task.id} onOpenChange={(open) => (!open ? setSelectedTask(null) : openTaskDetails(task))}>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50">
                          <div className="mb-3 flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="mb-2 text-lg font-medium">{task.title}</h4>
                              <p className="line-clamp-2 text-sm text-gray-600">{task.description || 'No description provided.'}</p>
                            </div>
                            <div className="ml-4">
                              <Badge variant={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{task.assignedToName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</span>
                            </div>
                            <Badge variant={getStatusColor(task.status)}>
                              {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
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
                                  {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
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
                              {task.deadline
                                ? new Date(task.deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                                : 'No deadline'}
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
                                  <SelectItem value="completed">Completed</SelectItem>
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
                  ))}
                  {filterTasksByStatus(status).length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                      <AlertCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>No tasks found</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

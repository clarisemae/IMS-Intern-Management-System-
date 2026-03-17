import React, { useState } from 'react';
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
import { Plus, Calendar, User, AlertCircle } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description: string;
  assignedTo?: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
}

export function TasksPage() {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Mock tasks data
  const tasks: Task[] = [
    {
      id: 1,
      title: 'Complete project documentation',
      description: 'Write comprehensive documentation for the internship management system',
      assignedTo: user?.role === 'supervisor' ? 'John Intern' : undefined,
      deadline: '2026-02-05',
      priority: 'high',
      status: 'in-progress',
    },
    {
      id: 2,
      title: 'Review codebase for bugs',
      description: 'Perform thorough code review and identify potential issues',
      assignedTo: user?.role === 'supervisor' ? 'John Intern' : undefined,
      deadline: '2026-02-03',
      priority: 'medium',
      status: 'pending',
    },
    {
      id: 3,
      title: 'Attend team meeting',
      description: 'Weekly team sync-up meeting',
      assignedTo: user?.role === 'supervisor' ? 'John Intern' : undefined,
      deadline: '2026-02-01',
      priority: 'low',
      status: 'pending',
    },
    {
      id: 4,
      title: 'Database schema optimization',
      description: 'Optimize database queries for better performance',
      assignedTo: user?.role === 'supervisor' ? 'Sarah Lee' : undefined,
      deadline: '2026-02-08',
      priority: 'high',
      status: 'completed',
    },
  ];

  const filterTasksByStatus = (status: string) => {
    if (status === 'all') return tasks;
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'default';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Tasks</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'supervisor' ? 'Manage and assign tasks to interns' : 'View and manage your assigned tasks'}
          </p>
        </div>
        {user?.role === 'supervisor' && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Assign a new task to an intern
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Task Title</Label>
                  <Input id="task-title" placeholder="Enter task title" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea id="task-description" placeholder="Describe the task" rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assign-to">Assign To</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select intern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intern1">John Intern</SelectItem>
                        <SelectItem value="intern2">Sarah Lee</SelectItem>
                        <SelectItem value="intern3">Mike Johnson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select>
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
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Tasks</p>
            <p className="text-3xl font-semibold mt-2">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-semibold mt-2">{tasks.filter(t => t.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-3xl font-semibold mt-2">{tasks.filter(t => t.status === 'in-progress').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-3xl font-semibold mt-2">{tasks.filter(t => t.status === 'completed').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <CardDescription>View and manage tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            {['all', 'pending', 'in-progress', 'completed'].map((status) => (
              <TabsContent key={status} value={status} className="space-y-3 mt-4">
                {filterTasksByStatus(status).map((task) => (
                  <Dialog key={task.id}>
                    <DialogTrigger asChild>
                      <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-lg mb-2">{task.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                          </div>
                          <div className="ml-4">
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {task.assignedTo && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{task.assignedTo}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(task.deadline).toLocaleDateString()}</span>
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
                          <p className="text-sm text-gray-600 mt-2">{task.description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Priority</Label>
                            <p className="text-sm mt-2">
                              <Badge variant={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </p>
                          </div>
                          <div>
                            <Label>Status</Label>
                            <p className="text-sm mt-2">
                              <Badge variant={getStatusColor(task.status)}>
                                {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                              </Badge>
                            </p>
                          </div>
                        </div>
                        {task.assignedTo && (
                          <div>
                            <Label>Assigned To</Label>
                            <p className="text-sm text-gray-600 mt-2">{task.assignedTo}</p>
                          </div>
                        )}
                        <div>
                          <Label>Deadline</Label>
                          <p className="text-sm text-gray-600 mt-2">{new Date(task.deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        {user?.role === 'intern' && task.status !== 'completed' && (
                          <div className="space-y-2 pt-4 border-t">
                            <Label>Update Status</Label>
                            <Select defaultValue={task.status}>
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
                        {user?.role === 'intern' && task.status !== 'completed' && (
                          <Button>Update Status</Button>
                        )}
                        {user?.role === 'supervisor' && (
                          <>
                            <Button variant="outline">Edit</Button>
                            <Button variant="destructive">Delete</Button>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
                {filterTasksByStatus(status).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks found</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

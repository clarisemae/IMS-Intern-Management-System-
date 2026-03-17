import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Clock, ListTodo, FileText, Bell, CheckCircle2, AlertCircle, Timer } from 'lucide-react';
import { Progress } from '@/app/components/ui/progress';

export function InternDashboard() {
  const { user } = useAuth();

  // Mock data
  const attendance = {
    status: 'clocked-in',
    timeIn: '09:00 AM',
    timeOut: null,
    totalHours: 156.5,
  };

  const tasks = [
    { id: 1, title: 'Complete project documentation', deadline: '2026-02-05', priority: 'high', status: 'in-progress' },
    { id: 2, title: 'Review codebase for bugs', deadline: '2026-02-03', priority: 'medium', status: 'pending' },
    { id: 3, title: 'Attend team meeting', deadline: '2026-02-01', priority: 'low', status: 'pending' },
  ];

  const notifications = [
    { id: 1, message: 'New task assigned: Complete project documentation', time: '2 hours ago' },
    { id: 2, message: 'Supervisor commented on your report', time: '5 hours ago' },
    { id: 3, message: 'Weekly report due tomorrow', time: '1 day ago' },
  ];

  const stats = [
    { label: 'Hours Completed', value: '156.5', icon: Clock, color: 'text-purple-600' },
    { label: 'Tasks Completed', value: '24', icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Pending Tasks', value: '6', icon: AlertCircle, color: 'text-yellow-600' },
    { label: 'Hours This Week', value: '38', icon: Timer, color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600 mt-1">
          {user?.department ? `${user.department} Department - ` : ''}Here's what's happening with your internship today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-semibold mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-50 ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Status */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today's Attendance</CardTitle>
                  <CardDescription>Saturday, January 31, 2026</CardDescription>
                </div>
                <Badge variant={attendance.status === 'clocked-in' ? 'default' : 'secondary'}>
                  {attendance.status === 'clocked-in' ? 'Clocked In' : 'Clocked Out'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Time In</p>
                  <p className="text-2xl font-semibold text-green-700">{attendance.timeIn}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Time Out</p>
                  <p className="text-2xl font-semibold text-gray-700">
                    {attendance.timeOut || '--:--'}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Total Hours Rendered</p>
                  <p className="text-sm font-medium">{attendance.totalHours} hrs</p>
                </div>
                <Progress value={78} className="h-2" />
                <p className="text-xs text-gray-500 mt-2">78% of required 200 hours completed</p>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assigned Tasks</CardTitle>
                  <CardDescription>Your current workload</CardDescription>
                </div>
                <Button variant="outline" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline">
                            {task.status === 'in-progress' ? 'In Progress' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Due</p>
                        <p className="text-sm font-medium">{new Date(task.deadline).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="pb-4 border-b last:border-0 last:pb-0">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="w-4 h-4 mr-2" />
                Clock Out
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <ListTodo className="w-4 h-4 mr-2" />
                View All Tasks
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Submit Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
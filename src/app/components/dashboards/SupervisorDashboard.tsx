import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Users, CheckCircle2, Clock, FileText, TrendingUp, AlertTriangle } from 'lucide-react';

export function SupervisorDashboard() {
  const { user } = useAuth();

  // Mock data
  const interns = [
    { 
      id: 1, 
      name: 'John Intern', 
      status: 'active', 
      hoursCompleted: 156.5, 
      totalHours: 200,
      tasksCompleted: 24,
      pendingTasks: 6,
      attendance: 95
    },
    { 
      id: 2, 
      name: 'Sarah Lee', 
      status: 'active', 
      hoursCompleted: 142.0, 
      totalHours: 200,
      tasksCompleted: 18,
      pendingTasks: 4,
      attendance: 92
    },
    { 
      id: 3, 
      name: 'Mike Johnson', 
      status: 'active', 
      hoursCompleted: 168.5, 
      totalHours: 200,
      tasksCompleted: 31,
      pendingTasks: 3,
      attendance: 98
    },
    { 
      id: 4, 
      name: 'Emma Davis', 
      status: 'active', 
      hoursCompleted: 134.0, 
      totalHours: 200,
      tasksCompleted: 15,
      pendingTasks: 8,
      attendance: 88
    },
  ];

  const pendingReports = [
    { id: 1, intern: 'John Intern', type: 'Daily', date: '2026-01-30' },
    { id: 2, intern: 'Sarah Lee', type: 'Weekly', date: '2026-01-27' },
    { id: 3, intern: 'Mike Johnson', type: 'Daily', date: '2026-01-31' },
  ];

  const upcomingDeadlines = [
    { task: 'Complete project documentation', intern: 'John Intern', deadline: '2026-02-05' },
    { task: 'Review codebase for bugs', intern: 'John Intern', deadline: '2026-02-03' },
    { task: 'Database optimization', intern: 'Sarah Lee', deadline: '2026-02-08' },
  ];

  const stats = [
    { label: 'Active Interns', value: interns.length, icon: Users, color: 'text-purple-600' },
    { label: 'Tasks Completed', value: interns.reduce((sum, i) => sum + i.tasksCompleted, 0), icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Pending Reports', value: pendingReports.length, icon: FileText, color: 'text-yellow-600' },
    { label: 'Avg. Performance', value: '94%', icon: TrendingUp, color: 'text-purple-600' },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Supervisor Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {user?.department ? `${user.department} Department - ` : ''}Monitor and manage your team's progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        {/* Intern Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Intern Overview</CardTitle>
                  <CardDescription>Monitor individual intern progress</CardDescription>
                </div>
                <Button variant="outline" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interns.map((intern) => (
                  <div key={intern.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback>{getInitials(intern.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{intern.name}</h4>
                            <p className="text-sm text-gray-600">
                              {intern.tasksCompleted} completed, {intern.pendingTasks} pending
                            </p>
                          </div>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">Hours Progress</span>
                              <span className="font-medium">{intern.hoursCompleted}/{intern.totalHours} hrs</span>
                            </div>
                            <Progress value={(intern.hoursCompleted / intern.totalHours) * 100} className="h-2" />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Attendance Rate</span>
                            <span className="font-medium">{intern.attendance}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingDeadlines.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.task}</h4>
                      <p className="text-xs text-gray-600 mt-1">{item.intern}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-600">
                        {Math.ceil((new Date(item.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pending Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pending Reports
              </CardTitle>
              <CardDescription>Reports awaiting review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingReports.map((report) => (
                  <div key={report.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{report.intern}</h4>
                        <p className="text-xs text-gray-600">{report.type} Report</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">Pending</Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {new Date(report.date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                Review All Reports
              </Button>
            </CardContent>
          </Card>

          {/* Alerts & Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-900">Low Attendance</p>
                  <p className="text-xs text-yellow-700 mt-1">Emma Davis has 88% attendance rate</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">Pending Tasks</p>
                  <p className="text-xs text-purple-700 mt-1">Emma Davis has 8 pending tasks</p>
                </div>
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
                <Users className="w-4 h-4 mr-2" />
                Assign New Task
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Review Reports
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
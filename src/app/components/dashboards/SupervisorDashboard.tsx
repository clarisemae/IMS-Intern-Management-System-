import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useNavigation } from '@/app/contexts/NavigationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Users, CheckCircle2, Clock, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface SupervisorIntern {
  id: number;
  name: string;
  status: string;
  hoursCompleted: number;
  totalHours: number;
  tasksCompleted: number;
  pendingTasks: number;
  attendance: number;
  schedule: {
    day: string;
    label: string;
    startTime: string | null;
    endTime: string | null;
    isActive: boolean;
  } | null;
  scheduleStatus: {
    code: 'early' | 'on-time' | 'grace' | 'late' | 'missed' | 'no-schedule';
    label: string;
    detail: string;
  };
}

interface SupervisorDashboardData {
  stats: {
    activeInterns: number;
    tasksCompleted: number;
    avgPerformance: number;
  };
  interns: SupervisorIntern[];
  scheduleAlerts: Array<{ id: number; name: string; detail: string; status: string }>;
  upcomingDeadlines: Array<{ id: number; task: string; intern: string; deadline: string | null }>;
}

export function SupervisorDashboard() {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const [data, setData] = useState<SupervisorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await apiRequest<SupervisorDashboardData>('/dashboard/overview');
        setData(response);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading dashboard...
      </div>
    );
  }

  const stats = [
    {
      label: 'Active Interns',
      value: data.stats.activeInterns,
      helper: data.stats.activeInterns > 0 ? 'Interns currently under your view' : 'No interns assigned yet',
      icon: Users,
      color: 'text-purple-600',
    },
    {
      label: 'Tasks Completed',
      value: data.stats.tasksCompleted,
      helper: data.stats.tasksCompleted > 0 ? 'Completed tasks across your team' : 'No completed tasks yet',
      icon: CheckCircle2,
      color: 'text-green-600',
    },
    {
      label: 'Avg. Performance',
      value: `${data.stats.avgPerformance}%`,
      helper: data.stats.activeInterns > 0 ? 'Based on hours and task progress' : 'Performance will appear once interns are active',
      icon: TrendingUp,
      color: 'text-purple-600',
    },
  ];

  const alertIntern = data.interns.reduce<SupervisorIntern | null>((current, intern) => {
    if (!current) return intern;
    return intern.pendingTasks > current.pendingTasks ? intern : current;
  }, null);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Supervisor Dashboard</h1>
        <p className="mt-1 text-gray-600">
          {user?.department ? `${user.department} Department - ` : ''}Monitor and manage your team's progress
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
                  </div>
                  <div className={`rounded-full bg-gray-50 p-3 ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Intern Overview</CardTitle>
                  <CardDescription>Monitor individual intern progress</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('tasks')}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.interns.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No active interns yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Intern progress cards will appear here once active interns are added to the system.
                    </p>
                  </div>
                ) : data.interns.map((intern) => (
                  <div key={intern.id} className="rounded-lg border p-4 transition-colors hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback>{getInitials(intern.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{intern.name}</h4>
                            <p className="text-sm text-gray-600">
                              {intern.tasksCompleted} completed, {intern.pendingTasks} pending
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {intern.schedule?.isActive && intern.schedule.startTime && intern.schedule.endTime
                                ? `Today's schedule: ${intern.schedule.startTime} - ${intern.schedule.endTime}`
                                : 'No schedule set today'}
                            </p>
                          </div>
                          <Badge
                            variant={
                              intern.scheduleStatus.code === 'late' || intern.scheduleStatus.code === 'missed'
                                ? 'destructive'
                                : intern.scheduleStatus.code === 'on-time'
                                  ? 'default'
                                  : intern.scheduleStatus.code === 'grace'
                                    ? 'outline'
                                  : 'secondary'
                            }
                          >
                            {intern.scheduleStatus.label}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="text-gray-600">Hours Progress</span>
                              <span className="font-medium">{intern.hoursCompleted.toFixed(1)}/{intern.totalHours} hrs</span>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.upcomingDeadlines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-8 text-center">
                    <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No upcoming deadlines</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upcoming task due dates will appear here once tasks are assigned with deadlines.
                    </p>
                  </div>
                ) : data.upcomingDeadlines.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{item.task}</h4>
                      <p className="mt-1 text-xs text-gray-600">{item.intern}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{item.deadline ? new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No deadline'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.scheduleAlerts.length > 0 && data.scheduleAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-900">{alert.name} is {alert.status.toLowerCase()}</p>
                    <p className="mt-1 text-xs text-red-700">{alert.detail}</p>
                  </div>
                ))}
                {alertIntern && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <p className="text-sm font-medium text-yellow-900">Pending Tasks</p>
                    <p className="mt-1 text-xs text-yellow-700">{alertIntern.name} has {alertIntern.pendingTasks} pending tasks</p>
                  </div>
                )}
                {data.scheduleAlerts.length === 0 && !alertIntern && (
                  <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-8 text-center">
                    <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No alerts right now</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Late reminders, missed schedules, and task warnings will appear here when attention is needed.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('tasks')}>
                <Users className="mr-2 h-4 w-4" />
                Assign New Task
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('analytics')}>
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

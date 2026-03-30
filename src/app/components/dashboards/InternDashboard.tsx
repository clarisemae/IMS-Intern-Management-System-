import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useNavigation } from '@/app/contexts/NavigationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Clock, ListTodo, FileText, Bell, CheckCircle2, AlertCircle, Timer, Loader2 } from 'lucide-react';
import { Progress } from '@/app/components/ui/progress';
import { apiRequest } from '@/lib/api';

interface DashboardTask {
  id: number;
  title: string;
  deadline: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
}

interface DashboardNotification {
  id: number;
  message: string;
  time: string;
}

interface ScheduleEntry {
  day: string;
  label: string;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
}

interface ScheduleStatus {
  code: 'early' | 'on-time' | 'grace' | 'late' | 'missed' | 'no-schedule';
  label: string;
  detail: string;
}

interface InternDashboardData {
  attendance: {
    status: 'clocked-in' | 'clocked-out';
    date: string;
    timeIn: string | null;
    timeOut: string | null;
    totalHours: number;
    progressPercent: number;
    schedule: ScheduleEntry | null;
    scheduleStatus: ScheduleStatus;
  };
  stats: {
    hoursCompleted: number;
    tasksCompleted: number;
    pendingTasks: number;
    hoursThisWeek: number;
  };
  tasks: DashboardTask[];
  notifications: DashboardNotification[];
}

function formatTime(value: string | null) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function toMinutes(time: string | null) {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
}

function isWithinScheduleWindow(schedule: ScheduleEntry | null) {
  if (!schedule?.isActive) {
    return true;
  }

  const startMinutes = toMinutes(schedule.startTime);
  const endMinutes = toMinutes(schedule.endTime);

  if (startMinutes == null || endMinutes == null) {
    return true;
  }

  const now = new Date();
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

function getPrimaryAction(data: InternDashboardData) {
  const attendanceCompleted = Boolean(data.attendance.timeIn && data.attendance.timeOut);
  const hasReportReminder = data.notifications.some((notification) =>
    notification.message.toLowerCase().includes('report'),
  );
  const hasClockedInToday = Boolean(data.attendance.timeIn);
  const withinScheduleWindow = isWithinScheduleWindow(data.attendance.schedule);

  if (attendanceCompleted && hasReportReminder) {
    return { label: 'Submit Daily Log', page: 'attendance', variant: 'default' as const, icon: FileText };
  }

  if (attendanceCompleted) {
    return { label: 'Attendance Completed', page: 'attendance', variant: 'secondary' as const, icon: CheckCircle2 };
  }

  if (data.attendance.status === 'clocked-in') {
    return { label: 'Clock Out', page: 'attendance', variant: 'default' as const, icon: Clock };
  }

  if (!hasClockedInToday && !withinScheduleWindow) {
    return { label: 'View Attendance', page: 'attendance', variant: 'outline' as const, icon: Clock };
  }

  return { label: 'Clock In', page: 'attendance', variant: 'default' as const, icon: Clock };
}

export function InternDashboard() {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const [data, setData] = useState<InternDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await apiRequest<InternDashboardData>('/dashboard/overview');
        setData(response);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

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
      label: 'Hours Completed',
      value: data.stats.hoursCompleted.toFixed(1),
      helper: data.stats.hoursCompleted > 0 ? 'Rendered internship hours so far' : 'No rendered hours yet',
      icon: Clock,
      color: 'text-purple-600',
    },
    {
      label: 'Tasks Completed',
      value: String(data.stats.tasksCompleted),
      helper: data.stats.tasksCompleted > 0 ? 'Finished assigned tasks' : 'No completed tasks yet',
      icon: CheckCircle2,
      color: 'text-green-600',
    },
    {
      label: 'Pending Tasks',
      value: String(data.stats.pendingTasks),
      helper: data.stats.pendingTasks > 0 ? 'Tasks still waiting for action' : 'No pending tasks right now',
      icon: AlertCircle,
      color: 'text-yellow-600',
    },
    {
      label: 'Hours This Week',
      value: data.stats.hoursThisWeek.toFixed(1),
      helper: data.stats.hoursThisWeek > 0 ? 'Hours logged this week' : 'No hours logged this week yet',
      icon: Timer,
      color: 'text-purple-600',
    },
  ];
  const primaryAction = getPrimaryAction(data);
  const PrimaryActionIcon = primaryAction.icon;
  const scheduleText = data.attendance.schedule?.isActive && data.attendance.schedule.startTime && data.attendance.schedule.endTime
    ? `${data.attendance.schedule.label}: ${data.attendance.schedule.startTime} - ${data.attendance.schedule.endTime}`
    : 'No schedule set for today';
  const attendanceCompleted = Boolean(data.attendance.timeIn && data.attendance.timeOut);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Welcome back, {user?.name}!</h1>
        <p className="mt-1 text-gray-600">
          {user?.department ? `${user.department} Department - ` : ''}Here's what's happening with your internship today
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                  <CardTitle>Today's Attendance</CardTitle>
                  <CardDescription>{new Date(data.attendance.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</CardDescription>
                </div>
                <Badge variant={data.attendance.status === 'clocked-in' ? 'default' : 'secondary'}>
                  {data.attendance.status === 'clocked-in' ? 'Clocked In' : 'Clocked Out'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Today's Schedule</p>
                    <p className="text-sm text-muted-foreground">{scheduleText}</p>
                  </div>
                  <Badge
                    variant={
                      data.attendance.scheduleStatus.code === 'late' || data.attendance.scheduleStatus.code === 'missed'
                        ? 'destructive'
                        : data.attendance.scheduleStatus.code === 'on-time'
                          ? 'default'
                          : data.attendance.scheduleStatus.code === 'grace'
                            ? 'outline'
                          : 'secondary'
                    }
                  >
                    {data.attendance.scheduleStatus.label}
                  </Badge>
                </div>
                {data.attendance.scheduleStatus.code !== 'no-schedule' && (
                  <p className="mt-2 text-xs text-muted-foreground">{data.attendance.scheduleStatus.detail}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="mb-1 text-sm text-gray-600">Time In</p>
                  <p className="text-2xl font-semibold text-green-700">{formatTime(data.attendance.timeIn)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-600">Time Out</p>
                  <p className="text-2xl font-semibold text-gray-700">{formatTime(data.attendance.timeOut)}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-gray-600">Total Hours Rendered</p>
                  <p className="text-sm font-medium">{data.attendance.totalHours.toFixed(1)} hrs</p>
                </div>
                <Progress value={data.attendance.progressPercent} className="h-2" />
                <p className="mt-2 text-xs text-gray-500">{data.attendance.progressPercent}% of required 200 hours completed</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assigned Tasks</CardTitle>
                  <CardDescription>Your current workload</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('tasks')}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                    <ListTodo className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No tasks assigned yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your supervisor has not assigned any tasks for today yet.
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('tasks')}>
                      Check Tasks
                    </Button>
                  </div>
                ) : data.tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border p-4 transition-colors hover:bg-gray-50">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline">
                            {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Due</p>
                        <p className="text-sm font-medium">{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</p>
                      </div>
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
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.notifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-8 text-center">
                    <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No notifications yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Schedule reminders, late notices, and saved daily log updates will appear here.
                    </p>
                  </div>
                ) : data.notifications.map((notification) => (
                  <div key={notification.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <p className="text-sm">{notification.message}</p>
                    <p className="mt-1 text-xs text-gray-500">{notification.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={primaryAction.variant}
                className="w-full justify-start"
                onClick={() => navigate(primaryAction.page)}
              >
                <PrimaryActionIcon className="mr-2 h-4 w-4" />
                {primaryAction.label}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('tasks')}>
                <ListTodo className="mr-2 h-4 w-4" />
                View All Tasks
              </Button>
              <Button
                variant={attendanceCompleted ? 'outline' : 'secondary'}
                className="w-full justify-start"
                onClick={() => navigate('attendance')}
              >
                <FileText className="mr-2 h-4 w-4" />
                {attendanceCompleted ? 'Open Daily Log' : 'Daily Log'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

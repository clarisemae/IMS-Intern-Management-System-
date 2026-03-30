import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Users, UserCheck, Clock, FileText, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { apiRequest } from '@/lib/api';
import { useNavigation } from '@/app/contexts/NavigationContext';

interface AdminDashboardData {
  systemStats: {
    totalUsers: number;
    activeInterns: number;
    totalHoursLogged: number;
    completedTasks: number;
    pendingReports: number;
  };
  attendanceData: Array<{ month: string; hours: number }>;
  taskCompletionData: Array<{ week: string; completed: number; pending: number }>;
  userDistribution: Array<{ name: string; value: number; color: string }>;
  recentActivities: Array<{ id: number; user: string; action: string; time: string }>;
  health: {
    attendanceRate: number;
    taskCompletionRate: number;
    activeUserRate: number;
  };
}

export function AdminDashboard() {
  const { navigate } = useNavigation();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await apiRequest<AdminDashboardData>('/dashboard/overview');
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

  const systemStats = [
    {
      label: 'Total Users',
      value: String(data.systemStats.totalUsers),
      helper: data.systemStats.totalUsers > 0 ? 'Accounts registered in the system' : 'No user accounts yet',
      icon: Users,
      color: 'text-purple-600',
    },
    {
      label: 'Active Interns',
      value: String(data.systemStats.activeInterns),
      helper: data.systemStats.activeInterns > 0 ? 'Interns currently marked active' : 'No active interns yet',
      icon: UserCheck,
      color: 'text-green-600',
    },
    {
      label: 'Total Hours Logged',
      value: data.systemStats.totalHoursLogged.toFixed(1),
      helper: data.systemStats.totalHoursLogged > 0 ? 'Attendance hours across the system' : 'No attendance hours logged yet',
      icon: Clock,
      color: 'text-purple-600',
    },
    {
      label: 'Saved Logs',
      value: String(data.systemStats.pendingReports),
      helper: data.systemStats.pendingReports > 0 ? 'Daily logs saved by interns' : 'No daily logs saved yet',
      icon: FileText,
      color: 'text-yellow-600',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">System overview and analytics</p>
        </div>
        <Button>
          <TrendingUp className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {systemStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <div className={`rounded-lg bg-gray-50 p-2 ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-semibold">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Live
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>Monthly hours logged</CardDescription>
          </CardHeader>
          <CardContent>
            {data.attendanceData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-center">
                <div className="max-w-xs space-y-2">
                  <p className="text-sm font-medium">No attendance trend data yet</p>
                  <p className="text-sm text-muted-foreground">Monthly attendance activity will appear here once interns begin logging hours.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Completion</CardTitle>
            <CardDescription>Weekly task completion</CardDescription>
          </CardHeader>
          <CardContent>
            {data.taskCompletionData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-center">
                <div className="max-w-xs space-y-2">
                  <p className="text-sm font-medium">No task activity yet</p>
                  <p className="text-sm text-muted-foreground">Weekly task completion trends will show here once tasks are assigned and updated.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.taskCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#10b981" />
                  <Bar dataKey="pending" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Breakdown by role</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.userDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {data.userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {data.userDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest system activities</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('analytics')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivities.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                  <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No recent activity yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Saved logs, attendance actions, and other system updates will appear here as the team starts using the platform.</p>
                </div>
              ) : data.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 border-b pb-4 last:border-0 last:pb-0">
                  <div className="mt-2 h-2 w-2 rounded-full bg-purple-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Overall system performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Attendance Rate</span>
                <span className="font-medium">{data.health.attendanceRate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-green-500" style={{ width: `${data.health.attendanceRate}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Task Completion</span>
                <span className="font-medium">{data.health.taskCompletionRate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-blue-500" style={{ width: `${data.health.taskCompletionRate}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Active Accounts</span>
                <span className="font-medium">{data.health.activeUserRate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-purple-500" style={{ width: `${data.health.activeUserRate}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

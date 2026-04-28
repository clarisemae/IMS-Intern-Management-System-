import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Download, TrendingUp, Users, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { apiRequest } from '@/lib/api';

interface Metric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: 'users' | 'clock' | 'check' | 'trending';
}

interface AnalyticsData {
  metrics: Metric[];
  performanceData: Array<{ name: string; attendance: number; taskCompletion: number; reportQuality: number }>;
  monthlyTrends: Array<{ month: string; interns: number; hours: number; tasks: number }>;
  departmentStats: Array<{ department: string; interns: number; avgHours: number; taskCompletion: number }>;
  hourlyDistribution: Array<{ hour: string; count: number }>;
  reportQualityRate: number;
}

const iconMap = {
  users: Users,
  clock: Clock,
  check: CheckCircle,
  trending: TrendingUp,
};

export function AnalyticsPage() {
  const [range, setRange] = useState('30');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await apiRequest<AnalyticsData>('/analytics');
        setData(response);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [range]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {data.metrics.map((metric) => {
          const Icon = iconMap[metric.icon];

          return (
            <Card key={metric.label}>
              <CardContent className="p-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-gray-600">{metric.label}</p>
                  <Icon className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-semibold">{metric.value}</p>
                  <div className="flex items-center text-xs text-green-600">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    {metric.change}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="trends">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-full bg-white sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Intern Growth</CardTitle>
                <CardDescription>Number of active interns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="interns" stroke="#8b5cf6" fill="#c4b5fd" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Hours Logged</CardTitle>
                <CardDescription>Cumulative hours by month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Task Completion Trends</CardTitle>
              <CardDescription>Tasks created per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Intern Performance Comparison</CardTitle>
              <CardDescription>Multi-dimensional performance analysis</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={data.performanceData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Attendance" dataKey="attendance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Task Completion" dataKey="taskCompletion" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Log Submission" dataKey="reportQuality" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {data.performanceData.map((intern) => (
              <Card key={intern.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{intern.name}</CardTitle>
                  <CardDescription>Individual performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Attendance</span>
                      <span className="font-medium">{intern.attendance}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full bg-purple-500" style={{ width: `${intern.attendance}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Task Completion</span>
                      <span className="font-medium">{intern.taskCompletion}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full bg-green-500" style={{ width: `${intern.taskCompletion}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Log Submission</span>
                      <span className="font-medium">{intern.reportQuality}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full bg-yellow-500" style={{ width: `${intern.reportQuality}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Comparison</CardTitle>
              <CardDescription>Performance metrics by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.departmentStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="department" />
                  <Tooltip />
                  <Bar dataKey="avgHours" fill="#8b5cf6" name="Avg Hours" />
                  <Bar dataKey="taskCompletion" fill="#10b981" name="Task Completion %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {data.departmentStats.map((dept) => (
              <Card key={dept.department}>
                <CardContent className="p-6">
                  <h4 className="mb-4 font-medium">{dept.department}</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interns</span>
                      <span className="font-medium">{dept.interns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Hours</span>
                      <span className="font-medium">{dept.avgHours}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completion</span>
                      <span className="font-medium">{dept.taskCompletion}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Peak Activity Hours</CardTitle>
              <CardDescription>When interns are most active</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

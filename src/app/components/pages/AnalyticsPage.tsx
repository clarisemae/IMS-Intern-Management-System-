import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Download, TrendingUp, TrendingDown, Users, Clock, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

export function AnalyticsPage() {
  // Mock data
  const performanceData = [
    { name: 'John Intern', attendance: 95, taskCompletion: 92, reportQuality: 88 },
    { name: 'Sarah Lee', attendance: 92, taskCompletion: 85, reportQuality: 90 },
    { name: 'Mike Johnson', attendance: 98, taskCompletion: 94, reportQuality: 91 },
    { name: 'Emma Davis', attendance: 88, taskCompletion: 78, reportQuality: 82 },
  ];

  const monthlyTrends = [
    { month: 'Aug', interns: 18, hours: 2520, tasks: 156 },
    { month: 'Sep', interns: 20, hours: 2800, tasks: 178 },
    { month: 'Oct', interns: 22, hours: 3080, tasks: 195 },
    { month: 'Nov', interns: 23, hours: 3220, tasks: 203 },
    { month: 'Dec', interns: 21, hours: 2940, tasks: 182 },
    { month: 'Jan', interns: 24, hours: 3360, tasks: 218 },
  ];

  const departmentStats = [
    { department: 'Engineering', interns: 12, avgHours: 158, taskCompletion: 91 },
    { department: 'Design', interns: 6, avgHours: 152, taskCompletion: 88 },
    { department: 'Marketing', interns: 4, avgHours: 145, taskCompletion: 85 },
    { department: 'IT', interns: 2, avgHours: 162, taskCompletion: 94 },
  ];

  const hourlyDistribution = [
    { hour: '8 AM', count: 12 },
    { hour: '9 AM', count: 24 },
    { hour: '10 AM', count: 24 },
    { hour: '11 AM', count: 24 },
    { hour: '12 PM', count: 18 },
    { hour: '1 PM', count: 22 },
    { hour: '2 PM', count: 24 },
    { hour: '3 PM', count: 24 },
    { hour: '4 PM', count: 22 },
    { hour: '5 PM', count: 16 },
  ];

  const metrics = [
    { label: 'Avg. Attendance', value: '94%', change: '+2.5%', trend: 'up', icon: Users },
    { label: 'Avg. Hours/Week', value: '38.2', change: '+1.8', trend: 'up', icon: Clock },
    { label: 'Task Completion', value: '89%', change: '-1.2%', trend: 'down', icon: CheckCircle },
    { label: 'Performance Score', value: '87%', change: '+3.1%', trend: 'up', icon: TrendingUp },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Analytics</h1>
          <p className="text-gray-600 mt-1">Detailed insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30">
            <SelectTrigger className="w-40">
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
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">{metric.label}</p>
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-semibold">{metric.value}</p>
                  <div className={`flex items-center text-xs ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendIcon className="w-3 h-3 mr-1" />
                    {metric.change}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Intern Growth</CardTitle>
                <CardDescription>Number of active interns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrends}>
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
                  <LineChart data={monthlyTrends}>
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
              <CardDescription>Tasks completed per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrends}>
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
                <RadarChart data={performanceData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Attendance" dataKey="attendance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Task Completion" dataKey="taskCompletion" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Report Quality" dataKey="reportQuality" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {performanceData.map((intern, index) => (
              <Card key={index}>
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
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${intern.attendance}%` }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Task Completion</span>
                      <span className="font-medium">{intern.taskCompletion}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${intern.taskCompletion}%` }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Report Quality</span>
                      <span className="font-medium">{intern.reportQuality}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: `${intern.reportQuality}%` }}></div>
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
                <BarChart data={departmentStats} layout="vertical">
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {departmentStats.map((dept, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h4 className="font-medium mb-4">{dept.department}</h4>
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
                <BarChart data={hourlyDistribution}>
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
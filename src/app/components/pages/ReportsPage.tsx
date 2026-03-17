import React, { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Plus, FileText, Upload, CheckCircle, Clock, MessageSquare } from 'lucide-react';

interface Report {
  id: number;
  type: 'daily' | 'weekly';
  date: string;
  content: string;
  status: 'pending' | 'approved' | 'needs-revision';
  submittedBy?: string;
  comments?: string;
}

export function ReportsPage() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Mock reports data
  const reports: Report[] = [
    {
      id: 1,
      type: 'weekly',
      date: '2026-01-27',
      content: 'Completed project documentation tasks and attended team meetings. Made significant progress on the authentication module.',
      status: 'approved',
      submittedBy: user?.role === 'supervisor' ? 'John Intern' : undefined,
      comments: 'Great work! Keep it up.',
    },
    {
      id: 2,
      type: 'daily',
      date: '2026-01-30',
      content: 'Reviewed codebase and fixed several bugs in the dashboard component. Collaborated with team on design improvements.',
      status: 'pending',
      submittedBy: user?.role === 'supervisor' ? 'John Intern' : undefined,
    },
    {
      id: 3,
      type: 'daily',
      date: '2026-01-29',
      content: 'Worked on database optimization and improved query performance by 30%.',
      status: 'approved',
      submittedBy: user?.role === 'supervisor' ? 'John Intern' : undefined,
    },
    {
      id: 4,
      type: 'weekly',
      date: '2026-01-20',
      content: 'Initial setup and orientation week. Learned about company processes and tools.',
      status: 'needs-revision',
      submittedBy: user?.role === 'supervisor' ? 'Sarah Lee' : undefined,
      comments: 'Please provide more details about specific tasks completed.',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'needs-revision': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'pending': return Clock;
      case 'needs-revision': return MessageSquare;
      default: return Clock;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            {user?.role === 'supervisor' ? 'Report Review' : 'Activity Reports'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'supervisor' 
              ? 'Review and approve intern activity reports' 
              : 'Submit and manage your activity reports'}
          </p>
        </div>
        {user?.role === 'intern' && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Submit Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit Activity Report</DialogTitle>
                <DialogDescription>
                  Document your internship activities and progress
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Report</SelectItem>
                      <SelectItem value="weekly">Weekly Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-date">Date</Label>
                  <input 
                    id="report-date"
                    type="date" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-content">Activities</Label>
                  <Textarea 
                    id="report-content"
                    placeholder="Describe your activities, accomplishments, and learnings..."
                    rows={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-file">Attachments (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                    <span className="text-sm text-gray-500">PDF, DOC, or DOCX</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Submit Report
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
            <p className="text-sm text-gray-600">Total Reports</p>
            <p className="text-3xl font-semibold mt-2">{reports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Pending Review</p>
            <p className="text-3xl font-semibold mt-2">{reports.filter(r => r.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-3xl font-semibold mt-2">{reports.filter(r => r.status === 'approved').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Needs Revision</p>
            <p className="text-3xl font-semibold mt-2">{reports.filter(r => r.status === 'needs-revision').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            {user?.role === 'supervisor' ? 'Review submitted reports' : 'Your submitted reports'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="needs-revision">Needs Revision</TabsTrigger>
            </TabsList>
            
            {['all', 'pending', 'approved', 'needs-revision'].map((status) => {
              const filteredReports = status === 'all' 
                ? reports 
                : reports.filter(r => r.status === status);
              
              return (
                <TabsContent key={status} value={status} className="space-y-3 mt-4">
                  {filteredReports.map((report) => {
                    const StatusIcon = getStatusIcon(report.status);
                    
                    return (
                      <Dialog key={report.id}>
                        <DialogTrigger asChild>
                          <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-medium text-lg">
                                    {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                                  </h4>
                                  <Badge variant="outline">{report.type}</Badge>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">{report.content}</p>
                              </div>
                              <Badge variant={getStatusColor(report.status)} className="ml-4">
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {report.status === 'needs-revision' ? 'Needs Revision' : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {report.submittedBy && (
                                <span>By: {report.submittedBy}</span>
                              )}
                              <span>Date: {new Date(report.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                            </DialogTitle>
                            <DialogDescription>
                              {new Date(report.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {report.submittedBy && (
                              <div>
                                <Label>Submitted By</Label>
                                <p className="text-sm text-gray-600 mt-2">{report.submittedBy}</p>
                              </div>
                            )}
                            <div>
                              <Label>Status</Label>
                              <p className="text-sm mt-2">
                                <Badge variant={getStatusColor(report.status)}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {report.status === 'needs-revision' ? 'Needs Revision' : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                </Badge>
                              </p>
                            </div>
                            <div>
                              <Label>Activities</Label>
                              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{report.content}</p>
                            </div>
                            {report.comments && (
                              <div className="p-4 bg-purple-50 rounded-lg">
                                <Label className="text-purple-900">Supervisor Comments</Label>
                                <p className="text-sm text-purple-800 mt-2">{report.comments}</p>
                              </div>
                            )}
                            {user?.role === 'supervisor' && report.status === 'pending' && (
                              <div className="space-y-2 pt-4 border-t">
                                <Label htmlFor="review-comments">Comments</Label>
                                <Textarea 
                                  id="review-comments"
                                  placeholder="Add your review comments..."
                                  rows={4}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            {user?.role === 'supervisor' && report.status === 'pending' && (
                              <>
                                <Button variant="outline">Request Revision</Button>
                                <Button>Approve</Button>
                              </>
                            )}
                            {user?.role === 'intern' && report.status === 'needs-revision' && (
                              <Button>Revise Report</Button>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    );
                  })}
                  {filteredReports.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No reports found</p>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
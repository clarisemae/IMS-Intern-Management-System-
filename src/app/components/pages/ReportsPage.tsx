import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Plus, FileText, CheckCircle, Clock, MessageSquare, Loader2, Pencil } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { Input } from '@/app/components/ui/input';

type ReportType = 'daily' | 'weekly';
type ReportStatus = 'pending' | 'approved' | 'needs-revision';

interface Report {
  id: number;
  type: ReportType;
  date: string;
  content: string;
  imageData?: string | null;
  status: ReportStatus;
  submittedById: number;
  submittedBy?: string;
  reviewerId?: number | null;
  reviewerName?: string | null;
  comments?: string | null;
  createdAt: string;
}

interface ReportFormState {
  type: ReportType;
  date: string;
  content: string;
  imageData: string | null;
}

const initialFormState: ReportFormState = {
  type: 'daily',
  date: '',
  content: '',
  imageData: null,
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read the image file.'));
    };

    reader.onerror = () => reject(new Error('Failed to read the image file.'));
    reader.readAsDataURL(file);
  });
}

export function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState<ReportFormState>(initialFormState);
  const [reviewComments, setReviewComments] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isReviewer = user?.role === 'supervisor' || user?.role === 'admin';

  const loadReports = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await apiRequest<{ reports: Report[] }>('/reports');
      setReports(data.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const stats = useMemo(() => ({
    total: reports.length,
    pending: reports.filter((report) => report.status === 'pending').length,
    approved: reports.filter((report) => report.status === 'approved').length,
    needsRevision: reports.filter((report) => report.status === 'needs-revision').length,
  }), [reports]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'needs-revision':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return CheckCircle;
      case 'pending':
        return Clock;
      case 'needs-revision':
        return MessageSquare;
      default:
        return Clock;
    }
  };

  const openCreateDialog = () => {
    setEditingReport(null);
    setFormData({
      ...initialFormState,
      date: new Date().toISOString().slice(0, 10),
    });
    setError('');
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (report: Report) => {
    setEditingReport(report);
    setFormData({
      type: report.type,
      date: String(report.date).slice(0, 10),
      content: report.content,
      imageData: report.imageData ?? null,
    });
    setError('');
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingReport(null);
    setFormData(initialFormState);
    setError('');
  };

  const openReportDetails = (report: Report) => {
    setSelectedReport(report);
    setReviewComments(report.comments ?? '');
    setError('');
  };

  const closeReportDetails = () => {
    setSelectedReport(null);
    setReviewComments('');
  };

  const handleSubmitReport = async () => {
    setIsSaving(true);
    setError('');

    try {
      if (editingReport) {
        await apiRequest(`/reports/${editingReport.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest('/reports', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }

      closeDialog();
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save report.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Only PNG, JPG, JPEG, or WEBP images are supported.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('Please upload an image smaller than 3 MB.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setFormData((current) => ({ ...current, imageData: dataUrl }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the selected image.');
    }
  };

  const handleReviewReport = async (status: ReportStatus) => {
    if (!selectedReport) {
      return;
    }

    try {
      await apiRequest(`/reports/${selectedReport.id}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          comments: reviewComments,
        }),
      });

      closeReportDetails();
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review report.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            {isReviewer ? 'Report Review' : 'Activity Reports'}
          </h1>
          <p className="mt-1 text-gray-600">
            {isReviewer
              ? 'Review and approve intern activity reports'
              : 'Submit and manage your activity reports'}
          </p>
        </div>
        {user?.role === 'intern' && (
          <>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Submit Report
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (!open ? closeDialog() : setIsCreateDialogOpen(true))}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingReport ? 'Revise Activity Report' : 'Submit Activity Report'}</DialogTitle>
                  <DialogDescription>
                    Document your internship activities and progress.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-type">Report Type</Label>
                    <Select value={formData.type} onValueChange={(value: ReportType) => setFormData((current) => ({ ...current, type: value }))}>
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
                    <Input
                      id="report-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((current) => ({ ...current, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report-content">Activities</Label>
                    <Textarea
                      id="report-content"
                      placeholder="Describe your activities, accomplishments, and learnings..."
                      rows={8}
                      value={formData.content}
                      onChange={(e) => setFormData((current) => ({ ...current, content: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="report-image">Attach Image</Label>
                    <Input
                      id="report-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleSelectImage}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Attach one screenshot or photo to support this report.
                    </p>
                    {formData.imageData && (
                      <div className="space-y-3 rounded-xl border p-3">
                        <img
                          src={formData.imageData}
                          alt="Selected report attachment"
                          className="max-h-64 w-full rounded-lg object-contain bg-muted/30"
                        />
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => setFormData((current) => ({ ...current, imageData: null }))}>
                            Remove Image
                          </Button>
                        </div>
                      </div>
                    )}
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
                  <Button onClick={handleSubmitReport} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingReport ? 'Resubmit Report' : 'Submit Report'}
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
            <p className="text-sm text-gray-600">Total Reports</p>
            <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Pending Review</p>
            <p className="mt-2 text-3xl font-semibold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="mt-2 text-3xl font-semibold">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Needs Revision</p>
            <p className="mt-2 text-3xl font-semibold">{stats.needsRevision}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            {isReviewer ? 'Review submitted reports' : 'Your submitted reports'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading reports...
            </div>
          ) : (
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
                  : reports.filter((report) => report.status === status);

                return (
                  <TabsContent key={status} value={status} className="mt-4 space-y-3">
                    {filteredReports.map((report) => {
                      const StatusIcon = getStatusIcon(report.status);

                      return (
                        <Dialog key={report.id} onOpenChange={(open) => (!open ? closeReportDetails() : openReportDetails(report))}>
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
                              {report.submittedBy && isReviewer && (
                                <div>
                                  <Label>Submitted By</Label>
                                  <p className="mt-2 text-sm text-gray-600">{report.submittedBy}</p>
                                </div>
                              )}
                              <div>
                                <Label>Status</Label>
                                <p className="mt-2 text-sm">
                                  <Badge variant={getStatusColor(report.status)}>
                                    <StatusIcon className="mr-1 h-3 w-3" />
                                    {report.status === 'needs-revision' ? 'Needs Revision' : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                  </Badge>
                                </p>
                              </div>
                              <div>
                                <Label>Activities</Label>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{report.content}</p>
                              </div>
                              {report.imageData && (
                                <div>
                                  <Label>Attached Image</Label>
                                  <img
                                    src={report.imageData}
                                    alt="Report attachment"
                                    className="mt-2 max-h-72 w-full rounded-lg border object-contain"
                                  />
                                </div>
                              )}
                              {report.comments && (
                                <div className="rounded-lg bg-amber-50 p-4">
                                  <Label className="text-amber-900">Reviewer Comments</Label>
                                  <p className="mt-2 text-sm text-amber-800">{report.comments}</p>
                                </div>
                              )}
                              {isReviewer && report.status === 'pending' && selectedReport?.id === report.id && (
                                <div className="space-y-2 border-t pt-4">
                                  <Label htmlFor="review-comments">Comments</Label>
                                  <Textarea
                                    id="review-comments"
                                    placeholder="Add your review comments..."
                                    rows={4}
                                    value={reviewComments}
                                    onChange={(e) => setReviewComments(e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2">
                              {isReviewer && report.status === 'pending' && selectedReport?.id === report.id && (
                                <>
                                  <Button variant="outline" onClick={() => handleReviewReport('needs-revision')}>
                                    Request Revision
                                  </Button>
                                  <Button onClick={() => handleReviewReport('approved')}>Approve</Button>
                                </>
                              )}
                              {user?.role === 'intern' && report.status === 'needs-revision' && (
                                <Button onClick={() => {
                                  closeReportDetails();
                                  openEditDialog(report);
                                }}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Revise Report
                                </Button>
                              )}
                            </div>
                          </DialogContent>
                          <DialogTrigger asChild>
                            <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50">
                              <div className="mb-3 flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="mb-2 flex items-center gap-3">
                                    <h4 className="text-lg font-medium">
                                      {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                                    </h4>
                                    <Badge variant="outline">{report.type}</Badge>
                                  </div>
                                  <p className="line-clamp-2 text-sm text-gray-600">{report.content}</p>
                                </div>
                                <Badge variant={getStatusColor(report.status)} className="ml-4">
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {report.status === 'needs-revision' ? 'Needs Revision' : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {report.submittedBy && isReviewer && (
                                  <span>By: {report.submittedBy}</span>
                                )}
                                <span>Date: {new Date(report.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </DialogTrigger>
                        </Dialog>
                      );
                    })}
                    {filteredReports.length === 0 && (
                      <div className="py-12 text-center text-gray-500">
                        <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>No reports found</p>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

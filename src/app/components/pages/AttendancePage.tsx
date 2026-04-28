import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { AlertCircle, Calendar, CheckCircle2, Clock, Download, FileText, Loader2, Pencil, Timer } from 'lucide-react';
import { apiDownload, apiRequest } from '@/lib/api';

type AttendanceStatus = 'present' | 'late' | 'absent';
type ReportStatus = 'submitted';

interface AttendanceRecord {
  id: number;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  totalHours: number | null;
  status: 'active' | 'completed';
  attendanceStatus: AttendanceStatus;
  supervisorRemark?: 'early_out' | 'half_day' | 'absent' | null;
  remarkNote?: string | null;
  reportId: number | null;
  reportStatus: ReportStatus | null;
}

interface AttendanceSummary {
  totalHours: number;
  thisWeekHours: number;
  progressPercent: number;
  totalEntries: number;
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

interface AttendanceResponse {
  todayRecord: AttendanceRecord | null;
  records: AttendanceRecord[];
  summary: AttendanceSummary;
  schedule: {
    today: ScheduleEntry | null;
    status: ScheduleStatus;
    weekly: ScheduleEntry[];
    requiredHours: number;
  };
}

interface DailyReport {
  id: number;
  type: 'daily' | 'weekly';
  date: string;
  content: string;
  imageData?: string | null;
  status: ReportStatus;
}

function toDateOnly(value: string) {
  return String(value).slice(0, 10);
}

function mergeAttendanceWithReports(
  attendance: AttendanceResponse,
  reports: DailyReport[],
): AttendanceResponse {
  const dailyReportsByDate = new Map(
    reports
      .filter((report) => report.type === 'daily')
      .map((report) => [toDateOnly(report.date), report] as const),
  );

  const mergeRecord = (record: AttendanceRecord | null) => {
    if (!record) {
      return record;
    }

    const matchedReport = dailyReportsByDate.get(toDateOnly(record.date));

    if (!matchedReport) {
      return record;
    }

    return {
      ...record,
      reportId: matchedReport.id,
      reportStatus: matchedReport.status,
    };
  };

  return {
    ...attendance,
    todayRecord: mergeRecord(attendance.todayRecord),
    records: attendance.records.map((record) => mergeRecord(record) as AttendanceRecord),
  };
}

function applyReportToRecord(record: AttendanceRecord, report: DailyReport) {
  if (toDateOnly(record.date) !== toDateOnly(report.date)) {
    return record;
  }

  return {
    ...record,
    reportId: report.id,
    reportStatus: report.status,
  };
}

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string | null) {
  if (!value) {
    return '--:--';
  }

  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getReportStatusLabel(status: ReportStatus | null) {
  if (!status) {
    return 'No report yet';
  }

  return 'Saved';
}

function getActionLabel(record: AttendanceRecord | null) {
  if (!record) {
    return 'Clock In';
  }

  if (record.attendanceStatus === 'absent' && !record.timeIn && !record.timeOut) {
    return 'Marked Absent';
  }

  if (!record.timeOut) {
    return 'Clock Out';
  }

  return 'Attendance Completed';
}

export function AttendancePage() {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalHours: 0,
    thisWeekHours: 0,
    progressPercent: 0,
    totalEntries: 0,
  });
  const [schedule, setSchedule] = useState<AttendanceResponse['schedule']>({
    today: null,
    status: {
      code: 'no-schedule',
      label: 'No Schedule',
      detail: 'No schedule set for today.',
    },
    weekly: [],
    requiredHours: 200,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [reportContent, setReportContent] = useState('');
  const [reportImageData, setReportImageData] = useState<string | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const isMarkedAbsent = Boolean(
    todayRecord
    && todayRecord.attendanceStatus === 'absent'
    && !todayRecord.timeIn
    && !todayRecord.timeOut,
  );
  const isClockedIn = Boolean(todayRecord?.timeIn && !todayRecord.timeOut);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const loadAttendance = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [attendanceData, reportData] = await Promise.all([
        apiRequest<AttendanceResponse>('/attendance'),
        apiRequest<{ reports: DailyReport[] }>('/reports'),
      ]);
      const mergedData = mergeAttendanceWithReports(attendanceData, reportData.reports);
      setTodayRecord(mergedData.todayRecord);
      setRecords(mergedData.records);
      setReports(reportData.reports);
      setSummary(mergedData.summary);
      setSchedule(mergedData.schedule);
      return mergedData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const findExistingDailyReport = async (date: string) => {
    const data = await apiRequest<{ reports: DailyReport[] }>('/reports');
    return data.reports.find((report) => report.type === 'daily' && toDateOnly(report.date) === toDateOnly(date)) ?? null;
  };

  const closeReportDialog = () => {
    setIsReportDialogOpen(false);
    setSelectedRecord(null);
    setSelectedReport(null);
    setReportContent('');
    setReportImageData(null);
    setIsLoadingReport(false);
    setError('');
  };

  const openReportDialog = async (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setSelectedReport(null);
    setReportContent('');
    setReportImageData(null);
    setError('');
    setIsReportDialogOpen(true);

    setIsLoadingReport(true);

    try {
      if (record.reportId) {
        const data = await apiRequest<{ report: DailyReport }>(`/reports/${record.reportId}`);
        setSelectedReport(data.report);
        setReportContent(data.report.content);
        setReportImageData(data.report.imageData ?? null);
      } else {
        const existingReport = await findExistingDailyReport(record.date);

        if (existingReport) {
          setSelectedReport(existingReport);
          setReportContent(existingReport.content);
          setReportImageData(existingReport.imageData ?? null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report details.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleClockAction = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiRequest<{ record: AttendanceRecord }>(
        isClockedIn ? '/attendance/time-out' : '/attendance/time-in',
        {
          method: 'POST',
        },
      );
      const refreshed = await loadAttendance();

      if (isClockedIn) {
        const refreshedRecord = refreshed?.records.find((record) => record.id === response.record.id)
          ?? refreshed?.todayRecord
          ?? response.record;
        await openReportDialog(refreshedRecord);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedRecord) {
      return;
    }

    setIsSavingReport(true);
    setError('');

    try {
      const payload = {
        type: 'daily',
        date: toDateOnly(selectedRecord.date),
        content: reportContent,
        imageData: reportImageData,
      };

      let savedReport: DailyReport;

      if (selectedReport) {
        const response = await apiRequest<{ report: DailyReport }>(`/reports/${selectedReport.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        savedReport = response.report;
      } else {
        const response = await apiRequest<{ report: DailyReport }>('/reports', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        savedReport = response.report;
      }

      setTodayRecord((current) => (current ? applyReportToRecord(current, savedReport) : current));
      setRecords((current) => current.map((record) => applyReportToRecord(record, savedReport)));
      setReports((current) => {
        const next = current.filter((report) => report.id !== savedReport.id);
        return [savedReport, ...next];
      });
      setSelectedRecord((current) => (current ? applyReportToRecord(current, savedReport) : current));
      setSelectedReport(savedReport);
      setReportContent(savedReport.content);
      setReportImageData(savedReport.imageData ?? null);
      closeReportDialog();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save daily report.';

      if (message === 'A daily report already exists for this date.') {
        try {
          const existingReport = await findExistingDailyReport(selectedRecord.date);

          if (existingReport) {
            setSelectedReport(existingReport);
            setReportContent(existingReport.content);
            setReportImageData(existingReport.imageData ?? null);
            await loadAttendance();
            setError('A report for this date already exists. The existing report has been loaded for editing.');
            return;
          }
        } catch {
        }
      }

      setError(message);
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedReport) {
      return;
    }

    setIsDownloadingReport(true);
    setError('');

    try {
      await apiDownload(
        `/reports/${selectedReport.id}/download`,
        `daily-report-${selectedReport.date}.doc`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report.');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const handleOpenTodayReport = async () => {
    const targetRecord = todayRecord ?? records.find((record) => record.status === 'completed') ?? null;

    if (!targetRecord) {
      setError('No completed attendance record is available for a daily report yet.');
      return;
    }

    await openReportDialog(targetRecord);
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
      setReportImageData(dataUrl);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the selected image.');
    }
  };

  const todayLabel = useMemo(() => {
    return todayRecord?.date ? formatLongDate(todayRecord.date) : formatLongDate(new Date().toISOString());
  }, [todayRecord]);

  const reportsByDate = useMemo(() => {
    const grouped = new Map<string, DailyReport>();

    reports
      .filter((report) => report.type === 'daily')
      .forEach((report) => {
        const dateKey = toDateOnly(report.date);
        const current = grouped.get(dateKey);

        if (!current || report.id > current.id) {
          grouped.set(dateKey, report);
        }
      });

    return grouped;
  }, [reports]);

  const getRecordReport = (record: AttendanceRecord | null) => {
    if (!record) {
      return null;
    }

    return reportsByDate.get(toDateOnly(record.date)) ?? null;
  };

  const requiredHours = schedule.requiredHours || 200;
  const actionLabel = getActionLabel(todayRecord);
  const attendanceCompleted = Boolean(todayRecord?.timeIn && todayRecord?.timeOut);
  const todayReport = getRecordReport(todayRecord);
  const needsDailyReport = attendanceCompleted && !todayReport;
  const scheduleMissing = !schedule.today?.isActive || !schedule.today.startTime || !schedule.today.endTime;
  const remainingHours = useMemo(() => {
    return Math.max(0, Number((requiredHours - summary.totalHours).toFixed(1)));
  }, [requiredHours, summary.totalHours]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" disabled>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Dialog open={isReportDialogOpen} onOpenChange={(open) => (!open ? closeReportDialog() : setIsReportDialogOpen(true))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Daily Log</DialogTitle>
            <DialogDescription>
              {selectedRecord
                ? `Document what you worked on for ${formatLongDate(selectedRecord.date)}.`
                : 'Document what you worked on today.'}
            </DialogDescription>
          </DialogHeader>

          {isLoadingReport ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading daily log...
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Daily Log</Badge>
                <Badge variant="secondary">
                  {getReportStatusLabel(selectedReport?.status ?? null)}
                </Badge>
                {selectedRecord?.timeOut && (
                  <span className="text-sm text-muted-foreground">
                    Clocked out at {formatTime(selectedRecord.timeOut)}
                  </span>
                )}
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                {selectedRecord ? formatLongDate(selectedRecord.date) : '--'}
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-report-content">Daily Tasks and Accomplishments</Label>
                <Textarea
                  id="daily-report-content"
                  rows={10}
                  placeholder="List the tasks you worked on, what you completed, and any important notes from today..."
                  value={reportContent}
                  onChange={(event) => setReportContent(event.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="daily-report-image">Attach Image</Label>
                <input
                  id="daily-report-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSelectImage}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. You can attach one screenshot or photo for this report.
                </p>
                {reportImageData && (
                  <div className="space-y-3 rounded-xl border p-3">
                    <img
                      src={reportImageData}
                      alt="Selected report attachment"
                      className="max-h-64 w-full rounded-lg object-contain bg-muted/30"
                    />
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => setReportImageData(null)}>
                        Remove Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={closeReportDialog} disabled={isSavingReport || isDownloadingReport}>
                  Close
                </Button>
                {selectedReport && (
                  <Button variant="outline" onClick={handleDownloadReport} disabled={isSavingReport || isDownloadingReport}>
                    {isDownloadingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {!isDownloadingReport && <Download className="mr-2 h-4 w-4" />}
                    Download Word
                  </Button>
                )}
                <Button onClick={handleSaveReport} disabled={!reportContent.trim() || isSavingReport || isDownloadingReport}>
                  {isSavingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!isSavingReport && selectedReport && <Pencil className="mr-2 h-4 w-4" />}
                  {selectedReport ? 'Save Changes' : 'Submit Log'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
              <CardDescription>{todayLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-sky-100 p-5 shadow-sm">
                <div className="flex min-h-[220px] flex-col justify-between gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 text-cyan-700 shadow-sm ring-1 ring-cyan-100">
                        <Clock className="h-5.5 w-5.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-cyan-900">Live Time</p>
                        <p className="mt-2 whitespace-nowrap text-[2.15rem] font-semibold leading-none text-slate-900">
                          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="mt-3 text-xs text-cyan-900/70">
                          {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        attendanceCompleted
                          ? 'secondary'
                          : isClockedIn
                            ? 'default'
                            : isMarkedAbsent
                              ? 'secondary'
                            : 'outline'
                      }
                      className="rounded-full px-3 py-1"
                    >
                      {attendanceCompleted ? 'Completed' : isClockedIn ? 'Clocked In' : isMarkedAbsent ? 'Marked Absent' : 'Ready to Clock In'}
                    </Badge>
                  </div>
                  <div>
                    <Button
                      onClick={handleClockAction}
                      className="w-full"
                      size="lg"
                      variant={isClockedIn ? 'destructive' : 'default'}
                      disabled={isSubmitting || attendanceCompleted || isMarkedAbsent}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      {!isSubmitting && <Clock className="mr-2 h-5 w-5" />}
                      {actionLabel}
                    </Button>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading attendance...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Time In</p>
                      <p className="mt-1.5 text-xl font-semibold">{formatTime(todayRecord?.timeIn ?? null)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Time Out</p>
                      <p className="mt-1.5 text-xl font-semibold">{formatTime(todayRecord?.timeOut ?? null)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {!scheduleMissing && (
                      <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">Today's Schedule</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {schedule.today?.label}: {schedule.today?.startTime} - {schedule.today?.endTime}
                            </p>
                          </div>
                          <Badge
                            variant={
                              schedule.status.code === 'late' || schedule.status.code === 'missed'
                                ? 'destructive'
                                : schedule.status.code === 'on-time'
                                  ? 'default'
                                  : schedule.status.code === 'grace'
                                    ? 'outline'
                                  : 'secondary'
                            }
                          >
                            {schedule.status.label}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{schedule.status.detail}</p>
                      </div>
                    )}

                    {isMarkedAbsent && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                        <p className="text-sm font-medium text-amber-900">Marked absent for today</p>
                        <p className="mt-1 text-sm text-amber-800/80">
                          Your supervisor recorded today as absent.
                          {todayRecord?.remarkNote ? ` Note: ${todayRecord.remarkNote}` : ''}
                        </p>
                      </div>
                    )}

                    {scheduleMissing && (
                      <div className="rounded-xl border border-dashed p-4">
                        <p className="text-sm font-medium">Schedule not set</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Ask your admin or supervisor to set your schedule so lateness tracking becomes more accurate.
                        </p>
                      </div>
                    )}

                    {attendanceCompleted && todayRecord && needsDailyReport && (
                      <div className="rounded-xl bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                        Attendance is complete. Use the Daily Log panel on the right to save your log.
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress Toward Completion</CardTitle>
              <CardDescription>Track your required internship hours in one place</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                <div className="rounded-2xl border bg-background p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Rendered</p>
                      <p className="mt-1 text-2xl font-semibold">{summary.totalHours.toFixed(1)}</p>
                    </div>
                    <div className="rounded-full bg-sky-50 p-2.5 text-sky-700">
                      <Clock className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border bg-background p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">This Week</p>
                      <p className="mt-1 text-2xl font-semibold">{summary.thisWeekHours.toFixed(1)}</p>
                    </div>
                    <div className="rounded-full bg-emerald-50 p-2.5 text-emerald-700">
                      <Timer className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border bg-background p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Hours Remaining</p>
                      <p className="mt-1 text-2xl font-semibold">{remainingHours.toFixed(1)}</p>
                    </div>
                    <div className="rounded-full bg-amber-50 p-2.5 text-amber-700">
                      <AlertCircle className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="mt-0.5 text-2xl font-semibold">{summary.progressPercent}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="mt-0.5 text-base font-medium">{remainingHours.toFixed(1)} hrs</p>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500"
                  style={{ width: `${summary.progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>0 hrs</span>
                <span>{requiredHours / 2} hrs</span>
                <span>{requiredHours} hrs</span>
              </div>
              <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {summary.progressPercent >= 100
                  ? `You have completed the ${requiredHours}-hour internship requirement.`
                  : remainingHours <= 40
                    ? `You are almost done. Only ${remainingHours.toFixed(1)} hours remain to complete your internship requirement.`
                    : `You are ${summary.progressPercent}% complete toward the ${requiredHours}-hour internship requirement.`}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Attendance History</CardTitle>
                    <CardDescription>Your recent attendance records and linked daily logs</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    <Calendar className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading attendance history...
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time In</TableHead>
                          <TableHead>Time Out</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Daily Log</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-12 text-center">
                              <div className="flex flex-col items-center justify-center text-center">
                                <Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
                                <p className="text-sm font-medium">No attendance history yet</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Your completed attendance entries will appear here after you start logging hours.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          records.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                              <TableCell>{formatTime(record.timeIn)}</TableCell>
                              <TableCell>{formatTime(record.timeOut)}</TableCell>
                              <TableCell>
                                {record.totalHours == null ? '--' : `${record.totalHours} hrs`}
                              </TableCell>
                              <TableCell>
                                <Badge variant={record.status === 'active' ? 'default' : 'secondary'}>
                                  {record.attendanceStatus === 'absent'
                                    ? 'Absent'
                                    : record.status === 'active'
                                      ? 'Active'
                                      : 'Completed'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {record.attendanceStatus === 'absent' ? (
                                  <span className="text-xs text-muted-foreground">No log required</span>
                                ) : record.status === 'completed' ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openReportDialog(record)}
                                      title={getRecordReport(record) ? 'View or edit daily log' : 'Add daily log'}
                                    >
                                      <FileText className={`h-4 w-4 ${getRecordReport(record) ? 'text-foreground' : 'text-muted-foreground'}`} />
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                      {getReportStatusLabel(getRecordReport(record)?.status ?? null)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Clock out first</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Log Status</CardTitle>
                  <CardDescription>Keep your daily documentation complete every day</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                      {todayReport ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                      ) : (
                        <FileText className="h-4.5 w-4.5 text-amber-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium leading-5">
                      {todayReport ? 'Daily log saved' : needsDailyReport ? 'Daily log pending' : 'Daily log unavailable'}
                        </p>
                        <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                          {todayReport
                            ? 'Your daily log for today has been saved.'
                            : needsDailyReport
                              ? 'You already completed attendance. Submit your daily log next.'
                              : 'Finish today’s attendance first to unlock the report form.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {attendanceCompleted && todayRecord && (
                    <Button type="button" className="h-10 w-full" variant={needsDailyReport ? 'default' : 'outline'} onClick={handleOpenTodayReport}>
                      <FileText className="mr-2 h-4 w-4" />
                      {needsDailyReport ? 'Submit Daily Log' : 'Open Today Log'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>A quick read of your current attendance state</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-sm font-medium">Attendance Entries</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You have logged <span className="font-medium text-foreground">{summary.totalEntries}</span> attendance {summary.totalEntries === 1 ? 'entry' : 'entries'} so far.
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-sm font-medium">Today’s State</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {attendanceCompleted
                        ? 'Today’s attendance is complete.'
                        : isClockedIn
                          ? 'You are actively clocked in right now.'
                          : isMarkedAbsent
                            ? 'You have been marked absent for today.'
                          : 'You are not currently clocked in.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

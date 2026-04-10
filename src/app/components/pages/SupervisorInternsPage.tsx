import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Progress } from '@/app/components/ui/progress';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Users, Search, Loader2, AlertTriangle, Clock3, CalendarClock, ClipboardPen } from 'lucide-react';

type ScheduleStatusCode = 'early' | 'on-time' | 'grace' | 'late' | 'missed' | 'no-schedule';
type AttendanceStatus = 'present' | 'late' | 'absent';
type RemarkValue = 'early-out' | 'half-day' | 'absent';

interface ScheduleEntry {
  day: string;
  label: string;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
}

interface TodayAttendance {
  id: number;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  totalHours: number | null;
  attendanceStatus: AttendanceStatus;
  supervisorRemark: RemarkValue | null;
  remarkNote: string | null;
}

interface SupervisorIntern {
  id: number;
  name: string;
  status: string;
  hoursCompleted: number;
  totalHours: number;
  tasksCompleted: number;
  pendingTasks: number;
  attendance: number;
  schedule: ScheduleEntry | null;
  weeklySchedule: ScheduleEntry[];
  scheduleStatus: {
    code: ScheduleStatusCode;
    label: string;
    detail: string;
  };
  todayAttendance: TodayAttendance | null;
}

interface SupervisorDashboardData {
  stats: {
    activeInterns: number;
    tasksCompleted: number;
    avgPerformance: number;
  };
  interns: SupervisorIntern[];
}

const remarkOptions: Array<{ value: RemarkValue; label: string; helper: string }> = [
  { value: 'early-out', label: 'Early Out', helper: 'Clock the intern out and mark the day as early departure.' },
  { value: 'half-day', label: 'Half Day', helper: 'Clock the intern out and mark the day as a half-day shift.' },
  { value: 'absent', label: 'Absent', helper: 'Mark the intern absent for today when no time-in exists.' },
];

export function SupervisorInternsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SupervisorDashboardData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedInternId, setSelectedInternId] = useState<number | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleEntry[]>([]);
  const [remarkValue, setRemarkValue] = useState<RemarkValue>('early-out');
  const [remarkNote, setRemarkNote] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

  const loadInterns = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiRequest<SupervisorDashboardData>('/dashboard/overview');
      setData(response);

      if (selectedInternId) {
        const refreshedIntern = response.interns.find((intern) => intern.id === selectedInternId);

        if (refreshedIntern) {
          setScheduleDraft(refreshedIntern.weeklySchedule.map((entry) => ({ ...entry })));
          setRemarkNote(refreshedIntern.todayAttendance?.remarkNote ?? '');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interns.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInterns();
  }, []);

  const filteredInterns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return data?.interns ?? [];
    }

    return (data?.interns ?? []).filter((intern) =>
      [
        intern.name,
        intern.scheduleStatus.label,
        intern.scheduleStatus.detail,
        intern.todayAttendance?.supervisorRemark ?? '',
        intern.todayAttendance?.remarkNote ?? '',
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [data?.interns, searchQuery]);

  const selectedIntern = useMemo(
    () => data?.interns.find((intern) => intern.id === selectedInternId) ?? null,
    [data?.interns, selectedInternId],
  );

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';

    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  };

  const getStatusVariant = (code: ScheduleStatusCode) => {
    if (code === 'late' || code === 'missed') return 'destructive';
    if (code === 'on-time') return 'default';
    if (code === 'grace') return 'outline';
    return 'secondary';
  };

  const getSupervisorStatusDetail = (intern: SupervisorIntern) => {
    const { scheduleStatus, schedule } = intern;
    const shiftStart = schedule?.startTime;
    const shiftEnd = schedule?.endTime;

    switch (scheduleStatus.code) {
      case 'late':
        return shiftStart
          ? `${intern.name} is already late for the ${shiftStart} shift.`
          : `${intern.name} is late today.`;
      case 'grace':
        return shiftStart
          ? `${intern.name} is still within the 15-minute grace period for the ${shiftStart} shift.`
          : `${intern.name} is currently within the grace period.`;
      case 'on-time':
        return shiftStart
          ? `${intern.name} clocked in on time for the ${shiftStart} schedule.`
          : `${intern.name} clocked in on time.`;
      case 'early':
        return shiftStart
          ? `${intern.name} is scheduled to start at ${shiftStart}.`
          : `${intern.name} is ahead of schedule today.`;
      case 'missed':
        return shiftEnd
          ? `${intern.name}'s scheduled shift already ended at ${shiftEnd}.`
          : `${intern.name} missed today's scheduled shift.`;
      case 'no-schedule':
      default:
        return `${intern.name} has no schedule set for today.`;
    }
  };

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return '--';
    }

    return new Date(value).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRemarkBadgeLabel = (remark: RemarkValue | null) => {
    switch (remark) {
      case 'early-out':
        return 'Early Out';
      case 'half-day':
        return 'Half Day';
      case 'absent':
        return 'Absent';
      default:
        return null;
    }
  };

  const openManageDialog = (intern: SupervisorIntern) => {
    setSelectedInternId(intern.id);
    setScheduleDraft(intern.weeklySchedule.map((entry) => ({ ...entry })));
    setRemarkValue((intern.todayAttendance?.supervisorRemark ?? 'early-out') as RemarkValue);
    setRemarkNote(intern.todayAttendance?.remarkNote ?? '');
    setIsEditingSchedule(false);
    setIsManageDialogOpen(true);
    setError('');
  };

  const updateScheduleDraft = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setScheduleDraft((current) =>
      current.map((entry) => {
        if (entry.day !== day) {
          return entry;
        }

        const nextEntry = {
          ...entry,
          [field]: value || null,
        };

        return {
          ...nextEntry,
          isActive: Boolean(nextEntry.startTime && nextEntry.endTime),
        };
      }),
    );
  };

  const handleSaveSchedule = async () => {
    if (!selectedIntern) {
      return;
    }

    setIsSavingSchedule(true);
    setError('');

    try {
      await apiRequest(`/attendance/manage/${selectedIntern.id}/schedule`, {
        method: 'PUT',
        body: JSON.stringify({
          schedule: scheduleDraft,
        }),
      });
      await loadInterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleAttendanceAction = async (action: 'time-in' | 'time-out') => {
    if (!selectedIntern) {
      return;
    }

    setIsSubmittingAction(true);
    setError('');

    try {
      await apiRequest(`/attendance/manage/${selectedIntern.id}/${action}`, {
        method: 'POST',
      });
      await loadInterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleApplyRemark = async () => {
    if (!selectedIntern) {
      return;
    }

    setIsSubmittingAction(true);
    setError('');

    try {
      await apiRequest(`/attendance/manage/${selectedIntern.id}/remark`, {
        method: 'PUT',
        body: JSON.stringify({
          remark: remarkValue.replace('-', '_'),
          remarkNote,
        }),
      });
      await loadInterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance remark.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading interns...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle>{selectedIntern ? `Manage ${selectedIntern.name}` : 'Manage Intern'}</DialogTitle>
            <DialogDescription>
              Update schedules, control today&apos;s attendance, and record supervisor remarks like early out, half day, or absent.
            </DialogDescription>
          </DialogHeader>

          {selectedIntern && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                <div className="rounded-xl border bg-muted/20 p-2.5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Today&apos;s Time In</p>
                  <p className="mt-1 text-lg font-semibold">{formatDateTime(selectedIntern.todayAttendance?.timeIn ?? null)}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-2.5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Today&apos;s Time Out</p>
                  <p className="mt-1 text-lg font-semibold">{formatDateTime(selectedIntern.todayAttendance?.timeOut ?? null)}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-2.5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Remark</p>
                  <p className="mt-1 text-lg font-semibold">{getRemarkBadgeLabel(selectedIntern.todayAttendance?.supervisorRemark ?? null) ?? 'None'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border p-3.5">
                  <div>
                    <h3 className="font-semibold">Attendance Controls</h3>
                    <p className="text-sm text-muted-foreground">Clock the intern in or out on their behalf for today.</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button size="sm" onClick={() => handleAttendanceAction('time-in')} disabled={isSubmittingAction}>
                      <Clock3 className="mr-2 h-4 w-4" />
                      Clock In Intern
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAttendanceAction('time-out')} disabled={isSubmittingAction}>
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Clock Out Intern
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border p-3.5 space-y-3">
                  <div>
                    <h3 className="font-semibold">Attendance Remark</h3>
                  </div>
                  <div className="space-y-2">
                    <Label>Remark Type</Label>
                    <Select value={remarkValue} onValueChange={(value: RemarkValue) => setRemarkValue(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {remarkOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="remark-note">Remark Note</Label>
                    <Textarea
                      id="remark-note"
                      rows={3}
                      value={remarkNote}
                      onChange={(event) => setRemarkNote(event.target.value)}
                      placeholder="Add a note about the attendance decision..."
                      className="border-slate-300 bg-background shadow-sm focus-visible:ring-2"
                    />
                  </div>
                  <Button size="sm" className="w-full" onClick={handleApplyRemark} disabled={isSubmittingAction}>
                    {isSubmittingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {!isSubmittingAction && <ClipboardPen className="mr-2 h-4 w-4" />}
                    Apply Remark
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">Weekly Schedule</h3>
                    <p className="text-sm text-muted-foreground">Schedule updates are optional. Open edit mode only when you need to change the intern&apos;s hours.</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isEditingSchedule ? 'outline' : 'default'}
                    onClick={() => setIsEditingSchedule((current) => !current)}
                  >
                    {isEditingSchedule ? 'Hide Edit' : 'Edit Schedule'}
                  </Button>
                </div>

                {isEditingSchedule ? (
                  <div className="mt-4 space-y-2">
                    {scheduleDraft.map((entry) => (
                      <div key={entry.day} className="grid grid-cols-[96px_1fr_1fr] items-center gap-2">
                        <Label className="text-sm">{entry.label}</Label>
                        <Input
                          type="time"
                          value={entry.startTime ?? ''}
                          onChange={(event) => updateScheduleDraft(entry.day, 'startTime', event.target.value)}
                          className="h-9"
                        />
                        <Input
                          type="time"
                          value={entry.endTime ?? ''}
                          onChange={(event) => updateScheduleDraft(entry.day, 'endTime', event.target.value)}
                          className="h-9"
                        />
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleSaveSchedule} disabled={isSavingSchedule}>
                        {isSavingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Schedule
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {scheduleDraft.map((entry) => (
                      <div key={entry.day} className="rounded-xl border bg-muted/20 px-3 py-2">
                        <p className="text-sm font-medium">{entry.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.startTime && entry.endTime ? `${entry.startTime} - ${entry.endTime}` : 'No schedule'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Department Interns</h1>
          <p className="mt-1 text-gray-600">
            {user?.department ? `${user.department} Department` : 'Assigned interns'} overview, attendance monitoring, and supervisor controls
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-[260px] rounded-xl border border-border/80 bg-background shadow-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search interns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-1"
            />
          </div>
          <Button onClick={() => filteredInterns[0] && openManageDialog(filteredInterns[0])} disabled={filteredInterns.length === 0}>
            <ClipboardPen className="mr-2 h-4 w-4" />
            Manage Interns
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Active Interns</p>
            <p className="mt-2 text-3xl font-semibold">{data?.stats.activeInterns ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Interns in your department currently under your supervision</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Completed Tasks</p>
            <p className="mt-2 text-3xl font-semibold">{data?.stats.tasksCompleted ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total tasks completed across your interns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Avg. Performance</p>
            <p className="mt-2 text-3xl font-semibold">{data?.stats.avgPerformance ?? 0}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Calculated from recorded hours progress</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Intern Directory</CardTitle>
          <CardDescription>View interns in your department, manage schedules, and correct attendance records for today.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInterns.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
              {data?.interns.length ? (
                <>
                  <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No interns matched your search</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try another name, remark, or schedule status.</p>
                </>
              ) : (
                <>
                  <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No interns available for this department</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Once interns are assigned to {user?.department ?? 'your department'}, they will appear here.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInterns.map((intern) => (
                <div key={intern.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback>{getInitials(intern.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{intern.name}</h3>
                          <Badge variant={getStatusVariant(intern.scheduleStatus.code)}>
                            {intern.scheduleStatus.label}
                          </Badge>
                          {intern.pendingTasks > 0 && <Badge variant="outline">{intern.pendingTasks} pending</Badge>}
                          {intern.todayAttendance?.supervisorRemark && (
                            <Badge variant="secondary">{getRemarkBadgeLabel(intern.todayAttendance.supervisorRemark)}</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{getSupervisorStatusDetail(intern)}</p>
                        <p className="mt-1.5 text-sm text-gray-600">
                          {intern.schedule?.isActive && intern.schedule.startTime && intern.schedule.endTime
                            ? `${intern.schedule.label}: ${intern.schedule.startTime} - ${intern.schedule.endTime}`
                            : 'No active schedule set today'}
                        </p>
                        {intern.todayAttendance?.remarkNote && (
                          <p className="mt-1 text-xs text-muted-foreground">Remark: {intern.todayAttendance.remarkNote}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {intern.scheduleStatus.code === 'late' || intern.scheduleStatus.code === 'missed' ? (
                        <div className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                          Needs attention
                        </div>
                      ) : null}
                      <Button size="sm" onClick={() => openManageDialog(intern)}>
                        Manage
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-muted/30 p-3.5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Hours Progress</p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span>{intern.hoursCompleted.toFixed(1)} / {intern.totalHours} hrs</span>
                        <span>{intern.attendance}%</span>
                      </div>
                      <Progress value={intern.attendance} className="mt-3 h-2" />
                    </div>
                    <div className="rounded-xl bg-muted/30 p-3.5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance Today</p>
                      <p className="mt-1.5 text-base font-semibold">
                        In: {formatDateTime(intern.todayAttendance?.timeIn ?? null)} / Out: {formatDateTime(intern.todayAttendance?.timeOut ?? null)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {intern.todayAttendance ? `${intern.todayAttendance.attendanceStatus} record` : 'No attendance record yet'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/30 p-3.5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Work</p>
                      <p className="mt-1.5 text-2xl font-semibold">{intern.pendingTasks}</p>
                      <p className="text-sm text-muted-foreground">Pending tasks currently assigned</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

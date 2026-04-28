import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/components/ui/collapsible';
import { UserPlus, Search, MoreVertical, Edit, Trash2, Loader2, ChevronDown, Building2, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/api';

type UserRole = 'intern' | 'supervisor' | 'admin';
type UserStatus = 'active' | 'inactive';

interface ScheduleEntry {
  day: string;
  label: string;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department?: string | null;
  joinDate: string;
  birthdate?: string | null;
  schedule?: ScheduleEntry[];
}

interface Department {
  id: number;
  name: string;
}

interface UserFormState {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  birthdate: string;
  password: string;
  schedule: ScheduleEntry[];
}

interface BatchScheduleState {
  startTime: string;
  endTime: string;
}

type UserSortOption = 'name-asc' | 'name-desc' | 'department-asc' | 'department-desc';

const weekdayDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const defaultSchedule: ScheduleEntry[] = [
  { day: 'monday', label: 'Monday', startTime: '08:00', endTime: '17:00', isActive: true },
  { day: 'tuesday', label: 'Tuesday', startTime: '08:00', endTime: '17:00', isActive: true },
  { day: 'wednesday', label: 'Wednesday', startTime: '08:00', endTime: '17:00', isActive: true },
  { day: 'thursday', label: 'Thursday', startTime: '08:00', endTime: '17:00', isActive: true },
  { day: 'friday', label: 'Friday', startTime: '08:00', endTime: '17:00', isActive: true },
  { day: 'saturday', label: 'Saturday', startTime: null, endTime: null, isActive: false },
  { day: 'sunday', label: 'Sunday', startTime: null, endTime: null, isActive: false },
];

const initialFormState: UserFormState = {
  name: '',
  email: '',
  role: 'intern',
  status: 'active',
  department: '',
  birthdate: '',
  password: '',
  schedule: defaultSchedule,
};

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<UserSortOption>('name-asc');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormState>(initialFormState);
  const [departmentName, setDepartmentName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDepartment, setIsSavingDepartment] = useState(false);
  const [error, setError] = useState('');
  const [departmentError, setDepartmentError] = useState('');
  const [batchSchedule, setBatchSchedule] = useState<BatchScheduleState>({
    startTime: '08:00',
    endTime: '17:00',
  });
  const [batchSelectedDays, setBatchSelectedDays] = useState<string[]>(weekdayDays);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await apiRequest<{ users: User[] }>('/users');
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await apiRequest<{ departments: Department[] }>('/users/departments');
      setDepartments(data.departments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments.');
    }
  };

  useEffect(() => {
    void Promise.all([loadUsers(), loadDepartments()]);
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [
        user.name,
        user.email,
        user.role,
        user.status,
        user.department ?? '',
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchQuery, users]);

  const sortedUsers = useMemo(() => {
    const usersToSort = [...filteredUsers];

    usersToSort.sort((left, right) => {
      const leftDepartment = (left.department ?? '').trim();
      const rightDepartment = (right.department ?? '').trim();

      switch (sortBy) {
        case 'name-desc':
          return right.name.localeCompare(left.name);
        case 'department-asc': {
          const departmentComparison = leftDepartment.localeCompare(rightDepartment);
          return departmentComparison !== 0 ? departmentComparison : left.name.localeCompare(right.name);
        }
        case 'department-desc': {
          const departmentComparison = rightDepartment.localeCompare(leftDepartment);
          return departmentComparison !== 0 ? departmentComparison : left.name.localeCompare(right.name);
        }
        case 'name-asc':
        default:
          return left.name.localeCompare(right.name);
      }
    });

    return usersToSort;
  }, [filteredUsers, sortBy]);

  const filterUsersByRole = (role: string) => {
    if (role === 'all') {
      return sortedUsers;
    }

    return sortedUsers.filter((user) => user.role === role);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'supervisor':
        return 'secondary';
      case 'intern':
      default:
        return 'outline';
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData(initialFormState);
    setBatchSchedule({ startTime: '08:00', endTime: '17:00' });
    setBatchSelectedDays(weekdayDays);
    setIsScheduleOpen(false);
    setError('');
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department ?? '',
      birthdate: user.birthdate ? String(user.birthdate).slice(0, 10) : '',
      password: '',
      schedule: user.schedule?.length
        ? user.schedule.map((entry) => ({ ...entry }))
        : defaultSchedule.map((entry) => ({ ...entry })),
    });
    const mondaySchedule = user.schedule?.find((entry) => entry.day === 'monday');
    setBatchSchedule({
      startTime: mondaySchedule?.startTime ?? '08:00',
      endTime: mondaySchedule?.endTime ?? '17:00',
    });
    setBatchSelectedDays(weekdayDays);
    setIsScheduleOpen(false);
    setError('');
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingUser(null);
    setFormData(initialFormState);
    setBatchSchedule({ startTime: '08:00', endTime: '17:00' });
    setBatchSelectedDays(weekdayDays);
    setIsScheduleOpen(false);
    setError('');
  };

  const openDepartmentDialog = () => {
    setDepartmentName('');
    setDepartmentError('');
    setIsDepartmentDialogOpen(true);
  };

  const closeDepartmentDialog = () => {
    if (isSavingDepartment) {
      return;
    }

    setDepartmentName('');
    setDepartmentError('');
    setIsDepartmentDialogOpen(false);
  };

  const applyBatchSchedule = () => {
    if (!batchSelectedDays.length) {
      setError('Select at least one day for the batch schedule update.');
      return;
    }

    setFormData((current) => ({
      ...current,
      schedule: current.schedule.map((entry) => {
        if (batchSelectedDays.includes(entry.day)) {
          return {
            ...entry,
            startTime: batchSchedule.startTime || null,
            endTime: batchSchedule.endTime || null,
            isActive: Boolean(batchSchedule.startTime && batchSchedule.endTime),
          };
        }

        return entry;
      }),
    }));
    setError('');
  };

  const handleBatchDayToggle = (day: string, checked: boolean) => {
    setBatchSelectedDays((current) =>
      checked ? [...current, day] : current.filter((item) => item !== day),
    );
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError('');

    try {
      if (editingUser) {
        await apiRequest(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...formData,
            password: formData.password || undefined,
          }),
        });
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }

      closeDialog();
      await Promise.all([loadUsers(), loadDepartments()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(`Delete ${user.name}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/users/${user.id}`, { method: 'DELETE' });
      await Promise.all([loadUsers(), loadDepartments()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
    }
  };

  const handleCreateDepartment = async () => {
    setIsSavingDepartment(true);
    setDepartmentError('');

    try {
      const data = await apiRequest<{ department: Department }>('/users/departments', {
        method: 'POST',
        body: JSON.stringify({ name: departmentName }),
      });

      setDepartments((current) =>
        [...current, data.department].sort((left, right) => left.name.localeCompare(right.name)),
      );
      setFormData((current) => ({ ...current, department: data.department.name }));
      closeDepartmentDialog();
    } catch (err) {
      setDepartmentError(err instanceof Error ? err.message : 'Failed to create department.');
    } finally {
      setIsSavingDepartment(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await apiRequest(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status === 'active' ? 'inactive' : 'active',
          department: user.department ?? '',
          birthdate: user.birthdate ? String(user.birthdate).slice(0, 10) : '',
        }),
      });

      await Promise.all([loadUsers(), loadDepartments()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="hidden">
        <Button variant="outline" onClick={openDepartmentDialog}>
          <Building2 className="mr-2 h-4 w-4" />
          Add Department
        </Button>
        <Button onClick={openCreateDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (!open ? closeDialog() : setIsCreateDialogOpen(true))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update this user account.' : 'Create a new user account.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@regris.com"
                  value={formData.email}
                  onChange={(e) => setFormData((current) => ({ ...current, email: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: UserRole) => setFormData((current) => ({ ...current, role: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intern">Intern</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: UserStatus) => setFormData((current) => ({ ...current, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department || '__unassigned__'}
                    onValueChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        department: value === '__unassigned__' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned__">No department</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.name}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthdate">Birthdate</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => setFormData((current) => ({ ...current, birthdate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{editingUser ? 'New Password (optional)' : 'Temporary Password'}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter a temporary password'}
                  value={formData.password}
                  onChange={(e) => setFormData((current) => ({ ...current, password: e.target.value }))}
                />
              </div>
              {formData.role === 'intern' && (
                <Collapsible open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                  <div className="rounded-xl border">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <div>
                          <h3 className="font-medium">Weekly Schedule</h3>
                          <p className="text-sm text-muted-foreground">Open to batch update or edit the intern schedule before saving.</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isScheduleOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-3 border-t p-4">
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                          <div>
                            <p className="text-sm font-medium">Batch Update</p>
                            <p className="text-xs text-muted-foreground">Check the days you want to update, then apply one schedule to all selected days.</p>
                          </div>
                          <div className="grid grid-cols-[1fr_1fr] gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="batch-start-time">Start Time</Label>
                              <Input
                                id="batch-start-time"
                                type="time"
                                value={batchSchedule.startTime}
                                onChange={(e) => setBatchSchedule((current) => ({ ...current, startTime: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="batch-end-time">End Time</Label>
                              <Input
                                id="batch-end-time"
                                type="time"
                                value={batchSchedule.endTime}
                                onChange={(e) => setBatchSchedule((current) => ({ ...current, endTime: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {formData.schedule.map((entry) => (
                              <label key={`batch-${entry.day}`} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                                <Checkbox
                                  checked={batchSelectedDays.includes(entry.day)}
                                  onCheckedChange={(checked) => handleBatchDayToggle(entry.day, checked === true)}
                                />
                                <span>{entry.label}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={applyBatchSchedule}
                              disabled={!batchSchedule.startTime || !batchSchedule.endTime || batchSelectedDays.length === 0}
                            >
                              Apply to Checked Days
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {formData.schedule.map((entry) => (
                            <div key={entry.day} className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
                              <Label>{entry.label}</Label>
                              <Input
                                type="time"
                                value={entry.startTime ?? ''}
                                onChange={(e) => setFormData((current) => ({
                                  ...current,
                                  schedule: current.schedule.map((item) => item.day === entry.day
                                    ? {
                                        ...item,
                                        startTime: e.target.value || null,
                                        isActive: Boolean((e.target.value || item.endTime) && (item.endTime || e.target.value)),
                                      }
                                    : item),
                                }))}
                              />
                              <Input
                                type="time"
                                value={entry.endTime ?? ''}
                                onChange={(e) => setFormData((current) => ({
                                  ...current,
                                  schedule: current.schedule.map((item) => item.day === entry.day
                                    ? {
                                        ...item,
                                        endTime: e.target.value || null,
                                        isActive: Boolean((item.startTime || e.target.value) && (e.target.value || item.startTime)),
                                      }
                                    : item),
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
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
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUser ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isDepartmentDialogOpen} onOpenChange={(open) => (!open ? closeDepartmentDialog() : setIsDepartmentDialogOpen(true))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Department</DialogTitle>
              <DialogDescription>Create a department option for new and existing users.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="departmentName">Department Name</Label>
                <Input
                  id="departmentName"
                  placeholder="Engineering"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                />
              </div>
              {departmentError && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {departmentError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDepartmentDialog} disabled={isSavingDepartment}>
                Cancel
              </Button>
              <Button onClick={handleCreateDepartment} disabled={isSavingDepartment || !departmentName.trim()}>
                {isSavingDepartment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Save Department
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateDialogOpen && !isDepartmentDialogOpen && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="mt-2 text-3xl font-semibold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Interns</p>
            <p className="mt-2 text-3xl font-semibold">{users.filter((user) => user.role === 'intern').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Supervisors</p>
            <p className="mt-2 text-3xl font-semibold">{users.filter((user) => user.role === 'supervisor').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Admins</p>
            <p className="mt-2 text-3xl font-semibold">{users.filter((user) => user.role === 'admin').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage all system users</CardDescription>
            </div>
            <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-end lg:justify-end">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
                <div className="min-w-[200px] space-y-1">
                  <Label htmlFor="user-sort" className="text-xs text-muted-foreground">Sort users</Label>
                  <Select value={sortBy} onValueChange={(value: UserSortOption) => setSortBy(value)}>
                    <SelectTrigger id="user-sort" className="w-full bg-white sm:w-[200px]">
                      <SelectValue placeholder="Sort users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name A-Z</SelectItem>
                      <SelectItem value="name-desc">Name Z-A</SelectItem>
                      <SelectItem value="department-asc">Department A-Z</SelectItem>
                      <SelectItem value="department-desc">Department Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full max-w-[320px] space-y-1">
                  <Label htmlFor="user-search" className="text-xs text-muted-foreground">Search users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="user-search"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row xl:pl-4">
                <Button variant="outline" onClick={openDepartmentDialog}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Add Department
                </Button>
                <Button onClick={openCreateDialog}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading users...
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="intern">Interns</TabsTrigger>
                <TabsTrigger value="supervisor">Supervisors</TabsTrigger>
                <TabsTrigger value="admin">Admins</TabsTrigger>
              </TabsList>

              {['all', 'intern', 'supervisor', 'admin'].map((role) => (
                <TabsContent key={role} value={role}>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Join Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterUsersByRole(role).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                              No users found for this filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filterUsersByRole(role).map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>{user.department || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(user.joinDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit User
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteUser(user)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete User
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

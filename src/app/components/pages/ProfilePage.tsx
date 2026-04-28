import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, Phone, MapPin, Calendar, Building, Cake, LockKeyhole, Loader2 } from 'lucide-react';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const nameParts = user?.name.trim().split(/\s+/).filter(Boolean) ?? [];
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] ?? '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const birthdateValue = user?.birthdate ? String(user.birthdate).slice(0, 10) : '';
  const [formState, setFormState] = useState({
    firstName,
    lastName,
    email: user?.email ?? '',
    phone: '',
    birthdate: birthdateValue,
    address: '',
    department: user?.department ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormState({
      firstName,
      lastName,
      email: user?.email ?? '',
      phone: '',
      birthdate: birthdateValue,
      address: '',
      department: user?.department ?? '',
    });
  }, [birthdateValue, firstName, lastName, user?.department, user?.email]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';

    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  };

  const calculateAge = (birthdate: string) => {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatBirthdate = (birthdate: string) => {
    const [year, month, day] = birthdate.split('-').map(Number);

    if (!year || !month || !day) {
      return birthdate;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  };

  const handleSaveChanges = async () => {
    if (!user) {
      return;
    }

    const fullName = [formState.firstName.trim(), formState.lastName.trim()].filter(Boolean).join(' ');

    if (!fullName || !formState.email.trim()) {
      toast.error('First name, last name, and email are required.');
      return;
    }

    setIsSaving(true);

    try {
      const data = await apiRequest<{ user: typeof user }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: fullName,
          email: formState.email.trim(),
          department: formState.department.trim(),
          birthdate: formState.birthdate || null,
        }),
      });

      updateUser(data.user);
      toast.success('Profile updated successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-4 pb-8 pt-0">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="h-full">
          <CardContent className="flex h-full flex-col p-5">
            <div className="flex h-full flex-col">
              <div className="space-y-4 text-center">
                <Avatar className="mx-auto h-24 w-24 ring-8 ring-slate-50">
                  <AvatarFallback className="text-2xl">
                  {user && getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{user?.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                  {birthdateValue && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-sm text-gray-600">
                        {formatBirthdate(birthdateValue)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {calculateAge(birthdateValue)} years old
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-2 rounded-2xl border border-border/60 bg-slate-50/70 p-3">
                {user?.department && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Department</span>
                    <span className="font-medium text-slate-900">{user.department}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Account status</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Employee ID</span>
                  <span className="font-medium text-slate-900">
                    {user?.id ? `EMP-${String(user.id).padStart(4, '0')}` : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-5">
                <Button variant="outline" className="w-full">
                  Change Photo
                </Button>
                <p className="mt-2 text-center text-xs text-slate-500">
                  JPG or PNG, square crop recommended.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full lg:col-span-2">
          <CardHeader className="px-5 pb-3 pt-5">
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Edit the details connected to your account</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-8">
            <div className="space-y-5">
              <div className="space-y-3 px-4 pb-1">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">Personal Info</h3>
                  <p className="text-xs text-slate-500">Core details that appear in your profile and team views.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="font-medium text-slate-800">First Name</Label>
                    <Input 
                      id="firstName" 
                      className="border-white bg-background shadow-sm"
                      value={formState.firstName}
                      onChange={(e) => setFormState((current) => ({ ...current, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="font-medium text-slate-800">Last Name</Label>
                    <Input 
                      id="lastName" 
                      className="border-white bg-background shadow-sm"
                      value={formState.lastName}
                      onChange={(e) => setFormState((current) => ({ ...current, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="birthdate" className="font-medium text-slate-800">Birthdate</Label>
                    <div className="relative">
                      <Cake className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="birthdate"
                        type="date"
                        className="border-border/60 bg-background pl-10 shadow-sm"
                        value={formState.birthdate}
                        onChange={(e) => setFormState((current) => ({ ...current, birthdate: e.target.value }))}
                      />
                    </div>
                  </div>

                  {(user?.role === 'intern' || user?.role === 'supervisor') && (
                    <div className="space-y-1.5">
                      <Label htmlFor="department" className="font-medium text-slate-800">Department</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="department"
                          className="border-border/60 bg-background pl-10 shadow-sm"
                          value={formState.department}
                          onChange={(e) => setFormState((current) => ({ ...current, department: e.target.value }))}
                          placeholder="Engineering"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="font-medium text-slate-800">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input 
                      id="address"
                      className="border-border/60 bg-background pl-10 shadow-sm"
                      value={formState.address}
                      onChange={(e) => setFormState((current) => ({ ...current, address: e.target.value }))}
                      placeholder="Enter your address"
                    />
                  </div>
                </div>
              </div>

              <div className="mx-4 h-px bg-border/70" />

              <div className="space-y-3 px-4 pb-1">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">Contact Info</h3>
                  <p className="text-xs text-slate-500">Channels your team can use for updates, scheduling, and notices.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="font-medium text-slate-800">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        className="border-border/60 bg-background pl-10 shadow-sm"
                        value={formState.email}
                        onChange={(e) => setFormState((current) => ({ ...current, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="font-medium text-slate-800">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        className="border-border/60 bg-background pl-10 shadow-sm"
                        value={formState.phone}
                        onChange={(e) => setFormState((current) => ({ ...current, phone: e.target.value }))}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {user?.role === 'intern' && (
                <>
                  <div className="mx-4 h-px bg-border/70" />
                  <div className="space-y-3 px-4 pb-1">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">Internship Schedule</h3>
                    <p className="text-xs text-slate-500">Track the active placement dates tied to your role.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="startDate" className="font-medium text-slate-800">Start Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input 
                          id="startDate"
                          type="date"
                          className="border-white bg-background pl-10 shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="endDate" className="font-medium text-slate-800">End Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input 
                          id="endDate"
                          type="date"
                          className="border-white bg-background pl-10 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                  </div>
                </>
              )}

              <div className="mx-4 h-px bg-border/70" />

              <div className="space-y-3 px-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">Security</h3>
                  <p className="text-xs text-slate-500">Manage your password and keep account access secure.</p>
                </div>
                <div className="flex h-full flex-col gap-3 rounded-2xl border border-border/50 bg-background/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Password</h3>
                    <p className="text-xs text-muted-foreground">
                      Keep your account secure by updating your password here.
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="sm:self-start">
                        <LockKeyhole className="mr-2 h-4 w-4" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your current password and choose a new one.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input id="currentPassword" type="password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input id="newPassword" type="password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input id="confirmPassword" type="password" />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button type="button">Update Password</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  disabled={isSaving}
                  onClick={() =>
                    setFormState({
                      firstName,
                      lastName,
                      email: user?.email ?? '',
                      phone: '',
                      birthdate: birthdateValue,
                      address: '',
                      department: user?.department ?? '',
                    })
                  }
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

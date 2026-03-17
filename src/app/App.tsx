import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/app/contexts/AuthContext';
import { Badge } from '@/app/components/ui/badge';
import { LoginPage } from '@/app/components/LoginPage';
import { Sidebar } from '@/app/components/Sidebar';
import { InternDashboard } from '@/app/components/dashboards/InternDashboard';
import { SupervisorDashboard } from '@/app/components/dashboards/SupervisorDashboard';
import { AdminDashboard } from '@/app/components/dashboards/AdminDashboard';
import { AttendancePage } from '@/app/components/pages/AttendancePage';
import { TasksPage } from '@/app/components/pages/TasksPage';
import { ReportsPage } from '@/app/components/pages/ReportsPage';
import { MessagesPage } from '@/app/components/pages/MessagesPage';
import { ProfilePage } from '@/app/components/pages/ProfilePage';
import { UserManagementPage } from '@/app/components/pages/UserManagementPage';
import { AnalyticsPage } from '@/app/components/pages/AnalyticsPage';

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border border-border/60 bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
          Connecting to Supabase...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        if (user?.role === 'intern') return <InternDashboard />;
        if (user?.role === 'supervisor') return <SupervisorDashboard />;
        if (user?.role === 'admin') return <AdminDashboard />;
        return null;
      case 'attendance':
        return <AttendancePage />;
      case 'tasks':
        return <TasksPage />;
      case 'reports':
        return <ReportsPage />;
      case 'messages':
        return <MessagesPage />;
      case 'profile':
        return <ProfilePage />;
      case 'users':
        return <UserManagementPage />;
      case 'analytics':
        return <AnalyticsPage />;
      default:
        return <div className="p-8 text-center text-gray-500">Page not found</div>;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_30%)]" />
      <div className="relative flex min-h-screen">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-y-auto">
          <div className="border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Intern Management Dashboard</p>
                <h1 className="text-xl font-semibold tracking-tight">Operations workspace</h1>
              </div>
              {user && (
                <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
                  {user.role} access
                </Badge>
              )}
            </div>
          </div>
          <div className="p-2 sm:p-4">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

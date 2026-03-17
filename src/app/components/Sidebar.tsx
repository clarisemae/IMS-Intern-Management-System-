import React from 'react';
import { useAuth, UserRole } from '@/app/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { 
  LayoutDashboard, 
  Clock, 
  ListTodo, 
  FileText, 
  MessageSquare, 
  User, 
  LogOut,
  Users,
  BarChart3,
  Building2
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  id: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', roles: ['intern', 'supervisor', 'admin'] },
  { icon: Clock, label: 'Attendance', id: 'attendance', roles: ['intern'] },
  { icon: ListTodo, label: 'Tasks', id: 'tasks', roles: ['intern', 'supervisor'] },
  { icon: FileText, label: 'Reports', id: 'reports', roles: ['intern', 'supervisor'] },
  { icon: MessageSquare, label: 'Messages', id: 'messages', roles: ['intern', 'supervisor', 'admin'] },
  { icon: Users, label: 'User Management', id: 'users', roles: ['admin'] },
  { icon: BarChart3, label: 'Analytics', id: 'analytics', roles: ['admin', 'supervisor'] },
  { icon: User, label: 'Profile', id: 'profile', roles: ['intern', 'supervisor', 'admin'] },
];

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const initials = user?.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex w-20 shrink-0 flex-col border-r border-border/60 bg-card/60 backdrop-blur lg:w-72">
      <div className="border-b border-border/60 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-lg font-semibold tracking-tight">REGRIS</h1>
            <p className="text-xs text-muted-foreground">Internship Portal</p>
          </div>
        </div>
      </div>

      {user && (
        <div className="border-b border-border/60 p-5">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <Avatar className="h-11 w-11 border">
                <AvatarFallback className="bg-muted text-sm font-semibold">{initials || 'RG'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 hidden lg:block">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
              </div>
            </div>
            <div className="min-w-0 flex-1 hidden lg:block">
              {user.department && (
                <Badge variant="secondary" className="mt-3 rounded-full">{user.department}</Badge>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden font-medium lg:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-4">
        <Button
          variant="outline"
          className="w-full justify-center rounded-xl lg:justify-start"
          onClick={logout}
          title="Logout"
        >
          <LogOut className="h-5 w-5 lg:mr-3" />
          <span className="hidden lg:inline">Logout</span>
        </Button>
      </div>
    </aside>
  );
}

import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { useLogout } from '@workspace/api-client-react';
import { LayoutDashboard, FileText, Users, Settings, LogOut, Radio, Tag, Layers, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, clearAuth } = useAuthStore();
  const logout = useLogout();

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch (e) {
      // Ignore errors on logout
    } finally {
      clearAuth();
      setLocation('/login');
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['COMERCIAL', 'ADMIN'] },
    { icon: FileText, label: 'Propostas', href: '/proposals', roles: ['COMERCIAL', 'ADMIN'] },
    { icon: Users, label: 'Anunciantes', href: '/advertisers', roles: ['COMERCIAL', 'ADMIN'] },
  ];

  const adminItems = [
    { icon: UserCircle, label: 'Usuários', href: '/admin/users' },
    { icon: Radio, label: 'Emissora', href: '/admin/station' },
    { icon: Tag, label: 'Templates de Produto', href: '/admin/product-templates' },
    { icon: Layers, label: 'Categorias de Proposta', href: '/admin/proposal-categories' },
    { icon: FileText, label: 'Templates de Proposta', href: '/admin/proposal-templates' },
  ];

  const renderLink = (item: any) => {
    const isActive = location === item.href || location.startsWith(`${item.href}/`);
    return (
      <Link href={item.href} key={item.href}>
        <span className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
          isActive 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
          <item.icon className="w-4 h-4" />
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Radio className="w-6 h-6" />
            <span>Genesis</span>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-1">
            {navItems.filter(i => i.roles.includes(user.role)).map(renderLink)}
          </div>

          {user.role === 'ADMIN' && (
            <div className="mt-8">
              <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Administração
              </h4>
              <div className="space-y-1">
                {adminItems.map(renderLink)}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

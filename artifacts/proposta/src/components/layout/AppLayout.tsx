import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { useLogout } from '@workspace/api-client-react';
import { BellRing, Building2, FileCog, FileText, Users, LogOut, Radio, Package, Layers, UserCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RecallReminderProvider, useRecallReminderCount } from '@/components/notifications/RecallReminderProvider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, clearAuth } = useAuthStore();
  const logout = useLogout();
  const recallCountQuery = useRecallReminderCount();

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  if (!user) return null;
  const userAvatar = (user as any).avatarBase64 as string | null | undefined;
  const recallDueCount = recallCountQuery.data?.due ?? 0;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      toast.success('Sessão encerrada com sucesso');
    } catch (e) {
      toast.error('Sessão local encerrada. Não foi possível confirmar o logout no servidor.');
    } finally {
      clearAuth();
      setLocation('/login');
    }
  };

  const navItems = [
    { icon: Radio, label: 'Dashboard', href: '/dashboard', roles: ['ADMIN'] },
    { icon: FileText, label: 'Propostas', href: '/proposals', roles: ['COMERCIAL', 'ADMIN'] },
    { icon: BellRing, label: 'Avisos de Recaptura', href: '/recall-reminders', roles: ['COMERCIAL', 'ADMIN'], badge: recallDueCount },
    { icon: Users, label: 'Clientes', href: '/advertisers', roles: ['COMERCIAL', 'ADMIN'] },
    { icon: UserPlus, label: 'Leads', href: '/leads', roles: ['COMERCIAL', 'ADMIN'] },
    { icon: Layers, label: 'Programas', href: '/programs', roles: ['COMERCIAL'] },
  ];

  const adminItems = [
    { icon: UserCircle, label: 'Usuários', href: '/admin/users' },
    { icon: Building2, label: 'Empresas', href: '/admin/station' },
    { icon: Package, label: 'Produtos', href: '/admin/product-templates' },
    { icon: Layers, label: 'Programas', href: '/admin/proposal-categories' },
    { icon: FileCog, label: 'Tipos de Proposta', href: '/admin/proposal-types' },
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
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge > 0 && (
            <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
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
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
          </div>
          <Link href="/profile">
            <span className={cn(
              "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
              location === '/profile'
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <UserCircle className="w-4 h-4 mr-2" />
              Meu Perfil
            </span>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar sessão?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você será desconectado do sistema e precisará entrar novamente para continuar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Não</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Sim</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <RecallReminderProvider />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

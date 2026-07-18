import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { useLogout } from '@workspace/api-client-react';
import { LogOut, UserCircle } from 'lucide-react';
import { feedback } from '@/lib/feedback';
import { cn } from '@/lib/utils';
import { RecallReminderProvider, useRecallReminderCount } from '@/components/notifications/RecallReminderProvider';
import { MobileNavigationSheet } from '@/components/layout/MobileNavigationSheet';
import {
  adminNavigation,
  isNavigationItemActive,
  mainNavigation,
  type NavigationItem,
} from '@/components/layout/navigation';
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
  const mainRef = React.useRef<HTMLElement>(null);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  React.useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location]);

  if (!user) return null;
  const userAvatar = (user as any).avatarBase64 as string | null | undefined;
  const recallDueCount = recallCountQuery.data?.due ?? 0;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      feedback.success('Sessão encerrada com sucesso');
    } catch (e) {
      feedback.error('Sessão local encerrada. Não foi possível confirmar o logout no servidor.');
    } finally {
      clearAuth();
      setLocation('/login');
    }
  };

  const navItems = mainNavigation
    .filter((item) => !item.roles || item.roles.includes(user.role))
    .map((item) => (
      item.href === '/recall-reminders' ? { ...item, badge: recallDueCount } : item
    ));

  const renderLink = (item: NavigationItem) => {
    const isActive = isNavigationItemActive(location, item.href);
    return (
      <Link href={item.href} key={item.href}>
        <span className={cn(
          "flex min-h-10 items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
          isActive 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
          <item.icon className="w-4 h-4" />
          <span className="flex-1 truncate">{item.label}</span>
          {(item.badge ?? 0) > 0 && (
            <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground">
              {(item.badge ?? 0) > 99 ? '99+' : item.badge}
            </span>
          )}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen min-h-dvh bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="p-6">
          <div className="flex flex-col gap-1">
            <img
              src="/brand/gtf-logo-horizontal.png"
              alt="GTF"
              className="h-5 w-fit max-w-[150px] object-contain"
            />
            <div className="leading-tight">
{/*               <p className="text-sm font-bold tracking-tight text-foreground">GTF Propostas</p>
 */}              <p className="text-[20px] font-large text-muted-foreground">Sistema Comercial GTF</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-1">
            {navItems.map(renderLink)}
          </div>

          {user.role === 'ADMIN' && (
            <div className="mt-8">
              <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Administração
              </h4>
              <div className="space-y-1">
                {adminNavigation.map(renderLink)}
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
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <RecallReminderProvider />
        <header className="sticky top-0 z-40 flex min-h-14 items-center gap-3 border-b bg-background/95 px-3 pb-2 pt-[max(.5rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
          <MobileNavigationSheet
            location={location}
            user={{
              name: user.name,
              role: user.role,
              avatarBase64: userAvatar,
            }}
            recallDueCount={recallDueCount}
            onLogout={handleLogout}
          />
          <img
            src="/brand/gtf-logo-horizontal.png"
            alt="GTF"
            className="h-4 w-fit max-w-[112px] object-contain"
          />
          <span className="min-w-0 flex-1 truncate text-right text-xs font-medium text-muted-foreground">
            Sistema Comercial GTF
          </span>
        </header>
        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { useLogout } from '@workspace/api-client-react';
import { LogOut, PanelLeftClose, PanelLeftOpen, UserCircle } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, clearAuth } = useAuthStore();
  const logout = useLogout();
  const recallCountQuery = useRecallReminderCount();
  const mainRef = React.useRef<HTMLElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('gtf-sidebar-collapsed') === 'true';
  });

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  React.useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location]);

  React.useEffect(() => {
    window.localStorage.setItem('gtf-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

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

  const withCollapsedTooltip = (label: string, content: React.ReactNode) => {
    if (!isSidebarCollapsed) return content;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block">{content}</span>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderLink = (item: NavigationItem) => {
    const isActive = isNavigationItemActive(location, item.href);
    const link = (
      <Link href={item.href} key={item.href}>
        <span className={cn(
          "relative flex min-h-10 items-center rounded-md text-sm font-medium transition-colors cursor-pointer",
          isSidebarCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
          isActive 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
          aria-label={item.label}
          title={isSidebarCollapsed ? item.label : undefined}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className={cn("min-w-0 flex-1 truncate", isSidebarCollapsed && "sr-only")}>
            {item.label}
          </span>
          {(item.badge ?? 0) > 0 && (
            <span className={cn(
              "rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground",
              isSidebarCollapsed ? "absolute right-1 top-1 min-w-4 px-1 text-center" : "ml-auto"
            )}>
              {(item.badge ?? 0) > 99 ? '99+' : item.badge}
            </span>
          )}
        </span>
      </Link>
    );

    return withCollapsedTooltip(item.label, link);
  };

  return (
    <div className="flex min-h-screen min-h-dvh bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-card transition-[width] duration-200 lg:flex",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <TooltipProvider delayDuration={150}>
          <div className={cn("shrink-0", isSidebarCollapsed ? "px-3 py-4" : "p-6")}>
            <div className={cn(
              "flex gap-3",
              isSidebarCollapsed ? "flex-col items-center" : "items-start justify-between"
            )}>
              <div className={cn(
                "min-w-0",
                isSidebarCollapsed ? "flex justify-center" : "flex flex-col gap-1"
              )}>
                <img
                  src={isSidebarCollapsed ? "/brand/gtf-logo-completa.png" : "/brand/gtf-logo-horizontal.png"}
                  alt="GTF"
                  className={cn(
                    "object-contain",
                    isSidebarCollapsed ? "h-10 w-10 rounded-md" : "h-5 w-fit max-w-[150px]"
                  )}
                />
                {!isSidebarCollapsed && (
                  <div className="leading-tight">
                    <p className="text-[20px] font-large text-muted-foreground">Sistema Comercial GTF</p>
                  </div>
                )}
              </div>
              {withCollapsedTooltip(
                isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral',
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                  title={isSidebarCollapsed ? 'Expandir menu lateral' : undefined}
                  onClick={() => setIsSidebarCollapsed((value) => !value)}
                >
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className={cn("min-h-0 flex-1", isSidebarCollapsed ? "px-3" : "px-4")}>
            <div className="space-y-1">
              {navItems.map(renderLink)}
            </div>

            {user.role === 'ADMIN' && (
              <div className={cn(isSidebarCollapsed ? "mt-6 border-t pt-4" : "mt-8")}>
                {!isSidebarCollapsed && (
                  <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Administração
                  </h4>
                )}
                <div className="space-y-1">
                  {adminNavigation.map(renderLink)}
                </div>
              </div>
            )}
          </ScrollArea>

          <div className={cn(
            "mt-auto shrink-0 border-t border-border",
            isSidebarCollapsed ? "p-3" : "p-4"
          )}>
            {withCollapsedTooltip(
              `${user.name} · ${user.role}`,
              <div className={cn(
                "mb-2 flex items-center rounded-md py-2",
                isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"
              )}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 font-bold text-primary">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.role}</p>
                  </div>
                )}
              </div>
            )}
            {withCollapsedTooltip(
              'Meu Perfil',
              <Link href="/profile">
                <span className={cn(
                  "flex min-h-10 items-center rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isSidebarCollapsed ? "justify-center px-2 py-2" : "px-4 py-2",
                  location === '/profile'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                  aria-label="Meu Perfil"
                  title={isSidebarCollapsed ? 'Meu Perfil' : undefined}
                >
                  <UserCircle className={cn("h-4 w-4 shrink-0", !isSidebarCollapsed && "mr-2")} />
                  <span className={cn(isSidebarCollapsed && "sr-only")}>Meu Perfil</span>
                </span>
              </Link>
            )}
            <AlertDialog>
              {withCollapsedTooltip(
                'Sair',
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "min-h-10 w-full text-muted-foreground hover:text-foreground",
                      isSidebarCollapsed ? "justify-center px-2" : "justify-start"
                    )}
                    aria-label="Sair"
                    title={isSidebarCollapsed ? 'Sair' : undefined}
                  >
                    <LogOut className={cn("h-4 w-4 shrink-0", !isSidebarCollapsed && "mr-2")} />
                    <span className={cn(isSidebarCollapsed && "sr-only")}>Sair</span>
                  </Button>
                </AlertDialogTrigger>
              )}
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
        </TooltipProvider>
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

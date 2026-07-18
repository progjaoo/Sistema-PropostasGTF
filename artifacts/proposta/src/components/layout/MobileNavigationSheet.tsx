import React from 'react';
import { Link } from 'wouter';
import { LogOut, Menu, UserCircle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  adminNavigation,
  isNavigationItemActive,
  mainNavigation,
  type NavigationItem,
} from './navigation';

type MobileNavigationSheetProps = {
  location: string;
  user: {
    name: string;
    role: 'ADMIN' | 'COMERCIAL';
    avatarBase64?: string | null;
  };
  recallDueCount: number;
  onLogout: () => Promise<void>;
};

function NavigationLink({
  item,
  active,
  onNavigate,
}: {
  item: NavigationItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link href={item.href} onClick={onNavigate}>
      <span
        className={cn(
          'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {(item.badge ?? 0) > 0 ? (
          <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground">
            {(item.badge ?? 0) > 99 ? '99+' : item.badge}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function MobileNavigationSheet({
  location,
  user,
  recallDueCount,
  onLogout,
}: MobileNavigationSheetProps) {
  const [open, setOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const visibleMainNavigation = mainNavigation
    .filter((item) => !item.roles || item.roles.includes(user.role))
    .map((item) => (
      item.href === '/recall-reminders' ? { ...item, badge: recallDueCount } : item
    ));

  React.useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative lg:hidden"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="h-5 w-5" />
            {recallDueCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-destructive" />
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex h-dvh w-[min(88vw,360px)] flex-col gap-0 p-0"
        >
          <SheetHeader className="border-b px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-left">
            <img
              src="/brand/gtf-logo-horizontal.png"
              alt="GTF"
              className="h-5 w-fit max-w-[145px] object-contain"
            />
            <SheetTitle className="pt-1 text-base">Sistema Comercial GTF</SheetTitle>
            <SheetDescription className="sr-only">
              Navegação principal do sistema
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1 px-4 py-4">
            <nav className="space-y-1" aria-label="Navegação principal">
              {visibleMainNavigation.map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  active={isNavigationItemActive(location, item.href)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </nav>

            {user.role === 'ADMIN' ? (
              <div className="mt-7">
                <h2 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                  Administração
                </h2>
                <nav className="space-y-1" aria-label="Administração">
                  {adminNavigation.map((item) => (
                    <NavigationLink
                      key={item.href}
                      item={item}
                      active={isNavigationItemActive(location, item.href)}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </nav>
              </div>
            ) : null}
          </ScrollArea>

          <div className="border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mb-2 flex items-center gap-3 rounded-md px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 font-bold text-primary">
                {user.avatarBase64 ? (
                  <img src={user.avatarBase64} alt="" className="h-full w-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.role}</p>
              </div>
            </div>

            <Link href="/profile" onClick={() => setOpen(false)}>
              <span
                className={cn(
                  'flex min-h-11 cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium',
                  isNavigationItemActive(location, '/profile')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <UserCircle className="mr-3 h-4 w-4" />
                Meu Perfil
              </span>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start px-3 text-muted-foreground"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="mr-1 h-4 w-4" />
              Sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado do sistema e precisará entrar novamente para continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLogoutOpen(false);
                setOpen(false);
                void onLogout();
              }}
            >
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


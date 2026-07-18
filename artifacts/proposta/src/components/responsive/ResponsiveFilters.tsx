import React from 'react';
import { ListFilter } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

type ResponsiveFiltersProps = {
  children: React.ReactNode;
  activeCount?: number;
  onClear?: () => void;
  className?: string;
  desktopClassName?: string;
  title?: string;
};

export function ResponsiveFilters({
  children,
  activeCount = 0,
  onClear,
  className,
  desktopClassName,
  title = 'Filtros',
}: ResponsiveFiltersProps) {
  const compact = useMediaQuery('(max-width: 1023px)');
  const [open, setOpen] = React.useState(false);

  if (!compact) {
    return (
      <div className={cn('grid gap-3', desktopClassName, className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full justify-between sm:w-auto">
            <span className="inline-flex items-center gap-2">
              <ListFilter className="h-4 w-4" />
              {title}
            </span>
            {activeCount > 0 ? (
              <Badge className="ml-2 min-w-6 justify-center">{activeCount}</Badge>
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-xl">
          <SheetHeader className="pr-10 text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              Refine os resultados exibidos nesta página.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-5">{children}</div>
          <SheetFooter className="safe-bottom sticky bottom-0 -mx-6 border-t bg-background px-6 pt-4">
            {onClear ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
            <Button type="button" onClick={() => setOpen(false)}>
              Ver resultados
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}


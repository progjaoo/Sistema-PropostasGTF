import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import {
  fetchRecallReminderCount,
  fetchRecallReminders,
  notifyRecallReminder,
  type RecallReminder,
} from '@/lib/recall-reminders';
import { RecallReminderDialog } from './RecallReminderDialog';

const DISMISSED_SESSION_KEY = 'recall-reminder-dialog-dismissed';

export const recallReminderQueryKeys = {
  list: ['recall-reminders'],
  count: ['recall-reminders-count'],
};

export function useRecallReminderCount() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: recallReminderQueryKeys.count,
    queryFn: fetchRecallReminderCount,
    enabled: Boolean(user),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function RecallReminderProvider() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const remindersQuery = useQuery({
    queryKey: recallReminderQueryKeys.list,
    queryFn: () => fetchRecallReminders({ limit: 5 }),
    enabled: Boolean(user),
    refetchInterval: 5 * 60 * 1000,
  });

  const notifyMutation = useMutation({
    mutationFn: async (reminders: RecallReminder[]) => {
      await Promise.all(reminders.map((reminder) => notifyRecallReminder(reminder.id)));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: recallReminderQueryKeys.count });
      queryClient.invalidateQueries({ queryKey: recallReminderQueryKeys.list });
    },
  });

  const reminders = remindersQuery.data?.items ?? [];

  React.useEffect(() => {
    if (!user || reminders.length === 0) return;
    if (sessionStorage.getItem(DISMISSED_SESSION_KEY)) return;
    setDialogOpen(true);
  }, [user, reminders.length]);

  React.useEffect(() => {
    if (!dialogOpen || reminders.length === 0 || notifyMutation.isPending) return;
    notifyMutation.mutate(reminders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      sessionStorage.setItem(DISMISSED_SESSION_KEY, new Date().toISOString());
    }
  };

  return (
    <RecallReminderDialog
      open={dialogOpen}
      reminders={reminders}
      onOpenChange={handleOpenChange}
    />
  );
}


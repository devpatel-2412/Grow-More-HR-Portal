import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquarePlus } from 'lucide-react';
import { useActivities, useLogActivity } from '../hooks/useCrm';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import type { CrmActivityType } from '../types/crm.types';

const ACTIVITY_TYPES: CrmActivityType[] = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];

export function ActivityLog({ leadId, clientId }: { leadId?: string; clientId?: string }) {
  const { data } = useActivities({ page: 1, limit: 50, leadId, clientId });
  const logMutation = useLogActivity();
  const [type, setType] = useState<CrmActivityType>('NOTE');
  const [subject, setSubject] = useState('');

  async function submit() {
    if (!subject.trim()) return;
    try {
      await logMutation.mutateAsync({ type, subject: subject.trim(), occurredAt: new Date().toISOString(), leadId, clientId });
      setSubject('');
      toast.success('Activity logged.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to log this activity.');
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-[var(--foreground)]">Activity</h4>

      <div className="flex gap-2">
        <Select value={type} onValueChange={(value) => setType(value as CrmActivityType)}>
          <SelectTrigger className="w-32" aria-label="Activity type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="What happened?"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
        <Button size="icon" onClick={submit} loading={logMutation.isPending} aria-label="Log activity">
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>

      <ul className="space-y-2">
        {(data?.data ?? []).map((activity) => (
          <li key={activity.id} className="rounded-lg border border-[var(--border)] p-2 text-xs">
            <p className="font-semibold text-[var(--foreground)]">
              {activity.type} · {activity.subject}
            </p>
            <p className="text-[var(--muted-foreground)]">{new Date(activity.occurredAt).toLocaleString()}</p>
          </li>
        ))}
        {(data?.data ?? []).length === 0 && <p className="text-xs text-[var(--muted-foreground)]">No activity logged yet.</p>}
      </ul>
    </div>
  );
}

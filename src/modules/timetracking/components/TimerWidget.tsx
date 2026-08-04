import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Play, Square } from 'lucide-react';
import { useRunningTimer, useStartTimer, useStopTimer } from '../hooks/useTimeLogs';
import { useTasks } from '../../tasks/hooks/useTasks';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Card } from '../../../shared/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

const NO_TASK = '__none__';

function formatElapsed(seconds: number): string {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

export function TimerWidget() {
  const { data: running, isLoading } = useRunningTimer();
  const { data: taskPage } = useTasks({ page: 1, limit: 100 });
  const startMutation = useStartTimer();
  const stopMutation = useStopTimer();

  const [taskId, setTaskId] = useState<string>(NO_TASK);
  const [description, setDescription] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Ticks locally off the server-provided start time; the authoritative duration is still
  // computed server-side on stop, so a drifting client clock cannot inflate logged time.
  useEffect(() => {
    if (!running) {
      setElapsed(0);
      return;
    }
    const startedAt = new Date(running.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [running]);

  async function handleStart() {
    try {
      await startMutation.mutateAsync({
        taskId: taskId === NO_TASK ? undefined : taskId,
        description: description.trim() || undefined,
      });
      toast.success('Timer started.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to start the timer.');
    }
  }

  async function handleStop() {
    try {
      const log = await stopMutation.mutateAsync(description.trim() || undefined);
      toast.success(`Logged ${log.durationMinutes} minutes.`);
      setDescription('');
      setTaskId(NO_TASK);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to stop the timer.');
    }
  }

  if (isLoading) {
    return (
      <Card className="space-y-4 p-6">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)]">{running ? 'Timer running' : 'Start a timer'}</h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            {running ? 'Stop it to log the time against the task.' : 'One timer at a time.'}
          </p>
        </div>
        <span className="font-mono text-2xl font-bold tabular-nums text-[var(--foreground)]">{formatElapsed(elapsed)}</span>
      </div>

      {!running && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="timer-task">Task (optional)</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger id="timer-task">
                <SelectValue placeholder="No task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TASK}>No task</SelectItem>
                {(taskPage?.data ?? []).map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="timer-description">What are you working on?</Label>
            <Input
              id="timer-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional note"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        {running ? (
          <Button onClick={handleStop} loading={stopMutation.isPending} variant="destructive">
            <Square className="h-4 w-4" />
            Stop timer
          </Button>
        ) : (
          <Button onClick={handleStart} loading={startMutation.isPending}>
            <Play className="h-4 w-4" />
            Start timer
          </Button>
        )}
      </div>
    </Card>
  );
}

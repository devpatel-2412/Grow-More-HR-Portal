import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import type { TaskRecord } from '../types/task.types';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthGrid(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate);
  const startWeekday = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function TaskCalendarView({ tasks, onOpenTask }: { tasks: TaskRecord[]; onOpenTask: (task: TaskRecord) => void }) {
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const grid = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const tasksWithDueDate = tasks.filter((t): t is TaskRecord & { dueDate: string } => !!t.dueDate);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-bold text-[var(--foreground)]">
          {monthDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </span>
        <Button variant="outline" size="icon" onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((day) => {
          const isCurrentMonth = day.getMonth() === monthDate.getMonth();
          const dayTasks = tasksWithDueDate.filter((t) => sameDay(new Date(t.dueDate), day));
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[80px] rounded-lg border border-[var(--border)] p-1 text-left ${isCurrentMonth ? '' : 'opacity-40'}`}
            >
              <span className="text-[10px] text-[var(--muted-foreground)]">{day.getDate()}</span>
              <div className="mt-1 space-y-1">
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpenTask(t)}
                    className="block w-full truncate rounded bg-[var(--primary)]/15 px-1 py-0.5 text-left text-[10px] text-[var(--primary)] hover:bg-[var(--primary)]/25"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

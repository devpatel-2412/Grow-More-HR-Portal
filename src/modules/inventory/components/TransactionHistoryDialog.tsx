import { useState } from 'react';
import { History } from 'lucide-react';
import { useInventoryTransactions } from '../hooks/useInventory';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../../../shared/components/ui/dialog';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import type { InventoryItemRecord, InventoryTransactionType } from '../types/inventory.types';

const TYPE_VARIANT: Record<InventoryTransactionType, 'success' | 'warning' | 'info'> = {
  IN: 'success',
  OUT: 'warning',
  ADJUSTMENT: 'info',
};

export function TransactionHistoryDialog({ item }: { item: InventoryItemRecord }) {
  const [open, setOpen] = useState(false);
  const { data: transactions, isLoading } = useInventoryTransactions(open ? item.id : undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`History for ${item.name}`}>
          <History className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock history: {item.name}</DialogTitle>
          <DialogDescription>Every movement recorded against this item, newest first.</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {!isLoading && (transactions ?? []).length === 0 && (
          <EmptyState icon={History} title="No movements yet" description="Stock-in, stock-out, and adjustments will show up here." />
        )}

        {!isLoading && (transactions ?? []).length > 0 && (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {(transactions ?? []).map((tx) => (
              <li key={tx.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={TYPE_VARIANT[tx.type]}>{tx.type}</Badge>
                  <span className="font-semibold text-[var(--foreground)]">
                    {tx.type === 'OUT' ? '-' : tx.type === 'ADJUSTMENT' && tx.quantity < 0 ? '' : '+'}
                    {tx.quantity}
                  </span>
                  {tx.reference && <span className="text-[var(--muted-foreground)]">{tx.reference}</span>}
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{new Date(tx.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

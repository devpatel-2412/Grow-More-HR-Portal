import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PayrollStatusBadge, MONTH_NAMES, formatCurrency } from './PayrollStatusBadge';
import type { PayrollItemRecord } from '../types/payroll.types';

export function PayslipTable({
  items,
  employeeNames,
  showEmployee = false,
}: {
  items: PayrollItemRecord[];
  employeeNames?: Record<string, string>;
  showEmployee?: boolean;
}) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">No payslips yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            {showEmployee && <TableHead>Employee</TableHead>}
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">PF</TableHead>
            <TableHead className="text-right">ESIC</TableHead>
            <TableHead className="text-right">TDS</TableHead>
            <TableHead className="text-right">PT</TableHead>
            <TableHead className="text-right">Unpaid leave</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap font-medium">
                {MONTH_NAMES[item.month - 1]} {item.year}
              </TableCell>
              {showEmployee && (
                <TableCell className="whitespace-nowrap">
                  {employeeNames?.[item.employeeId] ?? item.employeeId.slice(0, 8)}
                </TableCell>
              )}
              <TableCell className="text-right tabular-nums">{formatCurrency(item.grossSalary)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(item.pfDeduction)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(item.esicDeduction)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(item.tdsDeduction)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(item.ptDeduction)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {item.unpaidLeaveDays > 0 ? `${item.unpaidLeaveDays}d / ${formatCurrency(item.unpaidLeaveDeduction)}` : '—'}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums">{formatCurrency(item.netSalary)}</TableCell>
              <TableCell>
                <PayrollStatusBadge status={item.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

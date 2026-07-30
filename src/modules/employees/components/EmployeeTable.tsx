import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import type { EmployeeListItem } from '../types/employee.types';

export function EmployeeTable({ employees }: { employees: EmployeeListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Designation</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((e) => (
          <TableRow key={e.id}>
            <TableCell>
              <div className="font-semibold">
                {e.firstName} {e.lastName}
              </div>
              <div className="text-[var(--muted-foreground)]">{e.employeeId}</div>
            </TableCell>
            <TableCell>{e.department}</TableCell>
            <TableCell>{e.designation}</TableCell>
            <TableCell className="text-[var(--muted-foreground)]">{new Date(e.dateOfJoining).toLocaleDateString()}</TableCell>
            <TableCell>
              <EmployeeStatusBadge status={e.status} />
            </TableCell>
            <TableCell className="text-right">
              <EmployeeFormDialog mode="edit" employee={e} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

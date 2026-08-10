import { Receipt } from 'lucide-react';
import { usePayslips } from '../hooks/usePayroll';
import { usePagination } from '../../../shared/hooks/usePagination';
import { PayslipTable } from '../components/PayslipTable';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function MyPayslipsPage() {
  const pagination = usePagination(12);
  const { data, isLoading, isError, refetch } = usePayslips({ page: pagination.page, limit: pagination.limit });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="My payslips"
      subtitle="Your monthly pay breakdown and deductions."
      state={state}
      errorProps={{ description: 'Failed to load your payslips.', onRetry: () => refetch() }}
      emptyProps={{ icon: Receipt, title: 'No payslips yet', description: 'Payslips appear here once HR generates a payroll run.' }}
    >
      {data && (
        <div className="space-y-4">
          <PayslipTable items={data.data} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}

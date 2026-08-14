import { useState } from 'react';
import { toast } from 'sonner';
import { Boxes } from 'lucide-react';
import { useAssets, useAssignAsset, useUnassignAsset, useChangeAssetStatus } from '../hooks/useWorkplace';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { usePagination } from '../../../shared/hooks/usePagination';
import { CreateAssetDialog } from '../components/CreateAssetDialog';
import { AssetStatusBadge } from '../components/AssetBadges';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';

export function AssetsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useAssets({ page: pagination.page, limit: pagination.limit });
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });
  const assignMutation = useAssignAsset();
  const unassignMutation = useUnassignAsset();
  const statusMutation = useChangeAssetStatus();
  const [assigningId, setAssigningId] = useState<string | undefined>();
  const canManage = useHasPermission('asset:manage');
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  const employeeNames: Record<string, string> = {};
  for (const employee of employeePage?.data ?? []) employeeNames[employee.id] = `${employee.firstName} ${employee.lastName}`;

  async function assign(id: string, employeeId: string) {
    try {
      await assignMutation.mutateAsync({ id, employeeId });
      toast.success('Asset assigned.');
      setAssigningId(undefined);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to assign this asset.');
    }
  }

  async function unassign(id: string) {
    try {
      await unassignMutation.mutateAsync(id);
      toast.success('Asset returned to the pool.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to unassign this asset.');
    }
  }

  async function markRepair(id: string) {
    try {
      await statusMutation.mutateAsync({ id, status: 'UNDER_REPAIR' });
      toast.success('Marked as under repair.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update this asset.');
    }
  }

  async function retire(id: string) {
    try {
      await statusMutation.mutateAsync({ id, status: 'RETIRED' });
      toast.success('Asset retired.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to retire this asset.');
    }
  }

  return (
    <ListPage
      title="Assets"
      subtitle="Company equipment and who has it."
      actions={<CreateAssetDialog />}
      state={state}
      errorProps={{ description: 'Failed to load assets.', onRetry: () => refetch() }}
      emptyProps={{ icon: Boxes, title: 'No assets yet', description: 'Add your first piece of equipment.' }}
    >
      {data && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Holder</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.serialNumber}</TableCell>
                  <TableCell>{asset.type.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <AssetStatusBadge status={asset.status} />
                  </TableCell>
                  <TableCell>{asset.employeeId ? (employeeNames[asset.employeeId] ?? '—') : '—'}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {asset.status === 'AVAILABLE' && assigningId !== asset.id && (
                          <Button size="sm" variant="outline" onClick={() => setAssigningId(asset.id)}>
                            Assign
                          </Button>
                        )}
                        {assigningId === asset.id && (
                          <Select onValueChange={(employeeId) => assign(asset.id, employeeId)}>
                            <SelectTrigger className="w-40" aria-label="Assign to">
                              <SelectValue placeholder="Pick an employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {(employeePage?.data ?? []).map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.firstName} {employee.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {asset.status === 'ASSIGNED' && (
                          <Button size="sm" variant="ghost" onClick={() => unassign(asset.id)}>
                            Unassign
                          </Button>
                        )}
                        {asset.status !== 'RETIRED' && asset.status !== 'UNDER_REPAIR' && (
                          <Button size="sm" variant="ghost" onClick={() => markRepair(asset.id)}>
                            Repair
                          </Button>
                        )}
                        {asset.status !== 'RETIRED' && (
                          <Button size="sm" variant="ghost" onClick={() => retire(asset.id)}>
                            Retire
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}

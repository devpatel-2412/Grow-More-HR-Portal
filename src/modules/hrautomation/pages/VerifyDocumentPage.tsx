import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { verifyApi } from '../api/hrautomation.api';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { Logo } from '../../../shared/components/ui/logo';
import { APP_NAME } from '../../../shared/config/brand';

/**
 * Public page — what the QR code printed on a generated letter points at. No login, no sidebar:
 * a third party (an employer checking an experience letter, a bank checking a salary
 * certificate) lands here directly from their phone's camera.
 */
export function VerifyDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['verify', 'document', id],
    queryFn: () => verifyApi.verifyDocument(id!),
    enabled: !!id,
    retry: false,
  });

  const notFound = isError && error instanceof ApiError && error.status === 404;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Logo className="h-8 w-auto" />
          <span className="text-sm font-extrabold tracking-tight text-[var(--foreground)]">{APP_NAME}</span>
        </div>

        {isLoading && (
          <Card className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </Card>
        )}

        {isError && (
          <Card className="space-y-2 text-center">
            <ShieldX className="mx-auto h-10 w-10 text-[var(--destructive)]" aria-hidden="true" />
            <h1 className="text-lg font-bold text-[var(--foreground)]">
              {notFound ? 'Document not found' : 'Could not verify this document'}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {notFound
                ? 'This link does not match any document we have on record. It may have been revoked, or the link is incorrect.'
                : 'Something went wrong while checking this document. Please try again shortly.'}
            </p>
          </Card>
        )}

        {!isLoading && !isError && data && (
          <Card className="space-y-4 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-bold text-[var(--foreground)]">Genuine document</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                This {data.documentType.toLowerCase()} was issued by {data.companyName}.
              </p>
            </div>
            <dl className="space-y-2 rounded-lg border border-[var(--border)] p-3 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--muted-foreground)]">Document type</dt>
                <dd className="font-semibold text-[var(--foreground)]">{data.documentType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted-foreground)]">Issued to</dt>
                <dd className="font-semibold text-[var(--foreground)]">{data.employeeName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted-foreground)]">Issued by</dt>
                <dd className="font-semibold text-[var(--foreground)]">{data.companyName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted-foreground)]">Issued on</dt>
                <dd className="font-semibold text-[var(--foreground)]">{data.issuedDate}</dd>
              </div>
            </dl>
          </Card>
        )}
      </div>
    </div>
  );
}

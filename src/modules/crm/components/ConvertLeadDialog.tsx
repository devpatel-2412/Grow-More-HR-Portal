import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useConvertLead } from '../hooks/useCrm';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/dialog';
import type { LeadRecord } from '../types/crm.types';

export function ConvertLeadDialog({ lead, onOpenChange }: { lead: LeadRecord | undefined; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const convertMutation = useConvertLead();
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | undefined>();

  async function handleConvert() {
    if (!lead) return;
    setError(undefined);
    try {
      const client = await convertMutation.mutateAsync({
        id: lead.id,
        payload: { industry: industry.trim() || undefined, website: website.trim() || undefined },
      });
      toast.success(`${lead.companyName} is now a client.`);
      onOpenChange(false);
      navigate(`/crm/clients/${client.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to convert this lead.');
    }
  }

  return (
    <Dialog open={!!lead} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to client</DialogTitle>
          <DialogDescription>{lead?.companyName} will become an active client.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <InlineFormError message={error} />
          <div>
            <Label htmlFor="convert-industry">Industry</Label>
            <Input id="convert-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="convert-website">Website</Label>
            <Input id="convert-website" placeholder="https://…" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleConvert} loading={convertMutation.isPending}>
              Convert
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

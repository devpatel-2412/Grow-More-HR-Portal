import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FolderPlus } from 'lucide-react';
import { createProjectSchema, type CreateProjectFormValues } from '../schemas/project.schemas';
import { useCreateProject } from '../hooks/useProjects';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../../shared/components/ui/dialog';

export function ProjectFormDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateProject();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<CreateProjectFormValues>({ resolver: zodResolver(createProjectSchema) });

  async function onSubmit(values: CreateProjectFormValues) {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Project created.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to create project.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FolderPlus className="h-4 w-4" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="project-description">Description</Label>
            <Input id="project-description" {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project-start">Start date</Label>
              <Input id="project-start" type="date" {...register('startDate')} />
              {errors.startDate && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.startDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="project-end">End date</Label>
              <Input id="project-end" type="date" {...register('endDate')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

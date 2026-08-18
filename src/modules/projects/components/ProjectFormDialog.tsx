import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FolderPlus, Pencil } from 'lucide-react';
import { createProjectSchema, type CreateProjectFormValues } from '../schemas/project.schemas';
import { useCreateProject, useUpdateProject } from '../hooks/useProjects';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../../shared/components/ui/dialog';
import type { ProjectRecord } from '../types/project.types';

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

interface CreateModeProps {
  mode?: 'create';
}

interface EditModeProps {
  mode: 'edit';
  project: ProjectRecord;
}

export function ProjectFormDialog(props: CreateModeProps | EditModeProps) {
  const [open, setOpen] = useState(false);
  const canManage = useHasPermission('project:manage');

  if (!canManage) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === 'edit' ? (
          <Button size="icon" variant="ghost" aria-label={`Edit ${props.project.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <FolderPlus className="h-4 w-4" />
            New project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <ProjectForm project={props.mode === 'edit' ? props.project : undefined} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({ project, onDone }: { project?: ProjectRecord; onDone: () => void }) {
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const isEdit = !!project;
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      startDate: project ? toDateInputValue(project.startDate) : '',
      endDate: project?.endDate ? toDateInputValue(project.endDate) : '',
    },
  });

  async function onSubmit(values: CreateProjectFormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: project.id, values });
        toast.success('Project updated.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Project created.');
      }
      onDone();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save this project.' });
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? `Edit ${project.name}` : 'New project'}</DialogTitle>
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
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

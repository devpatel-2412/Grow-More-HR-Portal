import { useState } from 'react';
import { Plus, Trash2, ImageOff } from 'lucide-react';
import { PosterCanvas } from './PosterCanvas';
import { TEMPLATE_VARIABLES } from '../types/hrautomation.types';
import { Button } from '../../../shared/components/ui/button';
import { Label } from '../../../shared/components/ui/label';
import { Input } from '../../../shared/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';

export interface EditableLayoutField {
  id: string;
  variableKey: (typeof TEMPLATE_VARIABLES)[number];
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
}

interface TemplateCanvasEditorProps {
  backgroundUrl: string;
  fields: EditableLayoutField[];
  onAddField: (newFieldId: string) => void;
  onRemoveField: (index: number) => void;
  onUpdateField: (index: number, patch: Partial<EditableLayoutField>) => void;
}

/**
 * The drag-and-drop template builder: a live canvas over the poster background, plus a panel to
 * fine-tune the selected field's variable/size/color/weight. Dragging updates x/y directly;
 * everything else is a small control in the panel — no separate "apply" step.
 */
export function TemplateCanvasEditor({ backgroundUrl, fields, onAddField, onRemoveField, onUpdateField }: TemplateCanvasEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(fields[0]?.id ?? null);
  const selectedIndex = fields.findIndex((f) => f.id === selectedId);
  const selected = selectedIndex >= 0 ? fields[selectedIndex] : undefined;

  function handleFieldMove(id: string, x: number, y: number) {
    const index = fields.findIndex((f) => f.id === id);
    if (index >= 0) onUpdateField(index, { x, y });
  }

  function handleAdd() {
    const id = crypto.randomUUID();
    onAddField(id);
    setSelectedId(id);
  }

  if (!backgroundUrl) {
    return <EmptyState icon={ImageOff} title="Add a background image first" description="Paste a background image URL above to start placing text fields." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
      <div className="flex justify-center">
        <PosterCanvas
          backgroundUrl={backgroundUrl}
          editable
          selectedFieldId={selectedId}
          onSelectField={setSelectedId}
          onFieldMove={handleFieldMove}
          fields={fields.map((f) => ({ ...f, text: `{{${f.variableKey}}}` }))}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="mb-0">Fields ({fields.length})</Label>
          <Button type="button" size="sm" variant="ghost" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        <ul className="space-y-1">
          {fields.map((field, index) => (
            <li key={field.id}>
              <button
                type="button"
                onClick={() => setSelectedId(field.id)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${
                  field.id === selectedId ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60'
                }`}
              >
                <span className="truncate">{`{{${field.variableKey}}}`}</span>
                <Trash2
                  className="h-3.5 w-3.5 shrink-0 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveField(index);
                    if (field.id === selectedId) setSelectedId(null);
                  }}
                />
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <div className="space-y-3 border-t border-[var(--border)] pt-3">
            <div>
              <Label htmlFor="field-variable">Variable</Label>
              <Select
                value={selected.variableKey}
                onValueChange={(v) => onUpdateField(selectedIndex, { variableKey: v as EditableLayoutField['variableKey'] })}
              >
                <SelectTrigger id="field-variable">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_VARIABLES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="field-fontsize">Font size</Label>
              <Input
                id="field-fontsize"
                type="number"
                min={4}
                max={400}
                value={selected.fontSize}
                onChange={(e) => onUpdateField(selectedIndex, { fontSize: Number(e.target.value) || 16 })}
              />
            </div>
            <div>
              <Label htmlFor="field-color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="field-color"
                  type="color"
                  value={selected.color}
                  onChange={(e) => onUpdateField(selectedIndex, { color: e.target.value })}
                  className="h-10 w-12 rounded border border-[var(--border)] bg-transparent"
                />
                <Input
                  aria-label="Color hex value"
                  value={selected.color}
                  onChange={(e) => onUpdateField(selectedIndex, { color: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="mb-0" htmlFor="field-bold">
                Bold
              </Label>
              <input
                id="field-bold"
                type="checkbox"
                checked={selected.fontWeight === 'bold'}
                onChange={(e) => onUpdateField(selectedIndex, { fontWeight: e.target.checked ? 'bold' : 'normal' })}
              />
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Position: {selected.x}, {selected.y} — drag the field on the canvas to move it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

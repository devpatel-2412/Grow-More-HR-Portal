import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TemplateCanvasEditor, type EditableLayoutField } from './TemplateCanvasEditor';

function makeField(overrides: Partial<EditableLayoutField> = {}): EditableLayoutField {
  return { id: 'f1', variableKey: 'firstName', x: 20, y: 20, fontSize: 16, color: '#000000', fontWeight: 'normal', ...overrides };
}

describe('TemplateCanvasEditor', () => {
  it('shows an empty state instead of a canvas when there is no background image yet', () => {
    render(<TemplateCanvasEditor backgroundUrl="" fields={[]} onAddField={vi.fn()} onRemoveField={vi.fn()} onUpdateField={vi.fn()} />);
    expect(screen.getByText('Add a background image first')).toBeInTheDocument();
  });

  it('calls onAddField with a freshly generated id when "Add" is clicked', () => {
    const onAddField = vi.fn();
    render(
      <TemplateCanvasEditor backgroundUrl="https://x/bg.png" fields={[]} onAddField={onAddField} onRemoveField={vi.fn()} onUpdateField={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAddField).toHaveBeenCalledOnce();
    expect(typeof onAddField.mock.calls[0][0]).toBe('string');
  });

  it('shows the selected field\'s controls and reports font size changes', () => {
    const onUpdateField = vi.fn();
    render(
      <TemplateCanvasEditor
        backgroundUrl="https://x/bg.png"
        fields={[makeField()]}
        onAddField={vi.fn()}
        onRemoveField={vi.fn()}
        onUpdateField={onUpdateField}
      />,
    );

    const fontSizeInput = screen.getByLabelText('Font size');
    fireEvent.change(fontSizeInput, { target: { value: '32' } });
    expect(onUpdateField).toHaveBeenCalledWith(0, { fontSize: 32 });
  });

  it('toggles bold via the checkbox', () => {
    const onUpdateField = vi.fn();
    render(
      <TemplateCanvasEditor
        backgroundUrl="https://x/bg.png"
        fields={[makeField({ fontWeight: 'normal' })]}
        onAddField={vi.fn()}
        onRemoveField={vi.fn()}
        onUpdateField={onUpdateField}
      />,
    );

    fireEvent.click(screen.getByLabelText('Bold'));
    expect(onUpdateField).toHaveBeenCalledWith(0, { fontWeight: 'bold' });
  });

  it('removes a field when its delete icon is clicked, without triggering selection', () => {
    const onRemoveField = vi.fn();
    render(
      <TemplateCanvasEditor
        backgroundUrl="https://x/bg.png"
        fields={[makeField()]}
        onAddField={vi.fn()}
        onRemoveField={onRemoveField}
        onUpdateField={vi.fn()}
      />,
    );

    const listItemText = within(screen.getByRole('list')).getByText('{{firstName}}');
    fireEvent.click(listItemText.parentElement!.querySelector('svg')!);
    expect(onRemoveField).toHaveBeenCalledWith(0);
  });
});

import { EditorToolbar } from '../editor/EditorToolbar';
import { EditorCanvas } from '../editor/EditorCanvas';
import { EditorProperties } from '../editor/EditorProperties';
import { EditorCanvasSkeleton } from '../editor/EditorCanvasSkeleton';
import { useEditorStore } from '../store/editorStore';

export function EditorMode() {
  const editorBooting = useEditorStore((s) => s.editorBooting);

  if (editorBooting) {
    return <EditorCanvasSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <EditorToolbar />
      <div className="flex flex-1 overflow-hidden">
        <EditorCanvas />
        <EditorProperties />
      </div>
    </div>
  );
}

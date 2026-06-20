import { EditorToolbar } from '../editor/EditorToolbar';
import { EditorCanvas } from '../editor/EditorCanvas';
import { EditorProperties } from '../editor/EditorProperties';

export function EditorMode() {
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

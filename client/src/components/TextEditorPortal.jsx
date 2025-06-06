import React from 'react';
import { Portal } from 'react-konva-utils';

const TextEditorPortal = ({
  editingTextId,
  readOnly,
  editingTextPos,
  editingTextValue,
  setEditingTextValue,
  shapes,
  dispatch,
  emitShapeUpdate,
  diagramId,
  setEditingTextId,
}) => {
  if (!editingTextId || readOnly) return null;

  const shape = shapes.find(s => s.id === editingTextId);
  if (!shape) return null;

  return (
    <Portal>
      <div
        className="fixed z-[1000]"
        style={{
          position: 'absolute',
          top: editingTextPos.y,
          left: editingTextPos.x,
          transform: `scale(${shape.zoom || 1})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="relative">
          <textarea
            value={editingTextValue}
            onChange={(e) => setEditingTextValue(e.target.value)}
            onBlur={() => {
              if (editingTextId) {
                const shape = shapes.find(s => s.id === editingTextId);
                if (shape) {
                  const updatedShape = {
                    ...shape,
                    text: editingTextValue,
                  };
                  dispatch(updateShape(updatedShape));
                  emitShapeUpdate(diagramId, updatedShape);
                }
                setEditingTextId(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.target.blur();
              }
            }}
            className="border border-gray-300 rounded p-1 bg-[#181818] shadow-lg min-w-[100px] min-h-[24px] resize-none"
            style={{
              fontSize: `${shape.fontSize || 16}px`,
              color: (shape.stroke && (shape.stroke.toLowerCase() === '#000000' || shape.stroke.toLowerCase() === '#000')) ? '#ffffff' : (shape.stroke || '#000'),
              width: shape.type === 'sticky' ? `${shape.width - 20}px` : 'auto',
              height: shape.type === 'sticky' ? `${shape.height - 20}px` : 'auto',
            }}
            autoFocus
          />
        </div>
      </div>
    </Portal>
  );
};

export default TextEditorPortal;

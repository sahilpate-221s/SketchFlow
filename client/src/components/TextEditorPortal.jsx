import React, { useRef, useEffect, useState } from 'react';
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
  const [localValue, setLocalValue] = useState(editingTextValue || '');
  const [dimensions, setDimensions] = useState({ width: 200, height: 50 });
  const textareaRef = useRef(null);
  const shape = shapes.find(s => s.id === editingTextId);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState(null);
  if (!editingTextId || readOnly || !shape) return null;

  useEffect(() => {
    setLocalValue(editingTextValue || '');
    setDimensions({ width: shape.width || 200, height: shape.height || 50 });
  }, [editingTextId, editingTextValue, shape.width, shape.height]);

  // Handle resizing
  const handleMouseDown = (e) => {
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height,
    });
    e.preventDefault();
    e.stopPropagation();
  };
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      setDimensions({
        width: Math.max(60, resizeStart.width + dx),
        height: Math.max(24, resizeStart.height + dy),
      });
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart]);

  // Save/cancel logic
  const save = () => {
    if (editingTextId) {
      const updatedShape = {
        ...shape,
        text: localValue,
        width: dimensions.width,
        height: dimensions.height,
      };
      dispatch({ type: 'canvas/updateShape', payload: updatedShape });
      emitShapeUpdate(diagramId, updatedShape);
      setEditingTextId(null);
    }
  };
  const cancel = () => setEditingTextId(null);

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
          zIndex: 2000,
        }}
      >
        <div
          className="relative group"
          style={{
            width: dimensions.width,
            minWidth: 60,
            height: dimensions.height,
            minHeight: 24,
            fontFamily: 'Inter, Handlee, sans-serif',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #23232b 0%, #35353f 100%)',
            boxShadow: '0 4px 32px 0 #000a, 0 1.5px 6px 0 #fff2',
            border: '2px solid',
            borderImage: 'linear-gradient(135deg, #fff2, #23232b 80%) 1',
            transition: 'box-shadow 0.2s',
          }}
        >
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            onBlur={save}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                save();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
            placeholder="Type here..."
            className="w-full h-full p-3 rounded-xl bg-transparent text-white font-medium focus:outline-none resize-none placeholder:text-neutral-400 shadow-xl border-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/40"
            style={{
              fontSize: `${shape.fontSize || 16}px`,
              color: '#fff',
              textShadow: '0 1px 4px #000b',
              lineHeight: 1.4,
              minWidth: 60,
              minHeight: 24,
              boxSizing: 'border-box',
              zIndex: 2100,
            }}
            autoFocus
            rows={1}
          />
          {/* Resize handle */}
          <div
            className="absolute bottom-1 right-1 w-5 h-5 cursor-nwse-resize bg-gradient-to-br from-neutral-700 to-black/80 rounded shadow border border-white/10 flex items-center justify-center group-hover:border-blue-400/60 hover:shadow-lg transition"
            style={{ zIndex: 2200, opacity: 0.85 }}
            onMouseDown={handleMouseDown}
            title="Resize"
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M2 12L12 2M7 12L12 7" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default TextEditorPortal;

import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useDispatch, useSelector } from 'react-redux';
import { updateShape, addShape, deleteShapes } from '../store/canvasSlice';
import { v4 as uuidv4 } from 'uuid';

const MarkdownNotesPanel = forwardRef(({
  isOpen,
  onClose,
  editingMarkdownId,
  setEditingMarkdownId,
  editingMarkdownValue,
  setEditingMarkdownValue,
  handleMarkdownSave,
}, ref) => {
  const dispatch = useDispatch();
  const shapes = useSelector(state => state.canvas.shapes);

  return (
    <div
      ref={ref}
      className={`fixed left-0 md:left-0 bottom-0 md:top-0 h-2/3 md:h-full w-full max-w-xs md:w-[300px] bg-[#181818] shadow-xl transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-y-0' : 'translate-y-full md:translate-x-0 md:w-12'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Panel Header */}
        <div className="flex items-center justify-between p-2 md:p-3 border-b border-gray-800/90 bg-[#181818]/95">
          <h2 className="text-lg font-semibold text-gray-600">
            Quick Notes
          </h2>
          <button
            onClick={() => {
              onClose();
              setEditingMarkdownId(null);
              setEditingMarkdownValue('');
            }}
            className="p-2 md:p-2.5 rounded-lg hover:bg-gray-100/90 text-gray-400 text-xl md:text-base"
            style={{ zIndex: 40 }}
          >
            <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Editor Content */}
        <div className="flex flex-col h-full bg-[#181818]/95">
          {/* Quick Input */}
          <div className="p-2 md:p-3 border-b border-gray-800/90">
            <textarea
              value={editingMarkdownValue}
              onChange={e => setEditingMarkdownValue(e.target.value)}
              className="w-full p-1 md:p-2 rounded-lg border border-gray-800/90 text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#181818]/95 text-xs md:text-sm"
              placeholder="Type your note here... (Press Enter for new bullet point)"
              rows={3}
              onKeyDown={e => {
                // Only handle Enter and Tab keys, let all other keys (including backspace) work normally
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const currentValue = e.target.value;
                  const cursorPosition = e.target.selectionStart;
                  const textBeforeCursor = currentValue.substring(0, cursorPosition);
                  const textAfterCursor = currentValue.substring(cursorPosition);
                  setEditingMarkdownValue(textBeforeCursor + '\n- ' + textAfterCursor);
                  setTimeout(() => {
                    e.target.selectionStart = cursorPosition + 3;
                    e.target.selectionEnd = cursorPosition + 3;
                  }, 0);
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  const currentValue = e.target.value;
                  const cursorPosition = e.target.selectionStart;
                  const textBeforeCursor = currentValue.substring(0, cursorPosition);
                  const textAfterCursor = currentValue.substring(cursorPosition);
                  setEditingMarkdownValue(textBeforeCursor + '    ' + textAfterCursor);
                  setTimeout(() => {
                    e.target.selectionStart = cursorPosition + 4;
                    e.target.selectionEnd = cursorPosition + 4;
                  }, 0);
                }
              }}
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                onClick={() => {
                  setEditingMarkdownId(null);
                  setEditingMarkdownValue('');
                }}
                className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm rounded-lg bg-gradient-to-br from-neutral-800 via-neutral-900 to-black text-white font-semibold shadow-glossy border border-white/20 hover:from-neutral-700 hover:to-neutral-900 transition focus:outline-none focus:ring-2 focus:ring-white/20"
                style={{ cursor: 'pointer' }}
              >
                Clear
              </button>
              <button
                onClick={handleMarkdownSave}
                className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm rounded-lg bg-gradient-to-br from-neutral-700 via-neutral-800 to-black text-white font-semibold shadow-glossy border border-white/20 hover:from-neutral-600 hover:to-neutral-900 transition focus:outline-none focus:ring-2 focus:ring-white/20"
                style={{ cursor: 'pointer' }}
              >
                {editingMarkdownId ? 'Update Note' : 'Add Note'}
              </button>
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-auto p-2 md:p-3">
            {shapes
              .filter(shape => shape.type === 'markdown')
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
              .map(note => (
                <div
                  key={note.id}
                  className="mb-2 md:mb-3 p-2 md:p-3 rounded-lg border border-gray-800/90 bg-[#181818]/95 transition-colors hover:text-white text-xs md:text-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-gray-500">
                      {new Date(note.timestamp || Date.now()).toLocaleTimeString()}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingMarkdownId(note.id);
                          setEditingMarkdownValue(note.text);
                        }}
                        className="p-1 rounded hover:bg-gray-100/95 text-gray-500 hover:text-blue-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          dispatch(deleteShapes([note.id]));
                        }}
                        className="p-1 rounded hover:bg-gray-100/95 text-gray-500 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-300 text-xs md:text-sm">
                    <ReactMarkdown>{note.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default MarkdownNotesPanel;

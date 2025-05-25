import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SketchPicker } from 'react-color';
import {
  addStickyNote,
  updateStickyNote,
  deleteStickyNote,
} from '../store/canvasSlice';

const StickyNotes = () => {
  const dispatch = useDispatch();
  const stickyNotes = useSelector((state) => state.canvas.stickyNotes);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedColor, setSelectedColor] = useState('#fef08a');
  const [editingNote, setEditingNote] = useState(null);
  const [editingText, setEditingText] = useState('');

  const handleAddNote = () => {
    dispatch(addStickyNote({ color: selectedColor }));
  };

  const handleUpdateNote = (id, updates) => {
    dispatch(updateStickyNote({ id, ...updates }));
  };

  const handleDeleteNote = (id) => {
    dispatch(deleteStickyNote(id));
  };

  const handleStartEditing = (note) => {
    setEditingNote(note.id);
    setEditingText(note.text);
  };

  const handleTextChange = (e, id) => {
    const content = e.currentTarget.textContent;
    setEditingText(content);
  };

  const handleTextBlur = (id) => {
    if (editingText.trim()) {
      handleUpdateNote(id, { text: editingText });
    }
    setEditingNote(null);
    setEditingText('');
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-4 top-20 z-50 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${
          isOpen ? 'rotate-180' : ''
        } hover:scale-110`}
        title={isOpen ? 'Hide Notes' : 'Show Notes'}
      >
        <div className="w-6 h-6 flex items-center justify-center text-gray-600">
          {isOpen ? '→' : '←'}
        </div>
      </button>

      {/* Notes Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white/90 backdrop-blur-md shadow-2xl transform transition-transform duration-500 ease-in-out z-40 border-l border-gray-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Sticky Notes</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Color Selection */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['#fef08a', '#fecaca', '#bbf7d0', '#bfdbfe', '#e9d5ff'].map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 ${
                  selectedColor === color
                    ? 'ring-2 ring-offset-2 ring-gray-400'
                    : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={`Select ${color} color`}
              />
            ))}
          </div>

          {/* Add Note Button */}
          <button
            onClick={handleAddNote}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] font-medium flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add New Note
          </button>
        </div>

        {/* Notes List */}
        <div className="p-4 overflow-y-auto h-[calc(100%-8rem)]">
          {stickyNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-3 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <p className="text-sm">No notes yet. Click "Add New Note" to create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stickyNotes.map((note) => (
                <div
                  key={note.id}
                  className="relative group rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                  style={{ backgroundColor: note.color }}
                >
                  {editingNote === note.id ? (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => handleTextChange(e, note.id)}
                      onBlur={() => handleTextBlur(note.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleTextBlur(note.id);
                        } else if (e.key === 'Escape') {
                          setEditingNote(null);
                          setEditingText('');
                        }
                      }}
                      className="w-full p-3 min-h-[100px] bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                      style={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#1f2937' // text-gray-800
                      }}
                      autoFocus
                    >
                      {note.text || 'Double-click to edit'}
                    </div>
                  ) : (
                    <div
                      className="p-3 min-h-[100px] cursor-pointer"
                      onDoubleClick={() => handleStartEditing(note)}
                    >
                      <p className="text-gray-800 whitespace-pre-wrap break-words">
                        {note.text || 'Double-click to edit'}
                      </p>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded-full hover:bg-red-100 text-red-500 transition-colors"
                          title="Delete note"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default StickyNotes; 
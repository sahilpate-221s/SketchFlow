import { useDispatch, useSelector } from 'react-redux';
import { Plus, StickyNote } from 'lucide-react';
import { addShape } from '../store/canvasSlice';
import { v4 as uuidv4 } from 'uuid';

const StickyNotes = () => {
  const dispatch = useDispatch();
  const { tool } = useSelector((state) => state.canvas);

  const handleAddStickyNote = () => {
    const newStickyNote = {
      id: uuidv4(),
      type: 'sticky',
      x: window.innerWidth / 2 - 100, // Center of the visible canvas
      y: window.innerHeight / 2 - 75,
      width: 0, // Start with 0 width
      height: 0, // Start with 0 height
      fill: '#fef08a',
      stroke: '#000000',
      strokeWidth: 1,
      text: '',
      fontSize: 16,
      draggable: true,
      rotation: 0,
    };

    dispatch(addShape(newStickyNote));
  };

  return (
    <button
      onClick={handleAddStickyNote}
      className={`fixed right-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-white dark:bg-dark-surface shadow-lg border border-gray-100/50 dark:border-dark-border/50 hover:scale-110 transition-all duration-200 ${
        tool === 'sticky' ? 'ring-2 ring-blue-500' : ''
      }`}
      title="Add Sticky Note"
    >
      <StickyNote size={24} className="text-gray-600 dark:text-gray-300" />
    </button>
  );
};

export default StickyNotes; 
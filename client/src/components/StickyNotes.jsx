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
      fill: '#4b4b3f',
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
      className={`fixed right-8 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-[#23262F] shadow-2xl border border-gray-800 hover:scale-110 transition-all duration-200 ${
        tool === 'sticky' ? 'ring-2 ring-gray-400' : ''
      }`}
      style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.45)' }}
      title="Add Sticky Note"
    >
      <StickyNote size={28} className="text-gray-200" />
    </button>
  );
};

export default StickyNotes;
import { useDispatch, useSelector } from 'react-redux';
import { Plus, StickyNote } from 'lucide-react';
import { addShape, setTool } from '../store/canvasSlice';
import { v4 as uuidv4 } from 'uuid';

const StickyNotes = () => {
  const dispatch = useDispatch();
  const { tool } = useSelector((state) => state.canvas);

  const handleStickyNoteTool = () => {
    dispatch(setTool('sticky'));
  };

  return (
    <button
      onClick={handleStickyNoteTool}
      className={`fixed md:right-8 md:top-1/2 md:-translate-y-1/2 right-4 bottom-24 md:bottom-auto md:block z-50 p-4 md:p-4 rounded-full bg-[#23262F] shadow-2xl border border-gray-800 hover:scale-110 transition-all duration-200 ${
        tool === 'sticky' ? 'ring-2 ring-gray-400' : ''
      }`}
      style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.45)' }}
      title="Sticky Note Tool"
    >
      <StickyNote size={28} className="text-gray-200 md:w-7 md:h-7 w-7 h-7" />
    </button>
  );
};

export default StickyNotes;
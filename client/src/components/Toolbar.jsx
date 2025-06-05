import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SketchPicker } from 'react-color';
import {
  setTool,
  setStrokeStyle,
  setStrokeWidth,
  setStrokeColor,
  setFillColor,
  setFontSize,
  setTextAlign,
  setGridVisible,
  setZoom,
  undo,
  redo,
} from '../store/canvasSlice';
import { 
  MousePointer, 
  Hand, 
  Eraser, 
  Square, 
  Circle, 
  Minus, 
  ArrowRight, 
  PenTool, 
  Type, 
  StickyNote,
  FileText,
  Grid,
  Undo,
  Redo,
  Download,
  Upload,
  Users,
  Plus,
  Share2
} from 'lucide-react';
import './Toolbar.css';

const TOOL_GROUPS = [
  {
    name: 'Selection',
    tools: [
      { id: 'select', icon: <MousePointer size={20} />, label: 'Select', shortcut: 'V' },
      { id: 'pan', icon: <Hand size={20} />, label: 'Pan', shortcut: 'H' },
      { id: 'eraser', icon: <Eraser size={20} />, label: 'Eraser', shortcut: 'E' },
    ],
  },
  {
    name: 'Shapes',
    tools: [
      { id: 'rectangle', icon: <Square size={20} />, label: 'Rectangle', shortcut: 'R' },
      { id: 'circle', icon: <Circle size={20} />, label: 'Circle', shortcut: 'C' },
      { id: 'line', icon: <Minus size={20} />, label: 'Line', shortcut: 'L' },
      { id: 'arrow', icon: <ArrowRight size={20} />, label: 'Arrow', shortcut: 'A' },
      { id: 'freehand', icon: <PenTool size={20} />, label: 'Freehand', shortcut: 'P' },
    ],
  },
  {
    name: 'Text & Notes',
    tools: [
      { id: 'text', icon: <Type size={20} />, label: 'Text', shortcut: 'T' },
      { 
        id: 'sticky', 
        icon: <StickyNote size={20} className="text-gray-800 dark:text-gray-200" />, 
        label: 'Sticky Note', 
        shortcut: 'N' 
      },
      { id: 'markdown', icon: <FileText size={20} />, label: 'Markdown', shortcut: 'M' },
    ],
  },
];

const STROKE_STYLES = [
  { id: 'solid', icon: '━', label: 'Solid' },
  { id: 'dashed', icon: '┄', label: 'Dashed' },
  { id: 'dotted', icon: '┈', label: 'Dotted' },
];

const STROKE_WIDTHS = [1, 2, 3, 4, 5];
const FONT_SIZES = [12, 14, 16, 18, 20, 24];
const TEXT_ALIGNMENTS = [
  { id: 'left', icon: '⫷', label: 'Left' },
  { id: 'center', icon: '⫶', label: 'Center' },
  { id: 'right', icon: '⫸', label: 'Right' },
];

const Toolbar = ({ onExport, onImport, onShare, collaborators = [], onGridToggle, isGridVisible }) => {
  const dispatch = useDispatch();
  const {
    tool,
    strokeStyle,
    strokeWidth,
    strokeColor,
    fillColor,
    fontSize,
    textAlign,
    zoom,
    canUndo,
    canRedo,
  } = useSelector((state) => state.canvas);

  const [showColorPicker, setShowColorPicker] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    console.log('Toolbar - Current tool:', tool);
  }, [tool]);

  const handleZoom = (delta) => {
    const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
    dispatch(setZoom(newZoom));
  };

  const handleToolSelect = (toolId) => {
    console.log('Toolbar - Selecting tool:', toolId);
    dispatch(setTool(toolId));
  };

  return (
    <div className="toolbar-container">
      {/* Top Center Toolbar - larger pill and buttons */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="toolbar-pill top flex items-center gap-2 px-4 py-2 shadow-xl border border-white/10 bg-[#18181c] bg-opacity-95">
          {TOOL_GROUPS.map((group, groupIdx) => (
            <div key={group.name} className="flex items-center gap-1">
              {group.tools.map((toolItem) => (
                <button
                  key={toolItem.id}
                  onClick={() => handleToolSelect(toolItem.id)}
                  className={`toolbar-btn top ${tool === toolItem.id ? 'toolbar-btn-active' : ''}`}
                  title={`${toolItem.label} (${toolItem.shortcut})`}
                >
                  <span className="toolbar-btn-icon top">{toolItem.icon}</span>
                  {tool === toolItem.id && <span className="toolbar-btn-indicator" />}
                </button>
              ))}
              {groupIdx < TOOL_GROUPS.length - 1 && (
                <div className="toolbar-divider mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Center Toolbar - compact pill and buttons */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="toolbar-pill bottom flex items-center gap-3 px-5 py-2 shadow-xl border border-white/10 bg-[#18181c] bg-opacity-95">
          {/* Grid Toggle */}
          <button
            onClick={onGridToggle}
            className={`toolbar-btn bottom ${isGridVisible ? 'toolbar-btn-active' : ''}`}
            title="Toggle Grid (G)"
          >
            <span className="toolbar-btn-icon bottom"><Grid size={20} /></span>
          </button>
          <div className="toolbar-divider" />
          {/* Undo/Redo */}
          <button
            onClick={() => dispatch(undo())}
            disabled={!canUndo}
            className={`toolbar-btn bottom ${canUndo ? '' : 'toolbar-btn-disabled'}`}
            title="Undo (Ctrl+Z)"
          >
            <span className="toolbar-btn-icon bottom"><Undo size={20} /></span>
          </button>
          <button
            onClick={() => dispatch(redo())}
            disabled={!canRedo}
            className={`toolbar-btn bottom ${canRedo ? '' : 'toolbar-btn-disabled'}`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <span className="toolbar-btn-icon bottom"><Redo size={20} /></span>
          </button>
          <div className="toolbar-divider" />
          {/* Zoom Controls */}
          <button
            onClick={() => handleZoom(-0.1)}
            className="toolbar-btn bottom"
            title="Zoom Out (-)"
          >
            <span className="toolbar-btn-icon bottom"><Minus size={18} /></span>
          </button>
          <span className="toolbar-zoom-label min-w-[60px] text-center text-base font-semibold text-white/90 select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.1)}
            className="toolbar-btn bottom"
            title="Zoom In (+)"
          >
            <span className="toolbar-btn-icon bottom"><Plus size={18} /></span>
          </button>
          <div className="toolbar-divider" />
          {/* Collaboration & Share */}
          <button
            onClick={() => setShowCollaborators(!showCollaborators)}
            className={`toolbar-btn bottom ${showCollaborators ? 'toolbar-btn-active' : ''}`}
            title={`${collaborators.length} Collaborators`}
          >
            <span className="toolbar-btn-icon bottom"><Users size={20} /></span>
            {collaborators.length > 0 && (
              <span className="toolbar-collab-badge">{collaborators.length}</span>
            )}
          </button>
          {showCollaborators && (
            <div className="absolute bottom-full left-0 mb-2 w-64 toolbar-collab-list">
              <div className="text-sm font-medium text-gray-100 mb-2">Collaborators</div>
              {collaborators.length === 0 ? (
                <div className="text-sm text-gray-400">No collaborators yet</div>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((collab) => (
                    <div key={collab.id} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: collab.color }} />
                      <span className="text-gray-100">{collab.name}</span>
                      <span className="text-gray-400 text-xs">({collab.role})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={onShare}
            className="toolbar-btn bottom"
            title="Share Canvas"
          >
            <span className="toolbar-btn-icon bottom"><Share2 size={20} /></span>
          </button>
          <div className="toolbar-divider" />
          {/* Export/Import */}
          <button
            onClick={onExport}
            className="toolbar-btn bottom px-3 py-1.5 font-medium flex items-center gap-1"
            title="Export Canvas (Ctrl+E)"
          >
            <span className="toolbar-btn-icon bottom"><Download size={18} /></span>
            <span className="hidden sm:inline">Export</span>
          </button>
          <label className="toolbar-btn bottom px-3 py-1.5 font-medium cursor-pointer flex items-center gap-1">
            <span className="toolbar-btn-icon bottom"><Upload size={18} /></span>
            <span className="hidden sm:inline">Import</span>
            <input
              type="file"
              accept=".json"
              onChange={onImport}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;

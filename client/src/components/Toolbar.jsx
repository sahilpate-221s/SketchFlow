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
      {/* Floating Toolbar */}
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
        isScrolled ? 'scale-95 opacity-95' : 'scale-100 opacity-100'
      }`}>
        <div className="bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/90 p-2.5 flex items-center space-x-3">
          {/* Main Tools */}
          {TOOL_GROUPS.map((group) => (
            <div
              key={group.name}
              className="bg-white/95 dark:bg-dark-surface rounded-lg shadow-lg border border-gray-200/80 dark:border-dark-border/80 p-2 space-y-1"
            >
              {group.tools.map((toolItem) => (
                <button
                  key={toolItem.id}
                  onClick={() => handleToolSelect(toolItem.id)}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors ${
                    tool === toolItem.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                  title={`${toolItem.label} (${toolItem.shortcut})`}
                >
                  {toolItem.icon}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Toolbar - Combined controls centered */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/98 backdrop-blur-lg rounded-xl shadow-lg border border-gray-200/90 p-2 flex items-center space-x-4">
          {/* Grid Toggle */}
          <button
            onClick={onGridToggle}
            className={`p-2 rounded-lg transition-all duration-200 group ${
              isGridVisible 
                ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-500/30' 
                : 'hover:bg-gray-100 text-gray-900'
            }`}
          >
            <Grid size={20} />
            {/* Single tooltip */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg pointer-events-none z-50">
              Toggle Grid (G)
            </div>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* Undo/Redo */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => dispatch(undo())}
              disabled={!canUndo}
              className={`p-2 rounded-lg transition-all duration-200 ${
                canUndo 
                  ? 'hover:bg-gray-100 text-gray-900 hover:scale-105' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo size={20} />
            </button>
            <button
              onClick={() => dispatch(redo())}
              disabled={!canRedo}
              className={`p-2 rounded-lg transition-all duration-200 ${
                canRedo 
                  ? 'hover:bg-gray-100 text-gray-900 hover:scale-105' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo size={20} />
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2 bg-gray-50/50 rounded-lg p-1">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-900 transition-all duration-200 hover:scale-105"
              title="Zoom Out (-)"
            >
              <Minus size={18} />
            </button>
            <span className="px-2 py-1 bg-white rounded-lg text-sm text-gray-900 font-medium min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-900 transition-all duration-200 hover:scale-105"
              title="Zoom In (+)"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* Collaboration & Share */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowCollaborators(!showCollaborators)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showCollaborators
                    ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-500/30'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
                title={`${collaborators.length} Collaborators`}
              >
                <Users size={20} />
                {collaborators.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {collaborators.length}
                  </span>
                )}
              </button>
              {showCollaborators && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
                  <div className="text-sm font-medium text-gray-900 mb-2">Collaborators</div>
                  {collaborators.length === 0 ? (
                    <div className="text-sm text-gray-500">No collaborators yet</div>
                  ) : (
                    <div className="space-y-2">
                      {collaborators.map((collab) => (
                        <div key={collab.id} className="flex items-center space-x-2 text-sm">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: collab.color }} />
                          <span className="text-gray-900">{collab.name}</span>
                          <span className="text-gray-500 text-xs">({collab.role})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onShare}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-900 transition-all duration-200 hover:scale-105"
              title="Share Canvas"
            >
              <Share2 size={20} />
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* Export/Import */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onExport}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-medium flex items-center space-x-1 hover:scale-105 shadow-sm shadow-blue-500/30"
              title="Export Canvas (Ctrl+E)"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
            <label className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 text-sm font-medium cursor-pointer flex items-center space-x-1 hover:scale-105 shadow-sm shadow-purple-500/30">
              <Upload size={18} />
              <span>Import</span>
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
    </div>
  );
};

export default Toolbar;

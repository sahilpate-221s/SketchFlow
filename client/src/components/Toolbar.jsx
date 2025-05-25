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
  Plus
} from 'lucide-react';

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
      { id: 'sticky', icon: <StickyNote size={20} />, label: 'Sticky Note', shortcut: 'N' },
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

const styles = {
  fadeIn: {
    animation: 'fadeIn 0.2s ease-out',
  },
};

const globalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Toolbar = ({ onExport, onImport }) => {
  const dispatch = useDispatch();
  const {
    tool,
    strokeStyle,
    strokeWidth,
    strokeColor,
    fillColor,
    fontSize,
    textAlign,
    isGridVisible,
    zoom,
    canUndo,
    canRedo,
  } = useSelector((state) => state.canvas);

  const [showColorPicker, setShowColorPicker] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleZoom = (delta) => {
    const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
    dispatch(setZoom(newZoom));
  };

  return (
    <>
      <style>{globalStyles}</style>

      {/* Floating Toolbar */}
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
        isScrolled ? 'scale-95 opacity-90' : 'scale-100 opacity-100'
      }`}>
        <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100/50 dark:border-dark-border/50 p-2.5 flex items-center space-x-3">
          {/* Main Tools */}
          {TOOL_GROUPS.map((group) => (
            <div key={group.name} className="relative group">
              <div className="flex items-center space-x-1.5 px-2">
                {group.tools.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      dispatch(setTool(t.id));
                      setActiveGroup(group.name);
                      if (t.id === 'markdown') {
                        dispatch({ type: 'canvas/toggleMarkdownEditor' });
                      }
                    }}
                    className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                      tool === t.id 
                        ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10 ring-2 ring-blue-400/20' 
                        : 'hover:bg-gray-50/80 dark:hover:bg-dark-border/80 text-gray-600 dark:text-gray-300 hover:shadow-md hover:scale-105'
                    }`}
                    title={`${t.label} (${t.shortcut})`}
                  >
                    {t.icon}
                    <span className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 px-2.5 py-1 bg-gray-900/90 backdrop-blur-sm text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg">
                      {t.label} ({t.shortcut})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Collaboration Status */}
          <div className="flex items-center space-x-2 pl-2 border-l border-gray-200 dark:border-dark-border">
            <button
              className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-105"
              title="Collaboration Status"
            >
              <Users size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Toolbar - Appears below the floating toolbar */}
      <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-300 ${
        activeGroup ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <div className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-lg rounded-xl shadow-lg border border-gray-100/50 dark:border-dark-border/50 p-2">
          {/* Style Controls */}
          <div className="flex items-center space-x-3">
            {/* Stroke Controls */}
            <div className="flex items-center space-x-1 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg p-1.5">
              {STROKE_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => dispatch(setStrokeStyle(style.id))}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    strokeStyle === style.id 
                      ? 'bg-white dark:bg-dark-border shadow-sm text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 dark:ring-blue-400/20' 
                      : 'hover:bg-white/50 dark:hover:bg-dark-border/70 text-gray-600 dark:text-gray-300'
                  }`}
                  title={style.label}
                >
                  {style.icon}
                </button>
              ))}
              <select
                value={strokeWidth}
                onChange={(e) => dispatch(setStrokeWidth(Number(e.target.value)))}
                className="bg-white dark:bg-dark-surface border-0 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm dark:text-dark-text"
              >
                {STROKE_WIDTHS.map((width) => (
                  <option key={width} value={width}>{width}px</option>
                ))}
              </select>
            </div>

            {/* Color Controls */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(showColorPicker === 'stroke' ? null : 'stroke')}
                  className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-dark-border shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: strokeColor }}
                  title="Stroke Color"
                />
                {showColorPicker === 'stroke' && (
                  <div className="absolute top-full left-0 mt-2 z-50" style={styles.fadeIn}>
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl p-2 ring-1 ring-gray-100 dark:ring-dark-border">
                      <SketchPicker
                        color={strokeColor}
                        onChange={(color) => dispatch(setStrokeColor(color.hex))}
                      />
                    </div>
                  </div>
                )}
              </div>
              {tool !== 'line' && tool !== 'arrow' && (
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(showColorPicker === 'fill' ? null : 'fill')}
                    className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-dark-border shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: fillColor }}
                    title="Fill Color"
                  />
                  {showColorPicker === 'fill' && (
                    <div className="absolute top-full left-0 mt-2 z-50" style={styles.fadeIn}>
                      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl p-2 ring-1 ring-gray-100 dark:ring-dark-border">
                        <SketchPicker
                          color={fillColor}
                          onChange={(color) => dispatch(setFillColor(color.hex))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Text Properties - Only show when text tool is selected */}
            {tool === 'text' && (
              <div className="flex items-center space-x-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg p-1.5">
                <select
                  value={fontSize}
                  onChange={(e) => dispatch(setFontSize(Number(e.target.value)))}
                  className="bg-white dark:bg-dark-surface border-0 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm dark:text-dark-text"
                >
                  {FONT_SIZES.map((size) => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
                <div className="flex space-x-1 bg-white dark:bg-dark-surface rounded-lg p-1 shadow-sm">
                  {TEXT_ALIGNMENTS.map((align) => (
                    <button
                      key={align.id}
                      onClick={() => dispatch(setTextAlign(align.id))}
                      className={`p-1.5 rounded-lg transition-all duration-200 ${
                        textAlign === align.id 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 dark:ring-blue-400/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-300'
                      }`}
                      title={align.label}
                    >
                      {align.icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Controls - Fixed to bottom right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3">
        {/* Zoom Controls */}
        <div className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-lg rounded-xl shadow-lg border border-gray-100/50 dark:border-dark-border/50 p-2 flex items-center space-x-2">
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-105"
            title="Zoom Out"
          >
            <Minus size={20} />
          </button>
          <span className="px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-300 font-medium min-w-[70px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.1)}
            className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-105"
            title="Zoom In"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-lg rounded-xl shadow-lg border border-gray-100/50 dark:border-dark-border/50 p-2 flex items-center space-x-2">
          <button
            onClick={() => dispatch(setGridVisible(!isGridVisible))}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isGridVisible 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 dark:ring-blue-400/20' 
                : 'hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-300'
            }`}
            title="Toggle Grid"
          >
            <Grid size={20} />
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-dark-border" />
          <button
            onClick={() => dispatch(undo())}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all duration-200 ${
              canUndo 
                ? 'hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-300 hover:scale-105' 
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
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
                ? 'hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-300 hover:scale-105' 
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo size={20} />
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-dark-border" />
          <button
            onClick={onExport}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium flex items-center space-x-1 hover:scale-105 shadow-sm shadow-blue-500/20"
            title="Export Canvas (Ctrl+E)"
          >
            <Download size={18} />
            <span>Export</span>
          </button>
          <label className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium cursor-pointer flex items-center space-x-1 hover:scale-105 shadow-sm shadow-purple-500/20">
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
    </>
  );
};

export default Toolbar;

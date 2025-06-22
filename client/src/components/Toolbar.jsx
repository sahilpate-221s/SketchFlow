import { useState, useEffect, useRef } from 'react';
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
  Share2,
  MoreHorizontal
} from 'lucide-react';
import './Toolbar.css';
import ShareButton from './ShareButton';

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
    selectedIds,
  } = useSelector((state) => state.canvas);

  const [showColorPicker, setShowColorPicker] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const toolbarRef = useRef(null);
  const [showMore, setShowMore] = useState(false);

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
      {/* Mobile Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-black/80 via-neutral-900/90 to-black/80 shadow-2xl flex md:hidden justify-between px-2 py-1 border-t border-neutral-800">
        <div className="flex flex-1 items-center justify-between overflow-x-auto">
          {TOOL_GROUPS.flatMap((group) => group.tools).map((toolItem) => (
            <button
              key={toolItem.id}
              onClick={() => handleToolSelect(toolItem.id)}
              className={`flex flex-col items-center justify-center mx-1 px-2 py-1 rounded-lg ${tool === toolItem.id ? 'bg-blue-700 text-white' : 'bg-transparent text-gray-200'} text-lg focus:outline-none`}
              style={{ minWidth: 44, minHeight: 44 }}
              title={toolItem.label}
            >
              <span>{toolItem.icon}</span>
              <span className="text-[10px] leading-none mt-0.5">{toolItem.label}</span>
            </button>
          ))}
          {/* More menu for extra controls */}
          <div className="relative">
            <button
              onClick={() => setShowMore((v) => !v)}
              className="flex flex-col items-center justify-center mx-1 px-2 py-1 rounded-lg bg-transparent text-gray-200 text-lg focus:outline-none"
              style={{ minWidth: 44, minHeight: 44 }}
              title="More"
            >
              <MoreHorizontal size={22} />
              <span className="text-[10px] leading-none mt-0.5">More</span>
            </button>
            {showMore && (
              <div className="absolute bottom-12 left-0 w-48 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-2 z-50 flex flex-col space-y-1">
                <button onClick={onGridToggle} className="w-full text-left px-3 py-2 rounded hover:bg-neutral-800 text-gray-200 text-sm">{isGridVisible ? 'Hide Grid' : 'Show Grid'}</button>
                <button onClick={() => canUndo && dispatch(undo())} disabled={!canUndo} className="w-full text-left px-3 py-2 rounded hover:bg-neutral-800 text-gray-200 text-sm disabled:opacity-50">Undo</button>
                <button onClick={() => canRedo && dispatch(redo())} disabled={!canRedo} className="w-full text-left px-3 py-2 rounded hover:bg-neutral-800 text-gray-200 text-sm disabled:opacity-50">Redo</button>
                <ShareButton />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Desktop Toolbar (unchanged) */}
      <div
        className="hidden md:fixed md:top-6 md:left-1/2 md:transform md:-translate-x-1/2 md:z-50 md:block"
        style={{ minHeight: '56px', height: '56px' }}
      >
        <div className="toolbar-pill top flex items-center overflow-x-auto md:overflow-visible px-2 md:px-0" style={{ minHeight: '56px', height: '56px', paddingTop: '0.3rem', paddingBottom: '0.3rem' }}>
          {TOOL_GROUPS.map((group, groupIdx) => (
            <div key={group.name} className="toolbar-group">
              {group.tools.map((toolItem) => (
                <button
                  key={toolItem.id}
                  onClick={() => handleToolSelect(toolItem.id)}
                  className={`toolbar-btn top ${tool === toolItem.id ? 'toolbar-btn-active' : ''}`}
                  title={toolItem.label}
                  tabIndex={0}
                  onMouseEnter={e => {
                    const tooltip = e.currentTarget.querySelector('.toolbar-tooltip');
                    if (tooltip) tooltip.style.opacity = '1';
                  }}
                  onMouseLeave={e => {
                    const tooltip = e.currentTarget.querySelector('.toolbar-tooltip');
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                  onBlur={e => {
                    const tooltip = e.currentTarget.querySelector('.toolbar-tooltip');
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                >
                  <span className="toolbar-btn-icon top">{toolItem.icon}</span>
                  {/* Show a line below the icon if selected */}
                  {tool === toolItem.id && (
                    <span className="toolbar-btn-underline" />
                  )}
                  <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}> 
                    {toolItem.label} <span className="opacity-60">({toolItem.shortcut})</span>
                  </span>
                </button>
              ))}
              {groupIdx < TOOL_GROUPS.length - 1 && (
                <span className="toolbar-dot-divider" />
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
            className={`toolbar-btn bottom${isGridVisible ? ' toolbar-btn-active' : ''}`}
            title="Toggle Grid (G)"
            tabIndex={0}
            onMouseEnter={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '1'; }}
            onMouseLeave={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onBlur={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onClick={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; onGridToggle(); }}
          >
            <span className="toolbar-btn-icon bottom"><Grid size={20} /></span>
            {isGridVisible && <span className="toolbar-btn-underline" />}
            <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}>Toggle Grid <span className="opacity-60">(G)</span></span>
          </button>
          {/* Undo/Redo */}
          <button
            onClick={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; if (canUndo) dispatch(undo()); }}
            disabled={!canUndo}
            className={`toolbar-btn bottom${canUndo ? '' : ' toolbar-btn-disabled'}`}
            title="Undo (Ctrl+Z)"
            tabIndex={0}
            onMouseEnter={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '1'; }}
            onMouseLeave={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onBlur={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
          >
            <span className="toolbar-btn-icon bottom"><Undo size={20} /></span>
            {canUndo && <span className="toolbar-btn-underline" />}
            <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}>Undo <span className="opacity-60">(Ctrl+Z)</span></span>
          </button>
          <button
            onClick={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; if (canRedo) dispatch(redo()); }}
            disabled={!canRedo}
            className={`toolbar-btn bottom${canRedo ? '' : ' toolbar-btn-disabled'}`}
            title="Redo (Ctrl+Shift+Z)"
            tabIndex={0}
            onMouseEnter={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '1'; }}
            onMouseLeave={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onBlur={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
          >
            <span className="toolbar-btn-icon bottom"><Redo size={20} /></span>
            {canRedo && <span className="toolbar-btn-underline" />}
            <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}>Redo <span className="opacity-60">(Ctrl+Shift+Z)</span></span>
          </button>
          {/* Zoom Controls */}
          <button
            onClick={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; handleZoom(-0.1); }}
            className="toolbar-btn bottom"
            title="Zoom Out (-)"
            tabIndex={0}
            onMouseEnter={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '1'; }}
            onMouseLeave={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onBlur={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
          >
            <span className="toolbar-btn-icon bottom"><Minus size={18} /></span>
            <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}>Zoom Out <span className="opacity-60">(-)</span></span>
          </button>
          <span className="toolbar-zoom-label min-w-[60px] text-center text-base font-semibold text-white/90 select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; handleZoom(0.1); }}
            className="toolbar-btn bottom"
            title="Zoom In (+)"
            tabIndex={0}
            onMouseEnter={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '1'; }}
            onMouseLeave={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onBlur={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
          >
            <span className="toolbar-btn-icon bottom"><Plus size={18} /></span>
            <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}>Zoom In <span className="opacity-60">(+)</span></span>
          </button>
          {/* Collaboration & Share */}
          <button
            onClick={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; setShowCollaborators(!showCollaborators); }}
            className={`toolbar-btn bottom${showCollaborators ? ' toolbar-btn-active' : ''}`}
            title={`${collaborators.length} Collaborators`}
            tabIndex={0}
            onMouseEnter={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '1'; }}
            onMouseLeave={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onBlur={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
          >
            <span className="toolbar-btn-icon bottom"><Users size={20} /></span>
            {showCollaborators && <span className="toolbar-btn-underline" />}
            <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}>Collaborators</span>
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
          <div className="toolbar-btn-container">
            <ShareButton className="toolbar-btn bottom" />
          </div>
          {/* Export/Import */}
          <button
            onClick={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; onExport(); }}
            className="toolbar-btn bottom px-3 py-1.5 font-medium flex items-center gap-1"
            title="Export Canvas (Ctrl+E)"
            tabIndex={0}
            onMouseEnter={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '1'; }}
            onMouseLeave={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onBlur={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
          >
            <span className="toolbar-btn-icon bottom"><Download size={18} /></span>
            <span className="hidden sm:inline">Export</span>
            <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}>Export <span className="opacity-60">(Ctrl+E)</span></span>
          </button>
          <label
            className="toolbar-btn bottom px-3 py-1.5 font-medium cursor-pointer flex items-center gap-1"
            tabIndex={0}
            onMouseEnter={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '1'; }}
            onMouseLeave={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onBlur={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
            onClick={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
          >
            <span className="toolbar-btn-icon bottom"><Upload size={18} /></span>
            <span className="hidden sm:inline">Import</span>
            <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}>Import</span>
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

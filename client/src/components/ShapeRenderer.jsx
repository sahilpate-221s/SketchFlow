import React, { useRef, useEffect } from 'react';
import { Rect, Circle, Arrow, Line, Text, Group, Transformer } from 'react-konva';
import { catmullRomSpline } from '../utils/catmullRom';
import { updateShape } from '../store/canvasSlice';

const ShapeRenderer = ({
  shapes,
  selectedIds,
  tool,
  readOnly,
  dispatch,
  emitShapeUpdate,
  emitShapeDelete,
  setSelectedIds,
  setIsDragging,
  snapToGrid,
  handleTextEdit,
  diagramId,
  shapesRef
}) => {
  console.log('[ShapeRenderer] shapes prop:', shapes);
  const localTransformerRef = useRef();

  // --- Helper: get node refs for transformer ---
  useEffect(() => {
    if (!shapesRef.current) shapesRef.current = [];
    // Remove any refs that are not in the current shapes list
    shapesRef.current = shapesRef.current.filter(
      (node) => node && shapes.some((s) => node.id && node.id() === s.id)
    );
  }, [shapes]);

  // Always return only valid, mounted nodes for selected shapes
  const getSelectedNodeRefs = () => {
    if (!shapesRef?.current) return [];
    return shapes
      .filter((s) => selectedIds.includes(s.id))
      .map((s) => shapesRef.current.find((n) => n && n.id && n.id() === s.id))
      .filter(Boolean);
  };

  // --- Transformer logic: attach to selected nodes and handle resizing ---
  useEffect(() => {
    if (!localTransformerRef.current || !shapesRef.current) return;
    const selectedNodes = shapesRef.current.filter(
      (node) => node && selectedIds.includes(node.id())
    );
    if (selectedNodes.length > 0) {
      localTransformerRef.current.nodes(selectedNodes);
      localTransformerRef.current.getLayer().batchDraw();
    } else {
      localTransformerRef.current.nodes([]);
    }
  }, [selectedIds, shapes]);

  // --- Handle transform start ---
  const handleTransformStart = (node) => {
    // Optionally, you can add logic here if needed when transform starts
  };

  // --- Handle transform (during transform) ---
  const handleTransform = (node, shape) => {
    // Optionally, update shape preview during transform if needed
  };

  // --- Handle transform end (resize/reshape) ---
  const handleTransformEnd = (node, shape) => {
    if (!node || !shape) return;
    let newShape = { ...shape };
    if (shape.type === 'rectangle' || shape.type === 'sticky' || shape.type === 'text') {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      newShape.x = snapToGrid(node.x());
      newShape.y = snapToGrid(node.y());
      newShape.width = Math.max(10, shape.width * scaleX);
      newShape.height = Math.max(10, shape.height * scaleY);
      node.scaleX(1);
      node.scaleY(1);
    } else if (shape.type === 'circle') {
      const scale = node.scaleX();
      newShape.x = snapToGrid(node.x());
      newShape.y = snapToGrid(node.y());
      newShape.radius = Math.max(5, shape.radius * scale);
      node.scaleX(1);
      node.scaleY(1);
    }
    emitShapeUpdate(diagramId, newShape);
    dispatch(updateShape(newShape));
  };


  return (
    <>
      {console.log("ShapeRenderer - shapes:", shapes)}
      {shapes.map((shape, idx) => {
        console.log("Rendering shape:", shape);
        if (shape.type === 'markdown') return null;
        const isShapeDraggable = !readOnly && tool === 'select' && selectedIds.includes(shape.id);
        const isSelected = selectedIds.includes(shape.id);
        // Register node ref for Transformer
        const shapeRef = (node) => {
          if (!shapesRef.current) shapesRef.current = [];
          if (node && node.id && typeof node.id === 'function') {
            shapesRef.current[idx] = node;
          } else {
            shapesRef.current[idx] = undefined;
          }
        };
        // Helper: Only show dots if shape is selected and has non-zero size
        const showSelectionDots = () => {
          if (!isSelected) return false;
          if (shape.type === 'rectangle' || shape.type === 'sticky') {
            return shape.width > 0 && shape.height > 0;
          }
          if (shape.type === 'circle') {
            return shape.radius > 0;
          }
          if (shape.type === 'line' || shape.type === 'arrow') {
            return shape.points && shape.points.length === 4 && (shape.points[0] !== shape.points[2] || shape.points[1] !== shape.points[3]);
          }
          return false;
        };
        const commonProps = {
          id: shape.id,
          draggable: isShapeDraggable,
          onClick: (e) => {
            if (readOnly) return;
            e.cancelBubble = true;
            if (tool === 'select') {
              if (e.evt.shiftKey) {
                if (!selectedIds.includes(shape.id)) {
                  dispatch(setSelectedIds([...selectedIds, shape.id]));
                }
              } else {
                dispatch(setSelectedIds([shape.id]));
              }
            }
          },
          onTap: (e) => {
            if (readOnly) return;
            e.cancelBubble = true;
            if (tool === 'select') {
              if (e.evt.shiftKey) {
                if (!selectedIds.includes(shape.id)) {
                  dispatch(setSelectedIds([...selectedIds, shape.id]));
                }
              } else {
                dispatch(setSelectedIds([shape.id]));
              }
            }
          },
          onDragStart: (e) => {
            if (readOnly || tool !== 'select' || !selectedIds.includes(shape.id)) return;
            dispatch(setIsDragging(true));
          },
          onDragEnd: (e) => {
            if (readOnly || tool !== 'select' || !selectedIds.includes(shape.id)) return;
            dispatch(setIsDragging(false));
            const node = e.target;
            let newShape = { ...shape };
            // For circles, update x/y; for others, update x/y as well
            if (shape.type === 'circle') {
              newShape.x = snapToGrid(node.x());
              newShape.y = snapToGrid(node.y());
            } else if (shape.type === 'rectangle' || shape.type === 'sticky' || shape.type === 'text') {
              newShape.x = snapToGrid(node.x());
              newShape.y = snapToGrid(node.y());
            } else if (shape.type === 'line' || shape.type === 'arrow') {
              // For lines/arrows, update all points by the drag delta
              const dx = node.x() - shape.x;
              const dy = node.y() - shape.y;
              newShape.points = shape.points.map((val, idx) => idx % 2 === 0 ? val + dx : val + dy);
              newShape.x = node.x();
              newShape.y = node.y();
            }
            emitShapeUpdate(diagramId, newShape);
            dispatch(updateShape(newShape));
            // Do NOT deselect after drag; keep selection
          },
        };
        // Add transform handlers to supported shapes
        const transformProps = isSelected && !readOnly && tool === 'select' ? {
          onTransformStart: (e) => handleTransformStart(e.target),
          onTransform: (e) => handleTransform(e.target, shape),
          onTransformEnd: (e) => handleTransformEnd(e.target, shape)
        } : {};
        switch (shape.type) {
          case 'rectangle':
            return (
              <React.Fragment key={shape.id}>
                <Rect
                  ref={shapeRef}
                  {...commonProps}
                  {...transformProps}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill={shape.fill}
                  stroke={isSelected ? '#fff' : shape.stroke}
                  strokeWidth={isSelected ? 1.5 : shape.strokeWidth}
                  dash={isSelected ? [0] : shape.dash}
                  shadowEnabled={false}
                />
                {showSelectionDots() && (
                  <React.Fragment>
                    {/* Animated minimal corner dots for premium look */}
                    <Circle key={`${shape.id}-dot-1`} x={shape.x} y={shape.y} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-2`} x={shape.x + shape.width} y={shape.y} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-3`} x={shape.x} y={shape.y + shape.height} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-4`} x={shape.x + shape.width} y={shape.y + shape.height} radius={3} fill="#fff" opacity={0.7} />
                  </React.Fragment>
                )}
              </React.Fragment>
            );
          case 'circle':
            return (
              <React.Fragment key={shape.id}>
                <Circle
                  ref={shapeRef}
                  {...commonProps}
                  {...transformProps}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                  fill={shape.fill}
                  stroke={isSelected ? '#fff' : shape.stroke}
                  strokeWidth={isSelected ? 1.5 : shape.strokeWidth}
                  shadowEnabled={false}
                />
                {showSelectionDots() && (
                  <React.Fragment>
                    {/* Four cardinal points for circle selection */}
                    <Circle key={`${shape.id}-dot-1`} x={shape.x + shape.radius} y={shape.y} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-2`} x={shape.x - shape.radius} y={shape.y} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-3`} x={shape.x} y={shape.y + shape.radius} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-4`} x={shape.x} y={shape.y - shape.radius} radius={3} fill="#fff" opacity={0.7} />
                  </React.Fragment>
                )}
              </React.Fragment>
            );
          case 'line':
          case 'arrow':
            return (
              <React.Fragment key={shape.id}>
                <Arrow
                  ref={shapeRef}
                  {...commonProps}
                  points={shape.points}
                  fill={isSelected ? '#fff' : shape.stroke}
                  stroke={isSelected ? '#fff' : shape.stroke}
                  strokeWidth={isSelected ? 1.5 : shape.strokeWidth}
                  pointerLength={shape.type === 'arrow' ? 10 : 0}
                  pointerWidth={shape.type === 'arrow' ? 10 : 0}
                  shadowEnabled={false}
                />
                {showSelectionDots() && (
                  <React.Fragment>
                    {/* Endpoints dots for line/arrow */}
                    <Circle key={`${shape.id}-dot-1`} x={shape.points[0]} y={shape.points[1]} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-2`} x={shape.points[2]} y={shape.points[3]} radius={3} fill="#fff" opacity={0.7} />
                  </React.Fragment>
                )}
              </React.Fragment>
            );
          case 'freehand':
            // Use Catmull-Rom smoothing (same as Canvas.jsx)
            const smoothedPoints = catmullRomSpline(shape.points, 8);
            return (
              <Line
                key={shape.id}
                ref={shapeRef}
                {...commonProps}
                points={smoothedPoints}
                stroke={isSelected ? '#fff' : shape.stroke}
                strokeWidth={isSelected ? 1.5 : shape.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="source-over"
                perfectDrawEnabled={false}
                hitStrokeWidth={20}
                listening={!readOnly}
                bezier={false}
                shadowEnabled={false}
              />
            );
          case 'text':
            return (
              <Text
                key={shape.id}
                ref={shapeRef}
                {...commonProps}
                {...transformProps}
                x={shape.x}
                y={shape.y}
                text={shape.text}
                fontSize={shape.fontSize}
                fill={isSelected ? '#fff' : shape.stroke}
                onDblClick={(e) => {
                  const node = e.target;
                  const pos = node.getAbsolutePosition();
                  handleTextEdit(shape.id, shape.text, pos);
                }}
                shadowEnabled={false}
              />
            );
          case 'sticky':
            return (
              <Group
                key={shape.id}
                ref={shapeRef}
                {...commonProps}
                {...transformProps}
                x={shape.x}
                y={shape.y}
                onClick={(e) => {
                  if (readOnly) return;
                  e.cancelBubble = true;
                  if (tool === 'select') {
                    if (e.evt.shiftKey) {
                      dispatch(setSelectedIds([...selectedIds, shape.id]));
                    } else {
                      dispatch(setSelectedIds([shape.id]));
                    }
                  }
                }}
                onDblClick={(e) => {
                  if (readOnly) return;
                  e.cancelBubble = true;
                  const node = e.target;
                  const pos = node.getAbsolutePosition();
                  handleTextEdit(shape.id, shape.text, pos);
                }}
              >
                <Rect
                  width={shape.width}
                  height={shape.height}
                  fill={shape.fill}
                  stroke={isSelected ? '#fff' : shape.stroke}
                  strokeWidth={isSelected ? 1.5 : shape.strokeWidth}
                  cornerRadius={8}
                  shadowEnabled={false}
                />
                <Text
                  text={shape.text || 'Double click to edit...'}
                  width={shape.width - 20}
                  height={shape.height - 20}
                  x={10}
                  y={10}
                  fontSize={shape.fontSize}
                  fill="#fff"
                  padding={10}
                  align="left"
                  verticalAlign="top"
                />
                {showSelectionDots() && (
                  <React.Fragment>
                    {/* Minimal animated corner dots for sticky note selection */}
                    <Circle key={`${shape.id}-dot-1`} x={0} y={0} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-2`} x={shape.width} y={0} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-3`} x={0} y={shape.height} radius={3} fill="#fff" opacity={0.7} />
                    <Circle key={`${shape.id}-dot-4`} x={shape.width} y={shape.height} radius={3} fill="#fff" opacity={0.7} />
                  </React.Fragment>
                )}
                {/* Resize handle remains unchanged */}
                {!readOnly && tool === 'select' && isSelected && (
                  <Rect
                    x={shape.width - 20}
                    y={shape.height - 20}
                    width={20}
                    height={20}
                    fill="transparent"
                    stroke="transparent"
                    onMouseEnter={(e) => {
                      e.target.getStage().container().style.cursor = 'nwse-resize';
                    }}
                    onMouseLeave={(e) => {
                      e.target.getStage().container().style.cursor = 'default';
                    }}
                  />
                )}
              </Group>
            );
          default:
            return null;
        }
      })}
      {/* --- Transformer node (single instance, outside map) --- */}
      {!readOnly && tool === 'select' && selectedIds.length > 0 && (
        <Transformer
          ref={localTransformerRef}
          boundBoxFunc={(oldBox, newBox) => newBox}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          anchorSize={8}
          anchorStroke="#fff"
          anchorFill="#222"
          anchorCornerRadius={4}
          anchorStrokeWidth={2}
          anchorOpacity={0.8}
        />
      )}
    </>
  );
};

export default ShapeRenderer;

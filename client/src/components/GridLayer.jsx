import React from 'react';
import { Layer, Line } from 'react-konva';

const GridLayer = ({
  isGridVisible,
  stageRef,
  stageWidth,
  stageHeight,
  GRID_SIZE = 20,
  GRID_EXTENSION = 2000
}) => {
  if (!isGridVisible || !stageRef.current) return null;
  const stage = stageRef.current;
  const stagePos = stage.position();
  const scale = stage.scaleX();
  const startX = Math.floor((stagePos.x / scale - GRID_EXTENSION) / GRID_SIZE) * GRID_SIZE;
  const endX = Math.ceil((stagePos.x / scale + stageWidth / scale + GRID_EXTENSION) / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor((stagePos.y / scale - GRID_EXTENSION) / GRID_SIZE) * GRID_SIZE;
  const endY = Math.ceil((stagePos.y / scale + stageHeight / scale + GRID_EXTENSION) / GRID_SIZE) * GRID_SIZE;
  const lines = [];
  for (let x = startX; x <= endX; x += GRID_SIZE) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, startY, x, endY]}
        stroke="#64748b"
        strokeWidth={0.5}
        opacity={0.7}
        dash={[5, 5]}
      />
    );
  }
  for (let y = startY; y <= endY; y += GRID_SIZE) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[startX, y, endX, y]}
        stroke="#64748b"
        strokeWidth={0.5}
        opacity={0.7}
        dash={[5, 5]}
      />
    );
  }
  return <Layer>{lines}</Layer>;
};

export default GridLayer;

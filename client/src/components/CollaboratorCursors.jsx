import React from 'react';
import { Group, RegularPolygon, Rect, Text, Circle } from 'react-konva';

// Defensive: default to empty object if undefined
const CollaboratorCursors = ({ collaboratorCursors = {}, shapes = [], selectedIds = [] }) => {
  return (
    <>
      {Object.entries(collaboratorCursors).map(([userId, data]) => {
        const { position, user, lastUpdate, selection, tool } = data;
        const isActive = Date.now() - lastUpdate < 2000; // Show for 2 seconds
        const isSelecting = tool === 'select' && selection?.length > 0;

        if (!position || !user) return null;

        return (
          <Group key={userId} x={position.x} y={position.y}>
            {/* Cursor */}
            <RegularPolygon
              sides={3}
              radius={8}
              fill={user.color}
              rotation={-90}
              offsetY={-4}
              shadowColor="black"
              shadowBlur={4}
              shadowOpacity={0.2}
              shadowOffset={{ x: 0, y: 2 }}
            />
            {/* User label with tool info */}
            <Group x={15} y={-20}>
              <Rect
                fill={user.color}
                cornerRadius={4}
                width={120}
                height={24}
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={0.2}
                shadowOffset={{ x: 0, y: 2 }}
              />
              <Text
                text={`${user.name} (${tool})`}
                fill="white"
                fontSize={12}
                padding={6}
                width={120}
                align="center"
              />
            </Group>
            {/* Activity indicator */}
            {isActive && (
              <Circle
                x={0}
                y={0}
                radius={4}
                fill={user.color}
                opacity={0.6}
                shadowColor="black"
                shadowBlur={2}
                shadowOpacity={0.2}
              />
            )}
            {/* Selection highlight */}
            {isSelecting && selection.map(shapeId => {
              const shape = shapes.find(s => s.id === shapeId);
              if (!shape) return null;
              
              return (
                <Group key={shapeId} x={shape.x} y={shape.y}>
                  <Rect
                    width={shape.width}
                    height={shape.height}
                    stroke={user.color}
                    strokeWidth={2}
                    dash={[5, 5]}
                    opacity={0.5}
                    fill="transparent"
                    shadowColor={user.color}
                    shadowBlur={4}
                    shadowOpacity={0.2}
                  />
                </Group>
              );
            })}
          </Group>
        );
      })}
    </>
  );
};

export default CollaboratorCursors;

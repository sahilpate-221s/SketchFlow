export const snapToGrid = (value, isGridSnap, gridSize) => {
  if (!isGridSnap) return value;
  // Make snapping less aggressive
  const snapThreshold = gridSize / 2;
  const remainder = value % gridSize;
  if (remainder < snapThreshold) {
    return value - remainder;
  } else if (remainder > gridSize - snapThreshold) {
    return value + (gridSize - remainder);
  }
  return value;
};

export const reducePoints = (points, threshold) => {
  if (points.length <= 4) return points;
  
  const result = [points[0], points[1]]; // Keep first point
  let lastPoint = [points[0], points[1]];
  
  for (let i = 2; i < points.length; i += 2) {
    const currentPoint = [points[i], points[i + 1]];
    const distance = Math.sqrt(
      Math.pow(currentPoint[0] - lastPoint[0], 2) +
      Math.pow(currentPoint[1] - lastPoint[1], 2)
    );
    
    if (distance >= threshold) {
      result.push(currentPoint[0], currentPoint[1]);
      lastPoint = currentPoint;
    }
  }
  
  // Always keep the last point
  if (result[result.length - 2] !== points[points.length - 2] ||
      result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 2], points[points.length - 1]);
  }
  
  return result;
};

export const distanceToLine = (x, y, x1, y1, x2, y2) => {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;

  if (len_sq !== 0) {
    param = dot / len_sq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
};

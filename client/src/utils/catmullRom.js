// Catmull-Rom spline smoothing for freehand points
// Input: flat array of points [x0, y0, x1, y1, ...]
// Output: flat array of smoothed points
export function catmullRomSpline(points, segments = 8) {
  if (!points || points.length < 6) return points;
  const result = [];
  for (let i = 0; i < points.length - 2; i += 2) {
    const p0x = i === 0 ? points[i] : points[i - 2];
    const p0y = i === 0 ? points[i + 1] : points[i - 1];
    const p1x = points[i];
    const p1y = points[i + 1];
    const p2x = points[i + 2];
    const p2y = points[i + 3];
    const p3x = i + 4 < points.length ? points[i + 4] : p2x;
    const p3y = i + 5 < points.length ? points[i + 5] : p2y;
    for (let t = 0; t < segments; t++) {
      const s = t / segments;
      const x = catmullRomInterpolate(p0x, p1x, p2x, p3x, s);
      const y = catmullRomInterpolate(p0y, p1y, p2y, p3y, s);
      result.push(x, y);
    }
  }
  // Always add the last point
  result.push(points[points.length - 2], points[points.length - 1]);
  return result;
}

function catmullRomInterpolate(p0, p1, p2, p3, t) {
  return (
    0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
    )
  );
}

export const getCatmullRomSpline = catmullRomSpline;
export default catmullRomSpline;

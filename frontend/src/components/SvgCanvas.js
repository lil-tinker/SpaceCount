import { useState, useRef } from "react";
const zoneColors = ["#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];
export const SvgCanvas = ({ activeZoneIdx, newZoneComplete, msgStatusFrame }) => {
  const svgRef = useRef(null);
  const [previewPoints, setPreviewPoints] = useState([]);
  const [hoverCreate, setHoverCreate] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);
  const maxPoints = 10;
  const minDist = 4;
  const countPoints = previewPoints.length;
  const cursorStyle = (hoverCreate || hoverDelete ? "pointer" : "crosshair");
  const toSvgCoords = (e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 56),
    };
  };
  const pointSizeHover = (pt, point, radius = 2) => Math.hypot(pt.x - point.x, pt.y - point.y) < radius;
  const cross = (o, u, v) => (u.x - o.x) * (v.y - o.y) - (u.y - o.y) * (v.x - o.x);
  const handleMouseClick = (e) => {
    if (activeZoneIdx === null) return;
    const pt = toSvgCoords(e);
    if (!pt) return;
    if (countPoints >= 1 && pointSizeHover(pt, previewPoints[countPoints - 1])) {
      removeLastPoint();
      return;
    }
    if (countPoints >= 3 && pointSizeHover(pt, previewPoints[0])) {
      closeZone();
      return;
    }
    CreatePoint(pt);
  };
  const handleMouseMove = (e) => {
    if (activeZoneIdx === null) return;
    const pt = toSvgCoords(e);
    if (!pt) return;
    let onDelete = false;
    if (countPoints >= 1) { onDelete = pointSizeHover(pt, previewPoints[countPoints - 1]); }
    let onCreate = false;
    if (countPoints >= 3) { onCreate = pointSizeHover(pt, previewPoints[0]); }
    setHoverDelete(onDelete);
    setHoverCreate(onCreate);
  };
  const CreatePoint = (pt) => {
    if (countPoints >= maxPoints) {
      msgStatusFrame?.({ type: "error", text: `Максимум ${maxPoints} вершин.` });
      return;
    }
    if (wouldIntersect(previewPoints, pt)) {
      msgStatusFrame?.({ type: "error", text: `Стороны многоугольника не должны пересекаться.` });
      return;
    }
    for (let i = 0; i < countPoints; i++) {
      if (pointSizeHover(pt, previewPoints[i], minDist)) {
        msgStatusFrame?.({ type: "error", text: `Слишком близко к вершине. Увеличьте расстояние.` });
        return;
      }
    }
    setPreviewPoints(prev => [...prev, pt]);
    setHoverDelete(true);
    msgStatusFrame?.({ type: "info", text: `Нарисуйте многоугольник. ПКМ - добавить/удалить вершину, сомкнуть фигуру.` });
  };
  const closeZone = () => {
    if (closingWouldIntersect(previewPoints)) {
      msgStatusFrame?.({ type: "error", text: `Стороны многоугольника не должны пересекаться.` });
      return;
    }
    newZoneComplete?.(previewPoints);
    setPreviewPoints([]);
  };
  const wouldIntersect = (points, newPt) => {
    if (points.length < 2) return false;
    const A = points[points.length - 1], B = newPt;
    for (let i = 0; i < points.length - 2; i++)
      if (segmentsIntersect(A, B, points[i], points[i + 1])) return true;
    return false;
  };
  const closingWouldIntersect = (points) => {
    if (points.length < 3) return false;
    const A = points[points.length - 1], B = points[0];
    for (let i = 1; i < points.length - 2; i++)
      if (segmentsIntersect(A, B, points[i], points[i + 1])) return true;
    return false;
  };
  const segmentsIntersect = (a, b, c, d) => {
    const d1 = cross(c, d, a), d2 = cross(c, d, b);
    const d3 = cross(a, b, c), d4 = cross(a, b, d);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    return false;
  };
  const removeLastPoint = () => {
    setPreviewPoints(prev => prev.slice(0, -1));
    setHoverDelete(false);
  };
  return (
    <div style={{ cursor: cursorStyle }}>
      <svg ref={svgRef} viewBox="0 0 100 56" preserveAspectRatio="none" 
        className="cam-area cam-area-svg" onClick={handleMouseClick} onMouseMove={handleMouseMove}>
        {countPoints >= 1 && (() => {
          const color = zoneColors[activeZoneIdx % zoneColors.length];
          return (
            <g>
              {countPoints >= 2 && previewPoints.slice(0, -1).map((p, i) => (
                <line key={i} x1={p.x} y1={p.y} 
                  x2={previewPoints[i+1].x} y2={previewPoints[i+1].y}
                  stroke={color} strokeWidth="0.5"
                />
              ))}
              {countPoints >= 2 && (
                <line x1={previewPoints[0].x}
                  y1={previewPoints[0].y}
                  x2={previewPoints[countPoints - 1].x}
                  y2={previewPoints[countPoints - 1].y}
                  stroke={color} strokeWidth="0.5" strokeDasharray="1.5 1"
                />
              )}
              {previewPoints.slice(1, -1).map((p, pi) => (
                <circle key={pi} cx={p.x} cy={p.y} fill={color} r="1"/>
              ))}
              {countPoints >= 1 && (() => {
                const fp = previewPoints[0];
                const isHoverMode = countPoints >= 2 && hoverCreate;  
                const outerRadius = isHoverMode ? 2 : 1.5;
                const innerRadius = isHoverMode ? 1.5 : 1;
                return (
                  <g>
                    <circle cx={fp.x} cy={fp.y} r={outerRadius} fill={color} />
                    <circle cx={fp.x} cy={fp.y} r={innerRadius} fill="#fff" />
                  </g>
                );
              })()}
              {countPoints >= 1 && (() => {
                const lp = previewPoints[countPoints - 1];
                return hoverDelete ? (
                  <g>
                    <circle cx={lp.x} cy={lp.y} r="1.5" fill="#ef4444"/>
                    <line x1={lp.x - 0.9} y1={lp.y - 0.9} x2={lp.x + 0.9} y2={lp.y + 0.9} stroke="#fff" strokeWidth="0.5" strokeLinecap="round"/>
                    <line x1={lp.x + 0.9} y1={lp.y - 0.9} x2={lp.x - 0.9} y2={lp.y + 0.9} stroke="#fff" strokeWidth="0.5" strokeLinecap="round"/>
                  </g>
                ) : (
                  <g>
                    <circle cx={lp.x} cy={lp.y} r="1.5" fill="#fff"/>
                    <circle cx={lp.x} cy={lp.y} r="1" fill={color}/>
                  </g>
                );
              })()}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
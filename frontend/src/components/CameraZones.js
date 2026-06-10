const ZONE_COLORS = ["#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];
export const CameraZones = ({ zones, strokeWidth = 1}) => {
  return (
    <svg className="cam-area cam-area-svg" viewBox="0 0 100 56" preserveAspectRatio="none">
        {zones.map((zone, zi) => {
          if (zone.points.length <= 2) return null;
          const color = ZONE_COLORS[zi % ZONE_COLORS.length];
          const pts = zone.points.map(p => `${p.x},${p.y}`).join(" ");
          return (
            <g key={zi}><polygon  points={pts} fillOpacity={0} stroke={color} strokeWidth={strokeWidth}/></g>
          );
        })};
    </svg>
  );
};
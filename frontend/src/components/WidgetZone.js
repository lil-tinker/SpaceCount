const ZoneCard = ({ item }) => {
  const fillPercent = (count, capacity) => Math.min(100, Math.round((count / capacity) * 100));
  const statusColor = { normal: "#22c55e", warning: "#f59e0b", critical: "#ef4444" };
  const getStatus = (count, capacity) => {
    const pct = count / capacity;
    if (pct >= 0.9) return "critical";
    if (pct >= 0.7) return "warning";
    return "normal";
  };
  const pct = fillPercent(item.count, item.capacity);
  const color = statusColor[getStatus(item.count, item.capacity)];
  return (
    <div className="zone-row">
      <div className='widget-zone-item'>
        <div className='second-text'>{item.name}</div>
        <div className='flex-row-10'>
          {item.trend && (
            <span style={{ color: item.trend.startsWith("+") ? "#22c55e" : "#ef4444" }}>{item.trend}</span>
          )}
          <span className="second-text">{item.count} / {item.capacity}</span>
        </div>
      </div>
      <div className="bar-bg">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }}/>
      </div>
    </div>
  );
}
export const WidgetZone = ({ name, cameras = [], zones = [] }) => {
  return (
    <div className="card flex-col-10">
      <div className='widget-title'>Счётчик посетителей {!!name && " - " + name}</div>
      {cameras.map(cam => <ZoneCard key={"camera_"+cam.camera_id} item={cam}/>)}
      {zones.map(zon => <ZoneCard key={"zone_"+zon.zone_id} item={zon}/>)}
    </div>
  );
}
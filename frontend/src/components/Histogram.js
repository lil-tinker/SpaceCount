export const Histogram = ({ data, height = 120, tickCount = 5 }) => {
  const getYTicks = (data, tickCount = 5) => {
  const max = Math.max(...data);
    if (max === 0) return Array(tickCount).fill(0);
    const rawStep = max / (tickCount - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = Math.ceil(rawStep / magnitude) * magnitude;
    const nicMax = step * (tickCount - 1);
    return Array(tickCount).fill(0).map((_, i) => nicMax - i * step);
  };
  
  const yTicks = getYTicks(data, tickCount);
  const yMax = yTicks[0];
  return (
    <div className="card">
      <div className="widget-hist-title">Посещаемость — последние 5 часов</div>
      <div className="widget-hist">
        <div className="widget-hist-Y" style={{ height }}>
          <div className="widget-hist-Y-width">{yMax}</div>
          {yTicks.map((val, i) => (
            <div key={val} className="widget-hist-Y-text second-text" style={{
              top: `${(i / (tickCount - 1)) * 100}%`,
              transform: "translateY(-50%)"}}>
              {val}
            </div>
          ))}
        </div>
        <div className="widget-hist-padding" />
        <div className="widget-hist-graph" style={{ height }}>
          {yTicks.map((val, i) => (
            <div key={val} className="widget-hist-horizont-lines" style={{
              top: `${(i / (tickCount - 1)) * 100}%`,
              borderTop: i === tickCount - 1 ? "1px solid #2a3040" : "1px dashed #2a3040",
            }} />
          ))}
          <div className="widget-hist-bar">
            {data.map((v, i) => (
              <div key={i} className="widget-hist-bar-item" style={{
                height: yMax > 0 ? `${(v / yMax) * 100}%` : 0,
                minHeight: v > 0 ? 2 : 0,
              }} />
            ))}
          </div>
        </div>
      </div>
      <div className="widget-hist-X">
        {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"].map(t => (
          <span key={t} className="second-text">{t}</span>
        ))}
      </div>
    </div>
  );
};
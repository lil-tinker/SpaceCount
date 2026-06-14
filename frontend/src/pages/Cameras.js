import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {CameraSnapshot} from '../components/CameraSnapshot';
import {CameraZones} from '../components/CameraZones';
import AxiosAPI from '../components/AxiosAPI'
import axios from 'axios';
const SCHEDULE_OPTIONS = [
  { value: 1,  label: "каждую минуту" },
  { value: 5,  label: "каждые 5 мин." },
  { value: 10, label: "каждые 10 мин." },
  { value: 15, label: "каждые 15 мин." },
  { value: 30, label: "каждые 30 мин." },
  { value: 60, label: "каждый час" },
];
const zoneColors = ["#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];
const CameraView = ({ cam }) => {
    const [imgReady, setImgReady] = useState(false);  
    const [timestamp, setTimestamp] = useState(() => Date.now());
    return (
        <div className="cam-snapshot">
            <CameraSnapshot 
                cam={{ active: cam.active, url: `/cameras/${id}/snapshot/` }} 
                onLoad={() => setImgReady(true)} onError={() => setImgReady(false)}/>
            {imgReady && cam.active && <CameraZones zones={cam.zones} />}
        </div>
    );
};
const ContainerPageCamera = ({ children, action }) => (
  <div className="content">
    <div className="header">
      <div className="text-title">Управление камерами</div>
      {action}
    </div>
    {children}
  </div>
);
export const Cameras = () => {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const controllerRef = useRef(null);
  const fetchCameras = useCallback(async () => {
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = new AbortController();
      setLoading(true);
      setError(null);
      try {
          const response = await AxiosAPI.get('/api/cameras/', { signal: controllerRef.current.signal });
          setCameras(response.data);
      } catch (error) {
          if (axios.isCancel(error)) return;
          setError('Не удалось загрузить список камер. Ошибка сети или сервера.');
      } finally {
          setLoading(false);
      }
  }, []);
  useEffect(() => {
      fetchCameras();
      return () => controllerRef.current?.abort();
  }, [fetchCameras]);
  useEffect(() => {
    const authToken = localStorage.getItem("token");
    if (!authToken) return;
    const es = new EventSource(`/api/cameras/sse/?token=${authToken}`);
    es.onmessage = (e) => {
      const updates = JSON.parse(e.data);
      setCameras(prev => prev.map(cam => {
        const update = updates.find(u => u.camera_id === cam.id);
        if (!update) return cam;
        return {
          ...cam,
          last_count: update.count,
          zones: cam.zones.map(zone => {
            const updatedZone = update.zones.find(z => z.zone_id === zone.id);
            return updatedZone ? { ...zone, last_count: updatedZone.count } : zone;
          })
        };
      }));
    };
    es.onerror = (e) => {
        console.error('SSE ошибка:', e);
        es.close();
    };
    return () => es.close();
  }, []);
  const handleDelete = async (id) => {
    try {
        await AxiosAPI.delete(`/api/cameras/${id}/`);
        setCameras(prev => prev.filter(c => c.id !== id));
    } catch (error) {
        console.error("Ошибка при удалении камеры:", error);
    }
    setDeleteId(null);
  };
  const update = (id, patch) => {
    setCameras(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }
  const getTimeHint = (from, to) => {
    if (from === to) return "Круглосуточный";
    const [fh, fm] = from.split(":").map(Number);
    const [th, tm] = to.split(":").map(Number);
    const fromMins = fh * 60 + fm;
    const toMins   = th * 60 + tm;
    if (toMins < fromMins) return `С ${from} до ${to} след. дня`;
    return `С ${from} до ${to}`;
  }
  const addButton = (<button className="btn-primary" onClick={() => navigate("/cameras/add")}>Добавить камеру</button>);
  if (loading && cameras.length === 0) {
    return (
      <ContainerPageCamera>
        <div className="empty-list">
          <div className="second-text text-title">Загрузка камер...</div>
        </div>
      </ContainerPageCamera>
    );
  };
  if (error && cameras.length === 0) {
    return (
      <ContainerPageCamera>
        <div className="empty-list">
          <div className="second-text text-title">{error}</div>
          <button className="btn-primary" onClick={fetchCameras}>Повторить загрузку</button>
        </div>
      </ContainerPageCamera>
    );
  };
  if (cameras.length === 0) {
    return (
      <ContainerPageCamera>
        <div className="empty-list">
          <div className="second-text text-title">Список камер пуст</div>
          <button className="btn-primary" onClick={() => navigate("/cameras/add")}>Добавить камеру</button>
        </div>
      </ContainerPageCamera>
    );
  };
  return (
    <ContainerPageCamera action={addButton}>
      <div className="cam-grid">
        {cameras.map(cam => (
          <div key={cam.id} className="card flex-col-10">
            <div className="cam-card-flex">
              <div className="cam-card-name">{cam.name}</div>
              <div className="cam-status">
                <div className={`pulse ${cam.active ? "pulse-green" : "pulse-gray"}`}/>  
                <div className="second-text">{cam.active ? "Online" : "Offline"}</div>
              </div>
            </div>
            <div className="flex-row-10">
                <div className="second-text">URL:</div>
                <div className="second-text cam-url">{cam.url.trim()}</div>
            </div>
            <CameraView key={cam.id} cam={cam}/>
            <div className="second-text">
              {getTimeHint(cam.from_time, cam.to_time)} анализ — {SCHEDULE_OPTIONS.find(
                o => o.value === cam.schedule)?.label ?? "каждые " + cam.schedule + " мин."}
            </div>
            <div className="cam-card-flex">
              {cam.zones.length > 0 ? (<span className="left cam-card-name">Зоны детекции:</span>) : (<span className="left cam-card-name">Зоны не настроены!</span>)}
              <div className="right-group">
                <span className="cam-card-name">Всего в кадре: </span>
                <span className="cam-card-name">{cam.active ? cam.last_count : "-"} чел.</span>
              </div>
            </div>
            <div>
              {cam.zones.map((z, i) => {
                const color = zoneColors[i % zoneColors.length];
                return (
                  <div key={i} className="cam-card-flex">
                    <span className="second-text" style={{ color }}>{z.name}</span>
                    <span className="second-text" style={{ color }}>{cam.active ? z.last_count : "-"} чел.</span>
                  </div>
                );
              })}
            </div> 
            <div className="cam-card-flex-buttons">
              <button className="btn btn-gray" onClick={() => navigate(`/cameras/${cam.id}/edit/`)}>Редактировать</button>
              <button className="btn btn-delete" onClick={() => { setDeleteId(cam.id); setDeleteName(cam.name); }}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
      {deleteId && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className="modal delete-modal">
            <div className="text-title">Удалить камеру?</div>
            <div className="second-text">Камера <b>«{deleteName}»</b> будет удалена вместе со всеми привязанными зонами. Это действие нельзя отменить.</div>
            <div className="cam-card-flex-buttons">
              <button className="btn btn-gray" onClick={() => setDeleteId(null)}>Отмена</button>
              <button className="btn btn-delete" onClick={() => handleDelete(deleteId)}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </ContainerPageCamera>
  );
}
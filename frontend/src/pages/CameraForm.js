import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {CameraSnapshot} from '../components/CameraSnapshot';
import {CameraZones} from '../components/CameraZones';
import {SvgCanvas} from '../components/SvgCanvas';
import AxiosAPI from '../components/AxiosAPI'
import axios from 'axios';
const zoneColors = ["#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];
const SCHEDULE_OPTIONS = [
  { value: 1,  label: "каждую минуту" },
  { value: 5,  label: "каждые 5 мин." },
  { value: 10, label: "каждые 10 мин." },
  { value: 15, label: "каждые 15 мин." },
  { value: 30, label: "каждые 30 мин." },
  { value: 60, label: "каждый час" },
];
const maxZones = zoneColors.length;
export const CameraForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isEdit, setIsEdit] = useState(!!id);
  const frameWasLoadRef = useRef(false);
  const zonesLengthRef = useRef(0);
  const isUserUrlChange = useRef(false);
  const [nameCam, setNameCam] = useState("");
  const [scheduleCam, setScheduleCam] = useState(5);
  const [timeFromCam, setTimeFromCam] = useState("10:00");
  const [timeToCam,   setTimeToCam] = useState("20:00");
  const [urlInput, setUrlInput] = useState("");
  const [urlCam, setUrlCam] = useState(null);
  const [frameUrl, setFrameUrl] = useState(null);
  const [frameLoad, setFrameLoad] = useState(false);
  const [frameWasLoad, setFrameWasLoad] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [zones, setZones] = useState([]);
  const [activeZoneIdx, setActiveZoneIdx] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loading, setLoading] = useState(false);
  const canSave = nameCam.trim() && frameWasLoad;
  const isZoneNameDuplicate = newZoneName.trim() && zones.some(z => z.name.trim().toLowerCase() === newZoneName.trim().toLowerCase());
  
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const controller = new AbortController();
    const fetchCamera = async () => {
      try {
        const response = await AxiosAPI.get(`/api/cameras/${id}/`, { signal: controller.signal });
        const cam = response.data;
        setNameCam(cam.name);
        setUrlInput(cam.url);
        setUrlCam(cam.url);
        setScheduleCam(cam.schedule);
        setTimeFromCam(cam.from_time);
        setTimeToCam(cam.to_time);
        setZones(cam.zones);
        setFrameWasLoad(true);
        frameWasLoadRef.current = true;
        setFrameUrl(`/cameras/${id}/snapshot/?t=${Date.now()}`);
      } catch (error) {
        if (axios.isCancel(error)) return;
        setStatusMsg({ type: "error", text: "Не удалось загрузить данные камеры. Для создания новой заполните форму." });
        setIsEdit(false);
      }
      finally {
        setLoading(false);
      }
    };
    fetchCamera();
    return () => controller.abort();
  }, [id]);
  useEffect(() => {
    if (!isUserUrlChange.current) return;
    frameWasLoadRef.current = false;
    setFrameWasLoad(false);
    setZones([]);
    setNewZoneName("");
    setActiveZoneIdx(null);
    setStatusMsg(null);
  }, [urlCam]);
  useEffect(() => {
    zonesLengthRef.current = zones.length;
  }, [zones.length]);
  const urlParseFunc = (rawUrl) => {
    try {
      const fullUrl = new URL(rawUrl);
      const cleanUrl = `${fullUrl.protocol}//${fullUrl.host}${fullUrl.pathname}`;
      const login = fullUrl.username || "";
      const password = fullUrl.password || "";
      return { cleanUrl, login, password };
    } catch {
      return { cleanUrl: rawUrl, login: "", password: "" };
    }
  }
  const getFrame = () => {
    const urlStr = urlInput.trim();
    if (!urlStr) return;
    const parsedUrl = urlParseFunc(urlStr);
    setFrameLoad(false);
    setUrlCam(parsedUrl.cleanUrl);
    if (isEdit && !isUserUrlChange.current) {
      setFrameUrl(`/cameras/${id}/snapshot/?t=${Date.now()}`);
    } else {
      setFrameUrl(`/cameras/snapshot/?url=${encodeURIComponent(urlStr)}&t=${Date.now()}`);
    }
  }
  const successLoad = useCallback(() => {
    if (!frameWasLoadRef.current) {
      frameWasLoadRef.current = true;
      setFrameWasLoad(true);
      if (zonesLengthRef.current >= maxZones)
        setStatusMsg({ type: "info", text: "Кадр загружен." });
      else
        setStatusMsg({ type: "info", text: "Кадр загружен. Для выделения зоны введите название и нажмите 'Выделить'." });
    } else {
      setStatusMsg({ type: "info", text: "Кадр обновлен." });
    }
    setFrameLoad(true);
  }, []); 
  const errorLoad = useCallback(() => {
    setStatusMsg({ type: "error", text: "Камера не отвечает. Проверьте URL и доступность устройства." });
  }, []);
  const saveCamera = async () => {
    if (!canSave || loadingSave) return;
    const urlStr = urlInput.trim();
    const parsedUrl = urlParseFunc(urlStr);
    setStatusMsg({ type: "info", text: "Сохранение данных..." });
    setLoadingSave(true);
    const cameraData = {
      name: nameCam,
      url: parsedUrl.cleanUrl,
      schedule: scheduleCam,
      from_time: timeFromCam,
      to_time: timeToCam,
      zones: zones.map(zone => ({
        ...(zone.id && { id: zone.id }),
        name: zone.name,
        points: zone.points
      })),
      ...(parsedUrl.login && parsedUrl.password && { auth: { login: parsedUrl.login, password: parsedUrl.password } })
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const request = isEdit
        ? AxiosAPI.patch(`/api/cameras/${id}/`, cameraData, { signal: controller.signal })
        : AxiosAPI.post(`/api/cameras/`, cameraData, { signal: controller.signal });
      await request;
      navigate("/cameras");
    } catch (error) {
      const isTimeout = axios.isCancel(error);
      setStatusMsg({ type: "error", text: isTimeout
        ? "Сервер не ответил за 10 секунд. Попробуйте ещё раз."
        : "Не удалось сохранить данные. Ошибка сети или сервера."
      });
    } finally {
      clearTimeout(timer);
      setLoadingSave(false);
    }
  }
  const handleUrlChange = (e) => {
    setUrlInput(e.target.value);
    setUrlCam(null);
    isUserUrlChange.current = true;
  }
  const endZone = (points) => {
    const remaining = maxZones - (zones.length + 1);
    setZones(prev => [...prev, { name: newZoneName, points }]);
    setStatusMsg({ type: "info", text: remaining > 0
      ? `Зона '${newZoneName}' создана. Можно выделить ещё ${remaining}.`
      : `Зона '${newZoneName}' создана. Достигнуто максимальное количество зон.`
    });
    setNewZoneName("");
    setActiveZoneIdx(null);
  }
  const cleanZone = () => {
    setActiveZoneIdx(null);
    setStatusMsg({ type: "info", text: `Выделение зоны '${newZoneName}' отменено.` });
  }
  const removeZone = (idx) => {
    const zoneName = zones[idx].name;
    setZones(prev => prev.filter((_, i) => i !== idx));
    setStatusMsg({ type: "info", text: `Зона '${zoneName}' удалена.` });
  }
  const startZone = () => {
    if (isZoneNameDuplicate) {
      setStatusMsg({ type: "error", text: `Зона '${newZoneName}' уже существует. Введите другое название.` });
      return;
    }
    setActiveZoneIdx(zones.length);
    setStatusMsg({ type: "info", text: `Нарисуйте многоугольник. ПКМ - добавить/удалить вершину, сомкнуть фигуру.` });
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
  if (loading){
    return (
      <div className="content">
        <div className="header">
          <div className="text-title">Добавление камеры</div>
          <button className="btn-primary" disabled={!canSave} onClick={saveCamera}>Сохранить</button>
        </div>
        <div className="empty-list">
          <div className="second-text text-title">Загрузка...</div>
        </div>
      </div>
    )
  }
  return (
    <div className="content">
      {loadingSave && (<div className="await-save"></div>)}
      <div className="header">
        <div className="text-title">Добавление камеры</div>
        <button className="btn-primary" disabled={!canSave} onClick={saveCamera}>Сохранить</button>
      </div>
      <div className='cam-grid-column'>
        <div className='left-column'>
          <div className="card flex-col-10">
            <div className="cam-card-flex">
              <div className='widget-title'>Настройки камеры</div>
              {statusMsg && (<div className='second-text' 
                style={{ color: statusMsg?.type === 'error' ? '#ef4444' : '' }}>{statusMsg.text}</div>)}
            </div>
            <div className="form-field">
              <div className="second-text">URL видеопотока:</div>
              <div className="url-row">
                <input className="form-input" placeholder="Например: http://login:password@IPv4:port/SnapshotJPEG" 
                  disabled={activeZoneIdx != null} value={urlInput} onChange={handleUrlChange}/>
                <button className="btn-primary" disabled={!urlInput.trim() || activeZoneIdx != null} 
                  onClick={getFrame}>Получить кадр</button>
              </div>
            </div>
            <div className="cam-snapshot">
              <CameraSnapshot cam={ {active: !!urlCam, url: frameUrl} } 
                onError={errorLoad} onLoad={successLoad} msg="URL не указан"/>
                {frameLoad &&
                  (activeZoneIdx === null ? <CameraZones zones={zones} /> 
                  : <SvgCanvas activeZoneIdx={activeZoneIdx} newZoneComplete={endZone} 
                    msgStatusFrame={(msg) => setStatusMsg(msg)}/>)}
            </div>
          </div>
        </div>
        <div className='right-column'>
          <div className="card flex-col-10">
            <div className="widget-title">Настройки видеоанализа</div>
            <div className="form-field">
              <div className="second-text">Название камеры</div>
              <input className="form-input" placeholder="Введите название камеры" value={nameCam} onChange={e => setNameCam(e.target.value)} />
            </div>
            <div className="form-field">
              <div className="second-text">Период анализа</div>
              <select className="form-select" value={scheduleCam} onChange={e => setScheduleCam(Number(e.target.value))}>
                {SCHEDULE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <div className="second-text">Время анализа по МСК</div>
              <div className="flex-row-10">
                <input type="time" className="form-input" value={timeFromCam} onChange={e => setTimeFromCam(e.target.value)} />
                <span className="second-text">—</span>
                <input type="time" className="form-input" value={timeToCam} onChange={e => setTimeToCam(e.target.value)} />
              </div>
              <div className="second-text text-center">{getTimeHint(timeFromCam, timeToCam)}</div>
            </div>
            {frameWasLoad && zones.length < maxZones && (
            <>
                <div className="form-field">
                  <div className="second-text">Название новой зоны</div>
                  <input className="form-input" placeholder="Введите название зоны" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} disabled={activeZoneIdx != null}/>
                </div>
                <div className="flex-row-10">
                  <button className="btn btn-primary" disabled={!newZoneName.trim() || activeZoneIdx != null} onClick={startZone}>Выделить</button>
                  <button className="btn btn-delete" disabled={activeZoneIdx === null} onClick={cleanZone}>Очистить</button>
                </div>
              </>
            )}
            {zones.length > 0 && (
              <>
                <span className="second-text">Зоны детекции:</span>
                {zones.map((zone, i) => (
                  <div key={i} className="cam-card-flex">
                    <span style={{ color: zoneColors[i % zoneColors.length] }} className="widget-title">{zone.name}</span>
                    <button className="btn-icon" onClick={() => removeZone(i)}>Удалить</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
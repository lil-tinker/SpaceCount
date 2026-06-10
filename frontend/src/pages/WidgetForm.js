import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { WidgetZone } from '../components/WidgetZone';
import { Histogram } from '../components/Histogram';
import AxiosAPI from '../components/AxiosAPI'
import axios from 'axios';
const ContainerPageWidgetForm = ({ children, onSubmit, canCreate, saveError }) => (
  <div className="content">
    <div className="header">
      <div className="text-title">Создание виджета</div>
      {saveError && <div className="error-text">{saveError}</div>}
      <button className="btn-primary" disabled={!canCreate} onClick={onSubmit}>Создать</button>
    </div>
    {children}
  </div>
);
const WIDGET_TYPES = [
  { value: "current", label: "Счётчик посетителей" },
//   { value: "histogram", label: "Гистограмма занятости" },
];
// const SCHEDULE_OPTIONS = [
//   { value: "6h",  label: "6 часов" },
//   { value: "1d",  label: "1 день" },
//   { value: "7d",  label: "7 дней" },
//   { value: "30d", label: "30 дней" },
// ];
export const WidgetForm = () => {
    const navigate = useNavigate();
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSave, setLoadingSave] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [widgetType, setWidgetType] = useState("current");
    const [schedule, setSchedule] = useState("1d");
    const [name, setName] = useState("");
    const [selected, setSelected] = useState({});
    const [capacities, setCapacities] = useState({});
    const controllerRef = useRef(null);
    const fetchCameras = useCallback(async () => {
        if (controllerRef.current) controllerRef.current.abort();
        controllerRef.current = new AbortController();
        setLoading(true);
        setLoadError(null);
        try {
            const response = await AxiosAPI.get('/api/cameras/names/', { signal: controllerRef.current.signal });
            setCameras(response.data);
        } catch (error) {
            if (axios.isCancel(error)) return;
            setLoadError('Не удалось загрузить список камер. Ошибка сети или сервера.');
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchCameras();
        return () => controllerRef.current?.abort();
    }, [fetchCameras]);
    const isCamSelected = (camId) => !!selected[`camera-${camId}`];
    const isZoneSelected = (zoneId) => !!selected[`zone-${zoneId}`];
    const camHasZoneSelected = (cam) => cam.zones.some(z => isZoneSelected(z.id));
    const toggleCamera = (cam) => {
        if (camHasZoneSelected(cam)) return;
        const k = `camera-${cam.id}`;
        setSelected(prev => {
            const next = { ...prev };
            if (next[k]) delete next[k];
            else next[k] = true;
            return next;
        });
        setCapacities(prev => {
            const next = { ...prev };
            if (next[k]) delete next[k];
            else next[k] = 50;
            return next;
        });
    };
    const toggleZone = (cam, zone) => {
        if (isCamSelected(cam.id)) return;
        const k = `zone-${zone.id}`;
        setSelected(prev => {
            const next = { ...prev };
            if (next[k]) delete next[k];
            else next[k] = true;
            return next;
        });
        setCapacities(prev => {
            const next = { ...prev };
            if (next[k]) delete next[k];
            else next[k] = 10;
            return next;
        });
    };
    const setCapacity = (key, value) => {
        setCapacities(prev => ({ ...prev, [key]: value }));
    };
    const canCreate = name.trim().length > 0 && Object.keys(selected).length > 0 && !loadingSave;
    const saveWidget = async () => {
        if (!canCreate || loadingSave) return;
        setLoadingSave(true);
        setLoadError(null);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const widgetData = {
            name,
            widget_type: widgetType,
            // ...(widgetType === "histogram" && { histogram_config: { schedule } }),
            cameras: Object.keys(selected)
                .filter(k => k.startsWith("camera-"))
                .map(k => ({ camera_id: Number(k.split("-")[1]), capacity: capacities[k] })),
            zones: Object.keys(selected)
                .filter(k => k.startsWith("zone-"))
                .map(k => ({ zone_id: Number(k.split("-")[1]), capacity: capacities[k] })),
        };
        try {
            await AxiosAPI.post(`/api/widgets/`, widgetData, { signal: controller.signal });
            navigate("/widgets");
        } catch (error) {
            const isTimeout = axios.isCancel(error);
            setSaveError(isTimeout
                ? "Сервер не ответил за 10 секунд. Попробуйте ещё раз."
                : "Не удалось сохранить данные. Ошибка сети или сервера."
            );        
        } finally {
            clearTimeout(timer);
            setLoadingSave(false);
        }
    };
    if (loading || loadingSave) {
        return (
            <ContainerPageWidgetForm canCreate={false}>
                <div className="empty-list">
                    <div className="second-text text-title">{loading ? "Загрузка..." : "Сохранение..."}</div>
                </div>
            </ContainerPageWidgetForm>
        );
    }
    if (loadError) {
        return (
            <ContainerPageWidgetForm canCreate={false}>
                <div className="empty-list">
                    <div className="second-text text-title">{loadError}</div>
                    <button className="btn-primary" onClick={fetchCameras}>Повторить загрузку</button>
                </div>
            </ContainerPageWidgetForm>
        );
    }
    if (cameras.length === 0) {
        return (
            <ContainerPageWidgetForm canCreate={false}>
                <div className="empty-list">
                    <div className="second-text text-title">Список камер пуст</div>
                    <button className="btn-primary" onClick={() => navigate("/cameras/add")}>Добавить камеру</button>
                </div>
            </ContainerPageWidgetForm>
        );
    }
    return (
        <ContainerPageWidgetForm onSubmit={saveWidget} canCreate={canCreate} saveError={saveError}>
            <div className="card flex-row-20 margin-bottom-20">
                <div className="form-field column-text">
                    <div className="second-text">Название виджета</div>
                    <input className="form-input" placeholder="Введите название виджета"
                        value={name} onChange={e => setName(e.target.value)}/>
                </div>
                <div className="column-text">
                    <div className="flex-row-20">
                        <div className="form-field column-text">
                            <div className="second-text">Тип виджета</div>
                            <select className="form-select" value={widgetType} onChange={e => setWidgetType(e.target.value)}>
                                {WIDGET_TYPES.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                        </div>
                        {/* {widgetType === "histogram" && (
                            <div className="form-field column-text">
                                <div className="second-text">Период</div>
                                <select className="form-select" value={schedule} onChange={e => setSchedule(e.target.value)}>
                                    {SCHEDULE_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                </select>
                            </div>
                        )} */}
                    </div>
                </div>
            </div>
            <div className='widget-column-form'>
                <div className='right-column card'>
                    <div className='flex-col-10'>
                        <div className='cam-card-flex'>
                            <div className='second-text'>Камеры и зоны</div>
                            {Object.keys(selected).length > 0 && <div className='second-text'>Вместимость</div>}
                        </div>
                        {cameras.map(cam => {
                            const camSel = isCamSelected(cam.id);
                            const camDisabled = camHasZoneSelected(cam);
                            return (
                                <div key={cam.id}>
                                    <div className='cam-card-flex'>
                                        <label className='flex-row-10 box-button' style={{ opacity: camDisabled ? 0.4 : 1, cursor: camDisabled ? 'not-allowed' : 'pointer' }}> 
                                            <input type="checkbox" className='checkbox-button' checked={camSel} 
                                                disabled={camDisabled} onChange={() => toggleCamera(cam)}/>
                                            <span className='second-text role-text'>
                                                {cam.name}
                                            </span>
                                        </label>
                                        {camSel && (
                                            <input min={1} max={100} className="form-input-micro"
                                                value={capacities[`camera-${cam.id}`] ?? 50}
                                                onChange={e => {
                                                    const v = Math.min(100, Math.max(1, Number(e.target.value)));
                                                    setCapacity(`camera-${cam.id}`, v);
                                                }}/>
                                        )}
                                    </div>
                                    {cam.zones.map(zone => {
                                        const zoneSel = isZoneSelected(zone.id);
                                        const zoneDisabled = camSel;
                                        return (
                                            <div key={zone.id} className='cam-card-flex'>
                                                <label className='flex-row-10 box-button-zone'
                                                    style={{ opacity: zoneDisabled ? 0.4 : 1, cursor: zoneDisabled ? 'not-allowed' : 'pointer' }}>
                                                    <input type="checkbox" checked={zoneSel}
                                                        disabled={zoneDisabled}
                                                        onChange={() => toggleZone(cam, zone)}/>
                                                    <span className='second-text role-text'>
                                                        {zone.name}
                                                    </span>
                                                </label>
                                                {zoneSel && (
                                                    <input className="form-input-micro"
                                                        value={capacities[`zone-${zone.id}`] ?? 10}
                                                        onChange={e => {
                                                            const v = Math.min(100, Math.max(1, Number(e.target.value)));
                                                            setCapacity(`zone-${zone.id}`, v);
                                                        }}/>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
                {Object.keys(selected).length > 0 &&
                <div className='left-column card'>
                    <div className='second-text'>Предпросмотр</div>
                    {Object.keys(selected).length > 0 ? (
                        <WidgetZone
                            name={name}
                            cameras={Object.keys(selected)
                                .filter(k => k.startsWith("camera-"))
                                .map(k => {
                                const id = Number(k.split("-")[1]);
                                const capacity = capacities[k] ?? 50;
                                return {
                                    camera_id: id,
                                    name: cameras.find(c => c.id === id)?.name,
                                    count: Math.floor(Math.random() * capacity),
                                    capacity,
                                    trend: (() => { const d = Math.floor(Math.random() * 10) - 3; return d >= 0 ? `+${d}` : `${d}`; })(),
                                };
                                })}
                            zones={Object.keys(selected)
                                .filter(k => k.startsWith("zone-"))
                                .map(k => {
                                const id = Number(k.split("-")[1]);
                                const capacity = capacities[k] ?? 10;
                                const cam = cameras.find(c => c.zones.some(z => z.id === id));
                                const zone = cam?.zones.find(z => z.id === id);
                                return {
                                    zone_id: id,
                                    name: `${cam?.name} - ${zone?.name}`,
                                    count: Math.floor(Math.random() * capacity),
                                    capacity,
                                    trend: (() => { const d = Math.floor(Math.random() * 10) - 3; return d >= 0 ? `+${d}` : `${d}`; })(),
                                };
                                })}
                            />
                    ) : (
                        <div className='empty-list'>
                            <div className='text-title second-text'>Выберите камеру или зону</div>
                        </div>
                    )}
                </div>
                }
            </div>
        </ContainerPageWidgetForm>
    );
};
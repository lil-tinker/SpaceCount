import { useState, useEffect, useRef, useCallback } from 'react';
import { Histogram } from '../components/Histogram';
import { WidgetZone } from '../components/WidgetZone';
import { useNavigate } from "react-router-dom";
import AxiosAPI from '../components/AxiosAPI'
import axios from 'axios';
const ContainerPageWidgets = ({ children, action }) => (
  <div className="content">
    <div className="header">
      <div className='text-title'>Список виджетов</div>
      {action}
    </div>
    {children}
  </div>
);
const WidgetCard = ({ widget, onDelete, onCopy }) => {
  const widgetUrl = `${window.location.origin}/widget/${widget.token}/`;
  return (
    <div className="card right-column">
      <WidgetZone name={widget.name} cameras={widget.cameras} zones={widget.zones}/>
      <div className="widget-card-flex-buttons">
        <button className="btn btn-gray" onClick={() => onCopy(widgetUrl)}>Копировать URL</button>
        <button className="btn btn-delete" onClick={() => onDelete(widget.id, widget.name)}>Удалить</button>
      </div>
    </div>
  );
};
const DeleteModal = ({ name, onConfirm, onCancel, loading }) => (
  <div className="modal-overlay">
    <div className="modal">
      <div className="text-title">Удалить виджет?</div>
      <div className="second-text">Виджет «{name}» будет удалён. Это действие нельзя отменить.</div>
      <div className="flex-row-10">
        <button className="btn btn-gray" onClick={onCancel} disabled={loading}>Отмена</button>
        <button className="btn btn-delete" onClick={onConfirm} disabled={loading}>
          {loading ? "Удаление..." : "Удалить"}
        </button>
      </div>
    </div>
  </div>
);
export const Widgets = () => {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const controllerRef = useRef(null);
  const addButton = (<button className="btn-primary" onClick={() => navigate("/widgets/add")}>Создать виджет</button>);
  const fetchWidgets = useCallback(async () => {
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();
    setLoading(true);
    setLoadError(null);
    try {
      const response = await AxiosAPI.get('/api/widgets/', { signal: controllerRef.current.signal });
      console.log(response.data);
      setWidgets(response.data);
    } catch (error) {
      if (axios.isCancel(error)) return;
      setLoadError('Не удалось загрузить список виджетов. Ошибка сети или сервера.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchWidgets();
    return () => controllerRef.current?.abort();
  }, [fetchWidgets]);
  const handleDelete = (id, name) => {
    setDeleteId(id);
    setDeleteName(name);
  };
  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await AxiosAPI.delete(`/api/widgets/${deleteId}/`);
      setWidgets(prev => prev.filter(w => w.id !== deleteId));
      setDeleteId(null);
    } catch {
      setDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  };
  const handleCopy = (url) => { navigator.clipboard.writeText(`${url}`);};
  useEffect(() => {
    const authToken = localStorage.getItem("token");
    const es = new EventSource(`/api/widgets/sse/?token=${authToken}`);
    es.onmessage = (e) => {
      const updates = JSON.parse(e.data);
      setWidgets(prev => prev.map(widget => {
        const update = updates.find(u => u.widget_id === widget.id);
        if (!update) return widget;
        return {
          ...widget,
          cameras: widget.cameras.map(cam => {
            const camUpdate = update.cameras.find(u => u.camera_id === cam.camera_id);
            if (!camUpdate) return cam;
            return { ...cam, count: camUpdate.count, trend: camUpdate.trend };
          }),
          zones: widget.zones.map(zone => {
            const zoneUpdate = update.zones.find(u => u.zone_id === zone.zone_id);
            if (!zoneUpdate) return zone;
            return { ...zone, count: zoneUpdate.count, trend: zoneUpdate.trend };
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
  if (loading && widgets.length === 0) {
    return (
      <ContainerPageWidgets>
        <div className="empty-list">
          <div className="second-text text-title">Загрузка виджетов...</div>
        </div>
      </ContainerPageWidgets>
    );
  }
  if (loadError && widgets.length === 0) {
    return (
      <ContainerPageWidgets>
        <div className="empty-list">
          <div className="second-text text-title">{loadError}</div>
          <button className="btn-primary" onClick={fetchWidgets}>Повторить загрузку</button>
        </div>
      </ContainerPageWidgets>
    );
  }
  if (widgets.length === 0) {
    return (
      <ContainerPageWidgets>
        <div className="empty-list">
          <div className="second-text text-title">Список виджетов пуст</div>
          {addButton}
        </div>
      </ContainerPageWidgets>
    );
  }
  return (
    <ContainerPageWidgets action={addButton}>
      <div className="widget-column">
        {widgets.map(widget => (
          <WidgetCard key={widget.id} widget={widget} onDelete={handleDelete} onCopy={handleCopy}/>
        ))}
      </div>
      {deleteId && (
        <DeleteModal name={deleteName} onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} loading={deleteLoading}/>
      )}
    </ContainerPageWidgets>
  );
};
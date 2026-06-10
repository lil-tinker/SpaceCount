import AxiosAPI from '../components/AxiosAPI'
import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { WidgetZone } from '../components/WidgetZone';
import axios from 'axios';
export const WidgetIfream = () => {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const controllerRef = useRef(null);
    const fetchData = useCallback(async () => {
        if (controllerRef.current) controllerRef.current.abort();
            controllerRef.current = new AbortController();
            setLoading(true);
            setError(null);
        try {
        const response = await AxiosAPI.get(`/api/widget/${token}/`, { signal: controllerRef.current.signal });
            console.log(response.data);
            setData(response.data);
        } catch (error) {
            if (axios.isCancel(error) || error.name === 'CanceledError') return;
            setError('Не удалось загрузить данные. Ошибка сети или сервера.');
        }
        finally {
            setLoading(false);
        }
    }, [token]);
    useEffect(() => {
        fetchData();
        return () => controllerRef.current?.abort();
    }, [fetchData]);
    useEffect(() => {
        if (!token) return;
        const es = new EventSource(`/api/widget/${token}/sse/`);
        es.onmessage = (e) => {
            const updates = JSON.parse(e.data);
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    cameras: prev.cameras.map(cam => {
                        const update = updates.cameras.find(u => u.camera_id === cam.camera_id);
                        if (!update) return cam;
                        return { ...cam, count: update.count, trend: update.trend };
                    }),
                    zones: prev.zones.map(zone => {
                        const update = updates.zones.find(z => z.zone_id === zone.zone_id);
                        if (!update) return zone;
                        return { ...zone, count: update.count, trend: update.trend };
                    })
                };
            });
        };
        es.onerror = (e) => {
            console.error('SSE ошибка:', e);
            es.close();
        };
        return () => es.close();
    }, [token]);
    if (loading) return <div className='error-widget text-title second-text'>Загрузка...</div>;
    if (error) return (<div className='error-widget text-title second-text'>Виджет недоступен</div>)
    if (!data) return null;
    return <WidgetZone {...data} />
};
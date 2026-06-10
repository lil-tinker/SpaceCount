import { useState, useEffect, useRef } from "react";
export const CameraSnapshot = ({cam, onError, onLoad, msg = "Анализ выключен", timeoutMs = 20000}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef(null);
  const onErrorRef = useRef(onError);
  const onLoadRef = useRef(onLoad);  
  useEffect(() => {
      onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
    if (cam.active && cam.url) {
      timerRef.current = setTimeout(() => {
        setImgError(true);
        onErrorRef.current?.();
      }, timeoutMs);
    }
    return () => clearTimeout(timerRef.current);
  }, [cam.url, cam.active]);
  const handleLoad = () => {
    clearTimeout(timerRef.current);
    setImgLoaded(true);
    onLoadRef.current?.();
  };
  const handleError = () => {
    clearTimeout(timerRef.current);
    setImgLoaded(false);
    setImgError(true);
    onErrorRef.current?.();
  };
  if (!cam.active || imgError || !cam.url) {
    const text = imgError ? "Нет сигнала от камеры" : msg;
    return <div className="text-title second-text">{text}</div>;
  };
  return (
    <div>
      {!imgLoaded && <span className="text-title second-text">Загрузка...</span>}
      <img alt="" src={cam.url.trim()} className="cam-area cam-area-img"
        style={{ display: imgLoaded ? "block" : "none" }}
        onLoad={handleLoad} onError={handleError} />
    </div>
  );
};
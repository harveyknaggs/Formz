import { useRef, useEffect, useState, useCallback } from 'react';

export default function SignaturePad({ label, value, onChange, required }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [timestamp, setTimestamp] = useState(value?.timestamp || null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Restore existing signature
    if (value?.dataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value.dataUrl;
      setHasDrawn(true);
    }
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    if (!timestamp) {
      const ts = new Date().toISOString();
      setTimestamp(ts);
    }
  }, [getPos, timestamp]);

  const draw = useCallback((e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  }, [drawing, getPos]);

  const endDraw = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onChange({ dataUrl, timestamp: timestamp || new Date().toISOString() });
  }, [drawing, onChange, timestamp]);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setTimestamp(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label mb-0">{label} {required && <span className="text-red-500">*</span>}</label>
        {hasDrawn && (
          <button type="button" onClick={clear} className="text-xs text-red-500 hover:underline">Clear</button>
        )}
      </div>
      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="signature-pad w-full h-32"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      {timestamp && (
        <p className="text-xs text-slate-400">Signed: {new Date(timestamp).toLocaleString('en-NZ')}</p>
      )}
    </div>
  );
}

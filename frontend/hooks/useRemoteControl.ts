import { useEffect, RefObject, useState } from 'react';
import { Socket } from 'socket.io-client';

export const useRemoteControlViewer = (socket: Socket | null, videoRef: RefObject<HTMLVideoElement>, hasControl: boolean) => {
  useEffect(() => {
    if (!socket || !videoRef.current || !hasControl) return;

    const video = videoRef.current;

    const sendMouseEvent = (e: MouseEvent, type: string) => {
      const rect = video.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      socket.emit('remote-control', { type, x, y, button: e.button });
    };

    const sendKeyEvent = (e: KeyboardEvent) => {
      socket.emit('remote-control', { 
        type: 'keydown', 
        key: e.key, 
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey
      });
    };

    const handleMouseMove = (e: MouseEvent) => sendMouseEvent(e, 'mousemove');
    const handleClick = (e: MouseEvent) => sendMouseEvent(e, 'click');
    const handleDblClick = (e: MouseEvent) => sendMouseEvent(e, 'dblclick');
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); sendMouseEvent(e, 'rightclick'); };
    const handleWheel = (e: WheelEvent) => {
        socket.emit('remote-control', { type: 'wheel', deltaY: e.deltaY, deltaX: e.deltaX });
    };

    video.addEventListener('mousemove', handleMouseMove);
    video.addEventListener('click', handleClick);
    video.addEventListener('dblclick', handleDblClick);
    video.addEventListener('contextmenu', handleContextMenu);
    video.addEventListener('wheel', handleWheel);
    window.addEventListener('keydown', sendKeyEvent);

    return () => {
      video.removeEventListener('mousemove', handleMouseMove);
      video.removeEventListener('click', handleClick);
      video.removeEventListener('dblclick', handleDblClick);
      video.removeEventListener('contextmenu', handleContextMenu);
      video.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', sendKeyEvent);
    };
  }, [socket, videoRef, hasControl]);
};

export const useRemoteControlHost = (socket: Socket | null) => {
  const [remoteCursor, setRemoteCursor] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleRemoteControl = ({ type, x, y, key }: any) => {
      if (type === 'mousemove' && typeof x === 'number' && typeof y === 'number') {
        setRemoteCursor({ x, y });
      }
      
      const screenW = window.screen.width;
      const screenH = window.screen.height;
      const actualX = x * screenW;
      const actualY = y * screenH;
      
      if (type === 'click') {
        // Show a quick click animation at the remote cursor
        const clickMarker = document.createElement('div');
        clickMarker.className = 'absolute w-6 h-6 rounded-full border-2 border-red-500 animate-ping pointer-events-none z-50';
        clickMarker.style.left = `calc(${x * 100}% - 12px)`;
        clickMarker.style.top = `calc(${y * 100}% - 12px)`;
        document.getElementById('live-preview-container')?.appendChild(clickMarker);
        setTimeout(() => clickMarker.remove(), 1000);
      }
    };

    socket.on('remote-control', handleRemoteControl);

    return () => {
      socket.off('remote-control', handleRemoteControl);
    };
  }, [socket]);

  return { remoteCursor };
};

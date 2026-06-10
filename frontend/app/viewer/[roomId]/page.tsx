"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useRemoteControlViewer } from "@/hooks/useRemoteControl";
import { MousePointer2, LogOut, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ViewerPage() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();
  const { socket, joinSession, videoRef, isConnected } = useWebRTC(roomId, "viewer");
  
  const [hasControl, setHasControl] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [latency, setLatency] = useState(0);
  const [streamActive, setStreamActive] = useState(false);

  useRemoteControlViewer(socket, videoRef, hasControl);

  useEffect(() => {
    if (socket) {
      joinSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('control-approved', () => {
      setHasControl(true);
      setRequestPending(false);
      toast.success("Host approved your remote control request!");
    });

    socket.on('host-disconnected', () => {
      toast.error('Host ended the session.');
      router.push('/');
    });

    const interval = setInterval(() => {
      const start = Date.now();
      socket.emit('ping-measure', () => {
        setLatency(Date.now() - start);
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      socket.off('control-approved');
      socket.off('host-disconnected');
    };
  }, [socket, router]);

  useEffect(() => {
    if (socket) {
      if (!isConnected) toast.error("Signaling server disconnected! Trying to reconnect...", { id: 'conn' });
      else toast.success("Connected to signaling server", { id: 'conn' });
    }
  }, [isConnected, socket]);

  const requestControl = () => {
    if (!socket || hasControl) return;
    setRequestPending(true);
    socket.emit('control-request', roomId);
  };

  const leaveSession = () => {
    socket?.disconnect();
    router.push('/');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden relative">
      <header className="absolute top-0 left-0 w-full min-h-16 bg-gradient-to-b from-black/90 to-transparent flex flex-wrap items-center justify-between p-4 md:px-6 z-50 pointer-events-auto gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <h1 className="font-bold text-lg md:text-xl gradient-text">RemoteDesk</h1>
          <div className="hidden md:block h-6 w-px bg-gray-700"></div>
          <span className="text-gray-400 text-xs md:text-sm font-mono truncate max-w-[120px] md:max-w-full">Room: {roomId}</span>
          {latency > 0 && (
            <span className={`text-xs px-2 py-1 rounded bg-black/50 ${latency < 50 ? 'text-green-400' : latency < 150 ? 'text-yellow-400' : 'text-red-400'}`}>
              {latency}ms ping
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          {!hasControl ? (
            <button 
              onClick={requestControl}
              disabled={requestPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-colors ${
                requestPending 
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                  : 'bg-accent-purple hover:bg-accent-pink text-white shadow-[0_0_15px_rgba(124,77,255,0.4)]'
              }`}
            >
              <MousePointer2 size={16} />
              {requestPending ? 'Waiting for Approval...' : 'Request Control'}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-md font-bold border border-green-500/50">
              <CheckCircle2 size={16} />
              You have control
            </div>
          )}
          
          <button 
            onClick={leaveSession}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-red-500/20 hover:text-red-500 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Leave
          </button>
        </div>
      </header>
      
      <div className="flex-1 w-full h-full relative group bg-[#050505]">
        {!streamActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-gray-400">
            <Loader2 size={48} className="animate-spin mb-4 text-accent-purple" />
            <p className="font-bold text-lg animate-pulse">Waiting for host stream...</p>
          </div>
        )}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline
          muted
          onPlaying={() => setStreamActive(true)}
          className={`w-full h-full object-contain pointer-events-auto transition-opacity duration-500 ${streamActive ? 'opacity-100' : 'opacity-0'}`}
        />
        {!hasControl && streamActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/10 backdrop-blur-[1px]">
            <div className="bg-black/60 px-6 py-4 rounded-xl backdrop-blur-md flex flex-col items-center gap-2">
              <XCircle size={32} className="text-yellow-500" />
              <p className="font-bold text-lg">Viewing Only</p>
              <p className="text-gray-400 text-sm text-center">Request control to interact</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

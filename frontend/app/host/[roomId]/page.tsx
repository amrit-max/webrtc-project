"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useRemoteControlHost } from "@/hooks/useRemoteControl";
import { Copy, XSquare } from "lucide-react";
import toast from "react-hot-toast";

export default function HostPage() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();
  const { socket, startHosting, viewers, stream, isConnected } = useWebRTC(roomId, "host");
  const { remoteCursor } = useRemoteControlHost(socket);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);

  const shareInitiated = useRef(false);

  useEffect(() => {
    if (shareInitiated.current) return;
    shareInitiated.current = true;

    const initShare = async () => {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });

        if (videoRef.current) {
          videoRef.current.srcObject = displayStream;
        }

        displayStream.getVideoTracks()[0].onended = () => {
          stopSharing();
        };

        startHosting(displayStream);
      } catch (err) {
        console.error("Failed to share screen", err);
        router.push("/");
      }
    };
    initShare();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleControlRequest = ({ viewerId }: { viewerId: string }) => {
      const approve = window.confirm(`A viewer is requesting remote control. Approve?`);
      if (approve) {
        socket.emit('control-approved', { roomId, viewerId });
        toast.success("Control approved");
      }
    };
    
    const handleViewerJoined = () => toast.success("A viewer has joined the session");
    const handleViewerLeft = () => toast.error("A viewer disconnected");

    socket.on('control-request', handleControlRequest);
    socket.on('viewer-joined', handleViewerJoined);
    socket.on('viewer-disconnected', handleViewerLeft);

    return () => {
      socket.off('control-request', handleControlRequest);
      socket.off('viewer-joined', handleViewerJoined);
      socket.off('viewer-disconnected', handleViewerLeft);
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (socket) {
      if (!isConnected) toast.error("Signaling server disconnected! Attempting to reconnect...", { id: 'conn' });
      else toast.success("Connected to signaling server", { id: 'conn' });
    }
  }, [isConnected, socket]);

  const stopSharing = () => {
    stream?.getTracks().forEach((t) => t.stop());
    socket?.disconnect();
    router.push("/");
  };

  const copyLink = () => {
    const link = `${window.location.origin}/viewer/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-white overflow-hidden">
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0d0d1a]/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-xl gradient-text">RemoteDesk</h1>
          <div className="h-6 w-px bg-gray-700"></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Room ID:</span>
            <span className="font-mono font-bold bg-gray-800 px-3 py-1 rounded-md">{roomId}</span>
            <button onClick={copyLink} className="p-2 hover:bg-gray-800 rounded-md transition-colors" title="Copy Link">
              {copied ? <span className="text-green-400 text-sm font-bold">Copied!</span> : <Copy size={18} />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${viewers.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <span className="text-sm font-semibold">{viewers.length > 0 ? `${viewers.length} Viewer(s) Connected` : 'Waiting for viewers...'}</span>
          </div>
          <button 
            onClick={stopSharing}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-colors font-bold"
          >
            <XSquare size={18} />
            Stop Sharing
          </button>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-8">
        <div id="live-preview-container" className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 shadow-[0_0_50px_rgba(124,77,255,0.15)] relative group cursor-crosshair">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-contain"
          />
          {remoteCursor && (
            <div 
              className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(255,0,0,0.8)] pointer-events-none z-40 transition-all duration-75 ease-linear"
              style={{
                left: `calc(${remoteCursor.x * 100}% - 8px)`,
                top: `calc(${remoteCursor.y * 100}% - 8px)`,
              }}
            >
              <div className="absolute top-4 left-4 bg-red-500/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                Viewer
              </div>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded backdrop-blur-md text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            Live Preview
          </div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const iceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

if (process.env.NEXT_PUBLIC_TURN_URL) {
  iceServers.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME || '',
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || ''
  });
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useWebRTC = (roomId: string, role: 'host' | 'viewer') => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [peers, setPeers] = useState<Map<string, RTCPeerConnection>>(new Map());
  const peerRef = useRef<RTCPeerConnection | null>(null); // For viewer
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [viewers, setViewers] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const handledViewers = useRef<Set<string>>(new Set());

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);
    socketRef.current = s;

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('join-room', roomId, role);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      s.disconnect();
    };
  }, [roomId, role]);

  const startHosting = async (displayStream: MediaStream) => {
    const s = socketRef.current;
    if (!s) {
      console.log("[Host] Socket not ready yet!");
      return;
    }
    setStream(displayStream);

    s.on('viewer-joined', async ({ viewerId }: { viewerId: string }) => {
      if (handledViewers.current.has(viewerId)) return;
      handledViewers.current.add(viewerId);
      
      setViewers((prev) => [...prev, viewerId]);
      
      const peer = new RTCPeerConnection({ iceServers });
      setPeers((prev) => new Map(prev).set(viewerId, peer));

      console.log(`[Host] Created peer for viewer ${viewerId}`);

      displayStream.getTracks().forEach((track) => {
        console.log(`[Host] Adding track to peer: ${track.kind}`);
        peer.addTrack(track, displayStream);
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.log(`[Host] Sending offer to viewer`);
      
      s.emit('offer', { roomId, offer });

      peer.onicecandidate = ({ candidate }) => {
        if (candidate) {
          console.log(`[Host] Sending ICE candidate`);
          s.emit('ice-candidate', { roomId, candidate });
        }
      };
      
      const pendingCandidates: RTCIceCandidateInit[] = [];
      
      s.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        console.log(`[Host] Received answer`);
        if (peer.signalingState !== 'stable') {
            await peer.setRemoteDescription(answer);
            console.log(`[Host] Set remote description from answer`);
            for (const c of pendingCandidates) {
                await peer.addIceCandidate(c).catch(e => console.error(`[Host] ICE error:`, e));
            }
            pendingCandidates.length = 0;
        }
      });
      
      s.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        console.log(`[Host] Received ICE candidate`);
        if (peer.remoteDescription) {
            await peer.addIceCandidate(candidate).catch(e => console.error(`[Host] ICE error:`, e));
        } else {
            console.log(`[Host] Queued ICE candidate`);
            pendingCandidates.push(candidate);
        }
      });
      
      peer.onconnectionstatechange = () => {
        console.log(`[Host] Connection state: ${peer.connectionState}`);
      };
    });

    s.on('viewer-disconnected', ({ viewerId }: { viewerId: string }) => {
      handledViewers.current.delete(viewerId);
      setViewers((prev) => prev.filter((id) => id !== viewerId));
      setPeers((prev) => {
        const newMap = new Map(prev);
        newMap.get(viewerId)?.close();
        newMap.delete(viewerId);
        return newMap;
      });
    });

    s.emit('host-ready', roomId);
  };

  const joinSession = async () => {
    const s = socketRef.current;
    if (!s || peerRef.current) return;

    const peer = new RTCPeerConnection({ iceServers });
    peerRef.current = peer;

    peer.ontrack = (event) => {
      console.log(`[Viewer] Received track: ${event.track.kind}`);
      if (videoRef.current) {
        console.log(`[Viewer] Setting srcObject to video element`);
        videoRef.current.srcObject = event.streams[0];
      }
    };

    s.on('offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      console.log(`[Viewer] Received offer`);
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      console.log(`[Viewer] Sending answer`);
      s.emit('answer', { roomId, answer });
    });

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log(`[Viewer] Sending ICE candidate`);
        s.emit('ice-candidate', { roomId, candidate });
      }
    };

    s.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      console.log(`[Viewer] Received ICE candidate`);
      await peer.addIceCandidate(candidate).catch(e => console.error(`[Viewer] ICE error:`, e));
    });

    peer.onconnectionstatechange = () => {
      console.log(`[Viewer] Connection state: ${peer.connectionState}`);
    };
  };

  return {
    socket,
    startHosting,
    joinSession,
    viewers,
    videoRef,
    stream,
    isConnected
  };
};

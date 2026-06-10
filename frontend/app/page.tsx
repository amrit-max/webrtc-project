"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [roomIdInput, setRoomIdInput] = useState("");

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);
    router.push(`/host/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomIdInput.trim()) {
      router.push(`/viewer/${roomIdInput.trim()}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-purple opacity-20 blur-[120px] rounded-full mix-blend-screen -z-10 animate-pulse"></div>

      <div className="max-w-3xl w-full text-center space-y-12 z-10">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Your Screen, <span className="gradient-text">Their Control.</span>
          </h1>
          <p className="text-xl text-gray-400">
            Share your desktop and collaborate instantly with sub-millisecond latency. No downloads required.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <button
            onClick={handleCreateRoom}
            className="w-full md:w-auto px-8 py-4 bg-white text-background rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(224,64,251,0.3)]"
          >
            Share My Screen
          </button>

          <form onSubmit={handleJoinRoom} className="w-full md:w-auto flex flex-col sm:flex-row gap-4 bg-[#1a1a2e] p-2 rounded-full border border-gray-800">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              className="px-6 py-3 bg-transparent text-white outline-none placeholder-gray-500 w-full md:w-48"
              required
            />
            <button
              type="submit"
              className="px-8 py-3 bg-accent-purple text-white rounded-full font-bold hover:bg-accent-pink transition-colors"
            >
              Join Session
            </button>
          </form>
        </div>

        <div className="pt-16 border-t border-gray-800/50 text-left grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-2 text-white">1. Create a Room</h3>
            <p className="text-gray-400 text-sm">Click &quot;Share My Screen&quot; to generate a secure, unique room link for your session.</p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2 text-white">2. Share Link</h3>
            <p className="text-gray-400 text-sm">Send the link or Room ID to your collaborator to let them join your session instantly.</p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2 text-white">3. Collaborate</h3>
            <p className="text-gray-400 text-sm">Approve their request to let them remotely control your mouse and keyboard.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

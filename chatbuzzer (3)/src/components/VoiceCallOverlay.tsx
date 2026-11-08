import React, { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { callSoundEngine } from "../utils/callSounds";

interface VoiceCallOverlayProps {
  callId: string;
  isIncoming: boolean;
  partnerName: string;
  partnerAvatar?: string | null;
  status: "ringing" | "connected" | "declined" | "ended";
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
}

export const VoiceCallOverlay: React.FC<VoiceCallOverlayProps> = ({
  callId,
  isIncoming,
  partnerName,
  partnerAvatar,
  status,
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onEnd,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play real remote audio stream through HTML5 audio element
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      const playPromise = remoteAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Auto-play error on remote audio stream:", err);
        });
      }
    }
  }, [remoteStream]);

  // Handle speaker toggle
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn;
      remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.0;
    }
  }, [isSpeakerOn]);

  // Realistic telephone sound effects (ring-back for caller, ringtone for receiver)
  useEffect(() => {
    if (status === "ringing") {
      if (isIncoming) {
        callSoundEngine.startIncomingRingtone();
      } else {
        callSoundEngine.startRingbackTone();
      }
    } else if (status === "connected") {
      callSoundEngine.stopAll();
    } else if (status === "declined" || status === "ended") {
      callSoundEngine.playCallEndTone();
    }

    return () => {
      callSoundEngine.stopAll();
    };
  }, [status, isIncoming]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === "connected") {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleAcceptClick = () => {
    // Prime the audio element during user gesture to comply with browser autoplay policies
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().catch(() => {});
    }
    onAccept();
  };

  const formatCallDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      {/* Real-time remote audio element (positioned offscreen so browser decodes audio without display:none throttling) */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: "none",
        }}
      />

      <div className="w-full max-w-sm flex flex-col items-center text-center text-white py-10 px-6">
        {/* Calling Avatar with Glowing Ring */}
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-emerald-600 flex items-center justify-center text-4xl font-bold shadow-2xl ring-4 ring-emerald-500/30 animate-pulse">
            {partnerAvatar ? (
              <img src={partnerAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{partnerName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          {status === "connected" && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-white">
              <Volume2 size={14} className="animate-pulse" />
            </div>
          )}
        </div>

        {/* Partner Name & Status */}
        <h2 className="text-2xl font-bold mb-1 tracking-tight">{partnerName}</h2>
        <p className="text-sm font-medium text-slate-400 mb-8">
          {status === "ringing"
            ? isIncoming
              ? "Incoming voice call..."
              : "Calling..."
            : status === "connected"
            ? `Connected · ${formatCallDuration(duration)}`
            : status === "declined"
            ? "Call Declined"
            : "Call Ended"}
        </p>

        {/* Incoming Actions: Accept & Decline */}
        {isIncoming && status === "ringing" && (
          <div className="flex items-center gap-12 mt-6">
            <button
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-red-600/30 cursor-pointer"
              title="Decline"
            >
              <PhoneOff size={28} />
            </button>
            <button
              onClick={handleAcceptClick}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-emerald-600/30 animate-bounce cursor-pointer"
              title="Accept"
            >
              <Phone size={28} />
            </button>
          </div>
        )}

        {/* Outgoing Ringing Actions */}
        {!isIncoming && status === "ringing" && (
          <div className="flex justify-center mt-6">
            <button
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-red-600/30 cursor-pointer"
              title="End Call"
            >
              <PhoneOff size={28} />
            </button>
          </div>
        )}

        {/* Connected In-Call Controls */}
        {status === "connected" && (
          <div className="flex items-center gap-6 mt-8">
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isMuted ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title="Mute microphone"
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              <span className="text-xs text-slate-400">{isMuted ? "Muted" : "Mute"}</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  !isSpeakerOn ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title="Speaker"
              >
                {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
              <span className="text-xs text-slate-400">Speaker</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={onEnd}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-red-600/30 cursor-pointer"
                title="End Call"
              >
                <PhoneOff size={22} />
              </button>
              <span className="text-xs text-slate-400">End</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

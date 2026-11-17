import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Square,
  Video,
  VideoOff,
  Volume2,
  X,
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

export interface ActiveCallState {
  callId?: number;
  callType: 'audio' | 'video';
  direction: 'outgoing' | 'incoming';
  status: 'ringing' | 'connecting' | 'connected';
  peerName: string;
  sessionToken?: string;
  classSessionId?: number;
  pendingOfferSdp?: RTCSessionDescriptionInit | null;
  mediaWarning?: string | null;
}

export function formatSecondsClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VoiceRecorderButton({
  disabled,
  onSendVoice,
  compact = false,
}: {
  disabled?: boolean;
  onSendVoice: (file: File, durationSec: number) => Promise<void>;
  compact?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const canceledRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
    };
  }, []);

  const cleanupStream = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    recorderRef.current = null;
  };

  const startRecording = async () => {
    if (recording || uploading || disabled) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      canceledRef.current = false;

      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data);
      };

      recorder.onstop = async () => {
        const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const blobType = recorder.mimeType || chosenMime || 'audio/webm';
        const ext = blobType.includes('ogg') ? 'ogg' : blobType.includes('mp4') ? 'm4a' : 'webm';
        const blobs = [...chunksRef.current];
        cleanupStream();
        setRecording(false);
        setElapsedSec(0);

        if (canceledRef.current || blobs.length === 0) return;

        const audioBlob = new Blob(blobs, { type: blobType.split(';')[0] });
        if (audioBlob.size < 64) {
          toast.error('Voice recording was too short.');
          return;
        }

        const file = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, {
          type: blobType.split(';')[0],
        });
        setUploading(true);
        try {
          await onSendVoice(file, elapsed);
        } catch {
          toast.error('Failed to send voice recording.');
        } finally {
          setUploading(false);
        }
      };

      startedAtRef.current = Date.now();
      setElapsedSec(0);
      setRecording(true);
      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        setElapsedSec(Math.round((Date.now() - startedAtRef.current) / 1000));
      }, 500);
    } catch (err) {
      cleanupStream();
      const errName = (err as { name?: string })?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        toast.error(
          'Microphone permission denied. Allow Microphone access in your browser site settings (or open the app directly in a new browser tab).'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        toast.error('No microphone detected on this device.');
      } else {
        toast.error('Microphone is unavailable in this browser or preview frame.');
      }
    }
  };

  const stopAndSend = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      canceledRef.current = false;
      recorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    canceledRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      cleanupStream();
      setRecording(false);
      setElapsedSec(0);
    }
  };

  if (recording) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs shrink-0">
        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
        <span className="font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
          {formatSecondsClock(elapsedSec)}
        </span>
        <button
          type="button"
          onClick={stopAndSend}
          title="Stop & Send Voice"
          aria-label="Stop and send voice recording"
          className="inline-flex h-6 items-center gap-1 rounded bg-rose-600 px-2 text-[11px] font-semibold text-white hover:bg-rose-500 cursor-pointer"
        >
          <Square className="h-2.5 w-2.5 fill-current" />
          <span>Send</span>
        </button>
        <button
          type="button"
          onClick={cancelRecording}
          title="Cancel Recording"
          aria-label="Cancel voice recording"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || uploading}
      onClick={startRecording}
      aria-label="Record voice message"
      title={uploading ? 'Uploading voice...' : 'Record voice message'}
      className={compact ? 'h-9 px-2.5 shrink-0' : 'h-9 px-3 shrink-0'}
    >
      <Mic className={`h-3.5 w-3.5 ${uploading ? 'animate-pulse text-blue-500' : ''}`} />
      {!compact ? <span>{uploading ? 'Sending...' : 'Voice'}</span> : null}
    </Button>
  );
}

export function ChatMessageMedia({
  messageType,
  message,
  mediaUrl,
  mediaDurationSec,
  isOwnBubble = false,
}: {
  messageType?: 'text' | 'voice' | 'call_log';
  message: string;
  mediaUrl?: string | null;
  mediaDurationSec?: number | null;
  isOwnBubble?: boolean;
}) {
  if (messageType === 'voice' && mediaUrl) {
    return (
      <div className="space-y-1.5 min-w-[205px]">
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
          <span className="inline-flex items-center gap-1">
            <Volume2 className="h-3.5 w-3.5" />
            <span>Voice Recording</span>
          </span>
          {mediaDurationSec ? (
            <span className="font-mono text-[10px] opacity-80">{formatSecondsClock(mediaDurationSec)}</span>
          ) : null}
        </div>
        <audio controls preload="metadata" src={mediaUrl} className="w-full h-8 rounded" />
      </div>
    );
  }

  if (messageType === 'call_log') {
    const isVideo = message.toLowerCase().includes('video');
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs ${isOwnBubble ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`}>
        {isVideo ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
        <span>{message}</span>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words">{message}</p>;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRtcCallManager({
  wsRef,
  localName,
  sessionToken,
  classSessionId,
}: {
  wsRef: { current: WebSocket | null };
  localName: string;
  sessionToken?: string;
  classSessionId?: number;
}) {
  const [callState, setCallState] = useState<ActiveCallState | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callStateRef = useRef<ActiveCallState | null>(null);
  callStateRef.current = callState;

  useEffect(() => {
    if (callState?.status !== 'connected') {
      setElapsedSeconds(0);
      return;
    }
    const startTs = Date.now();
    const t = window.setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startTs) / 1000));
    }, 1000);
    return () => window.clearInterval(t);
  }, [callState?.status]);

  const attachStreamsToMediaElements = () => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
    }
  };

  useEffect(() => {
    attachStreamsToMediaElements();
  }, [callState?.status, callState?.callType]);

  const cleanupPeerAndMedia = () => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) track.stop();
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    pendingIceRef.current = [];
    setMicMuted(false);
    setCameraOff(false);
  };

  useEffect(() => {
    return () => {
      cleanupPeerAndMedia();
    };
  }, []);

  const sendSignal = (payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(
      JSON.stringify({
        ...payload,
        sessionToken: payload.sessionToken ?? callStateRef.current?.sessionToken ?? sessionToken,
        classSessionId: payload.classSessionId ?? callStateRef.current?.classSessionId ?? classSessionId,
      })
    );
    return true;
  };

  const acquireUserMediaWithFallback = async (
    callType: 'audio' | 'video'
  ): Promise<{ stream: MediaStream | null; warning: string | null }> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        stream: null,
        warning:
          'Microphone/Camera API requires HTTPS and permission in this browser. Connected in listen-only mode.',
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      return { stream, warning: null };
    } catch (err) {
      const errName = (err as { name?: string })?.name || '';

      // If video camera is missing/busy, try audio-only fallback before degrading to listen-only
      if (callType === 'video' && errName !== 'NotAllowedError' && errName !== 'PermissionDeniedError') {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          return {
            stream: audioOnly,
            warning: 'Camera was unavailable; continuing with Audio only.',
          };
        } catch {
          // Fall through to listen-only warning
        }
      }

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        return {
          stream: null,
          warning:
            'Browser or preview frame denied Mic/Camera permission. Click the lock/camera icon in your address bar to Allow access (or open the app in its own tab). Connected in listen-only mode.',
        };
      }
      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        return {
          stream: null,
          warning: 'No microphone or camera hardware detected. Connected in listen-only mode.',
        };
      }
      return {
        stream: null,
        warning: 'Could not access local Mic/Camera (device may be in use). Connected in listen-only mode.',
      };
    }
  };

  const preparePeerConnection = async (callType: 'audio' | 'video', targetSessionToken?: string, callId?: number) => {
    cleanupPeerAndMedia();
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC is not supported in this browser.');
    }

    const { stream, warning } = await acquireUserMediaWithFallback(callType);
    localStreamRef.current = stream;
    if (warning) {
      toast.info(warning);
      setCallState((prev) => (prev ? { ...prev, mediaWarning: warning } : prev));
    } else {
      setCallState((prev) => (prev ? { ...prev, mediaWarning: null } : prev));
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    if (stream) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    } else {
      pc.addTransceiver('audio', { direction: 'recvonly' });
      if (callType === 'video') {
        pc.addTransceiver('video', { direction: 'recvonly' });
      }
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
      } else {
        remoteStream.addTrack(event.track);
      }
      attachStreamsToMediaElements();
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'webrtc:ice-candidate',
          callId,
          callType,
          sessionToken: targetSessionToken,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState((prev) => (prev ? { ...prev, status: 'connected' } : prev));
      }
    };

    attachStreamsToMediaElements();
    return pc;
  };

  const retryLocalMedia = async () => {
    const cur = callStateRef.current;
    if (!cur) return;
    const { stream, warning } = await acquireUserMediaWithFallback(cur.callType);
    if (!stream) {
      if (warning) toast.error(warning);
      return;
    }
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) t.stop();
    }
    localStreamRef.current = stream;
    if (pcRef.current) {
      for (const track of stream.getTracks()) {
        pcRef.current.addTrack(track, stream);
      }
    }
    attachStreamsToMediaElements();
    setCallState((prev) => (prev ? { ...prev, mediaWarning: warning } : prev));
    toast.success('Microphone/Camera connected!');
  };

  const startOutgoingCall = async (
    callType: 'audio' | 'video',
    peerName: string,
    overrideSessionToken?: string
  ) => {
    const targetToken = overrideSessionToken || sessionToken;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Real-time call server is connecting. Please try again in a second.');
      return;
    }

    setCallState({
      callType,
      direction: 'outgoing',
      status: 'ringing',
      peerName,
      sessionToken: targetToken,
      classSessionId,
      mediaWarning: null,
    });

    try {
      await preparePeerConnection(callType, targetToken);
      sendSignal({
        type: 'call:invite',
        callType,
        callerName: localName,
        sessionToken: targetToken,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to start call.');
      cleanupPeerAndMedia();
      setCallState(null);
    }
  };

  const acceptIncomingCall = async () => {
    const cur = callStateRef.current;
    if (!cur) return;
    setCallState((prev) => (prev ? { ...prev, status: 'connecting' } : prev));
    try {
      const pc = await preparePeerConnection(cur.callType, cur.sessionToken, cur.callId);
      sendSignal({
        type: 'call:accept',
        callId: cur.callId,
        callType: cur.callType,
        callerName: localName,
        sessionToken: cur.sessionToken,
      });

      if (cur.pendingOfferSdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(cur.pendingOfferSdp));
        for (const c of pendingIceRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingIceRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({
          type: 'webrtc:answer',
          callId: cur.callId,
          callType: cur.callType,
          sessionToken: cur.sessionToken,
          sdp: answer,
        });
        setCallState((prev) => (prev ? { ...prev, status: 'connected' } : prev));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to connect call.');
      declineOrEndCall();
    }
  };

  const declineOrEndCall = () => {
    const cur = callStateRef.current;
    if (cur) {
      const evtType = cur.direction === 'incoming' && cur.status === 'ringing' ? 'call:decline' : 'call:end';
      sendSignal({
        type: evtType,
        callId: cur.callId,
        callType: cur.callType,
        callerName: localName,
        sessionToken: cur.sessionToken,
        durationSeconds: elapsedSeconds,
      });
    }
    cleanupPeerAndMedia();
    setCallState(null);
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const next = !micMuted;
    for (const track of localStreamRef.current.getAudioTracks()) {
      track.enabled = !next;
    }
    setMicMuted(next);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const next = !cameraOff;
    for (const track of localStreamRef.current.getVideoTracks()) {
      track.enabled = !next;
    }
    setCameraOff(next);
  };

  const handleWsSignal = async (data: {
    type?: string;
    ack?: boolean;
    callId?: number;
    callType?: 'audio' | 'video';
    callerName?: string;
    sessionToken?: string;
    classSessionId?: number;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  }) => {
    if (!data.type) return;

    if (data.type === 'call:invite') {
      if (data.ack) {
        setCallState((prev) => (prev ? { ...prev, callId: data.callId } : prev));
        return;
      }
      if (!callStateRef.current) {
        setCallState({
          callId: data.callId,
          callType: data.callType === 'video' ? 'video' : 'audio',
          direction: 'incoming',
          status: 'ringing',
          peerName: data.callerName || 'Caller',
          sessionToken: data.sessionToken,
          classSessionId: data.classSessionId,
        });
      }
      return;
    }

    if (data.type === 'call:accept') {
      const cur = callStateRef.current;
      const pc = pcRef.current;
      if (cur && pc) {
        setCallState((prev) => (prev ? { ...prev, status: 'connecting', callId: data.callId ?? prev.callId } : prev));
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({
            type: 'webrtc:offer',
            callId: data.callId ?? cur.callId,
            callType: cur.callType,
            sessionToken: cur.sessionToken ?? data.sessionToken,
            sdp: offer,
          });
        } catch {
          declineOrEndCall();
        }
      }
      return;
    }

    if (data.type === 'webrtc:offer' && data.sdp) {
      const pc = pcRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const c of pendingIceRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingIceRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({
          type: 'webrtc:answer',
          callId: data.callId ?? callStateRef.current?.callId,
          callType: data.callType ?? callStateRef.current?.callType,
          sessionToken: data.sessionToken ?? callStateRef.current?.sessionToken,
          sdp: answer,
        });
        setCallState((prev) => (prev ? { ...prev, status: 'connected' } : prev));
      } else {
        setCallState((prev) => (prev ? { ...prev, pendingOfferSdp: data.sdp } : prev));
      }
      return;
    }

    if (data.type === 'webrtc:answer' && data.sdp && pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      for (const c of pendingIceRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingIceRef.current = [];
      setCallState((prev) => (prev ? { ...prev, status: 'connected' } : prev));
      return;
    }

    if (data.type === 'webrtc:ice-candidate' && data.candidate) {
      if (pcRef.current && pcRef.current.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => undefined);
      } else {
        pendingIceRef.current.push(data.candidate);
      }
      return;
    }

    if (data.type === 'call:decline' || data.type === 'call:end') {
      toast.info(data.type === 'call:decline' ? 'Call declined.' : 'Call ended.');
      cleanupPeerAndMedia();
      setCallState(null);
    }
  };

  return {
    callState,
    micMuted,
    cameraOff,
    elapsedSeconds,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    startOutgoingCall,
    acceptIncomingCall,
    declineOrEndCall,
    toggleMute,
    toggleCamera,
    retryLocalMedia,
    handleWsSignal,
  };
}

export function CallSessionModal({
  callState,
  micMuted,
  cameraOff,
  elapsedSeconds,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  onAccept,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onRetryMedia,
}: {
  callState: ActiveCallState | null;
  micMuted: boolean;
  cameraOff: boolean;
  elapsedSeconds: number;
  localVideoRef: { current: HTMLVideoElement | null };
  remoteVideoRef: { current: HTMLVideoElement | null };
  remoteAudioRef: { current: HTMLAudioElement | null };
  onAccept: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onRetryMedia?: () => void;
}) {
  if (!callState) return null;

  return (
    <div
      role="dialog"
      aria-label={`${callState.callType === 'video' ? 'Video' : 'Audio'} Call with ${callState.peerName}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#0B0B0D] text-zinc-100 overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-sm font-bold">{callState.peerName}</p>
              <p className="text-[11px] font-mono text-zinc-400 uppercase">
                {callState.callType} Call ·{' '}
                {callState.status === 'connected'
                  ? formatSecondsClock(elapsedSeconds)
                  : callState.direction === 'incoming'
                    ? 'Incoming Call...'
                    : callState.status === 'ringing'
                      ? 'Ringing...'
                      : 'Connecting WebRTC...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onEnd}
            aria-label="Close call"
            className="h-8 w-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Media Stage */}
        <div className="relative bg-zinc-950 aspect-video flex items-center justify-center overflow-hidden">
          {callState.callType === 'video' ? (
            <>
              <video
                ref={(el) => {
                  remoteVideoRef.current = el;
                }}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              {callState.status !== 'connected' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/85">
                  <div className="h-16 w-16 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 animate-pulse">
                    <Video className="h-7 w-7" />
                  </div>
                  <p className="text-xs text-zinc-300">
                    {callState.direction === 'incoming' && callState.status === 'ringing'
                      ? `${callState.peerName} is inviting you to a live video call...`
                      : `Waiting for ${callState.peerName} to answer...`}
                  </p>
                </div>
              ) : null}
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                }}
                autoPlay
                muted
                playsInline
                className="absolute bottom-3 right-3 h-28 w-40 rounded-xl border border-zinc-700 object-cover bg-black shadow-lg"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
              <audio
                ref={(el) => {
                  remoteAudioRef.current = el;
                }}
                autoPlay
              />
              <div className="h-20 w-20 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 animate-pulse">
                <PhoneCall className="h-9 w-9" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-bold">{callState.peerName}</p>
                <p className="font-mono text-xs text-zinc-400">
                  {callState.status === 'connected'
                    ? `Live Audio · ${formatSecondsClock(elapsedSeconds)}`
                    : callState.direction === 'incoming'
                      ? 'Incoming Audio Call...'
                      : 'Ringing peer...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Media Warning Banner */}
        {callState.mediaWarning ? (
          <div className="px-5 py-2.5 bg-amber-500/15 border-b border-amber-500/30 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
            <span>{callState.mediaWarning}</span>
            {onRetryMedia ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetryMedia}
                className="h-7 px-2.5 text-[11px] border-amber-400/50 text-amber-100 hover:bg-amber-500/20"
              >
                Retry Mic / Cam
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Call Controls */}
        <div className="px-5 py-4 border-t border-zinc-800 flex flex-wrap items-center justify-center gap-3">
          {callState.direction === 'incoming' && callState.status === 'ringing' ? (
            <>
              <Button
                type="button"
                onClick={onAccept}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Phone className="h-4 w-4" />
                <span>Answer Call</span>
              </Button>
              <Button type="button" onClick={onEnd} className="bg-rose-600 hover:bg-rose-500 text-white">
                <PhoneOff className="h-4 w-4" />
                <span>Decline</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onToggleMute}
                aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
                className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              >
                {micMuted ? <MicOff className="h-4 w-4 text-rose-400" /> : <Mic className="h-4 w-4" />}
                <span>{micMuted ? 'Unmute' : 'Mute'}</span>
              </Button>
              {callState.callType === 'video' ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onToggleCamera}
                  aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                  className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                >
                  {cameraOff ? <VideoOff className="h-4 w-4 text-rose-400" /> : <Video className="h-4 w-4" />}
                  <span>{cameraOff ? 'Camera Off' : 'Camera On'}</span>
                </Button>
              ) : null}
              <Button type="button" onClick={onEnd} className="bg-rose-600 hover:bg-rose-500 text-white">
                <PhoneOff className="h-4 w-4" />
                <span>End Call</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

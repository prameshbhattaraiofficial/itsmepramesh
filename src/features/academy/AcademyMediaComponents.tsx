import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink, MessageSquare, Phone, Radio, Send, Video, X } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { academyApi } from '@/src/services/api/academyApi';
import { getStoredTokens } from '@/src/services/api/httpClient';
import { buildWebSocketUrl } from '@/src/utils/analytics';
import {
  CallSessionModal,
  ChatMessageMedia,
  VoiceRecorderButton,
  useWebRtcCallManager,
} from '@/src/components/common/RealtimeMediaTools';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import type { ClassVideoDto, OnlineClassDto, OnlineClassMessageDto } from '@/src/types/portfolio';

export function resolveVideoEmbed(url: string): {
  mode: 'html5' | 'iframe' | 'external';
  src: string;
} {
  const trimmed = (url || '').trim();
  if (!trimmed) return { mode: 'external', src: '' };

  if (trimmed.startsWith('/api/') || /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i.test(trimmed)) {
    return { mode: 'html5', src: trimmed };
  }

  // YouTube
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i
  );
  if (ytMatch?.[1]) {
    return {
      mode: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`,
    };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch?.[1]) {
    return {
      mode: 'iframe',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Google Drive
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i);
  if (driveMatch?.[1]) {
    return {
      mode: 'iframe',
      src: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
    };
  }

  return { mode: 'iframe', src: trimmed };
}

export function LectureVideoPlayerModal({
  video,
  onClose,
}: {
  video: ClassVideoDto;
  onClose: () => void;
}) {
  const resolved = useMemo(() => resolveVideoEmbed(video.videoUrl), [video.videoUrl]);

  useEffect(() => {
    void academyApi.trackVideoView(video.id).catch(() => undefined);
  }, [video.id]);

  return (
    <div
      role="dialog"
      aria-label={video.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-4xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {video.className} · {video.sectionName} · {video.subject}
            </p>
            <h3 className="mt-1 font-display text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {video.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video player"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-black aspect-video w-full flex items-center justify-center">
          {resolved.mode === 'html5' ? (
            <video
              key={resolved.src}
              src={resolved.src}
              controls
              autoPlay
              playsInline
              className="h-full w-full"
            />
          ) : resolved.mode === 'iframe' ? (
            <iframe
              key={resolved.src}
              src={resolved.src}
              title={video.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="p-8 text-center text-zinc-300 space-y-3">
              <Video className="h-10 w-10 mx-auto text-blue-400" />
              <p className="text-sm">Open this lecture video in its external player.</p>
              <Button asChild size="sm">
                <a href={video.videoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Video Link</span>
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="space-y-1 max-w-2xl">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              Instructor: {video.instructorName}
              {video.durationLabel ? ` · Duration: ${video.durationLabel}` : ''}
              {` · Source: ${video.sourceType === 'upload' ? 'Uploaded Lecture Video' : 'Video Link'}`}
            </p>
            {video.description ? <p>{video.description}</p> : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {video.notesUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={video.notesUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Lecture Notes</span>
                </a>
              </Button>
            ) : null}
            {video.sourceType === 'link' ? (
              <Button variant="outline" size="sm" asChild>
                <a href={video.videoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Source</span>
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveClassroomRoomModal({
  onlineClass,
  onClose,
}: {
  onlineClass: OnlineClassDto;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [liveSession, setLiveSession] = useState<OnlineClassDto>(onlineClass);
  const [messages, setMessages] = useState<OnlineClassMessageDto[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const callMgr = useWebRtcCallManager({
    wsRef,
    localName: user?.fullName || 'Participant',
    classSessionId: onlineClass.id,
  });
  const callSignalRef = useRef(callMgr.handleWsSignal);
  callSignalRef.current = callMgr.handleWsSignal;

  useEffect(() => {
    setLiveSession(onlineClass);
  }, [onlineClass]);

  useEffect(() => {
    let cancelled = false;
    academyApi
      .joinOnlineClass(onlineClass.id)
      .then((res) => {
        if (cancelled) return;
        setLiveSession(res.onlineClass);
        setAttendanceMarked(res.attendanceMarked);
        if (res.attendanceMarked) {
          toast.success('Attendance automatically marked Present for this live class!');
        }
      })
      .catch(() => undefined);

    academyApi
      .getOnlineClassMessages(onlineClass.id)
      .then((list) => {
        if (!cancelled) setMessages(list);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [onlineClass.id]);

  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) return;

    let ws: WebSocket | null = null;
    let unmounted = false;

    try {
      ws = new WebSocket(
        buildWebSocketUrl({
          channel: 'classroom',
          classSessionId: String(onlineClass.id),
          token: accessToken,
        })
      );
      wsRef.current = ws;
      ws.onopen = () => {
        if (!unmounted) setConnected(true);
      };
      ws.onclose = () => {
        if (!unmounted) {
          setConnected(false);
          if (wsRef.current === ws) wsRef.current = null;
        }
      };
      ws.onmessage = (evt) => {
        if (unmounted) return;
        try {
          const data = JSON.parse(String(evt.data || '{}')) as {
            type?: string;
            participantCount?: number;
            status?: OnlineClassDto['status'];
            message?: OnlineClassMessageDto;
            studentName?: string;
            ack?: boolean;
            callId?: number;
            callType?: 'audio' | 'video';
            callerName?: string;
            sessionToken?: string;
            classSessionId?: number;
            sdp?: RTCSessionDescriptionInit;
            candidate?: RTCIceCandidateInit;
          };
          if (data.type === 'ws:ready' && typeof data.participantCount === 'number') {
            setParticipants(data.participantCount);
          } else if (data.type === 'classroom:message' && data.message) {
            const incoming = data.message;
            setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          } else if (data.type === 'classroom:status' && data.status) {
            setLiveSession((prev) => ({ ...prev, status: data.status! }));
            toast.info(`Classroom status updated to: ${data.status.toUpperCase()}`);
          } else if (data.type === 'classroom:attendance' && data.studentName) {
            toast.info(`${data.studentName} joined and marked attendance.`);
          } else if (data.type?.startsWith('call:') || data.type?.startsWith('webrtc:')) {
            void callSignalRef.current(data);
          }
        } catch {
          // Ignore malformed WS payloads
        }
      };
    } catch {
      setConnected(false);
    }

    return () => {
      unmounted = true;
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
      wsRef.current = null;
    };
  }, [onlineClass.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = messageInput.trim();
    if (!text) return;
    setSending(true);
    try {
      const saved = await academyApi.sendOnlineClassMessage(onlineClass.id, text);
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setMessageInput('');
    } catch {
      toast.error('Unable to send message to classroom.');
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async (file: File, durationSec: number) => {
    const saved = await academyApi.uploadOnlineClassVoice(onlineClass.id, file, durationSec);
    setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
  };

  return (
    <div
      role="dialog"
      aria-label={`Live Classroom: ${liveSession.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-5xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 max-h-[90vh]">
        {/* Main Live Stage */}
        <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold uppercase ${
                    liveSession.status === 'live'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <Radio className="h-3 w-3" />
                  {liveSession.status}
                </span>
                <span className="text-zinc-500">
                  {liveSession.className} · {liveSession.sectionName}
                </span>
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {liveSession.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Leave classroom"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between bg-zinc-950 text-zinc-100 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <span>
                  Instructor: <strong className="text-zinc-100">{liveSession.instructorName}</strong>
                </span>
                <span className="font-mono">
                  {liveSession.scheduledDate} · {liveSession.startTime} ({liveSession.durationMinutes} min)
                </span>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Interactive Virtual Classroom</p>
                    <p className="text-xs text-zinc-400">
                      Subject: {liveSession.subject} · Real-time WebSocket Q&amp;A synced ({participants} active)
                    </p>
                  </div>
                </div>
                {liveSession.description ? (
                  <p className="text-xs leading-relaxed text-zinc-300">{liveSession.description}</p>
                ) : null}

                {attendanceMarked ? (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Attendance marked Present automatically for {user?.fullName}.</span>
                  </div>
                ) : null}

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void callMgr.startOutgoingCall('audio', liveSession.title)}
                    className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Live Audio Call</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void callMgr.startOutgoingCall('video', liveSession.title)}
                    className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                  >
                    <Video className="h-3.5 w-3.5 text-blue-400" />
                    <span>Live Video Call</span>
                  </Button>
                  {liveSession.meetingUrl ? (
                    <Button size="sm" asChild>
                      <a href={liveSession.meetingUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        <span>Launch External Meeting</span>
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
              <span>Live Stream Status: {connected ? 'Connected via WebSocket' : 'Reconnecting...'}</span>
              <span>Auto Attendance: {liveSession.autoAttendance ? 'Enabled' : 'Manual'}</span>
            </div>
          </div>
        </div>

        {/* Real-Time Classroom Q&A Chat + Voice Notes */}
        <div className="lg:col-span-5 flex flex-col h-[420px] lg:h-[540px]">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-[#0B0B0D]">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Classroom Live Chat, Voice &amp; Q&amp;A</span>
            </div>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-[#070709]">
            {messages.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-12">
                No class messages yet. Ask a question or send a voice note!
              </p>
            ) : (
              messages.map((m) => {
                const isInstructor = m.senderRole === 'Instructor';
                return (
                  <div key={m.id} className="space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span
                        className={`font-semibold ${
                          isInstructor ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {m.senderName}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-zinc-400">{m.senderRole}</span>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200">
                      <ChatMessageMedia
                        messageType={m.messageType}
                        message={m.message}
                        mediaUrl={m.mediaUrl}
                        mediaDurationSec={m.mediaDurationSec}
                      />
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-white dark:bg-[#0B0B0D]"
          >
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Ask a question in class..."
              className="h-9 text-xs"
              maxLength={1000}
            />
            <VoiceRecorderButton compact onSendVoice={handleSendVoice} />
            <Button type="submit" size="sm" disabled={sending || !messageInput.trim()} aria-label="Send class message">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>

      <CallSessionModal
        callState={callMgr.callState}
        micMuted={callMgr.micMuted}
        cameraOff={callMgr.cameraOff}
        elapsedSeconds={callMgr.elapsedSeconds}
        localVideoRef={callMgr.localVideoRef}
        remoteVideoRef={callMgr.remoteVideoRef}
        remoteAudioRef={callMgr.remoteAudioRef}
        onAccept={callMgr.acceptIncomingCall}
        onEnd={callMgr.declineOrEndCall}
        onToggleMute={callMgr.toggleMute}
        onToggleCamera={callMgr.toggleCamera}
        onRetryMedia={callMgr.retryLocalMedia}
      />
    </div>
  );
}

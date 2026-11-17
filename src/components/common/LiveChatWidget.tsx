import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { MessageCircle, Phone, PhoneCall, Send, Video, X } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { buildWebSocketUrl, getOrCreateChatSessionToken } from '@/src/utils/analytics';
import {
  CallSessionModal,
  ChatMessageMedia,
  VoiceRecorderButton,
  useWebRtcCallManager,
} from '@/src/components/common/RealtimeMediaTools';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import type { ChatMessageDto } from '@/src/types/portfolio';

export function LiveChatWidget({ whatsappPhone = '9779863439135' }: { whatsappPhone?: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [sessionToken] = useState(() => getOrCreateChatSessionToken());
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadReplies, setUnreadReplies] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const displayName = visitorName.trim() || user?.fullName || 'Visitor';
  const callMgr = useWebRtcCallManager({
    wsRef,
    localName: displayName,
    sessionToken,
  });
  const callSignalRef = useRef(callMgr.handleWsSignal);
  callSignalRef.current = callMgr.handleWsSignal;

  useEffect(() => {
    if (user) {
      setVisitorName((prev) => prev || user.fullName);
      setVisitorEmail((prev) => prev || user.email);
    }
  }, [user]);

  useEffect(() => {
    if (!open && messages.length === 0) {
      return;
    }

    let cancelled = false;
    portfolioApi
      .initChatSession({
        sessionToken,
        visitorName: visitorName.trim() || user?.fullName,
        visitorEmail: visitorEmail.trim() || user?.email,
      })
      .then((res) => {
        if (cancelled) return;
        setMessages(res.messages);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open, sessionToken, user?.email, user?.fullName]);

  useEffect(() => {
    if (!open) return;
    setUnreadReplies(0);

    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      try {
        ws = new WebSocket(buildWebSocketUrl({ sessionToken }));
        wsRef.current = ws;
        ws.onopen = () => {
          if (!unmounted) setConnected(true);
        };
        ws.onclose = () => {
          if (!unmounted) {
            setConnected(false);
            if (wsRef.current === ws) wsRef.current = null;
            reconnectTimer = window.setTimeout(connect, 3500);
          }
        };
        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(String(evt.data || '{}')) as {
              type?: string;
              message?: ChatMessageDto;
              ack?: boolean;
              callId?: number;
              callType?: 'audio' | 'video';
              callerName?: string;
              sessionToken?: string;
              classSessionId?: number;
              sdp?: RTCSessionDescriptionInit;
              candidate?: RTCIceCandidateInit;
            };
            if (data.type === 'chat:message' && data.message) {
              const incoming = data.message;
              setMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) return prev;
                return [...prev, incoming];
              });
              if (!open && incoming.senderRole === 'admin') {
                setUnreadReplies((c) => c + 1);
              }
            }
            if (data.type?.startsWith('call:') || data.type?.startsWith('webrtc:')) {
              void callSignalRef.current(data);
            }
          } catch {
            // Ignore malformed socket frames
          }
        };
      } catch {
        setConnected(false);
      }
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws && ws.readyState <= WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [open, sessionToken]);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, open]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const saved = await portfolioApi.sendChatMessage({
        sessionToken,
        visitorName: displayName,
        visitorEmail: visitorEmail.trim() || user?.email || '',
        message: trimmed,
      });
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setMessageInput('');
    } catch {
      toast.error('Unable to send message right now.');
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async (file: File, durationSec: number) => {
    const saved = await portfolioApi.uploadChatVoice({
      sessionToken,
      visitorName: displayName,
      visitorEmail: visitorEmail.trim() || user?.email || '',
      file,
      durationSec,
    });
    setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open ? (
        <div
          role="dialog"
          aria-label={t('liveChatTitle')}
          className="w-[min(92vw,390px)] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0B0D] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {t('liveChatTitle')}
                </h2>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {t('liveChatSubtitle')}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void callMgr.startOutgoingCall('audio', 'Pramesh Support')}
                aria-label="Start audio call"
                title={t('startAudioCall')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
              >
                <Phone className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void callMgr.startOutgoingCall('video', 'Pramesh Support')}
                aria-label="Start video call"
                title={t('startVideoCall')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
              >
                <Video className="h-3.5 w-3.5" />
              </button>
              <a
                href={`https://wa.me/${whatsappPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                title={t('whatsappChat')}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <PhoneCall className="h-3 w-3" />
                <span>WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close live chat"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!user && messages.length === 0 ? (
            <div className="px-4 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 gap-2">
              <Input
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your name"
                className="h-8 text-xs"
              />
              <Input
                type="email"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                placeholder="Email (optional)"
                className="h-8 text-xs"
              />
            </div>
          ) : null}

          <div className="h-72 overflow-y-auto p-4 space-y-3 bg-zinc-50/40 dark:bg-[#09090B]">
            {messages.length === 0 ? (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-10 px-4">
                Send a text, record a voice message, or start an audio/video call with support.
              </div>
            ) : (
              messages.map((msg) => {
                const isVisitor = msg.senderRole === 'visitor';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isVisitor ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[84%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        isVisitor
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {!isVisitor ? (
                        <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                          {msg.senderName}
                        </p>
                      ) : null}
                      <ChatMessageMedia
                        messageType={msg.messageType}
                        message={msg.message}
                        mediaUrl={msg.mediaUrl}
                        mediaDurationSec={msg.mediaDurationSec}
                        isOwnBubble={isVisitor}
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
            className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-white dark:bg-[#111114]"
          >
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Write a message..."
              className="h-9 text-xs"
              maxLength={2000}
            />
            <VoiceRecorderButton compact onSendVoice={handleSendVoice} />
            <Button type="submit" size="sm" disabled={sending || !messageInput.trim()} aria-label="Send chat message">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="h-11 rounded-full px-4 shadow-lg gap-2"
          aria-label={t('liveChatTitle')}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs font-semibold">Live Chat</span>
          {unreadReplies > 0 ? (
            <span className="font-mono text-[11px] bg-white text-blue-600 rounded-full px-1.5 py-0.5">
              {unreadReplies}
            </span>
          ) : null}
        </Button>
      )}

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

import type { IncomingMessage } from 'node:http';
import type http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyAccessToken } from './auth.ts';
import { db } from './db.ts';

interface AliveWebSocket extends WebSocket {
  isAlive?: boolean;
  meta?: {
    channel: 'admin' | 'visitor' | 'classroom';
    userId?: number;
    userEmail?: string;
    fullName?: string;
    role?: string;
    sessionToken?: string;
    classSessionId?: number;
  };
}

export interface RealtimeEvent {
  type:
    | 'chat:message'
    | 'chat:status'
    | 'admin:notification'
    | 'ws:ready'
    | 'classroom:message'
    | 'classroom:status'
    | 'classroom:attendance'
    | 'call:invite'
    | 'call:accept'
    | 'call:decline'
    | 'call:end'
    | 'webrtc:offer'
    | 'webrtc:answer'
    | 'webrtc:ice-candidate';
  [key: string]: unknown;
}

const adminSockets = new Set<AliveWebSocket>();
const visitorRooms = new Map<string, Set<AliveWebSocket>>();
const classroomRooms = new Map<number, Set<AliveWebSocket>>();

let wssInstance: WebSocketServer | null = null;

function safeSend(socket: WebSocket, payload: RealtimeEvent): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

export function broadcastToConversation(sessionToken: string, payload: RealtimeEvent, exclude?: WebSocket): void {
  const room = visitorRooms.get(sessionToken);
  if (!room) return;
  for (const sock of room) {
    if (exclude && sock === exclude) continue;
    safeSend(sock, payload);
  }
}

export function broadcastToClassroom(classSessionId: number, payload: RealtimeEvent, exclude?: WebSocket): void {
  const room = classroomRooms.get(classSessionId);
  if (!room) return;
  for (const sock of room) {
    if (exclude && sock === exclude) continue;
    safeSend(sock, payload);
  }
}

export function broadcastToAdmins(payload: RealtimeEvent, exclude?: WebSocket): void {
  for (const sock of adminSockets) {
    if (exclude && sock === exclude) continue;
    safeSend(sock, payload);
  }
}

function handleCallAndWebRtcSignal(sender: AliveWebSocket, raw: string): void {
  try {
    const data = JSON.parse(raw) as {
      type?: string;
      sessionToken?: string;
      conversationId?: number;
      classSessionId?: number;
      callId?: number;
      callType?: 'audio' | 'video';
      callerName?: string;
      durationSeconds?: number;
      sdp?: unknown;
      candidate?: unknown;
    };
    const type = data.type;
    if (!type) return;

    const allowedSignals = new Set([
      'call:invite',
      'call:accept',
      'call:decline',
      'call:end',
      'webrtc:offer',
      'webrtc:answer',
      'webrtc:ice-candidate',
    ]);
    if (!allowedSignals.has(type)) return;

    const meta = sender.meta;
    if (!meta) return;

    // 1) Classroom WebRTC Audio/Video Call Signaling
    if (meta.channel === 'classroom' && meta.classSessionId) {
      const classId = meta.classSessionId;
      let resolvedCallId = typeof data.callId === 'number' ? data.callId : undefined;
      const callerName = data.callerName || meta.fullName || 'Participant';

      if (type === 'call:invite') {
        const info = db
          .prepare(
            "INSERT INTO call_logs (class_session_id, call_type, initiated_by_role, initiated_by_name, status) VALUES (?, ?, ?, ?, 'ringing')"
          )
          .run(classId, data.callType === 'video' ? 'video' : 'audio', meta.role || 'Student', callerName);
        resolvedCallId = Number(info.lastInsertRowid);
      } else if (type === 'call:accept' && resolvedCallId) {
        db.prepare("UPDATE call_logs SET status = 'active', answered_at = datetime('now') WHERE id = ?").run(
          resolvedCallId
        );
      } else if ((type === 'call:end' || type === 'call:decline') && resolvedCallId) {
        const nextStatus = type === 'call:decline' ? 'declined' : 'ended';
        db.prepare(
          "UPDATE call_logs SET status = ?, ended_at = datetime('now'), duration_seconds = ? WHERE id = ?"
        ).run(nextStatus, Math.max(0, Number(data.durationSeconds || 0)), resolvedCallId);
      }

      broadcastToClassroom(
        classId,
        {
          type: type as RealtimeEvent['type'],
          channel: 'classroom',
          classSessionId: classId,
          callId: resolvedCallId,
          callType: data.callType === 'video' ? 'video' : 'audio',
          callerName,
          callerRole: meta.role || 'Student',
          durationSeconds: Number(data.durationSeconds || 0),
          sdp: data.sdp,
          candidate: data.candidate,
        },
        sender
      );
      return;
    }

    // 2) Support Chat / Direct User <-> Admin Call & WebRTC Signaling
    const targetSessionToken =
      meta.channel === 'visitor'
        ? meta.sessionToken
        : typeof data.sessionToken === 'string'
          ? data.sessionToken.trim()
          : '';

    if (!targetSessionToken) return;

    const conv = db
      .prepare('SELECT id, visitor_name FROM chat_conversations WHERE session_token = ?')
      .get(targetSessionToken) as { id: number; visitor_name: string } | undefined;

    let resolvedCallId = typeof data.callId === 'number' ? data.callId : undefined;
    const callerRole = meta.channel === 'admin' ? 'admin' : 'visitor';
    const callerName =
      meta.channel === 'admin'
        ? meta.fullName || 'Pramesh Bhattarai'
        : data.callerName || conv?.visitor_name || 'Visitor';

    if (type === 'call:invite') {
      const callType = data.callType === 'video' ? 'video' : 'audio';
      const info = db
        .prepare(
          "INSERT INTO call_logs (conversation_id, call_type, initiated_by_role, initiated_by_name, status) VALUES (?, ?, ?, ?, 'ringing')"
        )
        .run(conv?.id ?? null, callType, callerRole, callerName);
      resolvedCallId = Number(info.lastInsertRowid);

      // Acknowledge callId back to caller
      safeSend(sender, {
        type: 'call:invite',
        ack: true,
        callId: resolvedCallId,
        sessionToken: targetSessionToken,
        conversationId: conv?.id,
        callType,
        callerRole,
        callerName,
      });

      if (meta.channel === 'visitor') {
        broadcastToAdmins({
          type: 'admin:notification',
          id: `call-${resolvedCallId}`,
          category: 'chat',
          title: `Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`,
          message: `${callerName} is calling you live`,
          conversationId: conv?.id,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (type === 'call:accept' && resolvedCallId) {
      db.prepare("UPDATE call_logs SET status = 'active', answered_at = datetime('now') WHERE id = ?").run(
        resolvedCallId
      );
    } else if ((type === 'call:end' || type === 'call:decline') && resolvedCallId) {
      const nextStatus = type === 'call:decline' ? 'declined' : 'ended';
      const dur = Math.max(0, Math.round(Number(data.durationSeconds || 0)));
      db.prepare("UPDATE call_logs SET status = ?, ended_at = datetime('now'), duration_seconds = ? WHERE id = ?").run(
        nextStatus,
        dur,
        resolvedCallId
      );

      if (conv) {
        const callRow = db.prepare('SELECT call_type FROM call_logs WHERE id = ?').get(resolvedCallId) as
          | { call_type: string }
          | undefined;
        const cType = callRow?.call_type === 'video' ? 'Video Call' : 'Audio Call';
        const summaryText =
          nextStatus === 'declined'
            ? `${cType} declined`
            : dur > 0
              ? `${cType} completed (${Math.floor(dur / 60)}m ${dur % 60}s)`
              : `${cType} ended`;

        const msgInfo = db
          .prepare(
            "INSERT INTO chat_messages (conversation_id, sender_role, sender_name, message, message_type, media_duration_sec) VALUES (?, ?, ?, ?, 'call_log', ?)"
          )
          .run(conv.id, callerRole, callerName, summaryText, dur);
        db.prepare("UPDATE chat_conversations SET last_message_at = datetime('now') WHERE id = ?").run(conv.id);

        const saved = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(Number(msgInfo.lastInsertRowid)) as Record<
          string,
          unknown
        >;
        const mappedMsg = {
          id: Number(saved.id),
          conversationId: conv.id,
          senderRole: String(saved.sender_role),
          senderName: String(saved.sender_name),
          message: String(saved.message),
          messageType: 'call_log',
          mediaUrl: null,
          mediaDurationSec: dur,
          createdAt: String(saved.created_at),
        };

        const chatEvt: RealtimeEvent = {
          type: 'chat:message',
          conversationId: conv.id,
          sessionToken: targetSessionToken,
          message: mappedMsg,
        };
        broadcastToConversation(targetSessionToken, chatEvt);
        broadcastToAdmins(chatEvt);
      }
    }

    const forwarded: RealtimeEvent = {
      type: type as RealtimeEvent['type'],
      callId: resolvedCallId,
      callType: data.callType === 'video' ? 'video' : 'audio',
      sessionToken: targetSessionToken,
      conversationId: conv?.id,
      callerRole,
      callerName,
      durationSeconds: Number(data.durationSeconds || 0),
      sdp: data.sdp,
      candidate: data.candidate,
    };

    if (meta.channel === 'visitor') {
      broadcastToAdmins(forwarded);
    } else if (meta.channel === 'admin') {
      broadcastToConversation(targetSessionToken, forwarded);
    }
  } catch {
    // Ignore malformed signaling messages
  }
}

export function attachWebSocketServer(server: http.Server): void {
  if (wssInstance) return;

  const wss = new WebSocketServer({ noServer: true });
  wssInstance = wss;

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    try {
      const host = request.headers.host || 'localhost:3000';
      const url = new URL(request.url || '/', `http://${host}`);
      if (url.pathname !== '/ws') {
        return;
      }

      const channelParam = url.searchParams.get('channel');
      const classSessionIdParam = Number(url.searchParams.get('classSessionId') || 0);
      const roleParam = url.searchParams.get('role');
      const tokenParam = url.searchParams.get('token');
      const sessionToken = (url.searchParams.get('sessionToken') || '').trim();

      if (channelParam === 'classroom' && Number.isInteger(classSessionIdParam) && classSessionIdParam > 0) {
        const user = tokenParam ? verifyAccessToken(tokenParam) : null;
        if (!user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          const client = ws as AliveWebSocket;
          client.isAlive = true;
          client.meta = {
            channel: 'classroom',
            userId: user.sub,
            userEmail: user.email,
            fullName: user.fullName,
            role: user.role,
            classSessionId: classSessionIdParam,
          };

          let room = classroomRooms.get(classSessionIdParam);
          if (!room) {
            room = new Set();
            classroomRooms.set(classSessionIdParam, room);
          }
          room.add(client);

          client.on('pong', () => {
            client.isAlive = true;
          });
          client.on('message', (buf) => {
            handleCallAndWebRtcSignal(client, buf.toString());
          });
          client.on('close', () => {
            const r = classroomRooms.get(classSessionIdParam);
            if (r) {
              r.delete(client);
              if (r.size === 0) classroomRooms.delete(classSessionIdParam);
            }
          });

          safeSend(client, {
            type: 'ws:ready',
            channel: 'classroom',
            classSessionId: classSessionIdParam,
            participantCount: room.size,
          });
        });
        return;
      }

      if (roleParam === 'admin') {
        const user = tokenParam ? verifyAccessToken(tokenParam) : null;
        if (!user || user.role !== 'Admin') {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          const client = ws as AliveWebSocket;
          client.isAlive = true;
          client.meta = {
            channel: 'admin',
            userId: user.sub,
            userEmail: user.email,
            fullName: user.fullName,
            role: user.role,
          };
          adminSockets.add(client);

          client.on('pong', () => {
            client.isAlive = true;
          });
          client.on('message', (buf) => {
            handleCallAndWebRtcSignal(client, buf.toString());
          });
          client.on('close', () => {
            adminSockets.delete(client);
          });

          safeSend(client, { type: 'ws:ready', channel: 'admin', userEmail: user.email });
        });
        return;
      }

      if (!sessionToken || sessionToken.length < 8 || sessionToken.length > 120) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      const existingConv = db
        .prepare('SELECT id FROM chat_conversations WHERE session_token = ?')
        .get(sessionToken) as { id: number } | undefined;

      if (!existingConv) {
        db.prepare(
          "INSERT OR IGNORE INTO chat_conversations (session_token, visitor_name, status) VALUES (?, 'Visitor', 'open')"
        ).run(sessionToken);
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        const client = ws as AliveWebSocket;
        client.isAlive = true;
        client.meta = {
          channel: 'visitor',
          sessionToken,
        };
        let room = visitorRooms.get(sessionToken);
        if (!room) {
          room = new Set();
          visitorRooms.set(sessionToken, room);
        }
        room.add(client);

        client.on('pong', () => {
          client.isAlive = true;
        });
        client.on('message', (buf) => {
          handleCallAndWebRtcSignal(client, buf.toString());
        });
        client.on('close', () => {
          const r = visitorRooms.get(sessionToken);
          if (r) {
            r.delete(client);
            if (r.size === 0) visitorRooms.delete(sessionToken);
          }
        });

        safeSend(client, { type: 'ws:ready', channel: 'visitor', sessionToken });
      });
    } catch {
      socket.destroy();
    }
  });

  const interval = setInterval(() => {
    for (const sock of adminSockets) {
      if (sock.isAlive === false) {
        adminSockets.delete(sock);
        sock.terminate();
        continue;
      }
      sock.isAlive = false;
      sock.ping();
    }
    for (const [key, room] of visitorRooms.entries()) {
      for (const sock of room) {
        if (sock.isAlive === false) {
          room.delete(sock);
          sock.terminate();
          continue;
        }
        sock.isAlive = false;
        sock.ping();
      }
      if (room.size === 0) visitorRooms.delete(key);
    }
    for (const [key, room] of classroomRooms.entries()) {
      for (const sock of room) {
        if (sock.isAlive === false) {
          room.delete(sock);
          sock.terminate();
          continue;
        }
        sock.isAlive = false;
        sock.ping();
      }
      if (room.size === 0) classroomRooms.delete(key);
    }
  }, 30000);

  interval.unref();
}

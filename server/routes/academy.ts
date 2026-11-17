import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../db.ts';
import {
  AuthenticatedRequest,
  recordAuditLog,
  requireAdmin,
  requireAuth,
  tryGetAuthUser,
} from '../auth.ts';
import { broadcastToAdmins, broadcastToClassroom } from '../realtime.ts';
import {
  PRIVATE_VIDEOS_DIR,
  PRIVATE_VOICE_DIR,
  recordSecurityEvent,
  resolveVideoPath,
  verifyFileMagicBytes,
} from '../security.ts';

export const academyRouter = Router();

fs.mkdirSync(PRIVATE_VIDEOS_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_VOICE_DIR, { recursive: true });

const uploadClassroomVoice = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PRIVATE_VOICE_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.webm';
      const rand = crypto.randomBytes(6).toString('hex');
      cb(null, `class-voice-${Date.now()}-${rand}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function sanitizePlain(val: string): string {
  return val.replace(/[<>]/g, '').trim();
}

const allowedVideoMimes = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'application/ogg',
  'video/x-m4v',
  'video/x-matroska',
]);

const uploadVideo = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PRIVATE_VIDEOS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.mp4';
      const base =
        path
          .basename(file.originalname, path.extname(file.originalname))
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .slice(0, 32) || 'lecture';
      const rand = crypto.randomBytes(4).toString('hex');
      cb(null, `${Date.now()}-${rand}-${base}${ext}`);
    },
  }),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okExt = ['.mp4', '.webm', '.mov', '.ogg', '.m4v', '.mkv'].includes(ext);
    if (allowedVideoMimes.has(file.mimetype) || okExt) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed video formats: MP4, WebM, MOV, OGG.'));
    }
  },
});

function getVideoMimeByExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webm') return 'video/webm';
  if (ext === '.ogg' || ext === '.ogv') return 'video/ogg';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.mkv') return 'video/x-matroska';
  return 'video/mp4';
}

function findStudentForUser(userId: number, email: string): Record<string, unknown> | undefined {
  const normalized = email.trim().toLowerCase();
  let student = db
    .prepare(
      `SELECT s.*, sc.name AS class_name, sc.code AS class_code, cs.name AS section_name, cs.room_label, cs.class_teacher
       FROM students s
       JOIN school_classes sc ON sc.id = s.class_id
       JOIN class_sections cs ON cs.id = s.section_id
       WHERE s.user_id = ?
       ORDER BY s.id DESC LIMIT 1`
    )
    .get(userId) as Record<string, unknown> | undefined;

  if (!student) {
    student = db
      .prepare(
        `SELECT s.*, sc.name AS class_name, sc.code AS class_code, cs.name AS section_name, cs.room_label, cs.class_teacher
         FROM students s
         JOIN school_classes sc ON sc.id = s.class_id
         JOIN class_sections cs ON cs.id = s.section_id
         WHERE lower(s.email) = ?
         ORDER BY s.id DESC LIMIT 1`
      )
      .get(normalized) as Record<string, unknown> | undefined;

    if (student && !student.user_id) {
      db.prepare('UPDATE students SET user_id = ? WHERE id = ?').run(userId, student.id);
      student.user_id = userId;
    }
  }
  return student;
}

function mapStudentRow(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    studentCode: String(r.student_code),
    fullName: String(r.full_name),
    email: String(r.email),
    phone: String(r.phone || ''),
    classId: Number(r.class_id),
    className: r.class_name ? String(r.class_name) : '',
    classCode: r.class_code ? String(r.class_code) : '',
    sectionId: Number(r.section_id),
    sectionName: r.section_name ? String(r.section_name) : '',
    roomLabel: r.room_label ? String(r.room_label) : '',
    classTeacher: r.class_teacher ? String(r.class_teacher) : '',
    rollNumber: String(r.roll_number || ''),
    guardianName: String(r.guardian_name || ''),
    guardianPhone: String(r.guardian_phone || ''),
    address: String(r.address || ''),
    status: String(r.status) as 'active' | 'inactive' | 'graduated',
    userId: r.user_id != null ? Number(r.user_id) : null,
    enrolledAt: String(r.enrolled_at || r.created_at),
  };
}

function mapOnlineClassRow(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    title: String(r.title),
    subject: String(r.subject),
    classId: Number(r.class_id),
    className: String(r.class_name || ''),
    classCode: String(r.class_code || ''),
    sectionId: r.section_id != null ? Number(r.section_id) : null,
    sectionName: r.section_name ? String(r.section_name) : 'All Sections',
    instructorName: String(r.instructor_name || 'Pramesh Bhattarai'),
    description: String(r.description || ''),
    scheduledDate: String(r.scheduled_date),
    startTime: String(r.start_time),
    durationMinutes: Number(r.duration_minutes || 60),
    meetingUrl: String(r.meeting_url || ''),
    status: String(r.status) as 'scheduled' | 'live' | 'completed' | 'cancelled',
    autoAttendance: Boolean(r.auto_attendance),
    createdAt: String(r.created_at),
  };
}

function mapVideoRow(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    title: String(r.title),
    subject: String(r.subject),
    classId: Number(r.class_id),
    className: String(r.class_name || ''),
    sectionId: r.section_id != null ? Number(r.section_id) : null,
    sectionName: r.section_name ? String(r.section_name) : 'All Sections',
    description: String(r.description || ''),
    sourceType: String(r.source_type) as 'upload' | 'link',
    videoUrl: String(r.video_url),
    fileName: r.file_name ? String(r.file_name) : null,
    durationLabel: String(r.duration_label || ''),
    instructorName: String(r.instructor_name || 'Pramesh Bhattarai'),
    notesUrl: String(r.notes_url || ''),
    isPublished: Boolean(r.is_published),
    viewsCount: Number(r.views_count || 0),
    createdAt: String(r.created_at),
  };
}

// =========================================================================
// PUBLIC & STUDENT ACADEMY ENDPOINTS (/api/v1/academy/*)
// =========================================================================

academyRouter.get('/academy/classes', (_req, res) => {
  const classes = db
    .prepare('SELECT * FROM school_classes WHERE is_active = 1 ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];

  const sections = db
    .prepare(
      `SELECT cs.*, COUNT(s.id) AS students_count
       FROM class_sections cs
       LEFT JOIN students s ON s.section_id = cs.id AND s.status = 'active'
       GROUP BY cs.id
       ORDER BY cs.id ASC`
    )
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: classes.map((c) => ({
      id: Number(c.id),
      name: String(c.name),
      code: String(c.code),
      description: String(c.description || ''),
      academicYear: String(c.academic_year || '2026'),
      isActive: Boolean(c.is_active),
      displayOrder: Number(c.display_order || 0),
      sections: sections
        .filter((s) => Number(s.class_id) === Number(c.id))
        .map((s) => ({
          id: Number(s.id),
          classId: Number(s.class_id),
          name: String(s.name),
          roomLabel: String(s.room_label || ''),
          classTeacher: String(s.class_teacher || ''),
          capacity: Number(s.capacity || 50),
          studentsCount: Number(s.students_count || 0),
        })),
    })),
  });
});

academyRouter.get('/academy/online-classes', (req, res) => {
  const classId = Number(req.query.classId || 0);
  const sectionId = Number(req.query.sectionId || 0);

  let sql = `
    SELECT oc.*, sc.name AS class_name, sc.code AS class_code, cs.name AS section_name
    FROM online_classes oc
    JOIN school_classes sc ON sc.id = oc.class_id
    LEFT JOIN class_sections cs ON cs.id = oc.section_id
    WHERE sc.is_active = 1
  `;
  const params: unknown[] = [];

  if (classId > 0) {
    sql += ' AND oc.class_id = ?';
    params.push(classId);
  }
  if (sectionId > 0) {
    sql += ' AND (oc.section_id = ? OR oc.section_id IS NULL)';
    params.push(sectionId);
  }

  sql += " ORDER BY CASE oc.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END, oc.scheduled_date DESC, oc.id DESC";
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  res.json({ success: true, data: rows.map(mapOnlineClassRow) });
});

academyRouter.get('/academy/videos', (req, res) => {
  const classId = Number(req.query.classId || 0);
  const sectionId = Number(req.query.sectionId || 0);

  let sql = `
    SELECT cv.*, sc.name AS class_name, cs.name AS section_name
    FROM class_videos cv
    JOIN school_classes sc ON sc.id = cv.class_id
    LEFT JOIN class_sections cs ON cs.id = cv.section_id
    WHERE cv.is_published = 1 AND sc.is_active = 1
  `;
  const params: unknown[] = [];
  if (classId > 0) {
    sql += ' AND cv.class_id = ?';
    params.push(classId);
  }
  if (sectionId > 0) {
    sql += ' AND (cv.section_id = ? OR cv.section_id IS NULL)';
    params.push(sectionId);
  }
  sql += ' ORDER BY cv.id DESC';
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  res.json({ success: true, data: rows.map(mapVideoRow) });
});

academyRouter.get('/academy/videos/:id/stream', (req, res) => {
  const id = Number(req.params.id);
  const video = db.prepare('SELECT * FROM class_videos WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!video || !video.file_name) {
    res.status(404).json({ success: false, message: 'Uploaded video not found.', data: null });
    return;
  }

  if (!video.is_published) {
    const tokenParam = typeof req.query.token === 'string' ? req.query.token : '';
    const authUser = tryGetAuthUser(req) || (tokenParam ? null : null);
    if (!authUser || authUser.role !== 'Admin') {
      res.status(403).json({ success: false, message: 'Video is unpublished.', data: null });
      return;
    }
  }

  const filePath = resolveVideoPath(String(video.file_name));
  if (!filePath) {
    res.status(404).json({ success: false, message: 'Video file missing on server.', data: null });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mime = getVideoMimeByExt(filePath);
  const range = req.headers.range;

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(parts[0] || '0', 10);
    const end = parts[1] ? Number.parseInt(parts[1], 10) : Math.min(start + 1024 * 1024 * 2, fileSize - 1);

    if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mime,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mime,
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

academyRouter.post('/academy/videos/:id/view', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE class_videos SET views_count = views_count + 1 WHERE id = ?').run(id);
  res.json({ success: true, data: { tracked: true } });
});

academyRouter.get('/academy/timetable', (req, res) => {
  const classId = Number(req.query.classId || 0);
  const sectionId = Number(req.query.sectionId || 0);

  let sql = `
    SELECT ct.*, sc.name AS class_name, cs.name AS section_name
    FROM class_timetable ct
    JOIN school_classes sc ON sc.id = ct.class_id
    JOIN class_sections cs ON cs.id = ct.section_id
    WHERE sc.is_active = 1
  `;
  const params: unknown[] = [];
  if (classId > 0) {
    sql += ' AND ct.class_id = ?';
    params.push(classId);
  }
  if (sectionId > 0) {
    sql += ' AND ct.section_id = ?';
    params.push(sectionId);
  }
  sql += ' ORDER BY ct.start_time ASC, ct.id ASC';

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      classId: Number(r.class_id),
      className: String(r.class_name),
      sectionId: Number(r.section_id),
      sectionName: String(r.section_name),
      dayOfWeek: String(r.day_of_week),
      startTime: String(r.start_time),
      endTime: String(r.end_time),
      subject: String(r.subject),
      instructorName: String(r.instructor_name),
      roomOrMode: String(r.room_or_mode),
    })),
  });
});

academyRouter.get('/academy/notices', (req, res) => {
  const classId = Number(req.query.classId || 0);
  const sectionId = Number(req.query.sectionId || 0);

  let sql = `
    SELECT an.*, sc.name AS class_name, cs.name AS section_name
    FROM academy_notices an
    LEFT JOIN school_classes sc ON sc.id = an.class_id
    LEFT JOIN class_sections cs ON cs.id = an.section_id
    WHERE 1 = 1
  `;
  const params: unknown[] = [];
  if (classId > 0) {
    sql += ' AND (an.class_id = ? OR an.class_id IS NULL)';
    params.push(classId);
  }
  if (sectionId > 0) {
    sql += ' AND (an.section_id = ? OR an.section_id IS NULL)';
    params.push(sectionId);
  }
  sql += ' ORDER BY an.id DESC LIMIT 30';

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      classId: r.class_id != null ? Number(r.class_id) : null,
      className: r.class_name ? String(r.class_name) : 'All Classes',
      sectionId: r.section_id != null ? Number(r.section_id) : null,
      sectionName: r.section_name ? String(r.section_name) : 'All Sections',
      title: String(r.title),
      content: String(r.content),
      priority: String(r.priority) as 'normal' | 'important' | 'urgent',
      publishedBy: String(r.published_by),
      createdAt: String(r.created_at),
    })),
  });
});

// Live Online Class Chat + Join Attendance
academyRouter.get('/academy/online-classes/:id/messages', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const rows = db
    .prepare('SELECT * FROM online_class_messages WHERE online_class_id = ? ORDER BY id ASC LIMIT 150')
    .all(id) as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      onlineClassId: Number(r.online_class_id),
      senderName: String(r.sender_name),
      senderRole: String(r.sender_role),
      message: String(r.message),
      messageType: String(r.message_type || 'text') as 'text' | 'voice' | 'call_log',
      mediaUrl: r.media_url ? String(r.media_url) : null,
      mediaDurationSec: r.media_duration_sec != null ? Number(r.media_duration_sec) : null,
      createdAt: String(r.created_at),
    })),
  });
});

academyRouter.post('/academy/online-classes/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const msgText = sanitizePlain(String(req.body?.message || ''));
  if (!msgText || msgText.length > 1000) {
    res.status(400).json({ success: false, message: 'Message must be between 1 and 1000 characters.', data: null });
    return;
  }

  const session = db.prepare('SELECT id FROM online_classes WHERE id = ?').get(id) as { id: number } | undefined;
  if (!session) {
    res.status(404).json({ success: false, message: 'Online class not found.', data: null });
    return;
  }

  const senderRole = req.user!.role === 'Admin' ? 'Instructor' : 'Student';
  const info = db
    .prepare(
      "INSERT INTO online_class_messages (online_class_id, sender_user_id, sender_name, sender_role, message, message_type) VALUES (?, ?, ?, ?, ?, 'text')"
    )
    .run(id, req.user!.sub, req.user!.fullName, senderRole, msgText);

  const mapped = {
    id: Number(info.lastInsertRowid),
    onlineClassId: id,
    senderName: req.user!.fullName,
    senderRole,
    message: msgText,
    messageType: 'text' as const,
    mediaUrl: null,
    mediaDurationSec: null,
    createdAt: new Date().toISOString(),
  };

  broadcastToClassroom(id, {
    type: 'classroom:message',
    onlineClassId: id,
    message: mapped,
  });

  res.status(201).json({ success: true, data: mapped });
});

academyRouter.post(
  '/academy/online-classes/:id/voice',
  requireAuth,
  uploadClassroomVoice.single('audio'),
  (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Voice recording file is required.', data: null });
      return;
    }

    const mime = (req.file.mimetype || 'audio/webm').split(';')[0].trim().toLowerCase();
    if (!verifyFileMagicBytes(req.file.path, mime)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: 'Invalid audio file signature.', data: null });
      return;
    }

    const session = db.prepare('SELECT id FROM online_classes WHERE id = ?').get(id) as { id: number } | undefined;
    if (!session) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ success: false, message: 'Online class not found.', data: null });
      return;
    }

    const durationSec = Math.max(1, Math.min(600, Math.round(Number(req.body?.durationSec || 0))));
    const mediaUrl = `/api/v1/chat/voice/${req.file.filename}`;
    const senderRole = req.user!.role === 'Admin' ? 'Instructor' : 'Student';

    const info = db
      .prepare(
        "INSERT INTO online_class_messages (online_class_id, sender_user_id, sender_name, sender_role, message, message_type, media_url, media_duration_sec) VALUES (?, ?, ?, ?, ?, 'voice', ?, ?)"
      )
      .run(id, req.user!.sub, req.user!.fullName, senderRole, `Voice note (${durationSec}s)`, mediaUrl, durationSec);

    const mapped = {
      id: Number(info.lastInsertRowid),
      onlineClassId: id,
      senderName: req.user!.fullName,
      senderRole,
      message: `Voice note (${durationSec}s)`,
      messageType: 'voice' as const,
      mediaUrl,
      mediaDurationSec: durationSec,
      createdAt: new Date().toISOString(),
    };

    broadcastToClassroom(id, {
      type: 'classroom:message',
      onlineClassId: id,
      message: mapped,
    });

    res.status(201).json({ success: true, data: mapped });
  }
);

academyRouter.post('/academy/online-classes/:id/join', requireAuth, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const oc = db
    .prepare(
      `SELECT oc.*, sc.name AS class_name, sc.code AS class_code, cs.name AS section_name
       FROM online_classes oc
       JOIN school_classes sc ON sc.id = oc.class_id
       LEFT JOIN class_sections cs ON cs.id = oc.section_id
       WHERE oc.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;

  if (!oc) {
    res.status(404).json({ success: false, message: 'Online class session not found.', data: null });
    return;
  }

  let attendanceMarked = false;
  const student = findStudentForUser(req.user!.sub, req.user!.email);
  const today = new Date().toISOString().slice(0, 10);

  if (
    student &&
    Boolean(oc.auto_attendance) &&
    oc.status === 'live' &&
    Number(student.class_id) === Number(oc.class_id) &&
    (oc.section_id == null || Number(student.section_id) === Number(oc.section_id))
  ) {
    db.prepare(
      `INSERT INTO student_attendance (student_id, class_id, section_id, attendance_date, online_class_id, status, remarks, marked_by)
       VALUES (?, ?, ?, ?, ?, 'present', ?, 'Online Class Auto-Checkin')
       ON CONFLICT(student_id, attendance_date, class_id)
       DO UPDATE SET status = 'present', online_class_id = excluded.online_class_id, remarks = excluded.remarks, marked_by = excluded.marked_by, marked_at = datetime('now')`
    ).run(
      student.id,
      student.class_id,
      student.section_id,
      today,
      id,
      `Joined live class: ${String(oc.title)}`
    );
    attendanceMarked = true;

    broadcastToClassroom(id, {
      type: 'classroom:attendance',
      onlineClassId: id,
      studentName: String(student.full_name),
      attendanceDate: today,
    });
  }

  res.json({
    success: true,
    message: attendanceMarked
      ? 'Joined live class and marked Present for today!'
      : 'Connected to live class room.',
    data: {
      onlineClass: mapOnlineClassRow(oc),
      attendanceMarked,
    },
  });
});

// Student Personal Portal Dashboard (/api/v1/academy/student/*)
academyRouter.get('/academy/student/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const student = findStudentForUser(req.user!.sub, req.user!.email);
  if (!student) {
    res.json({
      success: true,
      data: {
        enrolled: false,
        student: null,
        attendanceSummary: { totalDays: 0, presentCount: 0, lateCount: 0, absentCount: 0, excusedCount: 0, percentage: 0 },
        attendanceRecords: [],
        onlineClasses: [],
        videos: [],
        timetable: [],
        assignments: [],
        notices: [],
      },
    });
    return;
  }

  const classId = Number(student.class_id);
  const sectionId = Number(student.section_id);

  const attendanceRows = db
    .prepare(
      'SELECT * FROM student_attendance WHERE student_id = ? ORDER BY attendance_date DESC, id DESC LIMIT 90'
    )
    .all(student.id) as Record<string, unknown>[];

  const totalDays = attendanceRows.length;
  const presentCount = attendanceRows.filter((r) => r.status === 'present').length;
  const lateCount = attendanceRows.filter((r) => r.status === 'late').length;
  const absentCount = attendanceRows.filter((r) => r.status === 'absent').length;
  const excusedCount = attendanceRows.filter((r) => r.status === 'excused').length;
  const percentage = totalDays > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalDays) * 100) : 100;

  const onlineClasses = db
    .prepare(
      `SELECT oc.*, sc.name AS class_name, sc.code AS class_code, cs.name AS section_name
       FROM online_classes oc
       JOIN school_classes sc ON sc.id = oc.class_id
       LEFT JOIN class_sections cs ON cs.id = oc.section_id
       WHERE oc.class_id = ? AND (oc.section_id = ? OR oc.section_id IS NULL)
       ORDER BY CASE oc.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END, oc.scheduled_date DESC, oc.id DESC`
    )
    .all(classId, sectionId) as Record<string, unknown>[];

  const videos = db
    .prepare(
      `SELECT cv.*, sc.name AS class_name, cs.name AS section_name
       FROM class_videos cv
       JOIN school_classes sc ON sc.id = cv.class_id
       LEFT JOIN class_sections cs ON cs.id = cv.section_id
       WHERE cv.is_published = 1 AND cv.class_id = ? AND (cv.section_id = ? OR cv.section_id IS NULL)
       ORDER BY cv.id DESC`
    )
    .all(classId, sectionId) as Record<string, unknown>[];

  const timetable = db
    .prepare(
      `SELECT ct.*, sc.name AS class_name, cs.name AS section_name
       FROM class_timetable ct
       JOIN school_classes sc ON sc.id = ct.class_id
       JOIN class_sections cs ON cs.id = ct.section_id
       WHERE ct.class_id = ? AND ct.section_id = ?
       ORDER BY ct.start_time ASC`
    )
    .all(classId, sectionId) as Record<string, unknown>[];

  const assignments = db
    .prepare(
      `SELECT ca.*, sub.id AS submission_id, sub.submission_text, sub.submission_url, sub.marks_obtained, sub.feedback, sub.status AS submission_status, sub.submitted_at
       FROM class_assignments ca
       LEFT JOIN assignment_submissions sub ON sub.assignment_id = ca.id AND sub.student_id = ?
       WHERE ca.class_id = ? AND (ca.section_id = ? OR ca.section_id IS NULL)
       ORDER BY ca.due_date ASC, ca.id DESC`
    )
    .all(student.id, classId, sectionId) as Record<string, unknown>[];

  const notices = db
    .prepare(
      `SELECT an.*, sc.name AS class_name, cs.name AS section_name
       FROM academy_notices an
       LEFT JOIN school_classes sc ON sc.id = an.class_id
       LEFT JOIN class_sections cs ON cs.id = an.section_id
       WHERE (an.class_id = ? OR an.class_id IS NULL) AND (an.section_id = ? OR an.section_id IS NULL)
       ORDER BY an.id DESC LIMIT 20`
    )
    .all(classId, sectionId) as Record<string, unknown>[];

  res.json({
    success: true,
    data: {
      enrolled: true,
      student: mapStudentRow(student),
      attendanceSummary: {
        totalDays,
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
        percentage,
      },
      attendanceRecords: attendanceRows.map((r) => ({
        id: Number(r.id),
        attendanceDate: String(r.attendance_date),
        status: String(r.status) as 'present' | 'absent' | 'late' | 'excused',
        remarks: String(r.remarks || ''),
        markedBy: String(r.marked_by || ''),
      })),
      onlineClasses: onlineClasses.map(mapOnlineClassRow),
      videos: videos.map(mapVideoRow),
      timetable: timetable.map((r) => ({
        id: Number(r.id),
        classId: Number(r.class_id),
        className: String(r.class_name),
        sectionId: Number(r.section_id),
        sectionName: String(r.section_name),
        dayOfWeek: String(r.day_of_week),
        startTime: String(r.start_time),
        endTime: String(r.end_time),
        subject: String(r.subject),
        instructorName: String(r.instructor_name),
        roomOrMode: String(r.room_or_mode),
      })),
      assignments: assignments.map((a) => ({
        id: Number(a.id),
        title: String(a.title),
        subject: String(a.subject),
        description: String(a.description || ''),
        dueDate: String(a.due_date),
        maxMarks: Number(a.max_marks || 100),
        submission: a.submission_id
          ? {
              id: Number(a.submission_id),
              submissionText: String(a.submission_text || ''),
              submissionUrl: String(a.submission_url || ''),
              marksObtained: a.marks_obtained != null ? Number(a.marks_obtained) : null,
              feedback: String(a.feedback || ''),
              status: String(a.submission_status) as 'submitted' | 'graded',
              submittedAt: String(a.submitted_at),
            }
          : null,
      })),
      notices: notices.map((r) => ({
        id: Number(r.id),
        className: r.class_name ? String(r.class_name) : 'All Classes',
        sectionName: r.section_name ? String(r.section_name) : 'All Sections',
        title: String(r.title),
        content: String(r.content),
        priority: String(r.priority) as 'normal' | 'important' | 'urgent',
        publishedBy: String(r.published_by),
        createdAt: String(r.created_at),
      })),
    },
  });
});

const selfEnrollSchema = z.object({
  classId: z.number().int().positive(),
  sectionId: z.number().int().positive(),
  phone: z.string().trim().max(40).optional().default(''),
  guardianName: z.string().trim().max(120).optional().default(''),
  address: z.string().trim().max(240).optional().default(''),
});

academyRouter.post('/academy/student/enroll', requireAuth, (req: AuthenticatedRequest, res) => {
  const parsed = selfEnrollSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Please select a valid class and section.', data: null });
    return;
  }

  const existing = findStudentForUser(req.user!.sub, req.user!.email);
  if (existing) {
    res.status(409).json({
      success: false,
      message: `You are already enrolled as ${String(existing.student_code)} in ${String(existing.class_name)}.`,
      data: null,
    });
    return;
  }

  const d = parsed.data;
  const sec = db
    .prepare('SELECT id, class_id FROM class_sections WHERE id = ? AND class_id = ?')
    .get(d.sectionId, d.classId) as { id: number; class_id: number } | undefined;
  if (!sec) {
    res.status(404).json({ success: false, message: 'Selected class or section not found.', data: null });
    return;
  }

  const countInSec = (
    db.prepare('SELECT COUNT(*) as cnt FROM students WHERE section_id = ?').get(d.sectionId) as { cnt: number }
  ).cnt;
  const totalStudents = (db.prepare('SELECT COUNT(*) as cnt FROM students').get() as { cnt: number }).cnt;
  const studentCode = `STU-2026-${String(totalStudents + 101).padStart(3, '0')}`;
  const rollNumber = String(countInSec + 1).padStart(2, '0');

  const info = db
    .prepare(
      `INSERT INTO students (student_code, full_name, email, phone, class_id, section_id, roll_number, guardian_name, address, status, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
    )
    .run(
      studentCode,
      req.user!.fullName,
      req.user!.email.toLowerCase(),
      sanitizePlain(d.phone),
      d.classId,
      d.sectionId,
      rollNumber,
      sanitizePlain(d.guardianName),
      sanitizePlain(d.address),
      req.user!.sub
    );

  broadcastToAdmins({
    type: 'admin:notification',
    id: `stu-${info.lastInsertRowid}`,
    category: 'system',
    title: 'New Student Enrolled',
    message: `${req.user!.fullName} enrolled (${studentCode})`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: `Enrolled successfully! Student ID: ${studentCode}, Roll No: ${rollNumber}`,
    data: { id: Number(info.lastInsertRowid), studentCode, rollNumber },
  });
});

const submissionSchema = z.object({
  submissionText: z.string().trim().min(3, 'Please enter your work notes or explanation.').max(4000),
  submissionUrl: z.string().trim().max(500).optional().default(''),
});

academyRouter.post('/academy/student/assignments/:assignmentId/submit', requireAuth, (req: AuthenticatedRequest, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const student = findStudentForUser(req.user!.sub, req.user!.email);
  if (!student) {
    res.status(403).json({ success: false, message: 'Only enrolled students can submit assignments.', data: null });
    return;
  }

  const assignment = db.prepare('SELECT id, class_id, section_id FROM class_assignments WHERE id = ?').get(assignmentId) as
    | { id: number; class_id: number; section_id: number | null }
    | undefined;
  if (!assignment || assignment.class_id !== Number(student.class_id)) {
    res.status(404).json({ success: false, message: 'Assignment not found for your class.', data: null });
    return;
  }

  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid submission.',
      data: null,
    });
    return;
  }

  db.prepare(
    `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, submission_url, status, submitted_at)
     VALUES (?, ?, ?, ?, 'submitted', datetime('now'))
     ON CONFLICT(assignment_id, student_id)
     DO UPDATE SET submission_text = excluded.submission_text, submission_url = excluded.submission_url, status = 'submitted', submitted_at = datetime('now')`
  ).run(
    assignmentId,
    student.id,
    sanitizePlain(parsed.data.submissionText),
    sanitizePlain(parsed.data.submissionUrl)
  );

  res.json({ success: true, message: 'Assignment submitted successfully.', data: { assignmentId } });
});

// =========================================================================
// ADMIN ACADEMY MANAGEMENT ROUTES (/api/v1/admin/academy/*)
// =========================================================================

academyRouter.use('/admin/academy', requireAuth, requireAdmin);

academyRouter.get('/admin/academy/overview', (_req, res) => {
  const count = (sql: string) => (db.prepare(sql).get() as { cnt: number }).cnt;
  const today = new Date().toISOString().slice(0, 10);
  const todayTotal = (
    db.prepare('SELECT COUNT(*) as cnt FROM student_attendance WHERE attendance_date = ?').get(today) as { cnt: number }
  ).cnt;
  const todayPresent = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM student_attendance WHERE attendance_date = ? AND status IN ('present', 'late')")
      .get(today) as { cnt: number }
  ).cnt;

  res.json({
    success: true,
    data: {
      classesCount: count('SELECT COUNT(*) as cnt FROM school_classes WHERE is_active = 1'),
      sectionsCount: count('SELECT COUNT(*) as cnt FROM class_sections'),
      studentsCount: count("SELECT COUNT(*) as cnt FROM students WHERE status = 'active'"),
      liveClassesCount: count("SELECT COUNT(*) as cnt FROM online_classes WHERE status = 'live'"),
      scheduledClassesCount: count("SELECT COUNT(*) as cnt FROM online_classes WHERE status IN ('live', 'scheduled')"),
      videosCount: count('SELECT COUNT(*) as cnt FROM class_videos'),
      assignmentsCount: count('SELECT COUNT(*) as cnt FROM class_assignments'),
      noticesCount: count('SELECT COUNT(*) as cnt FROM academy_notices'),
      todayAttendanceMarked: todayTotal,
      todayPresentCount: todayPresent,
    },
  });
});

// Classes & Sections CRUD
const classSchema = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(2).max(40),
  description: z.string().trim().max(1000).optional().default(''),
  academicYear: z.string().trim().max(20).optional().default('2026'),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().optional().default(0),
});

academyRouter.get('/admin/academy/classes', (_req, res) => {
  const classes = db
    .prepare('SELECT * FROM school_classes ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];
  const sections = db
    .prepare(
      `SELECT cs.*, COUNT(s.id) AS students_count
       FROM class_sections cs
       LEFT JOIN students s ON s.section_id = cs.id
       GROUP BY cs.id
       ORDER BY cs.id ASC`
    )
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: classes.map((c) => ({
      id: Number(c.id),
      name: String(c.name),
      code: String(c.code),
      description: String(c.description || ''),
      academicYear: String(c.academic_year || '2026'),
      isActive: Boolean(c.is_active),
      displayOrder: Number(c.display_order || 0),
      sections: sections
        .filter((s) => Number(s.class_id) === Number(c.id))
        .map((s) => ({
          id: Number(s.id),
          classId: Number(s.class_id),
          name: String(s.name),
          roomLabel: String(s.room_label || ''),
          classTeacher: String(s.class_teacher || ''),
          capacity: Number(s.capacity || 50),
          studentsCount: Number(s.students_count || 0),
        })),
    })),
  });
});

academyRouter.post('/admin/academy/classes', (req: AuthenticatedRequest, res) => {
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid class payload.', data: null });
    return;
  }
  const d = parsed.data;
  const dup = db.prepare('SELECT id FROM school_classes WHERE upper(code) = ?').get(d.code.toUpperCase());
  if (dup) {
    res.status(409).json({ success: false, message: 'Class code already exists.', data: null });
    return;
  }
  const info = db
    .prepare(
      'INSERT INTO school_classes (name, code, description, academic_year, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(sanitizePlain(d.name), d.code.toUpperCase(), sanitizePlain(d.description), d.academicYear, d.isActive ? 1 : 0, d.displayOrder);
  recordAuditLog(req.user!.email, 'CREATE', 'SchoolClass', Number(info.lastInsertRowid), d.name);
  res.status(201).json({ success: true, message: 'Class created.', data: { id: Number(info.lastInsertRowid) } });
});

academyRouter.put('/admin/academy/classes/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid class payload.', data: null });
    return;
  }
  const d = parsed.data;
  db.prepare(
    'UPDATE school_classes SET name = ?, code = ?, description = ?, academic_year = ?, is_active = ?, display_order = ? WHERE id = ?'
  ).run(sanitizePlain(d.name), d.code.toUpperCase(), sanitizePlain(d.description), d.academicYear, d.isActive ? 1 : 0, d.displayOrder, id);
  recordAuditLog(req.user!.email, 'UPDATE', 'SchoolClass', id, d.name);
  res.json({ success: true, message: 'Class updated.', data: { id } });
});

academyRouter.delete('/admin/academy/classes/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM school_classes WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'SchoolClass', id, 'Deleted class');
  res.json({ success: true, message: 'Class deleted.', data: null });
});

const sectionSchema = z.object({
  classId: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  roomLabel: z.string().trim().max(120).optional().default(''),
  classTeacher: z.string().trim().max(120).optional().default('Pramesh Bhattarai'),
  capacity: z.number().int().min(1).max(500).optional().default(50),
});

academyRouter.post('/admin/academy/sections', (req: AuthenticatedRequest, res) => {
  const parsed = sectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid section details.', data: null });
    return;
  }
  const d = parsed.data;
  const dup = db
    .prepare('SELECT id FROM class_sections WHERE class_id = ? AND lower(name) = ?')
    .get(d.classId, d.name.toLowerCase());
  if (dup) {
    res.status(409).json({ success: false, message: 'Section name already exists in this class.', data: null });
    return;
  }
  const info = db
    .prepare('INSERT INTO class_sections (class_id, name, room_label, class_teacher, capacity) VALUES (?, ?, ?, ?, ?)')
    .run(d.classId, sanitizePlain(d.name), sanitizePlain(d.roomLabel), sanitizePlain(d.classTeacher), d.capacity);
  recordAuditLog(req.user!.email, 'CREATE', 'ClassSection', Number(info.lastInsertRowid), d.name);
  res.status(201).json({ success: true, message: 'Section added.', data: { id: Number(info.lastInsertRowid) } });
});

academyRouter.put('/admin/academy/sections/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = sectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid section details.', data: null });
    return;
  }
  const d = parsed.data;
  db.prepare(
    'UPDATE class_sections SET class_id = ?, name = ?, room_label = ?, class_teacher = ?, capacity = ? WHERE id = ?'
  ).run(d.classId, sanitizePlain(d.name), sanitizePlain(d.roomLabel), sanitizePlain(d.classTeacher), d.capacity, id);
  res.json({ success: true, message: 'Section updated.', data: { id } });
});

academyRouter.delete('/admin/academy/sections/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM class_sections WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'ClassSection', id, 'Deleted section');
  res.json({ success: true, message: 'Section deleted.', data: null });
});

// Students Directory CRUD
academyRouter.get('/admin/academy/students', (req, res) => {
  const classId = Number(req.query.classId || 0);
  const sectionId = Number(req.query.sectionId || 0);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  let sql = `
    SELECT s.*, sc.name AS class_name, sc.code AS class_code, cs.name AS section_name, cs.room_label, cs.class_teacher
    FROM students s
    JOIN school_classes sc ON sc.id = s.class_id
    JOIN class_sections cs ON cs.id = s.section_id
    WHERE 1 = 1
  `;
  const params: unknown[] = [];
  if (classId > 0) {
    sql += ' AND s.class_id = ?';
    params.push(classId);
  }
  if (sectionId > 0) {
    sql += ' AND s.section_id = ?';
    params.push(sectionId);
  }
  sql += ' ORDER BY s.class_id ASC, s.section_id ASC, s.roll_number ASC, s.id DESC';

  let rows = (db.prepare(sql).all(...params) as Record<string, unknown>[]).map(mapStudentRow);
  if (search) {
    rows = rows.filter(
      (st) =>
        st.fullName.toLowerCase().includes(search) ||
        st.studentCode.toLowerCase().includes(search) ||
        st.email.toLowerCase().includes(search) ||
        st.rollNumber.toLowerCase().includes(search)
    );
  }
  res.json({ success: true, data: rows });
});

const studentSchema = z.object({
  studentCode: z.string().trim().max(40).optional().default(''),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().default(''),
  classId: z.number().int().positive(),
  sectionId: z.number().int().positive(),
  rollNumber: z.string().trim().max(30).optional().default(''),
  guardianName: z.string().trim().max(120).optional().default(''),
  guardianPhone: z.string().trim().max(40).optional().default(''),
  address: z.string().trim().max(240).optional().default(''),
  status: z.enum(['active', 'inactive', 'graduated']).optional().default('active'),
  createPortalAccount: z.boolean().optional().default(false),
  portalPassword: z.string().max(120).optional().default(''),
});

academyRouter.post('/admin/academy/students', (req: AuthenticatedRequest, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid student payload.',
      data: null,
    });
    return;
  }

  const d = parsed.data;
  const normalizedEmail = d.email.toLowerCase();
  const existingUser = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(normalizedEmail) as
    | { id: number }
    | undefined;

  let linkedUserId: number | null = existingUser?.id ?? null;
  if (!linkedUserId && d.createPortalAccount && d.portalPassword && d.portalPassword.length >= 8) {
    const hash = bcrypt.hashSync(d.portalPassword, 10);
    const uInfo = db
      .prepare("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'Customer')")
      .run(normalizedEmail, hash, sanitizePlain(d.fullName));
    linkedUserId = Number(uInfo.lastInsertRowid);
  }

  const totalCount = (db.prepare('SELECT COUNT(*) as cnt FROM students').get() as { cnt: number }).cnt;
  const studentCode = d.studentCode.trim() || `STU-2026-${String(totalCount + 101).padStart(3, '0')}`;
  const secCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM students WHERE section_id = ?').get(d.sectionId) as { cnt: number }
  ).cnt;
  const rollNumber = d.rollNumber.trim() || String(secCount + 1).padStart(2, '0');

  const dupCode = db.prepare('SELECT id FROM students WHERE student_code = ?').get(studentCode);
  if (dupCode) {
    res.status(409).json({ success: false, message: `Student code ${studentCode} already exists.`, data: null });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO students (
         student_code, full_name, email, phone, class_id, section_id, roll_number,
         guardian_name, guardian_phone, address, status, user_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      studentCode,
      sanitizePlain(d.fullName),
      normalizedEmail,
      sanitizePlain(d.phone),
      d.classId,
      d.sectionId,
      sanitizePlain(rollNumber),
      sanitizePlain(d.guardianName),
      sanitizePlain(d.guardianPhone),
      sanitizePlain(d.address),
      d.status,
      linkedUserId
    );

  recordAuditLog(req.user!.email, 'CREATE', 'Student', Number(info.lastInsertRowid), `${studentCode} (${d.fullName})`);
  res.status(201).json({
    success: true,
    message: 'Student added.',
    data: { id: Number(info.lastInsertRowid), studentCode, rollNumber },
  });
});

academyRouter.put('/admin/academy/students/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid student details.', data: null });
    return;
  }
  const d = parsed.data;
  const normalizedEmail = d.email.toLowerCase();
  const existingUser = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(normalizedEmail) as
    | { id: number }
    | undefined;

  db.prepare(
    `UPDATE students SET
       full_name = ?, email = ?, phone = ?, class_id = ?, section_id = ?,
       roll_number = ?, guardian_name = ?, guardian_phone = ?, address = ?, status = ?,
       user_id = COALESCE(?, user_id)
     WHERE id = ?`
  ).run(
    sanitizePlain(d.fullName),
    normalizedEmail,
    sanitizePlain(d.phone),
    d.classId,
    d.sectionId,
    sanitizePlain(d.rollNumber),
    sanitizePlain(d.guardianName),
    sanitizePlain(d.guardianPhone),
    sanitizePlain(d.address),
    d.status,
    existingUser?.id ?? null,
    id
  );
  recordAuditLog(req.user!.email, 'UPDATE', 'Student', id, d.fullName);
  res.json({ success: true, message: 'Student updated.', data: { id } });
});

academyRouter.delete('/admin/academy/students/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM students WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Student', id, 'Removed student');
  res.json({ success: true, message: 'Student deleted.', data: null });
});

// Class & Section Attendance Register
academyRouter.get('/admin/academy/attendance', (req, res) => {
  const classId = Number(req.query.classId || 0);
  const sectionId = Number(req.query.sectionId || 0);
  const dateStr =
    typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : new Date().toISOString().slice(0, 10);

  if (!classId || !sectionId) {
    res.status(400).json({ success: false, message: 'classId and sectionId are required.', data: null });
    return;
  }

  const students = db
    .prepare(
      `SELECT s.*,
              att.status AS today_status,
              att.remarks AS today_remarks,
              att.marked_by,
              att.marked_at,
              (SELECT COUNT(*) FROM student_attendance a2 WHERE a2.student_id = s.id) AS total_days,
              (SELECT COUNT(*) FROM student_attendance a3 WHERE a3.student_id = s.id AND a3.status IN ('present', 'late')) AS present_days
       FROM students s
       LEFT JOIN student_attendance att ON att.student_id = s.id AND att.attendance_date = ? AND att.class_id = ?
       WHERE s.class_id = ? AND s.section_id = ? AND s.status = 'active'
       ORDER BY s.roll_number ASC, s.full_name ASC`
    )
    .all(dateStr, classId, classId, sectionId) as Record<string, unknown>[];

  res.json({
    success: true,
    data: {
      attendanceDate: dateStr,
      classId,
      sectionId,
      rows: students.map((r) => {
        const totalDays = Number(r.total_days || 0);
        const presentDays = Number(r.present_days || 0);
        return {
          studentId: Number(r.id),
          studentCode: String(r.student_code),
          rollNumber: String(r.roll_number || ''),
          fullName: String(r.full_name),
          email: String(r.email),
          status: r.today_status ? (String(r.today_status) as 'present' | 'absent' | 'late' | 'excused') : null,
          remarks: r.today_remarks ? String(r.today_remarks) : '',
          markedBy: r.marked_by ? String(r.marked_by) : null,
          attendancePercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100,
          totalRecordedDays: totalDays,
        };
      }),
    },
  });
});

const bulkAttendanceSchema = z.object({
  classId: z.number().int().positive(),
  sectionId: z.number().int().positive(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        status: z.enum(['present', 'absent', 'late', 'excused']),
        remarks: z.string().trim().max(240).optional().default(''),
      })
    )
    .min(1),
});

academyRouter.post('/admin/academy/attendance/bulk', (req: AuthenticatedRequest, res) => {
  const parsed = bulkAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid attendance payload.', data: null });
    return;
  }
  const d = parsed.data;
  const upsert = db.prepare(`
    INSERT INTO student_attendance (student_id, class_id, section_id, attendance_date, status, remarks, marked_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, attendance_date, class_id)
    DO UPDATE SET section_id = excluded.section_id, status = excluded.status, remarks = excluded.remarks, marked_by = excluded.marked_by, marked_at = datetime('now')
  `);

  const runBulk = db.transaction((items: typeof d.entries) => {
    for (const entry of items) {
      upsert.run(
        entry.studentId,
        d.classId,
        d.sectionId,
        d.attendanceDate,
        entry.status,
        sanitizePlain(entry.remarks),
        req.user!.fullName
      );
    }
  });
  runBulk(d.entries);

  recordAuditLog(
    req.user!.email,
    'UPDATE',
    'StudentAttendance',
    `${d.classId}:${d.sectionId}`,
    `Saved attendance for ${d.entries.length} student(s) on ${d.attendanceDate}`
  );
  res.json({ success: true, message: `Attendance saved for ${d.entries.length} student(s).`, data: null });
});

// Online Classes Admin CRUD & Live Controls
academyRouter.get('/admin/academy/online-classes', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT oc.*, sc.name AS class_name, sc.code AS class_code, cs.name AS section_name
       FROM online_classes oc
       JOIN school_classes sc ON sc.id = oc.class_id
       LEFT JOIN class_sections cs ON cs.id = oc.section_id
       ORDER BY oc.id DESC`
    )
    .all() as Record<string, unknown>[];
  res.json({ success: true, data: rows.map(mapOnlineClassRow) });
});

const onlineClassSchema = z.object({
  title: z.string().trim().min(2).max(180),
  subject: z.string().trim().min(2).max(120),
  classId: z.number().int().positive(),
  sectionId: z.number().int().positive().nullable().optional(),
  instructorName: z.string().trim().max(120).optional().default('Pramesh Bhattarai'),
  description: z.string().trim().max(2000).optional().default(''),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().trim().min(2).max(20),
  durationMinutes: z.number().int().min(5).max(480).optional().default(60),
  meetingUrl: z.string().trim().max(500).optional().default(''),
  status: z.enum(['scheduled', 'live', 'completed', 'cancelled']).optional().default('scheduled'),
  autoAttendance: z.boolean().optional().default(true),
});

academyRouter.post('/admin/academy/online-classes', (req: AuthenticatedRequest, res) => {
  const parsed = onlineClassSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid online class details.', data: null });
    return;
  }
  const d = parsed.data;
  const info = db
    .prepare(
      `INSERT INTO online_classes (
         title, subject, class_id, section_id, instructor_name, description,
         scheduled_date, start_time, duration_minutes, meeting_url, status, auto_attendance
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      sanitizePlain(d.title),
      sanitizePlain(d.subject),
      d.classId,
      d.sectionId ?? null,
      sanitizePlain(d.instructorName),
      sanitizePlain(d.description),
      d.scheduledDate,
      sanitizePlain(d.startTime),
      d.durationMinutes,
      d.meetingUrl.trim(),
      d.status,
      d.autoAttendance ? 1 : 0
    );
  recordAuditLog(req.user!.email, 'CREATE', 'OnlineClass', Number(info.lastInsertRowid), d.title);
  res.status(201).json({ success: true, message: 'Online class created.', data: { id: Number(info.lastInsertRowid) } });
});

academyRouter.put('/admin/academy/online-classes/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = onlineClassSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid online class details.', data: null });
    return;
  }
  const d = parsed.data;
  db.prepare(
    `UPDATE online_classes SET
       title = ?, subject = ?, class_id = ?, section_id = ?, instructor_name = ?, description = ?,
       scheduled_date = ?, start_time = ?, duration_minutes = ?, meeting_url = ?, status = ?, auto_attendance = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    sanitizePlain(d.title),
    sanitizePlain(d.subject),
    d.classId,
    d.sectionId ?? null,
    sanitizePlain(d.instructorName),
    sanitizePlain(d.description),
    d.scheduledDate,
    sanitizePlain(d.startTime),
    d.durationMinutes,
    d.meetingUrl.trim(),
    d.status,
    d.autoAttendance ? 1 : 0,
    id
  );
  broadcastToClassroom(id, { type: 'classroom:status', onlineClassId: id, status: d.status });
  res.json({ success: true, message: 'Online class updated.', data: { id } });
});

academyRouter.patch('/admin/academy/online-classes/:id/status', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!['scheduled', 'live', 'completed', 'cancelled'].includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid status.', data: null });
    return;
  }
  db.prepare("UPDATE online_classes SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  broadcastToClassroom(id, { type: 'classroom:status', onlineClassId: id, status });
  recordAuditLog(req.user!.email, 'UPDATE', 'OnlineClassStatus', id, status);
  res.json({ success: true, message: `Online class marked ${status}.`, data: { id, status } });
});

academyRouter.delete('/admin/academy/online-classes/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM online_classes WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'OnlineClass', id, 'Deleted online class');
  res.json({ success: true, message: 'Online class deleted.', data: null });
});

// Video Upload & Video Link Library CRUD
academyRouter.post('/admin/academy/videos/upload', uploadVideo.single('file'), (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No video file uploaded.', data: null });
    return;
  }
  const uploadedPath = req.file.path;
  const checkMime = req.file.mimetype || getVideoMimeByExt(uploadedPath);
  if (!verifyFileMagicBytes(uploadedPath, checkMime)) {
    fs.unlinkSync(uploadedPath);
    recordSecurityEvent({
      level: 'WARN',
      eventType: 'MALICIOUS_VIDEO_UPLOAD_BLOCKED',
      ip: req.ip,
      userEmail: req.user!.email,
      method: req.method,
      path: req.originalUrl,
      message: `Blocked uploaded video failing magic-byte check (${req.file.originalname}).`,
    });
    res.status(400).json({
      success: false,
      message: 'Uploaded file failed video format verification (valid MP4, WebM, MOV, or OGG required).',
      data: null,
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: 'Video file uploaded securely.',
    data: {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
    },
  });
});

academyRouter.get('/admin/academy/videos', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT cv.*, sc.name AS class_name, cs.name AS section_name
       FROM class_videos cv
       JOIN school_classes sc ON sc.id = cv.class_id
       LEFT JOIN class_sections cs ON cs.id = cv.section_id
       ORDER BY cv.id DESC`
    )
    .all() as Record<string, unknown>[];
  res.json({ success: true, data: rows.map(mapVideoRow) });
});

const classVideoSchema = z.object({
  title: z.string().trim().min(2).max(180),
  subject: z.string().trim().min(2).max(120),
  classId: z.number().int().positive(),
  sectionId: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(2000).optional().default(''),
  sourceType: z.enum(['upload', 'link']),
  videoUrl: z.string().trim().max(1000).optional().default(''),
  fileName: z.string().trim().max(260).nullable().optional(),
  durationLabel: z.string().trim().max(40).optional().default(''),
  instructorName: z.string().trim().max(120).optional().default('Pramesh Bhattarai'),
  notesUrl: z.string().trim().max(500).optional().default(''),
  isPublished: z.boolean().optional().default(true),
});

academyRouter.post('/admin/academy/videos', (req: AuthenticatedRequest, res) => {
  const parsed = classVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid video lecture payload.', data: null });
    return;
  }
  const d = parsed.data;
  if (d.sourceType === 'upload' && !d.fileName) {
    res.status(400).json({ success: false, message: 'Please upload a video file first.', data: null });
    return;
  }
  if (d.sourceType === 'link' && !d.videoUrl) {
    res.status(400).json({ success: false, message: 'Please enter a valid video URL.', data: null });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO class_videos (
         title, subject, class_id, section_id, description, source_type, video_url,
         file_name, duration_label, instructor_name, notes_url, is_published
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      sanitizePlain(d.title),
      sanitizePlain(d.subject),
      d.classId,
      d.sectionId ?? null,
      sanitizePlain(d.description),
      d.sourceType,
      d.sourceType === 'upload' ? '' : d.videoUrl.trim(),
      d.sourceType === 'upload' ? d.fileName : null,
      sanitizePlain(d.durationLabel),
      sanitizePlain(d.instructorName),
      d.notesUrl.trim(),
      d.isPublished ? 1 : 0
    );

  const vidId = Number(info.lastInsertRowid);
  if (d.sourceType === 'upload') {
    db.prepare('UPDATE class_videos SET video_url = ? WHERE id = ?').run(`/api/v1/academy/videos/${vidId}/stream`, vidId);
  }

  recordAuditLog(req.user!.email, 'CREATE', 'ClassVideo', vidId, `${d.title} (${d.sourceType})`);
  res.status(201).json({ success: true, message: 'Lecture video saved.', data: { id: vidId } });
});

academyRouter.put('/admin/academy/videos/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = classVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid video details.', data: null });
    return;
  }
  const d = parsed.data;
  const resolvedUrl = d.sourceType === 'upload' ? `/api/v1/academy/videos/${id}/stream` : d.videoUrl.trim();
  db.prepare(
    `UPDATE class_videos SET
       title = ?, subject = ?, class_id = ?, section_id = ?, description = ?,
       source_type = ?, video_url = ?, file_name = ?, duration_label = ?,
       instructor_name = ?, notes_url = ?, is_published = ?
     WHERE id = ?`
  ).run(
    sanitizePlain(d.title),
    sanitizePlain(d.subject),
    d.classId,
    d.sectionId ?? null,
    sanitizePlain(d.description),
    d.sourceType,
    resolvedUrl,
    d.sourceType === 'upload' ? d.fileName || null : null,
    sanitizePlain(d.durationLabel),
    sanitizePlain(d.instructorName),
    d.notesUrl.trim(),
    d.isPublished ? 1 : 0,
    id
  );
  res.json({ success: true, message: 'Lecture video updated.', data: { id } });
});

academyRouter.delete('/admin/academy/videos/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT file_name FROM class_videos WHERE id = ?').get(id) as
    | { file_name: string | null }
    | undefined;
  db.prepare('DELETE FROM class_videos WHERE id = ?').run(id);
  if (row?.file_name) {
    const filePath = resolveVideoPath(row.file_name);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Ignore cleanup warning
      }
    }
  }
  recordAuditLog(req.user!.email, 'DELETE', 'ClassVideo', id, 'Deleted lecture video');
  res.json({ success: true, message: 'Lecture video deleted.', data: null });
});

// Timetable CRUD
const timetableSchema = z.object({
  classId: z.number().int().positive(),
  sectionId: z.number().int().positive(),
  dayOfWeek: z.string().trim().min(3).max(20),
  startTime: z.string().trim().min(2).max(20),
  endTime: z.string().trim().min(2).max(20),
  subject: z.string().trim().min(2).max(120),
  instructorName: z.string().trim().max(120).optional().default('Pramesh Bhattarai'),
  roomOrMode: z.string().trim().max(120).optional().default('Online Live'),
});

academyRouter.get('/admin/academy/timetable', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT ct.*, sc.name AS class_name, cs.name AS section_name
       FROM class_timetable ct
       JOIN school_classes sc ON sc.id = ct.class_id
       JOIN class_sections cs ON cs.id = ct.section_id
       ORDER BY ct.class_id ASC, ct.section_id ASC, ct.start_time ASC`
    )
    .all() as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      classId: Number(r.class_id),
      className: String(r.class_name),
      sectionId: Number(r.section_id),
      sectionName: String(r.section_name),
      dayOfWeek: String(r.day_of_week),
      startTime: String(r.start_time),
      endTime: String(r.end_time),
      subject: String(r.subject),
      instructorName: String(r.instructor_name),
      roomOrMode: String(r.room_or_mode),
    })),
  });
});

academyRouter.post('/admin/academy/timetable', (req: AuthenticatedRequest, res) => {
  const parsed = timetableSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid timetable entry.', data: null });
    return;
  }
  const d = parsed.data;
  const info = db
    .prepare(
      'INSERT INTO class_timetable (class_id, section_id, day_of_week, start_time, end_time, subject, instructor_name, room_or_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      d.classId,
      d.sectionId,
      sanitizePlain(d.dayOfWeek),
      sanitizePlain(d.startTime),
      sanitizePlain(d.endTime),
      sanitizePlain(d.subject),
      sanitizePlain(d.instructorName),
      sanitizePlain(d.roomOrMode)
    );
  recordAuditLog(req.user!.email, 'CREATE', 'ClassTimetable', Number(info.lastInsertRowid), d.subject);
  res.status(201).json({ success: true, message: 'Timetable slot added.', data: { id: Number(info.lastInsertRowid) } });
});

academyRouter.delete('/admin/academy/timetable/:id', (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM class_timetable WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true, message: 'Timetable slot removed.', data: null });
});

// Assignments & Submissions Grading CRUD
const assignmentSchema = z.object({
  classId: z.number().int().positive(),
  sectionId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(2).max(180),
  subject: z.string().trim().min(2).max(120),
  description: z.string().trim().max(3000).optional().default(''),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxMarks: z.number().int().min(1).max(1000).optional().default(100),
});

academyRouter.get('/admin/academy/assignments', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT ca.*, sc.name AS class_name, cs.name AS section_name,
              (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = ca.id) AS submissions_count
       FROM class_assignments ca
       JOIN school_classes sc ON sc.id = ca.class_id
       LEFT JOIN class_sections cs ON cs.id = ca.section_id
       ORDER BY ca.id DESC`
    )
    .all() as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      classId: Number(r.class_id),
      className: String(r.class_name),
      sectionId: r.section_id != null ? Number(r.section_id) : null,
      sectionName: r.section_name ? String(r.section_name) : 'All Sections',
      title: String(r.title),
      subject: String(r.subject),
      description: String(r.description || ''),
      dueDate: String(r.due_date),
      maxMarks: Number(r.max_marks || 100),
      submissionsCount: Number(r.submissions_count || 0),
    })),
  });
});

academyRouter.post('/admin/academy/assignments', (req: AuthenticatedRequest, res) => {
  const parsed = assignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid assignment details.', data: null });
    return;
  }
  const d = parsed.data;
  const info = db
    .prepare(
      'INSERT INTO class_assignments (class_id, section_id, title, subject, description, due_date, max_marks) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(d.classId, d.sectionId ?? null, sanitizePlain(d.title), sanitizePlain(d.subject), sanitizePlain(d.description), d.dueDate, d.maxMarks);
  recordAuditLog(req.user!.email, 'CREATE', 'ClassAssignment', Number(info.lastInsertRowid), d.title);
  res.status(201).json({ success: true, message: 'Assignment posted.', data: { id: Number(info.lastInsertRowid) } });
});

academyRouter.delete('/admin/academy/assignments/:id', (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM class_assignments WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true, message: 'Assignment deleted.', data: null });
});

academyRouter.get('/admin/academy/assignments/:id/submissions', (req, res) => {
  const rows = db
    .prepare(
      `SELECT sub.*, st.full_name AS student_name, st.student_code, st.roll_number
       FROM assignment_submissions sub
       JOIN students st ON st.id = sub.student_id
       WHERE sub.assignment_id = ?
       ORDER BY sub.submitted_at DESC`
    )
    .all(Number(req.params.id)) as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      assignmentId: Number(r.assignment_id),
      studentId: Number(r.student_id),
      studentName: String(r.student_name),
      studentCode: String(r.student_code),
      rollNumber: String(r.roll_number),
      submissionText: String(r.submission_text || ''),
      submissionUrl: String(r.submission_url || ''),
      marksObtained: r.marks_obtained != null ? Number(r.marks_obtained) : null,
      feedback: String(r.feedback || ''),
      status: String(r.status) as 'submitted' | 'graded',
      submittedAt: String(r.submitted_at),
    })),
  });
});

academyRouter.patch('/admin/academy/submissions/:submissionId/grade', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.submissionId);
  const marks = Number(req.body?.marksObtained);
  const feedback = sanitizePlain(String(req.body?.feedback || ''));
  if (Number.isNaN(marks) || marks < 0) {
    res.status(400).json({ success: false, message: 'Valid marks are required.', data: null });
    return;
  }
  db.prepare(
    "UPDATE assignment_submissions SET marks_obtained = ?, feedback = ?, status = 'graded', graded_at = datetime('now') WHERE id = ?"
  ).run(marks, feedback, id);
  res.json({ success: true, message: 'Submission graded.', data: { id } });
});

// Class & Section Notices CRUD
const noticeSchema = z.object({
  classId: z.number().int().positive().nullable().optional(),
  sectionId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().min(3).max(3000),
  priority: z.enum(['normal', 'important', 'urgent']).optional().default('normal'),
});

academyRouter.get('/admin/academy/notices', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT an.*, sc.name AS class_name, cs.name AS section_name
       FROM academy_notices an
       LEFT JOIN school_classes sc ON sc.id = an.class_id
       LEFT JOIN class_sections cs ON cs.id = an.section_id
       ORDER BY an.id DESC`
    )
    .all() as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      classId: r.class_id != null ? Number(r.class_id) : null,
      className: r.class_name ? String(r.class_name) : 'All Classes',
      sectionId: r.section_id != null ? Number(r.section_id) : null,
      sectionName: r.section_name ? String(r.section_name) : 'All Sections',
      title: String(r.title),
      content: String(r.content),
      priority: String(r.priority) as 'normal' | 'important' | 'urgent',
      publishedBy: String(r.published_by),
      createdAt: String(r.created_at),
    })),
  });
});

academyRouter.post('/admin/academy/notices', (req: AuthenticatedRequest, res) => {
  const parsed = noticeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid notice payload.', data: null });
    return;
  }
  const d = parsed.data;
  const info = db
    .prepare(
      'INSERT INTO academy_notices (class_id, section_id, title, content, priority, published_by) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(d.classId ?? null, d.sectionId ?? null, sanitizePlain(d.title), sanitizePlain(d.content), d.priority, req.user!.fullName);
  recordAuditLog(req.user!.email, 'CREATE', 'AcademyNotice', Number(info.lastInsertRowid), d.title);
  res.status(201).json({ success: true, message: 'Notice published.', data: { id: Number(info.lastInsertRowid) } });
});

academyRouter.delete('/admin/academy/notices/:id', (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM academy_notices WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true, message: 'Notice deleted.', data: null });
});

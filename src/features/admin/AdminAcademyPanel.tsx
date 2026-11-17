import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Layers,
  Link2,
  Play,
  Plus,
  Radio,
  Search,
  Trash2,
  UploadCloud,
  Users,
  Video,
} from 'lucide-react';
import { academyApi } from '@/src/services/api/academyApi';
import {
  LectureVideoPlayerModal,
  LiveClassroomRoomModal,
} from '@/src/features/academy/AcademyMediaComponents';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Input, PasswordInput, Textarea } from '@/src/components/ui/Input';
import type {
  AttendanceStatus,
  ClassAssignmentDto,
  ClassVideoDto,
  OnlineClassDto,
} from '@/src/types/portfolio';

type AcademySubTab = 'classes' | 'students' | 'attendance' | 'live' | 'videos' | 'facilities';

const SELECT_CLASS =
  'h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] px-3 text-xs text-zinc-900 dark:text-zinc-100';

export function AdminAcademyPanel() {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<AcademySubTab>('classes');
  const [playingVideo, setPlayingVideo] = useState<ClassVideoDto | null>(null);
  const [activeClassroom, setActiveClassroom] = useState<OnlineClassDto | null>(null);

  const overviewQuery = useQuery({ queryKey: ['admin-academy-overview'], queryFn: academyApi.adminGetOverview });
  const classesQuery = useQuery({ queryKey: ['admin-academy-classes'], queryFn: academyApi.adminGetClasses });
  const classes = classesQuery.data || [];

  // Shared helpers
  const invalidateAcademy = () => {
    qc.invalidateQueries({ queryKey: ['admin-academy-overview'] });
    qc.invalidateQueries({ queryKey: ['admin-academy-classes'] });
    qc.invalidateQueries({ queryKey: ['admin-academy-students'] });
    qc.invalidateQueries({ queryKey: ['admin-academy-online-classes'] });
    qc.invalidateQueries({ queryKey: ['admin-academy-videos'] });
    qc.invalidateQueries({ queryKey: ['admin-academy-timetable'] });
    qc.invalidateQueries({ queryKey: ['admin-academy-assignments'] });
    qc.invalidateQueries({ queryKey: ['admin-academy-notices'] });
    qc.invalidateQueries({ queryKey: ['academy-classes'] });
  };

  // ==================== 1. CLASSES & SECTIONS STATE ====================
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classYear, setClassYear] = useState('2026');
  const [classDesc, setClassDesc] = useState('');

  const [secClassId, setSecClassId] = useState<number>(0);
  const [secName, setSecName] = useState('');
  const [secRoom, setSecRoom] = useState('');
  const [secTeacher, setSecTeacher] = useState('Pramesh Bhattarai');
  const [secCapacity, setSecCapacity] = useState('45');

  useEffect(() => {
    if (classes.length > 0 && !secClassId) {
      setSecClassId(classes[0].id);
    }
  }, [classes, secClassId]);

  const createClassMut = useMutation({
    mutationFn: () =>
      academyApi.adminCreateClass({
        name: className,
        code: classCode,
        description: classDesc,
        academicYear: classYear,
        isActive: true,
      }),
    onSuccess: () => {
      toast.success('Class created.');
      setClassName('');
      setClassCode('');
      setClassDesc('');
      invalidateAcademy();
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create class.'),
  });

  const createSectionMut = useMutation({
    mutationFn: () =>
      academyApi.adminCreateSection({
        classId: secClassId,
        name: secName,
        roomLabel: secRoom,
        classTeacher: secTeacher,
        capacity: Number(secCapacity || 45),
      }),
    onSuccess: () => {
      toast.success('Section added.');
      setSecName('');
      setSecRoom('');
      invalidateAcademy();
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add section.'),
  });

  // ==================== 2. STUDENTS DIRECTORY STATE ====================
  const [filterClassId, setFilterClassId] = useState<number>(0);
  const [filterSectionId, setFilterSectionId] = useState<number>(0);
  const [studentSearch, setStudentSearch] = useState('');

  const [stFullName, setStFullName] = useState('');
  const [stEmail, setStEmail] = useState('');
  const [stPhone, setStPhone] = useState('');
  const [stClassId, setStClassId] = useState<number>(0);
  const [stSectionId, setStSectionId] = useState<number>(0);
  const [stRoll, setStRoll] = useState('');
  const [stGuardian, setStGuardian] = useState('');
  const [stAddress, setStAddress] = useState('');
  const [createLogin, setCreateLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (classes.length > 0 && !stClassId) {
      setStClassId(classes[0].id);
      if (classes[0].sections[0]) setStSectionId(classes[0].sections[0].id);
    }
  }, [classes, stClassId]);

  const selectedClassForStudent = useMemo(
    () => classes.find((c) => c.id === stClassId),
    [classes, stClassId]
  );

  const filterSections = useMemo(
    () => (filterClassId ? classes.find((c) => c.id === filterClassId)?.sections || [] : []),
    [classes, filterClassId]
  );

  const studentsQuery = useQuery({
    queryKey: ['admin-academy-students', filterClassId, filterSectionId, studentSearch],
    queryFn: () =>
      academyApi.adminGetStudents({
        classId: filterClassId || undefined,
        sectionId: filterSectionId || undefined,
        search: studentSearch || undefined,
      }),
  });

  const createStudentMut = useMutation({
    mutationFn: () =>
      academyApi.adminCreateStudent({
        fullName: stFullName,
        email: stEmail,
        phone: stPhone,
        classId: stClassId,
        sectionId: stSectionId,
        rollNumber: stRoll,
        guardianName: stGuardian,
        address: stAddress,
        createPortalAccount: createLogin,
        portalPassword: loginPassword,
      }),
    onSuccess: (res) => {
      toast.success(`Student added (${res.studentCode}, Roll ${res.rollNumber}).`);
      setStFullName('');
      setStEmail('');
      setStPhone('');
      setStRoll('');
      setStGuardian('');
      setStAddress('');
      setLoginPassword('');
      invalidateAcademy();
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not add student.'),
  });

  // ==================== 3. ATTENDANCE REGISTER STATE ====================
  const [attClassId, setAttClassId] = useState<number>(0);
  const [attSectionId, setAttSectionId] = useState<number>(0);
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attDraft, setAttDraft] = useState<Record<number, { status: AttendanceStatus; remarks: string }>>({});

  useEffect(() => {
    if (classes.length > 0 && !attClassId) {
      setAttClassId(classes[0].id);
      if (classes[0].sections[0]) setAttSectionId(classes[0].sections[0].id);
    }
  }, [classes, attClassId]);

  const attSections = useMemo(() => classes.find((c) => c.id === attClassId)?.sections || [], [classes, attClassId]);

  const attendanceQuery = useQuery({
    queryKey: ['admin-academy-attendance', attClassId, attSectionId, attDate],
    queryFn: () => academyApi.adminGetAttendance({ classId: attClassId, sectionId: attSectionId, date: attDate }),
    enabled: attClassId > 0 && attSectionId > 0,
  });

  useEffect(() => {
    if (attendanceQuery.data?.rows) {
      const next: Record<number, { status: AttendanceStatus; remarks: string }> = {};
      for (const row of attendanceQuery.data.rows) {
        next[row.studentId] = {
          status: row.status || 'present',
          remarks: row.remarks || '',
        };
      }
      setAttDraft(next);
    }
  }, [attendanceQuery.data]);

  const saveAttendanceMut = useMutation({
    mutationFn: () => {
      const rows = attendanceQuery.data?.rows || [];
      return academyApi.adminSaveBulkAttendance({
        classId: attClassId,
        sectionId: attSectionId,
        attendanceDate: attDate,
        entries: rows.map((r) => ({
          studentId: r.studentId,
          status: attDraft[r.studentId]?.status || 'present',
          remarks: attDraft[r.studentId]?.remarks || '',
        })),
      });
    },
    onSuccess: (res) => {
      toast.success(res ? 'Attendance saved.' : 'Attendance saved.');
      qc.invalidateQueries({ queryKey: ['admin-academy-attendance'] });
      invalidateAcademy();
    },
    onError: () => toast.error('Failed to save attendance.'),
  });

  // ==================== 4. ONLINE LIVE CLASSES STATE ====================
  const [ocTitle, setOcTitle] = useState('');
  const [ocSubject, setOcSubject] = useState('');
  const [ocClassId, setOcClassId] = useState<number>(0);
  const [ocSectionId, setOcSectionId] = useState<number>(0);
  const [ocDate, setOcDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ocTime, setOcTime] = useState('07:00');
  const [ocDuration, setOcDuration] = useState('60');
  const [ocMeetingUrl, setOcMeetingUrl] = useState('');
  const [ocDesc, setOcDesc] = useState('');
  const [ocStatus, setOcStatus] = useState<'scheduled' | 'live'>('live');

  useEffect(() => {
    if (classes.length > 0 && !ocClassId) setOcClassId(classes[0].id);
  }, [classes, ocClassId]);

  const onlineClassesQuery = useQuery({
    queryKey: ['admin-academy-online-classes'],
    queryFn: academyApi.adminGetOnlineClasses,
  });

  const createOnlineClassMut = useMutation({
    mutationFn: () =>
      academyApi.adminCreateOnlineClass({
        title: ocTitle,
        subject: ocSubject,
        classId: ocClassId,
        sectionId: ocSectionId || null,
        scheduledDate: ocDate,
        startTime: ocTime,
        durationMinutes: Number(ocDuration || 60),
        meetingUrl: ocMeetingUrl,
        description: ocDesc,
        status: ocStatus,
        autoAttendance: true,
      }),
    onSuccess: () => {
      toast.success('Online class created.');
      setOcTitle('');
      setOcSubject('');
      setOcMeetingUrl('');
      setOcDesc('');
      invalidateAcademy();
    },
    onError: () => toast.error('Could not create online class.'),
  });

  const updateOnlineStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OnlineClassDto['status'] }) =>
      academyApi.adminUpdateOnlineClassStatus(id, status),
    onSuccess: () => {
      toast.success('Class status updated.');
      invalidateAcademy();
    },
  });

  // ==================== 5. VIDEO LECTURES (UPLOAD & LINK) STATE ====================
  const [vidTitle, setVidTitle] = useState('');
  const [vidSubject, setVidSubject] = useState('');
  const [vidClassId, setVidClassId] = useState<number>(0);
  const [vidSectionId, setVidSectionId] = useState<number>(0);
  const [vidSourceType, setVidSourceType] = useState<'upload' | 'link'>('link');
  const [vidUrl, setVidUrl] = useState('');
  const [vidFileName, setVidFileName] = useState<string | null>(null);
  const [vidOriginalName, setVidOriginalName] = useState('');
  const [vidUploading, setVidUploading] = useState(false);
  const [vidDuration, setVidDuration] = useState('');
  const [vidDesc, setVidDesc] = useState('');
  const [vidNotesUrl, setVidNotesUrl] = useState('');

  useEffect(() => {
    if (classes.length > 0 && !vidClassId) setVidClassId(classes[0].id);
  }, [classes, vidClassId]);

  const videosQuery = useQuery({ queryKey: ['admin-academy-videos'], queryFn: academyApi.adminGetVideos });

  const handleVideoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVidUploading(true);
    try {
      const uploaded = await academyApi.adminUploadVideoFile(file);
      setVidFileName(uploaded.fileName);
      setVidOriginalName(uploaded.originalName);
      toast.success(`Uploaded ${uploaded.originalName}`);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Video upload failed. Ensure MP4, WebM, MOV, or OGG format.'
      );
    } finally {
      setVidUploading(false);
    }
  };

  const createVideoMut = useMutation({
    mutationFn: () =>
      academyApi.adminCreateVideo({
        title: vidTitle,
        subject: vidSubject,
        classId: vidClassId,
        sectionId: vidSectionId || null,
        description: vidDesc,
        sourceType: vidSourceType,
        videoUrl: vidSourceType === 'link' ? vidUrl : '',
        fileName: vidSourceType === 'upload' ? vidFileName : null,
        durationLabel: vidDuration,
        notesUrl: vidNotesUrl,
        isPublished: true,
      }),
    onSuccess: () => {
      toast.success('Lecture video published.');
      setVidTitle('');
      setVidSubject('');
      setVidUrl('');
      setVidFileName(null);
      setVidOriginalName('');
      setVidDuration('');
      setVidDesc('');
      setVidNotesUrl('');
      invalidateAcademy();
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not save lecture video.'),
  });

  // ==================== 6. TIMETABLE, ASSIGNMENTS & NOTICES STATE ====================
  const timetableQuery = useQuery({ queryKey: ['admin-academy-timetable'], queryFn: academyApi.adminGetTimetable });
  const assignmentsQuery = useQuery({ queryKey: ['admin-academy-assignments'], queryFn: academyApi.adminGetAssignments });
  const noticesQuery = useQuery({ queryKey: ['admin-academy-notices'], queryFn: academyApi.adminGetNotices });

  const [ttClassId, setTtClassId] = useState<number>(0);
  const [ttSectionId, setTtSectionId] = useState<number>(0);
  const [ttDay, setTtDay] = useState('Sunday');
  const [ttStart, setTtStart] = useState('07:00');
  const [ttEnd, setTtEnd] = useState('08:30');
  const [ttSubject, setTtSubject] = useState('');
  const [ttMode, setTtMode] = useState('Online Live');

  const [asClassId, setAsClassId] = useState<number>(0);
  const [asSectionId, setAsSectionId] = useState<number>(0);
  const [asTitle, setAsTitle] = useState('');
  const [asSubject, setAsSubject] = useState('');
  const [asDue, setAsDue] = useState(() => new Date().toISOString().slice(0, 10));
  const [asMarks, setAsMarks] = useState('100');
  const [asDesc, setAsDesc] = useState('');
  const [gradingAssignment, setGradingAssignment] = useState<ClassAssignmentDto | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<number, { marks: string; feedback: string }>>({});

  const [notClassId, setNotClassId] = useState<number>(0);
  const [notSectionId, setNotSectionId] = useState<number>(0);
  const [notTitle, setNotTitle] = useState('');
  const [notContent, setNotContent] = useState('');
  const [notPriority, setNotPriority] = useState<'normal' | 'important' | 'urgent'>('important');

  useEffect(() => {
    if (classes.length > 0 && !ttClassId) {
      setTtClassId(classes[0].id);
      if (classes[0].sections[0]) setTtSectionId(classes[0].sections[0].id);
      setAsClassId(classes[0].id);
    }
  }, [classes, ttClassId]);

  const submissionsQuery = useQuery({
    queryKey: ['admin-academy-submissions', gradingAssignment?.id],
    queryFn: () => academyApi.adminGetSubmissions(gradingAssignment!.id),
    enabled: Boolean(gradingAssignment),
  });

  const ov = overviewQuery.data;

  const subTabs: { id: AcademySubTab; label: string; icon: typeof Layers }[] = [
    { id: 'classes', label: 'Classes & Sections', icon: Layers },
    { id: 'students', label: `Students (${ov?.studentsCount ?? 0})`, icon: Users },
    { id: 'attendance', label: 'Attendance Register', icon: ClipboardCheck },
    { id: 'live', label: `Online Classes (${ov?.liveClassesCount ?? 0} Live)`, icon: Radio },
    { id: 'videos', label: `Video Library (${ov?.videosCount ?? 0})`, icon: Video },
    { id: 'facilities', label: 'Timetable, Tasks & Notices', icon: CalendarClock },
  ];

  return (
    <div className="space-y-6">
      {/* Header + Overview KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Student Management &amp; Online Classroom Portal</span>
          </h1>
          <p className="text-xs text-zinc-500">
            Class-wise &amp; section-wise students, attendance, live online classes, uploaded/linked lecture videos, routine, assignments &amp; notices.
          </p>
        </div>
      </div>

      {ov ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-3.5">
            <p className="text-[11px] text-zinc-500">Classes / Sections</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">
              {ov.classesCount} / {ov.sectionsCount}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-3.5">
            <p className="text-[11px] text-zinc-500">Active Students</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {ov.studentsCount}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-3.5">
            <p className="text-[11px] text-zinc-500">Live Online Now</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {ov.liveClassesCount}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-3.5">
            <p className="text-[11px] text-zinc-500">Today Present</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {ov.todayPresentCount}/{ov.todayAttendanceMarked}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-3.5">
            <p className="text-[11px] text-zinc-500">Video Lectures</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">{ov.videosCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-3.5">
            <p className="text-[11px] text-zinc-500">Tasks &amp; Notices</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">
              {ov.assignmentsCount} / {ov.noticesCount}
            </p>
          </div>
        </div>
      ) : null}

      {/* Horizontal Sub-Module Selector */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] p-1.5">
        {subTabs.map((item) => {
          const Icon = item.icon;
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: CLASSES & SECTIONS ==================== */}
      {subTab === 'classes' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Create New Class</h2>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    createClassMut.mutate();
                  }}
                  className="space-y-3"
                >
                  <Input required value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Class Name (e.g. Grade 12 Science)" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input required value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="Code (e.g. G12-SCI)" />
                    <Input value={classYear} onChange={(e) => setClassYear(e.target.value)} placeholder="Year (2026)" />
                  </div>
                  <Textarea value={classDesc} onChange={(e) => setClassDesc(e.target.value)} placeholder="Syllabus / batch overview..." />
                  <Button type="submit" size="sm" disabled={createClassMut.isPending}>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Class</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Add Section to Class</h2>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    createSectionMut.mutate();
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-xs font-medium block mb-1">Select Class *</label>
                    <select className={SELECT_CLASS} value={secClassId} onChange={(e) => setSecClassId(Number(e.target.value))}>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input required value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="Section Name (e.g. Section A - Morning)" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={secRoom} onChange={(e) => setSecRoom(e.target.value)} placeholder="Room / Stream Label" />
                    <Input type="number" min={1} value={secCapacity} onChange={(e) => setSecCapacity(e.target.value)} placeholder="Capacity" />
                  </div>
                  <Input value={secTeacher} onChange={(e) => setSecTeacher(e.target.value)} placeholder="Class Teacher" />
                  <Button type="submit" size="sm" disabled={createSectionMut.isPending || !secClassId}>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Section</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-7">
            <CardHeader>
              <h2 className="text-sm font-semibold">All Classes &amp; Section Directory</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {classes.map((cls) => (
                <div key={cls.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {cls.code} · {cls.academicYear}
                      </p>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{cls.name}</h3>
                      {cls.description ? <p className="text-xs text-zinc-500 mt-1">{cls.description}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        academyApi.adminDeleteClass(cls.id).then(() => {
                          toast.success('Class deleted.');
                          invalidateAcademy();
                        });
                      }}
                      aria-label={`Delete ${cls.name}`}
                      className="text-zinc-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    {cls.sections.length === 0 ? (
                      <p className="text-xs text-zinc-500">No sections yet.</p>
                    ) : (
                      cls.sections.map((sec) => (
                        <div
                          key={sec.id}
                          className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 p-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{sec.name}</p>
                            <p className="text-[11px] text-zinc-500 truncate">
                              {sec.roomLabel || 'Virtual Room'} · {sec.studentsCount}/{sec.capacity} students
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              academyApi.adminDeleteSection(sec.id).then(() => {
                                toast.success('Section removed.');
                                invalidateAcademy();
                              });
                            }}
                            aria-label={`Delete ${sec.name}`}
                            className="text-zinc-400 hover:text-red-500 cursor-pointer shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ==================== TAB 2: STUDENTS DIRECTORY ==================== */}
      {subTab === 'students' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-4 h-fit">
            <CardHeader>
              <h2 className="text-sm font-semibold">Enroll New Student</h2>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createStudentMut.mutate();
                }}
                className="space-y-3"
              >
                <Input required value={stFullName} onChange={(e) => setStFullName(e.target.value)} placeholder="Student Full Name *" />
                <Input required type="email" value={stEmail} onChange={(e) => setStEmail(e.target.value)} placeholder="Student Email *" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={stPhone} onChange={(e) => setStPhone(e.target.value)} placeholder="Phone" />
                  <Input value={stRoll} onChange={(e) => setStRoll(e.target.value)} placeholder="Roll No (auto)" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Class *</label>
                  <select
                    className={SELECT_CLASS}
                    value={stClassId}
                    onChange={(e) => {
                      const nextCid = Number(e.target.value);
                      setStClassId(nextCid);
                      const firstSec = classes.find((c) => c.id === nextCid)?.sections[0]?.id || 0;
                      setStSectionId(firstSec);
                    }}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Section *</label>
                  <select
                    className={SELECT_CLASS}
                    value={stSectionId}
                    onChange={(e) => setStSectionId(Number(e.target.value))}
                  >
                    {(selectedClassForStudent?.sections || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input value={stGuardian} onChange={(e) => setStGuardian(e.target.value)} placeholder="Guardian Name" />
                <Input value={stAddress} onChange={(e) => setStAddress(e.target.value)} placeholder="Address" />
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer pt-1">
                  <input type="checkbox" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)} />
                  <span>Also create Student Portal login account</span>
                </label>
                {createLogin ? (
                  <PasswordInput
                    required
                    minLength={8}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Initial password (min 8 chars)"
                  />
                ) : null}
                <Button type="submit" size="sm" className="w-full" disabled={createStudentMut.isPending}>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Save Student</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-8">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Class-Wise &amp; Section-Wise Students</h2>
                <div className="relative w-full sm:w-56">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search name, code, roll..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  className={SELECT_CLASS}
                  value={filterClassId}
                  onChange={(e) => {
                    setFilterClassId(Number(e.target.value));
                    setFilterSectionId(0);
                  }}
                >
                  <option value={0}>All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className={SELECT_CLASS}
                  value={filterSectionId}
                  onChange={(e) => setFilterSectionId(Number(e.target.value))}
                  disabled={!filterClassId}
                >
                  <option value={0}>All Sections</option>
                  {filterSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {(studentsQuery.data || []).length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">No students found for this filter.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                      <tr>
                        <th className="py-2 pr-3">Roll / ID</th>
                        <th className="py-2 pr-3">Student</th>
                        <th className="py-2 pr-3">Class &amp; Section</th>
                        <th className="py-2 pr-3">Contact</th>
                        <th className="py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {(studentsQuery.data || []).map((st) => (
                        <tr key={st.id}>
                          <td className="py-2.5 pr-3 font-mono">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">#{st.rollNumber}</span>
                            <div className="text-[11px] text-zinc-500">{st.studentCode}</div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{st.fullName}</p>
                            <p className="text-[11px] text-zinc-500">{st.email}</p>
                          </td>
                          <td className="py-2.5 pr-3">
                            <p className="font-medium">{st.className}</p>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400">{st.sectionName}</p>
                          </td>
                          <td className="py-2.5 pr-3 text-[11px] text-zinc-500">
                            <p>{st.phone || '—'}</p>
                            {st.guardianName ? <p>Guardian: {st.guardianName}</p> : null}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                academyApi.adminDeleteStudent(st.id).then(() => {
                                  toast.success('Student removed.');
                                  invalidateAcademy();
                                });
                              }}
                              aria-label={`Remove ${st.fullName}`}
                              className="text-zinc-400 hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ==================== TAB 3: ATTENDANCE REGISTER ==================== */}
      {subTab === 'attendance' ? (
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Class &amp; Section Daily Attendance</h2>
                <p className="text-xs text-zinc-500">
                  Select a Class, Section, and Date to mark Present, Absent, Late, or Excused.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const all: Record<number, { status: AttendanceStatus; remarks: string }> = {};
                    for (const row of attendanceQuery.data?.rows || []) {
                      all[row.studentId] = { status: 'present', remarks: attDraft[row.studentId]?.remarks || '' };
                    }
                    setAttDraft(all);
                  }}
                >
                  Mark All Present
                </Button>
                <Button
                  size="sm"
                  disabled={saveAttendanceMut.isPending || !(attendanceQuery.data?.rows?.length)}
                  onClick={() => saveAttendanceMut.mutate()}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{saveAttendanceMut.isPending ? 'Saving...' : 'Save Attendance'}</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                className={SELECT_CLASS}
                value={attClassId}
                onChange={(e) => {
                  const cid = Number(e.target.value);
                  setAttClassId(cid);
                  setAttSectionId(classes.find((c) => c.id === cid)?.sections[0]?.id || 0);
                }}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className={SELECT_CLASS}
                value={attSectionId}
                onChange={(e) => setAttSectionId(Number(e.target.value))}
              >
                {attSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className="h-9 text-xs" />
            </div>
          </CardHeader>

          <CardContent>
            {(attendanceQuery.data?.rows || []).length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">
                No active students enrolled in this Class &amp; Section yet.
              </p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(attendanceQuery.data?.rows || []).map((row) => {
                  const current = attDraft[row.studentId] || { status: 'present', remarks: '' };
                  return (
                    <div key={row.studentId} className="py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          <span className="font-mono text-blue-600 dark:text-blue-400 mr-2">#{row.rollNumber}</span>
                          {row.fullName}
                          <span className="ml-2 font-mono text-[11px] text-zinc-500">({row.studentCode})</span>
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Overall Attendance: <strong className="font-mono">{row.attendancePercentage}%</strong> ({row.totalRecordedDays} day(s) recorded)
                          {row.markedBy ? ` · Last marked by ${row.markedBy}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              setAttDraft((prev) => ({
                                ...prev,
                                [row.studentId]: { ...current, status: st },
                              }))
                            }
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize cursor-pointer border transition-colors ${
                              current.status === st
                                ? st === 'present'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : st === 'absent'
                                    ? 'bg-rose-600 text-white border-rose-600'
                                    : st === 'late'
                                      ? 'bg-amber-600 text-white border-amber-600'
                                      : 'bg-blue-600 text-white border-blue-600'
                                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                        <Input
                          value={current.remarks}
                          onChange={(e) =>
                            setAttDraft((prev) => ({
                              ...prev,
                              [row.studentId]: { ...current, remarks: e.target.value },
                            }))
                          }
                          placeholder="Remark (optional)"
                          className="h-7 w-40 text-[11px]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ==================== TAB 4: ONLINE LIVE CLASSES ==================== */}
      {subTab === 'live' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-5 h-fit">
            <CardHeader>
              <h2 className="text-sm font-semibold">Schedule / Start Online Class</h2>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createOnlineClassMut.mutate();
                }}
                className="space-y-3"
              >
                <Input required value={ocTitle} onChange={(e) => setOcTitle(e.target.value)} placeholder="Session Title (e.g. Live .NET API Design)" />
                <Input required value={ocSubject} onChange={(e) => setOcSubject(e.target.value)} placeholder="Subject (e.g. ASP.NET Core)" />
                <div className="grid grid-cols-2 gap-2">
                  <select className={SELECT_CLASS} value={ocClassId} onChange={(e) => { setOcClassId(Number(e.target.value)); setOcSectionId(0); }}>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select className={SELECT_CLASS} value={ocSectionId} onChange={(e) => setOcSectionId(Number(e.target.value))}>
                    <option value={0}>All Sections</option>
                    {(classes.find((c) => c.id === ocClassId)?.sections || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="date" value={ocDate} onChange={(e) => setOcDate(e.target.value)} />
                  <Input value={ocTime} onChange={(e) => setOcTime(e.target.value)} placeholder="07:00" />
                  <Input type="number" min={10} value={ocDuration} onChange={(e) => setOcDuration(e.target.value)} placeholder="Min" />
                </div>
                <Input value={ocMeetingUrl} onChange={(e) => setOcMeetingUrl(e.target.value)} placeholder="Meet / Zoom / Jitsi URL (optional)" />
                <select className={SELECT_CLASS} value={ocStatus} onChange={(e) => setOcStatus(e.target.value as 'live' | 'scheduled')}>
                  <option value="live">Go LIVE Immediately</option>
                  <option value="scheduled">Schedule for Later</option>
                </select>
                <Textarea value={ocDesc} onChange={(e) => setOcDesc(e.target.value)} placeholder="Class agenda or instructions..." />
                <Button type="submit" size="sm" className="w-full" disabled={createOnlineClassMut.isPending}>
                  <Radio className="h-3.5 w-3.5" />
                  <span>{ocStatus === 'live' ? 'Launch Live Class' : 'Schedule Online Class'}</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <h2 className="text-sm font-semibold">Online Classes &amp; Live Classroom Control</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {(onlineClassesQuery.data || []).map((oc) => (
                <div key={oc.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span
                          className={`rounded px-2 py-0.5 uppercase font-semibold ${
                            oc.status === 'live'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : oc.status === 'scheduled'
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600'
                          }`}
                        >
                          {oc.status}
                        </span>
                        <span className="text-zinc-500">
                          {oc.className} · {oc.sectionName}
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">{oc.title}</h3>
                      <p className="text-xs text-zinc-500">
                        {oc.subject} · {oc.scheduledDate} at {oc.startTime} ({oc.durationMinutes}m)
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" onClick={() => setActiveClassroom(oc)}>
                        <Video className="h-3.5 w-3.5" />
                        <span>Enter Classroom</span>
                      </Button>
                      {oc.status !== 'live' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOnlineStatusMut.mutate({ id: oc.id, status: 'live' })}
                        >
                          Go Live
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOnlineStatusMut.mutate({ id: oc.id, status: 'completed' })}
                        >
                          End Class
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          academyApi.adminDeleteOnlineClass(oc.id).then(() => {
                            toast.success('Deleted.');
                            invalidateAcademy();
                          })
                        }
                        aria-label={`Delete ${oc.title}`}
                        className="text-zinc-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ==================== TAB 5: VIDEO LIBRARY (UPLOAD + LINK) ==================== */}
      {subTab === 'videos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-5 h-fit">
            <CardHeader>
              <h2 className="text-sm font-semibold">Upload Video or Add Video Link</h2>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createVideoMut.mutate();
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVidSourceType('upload')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                      vidSourceType === 'upload'
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Upload Video File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVidSourceType('link')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                      vidSourceType === 'link'
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>Paste Video Link</span>
                  </button>
                </div>

                <Input required value={vidTitle} onChange={(e) => setVidTitle(e.target.value)} placeholder="Video Lecture Title *" />
                <div className="grid grid-cols-2 gap-2">
                  <Input required value={vidSubject} onChange={(e) => setVidSubject(e.target.value)} placeholder="Subject *" />
                  <Input value={vidDuration} onChange={(e) => setVidDuration(e.target.value)} placeholder="Duration (e.g. 38:20)" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select className={SELECT_CLASS} value={vidClassId} onChange={(e) => { setVidClassId(Number(e.target.value)); setVidSectionId(0); }}>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select className={SELECT_CLASS} value={vidSectionId} onChange={(e) => setVidSectionId(Number(e.target.value))}>
                    <option value={0}>All Sections</option>
                    {(classes.find((c) => c.id === vidClassId)?.sections || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {vidSourceType === 'upload' ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-3 space-y-2">
                    <label className="text-xs font-medium block">Select Lecture Video (MP4, WebM, MOV, OGG - up to 150MB)</label>
                    <input type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.ogg" onChange={handleVideoFileChange} className="text-xs w-full" />
                    {vidUploading ? <p className="text-[11px] text-blue-600">Uploading video securely...</p> : null}
                    {vidFileName ? (
                      <p className="text-[11px] text-emerald-600 font-mono">Ready: {vidOriginalName || vidFileName}</p>
                    ) : null}
                  </div>
                ) : (
                  <Input
                    required
                    value={vidUrl}
                    onChange={(e) => setVidUrl(e.target.value)}
                    placeholder="YouTube, Vimeo, Google Drive, or direct MP4 URL *"
                  />
                )}

                <Input value={vidNotesUrl} onChange={(e) => setVidNotesUrl(e.target.value)} placeholder="Optional Notes / Slides URL" />
                <Textarea value={vidDesc} onChange={(e) => setVidDesc(e.target.value)} placeholder="Lecture summary & topics covered..." />

                <Button type="submit" size="sm" className="w-full" disabled={createVideoMut.isPending || vidUploading}>
                  <Video className="h-3.5 w-3.5" />
                  <span>Save Lecture Video</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <h2 className="text-sm font-semibold">Published Class &amp; Section Video Lectures</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {(videosQuery.data || []).map((vid) => (
                <div key={vid.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      {vid.className} · {vid.sectionName} · {vid.sourceType === 'upload' ? 'Uploaded File' : 'Video Link'}
                    </p>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{vid.title}</h3>
                    <p className="text-xs text-zinc-500">
                      {vid.subject}
                      {vid.durationLabel ? ` · ${vid.durationLabel}` : ''} · {vid.viewsCount} views
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setPlayingVideo(vid)}>
                      <Play className="h-3.5 w-3.5" />
                      <span>Play</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() =>
                        academyApi.adminDeleteVideo(vid.id).then(() => {
                          toast.success('Video removed.');
                          invalidateAcademy();
                        })
                      }
                      aria-label={`Delete ${vid.title}`}
                      className="text-zinc-400 hover:text-red-500 cursor-pointer p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ==================== TAB 6: TIMETABLE, ASSIGNMENTS & NOTICES ==================== */}
      {subTab === 'facilities' ? (
        <div className="space-y-6">
          {/* Row 1: Class Timetable & Notices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Section-Wise Class Timetable / Routine</span>
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    academyApi
                      .adminCreateTimetable({
                        classId: ttClassId,
                        sectionId: ttSectionId,
                        dayOfWeek: ttDay,
                        startTime: ttStart,
                        endTime: ttEnd,
                        subject: ttSubject,
                        roomOrMode: ttMode,
                      })
                      .then(() => {
                        toast.success('Timetable entry added.');
                        setTtSubject('');
                        invalidateAcademy();
                      });
                  }}
                  className="space-y-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-4"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className={SELECT_CLASS}
                      value={ttClassId}
                      onChange={(e) => {
                        const cid = Number(e.target.value);
                        setTtClassId(cid);
                        setTtSectionId(classes.find((c) => c.id === cid)?.sections[0]?.id || 0);
                      }}
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select className={SELECT_CLASS} value={ttSectionId} onChange={(e) => setTtSectionId(Number(e.target.value))}>
                      {(classes.find((c) => c.id === ttClassId)?.sections || []).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select className={SELECT_CLASS} value={ttDay} onChange={(e) => setTtDay(e.target.value)}>
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <Input value={ttStart} onChange={(e) => setTtStart(e.target.value)} placeholder="07:00" />
                    <Input value={ttEnd} onChange={(e) => setTtEnd(e.target.value)} placeholder="08:30" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input required value={ttSubject} onChange={(e) => setTtSubject(e.target.value)} placeholder="Subject *" />
                    <Input value={ttMode} onChange={(e) => setTtMode(e.target.value)} placeholder="Room / Online Live" />
                  </div>
                  <Button type="submit" size="sm">Add Routine Slot</Button>
                </form>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(timetableQuery.data || []).map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between gap-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
                      <div>
                        <p className="font-semibold">{slot.dayOfWeek} · {slot.startTime}–{slot.endTime} · {slot.subject}</p>
                        <p className="text-[11px] text-zinc-500">{slot.className} ({slot.sectionName}) · {slot.roomOrMode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => academyApi.adminDeleteTimetable(slot.id).then(() => invalidateAcademy())}
                        className="text-zinc-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Class &amp; Section Notices / Announcements</span>
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    academyApi
                      .adminCreateNotice({
                        classId: notClassId || null,
                        sectionId: notSectionId || null,
                        title: notTitle,
                        content: notContent,
                        priority: notPriority,
                      })
                      .then(() => {
                        toast.success('Notice published.');
                        setNotTitle('');
                        setNotContent('');
                        invalidateAcademy();
                      });
                  }}
                  className="space-y-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-4"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <select className={SELECT_CLASS} value={notClassId} onChange={(e) => { setNotClassId(Number(e.target.value)); setNotSectionId(0); }}>
                      <option value={0}>All Classes</option>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className={SELECT_CLASS} value={notSectionId} onChange={(e) => setNotSectionId(Number(e.target.value))} disabled={!notClassId}>
                      <option value={0}>All Sections</option>
                      {(classes.find((c) => c.id === notClassId)?.sections || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select className={SELECT_CLASS} value={notPriority} onChange={(e) => setNotPriority(e.target.value as 'normal' | 'important' | 'urgent')}>
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <Input required value={notTitle} onChange={(e) => setNotTitle(e.target.value)} placeholder="Notice Headline *" />
                  <Textarea required value={notContent} onChange={(e) => setNotContent(e.target.value)} placeholder="Announcement details..." />
                  <Button type="submit" size="sm">Publish Notice</Button>
                </form>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(noticesQuery.data || []).map((n) => (
                    <div key={n.id} className="flex items-start justify-between gap-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
                      <div>
                        <p className="font-semibold">{n.title}</p>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400">{n.className} · {n.sectionName} · {n.priority.toUpperCase()}</p>
                        <p className="text-zinc-500 mt-1">{n.content}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => academyApi.adminDeleteNotice(n.id).then(() => invalidateAcademy())}
                        className="text-zinc-400 hover:text-red-500 cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Assignments + Submission Grading */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Class Assignments &amp; Student Grading</span>
              </h2>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  academyApi
                    .adminCreateAssignment({
                      classId: asClassId,
                      sectionId: asSectionId || null,
                      title: asTitle,
                      subject: asSubject,
                      dueDate: asDue,
                      maxMarks: Number(asMarks || 100),
                      description: asDesc,
                    })
                    .then(() => {
                      toast.success('Assignment posted.');
                      setAsTitle('');
                      setAsSubject('');
                      setAsDesc('');
                      invalidateAcademy();
                    });
                }}
                className="lg:col-span-5 space-y-2.5"
              >
                <div className="grid grid-cols-2 gap-2">
                  <select className={SELECT_CLASS} value={asClassId} onChange={(e) => { setAsClassId(Number(e.target.value)); setAsSectionId(0); }}>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className={SELECT_CLASS} value={asSectionId} onChange={(e) => setAsSectionId(Number(e.target.value))}>
                    <option value={0}>All Sections</option>
                    {(classes.find((c) => c.id === asClassId)?.sections || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <Input required value={asTitle} onChange={(e) => setAsTitle(e.target.value)} placeholder="Assignment Title *" />
                <div className="grid grid-cols-3 gap-2">
                  <Input required value={asSubject} onChange={(e) => setAsSubject(e.target.value)} placeholder="Subject *" />
                  <Input type="date" value={asDue} onChange={(e) => setAsDue(e.target.value)} />
                  <Input type="number" value={asMarks} onChange={(e) => setAsMarks(e.target.value)} placeholder="Marks" />
                </div>
                <Textarea value={asDesc} onChange={(e) => setAsDesc(e.target.value)} placeholder="Homework instructions..." />
                <Button type="submit" size="sm">Post Assignment</Button>
              </form>

              <div className="lg:col-span-7 space-y-3">
                {(assignmentsQuery.data || []).map((as) => (
                  <div key={as.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{as.title}</p>
                        <p className="text-[11px] text-zinc-500">
                          {as.className} · {as.sectionName} · Due {as.dueDate} · Max {as.maxMarks} marks
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setGradingAssignment(as)}>
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Submissions ({as.submissionsCount ?? 0})</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => academyApi.adminDeleteAssignment(as.id).then(() => invalidateAcademy())}
                          className="text-zinc-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {gradingAssignment?.id === as.id ? (
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                        {(submissionsQuery.data || []).length === 0 ? (
                          <p className="text-[11px] text-zinc-500">No student submissions yet.</p>
                        ) : (
                          (submissionsQuery.data || []).map((sub) => {
                            const draft = gradeInputs[sub.id] || {
                              marks: sub.marksObtained != null ? String(sub.marksObtained) : '',
                              feedback: sub.feedback || '',
                            };
                            return (
                              <div key={sub.id} className="rounded bg-zinc-50 dark:bg-zinc-900 p-2.5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">{sub.studentName} (#{sub.rollNumber})</span>
                                  <span className="font-mono text-[10px] uppercase text-blue-600">{sub.status}</span>
                                </div>
                                <p className="text-zinc-600 dark:text-zinc-300">{sub.submissionText}</p>
                                {sub.submissionUrl ? (
                                  <a href={sub.submissionUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline block">
                                    {sub.submissionUrl}
                                  </a>
                                ) : null}
                                <div className="flex flex-wrap items-center gap-2">
                                  <Input
                                    type="number"
                                    value={draft.marks}
                                    onChange={(e) =>
                                      setGradeInputs((p) => ({ ...p, [sub.id]: { ...draft, marks: e.target.value } }))
                                    }
                                    placeholder={`Marks / ${as.maxMarks}`}
                                    className="h-7 w-28 text-[11px]"
                                  />
                                  <Input
                                    value={draft.feedback}
                                    onChange={(e) =>
                                      setGradeInputs((p) => ({ ...p, [sub.id]: { ...draft, feedback: e.target.value } }))
                                    }
                                    placeholder="Teacher feedback"
                                    className="h-7 flex-1 text-[11px]"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      academyApi
                                        .adminGradeSubmission(sub.id, {
                                          marksObtained: Number(draft.marks || 0),
                                          feedback: draft.feedback,
                                        })
                                        .then(() => {
                                          toast.success('Graded.');
                                          qc.invalidateQueries({ queryKey: ['admin-academy-submissions', as.id] });
                                        })
                                    }
                                  >
                                    Save Grade
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Video Player & Live Classroom Modals */}
      {playingVideo ? <LectureVideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} /> : null}
      {activeClassroom ? <LiveClassroomRoomModal onlineClass={activeClassroom} onClose={() => setActiveClassroom(null)} /> : null}
    </div>
  );
}

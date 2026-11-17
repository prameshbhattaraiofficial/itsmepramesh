import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Play,
  Radio,
  Send,
  Video,
} from 'lucide-react';
import { academyApi } from '@/src/services/api/academyApi';
import {
  LectureVideoPlayerModal,
  LiveClassroomRoomModal,
} from '@/src/features/academy/AcademyMediaComponents';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Input, Textarea } from '@/src/components/ui/Input';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';
import type { ClassVideoDto, OnlineClassDto } from '@/src/types/portfolio';

export type StudentPortalSection = 'classroom' | 'videos' | 'attendance' | 'facilities';

const SELECT_CLASS =
  'h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] px-3 text-xs text-zinc-900 dark:text-zinc-100';

export function StudentPortalWorkspace({ section }: { section: StudentPortalSection }) {
  const qc = useQueryClient();
  const [playingVideo, setPlayingVideo] = useState<ClassVideoDto | null>(null);
  const [activeClassroom, setActiveClassroom] = useState<OnlineClassDto | null>(null);

  // Enrollment form for new students
  const [enrollClassId, setEnrollClassId] = useState<number>(0);
  const [enrollSectionId, setEnrollSectionId] = useState<number>(0);
  const [enrollPhone, setEnrollPhone] = useState('');
  const [enrollGuardian, setEnrollGuardian] = useState('');
  const [enrollAddress, setEnrollAddress] = useState('');

  // Assignment submission drafts
  const [subTexts, setSubTexts] = useState<Record<number, string>>({});
  const [subUrls, setSubUrls] = useState<Record<number, string>>({});

  const classesQuery = useQuery({ queryKey: ['academy-classes'], queryFn: academyApi.getClasses });
  const studentQuery = useQuery({ queryKey: ['my-student-portal'], queryFn: academyApi.getMyStudentPortal });

  const classes = classesQuery.data || [];
  useEffect(() => {
    if (classes.length > 0 && !enrollClassId) {
      setEnrollClassId(classes[0].id);
      if (classes[0].sections[0]) setEnrollSectionId(classes[0].sections[0].id);
    }
  }, [classes, enrollClassId]);

  const enrollMutation = useMutation({
    mutationFn: () =>
      academyApi.enrollAsStudent({
        classId: enrollClassId,
        sectionId: enrollSectionId,
        phone: enrollPhone,
        guardianName: enrollGuardian,
        address: enrollAddress,
      }),
    onSuccess: (res) => {
      toast.success(`Enrolled as ${res.studentCode} (Roll #${res.rollNumber})!`);
      qc.invalidateQueries({ queryKey: ['my-student-portal'] });
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Enrollment failed.'),
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      academyApi.submitAssignment(assignmentId, {
        submissionText: subTexts[assignmentId] || '',
        submissionUrl: subUrls[assignmentId] || '',
      }),
    onSuccess: () => {
      toast.success('Assignment submitted successfully.');
      qc.invalidateQueries({ queryKey: ['my-student-portal'] });
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Submission failed.'),
  });

  if (studentQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const portal = studentQuery.data;

  if (!portal?.enrolled || !portal.student) {
    const selectedClass = classes.find((c) => c.id === enrollClassId);
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-base font-semibold">Join Your Class &amp; Section (Student Enrollment)</h2>
              <p className="text-xs text-zinc-500">
                Select your Class and Section below to unlock Live Online Classes, Attendance Tracking, Video Lectures, Routine &amp; Assignments.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              enrollMutation.mutate();
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl"
          >
            <div>
              <label className="text-xs font-medium block mb-1">Class / Batch *</label>
              <select
                className={SELECT_CLASS}
                value={enrollClassId}
                onChange={(e) => {
                  const cid = Number(e.target.value);
                  setEnrollClassId(cid);
                  setEnrollSectionId(classes.find((c) => c.id === cid)?.sections[0]?.id || 0);
                }}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Section *</label>
              <select
                className={SELECT_CLASS}
                value={enrollSectionId}
                onChange={(e) => setEnrollSectionId(Number(e.target.value))}
              >
                {(selectedClass?.sections || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.roomLabel || 'Virtual'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Phone Number</label>
              <Input value={enrollPhone} onChange={(e) => setEnrollPhone(e.target.value)} placeholder="+977 98XXXXXXXX" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Guardian Name (Optional)</label>
              <Input value={enrollGuardian} onChange={(e) => setEnrollGuardian(e.target.value)} placeholder="Parent / Guardian" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium block mb-1">Address</label>
              <Input value={enrollAddress} onChange={(e) => setEnrollAddress(e.target.value)} placeholder="City, Nepal" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={enrollMutation.isPending || !enrollClassId || !enrollSectionId}>
                <GraduationCap className="h-4 w-4" />
                <span>{enrollMutation.isPending ? 'Enrolling...' : 'Enroll in Class & Section'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  const { student, attendanceSummary, attendanceRecords, onlineClasses, videos, timetable, assignments, notices } = portal;

  return (
    <div className="space-y-6">
      {/* Student Identity Header Banner */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {student.fullName} · <span className="font-mono text-blue-600 dark:text-blue-400">{student.studentCode}</span>
            </p>
            <p className="text-xs text-zinc-500">
              {student.className} · {student.sectionName} · Roll #{student.rollNumber} · Teacher: {student.classTeacher}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <p className="text-zinc-500">Attendance</p>
            <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
              {attendanceSummary.percentage}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500">Live Now</p>
            <p className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">
              {onlineClasses.filter((o) => o.status === 'live').length}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: ONLINE LIVE CLASSES */}
      {section === 'classroom' ? (
        <div className="space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-rose-500" />
            <span>Live &amp; Scheduled Online Classes ({student.className} — {student.sectionName})</span>
          </h2>
          {onlineClasses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-xs text-zinc-500">
                No online classes scheduled for your class section yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {onlineClasses.map((oc) => (
                <Card key={oc.id} className={oc.status === 'live' ? 'border-rose-500/50' : undefined}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span
                        className={`rounded px-2 py-0.5 uppercase font-semibold ${
                          oc.status === 'live'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {oc.status === 'live' ? 'LIVE NOW' : oc.status}
                      </span>
                      <span className="text-zinc-500">
                        {oc.scheduledDate} · {oc.startTime} ({oc.durationMinutes}m)
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{oc.title}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {oc.subject} · Instructor: {oc.instructorName}
                      </p>
                    </div>
                    {oc.description ? <p className="text-xs text-zinc-600 dark:text-zinc-400">{oc.description}</p> : null}
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {oc.autoAttendance ? 'Auto-marks Present on join' : 'Manual attendance'}
                      </span>
                      <Button size="sm" onClick={() => setActiveClassroom(oc)}>
                        <Video className="h-3.5 w-3.5" />
                        <span>Join Live Class</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* SECTION 2: VIDEO LECTURES */}
      {section === 'videos' ? (
        <div className="space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Class &amp; Section Lecture Videos</span>
          </h2>
          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-xs text-zinc-500">
                No lecture videos published for your section yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((vid) => (
                <Card key={vid.id} className="flex flex-col justify-between">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <span className="text-blue-600 dark:text-blue-400">{vid.subject}</span>
                      <span>{vid.sourceType === 'upload' ? 'Uploaded Video' : 'Video Link'}</span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{vid.title}</h3>
                    {vid.description ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">{vid.description}</p>
                    ) : null}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-zinc-500">
                        {vid.durationLabel || 'Lecture'} · {vid.viewsCount} views
                      </span>
                      <Button size="sm" onClick={() => setPlayingVideo(vid)}>
                        <Play className="h-3.5 w-3.5" />
                        <span>Watch</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* SECTION 3: MY ATTENDANCE */}
      {section === 'attendance' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Attendance Rate</p>
                <p className="mt-1 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {attendanceSummary.percentage}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Present Days</p>
                <p className="mt-1 font-mono text-2xl font-bold">{attendanceSummary.presentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Late Days</p>
                <p className="mt-1 font-mono text-2xl font-bold text-amber-600">{attendanceSummary.lateCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Absent Days</p>
                <p className="mt-1 font-mono text-2xl font-bold text-rose-600">{attendanceSummary.absentCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Attendance History Register</span>
              </h2>
            </CardHeader>
            <CardContent>
              {attendanceRecords.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">No attendance records marked yet.</p>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  {attendanceRecords.map((rec) => (
                    <div key={rec.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-semibold">{rec.attendanceDate}</span>
                        {rec.remarks ? <span className="ml-2 text-zinc-500">— {rec.remarks}</span> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-zinc-500">Marked by {rec.markedBy}</span>
                        <span
                          className={`font-mono uppercase font-semibold text-[11px] ${
                            rec.status === 'present'
                              ? 'text-emerald-600'
                              : rec.status === 'absent'
                                ? 'text-rose-600'
                                : 'text-amber-600'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* SECTION 4: ASSIGNMENTS, TIMETABLE & NOTICES */}
      {section === 'facilities' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Weekly Section Routine / Timetable</span>
                </h2>
              </CardHeader>
              <CardContent>
                {timetable.length === 0 ? (
                  <p className="text-xs text-zinc-500">No timetable slots published for your section yet.</p>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                    {timetable.map((slot) => (
                      <div key={slot.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{slot.subject}</p>
                          <p className="text-[11px] text-zinc-500">{slot.instructorName} · {slot.roomOrMode}</p>
                        </div>
                        <div className="text-right font-mono">
                          <p className="text-blue-600 dark:text-blue-400">{slot.dayOfWeek}</p>
                          <p className="text-[11px] text-zinc-500">{slot.startTime}–{slot.endTime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Class &amp; Section Notices</span>
                </h2>
              </CardHeader>
              <CardContent>
                {notices.length === 0 ? (
                  <p className="text-xs text-zinc-500">No notices right now.</p>
                ) : (
                  <div className="space-y-3">
                    {notices.map((n) => (
                      <div key={n.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{n.title}</p>
                          <span className="font-mono text-[10px] uppercase text-blue-600">{n.priority}</span>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Homework &amp; Assignments</span>
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignments.length === 0 ? (
                <p className="text-xs text-zinc-500">No assignments posted for your section yet.</p>
              ) : (
                assignments.map((as) => (
                  <div key={as.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{as.title}</p>
                        <p className="text-zinc-500">{as.subject} · Due: {as.dueDate} · Max {as.maxMarks} marks</p>
                      </div>
                      {as.submission ? (
                        <span className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {as.submission.status === 'graded'
                            ? `Graded: ${as.submission.marksObtained}/${as.maxMarks}`
                            : 'Submitted'}
                        </span>
                      ) : null}
                    </div>
                    {as.description ? <p className="text-zinc-600 dark:text-zinc-400">{as.description}</p> : null}
                    {as.submission?.feedback ? (
                      <p className="rounded bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                        Instructor Feedback: {as.submission.feedback}
                      </p>
                    ) : null}
                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <Textarea
                        value={subTexts[as.id] ?? as.submission?.submissionText ?? ''}
                        onChange={(e) => setSubTexts((p) => ({ ...p, [as.id]: e.target.value }))}
                        placeholder="Write your assignment answer or project notes..."
                      />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          value={subUrls[as.id] ?? as.submission?.submissionUrl ?? ''}
                          onChange={(e) => setSubUrls((p) => ({ ...p, [as.id]: e.target.value }))}
                          placeholder="Optional GitHub / Drive submission link"
                          className="h-9 text-xs"
                        />
                        <Button
                          size="sm"
                          disabled={submitAssignmentMutation.isPending}
                          onClick={() => submitAssignmentMutation.mutate(as.id)}
                          className="shrink-0"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{as.submission ? 'Update Submission' : 'Submit Assignment'}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {playingVideo ? <LectureVideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} /> : null}
      {activeClassroom ? <LiveClassroomRoomModal onlineClass={activeClassroom} onClose={() => setActiveClassroom(null)} /> : null}
    </div>
  );
}

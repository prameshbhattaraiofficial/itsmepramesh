import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CalendarClock,
  GraduationCap,
  Layers,
  LogIn,
  Play,
  Radio,
  Video,
} from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { academyApi } from '@/src/services/api/academyApi';
import {
  LectureVideoPlayerModal,
  LiveClassroomRoomModal,
} from '@/src/features/academy/AcademyMediaComponents';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';
import type { ClassVideoDto, OnlineClassDto } from '@/src/types/portfolio';

export function PublicClassesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [selectedSectionId, setSelectedSectionId] = useState<number>(0);
  const [playingVideo, setPlayingVideo] = useState<ClassVideoDto | null>(null);
  const [activeClassroom, setActiveClassroom] = useState<OnlineClassDto | null>(null);

  useEffect(() => {
    document.title = `${t('onlineClassesTitle')} — Pramesh Bhattarai`;
  }, [t]);

  const classesQuery = useQuery({ queryKey: ['academy-classes'], queryFn: academyApi.getClasses });
  const onlineQuery = useQuery({
    queryKey: ['academy-online-classes', selectedClassId, selectedSectionId],
    queryFn: () =>
      academyApi.getOnlineClasses({
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
      }),
  });
  const videosQuery = useQuery({
    queryKey: ['academy-videos', selectedClassId, selectedSectionId],
    queryFn: () =>
      academyApi.getVideos({
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
      }),
  });
  const timetableQuery = useQuery({
    queryKey: ['academy-timetable', selectedClassId, selectedSectionId],
    queryFn: () =>
      academyApi.getTimetable({
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
      }),
  });
  const noticesQuery = useQuery({
    queryKey: ['academy-notices', selectedClassId, selectedSectionId],
    queryFn: () =>
      academyApi.getNotices({
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
      }),
  });

  const classes = classesQuery.data || [];
  const activeSections = useMemo(
    () => (selectedClassId ? classes.find((c) => c.id === selectedClassId)?.sections || [] : []),
    [classes, selectedClassId]
  );

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-6 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-8">
          <div className="space-y-2 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Academy · Class &amp; Section Portal
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {t('onlineClassesTitle')}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Browse class-wise and section-wise live online classrooms, recorded lecture videos, weekly timetables, attendance tracking, and student facilities.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {user ? (
              <Button asChild size="sm">
                <Link to={user.role === 'Admin' ? '/admin' : '/dashboard'}>
                  <GraduationCap className="h-4 w-4" />
                  <span>{user.role === 'Admin' ? 'Manage Academy in Admin' : 'Open My Student Portal'}</span>
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">
                  <LogIn className="h-4 w-4" />
                  <span>Student / Portal Login</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Class & Section Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] p-1">
            <button
              type="button"
              onClick={() => {
                setSelectedClassId(0);
                setSelectedSectionId(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                selectedClassId === 0 ? 'bg-blue-600 text-white' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              All Classes
            </button>
            {classes.map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => {
                  setSelectedClassId(cls.id);
                  setSelectedSectionId(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedClassId === cls.id ? 'bg-blue-600 text-white' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>

          {activeSections.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] p-1">
              <button
                type="button"
                onClick={() => setSelectedSectionId(0)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedSectionId === 0 ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-500'
                }`}
              >
                All Sections
              </button>
              {activeSections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    selectedSectionId === sec.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'text-zinc-500'
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Live & Scheduled Online Classes */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Radio className="h-4 w-4 text-rose-500" />
            <span>Live &amp; Upcoming Online Classes</span>
          </h2>
          {onlineQuery.isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (onlineQuery.data || []).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-xs text-zinc-500">
                No live or scheduled sessions for this selection.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(onlineQuery.data || []).map((oc) => (
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
                        {oc.status === 'live' ? t('liveNowBadge') : oc.status}
                      </span>
                      <span className="text-zinc-500">
                        {oc.scheduledDate} · {oc.startTime}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                        {oc.className} · {oc.sectionName}
                      </p>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">{oc.title}</h3>
                    </div>
                    {oc.description ? <p className="text-xs text-zinc-600 dark:text-zinc-400">{oc.description}</p> : null}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs text-zinc-500">Instructor: {oc.instructorName}</span>
                      {user ? (
                        <Button size="sm" onClick={() => setActiveClassroom(oc)}>
                          <Video className="h-3.5 w-3.5" />
                          <span>{t('joinLiveClass')}</span>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/login">Sign in to Join</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Lecture Video Library */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Recorded Lecture Videos (Uploaded &amp; Linked)</span>
          </h2>
          {videosQuery.isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : (videosQuery.data || []).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-xs text-zinc-500">
                No lecture videos available for this filter yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(videosQuery.data || []).map((vid) => (
                <Card key={vid.id} className="flex flex-col justify-between">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <span className="text-blue-600 dark:text-blue-400">{vid.className}</span>
                      <span>{vid.sectionName}</span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{vid.title}</h3>
                    {vid.description ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">{vid.description}</p>
                    ) : null}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-zinc-500">
                        {vid.durationLabel || vid.subject} · {vid.viewsCount} views
                      </span>
                      <Button size="sm" onClick={() => setPlayingVideo(vid)}>
                        <Play className="h-3.5 w-3.5" />
                        <span>{t('watchVideo')}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Timetable & Notices */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Class &amp; Section Weekly Timetable</span>
              </h2>
            </CardHeader>
            <CardContent className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              {(timetableQuery.data || []).length === 0 ? (
                <p className="text-zinc-500 py-4">No timetable slots for this filter.</p>
              ) : (
                (timetableQuery.data || []).map((slot) => (
                  <div key={slot.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{slot.subject}</p>
                      <p className="text-[11px] text-zinc-500">
                        {slot.className} · {slot.sectionName} · {slot.roomOrMode}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-blue-600 dark:text-blue-400">{slot.dayOfWeek}</p>
                      <p className="text-[11px] text-zinc-500">{slot.startTime}–{slot.endTime}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Notices &amp; Announcements</span>
              </h2>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {(noticesQuery.data || []).length === 0 ? (
                <p className="text-zinc-500 py-4">No notices published right now.</p>
              ) : (
                (noticesQuery.data || []).map((n) => (
                  <div key={n.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{n.title}</p>
                      <span className="font-mono text-[10px] uppercase text-blue-600">{n.priority}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">{n.className} · {n.sectionName}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">{n.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {/* Class & Section Directory Cards */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Classes &amp; Sections Offered</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((cls) => (
              <Card key={cls.id}>
                <CardContent className="p-5 space-y-3">
                  <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                    {cls.code} · {cls.academicYear}
                  </p>
                  <h3 className="text-base font-bold">{cls.name}</h3>
                  {cls.description ? <p className="text-xs text-zinc-600 dark:text-zinc-400">{cls.description}</p> : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {cls.sections.map((sec) => (
                      <div
                        key={sec.id}
                        className="rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs"
                      >
                        <span className="font-semibold">{sec.name}</span>
                        <span className="text-zinc-500 ml-1.5 font-mono text-[11px]">({sec.studentsCount}/{sec.capacity})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {playingVideo ? <LectureVideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} /> : null}
      {activeClassroom ? <LiveClassroomRoomModal onlineClass={activeClassroom} onClose={() => setActiveClassroom(null)} /> : null}
    </div>
  );
}

import { httpClient, unwrapData } from '@/src/services/api/httpClient';
import type {
  AcademyAdminOverviewDto,
  AcademyNoticeDto,
  ApiResponse,
  AssignmentSubmissionDto,
  AttendanceRegisterRowDto,
  AttendanceStatus,
  ClassAssignmentDto,
  ClassVideoDto,
  OnlineClassDto,
  OnlineClassMessageDto,
  SchoolClassDto,
  StudentDto,
  StudentPortalOverviewDto,
  TimetableEntryDto,
} from '@/src/types/portfolio';

export const academyApi = {
  // --- Public & Student Endpoints ---
  getClasses: () =>
    httpClient.get<ApiResponse<SchoolClassDto[]>>('/academy/classes').then((r) => unwrapData(r.data)),

  getOnlineClasses: (params?: { classId?: number; sectionId?: number }) =>
    httpClient
      .get<ApiResponse<OnlineClassDto[]>>('/academy/online-classes', { params })
      .then((r) => unwrapData(r.data)),

  getVideos: (params?: { classId?: number; sectionId?: number }) =>
    httpClient.get<ApiResponse<ClassVideoDto[]>>('/academy/videos', { params }).then((r) => unwrapData(r.data)),

  trackVideoView: (videoId: number) =>
    httpClient.post<ApiResponse<{ tracked: boolean }>>(`/academy/videos/${videoId}/view`).then((r) => unwrapData(r.data)),

  getTimetable: (params?: { classId?: number; sectionId?: number }) =>
    httpClient
      .get<ApiResponse<TimetableEntryDto[]>>('/academy/timetable', { params })
      .then((r) => unwrapData(r.data)),

  getNotices: (params?: { classId?: number; sectionId?: number }) =>
    httpClient.get<ApiResponse<AcademyNoticeDto[]>>('/academy/notices', { params }).then((r) => unwrapData(r.data)),

  getOnlineClassMessages: (onlineClassId: number) =>
    httpClient
      .get<ApiResponse<OnlineClassMessageDto[]>>(`/academy/online-classes/${onlineClassId}/messages`)
      .then((r) => unwrapData(r.data)),

  sendOnlineClassMessage: (onlineClassId: number, message: string) =>
    httpClient
      .post<ApiResponse<OnlineClassMessageDto>>(`/academy/online-classes/${onlineClassId}/messages`, { message })
      .then((r) => unwrapData(r.data)),

  uploadOnlineClassVoice: (onlineClassId: number, file: File, durationSec: number) => {
    const form = new FormData();
    form.append('audio', file);
    form.append('durationSec', String(durationSec));
    return httpClient
      .post<ApiResponse<OnlineClassMessageDto>>(`/academy/online-classes/${onlineClassId}/voice`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => unwrapData(r.data));
  },

  joinOnlineClass: (onlineClassId: number) =>
    httpClient
      .post<ApiResponse<{ onlineClass: OnlineClassDto; attendanceMarked: boolean }>>(
        `/academy/online-classes/${onlineClassId}/join`
      )
      .then((r) => unwrapData(r.data)),

  getMyStudentPortal: () =>
    httpClient.get<ApiResponse<StudentPortalOverviewDto>>('/academy/student/me').then((r) => unwrapData(r.data)),

  enrollAsStudent: (payload: {
    classId: number;
    sectionId: number;
    phone?: string;
    guardianName?: string;
    address?: string;
  }) =>
    httpClient
      .post<ApiResponse<{ id: number; studentCode: string; rollNumber: string }>>('/academy/student/enroll', payload)
      .then((r) => unwrapData(r.data)),

  submitAssignment: (assignmentId: number, payload: { submissionText: string; submissionUrl?: string }) =>
    httpClient
      .post<ApiResponse<{ assignmentId: number }>>(`/academy/student/assignments/${assignmentId}/submit`, payload)
      .then((r) => unwrapData(r.data)),

  // --- Admin Endpoints ---
  adminGetOverview: () =>
    httpClient.get<ApiResponse<AcademyAdminOverviewDto>>('/admin/academy/overview').then((r) => unwrapData(r.data)),

  adminGetClasses: () =>
    httpClient.get<ApiResponse<SchoolClassDto[]>>('/admin/academy/classes').then((r) => unwrapData(r.data)),

  adminCreateClass: (payload: {
    name: string;
    code: string;
    description?: string;
    academicYear?: string;
    isActive?: boolean;
    displayOrder?: number;
  }) => httpClient.post<ApiResponse<{ id: number }>>('/admin/academy/classes', payload).then((r) => unwrapData(r.data)),

  adminUpdateClass: (
    id: number,
    payload: {
      name: string;
      code: string;
      description?: string;
      academicYear?: string;
      isActive?: boolean;
      displayOrder?: number;
    }
  ) => httpClient.put<ApiResponse<{ id: number }>>(`/admin/academy/classes/${id}`, payload).then((r) => unwrapData(r.data)),

  adminDeleteClass: (id: number) =>
    httpClient.delete<ApiResponse<null>>(`/admin/academy/classes/${id}`).then((r) => unwrapData(r.data)),

  adminCreateSection: (payload: {
    classId: number;
    name: string;
    roomLabel?: string;
    classTeacher?: string;
    capacity?: number;
  }) => httpClient.post<ApiResponse<{ id: number }>>('/admin/academy/sections', payload).then((r) => unwrapData(r.data)),

  adminDeleteSection: (id: number) =>
    httpClient.delete<ApiResponse<null>>(`/admin/academy/sections/${id}`).then((r) => unwrapData(r.data)),

  adminGetStudents: (params?: { classId?: number; sectionId?: number; search?: string }) =>
    httpClient.get<ApiResponse<StudentDto[]>>('/admin/academy/students', { params }).then((r) => unwrapData(r.data)),

  adminCreateStudent: (payload: {
    studentCode?: string;
    fullName: string;
    email: string;
    phone?: string;
    classId: number;
    sectionId: number;
    rollNumber?: string;
    guardianName?: string;
    guardianPhone?: string;
    address?: string;
    status?: 'active' | 'inactive' | 'graduated';
    createPortalAccount?: boolean;
    portalPassword?: string;
  }) =>
    httpClient
      .post<ApiResponse<{ id: number; studentCode: string; rollNumber: string }>>('/admin/academy/students', payload)
      .then((r) => unwrapData(r.data)),

  adminUpdateStudent: (
    id: number,
    payload: {
      fullName: string;
      email: string;
      phone?: string;
      classId: number;
      sectionId: number;
      rollNumber?: string;
      guardianName?: string;
      guardianPhone?: string;
      address?: string;
      status?: 'active' | 'inactive' | 'graduated';
    }
  ) => httpClient.put<ApiResponse<{ id: number }>>(`/admin/academy/students/${id}`, payload).then((r) => unwrapData(r.data)),

  adminDeleteStudent: (id: number) =>
    httpClient.delete<ApiResponse<null>>(`/admin/academy/students/${id}`).then((r) => unwrapData(r.data)),

  adminGetAttendance: (params: { classId: number; sectionId: number; date: string }) =>
    httpClient
      .get<ApiResponse<{ attendanceDate: string; classId: number; sectionId: number; rows: AttendanceRegisterRowDto[] }>>(
        '/admin/academy/attendance',
        { params }
      )
      .then((r) => unwrapData(r.data)),

  adminSaveBulkAttendance: (payload: {
    classId: number;
    sectionId: number;
    attendanceDate: string;
    entries: { studentId: number; status: AttendanceStatus; remarks?: string }[];
  }) => httpClient.post<ApiResponse<null>>('/admin/academy/attendance/bulk', payload).then((r) => unwrapData(r.data)),

  adminGetOnlineClasses: () =>
    httpClient.get<ApiResponse<OnlineClassDto[]>>('/admin/academy/online-classes').then((r) => unwrapData(r.data)),

  adminCreateOnlineClass: (payload: {
    title: string;
    subject: string;
    classId: number;
    sectionId?: number | null;
    instructorName?: string;
    description?: string;
    scheduledDate: string;
    startTime: string;
    durationMinutes?: number;
    meetingUrl?: string;
    status?: 'scheduled' | 'live' | 'completed' | 'cancelled';
    autoAttendance?: boolean;
  }) =>
    httpClient
      .post<ApiResponse<{ id: number }>>('/admin/academy/online-classes', payload)
      .then((r) => unwrapData(r.data)),

  adminUpdateOnlineClassStatus: (id: number, status: 'scheduled' | 'live' | 'completed' | 'cancelled') =>
    httpClient
      .patch<ApiResponse<{ id: number; status: string }>>(`/admin/academy/online-classes/${id}/status`, { status })
      .then((r) => unwrapData(r.data)),

  adminDeleteOnlineClass: (id: number) =>
    httpClient.delete<ApiResponse<null>>(`/admin/academy/online-classes/${id}`).then((r) => unwrapData(r.data)),

  adminUploadVideoFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return httpClient
      .post<ApiResponse<{ fileName: string; originalName: string; sizeBytes: number }>>(
        '/admin/academy/videos/upload',
        formData
      )
      .then((r) => unwrapData(r.data));
  },

  adminGetVideos: () =>
    httpClient.get<ApiResponse<ClassVideoDto[]>>('/admin/academy/videos').then((r) => unwrapData(r.data)),

  adminCreateVideo: (payload: {
    title: string;
    subject: string;
    classId: number;
    sectionId?: number | null;
    description?: string;
    sourceType: 'upload' | 'link';
    videoUrl?: string;
    fileName?: string | null;
    durationLabel?: string;
    instructorName?: string;
    notesUrl?: string;
    isPublished?: boolean;
  }) => httpClient.post<ApiResponse<{ id: number }>>('/admin/academy/videos', payload).then((r) => unwrapData(r.data)),

  adminDeleteVideo: (id: number) =>
    httpClient.delete<ApiResponse<null>>(`/admin/academy/videos/${id}`).then((r) => unwrapData(r.data)),

  adminGetTimetable: () =>
    httpClient.get<ApiResponse<TimetableEntryDto[]>>('/admin/academy/timetable').then((r) => unwrapData(r.data)),

  adminCreateTimetable: (payload: {
    classId: number;
    sectionId: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    subject: string;
    instructorName?: string;
    roomOrMode?: string;
  }) => httpClient.post<ApiResponse<{ id: number }>>('/admin/academy/timetable', payload).then((r) => unwrapData(r.data)),

  adminDeleteTimetable: (id: number) =>
    httpClient.delete<ApiResponse<null>>(`/admin/academy/timetable/${id}`).then((r) => unwrapData(r.data)),

  adminGetAssignments: () =>
    httpClient.get<ApiResponse<ClassAssignmentDto[]>>('/admin/academy/assignments').then((r) => unwrapData(r.data)),

  adminCreateAssignment: (payload: {
    classId: number;
    sectionId?: number | null;
    title: string;
    subject: string;
    description?: string;
    dueDate: string;
    maxMarks?: number;
  }) => httpClient.post<ApiResponse<{ id: number }>>('/admin/academy/assignments', payload).then((r) => unwrapData(r.data)),

  adminDeleteAssignment: (id: number) =>
    httpClient.delete<ApiResponse<null>>(`/admin/academy/assignments/${id}`).then((r) => unwrapData(r.data)),

  adminGetSubmissions: (assignmentId: number) =>
    httpClient
      .get<ApiResponse<AssignmentSubmissionDto[]>>(`/admin/academy/assignments/${assignmentId}/submissions`)
      .then((r) => unwrapData(r.data)),

  adminGradeSubmission: (submissionId: number, payload: { marksObtained: number; feedback?: string }) =>
    httpClient
      .patch<ApiResponse<{ id: number }>>(`/admin/academy/submissions/${submissionId}/grade`, payload)
      .then((r) => unwrapData(r.data)),

  adminGetNotices: () =>
    httpClient.get<ApiResponse<AcademyNoticeDto[]>>('/admin/academy/notices').then((r) => unwrapData(r.data)),

  adminCreateNotice: (payload: {
    classId?: number | null;
    sectionId?: number | null;
    title: string;
    content: string;
    priority?: 'normal' | 'important' | 'urgent';
  }) => httpClient.post<ApiResponse<{ id: number }>>('/admin/academy/notices', payload).then((r) => unwrapData(r.data)),

  adminDeleteNotice: (id: number) =>
    httpClient.delete<ApiResponse<null>>(`/admin/academy/notices/${id}`).then((r) => unwrapData(r.data)),
};

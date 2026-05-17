/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../components/layouts/MainLayout";
import {
  Button,
  ClassBadge,
  PageHeader,
  StatCard,
  StatusBadge,
  ToastProvider,
} from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import type { Announcement } from "../interfaces/announcement";
import type { Assignment } from "../interfaces/assignment";
import type { ClassRoom } from "../interfaces/class";
import type { StudySchedule } from "../interfaces/studySchedule";
import type { Submission } from "../interfaces/submission";
import { PATHS } from "../routes/path";
import AnnouncementService from "../services/AnnouncementService";
import AssignmentService from "../services/AssignmentService";
import ClassService from "../services/ClassService";
import StudyScheduleService from "../services/StudyScheduleService";
import SubmissionService from "../services/SubmissionService";
import { notify } from "../util/notify";
import { formatDate, getTodayDate, isPastDate, isWithinDays, unwrapData } from "../util/studySyncData";

const studentDeadlines = [
  { title: "Calculus problem set", className: "STEM 12-A", subject: "Math", status: "pending", due: "Tomorrow" },
  { title: "Research outline", className: "ENG 101", subject: "English", status: "submitted", due: "May 20" },
  { title: "Biology lab notes", className: "BIO 2", subject: "Science", status: "overdue", due: "Yesterday" },
] as const;

const teacherQueue = [
  { title: "Essay submissions", className: "ENG 101", subject: "English", status: "submitted", count: 14 },
  { title: "Quiz corrections", className: "STEM 12-A", subject: "Math", status: "pending", count: 8 },
  { title: "Lab reports", className: "BIO 2", subject: "Science", status: "graded", count: 22 },
] as const;

interface AssignmentData {
  assignments: Assignment[];
}

interface ScheduleData {
  study_schedules: StudySchedule[];
}

interface AnnouncementData {
  announcements: Announcement[];
}

interface ClassData {
  classes: ClassRoom[];
}

interface SubmissionData {
  submissions: Submission[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [schedules, setSchedules] = useState<StudySchedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<ClassRoom[]>([]);
  const [teacherSubmissions, setTeacherSubmissions] = useState<Submission[]>([]);

  const fetchStudentDashboard = useCallback(async () => {
    if (!isStudent) return;

    try {
      const [assignmentResponse, scheduleResponse, announcementResponse] = await Promise.all([
        AssignmentService.getAll({ limit: 8 }),
        StudyScheduleService.getAll({ limit: 8 }),
        AnnouncementService.getAll({ limit: 3 }),
      ]);
      setAssignments(unwrapData<AssignmentData>(assignmentResponse, { assignments: [] }).assignments);
      setSchedules(unwrapData<ScheduleData>(scheduleResponse, { study_schedules: [] }).study_schedules);
      setAnnouncements(unwrapData<AnnouncementData>(announcementResponse, { announcements: [] }).announcements);
    } catch {
      notify.error("Failed to load dashboard data.");
    }
  }, [isStudent]);

  useEffect(() => {
    fetchStudentDashboard();
  }, [fetchStudentDashboard]);

  const fetchTeacherDashboard = useCallback(async () => {
    if (!isTeacher) return;

    try {
      const [classResponse, assignmentResponse] = await Promise.all([
        ClassService.getAll({ limit: 100 }),
        AssignmentService.getAll({ limit: 100 }),
      ]);
      const classList = unwrapData<ClassData>(classResponse, { classes: [] }).classes;
      const assignmentList = unwrapData<AssignmentData>(assignmentResponse, { assignments: [] }).assignments;
      const submissionResponses = await Promise.all(
        assignmentList.map((assignment) => SubmissionService.getAllForAssignment(assignment.id, { limit: 100 })),
      );

      setTeacherClasses(classList);
      setAssignments(assignmentList);
      setTeacherSubmissions(
        submissionResponses.flatMap((response) => unwrapData<SubmissionData>(response, { submissions: [] }).submissions),
      );
    } catch {
      notify.error("Failed to load teacher dashboard data.");
    }
  }, [isTeacher]);

  useEffect(() => {
    fetchTeacherDashboard();
  }, [fetchTeacherDashboard]);

  const studentStats = useMemo(() => {
    const pending = assignments.filter((assignment) => !assignment.submission_status).length;
    const upcoming = assignments.filter((assignment) => isWithinDays(assignment.due_date, 7)).length;
    const completedSchedules = schedules.filter((schedule) => schedule.is_completed).length;
    const completion = schedules.length ? Math.round((completedSchedules / schedules.length) * 100) : 0;

    return {
      pending,
      upcoming,
      today: schedules.filter((schedule) => schedule.date === getTodayDate()),
      completion,
    };
  }, [assignments, schedules]);

  const teacherStats = useMemo(() => {
    const totalStudents = teacherClasses.reduce((sum, classRoom) => sum + (classRoom.students_count ?? 0), 0);
    const pendingReviews = teacherSubmissions.filter((submission) => submission.status === "submitted").length;
    const graded = teacherSubmissions.filter((submission) => submission.status === "graded").length;
    const engagement = teacherSubmissions.length
      ? Math.round((graded / teacherSubmissions.length) * 100)
      : 0;

    return {
      pendingReviews,
      activeClasses: teacherClasses.filter((classRoom) => classRoom.is_active).length,
      totalStudents,
      engagement,
    };
  }, [teacherClasses, teacherSubmissions]);

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow={isAdmin ? "Admin Console" : isTeacher ? "Teacher Dashboard" : "Student Dashboard"}
          title={isAdmin ? "Platform Overview" : `Welcome, ${user?.name ?? "StudySync"}`}
          description={
            isAdmin
              ? "Manage users and keep the StudySync foundation healthy while academic modules come online."
              : isTeacher
                ? "Review student work, monitor classes, and keep class communication moving."
                : "Track assignments, study sessions, deadlines, and class updates from one academic command center."
          }
          action={
            isAdmin ? (
              <Button type="button" variant="primary" iconName="FaUsers" onClick={() => window.location.assign(PATHS.APP.USERS)}>
                Manage Users
              </Button>
            ) : isTeacher ? (
              <Button type="button" variant="primary" iconName="FaChalkboard" onClick={() => window.location.assign(PATHS.APP.TEACHER.CLASSES)}>
                My Classes
              </Button>
            ) : (
              <Button type="button" variant="primary" iconName="FaCalendarDays" onClick={() => window.location.assign(PATHS.APP.PLANNER)}>
                Plan Study Time
              </Button>
            )
          }
        />

        {isAdmin ? (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard iconName="FaUserShield" label="Admins" value="1" tone="primary" />
            <StatCard iconName="FaChalkboardUser" label="Teachers" value="2" tone="secondary" />
            <StatCard iconName="FaUserGraduate" label="Students" value="5" tone="success" />
          </div>
        ) : isTeacher ? (
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard iconName="FaInbox" label="Pending Reviews" value={teacherStats.pendingReviews} trend="Across active classes" tone="warning" />
            <StatCard iconName="FaChalkboard" label="Active Classes" value={teacherStats.activeClasses} tone="primary" />
            <StatCard iconName="FaUserGroup" label="Students" value={teacherStats.totalStudents} tone="success" />
            <StatCard iconName="FaChartBar" label="Graded Work" value={`${teacherStats.engagement}%`} tone="info" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard iconName="FaClipboardList" label="Pending Work" value={studentStats.pending} trend={`${studentStats.upcoming} due this week`} tone="warning" />
            <StatCard iconName="FaCalendarCheck" label="Upcoming Deadlines" value={studentStats.upcoming} tone="danger" />
            <StatCard iconName="FaClock" label="Today" value={`${studentStats.today.length} blocks`} trend="Study sessions" tone="primary" />
            <StatCard iconName="FaGaugeHigh" label="Completion" value={`${studentStats.completion}%`} tone="success" />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                  {isTeacher ? "Review Queue" : "Academic Queue"}
                </h2>
                <p className="text-sm font-medium text-text-muted">
                  {isTeacher ? "Submissions that need attention." : "Work that needs your attention soon."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                iconName="FaArrowRight"
                onClick={() => window.location.assign(isTeacher ? PATHS.APP.TEACHER.SUBMISSIONS : PATHS.APP.ASSIGNMENTS)}
              >
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {isTeacher
                ? (teacherSubmissions.length ? teacherSubmissions : teacherQueue).slice(0, 4).map((item) => (
                    <article
                      key={"id" in item ? item.id : `${item.className}-${item.title}`}
                      className="flex flex-col gap-3 rounded-2xl border border-border-muted bg-bg-main p-4 transition-all duration-300 hover:border-primary/40 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-2">
                        {"student_id" in item ? null : <ClassBadge name={item.className} subject={item.subject} />}
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-text">
                          {"student_id" in item ? item.assignment?.title ?? "Submission" : item.title}
                        </h3>
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                          {"student_id" in item ? item.student?.name ?? "Student" : `${item.count} submissions`}
                        </p>
                      </div>
                      <StatusBadge status={"student_id" in item ? item.status : item.status} />
                    </article>
                  ))
                : (assignments.length ? assignments : studentDeadlines).slice(0, 4).map((item) => {
                    const isLiveAssignment = "due_date" in item;
                    const status = isLiveAssignment
                      ? item.submission_status === "graded"
                        ? "graded"
                        : item.submission_status === "submitted"
                          ? "submitted"
                          : isPastDate(item.due_date)
                            ? "overdue"
                            : "pending"
                      : item.status;

                    return (
                      <article
                        key={isLiveAssignment ? item.id : `${item.className}-${item.title}`}
                        className="flex flex-col gap-3 rounded-2xl border border-border-muted bg-bg-main p-4 transition-all duration-300 hover:border-primary/40 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-2">
                          {isLiveAssignment && item.class ? (
                            <ClassBadge name={item.class.name} subject={item.class.subject} />
                          ) : !isLiveAssignment ? (
                            <ClassBadge name={item.className} subject={item.subject} />
                          ) : null}
                          <h3 className="text-sm font-black uppercase italic tracking-tighter text-text">
                            {item.title}
                          </h3>
                          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                            {isLiveAssignment ? `Due ${formatDate(item.due_date)}` : item.due}
                          </p>
                        </div>
                        <StatusBadge status={status} />
                      </article>
                    );
                  })}
            </div>
          </section>

          <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
              {isTeacher ? "Class Pulse" : "Today"}
            </h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-border-muted bg-bg-main p-4">
                <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                  {isTeacher ? "Most Active Class" : "Next Study Block"}
                </p>
                <p className="mt-2 text-lg font-black uppercase italic tracking-tighter text-text">
                  {isTeacher ? teacherClasses[0]?.name ?? "No class yet" : studentStats.today[0]?.title ?? "No session planned"}
                </p>
                <p className="mt-1 text-sm font-medium text-text-muted">
                  {isTeacher
                    ? teacherClasses[0]
                      ? `${teacherClasses[0].students_count ?? 0} active students`
                      : "Create a class to begin"
                    : studentStats.today[0]
                      ? `${studentStats.today[0].start_time.slice(0, 5)} - ${studentStats.today[0].end_time.slice(0, 5)}`
                      : "Add one from the Study Planner"}
                </p>
              </div>
              <div className="rounded-2xl border border-border-muted bg-bg-main p-4">
                <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                  Recent Announcement
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-text">
                  {isTeacher
                    ? "Draft a reminder for Friday submissions."
                    : announcements[0]?.title ?? "No recent announcements yet."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default Dashboard;

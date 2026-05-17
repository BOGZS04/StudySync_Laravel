import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../../components/layouts/MainLayout";
import {
  Button,
  ClassBadge,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatCard,
  StatusBadge,
  ToastProvider,
} from "../../components/ui";
import type { Announcement } from "../../interfaces/announcement";
import type { Assignment } from "../../interfaces/assignment";
import type { ClassRoom } from "../../interfaces/class";
import type { User } from "../../interfaces/user";
import AnnouncementService from "../../services/AnnouncementService";
import AssignmentService from "../../services/AssignmentService";
import ClassService from "../../services/ClassService";
import { PATHS } from "../../routes/path";
import { notify } from "../../util/notify";
import { formatDate, unwrapData } from "../../util/studySyncData";

type DetailTab = "assignments" | "students" | "announcements";

interface ClassData {
  class: ClassRoom;
}

interface AssignmentData {
  assignments: Assignment[];
}

interface StudentData {
  students: User[];
}

interface AnnouncementData {
  announcements: Announcement[];
}

const tabs: Array<{ label: string; value: DetailTab }> = [
  { label: "Assignments", value: "assignments" },
  { label: "Students", value: "students" },
  { label: "Announcements", value: "announcements" },
];

const ClassDetail = () => {
  const { id } = useParams();
  const classId = Number(id);
  const [classRoom, setClassRoom] = useState<ClassRoom | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>("assignments");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDetail = useCallback(async () => {
    if (!classId) return;

    setIsLoading(true);
    try {
      const [classResponse, assignmentResponse, studentResponse, announcementResponse] = await Promise.all([
        ClassService.getOne(classId),
        AssignmentService.getByClass(classId, { limit: 100 }),
        ClassService.students(classId, { limit: 100 }),
        AnnouncementService.getAll({ class_id: classId, limit: 100 }),
      ]);

      setClassRoom(unwrapData<ClassData | null>(classResponse, null)?.class ?? null);
      setAssignments(unwrapData<AssignmentData>(assignmentResponse, { assignments: [] }).assignments);
      setStudents(unwrapData<StudentData>(studentResponse, { students: [] }).students);
      setAnnouncements(unwrapData<AnnouncementData>(announcementResponse, { announcements: [] }).announcements);
    } catch {
      notify.error("Failed to load class details.");
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail, refreshKey]);

  const handleRemoveStudent = async (student: User) => {
    if (!classRoom) return;

    try {
      await ClassService.removeStudent(classRoom.id, student.id);
      notify.success("Student removed from class.");
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to remove student.");
    }
  };

  const stats = useMemo(
    () => ({
      students: students.length,
      assignments: assignments.length,
      announcements: announcements.length,
    }),
    [announcements.length, assignments.length, students.length],
  );

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Roster and Work"
          title={classRoom?.name ?? "Class Detail"}
          description={classRoom?.description ?? "View class assignments, enrolled students, announcements, and class-level context."}
          breadcrumb={[
            { label: "My Classes", href: PATHS.APP.TEACHER.CLASSES },
            { label: classRoom?.name ?? "Class" },
          ]}
          action={
            <Link to={PATHS.APP.TEACHER.CLASSES}>
              <Button type="button" variant="outline" iconName="FaArrowLeft">
                Back
              </Button>
            </Link>
          }
        />

        {isLoading ? (
          <LoadingSpinner height="min-h-96" text="Loading class" />
        ) : !classRoom ? (
          <EmptyState
            iconName="FaChalkboardUser"
            title="Class not found"
            message="This class may be unavailable or outside your teacher account."
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard iconName="FaKey" label="Join Code" value={classRoom.class_code} tone="primary" />
              <StatCard iconName="FaUserGroup" label="Students" value={stats.students} tone="success" />
              <StatCard iconName="FaClipboardList" label="Assignments" value={stats.assignments} tone="secondary" />
              <StatCard iconName="FaBullhorn" label="Posts" value={stats.announcements} tone="info" />
            </div>

            <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={`rounded-2xl border px-4 py-2 text-xs font-black uppercase italic tracking-widest transition-all duration-300 active:scale-95 ${
                      activeTab === tab.value
                        ? "border-primary bg-primary text-bg-dark"
                        : "border-border-muted bg-bg-main text-text-muted hover:border-primary hover:text-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                {activeTab === "assignments" && (
                  assignments.length === 0 ? (
                    <EmptyState iconName="FaClipboardList" title="No assignments yet" message="Assignments for this class will appear here." />
                  ) : (
                    <div className="space-y-3">
                      {assignments.map((assignment) => (
                        <article key={assignment.id} className="rounded-2xl border border-border-muted bg-bg-main p-4">
                          <ClassBadge name={classRoom.name} subject={classRoom.subject} />
                          <h2 className="mt-3 text-lg font-black uppercase italic tracking-tighter text-text">{assignment.title}</h2>
                          <p className="mt-1 text-sm font-medium text-text-muted">{assignment.description}</p>
                          <div className="mt-4 flex flex-wrap gap-3 text-xs font-black uppercase italic tracking-widest text-text-muted">
                            <span>Due {formatDate(assignment.due_date)}</span>
                            <span>{assignment.points ?? "--"} pts</span>
                            <span>{assignment.submissions_count ?? 0} submissions</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "students" && (
                  students.length === 0 ? (
                    <EmptyState iconName="FaUserGroup" title="No students yet" message="Students will appear here after they join with the class code." />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {students.map((student) => (
                        <article key={student.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border-muted bg-bg-main p-4">
                          <div>
                            <h2 className="text-sm font-black uppercase italic tracking-tighter text-text">{student.name}</h2>
                            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{student.email}</p>
                          </div>
                          <Button type="button" size="sm" variant="danger" iconName="FaUserMinus" onClick={() => handleRemoveStudent(student)} />
                        </article>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "announcements" && (
                  announcements.length === 0 ? (
                    <EmptyState iconName="FaBullhorn" title="No announcements yet" message="Class announcements will appear here." />
                  ) : (
                    <div className="space-y-3">
                      {announcements.map((announcement) => (
                        <article key={announcement.id} className="rounded-2xl border border-border-muted bg-bg-main p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge status="active" label="posted" />
                            <span className="text-xs font-black uppercase italic tracking-widest text-text-muted">{formatDate(announcement.created_at)}</span>
                          </div>
                          <h2 className="mt-3 text-lg font-black uppercase italic tracking-tighter text-text">{announcement.title}</h2>
                          <p className="mt-2 text-sm font-medium text-text-muted">{announcement.content.replace(/<[^>]*>/g, "")}</p>
                        </article>
                      ))}
                    </div>
                  )
                )}
              </div>
            </section>
          </>
        )}
      </div>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default ClassDetail;

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layouts/MainLayout";
import {
  Button,
  ClassBadge,
  EmptyState,
  LoadingSpinner,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  StatusBadge,
  ToastProvider,
  type PaginationMeta,
  type StatusBadgeStatus,
} from "../../components/ui";
import { InputField, Select } from "../../components/ui/forms";
import type { Assignment, AssignmentStatus } from "../../interfaces/assignment";
import type { ClassRoom } from "../../interfaces/class";
import AssignmentService from "../../services/AssignmentService";
import ClassService from "../../services/ClassService";
import { notify } from "../../util/notify";
import {
  emptyMeta,
  formatDate,
  isPastDate,
  isWithinDays,
  unwrapData,
} from "../../util/studySyncData";
import { PATHS } from "../../routes/path";

type AssignmentTab = "all" | "pending" | "submitted" | "graded";

interface AssignmentListData {
  assignments: Assignment[];
  meta: PaginationMeta;
}

interface ClassListData {
  classes: ClassRoom[];
}

const tabs: Array<{ label: string; value: AssignmentTab }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Submitted", value: "submitted" },
  { label: "Graded", value: "graded" },
];

const getAssignmentStatus = (assignment: Assignment): AssignmentStatus => {
  if (assignment.submission_status === "graded") return "graded";
  if (assignment.submission_status === "submitted") return "submitted";
  if (isPastDate(assignment.due_date)) return "overdue";
  return "pending";
};

const detailPath = (id: number) => PATHS.APP.ASSIGNMENT_DETAIL.replace(":id", String(id));

const Assignments = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<AssignmentTab>("all");
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await AssignmentService.getAll({
        search,
        page,
        limit: 10,
        class_id: classId || undefined,
      });
      const data = unwrapData<AssignmentListData>(response, {
        assignments: [],
        meta: emptyMeta,
      });
      setAssignments(data.assignments);
      setMeta(data.meta);
    } catch {
      notify.error("Failed to load assignments.");
    } finally {
      setIsLoading(false);
    }
  }, [classId, page, search]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments, refreshKey]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await ClassService.getAll({ limit: 100 });
        const data = unwrapData<ClassListData>(response, { classes: [] });
        setClasses(data.classes);
      } catch {
        notify.error("Failed to load class filters.");
      }
    };

    fetchClasses();
  }, [refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, classId, search]);

  const visibleAssignments = useMemo(
    () =>
      assignments.filter((assignment) => {
        const status = getAssignmentStatus(assignment);
        return activeTab === "all" || status === activeTab;
      }),
    [activeTab, assignments],
  );

  const counts = useMemo(() => {
    const statuses = assignments.map(getAssignmentStatus);
    return {
      pending: statuses.filter((status) => status === "pending" || status === "overdue").length,
      dueSoon: assignments.filter((assignment) => isWithinDays(assignment.due_date, 7)).length,
      graded: statuses.filter((status) => status === "graded").length,
    };
  }, [assignments]);

  const handleJoinClass = async () => {
    const normalizedCode = joinCode.trim().toUpperCase();
    if (normalizedCode.length !== 6) {
      notify.warning("Enter the 6-character class code from your teacher.");
      return;
    }

    setIsJoining(true);
    try {
      await ClassService.join(normalizedCode);
      notify.success("Class joined successfully.");
      setJoinCode("");
      setIsJoinModalOpen(false);
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to join class. Check the code and try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Student Workspace"
          title="Assignments"
          description="Track every class task by deadline, status, points, and submission progress."
          action={
            <Button type="button" iconName="FaKey" onClick={() => setIsJoinModalOpen(true)}>
              Join Class
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard iconName="FaListCheck" label="Open Work" value={counts.pending} tone="warning" />
          <StatCard iconName="FaClock" label="Due Soon" value={counts.dueSoon} tone="danger" />
          <StatCard iconName="FaStar" label="Graded" value={counts.graded} tone="primary" />
        </div>

        <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <SearchInput value={search} onChange={setSearch} placeholder="Search assignments..." />
            <Select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              options={[
                { value: "", label: "All classes" },
                ...classes.map((classRoom) => ({
                  value: String(classRoom.id),
                  label: `${classRoom.subject} - ${classRoom.name}`,
                })),
              ]}
              fullWidth
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
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
            {isLoading ? (
              <LoadingSpinner height="min-h-64" text="Loading assignments" />
            ) : visibleAssignments.length === 0 ? (
              <EmptyState
                iconName="FaClipboardList"
                title="No assignments found"
                message="Join a class with your teacher's code to start seeing assignments here."
                action={
                  <Button type="button" iconName="FaKey" onClick={() => setIsJoinModalOpen(true)}>
                    Join Class
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {visibleAssignments.map((assignment) => {
                  const status = getAssignmentStatus(assignment);

                  return (
                    <button
                      key={assignment.id}
                      type="button"
                      onClick={() => navigate(detailPath(assignment.id))}
                      className="w-full rounded-2xl border border-border-muted bg-bg-main p-4 text-left shadow transition-all duration-300 hover:border-primary/50 active:scale-[0.99]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          {assignment.class && (
                            <ClassBadge name={assignment.class.name} subject={assignment.class.subject} />
                          )}
                          <h2 className="text-lg font-black uppercase italic tracking-tighter text-text">
                            {assignment.title}
                          </h2>
                          <p className="line-clamp-2 text-sm font-medium text-text-muted">
                            {assignment.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                          <StatusBadge status={status as StatusBadgeStatus} />
                          <span className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                            Due {formatDate(assignment.due_date)}
                          </span>
                          <span className="text-xs font-black uppercase italic tracking-widest text-text">
                            {assignment.points ?? "--"} pts
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <Pagination meta={meta} onPageChange={setPage} />
      </div>
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Join Class"
        primaryAction={{
          label: "Join Class",
          onClick: handleJoinClass,
          isLoading: isJoining,
          loadingText: "Joining",
          iconName: "FaRightToBracket",
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setIsJoinModalOpen(false),
          variant: "secondary",
        }}
      >
        <div className="space-y-4">
          <p className="text-sm font-medium leading-relaxed text-text-muted">
            Ask your teacher for the 6-character join code shown on their class card.
          </p>
          <InputField
            label="Class Code"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            fullWidth
            required
          />
        </div>
      </Modal>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default Assignments;

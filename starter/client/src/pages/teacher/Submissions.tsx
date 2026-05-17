import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layouts/MainLayout";
import {
  Button,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  SearchInput,
  StatCard,
  StatusBadge,
  ToastProvider,
} from "../../components/ui";
import { Select } from "../../components/ui/forms";
import type { Assignment } from "../../interfaces/assignment";
import type { ClassRoom } from "../../interfaces/class";
import type { Submission, SubmissionStatus } from "../../interfaces/submission";
import AssignmentService from "../../services/AssignmentService";
import ClassService from "../../services/ClassService";
import SubmissionService from "../../services/SubmissionService";
import { PATHS } from "../../routes/path";
import { notify } from "../../util/notify";
import { formatDate, unwrapData } from "../../util/studySyncData";

interface AssignmentData {
  assignments: Assignment[];
}

interface ClassData {
  classes: ClassRoom[];
}

interface SubmissionData {
  submissions: Submission[];
}

const reviewPath = (id: number) => PATHS.APP.TEACHER.SUBMISSION_DETAIL.replace(":id", String(id));

const Submissions = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [classResponse, assignmentResponse] = await Promise.all([
        ClassService.getAll({ limit: 100 }),
        AssignmentService.getAll({ class_id: classId || undefined, limit: 100 }),
      ]);
      const assignmentList = unwrapData<AssignmentData>(assignmentResponse, { assignments: [] }).assignments;
      setClasses(unwrapData<ClassData>(classResponse, { classes: [] }).classes);
      setAssignments(assignmentList);

      const submissionResponses = await Promise.all(
        assignmentList.map((assignment) => SubmissionService.getAllForAssignment(assignment.id, { limit: 100 })),
      );
      setSubmissions(
        submissionResponses.flatMap((response) => unwrapData<SubmissionData>(response, { submissions: [] }).submissions),
      );
    } catch {
      notify.error("Failed to load submissions.");
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const visibleSubmissions = useMemo(
    () =>
      submissions.filter((submission) => {
        const query = search.toLowerCase();
        const matchesSearch =
          submission.student?.name.toLowerCase().includes(query) ||
          submission.assignment?.title.toLowerCase().includes(query);
        const matchesStatus = !status || submission.status === status;
        return matchesSearch && matchesStatus;
      }),
    [search, status, submissions],
  );

  const stats = {
    needsReview: submissions.filter((submission) => submission.status === "submitted").length,
    graded: submissions.filter((submission) => submission.status === "graded").length,
    rejected: submissions.filter((submission) => submission.status === "rejected").length,
  };

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Review Queue"
          title="Submissions"
          description="Review pending student work, filter by class or status, and move submissions toward grades or feedback."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard iconName="FaInbox" label="Needs Review" value={stats.needsReview} tone="warning" />
          <StatCard iconName="FaSquareCheck" label="Graded" value={stats.graded} tone="success" />
          <StatCard iconName="FaTriangleExclamation" label="Rejected" value={stats.rejected} tone="danger" />
        </div>

        <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
            <SearchInput value={search} onChange={setSearch} placeholder="Search student or assignment..." />
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
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "", label: "All status" },
                { value: "submitted", label: "Submitted" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "graded", label: "Graded" },
              ]}
              fullWidth
            />
          </div>

          <div className="mt-5">
            {isLoading ? (
              <LoadingSpinner height="min-h-96" text="Loading submissions" />
            ) : visibleSubmissions.length === 0 ? (
              <EmptyState iconName="FaInbox" title="No submissions found" message="Student submissions for your assignments will appear here." />
            ) : (
              <div className="space-y-3">
                {visibleSubmissions.map((submission) => {
                  const assignment = assignments.find((item) => item.id === submission.assignment_id);
                  return (
                    <article key={submission.id} className="rounded-2xl border border-border-muted bg-bg-main p-4 shadow">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <StatusBadge status={submission.status as SubmissionStatus} />
                          <h2 className="mt-3 text-lg font-black uppercase italic tracking-tighter text-text">{submission.assignment?.title ?? assignment?.title ?? "Submission"}</h2>
                          <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">{submission.student?.name ?? "Student"} / {formatDate(submission.submitted_at)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-black uppercase italic tracking-widest text-text">{submission.grade ?? "--"} pts</span>
                          <Button type="button" size="sm" iconName="FaArrowRight" onClick={() => navigate(reviewPath(submission.id))}>
                            Review
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default Submissions;

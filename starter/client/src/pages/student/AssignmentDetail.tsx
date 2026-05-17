import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../../components/layouts/MainLayout";
import {
  Button,
  ClassBadge,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
  ToastProvider,
} from "../../components/ui";
import { TextArea } from "../../components/ui/forms";
import type { Assignment } from "../../interfaces/assignment";
import type { Submission } from "../../interfaces/submission";
import AssignmentService from "../../services/AssignmentService";
import SubmissionService from "../../services/SubmissionService";
import { PATHS } from "../../routes/path";
import { notify } from "../../util/notify";
import { formatDate, isPastDate, unwrapData } from "../../util/studySyncData";

interface AssignmentData {
  assignment: Assignment;
}

interface SubmissionData {
  submissions: Submission[];
}

const getStatus = (assignment: Assignment) => {
  if (assignment.submission_status === "graded") return "graded";
  if (assignment.submission_status === "submitted") return "submitted";
  return isPastDate(assignment.due_date) ? "overdue" : "pending";
};

const AssignmentDetail = () => {
  const { id } = useParams();
  const assignmentId = Number(id);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const latestSubmission = useMemo(
    () => submissions.find((submission) => submission.assignment_id === assignmentId) ?? null,
    [assignmentId, submissions],
  );

  const fetchDetail = useCallback(async () => {
    if (!assignmentId) return;

    setIsLoading(true);
    try {
      const [assignmentResponse, submissionResponse] = await Promise.all([
        AssignmentService.getOne(assignmentId),
        SubmissionService.getMine({ limit: 100 }),
      ]);
      const assignmentData = unwrapData<AssignmentData | null>(assignmentResponse, null);
      const submissionData = unwrapData<SubmissionData>(submissionResponse, { submissions: [] });
      setAssignment(assignmentData?.assignment ?? null);
      setSubmissions(submissionData.submissions);
    } catch {
      notify.error("Failed to load assignment details.");
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail, refreshKey]);

  const handleSubmit = async () => {
    if (!assignment || (!content.trim() && !file)) {
      notify.warning("Add a written response or attach a file before submitting.");
      return;
    }

    const formData = new FormData();
    if (content.trim()) formData.append("content", content.trim());
    if (file) formData.append("file", file);

    setIsSubmitting(true);
    try {
      await SubmissionService.create(assignment.id, formData);
      notify.success("Assignment submitted successfully.");
      setContent("");
      setFile(null);
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentNode = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Submission Desk"
          title={assignment?.title ?? "Assignment Detail"}
          description="Review instructions, attach your work, and keep an eye on feedback once your teacher reviews it."
          breadcrumb={[
            { label: "Assignments", href: PATHS.APP.ASSIGNMENTS },
            { label: assignment?.title ?? "Detail" },
          ]}
          action={
            <Link to={PATHS.APP.ASSIGNMENTS}>
              <Button type="button" variant="outline" iconName="FaArrowLeft">
                Back
              </Button>
            </Link>
          }
        />

        {isLoading ? (
          <LoadingSpinner height="min-h-96" text="Loading assignment" />
        ) : !assignment ? (
          <EmptyState
            iconName="FaFileCircleExclamation"
            title="Assignment not found"
            message="This assignment may be unavailable or outside your enrolled classes."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
              <div className="flex flex-wrap items-center gap-3">
                {assignment.class && (
                  <ClassBadge name={assignment.class.name} subject={assignment.class.subject} />
                )}
                <StatusBadge status={getStatus(assignment)} />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border-muted bg-bg-main p-4">
                  <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                    Due Date
                  </p>
                  <p className="mt-2 text-lg font-black uppercase italic tracking-tighter text-text">
                    {formatDate(assignment.due_date)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-muted bg-bg-main p-4">
                  <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                    Points
                  </p>
                  <p className="mt-2 text-lg font-black uppercase italic tracking-tighter text-text">
                    {assignment.points ?? "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-muted bg-bg-main p-4">
                  <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                    Late Work
                  </p>
                  <p className="mt-2 text-lg font-black uppercase italic tracking-tighter text-text">
                    {assignment.allow_late_submission ? "Allowed" : "Closed"}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                  Instructions
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-text-muted">
                  {assignment.description}
                </p>
              </div>

              {assignment.file_path && (
                <div className="mt-6 rounded-2xl border border-border-muted bg-bg-main p-4">
                  <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                    Attachment
                  </p>
                  {assignment.file_url ? (
                    <a
                      href={assignment.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex break-all text-sm font-semibold text-primary transition-all duration-300 hover:text-secondary"
                    >
                      Open attachment
                    </a>
                  ) : (
                    <p className="mt-2 break-all text-sm font-semibold text-primary">
                      {assignment.file_path}
                    </p>
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                  Your Submission
                </h2>
                {latestSubmission ? (
                  <div className="mt-4 rounded-2xl border border-border-muted bg-bg-main p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={latestSubmission.status} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        {formatDate(latestSubmission.submitted_at)}
                      </span>
                    </div>
                    {latestSubmission.content && (
                      <p className="mt-4 whitespace-pre-line text-sm font-medium leading-relaxed text-text">
                        {latestSubmission.content}
                      </p>
                    )}
                    {latestSubmission.grade !== null && (
                      <p className="mt-4 text-sm font-black uppercase italic tracking-tighter text-primary">
                        Grade: {latestSubmission.grade}
                      </p>
                    )}
                    {latestSubmission.feedback && (
                      <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">
                        {latestSubmission.feedback}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium text-text-muted">
                    No submission yet.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                  Submit Work
                </h2>
                <div className="mt-4 space-y-4">
                  <TextArea
                    label="Written Response"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Add notes, answers, or a short explanation..."
                    rows={5}
                    fullWidth
                  />
                  <label className="block">
                    <span className="ml-1 text-sm font-semibold uppercase tracking-wider text-text-muted">
                      File Attachment
                    </span>
                    <input
                      type="file"
                      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                      className="mt-2 w-full rounded-xl border border-border-muted bg-bg-light px-4 py-3 text-sm font-medium text-text file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:italic file:tracking-widest file:text-bg-dark"
                    />
                  </label>
                  <Button
                    type="button"
                    iconName="FaPaperPlane"
                    fullWidth
                    isLoading={isSubmitting}
                    loadingText="Submitting"
                    onClick={handleSubmit}
                  >
                    Submit Assignment
                  </Button>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
      <ToastProvider />
    </>
  );

  return <MainLayout content={contentNode} />;
};

export default AssignmentDetail;

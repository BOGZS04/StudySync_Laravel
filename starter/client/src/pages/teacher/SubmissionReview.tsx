import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../../components/layouts/MainLayout";
import {
  Button,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
  ToastProvider,
} from "../../components/ui";
import { InputField, Select, TextArea } from "../../components/ui/forms";
import type { Assignment } from "../../interfaces/assignment";
import type { Submission, SubmissionStatus } from "../../interfaces/submission";
import AssignmentService from "../../services/AssignmentService";
import SubmissionService from "../../services/SubmissionService";
import { PATHS } from "../../routes/path";
import { notify } from "../../util/notify";
import { formatDate, unwrapData } from "../../util/studySyncData";

interface AssignmentData {
  assignments: Assignment[];
}

interface SubmissionData {
  submissions: Submission[];
}

const SubmissionReview = () => {
  const { id } = useParams();
  const submissionId = Number(id);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<{ status: SubmissionStatus; grade: string; feedback: string }>({
    status: "approved",
    grade: "",
    feedback: "",
  });

  const fetchSubmission = useCallback(async () => {
    setIsLoading(true);
    try {
      const assignmentResponse = await AssignmentService.getAll({ limit: 100 });
      const assignments = unwrapData<AssignmentData>(assignmentResponse, { assignments: [] }).assignments;
      const responses = await Promise.all(
        assignments.map((assignment) => SubmissionService.getAllForAssignment(assignment.id, { limit: 100 })),
      );
      const found = responses
        .flatMap((response) => unwrapData<SubmissionData>(response, { submissions: [] }).submissions)
        .find((item) => item.id === submissionId) ?? null;

      setSubmission(found);
      if (found) {
        setForm({
          status: found.status === "submitted" ? "approved" : found.status,
          grade: found.grade !== null ? String(found.grade) : "",
          feedback: found.feedback ?? "",
        });
      }
    } catch {
      notify.error("Failed to load submission.");
    } finally {
      setIsLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleReview = async () => {
    if (!submission) return;

    setIsSaving(true);
    try {
      await SubmissionService.review(submission.id, {
        status: form.status,
        grade: form.grade ? Number(form.grade) : null,
        feedback: form.feedback.trim() || null,
      });
      notify.success("Submission reviewed.");
      await fetchSubmission();
    } catch {
      notify.error("Failed to review submission.");
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Feedback"
          title="Submission Review"
          description="Inspect student text, attachments, status, grade, and teacher feedback in one review surface."
          breadcrumb={[
            { label: "Submissions", href: PATHS.APP.TEACHER.SUBMISSIONS },
            { label: submission?.student?.name ?? "Review" },
          ]}
          action={
            <Link to={PATHS.APP.TEACHER.SUBMISSIONS}>
              <Button type="button" variant="outline" iconName="FaArrowLeft">
                Back
              </Button>
            </Link>
          }
        />

        {isLoading ? (
          <LoadingSpinner height="min-h-96" text="Loading submission" />
        ) : !submission ? (
          <EmptyState iconName="FaFileCircleExclamation" title="Submission not found" message="This submission may be unavailable or outside your assignments." />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={submission.status} />
                <span className="text-xs font-black uppercase italic tracking-widest text-text-muted">{formatDate(submission.submitted_at)}</span>
              </div>
              <h2 className="mt-4 text-2xl font-black uppercase italic tracking-tighter text-text">{submission.assignment?.title ?? "Assignment"}</h2>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-text-muted">{submission.student?.name ?? "Student"}</p>
              <div className="mt-6 rounded-2xl border border-border-muted bg-bg-main p-4">
                <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">Student Response</p>
                <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-text">
                  {submission.content ?? "No written response was submitted."}
                </p>
              </div>
              {submission.file_path && (
                <div className="mt-4 rounded-2xl border border-border-muted bg-bg-main p-4">
                  <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">Attachment</p>
                  {submission.file_url ? (
                    <a
                      href={submission.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex break-all text-sm font-semibold text-primary transition-all duration-300 hover:text-secondary"
                    >
                      Download submission file
                    </a>
                  ) : (
                    <p className="mt-2 break-all text-sm font-semibold text-primary">{submission.file_path}</p>
                  )}
                </div>
              )}
            </section>

            <aside className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">Review</h2>
              <div className="mt-5 space-y-4">
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as SubmissionStatus }))}
                  options={[
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                    { value: "graded", label: "Graded" },
                  ]}
                  fullWidth
                />
                <InputField label="Grade" type="number" min={0} value={form.grade} onChange={(event) => setForm((value) => ({ ...value, grade: event.target.value }))} fullWidth />
                <TextArea label="Feedback" value={form.feedback} onChange={(event) => setForm((value) => ({ ...value, feedback: event.target.value }))} rows={6} fullWidth />
                <Button type="button" iconName="FaFloppyDisk" fullWidth isLoading={isSaving} loadingText="Saving" onClick={handleReview}>
                  Save Review
                </Button>
              </div>
            </aside>
          </div>
        )}
      </div>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default SubmissionReview;

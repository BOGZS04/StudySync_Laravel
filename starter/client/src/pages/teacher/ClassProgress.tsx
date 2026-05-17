import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../../components/layouts/MainLayout";
import {
  ClassBadge,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatCard,
  StatusBadge,
  ToastProvider,
} from "../../components/ui";
import { Select } from "../../components/ui/forms";
import type { Assignment } from "../../interfaces/assignment";
import type { ClassRoom } from "../../interfaces/class";
import type { Submission } from "../../interfaces/submission";
import AssignmentService from "../../services/AssignmentService";
import ClassService from "../../services/ClassService";
import SubmissionService from "../../services/SubmissionService";
import { notify } from "../../util/notify";
import { unwrapData } from "../../util/studySyncData";

interface ClassData {
  classes: ClassRoom[];
}

interface AssignmentData {
  assignments: Assignment[];
}

interface SubmissionData {
  submissions: Submission[];
}

const ClassProgress = () => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classId, setClassId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    setIsLoading(true);
    try {
      const classResponse = await ClassService.getAll({ limit: 100 });
      const classList = unwrapData<ClassData>(classResponse, { classes: [] }).classes;
      const activeClassId = classId || (classList[0]?.id ? String(classList[0].id) : "");
      const assignmentResponse = await AssignmentService.getAll({
        class_id: activeClassId || undefined,
        limit: 100,
      });
      const assignmentList = unwrapData<AssignmentData>(assignmentResponse, { assignments: [] }).assignments;
      const submissionResponses = await Promise.all(
        assignmentList.map((assignment) => SubmissionService.getAllForAssignment(assignment.id, { limit: 100 })),
      );

      setClasses(classList);
      if (!classId && activeClassId) setClassId(activeClassId);
      setAssignments(assignmentList);
      setSubmissions(
        submissionResponses.flatMap((response) => unwrapData<SubmissionData>(response, { submissions: [] }).submissions),
      );
    } catch {
      notify.error("Failed to load class progress.");
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const selectedClass = classes.find((classRoom) => String(classRoom.id) === classId);

  const stats = useMemo(() => {
    const graded = submissions.filter((submission) => submission.status === "graded" && submission.grade !== null);
    const average = graded.length
      ? Math.round(graded.reduce((sum, submission) => sum + Number(submission.grade), 0) / graded.length)
      : 0;
    const expected = assignments.length * (selectedClass?.students_count ?? 0);
    const rate = expected ? Math.round((submissions.length / expected) * 100) : 0;

    return {
      rate,
      average,
      submissions: submissions.length,
      graded: graded.length,
    };
  }, [assignments, selectedClass?.students_count, submissions]);

  const assignmentRows = assignments.map((assignment) => {
    const assignmentSubmissions = submissions.filter((submission) => submission.assignment_id === assignment.id);
    const expected = selectedClass?.students_count ?? 0;
    const percent = expected ? Math.round((assignmentSubmissions.length / expected) * 100) : 0;
    return {
      assignment,
      submitted: assignmentSubmissions.length,
      expected,
      percent,
    };
  });

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Teacher Analytics"
          title="Class Progress"
          description="Track submission rates, grade distribution, engagement, late work, and class-level momentum."
        />

        <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
          <Select
            label="Class"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            options={classes.map((classRoom) => ({
              value: String(classRoom.id),
              label: `${classRoom.subject} - ${classRoom.name}`,
            }))}
            fullWidth
          />
        </section>

        {isLoading ? (
          <LoadingSpinner height="min-h-96" text="Loading progress" />
        ) : !selectedClass ? (
          <EmptyState iconName="FaChartBar" title="No class selected" message="Create a class to start tracking progress." />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard iconName="FaGaugeHigh" label="Submission Rate" value={`${stats.rate}%`} tone="success" />
              <StatCard iconName="FaChartColumn" label="Average Grade" value={stats.average || "--"} tone="primary" />
              <StatCard iconName="FaInbox" label="Submissions" value={stats.submissions} tone="secondary" />
              <StatCard iconName="FaSquareCheck" label="Graded" value={stats.graded} tone="info" />
            </div>

            <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
              <ClassBadge name={selectedClass.name} subject={selectedClass.subject} />
              <h2 className="mt-4 text-xl font-black uppercase italic tracking-tighter text-text">
                Assignment Progress
              </h2>
              <div className="mt-5 space-y-4">
                {assignmentRows.length === 0 ? (
                  <EmptyState iconName="FaClipboardList" title="No assignments yet" message="Create assignments to see class progress." />
                ) : (
                  assignmentRows.map((row) => (
                    <article key={row.assignment.id} className="rounded-2xl border border-border-muted bg-bg-main p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-sm font-black uppercase italic tracking-tighter text-text">{row.assignment.title}</h3>
                          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                            {row.submitted} of {row.expected} submitted
                          </p>
                        </div>
                        <StatusBadge status={row.percent >= 80 ? "approved" : "pending"} label={`${row.percent}%`} />
                      </div>
                      <div className="mt-4 grid grid-cols-10 gap-1">
                        {Array.from({ length: 10 }, (_, index) => (
                          <span key={index} className={`h-3 rounded-2xl ${index < Math.ceil(row.percent / 10) ? "bg-primary" : "bg-bg-light"}`} />
                        ))}
                      </div>
                    </article>
                  ))
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

export default ClassProgress;

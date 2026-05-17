import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../../components/layouts/MainLayout";
import {
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatCard,
  StatusBadge,
  ToastProvider,
} from "../../components/ui";
import type { Assignment } from "../../interfaces/assignment";
import type { StudySchedule } from "../../interfaces/studySchedule";
import type { Submission } from "../../interfaces/submission";
import AssignmentService from "../../services/AssignmentService";
import StudyScheduleService from "../../services/StudyScheduleService";
import SubmissionService from "../../services/SubmissionService";
import { notify } from "../../util/notify";
import { formatDate, unwrapData } from "../../util/studySyncData";

interface AssignmentData {
  assignments: Assignment[];
}

interface ScheduleData {
  study_schedules: StudySchedule[];
}

interface SubmissionData {
  submissions: Submission[];
}

const Progress = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [schedules, setSchedules] = useState<StudySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assignmentResponse, submissionResponse, scheduleResponse] = await Promise.all([
        AssignmentService.getAll({ limit: 100 }),
        SubmissionService.getMine({ limit: 100 }),
        StudyScheduleService.getAll({ limit: 100 }),
      ]);
      setAssignments(unwrapData<AssignmentData>(assignmentResponse, { assignments: [] }).assignments);
      setSubmissions(unwrapData<SubmissionData>(submissionResponse, { submissions: [] }).submissions);
      setSchedules(unwrapData<ScheduleData>(scheduleResponse, { study_schedules: [] }).study_schedules);
    } catch {
      notify.error("Failed to load progress.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const stats = useMemo(() => {
    const completion = assignments.length ? Math.round((submissions.length / assignments.length) * 100) : 0;
    const graded = submissions.filter((submission) => submission.status === "graded" && submission.grade !== null);
    const average = graded.length
      ? Math.round(graded.reduce((sum, submission) => sum + Number(submission.grade), 0) / graded.length)
      : 0;
    const completedSchedules = schedules.filter((schedule) => schedule.is_completed).length;

    return {
      completion,
      average,
      completedSchedules,
      totalSchedules: schedules.length,
    };
  }, [assignments.length, schedules, submissions]);

  const classProgress = useMemo(() => {
    const grouped = assignments.reduce<Record<string, { total: number; submitted: number }>>((acc, assignment) => {
      const key = assignment.class?.name ?? "Unassigned";
      const submitted = submissions.some((submission) => submission.assignment_id === assignment.id);
      acc[key] = {
        total: (acc[key]?.total ?? 0) + 1,
        submitted: (acc[key]?.submitted ?? 0) + (submitted ? 1 : 0),
      };
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      percent: value.total ? Math.round((value.submitted / value.total) * 100) : 0,
      ...value,
    }));
  }, [assignments, submissions]);

  const recentGrades = submissions
    .filter((submission) => submission.status === "graded")
    .slice(0, 5);

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Student Analytics"
          title="Progress"
          description="Monitor assignment completion, graded work, study consistency, and class-level momentum."
        />

        {isLoading ? (
          <LoadingSpinner height="min-h-96" text="Loading progress" />
        ) : assignments.length === 0 && schedules.length === 0 ? (
          <EmptyState
            iconName="FaChartLine"
            title="No progress yet"
            message="Your progress dashboard will fill in as assignments, submissions, and study sessions are recorded."
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard iconName="FaGaugeHigh" label="Completion" value={`${stats.completion}%`} tone="success" />
              <StatCard iconName="FaChartColumn" label="Grade Average" value={stats.average || "--"} tone="primary" />
              <StatCard iconName="FaFire" label="Study Blocks Done" value={stats.completedSchedules} tone="warning" />
              <StatCard iconName="FaCalendarCheck" label="Planned Blocks" value={stats.totalSchedules} tone="secondary" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                  Completion By Class
                </h2>
                <div className="mt-5 space-y-4">
                  {classProgress.length === 0 ? (
                    <p className="text-sm font-medium text-text-muted">No class progress yet.</p>
                  ) : (
                    classProgress.map((item) => (
                      <article key={item.name} className="rounded-2xl border border-border-muted bg-bg-main p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-text">
                              {item.name}
                            </h3>
                            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                              {item.submitted} of {item.total} submitted
                            </p>
                          </div>
                          <StatusBadge status={item.percent >= 80 ? "approved" : "pending"} label={`${item.percent}%`} />
                        </div>
                        <div className="mt-4 grid grid-cols-10 gap-1">
                          {Array.from({ length: 10 }, (_, index) => (
                            <span
                              key={index}
                              className={`h-3 rounded-2xl ${
                                index < Math.ceil(item.percent / 10) ? "bg-primary" : "bg-bg-light"
                              }`}
                            />
                          ))}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                  Recent Grades
                </h2>
                <div className="mt-5 space-y-3">
                  {recentGrades.length === 0 ? (
                    <p className="text-sm font-medium text-text-muted">No graded submissions yet.</p>
                  ) : (
                    recentGrades.map((submission) => (
                      <article key={submission.id} className="rounded-2xl border border-border-muted bg-bg-main p-4">
                        <StatusBadge status={submission.status} />
                        <h3 className="mt-3 text-sm font-black uppercase italic tracking-tighter text-text">
                          {submission.assignment?.title ?? "Assignment"}
                        </h3>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                          {formatDate(submission.submitted_at)}
                        </p>
                        <p className="mt-3 text-2xl font-black uppercase italic tracking-tighter text-primary">
                          {submission.grade ?? "--"}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                Study Consistency
              </h2>
              <div className="mt-5 grid grid-cols-7 gap-2">
                {schedules.slice(0, 28).map((schedule) => (
                  <div
                    key={schedule.id}
                    title={schedule.title}
                    className={`aspect-square rounded-xl border ${
                      schedule.is_completed
                        ? "border-success/30 bg-success/30"
                        : "border-border-muted bg-bg-main"
                    }`}
                  />
                ))}
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

export default Progress;

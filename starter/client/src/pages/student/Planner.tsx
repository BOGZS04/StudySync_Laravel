import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../../components/layouts/MainLayout";
import {
  Button,
  EmptyState,
  LoadingSpinner,
  Modal,
  PageHeader,
  StatCard,
  StatusBadge,
  ToastProvider,
} from "../../components/ui";
import { InputField, TextArea } from "../../components/ui/forms";
import type { StudySchedule } from "../../interfaces/studySchedule";
import StudyScheduleService from "../../services/StudyScheduleService";
import { notify } from "../../util/notify";
import {
  emptyMeta,
  formatDate,
  formatTime,
  getTodayDate,
  unwrapData,
} from "../../util/studySyncData";

interface StudyScheduleData {
  study_schedules: StudySchedule[];
}

interface ScheduleFormState {
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
}

const initialForm: ScheduleFormState = {
  title: "",
  description: "",
  date: getTodayDate(),
  start_time: "16:00",
  end_time: "17:00",
  subject: "",
};

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getDayName = (date: string) =>
  new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${date}T00:00:00`));

const getDurationHours = (schedule: StudySchedule) => {
  const start = new Date(`${schedule.date}T${schedule.start_time}`).getTime();
  const end = new Date(`${schedule.date}T${schedule.end_time}`).getTime();
  return Math.max(0, (end - start) / 3_600_000);
};

const Planner = () => {
  const [schedules, setSchedules] = useState<StudySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ScheduleFormState>(initialForm);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await StudyScheduleService.getAll({ limit: 100 });
      const data = unwrapData<StudyScheduleData & { meta?: typeof emptyMeta }>(response, {
        study_schedules: [],
        meta: emptyMeta,
      });
      setSchedules(data.study_schedules);
    } catch {
      notify.error("Failed to load study planner.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules, refreshKey]);

  const todaySchedules = schedules.filter((schedule) => schedule.date === getTodayDate());
  const totalHours = schedules.reduce((sum, schedule) => sum + getDurationHours(schedule), 0);
  const completionRate = schedules.length
    ? Math.round((schedules.filter((schedule) => schedule.is_completed).length / schedules.length) * 100)
    : 0;

  const schedulesByDay = useMemo(
    () =>
      weekDays.map((day) => ({
        day,
        sessions: schedules.filter((schedule) => getDayName(schedule.date) === day),
      })),
    [schedules],
  );

  const handleCreate = async () => {
    if (!form.title.trim()) {
      notify.warning("Add a title for the study session.");
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("description", form.description.trim());
    formData.append("date", form.date);
    formData.append("start_time", form.start_time);
    formData.append("end_time", form.end_time);
    formData.append("subject", form.subject.trim());

    setIsSaving(true);
    try {
      await StudyScheduleService.create(formData);
      notify.success("Study session added.");
      setIsModalOpen(false);
      setForm(initialForm);
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to save study session.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompletion = async (schedule: StudySchedule) => {
    const formData = new FormData();
    formData.append("_method", "PATCH");
    formData.append("title", schedule.title);
    formData.append("description", schedule.description ?? "");
    formData.append("date", schedule.date);
    formData.append("start_time", schedule.start_time.slice(0, 5));
    formData.append("end_time", schedule.end_time.slice(0, 5));
    formData.append("subject", schedule.subject ?? "");
    formData.append("color", schedule.color ?? "");
    formData.append("is_completed", schedule.is_completed ? "0" : "1");

    try {
      await StudyScheduleService.update(schedule.id, formData);
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to update study session.");
    }
  };

  const handleDelete = async (schedule: StudySchedule) => {
    try {
      await StudyScheduleService.delete(schedule.id);
      notify.success("Study session removed.");
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to remove study session.");
    }
  };

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Weekly Focus"
          title="Study Planner"
          description="Plan study sessions by subject, mark completed work, and protect time before exams and deadlines."
          action={
            <Button type="button" iconName="FaPlus" onClick={() => setIsModalOpen(true)}>
              Add Session
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard iconName="FaHourglassHalf" label="Today" value={`${todaySchedules.length} blocks`} tone="primary" />
          <StatCard iconName="FaChartSimple" label="Planned Hours" value={totalHours.toFixed(1)} tone="secondary" />
          <StatCard iconName="FaCircleCheck" label="Completed" value={`${completionRate}%`} tone="success" />
        </div>

        {isLoading ? (
          <LoadingSpinner height="min-h-96" text="Loading planner" />
        ) : schedules.length === 0 ? (
          <EmptyState
            iconName="FaCalendarPlus"
            title="No study sessions yet"
            message="Create your first study block to start building a weekly rhythm."
            action={
              <Button type="button" iconName="FaPlus" onClick={() => setIsModalOpen(true)}>
                Add Session
              </Button>
            }
          />
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            {schedulesByDay.map(({ day, sessions }) => (
              <div key={day} className="min-w-0 rounded-2xl border border-border-muted bg-bg-light p-4 shadow">
                <h2 className="text-sm font-black uppercase italic tracking-widest text-text break-words">
                  {day}
                </h2>
                <div className="mt-4 space-y-3">
                  {sessions.length === 0 ? (
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Open focus time
                    </p>
                  ) : (
                    sessions.map((schedule) => (
                      <article key={schedule.id} className="min-w-0 rounded-2xl border border-border-muted bg-bg-main p-3">
                        <div className="flex min-w-0 flex-col gap-3">
                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-black uppercase italic tracking-tighter text-text">
                              {schedule.title}
                            </h3>
                            <p className="mt-1 break-words text-xs font-semibold uppercase tracking-wider text-text-muted">
                              {formatTime(schedule.start_time.slice(0, 5))} - {formatTime(schedule.end_time.slice(0, 5))}
                            </p>
                          </div>
                          <StatusBadge status={schedule.is_completed ? "approved" : "pending"} label={schedule.is_completed ? "done" : "open"} />
                        </div>
                        {schedule.subject && (
                          <p className="mt-3 break-words text-xs font-black uppercase italic tracking-widest text-primary">
                            {schedule.subject}
                          </p>
                        )}
                        <p className="mt-2 break-words text-xs font-medium text-text-muted">
                          {formatDate(schedule.date)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            iconName={schedule.is_completed ? "FaRotateLeft" : "FaCheck"}
                            onClick={() => handleCompletion(schedule)}
                          />
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            iconName="FaTrash"
                            onClick={() => handleDelete(schedule)}
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Study Session"
        primaryAction={{
          label: "Save Session",
          onClick: handleCreate,
          isLoading: isSaving,
          loadingText: "Saving",
          iconName: "FaFloppyDisk",
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setIsModalOpen(false),
          variant: "secondary",
        }}
      >
        <div className="space-y-4">
          <InputField
            label="Title"
            value={form.title}
            onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
            fullWidth
            required
          />
          <InputField
            label="Subject"
            value={form.subject}
            onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))}
            fullWidth
          />
          <div className="grid gap-4 md:grid-cols-3">
            <InputField
              label="Date"
              type="date"
              value={form.date}
              onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))}
              fullWidth
              required
            />
            <InputField
              label="Start"
              type="time"
              value={form.start_time}
              onChange={(event) => setForm((value) => ({ ...value, start_time: event.target.value }))}
              fullWidth
              required
            />
            <InputField
              label="End"
              type="time"
              value={form.end_time}
              onChange={(event) => setForm((value) => ({ ...value, end_time: event.target.value }))}
              fullWidth
              required
            />
          </div>
          <TextArea
            label="Notes"
            value={form.description}
            onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
            fullWidth
          />
        </div>
      </Modal>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default Planner;

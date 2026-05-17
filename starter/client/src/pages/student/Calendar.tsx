import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../../components/layouts/MainLayout";
import {
  Button,
  EmptyState,
  LoadingSpinner,
  Modal,
  PageHeader,
  StatusBadge,
  ToastProvider,
} from "../../components/ui";
import { InputField, Select, TextArea } from "../../components/ui/forms";
import type { Assignment } from "../../interfaces/assignment";
import type { CalendarEvent, EventType } from "../../interfaces/event";
import type { StudySchedule } from "../../interfaces/studySchedule";
import AssignmentService from "../../services/AssignmentService";
import EventService from "../../services/EventService";
import StudyScheduleService from "../../services/StudyScheduleService";
import { notify } from "../../util/notify";
import { formatDate, getTodayDate, unwrapData } from "../../util/studySyncData";

interface EventData {
  events: CalendarEvent[];
}

interface AssignmentData {
  assignments: Assignment[];
}

interface ScheduleData {
  study_schedules: StudySchedule[];
}

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  type: "deadline" | "exam" | "personal" | "reminder" | "study";
  meta: string;
}

interface EventFormState {
  title: string;
  description: string;
  type: EventType;
  start_date: string;
  end_date: string;
}

const initialForm: EventFormState = {
  title: "",
  description: "",
  type: "personal",
  start_date: `${getTodayDate()}T09:00`,
  end_date: "",
};

const typeClasses: Record<CalendarItem["type"], string> = {
  deadline: "border-primary/30 bg-primary/15 text-primary",
  exam: "border-danger/30 bg-danger/15 text-danger",
  personal: "border-secondary/30 bg-secondary/15 text-secondary",
  reminder: "border-info/30 bg-info/15 text-info",
  study: "border-success/30 bg-success/15 text-success",
};

const Calendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [schedules, setSchedules] = useState<StudySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>(initialForm);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventResponse, assignmentResponse, scheduleResponse] = await Promise.all([
        EventService.getAll({ limit: 100 }),
        AssignmentService.getAll({ limit: 100 }),
        StudyScheduleService.getAll({ limit: 100 }),
      ]);
      setEvents(unwrapData<EventData>(eventResponse, { events: [] }).events);
      setAssignments(unwrapData<AssignmentData>(assignmentResponse, { assignments: [] }).assignments);
      setSchedules(unwrapData<ScheduleData>(scheduleResponse, { study_schedules: [] }).study_schedules);
    } catch {
      notify.error("Failed to load calendar.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar, refreshKey]);

  const calendarItems = useMemo<CalendarItem[]>(() => {
    const eventItems = events.map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      date: event.start_date.slice(0, 10),
      type: event.type,
      meta: event.description ?? "Personal calendar event",
    }));
    const assignmentItems = assignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      title: assignment.title,
      date: assignment.due_date.slice(0, 10),
      type: "deadline" as const,
      meta: assignment.class?.name ?? "Assignment deadline",
    }));
    const scheduleItems = schedules.map((schedule) => ({
      id: `study-${schedule.id}`,
      title: schedule.title,
      date: schedule.date,
      type: "study" as const,
      meta: schedule.subject ?? "Study session",
    }));

    return [...eventItems, ...assignmentItems, ...scheduleItems].sort((a, b) => a.date.localeCompare(b.date));
  }, [assignments, events, schedules]);

  const days = useMemo(() => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const leadingBlanks = (first.getDay() + 6) % 7;

    return [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1;
        return new Date(today.getFullYear(), today.getMonth(), day).toISOString().slice(0, 10);
      }),
    ];
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      notify.warning("Add a title for the event.");
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("description", form.description.trim());
    formData.append("type", form.type);
    formData.append("start_date", form.start_date);
    if (form.end_date) formData.append("end_date", form.end_date);

    setIsSaving(true);
    try {
      await EventService.create(formData);
      notify.success("Calendar event added.");
      setIsModalOpen(false);
      setForm(initialForm);
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to save calendar event.");
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Academic Timeline"
          title="Calendar"
          description="View assignment deadlines, personal events, reminders, exams, and planned study blocks together."
          action={
            <Button type="button" iconName="FaPlus" onClick={() => setIsModalOpen(true)}>
              Add Event
            </Button>
          }
        />

        <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusBadge status="graded" label="assignment" />
            <StatusBadge status="rejected" label="exam" />
            <StatusBadge status="approved" label="study" />
            <StatusBadge status="submitted" label="reminder" />
          </div>

          {isLoading ? (
            <LoadingSpinner height="min-h-96" text="Loading calendar" />
          ) : calendarItems.length === 0 ? (
            <EmptyState
              iconName="FaCalendarPlus"
              title="No calendar items yet"
              message="Assignments, study sessions, exams, and personal reminders will appear in this calendar."
              action={
                <Button type="button" iconName="FaPlus" onClick={() => setIsModalOpen(true)}>
                  Add Event
                </Button>
              }
            />
          ) : (
            <div className="grid gap-px overflow-hidden rounded-2xl border border-border-muted bg-border-muted md:grid-cols-7">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="bg-bg-main p-3 text-xs font-black uppercase italic tracking-widest text-text-muted">
                  {day}
                </div>
              ))}
              {days.map((day, index) => {
                const items = day ? calendarItems.filter((item) => item.date === day) : [];
                return (
                  <div key={day ?? `blank-${index}`} className="min-h-32 bg-bg-light p-3">
                    {day && (
                      <p className="text-xs font-black uppercase italic tracking-widest text-text">
                        {new Date(`${day}T00:00:00`).getDate()}
                      </p>
                    )}
                    <div className="mt-2 space-y-2">
                      {items.slice(0, 3).map((item) => (
                        <article key={item.id} className={`rounded-xl border px-3 py-2 ${typeClasses[item.type]}`}>
                          <h3 className="truncate text-xs font-black uppercase italic tracking-tighter">
                            {item.title}
                          </h3>
                          <p className="truncate text-[11px] font-semibold uppercase tracking-wider opacity-80">
                            {item.meta}
                          </p>
                        </article>
                      ))}
                      {items.length > 3 && (
                        <p className="text-[11px] font-black uppercase italic tracking-widest text-text-muted">
                          +{items.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {calendarItems.length > 0 && (
          <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
              Upcoming
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {calendarItems.slice(0, 6).map((item) => (
                <article key={item.id} className="rounded-2xl border border-border-muted bg-bg-main p-4">
                  <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                    {formatDate(item.date)}
                  </p>
                  <h3 className="mt-2 text-sm font-black uppercase italic tracking-tighter text-text">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-text-muted">
                    {item.meta}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Calendar Event"
        primaryAction={{
          label: "Save Event",
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
          <Select
            label="Type"
            value={form.type}
            onChange={(event) => setForm((value) => ({ ...value, type: event.target.value as EventType }))}
            options={[
              { value: "personal", label: "Personal" },
              { value: "exam", label: "Exam" },
              { value: "deadline", label: "Deadline" },
              { value: "reminder", label: "Reminder" },
            ]}
            fullWidth
          />
          <InputField
            label="Start"
            type="datetime-local"
            value={form.start_date}
            onChange={(event) => setForm((value) => ({ ...value, start_date: event.target.value }))}
            fullWidth
            required
          />
          <InputField
            label="End"
            type="datetime-local"
            value={form.end_date}
            onChange={(event) => setForm((value) => ({ ...value, end_date: event.target.value }))}
            fullWidth
          />
          <TextArea
            label="Description"
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

export default Calendar;

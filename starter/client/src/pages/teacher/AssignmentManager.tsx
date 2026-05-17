import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "../../components/ui";
import { InputField, Select, TextArea } from "../../components/ui/forms";
import type { Assignment } from "../../interfaces/assignment";
import type { ClassRoom } from "../../interfaces/class";
import AssignmentService from "../../services/AssignmentService";
import ClassService from "../../services/ClassService";
import { notify } from "../../util/notify";
import { emptyMeta, formatDate, unwrapData } from "../../util/studySyncData";

interface AssignmentData {
  assignments: Assignment[];
  meta: PaginationMeta;
}

interface ClassData {
  classes: ClassRoom[];
}

interface AssignmentFormState {
  class_id: string;
  title: string;
  description: string;
  due_date: string;
  points: string;
  allow_late_submission: boolean;
}

const initialForm: AssignmentFormState = {
  class_id: "",
  title: "",
  description: "",
  due_date: "",
  points: "",
  allow_late_submission: true,
};

const AssignmentManager = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<AssignmentFormState>(initialForm);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await AssignmentService.getAll({
        search,
        class_id: classId || undefined,
        page,
        limit: 10,
      });
      const data = unwrapData<AssignmentData>(response, { assignments: [], meta: emptyMeta });
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
        setClasses(unwrapData<ClassData>(response, { classes: [] }).classes);
      } catch {
        notify.error("Failed to load classes.");
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [classId, search]);

  const stats = useMemo(
    () => ({
      total: assignments.length,
      submissions: assignments.reduce((sum, assignment) => sum + (assignment.submissions_count ?? 0), 0),
      lateOpen: assignments.filter((assignment) => assignment.allow_late_submission).length,
    }),
    [assignments],
  );

  const openCreate = () => {
    setEditingAssignment(null);
    setForm({ ...initialForm, class_id: classes[0]?.id ? String(classes[0].id) : "" });
    setFile(null);
    setIsModalOpen(true);
  };

  const openEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setForm({
      class_id: String(assignment.class_id),
      title: assignment.title,
      description: assignment.description,
      due_date: assignment.due_date.replace(" ", "T").slice(0, 16),
      points: assignment.points !== null ? String(assignment.points) : "",
      allow_late_submission: assignment.allow_late_submission,
    });
    setFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.class_id || !form.title.trim() || !form.description.trim() || !form.due_date) {
      notify.warning("Class, title, description, and due date are required.");
      return;
    }

    const formData = new FormData();
    formData.append("class_id", form.class_id);
    formData.append("title", form.title.trim());
    formData.append("description", form.description.trim());
    formData.append("due_date", form.due_date);
    if (form.points) formData.append("points", form.points);
    formData.append("allow_late_submission", form.allow_late_submission ? "1" : "0");
    if (file) formData.append("file", file);

    setIsSaving(true);
    try {
      if (editingAssignment) {
        formData.append("_method", "PATCH");
        await AssignmentService.update(editingAssignment.id, formData);
        notify.success("Assignment updated.");
      } else {
        await AssignmentService.create(formData);
        notify.success("Assignment created.");
      }
      setIsModalOpen(false);
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to save assignment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (assignment: Assignment) => {
    try {
      await AssignmentService.delete(assignment.id);
      notify.success("Assignment archived.");
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to archive assignment.");
    }
  };

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Teacher Tools"
          title="Assignment Manager"
          description="Create, edit, attach files to, and archive assignments across your classes."
          action={
            <Button type="button" iconName="FaPlus" onClick={openCreate} disabled={classes.length === 0}>
              New Assignment
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard iconName="FaClipboardList" label="Assignments" value={stats.total} tone="primary" />
          <StatCard iconName="FaInbox" label="Submissions" value={stats.submissions} tone="success" />
          <StatCard iconName="FaClock" label="Late Open" value={stats.lateOpen} tone="warning" />
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

          <div className="mt-5">
            {isLoading ? (
              <LoadingSpinner height="min-h-96" text="Loading assignments" />
            ) : assignments.length === 0 ? (
              <EmptyState iconName="FaClipboardList" title="No assignments yet" message="Create an assignment after you have at least one class." />
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <article key={assignment.id} className="rounded-2xl border border-border-muted bg-bg-main p-4 shadow">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        {assignment.class && <ClassBadge name={assignment.class.name} subject={assignment.class.subject} />}
                        <h2 className="text-lg font-black uppercase italic tracking-tighter text-text">{assignment.title}</h2>
                        <p className="line-clamp-2 text-sm font-medium text-text-muted">{assignment.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                        <StatusBadge status="submitted" label={`${assignment.submissions_count ?? 0} submitted`} />
                        <span className="text-xs font-black uppercase italic tracking-widest text-text-muted">Due {formatDate(assignment.due_date)}</span>
                        <span className="text-xs font-black uppercase italic tracking-widest text-text">{assignment.points ?? "--"} pts</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" iconName="FaPen" onClick={() => openEdit(assignment)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="danger" iconName="FaTrash" onClick={() => handleDelete(assignment)} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAssignment ? "Edit Assignment" : "Create Assignment"}
        primaryAction={{
          label: "Save Assignment",
          onClick: handleSave,
          isLoading: isSaving,
          loadingText: "Saving",
          iconName: "FaFloppyDisk",
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setIsModalOpen(false),
          variant: "secondary",
        }}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Class"
            value={form.class_id}
            onChange={(event) => setForm((value) => ({ ...value, class_id: event.target.value }))}
            options={classes.map((classRoom) => ({
              value: String(classRoom.id),
              label: `${classRoom.subject} - ${classRoom.name}`,
            }))}
            fullWidth
            required
          />
          <InputField label="Title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} fullWidth required />
          <TextArea label="Description" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} rows={5} fullWidth required />
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Due Date" type="datetime-local" value={form.due_date} onChange={(event) => setForm((value) => ({ ...value, due_date: event.target.value }))} fullWidth required />
            <InputField label="Points" type="number" min={0} value={form.points} onChange={(event) => setForm((value) => ({ ...value, points: event.target.value }))} fullWidth />
          </div>
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-border-muted bg-bg-light p-4">
            <span className="text-sm font-black uppercase italic tracking-tighter text-text">Allow late submissions</span>
            <input type="checkbox" checked={form.allow_late_submission} onChange={(event) => setForm((value) => ({ ...value, allow_late_submission: event.target.checked }))} className="h-5 w-5 accent-primary" />
          </label>
          <label className="block">
            <span className="ml-1 text-sm font-semibold uppercase tracking-wider text-text-muted">Attachment</span>
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 w-full rounded-xl border border-border-muted bg-bg-light px-4 py-3 text-sm font-medium text-text file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:italic file:tracking-widest file:text-bg-dark" />
          </label>
        </div>
      </Modal>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default AssignmentManager;

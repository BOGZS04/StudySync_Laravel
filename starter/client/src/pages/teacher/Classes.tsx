import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layouts/MainLayout";
import {
  Button,
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
import { InputField, TextArea } from "../../components/ui/forms";
import type { ClassRoom } from "../../interfaces/class";
import ClassService from "../../services/ClassService";
import { PATHS } from "../../routes/path";
import { notify } from "../../util/notify";
import { emptyMeta, formatDate, unwrapData } from "../../util/studySyncData";

interface ClassData {
  classes: ClassRoom[];
  meta: PaginationMeta;
}

interface ClassFormState {
  name: string;
  subject: string;
  section: string;
  description: string;
}

const initialForm: ClassFormState = {
  name: "",
  subject: "",
  section: "",
  description: "",
};

const classDetailPath = (id: number) => PATHS.APP.TEACHER.CLASS_DETAIL.replace(":id", String(id));

const Classes = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ClassFormState>(initialForm);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ClassService.getAll({ search, page, limit: 9 });
      const data = unwrapData<ClassData>(response, { classes: [], meta: emptyMeta });
      setClasses(data.classes);
      setMeta(data.meta);
    } catch {
      notify.error("Failed to load classes.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totals = useMemo(
    () => ({
      active: classes.filter((classRoom) => classRoom.is_active).length,
      students: classes.reduce((sum, classRoom) => sum + (classRoom.students_count ?? 0), 0),
      assignments: classes.reduce((sum, classRoom) => sum + (classRoom.assignments_count ?? 0), 0),
    }),
    [classes],
  );

  const openCreate = () => {
    setEditingClass(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const openEdit = (classRoom: ClassRoom) => {
    setEditingClass(classRoom);
    setForm({
      name: classRoom.name,
      subject: classRoom.subject,
      section: classRoom.section,
      description: classRoom.description ?? "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.section.trim()) {
      notify.warning("Class name, subject, and section are required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("subject", form.subject.trim());
    formData.append("section", form.section.trim());
    formData.append("description", form.description.trim());
    formData.append("is_active", "1");

    setIsSaving(true);
    try {
      if (editingClass) {
        formData.append("_method", "PATCH");
        await ClassService.update(editingClass.id, formData);
        notify.success("Class updated.");
      } else {
        await ClassService.create(formData);
        notify.success("Class created.");
      }
      setIsModalOpen(false);
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to save class.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (classRoom: ClassRoom) => {
    try {
      await ClassService.delete(classRoom.id);
      notify.success("Class archived.");
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to archive class.");
    }
  };

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Teacher Tools"
          title="My Classes"
          description="Create classes, share join codes, monitor active rosters, and manage class-level academic work."
          action={
            <Button type="button" iconName="FaPlus" onClick={openCreate}>
              New Class
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard iconName="FaChalkboardUser" label="Active Classes" value={totals.active} tone="primary" />
          <StatCard iconName="FaUserGroup" label="Students" value={totals.students} tone="success" />
          <StatCard iconName="FaClipboardList" label="Assignments" value={totals.assignments} tone="secondary" />
        </div>

        <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
          <SearchInput value={search} onChange={setSearch} placeholder="Search classes..." />

          <div className="mt-5">
            {isLoading ? (
              <LoadingSpinner height="min-h-96" text="Loading classes" />
            ) : classes.length === 0 ? (
              <EmptyState
                iconName="FaChalkboard"
                title="No classes yet"
                message="Create your first class to generate a join code and start assigning work."
                action={
                  <Button type="button" iconName="FaPlus" onClick={openCreate}>
                    New Class
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {classes.map((classRoom) => (
                  <article key={classRoom.id} className="rounded-2xl border border-border-muted bg-bg-main p-5 shadow">
                    <div className="flex items-start justify-between gap-3">
                      <StatusBadge status={classRoom.is_active ? "active" : "inactive"} />
                      <span className="rounded-2xl border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-black uppercase italic tracking-widest text-primary">
                        {classRoom.class_code}
                      </span>
                    </div>
                    <h2 className="mt-4 text-xl font-black uppercase italic tracking-tighter text-text">
                      {classRoom.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-text-muted">
                      {classRoom.subject} / {classRoom.section}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm font-medium leading-relaxed text-text-muted">
                      {classRoom.description ?? "No class description yet."}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border-muted bg-bg-light p-3">
                        <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">Students</p>
                        <p className="mt-1 text-lg font-black uppercase italic tracking-tighter text-text">{classRoom.students_count ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border border-border-muted bg-bg-light p-3">
                        <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">Work</p>
                        <p className="mt-1 text-lg font-black uppercase italic tracking-tighter text-text">{classRoom.assignments_count ?? 0}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Created {formatDate(classRoom.created_at)}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button type="button" size="sm" iconName="FaArrowRight" onClick={() => navigate(classDetailPath(classRoom.id))}>
                        Open
                      </Button>
                      <Button type="button" size="sm" variant="outline" iconName="FaPen" onClick={() => openEdit(classRoom)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="danger" iconName="FaTrash" onClick={() => handleDelete(classRoom)} />
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
        title={editingClass ? "Edit Class" : "Create Class"}
        primaryAction={{
          label: editingClass ? "Save Class" : "Create Class",
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
      >
        <div className="space-y-4">
          <InputField label="Class Name" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} fullWidth required />
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Subject" value={form.subject} onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))} fullWidth required />
            <InputField label="Section" value={form.section} onChange={(event) => setForm((value) => ({ ...value, section: event.target.value }))} fullWidth required />
          </div>
          <TextArea label="Description" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} fullWidth />
        </div>
      </Modal>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default Classes;

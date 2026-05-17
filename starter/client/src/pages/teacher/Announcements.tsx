import { useCallback, useEffect, useState } from "react";
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
  ToastProvider,
  type PaginationMeta,
} from "../../components/ui";
import { InputField, Select, TextArea } from "../../components/ui/forms";
import type { Announcement } from "../../interfaces/announcement";
import type { ClassRoom } from "../../interfaces/class";
import AnnouncementService from "../../services/AnnouncementService";
import ClassService from "../../services/ClassService";
import { notify } from "../../util/notify";
import { emptyMeta, formatDate, unwrapData } from "../../util/studySyncData";

interface AnnouncementData {
  announcements: Announcement[];
  meta: PaginationMeta;
}

interface ClassData {
  classes: ClassRoom[];
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ class_id: "", title: "", content: "" });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await AnnouncementService.getAll({
        class_id: classId || undefined,
        page,
        limit: 10,
      });
      const data = unwrapData<AnnouncementData>(response, { announcements: [], meta: emptyMeta });
      setAnnouncements(data.announcements);
      setMeta(data.meta);
    } catch {
      notify.error("Failed to load announcements.");
    } finally {
      setIsLoading(false);
    }
  }, [classId, page]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements, refreshKey]);

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

  const visibleAnnouncements = announcements.filter((announcement) => {
    const query = search.toLowerCase();
    return announcement.title.toLowerCase().includes(query) || announcement.content.toLowerCase().includes(query);
  });

  const openCreate = () => {
    setForm({ class_id: classes[0]?.id ? String(classes[0].id) : "", title: "", content: "" });
    setFile(null);
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.class_id || !form.title.trim() || !form.content.trim()) {
      notify.warning("Class, title, and content are required.");
      return;
    }

    const formData = new FormData();
    formData.append("class_id", form.class_id);
    formData.append("title", form.title.trim());
    formData.append("content", form.content.trim());
    if (file) formData.append("file", file);

    setIsSaving(true);
    try {
      await AnnouncementService.create(formData);
      notify.success("Announcement posted.");
      setIsModalOpen(false);
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to post announcement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    try {
      await AnnouncementService.delete(announcement.id);
      notify.success("Announcement removed.");
      setRefreshKey((value) => value + 1);
    } catch {
      notify.error("Failed to remove announcement.");
    }
  };

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Teacher Feed"
          title="Announcements"
          description="Create and manage class announcements with clear teacher ownership and attachment support."
          action={
            <Button type="button" iconName="FaPlus" onClick={openCreate} disabled={classes.length === 0}>
              New Post
            </Button>
          }
        />

        <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <SearchInput value={search} onChange={setSearch} placeholder="Search announcements..." />
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
              <LoadingSpinner height="min-h-96" text="Loading announcements" />
            ) : visibleAnnouncements.length === 0 ? (
              <EmptyState iconName="FaBullhorn" title="No announcements yet" message="Post a class announcement to notify enrolled students." />
            ) : (
              <div className="space-y-4">
                {visibleAnnouncements.map((announcement) => (
                  <article key={announcement.id} className="rounded-2xl border border-border-muted bg-bg-main p-5 shadow">
                    <div className="flex flex-wrap items-center gap-3">
                      {announcement.class && <ClassBadge name={announcement.class.name} subject={announcement.class.subject} />}
                      <span className="text-xs font-black uppercase italic tracking-widest text-text-muted">{formatDate(announcement.created_at)}</span>
                    </div>
                    <h2 className="mt-4 text-xl font-black uppercase italic tracking-tighter text-text">{announcement.title}</h2>
                    <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-text-muted">{announcement.content.replace(/<[^>]*>/g, "")}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {announcement.file_path && (
                        <span className="rounded-2xl border border-info/30 bg-info/15 px-3 py-1 text-xs font-black uppercase italic tracking-widest text-info">
                          Attachment
                        </span>
                      )}
                      <Button type="button" size="sm" variant="danger" iconName="FaTrash" onClick={() => handleDelete(announcement)}>
                        Delete
                      </Button>
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
        title="Create Announcement"
        primaryAction={{
          label: "Post",
          onClick: handleCreate,
          isLoading: isSaving,
          loadingText: "Posting",
          iconName: "FaPaperPlane",
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setIsModalOpen(false),
          variant: "secondary",
        }}
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
          <TextArea label="Content" value={form.content} onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))} rows={5} fullWidth required />
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

export default Announcements;

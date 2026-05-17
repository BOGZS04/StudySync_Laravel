import { useCallback, useEffect, useState } from "react";
import MainLayout from "../../components/layouts/MainLayout";
import {
  ClassBadge,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Pagination,
  SearchInput,
  ToastProvider,
  type PaginationMeta,
} from "../../components/ui";
import { Select } from "../../components/ui/forms";
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
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await AnnouncementService.getAll({
        page,
        limit: 10,
        class_id: classId || undefined,
      });
      const data = unwrapData<AnnouncementData>(response, {
        announcements: [],
        meta: emptyMeta,
      });
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
  }, [fetchAnnouncements]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await ClassService.getAll({ limit: 100 });
        const data = unwrapData<ClassData>(response, { classes: [] });
        setClasses(data.classes);
      } catch {
        notify.error("Failed to load class filters.");
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [classId, search]);

  const visibleAnnouncements = announcements.filter((announcement) => {
    const query = search.toLowerCase();
    return (
      announcement.title.toLowerCase().includes(query) ||
      announcement.content.toLowerCase().includes(query) ||
      announcement.class?.name.toLowerCase().includes(query)
    );
  });

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Class Feed"
          title="Announcements"
          description="Read teacher updates, class reminders, attachment notices, and new academic instructions."
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
              <EmptyState
                iconName="FaBullhorn"
                title="No announcements found"
                message="Teacher announcements for your enrolled classes will appear here newest first."
              />
            ) : (
              <div className="space-y-4">
                {visibleAnnouncements.map((announcement) => (
                  <article key={announcement.id} className="rounded-2xl border border-border-muted bg-bg-main p-5 shadow">
                    <div className="flex flex-wrap items-center gap-3">
                      {announcement.class && (
                        <ClassBadge name={announcement.class.name} subject={announcement.class.subject} />
                      )}
                      <span className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                        {formatDate(announcement.created_at)}
                      </span>
                    </div>
                    <h2 className="mt-4 text-xl font-black uppercase italic tracking-tighter text-text">
                      {announcement.title}
                    </h2>
                    <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-text-muted">
                      {announcement.content.replace(/<[^>]*>/g, "")}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      <span>{announcement.teacher?.name ?? "Teacher"}</span>
                      {announcement.file_path && <span>Attachment available</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <Pagination meta={meta} onPageChange={setPage} />
      </div>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default Announcements;

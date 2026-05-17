import MainLayout from "../../components/layouts/MainLayout";
import { Button, PageHeader, StatCard, ToastProvider } from "../../components/ui";
import { InputField, Select } from "../../components/ui/forms";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme, type Theme } from "../../contexts/ThemeContext";
import { notify } from "../../util/notify";
import { formatDate } from "../../util/studySyncData";

const Settings = () => {
  const { user } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Account"
          title="Settings"
          description="Review your profile, tune notification preferences, and keep the app theme comfortable for daily academic work."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard iconName="FaUserGraduate" label="Role" value={user?.role ?? "--"} tone="primary" />
          <StatCard iconName="FaClockRotateLeft" label="Last Login" value={user?.last_login_at ? formatDate(user.last_login_at) : "--"} tone="secondary" />
          <StatCard iconName="FaPalette" label="Theme" value={resolvedTheme} tone="success" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
              Profile
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InputField label="Name" value={user?.name ?? ""} fullWidth disabled />
              <InputField label="Email" value={user?.email ?? ""} fullWidth disabled />
              <InputField label="Phone" value={user?.phone ?? ""} fullWidth disabled />
              <InputField label="Account Slug" value={user?.slug ?? ""} fullWidth disabled />
            </div>
            <p className="mt-4 text-sm font-medium leading-relaxed text-text-muted">
              Profile editing will stay aligned with the secured user management flow. For now, this page gives students and teachers a clear account snapshot.
            </p>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                Theme
              </h2>
              <div className="mt-5">
                <Select
                  label="App Theme"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as Theme)}
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                    { value: "system", label: "System" },
                  ]}
                  fullWidth
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                Notifications
              </h2>
              <div className="mt-5 space-y-3">
                {["Deadline reminders", "Submission updates", "Class announcements"].map((label) => (
                  <label
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border-muted bg-bg-main p-4"
                  >
                    <span className="text-sm font-black uppercase italic tracking-tighter text-text">
                      {label}
                    </span>
                    <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
                  </label>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                iconName="FaFloppyDisk"
                fullWidth
                className="mt-5"
                onClick={() => notify.success("Preferences saved on this device.")}
              >
                Save Preferences
              </Button>
            </section>
          </aside>
        </div>
      </div>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default Settings;

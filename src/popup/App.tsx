import { useEffect, useState } from "react";
import { usePopupStore } from "./store";
import Dashboard from "./pages/Dashboard";
import ProfileList from "./pages/ProfileList";
import ProfileEditor from "./pages/ProfileEditor";
import SettingsPage from "./pages/Settings";

type View =
  | { kind: "dashboard" }
  | { kind: "list" }
  | { kind: "editor"; profileId: string | null }
  | { kind: "settings" };

export default function App() {
  const init = usePopupStore((s) => s.init);
  const loading = usePopupStore((s) => s.loading);
  const [view, setView] = useState<View>({ kind: "dashboard" });

  useEffect(() => {
    void init();
  }, [init]);

  if (loading) {
    return <div className="p-6 text-center text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="flex flex-col min-h-[480px]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <button
          className="text-base font-bold text-brand"
          onClick={() => setView({ kind: "dashboard" })}
        >
          SocialShield
        </button>
        <nav className="flex gap-1 text-xs">
          <TabBtn active={view.kind === "list" || view.kind === "editor"} onClick={() => setView({ kind: "list" })}>
            Profiles
          </TabBtn>
          <TabBtn active={view.kind === "settings"} onClick={() => setView({ kind: "settings" })}>
            Settings
          </TabBtn>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto">
        {view.kind === "dashboard" && (
          <Dashboard
            onManageProfiles={() => setView({ kind: "list" })}
            onOpenSettings={() => setView({ kind: "settings" })}
          />
        )}
        {view.kind === "list" && (
          <ProfileList
            onAdd={() => setView({ kind: "editor", profileId: null })}
            onEdit={(id) => setView({ kind: "editor", profileId: id })}
          />
        )}
        {view.kind === "editor" && (
          <ProfileEditor
            profileId={view.profileId}
            onDone={() => setView({ kind: "list" })}
          />
        )}
        {view.kind === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded ${active ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

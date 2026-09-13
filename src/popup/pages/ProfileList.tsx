import { usePopupStore } from "../store";

interface Props {
  onAdd: () => void;
  onEdit: (id: string) => void;
}

export default function ProfileList({ onAdd, onEdit }: Props) {
  const profiles = usePopupStore((s) => s.profiles);
  const toggleProfile = usePopupStore((s) => s.toggleProfile);
  const deleteProfile = usePopupStore((s) => s.deleteProfile);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Blocked Profiles</h2>
        <button
          onClick={onAdd}
          className="text-xs px-2 py-1 rounded bg-brand text-white font-semibold"
        >
          + Add
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center text-xs text-slate-500 py-8">
          No profiles yet. Click <strong>+ Add</strong> to create one.
        </div>
      ) : (
        <ul className="space-y-2">
          {profiles.map((p) => (
            <li key={p.id} className="p-3 rounded border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.aliases.length} aliases · {p.contextSignals.keywords.length} kw ·{" "}
                    {p.contextSignals.phrases.length} phrases · {p.detectionMode}
                  </div>
                </div>
                <span className={`text-xs ${p.enabled ? "text-emerald-600" : "text-slate-400"}`}>
                  {p.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  onClick={() => onEdit(p.id)}
                  className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => void toggleProfile(p.id)}
                  className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                >
                  {p.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${p.name}"?`)) void deleteProfile(p.id);
                  }}
                  className="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

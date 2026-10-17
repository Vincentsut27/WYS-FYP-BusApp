import { Icon, ICONS } from "./Icon";

export type TabId = "routes" | "arrival" | "search" | "track" | "about";

export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const tabs: { id: TabId; label: string; iconPath: string }[] = [
    { id: "routes", label: "Routes", iconPath: ICONS.bus },
    { id: "arrival", label: "Arrival", iconPath: ICONS.clock },
    { id: "search", label: "Search", iconPath: ICONS.search },
    { id: "track", label: "Track", iconPath: ICONS.navigation },
    { id: "about", label: "About", iconPath: ICONS.info },
  ];

  return (
    <div className="tab-bar-safe bg-white border-t" style={{ borderColor: "var(--border)" }}>
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
              style={{ color: isActive ? "var(--purple)" : "var(--muted)" }}
              onClick={() => onChange(tab.id)}
            >
              <Icon path={tab.iconPath} size={20} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
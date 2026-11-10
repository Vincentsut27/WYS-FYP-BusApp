import { useI18n } from "../i18n/LanguageProvider";
import type { MessageKey } from "../i18n/messages";
import { Icon, ICONS } from "./Icon";

export type TabId = "routes" | "arrival" | "search" | "track" | "about";

export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const { t } = useI18n();
  const tabs: { id: TabId; label: MessageKey; iconPath: string }[] = [
    { id: "routes", label: "navRoutes", iconPath: ICONS.bus },
    { id: "arrival", label: "navArrival", iconPath: ICONS.clock },
    { id: "search", label: "navSearch", iconPath: ICONS.search },
    { id: "track", label: "navTrack", iconPath: ICONS.navigation },
    { id: "about", label: "navAbout", iconPath: ICONS.map },
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
              <span className="text-[10px] font-medium">{t(tab.label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
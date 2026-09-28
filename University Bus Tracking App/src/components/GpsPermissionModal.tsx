import { Icon, ICONS } from "./Icon";

export function GpsPermissionModal({ onAllow, onCancel }: { onAllow: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-[100] flex items-end" style={{ background: "rgba(15,23,42,0.45)" }}>
      <div className="w-full rounded-t-3xl bg-white p-6 shadow-2xl">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--purple-pale)", color: "var(--purple)" }}>
          <Icon path={ICONS.locate} size={22} />
        </div>
        <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>Allow location and motion access?</h2>
        <p className="text-sm mt-2 leading-5" style={{ color: "var(--muted)" }}>
          CUHK Bus Routes uses your location and motion/orientation data to show nearby stops, point the user arrow in the right direction, and track your journey accurately. Your data stays in this browser and is not saved by this app.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl text-sm font-semibold" style={{ background: "var(--bg)", color: "var(--muted)" }}>Not now</button>
          <button onClick={onAllow} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white" style={{ background: "var(--purple)" }}>Allow GPS</button>
        </div>
      </div>
    </div>
  );
}
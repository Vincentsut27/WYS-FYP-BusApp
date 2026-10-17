import { Icon, ICONS } from "../components/Icon";

const CONTACT_EMAIL = "your-email@gmail.com";

export function AboutPage() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div
        className="border-b px-5 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <h1 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>
          About CUHK Bus Routes
        </h1>
      </div>
      <div className="flex-1 scrollable px-5 py-5">
        <section className="border-b pb-5" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            About the app
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
            CUHK Bus Routes helps the university community explore campus bus
            routes, check stops and estimated arrival times, and plan journeys
            across campus.
          </p>
        </section>
        <section className="border-b py-5" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            Questions or suggestions?
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
            Contact us by email. We welcome questions, feedback, and ideas for
            improving the app.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold"
            style={{ color: "var(--purple)" }}
          >
            <Icon path={ICONS.info} size={16} />
            {CONTACT_EMAIL}
          </a>
        </section>
        <p className="pt-4 text-xs leading-5" style={{ color: "var(--muted)" }}>
          Arrival times may be illustrative estimates. Bus service is subject to
          the published timetable.
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Icon, ICONS } from "../components/Icon";
import { useI18n } from "../i18n/LanguageProvider";
import type { Locale } from "../i18n/messages";
import { CONTACT_EMAIL, FEEDBACK_FORM_URL } from "../lib/links";

export function AboutPage() {
  const { locale, setLocale, t } = useI18n();
  const [languageOpen, setLanguageOpen] = useState(false);
  const currentLanguage = locale === "zh-Hant" ? t("languageChinese") : t("languageEnglish");

  const chooseLanguage = (next: Locale) => {
    setLocale(next);
    setLanguageOpen(false);
  };

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div
        className="border-b px-5 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <h1 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>
          {t("aboutTitle")}
        </h1>
      </div>
      <div className="flex-1 scrollable px-5 py-5">
        <section className="border-b pb-5" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {t("aboutAppTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
            {t("aboutAppBody")}
          </p>
        </section>

        <section className="border-b py-5" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {t("languageTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
            {t("languageBody")}
          </p>
          <button
            type="button"
            onClick={() => setLanguageOpen(true)}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {currentLanguage}
            </span>
            <Icon path={ICONS.chevronRight} size={18} className="opacity-40" />
          </button>
        </section>

        <section className="border-b py-5" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {t("contactTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
            {t("contactBody")}
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

        <section className="py-5">
          <a
            href={FEEDBACK_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl p-4"
            style={{ background: "var(--purple-pale)" }}
          >
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--purple)" }}
              >
                <Icon path={ICONS.alert} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold" style={{ color: "var(--text)" }}>
                  {t("feedbackTitle")}
                </span>
                <span className="mt-1 block text-sm leading-5" style={{ color: "var(--muted)" }}>
                  {t("feedbackBody")}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--purple)" }}>
                  {t("feedbackAction")}
                  <Icon path={ICONS.chevronRight} size={16} />
                </span>
              </span>
            </div>
          </a>
        </section>

        <p className="text-xs leading-5" style={{ color: "var(--muted)" }}>
          {t("aboutDisclaimer")}
        </p>
      </div>

      {languageOpen && (
        <div
          className="absolute inset-0 z-[100] flex items-end"
          style={{ background: "rgba(15,23,42,0.45)" }}
        >
          <div
            className="w-full rounded-t-3xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-dialog-title"
          >
            <h2 id="language-dialog-title" className="text-lg font-extrabold" style={{ color: "var(--text)" }}>
              {t("languageDialogTitle")}
            </h2>
            <div className="mt-4 space-y-2">
              {([
                ["en", t("languageEnglish")],
                ["zh-Hant", t("languageChinese")],
              ] as const).map(([value, label]) => {
                const selected = locale === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseLanguage(value)}
                    className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left"
                    style={{
                      borderColor: selected ? "var(--purple)" : "var(--border)",
                      background: selected ? "var(--purple-pale)" : "white",
                    }}
                  >
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {label}
                    </span>
                    <span
                      className="h-5 w-5 rounded-full border-2"
                      style={{
                        borderColor: selected ? "var(--purple)" : "var(--border)",
                        background: selected ? "var(--purple)" : "white",
                        boxShadow: selected ? "inset 0 0 0 3px white" : undefined,
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setLanguageOpen(false)}
              className="mt-4 w-full rounded-2xl py-3 text-sm font-semibold"
              style={{ background: "var(--bg)", color: "var(--muted)" }}
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

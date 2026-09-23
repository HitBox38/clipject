import { CloneEntrySection } from "./components/clone-entry-section";
import { DangerZone } from "./components/danger-zone";
import { ImportExportSection } from "./components/import-export-section";
import { ImportSharedSection } from "./components/import-shared-section";
import { ThemeSection } from "./components/theme-section";
export function SettingsPage() {
  return (
    <section
      className="page-stack settings-page"
      aria-labelledby="settings-title"
    >
      <header className="page-heading">
        <h1 id="settings-title">Settings</h1>
        <p>Appearance, backups, and local data.</p>
      </header>
      <div className="settings-stack">
        <ThemeSection />
      </div>
      <section className="settings-stack" aria-labelledby="data-title">
        <h2 id="data-title" className="section-heading">
          Data
        </h2>
        <ImportExportSection />
        <ImportSharedSection />
      </section>
      <section className="settings-stack" aria-labelledby="advanced-title">
        <h2 id="advanced-title" className="section-heading">
          Field mapping
        </h2>
        <CloneEntrySection />
      </section>
      <DangerZone />
    </section>
  );
}

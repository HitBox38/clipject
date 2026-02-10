import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DangerZone } from "./components/danger-zone";
import { ThemeSection } from "./components/theme-section";

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage your ClipJect extension preferences and data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ThemeSection />
          <DangerZone />
        </CardContent>
      </Card>
    </div>
  );
}

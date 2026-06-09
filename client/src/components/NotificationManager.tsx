import { useEffect, useState } from "react";
import { toast } from "sonner";
import { loadData, saveData } from "@/lib/db";
import { Bell } from "lucide-react";

export interface NotificationSettings {
  times: string[]; // e.g. ["10:00", "14:00", "16:30"]
}

const DEFAULT_SETTINGS: NotificationSettings = {
  times: ["10:00", "14:00", "16:30"]
};

export default function NotificationManager() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Load custom settings if any
    loadData("sbi-notification-settings").then((data) => {
      if (data && data.times) setSettings(data);
    });

    const intervalId = setInterval(checkAndNotify, 60000); // Check every minute
    // Initial check just in case we hit the exact minute on load
    checkAndNotify();

    return () => clearInterval(intervalId);
  }, []);

  const checkAndNotify = async () => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = now.getMinutes().toString().padStart(2, "0");
    const currentTimeString = `${currentHour}:${currentMinute}`;
    const todayStr = now.toISOString().split("T")[0];

    // Get latest settings
    const currentSettings = await loadData("sbi-notification-settings") || DEFAULT_SETTINGS;

    if (currentSettings.times.includes(currentTimeString)) {
      // Check if we already notified for this specific time slot today
      const lastNotifiedKey = "sbi-last-notified";
      const lastNotified = localStorage.getItem(lastNotifiedKey);
      const expectedSlotId = `${todayStr}-${currentTimeString}`;

      if (lastNotified === expectedSlotId) {
        return; // Already notified
      }

      // Time matches and not notified yet, fetch metrics
      await triggerNotification();

      // Record that we notified
      localStorage.setItem(lastNotifiedKey, expectedSlotId);
    }
  };

  const triggerNotification = async () => {
    try {
      let pendingTasksCount = 0;
      let pendingLeadsCount = 0;
      let pendingWalkinsCount = 0;

      const now = new Date();
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];

      // 1. Reminders / Tasks
      const tasksData = await loadData("sbi-tasks");
      if (Array.isArray(tasksData)) {
        pendingTasksCount = tasksData.filter((t: any) => !t.completed && (!t.dueDate || t.dueDate <= todayStr)).length;
      }

      // 2. Leads to Follow up
      const leadsData = await loadData("sbi-leads");
      if (Array.isArray(leadsData)) {
        pendingLeadsCount = leadsData.filter((l: any) => 
          (l.status === "Open" || l.status === "Pending") && 
          (!l.followUpDate || l.followUpDate <= todayStr)
        ).length;
      }

      // 3. Walkins
      const walkinsRaw = localStorage.getItem("bank_walkin_leads");
      if (walkinsRaw) {
        const walkins = JSON.parse(walkinsRaw);
        if (Array.isArray(walkins)) {
          pendingWalkinsCount = walkins.filter((w: any) => w.status === "pending").length;
        }
      }

      const totalPending = pendingTasksCount + pendingLeadsCount + pendingWalkinsCount;

      if (totalPending > 0) {
        toast("Daily Action Summary", {
          description: (
            <div className="flex flex-col gap-1 mt-1">
              {pendingTasksCount > 0 && <span>• {pendingTasksCount} tasks due or overdue</span>}
              {pendingLeadsCount > 0 && <span>• {pendingLeadsCount} leads require follow-up</span>}
              {pendingWalkinsCount > 0 && <span>• {pendingWalkinsCount} walk-in records pending action</span>}
            </div>
          ),
          duration: 10000,
          icon: <Bell className="text-purple-600 h-5 w-5" />,
          style: {
            borderLeft: "4px solid #7c3aed"
          }
        });
      }
    } catch (err) {
      console.error("Error triggering notification:", err);
    }
  };

  return null; // Invisible component
}

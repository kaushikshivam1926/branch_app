import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, Plus, Trash2, X, Save } from "lucide-react";
import { loadData, saveData } from "@/lib/db";
import { toast } from "sonner";

interface NotificationSettings {
  times: string[];
}

const DEFAULT_SETTINGS: NotificationSettings = {
  times: ["10:00", "14:00", "16:30"]
};

interface Props {
  onClose: () => void;
}

export default function NotificationConfigModal({ onClose }: Props) {
  const [times, setTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState("09:00");

  useEffect(() => {
    loadData("sbi-notification-settings").then((data) => {
      if (data && data.times) {
        setTimes(data.times);
      } else {
        setTimes(DEFAULT_SETTINGS.times);
      }
    });
  }, []);

  const handleSave = async () => {
    const sortedTimes = [...times].sort();
    await saveData("sbi-notification-settings", { times: sortedTimes });
    toast.success("Notification settings saved successfully");
    onClose();
  };

  const handleAddTime = () => {
    if (!times.includes(newTime)) {
      setTimes([...times, newTime].sort());
    }
  };

  const handleRemoveTime = (timeToRemove: string) => {
    setTimes(times.filter(t => t !== timeToRemove));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100" style={{ background: "linear-gradient(to right, #d4007f, #4e1a74)" }}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Notification Settings</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Notification Times</h4>
            <p className="text-xs text-gray-500">
              Configure the times when the app will check for pending tasks, leads, and action items.
            </p>
          </div>

          <div className="flex gap-2">
            <input 
              type="time" 
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
            <Button onClick={handleAddTime} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Time
            </Button>
          </div>

          <div className="space-y-2 max-h-[30vh] overflow-y-auto">
            {times.map((time, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="font-medium text-gray-700">
                  {new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button 
                  onClick={() => handleRemoveTime(time)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {times.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No notification times configured.</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-gray-300">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-[#4e1a74] hover:bg-[#4e1a74]/90 text-white shadow-md">
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}

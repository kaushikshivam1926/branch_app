import { useState, useEffect } from "react";
import { Bell, CheckCircle2, ListTodo, Users, CalendarClock, X } from "lucide-react";
import { loadData } from "@/lib/db";
import { Button } from "@/components/ui/button";

interface NotificationData {
  tasks: any[];
  leads: any[];
  walkins: any[];
}

export default function FloatingNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<NotificationData>({ tasks: [], leads: [], walkins: [] });
  const [totalPending, setTotalPending] = useState(0);

  const fetchMetrics = async () => {
    try {
      const now = new Date();
      // Adjust for local timezone to get correct YYYY-MM-DD
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];

      let pendingTasks: any[] = [];
      let pendingLeads: any[] = [];
      let pendingWalkins: any[] = [];

      // 1. Reminders / Tasks
      const tasksData = await loadData("sbi-tasks");
      if (Array.isArray(tasksData)) {
        pendingTasks = tasksData.filter((t: any) => !t.completed && (!t.dueDate || t.dueDate <= todayStr));
      }

      // 2. Leads to Follow up
      const leadsData = await loadData("sbi-leads");
      if (Array.isArray(leadsData)) {
        pendingLeads = leadsData.filter((l: any) => 
          (l.status === "Open" || l.status === "Pending") && 
          (!l.followUpDate || l.followUpDate <= todayStr)
        );
      }

      // 3. Walkins
      const walkinsRaw = localStorage.getItem("bank_walkin_leads");
      if (walkinsRaw) {
        const walkins = JSON.parse(walkinsRaw);
        if (Array.isArray(walkins)) {
          pendingWalkins = walkins.filter((w: any) => w.status === "pending");
        }
      }

      setData({
        tasks: pendingTasks,
        leads: pendingLeads,
        walkins: pendingWalkins
      });
      setTotalPending(pendingTasks.length + pendingLeads.length + pendingWalkins.length);
    } catch (err) {
      console.error("Failed to fetch notification metrics:", err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-20 z-50 flex flex-col items-end gap-4">
        {isOpen && (
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-80 max-h-[70vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="bg-gradient-to-r from-[#4e1a74] to-[#d4007f] p-4 text-white flex justify-between items-center shadow-md z-10">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <h3 className="font-semibold">Action Center</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
              {totalPending === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 opacity-50" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No pending actions right now.</p>
                </div>
              ) : (
                <>
                  {data.tasks.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm">
                      <div className="flex items-center gap-2 text-orange-600 font-semibold mb-2">
                        <ListTodo className="w-4 h-4" />
                        <h4>Pending Tasks ({data.tasks.length})</h4>
                      </div>
                      <ul className="space-y-2">
                        {data.tasks.slice(0, 3).map((task, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                            <span className="truncate">{task.name}</span>
                          </li>
                        ))}
                        {data.tasks.length > 3 && (
                          <li className="text-xs text-gray-500 italic ml-3">+ {data.tasks.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {data.leads.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                      <div className="flex items-center gap-2 text-blue-600 font-semibold mb-2">
                        <CalendarClock className="w-4 h-4" />
                        <h4>Follow-ups & Leads ({data.leads.length})</h4>
                      </div>
                      <ul className="space-y-2">
                        {data.leads.slice(0, 3).map((lead, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                            <span className="truncate">{lead.name || lead.customerName}</span>
                          </li>
                        ))}
                        {data.leads.length > 3 && (
                          <li className="text-xs text-gray-500 italic ml-3">+ {data.leads.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {data.walkins.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                      <div className="flex items-center gap-2 text-purple-600 font-semibold mb-2">
                        <Users className="w-4 h-4" />
                        <h4>Pending Walk-ins ({data.walkins.length})</h4>
                      </div>
                      <ul className="space-y-2">
                        {data.walkins.slice(0, 3).map((walkin, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                            <span className="truncate">{walkin.customerName}</span>
                          </li>
                        ))}
                        {data.walkins.length > 3 && (
                          <li className="text-xs text-gray-500 italic ml-3">+ {data.walkins.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
            {totalPending > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 p-3 text-center">
                <p className="text-xs text-gray-500">Go to respective apps to clear actions.</p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={() => {
            fetchMetrics(); // Fetch fresh data on open
            setIsOpen(!isOpen);
          }}
          className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-300 relative ${
            isOpen 
              ? 'bg-[#4e1a74] hover:bg-[#4e1a74]/90 text-white' 
              : 'bg-white hover:bg-gray-50 text-[#4e1a74] border border-[#4e1a74]/20'
          }`}
        >
          <Bell className="h-6 w-6" />
          {!isOpen && totalPending > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-6 w-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-pulse">
              {totalPending > 99 ? '99+' : totalPending}
            </span>
          )}
        </Button>
      </div>
    </>
  );
}

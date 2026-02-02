/**
 * Reminder & To-Do Web Application
 * 
 * Features:
 * - Task management with frequency options (One-time, Daily, Weekly, Monthly, Quarterly, Annual)
 * - Category-wise display (Overdue, Due Today, Due Tomorrow, Day-After-Tomorrow)
 * - Color coding (Red for Overdue, Orange for Due Today)
 * - Reminder notifications every 2 hours and on app close
 * - Admin login for editing/deleting tasks
 * - Task Lists for cyclical tasks (admin-only)
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useBranch } from "@/contexts/BranchContext";
import { ArrowLeft, Plus, Edit2, Trash2, Check, Calendar, Clock, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { loadData, saveData } from "@/lib/db";

interface Task {
  id: string;
  name: string;
  frequency: "One-time" | "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual";
  dueDate: string;
  completed: boolean;
  createdAt: string;
}

interface CompletionRecord {
  id: string;
  taskId: string;
  taskName: string;
  frequency: string;
  completedDate: string;
  originalDueDate: string;
}

const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "Sbi@12345";

export default function RemindersApp() {
  const { branchName } = useBranch();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showTaskListDialog, setShowTaskListDialog] = useState(false);
  const [showCompletionHistoryDialog, setShowCompletionHistoryDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completionHistory, setCompletionHistory] = useState<CompletionRecord[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lastReminderTime, setLastReminderTime] = useState<number>(Date.now());

  // Form state
  const [taskName, setTaskName] = useState("");
  const [frequency, setFrequency] = useState<Task["frequency"]>("One-time");
  const [dueDate, setDueDate] = useState("");

  // Load tasks and completion history from IndexedDB
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const savedTasks = await loadData("sbi-tasks");
        if (savedTasks) {
          setTasks(savedTasks);
        }
        
        const savedHistory = await loadData("sbi-completion-history");
        if (savedHistory) {
          setCompletionHistory(savedHistory);
        }
      } catch (error) {
        console.error("Failed to load tasks:", error);
        // Fallback to localStorage
        const localTasks = localStorage.getItem("sbi-tasks");
        if (localTasks) {
          const parsed = JSON.parse(localTasks);
          setTasks(parsed);
          // Migrate to IndexedDB
          saveData("sbi-tasks", parsed);
        }
      }
    };
    loadTasks();
  }, []);

  // Save tasks to IndexedDB
  useEffect(() => {
    const saveTasks = async () => {
      try {
        await saveData("sbi-tasks", tasks);
      } catch (error) {
        console.error("Failed to save tasks:", error);
        // Fallback to localStorage
        localStorage.setItem("sbi-tasks", JSON.stringify(tasks));
      }
    };
    if (tasks.length >= 0) {
      saveTasks();
    }
  }, [tasks]);

  // Reminder logic - check every 2 hours
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      const twoHours = 2 * 60 * 60 * 1000;
      
      if (now - lastReminderTime >= twoHours) {
        const pendingTasks = getPendingTasksCount();
        if (pendingTasks > 0) {
          toast.warning(`You have ${pendingTasks} pending task${pendingTasks > 1 ? 's' : ''}.`, {
            duration: 5000,
          });
          setLastReminderTime(now);
        }
      }
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [lastReminderTime, tasks]);

  // Reminder on app close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const pendingTasks = getPendingTasksCount();
      if (pendingTasks > 0) {
        const message = `You have ${pendingTasks} pending task${pendingTasks > 1 ? 's' : ''}.`;
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [tasks]);

  const getPendingTasksCount = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => !task.completed && task.dueDate <= today).length;
  };

  const handleLogin = () => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLoginDialog(false);
      setUsername("");
      setPassword("");
      toast.success("Logged in as Admin");
    } else {
      toast.error("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    toast.info("Logged out");
  };

  const handleAddTask = () => {
    if (!taskName || !dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      name: taskName,
      frequency,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTasks([...tasks, newTask]);
    resetForm();
    setShowTaskDialog(false);
    toast.success("Task added successfully");
  };

  const handleEditTask = () => {
    if (!editingTask || !taskName || !dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setTasks(tasks.map(task => 
      task.id === editingTask.id 
        ? { ...task, name: taskName, frequency, dueDate }
        : task
    ));
    resetForm();
    setShowTaskDialog(false);
    setEditingTask(null);
    toast.success("Task updated successfully");
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    toast.success("Task deleted");
  };

  const handleMarkCompleted = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Create completion record
    const completionRecord: CompletionRecord = {
      id: `${taskId}-${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      frequency: task.frequency,
      completedDate: new Date().toISOString(),
      originalDueDate: task.dueDate,
    };

    // Add to completion history
    const updatedHistory = [...completionHistory, completionRecord];
    setCompletionHistory(updatedHistory);
    
    // Save to IndexedDB
    try {
      await saveData("sbi-completion-history", updatedHistory);
    } catch (error) {
      console.error("Failed to save completion history:", error);
    }

    // Handle task based on frequency
    if (task.frequency === "One-time") {
      // Remove one-time tasks
      setTasks(tasks.filter(t => t.id !== taskId));
    } else {
      // For cyclical tasks, update the due date
      const currentDue = new Date(task.dueDate);
      let nextDue = new Date(currentDue);
      
      switch (task.frequency) {
        case "Daily":
          nextDue.setDate(nextDue.getDate() + 1);
          break;
        case "Weekly":
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case "Monthly":
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case "Quarterly":
          nextDue.setMonth(nextDue.getMonth() + 3);
          break;
        case "Annual":
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
      }
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, dueDate: nextDue.toISOString().split('T')[0], completed: false } : t
      ));
    }
    
    toast.success("Task marked as completed");
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTaskName(task.name);
    setFrequency(task.frequency);
    setDueDate(task.dueDate);
    setShowTaskDialog(true);
  };

  const resetForm = () => {
    setTaskName("");
    setFrequency("One-time");
    setDueDate("");
    setEditingTask(null);
  };

  const categorizeTask = (task: Task) => {
    if (task.completed) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays === 2) return "dayAfter";
    // For admin, include all future tasks
    if (isAdmin && diffDays > 2) return "future";
    return null;
  };

  const getTasksByCategory = () => {
    const categorized = {
      overdue: [] as Task[],
      today: [] as Task[],
      tomorrow: [] as Task[],
      dayAfter: [] as Task[],
      future: [] as Task[],
    };

    tasks.forEach(task => {
      const category = categorizeTask(task);
      if (category && category in categorized) {
        categorized[category as keyof typeof categorized].push(task);
      }
    });

    return categorized;
  };

  const categorizedTasks = getTasksByCategory();

  const renderTaskCard = (task: Task, category: string) => {
    const bgColor = category === "overdue" ? "bg-red-50 border-red-200" : 
                    category === "today" ? "bg-orange-50 border-orange-200" : 
                    "bg-blue-50 border-blue-200";
    
    const textColor = category === "overdue" ? "text-red-700" : 
                      category === "today" ? "text-orange-700" : 
                      "text-blue-700";

    return (
      <div key={task.id} className={`p-4 rounded-lg border-2 ${bgColor} ${textColor}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-semibold text-lg mb-1">{task.name}</h4>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {task.frequency}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!task.completed && (
              <Button
                size="sm"
                variant="outline"
                className="bg-green-500 hover:bg-green-600 text-white border-none"
                onClick={() => handleMarkCompleted(task.id)}
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white border-none"
                  onClick={() => openEditDialog(task)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-red-500 hover:bg-red-600 text-white border-none"
                  onClick={() => handleDeleteTask(task.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        backgroundColor: "#f7f4fb",
        fontFamily: "'Poppins', 'Effra', sans-serif"
      }}
    >
      {/* Header */}
      <header 
        className="w-full py-2 px-6"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          height: '101px',
          paddingTop: '0px'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <img 
                src="/images/sbi-logo.png" 
                alt="State Bank of India" 
                className="h-28 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div className="flex flex-col justify-center">
              <h1 
                className="text-white font-semibold leading-tight"
                style={{ fontSize: "1.3rem" }}
              >
                Reminder & To-Do
              </h1>
              <p 
                className="text-white/90"
                style={{ fontSize: "0.85rem" }}
              >
                {branchName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/40"
                onClick={() => setShowCompletionHistoryDialog(true)}
              >
                <List className="w-4 h-4 mr-2" />
                View Completed Tasks
              </Button>
            )}
            {isAdmin ? (
              <Button
                variant="outline"
                className="bg-green-500 hover:bg-green-600 text-white border-none"
                onClick={handleLogout}
              >
                Logout Admin
              </Button>
            ) : (
              <Button
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/40"
                onClick={() => setShowLoginDialog(true)}
              >
                Admin Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Back to Home */}
          <Link href="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          {/* Add Task Button */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold" style={{ color: "#4e1a74" }}>
              {isAdmin ? "All Tasks (Admin View)" : "My Tasks"}
            </h2>
            {!isAdmin && (
              <Button
                className="bg-gradient-to-r from-[#d4007f] to-[#4e1a74] hover:opacity-90 text-white"
                onClick={() => {
                  resetForm();
                  setShowTaskDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            )}
          </div>

          {/* Task Categories */}
          <div className="space-y-8">
            {/* Overdue */}
            {categorizedTasks.overdue.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-red-700">
                  Overdue ({categorizedTasks.overdue.length})
                </h3>
                <div className="space-y-3">
                  {categorizedTasks.overdue.map(task => renderTaskCard(task, "overdue"))}
                </div>
              </div>
            )}

            {/* Due Today */}
            {categorizedTasks.today.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-orange-700">
                  Due Today ({categorizedTasks.today.length})
                </h3>
                <div className="space-y-3">
                  {categorizedTasks.today.map(task => renderTaskCard(task, "today"))}
                </div>
              </div>
            )}

            {/* Due Tomorrow */}
            {categorizedTasks.tomorrow.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-700">
                  Due Tomorrow ({categorizedTasks.tomorrow.length})
                </h3>
                <div className="space-y-3">
                  {categorizedTasks.tomorrow.map(task => renderTaskCard(task, "tomorrow"))}
                </div>
              </div>
            )}

            {/* Due Day After Tomorrow */}
            {categorizedTasks.dayAfter.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-600">
                  Due Day After Tomorrow ({categorizedTasks.dayAfter.length})
                </h3>
                <div className="space-y-3">
                  {categorizedTasks.dayAfter.map(task => renderTaskCard(task, "dayAfter"))}
                </div>
              </div>
            )}

            {/* Future Tasks (Admin Only) */}
            {isAdmin && categorizedTasks.future.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-purple-700">
                  Future Tasks ({categorizedTasks.future.length})
                </h3>
                <div className="space-y-3">
                  {categorizedTasks.future.map(task => renderTaskCard(task, "future"))}
                </div>
              </div>
            )}

            {/* No tasks */}
            {Object.values(categorizedTasks).every(arr => arr.length === 0) && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No pending tasks. Add a new task to get started!</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="w-full h-px mb-4" style={{ backgroundColor: "#333" }} />
          <p className="text-center text-sm" style={{ color: "#666" }}>
            Ideation by <strong>Shivam Kaushik</strong> Developed with AI
          </p>
        </div>
      </footer>

      {/* Admin Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold" style={{ color: "#4e1a74" }}>Admin Login</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username</Label>
              <Input
                id="username"
                value="Admin"
                disabled
                className="bg-gray-100 text-gray-600 border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="border-gray-300 focus:ring-2 focus:ring-purple-500"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleLogin}
              className="flex-1 bg-gradient-to-r from-pink-600 to-purple-700 hover:opacity-90 text-white"
            >
              Login
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLoginDialog(false)}
              className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={(open) => {
        setShowTaskDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update task details" : "Create a new task"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="taskName">Task Name *</Label>
              <Input
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter task name"
              />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Select value={frequency} onValueChange={(value: Task["frequency"]) => setFrequency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="One-time">One-time</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTaskDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={editingTask ? handleEditTask : handleAddTask}>
              {editingTask ? "Update" : "Add"} Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Lists Dialog (Admin Only) */}
      <Dialog open={showTaskListDialog} onOpenChange={setShowTaskListDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Lists (Cyclical Tasks)</DialogTitle>
            <DialogDescription>
              Manage recurring task templates
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-gray-500">
              Task Lists feature coming soon...
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTaskListDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion History Dialog (Admin Only) */}
      <Dialog open={showCompletionHistoryDialog} onOpenChange={setShowCompletionHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completed Tasks History</DialogTitle>
            <DialogDescription>
              View all historically completed tasks with completion dates
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {completionHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No completed tasks yet
              </p>
            ) : (
              <div className="space-y-2">
                {completionHistory
                  .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())
                  .map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{record.taskName}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Due: {new Date(record.originalDueDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Completed: {new Date(record.completedDate).toLocaleDateString()}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {record.frequency}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCompletionHistoryDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

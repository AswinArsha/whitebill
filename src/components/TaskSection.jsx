// TaskSection.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Eye,
  Edit,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "../supabase";
import { Calendar } from "@/components/ui/calendar";
import { format, isToday } from "date-fns";
import AlertNotification from "./AlertNotification";

// Import react-hot-toast
import toast, { Toaster } from 'react-hot-toast';

function TaskList({ tasks, toggleTask, deleteTask, editTask, viewTask, isAdmin }) {
  const tasksByDate = tasks.reduce((acc, task) => {
    const date = isToday(new Date(task.created_at))
      ? "Today"
      : format(new Date(task.created_at), "dd/MM/yyyy");
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});

  return (
    <ScrollArea className="h-[400px] bg-gray-50 w-full rounded-md border p-4">
      {Object.entries(tasksByDate).map(([date, tasks]) => (
        <div key={date}>
          <h3 className="text-lg font-semibold mb-2">{date}</h3>
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center space-x-2 mb-4">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
              />
              <div className="grid gap-1.5 flex-grow">
                <label
                  className={`text-sm font-medium ${
                    task.completed ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.name}
                </label>
                <p className="text-xs text-muted-foreground">
                  Assigned to: {task.assignedToNames.join(", ")}
                </p>
              </div>
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              {isAdmin ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editTask(task)}
                    aria-label="Edit Task"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete Task"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => viewTask(task)}
                  aria-label="View Task"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ))}
    </ScrollArea>
  );
}

function TaskDialog({ task, isOpen, addTask, updateTask, onClose, employees, isAdmin }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [comboBoxOpen, setComboBoxOpen] = useState(false);
  const [date, setDate] = useState(new Date());

  // Synchronize state with task prop
  useEffect(() => {
    if (task) {
      setName(task.name || "");
      setDescription(task.description || "");
      setAssignedUsers(task.assigned_users || []);
      setDate(task.task_date ? new Date(task.task_date) : new Date());
    }
  }, [task]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setAssignedUsers([]);
      setDate(new Date());
    }
  }, [isOpen]);

  const handleSubmit = () => {
    // Validation: Ensure required fields are filled
    if (name && date && (isAdmin ? assignedUsers.length > 0 : true)) {
      const taskData = { name, description, assigned_users: assignedUsers, date };
      if (task) {
        updateTask({ ...task, ...taskData });
      } else {
        addTask(taskData);
      }
      onClose();
      // Display success toast
     
    } else {
      // Display error toast
      toast.error("Please fill in all required fields.");
    }
  };

  const toggleUserSelection = (userId) => {
    setAssignedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectedEmployeeNames = employees
    .filter((employee) => assignedUsers.includes(employee.id))
    .map((employee) => employee.name);

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{task ? "Edit Task" : "Add New Task"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        {/* Task Name */}
        <Label htmlFor="name">Task Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter task name"
          required
        />

        {/* Description (Optional) */}
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description"
        />

        {/* Date Picker */}
        <Label htmlFor="date">Select Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className="w-full justify-start text-left font-normal"
              aria-label="Select Date"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
          </PopoverContent>
        </Popover>

        {/* Assign To (Only for Admins) */}
        {isAdmin && (
          <>
            <Label htmlFor="employee">Assign To</Label>
            <Popover open={comboBoxOpen} onOpenChange={setComboBoxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboBoxOpen}
                  className="w-full justify-between"
                  aria-label="Assign To"
                >
                  {selectedEmployeeNames.length > 0
                    ? selectedEmployeeNames.join(", ")
                    : "Select employees..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search employee..." />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {employees.map((employee) => (
                        <CommandItem
                          key={employee.id}
                          onSelect={() => toggleUserSelection(employee.id)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              assignedUsers.includes(employee.id)
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          {employee.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>

      {/* Submit Button with Icon */}
      <Button
        className="flex items-center space-x-2 w-full"
        onClick={handleSubmit}
        type="button"
      >
        {task ? (
          <>
            <Edit className="h-4 w-4" />
            <span>Update Task</span>
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </>
        )}
      </Button>
    </DialogContent>
  );
}

function TaskViewDialog({ task, onClose }) {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Task Details</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div>
          <Label htmlFor="view-name">Task Name</Label>
          <Input id="view-name" value={task.name} readOnly className="bg-gray-100" />
        </div>
        <div>
          <Label htmlFor="view-description">Description</Label>
          <Textarea
            id="view-description"
            value={task.description || ""}
            readOnly
            className="bg-gray-100"
          />
        </div>
        <div>
          <Label htmlFor="view-date">Date</Label>
          <Input
            id="view-date"
            value={format(new Date(task.task_date), "PPP")}
            readOnly
            className="bg-gray-100"
          />
        </div>
        <div>
          <Label>Assigned To</Label>
          <div className="bg-gray-100 p-2 rounded">
            {task.assignedToNames.join(", ") || ""}
          </div>
        </div>
        <div className="flex items-center">
          <Label>Status:</Label>
          <span
            className={`ml-2 text-sm font-medium ${
              task.completed ? "text-green-500" : "text-red-500"
            }`}
          >
            {task.completed ? "Completed" : "Pending"}
          </span>
        </div>
      </div>
    </DialogContent>
  );
}

export  function TaskSection({ role, userId, onTasksRead }) {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null); // State for viewing task

  const isAdmin = role === "admin";

  useEffect(() => {
    fetchEmployees();
    fetchTasks();
    markTasksAsRead(); // Mark tasks as read when component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from("users").select("id, name").eq("show", true);

      if (error) throw error;
      setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast.error("Failed to fetch employees.");
    }
  };

  const fetchTasks = async () => {
    let query;

    if (isAdmin) {
      // Admins can see all tasks
      query = supabase
        .from("tasks")
        .select(
          `
          id,
          name,
          description,
          completed,
          created_at,
          task_date,
          task_assignments (
            user_id,
            users (name)
          )
        `
        )
        .order("created_at", { ascending: false });
    } else {
      // Non-admin users can see only tasks assigned to them
      query = supabase
        .from("tasks")
        .select(
          `
          id,
          name,
          description,
          completed,
          created_at,
          task_date,
          task_assignments!inner (
            user_id,
            users (name)
          )
        `
        )
        .eq("task_assignments.user_id", userId)
        .order("created_at", { ascending: false });
    }

    try {
      const { data, error } = await query;

      if (error) throw error;

      setTasks(
        data.map((task) => {
          const assignedUserNames = Array.isArray(task.task_assignments)
            ? task.task_assignments.map((assign) => assign.users.name)
            : [];
          const assignedUserIds = Array.isArray(task.task_assignments)
            ? task.task_assignments.map((assign) => assign.user_id)
            : [];

          return {
            ...task,
            assigned_users: assignedUserIds,
            assignedToNames: assignedUserNames,
          };
        })
      );
    } catch (err) {
      console.error("Error fetching tasks:", err);
      toast.error("Failed to fetch tasks.");
    }
  };

  const addTask = async (newTask) => {
    try {
      const { data: taskData, error } = await supabase
        .from("tasks")
        .insert([
          {
            name: newTask.name,
            description: newTask.description || null, // Make description optional
            task_date: newTask.date,
          },
        ])
        .select("id");

      if (error) throw error;

      const taskId = taskData[0].id;

      if (isAdmin && newTask.assigned_users.length > 0) {
        const assignments = newTask.assigned_users.map((userId) => ({
          task_id: taskId,
          user_id: userId,
        }));

        const { error: assignError } = await supabase
          .from("task_assignments")
          .insert(assignments);

        if (assignError) throw assignError;
      }

      fetchTasks();
      toast.success("Task added successfully! 🎉");
    } catch (err) {
      console.error("Error adding task:", err);
      toast.error("Failed to add task. Please try again.");
    }
  };

  const updateTask = async (updatedTask) => {
    try {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          name: updatedTask.name,
          description: updatedTask.description || null, // Make description optional
          task_date: updatedTask.date,
        })
        .eq("id", updatedTask.id);

      if (updateError) throw updateError;

      if (isAdmin) {
        // Delete existing assignments
        const { error: deleteError } = await supabase
          .from("task_assignments")
          .delete()
          .eq("task_id", updatedTask.id);

        if (deleteError) throw deleteError;

        // Insert new assignments if any
        if (updatedTask.assigned_users.length > 0) {
          const assignments = updatedTask.assigned_users.map((userId) => ({
            task_id: updatedTask.id,
            user_id: userId,
          }));

          const { error: insertError } = await supabase
            .from("task_assignments")
            .insert(assignments);

          if (insertError) throw insertError;
        }
      }

      fetchTasks();
      toast.success("Task updated successfully! ✏️");
    } catch (err) {
      console.error("Error updating task:", err);
      toast.error("Failed to update task. Please try again.");
    }
  };

  const toggleTask = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      try {
        const { error } = await supabase
          .from("tasks")
          .update({ completed: !task.completed })
          .eq("id", id);

        if (error) throw error;

        fetchTasks();
        toast.success(`Task marked as ${task.completed ? "pending ⏳" : "completed ✅"}.`);
      } catch (err) {
        console.error("Error toggling task:", err);
        toast.error("Failed to update task status. Please try again.");
      }
    }
  };

  const deleteTask = async (id) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;

      fetchTasks();
      toast.success("Task deleted successfully! 🗑️");
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("Failed to delete task. Please try again.");
    }
  };

  const viewTask = (task) => {
    setViewingTask(task);
  };

  // Function to mark tasks as read
  const markTasksAsRead = async () => {
    try {
      const { error } = await supabase
        .from("task_assignments")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking tasks as read:", error);
      } else {
        // Notify parent component to refresh unread task count
        if (typeof onTasksRead === "function") {
          onTasksRead();
        }
      }
    } catch (err) {
      console.error("Error marking tasks as read:", err);
    }
  };

  // Custom handler to reset form fields when dialog is closed
  const handleDialogOpenChange = (isOpen) => {
    setIsDialogOpen(isOpen);
    if (!isOpen) {
      setEditingTask(null);
    }
  };

  return (
    <div>
      {/* Toaster for react-hot-toast */}
      <Toaster position="bottom-center" reverseOrder={false} />

      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-5 mb-4">
          <AlertNotification />
        </div>
      </div>

      {/* Filter and Add Task Button */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button
                className="flex items-center space-x-2"
                onClick={() => {
                  setEditingTask(null);
                }} // Reset editingTask when adding new task
              >
                <Plus className="h-4 w-4" />
                <span>Add Task</span>
              </Button>
            </DialogTrigger>
            <TaskDialog
              task={editingTask}
              isOpen={isDialogOpen} // Pass isOpen to TaskDialog
              addTask={addTask}
              updateTask={updateTask}
              onClose={() => setIsDialogOpen(false)}
              employees={employees}
              isAdmin={isAdmin}
            />
          </Dialog>
        )}
      </div>

      {/* Task List */}
      <TaskList
        tasks={tasks.filter((task) => {
          if (filter === "all") return true;
          if (filter === "completed") return task.completed;
          if (filter === "pending") return !task.completed;
          return true;
        })}
        toggleTask={toggleTask}
        deleteTask={deleteTask}
        editTask={(task) => {
          setEditingTask(task);
          setIsDialogOpen(true);
        }}
        viewTask={viewTask}
        isAdmin={isAdmin}
      />

      {/* View Task Dialog for Regular Users */}
      {viewingTask && (
        <Dialog open={Boolean(viewingTask)} onOpenChange={() => setViewingTask(null)}>
          <DialogTrigger asChild>
            <Button style={{ display: "none" }}></Button>
          </DialogTrigger>
          <TaskViewDialog task={viewingTask} onClose={() => setViewingTask(null)} />
        </Dialog>
      )}
    </div>
  );
}

export default TaskSection;

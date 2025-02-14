import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { supabase } from "../supabase"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react"

// Import your shadcn UI components (adjust paths as needed)
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import toast, { Toaster } from "react-hot-toast"

// ----------------- Quill Configuration -----------------
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }],
    ["blockquote"],
    [{ script: "sub" }, { script: "super" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ direction: "rtl" }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ["link"],
  ],
}

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "blockquote",
  "script",
  "indent",
  "direction",
  "color",
  "background",
  "align",
  "link",
]

// ----------------- QuillEditor Component -----------------
const QuillEditor = ({ value, onChange, placeholder, readOnly, style }) => {
  const editorRef = useRef(null)
  const quillRef = useRef(null)

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        modules,
        formats,
        placeholder: placeholder || "",
        readOnly: readOnly || false,
      })

      if (value) {
        quillRef.current.clipboard.dangerouslyPasteHTML(value)
      }

      quillRef.current.on("text-change", () => {
        const html = editorRef.current.querySelector(".ql-editor").innerHTML
        onChange(html)
      })
    }
  }, [onChange])

  useEffect(() => {
    if (quillRef.current) {
      const currentHTML = editorRef.current.querySelector(".ql-editor").innerHTML
      if (value !== currentHTML) {
        const selection = quillRef.current.getSelection()
        quillRef.current.clipboard.dangerouslyPasteHTML(value || "")
        if (selection) {
          quillRef.current.setSelection(selection)
        }
      }
    }
  }, [value])

  return <div ref={editorRef} style={style} />
}

// ----------------- TimelineNote Component -----------------
const TimelineNote = ({ note, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Helper to strip HTML for length check
  const stripHtml = (html) => {
    const tmp = document.createElement("div")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }

  const textLength = stripHtml(note.content).length
  const showToggle = textLength > 150

  return (
    <div className="relative">
      {/* Timeline connector */}
      <div className="absolute left-0 top-6 w-4 h-full">
        <div className="absolute left-[7px] top-4 w-[2px] h-full bg-gray-300" />
      </div>
      {/* Timeline dot */}
      <div className="absolute left-0 top-6">
        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
      </div>

      <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(note.note_date), "MMMM dd, yyyy")}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(note)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(note.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`prose prose-sm max-w-none transition-all duration-300 ${
              !isExpanded ? "max-h-40 overflow-hidden" : ""
            } notebook-content`}
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
          {showToggle && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-blue-600 hover:text-blue-700"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" /> Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" /> Read More
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ----------------- Main Notes Component -----------------
const Notes = () => {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [clientDetails, setClientDetails] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)
  
  // currentNote holds only content and note_date; title is defaulted to "Untitled Note"
  const [currentNote, setCurrentNote] = useState({
    content: "",
    note_date: format(new Date(), "yyyy-MM-dd"),
  })
  const [isEditing, setIsEditing] = useState(false)

  // Generate months for the current year
  const currentYear = new Date().getFullYear()
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentYear, i, 1)
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    }
  })

  // ----------------- Data Fetching -----------------
  useEffect(() => {
    const fetchClientDetails = async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single()
      if (error) {
        toast.error("Error fetching client details")
        return
      }
      setClientDetails(data)
    }

    const fetchNotes = async () => {
      const startDate = format(startOfMonth(new Date(selectedMonth)), "yyyy-MM-dd")
      const endDate = format(endOfMonth(new Date(selectedMonth)), "yyyy-MM-dd")
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .gte("note_date", startDate)
        .lte("note_date", endDate)
        .order("note_date", { ascending: false })
      if (error) {
        toast.error("Error fetching notes")
        return
      }
      setNotes(data)
    }

    fetchClientDetails()
    fetchNotes()
  }, [clientId, selectedMonth])

  // ----------------- Handlers -----------------
  const handleSubmit = async () => {
    if (!currentNote.content || currentNote.content === "<p><br></p>") {
      toast.error("Please fill in the note content")
      return
    }

    const userUUID =
      typeof clientId === "number"
        ? `00000000-0000-0000-0000-${clientId.toString().padStart(12, "0")}`
        : clientId

    const noteData = {
      content: currentNote.content,
      note_date: currentNote.note_date,
      title: "Untitled Note",
      client_id: clientId,
      created_by: userUUID,
    }

    const { error } = isEditing
      ? await supabase.from("client_notes").update(noteData).eq("id", currentNote.id)
      : await supabase.from("client_notes").insert([noteData])

    if (error) {
      toast.error(isEditing ? "Error updating note" : "Error creating note")
      console.error("Supabase error:", error)
      return
    }

    toast.success(isEditing ? "Note updated successfully" : "Note created successfully")
    setIsAddNoteOpen(false)
    resetForm()
    // Re-fetch notes after submission
    const startDate = format(startOfMonth(new Date(selectedMonth)), "yyyy-MM-dd")
    const endDate = format(endOfMonth(new Date(selectedMonth)), "yyyy-MM-dd")
    const { data } = await supabase
      .from("client_notes")
      .select("*")
      .eq("client_id", clientId)
      .gte("note_date", startDate)
      .lte("note_date", endDate)
      .order("note_date", { ascending: false })
    setNotes(data)
  }

  const resetForm = () => {
    setCurrentNote({
      content: "",
      note_date: format(new Date(), "yyyy-MM-dd"),
    })
    setIsEditing(false)
  }

  const handleEdit = (note) => {
    setCurrentNote({
      content: note.content,
      note_date: format(new Date(note.note_date), "yyyy-MM-dd"),
      id: note.id,
    })
    setIsEditing(true)
    setIsAddNoteOpen(true)
  }

  const handleDelete = async (noteId) => {
    const { error } = await supabase.from("client_notes").delete().eq("id", noteId)
    if (error) {
      toast.error("Error deleting note")
      return
    }
    toast.success("Note deleted successfully")
    setNotes(notes.filter((n) => n.id !== noteId))
  }

  // ----------------- UI Rendering -----------------
  return (
    <div className="min-h-screen">
      <Toaster position="bottom-center" reverseOrder={false} />
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 -ml-2 mb-4 text-gray-600 hover:text-gray-800"
          onClick={() => navigate("/home/clients")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>

        {/* Header */}
        <div className="mb-8 p-4 border-b-2 border-gray-300">
          <div className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-handwritten text-gray-800">
                {clientDetails?.client_name}
              </h2>
           
            </div>
            <div className="flex flex-wrap gap-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-transparent border-gray-400 text-gray-700">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  setIsEditing(false)
                  resetForm()
                  setIsAddNoteOpen(true)
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Note
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline View */}
        <div className="space-y-6">
          {notes.map((note) => (
            <TimelineNote key={note.id} note={note} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>

        {/* Add/Edit Note Dialog wrapped in Dialog component */}
        <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
          <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl font-handwritten text-gray-800">
                {isEditing ? "Edit Note" : "Add New Note"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 flex-grow">
              <div className="flex-grow">
                <Label className="font-handwritten text-gray-700">Content</Label>
                <div className="h-[calc(100vh-400px)] border border-gray-300 rounded-lg overflow-hidden">
                  <QuillEditor
                    value={currentNote.content}
                    onChange={(content) =>
                      setCurrentNote((prev) => ({ ...prev, content }))
                    }
                    placeholder="Write your note here..."
                    style={{ height: "100%" }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddNoteOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isEditing ? "Save Changes" : "Add Note"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Global Styles */}
        <style jsx global>{`
          .ql-container {
            font-size: 1.2rem;
          }
          .ql-editor {
            min-height: 200px;
            max-height: calc(100vh - 400px);
            overflow-y: auto;
            background-color: transparent;
          }
          .ql-toolbar {
            position: sticky;
            top: 0;
            z-index: 1;
            background-color: #f8f8f8;
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            border-color: #d1d5db;
          }
      
        `}</style>
      </div>
    </div>
  )
}

export default Notes

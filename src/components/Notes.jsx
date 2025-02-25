import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { supabase } from "../supabase"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import {
  Calendar,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Edit,MoreVertical 
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import toast, { Toaster } from "react-hot-toast"

// Quill configuration
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }],

  
    [{ color: [] }, { background: [] }],

    ["link"],
  ],
}

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",

  
  "color",
  "background",

  "link",
]

const QuillEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null)
  const quillRef = useRef(null)
  const containerRef = useRef(null)

  // Cleanup function to remove Quill instance and related elements
  const cleanupQuill = () => {
    if (quillRef.current) {
      // Remove event listeners
      quillRef.current.off("text-change")
      
      // Find and remove all toolbars within the container
      if (containerRef.current) {
        const toolbars = containerRef.current.querySelectorAll('.ql-toolbar')
        toolbars.forEach(toolbar => toolbar.remove())
      }
      
      // Clear editor content
      if (editorRef.current) {
        editorRef.current.innerHTML = ''
      }
      
      // Clear the Quill instance
      quillRef.current = null
    }
  }

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      // Clean up any existing instances first
      cleanupQuill()
      
      // Initialize new Quill instance
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        modules,
        formats,
        placeholder: placeholder || "",
      })

      // Set initial content
      quillRef.current.clipboard.dangerouslyPasteHTML(value || '')

      // Set up change handler
      quillRef.current.on("text-change", () => {
        const html = quillRef.current.root.innerHTML
        onChange(html)
      })
    }

    // Cleanup on unmount
    return cleanupQuill
  }, []) // Empty dependency array since we only want to initialize once

  return (
    <div ref={containerRef} className="quill-container">
      <div ref={editorRef} className="h-64" />
    </div>
  )
}

// Timeline Note Editor Component with improved cleanup
const TimelineNoteEditor = ({ 
  note,
  onSave, 
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(note.isNew)
  const [noteContent, setNoteContent] = useState(note.content)
  const editorContainerRef = useRef(null)

  const handleSave = () => {
    if (!noteContent || noteContent === "<p><br></p>") {
      toast.error("Please fill in the note content")
      return
    }
    
    if (editorContainerRef.current) {
      const toolbars = editorContainerRef.current.querySelectorAll('.ql-toolbar')
      toolbars.forEach(toolbar => toolbar.remove())
    }
    
    onSave(note.id, noteContent)
    setIsEditing(false)
  }

  return (
    <div className="relative pl-4 mb-8">
      {/* Timeline connector */}
      <div className="absolute -mt-1 left-0 top-6 w-4 h-full">
        <div className="absolute left-[7px] top-4 w-[2px] h-full bg-gray-200" />
      </div>
      {/* Timeline dot */}
      <div className="absolute -mt-2 left-0 top-6">
        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
      </div>
    
      <div className="bg-white rounded-lg overflow-hidden ">
        <div className="flex items-center justify-between p-1 md:p-4 border-b ">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span className="text-xs md:text-base">
              {format(new Date(note.date), "MMM d, yyyy")}
            </span>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex gap-2">
            {isEditing ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(note.id)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden">
            {isEditing ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(note.id)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div ref={editorContainerRef} className="relative p-1 md:p-4">
          {isEditing ? (
            <QuillEditor
              key={`editor-${note.id}-${isEditing}`}
              value={noteContent}
              onChange={setNoteContent}
              placeholder="Write your note here..."
            />
          ) : (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: noteContent }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Main Notes Component
const Notes = () => {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [clientDetails, setClientDetails] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))
  const [notes, setNotes] = useState([])

  // Generate months for the current year
  const currentYear = new Date().getFullYear()
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentYear, i, 1)
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    }
  })

  // Fetch client details and notes
  useEffect(() => {
    const fetchData = async () => {
      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single()

      if (clientError) {
        toast.error("Error fetching client details")
        return
      }
      setClientDetails(clientData)

      // Fetch notes for selected month
      const startDate = format(startOfMonth(new Date(selectedMonth)), "yyyy-MM-dd")
      const endDate = format(endOfMonth(new Date(selectedMonth)), "yyyy-MM-dd")
      
      const { data: notesData, error: notesError } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .gte("note_date", startDate)
        .lte("note_date", endDate)
        .order("created_at", { ascending: true })

      if (notesError) {
        toast.error("Error fetching notes")
        return
      }

      // Transform notes data to include position
      const transformedNotes = notesData.map((note, index) => ({
        id: note.id,
        content: note.content,
        date: note.note_date,
        position: index,
        isNew: false
      }))

      setNotes(transformedNotes)
    }

    fetchData()
  }, [clientId, selectedMonth])

  const handleAddNote = () => {
    const newNote = {
      id: `temp-${Date.now()}`,
      content: "",
      date: format(new Date(), "yyyy-MM-dd"),
      position: notes.length,
      isNew: true
    }
    setNotes(prev => [...prev, newNote])
  }

  const handleSaveNote = async (noteId, content) => {
    const note = notes.find(n => n.id === noteId)
    
    const noteData = {
      content,
      note_date: note.date,
      title: "Untitled Note",
      client_id: clientId,
      created_by: clientId
    }

    if (note.isNew) {
      const { data, error } = await supabase
        .from("client_notes")
        .insert([noteData])
        .select()
      
      if (error) {
        toast.error("Error creating note")
        return
      }

      setNotes(prev => prev.map(n => 
        n.id === noteId ? {
          ...n,
          id: data[0].id,
          content,
          isNew: false
        } : n
      ))
      toast.success("Note created successfully")
    } else {
      const { error } = await supabase
        .from("client_notes")
        .update(noteData)
        .eq("id", noteId)
      
      if (error) {
        toast.error("Error updating note")
        return
      }

      setNotes(prev => prev.map(n => 
        n.id === noteId ? {
          ...n,
          content
        } : n
      ))
      toast.success("Note updated successfully")
    }
  }

  const handleDeleteNote = async (noteId) => {
    const note = notes.find(n => n.id === noteId)
    
    if (!note.isNew) {
      const { error } = await supabase
        .from("client_notes")
        .delete()
        .eq("id", noteId)
      
      if (error) {
        toast.error("Error deleting note")
        return
      }
    }
    
    setNotes(prev => prev.filter(n => n.id !== noteId))
    toast.success("Note deleted successfully")
  }

  return (
    <div className="min-h-screen ">
      <Toaster position="bottom-center" reverseOrder={false} />
      <div className="max-w-5xl mx-auto -mt-9">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 -ml-2 mb-4 text-gray-600 hover:text-gray-800"
          onClick={() => navigate("/home/clients")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="md:inline hidden">Back to Clients</span>
          <span className="md:hidden">Back</span>
        </Button>

        {/* Header */}
        <div className="mb-2 md:mb-8 pb-4 md:border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-handwritten text-gray-800 mb-4 md:mb-0">
                {clientDetails?.client_name}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px] md:w-[180px] bg-white border-gray-200 text-gray-700 text-sm md:text-base">
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
            </div>
          </div>
        </div>

        {/* Empty State */}
        {notes.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notes</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new note.</p>
          </div>
        )}

        {/* Notes Timeline */}
        <div className="space-y-6">
          {notes.map((note) => (
            <TimelineNoteEditor
              key={note.id}
              note={note}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
            />
          ))}
        </div>

        {/* Add Note Button */}
        <div className=" flex justify-center mt-8">
          <Button
          variant="outline"
            onClick={handleAddNote}
            size="lg"
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">
              Add {notes.length > 0 ? "Another" : "First"} Note
            </span>
          </Button>
        </div>

        {/* Global Styles */}
        <style jsx global>{`
          .ql-toolbar.ql-snow {
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            background-color: #f8f8f8;
            border-color: #e5e7eb;
          }
          .ql-container.ql-snow {
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            border-color: #e5e7eb;
          }
          .ql-editor {
            min-height: 150px;
            font-size: 1rem;
            line-height: 1.5;
          }
          @media (max-width: 768px) {
            .ql-toolbar.ql-snow {
              padding: 6px;
            }
            .ql-editor {
              min-height: 120px;
              font-size: 0.875rem;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

export default Notes;

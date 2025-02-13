import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../supabase';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// Memoized Quill configuration
const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }],
    [{ 'align': [] }],
    ['blockquote'],
    ['link'],
    ['clean']
  ],
  clipboard: {
    matchVisual: false // Prevents unwanted extra line breaks
  }
};

const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'script',
  'list', 'bullet', 'indent',
  'direction', 'align',
  'link',
  'blockquote', 
];

// Memoized QuillEditor component
const QuillEditor = memo(({ value, onChange, placeholder = '', readOnly = false }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: QUILL_MODULES,
        formats: QUILL_FORMATS,
        placeholder,
        readOnly,
      });

      // Set initial content if provided
      if (value) {
        quillRef.current.root.innerHTML = value;
      }

      // Every text-change calls onChange with the new HTML
      const handleChange = () => {
        const html = quillRef.current.root.innerHTML;
        console.log("Quill text-change event fired. New content:", html);
        onChange(html);
      };

      quillRef.current.on('text-change', handleChange);
    }

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change');
      }
    };
  }, [onChange, placeholder, readOnly]);

  // We remove the syncing effect below to prevent overwriting user input.
  // If you need to update the editor from outside, consider handling that separately.

  return <div ref={editorRef} className="h-full" />;
});

QuillEditor.displayName = 'QuillEditor';


QuillEditor.displayName = 'QuillEditor';

// Memoized NoteCard component
const NoteCard = memo(({ note, onEdit, onDelete }) => (
  <Card className="bg-white transform transition-all duration-200 hover:shadow-lg">
    <CardHeader className="flex flex-row items-start justify-between space-y-0">
      <div>
        <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
        <p className="text-sm text-gray-600">
          {format(new Date(note.note_date), 'MMM dd, yyyy')}
        </p>
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
        className="text-sm prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />
    </CardContent>
  </Card>
));

NoteCard.displayName = 'NoteCard';

// Main Notes component
const Notes = ({ userId }) => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [clientDetails, setClientDetails] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState({
    title: '',
    content: '',
    note_date: format(new Date(), 'yyyy-MM-dd')
  });
  const [isEditing, setIsEditing] = useState(false);

  // Memoized months array
  const months = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentYear, i, 1);
      return {
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      };
    });
  }, []);

  // Memoized fetch functions
  const fetchClientDetails = useCallback(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      toast.error('Error fetching client details');
      console.error('Fetch client details error:', error);
      return;
    }
    setClientDetails(data);
  }, [clientId]);

  const fetchNotes = useCallback(async () => {
    const startDate = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .gte('note_date', startDate)
      .lte('note_date', endDate)
      .order('note_date', { ascending: false });

    if (error) {
      toast.error('Error fetching notes');
      console.error('Fetch notes error:', error);
      return;
    }
    setNotes(data);
  }, [clientId, selectedMonth]);

  useEffect(() => {
    fetchClientDetails();
    fetchNotes();
  }, [fetchClientDetails, fetchNotes]);

  const resetForm = useCallback(() => {
    setCurrentNote({
      title: '',
      content: '',
      note_date: format(new Date(), 'yyyy-MM-dd')
    });
    setIsEditing(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      console.log('handleSubmit fired', currentNote); // Debug log
  
      // Validate required fields
      if (!currentNote.title || !currentNote.content || currentNote.content === '<p><br></p>') {
        toast.error('Please fill in all required fields');
        return;
      }
  
      // Ensure proper UUID format for created_by
      const userUUID = typeof userId === 'string' ? userId : 
        `00000000-0000-0000-0000-${userId.toString().padStart(12, '0')}`;
  
      // Prepare note data according to the table schema
      const noteData = {
        title: currentNote.title,
        content: currentNote.content,
        note_date: currentNote.note_date || format(new Date(), 'yyyy-MM-dd'),
        client_id: clientId,
        created_by: userUUID,
      };
  
      console.log('Submitting note:', noteData);
  
      let response;
      
      if (isEditing && currentNote.id) {
        // Update existing note
        const { data, error } = await supabase
          .from('client_notes')
          .update({
            title: noteData.title,
            content: noteData.content,
            note_date: noteData.note_date
          })
          .eq('id', currentNote.id);
        
        response = { data, error };
      } else {
        // Insert new note
        const { data, error } = await supabase
          .from('client_notes')
          .insert([noteData])
          .select();
          
        response = { data, error };
      }
  
      if (response.error) {
        console.error('Supabase error:', response.error);
        toast.error(isEditing ? 'Error updating note' : 'Error creating note');
        return;
      }
  
      console.log('Supabase response:', response.data);
      toast.success(isEditing ? 'Note updated successfully' : 'Note created successfully');
      setIsAddNoteOpen(false);
      resetForm();
      fetchNotes();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('An unexpected error occurred');
    }
  }, [currentNote, clientId, userId, isEditing, resetForm, fetchNotes]);
  

  const handleEdit = useCallback((note) => {
    setCurrentNote({
      id: note.id,
      title: note.title,
      content: note.content,
      note_date: format(new Date(note.note_date), 'yyyy-MM-dd')
    });
    setIsEditing(true);
    setIsAddNoteOpen(true);
  }, []);

  const handleDelete = useCallback(async (noteId) => {
    try {
      const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Error deleting note');
        return;
      }

      toast.success('Note deleted successfully');
      fetchNotes();
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast.error('An unexpected error occurred while deleting');
    }
  }, [fetchNotes]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <Button
            variant="ghost"
            className="flex items-center gap-2 -ml-2 mb-2"
            onClick={() => navigate('/home/clients')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
          <Card className="bg-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {clientDetails?.client_name}'s Notebook
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Company: {clientDetails?.company}
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
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
                    setIsEditing(false);
                    resetForm();
                    setIsAddNoteOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Dialog for Add/Edit Note */}
        <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
          <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            </DialogHeader>
            <div className="grid flex-grow">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={currentNote.title}
                  onChange={(e) =>
                    setCurrentNote({ ...currentNote, title: e.target.value })
                  }
                  placeholder="Note title"
                />
              </div>
              <div className="flex-grow">
                <Label>Content</Label>
                <div className="h-[calc(100vh-350px)]">
                  <QuillEditor
                    value={currentNote.content}
                    onChange={(content) =>
                      setCurrentNote({ ...currentNote, content })
                    }
                    placeholder="Compose your note..."
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddNoteOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {isEditing ? 'Save Changes' : 'Add Note'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Global styles for the Quill editor */}
        <style jsx global>{`
          .ql-container {
            font-family: inherit;
            font-size: 1rem;
          }
          .ql-editor {
            min-height: 200px;
            max-height: calc(100vh - 400px);
            overflow-y: auto;
          }
          .ql-toolbar {
            position: sticky;
            top: 0;
            z-index: 1;
            background-color: white;
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            display: flex;
            flex-wrap: wrap;
            padding: 8px;
            gap: 5px;
          }
          .ql-formats {
            display: inline-flex;
            gap: 2px;
            align-items: center;
            margin-right: 8px !important;
          }
          .ql-toolbar button {
            width: 28px;
            height: 28px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 4px;
            border: 1px solid transparent;
            padding: 2px;
          }
          .ql-toolbar button:hover {
            background-color: rgba(0, 0, 0, 0.04);
          }
          .ql-toolbar button.ql-active {
            background-color: rgba(0, 0, 0, 0.08);
          }
          .ql-toolbar .ql-picker {
            height: 28px;
          }
          .ql-toolbar .ql-color-picker .ql-picker-options {
            padding: 5px;
            width: 152px;
          }
          .ql-toolbar .ql-color-picker .ql-picker-item {
            border: 1px solid transparent;
            margin: 2px;
          }
          .ql-editor blockquote {
            border-left: 4px solid #ccc;
            margin: 5px 0;
            padding-left: 16px;
          }
          .ql-editor code-block {
            background-color: #f4f4f4;
            border-radius: 4px;
            padding: 8px;
            margin: 5px 0;
            font-family: monospace;
          }
        `}</style>
      </div>
    </div>
  );
};

export default Notes;

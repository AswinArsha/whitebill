// Client.jsx
import React, { useState, useEffect } from 'react';
import { Edit, Trash2, ChevronRight, ChevronLeft, Plus, Check, X, MoreVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../supabase';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from "@/components/ui/textarea";
import AlertNotification from "./AlertNotification";

// Import react-hot-toast
import toast, { Toaster } from 'react-hot-toast';

// Import DropdownMenu components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Utility function for conditional class names
import { cn } from "@/lib/utils";

const Client = ({ role, userId }) => {
  const [columns, setColumns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState([
    'Lead', 'Contacted', 'Proposal', 'Won', 'Lost'
  ]);

  // New state for Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients.');
    } else {
      const categorizedData = [
        { name: 'Lead', color: 'yellow', bgColor: 'bg-yellow-50', clients: [] },
        { name: 'Contacted', color: 'blue', bgColor: 'bg-blue-50', clients: [] },
        { name: 'Proposal', color: 'purple', bgColor: 'bg-purple-50', clients: [] },
        { name: 'Won', color: 'green', bgColor: 'bg-green-50', clients: [] },
        { name: 'Lost', color: 'red', bgColor: 'bg-red-50', clients: [] },
      ];

      clientData.forEach((client) => {
        const category = categorizedData.find(column => column.name.toLowerCase() === client.status);
        if (category) {
          category.clients.push(client);
        }
      });

      setColumns(categorizedData);
    }
  };

  const handleAddOrUpdateClient = async (client) => {
    // Validate GSTIN (optional but recommended)
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (client.gstin && !gstinPattern.test(client.gstin)) {
      toast.error('Invalid GSTIN format. Please enter a valid 15-digit GSTIN.', {
        style: {
          background: '#f44336', // Red background
          color: '#fff', // White text
        },
      });
      return;
    }
  
    // Ensure status is one of the allowed values
    const validStatuses = ['lead', 'contacted', 'proposal', 'won', 'lost'];
    const clientStatus = validStatuses.includes(client.status) ? client.status : 'lead';
  
    const clientData = {
      client_name: client.client_name,
      name: client.name,
      status: clientStatus, // Set status to a valid value
      company: client.company || null,
      phone: client.phone || null,
      location: client.location || null,
      remarks: client.remarks || null,
      gstin: client.gstin || null,
      order: client.order || 0,
    };
  
    if (isEditMode) {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', client.id);
  
      if (error) {
        toast.error('Failed to update client.', {
          style: {
            background: '#f44336', // Red background
            color: '#fff', // White text
          },
        });
      } else {
        toast.success('Client updated successfully! ✏️');
      }
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select();
  
      if (error) {
        console.error('Error adding client:', error);
        toast.error('Failed to add client.', {
          style: {
            background: '#f44336', // Red background
            color: '#fff', // White text
          },
        });
      } else if (data && data.length > 0) {
        toast.success('Client added successfully! 🎉');
        fetchClients();
      } else {
        toast.error('No client data returned after insertion.');
      }
    }
  
    setSelectedClient(null);
  };
  
  
  
  const handleDeleteClient = async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete client.', {
        style: {
          background: '#f44336', // Red background
          color: '#fff', // White text
        },
      });
    } else {
      toast.success('Client deleted successfully! 🗑️', {
        
      });
    }

    fetchClients();
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
  
    if (!destination) return;
  
    const sourceColumnIndex = columns.findIndex(column => column.name === source.droppableId);
    const destinationColumnIndex = columns.findIndex(column => column.name === destination.droppableId);
  
    const sourceColumn = columns[sourceColumnIndex];
    const destinationColumn = columns[destinationColumnIndex];
  
    const sourceItems = Array.from(sourceColumn.clients);
    const [removed] = sourceItems.splice(source.index, 1); // Removed client
  
    if (sourceColumnIndex === destinationColumnIndex) {
      // If it's within the same column
      sourceItems.splice(destination.index, 0, removed);
      const newColumns = [...columns];
      newColumns[sourceColumnIndex].clients = sourceItems;
      setColumns(newColumns);
  
      // Update order in the database
      await updateClientOrder(sourceItems, sourceColumn.name);
    } else {
      // Moving to another column
      const destinationItems = Array.from(destinationColumn.clients);
      destinationItems.splice(destination.index, 0, removed);
  
      const newColumns = [...columns];
      newColumns[sourceColumnIndex].clients = sourceItems;
      newColumns[destinationColumnIndex].clients = destinationItems;
      setColumns(newColumns);
  
      removed.status = destination.droppableId.toLowerCase();
      const { error } = await supabase
        .from('clients')
        .update({ status: removed.status, order: 0 })
        .eq('id', removed.id);
  
      if (error) {
        console.error('Error updating client status:', error);
        toast.error(`Failed to update status of client ${removed.client_name}.`, {
          style: {
            background: '#f44336', // Red background
            color: '#fff', // White text
          },
        });
      } else {
        // Show the client name in the success message
        toast.success(`Client ${removed.client_name} moved to ${destination.droppableId}.`, {
        
        });
      }
  
      // Update order in the database for both columns
      await updateClientOrder(sourceItems, sourceColumn.name);
      await updateClientOrder(destinationItems, destinationColumn.name);
    }
  };

  const updateClientOrder = async (clients, columnName) => {
    const updates = clients.map((client, index) => ({
      id: client.id,
      order: index,
      status: columnName.toLowerCase(),
      name: client.name,
      company: client.company,
      phone: client.phone,
      location: client.location,
      client_name: client.client_name,
      remarks: client.remarks,
      gstin: client.gstin, // Include GSTIN in the update
    }));

    const { error } = await supabase
      .from('clients')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('Error updating client order:', error);
      toast.error('Failed to update client order.', {
        style: {
          background: '#f44336', // Red background
          color: '#fff', // White text
        },
      });
    }
  };

  const toggleColumnExpansion = (columnName) => {
    setExpandedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((name) => name !== columnName)
        : [...prev, columnName]
    );
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    clients: column.clients.filter(client =>
      (client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.gstin || '').toLowerCase().includes(searchTerm.toLowerCase())
    ),
  }));

  const getTextColorClass = (color) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600';
      case 'red':
        return 'text-red-600';
      case 'green':
        return 'text-green-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'purple':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex flex-col h-auto">
      {/* Toaster for react-hot-toast */}
      <Toaster position="bottom-center" reverseOrder={false} />

      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-5">
          <AlertNotification />
        </div>
      </div>

      {/* Main Card */}
      <Card className="flex flex-col w-full min-h-screen bg-gray-50">
        {/* Search and Add Button */}
        <div className="flex flex-col md:flex-row items-start mt-4 md:items-center px-4 py-2 space-y-4 md:space-y-0 md:space-x-4">
          <Input
            placeholder="Search clients"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow text-sm"
          />
          <Button
            onClick={() => { setIsEditMode(false); setSelectedClient({ status: 'Lead', gstin: '' }); }}
            className="flex items-center space-x-1 text-sm px-3 py-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Client</span>
          </Button>
        </div>

        {/* Drag and Drop Columns */}
        <div className="flex flex-grow w-full p-4 space-x-4 overflow-x-auto">
          <DragDropContext onDragEnd={onDragEnd}>
            {filteredColumns.map((column) => (
              <Droppable key={column.name} droppableId={column.name}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex flex-col ${
                      expandedColumns.includes(column.name) ? 'w-[224px]' : 'w-[60px]'
                    } transition-all duration-200 ease-in-out ${column.bgColor} border border-gray-300 p-3 rounded-lg shadow-sm relative cursor-pointer ${
                      snapshot.isDraggingOver ? 'bg-blue-100' : ''
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex justify-between items-center mb-1">
                      <h2
                        className={`text-md font-semibold truncate ${getTextColorClass(column.color)}`}
                        onClick={() => toggleColumnExpansion(column.name)}
                      >
                        {expandedColumns.includes(column.name) ? column.name : ''}
                      </h2>
                      <button
                        className="text-gray-500"
                        onClick={() => toggleColumnExpansion(column.name)}
                        aria-label={expandedColumns.includes(column.name) ? 'Collapse Column' : 'Expand Column'}
                      >
                        {expandedColumns.includes(column.name) ? (
                          <ChevronLeft className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Column Content */}
                    {expandedColumns.includes(column.name) ? (
                      <div className="flex-grow overflow-y-auto pr-1">
                        {column.clients.map((client, index) => (
                          <Draggable key={client.id} draggableId={client.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-2 ${snapshot.isDragging ? 'opacity-75' : ''}`}
                              >
                                <Card className="p-2 text-sm rounded-md shadow-none border border-gray-200">
                                  <CardHeader className="flex flex-row justify-between items-center p-0">
                                    <div>
                                      <p className="font-semibold">{client.client_name}</p>
                                      <p className="text-xs text-gray-600">{client.name}</p>
                                      {/* Optionally display GSTIN in the client card */}
                                      {client.gstin && (
                                        <p className="text-xs text-gray-600">GSTIN: {client.gstin}</p>
                                      )}
                                    </div>
                                    {/* Dropdown Menu */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="p-1 rounded-full hover:bg-gray-200"
                                          aria-label="Actions"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-32">
                                        <DropdownMenuItem
                                          onClick={() => { setIsEditMode(true); setSelectedClient(client); }}
                                          className="flex items-center cursor-pointer space-x-2"
                                        >
                                          <Edit className="h-4 w-4" />
                                          <span>Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => { setClientToDelete(client); setIsDeleteDialogOpen(true); }}
                                          className="flex items-center cursor-pointer space-x-2 text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                          <span>Delete</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </CardHeader>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="transform -rotate-90 whitespace-nowrap">
                          <p className={`text-xs font-semibold text-center ${getTextColorClass(column.color)}`}>
                            {column.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            ))}
          </DragDropContext>
        </div>
      </Card>

      {/* Add/Edit Client Dialog */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            </DialogHeader>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Client Name */}
              <div>
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  placeholder="Client Name"
                  value={selectedClient.client_name || ''}
                  onChange={(e) => setSelectedClient({ ...selectedClient, client_name: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Name"
                  value={selectedClient.name || ''}
                  onChange={(e) => setSelectedClient({ ...selectedClient, name: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>

              {/* Company Name */}
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  placeholder="Company Name"
                  value={selectedClient.company || ''}
                  onChange={(e) => setSelectedClient({ ...selectedClient, company: e.target.value })}
                  className="text-sm"
                />
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Phone Number"
                  value={selectedClient.phone || ''}
                  onChange={(e) => setSelectedClient({ ...selectedClient, phone: e.target.value })}
                  className="text-sm"
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Location"
                  value={selectedClient.location || ''}
                  onChange={(e) => setSelectedClient({ ...selectedClient, location: e.target.value })}
                  className="text-sm"
                />
              </div>

              {/* GSTIN */}
              <div>
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  placeholder="Enter GSTIN (15-digit)"
                  value={selectedClient.gstin || ''}
                  onChange={(e) => setSelectedClient({ ...selectedClient, gstin: e.target.value })}
                  maxLength={15}
                  pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$"
                  title="GSTIN must be a 15-digit alphanumeric identifier."
                  className="text-sm"
                />
              </div>

              {/* Remarks */}
              <div className="md:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Remarks"
                  value={selectedClient.remarks || ''}
                  onChange={(e) => setSelectedClient({ ...selectedClient, remarks: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </form>
            <div className="mt-3 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedClient(null)}
                className="flex items-center space-x-1 text-sm px-3 py-1.5"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button
                onClick={() => handleAddOrUpdateClient(selectedClient)}
                className="flex items-center space-x-1 text-sm px-3 py-1.5"
              >
                <Check className="h-4 w-4" />
                <span>{isEditMode ? 'Save Changes' : 'Add Client'}</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleDeleteClient(clientToDelete.id); setIsDeleteDialogOpen(false); setClientToDelete(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Client;

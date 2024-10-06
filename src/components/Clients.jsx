import React, { useState, useEffect } from 'react';
import { Edit, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import NotificationDropdown from "./NotificationDropdown";
import ProfileDropdown from "./ProfileDropdown";
import AlertNotification from "./AlertNotification";
import { Textarea } from "@/components/ui/textarea";

const Client = () => {
  const [columns, setColumns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState([
    'Lead', 'Contacted', 'Proposal', 'Won', 'Lost'
  ]);
  const { toast } = useToast();

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
      toast({
        title: 'Error',
        description: 'Failed to load clients.',
        variant: 'destructive',
      });
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
    if (isEditMode) {
      const { error } = await supabase
        .from('clients')
        .update(client)
        .eq('id', client.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update client.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Client updated successfully.',
          variant: 'positive',
        });
      }
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, order: 0 }]);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add client.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Client added successfully.',
          variant: 'positive',
        });

        // Insert at the start of the relevant column
        const updatedColumns = columns.map(column => {
          if (column.name.toLowerCase() === client.status) {
            return {
              ...column,
              clients: [data[0], ...column.clients],
            };
          }
          return column;
        });

        setColumns(updatedColumns);
      }
    }

    fetchClients();
    setSelectedClient(null);
  };

  const handleDeleteClient = async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete client.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Client deleted successfully.',
        variant: 'positive',
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
    const [removed] = sourceItems.splice(source.index, 1);

    if (sourceColumnIndex === destinationColumnIndex) {
      sourceItems.splice(destination.index, 0, removed);
      const newColumns = [...columns];
      newColumns[sourceColumnIndex].clients = sourceItems;
      setColumns(newColumns);

      // Update order in the database
      if (destinationColumn.name.toLowerCase() === 'proposal') {
        await updateClientOrder(sourceItems);
      }
    } else {
      const destinationItems = Array.from(destinationColumn.clients);
      // Insert at the start of the destination column
      destinationItems.unshift(removed);

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
        toast({
          title: 'Error',
          description: 'Failed to update client status.',
          variant: 'destructive',
        });
      }

      // Update order in the database for both columns
      await updateClientOrder(sourceItems);
      await updateClientOrder(destinationItems);
    }
  };

  const updateClientOrder = async (clients) => {
    const updates = clients.map((client, index) => ({
      id: client.id,
      order: index,
      name: client.name,
      company: client.company,
      phone: client.phone,
      location: client.location,
      status: client.status,
      client_name: client.client_name
    }));

    const { error } = await supabase
      .from('clients')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('Error updating client order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update client order.',
        variant: 'destructive',
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
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.client_name.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="flex flex-col min-h-screen">
      <div className="flex justify-between items-center ">
        <h2 className="text-2xl font-bold  ml-2 md:-ml-0">Clients</h2>

        <div className="flex space-x-5 mb-4">
          <div className="">
            <ProfileDropdown />
          </div>
          <AlertNotification />
          <NotificationDropdown />
        </div>


      </div>

      <Card className="flex px-1 pt-4 flex-col w-[1230px] min-h-screen bg-gray-50">
        <div className="flex px-4 w-[1230px] space-x-4">
          <Input
            placeholder="Search clients"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mr-4"
          />
          <Button onClick={() => { setIsEditMode(false); setSelectedClient({}); }}>
            Add New Client
          </Button>
        </div>

        <div className="flex flex-grow w-full p-4 space-x-4 overflow-x-auto">
          <DragDropContext onDragEnd={onDragEnd}>
            {filteredColumns.map((column) => (
              <Droppable key={column.name} droppableId={column.name}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex flex-col ${
                      expandedColumns.includes(column.name) ? 'w-[240px]' : 'w-[60px]'
                    } transition-all duration-200 ease-in-out ${column.bgColor} border border-gray-300 p-4 rounded-lg shadow-md relative cursor-pointer`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h2
                        className={`text-lg font-semibold truncate text-${column.color}-600`}
                        onClick={() => toggleColumnExpansion(column.name)}
                      >
                        {expandedColumns.includes(column.name) ? column.name : ''}
                      </h2>
                      <button
                        className="text-gray-500"
                        onClick={() => toggleColumnExpansion(column.name)}
                      >
                        {expandedColumns.includes(column.name) ? (
                          <ChevronLeft />
                        ) : (
                          <ChevronRight />
                        )}
                      </button>
                    </div>
                    {expandedColumns.includes(column.name) ? (
                      <div className="flex-grow overflow-y-auto pr-2">
                        {column.clients.map((client, index) => (
                          <Draggable key={client.id} draggableId={client.id.toString()} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="mb-2"
                              >
                                <Card className="mb-2 ">
                                  <CardHeader>
                                    <p className="text-lg font-semibold">{client.client_name}</p>
                                    <CardDescription>{client.name}</CardDescription>
                                  </CardHeader>
                              
                                  <CardFooter className="flex justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => { setIsEditMode(true); setSelectedClient(client); }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Are you sure you want to delete this client?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteClient(client.id)}>
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </CardFooter>
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
                          <p className={`text-sm font-semibold text-center ${getTextColorClass(column.color)}`}>
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditMode ? 'Edit Client' : 'Add New Client'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <Input
          placeholder="Client Name"
          value={selectedClient.client_name || ''}
          onChange={(e) => setSelectedClient({ ...selectedClient, client_name: e.target.value })}
        />
        <Input
          placeholder="Name"
          value={selectedClient.name || ''}
          onChange={(e) => setSelectedClient({ ...selectedClient, name: e.target.value })}
        />
        <Input
          placeholder="Company Name"
          value={selectedClient.company || ''}
          onChange={(e) => setSelectedClient({ ...selectedClient, company: e.target.value })}
        />
        <Input
          placeholder="Phone Number"
          value={selectedClient.phone || ''}
          onChange={(e) => setSelectedClient({ ...selectedClient, phone: e.target.value })}
        />
        <Input
          placeholder="Location"
          value={selectedClient.location || ''}
          onChange={(e) => setSelectedClient({ ...selectedClient, location: e.target.value })}
        />
        {/* Add the remarks Textarea here */}
        <Textarea
          placeholder="Remarks"
          value={selectedClient.remarks || ''}  // Ensure the `remarks` field is added to your `selectedClient` object
          onChange={(e) => setSelectedClient({ ...selectedClient, remarks: e.target.value })}
          rows={4}
        />
      </div>
      <div className="mt-4 flex justify-end space-x-2">
        <Button variant="outline" onClick={() => setSelectedClient(null)}>
          Cancel
        </Button>
        <Button onClick={() => handleAddOrUpdateClient(selectedClient)}>
          {isEditMode ? 'Save Changes' : 'Add Client'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
  
      )}
    </div>
  );
};

export default Client;

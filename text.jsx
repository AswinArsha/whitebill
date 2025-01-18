// components/Billing.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PrintUI from "./PrintUI";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Menu } from "lucide-react";
import { Calendar as CalendarIcon, Trash2, EllipsisVertical, Eye, Wallet, DollarSign, Printer, Check } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandItem,
} from "@/components/ui/command";
import AlertNotification from "./AlertNotification";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toWords } from 'number-to-words';
import InvoicePrintComponent from "./InvoicePrintComponent";
import GSTInvoice from "./GSTInvoice";
import { useReactToPrint } from 'react-to-print';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "../supabase";
import { v4 as uuidv4 } from "uuid";

const CATEGORIES = [
  { value: "shoot", label: "Shoot" },
  { value: "meeting", label: "Meeting" },
  { value: "post", label: "Post" },
  { value: "editing", label: "Editing" },
  { value: "ad_campaign", label: "Ad Campaign" },
  { value: "poster_design", label: "Poster Design" },
  { value: "task", label: "Task" },
];

const FILTER_CATEGORIES = [{ value: "all", label: "All Categories" }, ...CATEGORIES];

const getCategoryColor = (category, isDone) => {
  if (isDone) return "#4caf50"; 
  switch (category) {
    case "shoot": return "#f06543";  
    case "meeting": return "#0582ca";  
    case "post": return "#f48c06"; 
    case "editing": return "#9d4edd";  
    case "ad_campaign": return "#ad2831";  
    case "poster_design": return "#ffc300";  
    case "task": return "#335c67";  
    default: return "#6c757d";  
  }
};

const Billing = ({ role, userId }) => {
  // State variables
  const [items, setItems] = useState([
    { description: "Reels", quantity: "", numberOfDays: "", rate: 0 },
    { description: "Posters", quantity: "", numberOfDays: "", rate: 0 },
    { description: "Total Engagements", quantity: "", numberOfDays: "", rate: 0 },
    { description: "Story", quantity: "", numberOfDays: "", rate: 0 }
  ]);
  const [additionalBills, setAdditionalBills] = useState([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [isBalanceAdded, setIsBalanceAdded] = useState(false);
  const [billHistory, setBillHistory] = useState([]);
  const [clientDetails, setClientDetails] = useState("");
  const [manualTotal, setManualTotal] = useState(0);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isComboBoxOpen, setIsComboBoxOpen] = useState(false);

  // Dialog states
  const [isPaymentModeOpen, setIsPaymentModeOpen] = useState(false);
  const [currentBillId, setCurrentBillId] = useState(null);
  const [paymentMode, setPaymentMode] = useState("");
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewBill, setViewBill] = useState(null);

  // New state variables for invoice number and creation date
  const [invoiceNumber, setInvoiceNumber] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);

  const standardRef = useRef();
  const gstRef = useRef();

  const [finalInvoiceNumber, setFinalInvoiceNumber] = useState(invoiceNumber);
  const [finalCreatedAt, setFinalCreatedAt] = useState(createdAt);

  useEffect(() => {
    fetchClients();
    fetchBillHistory();

    const channel = supabase
      .channel('public:bills')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, payload => {
        console.log('Change received!', payload);
        fetchBillHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) console.error('Error fetching clients:', error);
    else setClients(data);
  };

  const fetchBillHistory = async () => {
    const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error fetching bills:', error);
    else setBillHistory(data);
  };

  const addItem = () => setItems([...items, { description: "", quantity: "", numberOfDays: "", rate: 0 }]);
  const addAdditionalBill = () => setAdditionalBills([...additionalBills, { name: "", amount: "" }]);

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === "rate" ? parseFloat(value) || 0 : value;
    setItems(newItems);
  };

  const updateAdditionalBill = (index, field, value) => {
    const newAdditionalBills = [...additionalBills];
    if (newAdditionalBills[index].isBalance && field === "amount") return;
    newAdditionalBills[index][field] = value;
    setAdditionalBills(newAdditionalBills);
  };

  const deleteItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleBillGenerated = () => {
    return new Promise(async (resolve, reject) => {
      const formattedDate = dateRange?.from && dateRange?.to 
        ? `${format(new Date(dateRange.from), "dd/MM/yyyy")} to ${format(new Date(dateRange.to), "dd/MM/yyyy")}` 
        : dateRange?.from
        ? format(new Date(dateRange.from), "dd/MM/yyyy")
        : format(new Date(), "dd/MM/yyyy");

      try {
        const totalAmount = parseFloat(manualTotal) || 0;
        const newBill = {
          id: uuidv4(),
          date: formattedDate,
          total: totalAmount,
          items: [...items],
          client_details: clientDetails,
          additional_bills: additionalBills,
          payment_mode: "",
          balance: 0,
        };

        const { data, error } = await supabase
          .from('bills')
          .insert([newBill])
          .select();

        if (error || !data || !data[0]) {
          console.error('Error saving bill:', error);
          throw new Error('Bill creation failed');
        }

        setInvoiceNumber(data[0].invoice_number);
        setCreatedAt(data[0].created_at);
        setFinalInvoiceNumber(data[0].invoice_number);
        setFinalCreatedAt(data[0].created_at);

        setBillHistory([data[0], ...billHistory]);
        setItems([
          { description: "Reels", quantity: "", numberOfDays: "", rate: 0 },
          { description: "Posters", quantity: "", numberOfDays: "", rate: 0 },
          { description: "Total Engagements", quantity: "", numberOfDays: "", rate: 0 },
          { description: "Story", quantity: "", numberOfDays: "", rate: 0 }
        ]);
        setClientDetails("");
        setManualTotal(0);
        setAdditionalBills([]);
        setOutstandingBalance(0);
        setIsBalanceAdded(false);

        resolve({ invoice_number: data[0].invoice_number, created_at: data[0].created_at });
      } catch (error) {
        console.error('Error during bill generation:', error);
        reject(error);
      }
    });
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    const details = `${client.company}\n${client.location}\n${client.phone}`;
    const gstinDetails = client.gstin ? `GSTIN: ${client.gstin}` : "";
    setClientDetails(`${details}${gstinDetails ? `\n${gstinDetails}` : ""}`);
    setIsComboBoxOpen(false);
    setAdditionalBills([]);
    setIsBalanceAdded(false);
    fetchOutstandingBalance(client);
  };

  const fetchOutstandingBalance = async (client) => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('balance')
        .eq('client_details', `${client.company}\n${client.location}\n${client.phone}`)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching outstanding balance:', error);
        setOutstandingBalance(0);
      } else if (data && data.balance > 0) {
        const latestBalance = parseFloat(data.balance);
        setOutstandingBalance(latestBalance);
        setAdditionalBills([{ name: "Balance", amount: latestBalance, isBalance: true }]);
        setIsBalanceAdded(true);
      } else {
        setOutstandingBalance(0);
      }
    } catch (error) {
      console.error('Error fetching outstanding balance:', error);
      setOutstandingBalance(0);
    }
  };

  const handleDeleteBill = async (id) => {
    try {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw new Error('Error deleting bill');
      setBillHistory(billHistory.filter(bill => bill.id !== id));
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const handleUpdatePaymentMode = async () => {
    if (!currentBillId) return;
    try {
      const { data, error } = await supabase.from('bills').update({ payment_mode: paymentMode }).eq('id', currentBillId);
      if (error) throw new Error('Error updating payment mode');
      setBillHistory(billHistory.map(bill => bill.id === currentBillId ? { ...bill, payment_mode: paymentMode } : bill));
      setIsPaymentModeOpen(false);
      setCurrentBillId(null);
      setPaymentMode("");
    } catch (error) {
      console.error('Error updating payment mode:', error);
    }
  };

  const handleUpdateBalance = async () => {
    if (!currentBillId) return;
    try {
      const { data, error } = await supabase.from('bills').update({ balance: parseFloat(balanceAmount) }).eq('id', currentBillId);
      if (error) throw new Error('Error updating balance');
      setBillHistory(billHistory.map(bill => bill.id === currentBillId ? { ...bill, balance: parseFloat(balanceAmount) } : bill));
      setIsBalanceOpen(false);
      setCurrentBillId(null);
      setBalanceAmount("");
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  const handlePaymentDone = async (billId) => {
    try {
      const { data: billData, error: fetchError } = await supabase.from('bills').select('*').eq('id', billId).single();
      if (fetchError) throw new Error('Error fetching bill details');
      if (!billData) throw new Error('Bill not found');

      const clientDetailsText = billData.client_details || "";
      const clientNameMatch = clientDetailsText.match(/^(.*?)\n/);
      const firstTwoWords = clientNameMatch ? clientNameMatch[1].split(' ').slice(0, 2).join(' ') : "Client";

      let totalAmount = parseFloat(billData.total);
      if (isNaN(totalAmount)) {
        totalAmount = parseFloat(billData.total.replace(/[^\d.-]/g, ''));
        if (isNaN(totalAmount)) throw new Error('Invalid total amount in bill');
      }

      const paymentDate = new Date();
      const formattedPaymentDate = format(paymentDate, 'yyyy-MM-dd');

      const transactionData = {
        title: firstTwoWords,
        amount: totalAmount,
        date: formattedPaymentDate,
        type: 'income',
        category: 'other',
        description: `Payment for invoice ${billData.invoice_number}`,
      };

      const { data: transaction, error: insertError } = await supabase.from('transactions').insert([transactionData]).select().single();
      if (insertError) throw new Error('Error creating transaction');

      const { error: updateError } = await supabase.from('bills').update({ payment_done: true }).eq('id', billId);
      if (updateError) throw new Error('Error updating payment status');

      setBillHistory((prevBills) => prevBills.map((bill) =>
        bill.id === billId ? { ...bill, payment_done: true } : bill
      ));
    } catch (error) {
      console.error('Error marking payment as done:', error);
    }
  };

  const filteredBillHistory = billHistory.filter(bill =>
    bill.client_details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formattedDate = dateRange?.from && dateRange?.to 
    ? `${format(new Date(dateRange.from), "dd/MM/yyyy")} to ${format(new Date(dateRange.to), "dd/MM/yyyy")}` 
    : dateRange?.from
    ? format(new Date(dateRange.from), "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");

  return (
    <div className="h-2">
      <div className="flex justify-between items-center ">
        <div className="flex space-x-5 mb-4">
          <div className=""></div>
          <AlertNotification />
        </div>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList>
          <TabsTrigger value="standard">Standard Invoice</TabsTrigger>
          <TabsTrigger value="gst">GST Invoice</TabsTrigger>
        </TabsList>

        <TabsContent value="standard">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Standard Invoice UI elements from original Billing component */}

            <Card className="bg-gray-50 shadow-none rounded-lg overflow-hidden">
              <CardHeader className="text-black">
                <CardTitle className="text-2xl">Enter Bill Details</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
              <div className="mb-6">
              <Label
                htmlFor="dateRange"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select Date Range
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="dateRange"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-gray-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(new Date(dateRange.from), "dd/MM/yyyy")} -{" "}
                          {format(new Date(dateRange.to), "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(new Date(dateRange.from), "dd/MM/yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Client Selection */}
            <div className="mb-6">
              <Label
                htmlFor="client-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select Client
              </Label>
              <Popover open={isComboBoxOpen} onOpenChange={setIsComboBoxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="client-select"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedClient && "text-gray-500"
                    )}
                  >
                    {selectedClient
                      ? selectedClient.client_name
                      : "Select a client"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search clients..." />
                    <CommandList>
                      <CommandEmpty>No clients found.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.client_name}
                            onSelect={() => handleClientSelect(client)}
                          >
                            <span>{client.client_name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Client Details */}
            <div className="mb-6">
              <Label
                htmlFor="client-details"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Client Details
              </Label>
              <Textarea
                id="client-details"
                placeholder="Enter client details here"
                value={clientDetails}
                onChange={(e) => setClientDetails(e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Items */}
            {items.map((item, index) => (
              <div key={index} className="flex -mx-2 mb-4">
                <div className="w-full md:w-1/2 px-2 mb-4 md:mb-0">
                  <Label
                    htmlFor={`description-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </Label>
                  <Input
                    id={`description-${index}`}
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Enter item description"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="w-full md:w-1/4 px-2 mb-4 md:mb-0">
                  <Label
                    htmlFor={`quantity-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Quantity
                  </Label>
                  <Input
                    type="number"
                    id={`quantity-${index}`}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    placeholder="Qty"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="w-full md:w-1/4 px-2">
                  <Label
                    htmlFor={`numberOfDays-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Days
                  </Label>
                  <Input
                    type="number"
                    id={`numberOfDays-${index}`}
                    value={item.numberOfDays}
                    onChange={(e) =>
                      updateItem(index, "numberOfDays", e.target.value)
                    }
                    placeholder="Days"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center justify-center w-full md:w-auto px-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteItem(index)}
                    className="sm:mt-6"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              onClick={addItem}
              variant="outline"
              className="mt-4 mb-6 w-full"
            >
              Add Item
            </Button>

            {/* Additional Bills */}
            <div className="mb-6">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Bills
              </Label>
              {additionalBills.map((bill, index) => (
                <div key={index} className="flex space-x-4 mb-4">
                  <Input
                    type="text"
                    placeholder="Bill Name"
                    value={bill.name}
                    onChange={(e) =>
                      updateAdditionalBill(index, "name", e.target.value)
                    }
                    className={`flex-grow ${
                      bill.isBalance ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                    readOnly={bill.isBalance}
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={bill.amount}
                    onChange={(e) =>
                      updateAdditionalBill(index, "amount", e.target.value)
                    }
                    className={`w-32 ${
                      bill.isBalance ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                    readOnly={bill.isBalance}
                  />
                </div>
              ))}
              <Button
                onClick={addAdditionalBill}
                variant="outline"
                className="w-full"
              >
                Add Additional Bill
              </Button>
            </div>

            {/* Total */}
            <div className="mb-6">
              <Label
                htmlFor="manual-total"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Total
              </Label>
              <Input
                id="manual-total"
                type="number"
                value={manualTotal}
                onChange={(e) => setManualTotal(e.target.value)}
                className="w-full p-3 text-right font-bold border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
                
                <PrintUI
                  items={items}
                  total={manualTotal}
                  additionalBills={additionalBills}
                  onBillGenerated={handleBillGenerated}
                  date={formattedDate}
                  clientDetails={clientDetails}
                  invoiceNumber={invoiceNumber}
                  createdAt={createdAt}
                />
              </CardContent>
            </Card>

            {/* Bill History Section */}
            <Card className="bg-gray-50 shadow-none rounded-lg overflow-hidden">
              <CardHeader className="text-black">
                <CardTitle className="text-2xl">Bill History</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
            {/* Search */}
            <div className="mb-4">
             
              <Input
                id="search"
                type="text"
                placeholder="Search by client details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Bill History Table */}
            <ScrollArea className="h-[56rem]  ">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client Details</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {filteredBillHistory.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                    {bill.created_at ? new Date(bill.created_at).toLocaleDateString() : bill.date}
                    </TableCell>
                    <TableCell>
                      {bill.client_details
                        ? bill.client_details.split('\n')[0]
                        : ''}
                    </TableCell>
                    <TableCell>₹{bill.total}</TableCell>
                    <TableCell>
                      {bill.payment_done ? (
                        <span className="text-green-500">Done</span>
                      ) : (
                        <span className="text-red-500">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Menubar>
                        <MenubarMenu>
                          <MenubarTrigger>
                            <EllipsisVertical className="h-4 w-4" />
                          </MenubarTrigger>
                          <MenubarContent>
                            <MenubarItem
                              onSelect={() => {
                                setViewBill(bill);
                                setIsViewOpen(true);
                              }}
                              className="flex items-center space-x-2"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </MenubarItem>
                            <MenubarItem
                              onSelect={() => handleDeleteBill(bill.id)}
                              className="flex items-center space-x-2 text-red-500"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span>Delete</span>
                            </MenubarItem>
                            <MenubarSeparator />
                            <MenubarItem
                              onSelect={() => {
                                setCurrentBillId(bill.id);
                                setIsPaymentModeOpen(true);
                              }}
                              className="flex items-center space-x-2"
                            >
                              <Wallet className="h-4 w-4" />
                              <span>Payment Mode</span>
                            </MenubarItem>
                            <MenubarItem
                              onSelect={() => {
                                setCurrentBillId(bill.id);
                                setIsBalanceOpen(true);
                              }}
                              className="flex items-center space-x-2"
                            >
                              <DollarSign className="h-4 w-4" />
                              <span>Balance</span>
                            </MenubarItem>
                            <MenubarSeparator />
                            <MenubarItem
                              onSelect={() => handlePaymentDone(bill.id)}
                              className="flex items-center justify-between space-x-2"
                            >
                              <span>Payment Done</span>
                              {bill.payment_done && <Check className="ml-2 h-4 w-4 text-green-500" />}
                            </MenubarItem>
                          </MenubarContent>
                        </MenubarMenu>
                      </Menubar>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
             
            </Table>
            </ScrollArea>
          </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gst">
          <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">GST Invoice</h2>
            <p>GST Invoice functionality will be added here.</p>
            {/* Placeholder for future GST invoice details */}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Mode Dialog */}
      <Dialog open={isPaymentModeOpen} onOpenChange={setIsPaymentModeOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-lg p-6 shadow-lg bg-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg font-semibold text-gray-800">Select Payment Mode</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <RadioGroup value={paymentMode} onValueChange={setPaymentMode} className="space-y-2">
              {/* Payment option items */}
              <div className={`flex items-center space-x-4 p-4 rounded-lg border ${paymentMode === "Cash" ? "border-green-500 bg-green-50" : "border-gray-200"} hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer`} onClick={() => setPaymentMode("Cash")}>
                <RadioGroupItem value="Cash" id="cash" className="hidden" />
                <Label htmlFor="cash" className="text-gray-700 font-medium">Cash</Label>
              </div>
              <div className={`flex items-center space-x-4 p-4 rounded-lg border ${paymentMode === "Swipe" ? "border-green-500 bg-green-50" : "border-gray-200"} hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer`} onClick={() => setPaymentMode("Swipe")}>
                <RadioGroupItem value="Swipe" id="swipe" className="hidden" />
                <Label htmlFor="swipe" className="text-gray-700 font-medium">Swipe</Label>
              </div>
              <div className={`flex items-center space-x-4 p-4 rounded-lg border ${paymentMode === "GPay" ? "border-green-500 bg-green-50" : "border-gray-200"} hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer`} onClick={() => setPaymentMode("GPay")}>
                <RadioGroupItem value="GPay" id="gpay" className="hidden" />
                <Label htmlFor="gpay" className="text-gray-700 font-medium">GPay</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpdatePaymentMode} disabled={!paymentMode}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Balance Update Dialog */}
      <Dialog open={isBalanceOpen} onOpenChange={setIsBalanceOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Balance</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-2">
              Balance Amount
            </Label>
            <Input
              id="balance"
              type="number"
              placeholder="Enter balance amount"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpdateBalance} disabled={!balanceAmount}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Bill Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg -mt-2 text-center font-semibold text-gray-900">Bill Details</DialogTitle>
          </DialogHeader>

          {viewBill && (
            <div className="space-y-3">
              {/* Bill Overview */}
              <div className="flex flex-col sm:flex-row justify-between">
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">Date:</span> {viewBill.date}</p>
                  <p><span className="font-medium">Payment Mode:</span> {viewBill.payment_mode || "Not Set"}</p>
                  <p><span className="font-medium">Balance:</span> ₹{viewBill.balance || 0}</p>
                </div>
                <div className="text-sm text-gray-600 sm:text-right">
                  <p><span className="font-medium">Invoice No:</span> {viewBill.invoice_number || ""}</p>
                </div>
              </div>
              <ScrollArea className="h-72">
                  {/* Items Section */}
              <div className="mb-3">
    
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr>

            <th className="px-4 py-2 bg-gray-50 border text-left text-sm font-medium text-gray-700">Items</th>
            <th className="px-4 py-2 bg-gray-50 border text-center text-sm font-medium text-gray-700">QTY</th>
            <th className="px-4 py-2 bg-gray-50 border text-center text-sm font-medium text-gray-700">Days</th>
           
          </tr>
        </thead>
        <tbody>
          {viewBill.items.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
           
              <td className="px-4 py-2 border text-sm text-gray-700">{item.description || 'N/A'}</td>
              <td className="px-4 py-2 border text-sm text-center text-gray-700">
                {item.quantity || '-'}
              </td>
              <td className="px-4 py-2 border text-sm text-center text-gray-700">
                {item.numberOfDays || '-'}
              </td>
         
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>

  {/* Additional Bills Section */}
  {viewBill.additional_bills && viewBill.additional_bills.length > 0 && (
    <div>
      <h3 className="text-sm font-semibold text-gray-800">Additional Bills</h3>
      <div className="overflow-x-auto">
        <table  className="min-w-full bg-white">
          <thead >
            <tr>
              <th className="px-4 py-2 bg-gray-50 border text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-2 bg-gray-50 border text-left text-sm font-medium text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            {viewBill.additional_bills.map((addBill, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-2 border text-sm text-gray-700">{addBill.name}</td>
                <td className="px-4 py-2 border text-sm text-gray-700">₹{parseFloat(addBill.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )}
              </ScrollArea>
              <div className="text-right font-semibold text-md text-black">
                Total: ₹{parseFloat(viewBill.total).toFixed(2)}
              </div>

              {/* Removed Print Buttons from View Bill Dialog to avoid undefined errors */}

              {/* Hidden Invoice Components for Printing (unchanged, but not used here) */}
              <div style={{ display: "none" }}>
                <InvoicePrintComponent
                  ref={standardRef}
                  items={viewBill.items}
                  total={viewBill.total}
                  additionalBills={viewBill.additional_bills}
                  date={viewBill.date}
                  clientDetails={viewBill.client_details}
                  invoiceNumber={viewBill.invoice_number}
                />
                <GSTInvoice
                  ref={gstRef}
                  invoiceData={{ /* GSTInvoice data */ }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;

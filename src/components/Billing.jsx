import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PrintUI from "./PrintUI";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "../supabase"; // Ensure this is correctly initialized for v2
import { v4 as uuidv4 } from "uuid";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Trash2, EllipsisVertical, Check, Eye, Wallet, DollarSign } from "lucide-react";
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
  CommandItem,
  CommandList,
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

const Billing = ({ role, userId }) => {
  // State variables
  const [items, setItems] = useState([
    { description: "Reels", quantity: "", numberOfDays: "", total: "" },
    { description: "Posters", quantity: "", numberOfDays: "", total: "" },
    { description: "Total Engagements", quantity: "", numberOfDays: "", total: "" },
    { description: "Story", quantity: "", numberOfDays: "", total: "" }
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

  useEffect(() => {
    fetchClients();
    fetchBillHistory();

    // Real-time subscription for bill history updates using Supabase JS SDK v2
    const channel = supabase
      .channel('public:bills') // Unique channel name
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills' },
        payload => {
          console.log('Change received!', payload);
          fetchBillHistory();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data);
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: "", numberOfDays: "", total: "" }]);
  };

  const addAdditionalBill = () => {
    setAdditionalBills([...additionalBills, { name: "", amount: "" }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const updateAdditionalBill = (index, field, value) => {
    const newAdditionalBills = [...additionalBills];
    if (newAdditionalBills[index].isBalance && field === "amount") {
      return;
    }
    newAdditionalBills[index][field] = value;
    setAdditionalBills(newAdditionalBills);
  };

  const deleteItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleBillGenerated = async () => {
    const formattedDate = dateRange?.from && dateRange?.to 
      ? `${format(new Date(dateRange.from), "dd/MM/yyyy")} to ${format(new Date(dateRange.to), "dd/MM/yyyy")}` 
      : dateRange?.from
      ? format(new Date(dateRange.from), "dd/MM/yyyy")
      : format(new Date(), "dd/MM/yyyy");

    const newBill = {
      id: uuidv4(),
      date: formattedDate,
      total: parseFloat(manualTotal) || 0,
      items: [...items],
      client_details: clientDetails,
      additional_bills: additionalBills,
      payment_mode: "",
      balance: 0
    };

    try {
      const { data, error } = await supabase
        .from('bills')
        .insert([newBill]);

      if (error || !data || !data[0]) {
        console.error('Error saving bill:', error);
        throw new Error('Bill creation failed');
      }

      setBillHistory([data[0], ...billHistory]);
      setItems([
        { description: "Reels", quantity: "", numberOfDays: "", total: "" },
        { description: "Posters", quantity: "", numberOfDays: "", total: "" },
        { description: "Total Engagements", quantity: "", numberOfDays: "", total: "" },
        { description: "Story", quantity: "", numberOfDays: "", total: "" }
      ]);
      setClientDetails("");
      setManualTotal(0);
      setAdditionalBills([]);
      setOutstandingBalance(0);
      setIsBalanceAdded(false);

      return newBill;
    } catch (error) {
      console.error('Error during bill generation:', error);
      return null;
    }
  };

  const fetchBillHistory = async () => {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bills:', error);
    } else {
      setBillHistory(data);
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setClientDetails(`${client.company}\n${client.location}\n${client.phone}`);
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
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching outstanding balance:', error);
        setOutstandingBalance(0);
      } else if (data.length > 0 && data[0].balance > 0) {
        const latestBalance = parseFloat(data[0].balance);
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
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error('Error deleting bill');
      }

      setBillHistory(billHistory.filter(bill => bill.id !== id));
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const handleUpdatePaymentMode = async () => {
    if (!currentBillId) return;

    try {
      const { data, error } = await supabase
        .from('bills')
        .update({ payment_mode: paymentMode })
        .eq('id', currentBillId);

      if (error) {
        throw new Error('Error updating payment mode');
      }

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
      const { data, error } = await supabase
        .from('bills')
        .update({ balance: parseFloat(balanceAmount) })
        .eq('id', currentBillId);

      if (error) {
        throw new Error('Error updating balance');
      }

      setBillHistory(billHistory.map(bill => bill.id === currentBillId ? { ...bill, balance: parseFloat(balanceAmount) } : bill));
      setIsBalanceOpen(false);
      setCurrentBillId(null);
      setBalanceAmount("");
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  // Handle marking payment as done and transferring to transactions table
  const handlePaymentDone = async (billId) => {
    try {
      // Fetch the bill details
      const { data: billData, error: fetchError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();

      if (fetchError) {
        throw new Error('Error fetching bill details');
      }

      if (!billData) {
        throw new Error('Bill not found');
      }

      // Extract the first two words from client_details
      const clientDetails = billData.client_details || "";
      const firstTwoWords = clientDetails.split(' ').slice(0, 2).join(' ');

      // Parse the total amount
      let totalAmount = parseFloat(billData.total);
      if (isNaN(totalAmount)) {
        totalAmount = parseFloat(billData.total.replace(/[^\d.-]/g, ''));
        if (isNaN(totalAmount)) {
          throw new Error('Invalid total amount in bill');
        }
      }

      // Get the current date in 'YYYY-MM-DD' format
      const paymentDate = new Date();
      const formattedPaymentDate = paymentDate.toISOString().split('T')[0];

      // Create a new transaction record
      const transactionData = {
        title: firstTwoWords,
        amount: totalAmount,
        date: formattedPaymentDate,
        type: 'income',
        category: 'other', // You can set a default category or modify as needed
        description: ``,
      };

      // Insert the new transaction into the transactions table
      const { data: transaction, error: insertError } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (insertError) {
        throw new Error('Error creating transaction');
      }

      // Update the bills table to mark the payment as done
      const { error: updateError } = await supabase
        .from('bills')
        .update({ payment_done: true })
        .eq('id', billId);

      if (updateError) {
        throw new Error('Error updating payment status');
      }

      // Update the local state to reflect changes
      setBillHistory((prevBills) =>
        prevBills.map((bill) =>
          bill.id === billId ? { ...bill, payment_done: true } : bill
        )
      );

    } catch (error) {
      console.error('Error marking payment as done:', error);
    }
  };

  const filteredBillHistory = billHistory.filter(bill =>
    bill.client_details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-2">
      {/* Header Section */}
      <div className="flex justify-between items-center ">
        <div className="flex space-x-5 mb-4">
          <div className="">
          </div>
          <AlertNotification />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enter Bill Details Section */}
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
              date={
                dateRange?.from && dateRange?.to
                  ? `${format(
                      new Date(dateRange.from),
                      "dd/MM/yyyy"
                    )} to ${format(new Date(dateRange.to), "dd/MM/yyyy")}`
                  : dateRange?.from
                  ? format(new Date(dateRange.from), "dd/MM/yyyy")
                  : format(new Date(), "dd/MM/yyyy")
              }
              clientDetails={clientDetails}
            />
          </CardContent>
        </Card>

        <Card className="bg-gray-50 shadow-none rounded-lg overflow-hidden">
          <CardHeader className="text-black">
            <CardTitle className="text-2xl">Bill History</CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <div className="mb-4">
              <Label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Search Bill History
              </Label>
              <Input
                id="search"
                type="text"
                placeholder="Search by client details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

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
                    <TableCell>{bill.date}</TableCell>
                    <TableCell>
                      {bill.client_details
                        ? bill.client_details.split(' ').slice(0, 2).join(' ')
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
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPaymentModeOpen} onOpenChange={setIsPaymentModeOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Select Payment Mode</DialogTitle>
          </DialogHeader>
          <Separator className="my-4" />
          <div className="mt-4">
            <RadioGroup value={paymentMode} onValueChange={setPaymentMode}>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="Cash" id="cash" />
                <Label htmlFor="cash">Cash</Label>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="Swipe" id="swipe" />
                <Label htmlFor="swipe">Swipe</Label>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="GPay" id="gpay" />
                <Label htmlFor="gpay">GPay</Label>
              </div>
            </RadioGroup>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-end">
            <Button onClick={handleUpdatePaymentMode} disabled={!paymentMode}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBalanceOpen} onOpenChange={setIsBalanceOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Balance</DialogTitle>
          </DialogHeader>
          <Separator className="my-4" />
          <div className="mt-4">
            <Label
              htmlFor="balance"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
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
          <Separator className="my-4" />
          <div className="flex justify-end">
            <Button onClick={handleUpdateBalance} disabled={!balanceAmount}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Bill Details
            </DialogTitle>
          </DialogHeader>
          <Separator className="my-4" />
          {viewBill && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-500 mb-2">
                Date: {viewBill.date}
              </div>
              <div className="text-sm font-medium text-gray-500 mb-2">
                Payment Mode: {viewBill.payment_mode || "Not Set"}
              </div>
              <div className="text-sm font-medium text-gray-500 mb-2">
                Balance: ₹{viewBill.balance || 0}
              </div>
              {viewBill.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm mb-2">
                  <span className="text-gray-800">{item.description}</span>
                  <span className="text-gray-600">
                    Qty: {item.quantity}, Days: {item.numberOfDays}
                  </span>
                </div>
              ))}
              {viewBill.additional_bills &&
                viewBill.additional_bills.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-bold text-gray-700">
                      Additional Bills
                    </h3>
                    {viewBill.additional_bills.map((addBill, index) => (
                      <div
                        key={index}
                        className="flex justify-between text-sm mb-2"
                      >
                        <span className="text-gray-800">{addBill.name}</span>
                        <span className="text-gray-600">
                          ₹{parseFloat(addBill.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              <div className="text-right font-bold mt-4 text-lg text-blue-600">
                Total: ₹{viewBill.total}
              </div>
            </div>
          )}
          <Separator className="my-4" />
          {viewBill && (
            <PrintUI
              items={viewBill.items}
              total={viewBill.total}
              additionalBills={viewBill.additional_bills}
              onBillGenerated={() => {}}
              date={viewBill.date}
              clientDetails={viewBill.client_details}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;

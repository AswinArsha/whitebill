// MonthlyExpenses.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast, { Toaster } from 'react-hot-toast';
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "../../supabase";
import SummaryCard from "./SummaryCard";
import TransactionsTable from "./TransactionsTable";
import TransactionFormDialog from "./TransactionFormDialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip } from "recharts";
import { LabelList, Pie, PieChart } from "recharts";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Plus, Save } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { Switch } from "@/components/ui/switch";
import AlertNotification from "../AlertNotification";

const TRANSACTION_CATEGORIES = [
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food" },
  { value: "salary", label: "Salary" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
];

const TRANSACTION_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const getCategoryColor = (category) => {
  switch (category) {
    case "travel":
      return "var(--color-travel)";
    case "food":
      return "var(--color-food)";
    case "salary":
      return "var(--color-salary)";
    case "utilities":
      return "var(--color-utilities)";
    case "other":
      return "var(--color-other)";
    default:
      return "var(--color-default)";
  }
};

const MonthlyExpenses = ({ role, userId }) => {
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const fetchTransactions = useCallback(async () => {
    let query = supabase.from("transactions").select("*");

    if (searchTerm) {
      query = query.or(
        `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      );
    }

    if (filterCategory && filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    if (filterType && filterType !== "all") {
      query = query.eq("type", filterType);
    }

    if (dateRange?.from && dateRange?.to) {
      query = query
        .gte("date", dateRange.from.toISOString())
        .lte("date", dateRange.to.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data);
    }
  }, [searchTerm, filterCategory, filterType, dateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAddEditTransaction = async () => {
    if (currentTransaction.title && currentTransaction.category && currentTransaction.type) {
      // Ensure date is a valid Date object
      const transactionDate = currentTransaction.date instanceof Date
        ? currentTransaction.date
        : new Date(currentTransaction.date || new Date()); // Convert to Date if it's not already a Date
  
      const transactionData = {
        title: currentTransaction.title,
        description: currentTransaction.description,
        amount: currentTransaction.amount,
        date: transactionDate.toISOString().split("T")[0], // Convert to 'YYYY-MM-DD' format
        category: currentTransaction.category,
        type: currentTransaction.type,
      };
  
      if (currentTransaction.id) {
        // Update existing transaction
        const { error } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", currentTransaction.id);
        if (error) {
          console.error("Error updating transaction:", error);
          toast.error("Failed to update transaction. Please try again.");
        } else {
          setTransactions((current) =>
            current.map((transaction) =>
              transaction.id === currentTransaction.id
                ? { ...transaction, ...transactionData }
                : transaction
            )
          );
          toast.success('Transaction updated successfully! ✏️');
        }
      } else {
        // Add new transaction
        const { data, error } = await supabase
          .from("transactions")
          .insert([transactionData])
          .select();
        if (error) {
          console.error("Error adding transaction:", error);
          toast.error("Failed to add transaction. Please try again.");
        } else {
          setTransactions((current) => [...current, ...data]);
          toast.success('Transaction added successfully! 🎉');
        }
      }
  
      setIsModalOpen(false);
      setCurrentTransaction(null);
    }
  };

  

  const handleDeleteTransaction = async (id) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction. Please try again.");
    } else {
      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== id)
      );
      toast.success('Transaction deleted successfully! 🗑️');
    }
    setIsAlertOpen(false);
    setTransactionToDelete(null);
  };
  

  const handleSearch = useCallback(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const summary = transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === "income") {
        acc.income += transaction.amount;
      } else {
        acc.expense += Math.abs(transaction.amount);
      }
      acc.balance = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, balance: 0 }
  );

  const getLastFourMonths = () => {
    const currentDate = dayjs();
    const months = [];
    for (let i = 0; i < 4; i++) {
      months.unshift(currentDate.subtract(i, 'month').format('MMM YYYY'));
    }
    return months;
  };

  const barChartData = getLastFourMonths().map(month => {
    const monthTransactions = transactions.filter(t => 
      dayjs(t.date).format('MMM YYYY') === month
    );
    return {
      month,
      income: monthTransactions.reduce((sum, t) => 
        t.type === 'income' ? sum + Math.abs(t.amount) : sum, 0
      ),
      expense: monthTransactions.reduce((sum, t) => 
        t.type === 'expense' ? sum + Math.abs(t.amount) : sum, 0
      ),
    };
  });

  const categoryWiseData = transactions.reduce((acc, transaction) => {
    if (!acc[transaction.category]) {
      acc[transaction.category] = 0;
    }
    acc[transaction.category] += Math.abs(transaction.amount);
    return acc;
  }, {});

  const pieChartData = Object.keys(categoryWiseData).map((category) => ({
    category,
    amount: categoryWiseData[category],
    fill: getCategoryColor(category),
  }));

  const chartConfig = {
    amount: {
      label: "Amount",
    },
    travel: {
      label: "Travel",
      color: "hsl(var(--chart-1))",
    },
    food: {
      label: "Food",
      color: "hsl(var(--chart-2))",
    },
    salary: {
      label: "Salary",
      color: "hsl(var(--chart-3))",
    },
    utilities: {
      label: "Utilities",
      color: "hsl(var(--chart-4))",
    },
    other: {
      label: "Other",
      color: "hsl(var(--chart-5))",
    },
  };

  return (
    <div>
      <Toaster position="bottom-center" reverseOrder={false} />
       <div className="flex  justify-between items-center ">

        <div className="flex space-x-5 mb-4">
          <div className="">
         
          </div>
          <AlertNotification />
    
        </div>


      </div>

      <Card className="shadow-none p-4 mb-4 bg-gray-50">
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-4 md:space-y-0 md:space-x-4">
    <Button
      onClick={() => {
        setCurrentTransaction(null);
        setIsModalOpen(true);
      }}
      className="flex items-center space-x-2 w-full md:w-auto"
    >
      <Plus className="h-5 w-5" />
      <span>Add Transaction</span>
    </Button>
    <Input
      placeholder="Search transactions..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyUp={handleSearch}
      className="w-full md:flex-grow"
    />
  </div>

  <div className="flex flex-col lg:flex-row justify-between items-start space-y-4 lg:space-y-0 lg:space-x-4 w-full">
    <div className="flex flex-col w-full lg:w-auto">
      <Label htmlFor="dateRange" className="mb-1">Date Range</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="dateRange"
            variant={"outline"}
            className={cn(
              "w-full lg:w-[300px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
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

    <div className="flex flex-col w-full ">
      <Label htmlFor="filterCategory" className="mb-1">Category</Label>
      <Select value={filterCategory} onValueChange={setFilterCategory}>
        <SelectTrigger id="filterCategory" className="w-full">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {TRANSACTION_CATEGORIES.map((category) => (
            <SelectItem key={category.value} value={category.value}>
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="flex flex-col w-full ">
      <Label htmlFor="filterType" className="mb-1">Type</Label>
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger id="filterType" className="w-full">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {TRANSACTION_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
</Card>


      <SummaryCard summary={summary} />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card className="col-span-2 lg:col-span-1 shadow-none bg-gray-50">
          <CardHeader>
            <CardTitle>Income vs. Expenses (Last 4 Months)</CardTitle>
            <CardDescription>Comparison of income and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={barChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={false}
                />
                <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={4} />
                <Bar dataKey="expense" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 shadow-none bg-gray-50">
          <CardHeader>
            <CardTitle>Category-wise Breakdown</CardTitle>
            <CardDescription>Breakdown of expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <Tooltip
                  content={<ChartTooltipContent nameKey="amount" hideLabel />}
                />
                <Pie data={pieChartData} dataKey="amount">
                  <LabelList
                    dataKey="category"
                    className="fill-background"
                    stroke="none"
                    fontSize={12}
                    formatter={(value) => chartConfig[value]?.label}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <TransactionsTable 
        transactions={transactions}
        setCurrentTransaction={setCurrentTransaction}
        setIsModalOpen={setIsModalOpen}
        setTransactionToDelete={setTransactionToDelete}
        setIsAlertOpen={setIsAlertOpen}
        handleDeleteTransaction={handleDeleteTransaction}
      />

      <TransactionFormDialog
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        currentTransaction={currentTransaction}
        setCurrentTransaction={setCurrentTransaction}
        handleAddEditTransaction={handleAddEditTransaction}
      />
    </div>
  );
};

export default MonthlyExpenses;
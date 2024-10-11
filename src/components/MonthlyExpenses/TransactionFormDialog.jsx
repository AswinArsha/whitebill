// TransactionFormDialog.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import DatePicker from "./DatePicker";

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

const TransactionFormDialog = ({
  isModalOpen,
  setIsModalOpen,
  currentTransaction,
  setCurrentTransaction,
  handleAddEditTransaction,
}) => (
  <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
    <DialogContent className="max-w-[625px]">
      <DialogHeader>
        <DialogTitle>
          {currentTransaction?.id ? "Edit Transaction" : "Add Transaction"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* Title Input */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={currentTransaction?.title || ""}
              onChange={(e) =>
                setCurrentTransaction({
                  ...currentTransaction,
                  title: e.target.value,
                })
              }
            />
          </div>

          {/* Amount Input */}
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={currentTransaction?.amount || ""}
              onChange={(e) =>
                setCurrentTransaction({
                  ...currentTransaction,
                  amount: parseFloat(e.target.value),
                })
              }
            />
          </div>

          {/* Description Textarea */}
          <div>
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              value={currentTransaction?.description || ""}
              onChange={(e) =>
                setCurrentTransaction({
                  ...currentTransaction,
                  description: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="space-y-4 -mt-2">
          {/* Date Picker */}
          <div>
            <Label htmlFor="date">Date</Label>
            <DatePicker
              selectedDate={currentTransaction?.date || new Date()}
              onDateChange={(date) =>
                setCurrentTransaction({
                  ...currentTransaction,
                  date: date,
                })
              }
            />
          </div>

          {/* Category Select */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={currentTransaction?.category || ""}
              onValueChange={(value) =>
                setCurrentTransaction({
                  ...currentTransaction,
                  category: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Select */}
          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              value={currentTransaction?.type || ""}
              onValueChange={(value) =>
                setCurrentTransaction({
                  ...currentTransaction,
                  type: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Dialog Footer */}
      <DialogFooter>
        <Button
          onClick={handleAddEditTransaction}
          className="flex items-center space-x-2"
        >
          {currentTransaction?.id ? (
            <>
              <Save className="h-5 w-5" />
              <span>Update Transaction</span>
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              <span>Add Transaction</span>
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default TransactionFormDialog;

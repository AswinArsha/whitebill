import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const SummaryCard = ({ summary }) => (
  <Card className="mb-4 shadow-none bg-gray-50">
    <CardHeader>
      <CardTitle>Summary Overview</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-row items-center p-6   bg-white">
          <TrendingUp className="text-green-500 w-8 h-8 mr-4" />
          <div>
            <h4 className="text-lg font-semibold text-green-500">Total Income</h4>
            <p className="text-xl font-bold text-green-500">₹{summary.income}</p>
          </div>
        </Card>
        <Card className="flex flex-row items-center p-4   bg-white">
          <TrendingDown className="text-red-500 w-8 h-8 mr-4" />
          <div>
            <h4 className="text-lg font-semibold text-red-500">Total Expense</h4>
            <p className="text-xl font-bold text-red-500">₹{summary.expense}</p>
          </div>
        </Card>
      </div>
    </CardContent>
  </Card>
);

export default SummaryCard;

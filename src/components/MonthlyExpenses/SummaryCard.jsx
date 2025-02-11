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
    <CardHeader className="p-4 ">
      <CardTitle className="text-lg sm:text-xl">Summary Overview</CardTitle>
    </CardHeader>
    <CardContent className="">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className="flex flex-row items-center p-4 sm:p-6 bg-white">
          <TrendingUp className="text-green-500 w-6 h-6 sm:w-8 sm:h-8 mr-3 sm:mr-4 flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="text-base sm:text-lg font-semibold text-green-500 truncate">Total Income</h4>
            <p className="text-lg sm:text-xl font-bold text-green-500 truncate">₹{summary.income}</p>
          </div>
        </Card>
        <Card className="flex flex-row items-center p-4 sm:p-6 bg-white">
          <TrendingDown className="text-red-500 w-6 h-6 sm:w-8 sm:h-8 mr-3 sm:mr-4 flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="text-base sm:text-lg font-semibold text-red-500 truncate">Total Expense</h4>
            <p className="text-lg sm:text-xl font-bold text-red-500 truncate">₹{summary.expense}</p>
          </div>
        </Card>
      </div>
    </CardContent>
  </Card>
);

export default SummaryCard;
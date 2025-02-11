// TransactionsTable.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import dayjs from "dayjs";
import DownloadButton from "./DownloadButton";
import { Pencil, Trash } from 'lucide-react'; // Import icons from lucide-react

const TransactionsTable = ({
  transactions,
  setCurrentTransaction,
  setIsModalOpen,
  setTransactionToDelete,
  setIsAlertOpen,
  handleDeleteTransaction,
}) => (
  <Card className="bg-gray-50">
    <CardHeader className="flex flex-row justify-between items-center">
      <div>
        <CardTitle>Transactions</CardTitle>
        <CardDescription className="hidden sm:block">A list of recent transactions.</CardDescription>
      </div>
      <DownloadButton transactions={transactions} />
    </CardHeader>
    <CardContent className="h-[480px] overflow-hidden">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <div className="overflow-y-auto max-h-[452px]">
          <table className="w-full divide-y-2  divide-gray-200 text-sm">
            <thead className="sticky bg-gray-200  top-0 z-10">
              <tr
                className="text-left "
              >
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 ">
                  Date
                </th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 ">
                  Title
                </th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 ">
                  Category
                </th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 ">
                  Type
                </th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-right ">
                  Amount
                </th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 ">
                  Notes
                </th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 ">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-gray-100 text-left transition-colors duration-200"
                >
                  <td className="whitespace-nowrap  px-4 py-2 font-medium text-gray-900">
                    {dayjs(transaction.date).format("DD MMM YYYY")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700 max-w-[150px] truncate">
                    <span title={transaction.title || ""}>
                      {transaction.title ? (transaction.title.length > 20 ? `${transaction.title.slice(0, 20)}...` : transaction.title) : ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4  py-2 text-gray-700">
                    {transaction.category}
                  </td>
                  <td className="whitespace-nowrap px-4  py-2 text-gray-700">
                    {transaction.type}
                  </td>
                  <td className="whitespace-nowrap px-4  py-2 text-gray-700 ">
                    ₹{transaction.amount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700 max-w-[200px] truncate">
                    <span title={transaction.description || ""}>
                      {transaction.description ? (transaction.description.length > 25 ? `${transaction.description.slice(0, 25)}...` : transaction.description) : ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap  px-2 py-2 text-gray-700">
                    <div className="space-x-2  flex">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentTransaction(transaction);
                          setIsModalOpen(true);
                        }}
                        className="flex items-center space-x-2"
                      >
                        <Pencil className="h-4 w-4" />

                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setTransactionToDelete(transaction.id);
                              setIsAlertOpen(true);
                            }}
                            className="flex items-center space-x-2"
                          >
                            <Trash className="h-4 w-4" />

                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently
                              delete the transaction.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              onClick={() => setIsAlertOpen(false)}
                            >
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteTransaction(transaction.id)
                              }

                              className="flex items-center space-x-1 bg-red-500 hover:bg-red-400"
                            >
                              <Trash className="h-5 w-5 text-white" />
                              <span> Delete</span>
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default TransactionsTable;

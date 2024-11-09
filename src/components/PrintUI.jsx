// components/PrintUI.jsx

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import InvoicePrintComponent from "./InvoicePrintComponent"; // Standard invoice component
import GSTInvoice from "./GSTInvoice"; // GST invoice component
import { useReactToPrint } from 'react-to-print';
import { toWords } from 'number-to-words';

const PrintUI = ({ 
  items, 
  total, 
  additionalBills, 
  gstAmount, 
  onBillGenerated, 
  date, 
  clientDetails, 
  invoiceNumber, 
  createdAt 
}) => {
  const standardRef = useRef();
  const gstRef = useRef();

  // Calculate total with GST
  const totalNumber = parseFloat(total) || 0;
  const gstNumber = parseFloat(gstAmount) || 0;
  const totalWithGST = totalNumber + gstNumber;

  // Convert totalWithGST to words
  const integerPart = Math.floor(totalWithGST);
  const decimalPart = Math.round((totalWithGST - integerPart) * 100);
  let amountInWords = toWords(integerPart) + ' Rupees';
  if (decimalPart > 0) {
    amountInWords += ` and ${toWords(decimalPart)} Paise`;
  }

  const handlePrintStandard = useReactToPrint({
    content: () => standardRef.current,
    onBeforeGetContent: onBillGenerated,
  });

  const handlePrintGST = useReactToPrint({
    content: () => gstRef.current,
    onBeforeGetContent: onBillGenerated,
  });

  return (
    <div>
      <Popover>
        <PopoverTrigger asChild>
          <Button className="mt-4 w-full text-white flex items-center space-x-2 rounded-md py-2 transition-colors">
            <Printer className="h-5 w-5 text-white" />
            <span>Print Invoice</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="flex flex-col">
            <Button 
              variant="ghost" 
              onClick={handlePrintStandard} 
              className="w-full justify-start"
            >
              Standard Invoice
            </Button>
            <Button 
              variant="ghost" 
              onClick={handlePrintGST} 
              className="w-full justify-start"
            >
              GST Invoice
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Hidden Components for Printing */}
      <div style={{ display: "none" }}>
        {/* Standard Invoice */}
        <InvoicePrintComponent
          ref={standardRef}
          items={items}
          total={total}
          additionalBills={additionalBills}
          date={date}
          clientDetails={clientDetails}
          invoiceNumber={invoiceNumber}
        />

        {/* GST Invoice */}
        <GSTInvoice
          ref={gstRef}
          invoiceData={{
            invoiceNo: invoiceNumber || "N/A",
            createdAt: createdAt || new Date().toISOString(),
            tradeName: "White Branding",
            sellerAddress: "Thrissur, Kerala",
            sellerGSTIN: "32BYOPT4425R1ZL", // Replace with actual GSTIN
            partyName: clientDetails.split('\n')[0] || "Client Name",
            partyAddress: clientDetails.split('\n').slice(1, 3).join(', ') || "Client Address",
            partyGSTIN: clientDetails.match(/GSTIN:\s*(\S+)/)?.[1] || "N/A",
            items: items.map(item => ({
              particulars: item.description || 'N/A',
              quantity: item.quantity || 0,
              numberOfDays: item.numberOfDays || 0,
              hsnSac: item.hsnSac || '',
              rate: item.rate || "0",
              amount: ((item.quantity || 0) * (item.rate || 0)).toFixed(2) || "0",
            })),
            totalAmount: parseFloat(total).toFixed(2) || "0",
            gstAmount: gstNumber.toFixed(2), // Pass GST amount
            roundOff: "0.00", // Adjust as needed
            bankName: "Your Bank Name",
            branch: "Your Branch Name",
            ifscCode: "Your IFSC Code",
            accountNo: "1234567890",
            amountInWords: amountInWords, // Convert amount to words
            companyName: "White Branding",
          }}
        />
      </div>
    </div>
  );
};

export default PrintUI;

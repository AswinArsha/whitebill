import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';
import InvoicePrintComponent from "./InvoicePrintComponent";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PrintUI = ({
  items,
  total,
  additionalBills,
  onBillGenerated,
  date,
  clientDetails,
  invoiceNumber,
  createdAt
}) => {
  const standardRef = useRef();
  const [finalInvoiceNumber, setFinalInvoiceNumber] = useState(invoiceNumber);
  const [finalCreatedAt, setFinalCreatedAt] = useState(createdAt);

  // Get global values from the first item
  const globalRate = items?.[0]?.rate || '';
  const globalPer = items?.[0]?.per || 'NOS';
  const globalAmount = items?.[0]?.amount || '';

  const handleDownload = async () => {
    // Optionally generate bill details before download
    if (onBillGenerated) {
      const generatedBill = await onBillGenerated();
      if (generatedBill && generatedBill.invoice_number) {
        setFinalInvoiceNumber(generatedBill.invoice_number);
        setFinalCreatedAt(generatedBill.created_at);
      }
    }

    if (standardRef.current) {
      const canvas = await html2canvas(standardRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = canvas.height * pdfWidth / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${finalInvoiceNumber || 'unknown'}.pdf`);
    }
  };

  return (
    <div>
      <Button 
        onClick={handleDownload} 
        className="mt-4 w-full text-white flex items-center space-x-2 rounded-md py-2 transition-colors"
      >
        <Printer className="h-5 w-5 text-white" />
        <span>Download Invoice</span>
      </Button>

      <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
        <InvoicePrintComponent
          ref={standardRef}
          items={items}
          total={total}
          additionalBills={additionalBills}
          date={date}
          clientDetails={clientDetails}
          invoiceNumber={finalInvoiceNumber}
          createdAt={finalCreatedAt}
          globalRate={globalRate}
          globalPer={globalPer}
          globalAmount={globalAmount}
        />
      </div>
    </div>
  );
};

export default PrintUI;
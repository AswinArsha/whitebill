import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toWords } from "number-to-words";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const GSTBill = () => {
  const [invoiceData, setInvoiceData] = useState({
    invoiceNo: "2024-25/002",
    date: "",
    buyerGST: "",
    buyerAddress: "",
    buyerPhone: "",
    rate: "",
    per: "NOS",
    amount: ""
  });

  const items = [
    { description: 'Reels', hsn: '998397', quantity: 30.00 },
    { description: 'Posters', hsn: '998397', quantity: 30.00 },
    { description: 'Story', hsn: '998397', quantity: 30.00 },
    { description: 'Engagement', hsn: '998397', quantity: 30.00 }
  ];

  // Calculate taxes automatically based on amount
  const calculateTaxes = () => {
    const amount = parseFloat(invoiceData.amount) || 0;
    const cgst = (amount * 0.09); // 9% CGST
    const sgst = (amount * 0.09); // 9% SGST
    return {
      cgst,
      sgst,
      total: amount + cgst + sgst
    };
  };

  const taxes = calculateTaxes();

  const formatIndianNumber = (num) => {
    if (!num) return "0.00";
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const downloadPDF = async () => {
    const element = document.getElementById('invoice-content');
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('gst-invoice.pdf');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div id="invoice-content" className="bg-white border border-black text-xs">
        {/* Header */}
        <div className="text-center border-b border-black p-2">
          <h1 className="text-xl font-bold">TAX INVOICE</h1>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-2">
            <div className="grid grid-cols-2 gap-1">
              <div className="font-bold">Invoice No.</div>
              <Input 
                value={invoiceData.invoiceNo}
                onChange={(e) => setInvoiceData({...invoiceData, invoiceNo: e.target.value})}
                className="h-6 text-xs"
              />
            </div>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-2 gap-1">
              <div className="font-bold">Dated</div>
              <Input 
                type="date" 
                value={invoiceData.date}
                onChange={(e) => setInvoiceData({...invoiceData, date: e.target.value})}
                className="h-6 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Seller Buyer Details */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-2">
            <div className="font-bold border-b border-black pb-1">Seller</div>
            <div>
              <p className="font-bold">WHITE BRANDING</p>
              <p>51/590-2A, White branding ,Nethaji road, Behind</p>
              <p>Nethaji Ground,West Fort, Thrissur, Kerala,</p>
              <p>GSTIN/UIN: 32ABMCS8661D1Z6</p>
              <p>State Name : Kerala, Code : 32</p>
              <p>Phone No: 8606378902</p>
            </div>
          </div>
          <div className="p-2">
            <div className="font-bold border-b border-black pb-1">Buyer</div>
            <div className="space-y-2">
              <Textarea
                placeholder="Enter buyer address"
                value={invoiceData.buyerAddress}
                onChange={(e) => setInvoiceData({...invoiceData, buyerAddress: e.target.value})}
                className="min-h-[100px] text-xs"
              />
              <Input
                placeholder="GSTIN/UIN"
                value={invoiceData.buyerGST}
                onChange={(e) => setInvoiceData({...invoiceData, buyerGST: e.target.value})}
                className="h-6 text-xs"
              />
              <Input
                placeholder="Phone No:"
                value={invoiceData.buyerPhone}
                onChange={(e) => setInvoiceData({...invoiceData, buyerPhone: e.target.value})}
                className="h-6 text-xs"
              />
              <p>State Name : Kerala, Code : 32</p>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-8 border-b border-black font-bold">
          <div className="border-r border-black p-1">Sl No.</div>
          <div className="border-r border-black p-1 col-span-2">Description of Goods</div>
          <div className="border-r border-black p-1">HSN/SAC</div>
          <div className="border-r border-black p-1">Quantity</div>
          <div className="border-r border-black p-1">Rate</div>
          <div className="border-r border-black p-1">per</div>
          <div className="p-1">Amount</div>
        </div>

        {/* Table Body */}
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-8 border-b border-black">
            <div className="border-r border-black p-1">{index + 1}</div>
            <div className="border-r border-black p-1 col-span-2">{item.description}</div>
            <div className="border-r border-black p-1">{item.hsn}</div>
            <div className="border-r border-black p-1">{item.quantity}</div>
            <div className="border-r border-black p-1">
              {index === 0 && (
                <Input
                  type="number"
                  value={invoiceData.rate}
                  onChange={(e) => setInvoiceData({...invoiceData, rate: e.target.value})}
                  className="h-6 text-xs"
                />
              )}
            </div>
            <div className="border-r border-black p-1">
              {index === 0 && (
                <Input
                  value={invoiceData.per}
                  onChange={(e) => setInvoiceData({...invoiceData, per: e.target.value})}
                  className="h-6 text-xs"
                />
              )}
            </div>
            <div className="p-1">
              {index === 0 && (
                <Input
                  type="number"
                  value={invoiceData.amount}
                  onChange={(e) => setInvoiceData({...invoiceData, amount: e.target.value})}
                  className="h-6 text-xs text-right"
                />
              )}
            </div>
          </div>
        ))}

        {/* Tax Details */}
        <div className="border-b border-black">
          <div className="grid grid-cols-8">
            <div className="col-span-7 text-right border-r border-black p-1">OUTPUT CGST</div>
            <div className="p-1 text-right">{formatIndianNumber(taxes.cgst)}</div>
          </div>
          <div className="grid grid-cols-8">
            <div className="col-span-7 text-right border-r border-black p-1">OUTPUT SGST</div>
            <div className="p-1 text-right">{formatIndianNumber(taxes.sgst)}</div>
          </div>
          <div className="grid grid-cols-8 font-bold">
            <div className="col-span-7 text-right border-r border-black p-1">Total</div>
            <div className="p-1 text-right">₹ {formatIndianNumber(taxes.total)}</div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="border-b border-black p-2">
          <div className="font-bold">Amount Chargeable (in words)</div>
          <div>INR {toWords(Math.round(taxes.total))} Only</div>
        </div>

        {/* Tax Summary Table */}
        <div className="border-b border-black">
          <div className="grid grid-cols-12 border-b border-black font-bold">
            <div className="border-r border-black p-1 col-span-2">HSN/SAC</div>
            <div className="border-r border-black p-1 col-span-2">Taxable Value</div>
            <div className="border-r border-black p-1 col-span-3">Central Tax</div>
            <div className="border-r border-black p-1 col-span-3">State Tax</div>
            <div className="col-span-2 p-1">Total Tax Amount</div>
          </div>
          
          <div className="grid grid-cols-12">
            <div className="border-r border-black p-1 col-span-2">998397</div>
            <div className="border-r border-black p-1 col-span-2 text-right">
              {formatIndianNumber(parseFloat(invoiceData.amount))}
            </div>
            <div className="border-r border-black p-1 col-span-3">
              <div className="grid grid-cols-2">
                <div>Rate</div>
                <div className="text-right">9.0%</div>
                <div>Amount</div>
                <div className="text-right">{formatIndianNumber(taxes.cgst)}</div>
              </div>
            </div>
            <div className="border-r border-black p-1 col-span-3">
              <div className="grid grid-cols-2">
                <div>Rate</div>
                <div className="text-right">9.0%</div>
                <div>Amount</div>
                <div className="text-right">{formatIndianNumber(taxes.sgst)}</div>
              </div>
            </div>
            <div className="col-span-2 p-1 text-right">
              {formatIndianNumber(taxes.cgst + taxes.sgst)}
            </div>
          </div>

          <div className="grid grid-cols-12 border-t border-black">
            <div className="border-r border-black p-1 col-span-2 font-bold">Total</div>
            <div className="border-r border-black p-1 col-span-2 text-right">
              {formatIndianNumber(parseFloat(invoiceData.amount))}
            </div>
            <div className="border-r border-black p-1 col-span-3 text-right">
              {formatIndianNumber(taxes.cgst)}
            </div>
            <div className="border-r border-black p-1 col-span-3 text-right">
              {formatIndianNumber(taxes.sgst)}
            </div>
            <div className="col-span-2 p-1 text-right">
              {formatIndianNumber(taxes.cgst + taxes.sgst)}
            </div>
          </div>
        </div>

        {/* Tax Amount in Words */}
        <div className="border-b border-black p-2">
          <div className="font-bold">Tax amount (in Words):</div>
          <div>INR {toWords(Math.round(taxes.cgst + taxes.sgst))} Only</div>
        </div>

        {/* Footer Section */}
        <div className="grid grid-cols-2">
          <div className="border-r border-black p-2">
            <div className="font-bold mb-1">Declaration</div>
            <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
          </div>
          <div className="p-2">
            <div className="font-bold mb-1">Company's Bank Details</div>
            <p>Bank Name : UNION BANK OF INDIA</p>
            <p>A/c No. :117511010000077</p>
            <p>Branch & IFS Code: THRISSUR & UBIN0811751</p>
            <div className="mt-4 text-right">
              <p>for WHITE BRANDING</p>
              <p className="mt-8">Authorised Signatory</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center p-2 border-t border-black">
          <p>This is a Computer Generated Invoice</p>
        </div>

        {/* E. & O.E */}
        <div className="text-right p-2">
          <p>E. & O.E</p>
        </div>
      </div>

      {/* Download Button */}
      <div className="mt-4 text-center">
        <Button 
          onClick={downloadPDF} 
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Download Invoice
        </Button>
      </div>
    </div>
  );
};

export default GSTBill;
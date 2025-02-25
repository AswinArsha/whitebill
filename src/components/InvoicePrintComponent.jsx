import React from 'react';
import Logo from "@/assets/logo1.png";
import QRCode from "react-qr-code";

const InvoicePrintComponent = React.forwardRef(({
  items,
  total,
  additionalBills,
  date,
  clientDetails,
  invoiceNumber,
  globalRate,
  globalPer,
  globalAmount,
}, ref) => {
  const rowCount = items.length;
  const centerRow = Math.ceil(rowCount / 2) - 1;

  const handleQRClick = () => {
    const upiUrl = `upi://pay?pa=smijopulikkottil-1@okaxis&pn=WHITE%20BRANDING&am=${total}&cu=INR`;
    window.location.href = upiUrl;
  };

  const formatClientDetails = (details) => {
    if (!details) return [];
    return details.split('\n').filter(line => line.trim() !== '');
  };

  const clientLines = formatClientDetails(clientDetails);
  const containerClasses = `col-span-3 bg-white border border-gray-200 rounded-lg ${additionalBills?.length > 0 ? 'divide-y divide-gray-100' : ''}`;

  return (
    <div ref={ref} className="max-w-4xl mx-auto p-8 bg-white">
      {/* Header Section */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
      <div className="w-1/3">
        <img 
          src={Logo} 
          alt="Company Logo" 
          className="w-full max-w-[240px]"
        />
      </div>

      <div className="text-right">
        <h1 className="text-5xl font-bold text-gray-800 tracking-tight mb-4">
          INVOICE
        </h1>
        <div className="space-y-2">
          <div className="flex justify-end items-center gap-2">
            <span className="text-gray-600">Invoice No:</span>
            <span className="font-semibold text-gray-800 text-lg">
              {invoiceNumber || "N/A"}
            </span>
          </div>
          <div className="flex justify-end items-center gap-2">
            <span className="text-gray-600">Date:</span>
            <span className="font-semibold text-gray-800 text-lg">
              {date || "Date Not Specified"}
            </span>
          </div>
        </div>
      </div>
    </div>

      {/* Billing Details Section */}
      <div className="flex justify-between mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="w-1/2 pr-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3 uppercase tracking-wide">
          Invoice To:
        </h2>
        <div className="text-lg space-y-2">
          {clientLines.length > 0 ? (
            clientLines.map((line, index) => (
              <p key={index} className={index === 0 ? "font-semibold text-gray-800" : "text-gray-600"}>
                {line}
              </p>
            ))
          ) : (
            <p className="text-gray-500 italic">Client details not provided</p>
          )}
        </div>
      </div>
      
      <div className="w-1/2 pl-4 text-right border-l border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-3 uppercase tracking-wide">
          Pay To:
        </h2>
        <div className="text-lg space-y-2">
          <p className="font-semibold text-gray-800">WHITE BRANDING</p>
          <p className="text-gray-600">Nethaji Ground, West Fort,</p>
          <p className="text-gray-600">Thrissur, Kerala</p>
          <p className="text-gray-600">Phone No: 8606378902</p>
        </div>
      </div>
    </div>

      {/*  Items Table */}
      <div className="mb-10 overflow-x-auto">
  <table className="w-full">
  <thead>
      <tr className="border-y-2 border-gray-300 bg-gray-100 h-14 items-center">
        <th className="text-left py-4 px-4 text-black font-medium items-center">Description of Goods</th>
        <th className="text-center py-4 px-4 text-black font-medium items-center">Quantity</th>
        <th className="text-center py-4 px-4 text-black font-medium items-center">Days</th>
        <th className="text-center py-4 px-4 text-black font-medium items-center">Rate</th>
        <th className="text-center py-4 px-4 text-black font-medium items-center">Per</th>
        <th className="text-right py-4 px-4 text-black font-medium items-center">Amount</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item, index) => (
        <tr key={index} className="border-b border-gray-200">
          <td className="py-4 px-4 text-gray-600">{item.description || " "}</td>
          <td className="text-center py-4 px-4 text-gray-600">{item.quantity || " "}</td>
          <td className="text-center py-4 px-4 text-gray-600">{item.numberOfDays || " "}</td>
          {index === centerRow ? (
            <>
              <td className="text-center py-4 px-4 text-gray-600">₹{globalRate}</td>
              <td className="text-center py-4 px-4 text-gray-600">{globalPer}</td>
              <td className="text-right py-4 px-4 text-gray-600">₹{globalAmount}</td>
            </>
          ) : (
            <>
              <td className="text-center py-4 px-4 text-gray-600"> </td>
              <td className="text-center py-4 px-4 text-gray-600"> </td>
              <td className="text-right py-4 px-4 text-gray-600"> </td>
            </>
          )}
        </tr>
      ))}
    </tbody>
  </table>
</div>
      {/* Improved Bottom Section */}
      <div className="grid grid-cols-4 gap-24">
      {/* QR Code Section - Takes 1 column */}
      <div className="mt-10">
        <p className="text-lg text-center font-bold text-gray-700 mb-3">Scan to Pay</p>
        <div 
          onClick={handleQRClick} 
          className="cursor-pointer transform hover:scale-105 transition-transform"
          role="button"
          tabIndex={0}
          aria-label="Scan QR code to pay"
        >
          <QRCode 
            value={`upi://pay?pa=smijopulikkottil-1@okaxis&pn=WHITE%20BRANDING&am=${total}&cu=INR`} 
            size={160}
          />
        </div>
      </div>

      {/* Totals Section - Takes 3 columns */}
      <div className="col-span-3">
      {additionalBills?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-5">Additional Charges</h3>
          <div className="space-y-4">
            {additionalBills.map((bill, index) => (
              <div key={index} className="flex justify-between items-center text-lg">
                <span className="text-gray-700">{bill.name}</span>
                <span className="font-medium text-gray-900">₹{parseFloat(bill.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Separate Total Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-4">
        <div className="flex justify-between -mt-4">
          <span className="text-xl font-bold text-gray-800">Total</span>
          <span className="text-2xl font-bold text-gray-900">₹{total}</span>
        </div>
      </div>
    </div>
    </div>
    
    </div>
  );
});

export default InvoicePrintComponent;
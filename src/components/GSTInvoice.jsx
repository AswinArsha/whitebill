// components/GSTInvoice.jsx

import React from 'react';
import { toWords } from 'number-to-words';
import { format, isValid } from 'date-fns';

// Utility function to capitalize the first letter of each word
const capitalizeWords = (text) => {
  return text.replace(/\b\w/g, char => char.toUpperCase());
};

const GSTInvoice = React.forwardRef(({ invoiceData }, ref) => {
  const {
    invoiceNo = 'N/A',
    createdAt, // Only use createdAt for date display
    tradeName = '',
    sellerAddress = '',
    sellerGSTIN = '',
    partyName = '',
    partyAddress = '',
    partyGSTIN = '',
    items = [],
    totalAmount = 0,
    gstAmount = 0,
    roundOff = '0.00',
    amountInWords = '',
    companyName = '',
  } = invoiceData;

  // Convert totalAmount to words and capitalize each word
  const amountWords = capitalizeWords(amountInWords || `${toWords(Math.floor(totalAmount))} Rupees`);

  // Safely format createdAt date
  const formattedCreatedAt = createdAt && isValid(new Date(createdAt))
    ? format(new Date(createdAt), "dd/MM/yyyy")
    : 'N/A';

  // Define descriptions that use numberOfDays for QTY
  const descriptionsUsingNumberOfDays = ['Total Engagements', 'Story'];

  return (
    <div ref={ref} className="p-8 max-w-4xl mx-auto bg-white">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-7">
        <p className='text-sm'>Invoice No: {invoiceNo}</p>
        <p className='text-sm'>Date: {formattedCreatedAt}</p>
      </div>

      {/* Seller Information */}
      <div className="mb-8 text-center">
        <p className='text-sm'>Trade Name: {tradeName}</p>
        <p className='text-sm'>Address: {sellerAddress}</p>
        <p className='text-sm mb-3'>GSTIN: {sellerGSTIN || 'N/A'}</p>
        <h2 className="text-lg font-semibold uppercase">invoice</h2>
      </div>

      {/* Buyer Information */}
      <div className="mb-10">
        <p className='text-sm'>Party: {partyName}</p>
        <p className='text-sm'>Address: {partyAddress}</p>
        <p className='text-sm'>GSTIN: {partyGSTIN || 'N/A'}</p>
      </div>

      {/* Itemized Table Section */}
      <table className="w-full border-collapse border border-gray-400 mb-8">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2 text-sm">Sl No.</th>
            <th className="border border-gray-300 p-2 text-sm">Particulars</th>
            <th className="border border-gray-300 p-2 text-sm">QTY</th>
            <th className="border border-gray-300 p-2 text-sm">HSN/SAC</th>
            <th className="border border-gray-300 p-2 text-sm">Rate</th>
            <th className="border border-gray-300 p-2 text-sm">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            // Determine QTY based on description
            const qty = descriptionsUsingNumberOfDays.includes(item.particulars)
              ? item.numberOfDays || '0'
              : item.quantity || '0';
            return (
              <tr key={index}>
                <td className="border border-gray-300 p-2 text-center text-sm">{index + 1}</td>
                <td className="border border-gray-300 p-2 text-sm">{item.particulars || 'N/A'}</td>
                <td className="border border-gray-300 p-2 text-center text-sm">{qty}</td>
                <td className="border border-gray-300 p-2 text-center text-sm">{item.hsnSac || '0'}</td>
                <td className="border border-gray-300 p-2 text-right text-sm">{item.rate || '0'}</td>
                <td className="border border-gray-300 p-2 text-right text-sm">{item.amount || '0'}</td>
              </tr>
            );
          })}
          {/* GST (6%) Row */}
          <tr>
            <td colSpan="5" className="border border-gray-300 p-2 text-right text-md font-semibold">GST (6%)</td>
            <td className="border border-gray-300 p-2 text-md text-right">{gstAmount}</td>
          </tr>
          {/* Round Off Row */}
          <tr>
            <td colSpan="5" className="border border-gray-300 p-2 text-right text-md font-semibold">Round Off</td>
            <td className="border border-gray-300 p-2 text-md text-right">{roundOff}</td>
          </tr>
          {/* Total Row */}
          <tr>
            <td colSpan="5" className="border border-gray-300 p-2 text-md text-right font-semibold">Total</td>
            <td className="border border-gray-300 p-2 font-semibold text-md text-right">{totalAmount}</td>
          </tr>
        </tbody>
      </table>

      {/* Amount in Words */}
      <p className="mb-6">Amount in words: {amountWords}</p>

      {/* Footer */}
      <div className="text-center mt-16">
        <p className="mt-4 font-bold text-sm">For {companyName}</p>
        <p className="mt-2 text-sm">Authorized Signatory</p>
      </div>
    </div>
  );
});

export default GSTInvoice;

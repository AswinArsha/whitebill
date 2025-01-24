import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '../supabase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const GSTBill = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [taxableValue, setTaxableValue] = useState("0.00");
  const [customTaxes, setCustomTaxes] = useState({ cgst: null, sgst: null });
  const [loadingInvoiceNo, setLoadingInvoiceNo] = useState(true); // New state for loading
  const [invoiceError, setInvoiceError] = useState(null); // New state for errors

  const [invoiceData, setInvoiceData] = useState({
    invoiceNo: "", // Initialize as empty
    date: new Date().toISOString().split('T')[0], // Set default date to today
    buyerGST: "",
    buyerAddress: "",
    buyerPhone: "",
    items: [
      { description: 'Reels', hsn: '998397', quantity: "", rate: "", per: "", amount: "" },
      { description: 'Posters', hsn: '998397', quantity: "", rate: "", per: "NOS", amount: "" },
      { description: 'Story', hsn: '998397', quantity: "", rate: "", per: "", amount: "" },
      { description: 'Engagement', hsn: '998397', quantity: "", rate: "", per: "", amount: "" }
    ]
  });

  useEffect(() => {
    fetchCompanies();
    generateInvoiceNo(); // Generate Invoice No on mount
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('company');
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const formatAddress = (location) => {
    if (!location) return [];
    
    // Split the address by commas
    const parts = location.split(',').map(part => part.trim());
    
    // Group parts into lines (approximately 40-45 characters per line)
    const lines = [];
    let currentLine = '';
    
    parts.forEach(part => {
      if (currentLine.length + part.length > 45) {
        lines.push(currentLine.trim());
        currentLine = part;
      } else {
        currentLine = currentLine ? `${currentLine}, ${part}` : part;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine.trim());
    }
    
    return lines;
  };

  const handleCompanySelect = async (companyId) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      setSelectedCompany(data);
      
      setInvoiceData(prev => ({
        ...prev,
        buyerGST: data.gstin || '',
        buyerAddress: `${data.company || ''}\n${data.location || ''}`,
        buyerPhone: data.phone || ''
      }));
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  const calculateTaxes = (amount) => {
    const baseAmount = parseFloat(amount) || 0;
    const cgst = baseAmount * 0.09;
    const sgst = baseAmount * 0.09;
    return {
      cgst,
      sgst,
      total: baseAmount + cgst + sgst
    };
  };

  const formatIndianNumber = (num) => {
    if (!num) return "0.00";
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const replaceFormFieldsWithText = (container) => {
    const fields = container.querySelectorAll('input, textarea');
    const fieldData = [];
    
    fields.forEach(field => {
      fieldData.push({
        element: field,
        parent: field.parentNode,
        originalHTML: field.outerHTML,
        value: field.value,
      });
  
      // Create a span element with the input's value
      const textNode = document.createElement('span');
      textNode.style.whiteSpace = 'pre-wrap';
      textNode.textContent = field.value;
  
      // Replace the input/textarea with the span
      field.parentNode.replaceChild(textNode, field);
    });
  
    return fieldData;
  };
  
  const restoreFormFields = (fieldData) => {
    fieldData.forEach(({ element, parent, originalHTML }) => {
      // Re-create the original input/textarea element
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = originalHTML;
      const originalElement = tempContainer.firstChild;
  
      // Replace the span with the original input/textarea
      parent.replaceChild(originalElement, parent.querySelector('span'));
    });
  };

  function numberToIndianCurrencyWords(num) {
    const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  
    if (num === 0) return "zero";
  
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = Math.floor(num / 100);
    num %= 100;
    let words = "";
  
    const twoDigitWords = (n) => {
      if (n < 10) return ones[n];
      else if (n >= 10 && n < 20) return teens[n - 10];
      else {
        const tenPart = Math.floor(n / 10);
        const onePart = n % 10;
        return tens[tenPart] + (onePart ? " " + ones[onePart] : "");
      }
    };
  
    if (crore) words += twoDigitWords(crore) + " crore ";
    if (lakh) words += twoDigitWords(lakh) + " lakh ";
    if (thousand) words += twoDigitWords(thousand) + " thousand ";
    if (hundred) words += ones[hundred] + " hundred ";
    if (num) {
      if (words) words += "and ";
      words += twoDigitWords(num);
    }
  
    return words.trim();
  }

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...invoiceData.items];
    updatedItems[index][field] = value;
    
    // If changing rate or quantity, recalculate amount
    if (field === 'rate' || field === 'quantity') {
      const rate = parseFloat(updatedItems[index].rate) || 0;
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      updatedItems[index].amount = (rate * quantity).toFixed(2);
    }
    
    setInvoiceData({...invoiceData, items: updatedItems});
  };

  const handleTaxChange = (field, value) => {
    setCustomTaxes(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
    
    // Optionally, you can recalculate the total here if needed
  };

  const getTotalAmount = () => {
    return invoiceData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);
  };

  const totalAmount = getTotalAmount();
  const taxes = calculateTaxes(totalAmount);

  const generateInvoiceNo = async () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Months are 0-based

    // Determine the financial year (April to March)
    let financialYearStart = currentYear;
    let financialYearEnd = currentYear + 1;
    if (currentMonth < 4) { // Before April, belongs to the previous financial year
      financialYearStart = currentYear - 1;
      financialYearEnd = currentYear;
    }

    const yearSuffix = `${financialYearStart}-${String(financialYearEnd).slice(-2)}`;

    try {
      setLoadingInvoiceNo(true);
      setInvoiceError(null);

      // Fetch the count of invoices for the current financial year
      const { count, error } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .ilike('invoice_no', `${financialYearStart}-%`);

      if (error) throw error;

      const invoiceCount = count || 0;

      // Pad the invoice number to ensure it is three digits
      const newInvoiceNumber = `${yearSuffix}/${String(invoiceCount + 1).padStart(3, '0')}`;

      setInvoiceData((prev) => ({
        ...prev,
        invoiceNo: newInvoiceNumber,
      }));
    } catch (error) {
      console.error('Error generating invoice number:', error);
      setInvoiceError('Failed to generate Invoice Number. Please try again.');
    } finally {
      setLoadingInvoiceNo(false);
    }
  };

  const downloadPDF = async () => {
    if (loadingInvoiceNo) {
      alert('Invoice Number is still being generated. Please wait.');
      return;
    }

    if (invoiceError) {
      alert('Cannot download invoice due to an error. Please resolve it first.');
      return;
    }

    try {
      // Ensure that Invoice No is already generated
      if (!invoiceData.invoiceNo) {
        throw new Error('Invoice Number is not generated.');
      }

      // Prepare data to insert
      const invoiceToInsert = {
        invoice_no: invoiceData.invoiceNo,
        date: invoiceData.date,
        buyer_id: selectedCompany.id,
        buyer_gst: invoiceData.buyerGST,
        buyer_address: invoiceData.buyerAddress,
        buyer_phone: invoiceData.buyerPhone,
        items: invoiceData.items,
        taxable_value: parseFloat(totalAmount.toFixed(2)),
        cgst: parseFloat(taxes.cgst.toFixed(2)),
        sgst: parseFloat(taxes.sgst.toFixed(2)),
        total: parseFloat(taxes.total.toFixed(2))
      };

      // Insert the invoice into Supabase
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceToInsert]);

      if (error) throw error;

      console.log('Invoice inserted:', data);

      // Proceed to generate the PDF
      const container = document.getElementById('invoice-content');

      // Replace form fields with static text and store original data
      const fieldData = replaceFormFieldsWithText(container);

      // Generate the canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: true,
      });

      // Restore the original form fields
      restoreFormFields(fieldData);

      // Create the PDF from the canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const reducedWidth = 190;
      const reducedHeight = 287;
      const xOffset = (210 - reducedWidth) / 2;
      const yOffset = (297 - reducedHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, reducedWidth, reducedHeight, '', 'FAST');
      pdf.save(`gst-invoice-${invoiceData.invoiceNo}.pdf`);

      // Generate the next invoice number
      await generateInvoiceNo();

      // Optionally, reset other invoice fields here if needed
      // For example:
      // setInvoiceData({
      //   ...invoiceData,
      //   date: new Date().toISOString().split('T')[0],
      //   buyerGST: "",
      //   buyerAddress: "",
      //   buyerPhone: "",
      //   items: [
      //     { description: 'Reels', hsn: '998397', quantity: "", rate: "", per: "", amount: "" },
      //     { description: 'Posters', hsn: '998397', quantity: "", rate: "", per: "NOS", amount: "" },
      //     { description: 'Story', hsn: '998397', quantity: "", rate: "", per: "", amount: "" },
      //     { description: 'Engagement', hsn: '998397', quantity: "", rate: "", per: "", amount: "" }
      //   ]
      // });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Company Selection and Invoice No */}
      <div className="flex justify-between items-start">
        <div className="mb-6 w-[50%]">
          <label className="block text-sm text-gray-700 mb-1">
            Select Company
          </label>
          <Select onValueChange={handleCompanySelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem 
                  key={company.id} 
                  value={company.id}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <span>{company.company}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={downloadPDF} 
          className="mt-6 px-4 py-2 rounded"
          disabled={loadingInvoiceNo || invoiceError || !invoiceData.invoiceNo}
        >
          {loadingInvoiceNo ? 'Generating Invoice No...' : 'Download Invoice'}
        </Button>
      </div>

      {/* Invoice Content */}
      <div id="invoice-content" className="w-[210mm] h-[297mm] mx-auto relative bg-white" style={{
        fontFamily: 'Times New Roman, serif',
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        <div className="absolute inset-0 border-2 border-black">
          {/* Invoice Header */}
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td colSpan="2" className="text-center font-bold p-3 border-b-2 border-black" 
                    style={{ fontSize: '20px' }}>
                  TAX INVOICE
                </td>
              </tr>

              <tr>
                <td className="w-1/2 p-0 border-r-2 border-b-2 border-black">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="p-2 font-semibold">Invoice No:</td>
                        <td className="">
                          <Input 
                            value={invoiceData.invoiceNo}
                            readOnly
                            className="h-8 text-base p-1 font-medium" 
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td className="w-1/2 p-0 border-b-2 border-black">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="p-2">Dated:</td>
                        <td className="">
                          <Input 
                            type="date" 
                            value={invoiceData.date}
                            onChange={(e) => setInvoiceData({...invoiceData, date: e.target.value})}
                            className="h-6 text-base p-1"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <tr>
                <td className="align-top p-0 border-r-2 border-b-2 border-black">
                  <div className="font-bold border-b-2 border-black px-3 py-2 text-lg">Seller</div>
                  <div className="mt-1 px-2 py-2">
                    <div className="font-bold">WHITE BRANDING</div>
                    <div>51/590-2A, White branding, Nethaji road, Behind</div>
                    <div>Nethaji Ground, West Fort, Thrissur, Kerala,</div>
                    <div>GSTIN/UIN: 32ABMCS8661D1Z6</div>
                    <div>State Name: Kerala, Code: 32</div>
                    <div>Phone No: 8606378902</div>
                  </div>
                </td>
                <td className="align-top p-0 border-b-2 border-black">
                  <div className="font-bold border-b-2 border-black px-3 py-2 text-lg">Buyer</div>
                  <div className="mt-1 px-2 py-2">
                    {selectedCompany ? (
                      <>
                        <div className="font-bold uppercase">{selectedCompany.company}</div>
                        {formatAddress(selectedCompany.location).map((line, index) => (
                          <div key={index} className="font-medium">{line}</div>
                        ))}
                        <div className="font-medium mt-1">GSTIN/UIN: {selectedCompany.gstin || 'N/A'}</div>
                        <div className="font-medium">State Name: Kerala, Code: 32</div>
                        <div className="font-medium">Phone No: {selectedCompany.phone || 'N/A'}</div>
                      </>
                    ) : (
                      <div className="text-gray-500">No company selected.</div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Items Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="font-bold">
                <th className="border-b-2 border-r-2 border-black p-2 text-left w-12">Sl No.</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-left">Description of Goods</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-left w-24">HSN/SAC</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-right w-20">Quantity</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-right w-20">Rate</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-center w-16">Per</th>
                <th className="border-b-2 border-black p-2 text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="text-base">
              {invoiceData.items.map((item, index) => (
                <tr key={index}>
                  <td className="border-r-2 border-black p-2">{index + 1}</td>
                  <td className="border-r-2 border-black p-2">{item.description}</td>
                  <td className="border-r-2 border-black p-2">{item.hsn}</td>
                  <td className="border-r-2 border-black p-2 text-right">
                    <Input
                      type="text"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="h-6 text-base p-1 text-right w-full"
                    />
                  </td>
                  <td className="border-r-2 border-black p-2 text-right">
                    {index === 1 ? (
                      <Input
                        type="text"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className="h-6 text-base p-1 text-right w-full"
                      />
                    ) : (
                      <span>{item.rate}</span>
                    )}
                  </td>
                  <td className="border-r-2 border-black p-2 text-center">
                    {index === 1 ? (
                      <Input
                        value={item.per}
                        onChange={(e) => handleItemChange(index, 'per', e.target.value)}
                        className="h-6 text-base p-1 text-center w-full"
                      />
                    ) : (
                      <span>{item.per}</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {index === 1 ? (
                      <Input
                        type="text"
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                        className="h-6 text-base p-1 text-right w-full"
                      />
                    ) : (
                      <span>{item.amount}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tax Summary Table */}
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr className="border-t-2 border-black">
                <td className="border-r-2 border-black p-2 text-right" colSpan="2">OUTPUT CGST</td>
                <td className="p-2 text-right w-32">{formatIndianNumber(taxes.cgst)}</td>
              </tr>
              <tr>
                <td className="border-r-2 border-black p-2 text-right" colSpan="2">OUTPUT SGST</td>
                <td className="p-2 text-right">{formatIndianNumber(taxes.sgst)}</td>
              </tr>
              <tr>
                <td className="border-r-2 border-black p-2 text-right" colSpan="2">ROUND OFF</td>
                <td className="p-2 text-right">0.00</td>
              </tr>
              <tr>
                <td className="border-r-2 border-black p-2 text-right font-bold" colSpan="2">Total</td>
                <td className="p-2 text-right font-bold">₹ {formatIndianNumber(taxes.total)}</td>
              </tr>
            </tbody>
          </table>

          {/* Amount in Words */}
          <div className="border-t-2 border-b-2 border-black flex justify-between p-2 text-base">
            <div className="flex space-x-2">
              <div className="font-bold">Amount Chargeable (in words):</div>
              <div>INR {numberToIndianCurrencyWords(Math.round(taxes.total))} Only</div>
            </div>
            <div>
              E. & O.E
            </div>
          </div>
             
          {/* Tax Summary Detailed Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-r-2 border-black p-2 text-left w-24">HSN/SAC</th>
                <th className="border-r-2 border-black p-2 text-right">Taxable Value</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-center" colSpan="2">Central Tax</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-center" colSpan="2">State Tax</th>
                <th className="border-black p-2 text-right w-32">Total Tax Amount</th>
              </tr>
              <tr>
                <th className="border-b-2 border-r-2 border-black p-2"></th>
                <th className="border-b-2 border-r-2 border-black p-2"></th>
                <th className="border-b-2 border-r-2 border-black p-2 text-right">Rate</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-right">Amount</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-right">Rate</th>
                <th className="border-b-2 border-r-2 border-black p-2 text-right">Amount</th>
                <th className="border-b-2 border-black p-2"></th>
              </tr>
            </thead>
            <tbody className="text-base">
              <tr>
                <td className="border-r-2 border-black p-2">998397</td>
                <td className="border-r-2 border-black p-2 text-right">
                  <Input
                    type="text"
                    value={totalAmount.toFixed(2)}
                    onChange={(e) => setTaxableValue(e.target.value)}
                    className="h-6 text-base p-1 text-right w-full"
                    readOnly
                  />
                </td>
                <td className="border-r-2 border-black p-2 text-right">9.0%</td>
                <td className="border-r-2 border-black p-2 text-right">
                  <Input
                    type="text"
                    value={taxes.cgst.toFixed(2)}
                    onChange={(e) => handleTaxChange('cgst', e.target.value)}
                    className="h-6 text-base p-1 text-right w-full"
                  />
                </td>
                <td className="border-r-2 border-black p-2 text-right">9.0%</td>
                <td className="border-r-2 border-black p-2 text-right">
                  <Input
                    type="text"
                    value={taxes.sgst.toFixed(2)}
                    onChange={(e) => handleTaxChange('sgst', e.target.value)}
                    className="h-6 text-base p-1 text-right w-full"
                  />
                </td>
                <td className="p-2 text-right">{formatIndianNumber(taxes.cgst + taxes.sgst)}</td>
              </tr>
              <tr className="border-t-2 border-black">
                <td className="border-r-2 border-black p-2 font-bold">Total</td>
                <td className="border-r-2 border-black p-2 text-right font-bold">{formatIndianNumber(totalAmount)}</td>
                <td className="border-r-2 border-black p-2 text-right font-bold"></td>
                <td className="border-r-2 border-black p-2 text-right font-bold">{formatIndianNumber(taxes.cgst)}</td>
                <td className="border-r-2 border-black p-2 text-right font-bold"></td>
                <td className="border-r-2 border-black p-2 text-right font-bold">{formatIndianNumber(taxes.sgst)}</td>
                <td className="p-2 text-right font-bold">{formatIndianNumber(taxes.cgst + taxes.sgst)}</td>
              </tr>
            </tbody>
          </table>

          {/* Tax Amount in Words */}
          <div className="border-t-2 border-b-2 flex space-x-2 border-black p-2 text-base">
            <div className="font-bold">Tax Amount (in Words):</div>
            <div>INR {numberToIndianCurrencyWords(Math.round(taxes.cgst + taxes.sgst))} Only</div>
          </div>

          {/* Footer Section */}
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border-r-2 border-black p-2 align-top w-1/2">
                  <div className="font-bold mb-1">Declaration</div>
                  <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                </td>
                <td className="p-2 align-top w-1/2">
                  <div className="font-bold mb-1">Company's Bank Details</div>
                  <p>Bank Name: UNION BANK OF INDIA</p>
                  <p>A/c No.: 117511010000077</p>
                  <p>Branch & IFS Code: THRISSUR & UBIN0811751</p>
                  <div className="mt-4 text-right">
                    <p>for WHITE BRANDING</p>
                    <div className="mt-8">Authorised Signatory</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bottom Footer Section */}
          <div className="border-t-2 border-black flex items-center justify-center">
            <span className="-mt-2">
              This is a Computer Generated Invoice
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GSTBill;

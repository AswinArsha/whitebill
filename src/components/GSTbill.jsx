import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "../supabase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast, Toaster } from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const GSTBill = () => {
  // General invoice form state
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [taxableValue, setTaxableValue] = useState("0.00");
  const [customTaxes, setCustomTaxes] = useState({ cgst: null, sgst: null });
  const [loadingInvoiceNo, setLoadingInvoiceNo] = useState(true);
  const [invoiceError, setInvoiceError] = useState(null);

  const [invoiceData, setInvoiceData] = useState({
    invoiceNo: "",
    date: new Date().toISOString().split("T")[0],
    buyerGST: "",
    buyerAddress: "",
    buyerPhone: "",
    items: [
      { description: "Reels", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
      { description: "Posters", hsn: "998397", quantity: "", rate: "", per: "NOS", amount: "" },
      { description: "Story", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
      { description: "Engagement", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
    ],
  });

  // New state variables for Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchCompanies();
    if (!isEditMode) {
      generateInvoiceNo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  // Fetch companies
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("company");
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast.error("Failed to load companies.");
    }
  };

  // Format a location string into multiple lines
  const formatAddress = (location) => {
    if (!location) return [];
    const parts = location.split(",").map((part) => part.trim());
    const lines = [];
    let currentLine = "";
    parts.forEach((part) => {
      if (currentLine.length + part.length > 45) {
        lines.push(currentLine.trim());
        currentLine = part;
      } else {
        currentLine = currentLine ? `${currentLine}, ${part}` : part;
      }
    });
    if (currentLine) lines.push(currentLine.trim());
    return lines;
  };

  // When a company is selected, fetch its details and update invoiceData
  const handleCompanySelect = async (companyId) => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      setSelectedCompany(data);
      setInvoiceData((prev) => ({
        ...prev,
        buyerGST: data.gstin || "",
        buyerAddress: `${data.company || ""}\n${data.location || ""}`,
        buyerPhone: data.phone || "",
      }));
    } catch (error) {
      console.error("Error fetching company details:", error);
      toast.error("Failed to load company details.");
    }
  };

  // Calculate taxes (9% each for CGST and SGST)
  const calculateTaxes = (amount) => {
    const baseAmount = parseFloat(amount) || 0;
    const cgst = baseAmount * 0.09;
    const sgst = baseAmount * 0.09;
    return {
      cgst,
      sgst,
      total: baseAmount + cgst + sgst,
    };
  };

  const formatIndianNumber = (num) => {
    if (!num) return "0.00";
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Utility functions to replace input fields with text for PDF generation and restore them later
  const replaceFormFieldsWithText = (container) => {
    const fields = container.querySelectorAll("input, textarea");
    const fieldData = [];
    fields.forEach((field) => {
      fieldData.push({
        element: field,
        parent: field.parentNode,
        originalHTML: field.outerHTML,
        value: field.value,
      });
      const textNode = document.createElement("span");
      textNode.style.whiteSpace = "pre-wrap";
      textNode.textContent = field.value;
      field.parentNode.replaceChild(textNode, field);
    });
    return fieldData;
  };

  const restoreFormFields = (fieldData) => {
    fieldData.forEach(({ element, parent, originalHTML }) => {
      const tempContainer = document.createElement("div");
      tempContainer.innerHTML = originalHTML;
      const originalElement = tempContainer.firstChild;
      parent.replaceChild(originalElement, parent.querySelector("span"));
    });
  };

  // Convert a number to Indian currency words
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

  // Handle item changes in the items array
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...invoiceData.items];
    updatedItems[index][field] = value;
    // Only for index 1, recalculate amount automatically when rate or quantity changes.
    if (index === 1 && (field === "rate" || field === "quantity")) {
      const rate = parseFloat(updatedItems[index].rate) || 0;
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      updatedItems[index].amount = (rate * quantity).toFixed(2);
    }
    // For index 1, if the amount is edited directly, we simply update its value.
    setInvoiceData({ ...invoiceData, items: updatedItems });
  };

  const handleTaxChange = (field, value) => {
    setCustomTaxes((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const getTotalAmount = () => {
    return invoiceData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const totalAmount = getTotalAmount();
  const taxes = calculateTaxes(totalAmount);

  // Generate a new invoice number (only used in Add Mode)
  const generateInvoiceNo = async () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    let financialYearStart = currentYear;
    let financialYearEnd = currentYear + 1;
    if (currentMonth < 4) {
      financialYearStart = currentYear - 1;
      financialYearEnd = currentYear;
    }
    const yearSuffix = `${financialYearStart}-${String(financialYearEnd).slice(-2)}`;
    try {
      setLoadingInvoiceNo(true);
      setInvoiceError(null);
      const { count, error } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .ilike("invoice_no", `${financialYearStart}-%`);
      if (error) throw error;
      const invoiceCount = count || 0;
      const newInvoiceNumber = `${yearSuffix}/${String(invoiceCount + 1).padStart(3, "0")}`;
      setInvoiceData((prev) => ({ ...prev, invoiceNo: newInvoiceNumber }));
    } catch (error) {
      console.error("Error generating invoice number:", error);
      setInvoiceError("Failed to generate Invoice Number. Please try again.");
    } finally {
      setLoadingInvoiceNo(false);
    }
  };

  // In edit mode, fetch existing invoices to populate the select dropdown
  const fetchExistingInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_no")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setExistingInvoices(data || []);
    } catch (error) {
      console.error("Error fetching existing invoices:", error);
      toast.error("Failed to load existing invoices.");
    }
  };

  // When an invoice is selected from the dropdown in edit mode, load its details
  const handleInvoiceSelect = async (invoiceId) => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      setSelectedInvoice(data);
      // Convert the date properly using new Date(...)
      setInvoiceData({
        invoiceNo: data.invoice_no,
        date: new Date(data.date).toISOString().split("T")[0],
        buyerGST: data.buyer_gst || "",
        buyerAddress: data.buyer_address || "",
        buyerPhone: data.buyer_phone || "",
        items: data.items || [
          { description: "Reels", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
          { description: "Posters", hsn: "998397", quantity: "", rate: "", per: "NOS", amount: "" },
          { description: "Story", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
          { description: "Engagement", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
        ],
      });
      if (data.buyer_id) {
        await handleCompanySelect(data.buyer_id);
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error("Failed to load invoice details.");
    }
  };

  // Download PDF: In edit mode, update the invoice; in add mode, insert a new one.
  const downloadPDF = async () => {
    if (loadingInvoiceNo) {
      alert("Invoice Number is still being generated. Please wait.");
      return;
    }
    if (invoiceError) {
      alert("Cannot download invoice due to an error. Please resolve it first.");
      return;
    }
    try {
      if (!invoiceData.invoiceNo) {
        throw new Error("Invoice Number is not generated or selected.");
      }
      const invoiceToUpsert = {
        invoice_no: invoiceData.invoiceNo,
        date: invoiceData.date,
        buyer_id: selectedCompany ? selectedCompany.id : null,
        buyer_gst: invoiceData.buyerGST,
        buyer_address: invoiceData.buyerAddress,
        buyer_phone: invoiceData.buyerPhone,
        items: invoiceData.items,
        taxable_value: parseFloat(totalAmount.toFixed(2)),
        cgst: parseFloat(taxes.cgst.toFixed(2)),
        sgst: parseFloat(taxes.sgst.toFixed(2)),
        total: parseFloat(taxes.total.toFixed(2)),
      };
      if (isEditMode && selectedInvoice) {
        const { data, error } = await supabase
          .from("invoices")
          .update(invoiceToUpsert)
          .eq("id", selectedInvoice.id);
        if (error) throw error;
        console.log("Invoice updated:", data);
        toast.success("Invoice updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("invoices")
          .insert([invoiceToUpsert])
          .single();
        if (error) throw error;
        console.log("Invoice inserted:", data);
        toast.success("Invoice created successfully!");
      }
      const container = document.getElementById("invoice-content");
      const fieldData = replaceFormFieldsWithText(container);
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: true,
      });
      restoreFormFields(fieldData);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const reducedWidth = 190;
      const reducedHeight = 287;
      const xOffset = (210 - reducedWidth) / 2;
      const yOffset = (297 - reducedHeight) / 2;
      pdf.addImage(imgData, "PNG", xOffset, yOffset, reducedWidth, reducedHeight, "", "FAST");
      pdf.save(`gst-invoice-${invoiceData.invoiceNo}.pdf`);
      if (!isEditMode) {
        await generateInvoiceNo();
        setInvoiceData({
          invoiceNo: "",
          date: new Date().toISOString().split("T")[0],
          buyerGST: "",
          buyerAddress: "",
          buyerPhone: "",
          items: [
            { description: "Reels", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
            { description: "Posters", hsn: "998397", quantity: "", rate: "", per: "NOS", amount: "" },
            { description: "Story", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
            { description: "Engagement", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
          ],
        });
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Failed to download invoice. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto ">
      <Toaster position="top-right" reverseOrder={false} />
{/* Edit Mode Toggle */}
<div className="flex  sm:items-center space-x-4 px-4 sm:px-12">
  <h2 className="text-lg sm:text-2xl font-semibold">
    {isEditMode ? "Edit Bill" : "Create Bill"}
  </h2>
  <Switch
  
    checked={isEditMode}
    onCheckedChange={(checked) => {
      if (checked) {
        fetchExistingInvoices();
      } else {
        setSelectedInvoice(null);
        setInvoiceData({
          invoiceNo: "",
          date: new Date().toISOString().split("T")[0],
          buyerGST: "",
          buyerAddress: "",
          buyerPhone: "",
          items: [
            { description: "Reels", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
            { description: "Posters", hsn: "998397", quantity: "", rate: "", per: "NOS", amount: "" },
            { description: "Story", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
            { description: "Engagement", hsn: "998397", quantity: "", rate: "", per: "", amount: "" },
          ],
        });
        setSelectedCompany(null);
      }
      setIsEditMode(checked);
    }}
    
  />
</div>

{/* Header Section: Company selection and Invoice No field */}
<div className="flex flex-col md:flex-row items-stretch gap-4 px-4 sm:px-12 py-4">
  {/* Company Select */}
  <div className="flex-1">
    <Select onValueChange={handleCompanySelect} value={selectedCompany ? selectedCompany.id : undefined}>
      <SelectTrigger className="w-full text-sm sm:text-base">
        <SelectValue placeholder="Choose a company" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id} className="cursor-pointer hover:bg-gray-100">
            <span>{company.company}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Invoice Select / Input */}
  <div className="flex-1">
    {isEditMode ? (
      <Select onValueChange={async (value) => await handleInvoiceSelect(value)}>
        <SelectTrigger className="w-full text-sm sm:text-base">
          <SelectValue placeholder="Select an invoice" />
        </SelectTrigger>
        <SelectContent>
          {existingInvoices.map((invoice) => (
            <SelectItem key={invoice.id} value={invoice.id} className="cursor-pointer hover:bg-gray-100">
              <span>{invoice.invoice_no}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Input value={invoiceData.invoiceNo} readOnly className="w-full text-sm sm:text-base" />
    )}
    {invoiceError && (
      <p className="text-red-500 text-xs sm:text-sm mt-1">{invoiceError}</p>
    )}
  </div>

  {/* Download Invoice Button */}
  <div className="flex justify-center sm:justify-start items-center">
    <Button
      onClick={downloadPDF}
      className="px-4 sm:px-6 py-2 rounded-md text-sm sm:text-base"
      disabled={loadingInvoiceNo || invoiceError || !invoiceData.invoiceNo}
    >
      {loadingInvoiceNo ? "Generating Invoice No..." : "Download Invoice"}
    </Button>
  </div>
</div>

  
      <div
        id="invoice-content"
        className="w-[210mm] h-[270mm] mx-auto relative bg-white"
        style={{
          fontFamily: "Times New Roman, serif",
          fontSize: "14px",
          lineHeight: "1.4",
        }}
      >
        <div className="absolute inset-0 border-2 border-x-0 border-b-0 border-black">
          {/* Invoice Header */}
          <table className="w-full border-x-2 border-black border-collapse">
            <tbody>
              <tr>
                <td
                  colSpan="2"
                  className="text-center font-bold border-b-2 border-black pb-4 text-lg"
                >
                  TAX INVOICE
                </td>
              </tr>
              <tr>
                <td className="w-1/2 p-0 border-r-2 border-b-2 border-black">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="px-2 pb-2 font-semibold">Invoice No:</td>
                        <td className="">
                          <Input
                            value={invoiceData.invoiceNo}
                            readOnly
                            className="h-8 text-base  font-medium"
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
                        <td className="px-2 pb-2">Dated:</td>
                        <td className="">
                          <Input
                            type="date"
                            value={invoiceData.date}
                            onChange={(e) =>
                              setInvoiceData({ ...invoiceData, date: e.target.value })
                            }
                            className="h-6 text-base "
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td className="align-top p-0 border-r-2 border-b-2 border-black">
                  <div className="font-bold border-b-2 border-black px-3 pb-2 text-lg">
                    Seller
                  </div>
                  <div className="mt-1 px-2 pb-2">
                    <div className="font-bold">WHITE BRANDING</div>
                    <div>51/590-2A, White branding, Nethaji road, Behind</div>
                    <div>Nethaji Ground, West Fort, Thrissur, Kerala,</div>
                    <div>GSTIN/UIN: 32BYOPT4425R1ZL</div>
                    <div>State Name: Kerala, Code: 32</div>
                    <div>Phone No: 8606378902</div>
                  </div>
                </td>
                <td className="align-top p-0 border-b-2 border-black">
                  <div className="font-bold border-b-2 border-black px-3 pb-2 text-lg">
                    Buyer
                  </div>
                  <div className="mt-1 px-2 pb-2">
                    {selectedCompany ? (
                      <>
                        <div className="font-bold uppercase">{selectedCompany.company}</div>
                        {formatAddress(selectedCompany.location).map((line, index) => (
                          <div key={index} className="font-medium">{line}</div>
                        ))}
                        <div className="font-medium mt-1">
                          GSTIN/UIN: {selectedCompany.gstin || "N/A"}
                        </div>
                        <div className="font-medium">State Name: Kerala, Code: 32</div>
                        <div className="font-medium">
                          Phone No: {selectedCompany.phone || "N/A"}
                        </div>
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
          <table className="w-full border-x-2 border-black border-collapse text-sm">
            <thead>
              <tr className="font-bold">
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-left w-12">
                  Sl No.
                </th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-left">
                  Description of Goods
                </th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-left w-24">
                  HSN/SAC
                </th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-right w-20">
                  Quantity
                </th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-right w-20">
                  Rate
                </th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-center w-16">
                  Per
                </th>
                <th className="border-b-2 border-black px-2 pb-2 text-right w-32">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="text-base">
              {invoiceData.items.map((item, index) => (
                <tr key={index}>
                  <td className="border-r-2 border-black px-2 pb-2">{index + 1}</td>
                  <td className="border-r-2 border-black px-2 pb-2">{item.description}</td>
                  <td className="border-r-2 border-black px-2 pb-2">{item.hsn}</td>
                  <td className="border-r-2 border-black px-2 pb-2 text-right">
                    <Input
                      type="text"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      className="h-6 text-base  text-right w-full"
                    />
                  </td>
                  <td className="border-r-2 border-black px-2 pb-2 text-right">
                    {index === 1 ? (
                      <Input
                        type="text"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                        className="h-6 text-base  text-right w-full"
                      />
                    ) : (
                      <span>{item.rate}</span>
                    )}
                  </td>
                  <td className="border-r-2 border-black px-2 pb-2 text-center">
                    {index === 1 ? (
                      <Input
                        value={item.per}
                        onChange={(e) => handleItemChange(index, "per", e.target.value)}
                        className="h-6 text-base  text-center w-full"
                      />
                    ) : (
                      <span>{item.per}</span>
                    )}
                  </td>
                  <td className="px-2 pb-2 text-right">
                    {index === 1 ? (
                      <Input
                        type="text"
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                        className="h-6 text-base  text-right w-full"
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
          <table className="w-full border-x-2 border-black border-collapse text-sm">
            <tbody>
              <tr className="border-t-2 border-black">
                <td className="border-r-2 border-black px-2 pb-2 text-right" colSpan="2">
                  OUTPUT CGST
                </td>
                <td className="px-2 pb-2 text-right w-32">{formatIndianNumber(taxes.cgst)}</td>
              </tr>
              <tr>
                <td className="border-r-2 border-black px-2 pb-2 text-right" colSpan="2">
                  OUTPUT SGST
                </td>
                <td className="px-2 pb-2 text-right">{formatIndianNumber(taxes.sgst)}</td>
              </tr>
              <tr>
                <td className="border-r-2 border-black px-2 pb-2 text-right" colSpan="2">
                  ROUND OFF
                </td>
                <td className="px-2 pb-2 text-right">0.00</td>
              </tr>
              <tr>
                <td className="border-r-2 border-black px-2 pb-2 text-right font-bold" colSpan="2">
                  Total
                </td>
                <td className="px-2 pb-2 text-right font-bold">₹ {formatIndianNumber(taxes.total)}</td>
              </tr>
            </tbody>
          </table>
          {/* Amount in Words */}
          <div className="border-t-2 border-x-2 border-b-2 border-black flex justify-between px-2 pb-2 text-base">
            <div className="flex space-x-2">
              <div className="font-bold">Amount Chargeable (in words):</div>
              <div>INR {numberToIndianCurrencyWords(Math.round(taxes.total))} Only</div>
            </div>
            <div>E. & O.E</div>
          </div>
          {/* Tax Summary Detailed Table */}
          <table className="w-full border-x-2 border-black border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-r-2 border-black px-2 pb-2 text-left w-24">HSN/SAC</th>
                <th className="border-r-2 border-black px-2 pb-2 text-right">Taxable Value</th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-center" colSpan="2">
                  Central Tax
                </th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-center" colSpan="2">
                  State Tax
                </th>
                <th className="border-black px-2 pb-2 text-right w-32">Total Tax Amount</th>
              </tr>
              <tr>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2"></th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2"></th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-right">Rate</th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-right">Amount</th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-right">Rate</th>
                <th className="border-b-2 border-r-2 border-black px-2 pb-2 text-right">Amount</th>
                <th className="border-b-2 border-black px-2 pb-2"></th>
              </tr>
            </thead>
            <tbody className="text-base">
              <tr>
                <td className="border-r-2 border-black px-2 pb-2">998397</td>
                <td className="border-r-2 border-black px-2 pb-2 text-right">
                  <Input
                    type="text"
                    value={totalAmount.toFixed(2)}
                    readOnly
                    className="h-6 text-base  text-right w-full"
                  />
                </td>
                <td className="border-r-2 border-black px-2 pb-2 text-right">9.0%</td>
                <td className="border-r-2 border-black px-2 pb-2 text-right">
                  <Input
                    type="text"
                    value={taxes.cgst.toFixed(2)}
                    onChange={(e) => handleTaxChange("cgst", e.target.value)}
                    className="h-6 text-base  text-right w-full"
                  />
                </td>
                <td className="border-r-2 border-black px-2 pb-2 text-right">9.0%</td>
                <td className="border-r-2 border-black px-2 pb-2 text-right">
                  <Input
                    type="text"
                    value={taxes.sgst.toFixed(2)}
                    onChange={(e) => handleTaxChange("sgst", e.target.value)}
                    className="h-6 text-base  text-right w-full"
                  />
                </td>
                <td className="px-2 pb-2 text-right">
                  {formatIndianNumber(taxes.cgst + taxes.sgst)}
                </td>
              </tr>
              <tr className="border-t-2 border-black">
                <td className="border-r-2 border-black px-2 pb-2 font-bold">Total</td>
                <td className="border-r-2 border-black px-2 pb-2 text-right font-bold">
                  {formatIndianNumber(totalAmount)}
                </td>
                <td className="border-r-2 border-black px-2 pb-2 text-right font-bold"></td>
                <td className="border-r-2 border-black px-2 pb-2 text-right font-bold">
                  {formatIndianNumber(taxes.cgst)}
                </td>
                <td className="border-r-2 border-black px-2 pb-2 text-right font-bold"></td>
                <td className="border-r-2 border-black px-2 pb-2 text-right font-bold">
                  {formatIndianNumber(taxes.sgst)}
                </td>
                <td className="px-2 pb-2 text-right font-bold">
                  {formatIndianNumber(taxes.cgst + taxes.sgst)}
                </td>
              </tr>
            </tbody>
          </table>
          {/* Tax Amount in Words */}
          <div className="border-t-2 flex space-x-2 border-x-2 border-black px-2 pb-2 text-base">
            <div className="font-bold">Tax Amount (in Words):</div>
            <div>INR {numberToIndianCurrencyWords(Math.round(taxes.cgst + taxes.sgst))} Only</div>
          </div>
          {/* Footer Section */}
          <table className="w-full border-x-2 border-y-2 border-black border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-black border-r-2 px-2 pb-2 align-top w-1/2">
                  <div className="font-bold mb-1">Declaration</div>
                  <p>
                    We declare that this invoice shows the actual price of the goods
                    described and that all particulars are true and correct.
                  </p>
                </td>
                <td className="border border-black px-2 pb-2 align-top w-1/2">
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
          <div className="border-t-0 border-x-2 border-y-2 border-black pb-4 text-sm text-center">
            This is a Computer Generated Invoice
          </div>
        </div>
      </div>
</div>
  );
};

export default GSTBill;

// DownloadPDFButton.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // Import autoTable plugin for jsPDF
import { Download } from "lucide-react"; // Import the Download icon
import { format } from "date-fns";

const DownloadPDFButton = ({ data, selectedMonth }) => {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Define the month, fallback to "Unknown Month" if not provided
    const month = selectedMonth || "Unknown Month";

    // Add Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`Attendance Report`, 14, 22);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Month: ${month}`, 14, 30);
    doc.text(`Generated on: ${format(new Date(), "dd/MM/yyyy")}`, 14, 36);

    // Define table headers
    const tableHeaders = [
      { content: "Name" },
      { content: "Days Present" },
      { content: "Days Absent" },
      { content: "Days Late" },
      { content: "Avg. Check-in" },
    ];

    // Map data to table rows
    const tableData = data.map((record) => [
      record.name,
      record.daysPresent,
      record.daysAbsent,
      record.daysLate,
      record.averageCheckIn,
    ]);

    // Generate the table with autoTable
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 45,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 10,
        halign: "center",
        valign: "middle",
      },
      headStyles: {
        fillColor: [52, 73, 94], // Dark Blue Header
        textColor: [255, 255, 255], // White Text
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245], // Light Grey for Alternate Rows
      },
      margin: { top: 45 },
      didDrawPage: (data) => {
        // Footer - Page Number
        const pageCount = doc.internal.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.setFontSize(10);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          data.settings.margin.left,
          pageHeight - 10
        );
      },
    });

    // Save the PDF
    doc.save(`Attendance_Report_${month}.pdf`);
  };

  return (
    <Button onClick={generatePDF} className="ml-4 flex items-center space-x-2">
      <Download className="h-4 w-4" />
      <span>Download PDF</span>
    </Button>
  );
};

export default DownloadPDFButton;

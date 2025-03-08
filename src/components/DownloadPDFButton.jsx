import React from "react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import { format } from "date-fns";

const DownloadPDFButton = ({ data, selectedMonth }) => {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Define the month, fallback to "Unknown Month" if not provided
    const month = selectedMonth || "Unknown Month";
    
    // Add company logo placeholder (optional)
    // doc.addImage("logo.png", "PNG", 14, 10, 30, 15);
    
    // Add decorative header bar
    doc.setFillColor(52, 73, 94); // Dark Blue
    doc.rect(0, 0, 210, 40, "F");
    
    // Add main title
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("ATTENDANCE REPORT", 105, 20, { align: "center" });
    
    // Add subtitle with month
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text(month, 105, 30, { align: "center" });
    
    // Add metadata section
    doc.setFillColor(240, 240, 240); // Light gray
    doc.rect(0, 40, 210, 15, "F");
    
    // Add report metadata
    doc.setTextColor(70, 70, 70); // Dark gray
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Generated on: ${format(new Date(), "dd MMMM yyyy")}`, 14, 48);
    doc.text(`Total Employees: ${data.length}`, 105, 48);
    
    // Add summary statistics (optional)
    const presentTotal = data.reduce((sum, record) => sum + record.daysPresent, 0);
    const absentTotal = data.reduce((sum, record) => sum + record.daysAbsent, 0);
    const lateTotal = data.reduce((sum, record) => sum + record.daysLate, 0);
    
    doc.text(`Present: ${presentTotal}`, 150, 48);
    doc.text(`Absent: ${absentTotal}`, 175, 48);
    
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
      startY: 60, // Adjusted starting position for table
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
      margin: { top: 60 },
      didDrawPage: (data) => {
        // Add decorative header bar on additional pages
        if (data.pageNumber > 1) {
          doc.setFillColor(52, 73, 94);
          doc.rect(0, 0, 210, 20, "F");
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text("ATTENDANCE REPORT", 105, 12, { align: "center" });
          
          // Reset text color for the rest of the page
          doc.setTextColor(0, 0, 0);
        }
        
        // Footer - Page Number
        const pageCount = doc.internal.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.setFontSize(10);
        doc.setTextColor(70, 70, 70);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          105,
          pageHeight - 10,
          { align: "center" }
        );
      },
    });

    // Save the PDF
    doc.save(`Attendance_Report_${month.replace(" ", "_")}.pdf`);
  };

  return (
    <Button onClick={generatePDF} className="w-full flex items-center space-x-2">
      <Download className="h-4 w-4" />
      <span>Download PDF</span>
    </Button>
  );
};

export default DownloadPDFButton;
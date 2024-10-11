import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react"; // Importing the download icon
import jsPDF from "jspdf";
import "jspdf-autotable";

const DownloadButton = ({ transactions, reportTitle, reportSubtitle, reportDateRange }) => {
  const downloadPdf = () => {
    const doc = new jsPDF();

    // Set font and style for title
    const pageWidth = doc.internal.pageSize.getWidth();
    const title = reportTitle || "Transactions Report";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(40);
    const titleWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const titleX = (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, 20);

    // Add subtitle if available
    if (reportSubtitle) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const subtitleWidth = doc.getStringUnitWidth(reportSubtitle) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      const subtitleX = (pageWidth - subtitleWidth) / 2;
      doc.text(reportSubtitle, subtitleX, 28);
    }

    // Add date range if provided
    if (reportDateRange) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      const dateRangeWidth = doc.getStringUnitWidth(`Date Range: ${reportDateRange}`) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      const dateRangeX = (pageWidth - dateRangeWidth) / 2;
      doc.text(`Date Range: ${reportDateRange}`, dateRangeX, 34);
    }

    // Add a separator line for a modern look
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 38, pageWidth - 10, 38);

    // Generate the table with modern styles
    doc.autoTable({
      startY: 45,
      head: [["Date", "Title", "Category", "Type", "Amount", "Notes"]],
      body: transactions.map((transaction) => [
        transaction.date,
        transaction.title,
        transaction.category,
        transaction.type,
        transaction.amount,
        transaction.description,
      ]),
      styles: {
        fontSize: 10,
        font: "helvetica",
        textColor: [60, 60, 60],
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 11,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245], // Light gray for alternate rows
      },
      theme: "grid",
    });

    // Add a footer with page number
    const totalPagesExp = "{total_pages_count_string}";
    doc.autoTable({
      didDrawPage: function (data) {
        // Footer
        let str = "Page " + doc.internal.getNumberOfPages();
        if (typeof doc.putTotalPages === "function") {
          str = str + " of " + totalPagesExp;
        }
        doc.setFontSize(10);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      },
    });

    // If multiple pages, replace the totalPagesExp with actual page number
    if (typeof doc.putTotalPages === "function") {
      doc.putTotalPages(totalPagesExp);
    }

    // Save the generated PDF
    doc.save("transactions-report.pdf");
  };

  return (
    <Button onClick={downloadPdf} className="flex items-center space-x-2">
      <Download className="h-5 w-5" />
      <span className="block md:hidden">Download</span>
      <span className="hidden md:block">Download PDF</span>
    </Button>
  );
};

export default DownloadButton;

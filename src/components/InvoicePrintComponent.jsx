// components/InvoicePrintComponent.jsx

import React from 'react';
import Logo from "@/assets/logo1.png"; // Ensure this logo path is correct

const InvoicePrintComponent = React.forwardRef(({ items, total, additionalBills, date, clientDetails, invoiceNumber }, ref) => {
  return (
    <div ref={ref} style={{
      padding: "40px",
      fontFamily: "Inter, sans-serif",
      maxWidth: "800px",
      margin: "0 auto",
      color: "#333",
      backgroundColor: "#f9f9f9",
      borderRadius: "8px",
      minHeight: "100vh",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}>
      {/* Header Section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "30px" }}>
  <div style={{ display: "flex", alignItems: "center", marginLeft: "-35px", marginRight: "150px" }}>
    <img src={Logo} alt="Logo" style={{ width: '250px', height: '170px' }} />
  </div>
  <div style={{ textAlign: "right" }}>
    <h1 style={{ fontFamily: "RoxboroughCF", fontSize: "28pt", margin: "0", color: "#333" }}>INVOICE</h1>
    <p style={{ fontFamily: "Inter", fontSize: "12pt", marginTop: "10px", color: "#555" }}>
      Date: {date || "Date Not Specified"}
    </p>
    <p style={{ fontFamily: "Inter", fontSize: "12pt", color: "#555" }}>
      Invoice No: {invoiceNumber || "N/A"}
    </p>
  </div>
</div>


      {/* Billing Information Section */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
        <div>
          <h2 style={{ fontFamily: "Inter Medium", fontSize: "14pt", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>BILLED TO:</h2>
          <p style={{ fontFamily: "Inter", fontSize: "12pt", color: "#555", margin: "5px 0", whiteSpace: "pre-wrap" }}>
            {clientDetails || "Client details not provided"}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "Inter", fontSize: "12pt", color: "#555" }}>White Branding</p>
          <p style={{ fontFamily: "Inter", fontSize: "12pt", color: "#555" }}>Thrissur, Kerala</p>
          <p style={{ fontFamily: "Inter", fontSize: "12pt", color: "#555" }}>8606602888</p>
          <p style={{ fontFamily: "Inter", fontSize: "12pt", color: "#555" }}>whitebranding0@gmail.com</p>
        </div>
      </div>

      {/* Itemized Table Section */}
      <div style={{ marginBottom: "30px", borderTop: "1px solid #bcb8b1", paddingTop: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #bcb8b1", paddingBottom: "10px", marginBottom: "10px" }}>
          <span style={{ fontFamily: "Inter Medium", fontWeight: "bold", fontSize: "12pt", textAlign: "left", flex: 1, color: "#333" }}>Description</span>
          <span style={{ fontFamily: "Inter Medium", fontWeight: "bold", fontSize: "12pt", textAlign: "center", flex: 0.5, color: "#333" }}>Quantity</span>
          <span style={{ fontFamily: "Inter Medium", fontWeight: "bold", fontSize: "12pt", textAlign: "center", flex: 0.5, color: "#333" }}>Number of Days</span>
        </div>
        {items.map((item, index) => (
          <div key={index} style={{ display: "flex", justifyContent: "space-between", margin: "10px 0", borderBottom: "1px solid #bcb8b1", paddingBottom: "10px" }}>
            <span style={{ fontFamily: "Inter", fontSize: "12pt", flex: 1, color: "#555" }}>{item.description || "No description provided"}</span>
            <span style={{ fontFamily: "Inter", fontSize: "12pt", textAlign: "center", flex: 0.5, color: "#555" }}>{item.quantity || "0"}</span>
            <span style={{ fontFamily: "Inter", fontSize: "12pt", textAlign: "center", flex: 0.5, color: "#555" }}>{item.numberOfDays || "0"}</span>
          </div>
        ))}
      </div>

      {/* Additional Bills Section */}
      {additionalBills.length > 0 && (
        <div style={{ textAlign: "right", marginBottom: "30px" }}>
          {additionalBills.map((bill, index) => (
            <div key={index} style={{ marginBottom: "10px" }}>
              <span style={{ fontFamily: "Inter Medium", fontSize: "13pt", color: "#333" }}>{bill.name}</span>
              <span style={{ marginLeft: "20px", fontFamily: "Inter Medium", fontSize: "13pt", color: "#333" }}>₹{parseFloat(bill.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total Section */}
      <div style={{ textAlign: "right", marginBottom: "40px" }}>
        <hr style={{ width: "20%", borderColor: "#bcb8b1", marginLeft: "auto" }} />
        <div style={{ paddingTop: "10px" }}>
          <span style={{
            fontFamily: "Inter Medium",
            fontSize: "14pt",
            fontWeight: "bold",
            color: "#333",
            display: "inline-block",
            width: "150px",
            textAlign: "right"
          }}>Total</span>
          <span style={{
            fontFamily: "Inter",
            fontSize: "14pt",
            fontWeight: "bold",
            display: "inline-block",
            marginLeft: "20px",
            textAlign: "right",
            color: "#333"
          }}>₹{parseFloat(total).toFixed(2)}</span>
        </div>
      </div>

      {/* Thank You Message */}
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <p style={{ fontFamily: "RoxboroughCF", fontSize: "14pt", fontStyle: "italic", color: "#333" }}>Thank you!</p>
      </div>
    </div>
  );
});

export default InvoicePrintComponent;

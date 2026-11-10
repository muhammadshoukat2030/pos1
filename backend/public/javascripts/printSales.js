document.addEventListener("DOMContentLoaded", function () {
  const savedData = localStorage.getItem("lastAddedSales");
  const customerName = localStorage.getItem("lastCustomerName");
  const billID = localStorage.getItem("lastSalesBillID");
  const paymentMethod = localStorage.getItem("lastPaymentMethod");
  const cashReceived = localStorage.getItem("lastCashReceived");
  const changeDue = localStorage.getItem("lastChangeDue");

  const tbody = document.getElementById("billTableBody");
  const totalItemsSpan = document.getElementById("billTotalItems");
  const totalAmountSpan = document.getElementById("billTotalAmount");
  const displayNameSpan = document.getElementById("displayName");
  const displayBillSpan = document.getElementById("displaybillID");
  const displayPaymentSpan = document.getElementById("displayPaymentMethod");
  const breakdownSection = document.getElementById("paymentBreakdownSection");
  const cashReceivedSpan = document.getElementById("billCashReceived");
  const changeDueSpan = document.getElementById("billChangeDue");

  if (customerName && displayNameSpan) displayNameSpan.innerText = customerName;
  if (billID && displayBillSpan) displayBillSpan.innerText = billID;
  if (paymentMethod && displayPaymentSpan) displayPaymentSpan.innerText = paymentMethod;

  if (cashReceived && parseFloat(cashReceived) > 0 && breakdownSection) {
    breakdownSection.style.display = "block";
    if (cashReceivedSpan) cashReceivedSpan.innerText = `Rs ${parseFloat(cashReceived).toFixed(2)}`;
    if (changeDueSpan) changeDueSpan.innerText = `Rs ${(parseFloat(changeDue) || 0).toFixed(2)}`;
  }

  if (savedData) {
    const sales = JSON.parse(savedData);
    let tableHTML = "";
    let totalAmount = 0;

    sales.forEach(s => {
      const qtySold = parseFloat(s.quantitySold) || 0;
      const rate = parseFloat(s.rate) || 0;
      const unitTax = parseFloat(s.unitTax) || 0;
      const unitDisc = parseFloat(s.unitDiscount) || 0;
      const rowTotal = Math.max(0, (qtySold * rate) + (unitTax * qtySold) - (unitDisc * qtySold));
      totalAmount += rowTotal;

      const unitText = s.unit || s.qty || "pcs";

      tableHTML += `
        <tr>
          <td>
            <strong>${s.itemName}</strong>
            ${s.brandName ? `<br><small style="color:#555;">${s.brandName}</small>` : ''}
          </td>
          <td>${unitText}</td>
          <td>${qtySold}</td>
          <td>${rate.toFixed(2)}</td>
          <td><b>${rowTotal.toFixed(2)}</b></td>
        </tr>`;
    });

    tbody.innerHTML = tableHTML;
    if (totalItemsSpan) totalItemsSpan.innerText = `Total items: ${sales.length}`;
    if (totalAmountSpan) totalAmountSpan.innerText = `Total: Rs ${totalAmount.toFixed(2)}`;

    // Auto-launch printer dialog
    setTimeout(() => {
      window.print();
    }, 400);
  } else {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No bill data found to print</td></tr>`;
  }
});

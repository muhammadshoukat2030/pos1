import React, { useState, useEffect, useRef } from "react";
import {
  Receipt,
  Search,
  Calendar,
  Printer,
  Undo2,
  Trash2,
  CheckCircle,
  Clock,
  Truck,
  PauseCircle,
  Eye,
  X,
  Filter,
  ArrowUpDown,
  Share2,
  MessageCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { TableSkeleton } from "../components/LoadingSkeleton";
import ConfirmModal from "../components/ConfirmModal";
import Receipt80mm from "../components/Receipt80mm";
import { StatusBadge } from "../components/common";

export default function OrderHistory() {
  const { storeSettings } = useTheme();
  const { showToast } = useToast();
  const currency = storeSettings?.currency || "PKR";

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [dateFilter, setDateFilter] = useState("month");
  const [search, setSearch] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundItem, setRefundItem] = useState(null);
  const [refundQty, setRefundQty] = useState(1);
  const [refundReason, setRefundReason] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);

  const printRef = useRef(null);

  const fetchHistory = async (pageOverride, searchOverride) => {
    try {
      setLoading(true);
      const targetPage = pageOverride !== undefined ? pageOverride : currentPage;
      const targetSearch = searchOverride !== undefined ? searchOverride : search;
      const res = await api.get("/sales/history", {
        params: {
          filter: dateFilter,
          status: activeTab,
          search: targetSearch,
          page: targetPage,
          limit: pageSize
        }
      });
      if (res.data.success) {
        setHistory(res.data.history || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalOrdersCount(res.data.pagination.totalOrders || 0);
          setCurrentPage(res.data.pagination.page || 1);
        } else {
          setTotalOrdersCount(res.data.history?.length || 0);
        }
      }
    } catch (err) {
      showToast("Error loading order history: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Instant character-based search as the user types (with 250ms debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchHistory(1, search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Refetch when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
    fetchHistory(1, search);
  }, [activeTab, dateFilter, pageSize]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchHistory(1, search);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchHistory(page);
    }
  };

  const openBillDetails = (bill) => {
    setSelectedBill(bill);
    setIsDetailModalOpen(true);
  };

  const openPrintModal = (bill) => {
    setSelectedBill(bill);
    setIsPrintModalOpen(true);
  };

  // 1-Click WhatsApp Receipt Share
  const handleShareWhatsApp = (bill) => {
    if (!bill) return;
    const store = storeSettings?.storeName || "Universal Super Mart & POS";
    const phone = bill.customerPhone ? bill.customerPhone.replace(/[^0-9]/g, "") : "";
    const cleanPhone = phone.startsWith("0") ? "92" + phone.slice(1) : phone;

    const itemsText = (bill.salesItems || [])
      .map(
        (it) =>
          `• ${it.itemName} (${(it.quantitySold || it.quantity || 1) - (it.refundQuantity || 0)} ${it.unit || "pcs"} @ PKR ${it.rate}) = PKR ${(((it.quantitySold || it.quantity || 1) - (it.refundQuantity || 0)) * (it.rate || 0)).toLocaleString()}`
      )
      .join("\n");

    const message =
      `🧾 *SALE RECEIPT / INVOICE*\n` +
      `🏪 *${store}*\n` +
      `--------------------------------\n` +
      `*Bill #:* ${bill.billID}\n` +
      `*Date:* ${bill.formattedDate || new Date(bill.createdAt).toLocaleDateString()} (${bill.formattedTime || ""})\n` +
      `*Customer:* ${bill.customerName || "Valued Shopper"}\n` +
      `--------------------------------\n` +
      `*PURCHASED ITEMS:*\n${itemsText || "• General items"}\n` +
      `--------------------------------\n` +
      `*GRAND TOTAL:* PKR ${(bill.grandTotal || 0).toLocaleString()}\n` +
      `*Payment Method:* ${bill.paymentMethod || "Cash"}\n` +
      `--------------------------------\n` +
      `_Thank you for your purchase! Visit again soon._`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(waUrl, "_blank");
  };

  const handleDeleteBill = async () => {
    if (!billToDelete) return;
    try {
      const res = await api.delete(`/sales/bill/${billToDelete._id}`);
      if (res.data.success) {
        showToast("Bill deleted successfully.", "success");
        setHistory((prev) => prev.filter((b) => b._id !== billToDelete._id));
        setBillToDelete(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundItem || refundQty <= 0) return;

    try {
      const res = await api.post("/sales/refund", {
        stockID: refundItem.stockID,
        saleID: refundItem.saleID,
        productQuantity: refundQty,
        reason: refundReason
      });

      if (res.data.success) {
        showToast(res.data.message || "Refund processed successfully!", "success");
        setIsRefundModalOpen(false);
        setIsDetailModalOpen(false);
        fetchHistory();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Refund failed", "error");
    }
  };

  const statusTabs = [
    { id: "all", label: "All Orders" },
    { id: "Completed", label: "Completed" },
    { id: "Dispatch", label: "Dispatch" },
    { id: "Pending", label: "Pending" },
    { id: "Held", label: "Held Bills" },
  ];

  const getStatusBadge = (status) => {
    return <StatusBadge status={status} />;
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-theme-textPrimary flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> Orders & Sales Management
          </h1>
          <p className="text-[11.5px] text-theme-textSecondary mt-0.5">
            Track customer transactions, reprint 80mm receipts, and process refunds.
          </p>
        </div>
      </div>

      {/* 1. STATUS FILTER TABS */}
      <div className="flex items-center gap-1.5 border-b border-theme-border pb-1 overflow-x-auto no-scrollbar">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-emerald-50 dark:bg-[#133b2a] text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300/60 dark:border-emerald-700/50 shadow-2xs"
                : "text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2. FILTERS & SEARCH BAR */}
      <div className="bg-theme-card border border-theme-border rounded-lg p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Date Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "month", label: "This Month" },
            { id: "lastMonth", label: "Last Month" },
            { id: "all", label: "All Time" }
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDateFilter(d.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                dateFilter === d.id
                  ? "bg-black/10 dark:bg-white/10 text-emerald-800 dark:text-emerald-300 font-semibold"
                  : "text-theme-textMuted hover:text-theme-textPrimary"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-theme-textMuted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, bill #..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-600 text-theme-textPrimary placeholder:text-theme-textMuted transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                  fetchHistory(1, "");
                }}
                className="absolute right-2 top-1.5 text-theme-textMuted hover:text-theme-textPrimary p-0.5 rounded cursor-pointer transition"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-2xs cursor-pointer transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* 3. ORDERS TABLE (Floating Rows Style - Matching Image 1 eProduct) */}
      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : history.length === 0 ? (
        <div className="bg-theme-card border border-theme-border rounded-lg p-12 text-center text-xs text-theme-textMuted">
          <Receipt className="w-10 h-10 mx-auto mb-2 text-theme-textMuted opacity-40" />
          No orders found matching the filter criteria.
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((bill) => {
            const itemCount = bill.salesItems?.length || 0;
            return (
              <div
                key={bill._id}
                className="group bg-theme-card border border-theme-border hover:border-emerald-600/40 rounded-lg p-3 shadow-2xs hover:shadow-xs transition duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Order ID & Customer */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-theme-textPrimary">
                        {bill.billID}
                      </span>
                      {getStatusBadge(bill.status)}
                    </div>
                    <p className="text-xs text-theme-textSecondary mt-0.5">
                      <span className="font-medium text-theme-textPrimary">{bill.customerName || "Walk-in Customer"}</span>
                      {bill.customerPhone && <span> • {bill.customerPhone}</span>}
                    </p>
                  </div>
                </div>

                {/* Date & Payment Mode */}
                <div className="flex items-center gap-5 text-xs text-theme-textSecondary">
                  <div>
                    <span className="text-[10px] text-theme-textMuted uppercase font-medium block">Date & Time</span>
                    <span className="font-medium text-theme-textPrimary">
                      {bill.formattedDate || new Date(bill.createdAt).toLocaleDateString()} ({bill.formattedTime || new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-theme-textMuted uppercase font-medium block">Payment Mode</span>
                    <span className="font-medium text-theme-textPrimary">{bill.paymentMethod || "Cash"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-theme-textMuted uppercase font-medium block">Items</span>
                    <span className="font-medium text-theme-textPrimary">{itemCount} items</span>
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-theme-border">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-theme-textMuted uppercase font-medium block">Grand Total</span>
                    <span className="text-sm sm:text-base font-bold text-theme-textPrimary">
                      {currency} {(bill.grandTotal || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openBillDetails(bill)}
                      className="p-1.5 rounded-lg border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textSecondary hover:text-theme-textPrimary transition cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openPrintModal(bill)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition cursor-pointer"
                      title="Reprint 80mm Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(bill)}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 transition cursor-pointer"
                      title="Share Receipt via WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setBillToDelete(bill)}
                      className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-700 transition"
                      title="Delete Bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Toolbar */}
          <div className="bg-theme-card border border-theme-border rounded-lg px-5 py-3.5 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-theme-textSecondary">
              <span>
                Showing <strong className="text-theme-textPrimary">{totalOrdersCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong className="text-theme-textPrimary">{Math.min(currentPage * pageSize, totalOrdersCount)}</strong> of{" "}
                <strong className="text-theme-textPrimary">{totalOrdersCount}</strong> orders
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg px-2 py-1 text-xs font-semibold text-theme-textPrimary focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none font-semibold transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <div className="px-3 py-1 font-bold text-theme-textPrimary">
                Page {currentPage} of {totalPages}
              </div>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none font-semibold transition"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: ORDER DETAILS WITH RETURN/REFUND ACTION */}
      {isDetailModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-xl p-4 sm:p-5 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="font-extrabold text-lg text-theme-textPrimary flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-theme-primary" /> Invoice #{selectedBill.billID}
                </h3>
                <p className="text-xs text-theme-textSecondary mt-0.5">
                  Customer: <strong>{selectedBill.customerName}</strong> ({selectedBill.paymentMethod})
                </p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-theme-textMuted hover:text-theme-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Itemized Table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/5 dark:bg-white/5 text-[10px] font-bold text-theme-textMuted uppercase sticky top-0">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Line Total</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {(selectedBill.salesItems || []).map((it) => {
                    const actualQty = (it.quantitySold || 1) - (it.refundQuantity || 0);
                    return (
                      <tr key={it._id} className="hover:bg-black/5">
                        <td className="p-2 font-medium">
                          <div className="font-bold text-theme-textPrimary">{it.itemName}</div>
                          <div className="text-[10px] text-theme-textMuted">{it.brandName} • {it.barcode}</div>
                          {it.refundQuantity > 0 && (
                            <span className="text-[10px] text-rose-500 font-bold">
                              Refunded: {it.refundQuantity} {it.unit || 'pcs'}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right">{currency} {(it.rate || 0).toLocaleString()}</td>
                        <td className="p-2 text-center font-bold">{actualQty} {it.unit || 'pcs'}</td>
                        <td className="p-2 text-right font-black">{currency} {(actualQty * (it.rate || 0)).toFixed(0)}</td>
                        <td className="p-2 text-center">
                          {actualQty > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setRefundItem(it);
                                setRefundQty(1);
                                setIsRefundModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] transition flex items-center gap-1 mx-auto"
                            >
                              <Undo2 className="w-3 h-3" /> Refund
                            </button>
                          ) : (
                            <span className="text-[10px] text-rose-600 font-bold">Fully Returned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total summary */}
            <div className="pt-3 border-t border-theme-border flex items-center justify-between">
              <div>
                <span className="text-xs text-theme-textMuted">Subtotal: {currency} {selectedBill.subtotal || selectedBill.grandTotal}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-theme-textMuted uppercase font-bold mr-2">Grand Total:</span>
                <span className="text-xl font-black text-theme-primary">{currency} {(selectedBill.grandTotal || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: PROCESS ITEM REFUND */}
      {isRefundModalOpen && refundItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-lg p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-rose-600 flex items-center gap-2">
                <Undo2 className="w-5 h-5" /> Refund Item
              </h3>
              <button onClick={() => setIsRefundModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-sm text-theme-textPrimary">{refundItem.itemName}</p>
                <p className="text-theme-textMuted">Rate: {currency} {refundItem.rate}</p>
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">
                  Quantity to Refund (Max: {(refundItem.quantitySold || 1) - (refundItem.refundQuantity || 0)})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  max={(refundItem.quantitySold || 1) - (refundItem.refundQuantity || 0)}
                  value={refundQty}
                  onChange={(e) => setRefundQty(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-black/5 border border-theme-border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Reason for Return</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Expired, defective, or customer exchange"
                  className="w-full px-3 py-2 bg-black/5 border border-theme-border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: REPRINT 80MM THERMAL RECEIPT */}
      {isPrintModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card text-theme-textPrimary border border-theme-border rounded-xl p-4 sm:p-5 max-w-sm w-full shadow-2xl space-y-3.5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-theme-border">
              <span className="font-bold text-sm text-theme-primary flex items-center gap-1.5">
                <Printer className="w-4 h-4" /> Reprint 80mm Receipt
              </span>
              <button onClick={() => setIsPrintModalOpen(false)} className="text-theme-textMuted hover:text-theme-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-theme-border rounded-lg p-2 bg-theme-bg">
              <Receipt80mm ref={printRef} bill={selectedBill} />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-theme-border">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(selectedBill)}
                className="py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 flex items-center justify-center gap-1.5 transition"
                title="Send Bill to Customer via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-theme-border text-xs font-semibold text-theme-textSecondary hover:bg-theme-bg transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" /> Print (80mm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!billToDelete}
        onClose={() => setBillToDelete(null)}
        onConfirm={handleDeleteBill}
        title="Delete Order Record"
        message={`Are you sure you want to delete Bill #${billToDelete?.billID}? This will remove the invoice record.`}
        confirmText="Delete Order"
      />
    </div>
  );
}

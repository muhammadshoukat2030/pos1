import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  ArrowDownLeft,
  MessageSquare,
  Printer,
  ChevronRight,
  Eye,
  DollarSign,
  FileText,
  ShieldCheck,
  Building,
  Hash
} from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { TableSkeleton } from "./LoadingSkeleton";

export default function CustomerKhataProfileModal({
  customerId,
  isOpen,
  onClose,
  onPaymentRecorded
}) {
  const { storeSettings } = useTheme();
  const { showToast } = useToast();
  const currency = storeSettings?.currency || "PKR";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("bills"); // 'bills' | 'payments' | 'ledger'
  const [selectedBill, setSelectedBill] = useState(null);
  const [isBillDetailOpen, setIsBillDetailOpen] = useState(false);

  // Receive Payment Sub-Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payBillId, setPayBillId] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payReference, setPayReference] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const fetchProfile = async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const res = await api.get(`/ledger/customers/${customerId}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to load customer profile", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchProfile();
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  const customer = data?.customer;
  const summary = data?.summary || {
    totalBills: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalBillsCount: 0
  };
  const bills = data?.bills || [];
  const payments = data?.payments || [];
  const transactions = data?.transactions || [];

  // Open Receive Payment modal
  const openReceivePayment = (specificBillId = "") => {
    setPayBillId(specificBillId);
    if (specificBillId) {
      const b = bills.find((item) => item._id === specificBillId);
      if (b) {
        setPayAmount(b.outstandingAmount || "");
      } else {
        setPayAmount("");
      }
    } else {
      setPayAmount(summary.totalOutstanding > 0 ? summary.totalOutstanding : "");
    }
    setPayNotes("");
    setPayReference("");
    setIsPayModalOpen(true);
  };

  // Submit payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid payment amount.", "error");
      return;
    }

    try {
      setIsSubmittingPay(true);
      const res = await api.post("/ledger/customer-payment", {
        customerId,
        amount,
        paymentMethod: payMethod,
        billId: payBillId || undefined,
        referenceNumber: payReference,
        notes: payNotes
      });

      if (res.data.success) {
        showToast(res.data.message || "Payment recorded successfully!", "success");
        setIsPayModalOpen(false);
        setPayAmount("");
        setPayBillId("");
        setPayNotes("");
        setPayReference("");
        fetchProfile();
        if (onPaymentRecorded) onPaymentRecorded();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Payment recording failed", "error");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // WhatsApp Reminder
  const handleWhatsAppReminder = () => {
    if (!customer) return;
    const store = storeSettings?.storeName || "Universal POS & Mart";
    const phone = customer.phone ? customer.phone.replace(/[^0-9]/g, "") : "";
    const cleanPhone = phone.startsWith("0") ? "92" + phone.slice(1) : phone;
    const balance = (summary.totalOutstanding || 0).toLocaleString();

    const message =
      `محترم جناب *${customer.name}* صاحب،\n\n` +
      `السلام علیکم!\n` +
      `برائے مہربانی نوٹ فرمائیں کہ آپ کے کھاتہ برائے *${store}* میں بقایا واجب الادا رقم *PKR ${balance}* ہے۔\n\n` +
      `درخواست ہے کہ جلد از جلد بقایا رقم ادا فرما کر کھاتہ کلیئر فرمائیں۔\n\n` +
      `شکریہ!\n` +
      `*${store}*\n` +
      `رابطہ فون: ${storeSettings?.phone || ""}`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3" /> Paid
          </span>
        );
      case "Partially Paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3" /> Partially Paid
          </span>
        );
      case "Unpaid":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertCircle className="w-3 h-3" /> Unpaid
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-theme">
      <div className="bg-theme-card border border-theme-border rounded-card w-full max-w-4xl max-h-[92vh] flex flex-col shadow-card overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-theme-border bg-theme-surface flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-btn bg-[#14532D] flex items-center justify-center text-white shadow-xs font-bold text-lg">
              {customer?.name ? customer.name.charAt(0).toUpperCase() : <User className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-theme-textPrimary leading-tight">
                  {customer?.name || "Customer Profile"}
                </h2>
                {customer?.customerID && (
                  <span className="px-2 py-0.5 text-[10.5px] font-mono font-bold rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    {customer.customerID}
                  </span>
                )}
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                  {customer?.status || "Active"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-theme-textSecondary mt-0.5 flex-wrap">
                {customer?.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-theme-primary" /> {customer.phone}
                  </span>
                )}
                {customer?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-theme-primary" /> {customer.address}
                  </span>
                )}
                {customer?.createdAt && (
                  <span className="flex items-center gap-1 text-[11px] text-theme-textMuted">
                    <Calendar className="w-3 h-3" /> Member since {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openReceivePayment()}
              className="px-3 py-1.5 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ArrowDownLeft className="w-4 h-4 text-white" /> Receive Payment
            </button>
            <button
              type="button"
              onClick={handleWhatsAppReminder}
              className="p-1.5 rounded-btn border border-theme-border bg-theme-surface hover:bg-theme-card text-theme-primary transition cursor-pointer"
              title="Send WhatsApp Khata Reminder"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-btn text-theme-textSecondary hover:text-theme-textPrimary hover:bg-theme-surface transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {loading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : (
            <>
              {/* Account Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
                {/* 1. Total Bills */}
                <div className="bg-theme-surface border border-theme-border rounded-card p-3.5 shadow-card flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-theme-textSecondary">
                      Total Bills
                    </span>
                    <Receipt className="w-4 h-4 text-theme-primary" />
                  </div>
                  <div className="mt-1">
                    <div className="text-base sm:text-lg font-bold text-theme-textPrimary">
                      {currency} {(summary.totalBills || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-theme-textSecondary mt-0.5">
                      Lifetime purchases
                    </div>
                  </div>
                </div>

                {/* 2. Total Paid */}
                <div className="bg-theme-surface border border-theme-border rounded-card p-3.5 shadow-card flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-theme-primary">
                      Total Paid
                    </span>
                    <CheckCircle className="w-4 h-4 text-theme-primary" />
                  </div>
                  <div className="mt-1">
                    <div className="text-base sm:text-lg font-bold text-theme-primary">
                      {currency} {(summary.totalPaid || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-theme-textSecondary mt-0.5">
                      Payments received
                    </div>
                  </div>
                </div>

                {/* 3. Total Outstanding */}
                <div
                  className={`border rounded-card p-3.5 shadow-card flex flex-col justify-between ${
                    summary.totalOutstanding > 0
                      ? "bg-rose-500/[0.05] dark:bg-rose-500/[0.1] border-rose-500/30"
                      : "bg-theme-surface border-theme-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10.5px] font-bold uppercase tracking-wider ${
                        summary.totalOutstanding > 0 ? "text-rose-600 dark:text-rose-400" : "text-theme-textSecondary"
                      }`}
                    >
                      Total Outstanding
                    </span>
                    <AlertCircle
                      className={`w-4 h-4 ${
                        summary.totalOutstanding > 0 ? "text-rose-600 dark:text-rose-400" : "text-theme-textSecondary"
                      }`}
                    />
                  </div>
                  <div className="mt-1">
                    <div
                      className={`text-base sm:text-lg font-bold ${
                        summary.totalOutstanding > 0 ? "text-rose-600 dark:text-rose-400" : "text-theme-textPrimary"
                      }`}
                    >
                      {currency} {(summary.totalOutstanding || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-theme-textSecondary mt-0.5">
                      Remaining balance owed
                    </div>
                  </div>
                </div>

                {/* 4. Total Bills Count */}
                <div className="bg-theme-surface border border-theme-border rounded-card p-3.5 shadow-card flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-theme-textSecondary">
                      Bills Count
                    </span>
                    <Hash className="w-4 h-4 text-theme-primary" />
                  </div>
                  <div className="mt-1">
                    <div className="text-base sm:text-lg font-bold text-theme-textPrimary">
                      {summary.totalBillsCount || 0}
                    </div>
                    <div className="text-[10px] text-theme-textSecondary mt-0.5">
                      Total invoices created
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Switcher */}
              <div className="flex items-center gap-1.5 border-b border-theme-border pb-1 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("bills")}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-semibold transition-all duration-theme flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "bills"
                      ? "bg-[#14532D] text-white shadow-xs"
                      : "text-theme-textSecondary hover:bg-theme-surface"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" /> Customer Bills ({bills.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payments")}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-semibold transition-all duration-theme flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "payments"
                      ? "bg-[#14532D] text-white shadow-xs"
                      : "text-theme-textSecondary hover:bg-theme-surface"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Payment History ({payments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ledger")}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-semibold transition-all duration-theme flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "ledger"
                      ? "bg-[#14532D] text-white shadow-xs"
                      : "text-theme-textSecondary hover:bg-theme-surface"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Full Ledger Log ({transactions.length})
                </button>
              </div>

              {/* TAB 1: BILLS HISTORY */}
              {activeTab === "bills" && (
                <div className="border border-theme-border rounded-lg overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/5 dark:bg-white/5 text-[10px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                        <tr>
                          <th className="py-2.5 px-3">Bill Number</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Total Bill</th>
                          <th className="py-2.5 px-3 text-right">Paid Amount</th>
                          <th className="py-2.5 px-3 text-right">Outstanding</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center w-28">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border">
                        {bills.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-theme-textMuted text-xs">
                              No bills recorded for this customer yet.
                            </td>
                          </tr>
                        ) : (
                          bills.map((b) => (
                            <tr key={b._id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-theme-textPrimary">
                                #{b.billID}
                              </td>
                              <td className="py-2.5 px-3 text-theme-textSecondary font-mono text-[11px]">
                                {new Date(b.createdAt).toLocaleDateString()}{" "}
                                <span className="text-theme-textMuted">
                                  {new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-theme-textPrimary">
                                {currency} {(b.grandTotal || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {currency} {(b.paidAmount || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black">
                                <span
                                  className={
                                    (b.outstandingAmount || 0) > 0
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-theme-textMuted"
                                  }
                                >
                                  {currency} {(b.outstandingAmount || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {getStatusBadge(b.paymentStatus)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBill(b);
                                      setIsBillDetailOpen(true);
                                    }}
                                    className="px-2 py-1 rounded-lg border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-[10.5px] text-theme-textSecondary transition flex items-center gap-1 cursor-pointer"
                                    title="View Bill Details"
                                  >
                                    <Eye className="w-3 h-3" /> View
                                  </button>
                                  {(b.outstandingAmount || 0) > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => openReceivePayment(b._id)}
                                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition cursor-pointer"
                                      title="Receive payment for this bill"
                                    >
                                      Pay
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: PAYMENTS HISTORY */}
              {activeTab === "payments" && (
                <div className="border border-theme-border rounded-lg overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/5 dark:bg-white/5 text-[10px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                        <tr>
                          <th className="py-2.5 px-3">Date & Time</th>
                          <th className="py-2.5 px-3 text-right">Payment Amount</th>
                          <th className="py-2.5 px-3">Payment Method</th>
                          <th className="py-2.5 px-3">Related Bill</th>
                          <th className="py-2.5 px-3">Reference / Notes</th>
                          <th className="py-2.5 px-3 text-center">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border">
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-theme-textMuted text-xs">
                              No payments received for this customer yet.
                            </td>
                          </tr>
                        ) : (
                          payments.map((p) => (
                            <tr key={p._id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition">
                              <td className="py-2.5 px-3 font-mono text-theme-textSecondary text-[11px]">
                                {new Date(p.date).toLocaleDateString()}{" "}
                                <span className="text-theme-textMuted">
                                  {new Date(p.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                                {currency} {(p.amount || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-theme-textPrimary">
                                {p.paymentMethod || "Cash"}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-theme-textSecondary text-[11px]">
                                {p.billID ? `#${p.billID}` : "General Khata"}
                              </td>
                              <td className="py-2.5 px-3 text-theme-textSecondary max-w-xs truncate">
                                {p.notes || p.referenceNumber || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-center text-[10.5px] text-theme-textMuted">
                                {p.recordedBy || "Cashier"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: FULL LEDGER TRANSACTIONS */}
              {activeTab === "ledger" && (
                <div className="border border-theme-border rounded-lg overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/5 dark:bg-white/5 text-[10px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-right">Balance After</th>
                          <th className="py-2.5 px-3">Mode</th>
                          <th className="py-2.5 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border">
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-theme-textMuted text-xs">
                              No ledger entries found.
                            </td>
                          </tr>
                        ) : (
                          transactions.map((t) => (
                            <tr key={t._id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition">
                              <td className="py-2.5 px-3 font-mono text-theme-textSecondary text-[11px]">
                                {new Date(t.date).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                                    t.transactionType === "Payment Received"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                  }`}
                                >
                                  {t.transactionType}
                                </span>
                              </td>
                              <td
                                className={`py-2.5 px-3 text-right font-black ${
                                  t.transactionType === "Payment Received" ? "text-emerald-600" : "text-theme-textPrimary"
                                }`}
                              >
                                {currency} {(t.amount || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-theme-textSecondary">
                                {currency} {(t.newBalance || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-theme-textSecondary text-[11px]">
                                {t.paymentMethod || "Cash"}
                              </td>
                              <td className="py-2.5 px-3 text-theme-textSecondary max-w-xs truncate">
                                {t.notes || "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-theme-border bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-theme-textMuted">
            Khata Account: <span className="font-semibold text-theme-textPrimary">{customer?.name}</span> ({customer?.customerID || "Assigned"})
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-theme-primary text-white font-bold text-xs hover:opacity-90 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: VIEW BILL DETAILS */}
      {isBillDetailOpen && selectedBill && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-lg w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-theme-border flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
              <div>
                <h3 className="font-extrabold text-base text-theme-textPrimary flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-theme-primary" /> Invoice #{selectedBill.billID}
                </h3>
                <p className="text-xs text-theme-textSecondary mt-0.5">
                  Date: {new Date(selectedBill.createdAt).toLocaleDateString()} {new Date(selectedBill.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBillDetailOpen(false)}
                className="p-1 rounded-lg text-theme-textMuted hover:text-theme-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {/* Bill Status & Amounts */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-theme-border text-center">
                <div>
                  <span className="text-[10px] text-theme-textMuted block font-bold uppercase">Grand Total</span>
                  <span className="text-sm font-black text-theme-textPrimary font-mono">
                    {currency} {(selectedBill.grandTotal || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold uppercase">Paid</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {currency} {(selectedBill.paidAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold uppercase">Outstanding</span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                    {currency} {(selectedBill.outstandingAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-theme-textPrimary uppercase tracking-wider mb-2">
                  Purchased Items ({selectedBill.salesItems?.length || 0})
                </h4>
                <div className="border border-theme-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/5 dark:bg-white/5 text-[10px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border">
                      {selectedBill.salesItems && selectedBill.salesItems.length > 0 ? (
                        selectedBill.salesItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-semibold text-theme-textPrimary">{it.itemName}</td>
                            <td className="py-2 px-2 text-center font-mono">
                              {it.quantitySold || it.quantity} {it.unit || "pcs"}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-theme-textSecondary">
                              {currency} {(it.rate || 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-theme-textPrimary">
                              {currency} {(it.lineTotal || (it.quantitySold * it.rate) || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-theme-textMuted">
                            No individual line items stored for this bill.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill Payments Log */}
              {selectedBill.payments && selectedBill.payments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-theme-textPrimary uppercase tracking-wider mb-2">
                    Payment Transactions ({selectedBill.payments.length})
                  </h4>
                  <div className="border border-theme-border rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/5 dark:bg-white/5 text-[10px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                        <tr>
                          <th className="py-1.5 px-3">Date</th>
                          <th className="py-1.5 px-3 text-right">Amount</th>
                          <th className="py-1.5 px-3">Method</th>
                          <th className="py-1.5 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border">
                        {selectedBill.payments.map((p, pIdx) => (
                          <tr key={pIdx}>
                            <td className="py-1.5 px-3 text-theme-textSecondary font-mono text-[11px]">
                              {new Date(p.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold text-emerald-600 font-mono">
                              {currency} {(p.amount || 0).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-theme-textPrimary">{p.paymentMethod || "Cash"}</td>
                            <td className="py-1.5 px-3 text-theme-textSecondary">{p.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-theme-border bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
              {(selectedBill.outstandingAmount || 0) > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsBillDetailOpen(false);
                    openReceivePayment(selectedBill._id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Receive Payment Against This Bill
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Fully Cleared
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsBillDetailOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-theme-border text-xs font-semibold hover:bg-black/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: RECEIVE PAYMENT */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-lg w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div>
                <h3 className="font-extrabold text-base text-theme-textPrimary flex items-center gap-1.5">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" /> Receive Khata Payment
                </h3>
                <p className="text-xs text-theme-textSecondary mt-0.5">
                  Customer: <strong>{customer?.name}</strong> ({customer?.customerID || "Assigned"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 rounded-lg text-theme-textMuted hover:text-theme-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              {/* Current Outstanding Display */}
              <div className="p-2.5 bg-rose-500/[0.06] border border-rose-500/20 rounded-lg flex items-center justify-between text-xs">
                <span className="font-bold text-rose-700 dark:text-rose-400">Total Outstanding Balance:</span>
                <span className="font-black text-rose-700 dark:text-rose-400 text-sm font-mono">
                  {currency} {(summary.totalOutstanding || 0).toLocaleString()}
                </span>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="text-xs font-bold text-theme-textSecondary block mb-1">
                  Payment Amount ({currency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  autoFocus
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-2 text-sm font-black text-emerald-600 bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              {/* Bill Target Selection */}
              <div>
                <label className="text-xs font-bold text-theme-textSecondary block mb-1">
                  Allocate Payment Against
                </label>
                <select
                  value={payBillId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPayBillId(id);
                    if (id) {
                      const b = bills.find((it) => it._id === id);
                      if (b) setPayAmount(b.outstandingAmount || "");
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Auto-allocate FIFO across oldest unpaid bills --</option>
                  {bills
                    .filter((b) => (b.outstandingAmount || 0) > 0)
                    .map((b) => (
                      <option key={b._id} value={b._id}>
                        Bill #{b.billID} — Due: {currency} {(b.outstandingAmount || 0).toLocaleString()} ({new Date(b.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-bold text-theme-textSecondary block mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer / Online</option>
                  <option value="Card">Card (POS Terminal)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {/* Reference Number */}
              <div>
                <label className="text-xs font-bold text-theme-textSecondary block mb-1">
                  Reference # / Cheque # (Optional)
                </label>
                <input
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="e.g. TR-99482 or Cheque #1029"
                  className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-theme-textSecondary block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Received installment at counter"
                  className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-theme-border text-xs font-semibold hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingPay ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

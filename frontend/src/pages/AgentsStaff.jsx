import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  DollarSign,
  Phone,
  ShieldCheck,
  Trash2,
  Eye,
  CheckCircle,
  FileText,
  X,
  CreditCard
} from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/ConfirmModal";

export default function AgentsStaff() {
  const { storeSettings } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const currency = storeSettings?.currency || "PKR";

  const [activeTab, setActiveTab] = useState("agents"); // 'agents' | 'users'
  const [agents, setAgents] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentCnic, setAgentCnic] = useState("");

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserRole, setNewUserRole] = useState("worker");

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isAgentDetailsOpen, setIsAgentDetailsOpen] = useState(false);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payItem, setPayItem] = useState(null);
  const [payAmount, setPayAmount] = useState(0);

  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentRes, userRes] = await Promise.all([
        api.get("/agents"),
        user?.role === "admin" ? api.get("/auth/users") : Promise.resolve({ data: { users: [] } })
      ]);

      if (agentRes.data.success) {
        setAgents(agentRes.data.agents || []);
        setStats(agentRes.data.stats || {});
      }
      if (userRes.data?.success) {
        setSystemUsers(userRes.data.users || []);
      }
    } catch (err) {
      showToast("Error loading staff: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Create Agent
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!agentName.trim() || !agentPhone.trim()) {
      showToast("Name and Phone are required", "error");
      return;
    }
    try {
      const res = await api.post("/agents", {
        name: agentName.trim(),
        phone: agentPhone.trim(),
        cnic: agentCnic.trim()
      });
      if (res.data.success) {
        showToast(res.data.message || "Agent created successfully!", "success");
        setIsAgentModalOpen(false);
        setAgentName("");
        setAgentPhone("");
        setAgentCnic("");
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Create System User / Cashier
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPass.trim()) {
      showToast("Username and password are required", "error");
      return;
    }
    try {
      const res = await api.post("/auth/create-user", {
        username: newUsername.trim(),
        password: newUserPass.trim(),
        role: newUserRole
      });
      if (res.data.success) {
        showToast(res.data.message || "User account created!", "success");
        setIsUserModalOpen(false);
        setNewUsername("");
        setNewUserPass("");
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // View Agent Details
  const openAgentDetails = async (agent) => {
    try {
      const res = await api.get(`/agents/${agent._id}`);
      if (res.data.success) {
        setSelectedAgent(res.data.agent);
        setIsAgentDetailsOpen(true);
      }
    } catch (err) {
      showToast("Error loading agent details", "error");
    }
  };

  // Pay Commission Item
  const handlePayCommission = async (e) => {
    e.preventDefault();
    if (!payItem || payAmount <= 0) return;

    try {
      const res = await api.post(`/agents/pay-item/${payItem._id}`, {
        amount: payAmount
      });
      if (res.data.success) {
        showToast("Commission payment recorded!", "success");
        setIsPayModalOpen(false);
        setIsAgentDetailsOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === "agent") {
        const res = await api.delete(`/agents/${itemToDelete.id}`);
        if (res.data.success) {
          showToast("Agent removed successfully.", "success");
          setAgents((prev) => prev.filter((a) => a._id !== itemToDelete.id));
        }
      } else if (itemToDelete.type === "user") {
        const res = await api.delete(`/auth/user/${itemToDelete.id}`);
        if (res.data.success) {
          showToast("User account removed.", "success");
          setSystemUsers((prev) => prev.filter((u) => u._id !== itemToDelete.id));
        }
      }
      setItemToDelete(null);
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-theme-textPrimary flex items-center gap-2.5">
            <Users className="w-6 h-6 text-theme-primary" /> Agents & Staff Management
          </h1>
          <p className="text-xs text-theme-textSecondary mt-0.5">
            Sales agent commission tracking, cashier terminal logins, and role administration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 text-theme-textPrimary font-bold text-xs shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-theme-primary" /> + New Cashier / User
            </button>
          )}
          <button
            onClick={() => setIsAgentModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white font-bold text-xs shadow-md transition transform active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> + Register Agent
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-theme-textMuted uppercase">Registered Agents</span>
          <h3 className="text-xl font-black text-theme-textPrimary mt-0.5">{stats.totalAgents || agents.length} Agents</h3>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-theme-textMuted uppercase">Total Commission Earned</span>
          <h3 className="text-xl font-black text-theme-textPrimary mt-0.5">
            {currency} {(stats.totalCommission || 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-theme-textMuted uppercase">Commission Paid</span>
          <h3 className="text-xl font-black text-emerald-600 mt-0.5">
            {currency} {(stats.totalPaid || 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-theme-textMuted uppercase">Commission Payable</span>
          <h3 className="text-xl font-black text-amber-500 mt-0.5">
            {currency} {(stats.totalPayable || 0).toLocaleString()}
          </h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-theme-border pb-1">
        <button
          onClick={() => setActiveTab("agents")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "agents"
              ? "bg-theme-primary text-white shadow-sm"
              : "text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          Sales Agents ({agents.length})
        </button>
        {user?.role === "admin" && (
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "users"
                ? "bg-theme-primary text-white shadow-sm"
                : "text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            System Logins / Cashiers ({systemUsers.length})
          </button>
        )}
      </div>

      {/* TAB 1: AGENTS LIST */}
      {activeTab === "agents" && (
        <div className="bg-theme-card border border-theme-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/5 dark:bg-white/5 text-[11px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                <tr>
                  <th className="p-3">Agent ID & Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3 text-right">Commission Earned</th>
                  <th className="p-3 text-right">Paid Amount</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-theme-textMuted">
                      No sales agents registered yet.
                    </td>
                  </tr>
                ) : (
                  agents.map((a) => (
                    <tr key={a._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <td className="p-3 font-bold text-theme-textPrimary">
                        <div>{a.name}</div>
                        <div className="text-[10px] text-theme-primary font-mono">{a.agentID}</div>
                      </td>
                      <td className="p-3 font-mono text-theme-textSecondary">{a.phone}</td>
                      <td className="p-3 text-right font-semibold text-theme-textPrimary">
                        {currency} {(a.totalCommission || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-600">
                        {currency} {(a.totalPaid || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-black text-amber-500">
                        {currency} {(a.balanceDue || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAgentDetails(a)}
                            className="p-1.5 rounded-lg border border-theme-border hover:bg-black/5 text-theme-textSecondary hover:text-theme-textPrimary transition"
                            title="View Commission Items"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {user?.role === "admin" && (
                            <button
                              type="button"
                              onClick={() => setItemToDelete({ id: a._id, name: a.name, type: "agent" })}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition"
                              title="Delete Agent"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* TAB 2: SYSTEM CASHIERS / USERS */}
      {activeTab === "users" && (
        <div className="bg-theme-card border border-theme-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/5 dark:bg-white/5 text-[11px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                <tr>
                  <th className="p-3">Username</th>
                  <th className="p-3">System Role</th>
                  <th className="p-3">Created On</th>
                  <th className="p-3 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {systemUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-theme-textPrimary flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-theme-primary/10 text-theme-primary font-bold flex items-center justify-center">
                        {u.username?.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === "admin"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                            : "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
                        }`}
                      >
                        {u.role === "admin" ? "Admin" : "Cashier / Staff"}
                      </span>
                    </td>
                    <td className="p-3 text-theme-textMuted">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-center">
                      {u.username !== user?.username && (
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ id: u._id, name: u.username, type: "user" })}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTER AGENT */}
      {isAgentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-theme-primary" /> Register Sales Agent
              </h3>
              <button onClick={() => setIsAgentModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Agent Full Name *</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">CNIC (Optional)</label>
                <input
                  type="text"
                  value={agentCnic}
                  onChange={(e) => setAgentCnic(e.target.value)}
                  placeholder="35201-1234567-1"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsAgentModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white font-bold"
                >
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE CASHIER ACCOUNT */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-theme-primary" /> + Create Terminal Account
              </h3>
              <button onClick={() => setIsUserModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. cashier2"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Account Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold"
                >
                  <option value="worker">Cashier / Staff (Restricted)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AGENT COMMISSION ITEMS DETAILS */}
      {isAgentDetailsOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="font-extrabold text-lg text-theme-textPrimary flex items-center gap-2">
                  <Users className="w-5 h-5 text-theme-primary" /> {selectedAgent.name} ({selectedAgent.agentID})
                </h3>
                <p className="text-xs text-amber-500 font-bold mt-0.5">
                  Remaining Commission Payable: {currency} {selectedAgent.balanceDue?.toLocaleString()}
                </p>
              </div>
              <button onClick={() => setIsAgentDetailsOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/5 dark:bg-white/5 text-[10px] font-bold text-theme-textMuted uppercase sticky top-0">
                  <tr>
                    <th className="p-2">Invoice / Bill</th>
                    <th className="p-2 text-right">Bill Total</th>
                    <th className="p-2 text-right">Commission %</th>
                    <th className="p-2 text-right">Earned</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {(selectedAgent.items || []).map((it) => (
                    <tr key={it._id} className="hover:bg-black/5">
                      <td className="p-2 font-mono font-bold text-theme-textPrimary">
                        {it.billId?.billID || "—"}
                      </td>
                      <td className="p-2 text-right">{currency} {(it.totalProductAmount || 0).toLocaleString()}</td>
                      <td className="p-2 text-right font-bold">{it.percentage}%</td>
                      <td className="p-2 text-right font-black text-theme-textPrimary">{currency} {(it.percentageAmount || 0).toLocaleString()}</td>
                      <td className="p-2 text-right font-bold text-emerald-600">{currency} {(it.paidAmount || 0).toLocaleString()}</td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            it.paidStatus === "Paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : it.paidStatus === "Partial"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {it.paidStatus || "Unpaid"}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {it.paidStatus !== "Paid" && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayItem(it);
                              setPayAmount((it.percentageAmount || 0) - (it.paidAmount || 0));
                              setIsPayModalOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-theme-primary text-white font-bold text-[10px]"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-theme-border">
              <button
                type="button"
                onClick={() => setIsAgentDetailsOpen(false)}
                className="px-4 py-2 rounded-xl bg-theme-primary text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PAY COMMISSION */}
      {isPayModalOpen && payItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Pay Agent Commission
              </h3>
              <button onClick={() => setIsPayModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayCommission} className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-sm text-theme-textPrimary">Commission Earned: {currency} {payItem.percentageAmount}</p>
                <p className="text-theme-textMuted">Already Paid: {currency} {payItem.paidAmount}</p>
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Amount to Pay ({currency})</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={(payItem.percentageAmount || 0) - (payItem.paidAmount || 0)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-black text-emerald-600 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${itemToDelete?.type === "agent" ? "Agent" : "User"}`}
        message={`Are you sure you want to permanently delete "${itemToDelete?.name}"?`}
        confirmText="Confirm Delete"
      />
    </div>
  );
}

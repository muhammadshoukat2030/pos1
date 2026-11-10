import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Calculator } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { storeSettings } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast("Please enter both username and password.", "error");
      return;
    }

    try {
      setLoading(true);
      await login(username.trim(), password);
      showToast("Login successful! Welcome back.", "success");
      navigate("/");
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Invalid credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-400 mx-auto flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition duration-300">
            <Calculator className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-3">
            {storeSettings?.storeName || "Bizniz POS"}
          </h1>
          <p className="text-xs text-white/70">
            {storeSettings?.tagline || "Sign in to access your ERP Terminal & Inventory"}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3 text-white/50" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or cashier"
                autoFocus
                className="w-full pl-11 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-white/50" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-white/50 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Direct Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 transition duration-200 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In Directly</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="pt-2 text-center text-xs text-white/50 border-t border-white/10 space-y-1">
          <p>Default Admin: <strong className="text-white/80 font-mono">admin</strong> / <strong className="text-white/80 font-mono">admin123</strong></p>
          <p>Default Cashier: <strong className="text-white/80 font-mono">cashier</strong> / <strong className="text-white/80 font-mono">cashier123</strong></p>
        </div>
      </div>
    </div>
  );
}

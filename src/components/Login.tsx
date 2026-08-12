import React, { useState } from 'react';
import { Lock, User, KeyRound, CheckCircle2, Globe, ShieldCheck, Wrench, Home, ArrowLeft, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { User as UserType, StaffMember, Tenant } from '../types';
import { AzharLogo } from './AzharLogo';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';

interface LoginProps {
  onLogin: (user: UserType) => void;
  staffMembers?: StaffMember[];
  tenants?: Tenant[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, staffMembers = [], tenants = [] }) => {
  const [loginRole, setLoginRole] = useState<'Admin' | 'Staff' | 'Tenant'>('Admin');
  const [username, setUsername] = useState('admin@azhar.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const { language, toggleLanguage, t } = useLanguage();

  const handleRoleTabChange = (role: 'Admin' | 'Staff' | 'Tenant') => {
    setLoginRole(role);
    setError('');
    if (role === 'Admin') {
      setUsername('admin@azhar.com');
      setPassword('Admin@123');
    } else if (role === 'Staff') {
      setUsername('EMP-002');
      setPassword('emp102');
    } else {
      setUsername('197');
      setPassword('tenant101');
    }
  };

  const buildUser = (fields: Partial<UserType>): UserType => {
    const user: UserType = {
      username: 'admin',
      name: 'Admin',
      email: '',
      role: 'Admin',
      ...fields
    };
    if (user.role === 'Admin') {
      user.name = 'Admin';
      user.email = 'admin@azhar.com';
    }
    return user;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    try {
      // 0. Real backend login for Admin (email or admin username)
      if (loginRole === 'Admin') {
        const email = cleanUser.includes('@') ? cleanUser : 'admin@azhar.com';
        const result = await apiService.login(email, cleanPass);
        setServerReachable(true);
        if (result.ok && result.user) {
          onLogin(buildUser({
            username: result.user.username || email,
            name: result.user.fullName || result.displayName || 'Admin',
            email: result.user.email || result.email || email,
            role: result.user.role || 'Admin'
          }));
          return;
        }
        if (result && result.isSuccess === false) {
          setError(language === 'ar'
            ? 'بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.'
            : 'Invalid credentials. Check your email and password.');
          return;
        }
        // Server responded but didn't give a session → fall back to demo admin credentials.
        if ((cleanUser === 'm.barmada' || cleanUser === 'admin@azhar.com') && (cleanPass === 'mohammed123' || cleanPass === 'admin' || cleanPass === 'Admin@123')) {
          onLogin(buildUser({
            username: 'm.barmada',
            name: 'Mohammed Barmada',
            email: 'm.barmada@azhar-residence.com'
          }));
          return;
        }
        setError(language === 'ar'
          ? 'فشل تسجيل الدخول مع الخادم. تحقق من الاتصال أو استخدم بيانات تجريبية.'
          : 'Login failed with the server. Check your connection or use demo credentials.');
        return;
      }

      // 1. Staff Login (local demo accounts)
      if (loginRole === 'Staff' || cleanUser.startsWith('EMP-') || cleanUser.startsWith('emp')) {
        const staffMatch = staffMembers.find(s =>
          s.empCode.toLowerCase() === cleanUser.toLowerCase() ||
          s.mobile === cleanUser ||
          s.name.includes(cleanUser)
        );
        if (staffMatch) {
          const expectedPass = staffMatch.password || 'emp102';
          if (cleanPass === expectedPass || cleanPass === 'staff123' || cleanPass === '123456') {
            onLogin(buildUser({
              username: staffMatch.empCode,
              name: staffMatch.name,
              email: `${staffMatch.empCode.toLowerCase()}@azhar-residence.com`,
              role: 'Staff',
              staffId: staffMatch.id
            }));
            return;
          }
        }
        setError(language === 'ar' ? 'بيانات الموظف غير صحيحة.' : 'Invalid staff credentials.');
        return;
      }

      // 2. Tenant Login (local demo accounts)
      if (loginRole === 'Tenant' || !isNaN(Number(cleanUser))) {
        const tenantMatch = tenants.find(t =>
          t.unitNumber === cleanUser ||
          t.mobile === cleanUser ||
          t.email.toLowerCase() === cleanUser.toLowerCase() ||
          t.name.toLowerCase().includes(cleanUser.toLowerCase()) ||
          (t.fullNameArabic && t.fullNameArabic.includes(cleanUser))
        );
        if (tenantMatch) {
          const expectedPass = tenantMatch.password || 'tenant101';
          if (cleanPass === expectedPass || cleanPass === 'tenant123' || cleanPass === '123456') {
            onLogin(buildUser({
              username: tenantMatch.unitNumber ? `Unit-${tenantMatch.unitNumber}` : tenantMatch.name,
              name: tenantMatch.fullNameArabic || tenantMatch.name,
              email: tenantMatch.email,
              role: 'Tenant',
              tenantId: tenantMatch.id,
              unitNumber: tenantMatch.unitNumber || '197'
            }));
            return;
          }
        }
        setError(language === 'ar' ? 'رقم الوحدة أو كلمة المرور غير صحيحة.' : 'Invalid unit number or password.');
        return;
      }
    } catch (err) {
      setServerReachable(false);
      setError(language === 'ar'
        ? 'تعذر الوصول إلى الخادم. تحقق من اتصال الإنترنت ثم أعد المحاولة.'
        : 'Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminDemo = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await apiService.login('admin@azhar.com', 'Admin@123');
      if (result.ok && result.user) {
        onLogin(buildUser({
          username: result.user.username || 'm.barmada',
          name: result.user.fullName || 'Mohammed Barmada',
          email: result.user.email || 'm.barmada@azhar-residence.com'
        }));
        return;
      }
    } catch (err) {
      /* fall back to local demo */
    } finally {
      setLoading(false);
    }
    onLogin(buildUser({
      username: 'admin@azhar.com',
      name: 'Mohammed Barmada',
      email: 'admin@azhar.com'
    }));
  };

  const handleQuickStaffDemo = () => {
    onLogin(buildUser({
      username: 'EMP-002',
      name: 'عثمان عبد الرحيم',
      email: 'emp002@azhar-residence.com',
      role: 'Staff',
      staffId: '2'
    }));
  };

  const handleQuickTenantDemo = () => {
    onLogin(buildUser({
      username: 'Unit-197',
      name: 'مهند رجب محمد سلامة',
      email: 'muhannad.s@azhar-residence.com',
      role: 'Tenant',
      tenantId: '1',
      unitNumber: '197'
    }));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-gradient-to-br from-slate-900 via-slate-800 to-[#1d2024] p-4 overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Language Switcher in top corner */}
      <div className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} z-20`}>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 rounded-lg text-xs font-bold text-slate-200 transition-colors shadow-md backdrop-blur-md"
        >
          <Globe className="w-4 h-4 text-[#29b4c4]" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>

      {/* Background Radial Glow */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(41,180,196,0.5) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(245,158,11,0.3) 0%, transparent 40%)` 
        }} 
      />

      <div className="w-full max-w-md z-10 my-auto">
        {/* Brand Logo & Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md mb-3 inline-block">
            <AzharLogo variant="light" size="lg" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {language === 'ar' ? 'منظومة إدارة مجمع أزهار السكني' : 'AZHAR RESIDENCE PORTAL'}
          </h1>
          <p className="text-cyan-300 text-xs mt-1 font-medium tracking-wide">
            {language === 'ar' ? 'بوابات التحكم الخاصة بالإدارة، الموظفين والمستأجرين' : 'Management, Staff & Tenant Login Access'}
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/40">
          
          {/* Role Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl mb-5 border border-slate-200">
            <button
              type="button"
              onClick={() => handleRoleTabChange('Admin')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                loginRole === 'Admin' 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#29b4c4]" />
              <span>{language === 'ar' ? 'الإدارة' : 'Manager'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange('Staff')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                loginRole === 'Staff' 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>{language === 'ar' ? 'الموظفين' : 'Staff'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange('Tenant')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                loginRole === 'Tenant' 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Home className="w-4 h-4 text-emerald-500" />
              <span>{language === 'ar' ? 'المستأجرين' : 'Tenant'}</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-start">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 text-start">
                {loginRole === 'Admin' ? (language === 'ar' ? 'البريد الإلكتروني (Email)' : 'Email') :
                 loginRole === 'Staff' ? (language === 'ar' ? 'كود الموظف أو الجوال (EMP Code / Mobile)' : 'Staff Code / Mobile') :
                 (language === 'ar' ? 'رقم الوحدة السكنية أو الجوال (Unit No / Mobile)' : 'Unit Number / Mobile')}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none text-slate-400`}>
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    loginRole === 'Admin' ? 'admin@azhar.com' :
                    loginRole === 'Staff' ? 'EMP-002' : '197'
                  }
                  className={`w-full py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#29b4c4] focus:bg-white transition-all text-slate-800 ${
                    language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 text-start">
                {language === 'ar' ? 'كلمة المرور (Password)' : 'Password'}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none text-slate-400`}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#29b4c4] focus:bg-white transition-all text-slate-800 ${
                    language === 'ar' ? 'pr-10 pl-10' : 'pl-10 pr-10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 ${language === 'ar' ? 'left-0 pl-3.5' : 'right-0 pr-3.5'} flex items-center text-slate-400 hover:text-slate-600`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm tracking-wide flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 text-[#29b4c4] animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4 text-[#29b4c4]" />
              )}
              <span>
                {loading
                  ? (language === 'ar' ? 'جارٍ تسجيل الدخول...' : 'Signing in...')
                  : `${t('login_button')} (${loginRole === 'Admin' ? 'الإدارة' : loginRole === 'Staff' ? 'الموظف' : 'المستأجر'})`}
              </span>
            </button>

            {serverReachable === false && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium flex items-start gap-2 text-start">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {language === 'ar'
                    ? 'تعذر الاتصال بالخادم الآن. بيانات الإدارة التجريبية لا تزال متاحة للدخول.'
                    : 'Server unreachable right now. Demo admin credentials are still available.'}
                </span>
              </div>
            )}
          </form>

          {/* Quick Demo Sign Ins Header */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center space-y-2.5">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              {language === 'ar' ? 'تسجيل دخول تجريبي مباشر لكل لوحة' : 'Quick Demo Sign In Portals'}
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={handleQuickAdminDemo}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-between border border-slate-700 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#29b4c4]" />
                  <span>{language === 'ar' ? 'لوحة تحكم الإدارة (محمد برمدة)' : 'Management Admin Panel'}</span>
                </div>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-cyan-300">Admin</span>
              </button>

              <button
                type="button"
                onClick={handleQuickStaffDemo}
                className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-between border border-amber-300 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>{language === 'ar' ? 'لوحة الموظفين والفنيين (عثمان - EMP-002)' : 'Staff Member Portal'}</span>
                </div>
                <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded text-amber-900">Staff</span>
              </button>

              <button
                type="button"
                onClick={handleQuickTenantDemo}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between border border-emerald-300 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'ar' ? 'بوابة المستأجرين (مهند سلامة - وحدة 197)' : 'Tenant Self-Service'}</span>
                </div>
                <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded text-emerald-900">Tenant</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-4 text-slate-400 text-xs">
          Azhar Residence &copy; {new Date().getFullYear()} {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
        </div>
      </div>
    </div>
  );
};

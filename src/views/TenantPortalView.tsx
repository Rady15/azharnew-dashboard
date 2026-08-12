import React, { useState } from 'react';
import { 
  Home, 
  FileText, 
  Wrench, 
  MessageSquareWarning, 
  Key, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Building, 
  Calendar, 
  Phone, 
  Send,
  User,
  ShieldCheck,
  X,
  LogOut,
  Globe
} from 'lucide-react';
import { Tenant, Contract, MaintenanceRequest, Complaint, User as UserType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TenantPortalViewProps {
  currentUser: UserType;
  tenants?: Tenant[];
  contracts?: Contract[];
  maintenanceRequests?: MaintenanceRequest[];
  complaints?: Complaint[];
  onAddMaintenanceRequest: (req: Omit<MaintenanceRequest, 'id' | 'ticketNo' | 'createdAt'>) => void;
  onAddComplaint: (comp: Omit<Complaint, 'id' | 'ticketNo' | 'createdAt'>) => void;
  onUpdateTenantPassword?: (tenantId: string, newPass: string) => void;
  onLogout?: () => void;
}

export const TenantPortalView: React.FC<TenantPortalViewProps> = ({
  currentUser,
  tenants = [],
  contracts = [],
  maintenanceRequests = [],
  complaints = [],
  onAddMaintenanceRequest,
  onAddComplaint,
  onUpdateTenantPassword,
  onLogout
}) => {
  const { language, toggleLanguage, t } = useLanguage();

  // Find tenant record
  const currentTenant = (tenants || []).find(t => 
    t.id === currentUser.tenantId || 
    t.name === currentUser.name || 
    t.unitNumber === currentUser.unitNumber ||
    t.mobile === currentUser.username
  ) || {
    id: currentUser.tenantId || '1',
    name: currentUser.name || 'مهند رجب محمد سلامة',
    fullNameArabic: 'مهند رجب محمد سلامة',
    email: currentUser.email || 'muhannad.s@azhar-residence.com',
    mobile: '0553014805',
    whatsapp: '966553014805',
    hasContract: true,
    compoundName: 'Azhar Residence',
    unitNumber: currentUser.unitNumber || '197',
    password: 'tenant101'
  };

  // Find contract for this tenant or unit
  const tenantContract = (contracts || []).find(c => 
    c.tenantId === currentTenant.id || 
    c.unitNumber === currentTenant.unitNumber ||
    (c.tenantName && c.tenantName.toLowerCase().includes(currentTenant.name.toLowerCase()))
  );

  const [activeTab, setActiveTab] = useState<'contract' | 'maintenance' | 'complaints' | 'security'>('maintenance');

  // Modals for new maintenance and new complaint
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  // New Maintenance Form State
  const [maintCategory, setMaintCategory] = useState('سباكة ومياه');
  const [maintDescription, setMaintDescription] = useState('');
  const [maintPriority, setMaintPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // New Complaint Form State
  const [compCategory, setCompCategory] = useState('إزعاج وضوضاء');
  const [compDescription, setCompDescription] = useState('');
  const [compPriority, setCompPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Password update state
  const [newPassword, setNewPassword] = useState('');
  const [passMessage, setPassMessage] = useState('');

  // Filter requests & complaints for this tenant's unit
  const myUnitNumber = currentTenant.unitNumber || '197';
  const myRequests = maintenanceRequests.filter(r => r.unitNumber === myUnitNumber || r.tenantName === currentTenant.name);
  const myComplaints = complaints.filter(c => c.unitNumber === myUnitNumber || c.complainantName === currentTenant.name);

  const handleCreateMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintDescription.trim()) return;

    onAddMaintenanceRequest({
      compoundId: '1',
      compoundName: currentTenant.compoundName || 'Azhar Residence',
      buildingNumber: tenantContract?.buildingNumber || '101',
      unitNumber: myUnitNumber,
      tenantName: currentTenant.name,
      tenantPhone: currentTenant.mobile,
      workActivity: maintCategory,
      issueDescription: maintDescription,
      priority: maintPriority,
      status: 'New',
      requestDate: new Date().toISOString().split('T')[0]
    });

    setMaintDescription('');
    setShowMaintModal(false);
  };

  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compDescription.trim()) return;

    onAddComplaint({
      complainantName: currentTenant.name,
      buildingNumber: tenantContract?.buildingNumber || '101',
      unitNumber: myUnitNumber,
      phone: currentTenant.mobile,
      category: compCategory,
      priority: compPriority,
      description: compDescription,
      status: 'New'
    });

    setCompDescription('');
    setShowComplaintModal(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    if (onUpdateTenantPassword) {
      onUpdateTenantPassword(currentTenant.id, newPassword);
    }
    setPassMessage(language === 'ar' ? 'تم تحديث كلمة المرور بنجاح!' : 'Password updated successfully!');
    setNewPassword('');
    setTimeout(() => setPassMessage(''), 4000);
  };

  return (
    <div className="p-4 sm:p-6 bg-[#181a1e] min-h-screen text-slate-100 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#1e3448] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg border border-cyan-300/30">
              <Home className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-md text-[11px] font-bold">
                  {language === 'ar' ? `الوحدة السكنية: ${myUnitNumber}` : `Unit: ${myUnitNumber}`}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md text-[11px] font-bold">
                  {tenantContract ? (language === 'ar' ? 'عقد ساري' : 'Active Contract') : (language === 'ar' ? 'مستأجر موثق' : 'Verified Tenant')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                {language === 'ar' ? `مرحباً بك، ${currentTenant.fullNameArabic || currentTenant.name}` : `Welcome, ${currentTenant.name}`}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                {language === 'ar' ? 'بوابة الخدمات الذاتية لمستأجري كمبوند أزهار السكني' : 'Azhar Residence Tenant Self-Service Portal'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">{language === 'ar' ? 'كلمة سر البوابة' : 'Portal Password'}</span>
                <span className="font-mono font-bold text-cyan-300">{currentTenant.password || 'tenant101'}</span>
              </div>
            </div>

            <button
              onClick={toggleLanguage}
              className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Globe className="w-4 h-4 text-[#29b4c4]" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>{language === 'ar' ? 'خروج' : 'Logout'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Rent & Contract Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}</p>
            <p className="text-xl font-bold text-white mt-1">
              {tenantContract ? `${tenantContract.annualRent.toLocaleString()} SAR` : '90,000 SAR'}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-medium">{language === 'ar' ? 'المبلغ المدفوع' : 'Paid Amount'}</p>
            <p className="text-xl font-bold text-emerald-300 mt-1">
              {tenantContract ? `${tenantContract.paidAmount.toLocaleString()} SAR` : '45,000 SAR'}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400 font-medium">{language === 'ar' ? 'المتبقي لصالحه' : 'Remaining Balance'}</p>
            <p className="text-xl font-bold text-amber-300 mt-1">
              {tenantContract ? `${tenantContract.remainingAmount.toLocaleString()} SAR` : '45,000 SAR'}
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-cyan-400 font-medium">{language === 'ar' ? 'طلبات الصيانة والشكاوى' : 'Active Tickets'}</p>
            <p className="text-xl font-bold text-cyan-300 mt-1">
              {myRequests.length + myComplaints.length}
            </p>
          </div>
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'maintenance' ? 'bg-[#29b4c4] text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>{language === 'ar' ? 'طلبات الصيانة' : 'Maintenance'} ({myRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'complaints' ? 'bg-[#29b4c4] text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquareWarning className="w-4 h-4" />
          <span>{language === 'ar' ? 'البلاغات والشكاوى' : 'Complaints'} ({myComplaints.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('contract')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'contract' ? 'bg-[#29b4c4] text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{language === 'ar' ? 'تفاصيل العقد المالي' : 'My Contract'}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'security' ? 'bg-[#29b4c4] text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>{language === 'ar' ? 'كلمة المرور والأمان' : 'Security'}</span>
        </button>
      </div>

      {/* TAB 1: MAINTENANCE REQUESTS */}
      {activeTab === 'maintenance' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#29b4c4]" />
                {language === 'ar' ? 'طلبات الصيانة للوحدة' : 'Unit Maintenance Tickets'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar' ? 'يمكنك تقديم طلب صيانة جديد ومتابعة حالة الفني المباشر للطلب' : 'Submit a maintenance request and track progress in real-time'}
              </p>
            </div>

            <button
              onClick={() => setShowMaintModal(true)}
              className="px-4 py-2 bg-[#29b4c4] hover:bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'طلب صيانة جديد' : 'New Maintenance Request'}</span>
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
              <p className="text-sm font-medium">{language === 'ar' ? 'لا توجد طلبات صيانة حالية لوحدتك' : 'No maintenance requests for your unit'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(req => (
                <div key={req.id} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800">
                        #{req.id}
                      </span>
                      <span className="text-xs font-bold text-white">{req.workActivity}</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                      req.status === 'Done' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      req.status === 'In Progress' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    }`}>
                      {req.status === 'In Progress' ? (language === 'ar' ? 'جاري العمل بواسطة الفني' : 'In Progress') :
                       req.status === 'Done' ? (language === 'ar' ? 'تم الإنجاز بنجاح' : 'Done') : (language === 'ar' ? 'قيد المراجعة' : 'New')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200">{req.issueDescription}</p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{language === 'ar' ? 'تاريخ الطلب:' : 'Date:'} {req.requestDate}</span>
                    {req.assignedStaffName && (
                      <span className="text-cyan-300 font-medium">
                        {language === 'ar' ? 'الفني المكلف:' : 'Assigned Tech:'} {req.assignedStaffName}
                      </span>
                    )}
                  </div>

                  {req.notes && (
                    <div className="mt-2 p-2 bg-slate-950 border border-amber-500/30 rounded text-xs text-amber-300">
                      <strong>{language === 'ar' ? 'تقرير الفني:' : 'Tech Note:'}</strong> {req.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-amber-400" />
                {language === 'ar' ? 'البلاغات والشكاوى' : 'My Complaints & Tickets'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar' ? 'تسجيل بلاغات الجيران أو النظافة أو الأمن ومتابعة الرد المباشر' : 'Log complaints or inquiries and view direct management response'}
              </p>
            </div>

            <button
              onClick={() => setShowComplaintModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'تسجيل بلاغ/شكوى جديدة' : 'New Complaint'}</span>
            </button>
          </div>

          {myComplaints.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-medium">{language === 'ar' ? 'لا توجد بلاغات مسجلة' : 'No complaint tickets'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myComplaints.map(comp => (
                <div key={comp.id} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded border border-amber-800">
                        {comp.ticketNo}
                      </span>
                      <span className="text-xs font-bold text-white">{comp.category}</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                      comp.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      comp.status === 'In Progress' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                      {comp.status === 'Resolved' ? (language === 'ar' ? 'تمت المعالجة' : 'Resolved') :
                       comp.status === 'In Progress' ? (language === 'ar' ? 'جاري المتابعة' : 'In Progress') : (language === 'ar' ? 'جديد' : 'New')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200">{comp.description}</p>

                  {comp.resolutionNotes && (
                    <div className="mt-2 p-3 bg-slate-950 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 space-y-1">
                      <strong className="block text-emerald-400 font-semibold">{language === 'ar' ? 'رد إدارة المجمع:' : 'Management Reply:'}</strong>
                      <p>{comp.resolutionNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONTRACT DETAILS */}
      {activeTab === 'contract' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileText className="w-5 h-5 text-cyan-400" />
            {language === 'ar' ? 'تفاصيل العقد والبيانات المالية' : 'Contract & Lease Details'}
          </h2>

          {tenantContract ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
              <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-white border-b border-slate-700 pb-2">{language === 'ar' ? 'بيانات العقد والوحدة' : 'Lease Info'}</h3>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">{language === 'ar' ? 'رقم العقد:' : 'Contract No:'}</span>
                  <span className="font-mono font-bold text-cyan-300">{tenantContract.contractNo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">{language === 'ar' ? 'الوحدة والمبنى:' : 'Unit & Building:'}</span>
                  <span className="font-bold text-white">وحدة {tenantContract.unitNumber} (مبنى {tenantContract.buildingNumber})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">{language === 'ar' ? 'تاريخ بداية العقد:' : 'Start Date:'}</span>
                  <span>{tenantContract.leaseStartDate}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">{language === 'ar' ? 'تاريخ نهاية العقد:' : 'End Date:'}</span>
                  <span className="text-amber-400 font-semibold">{tenantContract.leaseEndDate}</span>
                </div>
              </div>

              <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-white border-b border-slate-700 pb-2">{language === 'ar' ? 'الدفعة والمدفوعات' : 'Financials'}</h3>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">{language === 'ar' ? 'قيمة الإيجار السنوي:' : 'Annual Rent:'}</span>
                  <span className="font-bold text-white">{tenantContract.annualRent.toLocaleString()} SAR</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">{language === 'ar' ? 'طريقة الدفع:' : 'Frequency:'}</span>
                  <span>{tenantContract.paymentFrequency}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">{language === 'ar' ? 'إجمالي المدفوع:' : 'Total Paid:'}</span>
                  <span className="font-bold text-emerald-400">{tenantContract.paidAmount.toLocaleString()} SAR</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">{language === 'ar' ? 'المبلغ المتبقي:' : 'Remaining:'}</span>
                  <span className="font-bold text-amber-400">{tenantContract.remainingAmount.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-800/60 rounded-xl text-slate-300 text-xs">
              {language === 'ar' ? 'بيانات العقد الموثق مسجلة بالوحدة رقم ' : 'Contract registered under unit '}
              <strong className="text-cyan-300">{myUnitNumber}</strong>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="w-5 h-5 text-amber-400" />
            {language === 'ar' ? 'تحديث كلمة المرور الخاصة بك' : 'Update Portal Password'}
          </h2>

          {passMessage && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold">
              {passMessage}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-lg">
            <div className="relative flex-1">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg"
            >
              {language === 'ar' ? 'حفظ كلمة المرور' : 'Save Password'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL: NEW MAINTENANCE REQUEST */}
      {showMaintModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-slate-900 to-cyan-950 p-4 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#29b4c4]" />
                <h3 className="font-bold text-sm">{language === 'ar' ? 'تقديم طلب صيانة جديد' : 'New Maintenance Ticket'}</h3>
              </div>
              <button onClick={() => setShowMaintModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaintenance} className="p-5 space-y-4 text-xs text-slate-200">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-start">{language === 'ar' ? 'تصنيف الصيانة' : 'Category'}</label>
                <select
                  value={maintCategory}
                  onChange={(e) => setMaintCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
                >
                  <option value="سباكة ومياه">سباكة ومياه</option>
                  <option value="كهرباء وتكييف">كهرباء وتكييف</option>
                  <option value="أجهزة ومطبخ">أجهزة ومطبخ</option>
                  <option value="أبواب وأقفال">أبواب وأقفال</option>
                  <option value="دهانات وديكور">دهانات وديكور</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-start">{language === 'ar' ? 'الأولوية' : 'Urgency'}</label>
                <select
                  value={maintPriority}
                  onChange={(e) => setMaintPriority(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
                >
                  <option value="Low">عادية (Low)</option>
                  <option value="Medium">متوسطة (Medium)</option>
                  <option value="High">طارئة وعاجلة (High)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-start">{language === 'ar' ? 'وصف العطل أو المشكلة' : 'Issue Description'}</label>
                <textarea
                  required
                  rows={3}
                  value={maintDescription}
                  onChange={(e) => setMaintDescription(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: وجود تسريب في صنبور المطبخ أو عطل بمكيف الصالة...' : 'Describe issue...'}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMaintModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#29b4c4] hover:bg-cyan-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إرسال الطلب' : 'Submit Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW COMPLAINT */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-slate-900 to-amber-950 p-4 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">{language === 'ar' ? 'تقديم بلاغ جديد' : 'New Complaint'}</h3>
              </div>
              <button onClick={() => setShowComplaintModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-5 space-y-4 text-xs text-slate-200">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-start">{language === 'ar' ? 'نوع البلاغ' : 'Category'}</label>
                <select
                  value={compCategory}
                  onChange={(e) => setCompCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="إزعاج وضوضاء">إزعاج وضوضاء</option>
                  <option value="مواقف السيارات">مواقف السيارات</option>
                  <option value="نظافة الممرات">نظافة الممرات والحدائق</option>
                  <option value="أمن المجمع">أمن المجمع والأبواب</option>
                  <option value="خدمات المسبح">خدمات المسبح والنادي</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-start">{language === 'ar' ? 'تفاصيل الشكوى' : 'Description'}</label>
                <textarea
                  required
                  rows={3}
                  value={compDescription}
                  onChange={(e) => setCompDescription(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب تفاصيل البلاغ ليتم متابعتها من الإدارة...' : 'Write complaint details...'}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إرسال البلاغ' : 'Submit Complaint'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

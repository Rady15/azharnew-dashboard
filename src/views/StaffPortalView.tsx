import React, { useState } from 'react';
import { 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  Phone, 
  MessageSquare, 
  Building2, 
  Key, 
  Send, 
  FileText,
  Calendar,
  ShieldAlert,
  ChevronDown,
  Edit3,
  LogOut,
  Globe
} from 'lucide-react';
import { StaffMember, MaintenanceRequest, User as UserType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface StaffPortalViewProps {
  currentUser: UserType;
  staffList?: StaffMember[];
  maintenanceRequests?: MaintenanceRequest[];
  onUpdateMaintenanceStatus?: (id: string, newStatus: MaintenanceRequest['status']) => void;
  onUpdateMaintenanceNotes?: (id: string, notes: string) => void;
  onUpdateStaffPassword?: (staffId: string, newPass: string) => void;
  onLogout?: () => void;
}

export const StaffPortalView: React.FC<StaffPortalViewProps> = ({
  currentUser,
  staffList = [],
  maintenanceRequests = [],
  onUpdateMaintenanceStatus,
  onUpdateMaintenanceNotes,
  onUpdateStaffPassword,
  onLogout
}) => {
  const { language, toggleLanguage, t } = useLanguage();

  // Find staff record
  const currentStaff = (staffList || []).find(s => s.id === currentUser.staffId || s.name === currentUser.name) || {
    id: currentUser.staffId || '1',
    empCode: 'EMP-002',
    name: currentUser.name,
    role: currentUser.role || 'فني صيانة',
    mobile: '0554433221',
    whatsapp: '966554433221',
    nationalId: '2410293812',
    status: 'Active' as const,
    joiningDate: '2022-06-01',
    salary: 4500,
    password: 'emp102'
  };

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'In Progress' | 'Done' | 'New'>('ALL');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [techNotesInput, setTechNotesInput] = useState('');
  
  // Password change form
  const [newPassword, setNewPassword] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Filter tasks assigned to this staff member
  const myTasks = maintenanceRequests.filter(req => {
    const isAssignedToMe = 
      req.assignedStaffId === currentStaff.id ||
      req.assignedStaffName?.trim() === currentStaff.name.trim() ||
      (currentStaff.role.includes('مشرف') || currentStaff.role.includes('General Manager')); // Supervisors see all or assigned
    
    if (!isAssignedToMe && currentUser.role !== 'Admin') return false;

    if (filterStatus === 'ALL') return true;
    return req.status === filterStatus;
  });

  const totalMyTasks = myTasks.length;
  const inProgressCount = myTasks.filter(t => t.status === 'In Progress').length;
  const completedCount = myTasks.filter(t => t.status === 'Done').length;
  const newCount = myTasks.filter(t => t.status === 'New' || t.status === 'Awaiting Approval').length;

  const handleSaveNotes = (taskId: string) => {
    if (onUpdateMaintenanceNotes) {
      onUpdateMaintenanceNotes(taskId, techNotesInput);
    }
    setEditingNotesId(null);
    setTechNotesInput('');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    if (onUpdateStaffPassword) {
      onUpdateStaffPassword(currentStaff.id, newPassword);
    }
    setPassSuccess(language === 'ar' ? 'تم تحديث كلمة المرور بنجاح!' : 'Password updated successfully!');
    setNewPassword('');
    setTimeout(() => setPassSuccess(''), 4000);
  };

  return (
    <div className="p-4 sm:p-6 bg-[#1a1d21] min-h-screen text-slate-100 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#29b4c4] to-cyan-700 flex items-center justify-center text-white font-bold text-xl shadow-lg border border-cyan-300/30">
              {currentStaff.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-md text-[11px] font-bold">
                  {currentStaff.empCode}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-md text-[11px] font-bold">
                  {currentStaff.status === 'Active' ? (language === 'ar' ? 'على رأس العمل' : 'Active') : currentStaff.status}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                {language === 'ar' ? `مرحباً بك، ${currentStaff.name}` : `Welcome, ${currentStaff.name}`}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                {currentStaff.role} — {language === 'ar' ? 'لوحة المباشرة والعمل على المهام الموكلة' : 'Staff Control Panel & Work Dashboard'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-xs">
              <User className="w-4 h-4 text-[#29b4c4]" />
              <div>
                <span className="text-slate-400 block text-[10px]">{language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</span>
                <span className="font-mono font-bold text-emerald-400">{currentStaff.password || 'emp102'}</span>
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

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{language === 'ar' ? 'إجمالي المهام' : 'Total Tasks'}</p>
            <p className="text-2xl font-bold text-white mt-1">{totalMyTasks}</p>
          </div>
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400 font-medium">{language === 'ar' ? 'جاري العمل عليها' : 'In Progress'}</p>
            <p className="text-2xl font-bold text-amber-300 mt-1">{inProgressCount}</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-medium">{language === 'ar' ? 'المهام المنتهية' : 'Completed'}</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{completedCount}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-400 font-medium">{language === 'ar' ? 'طلبات جديدة' : 'New Requests'}</p>
            <p className="text-2xl font-bold text-purple-300 mt-1">{newCount}</p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Task Manager Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#29b4c4]" />
              {language === 'ar' ? 'قائمة المهام الموكلة وإنجاز العمل' : 'Assigned Maintenance Worklist'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'ar' ? 'يمكنك تحديث حالة المهمة وكتابة تقرير المباشرة الفنية مباشرة' : 'Update maintenance status and add technical report notes directly'}
            </p>
          </div>

          {/* Filter Status Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700 self-start sm:self-auto">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'ALL' ? 'bg-[#29b4c4] text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'All'} ({myTasks.length})
            </button>
            <button
              onClick={() => setFilterStatus('In Progress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'In Progress' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'جاري العمل' : 'In Progress'} ({inProgressCount})
            </button>
            <button
              onClick={() => setFilterStatus('Done')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'Done' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'منتهية' : 'Done'} ({completedCount})
            </button>
          </div>
        </div>

        {/* Task Cards List */}
        {myTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">{language === 'ar' ? 'لا توجد مهام موكلة مطابقة في الوقت الحالي' : 'No matching tasks assigned at the moment'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {myTasks.map(task => {
              const isEditingNotes = editingNotesId === task.id;

              return (
                <div 
                  key={task.id} 
                  className={`bg-slate-800/80 border rounded-xl p-4 transition-all hover:border-slate-600 ${
                    task.status === 'Done' 
                      ? 'border-emerald-500/30 bg-emerald-950/10' 
                      : task.status === 'In Progress'
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Task Detail */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/50">
                          #{task.id}
                        </span>
                        
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                          task.status === 'Done'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : task.status === 'In Progress'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        }`}>
                          {task.status === 'In Progress' ? (language === 'ar' ? 'جاري العمل عليها' : 'In Progress') :
                           task.status === 'Done' ? (language === 'ar' ? 'منتهية' : 'Completed') : task.status}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          task.priority === 'High' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          task.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {language === 'ar' ? `الأولوية: ${task.priority === 'High' ? 'عالية' : task.priority === 'Medium' ? 'متوسطة' : 'عادية'}` : `Priority: ${task.priority}`}
                        </span>

                        <div className="flex items-center gap-1 text-slate-400 text-xs font-medium ml-auto">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{task.requestDate}</span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white tracking-wide">
                        {task.issueDescription}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-cyan-400" />
                          <span>{language === 'ar' ? 'الوحدة' : 'Unit'}: <strong className="text-white">{task.unitNumber}</strong> (مبنى: {task.buildingNumber})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{language === 'ar' ? 'المستأجر' : 'Tenant'}: <strong className="text-white">{task.tenantName}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <a href={`tel:${task.tenantPhone}`} className="text-emerald-300 hover:underline">{task.tenantPhone}</a>
                        </div>
                        <a 
                          href={`https://wa.me/966${task.tenantPhone?.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>واتساب</span>
                        </a>
                      </div>

                      {/* Notes / Report section */}
                      {task.notes && (
                        <div className="p-2.5 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-amber-200">
                          <strong className="text-slate-400 block mb-0.5">{language === 'ar' ? 'ملاحظات الصيانة والفني:' : 'Tech Notes:'}</strong>
                          <p>{task.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Right Actions Block */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch justify-center gap-2 flex-shrink-0 min-w-[180px] border-t lg:border-t-0 lg:border-r border-slate-700 pt-3 lg:pt-0 pr-0 lg:pr-4">
                      <p className="text-[11px] font-semibold text-slate-400 text-center lg:text-start">
                        {language === 'ar' ? 'تحديث حالة العمل:' : 'Change Task Status:'}
                      </p>

                      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                        <button
                          onClick={() => onUpdateMaintenanceStatus && onUpdateMaintenanceStatus(task.id, 'In Progress')}
                          disabled={task.status === 'In Progress'}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                            task.status === 'In Progress'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 opacity-80 cursor-default'
                              : 'bg-slate-800 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'جاري العمل' : 'In Progress'}</span>
                        </button>

                        <button
                          onClick={() => onUpdateMaintenanceStatus && onUpdateMaintenanceStatus(task.id, 'Done')}
                          disabled={task.status === 'Done'}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                            task.status === 'Done'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 opacity-80 cursor-default'
                              : 'bg-slate-800 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'تم الإنجاز' : 'Mark Done'}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setEditingNotesId(isEditingNotes ? null : task.id);
                          setTechNotesInput(task.notes || '');
                        }}
                        className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-600 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#29b4c4]" />
                        <span>{language === 'ar' ? 'إضافة/تعديل تقرير الصيانة' : 'Add Tech Report'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Notes Input */}
                  {isEditingNotes && (
                    <div className="mt-4 pt-3 border-t border-slate-700 space-y-2">
                      <label className="block text-xs font-semibold text-slate-300 text-start">
                        {language === 'ar' ? 'الملاحظات الفنية وتقرير صيانة العطل:' : 'Technical Resolution Report:'}
                      </label>
                      <textarea
                        rows={2}
                        value={techNotesInput}
                        onChange={(e) => setTechNotesInput(e.target.value)}
                        placeholder={language === 'ar' ? 'اكتب تم إصلاح التسريب، تغيير المفتاح الكهربائي، إلخ...' : 'Write repair notes...'}
                        className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNotesId(null)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(task.id)}
                          className="px-4 py-1.5 bg-[#29b4c4] hover:bg-cyan-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'حفظ التقرير' : 'Save Report'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff Password Change Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-400" />
          {language === 'ar' ? 'تغيير كلمة المرور الخاصة بك' : 'Change Your Password'}
        </h2>
        <p className="text-xs text-slate-400">
          {language === 'ar' ? 'يمكنك تعيين كلمة مرور جديدة لدخول لوحة التحكم الخاصة بك مباشرة' : 'Set a new password for logging into your control panel'}
        </p>

        {passSuccess && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold">
            {passSuccess}
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
            className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg flex items-center justify-center gap-1.5"
          >
            <Key className="w-4 h-4" />
            <span>{language === 'ar' ? 'تحديث كلمة المرور' : 'Update Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

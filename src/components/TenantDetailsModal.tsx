import React from 'react';
import { X, User, Phone, Mail, Building2, FileText, Home, Calendar, DollarSign, Hash } from 'lucide-react';
import { Tenant, Contract, Unit } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TenantDetailsModalProps {
  tenant: Tenant | null;
  contracts: Contract[];
  units: Unit[];
  isOpen: boolean;
  onClose: () => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  contracts,
  units,
  isOpen,
  onClose
}) => {
  const { language } = useLanguage();

  if (!isOpen || !tenant) return null;

  const tenantContracts = contracts.filter(c => c.tenantId === tenant.id);
  const tenantUnits = units.filter(u => u.currentTenantId === tenant.id);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="bg-[#2b62af] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-cyan-300" />
            <div>
              <h2 className="text-base font-bold">
                {language === 'ar' ? `بيانات المستأجر - ${tenant.name}` : `Tenant Details - ${tenant.name}`}
              </h2>
              {tenant.fullNameArabic && (
                <p className="text-xs text-cyan-200">{tenant.fullNameArabic}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-800 bg-slate-50/50 max-h-[80vh] overflow-y-auto">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="block text-slate-400 font-semibold uppercase text-[10px]">
                {language === 'ar' ? 'العقود' : 'Contracts'}
              </span>
              <span className="text-lg font-bold text-slate-900 mt-0.5 block">{tenantContracts.length}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="block text-emerald-600 font-semibold uppercase text-[10px]">
                {language === 'ar' ? 'الوحدات' : 'Units'}
              </span>
              <span className="text-lg font-bold text-emerald-700 mt-0.5 block">{tenantUnits.length}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="block text-cyan-500 font-semibold uppercase text-[10px]">
                {language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}
              </span>
              <span className="text-lg font-bold text-cyan-700 font-mono mt-0.5 block">
                {tenant.annualRent ? `${tenant.annualRent.toLocaleString()} ر.س` : '—'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="block text-rose-500 font-semibold uppercase text-[10px]">
                {language === 'ar' ? 'المتبقي' : 'Remaining'}
              </span>
              <span className="text-lg font-bold text-rose-600 font-mono mt-0.5 block">
                {tenant.remainingAmount ? `${tenant.remainingAmount.toLocaleString()} ر.س` : '—'}
              </span>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider flex items-center gap-1.5 text-start">
              <User className="w-4 h-4 text-[#2b62af]" />
              {language === 'ar' ? 'البيانات الشخصية' : 'Personal Information'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-start">
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (EN)'}</span>
                <span className="font-bold text-slate-900 text-sm">{tenant.name}</span>
              </div>
              {tenant.fullNameArabic && (
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'الاسم بالعربية' : 'Name (AR)'}</span>
                  <span className="font-bold text-slate-900 text-sm">{tenant.fullNameArabic}</span>
                </div>
              )}
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                <span className="font-mono text-slate-800 font-semibold flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{tenant.email}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'رقم الجوال' : 'Mobile'}</span>
                <span className="font-mono text-slate-800 font-semibold flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{tenant.mobile}</span>
              </div>
              {tenant.emergencyPhone && (
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'رقم الطوارئ' : 'Emergency Phone'}</span>
                  <span className="font-mono text-slate-700">{tenant.emergencyPhone}</span>
                </div>
              )}
              {tenant.nationalId && (
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'رقم الهوية' : 'National ID'}</span>
                  <span className="font-mono text-slate-700 flex items-center gap-1"><Hash className="w-3 h-3 text-slate-400" />{tenant.nationalId}</span>
                </div>
              )}
              {tenant.nationality && (
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'الجنسية' : 'Nationality'}</span>
                  <span className="font-semibold text-slate-800">{tenant.nationality}</span>
                </div>
              )}
              {tenant.familyCount && (
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'عدد أفراد الأسرة' : 'Family Count'}</span>
                  <span className="font-semibold text-slate-800">{tenant.familyCount}</span>
                </div>
              )}
              {tenant.isMarried !== undefined && (
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'الحالة الاجتماعية' : 'Marital Status'}</span>
                  <span className="font-semibold text-slate-800">{tenant.isMarried ? (language === 'ar' ? 'متزوج' : 'Married') : (language === 'ar' ? 'أعزب' : 'Single')}</span>
                </div>
              )}
              {tenant.company && (
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'الشركة / الكفيل' : 'Company / Sponsor'}</span>
                  <span className="font-semibold text-slate-800">{tenant.company}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rental Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider flex items-center gap-1.5 text-start">
              <Home className="w-4 h-4 text-[#2b62af]" />
              {language === 'ar' ? 'بيانات الإيجار' : 'Rental Information'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-start">
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'رقم الوحدة' : 'Unit Number'}</span>
                <span className="font-bold text-slate-900 text-sm">{tenant.unitNumber || tenant.houseNumber || '—'}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'المجمع' : 'Compound'}</span>
                <span className="font-semibold text-slate-800">{tenant.compoundName || '—'}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'رقم العقد' : 'Contract Number'}</span>
                <span className="font-mono text-slate-800 font-semibold">{tenant.contractNumber || '—'}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'بداية العقد' : 'Contract Start'}</span>
                <span className="font-mono text-slate-800 flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" />{tenant.contractStartDate || '—'}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'نهاية العقد' : 'Contract End'}</span>
                <span className="font-mono text-slate-800 font-bold">{tenant.contractEndDate || '—'}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}</span>
                <span className="font-bold text-slate-900 font-mono flex items-center gap-1"><DollarSign className="w-3 h-3 text-slate-400" />{tenant.annualRent ? `${tenant.annualRent.toLocaleString()} ر.س` : '—'}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'المدفوع' : 'Paid Amount'}</span>
                <span className="font-bold text-emerald-700 font-mono">{tenant.paidAmount ? `${tenant.paidAmount.toLocaleString()} ر.س` : '—'}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'المتبقي' : 'Remaining'}</span>
                <span className="font-bold text-rose-600 font-mono">{tenant.remainingAmount ? `${tenant.remainingAmount.toLocaleString()} ر.س` : '—'}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</span>
                <span className="font-semibold text-slate-800">{tenant.paymentMethod || '—'}</span>
              </div>
            </div>
          </div>

          {/* Related Contracts */}
          {tenantContracts.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider flex items-center gap-1.5 text-start">
                <FileText className="w-4 h-4 text-[#2b62af]" />
                {language === 'ar' ? `العقود المرتبطة (${tenantContracts.length})` : `Related Contracts (${tenantContracts.length})`}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3 text-start font-semibold text-slate-600">{language === 'ar' ? 'رقم العقد' : 'Contract #'}</th>
                      <th className="py-2 px-3 text-start font-semibold text-slate-600">{language === 'ar' ? 'الوحدة' : 'Unit'}</th>
                      <th className="py-2 px-3 text-start font-semibold text-slate-600">{language === 'ar' ? 'الإيجار' : 'Rent'}</th>
                      <th className="py-2 px-3 text-start font-semibold text-slate-600">{language === 'ar' ? 'المدفوع' : 'Paid'}</th>
                      <th className="py-2 px-3 text-start font-semibold text-slate-600">{language === 'ar' ? 'المتبقي' : 'Remaining'}</th>
                      <th className="py-2 px-3 text-start font-semibold text-slate-600">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantContracts.map(c => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{c.contractNo}</td>
                        <td className="py-2 px-3 text-slate-700">Bld {c.buildingNumber} - {c.unitNumber}</td>
                        <td className="py-2 px-3 font-mono text-slate-800">{c.annualRent.toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono text-emerald-700">{c.paidAmount.toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono text-rose-600">{c.remainingAmount.toLocaleString()}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : c.status === 'Archived' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-800'}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {tenant.workNotes && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-start">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider">
                {language === 'ar' ? 'ملاحظات' : 'Notes'}
              </h3>
              <p className="text-slate-700 text-xs leading-relaxed">{tenant.workNotes}</p>
            </div>
          )}
          {tenant.tenantRemarks && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-start">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider">
                {language === 'ar' ? 'ملاحظات المستأجر' : 'Tenant Remarks'}
              </h3>
              <p className="text-slate-700 text-xs leading-relaxed">{tenant.tenantRemarks}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors">
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

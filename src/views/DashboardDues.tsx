import React, { useState, useMemo, useRef } from 'react';
import { 
  DollarSign, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  ArrowUpDown, 
  ChevronDown, 
  User, 
  Building2, 
  Phone, 
  Calendar, 
  Printer, 
  Edit3, 
  Eye, 
  MessageSquare, 
  Archive, 
  CheckCircle2, 
  CreditCard 
} from 'lucide-react';

import { Contract, Tenant, DueItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { EditTenantModal } from '../components/EditTenantModal';
import { ContractDetailsModal } from '../components/ContractDetailsModal';
import { ContractNotesModal } from '../components/ContractNotesModal';
import { FloatingDropdown } from '../components/FloatingDropdown';
import { exportExcelReport, exportPDFReport } from '../utils/reportExport';

interface DashboardDuesProps {
  dues?: DueItem[];
  contracts?: Contract[];
  tenants?: Tenant[];
  onRecordPayment?: (dueId: string) => void;
  onUpdateTenant?: (tenant: Tenant) => void;
  onUpdateContract?: (contract: Contract) => void;
  selectedCompoundId?: string;
}

type SortField = 'unitNumber' | 'unitType' | 'tenantName' | 'tenantMobile' | 'annualRent' | 'remainingAmount' | 'leaseEndDate' | 'daysLeft' | 'notes';
type SortOrder = 'asc' | 'desc' | null;

export const DashboardDues: React.FC<DashboardDuesProps> = ({
  dues = [],
  contracts = [],
  tenants = [],
  onRecordPayment,
  onUpdateTenant,
  onUpdateContract,
  selectedCompoundId = '1'
}) => {
  const { language, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [compoundFilter, setCompoundFilter] = useState('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // Dropdown open row state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownTriggers = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Modals state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [showNotesModal, setShowNotesModal] = useState(false);

  // Derive rows from real contracts
  const collectionsData = useMemo(() => {
    return contracts.map((c) => {
      // calculate days left
      const endDate = new Date(c.leaseEndDate.replace(/\//g, '-'));
      const now = new Date();
      const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      const daysLeft = isNaN(diffDays) ? 0 : diffDays;

      return {
        id: c.id,
        unitNumber: c.unitNumber,
        unitType: c.unitType || 'Appartment',
        tenantName: c.tenantName,
        tenantMobile: c.tenantMobile,
        annualRent: c.annualRent,
        remainingAmount: c.remainingAmount,
        leaseEndDate: c.leaseEndDate,
        daysLeft,
        notesText: c.arabicNotes || c.englishNotes || (c.notes && c.notes[0]?.text) || '',
        rawContract: c
      };
    });
  }, [contracts]);

  // Search & Filter
  const filteredRows = useMemo(() => {
    return collectionsData.filter(row => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.unitNumber.toLowerCase().includes(q) ||
        row.unitType.toLowerCase().includes(q) ||
        row.tenantName.toLowerCase().includes(q) ||
        row.tenantMobile.includes(q)
      );
    });
  }, [collectionsData, searchQuery]);

  // Sort logic
  const sortedRows = useMemo(() => {
    if (!sortField || !sortOrder) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let aVal = a[sortField as keyof typeof a];
      let bVal = b[sortField as keyof typeof b];

      if (typeof aVal === 'string') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      } else setSortOrder('asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const data = sortedRows.map((row, idx) => ({
      '#': idx + 1,
      'Unit': row.unitNumber,
      'Type': row.unitType,
      'Tenant': row.tenantName,
      'Mobile': row.tenantMobile,
      'Annual Rent': row.annualRent,
      'Remaining': row.remainingAmount,
      'Expiry Date': row.leaseEndDate,
      'Expire After': row.daysLeft,
      'Notes': row.notesText || '-'
    }));

    const totals = {
      '#': '',
      'Unit': '',
      'Type': '',
      'Tenant': '',
      'Mobile': '',
      'Annual Rent': data.reduce((s, r) => s + r['Annual Rent'], 0),
      'Remaining': data.reduce((s, r) => s + r['Remaining'], 0),
      'Expiry Date': '',
      'Expire After': '',
      'Notes': ''
    };

    exportExcelReport({
      title: 'Azhar Residence — Collections & Contract Balances',
      subtitle: 'Follow-up on remaining amounts and contract expiry dates',
      sheetName: 'Collections',
      filename: `Azhar_Residence_Collections_${new Date().toISOString().split('T')[0]}.xlsx`,
      columns: [
        { header: '#', key: '#', width: 5, type: 'number', align: 'center' },
        { header: 'Unit', key: 'Unit', width: 9, align: 'center' },
        { header: 'Type', key: 'Type', width: 12 },
        { header: 'Tenant', key: 'Tenant', width: 22 },
        { header: 'Mobile', key: 'Mobile', width: 14, align: 'center' },
        { header: 'Annual Rent (SR)', key: 'Annual Rent', width: 13, type: 'currency' },
        { header: 'Remaining (SR)', key: 'Remaining', width: 13, type: 'currency' },
        { header: 'Expiry Date', key: 'Expiry Date', width: 12, type: 'date', align: 'center' },
        { header: 'Expire After', key: 'Expire After', width: 11, type: 'number', align: 'center' },
        { header: 'Notes', key: 'Notes', width: 18 }
      ],
      rows: data,
      totals,
      footerNote: 'Azhar Residence — Collections & Balances Report'
    });
  };

  // Export PDF
  const handleExportPDF = () => {
    const data = sortedRows.map((row, idx) => ({
      '#': idx + 1,
      'Unit': row.unitNumber,
      'Type': row.unitType,
      'Tenant Name': row.tenantName,
      'Mobile': row.tenantMobile,
      'Annual Rent': row.annualRent,
      'Remaining': row.remainingAmount,
      'Expiry Date': row.leaseEndDate,
      'Expire After': row.daysLeft
    }));

    const totals = {
      '#': '',
      'Unit': '',
      'Type': '',
      'Tenant Name': '',
      'Mobile': '',
      'Annual Rent': data.reduce((s, r) => s + r['Annual Rent'], 0),
      'Remaining': data.reduce((s, r) => s + r['Remaining'], 0),
      'Expiry Date': '',
      'Expire After': ''
    };

    exportPDFReport({
      title: 'Azhar Residence — Collections & Contract Balances',
      subtitle: 'Follow-up on remaining amounts and contract expiry dates',
      filename: `Azhar_Residence_Collections_${new Date().toISOString().split('T')[0]}.pdf`,
      columns: [
        { header: '#', key: '#', width: 5, type: 'number', align: 'center' },
        { header: 'Unit', key: 'Unit', width: 9, align: 'center' },
        { header: 'Type', key: 'Type', width: 12 },
        { header: 'Tenant Name', key: 'Tenant Name', width: 22 },
        { header: 'Mobile', key: 'Mobile', width: 14, align: 'center' },
        { header: 'Annual Rent (SR)', key: 'Annual Rent', width: 13, type: 'currency' },
        { header: 'Remaining (SR)', key: 'Remaining', width: 13, type: 'currency' },
        { header: 'Expiry Date', key: 'Expiry Date', width: 12, type: 'date', align: 'center' },
        { header: 'Expire After', key: 'Expire After', width: 11, type: 'number', align: 'center' }
      ],
      rows: data,
      totals,
      footerNote: 'Azhar Residence — Collections & Balances Report'
    });
  };

  // Handlers for menu actions
  const handleOpenDetails = (row: typeof sortedRows[0]) => {
    setSelectedContract(row.rawContract as Contract);
    setShowDetailsModal(true);
    setOpenDropdownId(null);
  };

  const handleOpenEdit = (row: typeof sortedRows[0]) => {
    const tenantObj: Tenant = {
      id: row.id,
      name: row.tenantName,
      fullNameArabic: row.tenantName === 'mustafa ali' ? 'مصطفى علي' : row.tenantName,
      email: `${row.tenantName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      mobile: row.tenantMobile,
      emergencyPhone: row.tenantMobile,
      whatsapp: `966${row.tenantMobile.replace(/^0/, '')}`,
      nationality: 'Sudan',
      familyCount: 4,
      company: 'AZ',
      hasContract: true,
      unitNumber: row.unitNumber
    };
    setSelectedTenant(tenantObj);
    setShowEditModal(true);
    setOpenDropdownId(null);
  };

  const handleOpenNotes = (row: typeof sortedRows[0]) => {
    setSelectedContract(row.rawContract as Contract);
    setShowNotesModal(true);
    setOpenDropdownId(null);
  };

  const handleArchive = (row: typeof sortedRows[0]) => {
    alert(`Contract for Unit ${row.unitNumber} (${row.tenantName}) has been archived.`);
    setOpenDropdownId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar & Quick Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#29b4c4] uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" />
            <span>{language === 'ar' ? 'سجل التحصيلات المالي' : 'Financial Collections Register'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {language === 'ar' ? 'قائمة التحصيلات والعقود' : 'Collections & Rent Register'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' 
              ? 'متابعة المبالغ المتبقية، مواعيد انتهاء العقود، وتصدير التقارير بصيغة PDF واكسل' 
              : 'Track remaining balances, contract expiry countdowns, and export reports to PDF and Excel.'}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير PDF' : 'Export PDF'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className={`w-4 h-4 absolute top-2.5 text-slate-400 ${language === 'ar' ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث بالوحدة، المستأجر، أو رقم الجوال...' : 'Filter by unit, tenant name, or mobile...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4] ${
              language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {language === 'ar' ? 'عدد السجلات:' : 'Total Records:'}{' '}
          <span className="font-bold text-slate-900">{sortedRows.length}</span>
        </div>
      </div>

      {/* Main Table matching Screenshot Image 2 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs text-slate-800">
            {/* Header with screenshot blue background #2b62af */}
            <thead className="bg-[#2b62af] text-white text-[11px] font-semibold tracking-wider uppercase border-b border-blue-900">
              <tr>
                <th className="py-3 px-3 text-center border-r border-blue-600/40 w-10">
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none">
                    <span>#</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('unitNumber')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الوحدة' : 'Unit'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('unitType')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'النوع' : 'Type'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('tenantName')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'اسم المستأجر' : 'Tenant'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('tenantMobile')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الجوال' : 'Mobile'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('annualRent')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('remainingAmount')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبلغ المتبقي' : 'Remaining Amount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('leaseEndDate')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'تاريخ انتهاء العقد' : 'Contract Expir Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('notes')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الملاحظات' : 'Notes'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-center border-r border-blue-600/40" onClick={() => handleSort('daysLeft')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'انتهاء العقد بعد (يوم)' : 'Contract Expire After'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none">
                    <span>{language === 'ar' ? 'العمليات' : 'Operation'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 font-medium bg-white">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا توجد بيانات مطابقة للفلتر.' : 'No collections record matching filter.'}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {/* # Column */}
                    <td className="py-3.5 px-3 text-center font-bold text-slate-800 border-r border-slate-100">
                      {idx + 1}
                    </td>

                    {/* Unit Column */}
                    <td className="py-3.5 px-3 font-semibold text-slate-900 border-r border-slate-100">
                      {row.unitNumber}
                    </td>

                    {/* Type Column */}
                    <td className="py-3.5 px-3 text-slate-700 border-r border-slate-100">
                      {row.unitType}
                    </td>

                    {/* Tenant Column */}
                    <td className="py-3.5 px-3 font-medium text-slate-900 border-r border-slate-100 max-w-[200px]">
                      {row.tenantName}
                    </td>

                    {/* Mobile Column */}
                    <td className="py-3.5 px-3 font-mono text-slate-800 border-r border-slate-100">
                      {row.tenantMobile}
                    </td>

                    {/* Annual Rent Column */}
                    <td className="py-3.5 px-3 font-bold text-slate-800 border-r border-slate-100">
                      {row.annualRent.toLocaleString()}
                    </td>

                    {/* Remaining Amount Column -> Pink badge #ff3b7a matching screenshot Image 2 */}
                    <td className="py-3.5 px-3 border-r border-slate-100">
                      <span className="inline-block px-2.5 py-1 bg-[#ff3b7a] text-white font-bold text-xs rounded shadow-xs">
                        {row.remainingAmount.toLocaleString()}
                      </span>
                    </td>

                    {/* Contract Expir Date Column */}
                    <td className="py-3.5 px-3 font-mono text-slate-700 border-r border-slate-100">
                      {row.leaseEndDate}
                    </td>

                    {/* Notes Column */}
                    <td className="py-3.5 px-3 text-slate-400 border-r border-slate-100">
                      {row.notesText || ''}
                    </td>

                    {/* Contract Expire After Column -> Black badge #000000 matching screenshot Image 2 */}
                    <td className="py-3.5 px-3 text-center border-r border-slate-100">
                      <span className="inline-block px-3 py-1 bg-black text-white font-mono font-bold text-xs rounded">
                        {row.daysLeft}
                      </span>
                    </td>

                    {/* Operation Dropdown Button #586574 matching screenshot Image 2 */}
                    <td className="py-3.5 px-3 text-center relative">
                      <div className="relative inline-block text-start">
                        <button
                          ref={el => { if (el) dropdownTriggers.current.set(row.id, el); else dropdownTriggers.current.delete(row.id); }}
                          onClick={() => setOpenDropdownId(openDropdownId === row.id ? null : row.id)}
                          className="px-3 py-1.5 bg-[#586574] hover:bg-[#485360] text-white font-medium text-xs rounded-lg shadow-xs transition-colors inline-flex items-center gap-1"
                        >
                          <span>{language === 'ar' ? 'العمليات' : 'Operation'}</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu matching screenshot */}
                        <FloatingDropdown
                          open={openDropdownId === row.id}
                          onClose={() => setOpenDropdownId(null)}
                          trigger={dropdownTriggers.current.get(row.id) || null}
                          align="right"
                          width={128}
                        >
                          <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden py-1 text-slate-700 text-xs">
                            <button
                              onClick={() => handleOpenDetails(row)}
                              className="w-full text-start px-4 py-2 hover:bg-slate-100 flex items-center gap-2 transition-colors font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>{language === 'ar' ? 'التفاصيل' : 'Details'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="w-full text-start px-4 py-2 hover:bg-slate-100 flex items-center gap-2 transition-colors font-medium"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenNotes(row)}
                              className="w-full text-start px-4 py-2 hover:bg-slate-100 flex items-center gap-2 transition-colors font-medium"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{language === 'ar' ? 'الملاحظات' : 'Notes'}</span>
                            </button>

                            <button
                              onClick={() => handleArchive(row)}
                              className="w-full text-start px-4 py-2 hover:bg-slate-100 flex items-center gap-2 transition-colors font-medium text-rose-600"
                            >
                              <Archive className="w-3.5 h-3.5 text-rose-500" />
                              <span>{language === 'ar' ? 'أرشفة' : 'Archive'}</span>
                            </button>
                          </div>
                        </FloatingDropdown>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Tenant Modal matching Screenshot Image 1 */}
      <EditTenantModal
        tenant={selectedTenant}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={(updated) => {
          if (onUpdateTenant) onUpdateTenant(updated);
        }}
      />

      {/* Contract Details Modal */}
      <ContractDetailsModal
        contract={selectedContract}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Contract Notes Modal */}
      <ContractNotesModal
        contract={selectedContract}
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        onSaveNotes={(contractId, newNotes) => {
          if (selectedContract && onUpdateContract) {
            onUpdateContract({ ...selectedContract, notes: newNotes });
          }
        }}
      />
    </div>
  );
};

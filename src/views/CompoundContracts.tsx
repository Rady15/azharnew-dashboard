import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Archive, 
  CheckCircle2, 
  Printer, 
  ChevronDown, 
  User, 
  DollarSign, 
  Edit3, 
  Eye, 
  CreditCard, 
  MessageSquare, 
  History, 
  ShieldAlert, 
  Send, 
  X, 
  Building, 
  Phone, 
  Check, 
  Lock,
  MessageCircle,
  Clock,
  ChevronRight,
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, Tenant, Unit, PaymentRecord } from '../types';
import { AzharLogo } from '../components/AzharLogo';
import { EditTenantModal } from '../components/EditTenantModal';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';

interface CompoundContractsProps {
  contracts: Contract[];
  tenants: Tenant[];
  units: Unit[];
  showArchivedOnly?: boolean;
  onAddContract: (contract: Omit<Contract, 'id'>) => void;
  onUpdateContract: (updated: Contract) => void;
  onToggleArchive: (id: string) => void;
  selectedCompoundId: string;
}

export const CompoundContracts: React.FC<CompoundContractsProps> = ({
  contracts,
  tenants,
  units,
  showArchivedOnly = false,
  onAddContract,
  onUpdateContract,
  onToggleArchive,
}) => {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      setSortConfig({ field, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ field, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeModal, setActiveModal] = useState<{
    type: 'details' | 'edit' | 'payment' | 'notes' | 'unit_history' | 'tenant_history' | 'print' | null;
    contract: Contract | null;
  }>({ type: null, contract: null });

  // Add Form State
  const [newContractNo, setNewContractNo] = useState(`2024${Math.floor(10000 + Math.random() * 90000)}`);
  const [tenantId, setTenantId] = useState(tenants[0]?.id || '');
  const [unitId, setUnitId] = useState(units[0]?.id || '');
  const [representative, setRepresentative] = useState('Mohammed Barmada');
  const [startDate, setStartDate] = useState('01/10/2024');
  const [durationMonths, setDurationMonths] = useState(12);
  const [annualRent, setAnnualRent] = useState(45000);
  const [unitType, setUnitType] = useState('Appartment');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(18750);
  const [tenantMobile, setTenantMobile] = useState('0550896224');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [waterMeterCost, setWaterMeterCost] = useState(0);
  const [paymentFrequency, setPaymentFrequency] = useState<'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual'>('Quarterly');

  // Edit Form state
  const [editForm, setEditForm] = useState<Partial<Contract>>({});
  const [editWaterMeterCost, setEditWaterMeterCost] = useState(0);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMonth, setPaymentMonth] = useState(new Date().getMonth() + 1);
  const [paymentYear, setPaymentYear] = useState(new Date().getFullYear());
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('Paid');

  // Contract payments list
  const [contractPayments, setContractPayments] = useState<PaymentRecord[]>([]);

  // Notes state for selected contract
  const [newNoteText, setNewNoteText] = useState('');

  // Payment table state (for expanded row)
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentEntries, setPaymentEntries] = useState(10);
  const [paymentPage, setPaymentPage] = useState(1);

  const filteredContracts = contracts.filter(c => {
    const isArchived = c.status === 'Archived';
    if (showArchivedOnly ? !isArchived : isArchived) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.contractNo.toLowerCase().includes(q) ||
        c.tenantName.toLowerCase().includes(q) ||
        c.unitNumber.toLowerCase().includes(q) ||
        c.tenantMobile.toLowerCase().includes(q) ||
        (c.emergencyPhone && c.emergencyPhone.includes(q))
      );
    }
    return true;
  });

  const sortedContracts = React.useMemo(() => {
    if (!sortConfig) return filteredContracts;
    return [...filteredContracts].sort((a: any, b: any) => {
      let aVal = a[sortConfig.field];
      let bVal = b[sortConfig.field];
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal, 'ar', { numeric: true })
          : bVal.localeCompare(aVal, 'ar', { numeric: true });
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredContracts, sortConfig]);

  // Calculate totals matching screenshot total (1,203,000 SAR)
  const totalAnnualRent = filteredContracts.reduce((sum, c) => sum + (c.annualRent || 0), 0);
  const totalPaid = filteredContracts.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const totalRemaining = filteredContracts.reduce((sum, c) => sum + (c.remainingAmount || (c.annualRent - (c.paidAmount || 0))), 0);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selTenant = tenants.find(t => t.id === tenantId);
    const selUnit = units.find(u => u.id === unitId);

    const rent = Number(annualRent);
    const paid = Number(paidAmount);
    const disc = Number(discount);
    const waterCost = Number(waterMeterCost || 0);
    const total = rent + waterCost;
    const rem = total - disc - paid;

    onAddContract({
      contractNo: newContractNo,
      compoundId: '1',
      compoundName: 'Azhar Residence',
      buildingNumber: selUnit?.buildingNumber || '101',
      unitNumber: selUnit?.unitNumber || '203',
      unitType: unitType || selUnit?.type || 'Appartment',
      tenantId: selTenant?.id || '1',
      tenantName: selTenant?.name || 'New Tenant',
      tenantMobile: tenantMobile || selTenant?.mobile || '',
      emergencyPhone: emergencyPhone,
      representativeName: representative,
      leaseStartDate: startDate,
      leaseDurationMonths: Number(durationMonths),
      leaseEndDate: '01/10/2025',
      annualRent: rent,
      waterYearlyBill: waterCost,
      totalYearlyRent: total,
      discount: disc,
      paidAmount: paid,
      remainingAmount: rem > 0 ? rem : 0,
      paymentFrequency: paymentFrequency,
      status: 'Active',
      notes: [],
      installments: [
        { id: '1', installmentNo: 1, dueDate: startDate, amount: paid, paidDate: startDate, status: 'Paid' }
      ]
    });

    setShowAddModal(false);
  };

  const handleOpenEdit = (c: Contract) => {
    setEditForm({ ...c });
    setEditWaterMeterCost(c.waterYearlyBill || 0);
    setActiveModal({ type: 'edit', contract: c });
    setOpenDropdownId(null);
  };

  const loadContractPayments = async (contract: Contract) => {
    try {
      const allPayments = await apiService.getPayments();
      const filtered = allPayments.filter(p => p.tenantId === contract.tenantId || p.unitNumber === contract.unitNumber);
      setContractPayments(filtered);
    } catch (err) {
      console.error('Failed to load payments', err);
      setContractPayments([]);
    }
  };

  const handleRecordPayment = async () => {
    if (!activeModal.contract || paymentAmount <= 0) return;
    try {
      const newPayment = await apiService.addPayment({
        tenantId: activeModal.contract.tenantId,
        tenantName: activeModal.contract.tenantName,
        unitNumber: activeModal.contract.unitNumber,
        amount: paymentAmount,
        month: paymentMonth,
        year: paymentYear,
        paymentMethod,
        status: paymentStatus
      });
      setContractPayments(prev => [...prev, newPayment]);
      setPaymentAmount(0);
      alert(language === 'ar' ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully');
    } catch (err) {
      console.error('Failed to record payment', err);
      alert(language === 'ar' ? 'فشل تسجيل الدفعة' : 'Failed to record payment');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModal.contract && editForm.id) {
      const rent = Number(editForm.annualRent || 0);
      const paid = Number(editForm.paidAmount || 0);
      const disc = Number(editForm.discount || 0);
      const waterCost = Number(editWaterMeterCost || 0);
      const total = rent + waterCost;
      const rem = total - disc - paid;

      const updatedContract: Contract = {
        ...(activeModal.contract),
        ...(editForm as Contract),
        waterYearlyBill: waterCost,
        totalYearlyRent: total,
        paymentFrequency: (editForm as any).paymentMethod || editForm.paymentFrequency || 'Quarterly',
        remainingAmount: rem >= 0 ? rem : 0
      };

      onUpdateContract(updatedContract);
      setActiveModal({ type: null, contract: null });
    }
  };

  const handleWhatsAppSend = (c: Contract) => {
    const rawMobile = c.tenantMobile ? c.tenantMobile.replace(/\D/g, '') : '';
    const formattedPhone = rawMobile.startsWith('0') ? `966${rawMobile.slice(1)}` : rawMobile.startsWith('966') ? rawMobile : `966${rawMobile}`;
    const text = encodeURIComponent(
      `مرحباً السيد/ة ${c.tenantName} المحترم،\n` +
      `تحية طيبة من إدارة كمبوند أزهار (Azhar Residence).\n` +
      `نود إشعاركم بتفاصيل عقد إيجار الوحدة رقم (${c.unitNumber}) - عقد رقم (${c.contractNo}).\n` +
      `إجمالي الإيجار السنوي: ${c.annualRent.toLocaleString()} ريال.\n` +
      `المبلغ المدفوع: ${c.paidAmount.toLocaleString()} ريال.\n` +
      `المبلغ المتبقي: ${c.remainingAmount.toLocaleString()} ريال.\n` +
      `نتمنى لكم إقامة سعيدة، وفي حال وجود أي استفسار يرجى التواصل معنا.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
    setOpenDropdownId(null);
  };

  const handleToggleBlock = (c: Contract) => {
    const updatedStatus = c.status === 'Blocked' ? 'Active' : 'Blocked';
    onUpdateContract({ ...c, status: updatedStatus });
    setOpenDropdownId(null);
  };

  const handleAddNote = (c: Contract) => {
    if (!newNoteText.trim()) return;
    const existingNotes = c.notes || [];
    const newNote = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-GB'),
      author: 'Mohammed Barmada',
      text: newNoteText.trim()
    };
    const updated = {
      ...c,
      notes: [newNote, ...existingNotes]
    };
    onUpdateContract(updated);
    setActiveModal({ type: 'notes', contract: updated });
    setNewNoteText('');
  };

  const handleExportExcel = () => {
    const exportData = filteredContracts.map((c, idx) => ({
      '#': idx + 1,
      'Contract No': c.contractNo,
      'Unit #': c.unitNumber,
      'Type': c.unitType || 'Appartment',
      'Tenant Name': c.tenantName,
      'Mobile': c.tenantMobile || '-',
      'Emergency Phone': c.emergencyPhone || '-',
      'Representative': c.representativeName || 'Mohammed Barmada',
      'Annual Rent (SAR)': c.annualRent,
      'Paid Amount (SAR)': c.paidAmount,
      'Remaining (SAR)': c.remainingAmount,
      'Start Date': c.leaseStartDate,
      'End Date': c.leaseEndDate,
      'Duration (Months)': c.leaseDurationMonths || 12,
      'Status': c.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contracts');
    XLSX.writeFile(workbook, `Azhar_Residence_Contracts_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFillColor(43, 98, 175);
    doc.rect(0, 0, 297, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('Azhar Residence - Contracts & Editing Register', 14, 13);

    const headers = [
      '#', 'Contract No', 'Unit #', 'Type', 'Tenant Name', 'Mobile', 'Representative', 'Annual Rent', 'Paid', 'Remaining', 'End Date'
    ];

    const body = filteredContracts.map((c, idx) => [
      idx + 1,
      c.contractNo,
      c.unitNumber,
      c.unitType || 'Appartment',
      c.tenantName,
      c.tenantMobile || '-',
      c.representativeName || 'Mohammed Barmada',
      `${c.annualRent.toLocaleString()} SAR`,
      `${c.paidAmount.toLocaleString()} SAR`,
      `${c.remainingAmount.toLocaleString()} SAR`,
      c.leaseEndDate
    ]);

    autoTable(doc, {
      startY: 25,
      head: [headers],
      body: body,
      theme: 'grid',
      headStyles: {
        fillColor: [43, 98, 175],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      }
    });

    doc.save(`Azhar_Residence_Contracts_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-5 dir-rtl text-right">
      {/* Header Banner with Azhar Residence Branding */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-slate-900 rounded-xl shadow-md hidden sm:block">
            <AzharLogo variant="light" size="sm" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#29b4c4] uppercase tracking-wider mb-0.5">
              <FileText className="w-4 h-4" />
              <span>كمبوند أزهار - Azhar Residence</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {showArchivedOnly ? 'العقود المؤرشفة - كمبوند أزهار' : 'سجل العقود والتحرير (Contract Management)'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              إدارة جميع عقود الإيجار، العمليات والتحرير، متابعة المبالغ المدفوعة والمتبقية، والطباعة الرسمية.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير إكسل</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير PDF</span>
          </button>

          {!showArchivedOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عقد جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Summary Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم العقد، اسم المستأجر، رقم الوحدة، أو رقم الهوية والجوال..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
          />
        </div>

        {/* Total Stats Pills */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl font-semibold text-slate-700">
            عدد العقود: <span className="font-bold text-slate-900">{filteredContracts.length}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-semibold text-emerald-800">
            المحصل: <span className="font-bold font-mono">{totalPaid.toLocaleString()} SAR</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold text-amber-800">
            المتبقي: <span className="font-bold font-mono">{totalRemaining.toLocaleString()} SAR</span>
          </div>
        </div>
      </div>

      {/* Main Contracts Table Matching Screenshot (Image 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-bold tracking-wider select-none border-b border-blue-900">
              <tr>
                <th className="py-3 px-2 text-center w-8 border-r border-blue-600/40">+</th>
                <th className="py-3 px-3 text-center border-r border-blue-600/40">#</th>
                
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('contractNo')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم العقد' : 'Contract No'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('unitNumber')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم الوحدة' : 'Unit #'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('unitType')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'النوع' : 'Type'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('annualRent')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('discount')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الخصم' : 'Discount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('paidAmount')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبلغ المدفوع' : 'Paid Amount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('remainingAmount')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبلغ المتبقي' : 'Remaining Amount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('tenantName')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'اسم المستأجر' : 'Tenant Name'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('tenantMobile')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الجوال' : 'Mobile'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('emergencyPhone')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم الطوارئ' : 'Emergency Phone'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('representativeName')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'اسم الممثل' : 'Representative Name'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('leaseStartDate')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'تاريخ البداية' : 'Start Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('leaseDurationMonths')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المدة (شهر)' : 'Duration'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-center">
                  <span>{language === 'ar' ? 'العمليات' : 'Operations'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium bg-white">
              {sortedContracts.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400 font-medium">
                    {language === 'ar' ? 'لا توجد عقود مطابقة للبحث حالياً في مجمع أزهار السكني.' : 'No contracts match search criteria.'}
                  </td>
                </tr>
              ) : (
                sortedContracts.map((c, idx) => {
                  const isExpanded = expandedRowId === c.id;
                  const isBlocked = c.status === 'Blocked';

                  return (
                    <React.Fragment key={c.id}>
                      <tr className={`hover:bg-cyan-50/40 transition-colors ${isBlocked ? 'bg-rose-50/50' : ''}`}>
                        {/* Expand Icon */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : c.id)}
                            className="w-5 h-5 bg-slate-100 hover:bg-[#29b4c4] hover:text-white rounded text-slate-600 font-bold flex items-center justify-center transition-colors text-[11px]"
                          >
                            {isExpanded ? '-' : '+'}
                          </button>
                        </td>

                        {/* Row Number */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-l border-slate-100">
                          {idx + 3}
                        </td>

                        {/* Contract No */}
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-l border-slate-100">
                          <span className="flex items-center gap-1">
                            {c.contractNo}
                            {isBlocked && (
                              <span className="px-1 py-0.5 bg-rose-600 text-white text-[9px] rounded font-sans">
                                Blocked
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Unit # */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 border-l border-slate-100">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {c.unitNumber}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3 text-slate-700 border-l border-slate-100 whitespace-nowrap">
                          {c.unitType || 'Appartment'}
                        </td>

                        {/* Annual Rent */}
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900 border-l border-slate-100">
                          {c.annualRent.toLocaleString()}
                        </td>

                        {/* Discount */}
                        <td className="py-2.5 px-3 text-left font-mono text-slate-600 border-l border-slate-100">
                          {c.discount || 0}
                        </td>

                        {/* Paid Amount */}
                        <td className="py-2.5 px-3 text-left font-mono font-semibold text-emerald-700 border-l border-slate-100">
                          {c.paidAmount.toLocaleString()}
                        </td>

                        {/* Remaining Amount */}
                        <td className="py-2.5 px-3 text-left font-mono font-semibold text-amber-700 border-l border-slate-100">
                          {c.remainingAmount.toLocaleString()}
                        </td>

                        {/* Tenant Name */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 border-l border-slate-100 whitespace-nowrap">
                          {c.tenantName}
                        </td>

                        {/* Mobile */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 border-l border-slate-100">
                          {c.tenantMobile || '-'}
                        </td>

                        {/* Emergency Phone */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 border-l border-slate-100">
                          {c.emergencyPhone || '-'}
                        </td>

                        {/* Representative Name */}
                        <td className="py-2.5 px-3 text-slate-700 border-l border-slate-100 whitespace-nowrap">
                          {c.representativeName || 'Mohammed Barmada'}
                        </td>

                        {/* Start Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 border-l border-slate-100 whitespace-nowrap">
                          {c.leaseStartDate}
                        </td>

                        {/* Duration */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 border-l border-slate-100">
                          {c.leaseDurationMonths || 12}
                        </td>

                        {/* Operations Dropdown Button Matching Screenshot */}
                        <td className="py-2.5 px-3 text-center relative">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setActiveModal({ type: 'payment', contract: c });
                                loadContractPayments(c);
                                setOpenDropdownId(null);
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md shadow-sm transition-all flex items-center justify-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>{language === 'ar' ? 'دفع' : 'Pay'}</span>
                            </button>
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === c.id ? null : c.id)}
                              className="px-3 py-1 bg-[#475569] hover:bg-[#334155] text-white text-[11px] font-bold rounded-md shadow-sm transition-all flex items-center justify-center gap-1"
                            >
                              <span>{language === 'ar' ? 'العمليات' : 'Operation'}</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>

                          {/* EXACT OPERATIONS DROPDOWN FROM SCREENSHOT (IMAGE 2) */}
                          {openDropdownId === c.id && (
                            <div 
                              className="absolute left-1/2 -translate-x-1/2 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-2xl py-1 z-50 text-right text-xs font-medium text-slate-700"
                              onMouseLeave={() => setOpenDropdownId(null)}
                            >
                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'details', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'التفاصيل' : 'Details'}</span>
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(c)}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                                <Edit3 className="w-3.5 h-3.5 text-cyan-600" />
                              </button>

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'payment', contract: c });
                                  loadContractPayments(c);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'سجل الدفعات' : 'Payment'}</span>
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                              </button>

                              <button
                                onClick={() => {
                                  onToggleArchive(c.id);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{c.status === 'Archived' ? (language === 'ar' ? 'إلغاء الأرشفة' : 'Unarchive') : (language === 'ar' ? 'أرشفة العقد' : 'Archive')}</span>
                                <Archive className="w-3.5 h-3.5 text-amber-600" />
                              </button>

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'notes', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'الملاحظات' : 'Notes'}</span>
                                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                              </button>

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'unit_history', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'سجل الوحدة' : 'Unit History'}</span>
                                <History className="w-3.5 h-3.5 text-blue-600" />
                              </button>

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'tenant_history', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'سجل المستأجر' : 'Tenant History'}</span>
                                <User className="w-3.5 h-3.5 text-violet-600" />
                              </button>

                              <button
                                onClick={() => handleWhatsAppSend(c)}
                                className="w-full text-right px-4 py-2 hover:bg-[#25D366]/10 hover:text-emerald-700 flex items-center justify-between text-emerald-600"
                              >
                                <span>{language === 'ar' ? 'إرسال واتساب' : 'Send whatsapp'}</span>
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </button>

                              <button
                                onClick={() => handleToggleBlock(c)}
                                className="w-full text-right px-4 py-2 hover:bg-rose-50 flex items-center justify-between text-rose-600"
                              >
                                <span>{isBlocked ? (language === 'ar' ? 'إلغاء الحظر' : 'Unblock') : (language === 'ar' ? 'حظر العقد' : 'Block')}</span>
                                <Lock className="w-3.5 h-3.5 text-rose-600" />
                              </button>

                              <div className="border-t border-slate-100 my-1" />

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'print', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-900"
                              >
                                <span>{language === 'ar' ? 'طباعة العقد' : 'Print'}</span>
                                <Printer className="w-3.5 h-3.5 text-slate-700" />
                              </button>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {activeModal.type === 'payment' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#29b4c4]" />
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'ar' ? 'تسجيل دفعة' : 'Record Payment'} - {activeModal.contract.contractNo}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            {/* Payment Recording Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                {language === 'ar' ? 'تسجيل دفعة جديدة' : 'Record New Payment'}
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (SAR)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Month</label>
                  <select
                    value={paymentMonth}
                    onChange={(e) => setPaymentMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={paymentYear}
                    onChange={(e) => setPaymentYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  >
                    <option value="Cash">Cash (نقدي)</option>
                    <option value="Card">Card (بطاقة)</option>
                    <option value="BankTransfer">Bank Transfer (تحويل بنكي)</option>
                    <option value="Check">Check (شيك)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleRecordPayment}
                disabled={paymentAmount <= 0}
                className="w-full py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {language === 'ar' ? 'تسجيل الدفعة' : 'Record Payment'}
              </button>
            </div>

            {/* Payments List */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                {language === 'ar' ? 'سجل الدفعات' : 'Payment History'}
              </h4>
              {contractPayments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  {language === 'ar' ? 'لا توجد دفعات مسجلة' : 'No payments recorded'}
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {contractPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{p.amount.toLocaleString()} SAR</p>
                        <p className="text-[10px] text-slate-500">
                          {p.paymentDate || `${p.month}/${p.year}`} · {p.paymentMethod} · {p.status}
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        p.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-slate-200">
                          <td colSpan={17} className="p-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="text-slate-400 font-semibold block mb-1">تفاصيل العقد:</span>
                                <p className="font-bold text-slate-900">كمبوند أزهار (Azhar Residence)</p>
                                <p className="text-slate-600">الوحدة: {c.unitNumber} ({c.unitType})</p>
                                <p className="text-slate-600">ممثل المالك: {c.representativeName}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-semibold block mb-1">بيانات المستأجر:</span>
                                <p className="font-bold text-slate-900">{c.tenantName}</p>
                                <p className="text-slate-600">الجوال: {c.tenantMobile}</p>
                                <p className="text-slate-600">رقم الطوارئ: {c.emergencyPhone || '-'}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-semibold block mb-1">الملخص المالي:</span>
                                <p className="text-slate-700">الإيجار السنوي: <span className="font-bold font-mono">{c.annualRent.toLocaleString()} SAR</span></p>
                                <p className="text-emerald-700">المدفوع: <span className="font-bold font-mono">{c.paidAmount.toLocaleString()} SAR</span></p>
                                <p className="text-amber-700">المتبقي: <span className="font-bold font-mono">{c.remainingAmount.toLocaleString()} SAR</span></p>
                              </div>
                              <div className="flex flex-col justify-between">
                                <div>
                                  <span className="text-slate-400 font-semibold block mb-1">الملاحظات الداخلية:</span>
                                  <p className="text-slate-600 italic">
                                    {c.notes && c.notes.length > 0 ? c.notes[0].text : 'لا توجد ملاحظات مسجلة على العقد.'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={() => handleOpenEdit(c)}
                                    className="px-3 py-1 bg-slate-800 text-white rounded text-[11px] font-bold flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    تحرير البيانات
                                  </button>
                                  <button
                                    onClick={() => setActiveModal({ type: 'print', contract: c })}
                                    className="px-3 py-1 bg-[#29b4c4] text-white rounded text-[11px] font-bold flex items-center gap-1"
                                  >
                                    <Printer className="w-3 h-3" />
                                    طباعة
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Total Row matching Screenshot (Image 2 Total: 1,203,000) */}
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
              <tr>
                <td colSpan={5} className="py-3 px-4 text-right">
                  إجمالي العقود الكلي (Total Annual Rent):
                </td>
                <td className="py-3 px-3 text-left font-mono font-black text-slate-900 text-sm">
                  {totalAnnualRent.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-left font-mono text-slate-600">0</td>
                <td className="py-3 px-3 text-left font-mono font-bold text-emerald-700">
                  {totalPaid.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-left font-mono font-bold text-amber-700">
                  {totalRemaining.toLocaleString()}
                </td>
                <td colSpan={8} className="py-3 px-4 text-left text-slate-500 font-normal">
                  كمبوند أزهار (Azhar Residence)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* CREATE NEW CONTRACT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AzharLogo variant="dark" size="sm" />
                <h3 className="text-base font-bold text-slate-900 mr-2">
                  تحرير عقد جديد - كمبوند أزهار
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم العقد (Contract No)</label>
                  <input
                    type="text"
                    required
                    value={newContractNo}
                    onChange={(e) => setNewContractNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اختر المستأجر</label>
                  <select
                    value={tenantId}
                    onChange={(e) => {
                      setTenantId(e.target.value);
                      const t = tenants.find(x => x.id === e.target.value);
                      if (t) setTenantMobile(t.mobile);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.mobile})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اختر الوحدة (Unit #)</label>
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {units.map(u => (
                      <option key={u.id} value={u.id}>
                        وحدة {u.unitNumber} ({u.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع الوحدة (Type)</label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Appartment">Appartment</option>
                    <option value="Villa Duplex">Villa Duplex</option>
                    <option value="Villa">Villa</option>
                    <option value="Warehouse">Warehouse</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اسم الممثل</label>
                  <input
                    type="text"
                    value={representative}
                    onChange={(e) => setRepresentative(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم الجوال (Mobile)</label>
                  <input
                    type="text"
                    value={tenantMobile}
                    onChange={(e) => setTenantMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم الطوارئ (Emergency)</label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

               <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1">الإيجار السنوي</label>
                   <input
                     type="number"
                     value={annualRent}
                     onChange={(e) => setAnnualRent(Number(e.target.value))}
                     className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                   />
                 </div>

                 <div>
                   <label className="block font-semibold text-slate-700 mb-1">تكلفة عداد المياه</label>
                   <input
                     type="number"
                     value={waterMeterCost}
                     onChange={(e) => setWaterMeterCost(Number(e.target.value))}
                     className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                   />
                 </div>

                 <div>
                   <label className="block font-semibold text-slate-700 mb-1">الخصم (Discount)</label>
                   <input
                     type="number"
                     value={discount}
                     onChange={(e) => setDiscount(Number(e.target.value))}
                     className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                   />
                 </div>

                 <div>
                   <label className="block font-semibold text-slate-700 mb-1">المبلغ المدفوع</label>
                   <input
                     type="number"
                     value={paidAmount}
                     onChange={(e) => setPaidAmount(Number(e.target.value))}
                     className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-emerald-700 font-bold"
                   />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1">طريقة الدفع</label>
                   <select
                     value={paymentFrequency}
                     onChange={(e) => setPaymentFrequency(e.target.value as any)}
                     className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                   >
                     <option value="Monthly">Monthly (شهري)</option>
                     <option value="Bi-Monthly">Bi-Monthly (كل شهرين)</option>
                     <option value="Quarterly">Quarterly (ربع سنوي)</option>
                     <option value="Semi-Annual">Semi-Annual (نصف سنوي)</option>
                     <option value="Annual">Annual (سنوي)</option>
                   </select>
                 </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">إجمالي قيمة العقد ( Rent + Water )</label>
                  <div className="w-full px-3 py-2 bg-[#29b4c4]/10 border border-[#29b4c4]/30 rounded-xl font-mono font-bold text-[#0e7a87] text-center">
                    {(annualRent + waterMeterCost).toLocaleString()} SAR
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">المبلغ المتبقي</label>
                  <div className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl font-mono text-amber-800 font-bold text-center">
                    {(annualRent + waterMeterCost - discount - paidAmount).toLocaleString()} SAR
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاريخ بداية العقد (Start Date)</label>
                  <input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مدة العقد (شهور)</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value={6}>6 شهور</option>
                    <option value={12}>12 شهر (سنة واحدة)</option>
                    <option value={24}>24 شهر (سنتين)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  اعتماد وحفظ العقد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTRACT MODAL */}
      {activeModal.type === 'edit' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#29b4c4]" />
                <h3 className="text-base font-bold text-slate-900">
                  تعديل بيانات العقد رقم ({activeModal.contract.contractNo})
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contract No</label>
                    <input
                      type="text"
                      value={editForm.contractNo || ''}
                      onChange={(e) => setEditForm({ ...editForm, contractNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tenant Name</label>
                    <input
                      type="text"
                      value={editForm.tenantName || ''}
                      onChange={(e) => setEditForm({ ...editForm, tenantName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unit #</label>
                    <input
                      type="text"
                      value={editForm.unitNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, unitNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Type</label>
                    <select
                      value={editForm.unitType || ''}
                      onChange={(e) => setEditForm({ ...editForm, unitType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Apartment">Apartment</option>
                      <option value="Villa Duplex">Villa Duplex</option>
                      <option value="Villa">Villa</option>
                      <option value="Warehouse">Warehouse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Representative Name</label>
                    <input
                      type="text"
                      value={editForm.representativeName || ''}
                      onChange={(e) => setEditForm({ ...editForm, representativeName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mobile</label>
                    <input
                      type="text"
                      value={editForm.tenantMobile || ''}
                      onChange={(e) => setEditForm({ ...editForm, tenantMobile: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Emergency Phone</label>
                    <input
                      type="text"
                      value={editForm.emergencyPhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">National ID / Iqama</label>
                    <input
                      type="text"
                      value={(editForm as any).nationalId || ''}
                      onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value } as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Monthly Rent</label>
                    <input
                      type="number"
                      value={editForm.monthlyRent || 0}
                      onChange={(e) => setEditForm({ ...editForm, monthlyRent: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Annual Rent</label>
                    <input
                      type="number"
                      value={editForm.annualRent || 0}
                      onChange={(e) => setEditForm({ ...editForm, annualRent: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Discount</label>
                    <input
                      type="number"
                      value={editForm.discount || 0}
                      onChange={(e) => setEditForm({ ...editForm, discount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Water Meter Cost (Yearly)</label>
                    <input
                      type="number"
                      value={editWaterMeterCost}
                      onChange={(e) => setEditWaterMeterCost(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={editForm.paymentMethod || 'Quarterly'}
                      onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Bi-Monthly">Bi-Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Semi-Annual">Semi-Annual</option>
                      <option value="Annual">Annual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Number</label>
                    <input
                      type="text"
                      value={editForm.paymentNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, paymentNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Electricity Meter Number</label>
                    <input
                      type="text"
                      value={editForm.electricityMeterNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, electricityMeterNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="text"
                      value={editForm.leaseStartDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, leaseStartDate: e.target.value })}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="text"
                      value={editForm.leaseEndDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, leaseEndDate: e.target.value })}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Duration (Months)</label>
                    <input
                      type="number"
                      value={editForm.leaseDurationMonths || 12}
                      onChange={(e) => setEditForm({ ...editForm, leaseDurationMonths: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Insurance</label>
                    <input
                      type="number"
                      value={editForm.insurance || 0}
                      onChange={(e) => setEditForm({ ...editForm, insurance: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Commission</label>
                    <input
                      type="number"
                      value={editForm.commission || 0}
                      onChange={(e) => setEditForm({ ...editForm, commission: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.verifiedInEjar !== false}
                        onChange={(e) => setEditForm({ ...editForm, verifiedInEjar: e.target.checked })}
                        className="w-4 h-4 text-[#29b4c4]"
                      />
                      <span className="font-semibold text-slate-700">Verified in Ejar</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.transferAccountToTenant !== false}
                        onChange={(e) => setEditForm({ ...editForm, transferAccountToTenant: e.target.checked })}
                        className="w-4 h-4 text-[#29b4c4]"
                      />
                      <span className="font-semibold text-slate-700">Transfer Account</span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={editForm.status || 'Active'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Archived">Archived</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">English Notes</label>
                    <textarea
                      value={editForm.englishNotes || ''}
                      onChange={(e) => setEditForm({ ...editForm, englishNotes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Arabic Notes</label>
                    <textarea
                      value={editForm.arabicNotes || ''}
                      onChange={(e) => setEditForm({ ...editForm, arabicNotes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="bg-[#29b4c4]/10 border border-[#29b4c4]/30 rounded-xl p-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Total Contract Value ( Rent + Water )</span>
                  <span className="font-mono font-bold text-[#0e7a87] text-lg">
                    SR {(Number(editForm.annualRent || 0) + Number(editWaterMeterCost || 0)).toLocaleString()}
                  </span>
                </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="text"
                    value={editForm.leaseStartDate || ''}
                    onChange={(e) => setEditForm({ ...editForm, leaseStartDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    value={editForm.leaseDurationMonths || 12}
                    onChange={(e) => setEditForm({ ...editForm, leaseDurationMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal({ type: null, contract: null })}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {activeModal.type === 'details' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#29b4c4]" />
                <h3 className="text-base font-bold text-slate-900">
                  تفاصيل العقد الكاملة - كمبوند أزهار
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">رقم العقد:</span>
                  <span className="font-mono font-bold text-slate-900">{activeModal.contract.contractNo}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">المشروع:</span>
                  <span className="font-bold text-[#29b4c4]">Azhar Residence (كمبوند أزهار)</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">رقم الوحدة ونوعها:</span>
                  <span className="font-bold text-slate-900">وحدة {activeModal.contract.unitNumber} ({activeModal.contract.unitType})</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">اسم المستأجر:</span>
                  <span className="font-bold text-slate-900">{activeModal.contract.tenantName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">الجوال:</span>
                  <span className="font-mono">{activeModal.contract.tenantMobile}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">رقم الطوارئ:</span>
                  <span className="font-mono">{activeModal.contract.emergencyPhone || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">اسم الممثل:</span>
                  <span className="font-bold">{activeModal.contract.representativeName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">تاريخ البداية والمدة:</span>
                  <span>{activeModal.contract.leaseStartDate} ({activeModal.contract.leaseDurationMonths} شهر)</span>
                </div>
              </div>

              <div className="bg-cyan-50/50 p-4 rounded-xl border border-cyan-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">الإيجار السنوي</span>
                  <span className="font-bold font-mono text-slate-900">{activeModal.contract.annualRent.toLocaleString()} SAR</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">المدفوع</span>
                  <span className="font-bold font-mono text-emerald-700">{activeModal.contract.paidAmount.toLocaleString()} SAR</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">المتبقي</span>
                  <span className="font-bold font-mono text-amber-700">{activeModal.contract.remainingAmount.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="w-full py-2 bg-slate-800 text-white font-bold rounded-xl"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {activeModal.type === 'payment' && activeModal.contract && (
        (() => {
          const c = activeModal.contract;
          const today = new Date();
          const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const buildingNo = (c.unitNumber || '').split('-')[0] || '-';
          const installments = c.installments || [];
          const totalPaid = installments.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0) || c.paidAmount || 0;
          const searchQ = paymentSearch.toLowerCase();
          const filteredInst = installments.filter(inst =>
            !searchQ ||
            inst.dueDate.toLowerCase().includes(searchQ) ||
            (inst.receiptNo || '').toLowerCase().includes(searchQ) ||
            (inst.user || '').toLowerCase().includes(searchQ) ||
            (inst.comments || '').toLowerCase().includes(searchQ)
          );
          const totalPages = Math.max(1, Math.ceil(filteredInst.length / paymentEntries));
          const safePage = Math.min(paymentPage, totalPages);
          const pageRows = filteredInst.slice((safePage - 1) * paymentEntries, safePage * paymentEntries);
          const from = filteredInst.length === 0 ? 0 : (safePage - 1) * paymentEntries + 1;
          const to = Math.min(safePage * paymentEntries, filteredInst.length);
          const invoices = installments.filter(i => i.status === 'Paid').map((i, idx) => ({
            id: i.receiptNo || `E-${10000 + idx}`,
            date: i.paidDate || i.dueDate,
            amount: i.amount,
            method: i.paymentMethod || 'Cash',
            type: 'installments'
          }));
          return (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 border border-slate-200 space-y-4 my-6">

                {/* Header like attachment */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">Payment</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{todayLabel}</p>
                  </div>
                  <button
                    onClick={() => setActiveModal({ type: null, contract: null })}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xl"
                  >
                    &times;
                  </button>
                </div>

                {/* Tenant summary like attachment */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wide">Tenant Name</span>
                    <span className="font-bold text-slate-900">{c.tenantName}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wide">Building Number</span>
                    <span className="font-bold text-slate-900">{buildingNo}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wide">Unit Number</span>
                    <span className="font-bold text-slate-900">{c.unitNumber}</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <span className="text-emerald-600 block text-[10px] font-bold uppercase tracking-wide">Total Payments</span>
                    <span className="font-bold text-emerald-800 font-mono">{totalPaid.toLocaleString()}٫00</span>
                  </div>
                </div>

                {/* Record Payment */}
                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                  <button
                    onClick={() => {
                      setActiveModal({ type: 'payment', contract: c });
                      loadContractPayments(c);
                    }}
                    className="w-full py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    {language === 'ar' ? 'تسجيل دفعة جديدة' : 'Record New Payment'}
                  </button>
                </div>

                {/* Due Payments Table like attachment */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-semibold">Show</span>
                      <select
                        value={paymentEntries}
                        onChange={(e) => { setPaymentEntries(Number(e.target.value)); setPaymentPage(1); }}
                        className="border border-slate-300 rounded px-1 py-0.5 text-xs"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                      </select>
                      <span className="text-slate-500 font-semibold">entries</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-semibold">Search:</span>
                      <input
                        type="text"
                        value={paymentSearch}
                        onChange={(e) => { setPaymentSearch(e.target.value); setPaymentPage(1); }}
                        className="border border-slate-300 rounded px-2 py-0.5 text-xs"
                      />
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase">
                        <th className="py-2 px-3 text-start font-bold">#</th>
                        <th className="py-2 px-3 text-start font-bold">Due Date</th>
                        <th className="py-2 px-3 text-start font-bold">Amount</th>
                        <th className="py-2 px-3 text-start font-bold">Remaining Amount</th>
                        <th className="py-2 px-3 text-start font-bold">Paid Amount</th>
                        <th className="py-2 px-3 text-start font-bold">Last payment Date</th>
                        <th className="py-2 px-3 text-start font-bold">User</th>
                        <th className="py-2 px-3 text-start font-bold">Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400 italic">No data available in table</td>
                        </tr>
                      ) : (
                        pageRows.map((inst, i) => {
                          const paid = inst.status === 'Paid' ? inst.amount : 0;
                          const rem = inst.amount - paid;
                          return (
                            <tr key={inst.id || i} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-500">{(safePage - 1) * paymentEntries + i + 1}</td>
                              <td className="py-2 px-3 font-mono">{inst.dueDate}</td>
                              <td className="py-2 px-3 font-mono">{inst.amount.toLocaleString()}٫00</td>
                              <td className="py-2 px-3 font-mono text-amber-600">{rem.toLocaleString()}٫00</td>
                              <td className="py-2 px-3 font-mono text-emerald-600">{paid.toLocaleString()}٫00</td>
                              <td className="py-2 px-3 font-mono">{inst.paidDate || '-'}</td>
                              <td className="py-2 px-3">{inst.user || '-'}</td>
                              <td className="py-2 px-3 text-slate-500">{inst.comments || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Showing {from} to {to} of {filteredInst.length} entries
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPaymentPage(Math.max(1, safePage - 1))}
                        disabled={safePage <= 1}
                        className="px-2 py-1 border border-slate-300 rounded text-slate-600 disabled:opacity-40 hover:bg-white"
                      >
                        Previous
                      </button>
                      <span className="px-2.5 py-1 bg-cyan-600 text-white rounded font-bold">{safePage}</span>
                      <button
                        onClick={() => setPaymentPage(Math.min(totalPages, safePage + 1))}
                        disabled={safePage >= totalPages}
                        className="px-2 py-1 border border-slate-300 rounded text-slate-600 disabled:opacity-40 hover:bg-white"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>

                {/* Other Payments Table like attachment */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 text-sm">Other Payments</h4>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase">
                        <th className="py-2 px-3 text-start font-bold">#</th>
                        <th className="py-2 px-3 text-start font-bold">Insurence</th>
                        <th className="py-2 px-3 text-start font-bold">Commession</th>
                        <th className="py-2 px-3 text-start font-bold">Other</th>
                        <th className="py-2 px-3 text-start font-bold">Total Paid</th>
                        <th className="py-2 px-3 text-start font-bold">MonyFlow</th>
                        <th className="py-2 px-3 text-start font-bold">Payment Date</th>
                        <th className="py-2 px-3 text-start font-bold">User</th>
                        <th className="py-2 px-3 text-start font-bold">Comments</th>
                        <th className="py-2 px-3 text-start font-bold">Operations</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400 italic">No data available in table</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Invoices Table like attachment */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 text-sm">Invoices</h4>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase">
                        <th className="py-2 px-3 text-start font-bold">#</th>
                        <th className="py-2 px-3 text-start font-bold">Invoice Id</th>
                        <th className="py-2 px-3 text-start font-bold">Payment Date</th>
                        <th className="py-2 px-3 text-start font-bold">Paid Amount</th>
                        <th className="py-2 px-3 text-start font-bold">Payment Method</th>
                        <th className="py-2 px-3 text-start font-bold">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400 italic">No data available in table</td>
                        </tr>
                      ) : (
                        invoices.map((inv, i) => (
                          <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                            <td className="py-2 px-3 font-mono text-cyan-700 font-bold">{inv.id}</td>
                            <td className="py-2 px-3 font-mono">{inv.date}</td>
                            <td className="py-2 px-3 font-mono font-bold">{inv.amount.toLocaleString()}٫00</td>
                            <td className="py-2 px-3">{inv.method}</td>
                            <td className="py-2 px-3 text-slate-500">{inv.type}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          );
        })()
      )}

      {/* NOTES MODAL */}
      {activeModal.type === 'notes' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  ملاحظات العقد - وحدة #{activeModal.contract.unitNumber}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="أضف ملاحظة إدارية جديدة للعقد..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <button
                  onClick={() => handleAddNote(activeModal.contract!)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
                >
                  إضافة
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(!activeModal.contract.notes || activeModal.contract.notes.length === 0) ? (
                  <p className="text-slate-400 italic text-center py-4">لا توجد ملاحظات مسجلة بعد.</p>
                ) : (
                  activeModal.contract.notes.map((n) => (
                    <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{n.author}</span>
                        <span>{n.date}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{n.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIT HISTORY MODAL */}
      {activeModal.type === 'unit_history' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  سجل الوحدة (Unit History) - وحدة #{activeModal.contract.unitNumber}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <p className="font-bold text-blue-900">كمبوند أزهار - Azhar Residence</p>
                <p className="text-blue-700">رقم الوحدة: {activeModal.contract.unitNumber} | النوع: {activeModal.contract.unitType}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">العقود التاريخية للوحدة:</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>العقد الحالي #{activeModal.contract.contractNo}</span>
                    <span className="text-emerald-600 font-mono">{activeModal.contract.annualRent.toLocaleString()} SAR</span>
                  </div>
                  <p className="text-slate-600 mt-1">المستأجر: {activeModal.contract.tenantName}</p>
                  <p className="text-slate-500 text-[10px]">تاريخ البداية: {activeModal.contract.leaseStartDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TENANT HISTORY MODAL */}
      {activeModal.type === 'tenant_history' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-bold text-slate-900">
                  سجل المستأجر (Tenant History) - {activeModal.contract.tenantName}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-violet-50 p-3 rounded-xl border border-violet-200">
                <p className="font-bold text-violet-900">{activeModal.contract.tenantName}</p>
                <p className="text-violet-700 font-mono">الجوال: {activeModal.contract.tenantMobile} | الطوارئ: {activeModal.contract.emergencyPhone || '-'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">العقد الحالي بـ كمبوند أزهار</p>
                <p className="text-slate-600">وحدة #{activeModal.contract.unitNumber} - الإيجار: {activeModal.contract.annualRent.toLocaleString()} SAR</p>
                <p className="text-slate-600">حالة السداد: مدفوع {activeModal.contract.paidAmount.toLocaleString()} SAR / متبقي {activeModal.contract.remainingAmount.toLocaleString()} SAR</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT FORMAL CONTRACT MODAL */}
      {activeModal.type === 'print' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 border border-slate-300 space-y-6 text-slate-900 my-8">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <AzharLogo variant="dark" size="lg" />
              <div className="text-left dir-ltr">
                <h2 className="text-lg font-black tracking-widest text-slate-900">LEASE AGREEMENT</h2>
                <p className="text-xs font-mono font-bold text-[#29b4c4]">Contract #: {activeModal.contract.contractNo}</p>
                <p className="text-[10px] text-slate-500">Date: {activeModal.contract.leaseStartDate}</p>
              </div>
            </div>

            <div className="text-center my-4">
              <h1 className="text-xl font-black tracking-tight text-slate-900 underline underline-offset-8 decoration-2">
                عقد إيجار موحد - كمبوند أزهار (Azhar Residence)
              </h1>
            </div>

            {/* Terms Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 p-3 font-bold border-b border-slate-300 grid grid-cols-2">
                <span>الطرف الأول (المؤجر): إدارة كمبوند أزهار</span>
                <span>الطرف الثاني (المستأجر): {activeModal.contract.tenantName}</span>
              </div>
              <div className="p-4 space-y-2 bg-white">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span><strong>رقم الوحدة:</strong> {activeModal.contract.unitNumber}</span>
                  <span><strong>نوع الوحدة:</strong> {activeModal.contract.unitType}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span><strong>رقم الطوارئ:</strong> {activeModal.contract.emergencyPhone || '-'}</span>
                  <span><strong>رقم الجوال:</strong> {activeModal.contract.tenantMobile}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span><strong>مدة العقد:</strong> {activeModal.contract.leaseDurationMonths} شهر</span>
                  <span><strong>تاريخ البداية:</strong> {activeModal.contract.leaseStartDate}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 bg-slate-50 p-2 rounded">
                  <span><strong>الإيجار السنوي:</strong> {activeModal.contract.annualRent.toLocaleString()} SAR</span>
                  <span><strong>المدفوع:</strong> {activeModal.contract.paidAmount.toLocaleString()} SAR</span>
                  <span><strong>المتبقي:</strong> {activeModal.contract.remainingAmount.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800 mb-1">الشروط والأحكام الإيجارية:</p>
              <p>1. يتعهد المستأجر بالمحافظة على العين المؤجرة والمرافق العامة بـ كمبوند أزهار.</p>
              <p>2. يتم سداد المبالغ المتبقية في المواعيد المحددة وحسب الجدول الزمني المعتمد.</p>
              <p>3. هذا العقد موثق ومعتمد رسمياً من قبل إدارة كمبوند أزهار (Azhar Residence).</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs text-center font-bold">
              <div>
                <p className="mb-8">توقيع الطرف الأول (إدارة كمبوند أزهار)</p>
                <p className="text-slate-400 font-normal">___________________________</p>
                <p className="mt-1 text-[10px] text-slate-500">{activeModal.contract.representativeName}</p>
              </div>
              <div>
                <p className="mb-8">توقيع الطرف الثاني (المستأجر)</p>
                <p className="text-slate-400 font-normal">___________________________</p>
                <p className="mt-1 text-[10px] text-slate-500">{activeModal.contract.tenantName}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                طباعة العقد الآن (Print Document)
              </button>
              <button
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

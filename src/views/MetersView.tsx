import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Droplet, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  Building2,
  ArrowUpDown
} from 'lucide-react';
import { ElectricityMeter, WaterMeter } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface MetersViewProps {
  type: 'water' | 'electricity';
  waterMeters: WaterMeter[];
  electricityMeters: ElectricityMeter[];
  onAddWaterMeter: (meter: Omit<WaterMeter, 'id'>) => void;
  onAddElectricityMeter: (meter: Omit<ElectricityMeter, 'id'>) => void;
  onToggleTransfer: (id: string) => void;
}

export const MetersView: React.FC<MetersViewProps> = ({
  type,
  waterMeters,
  electricityMeters,
  onAddWaterMeter,
  onAddElectricityMeter,
  onToggleTransfer
}) => {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
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

  // Form states
  const [building, setBuilding] = useState('143');
  const [unitNo, setUnitNo] = useState('143');
  const [meterNo, setMeterNo] = useState('482990');
  const [paymentNo, setPaymentNo] = useState('10001899990');

  const filteredWater = waterMeters.filter(m => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.building.toLowerCase().includes(q) || m.meterNumber.includes(q);
    }
    return true;
  });

  const sortedWater = useMemo(() => {
    if (!sortConfig) return filteredWater;
    return [...filteredWater].sort((a: any, b: any) => {
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
  }, [filteredWater, sortConfig]);

  const filteredElec = electricityMeters.filter(m => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.building.toLowerCase().includes(q) || m.meterNumber.includes(q) || m.unitNumber.includes(q);
    }
    return true;
  });

  const sortedElec = useMemo(() => {
    if (!sortConfig) return filteredElec;
    return [...filteredElec].sort((a: any, b: any) => {
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
  }, [filteredElec, sortConfig]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'water') {
      onAddWaterMeter({
        building: building,
        meterNumber: meterNo,
        lastReading: 1200,
        readingDate: new Date().toISOString().split('T')[0]
      });
    } else {
      onAddElectricityMeter({
        building: building,
        unitNumber: unitNo,
        type: 'Villa Duplex',
        representativeName: 'Mohamed Khair',
        isRented: true,
        transferredToTenant: false,
        meterNumber: meterNo,
        paymentNumber: paymentNo
      });
    }
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#29b4c4] uppercase tracking-wider mb-1">
            {type === 'water' ? <Droplet className="w-4 h-4 text-blue-500" /> : <Zap className="w-4 h-4 text-amber-500" />}
            <span>{language === 'ar' ? 'عدادات الخدمات والعد الكهروماء' : 'Utility Metering'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {type === 'water' 
              ? (language === 'ar' ? 'دليل عدادات المياه للمباني' : 'Buildings Water Meters Directory') 
              : (language === 'ar' ? 'عدادات الكهرباء ونقل الحساب للمستأجر' : 'Unit Electricity Meters & Account Transfer')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'تتبع الأرقام التسلسلية للعدادات، أرقام حسابات السداد، وحالة نقل العدادات الرسمية باسم المستأجرين.' : 'Track utility meter identification numbers, payment accounts, and official SEC tenant transfer statuses.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {type === 'water' ? (language === 'ar' ? 'إضافة عداد مياه' : 'Add Water Meter') : (language === 'ar' ? 'إضافة عداد كهرباء' : 'Add Electricity Meter')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className={`w-4 h-4 absolute top-2.5 text-slate-400 ${language === 'ar' ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث برقم المبنى، رقم الوحدة، أو رقم العداد...' : 'Search by building, unit #, or meter serial number...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4] ${
              language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>
      </div>

      {/* Table Rendering */}
      {type === 'water' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-blue-900 select-none">
              <tr>
                <th className="py-3 px-3 border-r border-blue-600/40 w-10 text-center">#</th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('building')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'اسم المبنى / البلوك' : 'Building Name / Block'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('meterNumber')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الرقم التسلسلي لعداد المياه' : 'Water Meter Serial Number'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-left font-mono" onClick={() => handleSort('lastReading')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'آخر قراءة (م³)' : 'Last Reading (m³)'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center font-mono" onClick={() => handleSort('readingDate')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'تاريخ القراءة' : 'Reading Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <span>{language === 'ar' ? 'العمليات' : 'Operations'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {sortedWater.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا توجد عدادات مياه مطابقة للبحث.' : 'No water meters found.'}
                  </td>
                </tr>
              ) : (
                sortedWater.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 border-l border-slate-100">{m.building}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#1a7f8b] border-l border-slate-100">{m.meterNumber}</td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-slate-800 border-l border-slate-100">{m.lastReading || '1,450'}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500 border-l border-slate-100">{m.readingDate || '2026-08-01'}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => alert(`تعديل عداد المياه ${m.meterNumber}`)}
                        className="px-3 py-1 bg-[#475569] hover:bg-[#334155] text-white text-[11px] font-bold rounded-md shadow-sm transition-all"
                      >
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700 border-collapse">
              <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-blue-900 select-none">
                <tr>
                  <th className="py-3 px-3 border-r border-blue-600/40 w-10 text-center">#</th>
                  <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('building')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'المبنى' : 'Building'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('unitNumber')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'رقم الوحدة' : 'Unit #'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'النوع' : 'Type'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('representativeName')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'الممثل' : 'Representative'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('transferredToTenant')}>
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'محول باسم المستأجر' : 'Transferred To Tenant'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('meterNumber')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'رقم عداد الكهرباء' : 'Electricity Meter No'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('paymentNumber')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'رقم الحساب / السداد' : 'Payment No'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <span>{language === 'ar' ? 'العمليات' : 'Operations'}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium bg-white">
                {sortedElec.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      {language === 'ar' ? 'لا توجد عدادات كهرباء مطابقة للبحث.' : 'No electricity meters found.'}
                    </td>
                  </tr>
                ) : (
                  sortedElec.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 border-l border-slate-100">{m.building}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 border-l border-slate-100">{language === 'ar' ? `وحدة ${m.unitNumber}` : `Unit ${m.unitNumber}`}</td>
                      <td className="py-3 px-3 text-slate-600 border-l border-slate-100">{m.type || 'فيلا دوبلكس'}</td>
                      <td className="py-3 px-3 text-slate-600 border-l border-slate-100">{m.representativeName || 'محمد خير'}</td>
                      <td className="py-3 px-3 text-center border-l border-slate-100">
                        {m.transferredToTenant ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {language === 'ar' ? 'نعم (محول للمستأجر)' : 'Yes (Transferred)'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <XCircle className="w-3 h-3 text-amber-600" />
                            {language === 'ar' ? 'لا (غير محول)' : 'No (Pending)'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#1a7f8b] border-l border-slate-100">{m.meterNumber}</td>
                      <td className="py-3 px-3 font-mono text-slate-700 border-l border-slate-100">{m.paymentNumber}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onToggleTransfer(m.id)}
                          className="px-3 py-1 bg-[#475569] hover:bg-[#334155] text-white font-bold rounded-md text-[11px] flex items-center justify-center gap-1 mx-auto transition-all"
                          title="تغيير حالة نقل العداد"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>{language === 'ar' ? 'تغيير نقل العداد' : 'Toggle Transfer'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {type === 'water' ? <Droplet className="w-5 h-5 text-blue-500" /> : <Zap className="w-5 h-5 text-amber-500" />}
                {type === 'water' ? 'Add Building Water Meter' : 'Add Unit Electricity Meter'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Building Name / Block</label>
                <input
                  type="text"
                  required
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {type === 'electricity' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Number</label>
                  <input
                    type="text"
                    required
                    value={unitNo}
                    onChange={(e) => setUnitNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meter Serial Number</label>
                <input
                  type="text"
                  required
                  value={meterNo}
                  onChange={(e) => setMeterNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              {type === 'electricity' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment / SEC Account Number</label>
                  <input
                    type="text"
                    required
                    value={paymentNo}
                    onChange={(e) => setPaymentNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] text-white font-semibold rounded-xl shadow-md"
                >
                  Save Meter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Percent, Banknote, ArrowUpRight,
  CheckCircle2, Clock, AlertTriangle, Receipt, CalendarClock
} from 'lucide-react';
import { Contract, DueItem, PaymentRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DashboardDuesStatsProps {
  dues?: DueItem[];
  contracts?: Contract[];
  payments?: PaymentRecord[];
  onNavigate?: (tab: string) => void;
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b'];

export const DashboardDuesStats: React.FC<DashboardDuesStatsProps> = ({
  dues = [],
  contracts = [],
  payments = [],
  onNavigate
}) => {
  const { language } = useLanguage();

  const monthNames = language === 'ar'
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const stats = useMemo(() => {
    const totalAnnualRent = contracts.reduce((s, c) => s + (c.annualRent || 0), 0);
    const totalPaid = contracts.reduce((s, c) => s + (c.paidAmount || 0), 0);
    const totalRemaining = contracts.reduce((s, c) => s + (c.remainingAmount || 0), 0);
    const activeContracts = contracts.filter(c => c.status === 'Active').length;
    const expiringSoon = contracts.filter(c => {
      if (!c.leaseEndDate) return false;
      const d = new Date(c.leaseEndDate.replace(/\//g, '-'));
      if (isNaN(d.getTime())) return false;
      const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 3600 * 24));
      return days >= 0 && days <= 60;
    }).length;
    const collectionRate = totalAnnualRent > 0 ? Math.round((totalPaid / totalAnnualRent) * 100) : 0;

    return { totalAnnualRent, totalPaid, totalRemaining, activeContracts, expiringSoon, collectionRate };
  }, [contracts]);

  const monthlyData = useMemo(() => {
    const projected = contracts.length > 0 ? Math.round((stats.totalAnnualRent / 12)) : 0;
    const collectedByMonth: number[] = Array(12).fill(0);
    payments.forEach(p => {
      if (p.month && p.month >= 1 && p.month <= 12) {
        collectedByMonth[p.month - 1] += p.amount || 0;
      } else if (p.paymentDate) {
        const d = new Date(p.paymentDate);
        if (!isNaN(d.getTime())) collectedByMonth[d.getMonth()] += p.amount || 0;
      }
    });
    contracts.forEach(c => {
      (c.installments || []).forEach(inst => {
        if (inst.status === 'Paid' && inst.paidDate) {
          const d = new Date(inst.paidDate);
          if (!isNaN(d.getTime())) collectedByMonth[d.getMonth()] += inst.amount || 0;
        }
      });
    });
    return monthNames.map((m, i) => ({
      name: m,
      Projected: projected,
      Collected: Math.round(collectedByMonth[i])
    }));
  }, [contracts, payments, stats.totalAnnualRent, monthNames]);

  const duesStatus = useMemo(() => {
    const paid = dues.filter(d => d.status === 'Paid').length;
    const dueSoon = dues.filter(d => d.status === 'Due Soon').length;
    const overdue = dues.filter(d => d.status === 'Overdue').length;
    return [
      { name: language === 'ar' ? 'مدفوع' : 'Paid', value: paid },
      { name: language === 'ar' ? 'قريب الاستحقاق' : 'Due Soon', value: dueSoon },
      { name: language === 'ar' ? 'متأخر' : 'Overdue', value: overdue }
    ].filter(x => x.value > 0);
  }, [dues, language]);

  const topOutstanding = useMemo(() =>
    [...contracts]
      .filter(c => (c.remainingAmount || 0) > 0)
      .sort((a, b) => (b.remainingAmount || 0) - (a.remainingAmount || 0))
      .slice(0, 8)
      .map(c => ({ name: c.tenantName || c.unitNumber, value: c.remainingAmount || 0 }))
  , [contracts]);

  const movements = useMemo(() => {
    const rows: any[] = [];
    contracts.forEach(c => {
      (c.installments || []).forEach(inst => {
        if (inst.status === 'Paid' && (inst.paidDate || inst.receiptNo)) {
          rows.push({
            id: `${c.id}-${inst.id}`,
            date: inst.paidDate || '',
            tenantName: c.tenantName,
            unitNumber: c.unitNumber,
            amount: inst.amount || 0,
            receiptNo: inst.receiptNo || '—',
            user: inst.user || '',
            method: inst.paymentMethod || ''
          });
        }
      });
    });
    payments.forEach(p => {
      rows.push({
        id: `pay-${p.id}`,
        date: p.paymentDate || '',
        tenantName: p.tenantName,
        unitNumber: p.unitNumber,
        amount: p.amount || 0,
        receiptNo: '—',
        user: '',
        method: p.paymentMethod || ''
      });
    });
    return rows
      .filter(r => r.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [contracts, payments]);

  const fmtMoney = (n: number) => n.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');

  const Card = ({ label, value, sub, icon, color, bg }: {
    label: string; value: string; sub?: React.ReactNode; icon: React.ReactNode; color: string; bg: string;
  }) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between gap-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 mt-1">{value}</p>
        {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
      </div>
      <div className={`p-2.5 rounded-xl ${bg}`}>
        <span className={color}>{icon}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="bg-cover bg-center rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700"
        style={{
          backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.88)), url("https://manage.isleblue.co/uploads/villas/images/2924/antigua-villa-nicobar-2016-004.jpg")'
        }}
      >
        <div>
          <span className="inline-block px-2.5 py-1 bg-[#29b4c4]/20 border border-[#29b4c4]/40 text-cyan-300 rounded-lg text-xs font-semibold mb-2">
            {language === 'ar' ? 'لوحة المستحقات والإيجارات' : 'Dues & Rents Dashboard'}
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {language === 'ar' ? 'تحليلات المستحقات والعائدات' : 'Dues & Rent Revenue Analytics'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {language === 'ar'
              ? 'إحصائيات حية للعائدات الإيجارية، نسب التحصيل، والمستحقات المتأخرة عبر مجمع أزهار.'
              : 'Live rental revenue stats, collection rates and outstanding dues across Azhar Residence.'}
          </p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('azhar_collections')}
            className="px-4 py-2 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5 self-start md:self-auto"
          >
            {language === 'ar' ? 'سجل التحصيلات' : 'View Collections'}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          label={language === 'ar' ? 'إجمالي الإيجار السنوي' : 'Total Annual Rent'}
          value={`${fmtMoney(stats.totalAnnualRent)}`}
          sub={<span className="text-emerald-600 font-semibold">{language === 'ar' ? `${stats.activeContracts} عقد نشط` : `${stats.activeContracts} active contracts`}</span>}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-cyan-600"
          bg="bg-cyan-50"
        />
        <Card
          label={language === 'ar' ? 'المبالغ المحصلة' : 'Amount Collected'}
          value={`${fmtMoney(stats.totalPaid)}`}
          sub={<span className="text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp className="w-3 h-3" />{language === 'ar' ? 'إجمالي السداد' : 'total payments'}</span>}
          icon={<Banknote className="w-5 h-5" />}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <Card
          label={language === 'ar' ? 'المستحقات المتبقية' : 'Outstanding Dues'}
          value={`${fmtMoney(stats.totalRemaining)}`}
          sub={<span className="text-rose-600 font-semibold flex items-center gap-1"><TrendingDown className="w-3 h-3" />{language === 'ar' ? 'غير محصلة' : 'uncollected'}</span>}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="text-rose-600"
          bg="bg-rose-50"
        />
        <Card
          label={language === 'ar' ? 'نسبة التحصيل' : 'Collection Rate'}
          value={`${stats.collectionRate}%`}
          sub={<span className="text-amber-600 font-semibold flex items-center gap-1"><Percent className="w-3 h-3" />{language === 'ar' ? 'من إجمالي العائدات' : 'of total revenue'}</span>}
          icon={<Percent className="w-5 h-5" />}
          color="text-violet-600"
          bg="bg-violet-50"
        />
      </div>

      {/* Charts Row 1: Monthly Revenue + Dues Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Collection Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#29b4c4]" />
                {language === 'ar' ? 'التحصيل الشهري مقابل المتوقع' : 'Monthly Collection vs Projected'}
              </h2>
              <p className="text-[11px] text-slate-500">{language === 'ar' ? 'المبالغ بالريال السعودي' : 'Amounts in SAR'}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(value: any) => fmtMoney(Number(value))}
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Projected" name={language === 'ar' ? 'المتوقع' : 'Projected'} fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Collected" name={language === 'ar' ? 'المحصل' : 'Collected'} fill="#29b4c4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dues Status Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-[#29b4c4]" />
            {language === 'ar' ? 'حالة المستحقات' : 'Dues Status'}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'توزيع المستحقات حسب الحالة' : 'Distribution by status'}</p>
          {duesStatus.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-xs">
              {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={duesStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {duesStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2: Top Outstanding + Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Outstanding Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                {language === 'ar' ? 'أعلى المستحقات المتبقية' : 'Top Outstanding Balances'}
              </h2>
              <p className="text-[11px] text-slate-500">{language === 'ar' ? 'حسب العقود النشطة' : 'by active contracts'}</p>
            </div>
          </div>
          {topOutstanding.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-xs">
              {language === 'ar' ? 'لا توجد مستحقات متبقية' : 'No outstanding balances'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={topOutstanding}>
                <defs>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" interval={0} angle={-15} height={50} />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip formatter={(value: any) => fmtMoney(Number(value))} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="value" name={language === 'ar' ? 'المتبقي' : 'Remaining'} stroke="#ef4444" fill="url(#outGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Movements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-emerald-500" />
            {language === 'ar' ? 'آخر حركات السداد' : 'Recent Payment Movements'}
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">{language === 'ar' ? 'أحدث 8 عمليات تحصيل' : 'Latest 8 transactions'}</p>
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
            {movements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">{language === 'ar' ? 'لا توجد حركات سداد بعد' : 'No payment movements yet'}</p>
            ) : (
              movements.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-emerald-100 rounded-lg flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate">{m.tenantName}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="font-mono">#{m.unitNumber}</span>
                        <span className="inline-flex items-center gap-0.5"><CalendarClock className="w-3 h-3" />{m.date.slice(0, 10)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="text-xs font-extrabold text-emerald-600">{fmtMoney(m.amount)}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{m.receiptNo}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Expiring contracts strip */}
      {stats.expiringSoon > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-xs text-amber-900">
            <p className="font-bold text-amber-950">
              {language === 'ar' ? `${stats.expiringSoon} عقد قربت تنتهي خلال 60 يوم` : `${stats.expiringSoon} contracts expiring within 60 days`}
            </p>
            <p className="text-amber-700 mt-0.5">
              {language === 'ar' ? 'راجع قسم العقود لتجديدها في الوقت المناسب.' : 'Review the contracts section to renew them on time.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

import { Tenant, Contract, ContractNote, Unit, ElectricityMeter, MaintenanceRequest, MaintenanceStatus, WaterMeter, Complaint, ComplaintStatus, ComplaintPriority, StaffMember, StaffStatus, Expense, DueItem, PaymentRecord, PaymentInstallment, Company, Letter, Announcement, RentReport, Notification, Facility, FacilityCategory, FacilityBooking, FacilityBookingStatus } from '../types';

// Allow switching backend via VITE_API_BASE (e.g. local dev server), default to the real Azhar API.
const viteEnv = (import.meta as any).env || {};
export const API_BASE: string = viteEnv.VITE_API_BASE || 'https://azhar.runasp.net/api';

const ADMIN_EMAIL = 'admin@azhar.com';
const ADMIN_PASSWORD = 'Admin@123';

const ACCESS_KEY = 'azhar_residence_access_token';
const REFRESH_KEY = 'azhar_residence_refresh_token';

let authToken: string | null = localStorage.getItem(ACCESS_KEY);
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY);
let refreshInFlight: Promise<boolean> | null = null;

// Extract an access token / refresh token from any server response shape.
function saveSession(data: any) {
  const access = data?.accessToken || data?.token || data?.data?.accessToken || data?.data?.token;
  const refresh = data?.refreshToken || data?.data?.refreshToken;
  if (access) {
    authToken = access;
    localStorage.setItem(ACCESS_KEY, access);
  }
  if (refresh) {
    refreshToken = refresh;
    localStorage.setItem(REFRESH_KEY, refresh);
  }
  return Boolean(authToken);
}

export function clearSession() {
  authToken = null;
  refreshToken = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/Account/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
      clearSession();
      return false;
    }
    const data = await res.json();
    if (data && data.isSuccess === false) {
      clearSession();
      return false;
    }
    return saveSession(data);
  } catch (err) {
    return false;
  }
}

// Single-flight refresh so parallel 401s trigger one refresh request.
function refresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

// Silent auto-login as the demo admin so dashboards can load before a user signs in.
async function autoLogin(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/Account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const data = await res.json();
    if (data && data.isSuccess !== false && saveSession(data)) return authToken;
  } catch (err) {
    console.log('Auto auth failed', err);
  }
  return null;
}

export async function ensureAuth(): Promise<string | null> {
  if (authToken) return authToken;
  // Try refreshing the stored refresh token first.
  const ok = await refresh();
  if (ok && authToken) return authToken;
  // No session at all → auto-login as demo admin (keeps dashboards working).
  return autoLogin();
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  await ensureAuth();
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> || {}) };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const doFetch = () => fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });
  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refresh();
    if (refreshed) {
      res = await doFetch();
    }
  }
  return res;
}

const asList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.tenants)) return data.tenants;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.payments)) return data.payments;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

const dateOnly = (d: any): string => {
  if (!d) return '';
  const s = String(d);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
};

// Server expects ISO dates, the UI often uses DD/MM/YYYY text inputs.
const normalizeDate = (d: any): string => {
  if (!d) return '';
  const s = String(d);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
};

// ---- Units (House) ----
const toUnitType = (pt: any): Unit['type'] => {
  const s = String(pt ?? '');
  if (/villa.*duplex/i.test(s)) return 'Villa Duplex';
  if (/villa/i.test(s)) return 'Villa';
  if (/warehouse/i.test(s)) return 'Warehouse';
  return 'Appartment';
};
const toUnitTypeServer = (t: string): string => {
  if (t === 'Appartment') return 'Apartment';
  return t || 'Apartment';
};
const fromUnitTypeServer = (t: string): string => {
  if (t === 'Apartment') return 'Appartment';
  return t || 'Appartment';
};

// ---- Facilities ----
const FAC_CAT_TO_SERVER: Record<string, string> = {
  WeddingHall: 'قاعة أفراح', Hall: 'قاعة مناسبات', Pool: 'مسبح', Gym: 'جيم',
  Playground: 'ملعب', BBQ: 'شواء', Restaurant: 'مطعم', Shuttle: 'شاتل', SecurityPass: 'تصريح أمني'
};
const FAC_CAT_TO_FRONT: Record<string, string> = {
  'قاعة أفراح': 'WeddingHall', 'قاعة مناسبات': 'Hall', 'مسبح': 'Pool', 'جيم': 'Gym',
  'ملعب': 'Playground', 'شواء': 'BBQ', 'مطعم': 'Restaurant', 'شاتل': 'Shuttle', 'تصريح أمني': 'SecurityPass'
};
const toFacCatServer = (c: string): string => FAC_CAT_TO_SERVER[c] || c || 'قاعة مناسبات';
const toFacCatFront = (c: any): string => FAC_CAT_TO_FRONT[String(c || '')] || 'Hall';

// ---- Expenses ----
const EXP_CAT_TO_SERVER: Record<string, string> = {
  'صيانة وتشغيل': 'MaintenanceAndOperation',
  'نظافة وأمن': 'Cleaning',
  'رواتب الموظفين': 'Other',
  'كهرباء ومياه': 'Other',
  'أخرى': 'Other'
};
const EXP_CAT_TO_FRONT: Record<string, string> = {
  Cleaning: 'نظافة وأمن',
  MaintenanceAndOperation: 'صيانة وتشغيل',
  Security: 'نظافة وأمن',
  Other: 'أخرى'
};
// Server exposes only BankTransfer + Cash enums (verified) — map the rest to Cash.
const EXP_PAY_TO_SERVER: Record<string, string> = {
  'Bank Transfer': 'BankTransfer', 'تحويل بنكي': 'BankTransfer',
  Cash: 'Cash', 'نقداً / كاش': 'Cash', 'نقدًا': 'Cash',
  Mada: 'Cash', 'مدى': 'Cash', Sadad: 'Cash', 'سداد': 'Cash'
};
const EXP_PAY_TO_FRONT: Record<string, string> = {
  BankTransfer: 'تحويل بنكي', Cash: 'نقداً / كاش'
};
const toExpenseCatServer = (c: string): string => EXP_CAT_TO_SERVER[c] || c || 'Other';
const toExpenseCatFront = (c: any): string => {
  const s = String(c || '');
  if (EXP_CAT_TO_FRONT[s]) return EXP_CAT_TO_FRONT[s];
  if (/صيانة/.test(s)) return 'صيانة وتشغيل';
  if (/نظافة|أمن/.test(s)) return 'نظافة وأمن';
  if (/رواتب/.test(s)) return 'رواتب الموظفين';
  if (/كهرباء|مياه/.test(s)) return 'كهرباء ومياه';
  return 'أخرى';
};
const toPaymentServer = (p: string): string => EXP_PAY_TO_SERVER[p] || (/تحويل|bank/i.test(String(p || '')) ? 'BankTransfer' : 'Cash');
const toPaymentFront = (p: any): string => {
  const s = String(p || '');
  if (EXP_PAY_TO_FRONT[s]) return EXP_PAY_TO_FRONT[s];
  if (/bank|تحويل/i.test(s)) return 'تحويل بنكي';
  if (/نقد|cash/i.test(s)) return 'نقداً / كاش';
  return s || 'نقداً / كاش';
};

const FACILITY_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=600';

export interface FinanceSummary {
  tenantId: string;
  paidAmount: number;
  remainingAmount: number;
  rentValue: number;
  remainingRents: number;
  rentFrequency: string;
  status: string;
  nextDueDate: string;
  contractEndDate: string;
}

export const apiService = {
  // Login — stores access + refresh tokens from the server response.
  async login(email: string, password?: string) {
    const res = await fetch(`${API_BASE}/Account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data && data.isSuccess !== false) {
      saveSession(data);
    }
    return { ok: res.ok, ...data };
  },

  // Logout — revoke the refresh token on the server and clear the local session.
  async logout(): Promise<void> {
    const token = refreshToken;
    clearSession();
    if (!token) return;
    try {
      await fetch(`${API_BASE}/Account/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token })
      });
    } catch (err) {
      // Ignore network errors on logout.
    }
  },

  // azhar.runasp.net has no /Account/me — the session user comes from the
  // login response, so this gracefully returns null.
  async getSessionUser(): Promise<any | null> {
    return null;
  },

  // Finance mapping — the single source of truth for money numbers.
  // Uses the server's /contracts-dues endpoint which returns computed
  // paid/remaining per contract, keyed by tenantId so every section
  // (collections, contracts, dues rents) shows identical amounts.
  async getFinanceSummary(): Promise<Map<string, FinanceSummary>> {
    const map = new Map<string, FinanceSummary>();
    try {
      const res = await authedFetch('/contracts-dues');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
        list.forEach((c: any) => {
          const tid = c.tenantId || '';
          if (!tid) return;
          const rentValue = Number(c.annualRent || 0);
          const paidAmount = Number(c.paidAmount || 0);
          const remainingAmount = Math.max(0, Number(c.remainingAmount || 0));
          const st = (c.status || '').toLowerCase();
          map.set(tid, {
            tenantId: tid,
            paidAmount,
            remainingAmount,
            rentValue,
            remainingRents: rentValue > 0 ? Math.max(1, Math.ceil(remainingAmount / rentValue)) : 1,
            rentFrequency: '',
            status: st === 'paid' ? 'Paid' : (st.includes('expired') || st.includes('overdue')) ? 'Overdue' : 'Due Soon',
            nextDueDate: dateOnly(c.leaseStartDate),
            contractEndDate: ''
          });
        });
      }
    } catch (err) { /* ignore */ }
    return map;
  },

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    const res = await authedFetch('/Tenants');
    if (!res.ok) throw new Error('Failed to fetch tenants');
    const data = await res.json();
    let financeMap = new Map<string, FinanceSummary>();
    try { financeMap = await this.getFinanceSummary(); } catch (err) { /* ignore */ }
    return asList(data).map((t: any) => {
      const fin = financeMap.get(t.id);
      const annualRent = Number(t.annualRent || 0);
      const paidAmount = fin ? fin.paidAmount : Number(t.paidAmount || 0);
      const remainingAmount = fin ? Math.max(0, annualRent - paidAmount) : Number(t.remainingAmount || 0);
      return {
        id: t.id,
        name: t.fullName || t.name || 'Tenant',
        fullNameArabic: t.arabicName || t.fullNameArabic || '',
        email: t.email || '',
        mobile: t.phoneNumber || t.mobile || '',
        emergencyPhone: t.emergencyContactPhone || t.emergencyPhoneNumber || t.emergencyPhone || '',
        whatsapp: t.whatsAppNumber || t.whatsappNumber || t.whatsapp || t.phoneNumber || '',
        nationality: t.nationality || '',
        familyCount: t.familyCount || '1',
        workNotes: t.workNotes || '',
        isMarried: t.isMarried !== undefined ? t.isMarried : true,
        companyName: t.companyName || t.company || 'AZ',
        company: t.company || t.companyName || 'AZ',
        tenantCompanyName: t.tenantCompanyName || '',
        tenantRemarks: t.tenantRemarks || '',
        idLetter: t.nationalId || t.idLetter || '',
        nationalId: t.nationalId || t.idLetter || '',
        hasContract: Boolean(t.contractNumber),
        unitNumber: t.houseNumber || t.unitNumber || '',
        houseId: t.houseId || '',
        houseNumber: t.houseNumber || '',
        contractNumber: t.contractNumber || '',
        contractStartDate: dateOnly(t.contractStartDate),
        contractEndDate: dateOnly(t.contractEndDate),
        monthlyRent: Number(t.monthlyRent || 0),
        annualRent,
        paidAmount,
        remainingAmount,
        paymentMethod: t.paymentMethod || '',
        waterCost: t.waterCost !== undefined && t.waterCost !== null ? String(t.waterCost) : '',
        electricityMeter: t.electricityMeterNumber || t.electricityMeter || '',
        isActive: t.isActive,
        archived: t.isActive === false
      };
    });
  },

  // Find a House by its unit number, falling back to the first available house.
  async resolveHouseId(unitNumber: string): Promise<string> {
    if (!unitNumber) return '';
    try {
      const res = await authedFetch('/House');
      if (res.ok) {
        const houses = asList(await res.json());
        const match = houses.find((h: any) => String(h.houseNumber) === String(unitNumber));
        if (match) return match.id;
      }
    } catch (err) { /* ignore */ }
    try {
      const avail = await authedFetch('/House/available');
      if (avail.ok) {
        const list = asList(await avail.json());
        if (list.length > 0) return list[0].id;
      }
    } catch (err) { /* ignore */ }
    return '';
  },

  async addTenant(tenantData: Partial<Tenant>): Promise<Tenant> {
    const houseId = tenantData.houseId || await this.resolveHouseId(tenantData.unitNumber || tenantData.houseNumber || '');
    const payload: any = {
      fullName: tenantData.name,
      arabicName: tenantData.fullNameArabic || tenantData.name || '',
      email: tenantData.email,
      phoneNumber: tenantData.mobile,
      nationalId: tenantData.idLetter || tenantData.nationalId || '',
      nationality: tenantData.nationality || '',
      emergencyContactPhone: tenantData.emergencyPhone || '',
      whatsAppNumber: tenantData.whatsapp || tenantData.mobile,
      familyCount: Number(tenantData.familyCount || 1),
      companyName: tenantData.companyName || tenantData.company || 'AZ',
      tenantCompanyName: tenantData.companyName || tenantData.company || '',
      workNotes: tenantData.workNotes || '',
      tenantRemarks: tenantData.tenantRemarks || '',
      isMarried: tenantData.isMarried !== undefined ? tenantData.isMarried : true,
      password: tenantData.password || 'Tenant@101'
    };
    if (houseId) payload.houseId = houseId;

    const res = await authedFetch('/Tenants', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create tenant');
    const t = await res.json();
    return (await this.getTenants()).find(x => x.id === t.id) || {
      id: t.id || String(Date.now()),
      name: t.fullName || tenantData.name || 'Tenant',
      email: t.email || tenantData.email || '',
      mobile: t.phoneNumber || tenantData.mobile || '',
      whatsapp: t.phoneNumber || tenantData.mobile || '',
      hasContract: false,
      unitNumber: t.houseNumber || '',
      archived: false
    };
  },

  async updateTenant(id: string, tenantData: Partial<Tenant>): Promise<Tenant> {
    const payload: any = {
      fullName: tenantData.name,
      arabicName: tenantData.fullNameArabic || tenantData.name || '',
      email: tenantData.email,
      phoneNumber: tenantData.mobile,
      nationalId: tenantData.idLetter || tenantData.nationalId || '',
      nationality: tenantData.nationality || '',
      emergencyContactPhone: tenantData.emergencyPhone || '',
      whatsAppNumber: tenantData.whatsapp || tenantData.mobile,
      familyCount: Number(tenantData.familyCount || 1),
      companyName: tenantData.companyName || tenantData.company || 'AZ',
      tenantCompanyName: tenantData.companyName || tenantData.company || '',
      workNotes: tenantData.workNotes || '',
      tenantRemarks: tenantData.tenantRemarks || '',
      isMarried: tenantData.isMarried !== undefined ? tenantData.isMarried : true,
      isActive: tenantData.isActive !== false && !tenantData.archived
    };
    if (tenantData.houseId) payload.houseId = tenantData.houseId;

    const res = await authedFetch(`/Tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update tenant');
    return { ...tenantData, id } as Tenant;
  },

  // Server has no toggle-active endpoint — flip isActive via the full update.
  async toggleTenantArchive(id: string) {
    const tenants = await this.getTenants();
    const t = tenants.find(x => x.id === id);
    if (!t) return { isSuccess: false };
    return this.updateTenant(id, { ...t, isActive: t.archived });
  },

  async deleteTenant(id: string) {
    const res = await authedFetch(`/Tenants/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete tenant');
    return res.json();
  },

  // Contracts - use real /Contracts endpoint when available, fallback to tenant-derived
  async getContracts(): Promise<Contract[]> {
    try {
      const res = await authedFetch('/Contracts');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
        return list.map((c: any) => {
          const start = c.leaseStartDate ? String(c.leaseStartDate).slice(0, 10) : '';
          const end = c.leaseEndDate ? String(c.leaseEndDate).slice(0, 10) : '';
          const expired = end && new Date(end).getTime() < Date.now();
          const annualRent = Number(c.annualRent || 0);
          const monthlyRent = Number(c.monthlyRent || 0);
          const waterYearlyBill = Number(c.waterMeterCost || c.waterYearlyBill || 0);
          const totalYearlyRent = annualRent + waterYearlyBill;
          const paidAmount = Number(c.paidAmount || 0);
          const remainingAmount = Number(c.remainingAmount || Math.max(0, totalYearlyRent - paidAmount));
          return {
            id: c.id,
            contractNo: c.contractNo || c.contractNumber || `CNT-${Date.now()}`,
            compoundId: '1',
            compoundName: 'Azhar Residence',
            buildingNumber: c.buildingNumber || (c.unitNumber || '').split('-')[0] || (c.houseNumber || '').split('-')[0] || '101',
            unitNumber: c.unitNumber || c.houseNumber || '',
            unitType: toUnitType(c.propertyType) as Contract['unitType'],
            tenantId: c.tenantId || '',
            tenantName: c.tenantName || '',
            tenantMobile: c.tenantMobile || '',
            emergencyPhone: c.emergencyPhone || '',
            tenantNationality: c.tenantNationality || '',
            nationalId: c.nationalId || '',
            houseId: c.houseId || '',
            isArchived: Boolean(c.isArchived),
            leaseStartDate: start,
            leaseDurationMonths: c.leaseDurationMonths || 12,
            leaseEndDate: end,
            annualRent,
            monthlyRent,
            waterYearlyBill,
            totalYearlyRent,
            discount: Number(c.discount || 0),
            paidAmount,
            remainingAmount,
            paymentFrequency: (c.paymentFrequency === 'SemiAnnual' ? 'Semi-Annual' : c.paymentFrequency || 'Quarterly') as Contract['paymentFrequency'],
            paymentMethod: c.paymentMethod || 'Quarterly',
            paymentNumber: c.paymentNumber || '',
            electricityMeterNumber: c.electricityMeterNumber || '',
            englishNotes: c.englishNotes || '',
            arabicNotes: c.arabicNotes || '',
            status: (c.status === 'Active' || c.status === 'Pending') ? c.status : (c.isArchived ? 'Archived' : (expired ? 'Pending' : 'Active')) as Contract['status'],
            notes: (c.notes || []).map((n: any) => ({
              id: n.id,
              contractId: n.contractId || c.id,
              date: dateOnly(n.createdAt) || n.date || '',
              author: n.author || n.addedBy || 'Admin',
              text: n.text || n.content || ''
            })),
            installments: c.installments || []
          };
        });
      }
    } catch (err) { /* ignore */ }

    // Fallback: derive from tenants if /Contracts endpoint fails
    const tenants = await this.getTenants();
    let financeMap = new Map<string, FinanceSummary>();
    try { financeMap = await this.getFinanceSummary(); } catch (err) { /* ignore */ }
    return tenants
      .filter(t => t.hasContract)
      .map((t, i) => {
        const start = t.contractStartDate || '';
        const end = t.contractEndDate || '';
        const expired = t.contractEndDate && new Date(t.contractEndDate).getTime() < Date.now();
        const fin = financeMap.get(t.id);
        const annualRent = t.annualRent || 0;
        const paidAmount = fin ? fin.paidAmount : (t.paidAmount || 0);
        const remainingAmount = fin ? Math.max(0, annualRent - paidAmount) : (t.remainingAmount || annualRent || 0);
        const installments: PaymentInstallment[] = [];
        if (fin && fin.rentValue > 0 && remainingAmount > 0) {
          installments.push({
            id: `inst-${t.id}-1`,
            installmentNo: 1,
            dueDate: fin.nextDueDate || start,
            amount: Math.min(fin.rentValue, remainingAmount),
            status: expired ? 'Overdue' : 'Pending'
          });
        }
        return {
          id: t.id,
          contractNo: t.contractNumber || `CNT-2024-${String(i + 1).padStart(3, '0')}`,
          compoundId: '1',
          compoundName: 'Azhar Residence',
          buildingNumber: (t.houseNumber || '').split('-')[0] || '101',
          unitNumber: t.houseNumber || t.unitNumber || '',
          unitType: 'Appartment' as const,
          tenantId: t.id,
          tenantName: t.name,
          tenantMobile: t.mobile,
          emergencyPhone: t.emergencyPhone || '',
          tenantNationality: t.nationality || '',
          contractOf: 'Mohammed Barmada',
          leaseStartDate: start,
          leaseDurationMonths: 12,
          leaseEndDate: end,
          annualRent,
          waterYearlyBill: Number(t.waterCost || 0) * 12,
          totalYearlyRent: annualRent,
          discount: 0,
          paidAmount,
          remainingAmount,
          paymentFrequency: (t.paymentMethod || 'Quarterly') as Contract['paymentFrequency'],
          paymentMethod: t.paymentMethod || 'Quarterly',
          status: expired ? 'Pending' : 'Active',
          notes: [],
          installments
        };
      });
  },

  // Units (houses enriched with tenant info)
  async getUnits(): Promise<Unit[]> {
    const res = await authedFetch('/House');
    if (!res.ok) throw new Error('Failed to fetch units');
    const houses = asList(await res.json());
    let tenants: any[] = [];
    try {
      const tRes = await authedFetch('/Tenants');
      if (tRes.ok) tenants = asList(await tRes.json());
    } catch (err) { /* ignore */ }

    const tenantByHouse = new Map<string, any>();
    tenants.forEach((tn: any) => { if (tn.houseId) tenantByHouse.set(tn.houseId, tn); });

    return houses.map((h: any) => {
      const tenant = tenantByHouse.get(h.id);
      const occupied = Boolean(h.userId) || Boolean(tenant);
      return {
        id: h.id,
        compoundId: '1',
        compoundName: 'Azhar Residence',
        buildingNumber: h.buildingNumber || (h.houseNumber || '').split('-')[0] || '101',
        unitNumber: h.houseNumber || '101',
        rooms: Number(h.roomsCount || 0),
        baths: Number(h.bathroomsCount || 0),
        living: Number(h.livingRoomsCount || 0),
        majlis: Number(h.majlisCount || 0),
        area: String(h.area ?? ''),
        type: toUnitType(h.propertyType),
        status: occupied ? 'Occupied' : 'Vacant',
        annualRent: Number(h.annualRent || tenant?.annualRent || 0),
        currentTenantId: tenant?.id || h.userId || '',
        currentTenantName: tenant?.fullName || h.userDisplayName || ''
      };
    });
  },

  async addUnit(unit: Omit<Unit, 'id'>): Promise<Unit> {
    const payload = {
      houseNumber: unit.unitNumber,
      buildingNumber: unit.buildingNumber,
      propertyType: toUnitTypeServer(unit.type),
      area: Number(unit.area || 0),
      majlisCount: Number(unit.majlis || 0),
      livingRoomsCount: Number(unit.living || 0),
      bathroomsCount: Number(unit.baths || 0),
      roomsCount: Number(unit.rooms || 0),
      annualRent: Number(unit.annualRent || 0)
    };
    const res = await authedFetch('/House', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create unit');
    const created = await res.json();
    return {
      id: created.id || String(Date.now()),
      compoundId: unit.compoundId || '4',
      compoundName: unit.compoundName || 'Daar Residence',
      buildingNumber: String(created.buildingNumber || unit.buildingNumber),
      unitNumber: String(created.houseNumber || unit.unitNumber),
      rooms: Number(created.roomsCount || unit.rooms),
      baths: Number(created.bathroomsCount || unit.baths),
      living: Number(created.livingRoomsCount || unit.living),
      majlis: Number(created.majlisCount || unit.majlis),
      area: String(created.area || unit.area),
      type: fromUnitTypeServer(created.propertyType) || unit.type,
      status: 'Vacant' as const,
      annualRent: Number(created.annualRent || unit.annualRent)
    };
  },

  async updateUnit(id: string, updates: Partial<Unit>): Promise<Unit> {
    const payload = {
      houseNumber: updates.unitNumber,
      buildingNumber: updates.buildingNumber,
      propertyType: toUnitTypeServer(updates.type || 'Appartment'),
      area: Number(updates.area || 0),
      majlisCount: Number(updates.majlis || 0),
      livingRoomsCount: Number(updates.living || 0),
      bathroomsCount: Number(updates.baths || 0),
      roomsCount: Number(updates.rooms || 0),
      annualRent: Number(updates.annualRent || 0)
    };
    const res = await authedFetch(`/House/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update unit');
    return { ...updates, id } as Unit;
  },

  async deleteUnit(id: string) {
    const res = await authedFetch(`/House/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete unit');
    return res.json();
  },

  async addContract(contractData: Partial<Contract>): Promise<Contract> {
    const payload: any = {
      contractNumber: contractData.contractNo,
      tenantId: contractData.tenantId,
      houseId: contractData.houseId || await this.resolveHouseId(contractData.unitNumber || contractData.buildingNumber || ''),
      annualRent: Number(contractData.annualRent || 0),
      waterMeterCost: Number(contractData.waterYearlyBill || 0),
      discount: Number(contractData.discount || 0),
      paidAmount: Number(contractData.paidAmount || 0),
      paymentFrequency: (contractData.paymentFrequency || 'Quarterly').replace('Semi-Annual', 'SemiAnnual'),
      leaseStartDate: normalizeDate(contractData.leaseStartDate),
      leaseDurationMonths: Number(contractData.leaseDurationMonths || 12)
    };
    const res = await authedFetch('/Contracts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create contract');
    const created = await res.json();
    return (await this.getContracts()).find(x => x.id === created.id) || { ...contractData, id: created.id || String(Date.now()) } as Contract;
  },

  async updateContract(id: string, contractData: Partial<Contract>): Promise<Contract> {
    const payload = {
      annualRent: Number(contractData.annualRent || 0),
      paidAmount: Number(contractData.paidAmount || 0),
      discount: Number(contractData.discount || 0),
      waterMeterCost: Number(contractData.waterYearlyBill || 0),
      paymentFrequency: contractData.paymentFrequency || 'Quarterly',
      tenantName: contractData.tenantName || '',
      tenantMobile: contractData.tenantMobile || '',
      nationalId: contractData.nationalId || '',
      unitNumber: contractData.unitNumber || '',
      propertyType: contractData.unitType || '',
      leaseStartDate: contractData.leaseStartDate || '',
      leaseEndDate: contractData.leaseEndDate || '',
      leaseDurationMonths: Number(contractData.leaseDurationMonths || 12),
      status: contractData.status || 'Active',
      electricityMeterNumber: contractData.electricityMeterNumber || '',
      paymentNumber: contractData.paymentNumber || '',
      englishNotes: contractData.englishNotes || '',
      arabicNotes: contractData.arabicNotes || '',
      emergencyPhone: contractData.emergencyPhone || ''
    };
    const res = await authedFetch(`/Contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update contract');
    return { ...contractData, id } as Contract;
  },

  async archiveContract(id: string) {
    const res = await authedFetch(`/Contracts/${id}/archive`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to archive contract');
    return res.json();
  },

  async unarchiveContract(id: string) {
    const res = await authedFetch(`/Contracts/${id}/unarchive`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to unarchive contract');
    return res.json();
  },

  async deleteContract(id: string) {
    const res = await authedFetch(`/Contracts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete contract');
    return res.json();
  },

  async getActiveContracts(): Promise<Contract[]> {
    const res = await authedFetch('/Contracts/active');
    if (!res.ok) return [];
    return this.mapContracts(await res.json());
  },

  async getExpiredContracts(): Promise<Contract[]> {
    const res = await authedFetch('/Contracts/expired');
    if (!res.ok) return [];
    return this.mapContracts(await res.json());
  },

  async getArchivedContracts(): Promise<Contract[]> {
    const res = await authedFetch('/Contracts/archived');
    if (!res.ok) return [];
    return this.mapContracts(await res.json());
  },

  mapContracts(data: any): Contract[] {
    const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
    return list.map((c: any) => {
      const annualRent = Number(c.annualRent || 0);
      const paidAmount = Number(c.paidAmount || 0);
      const waterYearlyBill = Number(c.waterMeterCost || 0);
      const totalYearlyRent = annualRent + waterYearlyBill;
      return {
        id: c.id,
        contractNo: c.contractNumber || `CNT-${Date.now()}`,
        compoundId: '1',
        compoundName: 'Azhar Residence',
        buildingNumber: c.buildingNumber || (c.unitNumber || '').split('-')[0] || '101',
        unitNumber: c.unitNumber || c.houseNumber || '',
        unitType: toUnitType(c.propertyType) as Contract['unitType'],
        tenantId: c.tenantId || '',
        tenantName: c.tenantName || '',
        tenantMobile: c.tenantMobile || '',
        leaseStartDate: c.leaseStartDate ? String(c.leaseStartDate).slice(0, 10) : '',
        leaseDurationMonths: c.leaseDurationMonths || 12,
        leaseEndDate: c.leaseEndDate ? String(c.leaseEndDate).slice(0, 10) : '',
        annualRent,
        waterYearlyBill,
        totalYearlyRent,
        discount: Number(c.discount || 0),
        paidAmount,
        remainingAmount: Number(c.remainingAmount ?? Math.max(0, totalYearlyRent - paidAmount)),
        paymentFrequency: (c.paymentFrequency === 'SemiAnnual' ? 'Semi-Annual' : c.paymentFrequency || 'Quarterly') as Contract['paymentFrequency'],
        paymentMethod: c.paymentMethod || 'Quarterly',
        status: (c.isArchived ? 'Archived' : 'Active') as Contract['status'],
        isArchived: Boolean(c.isArchived),
        notes: []
      };
    });
  },

  async getContractNotes(contractId: string): Promise<ContractNote[]> {
    const res = await authedFetch(`/Contracts/${contractId}/notes`);
    if (!res.ok) throw new Error('Failed to fetch contract notes');
    const list = asList(await res.json());
    return list.map((n: any) => ({
      id: n.id,
      contractId: n.contractId || contractId,
      date: n.createdAt ? String(n.createdAt).slice(0, 10) : '',
      author: n.author || 'Admin',
      text: n.text || ''
    }));
  },

  async addContractNote(contractId: string, text: string): Promise<ContractNote> {
    const res = await authedFetch(`/Contracts/${contractId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Failed to add contract note');
    const created = await res.json();
    return {
      id: created.id || String(Date.now()),
      contractId,
      date: created.createdAt ? String(created.createdAt).slice(0, 10) : '',
      author: created.author || 'Admin',
      text: created.text || text
    };
  },

  async getContractPayments(contractId: string): Promise<PaymentRecord[]> {
    const res = await authedFetch(`/Contracts/${contractId}/payments`);
    if (!res.ok) throw new Error('Failed to fetch contract payments');
    const list = asList(await res.json());
    return list.map((p: any) => ({
      id: p.id,
      tenantId: p.tenantId || '',
      tenantName: p.tenantName || '',
      unitNumber: p.unitNumber || '',
      amount: Number(p.amount || 0),
      paymentMethod: toPaymentFront(p.paymentMethod),
      status: 'Paid',
      paymentDate: p.paymentDate ? String(p.paymentDate).slice(0, 10) : ''
    }));
  },

  async addContractPayment(contractId: string, payment: { amount: number; paymentDate: string; paymentMethod: string; Note?: string }): Promise<PaymentRecord> {
    const payload = {
      amount: Number(payment.amount || 0),
      paymentDate: normalizeDate(payment.paymentDate),
      paymentMethod: toPaymentServer(payment.paymentMethod),
      Note: payment.Note || ''
    };
    const res = await authedFetch(`/Contracts/${contractId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to record contract payment');
    const created = await res.json();
    return {
      id: created.id || String(Date.now()),
      tenantId: '',
      tenantName: '',
      unitNumber: '',
      amount: Number(created.amount || payment.amount || 0),
      paymentMethod: toPaymentFront(created.paymentMethod || payment.paymentMethod),
      status: 'Paid',
      paymentDate: created.paymentDate ? String(created.paymentDate).slice(0, 10) : ''
    };
  },

  // Dues (derived from server rent reports — same source as finance mapping)
  async getDues(): Promise<DueItem[]> {
    const [financeMap, tenants] = await Promise.all([
      this.getFinanceSummary().catch(() => new Map<string, FinanceSummary>()),
      this.getTenants().catch(() => [] as Tenant[])
    ]);

    if (financeMap.size === 0) {
      return tenants
        .filter(t => t.annualRent > 0)
        .map(t => {
          const expired = t.contractEndDate && new Date(t.contractEndDate).getTime() < Date.now();
          return {
            id: t.id,
            compoundId: '1',
            compoundName: 'Azhar Residence',
            unitNumber: t.houseNumber || t.unitNumber || '',
            tenantName: t.name,
            mobile: t.mobile,
            annualRent: t.annualRent,
            remainingRents: 1,
            rentValue: t.monthlyRent || Math.round(t.annualRent / 12),
            rentalDueDate: '',
            contractExpiryDate: t.contractEndDate || '',
            status: (expired ? 'Overdue' : 'Due Soon') as DueItem['status']
          };
        });
    }

    const tenantBy = new Map<string, Tenant>(tenants.map(t => [t.id, t] as [string, Tenant]));
    const finList: FinanceSummary[] = Array.from(financeMap.values());
    return finList.map((fin) => {
      const tn = tenantBy.get(fin.tenantId);
      const annualRent = tn?.annualRent || 0;
      const remainingAmount = Math.max(0, annualRent - fin.paidAmount) || fin.remainingAmount;
      return {
        id: fin.tenantId,
        compoundId: '1',
        compoundName: 'Azhar Residence',
        unitNumber: tn?.houseNumber || tn?.unitNumber || '',
        tenantName: tn?.name || '',
        mobile: tn?.mobile || '',
        annualRent,
        remainingRents: remainingAmount > 0 && fin.rentValue > 0 ? Math.max(1, Math.ceil(remainingAmount / fin.rentValue)) : (fin.status === 'Paid' ? 0 : 1),
        rentValue: fin.rentValue,
        rentalDueDate: fin.nextDueDate,
        contractExpiryDate: fin.contractEndDate,
        status: fin.status as DueItem['status']
      };
    });
  },

  // Maintenance
  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    const res = await authedFetch('/Maintenance');
    if (!res.ok) throw new Error('Failed to fetch maintenance');
    const data = asList(await res.json());
    const statusMap: Record<string, MaintenanceStatus> = {
      New: 'New', Open: 'New', Assigned: 'In Progress', 'In Progress': 'In Progress',
      InProgress: 'In Progress', Done: 'Done', Closed: 'Done', Completed: 'Done',
      Rejected: 'Rejected Supervisor', RejectedSupervisor: 'Rejected Supervisor',
      Approved: 'In Progress'
    };
    return data.map((m: any) => ({
      id: m.id,
      rvNo: m.requestNumber || `MNT-${(m.id || '').slice(0, 4).toUpperCase()}`,
      compoundId: '1',
      compoundName: 'Azhar Residence',
      buildingNumber: (m.houseNumber || '').split('-')[0] || '',
      unitNumber: m.houseNumber || '',
      responsibleName: m.userName || m.assignedToName || '',
      startDate: m.createdAt ? String(m.createdAt).slice(0, 10) : '',
      targetEndDate: dateOnly(m.targetEndDate),
      workActivity: m.title || m.category || 'Maintenance',
      totalAmount: Number(m.totalAmount || 0),
      status: statusMap[m.status] || 'New',
      daysToEnd: 0,
      assignedStaffId: m.assignedToId || '',
      assignedStaffName: m.assignedToName || '',
      notes: m.adminNotes || m.description || ''
    }));
  },

  async addMaintenanceRequest(req: Omit<MaintenanceRequest, 'id'>): Promise<MaintenanceRequest> {
    const payload = {
      houseNumber: req.unitNumber,
      title: req.workActivity,
      category: req.workActivity,
      priority: 'Normal',
      description: req.notes || ''
    };
    const res = await authedFetch('/Maintenance', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create maintenance request');
    return { ...req, id: String(Date.now()) } as MaintenanceRequest;
  },

  async updateMaintenanceStatus(id: string, status: MaintenanceStatus): Promise<any> {
    const res = await authedFetch(`/Maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    return res.ok ? res.json() : null;
  },

  // Complaints
  async getComplaints(): Promise<Complaint[]> {
    const res = await authedFetch('/Complaints');
    if (!res.ok) throw new Error('Failed to fetch complaints');
    const data = asList(await res.json());
    const statusMap: Record<string, ComplaintStatus> = {
      Open: 'New', New: 'New', 'In Progress': 'In Progress', InProgress: 'In Progress',
      Resolved: 'Resolved', Closed: 'Closed', Done: 'Resolved'
    };
    const priorityMap: Record<string, ComplaintPriority> = {
      High: 'High', Urgent: 'High', Medium: 'Medium', Low: 'Low'
    };
    return data.map((c: any) => ({
      id: c.id,
      ticketNo: c.ticketNumber || c.ticketNo || `TKT-${(c.id || '').slice(0, 8).toUpperCase()}`,
      complainantName: c.userName || c.complainantName || 'Tenant',
      buildingNumber: (c.houseNumber || '').split('-')[0] || '',
      unitNumber: c.houseNumber || '',
      phone: c.phoneNumber || '',
      category: c.category || 'General',
      priority: priorityMap[c.priority] || 'Medium',
      description: c.description || c.title || '',
      status: statusMap[c.status] || 'New',
      createdAt: dateOnly(c.createdAt),
      resolutionNotes: c.adminReply || ''
    }));
  },

  async addComplaint(complaint: Omit<Complaint, 'id'>): Promise<Complaint> {
    const payload = {
      houseNumber: complaint.unitNumber,
      title: complaint.category,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority
    };
    const res = await authedFetch('/Complaints', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create complaint');
    return { ...complaint, id: String(Date.now()) } as Complaint;
  },

  async updateComplaintStatus(id: string, status: ComplaintStatus, resolutionNotes?: string): Promise<any> {
    const res = await authedFetch(`/Complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminReply: resolutionNotes || '' })
    });
    return res.ok ? res.json() : null;
  },

  // Staff
  async getStaffMembers(): Promise<StaffMember[]> {
    const res = await authedFetch('/staff');
    if (!res.ok) throw new Error('Failed to fetch staff');
    const data = asList(await res.json());
    return data.map((s: any, i: number) => ({
      id: s.id,
      empCode: s.empCode || `EMP-${String(i + 1).padStart(3, '0')}`,
      name: s.fullName || s.name || 'Staff',
      role: s.position || s.specialization || s.role || 'Maintenance',
      mobile: s.phoneNumber || s.mobile || '',
      whatsapp: s.whatsappNumber || s.phoneNumber || '',
      nationalId: s.nationalId || '',
      status: (s.isActive === false ? 'Suspended' : 'Active') as StaffStatus,
      joiningDate: s.createdAt ? String(s.createdAt).slice(0, 10) : '',
      salary: Number(s.salary || 0),
      password: s.password || '',
      notes: s.notes || ''
    }));
  },

  async addStaff(staff: Omit<StaffMember, 'id'>): Promise<StaffMember> {
    const payload = {
      fullName: staff.name,
      phoneNumber: staff.mobile,
      email: `${staff.empCode || 'EMP'}@azhar.com`,
      position: staff.role,
      isActive: staff.status !== 'Suspended'
    };
    const res = await authedFetch('/staff', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create staff');
    return { ...staff, id: String(Date.now()) } as StaffMember;
  },

  async updateStaffStatus(id: string, status: StaffStatus): Promise<any> {
    const res = await authedFetch(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: status !== 'Suspended' })
    });
    return res.ok ? res.json() : null;
  },

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    const res = await authedFetch('/Expenses');
    if (!res.ok) throw new Error('Failed to fetch expenses');
    const data = asList(await res.json());
    return data.map((x: any) => ({
      id: x.id,
      voucherNo: x.invoiceNumber || x.voucherNumber || x.voucherNo || `V-${(x.id || '').slice(0, 8).toUpperCase()}`,
      category: toExpenseCatFront(x.categoryName || x.category),
      title: x.description || x.title || 'Expense',
      amount: Number(x.amount || 0),
      recipient: x.payee || x.recipient || x.vendor || x.addedBy || '',
      paymentMethod: toPaymentFront(x.paymentMethodName || x.paymentMethod),
      expenseDate: dateOnly(x.expenseDate || x.date),
      compoundId: '1',
      invoiceNumber: x.invoiceNumber || '',
      notes: x.notes || ''
    }));
  },

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const payload = {
      description: expense.title || expense.category,
      category: toExpenseCatServer(expense.category),
      amount: Number(expense.amount || 0),
      paymentMethod: toPaymentServer(expense.paymentMethod),
      invoiceNumber: expense.invoiceNumber || expense.voucherNo || '',
      expenseDate: normalizeDate(expense.expenseDate) || new Date().toISOString().slice(0, 10),
      notes: expense.notes || ''
    };
    const res = await authedFetch('/Expenses', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create expense');
    const created = await res.json();
    return { ...expense, id: created.id || String(Date.now()) } as Expense;
  },

  async updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
    const payload = {
      amount: Number(expense.amount || 0),
      category: toExpenseCatServer(expense.category || ''),
      paymentMethod: toPaymentServer(expense.paymentMethod || ''),
      notes: expense.notes || ''
    };
    const res = await authedFetch(`/Expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update expense');
    return { ...expense, id } as Expense;
  },

  async deleteExpense(id: string) {
    const res = await authedFetch(`/Expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete expense');
    return res.json();
  },

  async getExpenseDashboard(): Promise<any> {
    const res = await authedFetch('/Expenses/dashboard');
    if (!res.ok) throw new Error('Failed to fetch expense dashboard');
    return res.json();
  },

  // Meters
  async getElectricityMeters(): Promise<ElectricityMeter[]> {
    const res = await authedFetch('/ElectricityMeter');
    if (!res.ok) throw new Error('Failed to fetch electricity meters');
    const data = asList(await res.json());
    return data.map((m: any) => ({
      id: m.id,
      compoundId: '1',
      building: m.buildingNumber || (m.houseNumber || '').split('-')[0] || '',
      unitNumber: m.unitNumber || m.houseNumber || '',
      houseId: m.houseId || '',
      meterNumber: m.meterNumber || '',
      paymentNumber: m.paymentAccountNumber || m.paymentNumber || '',
      transferredToTenant: Boolean(m.houseId),
      isRented: Boolean(m.houseId)
    }));
  },

  async addElectricityMeter(meter: Omit<ElectricityMeter, 'id'>): Promise<ElectricityMeter> {
    const payload = {
      houseId: meter.houseId || await this.resolveHouseId(meter.unitNumber || meter.building || ''),
      meterNumber: meter.meterNumber,
      paymentAccountNumber: meter.paymentNumber || ''
    };
    const res = await authedFetch('/ElectricityMeter', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create electricity meter');
    const created = await res.json();
    return { ...meter, id: created.id || String(Date.now()) } as ElectricityMeter;
  },

  async updateElectricityMeter(id: string, meter: Partial<ElectricityMeter>): Promise<ElectricityMeter> {
    const payload = {
      houseId: meter.houseId || await this.resolveHouseId(meter.unitNumber || meter.building || ''),
      meterNumber: meter.meterNumber,
      paymentAccountNumber: meter.paymentNumber || ''
    };
    const res = await authedFetch(`/ElectricityMeter/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update electricity meter');
    return { ...meter, id } as ElectricityMeter;
  },

  async deleteElectricityMeter(id: string) {
    const res = await authedFetch(`/ElectricityMeter/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete electricity meter');
    return res.json();
  },

  async getWaterMeters(): Promise<WaterMeter[]> {
    const res = await authedFetch('/WaterMeters');
    if (!res.ok) throw new Error('Failed to fetch water meters');
    const data = asList(await res.json());
    return data.map((m: any) => ({
      id: m.id,
      houseId: m.houseId || '',
      building: m.houseNumber || (m.houseId || '').slice(0, 8) || '',
      meterNumber: m.meterNumber || '',
      lastReading: Number(m.lastReading || 0),
      readingDate: dateOnly(m.lastReadingDate)
    }));
  },

  async addWaterMeter(meter: Omit<WaterMeter, 'id'>): Promise<WaterMeter> {
    const payload = {
      houseId: meter.houseId || await this.resolveHouseId(meter.building || ''),
      meterNumber: meter.meterNumber
    };
    const res = await authedFetch('/WaterMeters', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create water meter');
    const created = await res.json();
    return { ...meter, id: created.id || String(Date.now()) } as WaterMeter;
  },

  async updateWaterMeter(id: string, meter: Partial<WaterMeter>): Promise<WaterMeter> {
    const payload = {
      houseId: meter.houseId || await this.resolveHouseId(meter.building || ''),
      meterNumber: meter.meterNumber
    };
    const res = await authedFetch(`/WaterMeters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update water meter');
    return { ...meter, id } as WaterMeter;
  },

  async deleteWaterMeter(id: string) {
    const res = await authedFetch(`/WaterMeters/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete water meter');
    return res.json();
  },

  // Payments — azhar.runasp.net has no /Payment endpoint; aggregate the
  // working per-contract /Contracts/{id}/payments records instead.
  async getPayments(): Promise<PaymentRecord[]> {
    const records: PaymentRecord[] = [];
    try {
      const res = await authedFetch('/Contracts');
      if (!res.ok) return records;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
      for (const c of list) {
        try {
          const pRes = await authedFetch(`/Contracts/${c.id}/payments`);
          if (!pRes.ok) continue;
          const pList = asList(await pRes.json());
          pList.forEach((p: any) => {
            const date = p.paymentDate ? String(p.paymentDate).slice(0, 10) : '';
            const d = date ? new Date(date) : null;
            records.push({
              id: p.id,
              tenantId: c.tenantId || '',
              tenantName: c.tenantName || '',
              unitNumber: c.unitNumber || '',
              amount: Number(p.amount || 0),
              month: d ? d.getMonth() + 1 : 0,
              year: d ? d.getFullYear() : 0,
              paymentMethod: p.paymentMethod || '',
              status: 'Paid',
              paymentDate: date
            });
          });
        } catch (err) { /* ignore */ }
      }
    } catch (err) { /* ignore */ }
    return records;
  },

  // Kept for API compatibility; server has no /Payment POST. Local record only.
  async addPayment(payment: { tenantId: string; tenantName: string; unitNumber: string; amount: number; month: number; year: number; paymentMethod: string; status: string }): Promise<PaymentRecord> {
    return {
      id: String(Date.now()),
      tenantId: payment.tenantId,
      tenantName: payment.tenantName,
      unitNumber: payment.unitNumber,
      amount: payment.amount,
      month: payment.month,
      year: payment.year,
      paymentMethod: payment.paymentMethod,
      status: payment.status || 'Paid',
      paymentDate: new Date().toISOString().slice(0, 10)
    };
  },

  // Companies — azhar.runasp.net returns 500 for /Company; no view consumes
  // this data, so it is not called and gracefully returns an empty list.
  async getCompanies(): Promise<Company[]> {
    return [];
  },

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    const res = await authedFetch('/Announcements');
    if (!res.ok) throw new Error('Failed to fetch announcements');
    const data = asList(await res.json());
    return data.map((a: any) => ({
      id: a.id,
      title: a.title || '',
      description: a.description || '',
      announcementDate: a.announcementDate && a.announcementDate.startsWith('0001') ? a.createdAt : a.announcementDate,
      createdAt: a.createdAt || '',
      isActive: a.isActive !== false,
      imageUrls: a.imageUrls || []
    }));
  },

  // Letters
  async getLetters(): Promise<Letter[]> {
    const res = await authedFetch('/letters');
    if (!res.ok) throw new Error('Failed to fetch letters');
    const data = asList(await res.json());
    return data.map((l: any) => ({
      id: l.id,
      title: l.title || '',
      content: l.content || '',
      recipientType: l.recipientType || '',
      recipientId: l.recipientId || null,
      recipientName: l.recipientName || '',
      sentById: l.sentById || '',
      sentByName: l.sentByName || '',
      sentAt: l.sentAt || ''
    }));
  },

  async createLetter(letterData: { title: string; content: string; recipientType?: string; recipientName?: string }): Promise<Letter> {
    const payload = {
      title: letterData.title,
      content: letterData.content,
      recipientType: letterData.recipientType || 'AllTenants',
      recipientId: null,
      recipientName: letterData.recipientName || ''
    };

    const res = await authedFetch('/letters', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create letter');

    const letters = await this.getLetters();
    const created = letters.find(l => l.title === payload.title);
    return created || {
      id: String(Date.now()),
      title: payload.title,
      content: payload.content,
      recipientType: payload.recipientType,
      recipientId: null,
      recipientName: payload.recipientName,
      sentById: '',
      sentByName: 'Admin',
      sentAt: new Date().toISOString()
    };
  },

  // Backend exposes no PUT/PATCH for letters → implement edit as create + delete
  // (create first so a failure never leaves the letter deleted).
  async updateLetter(id: string, letterData: { title: string; content: string; recipientType?: string; recipientName?: string }): Promise<Letter> {
    const created = await this.createLetter(letterData);
    try {
      await this.deleteLetter(id);
    } catch {
      // old copy couldn't be removed from server; keep the new one
    }
    return created;
  },

  async deleteLetter(id: string) {
    const res = await authedFetch(`/letters/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete letter');
    return res.json();
  },

  // Facilities
  async getFacilities(): Promise<Facility[]> {
    const res = await authedFetch('/Facilities');
    if (!res.ok) throw new Error('Failed to fetch facilities');
    return asList(await res.json()).map((f: any) => ({
      id: f.id,
      name: f.arabicName || f.nameAr || f.name || '',
      nameEn: f.englishName || f.nameEn || f.name || '',
      category: toFacCatFront(f.category) as FacilityCategory,
      iconName: f.iconName || '',
      description: f.description || '',
      location: f.location || '',
      operatingHours: f.workingHours || f.operatingHours || '',
      capacityLimit: Number(f.capacity || f.capacityLimit || 0),
      isAvailable: f.isBookingAvailable !== false && f.isAvailable !== false,
      image: f.image || FACILITY_FALLBACK_IMAGE
    }));
  },

  async getAvailableFacilities(): Promise<Facility[]> {
    const res = await authedFetch('/Facilities/available');
    if (!res.ok) return [];
    return asList(await res.json()).map((f: any) => ({
      id: f.id,
      name: f.arabicName || f.name || '',
      nameEn: f.englishName || f.name || '',
      category: toFacCatFront(f.category) as FacilityCategory,
      iconName: '',
      description: f.description || '',
      location: f.location || '',
      operatingHours: f.workingHours || '',
      capacityLimit: Number(f.capacity || 0),
      isAvailable: f.isBookingAvailable !== false,
      image: FACILITY_FALLBACK_IMAGE
    }));
  },

  async createFacility(data: Omit<Facility, 'id'>): Promise<Facility> {
    const payload = {
      arabicName: data.name,
      englishName: data.nameEn || data.name,
      category: toFacCatServer(data.category),
      location: data.location || '',
      workingHours: data.operatingHours || '',
      capacity: Number(data.capacityLimit || 0),
      description: data.description || '',
      isBookingAvailable: data.isAvailable !== false
    };
    const res = await authedFetch('/Facilities', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to create facility');
    const created = await res.json();
    return { ...data, id: created.id || String(Date.now()) };
  },

  async updateFacility(id: string, data: Partial<Facility>): Promise<Facility> {
    const payload = {
      arabicName: data.name,
      englishName: data.nameEn || data.name,
      category: toFacCatServer(data.category || 'Hall'),
      location: data.location || '',
      workingHours: data.operatingHours || '',
      capacity: Number(data.capacityLimit || 0),
      description: data.description || '',
      isBookingAvailable: data.isAvailable !== false
    };
    const res = await authedFetch(`/Facilities/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to update facility');
    const updated = await res.json();
    return { ...data, id } as Facility;
  },

  async deleteFacility(id: string): Promise<void> {
    const res = await authedFetch(`/Facilities/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete facility');
  },

  // Facility Bookings — /facility-bookings endpoint is live on azhar.runasp.net.
  async getFacilityBookings(): Promise<FacilityBooking[]> {
    try {
      const res = await authedFetch('/facility-bookings');
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
      return list.map((b: any) => ({
        id: b.id || String(Date.now()),
        bookingNo: b.bookingNo || `FBK-${b.id || Date.now()}`,
        facilityId: b.facilityId || '',
        facilityName: b.facilityName || '',
        tenantId: b.tenantId || '',
        tenantName: b.tenantName || '',
        unitNumber: b.unitNumber || '',
        mobile: b.mobile || '',
        bookingDate: b.bookingDate || '',
        startTime: b.fromTime || b.startTime || '',
        endTime: b.toTime || b.endTime || '',
        guestsCount: b.guestsCount || 0,
        purpose: b.purpose || b.notes || '',
        status: (b.status || 'Pending') as FacilityBookingStatus,
        createdAt: b.createdAt || new Date().toISOString(),
        adminNotes: b.adminNotes || '',
        approvedBy: b.approvedBy || ''
      }));
    } catch { return []; }
  },

  async createFacilityBooking(data: Omit<FacilityBooking, 'id' | 'bookingNo' | 'createdAt' | 'status'> & { status?: FacilityBookingStatus }): Promise<FacilityBooking> {
    try {
      const res = await authedFetch('/facility-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dto: {
            facilityId: data.facilityId,
            tenantId: data.tenantId,
            bookingDate: data.bookingDate,
            fromTime: data.startTime || '10:00:00',
            toTime: data.endTime || '14:00:00',
            notes: data.purpose || ''
          }
        })
      });
      if (res.ok) {
        const saved = await res.json();
        return {
          id: saved.id || String(Date.now()),
          bookingNo: saved.bookingNo || `FBK-${saved.id || Date.now()}`,
          facilityId: saved.facilityId || data.facilityId,
          facilityName: saved.facilityName || data.facilityName || '',
          tenantId: saved.tenantId || data.tenantId,
          tenantName: saved.tenantName || data.tenantName || '',
          unitNumber: saved.unitNumber || data.unitNumber || '',
          mobile: saved.mobile || data.mobile || '',
          bookingDate: saved.bookingDate || data.bookingDate,
          startTime: saved.fromTime || saved.startTime || data.startTime || '',
          endTime: saved.toTime || saved.endTime || data.endTime || '',
          guestsCount: saved.guestsCount || data.guestsCount || 0,
          purpose: saved.purpose || saved.notes || data.purpose || '',
          status: (saved.status || data.status || 'Pending') as FacilityBookingStatus,
          createdAt: saved.createdAt || new Date().toISOString(),
          adminNotes: saved.adminNotes || '',
          approvedBy: saved.approvedBy || ''
        };
      }
    } catch { /* fall through */ }
    return {
      ...data,
      status: (data.status || 'Pending') as FacilityBookingStatus,
      id: String(Date.now()),
      bookingNo: `FBK-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
  },

  async updateFacilityBooking(id: string, data: Partial<FacilityBooking>): Promise<FacilityBooking> {
    try {
      const res = await authedFetch(`/facility-bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dto: {
            facilityId: data.facilityId,
            tenantId: data.tenantId,
            bookingDate: data.bookingDate,
            fromTime: data.startTime,
            toTime: data.endTime,
            notes: data.purpose || ''
          }
        })
      });
      if (res.ok) return { ...data, id } as FacilityBooking;
    } catch { /* fall through */ }
    return { ...data, id } as FacilityBooking;
  },

  async deleteFacilityBooking(id: string): Promise<void> {
    try {
      const res = await authedFetch(`/facility-bookings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete facility booking');
    } catch { /* ignore */ }
  },

  // Reports — azhar.runasp.net has no working /Reports endpoint (500);
  // no view consumes this, so it is not called and returns an empty list.
  async getReports(): Promise<RentReport[]> {
    return [];
  },

  // Profile — azhar.runasp.net has no /Profile endpoint (500); profile data
  // lives in localStorage, so this gracefully returns null.
  async getProfile(): Promise<any> {
    return null;
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const res = await authedFetch('/Notifications');
    if (!res.ok) throw new Error('Failed to fetch notifications');
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
    return list.map((n: any) => ({
      id: n.id,
      title: n.title || '',
      body: n.body || '',
      type: n.type || '',
      relatedEntityId: n.relatedEntityId || '',
      isRead: Boolean(n.isRead),
      createdAt: n.createdAt || ''
    }));
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const res = await authedFetch(`/Notifications/${id}/read`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to mark notification as read');
  },

  async registerFcmToken(fcmToken: string, deviceType: string = 'web'): Promise<void> {
    const res = await authedFetch('/Account/fcm-token', {
      method: 'PUT',
      body: JSON.stringify({ fcmToken, deviceType })
    });
    if (!res.ok) throw new Error('Failed to register FCM token');
  },

  // No /Profile endpoint on azhar.runasp.net — profile is kept in localStorage
  // by App.tsx, so this is a local no-op.
  async updateProfile(data: { displayName?: string; email?: string; profileImageUrl?: string }): Promise<void> {
    return;
  },

  // No /Profile upload endpoint — convert to a base64 data URL so the avatar
  // persists in localStorage across page refreshes.
  async uploadProfileImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }
};

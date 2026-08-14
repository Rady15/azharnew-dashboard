import { Tenant, Contract, Unit, ElectricityMeter, MaintenanceRequest, MaintenanceStatus, WaterMeter, Complaint, ComplaintStatus, ComplaintPriority, StaffMember, StaffStatus, Expense, DueItem, PaymentRecord, PaymentInstallment, Company, Letter, Announcement, RentReport, Notification, Facility, FacilityBooking, FacilityBookingStatus } from '../types';

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

  // Current authenticated user from the server.
  async getSessionUser(): Promise<any | null> {
    const res = await authedFetch('/Account/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  },

  // Finance mapping — the single source of truth for money numbers.
  // Built from the server's /Reports (rent ledger) + /Payment (collections),
  // keyed by tenantId so every section (collections, contracts, dues rents)
  // shows identical paid / remaining amounts.
  async getFinanceSummary(): Promise<Map<string, FinanceSummary>> {
    let reports: any[] = [];
    let payments: any[] = [];
    try {
      const [rRes, pRes] = await Promise.all([
        authedFetch('/Reports'),
        authedFetch('/payment')
      ]);
      if (rRes.ok) reports = asList(await rRes.json());
      if (pRes.ok) payments = asList(await pRes.json());
    } catch (err) { /* ignore */ }

    const payByTenant = new Map<string, number>();
    payments.forEach((p: any) => {
      const tid = p.tenantId || '';
      const amt = Number(p.amount || 0);
      if (tid) payByTenant.set(tid, (payByTenant.get(tid) || 0) + amt);
    });

    const map = new Map<string, FinanceSummary>();
    reports.forEach((r: any) => {
      const tid = r.tenantId || '';
      if (!tid) return;
      const rentValue = Number(r.rentAmount || 0);
      const paidAmount = Math.max(Number(r.paidAmount || 0), payByTenant.get(tid) || 0);
      const remainingAmount = Math.max(0, Number(r.remainingAmount || 0));
      const st = (r.status || '').toLowerCase();
      map.set(tid, {
        tenantId: tid,
        paidAmount,
        remainingAmount,
        rentValue,
        remainingRents: rentValue > 0 ? Math.max(1, Math.ceil(remainingAmount / rentValue)) : 1,
        rentFrequency: r.rentFrequency || '',
        status: st === 'paid' ? 'Paid' : (st.includes('expired') || st.includes('overdue')) ? 'Overdue' : 'Due Soon',
        nextDueDate: dateOnly(r.nextDueDate),
        contractEndDate: dateOnly(r.contractEndDate)
      });
    });
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
        fullNameArabic: t.fullNameArabic || '',
        email: t.email || '',
        mobile: t.phoneNumber || t.mobile || '',
        emergencyPhone: t.emergencyContactPhone || t.emergencyPhoneNumber || t.emergencyPhone || '',
        whatsapp: t.whatsappNumber || t.whatsapp || t.phoneNumber || '',
        nationality: t.nationality || '',
        familyCount: t.familyCount || '1',
        workNotes: t.workNotes || '',
        isMarried: t.isMarried !== undefined ? t.isMarried : true,
        companyName: t.companyName || t.company || 'AZ',
        company: t.company || t.companyName || 'AZ',
        tenantRemarks: t.tenantRemarks || '',
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
        electricityMeter: t.electricityMeter || '',
        isActive: t.isActive,
        archived: t.isActive === false
      };
    });
  },

  async addTenant(tenantData: Partial<Tenant>): Promise<Tenant> {
    const payload = {
      fullName: tenantData.name,
      fullNameArabic: tenantData.fullNameArabic || '',
      email: tenantData.email,
      phoneNumber: tenantData.mobile,
      emergencyContactPhone: tenantData.emergencyPhone || '',
      nationality: tenantData.nationality || '',
      familyCount: String(tenantData.familyCount || '1'),
      workNotes: tenantData.workNotes || '',
      isMarried: tenantData.isMarried !== undefined ? tenantData.isMarried : true,
      whatsappNumber: tenantData.whatsapp || tenantData.mobile,
      tenantRemarks: tenantData.tenantRemarks || '',
      companyName: tenantData.companyName || tenantData.company || 'AZ',
      houseNumber: tenantData.unitNumber || tenantData.houseNumber || ''
    };

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
    const payload = {
      fullName: tenantData.name,
      fullNameArabic: tenantData.fullNameArabic,
      email: tenantData.email,
      phoneNumber: tenantData.mobile,
      emergencyContactPhone: tenantData.emergencyPhone,
      nationality: tenantData.nationality,
      familyCount: String(tenantData.familyCount || '1'),
      workNotes: tenantData.workNotes,
      isMarried: tenantData.isMarried,
      whatsappNumber: tenantData.whatsapp,
      tenantRemarks: tenantData.tenantRemarks,
      companyName: tenantData.companyName || tenantData.company,
      houseNumber: tenantData.unitNumber || tenantData.houseNumber,
      isActive: !tenantData.archived
    };

    const res = await authedFetch(`/Tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update tenant');
    return { ...tenantData, id } as Tenant;
  },

  async toggleTenantArchive(id: string) {
    const res = await authedFetch(`/Tenants/${id}/toggle-active`, { method: 'PUT' });
    return res.json();
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
          const waterYearlyBill = Number(c.waterYearlyBill || 0);
          const totalYearlyRent = annualRent + waterYearlyBill;
          const paidAmount = Number(c.paidAmount || 0);
          const remainingAmount = Number(c.remainingAmount || Math.max(0, totalYearlyRent - paidAmount));
          return {
            id: c.id,
            contractNo: c.contractNo || c.contractNumber || `CNT-${Date.now()}`,
            compoundId: '1',
            compoundName: 'Azhar Residence',
            buildingNumber: (c.houseNumber || c.houseId || '').toString().split('-')[0] || '101',
            unitNumber: c.unitNumber || '',
            unitType: (c.unitType || 'Apartment') as Contract['unitType'],
            tenantId: c.tenantId || '',
            tenantName: c.tenantName || '',
            tenantMobile: c.tenantMobile || '',
            emergencyPhone: c.emergencyPhone || '',
            tenantNationality: c.nationalId ? '' : '',
            representativeName: c.representativeName || 'Mohammed Barmada',
            contractOf: c.contractOf || 'Mohammed Barmada',
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
            paymentFrequency: (c.paymentMethod || 'Quarterly') as Contract['paymentFrequency'],
            paymentMethod: c.paymentMethod || 'Quarterly',
            paymentNumber: c.paymentNumber || '',
            electricityMeterNumber: c.electricityMeterNumber || '',
            verifiedInEjar: c.verifiedInEjar !== false,
            transferAccountToTenant: c.transferAccountToTenant !== false,
            insurance: Number(c.insurance || 0),
            commission: Number(c.commission || 0),
            englishNotes: c.englishNotes || '',
            arabicNotes: c.arabicNotes || '',
            status: (c.status === 'Active' || c.status === 'Pending') ? c.status : (c.isArchived ? 'Archived' : (expired ? 'Pending' : 'Active')) as Contract['status'],
            notes: c.notes || [],
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
          representativeName: 'Mohammed Barmada',
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
    const res = await authedFetch('/house');
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
        buildingNumber: (h.houseNumber || '').split('-')[0] || '101',
        unitNumber: h.houseNumber || '101',
        rooms: Number(h.roomsCount || 3),
        baths: Number(h.bathroomsCount || 2),
        living: h.hasInstalledKitchen ? 1 : 0,
        majlis: 0,
        area: String(h.area || ''),
        type: 'Appartment',
        status: occupied ? 'Occupied' : 'Vacant',
        annualRent: Number(tenant?.annualRent || 0),
        currentTenantId: tenant?.id || h.userId || '',
        currentTenantName: tenant?.fullName || h.userDisplayName || ''
      };
    });
  },

  async addContract(contractData: Partial<Contract>): Promise<Contract> {
    const res = await authedFetch('/Contracts', {
      method: 'POST',
      body: JSON.stringify(contractData)
    });
    if (!res.ok) throw new Error('Failed to create contract');
    return res.json();
  },

  async updateContract(id: string, contractData: Partial<Contract>): Promise<Contract> {
    const res = await authedFetch(`/Contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contractData)
    });
    if (!res.ok) throw new Error('Failed to update contract');
    return res.json();
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
    const res = await authedFetch('/Expense');
    if (!res.ok) throw new Error('Failed to fetch expenses');
    const data = asList(await res.json());
    return data.map((x: any) => ({
      id: x.id,
      voucherNo: x.voucherNumber || x.voucherNo || `V-${(x.id || '').slice(0, 8).toUpperCase()}`,
      category: x.category || 'Other',
      title: x.description || x.title || 'Expense',
      amount: Number(x.amount || 0),
      recipient: x.payee || x.recipient || x.vendor || '',
      paymentMethod: x.paymentMethod || 'Cash',
      expenseDate: dateOnly(x.date || x.expenseDate),
      compoundId: '1',
      notes: x.notes || ''
    }));
  },

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const payload = {
      description: expense.title || expense.category,
      category: expense.category,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      date: expense.expenseDate,
      notes: expense.notes || ''
    };
    const res = await authedFetch('/Expense', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create expense');
    return { ...expense, id: String(Date.now()) } as Expense;
  },

  // Meters
  async getElectricityMeters(): Promise<ElectricityMeter[]> {
    const res = await authedFetch('/ElectricityMeter');
    if (!res.ok) throw new Error('Failed to fetch electricity meters');
    const data = asList(await res.json());
    return data.map((m: any) => ({
      id: m.id,
      compoundId: '1',
      building: (m.houseNumber || '').split('-')[0] || '',
      unitNumber: m.houseNumber || '',
      meterNumber: m.meterNumber || '',
      paymentNumber: m.paymentNumber || '',
      transferredToTenant: Boolean(m.transferredToTenant),
      isRented: Boolean(m.houseId)
    }));
  },

  async addElectricityMeter(meter: Omit<ElectricityMeter, 'id'>): Promise<ElectricityMeter> {
    const payload = {
      meterNumber: meter.meterNumber,
      houseNumber: meter.unitNumber
    };
    const res = await authedFetch('/ElectricityMeter', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create electricity meter');
    return { ...meter, id: String(Date.now()) } as ElectricityMeter;
  },

  // Water meters are not a real server entity - derive from tenants' water bills
  async getWaterMeters(): Promise<WaterMeter[]> {
    const tenants = await this.getTenants();
    return tenants
      .filter(t => t.houseNumber && t.waterCost !== '' && Number(t.waterCost) > 0)
      .map(t => ({
        id: `water-${t.id}`,
        building: t.houseNumber || '',
        meterNumber: `WTR-${t.houseNumber || ''}`,
        lastReading: Number(t.waterCost || 0),
        readingDate: t.contractEndDate ? String(t.contractEndDate).slice(0, 10) : ''
      }));
  },

  async addWaterMeter(meter: Omit<WaterMeter, 'id'>): Promise<WaterMeter> {
    throw new Error('Water meters are managed on the server via tenant billing');
  },

  // Payments
  async getPayments(): Promise<PaymentRecord[]> {
    const res = await authedFetch('/Payment');
    if (!res.ok) throw new Error('Failed to fetch payments');
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
    return list.map((p: any) => ({
      id: p.id,
      tenantId: p.tenantId || '',
      tenantName: p.tenantName || '',
      unitNumber: p.unitNumber || '',
      amount: Number(p.amount || 0),
      month: p.month,
      year: p.year,
      paymentMethod: p.paymentMethod || '',
      status: p.status || 'Paid',
      paymentDate: p.paymentDate ? String(p.paymentDate).slice(0, 10) : ''
    }));
  },

  async addPayment(payment: { tenantId: string; tenantName: string; unitNumber: string; amount: number; month: number; year: number; paymentMethod: string; status: string }): Promise<PaymentRecord> {
    const res = await authedFetch('/Payment', {
      method: 'POST',
      body: JSON.stringify(payment)
    });
    if (!res.ok) throw new Error('Failed to create payment');
    const data = await res.json();
    return {
      id: data.id,
      tenantId: data.tenantId || '',
      tenantName: data.tenantName || '',
      unitNumber: data.unitNumber || '',
      amount: Number(data.amount || 0),
      month: data.month,
      year: data.year,
      paymentMethod: data.paymentMethod || '',
      status: data.status || 'Paid',
      paymentDate: data.paymentDate ? String(data.paymentDate).slice(0, 10) : ''
    };
  },

  // Companies
  async getCompanies(): Promise<Company[]> {
    const res = await authedFetch('/Company');
    if (!res.ok) throw new Error('Failed to fetch companies');
    const data = asList(await res.json());
    return data.map((c: any) => ({
      id: c.id,
      companyName: c.companyName || '',
      contactPerson: c.contactPerson || '',
      specialization: c.specialization || '',
      email: c.email || '',
      phone: c.phone || '',
      notes: c.notes || ''
    }));
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
      name: f.name || f.nameAr || '',
      nameEn: f.nameEn || f.name || '',
      category: f.category || 'Hall',
      iconName: f.iconName || '',
      description: f.description || '',
      location: f.location || '',
      operatingHours: f.operatingHours || '',
      capacityLimit: Number(f.capacityLimit || 0),
      isAvailable: f.isAvailable !== false,
      image: f.image || ''
    }));
  },

  async createFacility(data: Omit<Facility, 'id'>): Promise<Facility> {
    const res = await authedFetch('/Facilities', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create facility');
    const created = await res.json();
    return { ...data, id: created.id || String(Date.now()) };
  },

  async updateFacility(id: string, data: Partial<Facility>): Promise<Facility> {
    const res = await authedFetch(`/Facilities/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update facility');
    const updated = await res.json();
    return { ...data, id } as Facility;
  },

  async deleteFacility(id: string): Promise<void> {
    const res = await authedFetch(`/Facilities/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete facility');
  },

  // Facility Bookings
  async getFacilityBookings(): Promise<FacilityBooking[]> {
    const res = await authedFetch('/FacilityBookings');
    if (!res.ok) throw new Error('Failed to fetch facility bookings');
    return asList(await res.json()).map((b: any) => ({
      id: b.id,
      bookingNo: b.bookingNo || b.bookingNumber || '',
      facilityId: b.facilityId || '',
      facilityName: b.facilityName || '',
      tenantId: b.tenantId || '',
      tenantName: b.tenantName || '',
      unitNumber: b.unitNumber || '',
      mobile: b.mobile || '',
      bookingDate: dateOnly(b.bookingDate),
      startTime: b.startTime || '',
      endTime: b.endTime || '',
      guestsCount: Number(b.guestsCount || 0),
      purpose: b.purpose || '',
      status: b.status || 'Pending',
      createdAt: b.createdAt || '',
      adminNotes: b.adminNotes || '',
      approvedBy: b.approvedBy || ''
    }));
  },

  async createFacilityBooking(data: Omit<FacilityBooking, 'id' | 'bookingNo' | 'createdAt' | 'status'> & { status?: FacilityBookingStatus }): Promise<FacilityBooking> {
    const res = await authedFetch('/FacilityBookings', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create facility booking');
    const created = await res.json();
    return {
      ...data,
      status: (data.status || 'Pending') as FacilityBookingStatus,
      id: created.id || String(Date.now()),
      bookingNo: created.bookingNo || `FBK-${Date.now()}`,
      createdAt: created.createdAt || new Date().toISOString()
    };
  },

  async updateFacilityBooking(id: string, data: Partial<FacilityBooking>): Promise<FacilityBooking> {
    const res = await authedFetch(`/FacilityBookings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update facility booking');
    const updated = await res.json();
    return { ...data, id } as FacilityBooking;
  },

  async deleteFacilityBooking(id: string): Promise<void> {
    const res = await authedFetch(`/FacilityBookings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete facility booking');
  },

  // Reports
  async getReports(): Promise<RentReport[]> {
    const res = await authedFetch('/Reports');
    if (!res.ok) throw new Error('Failed to fetch reports');
    const data = asList(await res.json());
    return data.map((r: any) => ({
      tenantId: r.tenantId || '',
      tenantName: r.tenantName || '',
      nextDueDate: dateOnly(r.nextDueDate),
      unitNumber: r.unitNumber || '',
      rentAmount: Number(r.rentAmount || 0),
      rentFrequency: r.rentFrequency || '',
      contractEndDate: dateOnly(r.contractEndDate),
      remainingDays: Number(r.remainingDays || 0),
      paidAmount: Number(r.paidAmount || 0),
      remainingAmount: Number(r.remainingAmount || 0),
      status: r.status || ''
    }));
  },

  // Profile
  async getProfile(): Promise<any> {
    const res = await authedFetch('/Profile');
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
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

  async updateProfile(data: { displayName?: string; email?: string; profileImageUrl?: string }): Promise<void> {
    const res = await authedFetch('/Profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update profile');
  },

  async uploadProfileImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('profileImage', file);
    const res = await authedFetch('/Profile', {
      method: 'PUT',
      body: form
    });
    if (!res.ok) throw new Error('Failed to upload profile image');
    const data = await res.json();
    return data?.profileImageUrl || data?.url || '';
  }
};

import React, { useState, useEffect } from 'react';
import { User, Unit, Building, Tenant, Contract, DueItem, MaintenanceRequest, MaintenanceStatus, WaterMeter, ElectricityMeter, Complaint, StaffMember, Expense, ComplaintStatus, StaffStatus, PaymentRecord, Company, Letter, Announcement, Facility, FacilityBooking, FacilityBookingStatus } from './types';
import { apiService, ensureAuth } from './services/api';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardMain } from './views/DashboardMain';
import { DashboardDues } from './views/DashboardDues';
import { DashboardDuesStats } from './views/DashboardDuesStats';
import { DashboardMaintenance } from './views/DashboardMaintenance';
import { DashboardMaintenanceStats } from './views/DashboardMaintenanceStats';
import { CompoundContracts } from './views/CompoundContracts';
import { CompoundUnits } from './views/CompoundUnits';
import { TenantsList } from './views/TenantsList';
import { MetersView } from './views/MetersView';
import { ComplaintsView } from './views/ComplaintsView';
import { StaffView } from './views/StaffView';
import { StaffPortalView } from './views/StaffPortalView';
import { TenantPortalView } from './views/TenantPortalView';
import { ExpensesView } from './views/ExpensesView';
import { LettersView } from './views/LettersView';
import { FacilitiesView } from './views/FacilitiesView';
import { FacilityBookingsView } from './views/FacilityBookingsView';
import { PatchNotesView } from './views/PatchNotesView';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { AdminPermissionsModal } from './components/AdminPermissionsModal';

export default function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </LanguageProvider>
  );
}

function MainApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('azhar_residence_user');
    if (!saved) return null;
    const user = JSON.parse(saved) as User;
    if (user.role === 'Admin') {
      return { ...user, name: 'Admin', email: 'admin@azhar.com' };
    }
    return user;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('azhar_contracts');
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showProfileSettings, setShowProfileSettings] = useState<boolean>(false);
  const [showAdminPermissions, setShowAdminPermissions] = useState<boolean>(false);

  // Entities state loaded from server
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [dues, setDues] = useState<DueItem[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [waterMeters, setWaterMeters] = useState<WaterMeter[]>([]);
  const [electricityMeters, setElectricityMeters] = useState<ElectricityMeter[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityBookings, setFacilityBookings] = useState<FacilityBooking[]>([]);
  const [serverProfile, setServerProfile] = useState<any>(null);

  // Load state from real Azhar backend server
  useEffect(() => {
    async function loadBackendData() {
      await ensureAuth();

      const all = await Promise.allSettled([
        apiService.getTenants(),
        apiService.getUnits(),
        apiService.getContracts(),
        apiService.getDues(),
        apiService.getMaintenanceRequests(),
        apiService.getComplaints(),
        apiService.getStaffMembers(),
        apiService.getExpenses(),
        apiService.getElectricityMeters(),
        apiService.getWaterMeters(),
        apiService.getPayments(),
        apiService.getCompanies(),
        apiService.getLetters(),
        apiService.getAnnouncements(),
        apiService.getFacilities(),
        apiService.getFacilityBookings(),
        apiService.getProfile()
      ]);

      const [tenantsRes, unitsRes, contractsRes, duesRes, maintRes, complaintsRes, staffRes, expensesRes, elecRes, waterRes, paymentsRes, companiesRes, lettersRes, announcementsRes, facilitiesRes, facilityBookingsRes, profileRes] = all;

      if (tenantsRes.status === 'fulfilled' && tenantsRes.value.length > 0) setTenants(tenantsRes.value);
      if (unitsRes.status === 'fulfilled' && unitsRes.value.length > 0) setUnits(unitsRes.value);
      if (contractsRes.status === 'fulfilled' && contractsRes.value.length > 0) setContracts(contractsRes.value);
      if (duesRes.status === 'fulfilled' && duesRes.value.length > 0) setDues(duesRes.value);
      if (maintRes.status === 'fulfilled' && maintRes.value.length > 0) setMaintenanceRequests(maintRes.value);
      if (complaintsRes.status === 'fulfilled' && complaintsRes.value.length > 0) setComplaints(complaintsRes.value);
      if (staffRes.status === 'fulfilled' && staffRes.value.length > 0) setStaffMembers(staffRes.value);
      if (expensesRes.status === 'fulfilled' && expensesRes.value.length > 0) setExpenses(expensesRes.value);
      if (elecRes.status === 'fulfilled' && elecRes.value.length > 0) setElectricityMeters(elecRes.value);
      if (waterRes.status === 'fulfilled' && waterRes.value.length > 0) setWaterMeters(waterRes.value);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value);
      if (companiesRes.status === 'fulfilled') setCompanies(companiesRes.value);
      if (lettersRes.status === 'fulfilled') setLetters(lettersRes.value);
      if (announcementsRes.status === 'fulfilled') setAnnouncements(announcementsRes.value);
      if (facilitiesRes.status === 'fulfilled' && facilitiesRes.value.length > 0) setFacilities(facilitiesRes.value);
      if (facilityBookingsRes.status === 'fulfilled' && facilityBookingsRes.value.length > 0) setFacilityBookings(facilityBookingsRes.value);
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setServerProfile(profileRes.value);
        const profileImageUrl = profileRes.value.profileImageUrl;
        if (profileImageUrl) {
          setCurrentUser(prev => prev ? { ...prev, profileImageUrl } : prev);
        }
      }

      // Derive buildings from real units
      if (unitsRes.status === 'fulfilled' && unitsRes.value.length > 0) {
        const seen = new Set<string>();
        const derived: Building[] = unitsRes.value
          .filter(u => u.buildingNumber && !seen.has(u.buildingNumber) && seen.add(u.buildingNumber))
          .map((u, i) => ({
            id: `bld-${i}`,
            compoundId: '1',
            compoundName: 'Azhar Residence',
            buildingNo: u.buildingNumber,
            remarks: '',
            forFamilies: true
          }));
        if (derived.length > 0) setBuildings(derived);
      }
    }

    loadBackendData();
  }, []);

  // Validate stored session: if tokens can't be refreshed and auto-login fails, force a real login.
  useEffect(() => {
    const storedUser = localStorage.getItem('azhar_residence_user');
    if (!storedUser) return;
    let cancelled = false;
    (async () => {
      const token = await ensureAuth();
      if (cancelled) return;
      if (!token) {
        setCurrentUser(null);
        localStorage.removeItem('azhar_residence_user');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = (user: User) => {
    const normalized = user.role === 'Admin' ? { ...user, email: user.email || 'admin@azhar.com' } : user;
    setCurrentUser(normalized);
    localStorage.setItem('azhar_residence_user', JSON.stringify(normalized));
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('azhar_residence_user', JSON.stringify(updatedUser));
    try {
      await apiService.updateProfile({
        displayName: updatedUser.name,
        email: updatedUser.email,
        profileImageUrl: updatedUser.profileImageUrl || updatedUser.avatar || ''
      });
    } catch (err) {
      console.error('Failed to update profile on server', err);
    }
  };

  const handleLogout = async () => {
    await apiService.logout();
    setCurrentUser(null);
    localStorage.removeItem('azhar_residence_user');
  };

  // Handlers
  const handleRecordPayment = (dueId: string) => {
    setDues(prev => prev.map(d => {
      if (d.id === dueId) {
        return {
          ...d,
          status: 'Paid',
          remainingRents: Math.max(0, d.remainingRents - 1)
        };
      }
      return d;
    }));
    setContracts(prev => prev.map(c => {
      if (c.id === dueId) {
        const newPaid = c.annualRent;
        return {
          ...c,
          paidAmount: newPaid,
          remainingAmount: 0,
          installments: [
            ...(c.installments || []).map(i => ({ ...i, status: 'Paid' as const, paidDate: new Date().toISOString().slice(0, 10) })),
            {
              id: `pay-${Date.now()}`,
              installmentNo: (c.installments || []).length + 1,
              dueDate: new Date().toISOString().slice(0, 10),
              amount: c.remainingAmount,
              paidDate: new Date().toISOString().slice(0, 10),
              status: 'Paid' as const,
              receiptNo: `E-${10000 + Math.floor(Math.random() * 90000)}`,
              user: 'Omar Khattab',
              comments: 'مدفوع من سجل التحصيلات'
            }
          ]
        };
      }
      return c;
    }));
  };

  const handleAddMaintenanceRequest = (req: Omit<MaintenanceRequest, 'id'>) => {
    const newObj: MaintenanceRequest = {
      ...req,
      id: String(Date.now())
    };
    setMaintenanceRequests(prev => [newObj, ...prev]);
  };

  const handleUpdateMaintenanceStatus = (id: string, newStatus: MaintenanceStatus) => {
    setMaintenanceRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const handleDeleteMaintenanceRequest = (id: string) => {
    setMaintenanceRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleAssignStaffToMaintenance = (requestId: string, staffId: string, staffName: string) => {
    setMaintenanceRequests(prev => prev.map(r => r.id === requestId ? { ...r, assignedStaffId: staffId, assignedStaffName: staffName } : r));
  };

  const handleUpdateMaintenanceNotes = (requestId: string, notes: string) => {
    setMaintenanceRequests(prev => prev.map(r => r.id === requestId ? { ...r, notes } : r));
  };

  const handleAddContract = async (contract: Omit<Contract, 'id'>) => {
    try {
      const saved = await apiService.addContract(contract);
      setContracts(prev => [saved, ...prev]);
    } catch {
      const fallback: Contract = { ...contract, id: String(Date.now()) };
      setContracts(prev => [fallback, ...prev]);
    }
  };

  const handleUpdateContract = async (updated: Contract) => {
    try {
      await apiService.updateContract(updated.id, updated);
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch {
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
    }
  };

  const handleToggleArchiveContract = async (id: string) => {
    const contract = contracts.find(c => c.id === id);
    if (!contract) return;
    const newStatus = contract.status === 'Archived' ? 'Active' : 'Archived';
    const updated = { ...contract, status: newStatus };
    try {
      if (newStatus === 'Archived') {
        await apiService.archiveContract(id);
      } else {
        await apiService.unarchiveContract(id);
      }
    } catch (err) {
      console.error('Failed to toggle archive:', err);
    }
    setContracts(prev => prev.map(c => c.id === id ? updated : c));
  };

  const handleDeleteContract = async (id: string) => {
    try {
      await apiService.deleteContract(id);
    } catch {
      // ignore error
    }
    setContracts(prev => prev.filter(c => c.id !== id));
    setDues(prev => prev.filter(d => d.contractId !== id));
    setPayments(prev => prev.filter(p => p.contractId !== id));
  };

  const handleAddUnit = async (unit: Omit<Unit, 'id'>) => {
    try {
      const created = await apiService.addUnit(unit);
      setUnits(prev => [created, ...prev]);
    } catch {
      const newU: Unit = { ...unit, id: String(Date.now()) };
      setUnits(prev => [newU, ...prev]);
    }
  };

  const handleUpdateUnit = async (id: string, updates: Partial<Unit>) => {
    try {
      const updated = await apiService.updateUnit(id, updates);
      setUnits(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
    } catch {
      setUnits(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    }
  };

  const handleDeleteUnit = async (id: string) => {
    try {
      await apiService.deleteUnit(id);
    } catch {
      // ignore error
    }
    setUnits(prev => prev.filter(u => u.id !== id));
  };

  const handleAddBuilding = (bld: Omit<Building, 'id'>) => {
    const newB: Building = {
      ...bld,
      id: String(Date.now())
    };
    setBuildings(prev => [newB, ...prev]);
  };

  const handleAddTenant = async (tenant: Omit<Tenant, 'id'>) => {
    try {
      const created = await apiService.addTenant(tenant);
      setTenants(prev => [created, ...prev]);
    } catch {
      const fallback: Tenant = { ...tenant, id: String(Date.now()) };
      setTenants(prev => [fallback, ...prev]);
    }
  };

  const handleUpdateTenant = async (updatedTenant: Tenant) => {
    try {
      const updated = await apiService.updateTenant(updatedTenant.id, updatedTenant);
      setTenants(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch {
      setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
    }
  };

  const handleToggleArchiveTenant = async (id: string) => {
    try {
      await apiService.toggleTenantArchive(id);
    } catch {
      // ignore error
    }
    setTenants(prev => prev.map(t => t.id === id ? { ...t, archived: !t.archived } : t));
  };

  const handleDeleteTenant = async (id: string) => {
    try {
      await apiService.deleteTenant(id);
    } catch {
      // ignore error
    }
    setTenants(prev => prev.filter(t => t.id !== id));
    setContracts(prev => prev.filter(c => c.id !== id));
    setDues(prev => prev.filter(d => d.id !== id));
    setPayments(prev => prev.filter(p => p.tenantId !== id));
  };

  const handleAddWaterMeter = async (meter: Omit<WaterMeter, 'id'>) => {
    try {
      const created = await apiService.addWaterMeter(meter);
      setWaterMeters(prev => [created, ...prev]);
    } catch {
      setWaterMeters(prev => [{ ...meter, id: String(Date.now()) }, ...prev]);
    }
  };

  const handleAddElectricityMeter = async (meter: Omit<ElectricityMeter, 'id'>) => {
    try {
      const created = await apiService.addElectricityMeter(meter);
      setElectricityMeters(prev => [created, ...prev]);
    } catch {
      setElectricityMeters(prev => [{ ...meter, id: String(Date.now()) }, ...prev]);
    }
  };

  const handleToggleTransfer = (id: string) => {
    setElectricityMeters(prev => prev.map(m => m.id === id ? { ...m, transferredToTenant: !m.transferredToTenant } : m));
  };

  const handleAddComplaint = (complaint: Omit<Complaint, 'id'>) => {
    setComplaints(prev => [{ ...complaint, id: String(Date.now()) }, ...prev]);
  };

  const handleUpdateComplaintStatus = (id: string, status: ComplaintStatus, resolutionNotes?: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, resolutionNotes: resolutionNotes || c.resolutionNotes } : c));
  };

  const handleDeleteComplaint = (id: string) => {
    setComplaints(prev => prev.filter(c => c.id !== id));
  };

  const handleAddStaff = (staff: Omit<StaffMember, 'id'>) => {
    setStaffMembers(prev => [{ ...staff, id: String(Date.now()) }, ...prev]);
  };

  const handleUpdateStaffStatus = (id: string, status: StaffStatus) => {
    setStaffMembers(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleUpdateStaff = (updated: StaffMember) => {
    setStaffMembers(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleteStaff = (id: string) => {
    setStaffMembers(prev => prev.filter(s => s.id !== id));
  };

  const handleAddExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const created = await apiService.addExpense(expense);
      setExpenses(prev => [created, ...prev]);
    } catch {
      setExpenses(prev => [{ ...expense, id: String(Date.now()) }, ...prev]);
    }
  };

  const handleAddLetter = async (letter: Omit<Letter, 'id' | 'sentById' | 'sentByName' | 'sentAt'>) => {
    try {
      const created = await apiService.createLetter(letter);
      setLetters(prev => [created, ...prev.filter(l => l.title !== created.title)]);
    } catch {
      const fallback: Letter = {
        ...letter,
        id: String(Date.now()),
        sentById: currentUser?.id || '',
        sentByName: currentUser?.name || 'Admin',
        sentAt: new Date().toISOString()
      };
      setLetters(prev => [fallback, ...prev]);
    }
  };

  const handleUpdateLetter = async (updated: Letter) => {
    try {
      const replaced = await apiService.updateLetter(updated.id, {
        title: updated.title,
        content: updated.content,
        recipientType: updated.recipientType,
        recipientName: updated.recipientName
      });
      setLetters(prev => prev.map(l => l.id === updated.id ? { ...replaced, sentByName: updated.sentByName || replaced.sentByName } : l));
    } catch {
      setLetters(prev => prev.map(l => l.id === updated.id ? updated : l));
    }
  };

  const handleDeleteLetter = async (id: string) => {
    try {
      await apiService.deleteLetter(id);
    } catch {
      // ignore error
    }
    setLetters(prev => prev.filter(l => l.id !== id));
  };

  const handleAddFacility = async (facility: Omit<Facility, 'id'>) => {
    try {
      const created = await apiService.createFacility(facility);
      setFacilities(prev => [created, ...prev.filter(f => f.name !== created.name)]);
    } catch {
      setFacilities(prev => [{ ...facility, id: String(Date.now()) }, ...prev]);
    }
  };

  const handleUpdateFacility = async (updated: Facility) => {
    try {
      const replaced = await apiService.updateFacility(updated.id, updated);
      setFacilities(prev => prev.map(f => f.id === updated.id ? replaced : f));
    } catch {
      setFacilities(prev => prev.map(f => f.id === updated.id ? updated : f));
    }
  };

  const handleDeleteFacility = async (id: string) => {
    try {
      await apiService.deleteFacility(id);
    } catch {
      // ignore error
    }
    setFacilities(prev => prev.filter(f => f.id !== id));
  };

  const handleAddBooking = async (booking: Omit<FacilityBooking, 'id' | 'bookingNo' | 'createdAt'>) => {
    try {
      const created = await apiService.createFacilityBooking(booking);
      setFacilityBookings(prev => [created, ...prev.filter(b => b.bookingNo !== created.bookingNo)]);
    } catch {
      const fallback: FacilityBooking = {
        ...booking,
        id: String(Date.now()),
        bookingNo: `FBK-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      setFacilityBookings(prev => [fallback, ...prev]);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: FacilityBookingStatus, adminNotes?: string) => {
    const adminName = currentUser?.name || 'Admin';
    try {
      const replaced = await apiService.updateFacilityBooking(id, {
        status,
        adminNotes,
        approvedBy: status === 'Approved' ? adminName : undefined
      });
      setFacilityBookings(prev => prev.map(b => b.id === id ? replaced : b));
    } catch {
      setFacilityBookings(prev => prev.map(b => b.id === id ? { ...b, status, adminNotes, approvedBy: status === 'Approved' ? adminName : b.approvedBy } : b));
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      await apiService.deleteFacilityBooking(id);
    } catch {
      // ignore error
    }
    setFacilityBookings(prev => prev.filter(b => b.id !== id));
  };

  const handleUpdateStaffPassword = (staffId: string, newPass: string) => {
    setStaffMembers(prev => prev.map(s => s.id === staffId ? { ...s, password: newPass } : s));
  };

  const handleUpdateTenantPassword = (tenantId: string, newPass: string) => {
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, password: newPass } : t));
  };

  // If unauthenticated, render Login Screen
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Render Staff Portal
  if (currentUser.role === 'Staff') {
    return (
      <StaffPortalView
        currentUser={currentUser}
        staffList={staffMembers}
        maintenanceRequests={maintenanceRequests}
        onUpdateMaintenanceStatus={handleUpdateMaintenanceStatus}
        onUpdateMaintenanceNotes={handleUpdateMaintenanceNotes}
        onUpdateStaffPassword={(staffId, newPass) => handleUpdateStaffPassword(staffId, newPass)}
        onLogout={handleLogout}
      />
    );
  }

  // Render Tenant Portal
  if (currentUser.role === 'Tenant') {
    return (
      <TenantPortalView
        currentUser={currentUser}
        tenants={tenants}
        contracts={contracts}
        maintenanceRequests={maintenanceRequests}
        complaints={complaints}
        onAddMaintenanceRequest={handleAddMaintenanceRequest}
        onAddComplaint={handleAddComplaint}
        onUpdateTenantPassword={(tenantId, newPass) => handleUpdateTenantPassword(tenantId, newPass)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      {/* Top Navigation Header */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        selectedCompoundId={selectedCompoundId}
        onSelectCompound={setSelectedCompoundId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenProfileSettings={() => setShowProfileSettings(true)}
        onOpenAdminPermissions={() => setShowAdminPermissions(true)}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* Content Region */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[96rem] mx-auto">
            {activeTab === 'dashboard_main' && (
              <DashboardMain
                units={units}
                contracts={contracts}
                dues={dues}
                payments={payments}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'dashboard_dues' && (
              <DashboardDuesStats
                dues={dues}
                contracts={contracts}
                payments={payments}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'dashboard_maintenance' && (
              <DashboardMaintenanceStats
                maintenanceRequests={maintenanceRequests}
                staffMembers={staffMembers}
                onNavigate={setActiveTab}
              />
            )}

            {/* Azhar Residence Tabs */}
            {activeTab === 'azhar_collections' && (
              <DashboardDues
                dues={dues}
                contracts={contracts}
                tenants={tenants}
                onRecordPayment={handleRecordPayment}
                onUpdateContract={handleUpdateContract}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_contracts' && (
              <CompoundContracts
                contracts={contracts}
                tenants={tenants}
                units={units}
                onAddContract={handleAddContract}
                onUpdateContract={handleUpdateContract}
                onToggleArchive={handleToggleArchiveContract}
                onDeleteContract={handleDeleteContract}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_archived_contracts' && (
              <CompoundContracts
                contracts={contracts}
                tenants={tenants}
                units={units}
                showArchivedOnly
                onAddContract={handleAddContract}
                onUpdateContract={handleUpdateContract}
                onToggleArchive={handleToggleArchiveContract}
                onDeleteContract={handleDeleteContract}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_non_rented' && (
              <CompoundUnits
                units={units}
                buildings={buildings}
                contracts={contracts}
                tenants={tenants}
                mode="non_rented"
                onAddUnit={handleAddUnit}
                onAddBuilding={handleAddBuilding}
                onUpdateUnit={handleUpdateUnit}
                onDeleteUnit={handleDeleteUnit}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_electricity' && (
              <MetersView
                type="electricity"
                waterMeters={waterMeters}
                electricityMeters={electricityMeters}
                onAddWaterMeter={handleAddWaterMeter}
                onAddElectricityMeter={handleAddElectricityMeter}
                onToggleTransfer={handleToggleTransfer}
              />
            )}

            {activeTab === 'azhar_tenants' && (
              <TenantsList
                tenants={tenants}
                contracts={contracts}
                units={units}
                onAddTenant={handleAddTenant}
                onUpdateTenant={handleUpdateTenant}
                onToggleArchiveTenant={handleToggleArchiveTenant}
                onDeleteTenant={handleDeleteTenant}
              />
            )}

            {activeTab === 'azhar_buildings' && (
              <CompoundUnits
                units={units}
                buildings={buildings}
                contracts={contracts}
                tenants={tenants}
                mode="buildings"
                onAddUnit={handleAddUnit}
                onAddBuilding={handleAddBuilding}
                onUpdateUnit={handleUpdateUnit}
                onDeleteUnit={handleDeleteUnit}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_units' && (
              <CompoundUnits
                units={units}
                buildings={buildings}
                contracts={contracts}
                tenants={tenants}
                mode="units"
                onAddUnit={handleAddUnit}
                onAddBuilding={handleAddBuilding}
                onUpdateUnit={handleUpdateUnit}
                onDeleteUnit={handleDeleteUnit}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_maintenance' && (
              <DashboardMaintenance
                maintenanceRequests={maintenanceRequests}
                onAddRequest={handleAddMaintenanceRequest}
                onUpdateStatus={handleUpdateMaintenanceStatus}
                onDeleteRequest={handleDeleteMaintenanceRequest}
                onAssignStaff={handleAssignStaffToMaintenance}
                onUpdateNotes={handleUpdateMaintenanceNotes}
                selectedCompoundId="1"
                staffMembers={staffMembers}
              />
            )}

            {activeTab === 'azhar_complaints' && (
              <ComplaintsView
                complaints={complaints}
                onAddComplaint={handleAddComplaint}
                onUpdateStatus={handleUpdateComplaintStatus}
                onDeleteComplaint={handleDeleteComplaint}
              />
            )}

            {activeTab === 'azhar_staff' && (
              <StaffView
                staffMembers={staffMembers}
                maintenanceRequests={maintenanceRequests}
                onAddStaff={handleAddStaff}
                onUpdateStaffStatus={handleUpdateStaffStatus}
                onUpdateStaff={handleUpdateStaff}
                onDeleteStaff={handleDeleteStaff}
              />
            )}

            {activeTab === 'azhar_expenses' && (
              <ExpensesView
                expenses={expenses}
                onAddExpense={handleAddExpense}
              />
            )}

            {activeTab === 'azhar_letters' && (
              <LettersView
                letters={letters}
                tenants={tenants}
                staffMembers={staffMembers}
                onAddLetter={handleAddLetter}
                onUpdateLetter={handleUpdateLetter}
                onDeleteLetter={handleDeleteLetter}
              />
            )}

            {activeTab === 'azhar_facilities' && (
              <FacilitiesView
                facilities={facilities}
                bookings={facilityBookings}
                onAddFacility={handleAddFacility}
                onUpdateFacility={handleUpdateFacility}
                onDeleteFacility={handleDeleteFacility}
              />
            )}

            {activeTab === 'azhar_facility_bookings' && (
              <FacilityBookingsView
                facilities={facilities}
                bookings={facilityBookings}
                tenants={tenants}
                onAddBooking={handleAddBooking}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onDeleteBooking={handleDeleteBooking}
              />
            )}

            {/* Water & Electricity Meters */}
            {activeTab === 'water_meters' && (
              <MetersView
                type="water"
                waterMeters={waterMeters}
                electricityMeters={electricityMeters}
                onAddWaterMeter={handleAddWaterMeter}
                onAddElectricityMeter={handleAddElectricityMeter}
                onToggleTransfer={handleToggleTransfer}
              />
            )}

            {activeTab === 'electricity_meters' && (
              <MetersView
                type="electricity"
                waterMeters={waterMeters}
                electricityMeters={electricityMeters}
                onAddWaterMeter={handleAddWaterMeter}
                onAddElectricityMeter={handleAddElectricityMeter}
                onToggleTransfer={handleToggleTransfer}
              />
            )}

            {/* All Tenants */}
            {activeTab === 'all_tenants' && (
              <TenantsList
                tenants={tenants}
                contracts={contracts}
                units={units}
                onAddTenant={handleAddTenant}
                onUpdateTenant={handleUpdateTenant}
                onToggleArchiveTenant={handleToggleArchiveTenant}
                onDeleteTenant={handleDeleteTenant}
              />
            )}

            {activeTab === 'archived_tenants' && (
              <TenantsList
                tenants={tenants}
                contracts={contracts}
                units={units}
                showArchivedOnly
                onAddTenant={handleAddTenant}
                onUpdateTenant={handleUpdateTenant}
                onToggleArchiveTenant={handleToggleArchiveTenant}
                onDeleteTenant={handleDeleteTenant}
              />
            )}

            {/* Patch Notes */}
            {activeTab === 'patch_notes' && (
              <PatchNotesView />
            )}
          </div>
        </main>
      </div>

      {/* Profile Settings Modal */}
      {showProfileSettings && currentUser && (
        <ProfileSettingsModal
          user={currentUser}
          onClose={() => setShowProfileSettings(false)}
          onSave={handleUpdateUser}
        />
      )}

      {/* Admin Permissions Modal */}
      {showAdminPermissions && (
        <AdminPermissionsModal onClose={() => setShowAdminPermissions(false)} />
      )}
    </div>
  );
}

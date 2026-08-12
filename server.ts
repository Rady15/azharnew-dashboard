import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

// ===== Auth: Access + Refresh Tokens =====
const JWT_SECRET = process.env.JWT_SECRET || "azhar-residence-local-secret-change-me";
const ACCESS_TTL_SECONDS = 15 * 60;               // access token valid 15 minutes
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;     // refresh token valid 7 days
const b64url = (buf: Buffer) => buf.toString("base64url");

function signJwt(payload: Record<string, any>): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", Buffer.from(JWT_SECRET)).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token: string): Record<string, any> | null {
  try {
    const [h, b, s] = token.split(".");
    if (!h || !b || !s) return null;
    const expected = crypto.createHmac("sha256", Buffer.from(JWT_SECRET)).update(`${h}.${b}`).digest();
    const actual = Buffer.from(s, "base64url");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Opaque refresh tokens: token -> { userId, expiresAt }
const refreshTokens = new Map<string, { userId: string; expiresAt: number }>();

const usersStore = [
  {
    id: "b88b8ee5-e721-47aa-bf7e-bb75c9a4facf",
    username: "m.barmada",
    email: "admin@azhar.com",
    password: process.env.ADMIN_PASSWORD || "Admin@123",
    fullName: "Mohammed Barmada",
    role: "Admin"
  }
];

function findUser(identifier: string, password: string) {
  const u = usersStore.find(
    x => x.username.toLowerCase() === identifier.toLowerCase() || x.email.toLowerCase() === identifier.toLowerCase()
  );
  return u && u.password === password ? u : null;
}

function publicUser(u: any) {
  return { id: u.id, username: u.username, email: u.email, fullName: u.fullName, role: u.role };
}

function issueTokens(u: any) {
  const accessToken = signJwt({
    sub: u.id,
    username: u.username,
    role: u.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS
  });
  const refreshToken = crypto.randomBytes(48).toString("hex");
  refreshTokens.set(refreshToken, { userId: u.id, expiresAt: Date.now() + REFRESH_TTL_SECONDS * 1000 });
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
}

function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = token ? verifyJwt(token) : null;
  if (!payload) {
    return res.status(401).json({ isSuccess: false, message: "Unauthorized: missing or expired access token" });
  }
  req.user = payload;
  next();
}

// ===== In-memory server database initialized from default data, synced via REST API =====
let tenantsStore = [
  {
    id: "257358ac-02d4-4eff-9139-0a953fcaf295",
    fullName: "mustafa ali",
    fullNameArabic: "مصطفى علي",
    email: "mustafaali1m@gmail.com",
    phoneNumber: "0539111781",
    emergencyPhoneNumber: "0566027120",
    nationality: "Sudan",
    familyCount: "4",
    workNotes: "",
    isMarried: true,
    whatsappNumber: "966591234567",
    tenantRemarks: "",
    companyName: "AZ",
    houseNumber: "203",
    contractNumber: "20230102203",
    contractStartDate: "2023-10-02",
    contractEndDate: "2024-10-01",
    annualRent: 45000,
    monthlyRent: 3750,
    paidAmount: 18750,
    remainingAmount: 26250,
    paymentMethod: "Quarterly",
    paymentDueDay: "1",
    electricityMeter: "482835",
    waterCost: "100",
    isActive: true
  },
  {
    id: "ecb6fed5-8fc3-4d84-bc99-c5139faffd59",
    fullName: "Aya Ahmed",
    fullNameArabic: "آية أحمد",
    email: "aya123@gmail.com",
    phoneNumber: "01102782069",
    emergencyPhoneNumber: "01102782069",
    nationality: "Egyptian",
    familyCount: "2",
    workNotes: "",
    isMarried: false,
    whatsappNumber: "9661102782069",
    tenantRemarks: "",
    companyName: "AZ",
    houseNumber: "A-15",
    contractNumber: "CNT-2024-001",
    contractStartDate: "2024-01-01",
    contractEndDate: "2025-01-01",
    annualRent: 10000,
    monthlyRent: 2000,
    paidAmount: 2000,
    remainingAmount: 8000,
    paymentMethod: "Monthly",
    paymentDueDay: "1",
    electricityMeter: "2000",
    waterCost: "100",
    isActive: true
  }
];

let contractsStore = [
  {
    id: "3",
    contractNumber: "20230102203",
    contractNo: "20230102203",
    houseNumber: "203",
    houseId: "df2f59a4-e619-4036-a644-07d422460fa6",
    buildingNumber: "101",
    unitType: "Apartment",
    unitNumber: "203",
    tenantId: "257358ac-02d4-4eff-9139-0a953fcaf295",
    tenantName: "mustafa ali",
    tenantMobile: "0539111781",
    emergencyPhone: "0566027120",
    nationalId: "",
    representativeName: "Mohammed Barmada",
    contractOf: "Mohammed Barmada",
    leaseStartDate: "2023-10-02",
    leaseEndDate: "2024-10-01",
    leaseDurationMonths: 12,
    annualRent: 45000,
    monthlyRent: 3750,
    waterYearlyBill: 1200,
    totalYearlyRent: 46200,
    discount: 0,
    paidAmount: 18750,
    remainingAmount: 27450,
    paymentMethod: "Quarterly",
    paymentNumber: "PAY-1001",
    electricityMeterNumber: "482835",
    verifiedInEjar: true,
    transferAccountToTenant: true,
    insurance: 1000,
    commission: 500,
    englishNotes: "Standard residential lease contract",
    arabicNotes: "عقد إيجار سكني كمبوند أزهار",
    status: "Active",
    isArchived: false,
    adminNote: null,
    contractDocumentUrl: null,
    notes: [],
    installments: [
      { id: "1", installmentNo: 1, dueDate: "2023-10-02", amount: 18750, paidDate: "2023-10-02", status: "Paid" }
    ]
  }
];

let housesStore = [
  {
    id: "df2f59a4-e619-4036-a644-07d422460fa6",
    houseNumber: "203",
    buildingNumber: "101",
    floorNumber: "2",
    area: "220",
    roomsCount: 3,
    bathroomsCount: 3,
    hasGarage: true,
    hasGarden: false,
    hasInstalledKitchen: true,
    hasCentralAirConditioning: true,
    isFurnished: true,
    notes: "Available for rent",
    isAvailable: false
  }
];

let staffStore = [
  {
    id: "b88b8ee5-e721-47aa-bf7e-bb75c9a4facf",
    fullName: "Mohammed Barmada",
    email: "m.barmada@azhar-residence.com",
    phoneNumber: "0550896224",
    role: "Admin",
    isActive: true
  }
];

let paymentsStore = [
  {
    id: "705fbe0f-e4ca-4f2a-8a2a-650b006604bf",
    tenantId: "257358ac-02d4-4eff-9139-0a953fcaf295",
    tenantName: "mustafa ali",
    amount: 18750,
    month: 10,
    year: 2023,
    paymentMethod: "Quarterly",
    status: "Paid",
    paymentDate: "2023-10-02"
  }
];

let electricityMetersStore = [
  {
    id: "e452d2f7-066d-4d5b-a3ce-a11169535b8b",
    meterNumber: "482835",
    houseId: "df2f59a4-e619-4036-a644-07d422460fa6",
    unitNumber: "203",
    transferredToTenant: true
  }
];

let maintenanceStore = [];
let lettersStore = [];
let announcementsStore = [];
let complaintsStore = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Router setup matching Postman collection endpoints

  // 1. Account / Auth API
  app.post("/api/Account/login", (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ isSuccess: false, message: "Email and password are required" });
    }
    const user = findUser(email, password);
    if (!user) {
      return res.status(401).json({ isSuccess: false, message: "Invalid email or password" });
    }
    const tokens = issueTokens(user);
    res.json({
      isSuccess: true,
      ...tokens,
      user: publicUser(user)
    });
  });

  app.post("/api/Account/refresh", (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ isSuccess: false, message: "refreshToken is required" });
    }
    const entry = refreshTokens.get(refreshToken);
    if (!entry || entry.expiresAt < Date.now()) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ isSuccess: false, message: "Invalid or expired refresh token" });
    }
    // Rotate: revoke old refresh token, issue a new pair
    refreshTokens.delete(refreshToken);
    const user = usersStore.find(x => x.id === entry.userId);
    if (!user) {
      return res.status(401).json({ isSuccess: false, message: "User no longer exists" });
    }
    const tokens = issueTokens(user);
    res.json({
      isSuccess: true,
      ...tokens,
      user: publicUser(user)
    });
  });

  app.post("/api/Account/logout", (req, res) => {
    const { refreshToken } = req.body || {};
    if (refreshToken) refreshTokens.delete(refreshToken);
    res.json({ isSuccess: true, message: "Logged out successfully" });
  });

  app.get("/api/Account/me", requireAuth, (req: any, res) => {
    const user = usersStore.find(x => x.id === req.user.sub);
    if (!user) return res.status(404).json({ isSuccess: false, message: "User not found" });
    res.json({ isSuccess: true, user: publicUser(user) });
  });

  // Protect all remaining /api/* routes with an access token
  app.use("/api", requireAuth);

  // Notifications API
  let notificationsStore: any[] = [
    {
      id: "local-notif-1",
      title: "مرحباً بك",
      body: "تم تسجيل الدخول بنجاح في نظام إدارة كمبوند أزهار",
      type: "System",
      relatedEntityId: "",
      isRead: false,
      createdAt: new Date().toISOString()
    }
  ];

  app.get("/api/Notifications", (req, res) => {
    res.json({ value: notificationsStore, Count: notificationsStore.length });
  });

  app.put("/api/Notifications/:id/read", (req, res) => {
    const idx = notificationsStore.findIndex(n => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Notification not found" });
    notificationsStore[idx].isRead = true;
    res.json({ message: "Notification marked as read" });
  });

  app.put("/api/Account/fcm-token", (req, res) => {
    res.json({ message: "FCM token updated" });
  });

  // 2. Tenants API
  app.get("/api/Tenants", (req, res) => {
    res.json(tenantsStore);
  });

  app.get("/api/Tenants/:id", (req, res) => {
    const tenant = tenantsStore.find(t => t.id === req.params.id);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    res.json(tenant);
  });

  app.post("/api/Tenants", (req, res) => {
    const body = req.body;
    const newTenant = {
      id: body.id || `tenant-${Date.now()}`,
      fullName: body.fullName || body.FullName || "New Tenant",
      fullNameArabic: body.fullNameArabic || body.FullNameArabic || "",
      email: body.email || body.Email || "",
      phoneNumber: body.phoneNumber || body.PhoneNumber || "",
      emergencyPhoneNumber: body.emergencyPhoneNumber || body.EmergencyPhoneNumber || "",
      nationality: body.nationality || body.Nationality || "",
      familyCount: body.familyCount || body.FamilyCount || "1",
      workNotes: body.workNotes || body.WorkNotes || "",
      isMarried: body.isMarried !== undefined ? Boolean(body.isMarried) : true,
      whatsappNumber: body.whatsappNumber || body.WhatsappNumber || body.phoneNumber || "",
      tenantRemarks: body.tenantRemarks || body.TenantRemarks || "",
      companyName: body.companyName || body.CompanyName || "AZ",
      houseNumber: body.houseNumber || body.HouseNumber || "",
      contractNumber: body.contractNumber || body.ContractNumber || "",
      contractStartDate: body.contractStartDate || body.ContractStartDate || "",
      contractEndDate: body.contractEndDate || body.ContractEndDate || "",
      annualRent: Number(body.annualRent || body.AnnualRent || 0),
      monthlyRent: Number(body.monthlyRent || body.MonthlyRent || 0),
      paidAmount: Number(body.paidAmount || body.PaidAmount || 0),
      remainingAmount: Number(body.remainingAmount || body.RemainingAmount || 0),
      paymentMethod: body.paymentMethod || body.PaymentMethod || "Monthly",
      paymentDueDay: body.paymentDueDay || body.PaymentDueDay || "1",
      electricityMeter: body.electricityMeter || body.ElectricityMeter || "",
      waterCost: body.waterCost || body.WaterCost || "0",
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true
    };
    tenantsStore.push(newTenant);
    res.status(201).json(newTenant);
  });

  app.put("/api/Tenants/:id", (req, res) => {
    const idx = tenantsStore.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Tenant not found" });
    const existing = tenantsStore[idx];
    const body = req.body;
    const updated = {
      ...existing,
      fullName: body.fullName ?? body.FullName ?? existing.fullName,
      fullNameArabic: body.fullNameArabic ?? body.FullNameArabic ?? existing.fullNameArabic,
      email: body.email ?? body.Email ?? existing.email,
      phoneNumber: body.phoneNumber ?? body.PhoneNumber ?? existing.phoneNumber,
      emergencyPhoneNumber: body.emergencyPhoneNumber ?? body.EmergencyPhoneNumber ?? existing.emergencyPhoneNumber,
      nationality: body.nationality ?? body.Nationality ?? existing.nationality,
      familyCount: body.familyCount ?? body.FamilyCount ?? existing.familyCount,
      workNotes: body.workNotes ?? body.WorkNotes ?? existing.workNotes,
      isMarried: body.isMarried !== undefined ? Boolean(body.isMarried) : existing.isMarried,
      whatsappNumber: body.whatsappNumber ?? body.WhatsappNumber ?? existing.whatsappNumber,
      tenantRemarks: body.tenantRemarks ?? body.TenantRemarks ?? existing.tenantRemarks,
      companyName: body.companyName ?? body.CompanyName ?? existing.companyName,
      houseNumber: body.houseNumber ?? body.HouseNumber ?? existing.houseNumber,
      contractNumber: body.contractNumber ?? body.ContractNumber ?? existing.contractNumber,
      contractStartDate: body.contractStartDate ?? body.ContractStartDate ?? existing.contractStartDate,
      contractEndDate: body.contractEndDate ?? body.ContractEndDate ?? existing.contractEndDate,
      annualRent: body.annualRent !== undefined ? Number(body.annualRent) : existing.annualRent,
      monthlyRent: body.monthlyRent !== undefined ? Number(body.monthlyRent) : existing.monthlyRent,
      paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) : existing.paidAmount,
      remainingAmount: body.remainingAmount !== undefined ? Number(body.remainingAmount) : existing.remainingAmount,
      paymentMethod: body.paymentMethod ?? body.PaymentMethod ?? existing.paymentMethod,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive
    };
    tenantsStore[idx] = updated;
    res.json(updated);
  });

  app.delete("/api/Tenants/:id", (req, res) => {
    tenantsStore = tenantsStore.filter(t => t.id !== req.params.id);
    res.json({ message: "Tenant deleted successfully" });
  });

  app.put("/api/Tenants/:id/toggle-active", (req, res) => {
    const idx = tenantsStore.findIndex(t => t.id === req.params.id);
    if (idx !== -1) {
      tenantsStore[idx].isActive = !tenantsStore[idx].isActive;
      res.json(tenantsStore[idx]);
    } else {
      res.status(404).json({ message: "Tenant not found" });
    }
  });

  // 3. Contracts API
  app.get("/api/Contracts", (req, res) => {
    res.json(contractsStore);
  });

  app.post("/api/Contracts", (req, res) => {
    const body = req.body;
    const newContract = {
      id: body.id || `contract-${Date.now()}`,
      contractNumber: body.contractNumber || body.ContractNumber || `2024${Math.floor(10000 + Math.random() * 90000)}`,
      contractNo: body.contractNo || body.contractNumber || body.ContractNumber || `2024${Math.floor(10000 + Math.random() * 90000)}`,
      houseNumber: body.houseNumber || body.HouseNumber || "203",
      houseId: body.houseId || body.HouseId || "",
      buildingNumber: body.buildingNumber || body.BuildingNumber || "101",
      unitType: body.unitType || body.UnitType || "Apartment",
      unitNumber: body.unitNumber || body.UnitNumber || "",
      tenantId: body.tenantId || body.TenantId || "",
      tenantName: body.tenantName || body.TenantName || "Tenant",
      tenantMobile: body.tenantMobile || body.TenantMobile || "",
      emergencyPhone: body.emergencyPhone || body.EmergencyPhone || "",
      nationalId: body.nationalId || body.NationalId || "",
      representativeName: body.representativeName || body.RepresentativeName || "Mohammed Barmada",
      contractOf: body.contractOf || body.ContractOf || "Mohammed Barmada",
      leaseStartDate: body.leaseStartDate || body.LeaseStartDate || "2024-01-01",
      leaseEndDate: body.leaseEndDate || body.LeaseEndDate || "2025-01-01",
      leaseDurationMonths: Number(body.leaseDurationMonths || body.LeaseDurationMonths || 12),
      annualRent: Number(body.annualRent || body.AnnualRent || 0),
      monthlyRent: Number(body.monthlyRent || body.MonthlyRent || 0),
      waterYearlyBill: Number(body.waterYearlyBill || body.WaterYearlyBill || 0),
      totalYearlyRent: Number(body.totalYearlyRent || body.TotalYearlyRent || 0),
      discount: Number(body.discount || body.Discount || 0),
      paidAmount: Number(body.paidAmount || body.PaidAmount || 0),
      remainingAmount: Number(body.remainingAmount || body.RemainingAmount || 0),
      paymentMethod: body.paymentMethod || body.PaymentMethod || "Quarterly",
      paymentNumber: body.paymentNumber || body.PaymentNumber || "",
      electricityMeterNumber: body.electricityMeterNumber || body.ElectricityMeterNumber || "",
      verifiedInEjar: body.verifiedInEjar !== undefined ? Boolean(body.verifiedInEjar) : true,
      transferAccountToTenant: body.transferAccountToTenant !== undefined ? Boolean(body.transferAccountToTenant) : true,
      insurance: Number(body.insurance || body.Insurance || 0),
      commission: Number(body.commission || body.Commission || 0),
      englishNotes: body.englishNotes || body.EnglishNotes || "",
      arabicNotes: body.arabicNotes || body.ArabicNotes || "",
      status: body.status || "Active",
      isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : false,
      adminNote: body.adminNote || body.AdminNote || null,
      contractDocumentUrl: body.contractDocumentUrl || body.ContractDocumentUrl || null,
      notes: body.notes || [],
      installments: body.installments || []
    };
    contractsStore.push(newContract);
    res.status(201).json(newContract);
  });

  app.put("/api/Contracts/:id", (req, res) => {
    const idx = contractsStore.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Contract not found" });
    const existing = contractsStore[idx];
    const body = req.body;
    const updated = {
      ...existing,
      ...body,
      contractNumber: body.contractNumber ?? existing.contractNumber,
      contractNo: body.contractNo ?? existing.contractNo ?? existing.contractNumber,
      houseNumber: body.houseNumber ?? existing.houseNumber,
      houseId: body.houseId ?? existing.houseId,
      buildingNumber: body.buildingNumber ?? existing.buildingNumber,
      unitType: body.unitType ?? existing.unitType,
      unitNumber: body.unitNumber ?? existing.unitNumber,
      tenantId: body.tenantId ?? existing.tenantId,
      tenantName: body.tenantName ?? existing.tenantName,
      tenantMobile: body.tenantMobile ?? existing.tenantMobile,
      emergencyPhone: body.emergencyPhone ?? existing.emergencyPhone,
      nationalId: body.nationalId ?? existing.nationalId,
      representativeName: body.representativeName ?? existing.representativeName,
      contractOf: body.contractOf ?? existing.contractOf,
      leaseStartDate: body.leaseStartDate ?? existing.leaseStartDate,
      leaseEndDate: body.leaseEndDate ?? existing.leaseEndDate,
      leaseDurationMonths: body.leaseDurationMonths !== undefined ? Number(body.leaseDurationMonths) : existing.leaseDurationMonths,
      annualRent: body.annualRent !== undefined ? Number(body.annualRent) : existing.annualRent,
      monthlyRent: body.monthlyRent !== undefined ? Number(body.monthlyRent) : existing.monthlyRent,
      waterYearlyBill: body.waterYearlyBill !== undefined ? Number(body.waterYearlyBill) : existing.waterYearlyBill,
      totalYearlyRent: body.totalYearlyBill !== undefined ? Number(body.totalYearlyBill) : (existing.totalYearlyRent || (existing.annualRent + (existing.waterYearlyBill || 0))),
      discount: body.discount !== undefined ? Number(body.discount) : existing.discount,
      paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) : existing.paidAmount,
      remainingAmount: body.remainingAmount !== undefined ? Number(body.remainingAmount) : existing.remainingAmount,
      paymentMethod: body.paymentMethod ?? existing.paymentMethod,
      paymentNumber: body.paymentNumber ?? existing.paymentNumber,
      electricityMeterNumber: body.electricityMeterNumber ?? existing.electricityMeterNumber,
      verifiedInEjar: body.verifiedInEjar !== undefined ? Boolean(body.verifiedInEjar) : existing.verifiedInEjar,
      transferAccountToTenant: body.transferAccountToTenant !== undefined ? Boolean(body.transferAccountToTenant) : existing.transferAccountToTenant,
      insurance: body.insurance !== undefined ? Number(body.insurance) : existing.insurance,
      commission: body.commission !== undefined ? Number(body.commission) : existing.commission,
      englishNotes: body.englishNotes ?? existing.englishNotes,
      arabicNotes: body.arabicNotes ?? existing.arabicNotes,
      status: body.status ?? existing.status,
      isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : existing.isArchived,
      adminNote: body.adminNote ?? existing.adminNote,
      contractDocumentUrl: body.contractDocumentUrl ?? existing.contractDocumentUrl,
      notes: body.notes ?? existing.notes,
      installments: body.installments ?? existing.installments
    };
    contractsStore[idx] = updated;
    res.json(updated);
  });

  app.delete("/api/Contracts/:id", (req, res) => {
    contractsStore = contractsStore.filter(c => c.id !== req.params.id);
    res.json({ message: "Contract deleted successfully" });
  });

  // 4. House / Units API
  app.get("/api/house", (req, res) => {
    res.json(housesStore);
  });

  app.get("/api/house/available", (req, res) => {
    res.json(housesStore.filter(h => h.isAvailable));
  });

  app.post("/api/house", (req, res) => {
    const body = req.body;
    const newHouse = {
      id: `house-${Date.now()}`,
      houseNumber: body.HouseNumber || body.houseNumber || "A-01",
      buildingNumber: body.BuildingNumber || body.buildingNumber || "B1",
      floorNumber: body.FloorNumber || body.floorNumber || "1",
      area: body.area || "200",
      roomsCount: Number(body.roomsCount || 3),
      bathroomsCount: Number(body.bathroomsCount || 2),
      hasGarage: body.hasGarage === "true" || body.hasGarage === true,
      hasGarden: body.hasGarden === "true" || body.hasGarden === true,
      hasInstalledKitchen: body.HasInstalledKitchen === "true" || body.hasInstalledKitchen === true,
      hasCentralAirConditioning: body.HasCentralAirConditioning === "true" || body.hasCentralAirConditioning === true,
      isFurnished: body.IsFurnished === "true" || body.isFurnished === true,
      notes: body.notes || "",
      isAvailable: true
    };
    housesStore.push(newHouse);
    res.status(201).json(newHouse);
  });

  // 5. Staff API
  app.get("/api/staff", (req, res) => {
    res.json(staffStore);
  });

  // 6. Payments & Expenses API
  app.get("/api/Payment", (req, res) => {
    res.json(paymentsStore);
  });
  app.get("/api/payment", (req, res) => {
    res.json(paymentsStore);
  });

  app.post("/api/Payment", (req, res) => {
    const newPayment = {
      id: `pay-${Date.now()}`,
      tenantId: req.body.tenantId || '',
      tenantName: req.body.tenantName || '',
      unitNumber: req.body.unitNumber || '',
      amount: Number(req.body.amount || 0),
      month: Number(req.body.month || new Date().getMonth() + 1),
      year: Number(req.body.year || new Date().getFullYear()),
      paymentMethod: req.body.paymentMethod || 'Cash',
      status: req.body.status || 'Paid',
      paymentDate: new Date().toISOString().split('T')[0],
      rentAmount: Number(req.body.rentAmount || 0),
      paidAmount: Number(req.body.paidAmount || 0),
      remainingAmount: Number(req.body.remainingAmount || 0),
      contractEndDate: req.body.contractEndDate || null,
      remainingDays: Number(req.body.remainingDays || 0),
      nextDueDate: req.body.nextDueDate || null,
      rentFrequency: req.body.rentFrequency || null,
      statusDescription: req.body.statusDescription || null
    };
    paymentsStore.push(newPayment);
    res.status(201).json(newPayment);
  });

  // 6b. Rent Reports — single source of truth for paid/remaining amounts
  app.get("/api/Reports", (req, res) => {
    const reports = tenantsStore.map(t => {
      const paid = Number(t.paidAmount || 0);
      const annualRent = Number(t.annualRent || 0);
      const rentValue = Number(t.monthlyRent || 0) > 0
        ? Math.round((t.paymentMethod === "Quarterly" ? annualRent / 4 : t.paymentMethod === "SemiAnnual" ? annualRent / 2 : annualRent / 12))
        : annualRent;
      const remainingAmount = Math.max(0, rentValue - paid);
      return {
        tenantId: t.id,
        tenantName: t.fullName,
        nextDueDate: t.contractStartDate || "2024-01-01",
        unitNumber: t.houseNumber || "",
        rentAmount: rentValue,
        rentFrequency: t.paymentMethod === "Quarterly" ? "Quarterly" : t.paymentMethod === "SemiAnnual" ? "SemiAnnual" : "Monthly",
        contractEndDate: t.contractEndDate || "",
        remainingDays: t.contractEndDate ? Math.ceil((new Date(t.contractEndDate).getTime() - Date.now()) / 86400000) : 0,
        paidAmount: paid,
        remainingAmount: remainingAmount,
        status: paid >= rentValue ? "Paid" : "Contract Expired"
      };
    });
    res.json(reports);
  });

  // 7. Electricity Meter API
  app.get("/api/ElectricityMeter", (req, res) => {
    res.json(electricityMetersStore);
  });

  app.post("/api/ElectricityMeter", (req, res) => {
    const newMeter = {
      id: `meter-${Date.now()}`,
      ...req.body
    };
    electricityMetersStore.push(newMeter);
    res.status(201).json(newMeter);
  });

  // Vite development server setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

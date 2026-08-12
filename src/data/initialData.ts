import { Building, Compound, Contract, DueItem, ElectricityMeter, MaintenanceRequest, Tenant, Unit, User, WaterMeter, Complaint, StaffMember, Expense } from '../types';

export const initialUser: User = {
  username: 'm.barmada',
  name: 'Mohammed Barmada',
  email: 'm.barmada@azhar-residence.com',
  role: 'General Property Manager',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
};

export const initialCompounds: Compound[] = [
  { id: '1', name: 'Azhar Residence (كمبوند أزهار)', code: 'AZHAR', totalBuildings: 24, totalUnits: 148 }
];

export const initialTenants: Tenant[] = [
  { id: '1', name: 'Muhannad Rajab Mohammed Salamah', fullNameArabic: 'مهند رجب محمد سلامة', email: 'muhannad.s@azhar-residence.com', mobile: '0553014805', emergencyPhone: '0553014805', whatsapp: '966553014805', password: 'tenant101', nationality: 'Jordanian', familyCount: 4, company: 'AZ', hasContract: true, compoundId: '1', compoundName: 'Azhar Residence', unitNumber: '197' },
  { id: '2', name: 'Wesam Adam Haidar', fullNameArabic: 'وسام آدم حيدر', email: 'wesam.h@azhar-residence.com', mobile: '0552226701', emergencyPhone: '0552226701', whatsapp: '966552226701', password: 'tenant102', nationality: 'Syrian', familyCount: 3, company: 'AZ', hasContract: true, compoundId: '1', compoundName: 'Azhar Residence', unitNumber: '211' },
  { id: '3', name: 'ivan pugliese', fullNameArabic: 'إيفان بوجليسي', email: 'ivan.p@azhar-residence.com', mobile: '0550896224', emergencyPhone: '0506302641', whatsapp: '966550896224', password: 'tenant103', nationality: 'Italian', familyCount: 2, company: 'AZ', hasContract: true, compoundId: '1', compoundName: 'Azhar Residence', unitNumber: '203' },
  { id: '4', name: 'Alexandros Tzouros', fullNameArabic: 'ألكسندروس تزوروس', email: 'alex.tz@azhar-residence.com', mobile: '0506302641', emergencyPhone: '0558238013', whatsapp: '966506302641', password: 'tenant104', nationality: 'Greek', familyCount: 3, company: 'AZ', hasContract: true, compoundId: '1', compoundName: 'Azhar Residence', unitNumber: '239' },
  { id: '5', name: 'luke wheeler', fullNameArabic: 'لوك ويلر', email: 'luke.w@azhar-residence.com', mobile: '0558238013', emergencyPhone: '0506302641', whatsapp: '966558238013', password: 'tenant105', nationality: 'British', familyCount: 2, company: 'AZ', hasContract: true, compoundId: '1', compoundName: 'Azhar Residence', unitNumber: '230' },
  { id: '6', name: 'Fareed Fayez Assad', fullNameArabic: 'فريد فايز أسعد', email: 'fareed.assad@azhar-residence.com', mobile: '0505663844', emergencyPhone: '0505663844', whatsapp: '966505663844', password: 'tenant106', nationality: 'Lebanese', familyCount: 5, company: 'AZ', hasContract: true, compoundId: '1', compoundName: 'Azhar Residence', unitNumber: '198' },
  { id: '7', name: 'ali hussain', fullNameArabic: 'علي حسين', email: 'ali.hussain@azhar-residence.com', mobile: '0554244086', emergencyPhone: '0554194671', whatsapp: '966554244086', password: 'tenant107', nationality: 'Sudan', familyCount: 4, company: 'AZ', hasContract: true, compoundId: '1', compoundName: 'Azhar Residence', unitNumber: '142' },
  { id: '8', name: 'bahaalddin albashir', fullNameArabic: 'بهاء الدين البشير', email: 'bahaa.bashir@azhar-residence.com', mobile: '0562056972', emergencyPhone: '0562056972', whatsapp: '966562056972', password: 'tenant108', nationality: 'Sudan', familyCount: 4, company: 'AZ', hasContract: true, compoundId: '1', compoundName: 'Azhar Residence', unitNumber: '150' },
  { id: '9', name: 'mustafa ali', fullNameArabic: 'مصطفى علي', email: 'mustafaali1m@gmail.com', mobile: '0539111781', emergencyPhone: '0566027120', whatsapp: '966591234567', password: 'tenant109', nationality: 'Sudan', familyCount: 4, company: 'AZ', isMarried: true, tenantRemarks: 'Good tenant', workNotes: 'Engineer at AZ', hasContract: true, compoundId: '1', compoundName: 'Azhar Residence', unitNumber: '102' }
];

export const initialBuildings: Building[] = [
  { id: '1', compoundId: '1', compoundName: 'Azhar Residence', buildingNo: '101', remarks: 'Luxury Villa Block A', forFamilies: true },
  { id: '2', compoundId: '1', compoundName: 'Azhar Residence', buildingNo: '102', remarks: 'Executive Apartment Wing B', forFamilies: true },
  { id: '3', compoundId: '1', compoundName: 'Azhar Residence', buildingNo: '103', remarks: 'Duplex Garden Block C', forFamilies: true },
  { id: '4', compoundId: '1', compoundName: 'Azhar Residence', buildingNo: '104', remarks: 'Family Residency North', forFamilies: true }
];

export const initialUnits: Unit[] = [
  { id: '1', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '101', unitNumber: '203', rooms: 3, baths: 3, living: 2, majlis: 1, area: '220', type: 'Appartment', status: 'Occupied', annualRent: 45000, currentTenantId: '1', currentTenantName: 'ivan pugliese' },
  { id: '2', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '101', unitNumber: '239', rooms: 3, baths: 3, living: 2, majlis: 1, area: '220', type: 'Appartment', status: 'Occupied', annualRent: 45000, currentTenantId: '2', currentTenantName: 'Alexandros Tzouros' },
  { id: '3', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '101', unitNumber: '240', rooms: 2, baths: 2, living: 1, majlis: 1, area: '180', type: 'Appartment', status: 'Occupied', annualRent: 40000, currentTenantId: '3', currentTenantName: 'luke wheeler' },
  { id: '4', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '102', unitNumber: '118', rooms: 4, baths: 5, living: 2, majlis: 2, area: '480', type: 'Villa Duplex', status: 'Occupied', annualRent: 90000, currentTenantId: '4', currentTenantName: 'Fareed Fayez Assad' },
  { id: '5', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '102', unitNumber: '142', rooms: 4, baths: 5, living: 2, majlis: 2, area: '480', type: 'Villa Duplex', status: 'Occupied', annualRent: 90000, currentTenantId: '5', currentTenantName: 'ali hussain' },
  { id: '6', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '103', unitNumber: '150', rooms: 2, baths: 2, living: 1, majlis: 1, area: '180', type: 'Appartment', status: 'Occupied', annualRent: 40000, currentTenantId: '6', currentTenantName: 'bahaalddin albashir' },
  { id: '7', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '103', unitNumber: '188', rooms: 4, baths: 5, living: 2, majlis: 2, area: '480', type: 'Villa Duplex', status: 'Occupied', annualRent: 90000, currentTenantId: '7', currentTenantName: 'Tauqeer Khan Gul Munawar Khan' },
  { id: '8', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '104', unitNumber: '139', rooms: 5, baths: 6, living: 3, majlis: 2, area: '580', type: 'Villa', status: 'Occupied', annualRent: 95000, currentTenantId: '8', currentTenantName: 'ismail abdulsalam' },
  { id: '9', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '104', unitNumber: '160', rooms: 4, baths: 5, living: 2, majlis: 2, area: '500', type: 'Villa Duplex', status: 'Vacant', annualRent: 95000 },
  { id: '10', compoundId: '1', compoundName: 'Azhar Residence', buildingNumber: '104', unitNumber: '162', rooms: 3, baths: 3, living: 2, majlis: 1, area: '240', type: 'Appartment', status: 'Vacant', annualRent: 48000 }
];

export const initialContracts: Contract[] = [
  {
    id: '1',
    contractNo: '20230929197',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '101',
    unitNumber: '197',
    unitType: 'Villa',
    tenantId: '1',
    tenantName: 'Muhannad Rajab Mohammed Salamah',
    tenantMobile: '0553014805',
    tenantIdOrIqama: '2391029381',
    representativeName: 'Mohamed Khair',
    leaseStartDate: '30/09/2023',
    leaseDurationMonths: 12,
    leaseEndDate: '2024/09/29',
    annualRent: 90000,
    discount: 0,
    paidAmount: 45000,
    remainingAmount: 45000,
    paymentFrequency: 'Semi-Annual',
    status: 'Active',
    arabicNotes: '',
    englishNotes: '',
    notes: [
      { id: 'n1', date: '2023-09-30', author: 'Mohamed Khair', text: 'Contract signed for Villa 197.' }
    ]
  },
  {
    id: '2',
    contractNo: '20230930211',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '102',
    unitNumber: '211',
    unitType: 'Appartment',
    tenantId: '2',
    tenantName: 'Wesam Adam Haidar',
    tenantMobile: '0552226701',
    tenantIdOrIqama: '2491029382',
    representativeName: 'Mohamed Khair',
    leaseStartDate: '01/10/2023',
    leaseDurationMonths: 12,
    leaseEndDate: '2024/09/30',
    annualRent: 40000,
    discount: 0,
    paidAmount: 10000,
    remainingAmount: 30000,
    paymentFrequency: 'Quarterly',
    status: 'Active'
  },
  {
    id: '3',
    contractNo: '20231001203',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '101',
    unitNumber: '203',
    unitType: 'Appartment',
    tenantId: '3',
    tenantName: 'ivan pugliese',
    tenantMobile: '0550896224',
    tenantIdOrIqama: '2449322201',
    representativeName: 'Mohammed Barmada',
    leaseStartDate: '02/10/2023',
    leaseDurationMonths: 12,
    leaseEndDate: '2024/10/01',
    annualRent: 45000,
    discount: 0,
    paidAmount: 15000,
    remainingAmount: 30000,
    paymentFrequency: 'Quarterly',
    status: 'Active'
  },
  {
    id: '4',
    contractNo: '20231001239',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '101',
    unitNumber: '239',
    unitType: 'Appartment',
    tenantId: '4',
    tenantName: 'Alexandros Tzouros',
    tenantMobile: '0506302641',
    tenantIdOrIqama: '2454776861',
    representativeName: 'Mohammed Barmada',
    leaseStartDate: '02/10/2023',
    leaseDurationMonths: 12,
    leaseEndDate: '2024/10/01',
    annualRent: 45000,
    discount: 0,
    paidAmount: 15000,
    remainingAmount: 30000,
    paymentFrequency: 'Quarterly',
    status: 'Active'
  },
  {
    id: '5',
    contractNo: '20231001230',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '101',
    unitNumber: '230',
    unitType: 'Appartment',
    tenantId: '5',
    tenantName: 'luke wheeler',
    tenantMobile: '0558238013',
    tenantIdOrIqama: '2445098813',
    representativeName: 'Mohammed Barmada',
    leaseStartDate: '02/10/2023',
    leaseDurationMonths: 12,
    leaseEndDate: '2024/10/01',
    annualRent: 40000,
    discount: 0,
    paidAmount: 13333,
    remainingAmount: 26667,
    paymentFrequency: 'Monthly',
    status: 'Active'
  },
  {
    id: '6',
    contractNo: '20231004198',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '102',
    unitNumber: '198',
    unitType: 'Villa Duplex',
    tenantId: '6',
    tenantName: 'Fareed Fayez Assad',
    tenantMobile: '0505663844',
    tenantIdOrIqama: '2020474371',
    representativeName: 'Mohamed Khair',
    leaseStartDate: '05/10/2023',
    leaseDurationMonths: 12,
    leaseEndDate: '2024/10/04',
    annualRent: 90000,
    discount: 0,
    paidAmount: 45000,
    remainingAmount: 45000,
    paymentFrequency: 'Semi-Annual',
    status: 'Active'
  },
  {
    id: '7',
    contractNo: '20231014142',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '102',
    unitNumber: '142',
    unitType: 'Villa Duplex',
    tenantId: '7',
    tenantName: 'ali hussain',
    tenantMobile: '0554244086',
    tenantIdOrIqama: '2493623611',
    representativeName: 'Mohammed Barmada',
    leaseStartDate: '15/10/2023',
    leaseDurationMonths: 12,
    leaseEndDate: '2024/10/14',
    annualRent: 90000,
    discount: 0,
    paidAmount: 22500,
    remainingAmount: 67500,
    paymentFrequency: 'Quarterly',
    status: 'Active'
  }
];

export const initialDues: DueItem[] = [
  {
    id: '1',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    unitNumber: '203',
    tenantName: 'ivan pugliese',
    mobile: '0550896224',
    annualRent: 45000,
    remainingRents: 2,
    rentValue: 15000,
    rentalDueDate: '2026-08-15',
    contractExpiryDate: '2026-10-01',
    status: 'Due Soon'
  },
  {
    id: '2',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    unitNumber: '118',
    tenantName: 'Fareed Fayez Assad',
    mobile: '0505663844',
    annualRent: 90000,
    remainingRents: 1,
    rentValue: 45000,
    rentalDueDate: '2026-08-01',
    contractExpiryDate: '2026-10-04',
    status: 'Overdue'
  },
  {
    id: '3',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    unitNumber: '150',
    tenantName: 'bahaalddin albashir',
    mobile: '0562056972',
    annualRent: 40000,
    remainingRents: 0,
    rentValue: 40000,
    rentalDueDate: '2026-07-01',
    contractExpiryDate: '2026-11-04',
    status: 'Paid'
  }
];

export const initialMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: '1',
    rvNo: 'AZ-MNT-2026-001',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '101',
    unitNumber: '203',
    responsibleName: 'Mohammed Barmada',
    startDate: '2026-08-01',
    targetEndDate: '2026-08-12',
    workActivity: 'HVAC Air Conditioning Service & Filter Replacement',
    totalAmount: 650,
    status: 'In Progress',
    daysToEnd: 2,
    assignedStaffId: '2',
    assignedStaffName: 'عثمان عبد الرحيم'
  },
  {
    id: '2',
    rvNo: 'AZ-MNT-2026-002',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '102',
    unitNumber: '118',
    responsibleName: 'Mohamed Khair',
    startDate: '2026-08-05',
    targetEndDate: '2026-08-15',
    workActivity: 'Plumbing inspection in master bathroom',
    totalAmount: 350,
    status: 'Awaiting Supervisor Approval',
    daysToEnd: 4,
    assignedStaffId: '4',
    assignedStaffName: 'سليم فتحي'
  },
  {
    id: '3',
    rvNo: 'AZ-MNT-2026-003',
    compoundId: '1',
    compoundName: 'Azhar Residence',
    buildingNumber: '104',
    unitNumber: '139',
    responsibleName: 'Mohammed Barmada',
    startDate: '2026-07-20',
    targetEndDate: '2026-07-22',
    workActivity: 'Villa Garden Gate Painting & Automatic Lock Repair',
    totalAmount: 1100,
    status: 'Done',
    daysToEnd: 0,
    assignedStaffId: '1',
    assignedStaffName: 'محمد خير الدين'
  }
];

export const initialWaterMeters: WaterMeter[] = [
  { id: '1', building: 'Building 101 - Azhar Residence', meterNumber: '3617300002', lastReading: 1450, readingDate: '2026-08-01' },
  { id: '2', building: 'Building 102 - Azhar Residence', meterNumber: '3617300045', lastReading: 2180, readingDate: '2026-08-01' },
  { id: '3', building: 'Building 103 - Azhar Residence', meterNumber: '3617300098', lastReading: 1890, readingDate: '2026-08-01' }
];

export const initialElectricityMeters: ElectricityMeter[] = [
  { id: '1', compoundId: '1', building: '101', unitNumber: '203', type: 'Appartment', representativeName: 'Mohammed Barmada', isRented: true, transferredToTenant: true, meterNumber: '482835', paymentNumber: '10001799526' },
  { id: '2', compoundId: '1', building: '101', unitNumber: '239', type: 'Appartment', representativeName: 'Mohammed Barmada', isRented: true, transferredToTenant: true, meterNumber: '482839', paymentNumber: '10001799530' },
  { id: '3', compoundId: '1', building: '102', unitNumber: '118', type: 'Villa Duplex', representativeName: 'Mohamed Khair', isRented: true, transferredToTenant: false, meterNumber: '482842', paymentNumber: '10001799535' },
  { id: '4', compoundId: '1', building: '104', unitNumber: '139', type: 'Villa', representativeName: 'Mohammed Barmada', isRented: true, transferredToTenant: true, meterNumber: '591023', paymentNumber: '10002844102' }
];

export const initialComplaints: Complaint[] = [
  {
    id: '1',
    ticketNo: 'CMP-2026-101',
    complainantName: 'ivan pugliese',
    buildingNumber: '101',
    unitNumber: '203',
    phone: '0550896224',
    category: 'إزعاج وضوضاء',
    priority: 'High',
    description: 'صوت موسيقى مرتفع من الوحدة المجاورة في ساعات متاخرة من الليل.',
    status: 'In Progress',
    createdAt: '2026-08-08'
  },
  {
    id: '2',
    ticketNo: 'CMP-2026-102',
    complainantName: 'Fareed Fayez Assad',
    buildingNumber: '102',
    unitNumber: '118',
    phone: '0505663844',
    category: 'نظافة ومرافق',
    priority: 'Medium',
    description: 'تراكم بعض المخلفات بالقرب من الممر المؤدي للمواقف الخلفية.',
    status: 'New',
    createdAt: '2026-08-10'
  },
  {
    id: '3',
    ticketNo: 'CMP-2026-103',
    complainantName: 'Alexandros Tzouros',
    buildingNumber: '101',
    unitNumber: '239',
    phone: '0506302641',
    category: 'صيانة وتكييف',
    priority: 'Low',
    description: 'تسريب خفيف في مكيف الصالة الرئيسية وتم إرسال فني المعاينة.',
    status: 'Resolved',
    createdAt: '2026-08-02',
    resolutionNotes: 'تم إصلاح أنبوب التصريف وإعادة تعبئة الفريون.'
  }
];

export const initialStaff: StaffMember[] = [
  {
    id: '1',
    empCode: 'EMP-001',
    name: 'محمد خير الدين',
    role: 'مشرف عام المجمع',
    mobile: '0551122334',
    whatsapp: '966551122334',
    nationalId: '2349012831',
    status: 'Active',
    joiningDate: '2022-01-15',
    salary: 7500,
    password: 'emp101',
    notes: 'مسؤول المتابعة والمستأجرين'
  },
  {
    id: '2',
    empCode: 'EMP-002',
    name: 'عثمان عبد الرحيم',
    role: 'فني كهرباء وتكييف',
    mobile: '0554433221',
    whatsapp: '966554433221',
    nationalId: '2410293812',
    status: 'Active',
    joiningDate: '2022-06-01',
    salary: 4500,
    password: 'emp102',
    notes: 'فني الصيانة السريعة للوحدات'
  },
  {
    id: '3',
    empCode: 'EMP-003',
    name: 'عبد القادر علي',
    role: 'حارس أمن وأمن المجمع',
    mobile: '0509988776',
    whatsapp: '966509988776',
    nationalId: '2398471029',
    status: 'Active',
    joiningDate: '2023-03-10',
    salary: 3800,
    password: 'emp103',
    notes: 'البوابة الرئيسية وردية مسائية'
  },
  {
    id: '4',
    empCode: 'EMP-004',
    name: 'سليم فتحي',
    role: 'فني سباكة وشبكات مياه',
    mobile: '0531144556',
    whatsapp: '966531144556',
    nationalId: '2481029381',
    status: 'On Leave',
    joiningDate: '2023-08-20',
    salary: 4200,
    password: 'emp104',
    notes: 'في إجازة سنوية حتى نهاية الشهر'
  }
];

export const initialExpenses: Expense[] = [
  {
    id: '1',
    voucherNo: 'EXP-2026-001',
    category: 'صيانة وتشغيل',
    title: 'قطع غيار تكييف ومراوح تبريد للوحدات',
    amount: 3200,
    recipient: 'شركة النسيم للتكييف والتبريد',
    paymentMethod: 'Bank Transfer',
    expenseDate: '2026-08-01',
    compoundId: '1',
    notes: 'فاتورة ضريبية رقم 8912'
  },
  {
    id: '2',
    voucherNo: 'EXP-2026-002',
    category: 'رواتب الموظفين',
    title: 'صرف راتب فني الكهرباء والحارس لشهر يوليو',
    amount: 8300,
    recipient: 'فريق صيانة وأمن المجمع',
    paymentMethod: 'Bank Transfer',
    expenseDate: '2026-08-02',
    compoundId: '1',
    notes: 'حوالة بنكية موثقة'
  },
  {
    id: '3',
    voucherNo: 'EXP-2026-003',
    category: 'كهرباء ومياه',
    title: 'سداد سداد فاتورة المياه العامة للحدائق والممرات',
    amount: 1450,
    recipient: 'شركة المياه الوطنية',
    paymentMethod: 'Sadad',
    expenseDate: '2026-08-05',
    compoundId: '1',
    notes: 'حساب سداد رقم 3617300002'
  },
  {
    id: '4',
    voucherNo: 'EXP-2026-004',
    category: 'نظافة وأمن',
    title: 'أدوات ومواد نظافة ومعقمات للمجمع',
    amount: 980,
    recipient: 'مؤسسة المدار لمواد النظافة',
    paymentMethod: 'Mada',
    expenseDate: '2026-08-07',
    compoundId: '1',
    notes: 'شراء مباشر بموجب إيصال مدى'
  }
];

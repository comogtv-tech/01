/**
 * Data layer for SiamBus Express & Queue System
 * Provides routes, stations, schedules, bus configurations, and LocalStorage sync.
 */

const STORAGE_KEYS = {
  SCHEDULES: 'siambus_schedules_v1',
  BOOKINGS: 'siambus_bookings_v1',
  STATIONS: 'siambus_stations_v1'
};

const DEFAULT_STATIONS = [
  { id: 'BKK_MOH', name: 'กรุงเทพฯ (หมอชิต 2)', province: 'กรุงเทพมหานคร', code: 'BKK-M' },
  { id: 'BKK_EKK', name: 'กรุงเทพฯ (เอกมัย)', province: 'กรุงเทพมหานคร', code: 'BKK-E' },
  { id: 'BKK_SAI', name: 'กรุงเทพฯ (สายใต้ใหม่)', province: 'กรุงเทพมหานคร', code: 'BKK-S' },
  { id: 'CNX_ARC', name: 'เชียงใหม่ (อาเขต 3)', province: 'เชียงใหม่', code: 'CNX' },
  { id: 'HKT_TRM', name: 'ภูเก็ต (บขส. 2)', province: 'ภูเก็ต', code: 'HKT' },
  { id: 'PTY_NRM', name: 'พัทยา (สถานีพัทยาเหนือ)', province: 'ชลบุรี', code: 'PTY' },
  { id: 'KKC_TRM', name: 'ขอนแก่น (บขส. 3)', province: 'ขอนแก่น', code: 'KKC' },
  { id: 'NMA_KOR', name: 'นครราชสีมา (บขส. 2)', province: 'นครราชสีมา', code: 'NMA' },
  { id: 'CRA_TRM', name: 'เชียงราย (บขส. 2)', province: 'เชียงราย', code: 'CRA' },
  { id: 'HDY_TRM', name: 'หาดใหญ่ (บขส. หาดใหญ่)', province: 'สงขลา', code: 'HDY' },
  { id: 'HHN_TRM', name: 'หัวหิน (สถานี บขส. หัวหิน)', province: 'ประจวบคีรีขันธ์', code: 'HHN' }
];

const BUS_CLASSES = {
  VIP24: {
    id: 'VIP24',
    name: 'VIP Super First Class (24 ที่นั่ง)',
    seatsCount: 24,
    layout: '1-2', // Single on left, Double on right
    decks: 1,
    rows: 8,
    features: ['เบาะนวดไฟฟ้า 135°', 'หน้าจอส่วนตัว 10"', 'Free Wi-Fi High-Speed', 'อาหารว่าง & เครื่องดื่ม', 'ห้องน้ำบนรถ', 'พอร์ต USB Fast Charge'],
    badgeColor: 'gold',
    priceMultiplier: 1.45
  },
  FIRST32: {
    id: 'FIRST32',
    name: 'First Class Special (32 ที่นั่ง)',
    seatsCount: 32,
    layout: '2-2',
    decks: 1,
    rows: 8,
    features: ['เบาะปรับเอน 125°', 'Free Wi-Fi', 'ขนมและน้ำดื่ม', 'ห้องน้ำบนรถ', 'ช่องชาร์จ USB'],
    badgeColor: 'blue',
    priceMultiplier: 1.15
  },
  EXPRESS40: {
    id: 'EXPRESS40',
    name: 'Standard Express (40 ที่นั่ง)',
    seatsCount: 40,
    layout: '2-2',
    decks: 1,
    rows: 10,
    features: ['แอร์เย็นฉ่ำ', 'เบาะปรับเอนสบาย', 'น้ำดื่มฟรี', 'ช่องเสียบ USB รวม'],
    badgeColor: 'green',
    priceMultiplier: 1.0
  },
  DOUBLE_DECK: {
    id: 'DOUBLE_DECK',
    name: 'Double Decker VIP (42 ที่นั่ง)',
    seatsCount: 42,
    layout: '2-2',
    decks: 2,
    upperRows: 8,
    lowerRows: 3,
    features: ['รถ 2 ชั้นวิวพานอรามา', 'เบาะนวดระบบไฟฟ้า', 'Free Wi-Fi & USB', 'ห้องน้ำชั้นล่าง', 'ขนมและเครื่องดื่ม'],
    badgeColor: 'purple',
    priceMultiplier: 1.35
  }
};

const DEFAULT_SCHEDULES = [
  {
    id: 'SCH-1001',
    routeNumber: '91-VIP',
    operator: 'สยามเอ็กซ์เพรส พรีเมียม (SiamExpress)',
    busClass: 'VIP24',
    plateNumber: '15-4421 กทม.',
    originId: 'BKK_MOH',
    destinationId: 'CNX_ARC',
    departureTime: '08:30',
    arrivalTime: '17:45',
    duration: '9 ชม. 15 นาที',
    basePrice: 890,
    platform: 'ชานชาลา 14',
    gate: 'Gate 3',
    status: 'SCHEDULED', // SCHEDULED, BOARDING, DEPARTED, ARRIVED
    bookedSeats: ['1A', '1B', '3C', '4A', '5B'],
    dateOffsetDays: 0
  },
  {
    id: 'SCH-1002',
    routeNumber: '91-EX',
    operator: 'นครสยามทรานสปอร์ต (Nakhon Siam)',
    busClass: 'FIRST32',
    plateNumber: '10-8829 เชียงใหม่',
    originId: 'BKK_MOH',
    destinationId: 'CNX_ARC',
    departureTime: '13:00',
    arrivalTime: '22:15',
    duration: '9 ชม. 15 นาที',
    basePrice: 650,
    platform: 'ชานชาลา 12',
    gate: 'Gate 2',
    status: 'SCHEDULED',
    bookedSeats: ['2A', '2B', '2C', '2D', '6A', '6B'],
    dateOffsetDays: 0
  },
  {
    id: 'SCH-1003',
    routeNumber: '91-NIGHT',
    operator: 'สยามเอ็กซ์เพรส พรีเมียม (SiamExpress)',
    busClass: 'DOUBLE_DECK',
    plateNumber: '16-9011 กทม.',
    originId: 'BKK_MOH',
    destinationId: 'CNX_ARC',
    departureTime: '20:30',
    arrivalTime: '05:45',
    duration: '9 ชม. 15 นาที',
    basePrice: 790,
    platform: 'ชานชาลา 15',
    gate: 'Gate 4',
    status: 'SCHEDULED',
    bookedSeats: ['U1A', 'U1B', 'U2A', 'L1A', 'L1B'],
    dateOffsetDays: 0
  },
  {
    id: 'SCH-1004',
    routeNumber: '984-VIP',
    operator: 'สยามเซาเทิร์น บัส (Southern Star)',
    busClass: 'VIP24',
    plateNumber: '14-3112 ภูเก็ต',
    originId: 'BKK_SAI',
    destinationId: 'HKT_TRM',
    departureTime: '18:00',
    arrivalTime: '06:30',
    duration: '12 ชม. 30 นาที',
    basePrice: 1050,
    platform: 'ชานชาลา 08',
    gate: 'Gate 1',
    status: 'SCHEDULED',
    bookedSeats: ['1A', '2A', '3A', '4B', '4C'],
    dateOffsetDays: 0
  },
  {
    id: 'SCH-1005',
    routeNumber: '984-EX',
    operator: 'สยามเซาเทิร์น บัส (Southern Star)',
    busClass: 'EXPRESS40',
    plateNumber: '14-7789 กทม.',
    originId: 'BKK_SAI',
    destinationId: 'HKT_TRM',
    departureTime: '19:30',
    arrivalTime: '08:15',
    duration: '12 ชม. 45 นาที',
    basePrice: 720,
    platform: 'ชานชาลา 09',
    gate: 'Gate 1',
    status: 'SCHEDULED',
    bookedSeats: ['1A', '1B', '3A', '5C', '5D'],
    dateOffsetDays: 0
  },
  {
    id: 'SCH-1006',
    routeNumber: '38-MINI',
    operator: 'พัทยารวดเร็ว (Pattaya Rapid)',
    busClass: 'EXPRESS40',
    plateNumber: '10-2234 ชลบุรี',
    originId: 'BKK_EKK',
    destinationId: 'PTY_NRM',
    departureTime: '09:00',
    arrivalTime: '11:00',
    duration: '2 ชม. 00 นาที',
    basePrice: 150,
    platform: 'ชานชาลา 03',
    gate: 'Gate A',
    status: 'BOARDING',
    bookedSeats: ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'],
    dateOffsetDays: 0
  },
  {
    id: 'SCH-1007',
    routeNumber: '38-MINI-2',
    operator: 'พัทยารวดเร็ว (Pattaya Rapid)',
    busClass: 'EXPRESS40',
    plateNumber: '10-2235 ชลบุรี',
    originId: 'BKK_EKK',
    destinationId: 'PTY_NRM',
    departureTime: '11:30',
    arrivalTime: '13:30',
    duration: '2 ชม. 00 นาที',
    basePrice: 150,
    platform: 'ชานชาลา 03',
    gate: 'Gate A',
    status: 'SCHEDULED',
    bookedSeats: ['1C', '2C'],
    dateOffsetDays: 0
  },
  {
    id: 'SCH-1008',
    routeNumber: '21-ISAN',
    operator: 'สยามอีสาน ทัวร์ (Isan Express)',
    busClass: 'FIRST32',
    plateNumber: '12-9901 ขอนแก่น',
    originId: 'BKK_MOH',
    destinationId: 'KKC_TRM',
    departureTime: '10:00',
    arrivalTime: '16:00',
    duration: '6 ชม. 00 นาที',
    basePrice: 420,
    platform: 'ชานชาลา 06',
    gate: 'Gate 2',
    status: 'SCHEDULED',
    bookedSeats: ['1A', '2A', '3B', '4C'],
    dateOffsetDays: 0
  },
  {
    id: 'SCH-1009',
    routeNumber: '21-KORAT',
    operator: 'โคราชไดเร็ค (Korat Direct Express)',
    busClass: 'FIRST32',
    plateNumber: '11-6677 นครราชสีมา',
    originId: 'BKK_MOH',
    destinationId: 'NMA_KOR',
    departureTime: '08:00',
    arrivalTime: '11:45',
    duration: '3 ชม. 45 นาที',
    basePrice: 240,
    platform: 'ชานชาลา 02',
    gate: 'Gate 1',
    status: 'BOARDING',
    bookedSeats: ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B'],
    dateOffsetDays: 0
  },
  {
    id: 'SCH-1010',
    routeNumber: '992-SOUTH',
    operator: 'สยามเซาเทิร์น บัส (Southern Star)',
    busClass: 'VIP24',
    plateNumber: '15-7721 สงขลา',
    originId: 'BKK_SAI',
    destinationId: 'HDY_TRM',
    departureTime: '17:00',
    arrivalTime: '07:30',
    duration: '14 ชม. 30 นาที',
    basePrice: 1150,
    platform: 'ชานชาลา 11',
    gate: 'Gate 4',
    status: 'SCHEDULED',
    bookedSeats: ['1A', '2A', '2B', '3A'],
    dateOffsetDays: 0
  }
];

const DEFAULT_BOOKINGS = [
  {
    bookingId: 'BUS-2026-8801',
    queueNumber: 'Q-042',
    scheduleId: 'SCH-1001',
    travelDate: new Date().toISOString().split('T')[0],
    passenger: {
      fullname: 'สมชาย เดินทางดี',
      phone: '081-234-5678',
      email: 'somchai.d@email.com',
      idCard: '1-1002-00345-67-1'
    },
    seats: ['1A', '1B'],
    passengersList: [
      { name: 'สมชาย เดินทางดี', seat: '1A', type: 'ผู้ใหญ่' },
      { name: 'สมศรี เดินทางดี', seat: '1B', type: 'ผู้ใหญ่' }
    ],
    boardingStation: 'หมอชิต 2 (อาคารผู้โดยสารหลัก ชั้น 3)',
    dropoffStation: 'สถานีขนส่งผู้โดยสารจังหวัดเชียงใหม่ แห่งที่ 3 (อาเขต)',
    addons: { insurance: true, extraLuggage: 1, meal: 'อาหารมังสวิรัติ' },
    fareBreakdown: {
      seatPrice: 1780,
      insuranceFee: 60,
      luggageFee: 100,
      discount: 0,
      total: 1940
    },
    paymentStatus: 'PAID',
    paymentMethod: 'PromptPay QR',
    checkinStatus: 'CHECKED_IN',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    bookingId: 'BUS-2026-8802',
    queueNumber: 'Q-043',
    scheduleId: 'SCH-1006',
    travelDate: new Date().toISOString().split('T')[0],
    passenger: {
      fullname: 'วิภาดา รักษ์เที่ยว',
      phone: '089-987-6543',
      email: 'wiphada@email.com',
      idCard: '3-1005-00123-99-8'
    },
    seats: ['1A'],
    passengersList: [
      { name: 'วิภาดา รักษ์เที่ยว', seat: '1A', type: 'ผู้ใหญ่' }
    ],
    boardingStation: 'สถานีขนส่งผู้โดยสารกรุงเทพฯ (เอกมัย)',
    dropoffStation: 'สถานีพัทยาเหนือ (หน้าช่องจำหน่ายตั๋ว 2)',
    addons: { insurance: false, extraLuggage: 0, meal: 'ไม่รับ' },
    fareBreakdown: {
      seatPrice: 150,
      insuranceFee: 0,
      luggageFee: 0,
      discount: 0,
      total: 150
    },
    paymentStatus: 'PAID',
    paymentMethod: 'Credit/Debit Card',
    checkinStatus: 'WAITING',
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString()
  }
];

class DataService {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.STATIONS)) {
      localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(DEFAULT_STATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULES)) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(DEFAULT_SCHEDULES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(DEFAULT_BOOKINGS));
    }
  }

  getStations() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.STATIONS)) || DEFAULT_STATIONS;
    } catch (e) {
      return DEFAULT_STATIONS;
    }
  }

  getStationById(id) {
    return this.getStations().find(s => s.id === id) || null;
  }

  getSchedules() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULES)) || DEFAULT_SCHEDULES;
    } catch (e) {
      return DEFAULT_SCHEDULES;
    }
  }

  saveSchedules(schedules) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }

  getScheduleById(id) {
    return this.getSchedules().find(s => s.id === id) || null;
  }

  searchSchedules(originId, destinationId, dateStr, busClassFilter = 'ALL') {
    const all = this.getSchedules();
    return all.filter(item => {
      const matchOrigin = !originId || item.originId === originId;
      const matchDest = !destinationId || item.destinationId === destinationId;
      const matchClass = busClassFilter === 'ALL' || item.busClass === busClassFilter;
      return matchOrigin && matchDest && matchClass;
    });
  }

  getBookings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS)) || DEFAULT_BOOKINGS;
    } catch (e) {
      return DEFAULT_BOOKINGS;
    }
  }

  saveBookings(bookings) {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }

  getBookingById(id) {
    if (!id) return null;
    return this.getBookings().find(b => b.bookingId.toLowerCase() === id.trim().toLowerCase()) || null;
  }

  getBookingsByPhone(phone) {
    if (!phone) return [];
    const clean = phone.replace(/\D/g, '');
    return this.getBookings().filter(b => b.passenger.phone.replace(/\D/g, '').includes(clean));
  }

  createBooking(bookingData) {
    const bookings = this.getBookings();
    
    // Generate next queue number for today
    const queueNo = `Q-${String(bookings.length + 41).padStart(3, '0')}`;
    const bookingId = `BUS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking = {
      ...bookingData,
      bookingId,
      queueNumber: queueNo,
      checkinStatus: 'WAITING',
      paymentStatus: 'PAID',
      createdAt: new Date().toISOString()
    };

    bookings.unshift(newBooking);
    this.saveBookings(bookings);

    // Update schedule booked seats
    const schedules = this.getSchedules();
    const sch = schedules.find(s => s.id === bookingData.scheduleId);
    if (sch) {
      sch.bookedSeats = Array.from(new Set([...(sch.bookedSeats || []), ...bookingData.seats]));
      this.saveSchedules(schedules);
    }

    return newBooking;
  }

  updateBookingCheckin(bookingId, status) {
    const bookings = this.getBookings();
    const b = bookings.find(item => item.bookingId === bookingId);
    if (b) {
      b.checkinStatus = status;
      this.saveBookings(bookings);
      return b;
    }
    return null;
  }

  updateScheduleStatus(scheduleId, status) {
    const schedules = this.getSchedules();
    const sch = schedules.find(s => s.id === scheduleId);
    if (sch) {
      sch.status = status;
      this.saveSchedules(schedules);
      return sch;
    }
    return null;
  }

  addSchedule(scheduleData) {
    const schedules = this.getSchedules();
    const id = `SCH-${Date.now().toString().slice(-4)}`;
    const newSchedule = {
      ...scheduleData,
      id,
      bookedSeats: [],
      status: 'SCHEDULED'
    };
    schedules.push(newSchedule);
    this.saveSchedules(schedules);
    return newSchedule;
  }

  deleteSchedule(scheduleId) {
    let schedules = this.getSchedules();
    schedules = schedules.filter(s => s.id !== scheduleId);
    this.saveSchedules(schedules);
  }

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(DEFAULT_STATIONS));
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(DEFAULT_SCHEDULES));
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(DEFAULT_BOOKINGS));
  }
}

// Global instance
window.dataService = new DataService();

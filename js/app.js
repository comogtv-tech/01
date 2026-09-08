/**
 * SiamBus Express - Passenger Booking Portal Logic
 */

// Application State
const appState = {
  currentStep: 1, // 1: Search & Schedules, 2: Seat Map, 3: Passenger Info, 4: Summary & Payment
  selectedSchedule: null,
  selectedSeats: [],
  passengers: [],
  contactInfo: {
    fullname: '',
    phone: '',
    email: '',
    idCard: ''
  },
  boardingStation: '',
  dropoffStation: '',
  addons: {
    insurance: true,
    extraLuggage: 0,
    meal: 'standard'
  },
  paymentMethod: 'PromptPay QR',
  filters: {
    origin: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
    passengersCount: 1,
    busClass: 'ALL'
  }
};

// UI Elements & Helpers
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  populateStationsDropdowns();
  setupDatePicker();
  setupSeatMapCallback();
  renderScheduleList();
  bindEvents();
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';
  if (type === 'warning') icon = '🔔';

  toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

function populateStationsDropdowns() {
  const stations = window.dataService.getStations();
  const originSelect = document.getElementById('originSelect');
  const destSelect = document.getElementById('destSelect');

  if (!originSelect || !destSelect) return;

  originSelect.innerHTML = '<option value="">ทุกต้นทาง (All Origins)</option>';
  destSelect.innerHTML = '<option value="">ทุกปลายทาง (All Destinations)</option>';

  stations.forEach(st => {
    const opt1 = new Option(`${st.name} [${st.code}]`, st.id);
    const opt2 = new Option(`${st.name} [${st.code}]`, st.id);
    originSelect.add(opt1);
    destSelect.add(opt2);
  });

  // Default selection
  originSelect.value = 'BKK_MOH';
  destSelect.value = 'CNX_ARC';
  appState.filters.origin = 'BKK_MOH';
  appState.filters.destination = 'CNX_ARC';
}

function setupDatePicker() {
  const dateInput = document.getElementById('travelDateInput');
  if (!dateInput) return;

  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;
  appState.filters.date = today;
}

function setupSeatMapCallback() {
  window.seatMap.onSeatSelectionChange = (seats) => {
    appState.selectedSeats = [...seats];
    updateSeatSelectionSummary();
  };
}

function bindEvents() {
  // Search Form Submit
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      appState.filters.origin = document.getElementById('originSelect').value;
      appState.filters.destination = document.getElementById('destSelect').value;
      appState.filters.date = document.getElementById('travelDateInput').value;
      renderScheduleList();
      showToast('อัปเดตรอบรถที่ค้นหาเรียบร้อยแล้ว', 'info');
    });
  }

  // Swap origin & dest
  const swapBtn = document.getElementById('swapStationBtn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const originSelect = document.getElementById('originSelect');
      const destSelect = document.getElementById('destSelect');
      const temp = originSelect.value;
      originSelect.value = destSelect.value;
      destSelect.value = temp;

      appState.filters.origin = originSelect.value;
      appState.filters.destination = destSelect.value;
      renderScheduleList();
    });
  }

  // Quick routes chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const from = chip.getAttribute('data-from');
      const to = chip.getAttribute('data-to');
      document.getElementById('originSelect').value = from;
      document.getElementById('destSelect').value = to;
      appState.filters.origin = from;
      appState.filters.destination = to;
      renderScheduleList();
      showToast(`เลือกเส้นทาง: ${chip.textContent.trim()}`, 'info');
    });
  });

  // Filter chips (Bus class)
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      appState.filters.busClass = chip.getAttribute('data-class') || 'ALL';
      renderScheduleList();
    });
  });
}

function renderScheduleList() {
  const container = document.getElementById('scheduleListContainer');
  if (!container) return;

  const schedules = window.dataService.searchSchedules(
    appState.filters.origin,
    appState.filters.destination,
    appState.filters.date,
    appState.filters.busClass
  );

  const countBadge = document.getElementById('scheduleCountBadge');
  if (countBadge) {
    countBadge.textContent = `พบ ${schedules.length} เที่ยวรถ`;
  }

  if (schedules.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🚌💨</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">ไม่พบเที่ยวรถในเส้นทางที่เลือก</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">ลองเปลี่ยนสถานีต้นทาง-ปลายทาง หรือเลือกดูทุกเที่ยวรถ</p>
        <button class="btn btn-secondary" onclick="resetSearchFilters()">ล้างตัวกรองและดูทั้งหมด</button>
      </div>
    `;
    return;
  }

  container.innerHTML = schedules.map((sch, index) => {
    const origin = window.dataService.getStationById(sch.originId);
    const dest = window.dataService.getStationById(sch.destinationId);
    const busClass = BUS_CLASSES[sch.busClass] || BUS_CLASSES.FIRST32;
    const availableSeats = busClass.seatsCount - (sch.bookedSeats ? sch.bookedSeats.length : 0);

    const isFeatured = index === 0;

    return `
      <div class="schedule-card ${isFeatured ? 'featured' : ''}">
        <div class="bus-meta-side">
          <div class="operator-tag">
            <span>🚍</span> ${sch.operator}
          </div>
          <div>
            <span class="bus-badge badge-${busClass.badgeColor}">${busClass.name}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            ทะเบียน: <strong>${sch.plateNumber}</strong> • ${sch.platform} (${sch.gate})
          </div>
          <div class="bus-amenities">
            ${busClass.features.slice(0, 3).map(f => `<span class="amenity-tag">${f}</span>`).join('')}
          </div>
        </div>

        <div class="trip-timeline">
          <div class="time-point">
            <div class="time">${sch.departureTime}</div>
            <div class="station-name">${origin ? origin.name : 'ต้นทาง'}</div>
          </div>
          <div class="time-middle">
            <span class="duration-pill">⏱️ ${sch.duration}</span>
            <div class="route-line">
              <span class="route-line-icon">➔</span>
            </div>
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">เดินทางตรง</span>
          </div>
          <div class="time-point">
            <div class="time">${sch.arrivalTime}</div>
            <div class="station-name">${dest ? dest.name : 'ปลายทาง'}</div>
          </div>
        </div>

        <div class="price-action-side">
          <div class="price-display">
            <div class="price-label">ราคาต่อที่นั่ง</div>
            <div>
              <span class="price-amount">฿${sch.basePrice.toLocaleString()}</span>
              <span class="price-unit">/คน</span>
            </div>
            <div class="seat-status-pill">
              <span>●</span> เหลือ ${availableSeats} ที่นั่ง
            </div>
          </div>

          <button class="btn btn-primary" onclick="selectScheduleForBooking('${sch.id}')">
            เลือกเที่ยวนี้ ➔
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function resetSearchFilters() {
  document.getElementById('originSelect').value = '';
  document.getElementById('destSelect').value = '';
  appState.filters.origin = '';
  appState.filters.destination = '';
  appState.filters.busClass = 'ALL';
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-class') === 'ALL');
  });
  renderScheduleList();
}

// --------------------------------------------------------------------------
// STEP NAVIGATION
// --------------------------------------------------------------------------
function goToStep(stepNumber) {
  appState.currentStep = stepNumber;

  // Update wizard progress bar
  document.querySelectorAll('.wizard-step').forEach((el, idx) => {
    const sNum = idx + 1;
    el.classList.remove('active', 'completed');
    if (sNum === stepNumber) {
      el.classList.add('active');
    } else if (sNum < stepNumber) {
      el.classList.add('completed');
    }
  });

  // Hide all step views
  document.getElementById('step1View').style.display = stepNumber === 1 ? 'block' : 'none';
  document.getElementById('step2View').style.display = stepNumber === 2 ? 'block' : 'none';
  document.getElementById('step3View').style.display = stepNumber === 3 ? 'block' : 'none';
  document.getElementById('step4View').style.display = stepNumber === 4 ? 'block' : 'none';

  window.scrollTo({ top: 180, behavior: 'smooth' });
}

// Select a schedule from Step 1
function selectScheduleForBooking(scheduleId) {
  const sch = window.dataService.getScheduleById(scheduleId);
  if (!sch) return;

  appState.selectedSchedule = sch;
  appState.selectedSeats = [];

  // Initialize Seat Map
  window.seatMap.init(sch, []);

  // Update trip info in Step 2 banner
  const origin = window.dataService.getStationById(sch.originId);
  const dest = window.dataService.getStationById(sch.destinationId);
  const busClass = BUS_CLASSES[sch.busClass];

  document.getElementById('selectedTripTitle').innerHTML = `
    ${origin ? origin.name : ''} ➔ ${dest ? dest.name : ''}
    <span class="bus-badge badge-${busClass.badgeColor}" style="margin-left: 0.5rem; font-size: 0.8rem;">${busClass.name}</span>
  `;
  document.getElementById('selectedTripMeta').textContent = `
    วันที่: ${appState.filters.date} | เวลาออก: ${sch.departureTime} น. | ทะเบียน: ${sch.plateNumber} | ${sch.platform}
  `;

  updateSeatSelectionSummary();
  goToStep(2);
}

// Update summary on Step 2 (Seat selection)
function updateSeatSelectionSummary() {
  const seats = appState.selectedSeats;
  const sch = appState.selectedSchedule;
  const countEl = document.getElementById('selectedSeatsCount');
  const listEl = document.getElementById('selectedSeatsList');
  const priceEl = document.getElementById('selectedSeatsTotalPrice');
  const nextBtn = document.getElementById('proceedToPassengerBtn');

  if (!countEl || !sch) return;

  countEl.textContent = seats.length;
  if (seats.length > 0) {
    listEl.innerHTML = seats.map(s => `<span class="passenger-seat-badge" style="margin: 0 4px 4px 0;">ที่นั่ง ${s}</span>`).join('');
    const total = seats.length * sch.basePrice;
    priceEl.textContent = `฿${total.toLocaleString()}`;
    nextBtn.disabled = false;
  } else {
    listEl.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">ยังไม่ได้เลือกที่นั่ง</span>';
    priceEl.textContent = '฿0';
    nextBtn.disabled = true;
  }
}

// Proceed to Step 3 (Passenger Form)
function proceedToPassengerDetails() {
  if (appState.selectedSeats.length === 0) {
    showToast('กรุณาเลือกที่นั่งอย่างน้อย 1 ที่นั่ง', 'warning');
    return;
  }

  // Populate Passenger input fields dynamically based on selected seats
  renderPassengerFormFields();
  updateStep3Summary();
  goToStep(3);
}

function renderPassengerFormFields() {
  const container = document.getElementById('passengerInputsContainer');
  if (!container) return;

  const seats = appState.selectedSeats;
  container.innerHTML = seats.map((seat, index) => {
    return `
      <div class="form-section-card" style="margin-bottom: 1rem; border-left: 4px solid var(--primary);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h4 style="font-weight: 700; font-size: 1rem;">ผู้โดยสารคนที่ ${index + 1}</h4>
          <span class="passenger-seat-badge">ที่นั่ง ${seat}</span>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">ชื่อ-นามสกุล *</label>
            <input type="text" class="form-control passenger-name-input" data-index="${index}" placeholder="เช่น นายสมชาย ใจดี" required>
          </div>
          <div class="form-group">
            <label class="form-label">ประเภทผู้โดยสาร</label>
            <select class="form-select passenger-type-select" data-index="${index}">
              <option value="ผู้ใหญ่">ผู้ใหญ่ (Adult)</option>
              <option value="เด็ก / นักเรียน">เด็ก / นักเรียน (Child/Student)</option>
              <option value="ผู้สูงอายุ">ผู้สูงอายุ 60 ปีขึ้นไป (Senior)</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Pickup & Dropoff stations preset
  const sch = appState.selectedSchedule;
  const origin = window.dataService.getStationById(sch.originId);
  const dest = window.dataService.getStationById(sch.destinationId);

  const pickupInput = document.getElementById('boardingStationInput');
  const dropoffInput = document.getElementById('dropoffStationInput');
  if (pickupInput && origin) pickupInput.value = `${origin.name} (${sch.platform})`;
  if (dropoffInput && dest) dropoffInput.value = dest.name;
}

function toggleAddon(addonName) {
  if (addonName === 'insurance') {
    appState.addons.insurance = !appState.addons.insurance;
    document.getElementById('addonInsuranceCard').classList.toggle('selected', appState.addons.insurance);
  } else if (addonName === 'luggage') {
    appState.addons.extraLuggage = appState.addons.extraLuggage > 0 ? 0 : 1;
    document.getElementById('addonLuggageCard').classList.toggle('selected', appState.addons.extraLuggage > 0);
  }
  updateStep3Summary();
}

function selectMeal(type) {
  appState.addons.meal = type;
  document.querySelectorAll('.meal-option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-meal') === type);
  });
}

function updateStep3Summary() {
  const sch = appState.selectedSchedule;
  if (!sch) return;

  const seatTotal = appState.selectedSeats.length * sch.basePrice;
  const insuranceTotal = appState.addons.insurance ? appState.selectedSeats.length * 30 : 0;
  const luggageTotal = appState.addons.extraLuggage * 100;
  const grandTotal = seatTotal + insuranceTotal + luggageTotal;

  document.getElementById('summarySeatsCount').textContent = `${appState.selectedSeats.length} ที่นั่ง (${appState.selectedSeats.join(', ')})`;
  document.getElementById('summarySeatsPrice').textContent = `฿${seatTotal.toLocaleString()}`;
  document.getElementById('summaryInsurancePrice').textContent = `฿${insuranceTotal.toLocaleString()}`;
  document.getElementById('summaryLuggagePrice').textContent = `฿${luggageTotal.toLocaleString()}`;
  document.getElementById('summaryGrandTotal').textContent = `฿${grandTotal.toLocaleString()}`;
}

// Proceed to Step 4 (Payment & Confirmation)
function proceedToConfirmation() {
  // Validate main contact
  const contactName = document.getElementById('mainContactName').value.trim();
  const contactPhone = document.getElementById('mainContactPhone').value.trim();
  const contactEmail = document.getElementById('mainContactEmail').value.trim();
  const contactId = document.getElementById('mainContactId').value.trim();

  if (!contactName || !contactPhone) {
    showToast('กรุณากรอกชื่อและเบอร์โทรศัพท์ผู้ติดต่อหลัก', 'error');
    return;
  }

  appState.contactInfo = {
    fullname: contactName,
    phone: contactPhone,
    email: contactEmail,
    idCard: contactId
  };

  appState.boardingStation = document.getElementById('boardingStationInput').value;
  appState.dropoffStation = document.getElementById('dropoffStationInput').value;

  // Collect individual passenger names
  const nameInputs = document.querySelectorAll('.passenger-name-input');
  const typeSelects = document.querySelectorAll('.passenger-type-select');
  appState.passengers = [];

  nameInputs.forEach((input, idx) => {
    const val = input.value.trim() || `${contactName} (${idx + 1})`;
    const typeVal = typeSelects[idx] ? typeSelects[idx].value : 'ผู้ใหญ่';
    appState.passengers.push({
      name: val,
      seat: appState.selectedSeats[idx],
      type: typeVal
    });
  });

  renderStep4Confirmation();
  goToStep(4);
}

function renderStep4Confirmation() {
  const sch = appState.selectedSchedule;
  const origin = window.dataService.getStationById(sch.originId);
  const dest = window.dataService.getStationById(sch.destinationId);

  const seatTotal = appState.selectedSeats.length * sch.basePrice;
  const insuranceTotal = appState.addons.insurance ? appState.selectedSeats.length * 30 : 0;
  const luggageTotal = appState.addons.extraLuggage * 100;
  const grandTotal = seatTotal + insuranceTotal + luggageTotal;

  document.getElementById('confirmRoute').textContent = `${origin ? origin.name : ''} ➔ ${dest ? dest.name : ''}`;
  document.getElementById('confirmDateTime').textContent = `${appState.filters.date} | ออกเดินทาง ${sch.departureTime} น.`;
  document.getElementById('confirmOperator').textContent = `${sch.operator} (${sch.plateNumber})`;
  document.getElementById('confirmSeats').textContent = `${appState.selectedSeats.join(', ')} (${appState.selectedSeats.length} ที่นั่ง)`;
  document.getElementById('confirmContact').textContent = `${appState.contactInfo.fullname} (${appState.contactInfo.phone})`;
  document.getElementById('confirmPickup').textContent = appState.boardingStation;
  document.getElementById('confirmDropoff').textContent = appState.dropoffStation;

  document.getElementById('confirmPayTotal').textContent = `฿${grandTotal.toLocaleString()}`;
}

function selectPaymentMethod(method, el) {
  appState.paymentMethod = method;
  document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

// Final Submit Booking
function completeBooking() {
  const sch = appState.selectedSchedule;
  const seatTotal = appState.selectedSeats.length * sch.basePrice;
  const insuranceTotal = appState.addons.insurance ? appState.selectedSeats.length * 30 : 0;
  const luggageTotal = appState.addons.extraLuggage * 100;
  const grandTotal = seatTotal + insuranceTotal + luggageTotal;

  const bookingPayload = {
    scheduleId: sch.id,
    travelDate: appState.filters.date,
    passenger: appState.contactInfo,
    seats: appState.selectedSeats,
    passengersList: appState.passengers,
    boardingStation: appState.boardingStation,
    dropoffStation: appState.dropoffStation,
    addons: appState.addons,
    fareBreakdown: {
      seatPrice: seatTotal,
      insuranceFee: insuranceTotal,
      luggageFee: luggageTotal,
      discount: 0,
      total: grandTotal
    },
    paymentMethod: appState.paymentMethod
  };

  const newBooking = window.dataService.createBooking(bookingPayload);
  showToast('ยืนยันการจองและออกบัตรคิวสำเร็จ!', 'success');

  setTimeout(() => {
    window.location.href = `ticket.html?id=${newBooking.bookingId}`;
  }, 800);
}

// --------------------------------------------------------------------------
// BOOKING LOOKUP & QUEUE TRACK MODAL
// --------------------------------------------------------------------------
function openLookupModal() {
  document.getElementById('lookupModal').classList.add('open');
}

function closeLookupModal() {
  document.getElementById('lookupModal').classList.remove('open');
}

function searchExistingBookings() {
  const query = document.getElementById('lookupSearchInput').value.trim();
  const resultsContainer = document.getElementById('lookupResultsContainer');

  if (!query) {
    showToast('กรุณากรอกรหัสการจอง หรือเบอร์โทรศัพท์', 'warning');
    return;
  }

  let matches = [];
  if (query.toUpperCase().startsWith('BUS-') || query.toUpperCase().startsWith('Q-')) {
    const single = window.dataService.getBookingById(query);
    if (single) matches.push(single);
  } else {
    matches = window.dataService.getBookingsByPhone(query);
  }

  if (matches.length === 0) {
    resultsContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <p>ไม่พบข้อมูลการจองสำหรับ "${query}"</p>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = matches.map(b => {
    const sch = window.dataService.getScheduleById(b.scheduleId);
    const origin = sch ? window.dataService.getStationById(sch.originId) : null;
    const dest = sch ? window.dataService.getStationById(sch.destinationId) : null;

    return `
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
        <div>
          <div style="font-weight: 800; color: var(--primary); font-size: 1.05rem;">
            ${b.bookingId} <span style="background: var(--secondary); color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; margin-left: 6px;">คิว ${b.queueNumber}</span>
          </div>
          <div style="font-size: 0.9rem; font-weight: 600; margin-top: 2px;">
            ${origin ? origin.name : 'ต้นทาง'} ➔ ${dest ? dest.name : 'ปลายทาง'}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            ผู้โดยสาร: ${b.passenger.fullname} | ที่นั่ง: ${b.seats.join(', ')} | วันที่: ${b.travelDate}
          </div>
        </div>
        <a href="ticket.html?id=${b.bookingId}" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
          ดูตั๋ว / บัตรคิว ➔
        </a>
      </div>
    `;
  }).join('');
}

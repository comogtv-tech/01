/**
 * SiamBus Operator & Station Master Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

let currentSelectedTripForManifest = 'ALL';

function initAdminDashboard() {
  renderAdminStats();
  renderSchedulesTable();
  populateManifestTripFilter();
  renderPassengerManifest();
  bindAdminEvents();
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

function renderAdminStats() {
  const bookings = window.dataService.getBookings();
  const schedules = window.dataService.getSchedules();

  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.fareBreakdown ? b.fareBreakdown.total : 0), 0);
  const checkedInCount = bookings.filter(b => b.checkinStatus === 'CHECKED_IN').length;
  const activeBuses = schedules.filter(s => s.status !== 'ARRIVED').length;

  document.getElementById('statTotalBookings').textContent = totalBookings.toLocaleString();
  document.getElementById('statTotalRevenue').textContent = `฿${totalRevenue.toLocaleString()}`;
  document.getElementById('statCheckedIn').textContent = `${checkedInCount} / ${totalBookings}`;
  document.getElementById('statActiveBuses').textContent = `${activeBuses} คัน`;
}

function renderSchedulesTable() {
  const container = document.getElementById('schedulesTableBody');
  if (!container) return;

  const schedules = window.dataService.getSchedules();

  container.innerHTML = schedules.map(sch => {
    const origin = window.dataService.getStationById(sch.originId);
    const dest = window.dataService.getStationById(sch.destinationId);
    const busClass = BUS_CLASSES[sch.busClass] || BUS_CLASSES.FIRST32;
    const bookedCount = sch.bookedSeats ? sch.bookedSeats.length : 0;
    const capacity = busClass.seatsCount;

    let statusHtml = '';
    if (sch.status === 'SCHEDULED') {
      statusHtml = '<span class="status-badge status-scheduled">● ตามกำหนดเวลา</span>';
    } else if (sch.status === 'BOARDING') {
      statusHtml = '<span class="status-badge status-boarding">📢 กำลังเรียกขึ้นรถ</span>';
    } else if (sch.status === 'DEPARTED') {
      statusHtml = '<span class="status-badge status-departed">🚍 ออกเดินทางแล้ว</span>';
    } else {
      statusHtml = '<span class="status-badge status-scheduled">🏁 ถึงปลายทางแล้ว</span>';
    }

    return `
      <tr>
        <td>
          <div style="font-weight: 800; color: var(--primary);">${sch.routeNumber}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${sch.id}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${sch.operator}</div>
          <span class="bus-badge badge-${busClass.badgeColor}" style="font-size: 0.72rem; padding: 2px 6px;">${busClass.name}</span>
        </td>
        <td>
          <div style="font-weight: 700;">${origin ? origin.code : ''} ➔ ${dest ? dest.code : ''}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${origin ? origin.name : ''}</div>
        </td>
        <td>
          <div style="font-weight: 800; color: var(--text-main); font-size: 1rem;">${sch.departureTime} น.</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${sch.platform} (${sch.gate})</div>
        </td>
        <td>
          <div style="font-weight: 700;">${bookedCount} / ${capacity}</div>
          <div style="background: #e2e8f0; border-radius: 99px; height: 6px; width: 60px; overflow: hidden; margin-top: 4px;">
            <div style="background: var(--primary); width: ${Math.round((bookedCount / capacity) * 100)}%; height: 100%;"></div>
          </div>
        </td>
        <td>
          <div style="font-weight: 800; color: var(--secondary);">฿${sch.basePrice.toLocaleString()}</div>
        </td>
        <td>${statusHtml}</td>
        <td>
          <div style="display: flex; gap: 4px;">
            <select class="form-select" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; width: auto;" onchange="changeScheduleStatus('${sch.id}', this.value)">
              <option value="SCHEDULED" ${sch.status === 'SCHEDULED' ? 'selected' : ''}>รอออก</option>
              <option value="BOARDING" ${sch.status === 'BOARDING' ? 'selected' : ''}>เรียกขึ้นรถ</option>
              <option value="DEPARTED" ${sch.status === 'DEPARTED' ? 'selected' : ''}>ออกรถ</option>
              <option value="ARRIVED" ${sch.status === 'ARRIVED' ? 'selected' : ''}>ถึงปลายทาง</option>
            </select>
            <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteScheduleTrip('${sch.id}')" title="ลบรอบรถ">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function changeScheduleStatus(schId, newStatus) {
  window.dataService.updateScheduleStatus(schId, newStatus);
  renderSchedulesTable();
  renderAdminStats();
  showToast(`อัปเดตสถานะรอบรถเป็น ${newStatus} สำเร็จ`, 'success');
}

function deleteScheduleTrip(schId) {
  if (confirm(`ยืนยันการลบรอบรถ ${schId} หรือไม่?`)) {
    window.dataService.deleteSchedule(schId);
    renderSchedulesTable();
    populateManifestTripFilter();
    renderPassengerManifest();
    renderAdminStats();
    showToast('ลบรอบรถเรียบร้อยแล้ว', 'info');
  }
}

function populateManifestTripFilter() {
  const filterSelect = document.getElementById('manifestTripFilter');
  if (!filterSelect) return;

  const schedules = window.dataService.getSchedules();
  filterSelect.innerHTML = '<option value="ALL">ดูทุกเที่ยวรถ (All Trips)</option>';

  schedules.forEach(sch => {
    const origin = window.dataService.getStationById(sch.originId);
    const dest = window.dataService.getStationById(sch.destinationId);
    const opt = new Option(`${sch.routeNumber} (${sch.departureTime} น.) ${origin ? origin.code : ''}-${dest ? dest.code : ''}`, sch.id);
    filterSelect.add(opt);
  });
}

function renderPassengerManifest() {
  const container = document.getElementById('manifestTableBody');
  if (!container) return;

  const filterTrip = document.getElementById('manifestTripFilter') ? document.getElementById('manifestTripFilter').value : 'ALL';
  const searchKeyword = document.getElementById('manifestSearchInput') ? document.getElementById('manifestSearchInput').value.trim().toLowerCase() : '';

  let bookings = window.dataService.getBookings();

  if (filterTrip !== 'ALL') {
    bookings = bookings.filter(b => b.scheduleId === filterTrip);
  }

  if (searchKeyword) {
    bookings = bookings.filter(b => 
      b.bookingId.toLowerCase().includes(searchKeyword) ||
      b.queueNumber.toLowerCase().includes(searchKeyword) ||
      b.passenger.fullname.toLowerCase().includes(searchKeyword) ||
      b.passenger.phone.includes(searchKeyword)
    );
  }

  if (bookings.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          ไม่พบรายการผู้โดยสารตามเงื่อนไขที่เลือก
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = bookings.map(b => {
    const sch = window.dataService.getScheduleById(b.scheduleId);
    const isCheckedIn = b.checkinStatus === 'CHECKED_IN';

    return `
      <tr style="${isCheckedIn ? 'background: #f0fdf4;' : ''}">
        <td>
          <span style="font-weight: 800; color: white; background: var(--secondary); padding: 4px 8px; border-radius: 6px; font-size: 0.85rem;">
            ${b.queueNumber}
          </span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--primary);">${b.bookingId}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${b.travelDate}</div>
        </td>
        <td>
          <div style="font-weight: 700;">${b.passenger.fullname}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${b.passenger.phone}</div>
        </td>
        <td>
          <span style="font-weight: 800; background: var(--primary-subtle); color: var(--primary); padding: 2px 8px; border-radius: 4px;">
            ${b.seats.join(', ')}
          </span>
        </td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 600;">${sch ? sch.routeNumber : '-'} (${sch ? sch.departureTime : '-'})</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${b.boardingStation}</div>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--secondary);">฿${b.fareBreakdown ? b.fareBreakdown.total.toLocaleString() : 0}</div>
          <div style="font-size: 0.75rem; color: var(--success);">ชำระแล้ว</div>
        </td>
        <td>
          ${isCheckedIn 
            ? '<span class="status-badge status-departed">✅ เช็คอินแล้ว</span>' 
            : '<span class="status-badge status-boarding">⏳ รอเช็คอิน</span>'
          }
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button 
              class="btn ${isCheckedIn ? 'btn-secondary' : 'btn-success'}" 
              style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" 
              onclick="toggleCheckinStatus('${b.bookingId}', '${isCheckedIn ? 'WAITING' : 'CHECKED_IN'}')">
              ${isCheckedIn ? 'ยกเลิกเช็คอิน' : '✓ ตรวจตั๋ว/เช็คอิน'}
            </button>
            <button 
              class="btn btn-primary" 
              style="padding: 0.35rem 0.65rem; font-size: 0.8rem;" 
              onclick="callQueueAnnouncement('${b.queueNumber}', '${b.passenger.fullname}', '${sch ? sch.platform : ''}')"
              title="กดเรียกคิวผู้โดยสาร">
              📢 เรียกคิว
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleCheckinStatus(bookingId, newStatus) {
  window.dataService.updateBookingCheckin(bookingId, newStatus);
  renderPassengerManifest();
  renderAdminStats();
  showToast(`อัปเดตสถานะเช็คอินของ ${bookingId} เรียบร้อย`, 'success');
}

// Queue Call Announcement Simulator (Audio & Banner)
function callQueueAnnouncement(queueNo, passengerName, platform) {
  const banner = document.getElementById('queueLiveAnnouncementBanner');
  if (banner) {
    banner.style.display = 'block';
    document.getElementById('announcedQueueNo').textContent = queueNo;
    document.getElementById('announcedPassengerName').textContent = passengerName;
    document.getElementById('announcedPlatform').textContent = platform || 'ชานชาลา';
  }

  // Web Speech API / Announcement Voice Simulation
  if ('speechSynthesis' in window) {
    const text = `ขอเชิญผู้โดยสาร หมายเลขคิว ${queueNo} คุณ ${passengerName} กรุณาติดต่อที่ ${platform || 'ชานชาลา'}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  showToast(`📢 กำลังประกาศเรียกคิว ${queueNo} (${passengerName})`, 'warning');
}

function dismissQueueAnnouncement() {
  const banner = document.getElementById('queueLiveAnnouncementBanner');
  if (banner) banner.style.display = 'none';
}

function bindAdminEvents() {
  const tripFilter = document.getElementById('manifestTripFilter');
  if (tripFilter) {
    tripFilter.addEventListener('change', () => renderPassengerManifest());
  }

  const searchInput = document.getElementById('manifestSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderPassengerManifest());
  }

  // Populate stations in Add Schedule modal
  const modalOrigin = document.getElementById('newTripOrigin');
  const modalDest = document.getElementById('newTripDest');
  if (modalOrigin && modalDest) {
    const stations = window.dataService.getStations();
    stations.forEach(st => {
      modalOrigin.add(new Option(`${st.name} [${st.code}]`, st.id));
      modalDest.add(new Option(`${st.name} [${st.code}]`, st.id));
    });
    modalOrigin.value = 'BKK_MOH';
    modalDest.value = 'CNX_ARC';
  }
}

// Open / Close Add Schedule Modal
function openAddScheduleModal() {
  document.getElementById('addScheduleModal').classList.add('open');
}

function closeAddScheduleModal() {
  document.getElementById('addScheduleModal').classList.remove('open');
}

function submitNewScheduleForm(e) {
  e.preventDefault();

  const routeNumber = document.getElementById('newTripRoute').value.trim();
  const operator = document.getElementById('newTripOperator').value.trim();
  const busClass = document.getElementById('newTripBusClass').value;
  const plateNumber = document.getElementById('newTripPlate').value.trim();
  const originId = document.getElementById('newTripOrigin').value;
  const destinationId = document.getElementById('newTripDest').value;
  const departureTime = document.getElementById('newTripDepTime').value;
  const arrivalTime = document.getElementById('newTripArrTime').value;
  const duration = document.getElementById('newTripDuration').value.trim() || '8 ชม. 00 นาที';
  const platform = document.getElementById('newTripPlatform').value.trim() || 'ชานชาลา 01';
  const gate = document.getElementById('newTripGate').value.trim() || 'Gate 1';
  const basePrice = Number(document.getElementById('newTripPrice').value) || 500;

  if (originId === destinationId) {
    showToast('สถานีต้นทางและปลายทางต้องไม่เป็นที่เดียวกัน', 'error');
    return;
  }

  window.dataService.addSchedule({
    routeNumber,
    operator,
    busClass,
    plateNumber,
    originId,
    destinationId,
    departureTime,
    arrivalTime,
    duration,
    platform,
    gate,
    basePrice
  });

  closeAddScheduleModal();
  renderSchedulesTable();
  populateManifestTripFilter();
  renderAdminStats();
  showToast('เพิ่มรอบรถใหม่สำเร็จแล้ว!', 'success');
}

// QR Code Scanner Simulation
function openScannerModal() {
  document.getElementById('scannerModal').classList.add('open');
}

function closeScannerModal() {
  document.getElementById('scannerModal').classList.remove('open');
}

function simulateScanQrCode() {
  const bookings = window.dataService.getBookings();
  const waitingBookings = bookings.filter(b => b.checkinStatus !== 'CHECKED_IN');
  const target = waitingBookings.length > 0 ? waitingBookings[0] : bookings[0];

  if (!target) {
    showToast('ไม่มีข้อมูลตั๋วในระบบ', 'error');
    return;
  }

  window.dataService.updateBookingCheckin(target.bookingId, 'CHECKED_IN');
  closeScannerModal();
  renderPassengerManifest();
  renderAdminStats();
  showToast(`🎯 สแกนสำเร็จ! บัตรคิว ${target.queueNumber} (${target.passenger.fullname}) เช็คอินแล้ว`, 'success');
}

function resetAllDataToDefault() {
  if (confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับสู่ค่าเริ่มต้นเพื่อสาธิตระบบใหม่หรือไม่?')) {
    window.dataService.resetToDefaults();
    initAdminDashboard();
    showToast('รีเซ็ตฐานข้อมูลเรียบร้อยแล้ว', 'info');
  }
}

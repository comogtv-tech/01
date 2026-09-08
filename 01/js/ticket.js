/**
 * SiamBus Digital E-Ticket & Queue Boarding Pass Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  initTicketPage();
});

let countdownInterval = null;

function initTicketPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('id');

  if (!bookingId) {
    showNoTicketState();
    return;
  }

  const booking = window.dataService.getBookingById(bookingId);
  if (!booking) {
    showNoTicketState();
    return;
  }

  renderTicketDetails(booking);
  drawQRCode(booking.bookingId, booking.queueNumber);
  startDepartureCountdown(booking);
}

function showNoTicketState() {
  const container = document.getElementById('ticketMainContainer');
  if (container) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 4rem 2rem; max-width: 600px; margin: 3rem auto;">
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">🎫❌</div>
        <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">ไม่พบข้อมูลตั๋วเดินทาง</h2>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">รหัสการจองไม่ถูกต้อง หรือยังไม่ได้ทำการจอง</p>
        <a href="index.html" class="btn btn-primary">กลับสู่หน้าค้นหาและจองรอบรถ</a>
      </div>
    `;
  }
}

function renderTicketDetails(booking) {
  const sch = window.dataService.getScheduleById(booking.scheduleId) || {
    routeNumber: '91-VIP',
    operator: 'สยามเอ็กซ์เพรส พรีเมียม (SiamExpress)',
    busClass: 'VIP24',
    plateNumber: '15-4421 กทม.',
    departureTime: '08:30',
    arrivalTime: '17:45',
    duration: '9 ชม. 15 นาที',
    platform: 'ชานชาลา 14',
    gate: 'Gate 3',
    status: 'SCHEDULED'
  };

  const origin = window.dataService.getStationById(sch.originId) || { name: 'กรุงเทพฯ (หมอชิต 2)' };
  const dest = window.dataService.getStationById(sch.destinationId) || { name: 'เชียงใหม่ (อาเขต 3)' };
  const busClass = BUS_CLASSES[sch.busClass] || BUS_CLASSES.VIP24;

  // Text contents
  document.getElementById('ticketBookingId').textContent = booking.bookingId;
  document.getElementById('ticketQueueNum').textContent = booking.queueNumber;
  document.getElementById('ticketOperator').textContent = sch.operator;
  document.getElementById('ticketRouteNumber').textContent = `สาย ${sch.routeNumber}`;
  document.getElementById('ticketBusClass').textContent = busClass.name;
  document.getElementById('ticketPlateNumber').textContent = sch.plateNumber;

  document.getElementById('ticketOriginName').textContent = origin.name;
  document.getElementById('ticketDestName').textContent = dest.name;
  document.getElementById('ticketDepTime').textContent = `${sch.departureTime} น.`;
  document.getElementById('ticketArrTime').textContent = `${sch.arrivalTime} น.`;
  document.getElementById('ticketDuration').textContent = sch.duration;

  document.getElementById('ticketTravelDate').textContent = booking.travelDate;
  document.getElementById('ticketSeats').textContent = booking.seats.join(', ');
  document.getElementById('ticketPlatformGate').textContent = `${sch.platform} (${sch.gate})`;
  document.getElementById('ticketPassengerName').textContent = booking.passenger.fullname;
  document.getElementById('ticketPassengerPhone').textContent = booking.passenger.phone;

  document.getElementById('ticketPickupLocation').textContent = booking.boardingStation || origin.name;
  document.getElementById('ticketDropoffLocation').textContent = booking.dropoffStation || dest.name;

  document.getElementById('ticketTotalFare').textContent = `฿${booking.fareBreakdown.total.toLocaleString()}`;
  document.getElementById('ticketPaymentStatus').textContent = `${booking.paymentMethod} (ชำระแล้ว)`;

  // Check-in status badge
  const checkinBadge = document.getElementById('ticketCheckinBadge');
  if (booking.checkinStatus === 'CHECKED_IN') {
    checkinBadge.innerHTML = '✅ เช็คอินแล้ว (Checked-in)';
    checkinBadge.style.background = '#dcfce7';
    checkinBadge.style.color = '#15803d';
  } else {
    checkinBadge.innerHTML = '⏳ รอเรียกคิว (Waiting)';
    checkinBadge.style.background = '#fff7ed';
    checkinBadge.style.color = '#c2410c';
  }
}

// Generate realistic 2D Matrix QR Code on Canvas
function drawQRCode(bookingId, queueNumber) {
  const canvas = document.getElementById('qrCodeCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // QR Pattern Simulator (Consistent seeded matrix based on booking ID)
  const modules = 21;
  const cellSize = Math.floor(size / modules);
  const offset = Math.floor((size - (modules * cellSize)) / 2);

  ctx.fillStyle = '#0f172a';

  // Seeded pseudo-random generator based on ID
  let seed = 0;
  const str = `${bookingId}_${queueNumber}`;
  for (let i = 0; i < str.length; i++) {
    seed = (seed * 31 + str.charCodeAt(i)) & 0xffffffff;
  }

  function random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  // Draw 3 Corner finder patterns
  function drawFinderPattern(x, y) {
    // Outer 7x7 box
    ctx.fillRect(offset + x * cellSize, offset + y * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(offset + (x + 1) * cellSize, offset + (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(offset + (x + 2) * cellSize, offset + (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(modules - 7, 0);
  drawFinderPattern(0, modules - 7);

  // Fill internal matrix data
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      // Skip finder zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= modules - 8;
      const inBottomLeft = r >= modules - 8 && c < 8;

      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        if (random() > 0.45) {
          ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  // Center brand icon or logo dot
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, cellSize * 1.5, 0, Math.PI * 2);
  ctx.fill();
}

// Live Countdown Timer
function startDepartureCountdown(booking) {
  if (countdownInterval) clearInterval(countdownInterval);

  const sch = window.dataService.getScheduleById(booking.scheduleId);
  if (!sch) return;

  const [hours, minutes] = sch.departureTime.split(':').map(Number);
  const depDate = new Date(booking.travelDate);
  depDate.setHours(hours, minutes, 0, 0);

  function updateTimer() {
    const now = new Date();
    const diffMs = depDate - now;

    const timerEl = document.getElementById('departureCountdownTimer');
    const statusNote = document.getElementById('departureStatusNote');
    if (!timerEl) return;

    if (diffMs <= 0) {
      timerEl.textContent = '00:00:00';
      if (statusNote) statusNote.textContent = '🚌 ถึงเวลาออกเดินทาง หรือรถกำลังเดินทาง';
      return;
    }

    const diffSec = Math.floor(diffMs / 1000);
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;

    timerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    if (h < 1 && m <= 30) {
      if (statusNote) {
        statusNote.innerHTML = '<strong style="color: var(--secondary);">🔔 ใกล้ถึงเวลาออกรถ! กรุณาเตรียมตัวที่ชานชาลา</strong>';
      }
    }
  }

  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);
}

function printTicket() {
  window.print();
}

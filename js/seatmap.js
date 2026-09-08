/**
 * SiamBus Interactive Seat Map Generator & Manager
 */

class SeatMapManager {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('seatMapContainer');
    this.schedule = null;
    this.selectedSeats = [];
    this.maxSeats = options.maxSeats || 5;
    this.currentDeck = 'UPPER'; // For double-decker
    this.onSeatSelectionChange = options.onSeatSelectionChange || null;
  }

  init(schedule, preSelectedSeats = []) {
    this.schedule = schedule;
    this.selectedSeats = [...preSelectedSeats];
    this.currentDeck = schedule.busClass === 'DOUBLE_DECK' ? 'UPPER' : 'MAIN';
    this.render();
  }

  setSchedule(schedule) {
    this.schedule = schedule;
    this.selectedSeats = [];
    this.currentDeck = schedule.busClass === 'DOUBLE_DECK' ? 'UPPER' : 'MAIN';
    this.render();
  }

  toggleSeat(seatId) {
    if (this.isSeatBooked(seatId)) return;

    const index = this.selectedSeats.indexOf(seatId);
    if (index > -1) {
      this.selectedSeats.splice(index, 1);
    } else {
      if (this.selectedSeats.length >= this.maxSeats) {
        if (window.showToast) {
          window.showToast(`สามารถเลือกที่นั่งได้สูงสุด ${this.maxSeats} ที่นั่งต่อ 1 การจอง`, 'warning');
        }
        return;
      }
      this.selectedSeats.push(seatId);
    }

    this.updateSeatElements();
    if (this.onSeatSelectionChange) {
      this.onSeatSelectionChange(this.selectedSeats);
    }
  }

  isSeatBooked(seatId) {
    if (!this.schedule || !this.schedule.bookedSeats) return false;
    return this.schedule.bookedSeats.includes(seatId);
  }

  render() {
    if (!this.container || !this.schedule) return;

    const busConfig = BUS_CLASSES[this.schedule.busClass] || BUS_CLASSES.FIRST32;
    const isDoubleDeck = busConfig.decks === 2;

    let html = `
      <div class="seatmap-container">
    `;

    // Deck Switcher for Double Decker buses
    if (isDoubleDeck) {
      html += `
        <div class="deck-switcher">
          <button type="button" class="deck-btn ${this.currentDeck === 'UPPER' ? 'active' : ''}" onclick="seatMap.switchDeck('UPPER')">
            ชั้นบน (Upper Deck)
          </button>
          <button type="button" class="deck-btn ${this.currentDeck === 'LOWER' ? 'active' : ''}" onclick="seatMap.switchDeck('LOWER')">
            ชั้นล่าง (Lower Deck)
          </button>
        </div>
      `;
    }

    html += `
      <div class="bus-chassis">
        <div class="bus-windshield"></div>
        
        <div class="bus-front-cabin">
          <div class="driver-seat-box">
            <div class="driver-steering"></div>
            <span class="driver-label">คนขับ</span>
          </div>
          <div class="bus-door">
            🚪 ประตูหน้า
          </div>
        </div>

        <div class="bus-seats-grid">
    `;

    // Render Rows based on bus class
    if (isDoubleDeck) {
      if (this.currentDeck === 'UPPER') {
        html += this.renderDoubleDeckUpper(busConfig.upperRows || 8);
      } else {
        html += this.renderDoubleDeckLower(busConfig.lowerRows || 3);
      }
    } else if (busConfig.layout === '1-2') {
      // VIP 24 (Single on Left, Double on Right)
      html += this.renderVip12Layout(busConfig.rows || 8);
    } else {
      // Standard 2-2 layout
      html += this.renderStandard22Layout(busConfig.rows || 8);
    }

    html += `
        </div>
      </div>

      <!-- Seat Legend -->
      <div class="seat-legend">
        <div class="legend-item">
          <div class="legend-sample available"></div>
          <span>ว่าง</span>
        </div>
        <div class="legend-item">
          <div class="legend-sample selected"></div>
          <span>กำลังเลือก</span>
        </div>
        <div class="legend-item">
          <div class="legend-sample booked"></div>
          <span>จองแล้ว</span>
        </div>
        <div class="legend-item">
          <div class="legend-sample female"></div>
          <span>ที่นั่งสุภาพสตรี</span>
        </div>
      </div>
    </div>
    `;

    this.container.innerHTML = html;
  }

  renderVip12Layout(rows) {
    let rowsHtml = '';
    for (let r = 1; r <= rows; r++) {
      const seatA = `${r}A`;
      const seatB = `${r}B`;
      const seatC = `${r}C`;

      const isFemaleRow = r === 1; // Row 1 reserved for lady / priority

      rowsHtml += `
        <div class="seat-row">
          <div class="seat-group">
            ${this.renderSeatBtn(seatA, isFemaleRow)}
          </div>
          <div class="bus-aisle">ทางเดิน</div>
          <div class="seat-group">
            ${this.renderSeatBtn(seatB, isFemaleRow)}
            ${this.renderSeatBtn(seatC, false)}
          </div>
        </div>
      `;
    }
    // Restroom at back
    rowsHtml += `
      <div class="bus-facility-row">
        <div class="facility-badge">🚻 ห้องน้ำ</div>
        <div class="bus-door">🚪 ประตูฉุกเฉิน</div>
      </div>
    `;
    return rowsHtml;
  }

  renderStandard22Layout(rows) {
    let rowsHtml = '';
    for (let r = 1; r <= rows; r++) {
      const seatA = `${r}A`;
      const seatB = `${r}B`;
      const seatC = `${r}C`;
      const seatD = `${r}D`;

      const isFemaleRow = r === 1;

      rowsHtml += `
        <div class="seat-row">
          <div class="seat-group">
            ${this.renderSeatBtn(seatA, isFemaleRow)}
            ${this.renderSeatBtn(seatB, isFemaleRow)}
          </div>
          <div class="bus-aisle">ทางเดิน</div>
          <div class="seat-group">
            ${this.renderSeatBtn(seatC, false)}
            ${this.renderSeatBtn(seatD, false)}
          </div>
        </div>
      `;
    }
    // Restroom at back
    rowsHtml += `
      <div class="bus-facility-row">
        <div class="facility-badge">🚻 ห้องน้ำ</div>
        <div class="bus-door">🚪 ประตูฉุกเฉิน</div>
      </div>
    `;
    return rowsHtml;
  }

  renderDoubleDeckUpper(rows) {
    let rowsHtml = '';
    for (let r = 1; r <= rows; r++) {
      const seatA = `U${r}A`;
      const seatB = `U${r}B`;
      const seatC = `U${r}C`;
      const seatD = `U${r}D`;

      rowsHtml += `
        <div class="seat-row">
          <div class="seat-group">
            ${this.renderSeatBtn(seatA, false)}
            ${this.renderSeatBtn(seatB, false)}
          </div>
          <div class="bus-aisle">ทางเดิน</div>
          <div class="seat-group">
            ${this.renderSeatBtn(seatC, false)}
            ${this.renderSeatBtn(seatD, false)}
          </div>
        </div>
      `;
    }
    rowsHtml += `
      <div class="bus-facility-row">
        <div class="facility-badge">🪜 บันไดลงชั้นล่าง</div>
      </div>
    `;
    return rowsHtml;
  }

  renderDoubleDeckLower(rows) {
    let rowsHtml = `
      <div class="bus-facility-row">
        <div class="facility-badge">🪜 ทางขึ้นชั้นบน</div>
        <div class="facility-badge">🚻 ห้องน้ำ</div>
      </div>
    `;
    for (let r = 1; r <= rows; r++) {
      const seatA = `L${r}A`;
      const seatB = `L${r}B`;

      rowsHtml += `
        <div class="seat-row" style="justify-content: flex-end;">
          <div class="bus-aisle">โซฟา VIP ล่าง</div>
          <div class="seat-group">
            ${this.renderSeatBtn(seatA, false)}
            ${this.renderSeatBtn(seatB, false)}
          </div>
        </div>
      `;
    }
    return rowsHtml;
  }

  renderSeatBtn(seatId, isFemale) {
    const isBooked = this.isSeatBooked(seatId);
    const isSelected = this.selectedSeats.includes(seatId);

    let classes = ['seat-btn'];
    if (isBooked) classes.push('booked');
    if (isSelected) classes.push('selected');
    if (isFemale && !isBooked && !isSelected) classes.push('female-priority');

    return `
      <button 
        type="button" 
        class="${classes.join(' ')}" 
        data-seat="${seatId}"
        ${isBooked ? 'disabled' : ''}
        onclick="seatMap.toggleSeat('${seatId}')"
        title="ที่นั่ง ${seatId} ${isBooked ? '(จองแล้ว)' : '(ว่าง)'}">
        <span class="seat-number">${seatId}</span>
        <span class="seat-type-dot"></span>
      </button>
    `;
  }

  updateSeatElements() {
    if (!this.container) return;
    const buttons = this.container.querySelectorAll('.seat-btn');
    buttons.forEach(btn => {
      const seatId = btn.getAttribute('data-seat');
      if (this.selectedSeats.includes(seatId)) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  switchDeck(deck) {
    this.currentDeck = deck;
    this.render();
  }

  getSelectedSeats() {
    return this.selectedSeats;
  }

  clearSelection() {
    this.selectedSeats = [];
    this.updateSeatElements();
    if (this.onSeatSelectionChange) {
      this.onSeatSelectionChange([]);
    }
  }
}

// Global instance
window.seatMap = new SeatMapManager();

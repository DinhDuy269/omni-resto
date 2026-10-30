/**
 * 1-Euro Filter: Bộ lọc làm mượt chuyển động chuẩn quốc tế cho HCI (Human-Computer Interaction).
 * - Triệt tiêu rung tay sinh lý (micro-tremors) khi đứng yên hoặc di chuyển chậm (độ ổn định tuyệt đối).
 * - Tự động mở rộng dải tần (cutoff frequency) khi di chuyển nhanh, giúp con trỏ bay theo tay với độ trễ gần như = 0.
 */
class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.y = alpha * value + (1.0 - alpha) * (this.s ?? value);
    this.s = this.y;
    return this.y;
  }

  hasLastRawValue(): boolean {
    return this.y !== null;
  }

  lastRawValue(): number {
    return this.y ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;

  /**
   * @param minCutoff Tần số cắt tối thiểu (Hz). Giá trị 2.5 - 3.0 giúp con trỏ nhạy tức thì mà vẫn khử rung tốt.
   * @param beta Hệ số đáp ứng tốc độ. Giá trị 0.2 - 0.3 giúp mở rộng tần số ngay khi vung tay, bù trừ độ trễ.
   * @param dCutoff Tần số cắt của đạo hàm vận tốc (Hz) (khuyên dùng: 1.0).
   */
  constructor(minCutoff = 2.8, beta = 0.22, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(value: number, timestamp: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      return this.xFilter.filter(value, 1.0);
    }

    // Thời gian delta tính bằng giây (tối thiểu 1ms để tránh chia cho 0)
    const dt = Math.max((timestamp - this.lastTime) / 1000.0, 0.001);
    this.lastTime = timestamp;

    // Ước lượng vận tốc di chuyển dx
    const prevRaw = this.xFilter.lastRawValue();
    const dx = (value - prevRaw) / dt;
    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));

    // Tính tần số cắt biến thiên theo tốc độ
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, this.alpha(cutoff, dt));
  }

  getVelocity(): number {
    return this.dxFilter.lastRawValue();
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

/**
 * Bộ lọc 2D kết hợp cho tọa độ (X, Y)
 */
export class OneEuroFilter2D {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;

  constructor(minCutoff = 2.8, beta = 0.22, dCutoff = 1.0) {
    this.filterX = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.filterY = new OneEuroFilter(minCutoff, beta, dCutoff);
  }

  filter(x: number, y: number, timestamp: number): { x: number; y: number } {
    return {
      x: this.filterX.filter(x, timestamp),
      y: this.filterY.filter(y, timestamp),
    };
  }

  getVelocity(): { vx: number; vy: number } {
    return {
      vx: this.filterX.getVelocity(),
      vy: this.filterY.getVelocity(),
    };
  }

  reset(): void {
    this.filterX.reset();
    this.filterY.reset();
  }
}

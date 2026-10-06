const names = ['gacha_open', 'gacha_tick', 'gacha_win'] as const;
export type GachaSound = typeof names[number];

export class GachaAudio {
  private context?: AudioContext;
  private gain?: GainNode;
  private buffers = new Map<GachaSound, AudioBuffer>();
  private requests = new Map<GachaSound, Promise<ArrayBuffer>>();
  private decoding = new Map<GachaSound, Promise<void>>();
  private sources = new Set<AudioBufferSourceNode>();
  private legacyRoute?: HTMLAudioElement;
  private muted = false;
  private disposed = false;
  private activated = false;
  private base: string;

  // Biến dùng để lưu giữ tiếng "tick" hiện tại, giúp ngắt nó đi ngay khi có tiếng "tick" mới
  private currentTickSource?: AudioBufferSourceNode;

  constructor(base: string = '/sounds') {
    this.base = base;
  }

  preload() {
    try { this.prepareContext(); } catch {}
    for (const name of names) {
      void (this.context ? this.decode(name) : this.fetchSound(name)).catch(() => {});
    }
  }

  private prepareContext() {
    if (this.context) return;
    const Constructor = window.AudioContext || (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!Constructor) return;
    
    this.context = new Constructor();
    this.gain = this.context.createGain(); 
    this.gain.gain.value = 0.65;
    this.gain.connect(this.context.destination);
  }

  recover() { 
    if (this.activated && this.context && !this.muted) this.unlock(); 
  }

  private fetchSound(name: GachaSound) {
    let request = this.requests.get(name);
    if (!request) {
      request = fetch(`${this.base}/${name}.mp3`).then(r => { 
        if (!r.ok) throw new Error(`SFX ${r.status}`); 
        return r.arrayBuffer(); 
      });
      this.requests.set(name, request);
      void request.catch(() => this.requests.delete(name));
    }
    return request;
  }

  private decode(name: GachaSound) {
    const context = this.context;
    if (!context || this.buffers.has(name)) return Promise.resolve();
    
    let pending = this.decoding.get(name);
    if (!pending) {
      pending = this.fetchSound(name)
        .then(data => context.decodeAudioData(data.slice(0)))
        .then(buffer => { if (!this.disposed) this.buffers.set(name, buffer); });
      this.decoding.set(name, pending);
      void pending.finally(() => this.decoding.delete(name)).catch(() => {});
    }
    return pending;
  }

  unlock() {
    if (this.disposed || this.muted) return;
    this.activated = true;
    try {
      this.prepareContext();
      if (!this.context) return;
      
      // Chủ động đánh thức AudioContext
      if (this.context.state === 'suspended') {
        void this.context.resume().catch(() => {});
      }
      
      const session = (navigator as Navigator & {audioSession?: {type: string}}).audioSession;
      if (session) session.type = 'playback';
      
      if (!session && /iP(hone|ad|od)/.test(navigator.userAgent)) {
        this.legacyRoute ??= new Audio(`${this.base}/silence.mp3`);
        this.legacyRoute.loop = true;
        void this.legacyRoute.play().catch(() => {});
      }
      
      const pulse = this.context.createBufferSource();
      pulse.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
      pulse.connect(this.gain!); 
      pulse.onended = () => pulse.disconnect(); 
      pulse.start();
      
      for (const name of names) void this.decode(name).catch(() => {});
    } catch {}
  }

  play(name: GachaSound) {
    if (this.disposed || this.muted || !this.context) return;
    
    // Đảm bảo AudioContext đang chạy
    if (this.context.state === 'suspended') {
        this.context.resume().catch(() => {});
    }

    const buffer = this.buffers.get(name);
    if (!buffer) {
      // Nếu file chưa load kịp, thử lại sau 100ms thay vì hủy bỏ hoàn toàn
      setTimeout(() => {
        if (this.buffers.has(name)) this.play(name);
      }, 100);
      return;
    }
    
    const source = this.context.createBufferSource(); 
    source.buffer = buffer; 
    source.connect(this.gain!);
    
    // --- XỬ LÝ RIÊNG CHO TIẾNG TICK ĐỂ KHÔNG BỊ ĐÈ ---
    if (name === 'gacha_tick') {
        if (this.currentTickSource) {
            try { 
                this.currentTickSource.stop(); // Cắt ngay lập tức file 1s cũ
                this.currentTickSource.disconnect();
            } catch {}
        }
        this.currentTickSource = source;
    }
    // ------------------------------------------------

    this.sources.add(source);
    source.onended = () => { 
        source.disconnect(); 
        this.sources.delete(source); 
        // Dọn dẹp biến tick nếu nó đã phát xong tự nhiên
        if (name === 'gacha_tick' && this.currentTickSource === source) {
            this.currentTickSource = undefined;
        }
    };
    source.start();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.gain) this.gain.gain.value = muted ? 0 : 0.65;
    if (muted) this.pause(); else this.unlock();
  }

  pause() {
    for (const source of this.sources) { 
      try { source.stop(); } catch {} 
      source.disconnect(); 
    }
    this.sources.clear(); 
    this.currentTickSource = undefined;
    this.legacyRoute?.pause();
  }

  dispose() { 
    this.disposed = true; 
    this.pause(); 
    void this.context?.close().catch(() => {}); 
  }
}
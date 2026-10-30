// Web Audio Synthesizer cho Spatial Hands-Free Menu
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playSpatialSound(type: 'whoosh' | 'grab' | 'confirm' | 'category' | 'tick' | 'brake') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'tick') {
      // Âm thanh 'tick' nhẹ nhàng khi cuộn từng món theo nhịp mắt nhìn (Wooden haptic click)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'brake') {
      // Âm thanh 'phanh dừng' êm ái khi xòe bàn tay Open_Palm (Soft high harmonic pause)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'whoosh') {
      // Âm thanh vút gió khi chuyển món (Sine sweep 180Hz -> 360Hz -> 90Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'grab') {
      // Âm thanh "Ting" tinh thể khi nhặt món vào giỏ (Hòa âm 880Hz + 1320Hz + 1760Hz)
      [880, 1320, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);

        const startTime = now + idx * 0.03;
        gain.gain.setValueAtTime(0.12 / (idx + 1), startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([25, 40, 25]);
      }
    } else if (type === 'confirm') {
      // Hợp âm vang lên khi giơ ngón cái Thumb Up (Chord: Do - Mi - Sol)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.08, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.start(now + idx * 0.04);
        osc.stop(now + 0.5);
      });

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 80]);
      }
    } else if (type === 'category') {
      // Âm thanh đổi danh mục (Chữ V)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch {
    // Không chặn luồng nếu audio bị hạn chế bởi trình duyệt
  }
}

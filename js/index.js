// ===== INTRO ANIMATION + WEB AUDIO =====
(function () {
    const overlay    = document.getElementById('intro-overlay');
    if (!overlay) return;

    const terminal   = document.getElementById('terminal-phase');
    const glitch     = document.getElementById('glitch-phase');
    const gate       = document.getElementById('gate-phase');
    const doorLeft   = document.getElementById('doorLeft');
    const doorRight  = document.getElementById('doorRight');
    const seamGlow   = document.getElementById('seamGlow');
    const logoReveal = document.getElementById('logoReveal');
    const lines      = ['tl1','tl2','tl3','tl4','tl5','tl6'];

    document.body.classList.add('intro-active');

    // ─────────────────────────────────────────
    //  WEB AUDIO ENGINE
    // ─────────────────────────────────────────
    let ctx = null;
    let ambientNode = null;

    function initAudio() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Master gain helper
    function masterGain(val = 0.7) {
        const g = ctx.createGain();
        g.gain.value = val;
        g.connect(ctx.destination);
        return g;
    }

    // ── UNLOCK THUNK: suara "thud" berat saat klik ──
    function playUnlockThunk() {
        const out = masterGain(0.9);

        // Low boom
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.4);
        env.gain.setValueAtTime(1, ctx.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(env); env.connect(out);
        osc.start(); osc.stop(ctx.currentTime + 0.5);

        // Click transient
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = ctx.createBufferSource();
        const filt = ctx.createBiquadFilter();
        filt.type = 'highpass'; filt.frequency.value = 200;
        src.buffer = buf;
        src.connect(filt); filt.connect(out);
        src.start();
    }

    // ── TERMINAL BEEP: tiap baris muncul ──
    function playTerminalBeep(index) {
        const out = masterGain(0.12);
        const freqs = [880, 1046, 932, 1174, 784, 1318];
        const freq  = freqs[index % freqs.length];

        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0, ctx.currentTime);
        env.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.005);
        env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(env); env.connect(out);
        osc.start(); osc.stop(ctx.currentTime + 0.1);

        // Tiny sub-click
        const osc2 = ctx.createOscillator();
        const env2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 0.5;
        env2.gain.setValueAtTime(0.3, ctx.currentTime);
        env2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc2.connect(env2); env2.connect(out);
        osc2.start(); osc2.stop(ctx.currentTime + 0.06);
    }

    // ── GLITCH BURST: noise static + frekuensi kacau ──
    function playGlitchBurst() {
        const t = ctx.currentTime;

        // White noise burst
        const bufLen  = ctx.sampleRate * 0.5;
        const buf     = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data    = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        const filt  = ctx.createBiquadFilter();
        const env   = ctx.createGain();
        filt.type = 'bandpass'; filt.frequency.value = 2400; filt.Q.value = 0.8;
        env.gain.setValueAtTime(0.6, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        noise.buffer = buf;
        noise.connect(filt); filt.connect(env); env.connect(ctx.destination);
        noise.start();

        // Screech oscillators
        [1800, 2400, 3200].forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(f, t + i * 0.05);
            o.frequency.exponentialRampToValueAtTime(f * 0.3, t + 0.3);
            g.gain.setValueAtTime(0.15, t + i * 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            o.connect(g); g.connect(ctx.destination);
            o.start(t + i * 0.05);
            o.stop(t + 0.4);
        });
    }

    // ── GATE AMBIENT DRONE: muncul saat gerbang muncul ──
    function startGateDrone() {
        const out = masterGain(0);

        // Slow fade in
        out.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.2);

        const freqBase = 55; // A1
        [1, 1.5, 2, 2.67, 3].forEach((mult, i) => {
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.value = freqBase * mult;
            // Slow detune wobble
            osc.detune.setValueAtTime(0, ctx.currentTime);
            osc.detune.linearRampToValueAtTime((i % 2 ? 8 : -8), ctx.currentTime + 2);
            osc.detune.linearRampToValueAtTime(0, ctx.currentTime + 4);
            g.gain.value = 1 / (i + 1);
            osc.connect(g); g.connect(out);
            osc.start();
        });

        ambientNode = out;
        return out;
    }

    // ── GATE CREAK: suara besi berat bergerak ──
    function playGateCreak() {
        const t   = ctx.currentTime;
        const out = masterGain(0.7);

        // Low rumble
        const rumbleBuf  = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const rumbleData = rumbleBuf.getChannelData(0);
        for (let i = 0; i < rumbleData.length; i++)
            rumbleData[i] = (Math.random() * 2 - 1) * Math.sin(i / rumbleData.length * Math.PI);
        const rumble = ctx.createBufferSource();
        const lowFilt = ctx.createBiquadFilter();
        const rumbleEnv = ctx.createGain();
        lowFilt.type = 'lowpass'; lowFilt.frequency.value = 180;
        rumbleEnv.gain.setValueAtTime(0, t);
        rumbleEnv.gain.linearRampToValueAtTime(1, t + 0.1);
        rumbleEnv.gain.setValueAtTime(1, t + 1.4);
        rumbleEnv.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        rumble.buffer = rumbleBuf;
        rumble.connect(lowFilt); lowFilt.connect(rumbleEnv); rumbleEnv.connect(out);
        rumble.start(t);

        // Metal creak tones — pitch slides down kayak pintu besi beneran
        [
            { start: 420, end: 180, startT: 0,    dur: 1.6 },
            { start: 310, end: 140, startT: 0.15, dur: 1.5 },
            { start: 520, end: 200, startT: 0.05, dur: 1.2 },
        ].forEach(({ start, end, startT, dur }) => {
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            const filt = ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(start, t + startT);
            osc.frequency.exponentialRampToValueAtTime(end, t + startT + dur);
            filt.type = 'bandpass'; filt.frequency.value = 600; filt.Q.value = 3;
            env.gain.setValueAtTime(0, t + startT);
            env.gain.linearRampToValueAtTime(0.4, t + startT + 0.05);
            env.gain.exponentialRampToValueAtTime(0.001, t + startT + dur);
            osc.connect(filt); filt.connect(env); env.connect(out);
            osc.start(t + startT);
            osc.stop(t + startT + dur + 0.1);
        });

        // Heavy thud saat pintu mentok
        setTimeout(() => {
            const thudOsc = ctx.createOscillator();
            const thudEnv = ctx.createGain();
            thudOsc.type = 'sine';
            thudOsc.frequency.setValueAtTime(60, ctx.currentTime);
            thudOsc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);
            thudEnv.gain.setValueAtTime(1.2, ctx.currentTime);
            thudEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            thudOsc.connect(thudEnv); thudEnv.connect(ctx.destination);
            thudOsc.start(); thudOsc.stop(ctx.currentTime + 0.4);
        }, 1700); // pas pintu hampir mentok
    }

    // ── LOGO CHORD: ethereal chord naik pas logo reveal ──
    function playLogoChord() {
        const t   = ctx.currentTime;
        const out = masterGain(0);
        out.gain.linearRampToValueAtTime(0.22, t + 1.0);
        out.gain.setValueAtTime(0.22, t + 2.0);
        out.gain.linearRampToValueAtTime(0, t + 3.5);

        // Major 7th chord — A maj7: A C# E G#
        const notes = [110, 138.6, 165, 207.7, 220, 277.2, 330];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            const del = i * 0.12; // stagger masuk satu per satu
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.detune.value = (Math.random() - 0.5) * 4; // slight humanize
            g.gain.setValueAtTime(0, t + del);
            g.gain.linearRampToValueAtTime(0.6 / (i + 1), t + del + 0.3);
            osc.connect(g); g.connect(out);
            osc.start(t + del);
            osc.stop(t + 4);
        });

        // Shimmer layer — high overtones
        [880, 1108, 1320, 1760].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0, t + 0.3 + i * 0.1);
            g.gain.linearRampToValueAtTime(0.04, t + 0.6 + i * 0.1);
            g.gain.linearRampToValueAtTime(0, t + 3.5);
            osc.connect(g); g.connect(out);
            osc.start(t + 0.3 + i * 0.1);
            osc.stop(t + 4);
        });
    }

    // ── FADE OUT AUDIO: semua ambient turun pelan ──
    function fadeOutAudio() {
        if (!ctx) return;
        const t = ctx.currentTime;
        // Fade semua node yang masih aktif via master destination
        const finalGain = ctx.createGain();
        finalGain.gain.setValueAtTime(1, t);
        finalGain.gain.linearRampToValueAtTime(0, t + 1.2);
        finalGain.connect(ctx.destination);
        // Stop context setelah fade
        setTimeout(() => { try { ctx.close(); } catch(e){} }, 1500);
    }

    // ─────────────────────────────────────────
    //  UNLOCK SCREEN
    // ─────────────────────────────────────────
    const unlockScreen = document.createElement('div');
    unlockScreen.id = 'intro-unlock';
    unlockScreen.innerHTML = `
        <div class="unlock-inner">
            <div class="unlock-logo">P:S</div>
            <div class="unlock-text">ELYSSIUM CITY NETWORK</div>
            <div class="unlock-prompt">[ KLIK UNTUK MEMASUKI ]</div>
            <div class="unlock-sub">POST : SCHOOL • FASE 1</div>
        </div>
    `;
    document.body.appendChild(unlockScreen);

    unlockScreen.addEventListener('click', function onUnlock() {
        unlockScreen.removeEventListener('click', onUnlock);

        // Init audio SETELAH user gesture — ini yang penting biar ga keblokir
        initAudio();
        playUnlockThunk();

        // Fade out unlock screen
        unlockScreen.style.opacity = '0';
        unlockScreen.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            unlockScreen.remove();
            runIntro();
        }, 500);
    }, { once: true });

    // ─────────────────────────────────────────
    //  MAIN INTRO SEQUENCE
    // ─────────────────────────────────────────
    function runIntro() {

        // Phase 1: Terminal beep + baris muncul (0s → 2.0s)
        lines.forEach((id, i) => {
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) el.style.animation = 'terminal-appear 0.25s ease forwards';
                playTerminalBeep(i);
            }, 150 + i * 280);
        });

        // Phase 2: Glitch burst (2.0s)
        setTimeout(() => {
            if (terminal) terminal.style.animation = 'rgb-shift 0.5s ease';
            if (glitch) {
                glitch.style.opacity = '1';
                glitch.querySelectorAll('.glitch-bar').forEach((bar, i) => {
                    setTimeout(() => {
                        bar.style.animation = 'glitch-h 0.6s ease forwards';
                    }, i * 50);
                });
            }
            playGlitchBurst();
        }, 2000);

        // Phase 3: Gate muncul + drone start (2.5s)
        setTimeout(() => {
            if (terminal) terminal.style.opacity = '0';
            if (glitch)   glitch.style.opacity   = '0';
            if (gate) {
                gate.style.transition = 'opacity 0.6s ease';
                gate.style.opacity    = '1';
            }
            startGateDrone();
        }, 2500);

        // Phase 4: Gate doors open + creak (3.2s)
        setTimeout(() => {
            if (seamGlow) { seamGlow.style.transition = 'opacity 0.6s'; seamGlow.style.opacity = '0'; }
            if (doorLeft)  doorLeft.classList.add('open');
            if (doorRight) doorRight.classList.add('open');
            playGateCreak();
        }, 3200);

        // Phase 5: Logo reveal + chord (4.0s)
        setTimeout(() => {
            if (logoReveal) logoReveal.classList.add('visible');
            playLogoChord();
        }, 4000);

        // Phase 6: Fade out intro + audio (5.5s)
        setTimeout(() => {
            overlay.classList.add('fade-out');
            fadeOutAudio();
        }, 5500);

        // Phase 7: Remove DOM (6.5s)
        setTimeout(() => {
            overlay.remove();
            document.body.classList.remove('intro-active');
        }, 6500);
    }

})();

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', function () {

    // ===== MOBILE MENU TOGGLE =====
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileBtn.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking a link
    document.querySelectorAll('.mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            mobileBtn.classList.remove('active');
        });
    });

    // ===== ACTIVE NAV LINK ON SCROLL =====
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        const scrollY = window.scrollY + 120;

        sections.forEach(section => {
            if (scrollY >= section.offsetTop && scrollY < section.offsetTop + section.clientHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.substring(1) === current) {
                link.classList.add('active');
            }
        });
    });

    // ===== COPY ID CARD TEMPLATE =====
    const copyBtn = document.getElementById('copyTemplate');
    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            const template = document.getElementById('idcardTemplate');
            if (!template) return;

            // Modern clipboard API with fallback
            const text = template.value.trim();
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    showCopySuccess(copyBtn);
                }).catch(() => {
                    fallbackCopy(text, copyBtn);
                });
            } else {
                fallbackCopy(text, copyBtn);
            }
        });
    }

    function fallbackCopy(text, btn) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopySuccess(btn);
        } catch (e) {
            btn.innerHTML = '❌ Gagal copy, coba manual';
        }
        document.body.removeChild(textarea);
    }

    function showCopySuccess(btn) {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '✅ Template Tercopy!';
        btn.style.background = '#9ece6a';
        btn.style.color = '#0a0c0f';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.color = '';
        }, 2500);
    }

    // ===== JOIN WA BUTTON =====
    const joinWA = document.getElementById('joinWA');
    if (joinWA) {
        joinWA.addEventListener('click', (e) => {
            // Let href work naturally since it's a direct link
        });
    }

    // ===== DISTRIK ITEM CLICK FEEDBACK =====
    document.querySelectorAll('.distrik-item').forEach(item => {
        item.addEventListener('click', () => {
            item.style.transform = 'scale(0.97)';
            setTimeout(() => { item.style.transform = ''; }, 180);
        });
    });

    // ===== SCROLL REVEAL ANIMATION =====
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll(
        '.rule-card, .mech-item, .tier-card, .spk-card, .relation-card, .tip-card, .loc-card, .asa-card, .announcement-item'
    ).forEach(el => {
        el.classList.add('reveal-on-scroll');
        revealObserver.observe(el);
    });

    // ===== ASA CARD HOVER GLOW =====
    document.querySelectorAll('.asa-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 16px 40px rgba(122, 162, 247, 0.15)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '';
        });
    });

    // ===== FLOW STEP HOVER =====
    document.querySelectorAll('.flow-step').forEach((step, index) => {
        step.addEventListener('mouseenter', () => {
            step.style.borderColor = 'var(--primary)';
            step.style.transform = 'translateY(-4px)';
            step.style.transition = 'all 0.3s';
        });
        step.addEventListener('mouseleave', () => {
            step.style.borderColor = '';
            step.style.transform = '';
        });
    });

});

// ===== TIER ITEM HOVER (outside DOMContentLoaded for perf) =====
document.querySelectorAll('.tier-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.style.background = '#1e2a3a';
        item.style.borderRadius = '8px';
        item.style.padding = '8px 10px';
        item.style.transition = 'all 0.2s';
    });
    item.addEventListener('mouseleave', () => {
        item.style.background = '';
        item.style.padding = '';
    });
});

// ===== GLITCH EFFECT FOR QUOTE =====
const glitchText = document.querySelector('.glitch-text');
if (glitchText) {
    setInterval(() => {
        glitchText.style.animation = 'none';
        void glitchText.offsetHeight; // force reflow
        glitchText.style.animation = 'glitch 3s infinite';
    }, 5000);
}

// ===== ANNOUNCEMENT ITEM ICON HOVER =====
document.querySelectorAll('.announcement-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
        const icon = item.querySelector('.item-icon');
        if (icon) {
            icon.style.transform = 'rotate(5deg) scale(1.15)';
            icon.style.transition = 'all 0.3s';
        }
    });
    item.addEventListener('mouseleave', () => {
        const icon = item.querySelector('.item-icon');
        if (icon) {
            icon.style.transform = 'rotate(0deg) scale(1)';
        }
    });
});

// ===== PARALLAX FOR DECORATIONS =====
const decorations = document.querySelectorAll('.decoration');
if (decorations.length > 0) {
    let ticking = false;
    window.addEventListener('mousemove', (e) => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const mouseX = e.clientX / window.innerWidth - 0.5;
                const mouseY = e.clientY / window.innerHeight - 0.5;
                decorations.forEach((dec, index) => {
                    const speed = index === 0 ? 20 : 30;
                    dec.style.transform = `translate(${mouseX * speed}px, ${mouseY * speed}px)`;
                });
                ticking = false;
            });
            ticking = true;
        }
    });
}

// ===== RELATION CARD HOVER =====
document.querySelectorAll('.relation-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.transition = 'all 0.3s';
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});
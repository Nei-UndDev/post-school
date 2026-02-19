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

    // ─────────────────────────────────────────
    //  MOBILE DETECTION
    // ─────────────────────────────────────────
    const IS_MOBILE = (
        ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
        window.innerWidth <= 900
    ) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    // Body class biar CSS bisa ikut adapt
    document.body.classList.add('intro-active');
    if (IS_MOBILE) document.body.classList.add('intro-mobile');

    // ─────────────────────────────────────────
    //  WEB AUDIO ENGINE
    // ─────────────────────────────────────────
    let ctx = null;

    function initAudio() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    function gain(val, dest) {
        const g = ctx.createGain();
        g.gain.value = val;
        g.connect(dest || ctx.destination);
        return g;
    }

    // ── UNLOCK THUNK ──
    // Desktop: boom + click transient
    // Mobile:  boom saja (hemat node)
    function playUnlockThunk() {
        const t   = ctx.currentTime;
        const out = gain(0.85);

        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(75, t);
        osc.frequency.exponentialRampToValueAtTime(22, t + 0.45);
        env.gain.setValueAtTime(1, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(env); env.connect(out);
        osc.start(t); osc.stop(t + 0.5);

        if (!IS_MOBILE) {
            // Click transient — skip di mobile
            const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < data.length; i++)
                data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
            const src  = ctx.createBufferSource();
            const filt = ctx.createBiquadFilter();
            filt.type = 'highpass'; filt.frequency.value = 200;
            src.buffer = buf;
            src.connect(filt); filt.connect(out);
            src.start(t);
        }
    }

    // ── TERMINAL BEEP ──
    // Desktop: 2 oscillator per baris
    // Mobile:  1 oscillator saja, gain lebih kecil
    function playTerminalBeep(index) {
        const t     = ctx.currentTime;
        const freqs = [880, 1046, 932, 1174, 784, 1318];
        const freq  = freqs[index % freqs.length];
        const out   = gain(IS_MOBILE ? 0.08 : 0.12);

        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(1, t + 0.005);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(env); env.connect(out);
        osc.start(t); osc.stop(t + 0.09);

        if (!IS_MOBILE) {
            // Sub-click — skip di mobile
            const osc2 = ctx.createOscillator();
            const env2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.value = freq * 0.5;
            env2.gain.setValueAtTime(0.3, t);
            env2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            osc2.connect(env2); env2.connect(out);
            osc2.start(t); osc2.stop(t + 0.06);
        }
    }

    // ── GLITCH BURST ──
    // Desktop: noise + 3 screech osc
    // Mobile:  noise saja (1 buffer, no osc)
    function playGlitchBurst() {
        const t      = ctx.currentTime;
        const bufLen = IS_MOBILE
            ? Math.floor(ctx.sampleRate * 0.25)   // buffer pendek
            : Math.floor(ctx.sampleRate * 0.5);
        const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data   = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        const filt  = ctx.createBiquadFilter();
        const env   = ctx.createGain();
        filt.type = 'bandpass';
        filt.frequency.value = IS_MOBILE ? 1800 : 2400;
        filt.Q.value = 0.8;
        env.gain.setValueAtTime(IS_MOBILE ? 0.35 : 0.6, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + (IS_MOBILE ? 0.3 : 0.45));
        noise.buffer = buf;
        noise.connect(filt); filt.connect(env); env.connect(ctx.destination);
        noise.start(t);

        if (!IS_MOBILE) {
            // Screech osc — hanya desktop
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
    }

    // ── GATE DRONE ──
    // Desktop: 5 oscillator harmonic dengan wobble
    // Mobile:  2 oscillator saja, no detune animation
    function startGateDrone() {
        const t    = ctx.currentTime;
        const out  = gain(0);
        out.gain.linearRampToValueAtTime(IS_MOBILE ? 0.12 : 0.18, t + 1.2);

        const base  = 55;
        const mults = IS_MOBILE ? [1, 2] : [1, 1.5, 2, 2.67, 3];

        mults.forEach((mult, i) => {
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.value = base * mult;

            if (!IS_MOBILE) {
                // Wobble — skip di mobile karena perlu scheduled param update
                osc.detune.setValueAtTime(0, t);
                osc.detune.linearRampToValueAtTime(i % 2 ? 8 : -8, t + 2);
                osc.detune.linearRampToValueAtTime(0, t + 4);
            }

            g.gain.value = 1 / (i + 1);
            osc.connect(g); g.connect(out);
            osc.start(t);
        });
    }

    // ── GATE CREAK ──
    // Desktop: rumble + 3 creak osc + thud
    // Mobile:  rumble + 1 creak osc + thud (jauh lebih ringan)
    function playGateCreak() {
        const t   = ctx.currentTime;
        const out = gain(IS_MOBILE ? 0.5 : 0.7);

        // Rumble — buffer lebih pendek di mobile
        const rLen  = IS_MOBILE
            ? Math.floor(ctx.sampleRate * 1.0)
            : Math.floor(ctx.sampleRate * 2.0);
        const rBuf  = ctx.createBuffer(1, rLen, ctx.sampleRate);
        const rData = rBuf.getChannelData(0);
        for (let i = 0; i < rLen; i++)
            rData[i] = (Math.random() * 2 - 1) * Math.sin(i / rLen * Math.PI);

        const rumble   = ctx.createBufferSource();
        const lowFilt  = ctx.createBiquadFilter();
        const rumbleEnv= ctx.createGain();
        lowFilt.type = 'lowpass'; lowFilt.frequency.value = 180;
        rumbleEnv.gain.setValueAtTime(0, t);
        rumbleEnv.gain.linearRampToValueAtTime(1, t + 0.1);
        rumbleEnv.gain.setValueAtTime(1, t + 1.2);
        rumbleEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        rumble.buffer = rBuf;
        rumble.connect(lowFilt); lowFilt.connect(rumbleEnv); rumbleEnv.connect(out);
        rumble.start(t);

        // Creak tones
        const creaks = IS_MOBILE
            ? [{ start: 380, end: 160, startT: 0, dur: 1.4 }]         // 1 layer
            : [                                                          // 3 layer
                { start: 420, end: 180, startT: 0,    dur: 1.6 },
                { start: 310, end: 140, startT: 0.15, dur: 1.5 },
                { start: 520, end: 200, startT: 0.05, dur: 1.2 },
              ];

        creaks.forEach(({ start, end, startT, dur }) => {
            const osc  = ctx.createOscillator();
            const env  = ctx.createGain();
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

        // Thud saat pintu mentok
        setTimeout(() => {
            const ct  = ctx.currentTime;
            const to  = ctx.createOscillator();
            const te  = ctx.createGain();
            to.type = 'sine';
            to.frequency.setValueAtTime(60, ct);
            to.frequency.exponentialRampToValueAtTime(20, ct + 0.3);
            te.gain.setValueAtTime(IS_MOBILE ? 0.8 : 1.2, ct);
            te.gain.exponentialRampToValueAtTime(0.001, ct + 0.4);
            to.connect(te); te.connect(ctx.destination);
            to.start(ct); to.stop(ct + 0.4);
        }, IS_MOBILE ? 1400 : 1700);
    }

    // ── LOGO CHORD ──
    // Desktop: 7 note chord + 4 shimmer overtone = 11 oscillator
    // Mobile:  3 note chord saja = 3 oscillator
    function playLogoChord() {
        const t   = ctx.currentTime;
        const out = gain(0);
        out.gain.linearRampToValueAtTime(IS_MOBILE ? 0.15 : 0.22, t + 1.0);
        out.gain.setValueAtTime(IS_MOBILE ? 0.15 : 0.22, t + 2.0);
        out.gain.linearRampToValueAtTime(0, t + 3.5);

        const notes = IS_MOBILE
            ? [110, 165, 220]                           // triads — ringan
            : [110, 138.6, 165, 207.7, 220, 277.2, 330]; // full maj7

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            const del = i * (IS_MOBILE ? 0.15 : 0.12);
            osc.type = 'sine';
            osc.frequency.value = freq;
            if (!IS_MOBILE) osc.detune.value = (Math.random() - 0.5) * 4;
            g.gain.setValueAtTime(0, t + del);
            g.gain.linearRampToValueAtTime(0.6 / (i + 1), t + del + 0.3);
            osc.connect(g); g.connect(out);
            osc.start(t + del);
            osc.stop(t + 4);
        });

        if (!IS_MOBILE) {
            // Shimmer layer — desktop only, 4 osc ekstra
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
    }

    // ── FADE OUT AUDIO ──
    function fadeOutAudio() {
        if (!ctx) return;
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
            <div class="unlock-prompt">[ ${IS_MOBILE ? 'TAP' : 'KLIK'} UNTUK MEMASUKI ]</div>
            <div class="unlock-sub">POST : SCHOOL • FASE 1</div>
        </div>
    `;
    document.body.appendChild(unlockScreen);

    unlockScreen.addEventListener('click', function onUnlock() {
        initAudio();
        playUnlockThunk();

        unlockScreen.style.opacity = '0';
        unlockScreen.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            unlockScreen.remove();
            runIntro();
        }, 500);
    }, { once: true });

    // ─────────────────────────────────────────
    //  MAIN INTRO SEQUENCE
    //  Mobile: durasi diperpendek, animasi lebih simpel
    // ─────────────────────────────────────────
    function runIntro() {
        // Timing — mobile lebih cepat supaya tidak ngelag
        const T = IS_MOBILE ? {
            terminalStep : 220,   // jeda antar baris terminal
            glitch       : 1600,  // kapan glitch jalan
            gateIn       : 2000,  // gerbang fade in
            gateOpen     : 2600,  // pintu buka
            logoReveal   : 3200,  // logo muncul
            fadeOut      : 4500,  // intro mulai fade
            domRemove    : 5300,  // hapus dari DOM
        } : {
            terminalStep : 280,
            glitch       : 2000,
            gateIn       : 2500,
            gateOpen     : 3200,
            logoReveal   : 4000,
            fadeOut      : 5500,
            domRemove    : 6500,
        };

        // Phase 1: Terminal
        lines.forEach((id, i) => {
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) el.style.animation = 'terminal-appear 0.25s ease forwards';
                playTerminalBeep(i);
            }, 150 + i * T.terminalStep);
        });

        // Phase 2: Glitch
        setTimeout(() => {
            if (terminal) terminal.style.animation = 'rgb-shift 0.5s ease';
            if (glitch) {
                glitch.style.opacity = '1';
                // Mobile: skip glitch bar loop, langsung fade
                if (IS_MOBILE) {
                    glitch.style.transition = 'opacity 0.3s';
                    setTimeout(() => { glitch.style.opacity = '0'; }, 350);
                } else {
                    glitch.querySelectorAll('.glitch-bar').forEach((bar, i) => {
                        setTimeout(() => {
                            bar.style.animation = 'glitch-h 0.6s ease forwards';
                        }, i * 50);
                    });
                }
            }
            playGlitchBurst();
        }, T.glitch);

        // Phase 3: Gate fade in
        setTimeout(() => {
            if (terminal) terminal.style.opacity = '0';
            if (glitch)   glitch.style.opacity   = '0';
            if (gate) {
                gate.style.transition = `opacity ${IS_MOBILE ? '0.4s' : '0.6s'} ease`;
                gate.style.opacity    = '1';
            }
            startGateDrone();
        }, T.gateIn);

        // Phase 4: Gate open + creak
        setTimeout(() => {
            if (seamGlow) {
                seamGlow.style.transition = 'opacity 0.5s';
                seamGlow.style.opacity    = '0';
            }
            if (doorLeft)  doorLeft.classList.add('open');
            if (doorRight) doorRight.classList.add('open');
            playGateCreak();
        }, T.gateOpen);

        // Phase 5: Logo reveal + chord
        setTimeout(() => {
            if (logoReveal) logoReveal.classList.add('visible');
            playLogoChord();
        }, T.logoReveal);

        // Phase 6: Fade out
        setTimeout(() => {
            overlay.classList.add('fade-out');
            fadeOutAudio();
        }, T.fadeOut);

        // Phase 7: Remove DOM
        setTimeout(() => {
            overlay.remove();
            document.body.classList.remove('intro-active', 'intro-mobile');
        }, T.domRemove);
    }

})();

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', function () {

    // ===== MOBILE MENU TOGGLE =====
    const mobileBtn  = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileBtn.classList.toggle('active');
        });
    }

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
        let current  = '';
        const scrollY = window.scrollY + 120;
        sections.forEach(section => {
            if (scrollY >= section.offsetTop && scrollY < section.offsetTop + section.clientHeight)
                current = section.getAttribute('id');
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.substring(1) === current) link.classList.add('active');
        });
    });

    // ===== COPY ID CARD TEMPLATE =====
    const copyBtn = document.getElementById('copyTemplate');
    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            const template = document.getElementById('idcardTemplate');
            if (!template) return;
            const text = template.value.trim();
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => showCopySuccess(copyBtn)).catch(() => fallbackCopy(text, copyBtn));
            } else {
                fallbackCopy(text, copyBtn);
            }
        });
    }

    function fallbackCopy(text, btn) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopySuccess(btn); }
        catch(e) { btn.innerHTML = '❌ Gagal copy, coba manual'; }
        document.body.removeChild(ta);
    }

    function showCopySuccess(btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '✅ Template Tercopy!';
        btn.style.background = '#9ece6a';
        btn.style.color = '#0a0c0f';
        setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.style.color = ''; }, 2500);
    }

    // ===== DISTRIK CLICK FEEDBACK =====
    document.querySelectorAll('.distrik-item').forEach(item => {
        item.addEventListener('click', () => {
            item.style.transform = 'scale(0.97)';
            setTimeout(() => { item.style.transform = ''; }, 180);
        });
    });

    // ===== SCROLL REVEAL =====
    if ('IntersectionObserver' in window) {
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
    }

    // ===== HOVER EFFECTS (desktop only, skip on touch) =====
    const isTouch = 'ontouchstart' in window;
    if (!isTouch) {
        document.querySelectorAll('.asa-card').forEach(card => {
            card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 16px 40px rgba(122,162,247,0.15)'; });
            card.addEventListener('mouseleave', () => { card.style.boxShadow = ''; });
        });

        document.querySelectorAll('.flow-step').forEach(step => {
            step.addEventListener('mouseenter', () => {
                step.style.borderColor = 'var(--primary)';
                step.style.transform   = 'translateY(-4px)';
                step.style.transition  = 'all 0.3s';
            });
            step.addEventListener('mouseleave', () => {
                step.style.borderColor = '';
                step.style.transform   = '';
            });
        });

        document.querySelectorAll('.relation-card').forEach(card => {
            card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-4px)'; card.style.transition = 'all 0.3s'; });
            card.addEventListener('mouseleave', () => { card.style.transform = ''; });
        });

        document.querySelectorAll('.tier-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.background   = '#1e2a3a';
                item.style.borderRadius = '8px';
                item.style.padding      = '8px 10px';
                item.style.transition   = 'all 0.2s';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = '';
                item.style.padding    = '';
            });
        });

        document.querySelectorAll('.announcement-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                const icon = item.querySelector('.item-icon');
                if (icon) { icon.style.transform = 'rotate(5deg) scale(1.15)'; icon.style.transition = 'all 0.3s'; }
            });
            item.addEventListener('mouseleave', () => {
                const icon = item.querySelector('.item-icon');
                if (icon) icon.style.transform = '';
            });
        });

        // Parallax decorations — desktop only
        const decorations = document.querySelectorAll('.decoration');
        if (decorations.length > 0) {
            let ticking = false;
            window.addEventListener('mousemove', (e) => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        const mx = e.clientX / window.innerWidth - 0.5;
                        const my = e.clientY / window.innerHeight - 0.5;
                        decorations.forEach((dec, i) => {
                            dec.style.transform = `translate(${mx * (i === 0 ? 20 : 30)}px, ${my * (i === 0 ? 20 : 30)}px)`;
                        });
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        }
    }

    // ===== GLITCH QUOTE (ringan, pakai requestAnimationFrame) =====
    const glitchText = document.querySelector('.glitch-text');
    if (glitchText) {
        setInterval(() => {
            glitchText.style.animation = 'none';
            void glitchText.offsetHeight;
            glitchText.style.animation = 'glitch 3s infinite';
        }, 5000);
    }

});

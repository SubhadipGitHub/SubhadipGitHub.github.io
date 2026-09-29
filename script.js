/* ============================================================
   Subhadip Dutta — portfolio interactions
   Zero dependencies: preloader, nav, typing, scroll reveals,
   scroll-drawn expertise path, hero video, contact form.
   ============================================================ */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var $ = function (sel) { return document.querySelector(sel); };
    var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

    /* ---------- preloader ---------- */
    // plays once per browser; the inline script in <head> hides it for returning visitors
    // Anything whose entrance would otherwise play out behind the curtain waits on this.
    var curtainCbs = [];
    var curtainUp = false;
    function onCurtainUp(fn) {
        if (curtainUp) { fn(); } else { curtainCbs.push(fn); }
    }
    function raiseCurtain() {
        if (curtainUp) { return; }
        curtainUp = true;
        curtainCbs.splice(0).forEach(function (fn) { fn(); });
    }

    var preloader = $('#preloader');
    if (preloader && !document.documentElement.classList.contains('is-returning')) {
        var dismiss = function () {
            preloader.classList.add('done');
            raiseCurtain();
            setTimeout(function () { preloader.remove(); }, 1200);
        };
        setTimeout(dismiss, reduceMotion ? 200 : 2100);
        try { localStorage.setItem('sd-visited', '1'); } catch (err) { /* private mode: it just plays again */ }
    } else {
        if (preloader) { preloader.remove(); }
        raiseCurtain();
    }
    // nothing may stay hidden behind a curtain that failed to lift
    setTimeout(raiseCurtain, 5000);

    /* ---------- navbar ---------- */
    var navbar = $('#navbar');
    var navToggle = $('#nav-toggle');
    var mobileMenu = $('#mobile-menu');

    var closeMenu = function () {
        navbar.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-locked');
    };

    if (navToggle) {
        navToggle.addEventListener('click', function () {
            var open = navbar.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            document.body.classList.toggle('is-locked', open);
        });
    }

    if (mobileMenu) {
        mobileMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navbar.classList.contains('open')) { closeMenu(); }
    });

    /* ---------- scroll state: sticky nav, back-to-top ---------- */
    var toTop = $('#to-top');
    var onScroll = function () {
        var y = window.scrollY || window.pageYOffset;
        navbar.classList.toggle('sticky', y > 40);
        if (toTop) { toTop.classList.toggle('show', y > 600); }
        highlightSection(y);
        drawPath();
        parallaxContact();
    };

    if (toTop) {
        toTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    }

    /* ---------- active section in nav ---------- */
    var navLinks = $$('.nav-links a');
    var sections = navLinks
        .map(function (link) { return document.querySelector(link.getAttribute('href')); })
        .filter(Boolean);

    function highlightSection(y) {
        var offset = y + window.innerHeight * 0.32;
        var activeIndex = 0;
        sections.forEach(function (section, i) {
            if (section.offsetTop <= offset) { activeIndex = i; }
        });
        navLinks.forEach(function (link, i) {
            link.classList.toggle('active', i === activeIndex);
        });
    }

    /* ---------- typing effect ---------- */
    var typingEl = $('#typing');
    if (typingEl) {
        var roles = [
            'Technical Lead',
            'Integration Specialist',
            'Fusion ERP/CX Consultant',
            'Data Scientist',
            'Android Developer',
            'Game Developer'
        ];

        if (reduceMotion) {
            typingEl.textContent = roles[0];
        } else {
            var roleIndex = 0;
            var charIndex = 0;
            var deleting = false;

            (function tick() {
                var word = roles[roleIndex];
                charIndex += deleting ? -1 : 1;
                typingEl.textContent = word.slice(0, charIndex);

                var delay = deleting ? 45 : 85;
                if (!deleting && charIndex === word.length) {
                    deleting = true;
                    delay = 1600;
                } else if (deleting && charIndex === 0) {
                    deleting = false;
                    roleIndex = (roleIndex + 1) % roles.length;
                    delay = 320;
                }
                setTimeout(tick, delay);
            })();
        }
    }

    /* ---------- reveal on scroll ---------- */
    var revealItems = $$('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealItems.forEach(function (el) { el.classList.add('in'); });
    } else {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) { return; }
                var el = entry.target;
                el.style.setProperty('--d', (el.dataset.delay || 0) + 'ms');
                el.classList.add('in');
                observer.unobserve(el);
            });
        }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });

        // The hero's items are already on screen at load, so left to the observer they would
        // finish their entrance behind the preloader. They do not need the observer at all --
        // the hero is always in view -- so reveal them outright once the curtain lifts, rather
        // than re-observing then and depending on an intersection callback still being
        // delivered. Everything below the fold observes as usual.
        var heroReveals = [];
        revealItems.forEach(function (el) {
            if (el.closest('.hero')) { heroReveals.push(el); } else { observer.observe(el); }
        });
        onCurtainUp(function () {
            heroReveals.forEach(function (el) {
                el.style.setProperty('--d', (el.dataset.delay || 0) + 'ms');
                el.classList.add('in');
            });
        });
    }

    /* ---------- expertise: scroll-drawn dashed path + card lighting ---------- */
    var track = $('.tag-cards');
    // A thick white line inside an SVG mask wipes the dashed path into view,
    // so the revealed run stays dashed instead of turning solid.
    var maskLines = $$('.path-mask-line');
    var tagCards = $$('.tag-card');

    function measurePaths() {
        maskLines.forEach(function (path) {
            var len = path.getTotalLength();
            path.dataset.length = len;
            path.style.strokeDasharray = len + ' ' + len;
            path.style.strokeDashoffset = len;
        });
    }
    measurePaths();

    function drawPath() {
        if (!track || !maskLines.length) { return; }

        var rect = track.getBoundingClientRect();
        var vh = window.innerHeight;
        // 0 when the card block's top reaches the viewport centre, 1 when its bottom does.
        var progress = (vh / 2 - rect.top) / rect.height;
        progress = Math.max(0, Math.min(1, progress));

        maskLines.forEach(function (path) {
            var len = parseFloat(path.dataset.length);
            path.style.strokeDashoffset = len * (1 - progress);
        });

        var tipY = rect.top + rect.height * progress;
        tagCards.forEach(function (card) {
            var cardTop = card.getBoundingClientRect().top;
            card.classList.toggle('lit', tipY >= cardTop + 50);
        });
    }

    /* ---------- card rails: horizontal scrollers for projects + certs ---------- */
    var rails = $$('[data-rail]');

    function railStep(rtrack) {
        var card = rtrack.querySelector('.flip-card');
        if (!card) { return rtrack.clientWidth; }
        var gap = parseFloat(getComputedStyle(rtrack).columnGap) || 0;
        return card.offsetWidth + gap;
    }

    function syncRail(rail) {
        var rtrack = rail.querySelector('.rail-track');
        var prev = rail.querySelector('.rail-nav.prev');
        var next = rail.querySelector('.rail-nav.next');
        // sub-pixel scroll widths mean the ends never land exactly on 0 / max
        var max = rtrack.scrollWidth - rtrack.clientWidth;
        var atStart = rtrack.scrollLeft <= 1;
        var atEnd = rtrack.scrollLeft >= max - 1;

        rail.classList.toggle('at-start', atStart);
        rail.classList.toggle('at-end', atEnd || max <= 1);
        if (prev) { prev.disabled = atStart; }
        if (next) { next.disabled = atEnd || max <= 1; }
    }

    rails.forEach(function (rail) {
        var rtrack = rail.querySelector('.rail-track');
        if (!rtrack) { return; }

        rail.querySelectorAll('.rail-nav').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var dir = btn.classList.contains('prev') ? -1 : 1;
                rtrack.scrollBy({ left: dir * railStep(rtrack), behavior: reduceMotion ? 'auto' : 'smooth' });
            });
        });

        rtrack.addEventListener('scroll', function () { syncRail(rail); }, { passive: true });

        /* drag to scroll. Pointer-downs that land on a button or link are left
           alone, and a drag that actually moved swallows the click it ends on
           so dragging across a card never flips it. */
        var dragging = false;
        var moved = false;
        var startX = 0;
        var startScroll = 0;

        rtrack.addEventListener('pointerdown', function (e) {
            if (e.button !== 0 || e.target.closest('button, a')) { return; }
            dragging = true;
            moved = false;
            startX = e.clientX;
            startScroll = rtrack.scrollLeft;
        });

        rtrack.addEventListener('pointermove', function (e) {
            if (!dragging) { return; }
            var dx = e.clientX - startX;
            if (!moved && Math.abs(dx) > 4) {
                moved = true;
                rtrack.classList.add('dragging');
                rtrack.setPointerCapture(e.pointerId);
            }
            if (moved) {
                e.preventDefault();
                rtrack.scrollLeft = startScroll - dx;
            }
        });

        var endDrag = function (e) {
            if (!dragging) { return; }
            dragging = false;
            rtrack.classList.remove('dragging');
            if (moved && e && rtrack.hasPointerCapture && rtrack.hasPointerCapture(e.pointerId)) {
                rtrack.releasePointerCapture(e.pointerId);
            }
        };

        rtrack.addEventListener('pointerup', endDrag);
        rtrack.addEventListener('pointercancel', endDrag);
        rtrack.addEventListener('click', function (e) {
            if (!moved) { return; }
            e.preventDefault();
            e.stopPropagation();
            moved = false;
        }, true);

        syncRail(rail);
    });

    function syncRails() { rails.forEach(syncRail); }

    /* ---------- flip cards ---------- */
    function setFlipped(card, flipped) {
        card.classList.toggle('flipped', flipped);
        var trigger = card.querySelector('.flip-front .flip-btn');
        if (trigger) { trigger.setAttribute('aria-expanded', flipped ? 'true' : 'false'); }
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.flip-btn') : null;
        if (!btn) { return; }
        var card = btn.closest('.flip-card');
        if (!card) { return; }
        setFlipped(card, !card.classList.contains('flipped'));
        if (card.classList.contains('flipped')) {
            var back = card.querySelector('.flip-back .flip-btn');
            if (back) { back.focus(); }
        } else {
            var front = card.querySelector('.flip-front .flip-btn');
            if (front) { front.focus(); }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') { return; }
        var card = document.activeElement && document.activeElement.closest
            ? document.activeElement.closest('.flip-card.flipped')
            : null;
        if (!card) { return; }
        setFlipped(card, false);
        var front = card.querySelector('.flip-front .flip-btn');
        if (front) { front.focus(); }
    });

    /* ---------- contact: parallax on the oversized word ---------- */
    var bigText = $('#contact-bigtext');
    var contactSection = $('.contact');

    function parallaxContact() {
        if (!bigText || !contactSection || reduceMotion) { return; }
        var rect = contactSection.getBoundingClientRect();
        var vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) { return; }
        var progress = (vh - rect.top) / (vh + rect.height);
        bigText.style.transform = 'translateY(' + (progress * 40 - 12) + '%)';
    }

    /* ---------- hero character: eyes follow the cursor, reacts, thinks and talks ---------- */
    var heroSection = $('#home');
    var stage = $('#hero-stage');
    var actor = $('#hero-actor');
    var hit = $('#hero-hit');
    var videoA = $('#hero-video-a');
    var videoB = $('#hero-video-b');
    var gazeVideo = $('#hero-gaze');
    var bubble = $('#hero-bubble');
    var bubbleText = $('#hero-bubble-text');
    var hintText = $('#hero-hint-text');
    var linesEl = $('#hero-lines');

    if (heroSection && stage && actor && hit && videoA && videoB && gazeVideo && bubble && bubbleText) {
        var isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        /* --- lines: edited in the #hero-lines JSON block in index.html --- */
        var LINES = {};
        try { LINES = JSON.parse(linesEl ? linesEl.textContent : '{}'); } catch (err) { LINES = {}; }

        /* His clock, not the visitor's: these lines are about his working day, and the site
           is built around Asia/Calcutta. A "key@night" entry wins over plain "key". */
        function partOfDay() {
            var h;
            try {
                h = parseInt(new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Calcutta', hour: '2-digit', hour12: false
                }).format(new Date()), 10);
            } catch (err) {
                h = new Date().getHours();
            }
            if (h < 5) { return 'night'; }
            if (h < 12) { return 'morning'; }
            if (h < 17) { return 'afternoon'; }
            if (h < 22) { return 'evening'; }
            return 'night';
        }
        var TOD = partOfDay();

        var nextIndex = {};
        function line(key) {
            var k = LINES[key + '@' + TOD] ? key + '@' + TOD : key;
            var entry = LINES[k];
            if (!entry) { return null; }
            if (Array.isArray(entry)) { entry = { type: 'say', lines: entry }; }
            if (!entry.lines || !entry.lines.length) { return null; }
            var i = nextIndex[k] || 0;
            nextIndex[k] = (i + 1) % entry.lines.length;
            return { think: entry.type === 'think', text: String(entry.lines[i]), pop: entry.pop };
        }

        // "move your cursor around" is wrong while he is in focus mode and ignoring it
        function syncHint() {
            if (!hintText || !LINES.hint) { return; }
            var h = focusOn ? LINES.hint.focus
                : isTouch ? LINES.hint.touch : LINES.hint.pointer;
            if (h) { hintText.textContent = h; }
        }

        /* --- focus mode --------------------------------------------------------------
           Two modes, and the headphones are the tell.
           Non-focus, which every visit opens in: headphones round his neck, eyes on the
           cursor, greets on hover or click, laughs or goes shy on a double tap.
           Focus: the control puts the headphones on, the music starts and he nods along to
           it, deaf to the cursor, until the control or a click on him takes them off again.
           What you hear is `focusOn` AND whether the headphones are on his ears, so the track
           fades in under the hpOn clip and out under hpOff. Browsers refuse audio without a
           gesture; pressing the control is that gesture, so the graph is built there. */
        var musicEl = $('#hero-music');
        var soundBtn = $('#hero-sound');
        var soundLabel = $('#hero-sound-label');
        var focusOn = false;
        var audioCtx = null, musicGain = null, analyser = null, freqBins = null;
        var musicPauseTimer = null;
        var MUSIC_VOL = 0.28;
        var FADE_S = 1.2;

        syncHint();

        // 'plugging' is the hpOn clip, so the track is already coming up under it
        function wearingHeadphones() {
            return mode === 'focus' || mode === 'plugging';
        }
        // focus mode, including both headphone clips: he takes no notice of the cursor
        function deaf() {
            return mode === 'focus' || mode === 'plugging' || mode === 'unplugging';
        }
        function musicPlaying() {
            return !!(focusOn && musicEl && !musicEl.paused);
        }

        function buildAudioGraph() {
            if (audioCtx || !musicEl) { return; }
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) { return; }
            try {
                audioCtx = new AC();
                musicGain = audioCtx.createGain();
                musicGain.gain.value = 0;
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                freqBins = new Uint8Array(analyser.frequencyBinCount);
                // gain sits before the analyser, so ducking quiets his bob as well as the track
                audioCtx.createMediaElementSource(musicEl).connect(musicGain);
                musicGain.connect(analyser);
                analyser.connect(audioCtx.destination);
                // the element's own volume still multiplies the routed signal in most browsers;
                // a syncMusic() call before this graph existed may have zeroed it, so reset it --
                // the gain node is now the only thing that should ever duck the level
                musicEl.volume = 1;
            } catch (err) {
                // no Web Audio (or a cross-origin file): fall back to plain element volume
                audioCtx = null; musicGain = null; analyser = null;
            }
        }

        function syncMusic() {
            if (!musicEl) { return; }
            var audible = focusOn && wearingHeadphones();
            var target = audible ? MUSIC_VOL : 0;
            if (audioCtx && musicGain) {
                var t = audioCtx.currentTime;
                musicGain.gain.cancelScheduledValues(t);
                musicGain.gain.setValueAtTime(musicGain.gain.value, t);
                musicGain.gain.linearRampToValueAtTime(target, t + FADE_S);
            } else {
                musicEl.volume = target;
            }
            clearTimeout(musicPauseTimer);
            if (audible) {
                safePlay(musicEl);
            } else if (!musicEl.paused) {
                // let the fade finish before stopping, so it never cuts
                musicPauseTimer = setTimeout(function () {
                    if (!(focusOn && wearingHeadphones())) { musicEl.pause(); }
                }, FADE_S * 1000 + 100);
            }
        }

        // just the flag and the controls' appearance, with no effect on what he is doing
        function setFocusPref(on) {
            focusOn = !!on;
            if (soundBtn) {
                soundBtn.setAttribute('aria-pressed', focusOn ? 'true' : 'false');
            }
            if (soundLabel) {
                soundLabel.textContent = focusOn ? 'Pause focus mode' : 'Turn on focus mode';
            }
            hit.setAttribute('aria-label', focusOn ? 'Take him out of focus mode' : 'Say hi to the character');
            syncHint();
        }

        // Always from a gesture (the control, or a click on him), which is what lets the
        // audio start. The headphone clip that goes with it plays here too.
        function setFocus(on) {
            if (!!on === focusOn) { return; }
            setFocusPref(on);
            if (focusOn) {
                buildAudioGraph();
                if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
                if (!reduceMotion) { enterFocus(); }
            } else if (!reduceMotion) {
                leaveFocus();
            }
            syncMusic();
        }

        if (soundBtn && musicEl) {
            soundBtn.addEventListener('click', function () { setFocus(!focusOn); });
            // Probe for the track only once the hero is on screen, so it never competes with
            // the video for bandwidth -- and only reveal the control if the file is really there.
            onCurtainUp(function () {
                musicEl.addEventListener('canplay', function () { soundBtn.hidden = false; }, { once: true });
                musicEl.addEventListener('error', function () { soundBtn.hidden = true; });
                musicEl.preload = 'metadata';
                musicEl.load();
            });
        }

        /* --- backdrop: match the page to the video's red as this browser renders it --- */
        function matchBackdrop() {
            try {
                var canvas = document.createElement('canvas');
                canvas.width = 16; canvas.height = 12;
                var ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(videoA, 0, 0, 16, 12);
                // top-right corner is always plain backdrop
                var data = ctx.getImageData(12, 0, 4, 3).data;
                var r = 0, g = 0, b = 0, n = data.length / 4;
                for (var i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
                heroSection.style.setProperty('--hero-bg', 'rgb(' + Math.round(r / n) + ',' + Math.round(g / n) + ',' + Math.round(b / n) + ')');
            } catch (err) {
                // canvas is tainted when the page is opened from file://; the CSS fallback stands
            }
        }
        if (videoA.readyState >= 2) { matchBackdrop(); } else { videoA.addEventListener('loadeddata', matchBackdrop, { once: true }); }

        /* --- bubble: thought clouds fade in after "..." dots, speech is typed out --- */
        var bubbleTimer = null;

        /* Typing cadence: ~30ms a character with a beat after punctuation, so a line reads as
           written rather than metered. speak() sizes the talk clip from typeDuration(), so his
           mouth keeps moving until the last character lands. */
        var TYPE_MS = 30;
        var TYPE_PAUSE = { '.': 140, '\u2026': 200, '?': 160, '!': 160, ',': 90, ':': 90, ';': 90 };

        function charCost(prev) {
            return TYPE_MS + (prev ? (TYPE_PAUSE[prev] || 0) : 0);
        }
        // a hair long: it counts the trailing pause that is never actually waited out,
        // which is the safe direction for sizing the talk clip
        function typeDuration(text) {
            var chars = Array.from(text);
            var total = 0;
            for (var i = 0; i < chars.length; i++) { total += TYPE_MS + (TYPE_PAUSE[chars[i]] || 0); }
            return total;
        }

        var typeRaf = null;
        function stopTyping() {
            if (typeRaf) { cancelAnimationFrame(typeRaf); typeRaf = null; }
        }

        // driven off rAF rather than setInterval, so characters land on frame boundaries
        function typeOut(text, whenDone) {
            var chars = Array.from(text);
            var typed = 0;
            var budget = 0;
            var last = 0;
            function render(caret) {
                bubbleText.innerHTML = escapeHtml(chars.slice(0, typed).join('')) +
                    (caret ? '<span class="hero-caret"></span>' : '') +
                    '<span class="hero-bubble-rest">' + escapeHtml(chars.slice(typed).join('')) + '</span>';
            }
            render(true);
            typeRaf = requestAnimationFrame(function step(now) {
                typeRaf = null;
                budget += last ? Math.min(now - last, 100) : 16;
                last = now;
                var moved = false;
                while (typed < chars.length && budget >= charCost(chars[typed - 1])) {
                    budget -= charCost(chars[typed - 1]);
                    typed++;
                    moved = true;
                }
                if (moved) { render(typed < chars.length); }
                if (typed < chars.length) { typeRaf = requestAnimationFrame(step); }
                else { whenDone(); }
            });
        }

        function escapeHtml(str) {
            return str.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
        }

        function hideBubble() {
            clearTimeout(bubbleTimer);
            stopTyping();
            bubble.classList.remove('is-shown', 'is-settled');
        }

        function show(l, holdMs) {
            if (!l) { return; }
            var wasShown = bubble.classList.contains('is-shown');
            hideBubble();
            bubbleTimer = setTimeout(function () {
                bubble.classList.toggle('is-think', l.think);
                bubble.classList.toggle('is-say', !l.think);
                if (l.pop) { pop(l.pop); }

                function done() {
                    if (holdMs) { bubbleTimer = setTimeout(hideBubble, holdMs); }
                }

                if (reduceMotion) {
                    bubbleText.textContent = l.text;
                    bubble.classList.add('is-shown');
                    done();
                } else if (l.think) {
                    // the finished text is laid out from the start, transparent and stacked
                    // under the dots, so the bubble never resizes when the two cross-fade
                    bubbleText.innerHTML = '<span class="hero-dots"><i></i><i></i><i></i></span>' +
                        '<span class="hero-think-text">' + escapeHtml(l.text) + '</span>';
                    bubble.classList.add('is-shown');
                    bubbleTimer = setTimeout(function () {
                        bubble.classList.add('is-settled');
                        done();
                    }, 750);
                } else {
                    bubble.classList.add('is-shown');
                    typeOut(l.text, done);
                }
            }, wasShown ? 200 : 0);
        }

        function pop(emoji) {
            if (reduceMotion) { return; }
            for (var i = 0; i < 3; i++) {
                var el = document.createElement('span');
                el.className = 'hero-pop';
                el.textContent = emoji;
                el.style.left = (40 + Math.random() * 18) + '%';
                el.style.top = (18 + Math.random() * 12) + '%';
                el.style.setProperty('--dx', Math.round(Math.random() * 60 - 30) + 'px');
                el.style.setProperty('--rot', Math.round(Math.random() * 50 - 25) + 'deg');
                el.style.animationDelay = (i * 0.14) + 's';
                el.setAttribute('aria-hidden', 'true');
                stage.appendChild(el);
                setTimeout(function (node) { node.remove(); }, 1900, el);
            }
        }

        /* --- footage ---
           videos/hero-actions.mp4 holds every clip back to back (ranges in seconds);
           videos/hero-gaze.mp4 holds one head-and-eyes sweep per state, far screen-left
           to far screen-right, scrubbed frame by frame to follow the pointer.
           Both are built from videos/raw by the hero build script. */
        var CLIPS = {
            idle: [0.0, 5.0417],       // headphones off: calm smile, a blink (first: it is frame 0)
            typing: [5.0417, 7.5],     // headphones on, typing (seamless loop)
            notice: [7.5, 10.8333],    // looks around, then at the visitor
            hpOff: [10.8333, 14.0833], // headphones down to the neck
            hpOn: [14.0833, 17.3333],  // and back on
            talk: [17.3333, 22.3333],  // mouth moving, hands down (loops)
            greet: [22.3333, 27.375],  // talks, then waves
            wave: [27.375, 31.0],
            laugh: [31.0, 36.0417],
            idea: [36.0417, 41.0833],  // raised "one moment" finger
            flinch: [41.0833, 46.125],
            shy: [46.125, 51.1667],
            coffee: [51.1667, 56.2083],  // a sip mid-work, headphones on
            nod: [56.2083, 58.7917]      // bobbing to the music (seamless loop)
        };
        // `center` is the frame index at which he faces forward
        var GAZE = {
            on: { start: 0, frames: 42, center: 16.5 },
            off: { start: 1.75, frames: 44, center: 18.5 }
        };
        /* videos/build-hero.py writes videos/hero-clips.json alongside the encode, so adding
           or reordering a clip can no longer silently desync the two tables above. Those
           literals stay as the fallback for file:// and for a fetch that does not land. */
        var clipsReady = new Promise(function (resolve) {
            if (!window.fetch) { resolve(); return; }
            var settled = false;
            var finish = function () { if (!settled) { settled = true; resolve(); } };
            setTimeout(finish, 1500);
            fetch('videos/hero-clips.json', { cache: 'no-cache' })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (data) {
                    if (data && data.actions && data.gaze) { CLIPS = data.actions; GAZE = data.gaze; }
                    finish();
                })
                .catch(finish);
        });

        var FRAME = 1 / 24;
        var FADE_MS = 320;

        var active = videoA;
        var standby = videoB;
        var seg = null;          // clip being monitored: { from, to, loop, resolve, jumping }
        var inView = true;
        var gazeOn = false;      // the gaze layer is what's showing
        var gazeState = 'on';
        var gazeToken = 0;
        var gaze = { x: 0, tx: 0, ty: 0, frame: -1 };

        function safePlay(v) {
            var p = v.play();
            if (p && p.catch) { p.catch(function () {}); }
        }

        // Cue `from` on the hidden copy and dissolve over to it. A jump requested while
        // another is still seeking retargets that one, so the two copies never swap twice.
        // The copy is polled rather than trusted to fire 'seeked': Chrome can drop a seek
        // on a paused, hidden video and report a stale one, which showed the wrong moment.
        var pendingJump = null;
        function jumpTo(from) {
            gazeToken++;
            if (pendingJump) {
                pendingJump.from = from;
                pendingJump.next.currentTime = from;
                return pendingJump.promise;
            }
            var job = { from: from, next: standby };
            job.promise = new Promise(function (resolve) {
                var next = job.next;
                var startedAt = Date.now();
                next.currentTime = from;
                (function wait() {
                    var arrived = !next.seeking && next.readyState >= 2 && Math.abs(next.currentTime - job.from) < 0.15;
                    if (!arrived && Date.now() - startedAt < 1200) {
                        if (!next.seeking && Math.abs(next.currentTime - job.from) >= 0.15) { next.currentTime = job.from; }
                        setTimeout(wait, 30);
                        return;
                    }
                    pendingJump = null;
                    if (inView) { safePlay(next); }
                    next.classList.add('is-visible');
                    active.classList.remove('is-visible');
                    if (gazeOn) {
                        gazeVideo.classList.remove('is-visible');
                        gazeOn = false;
                    }
                    var prev = active;
                    active = next;
                    standby = prev;
                    setTimeout(function () { if (prev !== active) { prev.pause(); } }, FADE_MS);
                    resolve();
                })();
            });
            pendingJump = job;
            return job.promise;
        }

        // Plays a clip; resolves when a one-shot clip reaches its end (holding that frame).
        function playClip(name, loop) {
            var c = CLIPS[name];
            var from = c[0] + 0.01;
            return new Promise(function (resolve) {
                seg = { from: from, to: c[1] - 0.05, loop: !!loop, resolve: resolve, jumping: false };
                startTick();   // the clip-end watcher lives in tick(), which may be parked
                var mine = seg;
                if (!gazeOn && !pendingJump && Math.abs(active.currentTime - from) < 0.12) {
                    if (inView) { safePlay(active); }
                } else {
                    mine.jumping = true;
                    jumpTo(from).then(function () { mine.jumping = false; });
                }
                if (loop) { resolve(); }
            });
        }

        /* --- gaze: scrub the sweep so his head and eyes follow gaze.x (-1 left .. 1 right) --- */
        // unrounded, so the hysteresis below can work on the continuous value
        function gazeIndex(x, g) {
            return x < 0 ? g.center * (1 + x) : g.center + x * (g.frames - 1 - g.center);
        }

        function setGazeFrame(force) {
            var g = GAZE[gazeState];
            var cont = gazeIndex(gaze.x, g);
            if (!force) {
                // a seek already in flight is the natural throttle. A time-based one on top
                // of it starved the 42-frame sweep and made his eyes step instead of glide.
                if (gazeVideo.seeking) { return; }
                // a hair past the rounding boundary: enough to damp sub-pixel jitter, not
                // enough to hold a frame back once the cursor is genuinely moving
                if (gaze.frame >= 0 && Math.abs(cont - gaze.frame) < 0.55) { return; }
            }
            gaze.frame = Math.max(0, Math.min(g.frames - 1, Math.round(cont)));
            gazeVideo.currentTime = g.start + (gaze.frame + 0.5) * FRAME;
        }

        function showGaze(state) {
            seg = null;
            startTick();   // tick() scrubs the gaze layer, and may be parked
            if (gazeOn && gazeState === state) { return Promise.resolve(); }
            gazeState = state;
            var token = ++gazeToken;
            var before = pendingJump ? pendingJump.promise : Promise.resolve();
            return before.then(function () {
                return new Promise(function (resolve) {
                    if (token !== gazeToken) { resolve(); return; }
                    gaze.x = gaze.tx;
                    setGazeFrame(true);
                    var startedAt = Date.now();
                    (function wait() {
                        if (token !== gazeToken) { resolve(); return; }
                        var ready = !gazeVideo.seeking && gazeVideo.readyState >= 2;
                        if (!ready && Date.now() - startedAt < 800) { setTimeout(wait, 30); return; }
                        gazeVideo.classList.add('is-visible');
                        active.classList.remove('is-visible');
                        gazeOn = true;
                        var shown = active;
                        setTimeout(function () { if (gazeOn) { shown.pause(); } }, FADE_MS);
                        resolve();
                    })();
                });
            });
        }

        // turn back to face forward before a clip starts, so the cut is a small one
        var holdCenter = false;
        function recenter() {
            if (!gazeOn) { return Promise.resolve(); }
            holdCenter = true;
            startTick();   // gaze.x only moves while tick() runs
            return new Promise(function (resolve) {
                var startedAt = Date.now();
                (function wait() {
                    if (Math.abs(gaze.x) < 0.1 || Date.now() - startedAt > 450) { holdCenter = false; resolve(); return; }
                    setTimeout(wait, 30);
                })();
            });
        }

        /* --- per-frame loop: clip ends, gaze easing, tilt, eye-wander --- */
        var tilt = 0;
        var tiltY = 0;
        var beat = 0;
        var wander = { next: 0, holdUntil: 0 };
        var raf = null;
        var lastFrame = 0;
        var pointer = { at: 0 };
        var written = {};

        /* Frame-rate independent smoothing. The old per-frame lerp constants meant what they
           said only at exactly 60fps: on a 120Hz panel everything converged twice as fast.
           Rates below are still "per 60Hz frame", now honestly so. */
        function ease(current, target, rate, dt) {
            return current + (target - current) * (1 - Math.pow(1 - rate, dt * 60));
        }

        function put(name, value) {
            if (written[name] === value) { return; }
            written[name] = value;
            heroSection.style.setProperty(name, value);
        }

        function tick(now) {
            raf = null;
            if (!inView) { lastFrame = 0; return; }
            var dt = lastFrame ? Math.min((now - lastFrame) / 1000, 1 / 20) : 1 / 60;
            lastFrame = now;
            if (seg && !seg.jumping && !gazeOn) {
                var lead = seg.loop ? FADE_MS / 1000 : 0.03;
                if (active.currentTime >= seg.to - lead) {
                    if (seg.loop) {
                        var looping = seg;
                        looping.jumping = true;
                        jumpTo(looping.from).then(function () { looping.jumping = false; });
                    } else {
                        var ended = seg;
                        seg = null;
                        active.pause();
                        ended.resolve();
                    }
                }
            }
            // focus mode: headphones on, music playing, and he is oblivious to the pointer,
            // so the body lean centres too rather than quietly tracking it
            var ignoring = deaf();
            // phones have no pointer: let his eyes wander, with the odd quick glance
            if (isTouch && !ignoring && now > wander.holdUntil && now > wander.next) {
                gaze.tx = Math.random() * 1.6 - 0.8;
                wander.next = now + 1200 + Math.random() * 2200;
            }
            var target = (holdCenter || ignoring) ? 0 : gaze.tx;
            // a cursor held still used to freeze him solid; drift instead, too little to
            // read as tracking something else but enough that he stays alive
            if (gazeOn && !holdCenter && !ignoring && !isTouch && now - pointer.at > 1600) {
                target += Math.sin(now / 1400) * 0.05;
            }
            var targetY = (holdCenter || ignoring) ? 0 : gaze.ty;

            /* Error-proportional rate: a big jump is caught fast, the way a saccade snaps to a
               new target, and the last stretch eases in slowly, the way the eye then tracks. */
            var rate = holdCenter ? 0.3
                : isTouch ? 0.07
                : 0.14 + Math.min(Math.abs(target - gaze.x), 1) * 0.12;
            gaze.x = ease(gaze.x, target, rate, dt);
            if (gazeOn) { setGazeFrame(false); }

            // the body lags well behind the eyes: secondary motion
            tilt = ease(tilt, target, 0.06, dt);
            tiltY = ease(tiltY, targetY, 0.05, dt);

            /* Bob to the music: the low bins carry the beat, and the gain node sits upstream
               of the analyser, so he settles as the track ducks rather than bobbing in silence. */
            var bobbing = !!(analyser && musicPlaying());
            if (bobbing) {
                analyser.getByteFrequencyData(freqBins);
                var lo = 0;
                for (var b = 1; b < 9; b++) { lo += freqBins[b]; }
                beat = ease(beat, lo / (8 * 255), 0.22, dt);
            } else if (beat > 0.0005) {
                beat = ease(beat, 0, 0.1, dt);
            } else {
                beat = 0;
            }

            // these converge asymptotically and never actually arrive, so snap the last hair
            var settled = Math.abs(target - gaze.x) < 0.0005 &&
                Math.abs(target - tilt) < 0.0005 &&
                Math.abs(targetY - tiltY) < 0.0005;
            if (settled) { gaze.x = target; tilt = target; tiltY = targetY; }

            put('--ry', (tilt * 2).toFixed(3) + 'deg');
            put('--tx', (tilt * 6).toFixed(2) + 'px');
            put('--rx', (tiltY * -0.9).toFixed(3) + 'deg');
            put('--ty', (tiltY * 2.5 - beat * 5).toFixed(2) + 'px');

            // nothing left to animate and no clip to watch: park rather than spend a frame
            // writing values that do not change. Anything with work to do calls startTick().
            if (settled && !seg && !gazeOn && !isTouch && !bobbing && !beat) { lastFrame = 0; return; }
            raf = requestAnimationFrame(tick);
        }
        function startTick() { if (!raf) { raf = requestAnimationFrame(tick); } }

        /* --- behaviour ---
           non-focus, headphones round his neck (every visit opens here):
             attentive (eyes follow the cursor, says a few lines, blinks)
             with greeting (hover or click: talks and waves) and react (double tap: laughs or
             goes shy; nav links: idea, shy, greet) on top
           focus, headphones on (the control): plugging (hpOn) -> focus (nods to the beat, the
             rare coffee or glance round) -> unplugging (hpOff, on the control or a click on him)
             -> attentive
           Non-focus never plays a headphones-on clip, and focus never looks at the cursor. */
        var mode = 'attentive';
        var sub = 'gaze';        // attentive only: gaze | talk | idle
        var gen = 0;             // bumps whenever a new behaviour takes over
        var timers = {};

        // retires the "move your cursor" / "tap the character" nudge
        function met() { heroSection.classList.add('hero-met'); }

        function clearTimers() {
            Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
            timers = {};
        }

        function takeOver(nextMode) {
            gen++;
            mode = nextMode;
            syncMusic();          // the headphones going on or off is what you hear
            clearTimers();
            return gen;
        }

        /* --- focus --- */
        // Nodding is the loop; typing is only the fallback for the literal clip table.
        function focusLoop() {
            return CLIPS.nod ? 'nod' : 'typing';
        }

        // the rare break from the nod, alternating so the same one never plays twice running
        var interludeAt = Math.random() < 0.5 ? 0 : 1;
        function nextInterlude() {
            var pool = ['coffee', 'notice'].filter(function (c) { return CLIPS[c]; });
            return pool.length ? pool[interludeAt++ % pool.length] : null;
        }

        function toFocus(keepBubble) {
            var my = takeOver('focus');
            var busy = false;
            playClip(focusLoop(), true);
            if (!keepBubble) { hideBubble(); }
            (function think(wait) {
                timers.chatter = setTimeout(function () {
                    if (my !== gen) { return; }
                    if (!busy) { show(line('working'), 3600); }
                    think(11000 + Math.random() * 6000);
                }, wait);
            })(keepBubble ? 6000 : 3000);
            (function interlude() {
                timers.interlude = setTimeout(function () {
                    if (my !== gen) { return; }
                    var clip = nextInterlude();
                    if (!clip) { return; }
                    busy = true;
                    if (clip === 'coffee') { show(line('coffee'), 3600); }
                    playClip(clip).then(function () {
                        if (my !== gen) { return; }
                        busy = false;
                        playClip(focusLoop(), true);
                        interlude();
                    });
                }, 30000 + Math.random() * 25000);
            })();
        }

        function enterFocus() {
            var my = takeOver('plugging');
            show(line('musicOn'), 3000);
            recenter().then(function () {
                return my === gen ? playClip('hpOn') : null;
            }).then(function () {
                if (my === gen) { toFocus(true); }
            });
        }

        function leaveFocus() {
            var my = takeOver('unplugging');
            hideBubble();
            playClip('hpOff').then(function () {
                if (my === gen) { toAttentive(line('musicOff')); }
            });
        }

        /* --- non-focus --- */
        function speak(my, l) {
            if (!l) { return; }
            show(l, 3600);
            if (l.think) {
                // thinking: settle into the calm idle clip (it has a natural blink)
                sub = 'idle';
                playClip('idle').then(function () {
                    if (my === gen && sub === 'idle') { sub = 'gaze'; showGaze('off'); }
                });
                return;
            }
            sub = 'talk';
            playClip('talk', true);
            timers.talk = setTimeout(function () {
                if (my === gen && sub === 'talk') { sub = 'gaze'; showGaze('off'); }
            }, typeDuration(l.text) + 900);
        }

        // Non-focus is where he stays, so a few lines to introduce himself and then quiet,
        // rather than chatter at someone who is reading. Coming out of focus resets it.
        var CHAT = ['attentive', 'musing', 'attentive'];
        var chatAt = 0;

        function toAttentive(intro) {
            var my = takeOver('attentive');
            sub = 'gaze';
            showGaze('off');
            if (intro) { chatAt = 0; speak(my, intro); }
            (function chat(wait) {
                if (chatAt >= CHAT.length) { return; }
                timers.chatter = setTimeout(function () {
                    if (my !== gen) { return; }
                    if (sub === 'gaze') { speak(my, line(CHAT[chatAt++])); }
                    chat(9000);
                }, wait);
            })(intro ? 7000 : 2600);
            // a still cursor gets the odd blink and smile, so he never freezes on one frame
            (function rest() {
                timers.rest = setTimeout(function () {
                    if (my !== gen) { return; }
                    if (sub === 'gaze' && (isTouch || performance.now() - pointer.at > 4000)) {
                        sub = 'idle';
                        recenter().then(function () {
                            return my === gen && sub === 'idle' ? playClip('idle') : null;
                        }).then(function () {
                            if (my === gen && sub === 'idle') { sub = 'gaze'; showGaze('off'); }
                        });
                    }
                    rest();
                }, 10000 + Math.random() * 8000);
            })();
            armIdle();
        }

        // Alternates the talk-then-wave clip with the plain wave, so hovering him twice does
        // not replay the same thing. The first hello of a visit gets the "oh, hi" line.
        var greetCount = 0;
        function greet() {
            if (deaf()) { return; }
            met();
            var n = greetCount++;
            var my = takeOver('greeting');
            recenter().then(function () {
                if (my !== gen) { return; }
                show(line(n === 0 ? (isTouch ? 'touchGreet' : 'greet') : 'wave'), 3600);
                return playClip(n % 2 && CLIPS.wave ? 'wave' : 'greet');
            }).then(function () {
                if (my === gen) { toAttentive(); }
            });
        }

        var lastReact = 0;
        function react(clip, key) {
            if (deaf()) { return; }
            var now = Date.now();
            if (now - lastReact < 1200) { return; }
            lastReact = now;
            met();
            var my = takeOver('react');
            recenter().then(function () {
                if (my !== gen) { return; }
                show(line(key), 3600);
                return playClip(clip);
            }).then(function () {
                if (my === gen) { toAttentive(); }
            });
        }

        // nobody moving the cursor for a while: a quiet thought, still headphones off
        var idleTimer = null;
        function armIdle() {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(function () {
                if (mode === 'attentive' && sub === 'gaze') { speak(gen, line('idle')); }
            }, isTouch ? 25000 : 15000);
        }

        /* These rects only move when the page scrolls or resizes, so they are measured once
           and reused. Pointer handlers then cost arithmetic instead of a forced layout each. */
        var rects = null;
        function measure() {
            rects = {
                stage: stage.getBoundingClientRect(),
                heroW: heroSection.clientWidth
            };
            return rects;
        }
        function dropRects() { rects = null; }
        window.addEventListener('resize', dropRects);
        window.addEventListener('scroll', dropRects, { passive: true });

        function pointAt(clientX, clientY) {
            var m = rects || measure();
            gaze.tx = Math.max(-1, Math.min(1,
                (clientX - (m.stage.left + m.stage.width * 0.5)) / (m.heroW * 0.42)));
            // the gaze footage only sweeps sideways, so up and down is carried by the lean
            if (typeof clientY === 'number') {
                gaze.ty = Math.max(-1, Math.min(1,
                    (clientY - (m.stage.top + m.stage.height * 0.3)) / (m.stage.height * 0.55)));
            }
        }

        /* A click on him: in focus mode it takes the headphones off, straight away. Otherwise
           a single click greets and a double click (or double tap) laughs or goes shy, so the
           single waits out the double-click window before it commits. */
        var DOUBLE_MS = 280;
        var clickTimer = null;
        var quietUntil = 0;
        var tapCount = 0;
        function onHitClick(e) {
            met();
            if (deaf()) {
                clearTimeout(clickTimer);
                clickTimer = null;
                if (focusOn) { setFocus(false); }
                // the second half of a double click must not also count as a poke
                quietUntil = Date.now() + DOUBLE_MS + 120;
                return;
            }
            if (Date.now() < quietUntil) { return; }
            // keyboard activation has no double: just say hello
            if (e.detail === 0) { greet(); return; }
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
                var clip = tapCount++ % 2 ? 'shy' : 'laugh';
                react(clip, clip);
                armIdle();
                return;
            }
            clickTimer = setTimeout(function () {
                clickTimer = null;
                greet();
                armIdle();
            }, DOUBLE_MS);
        }

        if (reduceMotion) {
            // a still, friendly frame instead of motion
            clipsReady.then(function () {
                var still = function () { videoA.currentTime = CLIPS.idle[0] + 0.5; };
                if (videoA.readyState >= 1) { still(); } else { videoA.addEventListener('loadedmetadata', still, { once: true }); }
            });
            show(line('greet'), 0);
            hit.addEventListener('click', function () {
                if (focusOn) { setFocus(false); } else { show(line('attentive'), 0); }
            });
        } else {
            // neither his first frame nor his first line should play out behind the curtain
            stage.classList.add('hero-intro');
            onCurtainUp(function () {
                // the entrance is purely visual, so it never waits on the clip table
                stage.classList.add('hero-ready');
                clipsReady.then(function () { if (mode === 'attentive') { toAttentive(); } });
            });
            startTick();

            hit.addEventListener('click', onHitClick);

            if (!isTouch) {
                var hoverGreetAt = 0;

                heroSection.addEventListener('mousemove', function (e) {
                    pointAt(e.clientX, e.clientY);
                    pointer.at = performance.now();
                    startTick();
                    if (deaf()) { return; }
                    armIdle();
                    if (mode === 'attentive' && sub === 'idle') {
                        sub = 'gaze';
                        showGaze('off');
                    }
                });

                // hovering him says hello, but not over and over while the cursor rests there
                hit.addEventListener('mouseenter', function () {
                    var now = Date.now();
                    if (mode !== 'attentive' || now < hoverGreetAt) { return; }
                    hoverGreetAt = now + 8000;
                    greet();
                });

                var leftAt = 0;
                var leaveLineAt = 0;
                heroSection.addEventListener('mouseleave', function () {
                    gaze.tx = 0;
                    gaze.ty = 0;
                    startTick();
                    if (mode !== 'attentive') { return; }
                    var now = Date.now();
                    leftAt = now;
                    if (now < leaveLineAt) { return; }
                    leaveLineAt = now + 20000;
                    show(line('leave'), 2600);
                });

                heroSection.addEventListener('mouseenter', function () {
                    var back = leftAt && Date.now() - leftAt < 6000;
                    leftAt = 0;
                    if (back && mode === 'attentive') { show(line('return'), 2600); }
                });

                // data-hero-react names the line, data-hero-clip the clip to play with it
                $$('[data-hero-react]').forEach(function (el) {
                    el.addEventListener('mouseenter', function () {
                        // not while he is off screen, and never in focus mode
                        if (!inView || deaf()) { return; }
                        react(el.getAttribute('data-hero-clip') || 'idea',
                            el.getAttribute('data-hero-react'));
                    });
                });
            } else {
                // a tap anywhere else: he looks over at it
                heroSection.addEventListener('pointerdown', function (e) {
                    if (e.target === hit || e.target.closest('a, button')) { return; }
                    if (deaf()) { return; }
                    met();
                    pointAt(e.clientX, e.clientY);
                    wander.holdUntil = performance.now() + 2500;
                    armIdle();
                });
            }

            // stop decoding while the hero is off screen or the tab is hidden
            var heroVisible = true;
            function resume() {
                if (!heroVisible || document.hidden) { return; }
                inView = true;
                if (seg && !gazeOn) { safePlay(active); }
                startTick();
            }
            function suspend() {
                inView = false;
                lastFrame = 0;
                videoA.pause();
                videoB.pause();
            }
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(function (entries) {
                    heroVisible = entries[0].isIntersecting;
                    if (heroVisible) { resume(); } else { suspend(); }
                }, { threshold: 0.05 }).observe(heroSection);
            }
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) { suspend(); } else { resume(); }
            });

            /* Turning the OS setting on mid-session used to need a reload. This parks him on a
               still frame rather than rebuilding the reduced-motion path; turning it back off
               does still need a reload. */
            var motionPref = window.matchMedia('(prefers-reduced-motion: reduce)');
            if (motionPref.addEventListener) {
                motionPref.addEventListener('change', function (e) {
                    if (!e.matches) { return; }
                    clearTimers();
                    clearTimeout(idleTimer);
                    hideBubble();
                    if (raf) { cancelAnimationFrame(raf); raf = null; }
                    seg = null;
                    videoA.pause();
                    videoB.pause();
                    gazeVideo.pause();
                    stage.classList.remove('hero-intro');
                    stage.classList.add('hero-ready');
                });
            }
        }
    }

    /* ---------- contact form ---------- */
    var form = $('#contactForm');
    var toast = $('#toast');
    var toastTimer;

    function showToast(message, type) {
        if (!toast) { return; }
        toast.className = 'toast ' + type + ' show';
        toast.textContent = message;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 4000);
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var fields = ['#contact-name', '#contact-email', '#contact-subject', '#contact-message'];
            var values = {};
            var missing = false;

            fields.forEach(function (sel) {
                var el = $(sel);
                var value = el.value.trim();
                values[el.id] = value;
                el.classList.toggle('invalid', !value);
                if (!value) { missing = true; }
            });

            if (missing) {
                showToast('Please complete every field before sending.', 'error');
                return;
            }

            var email = values['contact-email'];
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                $('#contact-email').classList.add('invalid');
                showToast('That email address does not look right.', 'error');
                return;
            }

            var permission = $('#permission');
            if (permission && !permission.checked) {
                showToast('Please tick the permission box so I can reply to you.', 'error');
                return;
            }

            var subject = 'Portfolio contact: ' + values['contact-subject'];

            function openMailApp(note) {
                var body = 'Name: ' + values['contact-name']
                    + '\nEmail: ' + email
                    + '\n\n' + values['contact-message'];
                showToast(note, 'success');
                window.location.href = 'mailto:subhadip.dutta.18@gmail.com'
                    + '?subject=' + encodeURIComponent(subject)
                    + '&body=' + encodeURIComponent(body);
            }

            // the spam trap is invisible to people: if it's ticked, a bot filled the form
            if (form.querySelector('[name="botcheck"]').checked) {
                form.reset();
                showToast('Thanks! Your message is on its way. I’ll reply soon.', 'success');
                return;
            }

            // posts into the Google Form; if the network fails, fall back to the visitor's email app
            var endpoint = form.getAttribute('data-google-form');
            if (!endpoint || !window.fetch) {
                openMailApp('Opening your email client to send the message.');
                return;
            }

            var button = form.querySelector('.send-btn');
            button.disabled = true;
            showToast('Sending…', 'success');

            var data = new URLSearchParams();
            ['#contact-name', '#contact-email', '#contact-subject', '#contact-message'].forEach(function (sel) {
                var el = $(sel);
                data.append(el.name, el.value.trim());
            });

            // Google Forms doesn't allow cross-origin reads, so the response is opaque: a resolved
            // request means it was delivered, only a network error rejects
            fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data })
                .then(function () {
                    form.reset();
                    showToast('Thanks! Your message is on its way. I’ll reply soon.', 'success');
                })
                .catch(function () {
                    openMailApp('Couldn’t send from here, so opening your email client instead.');
                })
                .then(function () {
                    button.disabled = false;
                });
        });

        form.querySelectorAll('input, textarea').forEach(function (el) {
            el.addEventListener('input', function () { el.classList.remove('invalid'); });
        });
    }

    /* ---------- footer year ---------- */
    var year = String(new Date().getFullYear());
    var footerYear = $('#footer-year');
    if (footerYear) { footerYear.textContent = year; }
    $$('.year').forEach(function (el) { el.textContent = year; });

    /* ---------- bind ---------- */
    var ticking = false;
    window.addEventListener('scroll', function () {
        if (ticking) { return; }
        ticking = true;
        window.requestAnimationFrame(function () {
            onScroll();
            ticking = false;
        });
    }, { passive: true });

    window.addEventListener('resize', function () {
        measurePaths();
        syncRails();
        onScroll();
    });

    onScroll();
})();

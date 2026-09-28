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
    var preloader = $('#preloader');
    if (preloader) {
        if (document.documentElement.classList.contains('is-returning')) {
            preloader.remove();
        } else {
            var dismiss = function () {
                preloader.classList.add('done');
                setTimeout(function () { preloader.remove(); }, 1200);
            };
            setTimeout(dismiss, reduceMotion ? 200 : 2100);
            try { localStorage.setItem('sd-visited', '1'); } catch (err) { /* private mode: it just plays again */ }
        }
    }

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

        revealItems.forEach(function (el) { observer.observe(el); });
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

        var nextIndex = {};
        function line(key) {
            var entry = LINES[key];
            if (!entry) { return null; }
            if (Array.isArray(entry)) { entry = { type: 'say', lines: entry }; }
            if (!entry.lines || !entry.lines.length) { return null; }
            var i = nextIndex[key] || 0;
            nextIndex[key] = (i + 1) % entry.lines.length;
            return { think: entry.type === 'think', text: String(entry.lines[i]), pop: entry.pop };
        }

        if (hintText && LINES.hint) {
            var hint = isTouch ? LINES.hint.touch : LINES.hint.pointer;
            if (hint) { hintText.textContent = hint; }
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
        var typeTimer = null;

        function escapeHtml(str) {
            return str.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
        }

        function hideBubble() {
            clearTimeout(bubbleTimer);
            clearInterval(typeTimer);
            bubble.classList.remove('is-shown');
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
                    bubbleText.innerHTML = '<span class="hero-dots"><i></i><i></i><i></i></span>';
                    bubble.classList.add('is-shown');
                    bubbleTimer = setTimeout(function () {
                        bubbleText.textContent = l.text;
                        done();
                    }, 750);
                } else {
                    var chars = Array.from(l.text);
                    var typed = 0;
                    var render = function () {
                        bubbleText.innerHTML = escapeHtml(chars.slice(0, typed).join('')) +
                            '<span class="hero-bubble-rest">' + escapeHtml(chars.slice(typed).join('')) + '</span>';
                    };
                    render();
                    bubble.classList.add('is-shown');
                    typeTimer = setInterval(function () {
                        typed++;
                        render();
                        if (typed >= chars.length) { clearInterval(typeTimer); done(); }
                    }, 30);
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
            typing: [0.0, 2.4583],     // headphones on, typing (seamless loop)
            notice: [2.4583, 5.7917],  // looks around, then at the visitor
            hpOff: [5.7917, 9.0417],   // headphones down to the neck
            hpOn: [9.0417, 12.2917],   // and back on
            idle: [12.2917, 17.3333],  // headphones off: calm smile, a blink
            talk: [17.3333, 22.3333],  // mouth moving, hands down (loops)
            greet: [22.3333, 27.375],  // talks, then waves
            wave: [27.375, 31.0],
            laugh: [31.0, 36.0417],
            idea: [36.0417, 41.0833],  // raised "one moment" finger
            flinch: [41.0833, 46.125],
            shy: [46.125, 51.1667]
        };
        // `center` is the frame index at which he faces forward
        var GAZE = {
            on: { start: 0, frames: 42, center: 16.5 },
            off: { start: 1.75, frames: 44, center: 18.5 }
        };
        var FRAME = 1 / 24;
        var FADE_MS = 320;

        var active = videoA;
        var standby = videoB;
        var seg = null;          // clip being monitored: { from, to, loop, resolve, jumping }
        var inView = true;
        var gazeOn = false;      // the gaze layer is what's showing
        var gazeState = 'on';
        var gazeToken = 0;
        var gaze = { x: 0, tx: 0, frame: -1 };

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
        function gazeIndex(x, g) {
            var idx = x < 0 ? g.center * (1 + x) : g.center + x * (g.frames - 1 - g.center);
            return Math.max(0, Math.min(g.frames - 1, Math.round(idx)));
        }

        function setGazeFrame(force) {
            var g = GAZE[gazeState];
            var idx = gazeIndex(gaze.x, g);
            if (!force && (idx === gaze.frame || gazeVideo.seeking)) { return; }
            gaze.frame = idx;
            gazeVideo.currentTime = g.start + (idx + 0.5) * FRAME;
        }

        function showGaze(state) {
            seg = null;
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
            return new Promise(function (resolve) {
                var startedAt = Date.now();
                (function wait() {
                    if (Math.abs(gaze.x) < 0.1 || Date.now() - startedAt > 450) { holdCenter = false; resolve(); return; }
                    setTimeout(wait, 30);
                })();
            });
        }

        /* --- per-frame loop: clip ends, gaze easing, tilt, phone eye-wander --- */
        var tilt = 0;
        var wander = { next: 0, holdUntil: 0 };
        var raf = null;
        function tick(now) {
            raf = null;
            if (!inView) { return; }
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
            // phones have no pointer: let his eyes wander, with the odd quick glance
            if (isTouch && now > wander.holdUntil && now > wander.next) {
                gaze.tx = Math.random() * 1.6 - 0.8;
                wander.next = now + 1200 + Math.random() * 2200;
            }
            var target = holdCenter ? 0 : gaze.tx;
            gaze.x += (target - gaze.x) * (holdCenter ? 0.3 : isTouch ? 0.07 : 0.16);
            if (gazeOn) { setGazeFrame(false); }
            tilt += (target - tilt) * 0.06;
            actor.style.setProperty('--ry', (tilt * 2).toFixed(3) + 'deg');
            actor.style.setProperty('--tx', (tilt * 6).toFixed(2) + 'px');
            raf = requestAnimationFrame(tick);
        }
        function startTick() { if (!raf) { raf = requestAnimationFrame(tick); } }

        /* --- behaviour ---
           work (headphones on, typing, thinking) -> watch (eyes follow the cursor)
           -> greeting (headphones off, talks and waves) -> attentive (eyes follow the
           cursor, chats, blinks) with reactions (shy, wave, flinch, laugh, idea) on top */
        var mode = 'work';
        var sub = 'gaze';        // attentive only: gaze | talk | idle
        var gen = 0;             // bumps whenever a new behaviour takes over
        var timers = {};

        function clearTimers() {
            Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
            timers = {};
        }

        function takeOver(nextMode) {
            gen++;
            mode = nextMode;
            clearTimers();
            return gen;
        }

        function toWork(keepBubble) {
            var my = takeOver('work');
            playClip('typing', true);
            if (!keepBubble) { hideBubble(); }
            (function think(wait) {
                timers.chatter = setTimeout(function () {
                    if (my !== gen) { return; }
                    show(line('working'), 3600);
                    think(6200);
                }, wait);
            })(keepBubble ? 4200 : 1500);
        }

        function toWatch() {
            var my = takeOver('watch');
            show(line(gaze.tx < 0 ? 'noticeLeft' : 'noticeRight'), 0);
            showGaze('on');
            // a visitor who sticks around gets a proper hello
            timers.greet = setTimeout(function () { if (my === gen) { greet(false); } }, 2800);
        }

        function greet(viaTouch) {
            var my = takeOver('greeting');
            var chain = viaTouch ? playClip('notice') : recenter();
            chain.then(function () {
                if (my !== gen) { return; }
                return playClip('hpOff');
            }).then(function () {
                if (my !== gen) { return; }
                show(line(viaTouch ? 'touchGreet' : 'greet'), 3600);
                return playClip('greet');
            }).then(function () {
                if (my === gen) { toAttentive(); }
            });
        }

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
            }, Array.from(l.text).length * 30 + 900);
        }

        function toAttentive() {
            var my = takeOver('attentive');
            sub = 'gaze';
            showGaze('off');
            var keys = ['attentive', 'musing', 'attentive'];
            var k = 0;
            (function chat(wait) {
                timers.chatter = setTimeout(function () {
                    if (my !== gen) { return; }
                    speak(my, line(keys[k++ % keys.length]));
                    chat(7000);
                }, wait);
            })(2600);
            armIdle();
        }

        var lastReact = 0;
        function react(clip, key) {
            var now = Date.now();
            if (now - lastReact < 1200) { return; }
            lastReact = now;
            var headsetOn = mode === 'work' || mode === 'watch';
            var my = takeOver('react');
            var chain = recenter();
            if (headsetOn) {
                chain = chain.then(function () { return my === gen ? playClip('hpOff') : null; });
            }
            chain.then(function () {
                if (my !== gen) { return; }
                show(line(key), 3600);
                return playClip(clip);
            }).then(function () {
                if (my === gen) { toAttentive(); }
            });
        }

        function backToWork(intro) {
            var my = takeOver('leaving');
            if (intro) { show(intro, 3000); }
            recenter().then(function () {
                return my === gen ? playClip('hpOn') : null;
            }).then(function () {
                if (my === gen) { toWork(!!intro); }
            });
        }

        // nobody around for a while: drift back to work
        var idleTimer = null;
        function armIdle() {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(function () {
                if (mode !== 'attentive') { return; }
                show(line('idle'), 2800);
                timers.leave = setTimeout(function () {
                    if (mode === 'attentive') { backToWork(line('backToWork')); }
                }, 3200);
            }, isTouch ? 25000 : 15000);
        }

        function stageFraction(clientX, clientY) {
            var r = hit.getBoundingClientRect();
            return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
        }

        // upper part of the character is his face
        function zoneAt(clientX, clientY) {
            return stageFraction(clientX, clientY).y < 0.42 ? 'face' : 'body';
        }

        function headCenter() {
            var r = stage.getBoundingClientRect();
            return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.3 };
        }

        function pointAt(clientX) {
            var dx = clientX - headCenter().x;
            gaze.tx = Math.max(-1, Math.min(1, dx / (heroSection.clientWidth * 0.42)));
        }

        var tapCount = 0;
        function poke(zone) {
            if (mode === 'work' || mode === 'watch') { greet(isTouch); return; }
            tapCount++;
            if (zone === 'face') { react(tapCount % 2 ? 'flinch' : 'shy', tapCount % 2 ? 'flinch' : 'shy'); }
            else { react(tapCount % 2 ? 'laugh' : 'wave', tapCount % 2 ? 'laugh' : 'wave'); }
            armIdle();
        }

        if (reduceMotion) {
            // a still, friendly frame instead of motion
            var still = function () { videoA.currentTime = CLIPS.idle[0] + 0.5; };
            if (videoA.readyState >= 1) { still(); } else { videoA.addEventListener('loadedmetadata', still, { once: true }); }
            show(line('greet'), 0);
            hit.addEventListener('click', function () { show(line('attentive'), 0); });
        } else {
            toWork(false);
            startTick();

            if (!isTouch) {
                var lastZone = null;
                var zoneCooldown = { face: 0, body: 0 };

                heroSection.addEventListener('mousemove', function (e) {
                    pointAt(e.clientX);
                    armIdle();
                    clearTimeout(timers.leave);
                    if (mode === 'work') { toWatch(); }
                    else if (mode === 'attentive' && sub === 'idle') { sub = 'gaze'; showGaze('off'); }
                });

                hit.addEventListener('mousemove', function (e) {
                    var zone = zoneAt(e.clientX, e.clientY);
                    if (zone === lastZone) { return; }
                    lastZone = zone;
                    var now = Date.now();
                    if (mode === 'work' || mode === 'watch') { greet(false); return; }
                    if (mode !== 'attentive' || now < zoneCooldown[zone]) { return; }
                    zoneCooldown[zone] = now + (zone === 'face' ? 7000 : 9000);
                    if (zone === 'face') { react('shy', 'shy'); } else { react('wave', 'wave'); }
                });
                hit.addEventListener('mouseleave', function () { lastZone = null; });

                hit.addEventListener('click', function (e) {
                    // keyboard activation has no pointer position: treat it as a body poke
                    poke(e.detail === 0 ? 'body' : zoneAt(e.clientX, e.clientY));
                });

                // kept apart from `timers`: a reaction finishing must not cancel the goodbye
                var leaveTimer = null;
                heroSection.addEventListener('mouseleave', function () {
                    gaze.tx = 0;
                    if (mode === 'work') { return; }
                    if (mode === 'watch') { toWork(false); return; }
                    show(line('leave'), 2600);
                    clearTimeout(leaveTimer);
                    leaveTimer = setTimeout(function () {
                        leaveTimer = null;
                        if (mode !== 'work' && mode !== 'leaving') { backToWork(line('backToWork')); }
                    }, 3200);
                });

                heroSection.addEventListener('mouseenter', function () {
                    if (!leaveTimer) { return; }
                    clearTimeout(leaveTimer);
                    leaveTimer = null;
                    if (mode !== 'work' && mode !== 'leaving') { show(line('return'), 2600); }
                });

                $$('[data-hero-react]').forEach(function (el) {
                    el.addEventListener('mouseenter', function () {
                        var key = el.getAttribute('data-hero-react');
                        react(key === 'contact' ? 'greet' : 'idea', key);
                    });
                });
            } else {
                // phones: say hello by himself once the hero has been on screen a moment
                setTimeout(function () {
                    if (mode === 'work') { greet(true); }
                }, 3200);

                hit.addEventListener('click', function (e) {
                    poke(zoneAt(e.clientX, e.clientY));
                });

                // a tap anywhere else: he looks over at it
                heroSection.addEventListener('pointerdown', function (e) {
                    if (e.target === hit || e.target.closest('a, button')) { return; }
                    pointAt(e.clientX);
                    wander.holdUntil = performance.now() + 2500;
                    armIdle();
                    if (mode === 'work') { greet(true); }
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

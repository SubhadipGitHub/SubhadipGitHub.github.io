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
    var preloader = $('#preloader');
    if (preloader) {
        var dismiss = function () {
            preloader.classList.add('done');
            setTimeout(function () { preloader.remove(); }, 1200);
        };
        setTimeout(dismiss, reduceMotion ? 200 : 2100);
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

    /* ---------- hero character: zone-driven animated sequence ---------- */
    var heroSection = $('#home');
    var frameA = $('#hero-frame-a');
    var frameB = $('#hero-frame-b');
    var characterEl = $('#hero-character');
    var hintTextEl = $('#hero-hint-text');

    if (heroSection && frameA && frameB && characterEl && hintTextEl) {
        var FRAME_DIR = 'images/hero-frames/';
        var FRAME_COUNT = 133;
        var FPS = 12;
        var FRAME_MS = 1000 / FPS;
        var DEFAULT_HINT = 'Move cursor to call me!';

        // Reduced-frame index ranges within the exported sequence (see
        // images/hero-frames): idle typing loop, noticing the visitor,
        // settling, headset off, headset-to-neck + smile, wave, point.
        var CLIPS = {
            idle: [0, 14],
            look: [14, 49],
            settle: [49, 58],
            headsetOff: [58, 71],
            neck: [71, 94],
            wave: [94, 116],
            point: [116, 132]
        };

        var supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (!supportsHover) { heroSection.classList.add('is-touch'); }

        function frameUrl(i) {
            var n = ('000' + i).slice(-4);
            return FRAME_DIR + 'frame_' + n + '.webp';
        }

        // preload the sequence so playback never stalls waiting on the network
        if (!reduceMotion) {
            for (var p = 0; p < FRAME_COUNT; p++) {
                var pre = new Image();
                pre.src = frameUrl(p);
            }
        }

        var active = frameA;
        var incoming = frameB;

        function showFrame(i) {
            active.src = frameUrl(i);
        }

        function crossfadeTo(i) {
            return new Promise(function (resolve) {
                incoming.src = frameUrl(i);
                incoming.classList.add('is-visible');
                active.classList.remove('is-visible');
                var swap = active; active = incoming; incoming = swap;
                setTimeout(resolve, 400);
            });
        }

        function delay(ms) {
            return new Promise(function (resolve) { setTimeout(resolve, ms); });
        }

        function playRange(from, to, token) {
            return new Promise(function (resolve) {
                var dir = to >= from ? 1 : -1;
                var f = from;
                var last = null;
                var acc = 0;
                showFrame(f);
                function step(now) {
                    if (token.cancelled) { resolve(); return; }
                    if (last === null) { last = now; }
                    acc += now - last;
                    last = now;
                    var moved = false;
                    while (acc >= FRAME_MS && f !== to) {
                        acc -= FRAME_MS;
                        f += dir;
                        moved = true;
                    }
                    if (moved) { showFrame(f); }
                    if (f === to) { resolve(); return; }
                    token.raf = requestAnimationFrame(step);
                }
                token.raf = requestAnimationFrame(step);
            });
        }

        var currentMessage = '';
        function setMessage(text) {
            if (text === currentMessage) { return; }
            currentMessage = text;
            hintTextEl.classList.add('is-fading');
            setTimeout(function () {
                hintTextEl.textContent = text;
                hintTextEl.classList.remove('is-fading');
            }, 180);
        }

        function setMirror(on) {
            characterEl.classList.toggle('is-mirrored', on);
        }

        function newToken() {
            return { cancelled: false, raf: null };
        }

        var idleToken = null;
        function stopIdle() {
            if (idleToken) {
                idleToken.cancelled = true;
                if (idleToken.raf) { cancelAnimationFrame(idleToken.raf); }
                idleToken = null;
            }
        }
        function startIdle() {
            stopIdle();
            var token = newToken();
            idleToken = token;
            (function loop() {
                if (token.cancelled) { return; }
                playRange(CLIPS.idle[0], CLIPS.idle[1], token).then(function () {
                    if (token.cancelled) { return; }
                    playRange(CLIPS.idle[1], CLIPS.idle[0], token).then(function () {
                        if (token.cancelled) { return; }
                        loop();
                    });
                });
            })();
        }

        var mainToken = null;

        function runSideReaction(zone, token) {
            setMirror(zone === 'left');
            setMessage(zone === 'left' ? 'Anyone here on the left?' : 'Anyone here on the right?');
            return crossfadeTo(CLIPS.look[0]).then(function () {
                if (token.cancelled) { return; }
                return playRange(CLIPS.look[0], CLIPS.look[1], token);
            }).then(function () {
                if (token.cancelled) { return; }
                return delay(2400);
            });
        }

        function runGreeting(token) {
            setMirror(false);
            setMessage('Hey, it’s you!');
            return crossfadeTo(CLIPS.look[0]).then(function () {
                if (token.cancelled) { return; }
                return playRange(CLIPS.look[0], CLIPS.settle[1], token);
            }).then(function () {
                if (token.cancelled) { return; }
                setMessage('Hiiii!');
                return playRange(CLIPS.settle[1], CLIPS.wave[1], token);
            }).then(function () {
                if (token.cancelled) { return; }
                return delay(250);
            }).then(function () {
                if (token.cancelled) { return; }
                setMessage('Check out the portfolio');
                return playRange(CLIPS.wave[1], CLIPS.point[1], token);
            }).then(function () {
                if (token.cancelled) { return; }
                return delay(2200);
            });
        }

        function runZone(zone) {
            stopIdle();
            if (mainToken) { mainToken.cancelled = true; if (mainToken.raf) { cancelAnimationFrame(mainToken.raf); } }
            var token = newToken();
            mainToken = token;

            var seq = (zone === 'left' || zone === 'right') ? runSideReaction(zone, token) : runGreeting(token);

            seq.then(function () {
                if (token.cancelled) { return; }
                return crossfadeTo(CLIPS.idle[0]);
            }).then(function () {
                if (token.cancelled) { return; }
                setMirror(false);
                setMessage(DEFAULT_HINT);
                startIdle();
            });
        }

        if (reduceMotion) {
            showFrame(0);
            frameA.classList.add('is-visible');
        } else {
            startIdle();

            if (supportsHover) {
                var lastZone = null;
                var pendingZone = null;
                var zoneTimer = null;

                function zoneFromClientX(clientX) {
                    var rect = heroSection.getBoundingClientRect();
                    var rel = (clientX - rect.left) / rect.width;
                    if (rel < 0.33) { return 'left'; }
                    if (rel > 0.67) { return 'right'; }
                    return 'center';
                }

                function handleMove(e) {
                    var zone = zoneFromClientX(e.clientX);
                    if (zone === lastZone || zone === pendingZone) { return; }
                    pendingZone = zone;
                    clearTimeout(zoneTimer);
                    zoneTimer = setTimeout(function () {
                        lastZone = zone;
                        pendingZone = null;
                        runZone(zone);
                    }, 90);
                }

                heroSection.addEventListener('mouseenter', handleMove);
                heroSection.addEventListener('mousemove', handleMove);
                heroSection.addEventListener('mouseleave', function () {
                    lastZone = null;
                    pendingZone = null;
                    clearTimeout(zoneTimer);
                });
            } else {
                heroSection.addEventListener('pointerup', function () {
                    runZone('center');
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

            var body = 'Name: ' + values['contact-name']
                + '\nEmail: ' + email
                + '\n\n' + values['contact-message'];

            var mailto = 'mailto:subhadip.dutta.18@gmail.com'
                + '?subject=' + encodeURIComponent('Portfolio contact: ' + values['contact-subject'])
                + '&body=' + encodeURIComponent(body);

            showToast('Opening your email client to send the message.', 'success');
            window.location.href = mailto;
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

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

    /* ---------- hero character: cursor-reactive video with thought & speech bubbles ---------- */
    var heroSection = $('#home');
    var stage = $('#hero-stage');
    var actor = $('#hero-actor');
    var hit = $('#hero-hit');
    var videoA = $('#hero-video-a');
    var videoB = $('#hero-video-b');
    var bubble = $('#hero-bubble');
    var bubbleText = $('#hero-bubble-text');
    var hintText = $('#hero-hint-text');
    var linesEl = $('#hero-lines');

    if (heroSection && stage && actor && hit && videoA && videoB && bubble && bubbleText) {
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

        /* --- clips: time ranges (seconds) of videos/hero-character.mp4 --- */
        var CLIPS = {
            typing: [0.05, 1.25],     // headphones on, typing
            lookLeft: [1.3, 2.1],     // head turns to the screen's left
            lookRight: [2.45, 3.1],   // head forward, eyes to the screen's right
            lookUp: [3.9, 4.55],      // curious, facing the visitor
            headsetOff: [4.6, 7.2],   // headphones down to the neck
            smile: [7.2, 7.9],        // attentive, smiling
            wave: [7.95, 9.55],
            idea: [9.6, 10.1],        // finger up
            point: [10.1, 11.0]       // points at the visitor
        };
        var FADE_MS = 320;

        var active = videoA;
        var standby = videoB;
        var seg = null;      // { to, from, loop, resolve, jumping }
        var inView = true;

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

        // Plays a clip; resolves when a one-shot clip reaches its end (and holds that frame).
        function playClip(name, loop) {
            var c = CLIPS[name];
            return new Promise(function (resolve) {
                seg = { from: c[0], to: c[1], loop: !!loop, resolve: resolve, jumping: false };
                var mine = seg;
                if (!pendingJump && Math.abs(active.currentTime - c[0]) < 0.12) {
                    if (inView) { safePlay(active); }
                } else {
                    mine.jumping = true;
                    jumpTo(c[0]).then(function () { mine.jumping = false; });
                }
                if (loop) { resolve(); }
            });
        }

        /* --- pointer-driven tilt --- */
        var tilt = { x: 0, tx: 0 };

        var raf = null;
        function tick(now) {
            raf = null;
            if (!inView) { return; }
            if (seg && !seg.jumping) {
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
            if (isTouch && !reduceMotion) {
                // gentle sway so the character never looks frozen on phones
                tilt.tx = Math.sin(now / 1700) * 0.35;
            }
            tilt.x += (tilt.tx - tilt.x) * 0.08;
            actor.style.setProperty('--ry', (tilt.x * 4).toFixed(3) + 'deg');
            actor.style.setProperty('--tx', (tilt.x * 10).toFixed(2) + 'px');
            raf = requestAnimationFrame(tick);
        }
        function startTick() { if (!raf) { raf = requestAnimationFrame(tick); } }

        /* --- behaviour --- */
        // mode: work (headphones on, typing) > curious (glancing at the cursor) >
        //       greeting > attentive (headphones off, chatting) / react (wave, point)
        var mode = 'work';
        var gen = 0;          // bumps whenever a new behaviour takes over
        var chatterTimer = null;
        var greetTimer = null;
        var leaveTimer = null;
        var idleTimer = null;
        var lookSide = null;
        var lastLook = 0;

        function takeOver(nextMode) {
            gen++;
            mode = nextMode;
            clearTimeout(chatterTimer);
            clearTimeout(greetTimer);
            clearTimeout(leaveTimer);
            return gen;
        }

        function chatter(my, keys, delay, every, hold) {
            var k = 0;
            (function loop(wait) {
                chatterTimer = setTimeout(function () {
                    if (my !== gen) { return; }
                    show(line(keys[k % keys.length]), hold);
                    k++;
                    loop(every);
                }, wait);
            })(delay);
        }

        function toWork(intro) {
            var my = takeOver('work');
            lookSide = null;
            playClip('typing', true);
            if (intro) { show(intro, 2600); } else { hideBubble(); }
            chatter(my, ['working'], intro ? 4200 : 1400, 6000, 3600);
        }

        function toAttentive() {
            var my = takeOver('attentive');
            playClip('smile', true);
            chatter(my, ['attentive', 'attentive', 'musing'], 3000, 6500, 4200);
            armIdle();
        }

        function greet(viaTouch) {
            var my = takeOver('greeting');
            playClip('lookUp').then(function () {
                if (my !== gen) { return; }
                show(line(viaTouch ? 'touchGreet' : 'greet'), 0);
                return playClip('headsetOff');
            }).then(function () {
                if (my !== gen) { return; }
                toAttentive();
            });
        }

        function lookToward(side) {
            if (mode !== 'work' && mode !== 'curious') { return; }
            var now = Date.now();
            if (side === lookSide || now - lastLook < 650) { return; }
            lastLook = now;
            lookSide = side;
            if (mode === 'work') {
                var my = takeOver('curious');
                // a visitor who sticks around gets a proper hello
                greetTimer = setTimeout(function () { if (my === gen) { greet(false); } }, 3200);
            }
            show(line(side === 'left' ? 'noticeLeft' : 'noticeRight'), 0);
            playClip(side === 'left' ? 'lookLeft' : 'lookRight');
        }

        var lastReact = 0;
        function react(clips, key) {
            var now = Date.now();
            if (mode === 'react' && now - lastReact < 1500) { return; }
            lastReact = now;
            var headsetOn = mode === 'work' || mode === 'curious';
            var my = takeOver('react');
            var chain = headsetOn ? playClip('headsetOff') : Promise.resolve();
            chain = chain.then(function () {
                if (my !== gen) { return; }
                show(line(key), 3600);
            });
            clips.forEach(function (name) {
                chain = chain.then(function () {
                    if (my !== gen) { return; }
                    return playClip(name);
                });
            });
            chain.then(function () {
                // let a point land before relaxing
                return new Promise(function (r) { setTimeout(r, clips[clips.length - 1] === 'point' ? 1100 : 0); });
            }).then(function () {
                if (my !== gen) { return; }
                toAttentive();
            });
        }

        // no pointer activity for a while: drift back to work
        function armIdle() {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(function () {
                if (mode !== 'attentive') { return; }
                show(line('idle'), 2800);
                leaveTimer = setTimeout(function () {
                    if (mode === 'attentive') { toWork(line('backToWork')); }
                }, 3200);
            }, isTouch ? 22000 : 14000);
        }

        function headCenter() {
            var r = stage.getBoundingClientRect();
            return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.32 };
        }

        var clickCount = 0;
        function poke() {
            if (mode === 'work' || mode === 'curious') { greet(isTouch); return; }
            clickCount++;
            react(clickCount % 2 ? ['wave'] : ['idea', 'point'], clickCount % 2 ? 'click' : 'wave');
            armIdle();
        }

        if (reduceMotion) {
            // a still, friendly frame instead of motion
            var still = function () { videoA.currentTime = 7.6; };
            if (videoA.readyState >= 1) { still(); } else { videoA.addEventListener('loadedmetadata', still, { once: true }); }
            show(line('greet'), 0);
            hit.addEventListener('click', function () { show(line('attentive'), 0); });
        } else {
            toWork(null);
            startTick();

            hit.addEventListener('click', poke);

            if (!isTouch) {
                var lastX = 0;
                var moveQueued = false;
                heroSection.addEventListener('mousemove', function (e) {
                    lastX = e.clientX;
                    armIdle();
                    clearTimeout(leaveTimer);
                    if (moveQueued) { return; }
                    moveQueued = true;
                    requestAnimationFrame(function () {
                        moveQueued = false;
                        var dx = lastX - headCenter().x;
                        var w = heroSection.clientWidth;
                        tilt.tx = Math.max(-1, Math.min(1, dx / (w * 0.45)));
                        if (Math.abs(dx) > w * 0.1) { lookToward(dx < 0 ? 'left' : 'right'); }
                    });
                });

                hit.addEventListener('mouseenter', function () {
                    if (mode === 'work' || mode === 'curious') { greet(false); }
                    else if (mode === 'attentive') { react(['wave'], 'wave'); }
                });

                heroSection.addEventListener('mouseleave', function () {
                    tilt.tx = 0;
                    if (mode === 'work') { return; }
                    if (mode === 'curious') { toWork(null); return; }
                    show(line('leave'), 2600);
                    clearTimeout(leaveTimer);
                    leaveTimer = setTimeout(function () { toWork(line('backToWork')); }, 3200);
                });

                heroSection.addEventListener('mouseenter', function () {
                    if (leaveTimer && mode !== 'work') {
                        clearTimeout(leaveTimer);
                        leaveTimer = null;
                        show(line('return'), 2600);
                    }
                });

                $$('[data-hero-react]').forEach(function (el) {
                    el.addEventListener('mouseenter', function () {
                        react(['idea', 'point'], el.getAttribute('data-hero-react'));
                    });
                });
            } else {
                // phones: say hello by himself once the hero has been on screen a moment
                setTimeout(function () {
                    if (mode !== 'work') { return; }
                    lookToward('right');
                    setTimeout(function () { if (mode === 'curious') { greet(true); } }, 1100);
                }, 3200);

                heroSection.addEventListener('pointerdown', function (e) {
                    var h = headCenter();
                    tilt.tx = Math.max(-1, Math.min(1, (e.clientX - h.x) / (heroSection.clientWidth * 0.5)));
                    armIdle();
                });
            }

            // stop decoding while the hero is off screen or the tab is hidden
            var heroVisible = true;
            function resume() {
                if (!heroVisible || document.hidden) { return; }
                inView = true;
                if (seg) { safePlay(active); }
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

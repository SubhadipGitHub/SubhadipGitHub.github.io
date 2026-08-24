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

    /* ---------- hero video: only surface it if it actually loads ---------- */
    var video = $('#hero-video');
    var reelToggle = $('#reel-toggle');
    var reelLabel = $('#reel-label');

    function hideVideo() {
        if (video) { video.classList.add('hidden'); }
        if (reelToggle) { reelToggle.hidden = true; }
    }

    if (video) {
        var source = video.querySelector('source');
        if (source) { source.addEventListener('error', hideVideo); }
        video.addEventListener('error', hideVideo);

        video.addEventListener('loadeddata', function () {
            video.classList.remove('hidden');
            if (reelToggle) { reelToggle.hidden = false; }
            var playing = video.play();
            if (playing && playing.catch) { playing.catch(function () { /* autoplay blocked */ }); }
        });

        // No source file present yet — fall back to the animated backdrop.
        if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) { hideVideo(); }
    }

    if (reelToggle && video) {
        reelToggle.addEventListener('click', function () {
            video.muted = !video.muted;
            reelToggle.classList.toggle('playing', !video.muted);
            reelToggle.setAttribute('aria-label', video.muted ? 'Unmute showreel' : 'Mute showreel');
            if (reelLabel) { reelLabel.textContent = video.muted ? 'Unmute Reel' : 'Mute Sound'; }
            if (video.paused) { video.play().catch(function () {}); }
        });
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
        onScroll();
    });

    onScroll();
})();

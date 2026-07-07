$(document).ready(function(){
    $(window).scroll(function(){
        if(this.scrollY > 20){
            $('.navbar').addClass("sticky");
        } else {
            $('.navbar').removeClass("sticky");
        }

        if(this.scrollY > 500){
            $('.scroll-up-btn').addClass("show");
        } else {
            $('.scroll-up-btn').removeClass("show");
        }
    });

    $('.scroll-up-btn').click(function(){
        $('html').animate({scrollTop: 0});
        $('html').css("scrollBehavior", "auto");
    });

    $('.navbar .menu li a').click(function(){
        $('html').css("scrollBehavior", "smooth");
        if($('.navbar .menu').hasClass('active')){
            $('.navbar .menu').removeClass('active');
            $('.menu-toggle i').removeClass('active');
            $('.menu-toggle').attr('aria-expanded', 'false');
        }
    });

    $('.menu-toggle').click(function(){
        $('.navbar .menu').toggleClass("active");
        $('.menu-toggle i').toggleClass("active");
        let expanded = $('.navbar .menu').hasClass('active');
        $('.menu-toggle').attr('aria-expanded', expanded ? 'true' : 'false');
    });

    var typed = new Typed(".typing", {
        strings: ["Technical Lead", "Integration Specialist", "Fusion ERP/CX Consultant", "Data Scientist", "Android Developer", "Game Developer"],
        typeSpeed: 100,
        backSpeed: 60,
        loop: true
    });

    var typed2 = new Typed(".typing-2", {
        strings: ["Technical Lead", "Integration Specialist", "Fusion ERP/CX Consultant", "Data Scientist", "Android Developer", "Game Developer"],
        typeSpeed: 100,
        backSpeed: 60,
        loop: true
    });

    $('.carousel').owlCarousel({
        margin: 20,
        loop: true,
        autoplay: true,
        autoplayTimeout: 2000,
        autoplayHoverPause: true,
        responsive: {
            0:{
                items: 1,
                nav: false
            },
            600:{
                items: 2,
                nav: false
            },
            1000:{
                items: 3,
                nav: false
            }
        }
    });

    $('#contactForm').submit(function(e){
        e.preventDefault();

        let name = $('#contact-name').val().trim();
        let email = $('#contact-email').val().trim();
        let subject = $('#contact-subject').val().trim();
        let message = $('#contact-message').val().trim();

        if (!name || !email || !subject || !message) {
            showToast('Please complete every field before sending.', 'error');
            return;
        }

        let body = 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message;
        let mailto = 'mailto:subhadip.dutta.18@gmail.com'
            + '?subject=' + encodeURIComponent('Portfolio contact: ' + subject)
            + '&body=' + encodeURIComponent(body);

        showToast('Opening your email client to send the message.', 'success');
        window.location.href = mailto;
    });

    function showToast(message, type){
        var toast = $('#toast');
        toast.removeClass('success error').addClass(type).text(message).addClass('show');
        setTimeout(function(){ toast.removeClass('show'); }, 3000);
    }
});

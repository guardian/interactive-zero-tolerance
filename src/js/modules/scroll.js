var scrollTop, windowHeight;

module.exports = {
    init: function() {
        this.bindings();
        this.setValues();
        this.onScroll();
    },

    bindings: function() {
        $(window).scroll(function() {
            this.onScroll();
        }.bind(this));

        $(window).resize(function() {
            this.onScroll();
            this.setValues();
        }.bind(this));
    },

    setValues: function() {
        windowHeight = $(window).height();
    },

    onScroll: function() {
        scrollTop = $(window).scrollTop();

        $('.uit-break-block').each(function(i, el) {
            var elTop = $(el).offset().top;
            var target;

            if (scrollTop + (windowHeight / 10 * 7) > elTop) {
                target = el;
            }

            $('.uit-canvas').attr('data-set', $(target).data('set'));
            $('.uit-canvas').trigger('shift');
        }.bind(this));
    }
}
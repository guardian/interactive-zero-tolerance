var scrollTop, windowHeight, currentTarget;

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
            this.resetVisulationation();
        }.bind(this));
    },

    setValues: function() {
        windowHeight = $(window).height();
    },

    onScroll: function() {
        scrollTop = $(window).scrollTop();

        var target;

        $('.uit-break-block').each(function(i, el) {
            var elTop = $(el).offset().top;
            var offset = $(el).hasClass('uit-break-block--first') ? windowHeight * 2 : windowHeight / 10 * 8;
                offset = $(el).hasClass('uit-break-block--half-first') ? windowHeight * 1.8 : offset;

            if (scrollTop + offset > elTop) {
                target = el;
            }
        }.bind(this));

        target = target == undefined ? 'default' : $(target).data('set');

        if (target !== currentTarget) {
            $('.uit-canvas').attr('data-set', target);
            $('.uit-canvas').trigger('shift');
            currentTarget = target;
        }
    },

    resetVisulationation: function() {
        $('.uit-canvas').trigger('reset');
    }
}
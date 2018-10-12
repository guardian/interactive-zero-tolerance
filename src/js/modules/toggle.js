var language = 'english';

module.exports = {
    init: function() {
        this.bindings();
    },

    bindings: function() {
        $('.uit-header__toggle').click(function() {
            this.toggleLanguage();
        }.bind(this));
    },

    toggleLanguage: function() {
        language = language === 'english' ? 'spanish' : 'english';

        $('.uit').removeClass('is-english is-spanish').addClass('is-transitioned is-' + language);
    }
}
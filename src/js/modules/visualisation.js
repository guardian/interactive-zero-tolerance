var d3 = Object.assign(
    require('d3-selection'),
    require('d3-hierarchy'),
    require('d3-timer'),
    require('d3-ease')
)

var _ = require('underscore');

var data = require('../../../.data/cleanData.json');
var width;
var height;
var radius, nodePadding, groupPadding;
var ctx;
var ease = d3.easeCubicOut;
var timer;

module.exports =  {
    init: function() {
        if (window.$) {
            this.readyToInit();
        } else {
            setTimeout(function() { this.init() }.bind(this), 50);
        }
    },

    readyToInit: function() {
        this.setupCanvas();
        this.bindings();
        this.setSizing();
        this.calculatePositions();
    },

    bindings: function() {
        $('.uit-canvas').on('shift', function() {
            this.calculatePositions();
        }.bind(this));

        $('.uit-canvas').on('reset', function() {
            $('.uit-canvas__labels').empty();
            this.setupCanvas();
            this.setSizing();
            this.calculatePositions();
        }.bind(this));
    },

    setupCanvas: function() {
        width = $(window).width();
        height = $(window).height() / 10 * 8;

        $('.uit-canvas canvas').remove();

        var canvas = d3.select('.uit-canvas')
            .append('canvas')
            .attr('width', width)
            .attr('height', height);

        ctx = canvas.node().getContext('2d');
    },

    setSizing: function() {
        if (width > 768) {
            radius = 2.5;
            nodePadding = 4;
            groupPadding = 30;
        } else {
            radius = 1.5;
            nodePadding = 2;
            groupPadding = 25;
        }
    },

    calculatePositions: function() {
        var sortBy = $('.uit-canvas').attr('data-set');

        for (var i in data) {
            if (!data[i][sortBy]) {
                data[i][sortBy] = 'unknown';
            }

            data[i].value = 1;
            data[i].parentId = data[i][sortBy];
        }

        var upperLevels = [{
            id: 'cases',
            parentId: null
        }];

        var middleLevels = _.map(_.countBy(data, sortBy), function (value, key) {
            return level = {
                id: key,
                parentId: 'cases'
            }
        });

        upperLevels = upperLevels.concat(middleLevels);

        var levels = upperLevels.concat(data);

        var root = d3.stratify()
            (levels)
            .sum(function(d) { return d.value; })
            .sort(function(a, b) { return b.value - a.value; });;

        var pack = d3.pack()
            .size([width, height])
            .radius(function(){ return radius })
            .padding(function(d) {
                return d.depth == 1 ? nodePadding : groupPadding;
            });

        pack(root);

        this.animate(root.leaves());
        if (sortBy == 'default') {
            $('.uit-canvas__labels').empty();
        } else {
            this.createLabels(root.descendants());
        }
    },

    animate: function(positionedData) {
        positionedData.forEach(function(positionedDataPoint, i) {
            data[i].sx = data[i].x || width / 2;
            data[i].sy = data[i].y || height / 2; 
            data[i].tx = positionedDataPoint.x;
            data[i].ty = positionedDataPoint.y; 
        });

        if (timer !== undefined) {
            timer.stop();
        }

        timer = d3.timer(function(elapsed) {
            var t = Math.min(1, ease(elapsed / 800));
            data.forEach(function(dataPoint, i) {
                dataPoint.x = dataPoint.sx * (1 - t) + dataPoint.tx * t;
                dataPoint.y = dataPoint.sy * (1 - t) + dataPoint.ty * t;
            });
            this.draw();
            if (t === 1) {
                timer.stop();
            }
        }.bind(this), 0);
    },

    draw: function() {
        ctx.clearRect(0, 0, width, height);
        ctx.save();

        data.forEach(function(d) {
            ctx.beginPath();
            ctx.moveTo(d.x + radius, d.y);
            ctx.arc(d.x, d.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = '#c70000';
            ctx.fill();
        }.bind(this));

        ctx.restore();
    },

    createLabels: function(packedData) {
        $('.uit-canvas__labels').empty();

        packedData.forEach(function(d) {
            if (d.depth === 1) {
                $('.uit-canvas__labels').append('<h3 class=\'uit-canvas__label\' style=\'top: ' + Math.floor(d.y - d.r - 14) + 'px; left: ' + Math.floor(d.x) + 'px; \'>' + d.id + ' (' + d.value + ')' + '</h3>');
            }
        })
    }
};

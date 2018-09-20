var d3 = Object.assign(
    require('d3-selection'),
    require('d3-array'),
    require('d3-timer'),
    require('d3-ease')
)

var ctx;
var timer;
var ease = d3.easeCubic;
var data = require('../../../.data/cleanData.json');

var pointHeight = 14;
var pointWidth = 14;
var transitionDuration = 500;

module.exports =  {
    init: function() {
        this.setupCanvas();
        this.bindings();
    },

    bindings: function() {
        $('.uit-canvas__trig').click(function() {
            this.animate(this.randomPoints);
        }.bind(this));

        $('.uit-canvas__reset').click(function() {
            this.animate(this.layoutPoints);
        }.bind(this));
    },

    setupCanvas: function() {
        console.log(data);

        var canvas = d3.select('.uit-canvas')
            .append('canvas')
            .attr('width', 1000)
            .attr('height', 1000);

        ctx = canvas.node().getContext('2d');

        this.layoutPoints();
        this.draw();
    },

    layoutPoints: function() {
        var pointsPerRow = Math.floor(1000 / pointWidth);
        var numRows = data.length / pointsPerRow;

        data.forEach(function(dataPoint, i) {
            dataPoint.x = pointWidth * (i % pointsPerRow);
            dataPoint.y = pointHeight * Math.floor(i / pointsPerRow);
        });
    },

    randomPoints: function() {
        data.forEach(function(dataPoint, i) {
            dataPoint.x = Math.floor(Math.random() * 1000) + 1;
            dataPoint.y = Math.floor(Math.random() * 1000) + 1;
        })
    },

    draw: function() {
        ctx.save();

        ctx.clearRect(0, 0, 1000, 1000);

        for (var i = 0; i < data.length; i++) {
            var point = data[i];

            ctx.fillStyle = '#c70000';
            ctx.fillRect(point.x, point.y, 10, 10);
        }

        ctx.restore();
    },

    animate: function(generateTarget) {
        data.forEach(function(dataPoint, i) {
           dataPoint.sx = dataPoint.x;
           dataPoint.sy = dataPoint.y; 
        });

        generateTarget();

        data.forEach(function(dataPoint, i) {
           dataPoint.tx = dataPoint.x;
           dataPoint.ty = dataPoint.y; 
        });

        timer = d3.timer(function(elapsed) {
            var t = Math.min(1, ease(elapsed / transitionDuration));

            data.forEach(function(dataPoint, i) {
                dataPoint.x = dataPoint.sx * (1 - t) + dataPoint.tx * t;
                dataPoint.y = dataPoint.sy * (1 - t) + dataPoint.ty * t;
            });

            this.draw();

            if (t === 1) {
                timer.stop();
            }
        }.bind(this), transitionDuration)
    }
};

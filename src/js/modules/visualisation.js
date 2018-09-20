var d3 = Object.assign(
    require('d3-selection'),
    require('d3-array'),
    require('d3-timer'),
    require('d3-ease'),
    require('d3-scale'),
    require('d3-force'),
    require('d3-beeswarm')
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

        $('.uit-canvas__nationality').click(function() {
            this.animate(this.nationalityPoints);
        }.bind(this));
    },

    setupCanvas: function() {
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

        return data;
    },

    randomPoints: function() {
        data.forEach(function(dataPoint, i) {
            dataPoint.x = Math.floor(Math.random() * 1000) + 1;
            dataPoint.y = Math.floor(Math.random() * 1000) + 1;
        });

        return data;
    },

    nationalityPoints: function() {
        var x = d3.scaleBand().rangeRound([0, 1000]);
            x.domain(['Mexico', 'Guatemala', 'Honduras'])

        function isolate(force, filter) {
            var initialize = force.initialize;
            force.initialize = function() { initialize.call(force, data.filter(filter)); };
            return force;
        }

        var simData = data.slice(0);

        var simulation = d3.forceSimulation(simData)
            .force('y', d3.forceY(500))
            .force('Mexico', isolate(d3.forceX(-400), function(d) { return d.nationality === 'Mexico'}))
            .force('Guatemala', isolate(d3.forceX(-200), function(d) { return d.nationality === 'Guatemala'}))
            .force('Honduras', isolate(d3.forceX(200), function(d) { return d.nationality === 'Honduras'}))
            .force('charge', d3.forceManyBody().strength(-10));

        for (var i = 0; i < 50; ++i) simulation.tick();

        data.forEach(function(dataPoint, i) {
            console.log(dataPoint.x);
            console.log(simData[i].x);
            dataPoint.x = simData[i].x;
            dataPoint.y = simData[i].y;
        });

        return data;
    },

    draw: function() {
        ctx.save();

        ctx.clearRect(0, 0, 1000, 1000);

        for (var i = 0; i < data.length; i++) {
            var point = data[i];

            ctx.beginPath();
            ctx.arc(point.x + 5, point.y + 5, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#c70000';
            ctx.fill();
        }

        ctx.restore();
    },

    animate: function(generateTarget) {
        data.forEach(function(dataPoint, i) {
           dataPoint.sx = dataPoint.x;
           dataPoint.sy = dataPoint.y; 
        });

        console.log('generating');
        data = generateTarget();
        console.log('generated');

        data.forEach(function(dataPoint, i) {
           dataPoint.tx = dataPoint.x;
           dataPoint.ty = dataPoint.y; 
        });

        if (timer !== undefined) {
            timer.stop();
        }

        timer = d3.timer(function(elapsed) {
            console.log('timer');
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

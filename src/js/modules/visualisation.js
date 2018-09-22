var d3 = Object.assign(
    require('d3-selection'),
    require('d3-force'),
    require('d3-hierarchy')
)

var _ = require('underscore');
var data = require('../../../.data/cleanData.json');
var width;
var height;
var radius = 2.5;
var simulation, ctx;
var centers;

module.exports =  {
    init: function() {
        this.setupCanvas();
        this.bindings();
    },

    bindings: function() {
        $('.uit-canvas').on('shift', function() {
            this.sortBy($('.uit-canvas').attr('data-set'));
        }.bind(this));

        $('.uit-canvas').on('reset', function() {
            $('.uit-canvas__labels').empty();
            simulation.force('charge', d3.forceManyBody().strength(-1.5))
                .force('x', d3.forceX(width / 2))
                .force('y', d3.forceY(height / 2));
        }.bind(this));

        $(window).resize(function() {
            $('.uit-canvas').empty();
            this.setupCanvas();
        }.bind(this));
    },

    setupCanvas: function() {
        width = $(window).width();
        height = $(window).height();

        var canvas = d3.select('.uit-canvas')
            .append('canvas')
            .attr('width', width)
            .attr('height', height);

        ctx = canvas.node().getContext('2d');

        this.getSimulationData();
    },

    getSimulationData: function() {
        for (var i in data) {
            data[i].x = Math.random() * width; 
            data[i].y = Math.random() * height;
        }

        this.initSimulation();
    },

    initSimulation: function() {
        simulation = d3.forceSimulation(data)
            .force('charge', d3.forceManyBody().strength(-1.5))
            .force('x', d3.forceX(width / 2))
            .force('y', d3.forceY(height / 2));

        simulation.on('tick', this.ticked);
    },

    ticked: function() {
        ctx.clearRect(0, 0, width, height);
        ctx.save();

        console.log(typeof centers);
        if (typeof centers == 'object') {
            for (var i in centers) {
                var d = centers[i];
                ctx.beginPath();
                ctx.moveTo(d.x + d.r, d.y);
                ctx.arc(d.x, d.y, d.r, 0, 2 * Math.PI);
                ctx.fillStyle = '#999999';
                ctx.fill();
            }
        }

        data.forEach(function(d) {
            ctx.beginPath();
            ctx.moveTo(d.x + radius, d.y);
            ctx.arc(d.x, d.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = '#c70000';
            ctx.fill();
        }.bind(this));

        ctx.restore();
    },

    sortBy: function(value) {
        centers = this.getCenters(value);
        this.createLabels(centers);

        simulation.force('x', d3.forceX(function(d) {
            return centers[d[value]].x;
        }))
        .force('y', d3.forceY(function(d) {
            return centers[d[value]].y;
        }));

        simulation.alpha(1).restart();
    },

    createLabels: function(centers) {
        $('.uit-canvas__labels').empty();

        for (var i in centers) {
            $('.uit-canvas__labels').append('<h3 class=\'uit-canvas__label\' style=\'top: ' + centers[i].y + 'px; left: ' + centers[i].x + 'px; \'>' + i + '(' + centers[i].value + ')' + '</h3>');
        }
    },

    getCenters: function(sortBy) {
        // we should move this to serverside
        var values = _.countBy(data, sortBy);

        centers = _.map(_.countBy(data, sortBy), function (value, key) {
            return {name: key, value: value};
        });

        centers = {
            name: 'centers',
            children: centers
        };

        var map = d3.pack().size([width, height]).padding(10);
        centers = d3.hierarchy(centers).sum(function(d) { return d.value; });
        map(centers.sum(function(d) {
                return d.value;
            }).sort(function(a,b) {
                return b.value - a.value;
            })
        );

        var cleanCenters = {};

        for (var i in centers.children) {
            var zone = centers.children[i];

            cleanCenters[zone.data.name] = {
                x: zone.x,
                y: zone.y,
                r: zone.r,
                value: zone.value
            }
        }

        return cleanCenters;
    },
};

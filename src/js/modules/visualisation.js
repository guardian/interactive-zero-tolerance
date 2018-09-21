var d3 = Object.assign(
    require('d3-selection'),
    require('d3-array'),
    require('d3-timer'),
    require('d3-ease'),
    require('d3-scale'),
    require('d3-force'),
    require('d3-hierarchy')
)

var _ = require('underscore');

var data = require('../../../.data/cleanData.json');

var ctx;
var width = 800;
var height = 800;
var dot = 6;
var margin = 6;
var force;

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
            this.transition('nationality');
        }.bind(this));
    },

    setupCanvas: function() {
        var canvas = d3.select('.uit-canvas')
            .append('canvas')
            .attr('width', width)
            .attr('height', height);

        ctx = canvas.node().getContext('2d');

        force = d3.forceSimulation()
            .nodes(data)
            .stop();

        this.gridLayout();
        this.draw();
        this.getCenters('nationality')
    },

    gridLayout: function() {
        var pointsPerRow = Math.floor(width / (dot + margin));
        var numRows = data.length / pointsPerRow;

        data.forEach(function(dataPoint, i) {
            dataPoint.x = (dot + margin) * (i % pointsPerRow);
            dataPoint.y = (dot + margin) * Math.floor(i / pointsPerRow);
        });

        console.log(data);

        return data;
    },

    getCenters: function(sortBy) {
        var centers, map;

        centers = _.uniq(_.pluck(data, sortBy)).map(function (d) {
            return {name: d, value: 1};
        });

        centers = {
            name: 'centers',
            children: centers
        };

        map = d3.treemap().size([width, height]);

        centers = d3.hierarchy(centers).sum(function(d) { return d.value; });

        map(centers.sum(function(d) { return d.value; }));

        return centers;
    },

    draw: function() {
        ctx.save();

        ctx.clearRect(0, 0, width, height);

        for (var i = 0; i < data.length; i++) {
            var point = data[i];

            ctx.beginPath();
            ctx.arc(point.x + 5, point.y + 5, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#c70000';
            ctx.fill();
        }

        ctx.restore();
    },

    transition: function(transitionTo) {
        var centers = this.getCenters(transitionTo);
        force.on('tick', this.tick(centers, transitionTo));
        force.restart();
    },

    tick: function(centers, varname) {
        var foci = {};

        for (var i = 0; i < centers.children.length; i++) {
            foci[centers.children[i].data.name] = centers.children[i];
        }

        data.forEach(function(point, i) {
            var f = foci[data[i][varname]];
            point.y = ((f.y0 + (f.y1 / 2)) - point.y);
            point.x = ((f.x0 + (f.x1 / 2)) - point.x);
        });


        this.draw();
    }
};

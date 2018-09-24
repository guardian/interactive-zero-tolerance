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
        this.calculatePositions('nationality');
    },

    bindings: function() {
        $('.uit-canvas').on('shift', function() {
            this.calculatePositions($('.uit-canvas').attr('data-set'));
        }.bind(this));

        $('.uit-canvas').on('reset', function() {
            $('.uit-canvas__labels').empty();
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
    },

    calculatePositions: function(sortBy) {
        for (var i in data) {
            if (!data[i][sortBy]) {
                data[i][sortBy] = 'unknown';
            }

            data[i].value = 1;
            data[i].r = 3;
        }

        var upperLevels = [{
            caseNumber: 'cases',
            [sortBy]: null
        }];

        var middleLevels = _.map(_.countBy(data, sortBy), function (value, key) {
            return {caseNumber: key, [sortBy]: 'cases'};
        });

        upperLevels = upperLevels.concat(middleLevels);
        upperLevels = upperLevels.concat(data);

        var root = d3.stratify()
            .id(function(d) { return d.caseNumber; })
            .parentId(function(d) { return d[sortBy] })(upperLevels)
            .sum(function(d) { return d.value; })
            .sort(function(a, b) { return b.value - a.value; });

        var pack = d3.pack()
            .size([width, height])
            .padding(3);

        pack(root);

        this.drawNodes(root.descendants());
        this.createLabels(root.descendants());
    },

    drawNodes: function(packedData) {
        ctx.clearRect(0, 0, width, height);
        ctx.save();

        packedData.forEach(function(d) {
            if (d.depth === 2) {
                ctx.beginPath();
                ctx.moveTo(d.x + d.r, d.y);
                ctx.arc(d.x, d.y, d.r, 0, 2 * Math.PI);
                ctx.fillStyle = '#c70000';
                ctx.fill();
            }
        }.bind(this));

        ctx.restore();
    },

    createLabels: function(packedData) {
        $('.uit-canvas__labels').empty();

        packedData.forEach(function(d) {
            if (d.depth === 1) {
                $('.uit-canvas__labels').append('<h3 class=\'uit-canvas__label\' style=\'top: ' + d.y + 'px; left: ' + d.x + 'px; \'>' + d.id + '(' + d.value + ')' + '</h3>');
            }
        })
    }
};

var d3 = Object.assign(
    require('d3-selection'),
    require('d3-hierarchy'),
    require('d3-timer'),
    require('d3-ease'),
    require('d3-geo')
)

var topojson = require('topojson');
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
        this.createIgnored();
        this.calculatePositions();
    },

    bindings: function() {
        $('.uit-canvas').on('shift', function() {
            this.clearLabels();
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
        height = $(window).height();
        height = height > 1000 ? height / 10 * 8 : height;

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
            groupPadding = 50;
        } else {
            radius = 1.5;
            nodePadding = 2;
            groupPadding = 25;
        }
    },

    createIgnored: function() {
        for (var i = 0; i < 458; i++) {
            data.push({
                ignored: true,
                id: data.length + i
            })
        }
    },

    calculatePositions: function() {
        var sortBy = $('.uit-canvas').attr('data-set');

        for (var i in data) {
            if (sortBy === 'default') {
                data[i][sortBy] = 'All cases';
            } else if (sortBy === 'charges') {
                if (data[i].ignored) {
                    data[i][sortBy] = 'Serious offences';
                } else {
                    data[i][sortBy] = 'Low level immigration offenses';
                }
            } else {
                if (data[i].ignored) {
                    data[i][sortBy] = 'Ignored';
                } else if (!data[i][sortBy]) {
                    data[i][sortBy] = 'Unknown';
                }
            }

            data[i].value = 1;
            data[i].parentId = data[i][sortBy];
        }

        if (sortBy === 'nationality') {
            this.drawMap(sortBy);

            var root = this.mapPack(sortBy);
        } else {
            var root = this.regularPack(sortBy);
            var labels = root.descendants().filter(function(d) { return d.depth === 1 });
            var nodes = root.leaves();

            this.animate(nodes);

            labels.forEach(function(d) {
                this.createLabel(d.id, d.value, root.leaves().length, d.x, d.y, d.r);
            }.bind(this));
        }
    },

    mapPack: function(sortBy) {
        
    },

    drawMap: function(sortBy) {
        if (sortBy === 'nationality') {
            var mapData = require('../data/world-110m.json');
            console.log(mapData);
        }

        var countries = topojson.feature(mapData, mapData.objects.countries).features;
        var projection = d3.geoMercator().scale(width).translate([width / 2, height / 2])
        var path = d3.geoPath().projection(projection).context(ctx);

        countries.forEach(function(d, i) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            path(d);
            ctx.fill();
        });
    },

    regularPack: function(sortBy) {
        var upperLevels = [{
            id: 'cases',
            parentId: null
        }];

        var middleLevels = _.map(_.countBy(data, sortBy), function (value, key) {
            if (key !== 'Ignored') {
                return level = {
                    id: key,
                    parentId: 'cases'
                }
            }
        });

        var levels = upperLevels.concat(middleLevels.filter(Boolean));
            levels = levels.concat(data.filter(function(d) { return d.parentId !== 'Ignored' }));

        var root = this.packNodes(levels);

        return root;
    },

    packNodes: function(levels) {
        var root = d3.stratify()
            (levels)
            .sum(function(d) { return d.value; })

        var pack = d3.pack()
            .size([width, height])
            .radius(function(){ return radius })
            .padding(function(d) {
                return d.depth == 1 ? nodePadding : groupPadding;
            });

        return pack(root);
    },

    animate: function(positionedData) {
        positionedData.sort(function(a,b){
            return a.id - b.id;
        });

        data.forEach(function(dataPoint, i) {
            dataPoint.sx = data[i].x || width / 2;
            dataPoint.sy = data[i].y || height / 2; 
            dataPoint.tx = positionedData[i] ? positionedData[i].x : width / 2;
            dataPoint.ty = positionedData[i] ? positionedData[i].y : -200; // instead of -200 you should randomly generate a number off screen 
        }.bind(this));

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
            ctx.fillStyle = '#121212';
            ctx.fill();
        }.bind(this));

        ctx.restore();
    },

    clearLabels: function(packedData, total) {
        $('.uit-canvas__labels').empty();
    },

    createLabel: function(title, value, total, x, y, r) {
        var large = value > 80;
        var top = large ? y : Math.floor(y - r - 14);

        $('.uit-canvas__labels').append('<h3 class=\'uit-canvas__label' + (large ? ' uit-canvas__label--large' : '') + '\' style=\'top: ' + top + 'px; left: ' + Math.floor(x) + 'px; \'><span class=\'uit-canvas__label-descriptor\'>' + title + '</span><span class=\'uit-canvas__label-value\'>' + parseFloat((100 / total * value).toFixed(2)) + '%</span><h3>');
    }
};

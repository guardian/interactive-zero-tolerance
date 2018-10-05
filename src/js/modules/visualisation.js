var d3 = Object.assign(
    require('d3-selection'),
    require('d3-hierarchy'),
    require('d3-timer'),
    require('d3-ease'),
    require('d3-geo'),
    require('d3-request'),
    require('d3-scale'),
    require('d3-array')
)

var topojson = require('topojson');
var _ = require('underscore');

var data = require('../../../.data/cleanData.json');
var map = require('../data/map.json');
var width;
var height;
var radius, nodePadding, groupPadding;
var ctx;
var svgCtx;
var mapDrawn = false;
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
        this.setupSVG();
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
            this.setupSVG();
            this.setSizing();
            this.calculatePositions();
        }.bind(this));
    },

    setupCanvas: function() {
        width = $(window).width();
        height = $(window).height();

        $('.uit-canvas canvas').remove();

        var canvas = d3.select('.uit-canvas')
            .append('canvas')
            .attr('width', width)
            .attr('height', height);

        ctx = canvas.node().getContext('2d');
    },

    setupSVG: function() {
        $('.uit-canvas svg').remove();

        var svg = d3.select('.uit-canvas')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        svgCtx = d3.select('.uit-canvas svg');

        mapDrawn = false;
    },

    setSizing: function() {
        if (width > 768) {
            radius = 2.5;
            nodePadding = 4;
            groupPadding = 40;
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

        if (sortBy === 'location') {
            var root = this.mapPack(sortBy);

            this.animate(root.nodes);

            root.labels.forEach(function(d) {
                this.createLabel(d.id, 100, 0, d.x, d.y, 0);
            }.bind(this));
        } else {
            var root = this.regularPack(sortBy);
            var labels = root.descendants().filter(function(d) { return d.depth === 1 });
            var nodes = root.leaves();

            this.animate(nodes);
            this.hideMap();

            labels.forEach(function(d) {
                this.createLabel(d.id, d.value, root.leaves().length, d.x, d.y, d.r);
            }.bind(this));
        }
    },

    mapPack: function(sortBy) {
        if (!mapDrawn) {
            this.drawMap();
        }

        var nodes = [];
        var countyPositions = {};
        var scrollTop = $(document).scrollTop();

        $('.county').each(function(i, county) {
            var $county = $(county);
            var countyName = $county.attr('class').replace(' county', '');

            countyPositions[countyName] = {
                x: $county.position().left + ($county.width() / 2),
                y: $county.position().top + ($county.height() / 2) - scrollTop
            }
        });

        data.forEach(function(dataPoint, i) {
            nodes.push({
                id: dataPoint.id,
                x: countyPositions[dataPoint.location] ? countyPositions[dataPoint.location].x : width / 2,
                y: countyPositions[dataPoint.location] ? countyPositions[dataPoint.location].y : -200,
                o: 0
            });

            if (countyPositions[dataPoint.location]) {
                if (!countyPositions[dataPoint.location].value) {
                    countyPositions[dataPoint.location].value = 1;
                } else {
                    countyPositions[dataPoint.location].value++;
                }
            }
        });

        var statePositions = [];

        $('.state').each(function(i, state) {
            var $state = $(state);

            statePositions.push({
                id: $state.data('state'),
                x: $state.position().left + ($state.width() / 2),
                y: $state.position().top + ($state.height() / 2) - scrollTop
            })
        });

        if (!mapDrawn) {
            this.colourMap(countyPositions);
        }

        this.showMap();

        return  {
            nodes: nodes,
            labels: statePositions
        }
    },

    drawMap: function() {
        var counties = topojson.feature(map, map.objects.counties);
        var states = topojson.feature(map, map.objects.states);
        var countries = topojson.feature(map, map.objects.countries);
        var projection = d3.geoMercator().translate([0, -2000]).fitSize([width, height], counties);
        var path = d3.geoPath().projection(projection);

        svgCtx.append('g')
            .attr('class', 'countries')
            .selectAll('path')
            .data(countries.features)
            .enter().append('path')
            .attr('d', path)
            .attr('class', 'country');

        svgCtx.append('g')
            .attr('class', 'states')
            .selectAll('path')
            .data(states.features)
            .enter().append('path')
            .attr('d', path)
            .attr('class', 'state')
            .attr('data-state', function(d) {
                return d.properties.NAME;
            });

        svgCtx.append('g')
            .attr('class', 'counties')
            .selectAll('path')
            .data(counties.features)
            .enter().append('path')
            .attr('d', path)
            .attr('class', function(d) { return d.properties.NAME.toLowerCase().replace(/ /g, '-') + '-' + this.getState(d.properties.STATEFP) + ' county'; }.bind(this));
    },

    colourMap: function(countiesForMap) {
        var dataArray = [];

        for (var county in countiesForMap) {
            var d = countiesForMap[county];

            if (d.value) {
                dataArray.push(d.value);
            }
        }

        var minVal = d3.min(dataArray);
        var maxVal = d3.max(dataArray);
        var ramp = d3.scaleLinear().domain([minVal, maxVal]).range(['#dcdcdc', '#121212']);

        for (var county in countiesForMap) {
            var d = countiesForMap[county]

            if (d.value) {
                $('.' + county).attr('style', 'fill: ' + ramp(d.value));
            }
        }

        mapDrawn = true;
    },

    showMap: function() {
        $('.uit-canvas svg').addClass('is-current');
    },

    hideMap: function() {
        $('.uit-canvas svg').removeClass('is-current');
    },

    getState: function(stateID) {
        switch(stateID) {
            case '06':
                return 'california'
            case '04':
                return 'arizona'
            case '35':
                return 'new-mexico'
            case '48':
                return 'texas'
        }
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
            dataPoint.so = data[i].o || 1;
            dataPoint.tx = positionedData[i] ? positionedData[i].x : width / 2;
            dataPoint.ty = positionedData[i] ? positionedData[i].y : -200;
            dataPoint.to = positionedData[i] ? positionedData[i].o : 1;
        }.bind(this));

        if (timer !== undefined) {
            timer.stop();
        }

        timer = d3.timer(function(elapsed) {
            var t = Math.min(1, ease(elapsed / 800));
            data.forEach(function(dataPoint, i) {
                dataPoint.x = dataPoint.sx * (1 - t) + dataPoint.tx * t;
                dataPoint.y = dataPoint.sy * (1 - t) + dataPoint.ty * t;
                dataPoint.o = dataPoint.so * (1 - t) + dataPoint.to * t;
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
            ctx.fillStyle = 'rgba(18, 18, 18, ' + d.o + ')';
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
            top -= 100;
        var number = parseFloat((100 / total * value).toFixed(1));

        $('.uit-canvas__labels').append('<h3 class=\'uit-canvas__label' + (large ? ' uit-canvas__label--large' : '') + '\' style=\'top: ' + top + 'px; left: ' + Math.floor(x) + 'px; \'><span class=\'uit-canvas__label-descriptor\'>' + title + '</span>' + (total ? '<span class=\'uit-canvas__label-value\'>' + (number == 100 ? total : number + '%') + '</span></h3>' : ''));
    }
};

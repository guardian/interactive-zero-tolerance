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

        if (sortBy === 'location' || sortBy === 'nationality') {
            var root = this.mapPack(sortBy);

            this.animate(root.nodes);

            root.labels.forEach(function(d) {
                // TODO: Get total value instead of using 3000
                this.createLabel(d.id, d.value, 3000, d.x, d.y, 0);
            }.bind(this));
        } else if (sortBy === 'previousDeportation' || sortBy === 'sentence') {
            var root = this.linearPack(sortBy);
            this.animate(root.nodes);
            this.hideMap();

            root.labels.forEach(function(d) {
                this.createLabel(d.id, d.value, 1000, d.x, d.y, 0);
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

    linearPack: function(sortBy) {
        var timeline = {};

        if (sortBy === 'previousDeportation') {
            timeline = {
                '1 week or less': 0,
                '1 week to 1 month': 0,
                '1 month to 6 months': 0,
                '6 months to 1 year': 0,
                'More than a year': 0
            };
        }

        data.forEach(function(dataPoint, i) {
            if (!timeline[dataPoint[sortBy]]) {
                timeline[dataPoint[sortBy]] = 1;
            } else {
                timeline[dataPoint[sortBy]]++;
            }
        });

        delete timeline.Unknown;
        delete timeline.Ignored;

        var bandWidth = (nodePadding * 10) + (radius * 10) + groupPadding;
        var groups = Object.keys(timeline);
        var totalWidth = bandWidth * groups.length - groupPadding;

        // this can be easily replaced without d3 scale band
        var x = d3.scaleBand()
            .range([(width - totalWidth) / 2, totalWidth + ((width - totalWidth) / 2)])
            .padding(0);

        x.domain(groups);

        var chartStarts = {};

        for (var time in timeline) {
            chartStarts[time] = {
                x: x(time),
                y: height / 2,
                positioned: 0,
                row: 0
            }
        }

        var nodes = [];

        data.forEach(function(dataPoint, i) {
            if (chartStarts[dataPoint[sortBy]]) {
                nodes.push({
                    id: dataPoint.id,
                    x: chartStarts[dataPoint[sortBy]].x + (chartStarts[dataPoint[sortBy]].positioned * (nodePadding + radius)),
                    y: chartStarts[dataPoint[sortBy]].y - (chartStarts[dataPoint[sortBy]].row * (nodePadding + radius))
                });

                chartStarts[dataPoint[sortBy]].positioned++;

                if (chartStarts[dataPoint[sortBy]].positioned % 10 === 0) {
                    chartStarts[dataPoint[sortBy]].row++;
                    chartStarts[dataPoint[sortBy]].positioned = 0;
                }
            };
        });

        labels = [];

        for (var chart in chartStarts) {
            labels.push({
                id: chart,
                x: chartStarts[chart].x + (nodePadding * 5) + (radius * 5),
                y: chartStarts[chart].y + 50,
                value: timeline[chart]
            })
        }

        return {
            nodes: nodes,
            labels: labels
        }
    },

    mapPack: function(sortBy) {
        this.drawMap(sortBy);

        var nodes = [];
        var scrollTop = $(document).scrollTop();
        var pointPositions = {};
        var pointTarget = sortBy === 'nationality' ? '.country' : '.county';
        var stateValues = {};

        $(pointTarget).each(function(i, county) {
            var $county = $(county);
            var countyName = $county.data('link');

            pointPositions[countyName] = {
                x: $county.position().left + ($county.width() / 2),
                y: $county.position().top + ($county.height() / 2) - scrollTop
            }
        });

        var dataSource = sortBy === 'nationality' ? 'nationality' : 'location'; // is this line needed??

        data.forEach(function(dataPoint, i) {
            nodes.push({
                id: dataPoint.id,
                x: pointPositions[dataPoint[dataSource]] ? pointPositions[dataPoint[dataSource]].x : width / 2,
                y: pointPositions[dataPoint[dataSource]] ? pointPositions[dataPoint[dataSource]].y : -200,
                o: 0
            });

            if (pointPositions[dataPoint[dataSource]]) {
                if (!pointPositions[dataPoint[dataSource]].value) {
                    pointPositions[dataPoint[dataSource]].value = 1;
                } else {
                    pointPositions[dataPoint[dataSource]].value++;
                }
            }

            if (sortBy === 'location') {
                var state = dataPoint.location.split(/[-]+/).pop();
                    state = state == 'mexico' ? 'new-mexico' : state;

                if (!stateValues[state]) {
                    stateValues[state] = {};
                    stateValues[state].value = 1;
                } else {
                    stateValues[state].value++;
                }
            }
        });

        var labelPositions = [];
        var labelTarget = sortBy === 'nationality' ? '.country' : '.state';

        $(labelTarget).each(function(i, label) {
            var $label = $(label);

            if (sortBy === 'nationality') {
                var value = pointPositions[$label.data('link')].value;
            } else {
                if (stateValues[$label.data('link')]) {
                    var value = stateValues[$label.data('link')].value;
                }
            }

            if (value) {
                labelPositions.push({
                    id: $label.data('label'),
                    value: value,
                    x: $label.position().left + ($label.width() / 2),
                    y: $label.position().top + ($label.height() / 2) - scrollTop,
                })
            };
        });

        this.colourMap(pointPositions);
        this.showMap();

        return  {
            nodes: nodes,
            labels: labelPositions
        }
    },

    drawMap: function(sortBy) {
        $('.uit-canvas svg').empty();
        $('.uit-canvas svg').removeClass().addClass(sortBy);

        var counties = topojson.feature(map, map.objects.counties);
        var states = topojson.feature(map, map.objects.states);
        var countries = topojson.feature(map, map.objects.countries);
        var rivers = topojson.feature(map, map.objects.river);
        var border = topojson.feature(map, map.objects.border);

        if (sortBy === 'nationality') {
            var cropArea = topojson.feature(map, {
                type: "GeometryCollection",
                geometries: map.objects.countries.geometries.filter(function(d) {
                    return d.properties.GEOUNIT != 'Canada'
                        && d.properties.GEOUNIT != 'United States of America'
                        && d.properties.GEOUNIT != 'Chile'
                        && d.properties.GEOUNIT != 'Uruguay'
                        && d.properties.GEOUNIT != 'Brazil'
                        && d.properties.GEOUNIT != 'Peru'
                        && d.properties.GEOUNIT != 'Paraguay'
                        && d.properties.GEOUNIT != 'Bolivia'
                        && d.properties.GEOUNIT != 'Argentina';
                })
            });

            var projection = d3.geoMercator().fitExtent([[width * 0.05, 0], [width * 0.95, height]], cropArea);
        } else {
            var projection = d3.geoMercator().fitExtent([[width * 0.05, 0], [width * 0.95, height]], counties);
        }

        var path = d3.geoPath().projection(projection);
        svgCtx.append('g')
            .attr('class', 'countries')
            .selectAll('path')
            .data(countries.features)
            .enter().append('path')
            .attr('d', path)
            .attr('class', function(d) { return 'country' })
            .attr('data-label', function(d) {
                return d.properties.GEOUNIT;
            })
            .attr('data-link', function(d) {
                return d.properties.GEOUNIT.toLowerCase().replace(/ /g, '-');
            });

        if (sortBy === 'location') {
            svgCtx.append('g')
                .attr('class', 'states')
                .selectAll('path')
                .data(states.features)
                .enter().append('path')
                .attr('d', path)
                .attr('class', 'state')
                .attr('data-label', function(d) {
                    return d.properties.NAME;
                })
                .attr('data-link', function(d) {
                    return d.properties.NAME.toLowerCase().replace(/ /g, '-');
                });

            svgCtx.append('g')
                .attr('class', 'counties')
                .selectAll('path')
                .data(counties.features)
                .enter().append('path')
                .attr('d', path)
                .attr('class', 'county')
                .attr('data-link', function(d) {
                    return d.properties.NAME.toLowerCase().replace(/ /g, '-') + '-' + this.getState(d.properties.STATEFP);
                }.bind(this));

            svgCtx.append('g')
                .attr('class', 'rivers')
                .selectAll('path')
                .data(rivers.features)
                .enter().append('path')
                .attr('d', path)
                .attr('class', 'river');

            svgCtx.append('g')
                .attr('class', 'border')
                .selectAll('path')
                .data(border.features)
                .enter().append('path')
                .attr('d', path)
                .attr('class', 'border-section');
        }
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
                $('[data-link=\'' + county + '\']').attr('style', 'fill: ' + ramp(d.value));
            }
        }
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
            .sort(function(a, b) { return b.value - a.value });

        var pack = d3.pack()
            .size([width, height / 10 * 8])
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
        var number = parseFloat((100 / total * value).toFixed(1));

        $('.uit-canvas__labels').append('<h3 class=\'uit-canvas__label' + (large ? ' uit-canvas__label--large' : '') + '\' style=\'top: ' + top + 'px; left: ' + Math.floor(x) + 'px; \'><span class=\'uit-canvas__label-descriptor\'>' + title + '</span>' + (total ? '<span class=\'uit-canvas__label-value\'>' + (number == 100 ? total : number + '%') + '</span></h3>' : ''));
    }
};

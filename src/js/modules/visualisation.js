var d3 = Object.assign(
    require('d3-selection'),
    require('d3-hierarchy'),
    require('d3-timer'),
    require('d3-ease'),
    require('d3-geo'),
    require('d3-request'),
    require('d3-scale'),
    require('d3-array'),
    require('d3-axis')
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
        this.setAdditionalValues();
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
        if (width < 768) {
            radius = 1.2;
            nodePadding = 1.8;
            groupPadding = 15;
        } else if (height < 768) {
            radius = 1.8;
            nodePadding = 3.5;
            groupPadding = 30;
        } else {
            radius = 2.5;
            nodePadding = 4;
            groupPadding = 40;
        }
    },

    createIgnored: function() {
        for (var i = 0; i < 458; i++) {
            data.cases.push({
                ignored: true,
                id: parseInt(data.cases.length + i) / 10000,
            })
        }
    },

    setAdditionalValues: function() {
        for (var i in data.cases) {
            data.cases[i].default = 0;
            data.cases[i].charges = data.cases[i].ignored ? 1 : 0;
        }
    },

    calculatePositions: function() {
        var sortBy = $('.uit-canvas').attr('data-set');

        for (var i in data.cases) {
            data.cases[i].parentId = data.cases[i][sortBy];
        }

        if (sortBy === 'location' || sortBy === 'nationality') {
            var root = this.mapPack(sortBy);

            this.animate(root.nodes);

            for (var i in root.labels) {
                var d = root.labels[i];

                if (d.x) {
                    this.createLabel(d.englishLabel, d.spanishLabel, d.value, null, d.x, d.y, 0, sortBy === 'location' || d.id === 'Mexico');
                }
            }
        } else if (sortBy === 'previousDeportation' || sortBy === 'sentenceFelony' || sortBy === 'sentenceMisdemeanor') {
            var root = this.linearPack(sortBy);
            this.animate(root.nodes);
            this.hideMap();

            for (var i in root.labels) {
                var d = root.labels[i];

                this.createLabel(d.englishLabel, d.spanishLabel, null, null, d.lx, d.ly, 0, null, true);
                this.createTotalLabel(d.value, d.tx, d.ty);
            }

            this.addAxisLabel(sortBy, root.x, root.y, root.width);
        } else if (sortBy === 'sentence-average-misdemeanour' || sortBy == 'sentence-average-felony') {
            this.barChart(sortBy);
            this.animate();
        } else {
            var root = this.regularPack(sortBy);
            var labels = root.descendants().filter(function(d) { return d.depth === 1 });
            var nodes = root.leaves();

            this.animate(nodes);
            this.hideMap();

            labels.forEach(function(d) {
                var total = sortBy === 'outcome' ? null : root.leaves().length;
                this.createLabel(d.data.englishLabel, d.data.spanishLabel, d.value, total, d.x, d.y, d.r, d.value > 80);
            }.bind(this));
        }
    },

    linearPack: function(sortBy) {
        var levels = data.labels[sortBy];

        var chartHeight = 0;

        for (var i in levels) {
            if (levels[i].value > chartHeight) {
                chartHeight = levels[i].value;
            }
        }

        chartHeight = chartHeight / 10 * (nodePadding + radius);
        chartHeight = ((height - chartHeight) / 2) + chartHeight - (height * 0.05);

        var isMobile = 768 > width;
        var groups = Object.keys(levels);
        var bandWidth = (nodePadding * 10) + (radius * 10);
        var rawWidth = bandWidth * groups.length;
        var groupSpacing = isMobile ? (width - 40 - rawWidth) / groups.length : groupPadding;
            bandWidth += groupSpacing;
        var totalWidth = bandWidth * groups.length - groupSpacing;

        // this can be easily replaced without d3 scale band
        var x = d3.scaleBand()
            .range([(width - totalWidth) / 2, totalWidth + ((width - totalWidth) / 2)])
            .padding(0);

        x.domain(groups);

        var levelsById = {};

        for (var i in levels) {
            if (levels[i].value < 10) {
                var offset = 10 - levels[i].value;
                levels[i].positioned = offset / 2;
            } else {
                levels[i].positioned = 0;
            }

            levels[i].x = x(i);
            levels[i].y = chartHeight;
            levels[i].row = 0;

            levelsById[levels[i].id] = i;
        }

        var nodes = [];

        data.cases.forEach(function(dataPoint, i) {
            if (typeof dataPoint[sortBy] == 'number') {
                var level = levels[levelsById[dataPoint[sortBy]]];

                nodes.push({
                    id: dataPoint.id,
                    x: level.x + (level.positioned * (nodePadding + radius)),
                    y: level.y - (level.row * (nodePadding + radius))
                });


                level.positioned++;

                if (level.positioned % 10 === 0) {
                    level.row++;
                    level.positioned = 0;
                }
            } else {
                nodes.push({
                    id: dataPoint.id
                })
            }
        });

        var labels = [];
        var totalLabels = [];

        for (var i in levels) {
            levels[i].lx = levels[i].x + (nodePadding * 5) + (radius * 4)
            levels[i].ly = levels[i].y + 45;
            levels[i].tx = levels[i].x + (nodePadding * 5) + (radius * 4);
            levels[i].ty = levels[i].y - 30 - ((nodePadding + radius) * (levels[i].value / 10))
        }

        return {
            nodes: nodes,
            labels: levels,
            x: levels[Object.keys(levels)[0]].x,
            y: levels[Object.keys(levels)[0]].y + 55,
            width: totalWidth - groupPadding
        }
    },

    mapPack: function(sortBy) {
        this.drawMap(sortBy);

        var nodes = [];
        var scrollTop = $(document).scrollTop();
        var levels = data.labels[sortBy];
        var levelsById = Object.keys(levels);
        var pointTarget = sortBy === 'nationality' ? '.country' : '.county';
        var stateValues = {};

        $(pointTarget).each(function(i, region) {
            var $region = $(region);
            var regionName = $region.data('label');
            var regionBounds = $region[0].getBoundingClientRect();

            if (regionName === 'Brazil') {
                levels[regionName].x = regionBounds.left + (regionBounds.width * 0.3)
                levels[regionName].y = regionBounds.top + (regionBounds.height * 0.1)
            } else if (regionName === 'El Salvador' && regionName === 'Guatemala') {
                levels[regionName].x = regionBounds.left - regionBounds.width;
                levels[regionName].y = regionBounds.top - regionBounds.height;
            } else if (levels[regionName]) {
                levels[regionName].x = regionBounds.left + (regionBounds.width / 2);
                levels[regionName].y = regionBounds.top + (regionBounds.height / 2);
            }
        });

        data.cases.forEach(function(dataPoint, i) {
            var level = levels[levelsById[dataPoint[sortBy]]];

            nodes.push({
                id: dataPoint.id,
                x: level ? level.x : width / 2,
                y: level ? level.y : -200,
                hide: true
            });
        });

        this.colourMap(levels);
        this.showMap();

        if (sortBy === 'location') {
            levels = data.stateLabels;

            for (var i in levels) {
                $region = $('[data-label=\'' + i + '\']');
                levels[i].x = $region.position().left + ($region.width() / 2);
                levels[i].y = i === 'New Mexico' ? $region.position().top + ($region.height() / 4) - scrollTop : $region.position().top + ($region.height() / 2) - scrollTop;
            }
        }

        return  {
            nodes: nodes,
            labels: levels
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
                        && d.properties.GEOUNIT != 'Suriname'
                        && d.properties.GEOUNIT != 'Brazil'
                        && d.properties.GEOUNIT != 'Guyana'
                        && d.properties.GEOUNIT != 'Peru'
                        && d.properties.GEOUNIT != 'Paraguay'
                        && d.properties.GEOUNIT != 'Bolivia'
                        && d.properties.GEOUNIT != 'Argentina';
                })
            });

            if (width > 768) {
                var projection = d3.geoMercator().fitExtent([[width * 0.05, 0], [width * 0.95, height]], cropArea);
            } else {
                var projection = d3.geoMercator().fitExtent([[width * -0.2, 0], [width * 1.2, height]], cropArea);
            }
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
                });

            svgCtx.append('g')
                .attr('class', 'counties')
                .selectAll('path')
                .data(counties.features)
                .enter().append('path')
                .attr('d', path)
                .attr('class', 'county')
                .attr('data-label', function(d) {
                    return d.properties.NAME + ', ' + this.getState(d.properties.STATEFP);
                }.bind(this));

            svgCtx.append('g')
                .attr('class', 'border')
                .selectAll('path')
                .data(border.features)
                .enter().append('path')
                .attr('d', path)
                .attr('class', 'border-section');

            svgCtx.append('g')
                .attr('class', 'rivers')
                .selectAll('path')
                .data(rivers.features)
                .enter().append('path')
                .attr('d', path)
                .attr('class', 'river');

            var labelData = [
                {
                    label: 'El Paso',
                    long: -106.4850,
                    lat: 31.7619
                },
                {
                    label: 'Brownsville',
                    long: -97.4975,
                    lat: 25.9017,
                    below: true
                },
                {
                    label: 'Nogales',
                    long: -110.9381,
                    lat: 31.3012,
                    below: true
                },
                {
                    label: 'San Diego',
                    long: -117.1611,
                    lat: 32.7157,
                    hideOnMobile: true
                },
                {
                    label: 'Tijuana',
                    long: -117.0382,
                    lat: 32.5149,
                    below: true
                },
                {
                    label: 'Ciudad Juárez',
                    long: -106.4245,
                    lat: 31.6904,
                    below: true,
                    hideOnMobile: true
                }
            ]

            var labels = svgCtx.append('g')
                .attr('class', 'labels')
                .selectAll('g')
                .data(labelData)
                .enter()
                .append('g')
                .attr('transform', function(d) { return 'translate(' + projection([d.long, d.lat]) + ')' })
                .attr('class', function(d) { return 'label' + (d.below ? ' label--below' : '') + (d.hideOnMobile ? ' label--hide-on-mobile' : '') });

            labels.append('circle')
                .attr('class', 'label__point')
                .attr('r', 4);

            labels.append('text')
                .attr('class', 'label__text')
                .text(function(d) { return d.label });
        }
    },

    colourMap: function(levels) {
        var dataArray = [];

        for (var i in levels) {
            if (levels[i].value) {
                dataArray.push(levels[i].value);
            }
        }

        var minVal = d3.min(dataArray);
        var maxVal = d3.max(dataArray);
        var ramp = d3.scaleLinear().domain([minVal, maxVal]).range(['#ffbac8', '#c70000']);

        for (var i in levels) {
            if (levels[i].value) {
                $('[data-label=\'' + levels[i].englishLabel + '\']').attr('style', 'fill: ' + ramp(levels[i].value));
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
                return 'California'
            case '04':
                return 'Arizona'
            case '35':
                return 'New Mexico'
            case '48':
                return 'Texas'
        }
    },

    regularPack: function(sortBy) {
        var levels = [];
            levels.push({
                id: 'cases',
                parentId: null
            });

        for (var i in data.labels[sortBy]) {
            levels.push(data.labels[sortBy][i])
        }

        levels = levels.concat(data.cases.filter(function(d) { return d.parentId !== 'Ignored' && typeof d[sortBy] == 'number' }));

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

    animate: function(positionedData = []) {
        positionedData.sort(function(a,b){
            return a.id - b.id;
        });

        data.cases.forEach(function(dataPoint, i) {
            dataPoint.sx = data.cases[i].x || width / 2;
            dataPoint.sy = data.cases[i].y || height / 2; 
            dataPoint.so = data.cases[i].o || 1;
            dataPoint.tx = positionedData[i] && positionedData[i].x ? positionedData[i].x : width / 2;
            dataPoint.ty = positionedData[i] && positionedData[i].y ? positionedData[i].y : -200;
            dataPoint.to = positionedData[i] && positionedData[i].hide ? 0 : 1;
        }.bind(this));

        if (timer !== undefined) {
            timer.stop();
        }

        timer = d3.timer(function(elapsed) {
            var t = Math.min(1, ease(elapsed / 800));
            data.cases.forEach(function(dataPoint, i) {
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

        data.cases.forEach(function(d) {
            ctx.fillStyle = 'rgba(199, 0, 0, ' + d.o + ')';
            ctx.beginPath();
            ctx.moveTo(d.x + radius, d.y);
            ctx.arc(d.x, d.y, radius, 0, 2 * Math.PI);
            ctx.fill();
        }.bind(this));

        ctx.restore();
    },

    clearLabels: function() {
        $('.uit-canvas__labels').empty();
    },

    createLabel: function(englishLabel, spanishLabel, value, total, x, y, r, large = false, alwaysStack = false) { 
        // get number
        var number;

        if (!total && value || value == data.cases.length) {
            number = value.toLocaleString();
        } else if (total) {
            number = parseFloat((100 / total * value).toFixed(1)) + '%';
        } else {
            number = false;
        }

        // get y position
        var top;
        if (large) {
            top = y;
        } else if (number && y > height * 0.55) {
            top = y + r + 14
        } else {
            top = Math.floor(y - r - 14);
        }

        // get x position
        var left = Math.floor(x);

        $('.uit-canvas__labels').append('<h3 class=\'uit-canvas__label' + (alwaysStack ? ' uit-canvas__label--stacked' : ' ') + (englishLabel === 'Guatemala' || englishLabel === 'El Salvador' ? ' uit-canvas__label--push-left' : ' ') + (englishLabel === 'Nicaragua' || englishLabel === 'Honduras' || englishLabel === 'Belize' ? ' uit-canvas__label--push-right' : ' ') + (!number ? ' uit-canvas__label--numberless' : ' ')+ (large ? ' uit-canvas__label--large' : ' ') + '\' style=\'top: ' + top + 'px; left: ' + left + 'px; \'><span class=\'uit-canvas__label-descriptor\'><span class=\'uit-canvas__label-descriptor__inner\'><span class=\'english\'>' + englishLabel + '</span><span class=\'spanish\'>' + spanishLabel + '</span></span></span>' + (number ? '<span class=\'uit-canvas__label-value\'>' + number + '</span>' : '') + '</h3>');
    },

    createTotalLabel: function(total, x, y) {
        $('.uit-canvas__labels').append('<h3 class=\'uit-canvas__label uit-canvas__label--large\' style=\'top: ' + y + 'px; left: ' + x + 'px; \'><span class=\'uit-canvas__label-value\'>' + total + '</span></h3>');
    },

    addAxisLabel: function(sortBy, x, y, width) {
        var label;
        switch(sortBy) {
            case 'previousDeportation':
                label = { english: 'Time since previous deportation', spanish: 'TK TK TK' }
                break;
            case 'sentenceMisdemeanor':
                label = { english: 'Length of sentences for misdemeanor illegal entry', spanish: 'TK TK TK' }
                break;
            case 'sentenceFelony':
                label = { english: 'Length of sentences for felony illegal re-entry', spanish: 'TK TK TK' }
                break;
            case 'sentence-average-misdemeanour':
                label = { english: 'Median sentence length for misdemeanor illegal entry', spanish: 'TK TK TK' }
                break;
            case 'sentence-average-felony':
                label = { english: 'Median sentence length for felony illegal re-entry', spanish: 'TK TK TK' }
                break;
        };

        $('.uit-canvas__labels').append('<h3 class=\'uit-canvas__axis-label\' style=\'top: ' + y + 'px; left: ' + x + 'px; width: ' + width + 'px;\'><span><span class=\'english\'>' + label.english + '</span><span class=\'spanish\'>' + label.spanish + '</span></span></h3>')
    },

    barChart: function(sortBy) {
        $('.uit-canvas svg').empty();

        var dataSet = sortBy === 'sentence-average-misdemeanour' ? 'misdemeanor' : 'felony';

        var barData = [
            {
                district: 'California southern',
                spanishDistrict: 'TK TK TK',
                felony: 60,
                misdemeanor: 16
            },
            {
                district: 'Arizona',
                spanishDistrict: 'TK TK TK',
                felony: 60,
                misdemeanor: 2
            },
            {
                district: 'New Mexico',
                spanishDistrict: 'TK TK TK',
                felony: 43,
                misdemeanor: 8
            },
            {
                district: 'Texas western',
                spanishDistrict: 'TK TK TK',
                felony: 105,
                misdemeanor: 10
            },
            {
                district: 'Texas southern',
                spanishDistrict: 'TK TK TK',
                felony: 130,
                misdemeanor: 3
            }
        ];

        var isMobile = width < 940;
        var chartWidth = isMobile ? width - 40 : 620;

        if (isMobile && chartWidth > 620) {
            chartWidth = 620
        }

        var chartHeight = isMobile ? 250: 250;
        var xOffset = isMobile ? (width - chartWidth) / 2 : (width - chartWidth) / 2 + 120;
        var yOffset = (height - chartHeight) / 2;

        if (isMobile) {
            $('.uit-canvas svg').addClass('is-mobile');
        } else {
            $('.uit-canvas svg').removeClass('is-mobile');
        }

        var y = d3.scaleBand()
                .range([yOffset, yOffset + chartHeight])
                .padding(isMobile ? 0.7 : 0.3);

        var x = d3.scaleLinear()
                .range([xOffset, xOffset + chartWidth]);

        y.domain(barData.map(function(d) { return d.district }));
        x.domain([0, dataSet == 'misdemeanor' ? 20 : 160]);

        var ticks = 8;

        svgCtx.append('g')
            .attr('class', 'grid-lines english')
            .attr('transform', 'translate(0, ' + (yOffset - 12) + ')')
            .call(d3.axisTop(x)
                .ticks(ticks)
                .tickSize(-(chartHeight))
                .tickFormat(function(d) { return d == 0 ? d + ' days' : d})
            )
            .selectAll('.tick text')
            .attr('y', 12)
            .attr('x', 0);

        svgCtx.append('g')
            .attr('class', 'grid-lines spanish')
            .attr('transform', 'translate(0, ' + (yOffset - 12) + ')')
            .call(d3.axisTop(x)
                .ticks(ticks)
                .tickSize(-(chartHeight))
                .tickFormat(function(d) { return d == 0 ? d + ' días' : d})
            )
            .selectAll('.tick text')
            .attr('y', 12)
            .attr('x', 0);

        var graph = svgCtx.append('g')
            .attr('transform', 'translate(' + xOffset + ',' + (isMobile ? 12 : 0) + ')');

        var district = graph.selectAll('g.district')
            .data(barData)
            .enter()
            .append('g')
            .attr('class', 'district');

        district.append('text')
            .attr('y', function(d) { return (isMobile ? -16 : 0) + y(d.district) })
            .attr('x', isMobile ? 0 : -6)
            .attr('class', 'district-name english')
            .text(function(d) { return d.district });

        district.append('text')
            .attr('y', function(d) { return (isMobile ? -16 : 0) + y(d.district) })
            .attr('x', isMobile ? 0 : -6)
            .attr('class', 'district-name spanish')
            .text(function(d) { return d.spanishDistrict });

        district.append('text')
            .attr('y', function(d) { return y(d.district) })
            .attr('x', function(d) { return x(d[dataSet]) - xOffset })
            .attr('class', 'district-percentage english')
            .text(function(d) { return d[dataSet] + ' days' });

        district.append('text')
            .attr('y', function(d) { return y(d.district) })
            .attr('x', function(d) { return x(d[dataSet]) - xOffset })
            .attr('class', 'district-percentage spanish')
            .text(function(d) { return d[dataSet] + ' dias' });

        district.append('rect')
            .attr('y', function(d) { return y(d.district) })
            .attr('x', 0)
            .attr('class', 'felony')
            .attr('width', function(d) { return x(d[dataSet]) - xOffset })
            .attr('height', y.bandwidth());

        this.addAxisLabel(sortBy, xOffset, yOffset + chartHeight + 20, chartWidth);
        this.showMap();
    }
};

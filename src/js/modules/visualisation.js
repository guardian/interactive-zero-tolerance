var d3 = Object.assign(
    require('d3-selection'),
    require('d3-array')
)

var ctx;
var data = require('../../../.data/cleanData.json');

module.exports =  {
    init: function() {
        this.setupCanvas();
    },

    setupCanvas: function() {
        console.log(data);

        var canvas = d3.select('.uit-canvas')
            .append('canvas')
            .attr('width', 1000)
            .attr('height', 1000);

        ctx = canvas.node().getContext('2d');

        this.layoutPoints();
    },

    layoutPoints: function() {
        var pointHeight = 6;
        var pointWidth = 6;
        var pointsPerRow = Math.floor(1000 / pointWidth);
        var numRows = data.length / pointsPerRow;

        data.forEach(function(dataPoint, i) {
            dataPoint.x = pointWidth * (i % pointsPerRow);
            dataPoint.y = pointHeight * Math.floor(i / pointsPerRow);
        });

        this.draw();
    },

    draw: function() {
        ctx.save();

        ctx.clearRect(0, 0, 1000, 1000);

        for (var i = 0; i < data.length; i++) {
            var point = data[i];

            ctx.fillStyle = '#444';
            ctx.fillRect(point.x, point.y, 3, 3);
        }

        ctx.restore();
    }
};

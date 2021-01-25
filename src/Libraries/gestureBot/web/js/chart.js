//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

'use strict';

const sampleTypes = {
    interpolateLabanotation: 1,
    interpolateServos: 2
};

//--------------------------------------------------------------------------------------------
var ServoChart = function (app)
{
    this.self = this;
    this.app = app;

    this.rollingColor = 0;

    this.map = ["lshoulder", "larm", "lelbow", "lhand", "rshoulder", "rarm", "relbow", "rhand"];

    this.colors = [
        { hex: '#00759A', name: 'Blue' },
        { hex: '#F7941D', name: 'Orange' },
        { hex: '#A71930', name: 'Red' },
        { hex: '#679146', name: 'Green' },
        { hex: '#ffc000', name: 'Yellow' },
        { hex: '#9060ff', name: 'Purple' }
    ];

    this.keyFrames = null;
}
//--------------------------------------------------------------------------------------------

ServoChart.prototype.constructor = ServoChart;

//--------------------------------------------------------------------------------------------
ServoChart.prototype.initialize = function initServoChart()
{
    var scope = this;

    for (var i = 0; i < 8; i++) {
        var idL = "lbl0" + (i + 1);
        var labal = document.getElementById(idL);
        var idC = "chk0" + (i + 1);
        var checkBox = document.getElementById(idC);

        if (labal)
            labal.innerHTML = " " + this.map[i];
        else
            console.log("no element of id '" + idL + "'!");

        if (checkBox) {
            checkBox.onclick = function () {
                scope.updateChart();
            };

            if (i == 0)
                checkBox.checked = true;
        } else
            console.log("no element of id '" + idC + "'!");
    }

    this.setupAxis(null);
}
//--------------------------------------------------------------------------------------------
ServoChart.prototype.setupAxis = function (data)
{
    var config = {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'laban - left shoulder',
                    backgroundColor: this.colors[0].hex,
                    borderColor: this.colors[0].hex,
                    fill: false,
                    data: []
                }, {
                    label: 'laban - left upper arm',
                    backgroundColor: this.colors[1].hex,
                    borderColor: this.colors[1].hex,
                    fill: false,
                    data: []
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            title: {
                display: true,
                text: 'servos'
            },
            tooltips: {
                mode: 'index',
                intersect: false,
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'second',
                        displayFormats: { second: 'ss' },
                        distribution: 'linear'
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'time'
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: -360,
                        max: 360
                    },
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'rotation'
                    }
                }]
            }
        }
    };

    var ctx = document.getElementById('canvasChart').getContext('2d');
    ctx.height = 400;

    this.myChart = new Chart(ctx, config);
}
//--------------------------------------------------------------------------------------------
ServoChart.prototype.setKeyFrames = function (keyFrames, gestureInfo)
{
    this.keyFrames = JSON.parse(JSON.stringify(keyFrames));

    this.duration = parseFloat(gestureInfo['duration']);
    this.numSamples = this.keyFrames.length;

    this.updateChart();
}
//--------------------------------------------------------------------------------------------
ServoChart.prototype.updateChart = function ()
{
    //
    // reset labels
    this.myChart.data.labels = [];

    var numTimeTicks = parseInt(this.duration);
    for (i = 0; i < numTimeTicks; i++) {
        var t = moment(0).add(i, 's').toDate();
        this.myChart.data.labels.push(t);
    }

    var t = moment(this.duration).toDate();
    this.myChart.data.labels.push(t);

    //
    // reset data set
    this.myChart.data.datasets = [];

    this.rollingColor = 0;
    for (var i = 0; i < 8; i++) {
        var id = "chk0" + (i + 1);
        var checkBox = document.getElementById(id);

        if (checkBox) {
            var fChecked = checkBox.checked ? true : false;

            if (fChecked) {
                var dataset;

                dataset = this.getDataset(this.map[i], sampleTypes.interpolateServos);
                this.myChart.data.datasets.push(dataset);
            }
        }
    }

    this.myChart.update();
}
//--------------------------------------------------------------------------------------------
ServoChart.prototype.getDataset = function (joint, sampleType)
{
    var dataset = {};

    if (sampleType == sampleTypes.interpolateLabanotation) {
        dataset.label = "laban - " + joint;
        dataset.data = this.getSamples(joint, false);
    } else {
        dataset.label = "servo - " + joint;
        dataset.data = this.getSamples(joint, true);
    }

    dataset.fill = false;
    dataset.backgroundColor = this.colors[this.rollingColor].hex;
    dataset.borderColor = this.colors[this.rollingColor].hex;

    this.rollingColor++;
    if (this.rollingColor >= this.colors.length)
        this.rollingColor = 0;

    return dataset
}
//--------------------------------------------------------------------------------------------
ServoChart.prototype.getSamples = function (joint, interpolateServo)
{
    var data = [];
    var prevDeg = 0.0;

    for (var idx = 0; idx < this.keyFrames.length; idx++) {
        var keyFrame = this.keyFrames[idx];
        var servos = keyFrame['servos'];
        var kft = keyFrame['time'];
        var time = moment(0).add(kft, 's').toDate();

        var rotation = servos[joint];
        var deg = THREE.MathUtils.radToDeg(rotation);

        if (idx > 0) {
            var diff = Math.abs(deg - prevDeg);
            if (diff > 180) { // is there a significant change?
                if (deg > 0)
                    deg -= 360.0;
                else
                    deg += 360.0;
            }
        }

        prevDeg = deg;

        var info = { t: time, y: deg };

        data.push(info);
    }

    return data;
}


var request = require('sync-request');
var fs = require('fs-extra');
var gsjson = require('google-spreadsheet-to-json');
var deasync = require('deasync');
var userHome = require('user-home');
var keys = require(userHome + '/.gu/interactives.json');

var data;
var newData = false;

function fetchData(callback) {
    gsjson({
        spreadsheetId: '1yQLS5GHxHc3DyT2K79N3YiGKb4Fy759VKu2RvRE3M10',
        workSheets: 'USE ONLY',
        credentials: keys.google
    })
    .then(function(result) {
        callback(result);
    })
    .then(function(err) {
        if (err) {
            console.log(err);
        }
    });
}

function cherryPickFields() {
    var newData = {};
        newData.cases = [];

    for (var i in data) {
        newData.cases.push({
            id: parseInt(i) / 10000 + 0.00001,
            nationality: data[i].nationality.toLowerCase().replace(/ /g, '-'),
            gender: getGender(data[i].gender),
            location: getLocation(data[i]['county,State']),
            previousDeportation: data[i].timeSincePreviousDeportation,
            sentenced: data[i].offence,
            sentence: data[i].newSentenceCategories,
            outcome: data[i].outcome
        });
    }

    data = newData;

    return data;
}

function getLocation(string) {
    if (string) {
        string = string.split(', ');

        if (string.length > 1) {
            return string[0].toLowerCase().replace(/ /g, '-') + '-' + string[1].toLowerCase().replace(/ /g, '-');
        }
    }

    return 'Unknown'
}

function getGender(string) {
    if (string) {
        if (string === 'M') {
            return 'Male';
        } else if (string === 'F') {
            return 'Female';
        }
    }

    return 'Unknown';
}

function addLabels() {
    data.labels = {};

    for (var viz in data.cases[0]) {
        if (viz !== 'id') {
            data.labels[viz] = {};
        }
    }

    for (var i in data.cases) {
        for (var viz in data.labels) {
            if (data.cases[i][viz]) {
                if (data.labels[viz][data.cases[i][viz]]) {
                    data.labels[viz][data.cases[i][viz]].value++;
                } else {
                    data.labels[viz][data.cases[i][viz]] = {
                        value: 1,
                        id: Object.keys(data.labels[viz]).length,
                        englishLabel: data.cases[i][viz],
                        spanishLabel: 'TK TK TK',
                        parentId: 'cases'
                    }
                }
            }
        }
    }

    return data;
}

function minifyCases() {
    for (var i in data.cases) {
        for (var key in data.cases[i]) {
            if (data.cases[i][key] && key !== 'id') {
                data.cases[i][key] = data.labels[key][data.cases[i][key]].id;
            }
        }
    }

    return data;
}

function addExtraLabels() {
    data.labels.default = {};
    data.labels.default.case = {
        value: 3579,
        id: 0,
        englishLabel: 'Total cases analyzed',
        spanishLabel: 'TK TK TK',
        parentId: 'cases'
    }

    data.labels.charges = {};
    data.labels.charges['Low-level immigration offenses'] = {
        value: 3121,
        id: 0,
        englishLabel: 'Low-level immigration offenses',
        spanishLabel: 'TK TK TK',
        parentId: 'cases'
    };
    data.labels.charges['Serious offenses'] = {
        value: 458,
        id: 1,
        englishLabel: 'Serious offenses',
        spanishLabel: 'TK TK TK',
        parentId: 'cases'
    }

    return data;
}

function cleanData(data) {
    data = cherryPickFields(data);
    data = addLabels();
    data = minifyCases();
    data = addExtraLabels();

    console.log(data.labels);

    fs.writeFileSync('./.data/cleanData.json', JSON.stringify(data));

    return data;
}

module.exports = function getData() {
    var isDone = false;

    if (newData) {
        console.log('fetching new data... This may take a few minutes');
        fetchData(function(result) {
            console.log(result);
            data = result;
            fs.writeFileSync('./.data/data.json', JSON.stringify(data));
            data = cleanData(data);
            console.log('done');
            isDone = true;
        });
    } else {
        console.log('cleaning old data');
        data = JSON.parse(fs.readFileSync('./.data/data.json'));
        data = cleanData(data);
        isDone = true;
    }

    deasync.loopWhile(function() {
        return !isDone;
    });

    return data;
};
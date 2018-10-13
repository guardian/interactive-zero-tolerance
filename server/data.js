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
            id: i,
            nationality: data[i].nationality.toLowerCase().replace(/ /g, '-'),
            gender: getGender(data[i].gender),
            location: getLocation(data[i]['county,State']),
            previousDeportation: data[i].timeSincePreviousDeportation,
            sentenced: data[i].offence,
            sentence: data[i].newSentenceCategories,
            outcome: data[i].outcome
        });
    }

    return newData;
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

function cleanData(data) {
    data = cherryPickFields();

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
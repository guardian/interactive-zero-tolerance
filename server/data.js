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
        spreadsheetId: '1JBGvwjE_KsMhcsmhtYwfpC9N2Xh2AJLOWxfb8eWxTPY',
        workSheets: 'MASTER',
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

function removeIgnoredCases() {
    for (var i in data) {
        if (data[i]['useOrIgnore?'] == 'ignore') {
            delete data[i];
        }
    }

    data = data.filter(Object);

    return data;
}

function removeDuplicates() {
    // ToDo: Come back and check how duplicates are entered
    for (var i in data) {
        if (data[i]['duplicate?']) {
            delete data[i];
        }
    }

    data = data.filter(Object);

    return data;
}

function cherryPickFields() {
    var newData = [];

    for (var i in data) {
        newData.push({
            id: data[i].caseNumber,
            nationality: data[i].nationality,
            plea: data[i].plea,
            court: data[i].court
        })
    }

    return newData;
}

function cleanData(data) {
    data = removeIgnoredCases();
    data = removeDuplicates();
    data = cherryPickFields();

    fs.writeFileSync('./.data/cleanData.json', JSON.stringify(data));

    return data;
}

module.exports = function getData() {
    var isDone = false;

    if (newData) {
        console.log('fetching new data... This may take a few minutes');
        fetchData(function(result) {
            data = result;
            console.log(data);
            fs.writeFileSync('./.data/data.json', JSON.stringify(data));
            data = cleanData(data);
            isDone = true;
        });
    } else {
        console.log('cleaning old data');
        data = JSON.parse(fs.readFileSync('./.data/cleanData.json'));
        data = cleanData(data);
        isDone = true;
    }

    deasync.loopWhile(function() {
        return !isDone;
    });

    return data;
};
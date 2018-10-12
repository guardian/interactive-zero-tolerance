var request = require('sync-request');
var fs = require('fs-extra');
var gsjson = require('google-spreadsheet-to-json');
var deasync = require('deasync');
var markdown = require('markdown').markdown;
var config = require('../config.json');
var userHome = require('user-home');
var keys = require(userHome + '/.gu/interactives.json');

var data;

function fetchData(callback) {
    gsjson({
        spreadsheetId: config.data.id,
        allWorksheets: true,
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

function sortIntoResults() {
    var newData = {}; 

    for (var section in data) {
        var sectionName = data[section].section.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
            if (+match === 0) return "";
            return index == 0 ? match.toLowerCase() : match.toUpperCase();
        });

        newData[sectionName] = {
            english: data[section].english,
            spanish: data[section].spanish
        }
    }

    return newData;
}

module.exports = function getData() {
    var isDone = false;

    fetchData(function(result) {
        data = result[0];
        data = sortIntoResults();

        isDone = true;
    });

    deasync.loopWhile(function() {
        return !isDone;
    });

    return data;
};
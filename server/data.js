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
            nationality: data[i].nationality,
            gender: getGender(data[i].gender),
            location: verifyLocation(data[i]['county,State']),
            previousDeportation: data[i].timeSincePreviousDeportation,
            sentenceFelony: data[i].offence === 'Felony re-entry' ? data[i].newSentenceCategories : undefined,
            sentenceMisdemeanor: data[i].offence === 'Misdemeanor illegal entry' ? data[i].newSentenceCategories : undefined,
            sentenced: data[i].offence,
            outcome: data[i].outcome
        });
    }

    data = newData;

    return data;
}

function verifyLocation(string) {
    if (string.includes(', ')) {
        return string;
    } else {
        return;
    }
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

    var sentence = ['1 (1-2 days)', '2 (3-7 days)', '3 (8-14 days)', '4 (15-30 days)', '5 (1-3 months)', '6 (3-6 months)', '7 (6-12 months)', '8 (>1 year)'];
    var shortSentenceLabels = ['1-2 days', '3-7', '8-14', '15-30', '1-3 months', '3-6', '6-12', '>1 year'];
    var shortSpanishSentence = ['1-2 días', '3-7', '8-14', '15-30', '1-3 meses', '3-6', '6-12', '>1 año'];
    var spanishSentence = ['1-2 días', '3-7 días', '8-14 días', '15-30 días', '1-3 meses', '3-6 meses', '6-12 meses', '>1 año'];

    for (var i in sentence) {
        data.labels.sentenceFelony[sentence[i]] = {
            value: 0,
            id: parseInt(i),
            englishLabel: sentence[i].match(/\(([^)]+)\)/)[1],
            englisLabelMobile: shortSentenceLabels[i],
            spanishLabel: spanishSentence[i],
            spanishLabel: shortSpanishSentence[i],
            parentId: 'cases'
        }
        data.labels.sentenceMisdemeanor[sentence[i]] = {
            value: 0,
            id: parseInt(i),
            englishLabel: sentence[i].match(/\(([^)]+)\)/)[1],
            englishLabelMobile: shortSentenceLabels[i],
            spanishLabel: spanishSentence[i],
            spanishLabel: shortSpanishSentence[i],
            parentId: 'cases'
        }
    }

    var previousDeportation = ['1 (≤1 week)', '2 (1-4 weeks)', '3 (1-6 months)', '4 (6-12 months)', '6 (>1 year)'];
    var spanishPreviousDeportation = ['≤ 1 semana', '1-4 semanas', '1-6 meses', '6-12 meses', '>1 año'];

    for (var i in previousDeportation) {
        data.labels.previousDeportation[previousDeportation[i]] = {
            value: 0,
            id: parseInt(i),
            englishLabel: previousDeportation[i].match(/\(([^)]+)\)/)[1],
            spanishLabel: spanishPreviousDeportation[i],
            parentId: 'cases'
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
                        spanishLabel: convertToSpanish(data.cases[i][viz]),
                        parentId: 'cases'
                    }
                }
            }
        }
    }

    return data;
}

function convertToSpanish(english) {
    var babel = {
        "Total cases analyzed": "Total de casos analizados",
        "Low-level immigration offenses": "Ofensas de inmigración de bajo nivel",
        "Serious offenses": "Delitos graves",
        "Misdemeanor illegal entry": "Entrada ilegal de nivel menor",
        "Other misdemeanor": "Otros delitos menores",
        "Misuse of documents ": "Documentos falsos",
        "Felony re-entry": "Reingreso de nivel grave",
        "Mexico": "México",
        "Belize": "Belice",
        "Guatemala": "Guatemala",
        "Honduras": "Honduras",
        "El Salvador": "El Salvador",
        "Nicaragua": "Nicaragua",
        "Cuba": "Cuba",
        "Dominican Republic": "República Dominicana",
        "Ecuador": "Ecuador",
        "Colombia": "Colombia",
        "Venezuela": "Venezuela",
        "Brazil": "Brasil",
        "Peru": "Perú",
        "Number of migrants by country of origin": "Número de migrantes por país de origen",
        "Male": "Hombre",
        "Female": "Mujer",
        "Unknown": "Desconocido",
        "≤1 week": "≤ 1 semana",
        "1-4 weeks": "1-4 semanas",
        "1-6 months": "1-6 meses",
        "6-12 months": "6-12 meses",
        ">1 year": "> 1 año",
        "Time since previous deporation": "Tiempo pasado desde última deportación",
        "California": "California",
        "Arizona": "Arizona",
        "New Mexico": "Nuevo México",
        "Texas": "Texas",
        "Number of arrests by county": "Número de arrestos por condado",
        "Pleaded guilty": "Declarado culpable",
        "Not competent": "No competente",
        "Case terminated": "Caso terminado",
        "Case dismissed": "Caso ignorado",
        "Pleading not guilty": "Declararon inocente",
        "Found guilty at trial": "Encontrado culpable en el juicio",
        "1-2 days": "1-2 días",
        "3-7 days": "3-7 días",
        "8-14 days": "8-14 días",
        "15-30 days": "15-30 días",
        "1-3 months": "1-3 meses",
        "3-6 months": "3-6 meses",
        "Length of sentences for misdemeanor illegal entry": "Largo de sentencia por entrada ilegal de nivel menor",
        "Length of sentences for felony illegal re-entry": "Largo de sentencia por reingreso de nivel grave",
        "California southern": "Sur de California",
        "Texas western": "Oeste de Texas",
        "Texas southern": "Sur de Texas",
        "0 days": "0 días",
        "16 days": "16 días",
        "2 days": "2 días",
        "8 days": "8 días",
        "10 days": "10 días",
        "3 days": "3 días",
        "Median sentence length for misdemeanor illegal entry": "Sentencia mediana por entrada ilegal de nivel menor",
        "60 days": "60 días",
        "43 days": "43 días",
        "105 days": "105 días",
        "130 days": "130 días",
        "Median sentence length for felony illegal re-entry": "Sentencia mediana por reingreso de nivel grave"
    };

    if (babel[english]) {
        return babel[english];
    } else {
        console.log(english);
        return 'translation missing';
    }
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
        spanishLabel: 'Total de casos analizados',
        parentId: 'cases'
    }

    data.labels.charges = {};
    data.labels.charges['Low-level immigration offenses'] = {
        value: 3121,
        id: 0,
        englishLabel: 'Low-level immigration offenses',
        spanishLabel: 'Ofensas de inmigración de bajo nivel',
        parentId: 'cases'
    };
    data.labels.charges['Serious offenses'] = {
        value: 458,
        id: 1,
        englishLabel: 'Serious offenses',
        spanishLabel: 'Delitos graves',
        parentId: 'cases'
    }

    return data;
}

function calcLocationTotalsByState() {
    data.stateLabels = {};

    for (var i in data.labels.location) {
        var state = i.split(', ')[1];

        if (data.stateLabels[state]) {
            data.stateLabels[state].value += data.labels.location[i].value;
        } else {
            data.stateLabels[state] = {};
            data.stateLabels[state].value = data.labels.location[i].value;
            data.stateLabels[state].englishLabel = state;
            data.stateLabels[state].spanishLabel = convertToSpanish(state);
        }
    }

    return data;
}

function cleanData(data) {
    data = cherryPickFields(data);
    data = addLabels();
    data = minifyCases();
    data = addExtraLabels();
    data = calcLocationTotalsByState();

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
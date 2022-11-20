// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

let app = express();
let port = 8000;

app.use(express.json());

// Open SQLite3 database (in read-only mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});


// GET request handler for crime codes
app.get('/codes', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    res.status(200).type('json').send({}); // <-- you will need to change this
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    res.status(200).type('json').send({}); // <-- you will need to change this
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {

    var statement = 'SELECT case_number, strftime("%Y-%m-%d", date_time) as date, strftime("%H:%M:%S", date_time) as time, code, incident, police_grid, neighborhood_number, block FROM Incidents ';
 
    var query = Object.keys(req.query).filter(key => ['start_date', 'end_date', 'code', 'grid', 'neighborhood', 'limit'].includes(key));
    if (!query.includes('limit')) {
        query.push('dino')
    }
    query.forEach(key => {
        switch (key) {
            case 'start_date':
                var start_date = req.query[key];
                statement += `WHERE date >= (${start_date}) `;
                break;
            case 'end_date':
                var end_date = req.query[key];
                statement += `WHERE date <= (${end_date}) `;
                break;
            case 'code':
                var code = req.query[key].split(',');
                statement += `WHERE code IN (${code.join(", ")}) `;
                break;
            case 'grid':
                var grid = req.query[key].split(',');
                statement += `WHERE police_grid IN (${grid.join(", ")}) `;
                break;
            case 'neighborhood':
                var neighborhood = req.query[key].split(',');
                statement += `WHERE neighborhood_number IN (${neighborhood.join(", ")}) `;
                break;
            default:
                var limit = 1000;
                if (key == 'limit') {
                    limit = req.query[key];
                }
                statement += `ORDER BY date_time ASC LIMIT ${limit} `;
                break;
        }

    });

    databaseSelect(statement, {})
    .then(rows => {
        res.status(200).type('json').send(rows);
    }).catch(error => {
        res.status(401).type('json').send(error + ' you silly goose.');
    });
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data

    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

// DELETE request handler for new crime incident
app.delete('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data

    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});


// Create Promise for SQLite3 database SELECT query 
function databaseSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        })
    })
}

// Create Promise for SQLite3 database INSERT or DELETE query
function databaseRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    })
}


// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});

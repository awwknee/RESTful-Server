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
    var query = Object.keys(req.query).filter(key => ['code'].includes(key));
    if (query.length > 0){
        var statement = 'SELECT code, incident_type as type FROM Codes ';
        query.forEach(key => {
            if (key.toLowerCase()==='code') {
                var codes = req.query[key].split(',');
                statement += `WHERE code = '${codes[0]}'`;
                if (codes.length > 1) {
                    for (let x=1;x<codes.length;x++) {
                        if (x !== codes.length) {
                            statement += ` OR `;
                        }
                        statement += `code = '${codes[x]}'`;
                    }
                }
            } 
        });
        statement += 'ORDER BY code ASC'
    }
    databaseSelect(statement, {})
    .then(rows => {
        if(rows.length==0) {
            throw Error //throw error because rows is empty, meaning not in database
        }
        res.status(200).type('json').send(rows);
    })
    .catch(err => {
        res.status(401).type('json').send('Unable to find the requested information you silly goose.');
    })
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    var statement = 'SELECT neighborhood_number as ID, neighborhood_name as Name FROM NEIGHBORHOODS ORDER BY ID ASC';
    databaseSelect(statement, {})
    .then(rows => {
        res.status(200).type('json').send(rows);
    })
    .catch(err => {
        res.status(401).type('json').send(err + ' you silly goose.');
    })
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query);
    var statement = 'SELECT case_number, strftime("%Y-%m-%d", date_time) as date, strftime("%H:%M:%S", date_time) as time, code, incident, police_grid, neighborhood_number, block FROM Incidents ';
    
    var query = Object.keys(req.query).filter(key => ['start_date', 'end_date', 'code', 'grid', 'neighborhood', 'limit'].includes(key));

    if (!query.includes('limit')) {
        query.push('limit')
    }
    query.forEach(key => {
        switch (key) {
            case 'start_date':
                var start_date = req.query[key];
                statement += `WHERE date >= '${start_date}'`;
                break;
            case 'end_date':
                var end_date = req.query[key];
                statement += `WHERE date <= '${end_date}'`;
                break;
            case 'code':
                var codes = req.query[key].split(',');
                statement += `WHERE code = '${codes[0]}'`;
                if (codes.length > 1) {
                    for (let x=1;x<codes.length;x++) {
                        if (x !== codes.length) {
                            statement += ` OR `;
                        }
                        statement += `code = '${codes[x]}'`;
                    }
                }
                break;
            case 'grid':
                var grids = req.query[key].split(',');
                statement += `WHERE police_grid = '${grids[0]}'`;
                if (grids.length > 1) {
                    for(let x=1;x<grids.length;x++){
                        if(x !== grids.length) {
                            statement += ` OR `;
                        }
                        statement += `police_grid = '${grids[x]}'`;
                    }
                }
                break;
            case 'neighborhood':
                var neighborhoods = req.query[key].split(',');
                statement += `WHERE neighborhood_number = '${neighborhoods[0]}'`;
                if(neighborhoods.length >1){
                    for(let x=1;x<neighborhoods.length;x++){
                        if(x !== neighborhoods.length){
                            statement += ` OR `;
                        }
                        statement += `neighborhood_number = '${neighborhoods[x]}'`
                    }
                }
                break;
            default:
                var limit = 1000;
                if (req.query['limit']) {
                    limit = req.query['limit'];
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

app.use((req, res) => {
    res.status(401).type('json').send(`Unable to find ${req.originalUrl}`);  
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

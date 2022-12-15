// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');
const cors = require('cors');

let db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

let app = express();
let port = 8080;
app.use(express.json());
app.use(cors());

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
                statement += `WHERE code IN (${codes.join(", ")}) `;
            } 
        });
        statement += 'ORDER BY code ASC'
    } else if (req.url.toLowerCase() === '/codes'){
        var statement = 'SELECT code, incident_type as type FROM Codes ORDER BY code ASC'
    } else {
        var statement = ''
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
    var query = Object.keys(req.query).filter(key => ['id'].includes(key));
    if (query.length > 0){
        var statement = 'SELECT neighborhood_number as ID, neighborhood_name as Name FROM NEIGHBORHOODS ';
        query.forEach(key => {
            if (key.toLowerCase()==='id') {
                var neighborhoods = req.query[key].split(',');
                statement += `WHERE ID IN (${neighborhoods.join(", ")}) `;
            } 
        });
        statement += 'ORDER BY ID ASC'
    } else if (req.url.toLowerCase() === '/neighborhoods'){
        var statement = 'SELECT neighborhood_number as ID, neighborhood_name as Name FROM NEIGHBORHOODS ORDER BY ID ASC'
    } else {
        var statement = ''
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

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {

    var statement = 'SELECT case_number, strftime("%Y-%m-%d", date_time) as date, strftime("%H:%M:%S", date_time) as time, code, incident, police_grid, neighborhood_number, block FROM Incidents';
 
    var query = Object.keys(req.query).filter(key => ['start_date', 'end_date', 'code', 'grid', 'neighborhood'].includes(key));
    if (query.length > 0) {
        statement += ' WHERE ';
    }

    var sql = query.map(key => {
        switch (key) {
            case 'start_date':
                var start_date = req.query[key];
                return `date >= '${start_date}'`
            case 'end_date':
                var end_date = req.query[key];
                return `date <= '${end_date}'`
            case 'code':
                var code = req.query[key].split(',');
                return `code IN (${code.join(", ")})`
            case 'grid':
                var grid = req.query[key].split(',');
                return `police_grid IN (${grid.join(", ")})`
            case 'neighborhood':
                var neighborhood = req.query[key].split(',');
                return `neighborhood_number IN (${neighborhood.join(", ")})`
        }
    });
    
    statement += sql.join(' AND ');

    var limit = 1000;
    if (req.query['limit']) {
        limit = req.query['limit'];
    }

    if (limit == 0) limit = 1000;
    
    statement += ` ORDER BY date_time ASC LIMIT ${limit} `;

    databaseSelect(statement, {})
    .then(rows => {
        if (rows.length == 0) {
            throw new Error('No rows found');
        }
        res.status(200).type('json').send(rows);
    }).catch(error => {
        console.log(error);
        res.status(401).type('json').send('Unable to find the requested information you silly goose.');
    });
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    body=req.body;
    bodyS = JSON.stringify(body);
    statement = `SELECT case_number FROM Incidents WHERE case_number = "${body.case_number}"`
    databaseSelect(statement, {})
    .then(rows => {
        if (!(bodyS.includes('case_number') && bodyS.includes('date') && bodyS.includes('time') && bodyS.includes('code') && bodyS.includes('incident') && bodyS.includes('police_grid') && bodyS.includes('neighborhood_number') && bodyS.includes('block'))){
            throw Error
        }
        if (rows.length === 0) {
            statement = `INSERT INTO Incidents VALUES (${body.case_number}, "${body.date}T${body.time}", ${body.code}, "${body.incident}", ${body.police_grid}, ${body.neighborhood_number}, "${body.block}")`;
            databaseRun(statement,{})
            .then(res.status(200).type('txt').send(`Added case number ${body.case_number} to the database.`))
        } else {
            throw Error;
        }
    })
    .catch(err => {
        res.status(500).type('txt').send(`Unable to add case number ${body.case_number} to the database.`)
    });
});
//USE THIS FOR ADDING NEW INCIDENT TESTING
//curl -X PUT -H "Content-Type: application/json" -d '{"case_number": 94171569, "date": "2014-08-13", "time": "05:00:00", "code":641, "incident":"Theft", "police_grid":33,"neighborhood_number":5,"block":"132X WESTMINSTER ST"}' localhost:8000/new-incident

//USE THIS FOR REMOVING INCIDENT TESTING
//curl -X DELETE -H "Content-Type: application/json" -d '{"case_number":94171569}' localhost:8000/remove-incident;  

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    statement = `SELECT case_number FROM Incidents WHERE case_number = "${req.body.case_number}"`
    databaseSelect(statement, {})
    .then(rows => {
        if (rows.length !== 0) {
            statement = `DELETE FROM Incidents WHERE case_number = "${req.body.case_number}"`
            databaseRun(statement,{})
            .then(res.status(200).type('txt').send(`Removed case number ${req.body.case_number} from the database.`))
        } else {
            throw Error;
        }
    })
    .catch(err => {
        res.status(500).type('txt').send(`Unable to remove case number ${req.body.case_number} from the database.`)
    });
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

app.get('*', function (req, res) {
    res.status(404).type('json').send({ error: 404, message: `There was nothing found at ${req.url} you silly goose.`});
});

// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});

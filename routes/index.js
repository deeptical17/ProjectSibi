var express = require('express');
var router = express.Router();
var fs = require("fs");
var csv = require('csv');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var _ = require('underscore');
var querystring = require('querystring');
var waterfall = require('async-waterfall');
var path = require('path');
var AWS = require('aws-sdk');
var mailer = require('nodemailer');
var datetime = require('node-datetime');
var pg = require("pg");

var conString = "pg://mlimhzmsvitqnj:17aabd9ccceb76a22bc12a67c824393d9a8ae53c8030aa445012258de96909ee@ec2-107-20-250-195.compute-1.amazonaws.com:5432/deknahqr1rsgju";



/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', {
        title: 'Express',
        message: ""
    });
});


router.get('/userDetails', function(req, res, next) {
    res.render('userDetails', {
        title: 'Express',
        message: ""
    });
});


router.post("/upload", function(req, res, next) {
   var  user_contacts_ids = [];
    var client = new pg.Client(conString);
    client.connect();
    

    var user_contacts = client.query('INSERT INTO user_contacts (email, first_name, last_name, created_at, updated_at) values($1, $2, $3, $4, $5) RETURNING id', [req.body.email, req.body.first_name, req.body.last_name, new Date(), new Date()] )

        

    console.log(user_contacts_ids, '*************');
    var dt = datetime.create();
    var create_date = dt.format('dmYH:M:S');

    var inputfile = req.file.path;
    var outputfile = req.file.filename;
    // const geocodeCp = require('child_process');
    // checkCsvFileHeader();

    //1.
    var csv = require('csv');
    //2.
    var obj = csv();
    //3.
    user_contacts.on('end', function(result) {
      // result.rows should contain the data you inserted along with the
      // id that was generated.
      console.log(result.rows[0].id + ' rows were received');
      user_contacts_ids.push(12);
    })
    function Employee($1, $2, $3, $4, $5, $6,$7,$8, $9, $10, $11, $12, $13, $14,$15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,$33, $34, $35, $36, $37, $38, $39, $40, $41, $42) {
        client.query('INSERT INTO user_details ( number, gender, name_set, title, given_name, middle_initial, surname, street_address, city, state, state_full, zip_code, country, country_full, email_address, username, password, browser_user_agent, telephone_number, telephone_country_code, mothers_maiden, birthday, age, cc_type, cc_number, cvv2, cc_expires, national_id, ups, western_union_mtcn, money_gram_mtcn, color, occupation, company, vehicle, domain, guid, latitude, longitude, created_at, updated_at, user_contact_id) values($1, $2, $3, $4, $5, $6,$7,$8, $9, $10, $11, $12, $13, $14,$15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,$33, $34, $35, $36, $37, $38, $39, $40, $41, $42)', [$1, $2, $3, $4, $5, $6,$7,$8, $9, $10, $11, $12, $13, $14,$15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,$33, $34, $35, $36, $37, $38, $39, $40, $41, $42]);
    };
     
    //4.
    var Employees = [];
     
    //5.
    obj.from.path("./uploads/" + outputfile).to.array(function (data) {
        for (var index = 1; index < data.length; index++) {
           
            Employees.push(new Employee( data[index][0], data[index][1],  data[index][2],  data[index][3],  data[index][4],  data[index][5],  data[index][6], data[index][7], data[index][8],  data[index][9],  data[index][10],  data[index][11],  data[index][12],  data[index][13],  data[index][14], data[index][15],  data[index][16],  data[index][17],  data[index][18],  data[index][19],  data[index][20],  data[index][21],  data[index][22],  data[index][23],  data[index][24],  data[index][25],  data[index][26],  data[index][27],  data[index][28],  data[index][29],  data[index][30],  data[index][31],  data[index][32], data[index][33],  data[index][34],  data[index][35],  data[index][36],  data[index][37],  data[index][38], new Date(), new Date(),  user_contacts_ids[0]));
        }
        // console.log(Employees);
    });

    console.log(user_contacts_ids, '*************');
     return res.render('upload', {
        message: "Please provide the the csv in the for format 'Address', 'City', 'State', 'Zip'",
        url_data: ""
    });   

});


module.exports = router;
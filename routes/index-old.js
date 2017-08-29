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


AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY ,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    "region": process.env.AWS_REGION
});

var s3bucket = new AWS.S3({
    params: {
        Bucket: process.env.AWS_IMAGE_URL
    }
});

var user_email_id = process.env.USER_EMAIL;
var clientId      = process.env.CLIENT_ID ;
var clientSecret  = process.env.CLIENT_SECRET;
var refreshToken  = process.env.REFRESH_TOKEN;



/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', {
        title: 'Express',
        message: ""
    });
});

router.post("/upload", function(req, res, next) {
    var dt = datetime.create();
    var create_date = dt.format('dmYH:M:S');

   

    // not using now
    // var smtpConfig_client = {
    //     service: "Gmail",
    //     auth: {
    //         XOAuth2: {
    //             user: user_email_id, // Your gmail address.
    //             // Not @developer.gserviceaccount.com
    //             clientId: clientId,
    //             clientSecret: clientSecret,
    //             refreshToken: refreshToken,
    //             timeout: 3600
    //         }
    //     }
    // };

   


    var inputfile = req.file.path;
    var outputfile = req.file.filename;
    const geocodeCp = require('child_process');
    checkCsvFileHeader();

    function checkCsvFileHeader() {
        var importedFile = csv();
        var count = 0;
        var headers;

        importedFile
            .from.path(inputfile, {
                delimiter: ',',
                escape: '"'
            })
            .to.stream(fs.createWriteStream("./outputs/" + outputfile))
            .to.options({
                newColumns: true
            })
            .transform(function(row, index, callback) {
                process.nextTick(function() {
                    count += 1;
                    console.log('Row ' + count);
                    if (!headers) {
                        headers = row;
                        // [ 'Address', 'City', 'State', 'Zip' ]
                        var addresscsv = _.contains(headers, "Address");
                        var citycsv = _.contains(headers, "City");
                        var statecsv = _.contains(headers, "State");
                        var zipcsv = _.contains(headers, "Zip");
                        if ((addresscsv && citycsv && statecsv && zipcsv) === false) {
                            console.log("Program Ended");
                           headerCheckError('header_not_valid');
                        } else {
                            headerCheckError('header_valid');
                            geocodeCSV();
                        }
                        callback(null, headers);
                        return;
                    }
                });
            }, {
                parallel: 1
            })
            .on('close', function(count) {
                console.log('Number of lines: ' + count);
            })
            .on('error', function(error) {
                console.log(error.message);
            });
        console.log('Output File inseide the header: ' + outputfile);
    };


    // delete temp files
    function deleteTempFile(all_temp_path) {
        all_temp_path.forEach(function(path, index) {
            fs.unlink(path, function(err) {
                if (err) {
                    console.error(err);
                }
                console.log('Temp File Delete' + path);
            });
        });
    };

    function geocodeCSV() {
        const geocodeN = geocodeCp.fork("./controllers/geocode.js");
        geocodeN.on('message', function(m) {
            console.log('PARENT got message:', m);
            if (m) {
                gsUpdateFun(m);
            } else {
                deleteTempFile(outputfile);
                // return res.render('upload', {
                //     message: "Please provide the the csv in the for format 'Address', 'City', 'State', 'Zip'",
                //     url_data: ""
                // });
                headerCheckError('header_not_valid');
            }
        });
        geocodeN.send({
            inputfile: req.file
        });
    }

    var inputfile_data = req.file;
    var houseHold =  req.body.houseHold;

    function gsUpdateFun(abc) {
        const schoolCp = require('child_process');
        const schoolN = schoolCp.fork("./controllers/gs-update.js");
        console.log('insdide the second');
        schoolN.on('message', function(mg) {
            console.log('gs-update parent :', mg);
            if (mg.close) {
                console.log(mg, 'mg return');
                crimeUpdate(mg);
            }
        });
        schoolN.send({
            inputfile: inputfile_data
        });
    }

    function crimeUpdate(cri) {
        const crimeCp = require('child_process');
        const crimeN = crimeCp.fork("./controllers/crime-update.js");
        console.log('insdide the second');
        crimeN.on('message', function(crime_msg) {
            console.log('gs-update parent :', crime_msg);
            if (crime_msg.close) {
                console.log(crime_msg, 'crime return');
                zillowFn(crime_msg);
            }
        });
        crimeN.send({
            inputfile: inputfile_data
        });
    }

    function zillowFn(zillo) {
        const zillowCp = require('child_process');
        const zillowN = zillowCp.fork("./controllers/zillow.js");
        console.log('insdide the zillow');
        zillowN.on('message', function(zillow_msg ) {
            console.log('zillowN parent :', zillow_msg);
            if (zillow_msg.close) {
                console.log(zillow_msg, 'zillowN return');
                checkForHouseHold(zillow_msg)
                // houseHolIncomedcall(zillow_msg);
            }
        });
        zillowN.send({
            inputfile: inputfile_data, 
            houseHold: houseHold

        });
    }

    function checkForHouseHold(houseHoldArg) {
        if(req.body.houseHold == undefined){
            SaveDataToAws(houseHoldArg);
        }else{
            houseHolIncomedcall(houseHoldArg);

        }
    }

    // household
     function houseHolIncomedcall(household_arg) {
        const houseHolIncomedCp = require('child_process');
        const houseHolIncomedN = houseHolIncomedCp.fork("./controllers/household-income.js");
        console.log('insdide the household income');
        houseHolIncomedN.on('message', function(household) {
            console.log('household parent :', household);
            if (household.close) {
                console.log(household, 'houseHolIncomedN return');
                SaveDataToAws(household);
            }
        });
        houseHolIncomedN.send({
            inputfile: inputfile_data
        });
    }


    var rename_filename = req.file.originalname.split('.csv')[0]+"_"+create_date+"_Processed.csv"

    function SaveDataToAws(mg) {
        var inputfile = req.file.filename
        var outputfile = req.file.filename;
        fs.readFile(outputfile, function(err, data) {
            console.log(outputfile);
            s3bucket.createBucket(function() {
                var params = {
                    Key: rename_filename, //file.name doesn't exist as a property
                    Body: data

                };
                s3bucket.upload(params, function(err, data) {
                    // Whether there is an error or not, delete the temp file
                    var data1 = data;

                    // deleteTempFile([inputfile_data.path,
                    //     "./outputs/"     + inputfile_data.filename,
                    //     "./uploads/"     + inputfile_data.filename, 
                    //     "./crime_output/"+ inputfile_data.filename,
                    //     "./jsUpdate_output/"+ inputfile_data.filename,
                    //     "./house_hold/"+ inputfile_data.filename,
                    //     outputfile 
                    //     ])

                    console.log("PRINT FILE:", req.file);
                    if (err) {
                        console.log('ERROR MSG: ', err);
                        res.status(500).send(err);
                    } else {
                        console.log(data);
                        var send_csv_email

                        function watingForProcess() {
                            send_csv_email = setTimeout(sendMailToUsers, 1000)
                        }

                        function sendMailToUsers() {
                            console.log('insdide the sendMailToUsers');
                            // var transporter = mailer.createTransport('smtps://testing.bittern@gmail.com:bittern123@smtp.gmail.com');
                            // var transporter = mailer.createTransport("SMTP", smtpConfig_client);
                    
                            var transporter = mailer.createTransport({
                              service: 'SendGrid',
                                auth: {
                                  user: 'svc_smtp' ,
                                  pass: '(37VW*pm1i$B%6X@'
                                }
                            });
                            
                            var mailOptions = {
                                from: 'no-reply-propertyrange@colonystarwood.com', // sender address 
                                to: req.body.email, // list of receivers 
                                subject: 'CSV File ', // Subject line 
                                generateTextFromHTML: true,
                                body: 'Click here to download the CSV file',
                                // attachments: [{
                                //     path: data1["Location"]
                                // }, {
                                //     // filename: req.file.originalname,
                                //     filename: rename_filename,
                                //     filePath: data1["Location"]
                                // }]
                                attachments: [
                                  {
                                    filename: rename_filename,
                                    path: data1["Location"]
                                  }
                                ]
                            };

                            transporter.sendMail(mailOptions, function(error, info) {
                                if (error) {
                                    return console.log(error);
                                }
                                console.log('Message sent: ' + info.message);
                                // transporter.close();
                            });
                        }
                        watingForProcess();
                        // return res.render('upload', {
                        //     message: "Successfuly Uploaded",
                        //     url_data: data1["Location"]
                        // });
                    }
                });
            });
        });
    }

    function headerCheckError(error) {
        if (error === 'header_not_valid'){
            deleteTempFile([inputfile, "./outputs/" + outputfile]);
            return res.render('upload', {
                message: "Please provide the the csv in the for format 'Address', 'City', 'State', 'Zip'",
                url_data: ""
            });        
        }
        else if (error === 'header_valid'){
            return res.render('upload', {
                message: "Successfuly Uploaded",
                // url_data: "https://s3-us-west-2.amazonaws.com/csh-zillow-data/" +req.file.originalname
                url_data: "https://s3-us-west-2.amazonaws.com/csh-zillow-data/"+rename_filename
            });        
        }
        else{
             deleteTempFile([inputfile, "./outputs/" + outputfile]);
            return res.render('upload', {
                message: "Please provide the the csv in the for format 'Address', 'City', 'State', 'Zip'",
                url_data: ""
            });   
        }
   }
    
    

    

});



router.post("/uploadCrime", function(req, res, next) {
    var dt = datetime.create();
    var create_date = dt.format('dmYH:M:S');

   
    //not using
    
    // var smtpConfig_client = {
    //     service: "Gmail",
    //     auth: {
    //         XOAuth2: {
    //             user: user_email_id, // Your gmail address.
    //             // Not @developer.gserviceaccount.com
    //             clientId: clientId,
    //             clientSecret: clientSecret,
    //             refreshToken: refreshToken,
    //             timeout: 3600
    //         }
    //     }
    // };

    var inputfile = req.file.path;
    var outputfile = req.file.filename;
    const geocodeCp = require('child_process');
    checkCsvFileHeader();

    function checkCsvFileHeader() {
        var importedFile = csv();
        var count = 0;
        var headers;

        importedFile
            .from.path(inputfile, {
                delimiter: ',',
                escape: '"'
            })
            .to.stream(fs.createWriteStream("./outputs/" + outputfile))
            .to.options({
                newColumns: true
            })
            .transform(function(row, index, callback) {
                process.nextTick(function() {
                    count += 1;
                    console.log('Row ' + count);
                    if (!headers) {
                        headers = row;
                        // [ 'Address', 'City', 'State', 'Zip' ]
                        var addresscsv = _.contains(headers, "Address");
                        var citycsv = _.contains(headers, "City");
                        var statecsv = _.contains(headers, "State");
                        var zipcsv = _.contains(headers, "Zip");
                        if ((addresscsv && citycsv && statecsv && zipcsv) === false) {
                            console.log("Program Ended");
                            deleteTempFile([inputfile, "./outputs/" + outputfile]);
                            headerCheckError('header_not_valid');
                            // return res.render('upload', {
                            //     message: "Please provide the the csv in the for format 'Address', 'City', 'State', 'Zip'",
                            //     url_data: ""
                            // });
                        } else {
                            headerCheckError('header_valid');
                            geocodeCSV();
                        }
                        callback(null, headers);
                        return;
                    }
                });
            }, {
                parallel: 1
            })
            .on('close', function(count) {
                console.log('Number of lines: ' + count);
            })
            .on('error', function(error) {
                console.log(error.message);
            });
        console.log('Output File inseide the header: ' + outputfile);
    };


    // delete temp files
    function deleteTempFile(all_temp_path) {
        all_temp_path.forEach(function(path, index) {
            fs.unlink(path, function(err) {
                if (err) {
                    console.error(err);
                }
                console.log('Temp File Delete' + path);
            });
        });
    };

    function geocodeCSV() {
        const geocodeN = geocodeCp.fork("./controllers/geocode.js");
        geocodeN.on('message', function(m) {
            console.log('PARENT got message:', m);
            if (m) {
                crimeUpdate(m);
            } else {
                deleteTempFile(outputfile);
                // return res.render('upload', {
                //     message: "Please provide the the csv in the for format 'Address', 'City', 'State', 'Zip'",
                //     url_data: ""
                // });
                headerCheckError('header_not_valid');
            }
        });
        geocodeN.send({
            inputfile: req.file
        });
    }

    var inputfile_data = req.file;
    
    function crimeUpdate(cri) {
        const crimeCp = require('child_process');
        const crimeN = crimeCp.fork("./controllers/crime-update2.js");
        console.log('insdide the second');
        crimeN.on('message', function(crime_msg) {
            console.log('gs-update parent :', crime_msg);
            if (crime_msg.close) {
                console.log(crime_msg, 'crime return');
                SaveDataToAws(crime_msg);
            }
        });
        crimeN.send({
            inputfile: inputfile_data
        });
    }


    var rename_filename = req.file.originalname.split('.csv')[0]+"_"+create_date+"_Processed.csv"

    function SaveDataToAws(mg) {
        var inputfile = req.file.filename
        var outputfile = req.file.filename;
        fs.readFile(outputfile, function(err, data) {
            console.log(outputfile);
            s3bucket.createBucket(function() {
                var params = {
                    Key: rename_filename, //file.name doesn't exist as a property
                    Body: data

                };
                s3bucket.upload(params, function(err, data) {
                    // Whether there is an error or not, delete the temp file
                    var data1 = data;

                    deleteTempFile([inputfile_data.path,
                        "./outputs/"     + inputfile_data.filename,
                        "./uploads/"     + inputfile_data.filename, 
                        outputfile 
                        ])

                    console.log("PRINT FILE:", req.file);
                    if (err) {
                        console.log('ERROR MSG: ', err);
                        res.status(500).send(err);
                    } else {
                        console.log(data);
                        var send_csv_email

                        function watingForProcess() {
                            send_csv_email = setTimeout(sendMailToUsers, 1000)
                        }

                        function sendMailToUsers() {
                            
                            var transporter = mailer.createTransport({
                              service: 'SendGrid',
                                auth: {
                                  user: 'svc_smtp' ,
                                  pass: '(37VW*pm1i$B%6X@'
                                }
                            });
                                
                            console.log('insdide the sendMailToUsers');
                            // var transporter = mailer.createTransport('smtps://testing.bittern@gmail.com:bittern123@smtp.gmail.com');
                            // var transporter = mailer.createTransport("SMTP", smtpConfig_client);
                            var mailOptions = {
                                from: 'no-reply-propertyrange@colonystarwood.com', // sender address 
                                to: req.body.email, // list of receivers 
                                subject: 'CSV File ', // Subject line 
                                generateTextFromHTML: true,
                                body: 'Click here to download the CSV file',
                                attachments: [
                                  {
                                    filename: rename_filename,
                                    path: data1["Location"]
                                  }
                                ]
                            };

                            transporter.sendMail(mailOptions, function(error, info) {
                                if (error) {
                                    return console.log(error);
                                }
                                console.log('Message sent: ' + info.message);
                                // transporter.close();
                            });
                        }
                        watingForProcess();
                        // return res.render('upload', {
                        //     message: "Successfuly Uploaded",
                        //     url_data: data1["Location"]
                        // });
                    }
                });
            });
        });
    }

    // return res.render('upload', {
    //     message: "Successfuly Uploaded",
    //     url_data: "https://s3-us-west-2.amazonaws.com/csh-zillow-data/"+rename_filename
    // });

     function headerCheckError(error) {
        if (error === 'header_not_valid'){
            deleteTempFile([inputfile, "./outputs/" + outputfile]);
            return res.render('upload', {
                message: "Please provide the the csv in the for format 'Address', 'City', 'State', 'Zip'",
                url_data: ""
            });        
        }
        else if (error === 'header_valid'){
            return res.render('upload', {
                message: "Successfuly Uploaded",
                // url_data: "https://s3-us-west-2.amazonaws.com/csh-zillow-data/" +req.file.originalname
                url_data: "https://s3-us-west-2.amazonaws.com/csh-zillow-data/"+rename_filename
            });        
        }
        else{
             deleteTempFile([inputfile, "./outputs/" + outputfile]);
            return res.render('upload', {
                message: "Please provide the the csv in the for format 'Address', 'City', 'State', 'Zip'",
                url_data: ""
            });   
        }
   }
});


module.exports = router;
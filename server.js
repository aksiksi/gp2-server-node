// Imports
var dgram = require('dgram');
var http = require('http');
var util = require('util');
var MongoClient = require('mongodb').MongoClient;

// Configuration
const DB_URL = 'mongodb://localhost:27017/testing';
const NOMATIM_API = 'nominatim.openstreetmap.org';
const NOMATIM_REVERSE = '/reverse?format=json&lon=%d&lat=%d';

// Database query handler
var findRoad = (parsed, db, callback) => {
  // Final response
  var resp = {'online': 1};

  const lat = parsed.lat;
  const lng = parsed.lng;

  // API request options
  var options = {
    hostname: NOMATIM_API,
    path: util.format(NOMATIM_REVERSE, lng, lat),
    headers: {
      'User-Agent': 'UAEU Senior Project in EE'
    }
  };

  // Make request to Nomatim API
  http.get(options, res => {
    var data = '';

    res.on('data', chunk => data += chunk.toString());

    res.on('end', () => {
      // Extract street name from response
      var r = JSON.parse(data);
      var osmID, streetName;

      // If reverse geocoding fails, return server offline
      try {
        osmID = r.osm_id;
        streetName = r.address.road;
      } catch (e) {
        console.log(e);
        resp.online = 0;
        callback(resp);
        return;
      }

      // Perform query on roads collection using `osm_id`
      var roads = db.collection('roads');

      roads.findOne({'osm_id': osmID}, (err, road) => {
        // Read error
        if (err != null) {
          console.log(err);
          resp.online = 0;
          callback(resp);
          return;
        }

        // Road not in DB
        if (road == null) {
          resp.found = 0;
          callback(resp);
          return;
        }

        // Success
        resp.found = 1;
        resp.name = road.name;
        resp.speed = road.speed;

        callback(resp);
      });
    });
  })
  .on('error', e => {
    // HTTP request failed
    console.log(e.message);
    resp.online = 0;
    callback(resp);
  });
};

// UDP message handler
var processRequest = (req, remote, socket) => {
  var parsed;
  var valid = true;

  var sendResponse = resp => {
    var b = new Buffer(resp);
    socket.send(resp, 0, resp.length, remote.port, remote.address);
  };

  try {
    parsed = JSON.parse(req);

    // Check for correct params
    if (!parsed.lat || !parsed.lng) {
      throw Error();
    }
  } catch (e) {
    console.log(e.message);
    valid = false;
  }

  if (valid) {
    MongoClient.connect(DB_URL, (err, db) => {
      // Database offline
      if (err != null) {
        sendResponse(JSON.stringify({'online': 0}));
        db.close();
        return;
      }

      findRoad(parsed, db, resp => {
        sendResponse(JSON.stringify(resp));
        db.close();
      });
    });
  }
};

// UDP server
var socket = dgram.createSocket('udp4');
var c = 0;

socket.bind(8080, '127.0.0.1');

socket.on('listening', () => {
  console.log('Listening on 8080...');
});

socket.on('message', (req, remote) => {
  console.log('Message #' + (++c) + ' received!');

  processRequest(req, remote, socket);
});

socket.on('error', (error) => {
  console.log(error.stack);
  socket.close();
});

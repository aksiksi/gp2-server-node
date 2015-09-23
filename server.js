// Imports
var net = require('net');
var MongoClient = require('mongodb').MongoClient;

// Configuration
const DB_URL = 'mongodb://localhost:27017/testing';

var findRoad = function (parsed, db, callback) {
  var resp = {'online': 1};

  const coords = db.collection('coords');

  // Query the coordinates
  const q = {
    lat: {$gt: parsed.lat-0.1, $lt: parsed.lat+0.1},
    lng: {$gt: parsed.lng-0.1, $lt: parsed.lng+0.1}
  };

  console.log(q);

  // Query coords collection
  coords.findOne(q, {fields: {'_id': 0, 'road_id': 1}}, function (err, coord) {
    if (err == null) {
      if (coord != null) {
        console.log(coord);

        const roads = db.collection('roads');

        roads.findOne({"_id": {$eq: coord.road_id}}, function (err, road) {
          if (err == null) {
            if (road != null) {
              resp['found'] = 1;
              resp['name'] = road.name;
              resp['speed'] = road.speed;

              callback(resp);
            }
          } else {
            resp['online'] = 0;
            callback(resp);
          }
        });
      } else {
        resp['found'] = 0;
        callback(resp);
      }
    } else {
      console.log(err);
      resp['online'] = 0;
      callback(resp);
    }
  });
};

var processRequest = function (req, conn) {
  var parsed;
  var valid = true;

  try {
    parsed = JSON.parse(req);

    // Check for correct params
    if (!parsed.lat || !parsed.lng) {
      throw Error();
    }
  } catch (err) {
    valid = false;
  }

  if (valid) {
    MongoClient.connect(DB_URL, function (err, db) {
      if (err == null) {
        findRoad(parsed, db, function (resp) {
          conn.write(JSON.stringify(resp));
          db.close();
        });
      }
      else {
        // Server offline
        conn.write(JSON.stringify({'online': 0}));
        db.close();
      }
    });
  }
};

// TCP server
var c = 0;

var server = net.createServer(function (conn) {
  var client = ++c;

  console.log('Client ' + client + ' connected!');

  conn.on('data', function(chunk) {
    console.log(chunk.toString());
    processRequest(chunk, conn);
  });

  // Req fully received; process it
  conn.on('end', function () {
    console.log('Client ' + client + ' disconnected!');
    conn.end();
  });
});

server.listen(8080, function() {
  console.log('Listening...');
});

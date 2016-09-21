var Myo = require('myo');
var config = require('./config');

Myo.connect('com.stolksdorf.' + config.appName);

Myo.on('connected', function() {
  console.log('CONNECTED !');
});

module.exports = {
  init: function(cb) {
    console.log('STARTING MYO');
    var movements = [];
    var punching = false;

    Myo.on('gyroscope', function() {
      if (movements.length >= config.trackAmount) {
        movements = [];
      }

      movements.push(this.lastIMU.gyroscope);

      var measureAmt = config.measureAmount;
      var moveAmt = movements.length;

      if (moveAmt > measureAmt) {
        var last = movements.slice((moveAmt - 1) - measureAmt, moveAmt - 1);
        var steps = last.map(function(step) {
          return step.z;
        }).reduce(function(a, b) {
          return b - a;
        }, 0);

        var avgStep = steps / measureAmt;

        if (avgStep > config.punchThreshold && !punching) {
          punching = true;
          console.log('FALCON PUNCH!!!!');
          cb();

          // wait at least half a second for punch to finish
          setTimeout(function() {
            punching = false;
          }, 500);
        }
      }
    });
  }
}

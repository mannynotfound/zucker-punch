require('../styles/app.css');

var target;
var copy;
var copycanvas;
var draw;

var TILE_WIDTH = 32;
var TILE_HEIGHT = 24;
var TILE_CENTER_WIDTH = 16;
var TILE_CENTER_HEIGHT = 12;
var SOURCERECT = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

var PAINTRECT = {
  x: 0,
  y: 0,
  width: window.innerWidth - 15,
  height: window.innerHeight - 15
};

function createFakeClick() {
  var offset = getOffset();
  var target = document.getElementById('target');
  var width = target.getAttribute('width');
  var height = target.getAttribute('height');

  var randOffsetX = Math.floor(Math.random() * width);
  var randOffsetY = Math.floor(Math.random() * height);

  return {
    pageX: offset.x + randOffsetX,
    pageY: offset.y + randOffsetY,
    target: target
  };
}

function init() {
  var socket = io.connect();

  target = document.getElementById('target');
  var width = target.getAttribute('width');
  var height = target.getAttribute('height');

  copycanvas = document.getElementById('targetcopy');
  copycanvas.setAttribute('width', width);
  copycanvas.setAttribute('height', height);
  copy = copycanvas.getContext('2d');

  var outputcanvas = document.getElementById('output');
  outputcanvas.setAttribute('width', PAINTRECT.width);
  outputcanvas.setAttribute('height', PAINTRECT.height);
  draw = outputcanvas.getContext('2d');
  // this is crazy but kinda cool never seen a string passed to setInterval
  setInterval(processFrame, 33);

  outputcanvas.addEventListener('click', dropBomb, false);

  socket.on('punch', function() {
    var fakeEvt = createFakeClick();
    dropBomb(fakeEvt);
    console.log('PUNCH!');
  });
}

function getOffset() {
  var offsetX = TILE_CENTER_WIDTH + (PAINTRECT.width - SOURCERECT.width) / 2;
  var offsetY = TILE_CENTER_HEIGHT + (PAINTRECT.height - SOURCERECT.height) / 2;

  return {
    x: offsetX,
    y: offsetY
  };
}

function createTiles() {
  var offset = getOffset();
  var y = 0;
  while (y < SOURCERECT.height) {
    var x = 0;
    while(x < SOURCERECT.width) {
      var tile = new Tile();
      tile.targetX = x;
      tile.targetY = y;
      tile.originX = offset.x + x;
      tile.originY = offset.y + y;
      tile.currentX = tile.originX;
      tile.currentY = tile.originY;
      tiles.push(tile);
      x += TILE_WIDTH;
    }
    y += TILE_HEIGHT;
  }
}

var RAD = Math.PI / 180;
var randomJump = false;
var tiles = [];
var debug = false;

function processFrame(){
  var isVideo = !isNaN(target.duration);

  if (SOURCERECT.width == 0) {
    SOURCERECT = {
      x: 0,
      y: 0,
      width: target.videoWidth || target.getAttribute('width'),
      height: target.videoHeight || target.getAttribute('height')
    };

    createTiles();
  }

  if (isVideo) {
    if (randomJump) {
      randomJump = false;
      target.currentTime = Math.random() * target.duration;
    }
    //loop
    if (target.currentTime == target.duration) {
      target.currentTime = 0;
    }
  }

  var debugStr = "";
  //copy tiles
  copy.drawImage(target, 0, 0);
  draw.clearRect(PAINTRECT.x, PAINTRECT.y, PAINTRECT.width, PAINTRECT.height);

  for (var i = 0; i < tiles.length; i++){
    var tile = tiles[i];
    if (tile.force > 0.0001) {
      //expand
      tile.moveX *= tile.force;
      tile.moveY *= tile.force;
      tile.moveRotation *= tile.force;
      tile.currentX += tile.moveX;
      tile.currentY += tile.moveY;
      tile.rotation += tile.moveRotation;
      tile.rotation %= 360;
      tile.force *= 0.9;
      if (tile.currentX <= 0 || tile.currentX >= PAINTRECT.width) {
        tile.moveX *= -1;
      }
      if (tile.currentY <= 0 || tile.currentY >= PAINTRECT.height) {
        tile.moveY *= -1;
      }
    } else if (tile.rotation != 0 || tile.currentX != tile.originX || tile.currentY != tile.originY) {
      //contract
      var diffx = (tile.originX - tile.currentX) * 0.2;
      var diffy = (tile.originY - tile.currentY) * 0.2;
      var diffRot = (0 - tile.rotation) * 0.2;

      if (Math.abs(diffx) < 0.5) {
        tile.currentX = tile.originX;
      } else {
        tile.currentX += diffx;
      }
      if (Math.abs(diffy) < 0.5) {
        tile.currentY = tile.originY;
      } else {
        tile.currentY += diffy;
      }
      if (Math.abs(diffRot) < 0.5) {
        tile.rotation = 0;
      } else {
        tile.rotation += diffRot;
      }
    } else {
      tile.force = 0;
    }
    draw.save();
    draw.translate(tile.currentX, tile.currentY);
    draw.rotate(tile.rotation * RAD);
    draw.drawImage(copycanvas, tile.targetX, tile.targetY, TILE_WIDTH, TILE_HEIGHT, -TILE_CENTER_WIDTH, -TILE_CENTER_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
    draw.restore();
  }
  if (debug) {
    debug = false;
    document.getElementById('trace').innerHTML = debugStr;
  }
}

function explode(x, y) {
  for (var i = 0; i < tiles.length; i++) {
    var tile = tiles[i];

    var xdiff = tile.currentX - x;
    var ydiff = tile.currentY - y;
    var dist = Math.sqrt(xdiff * xdiff + ydiff * ydiff);

    var randRange = 220 + (Math.random() * 30);
    var range = randRange - dist;
    var force = 3 * (range / randRange);
    if (force > tile.force) {
      tile.force = force;
      var radians = Math.atan2(ydiff, xdiff);
      tile.moveX = Math.cos(radians);
      tile.moveY = Math.sin(radians);
      tile.moveRotation = 0.5 - Math.random();
    }
  }

  tiles.sort(zindexSort);
  processFrame();
}
function zindexSort(a, b) {
  return (a.force - b.force);
}

function dropBomb(evt) {
  console.log('DROPPING BOMB');
  var posx = 0;
  var posy = 0;
  var e = evt;
  var output = document.getElementById('output');
  console.log(e.pageX, e.pageY);

  if (e.pageX || e.pageY) {
    posx = e.pageX;
    posy = e.pageY;
  } else if (e.clientX || e.clientY) {
    posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
  }
  var canvasX = posx - e.target.offsetLeft;
  var canvasY = posy - e.target.offsetTop;
  explode(canvasX, canvasY);
}

function Tile() {
  this.originX = 0;
  this.originY = 0;
  this.currentX = 0;
  this.currentY = 0;
  this.rotation = 0;
  this.force = 0;
  this.z = 0;
  this.moveX= 0;
  this.moveY= 0;
  this.moveRotation = 0;

  this.targetX = 0;
  this.targetY = 0;
}

window.onload = init();;

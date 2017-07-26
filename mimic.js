// Mimic Me!
// Fun game where you need to express emojis being displayed

// --- Affectiva setup ---

// The affdex SDK Needs to create video and canvas elements in the DOM
var divRoot = $("#camera")[0];  // div node where we want to add these elements
var width = $("#camera")[0].clientWidth;  // camera image size
var height = width * 3/4;
var faceMode = affdex.FaceDetectorMode.LARGE_FACES;  // face mode parameter

// Initialize an Affectiva CameraDetector object
var detector = new affdex.CameraDetector(divRoot, width, height, faceMode);

// Enable detection of all Expressions, Emotions and Emojis classifiers.
detector.detectAllEmotions();
detector.detectAllExpressions();
detector.detectAllEmojis();
detector.detectAllAppearance();

// --- Utility values and functions ---

// Unicode values for all emojis Affectiva can detect
var emojis = [ 128528, 9786, 128515, 128524, 128527, 128521, 128535, 128539, 128540, 128542, 128545, 128563, 128561 ];
var validEmojis = [ 128528, 9786, 128515, 128521, 128535, 128539, 128540, 128542, 128545, 128563, 128561 ];
var targetEmoji, score=0, total=-1;
var timerID=-1, counterID=-1;
var timeout=9000, timer=timeout/1000;
var emojiMode = 'status';
var startTime, endTime;
var nPlayers=1, playerLoc = new Array(nPlayers);
var emojiTargets = new Array();
var setSpeed = 1, setPoints=10, setDrops = 1, setCols = 3;

// sound from http://www.rpgamer.com/games/ff/ff7/ff7snd.html
var audio_point = new Audio('point.wav');
// sound from http://soundbible.com/
var audio_counter = new Audio('beep.mp3')
var audio_fail = new Audio('fail.mp3')
audio_point.volume = 0.0;
audio_counter.volume = 0.0;
audio_fail.volume = 0.0;
// music from http://www.bensound.com
var audio_background = new Audio('bensound-funkyelement.mp3');

// Update target emoji being displayed by supplying a unicode value
function setTargetEmoji(code) {
  $("#target").html("&#" + code + ";");
}

// Convert a special character to its unicode value (can be 1 or 2 units long)
function toUnicode(c) {
  if(c.length == 1)
    return c.charCodeAt(0);
  return ((((c.charCodeAt(0) - 0xD800) * 0x400) + (c.charCodeAt(1) - 0xDC00) + 0x10000));
}

// Update score being displayed
function setScore(correct, total) {
  $("#score").html("Score: " + correct + " / " + total);
}

// Display log messages and tracking results
function log(node_name, msg) {
  $(node_name).append("<span>" + msg + "</span><br />")
}

// settings
function settingSpeed(speed){
  setSpeed = speed;
}
function settingPoints(points){
  setPoints = points;
}
function settingDrops(drops){
  setDrops = drops;
}
function settingColumns(cols){
  setCols = cols;
}

// --- Callback functions ---

// Start button
function onStart() {
  if (detector && !detector.isRunning) {
    $("#logs").html("");  // clear out previous log
    $("#camera").html("");
    detector.start();  // start detector
  }
  log('#logs', "Start button pressed");
  
  // needed to make sound work on android
  audio_point.play()
  audio_counter.play()
  audio_fail.play()
  if (audio_background.paused){
    audio_background = new Audio('bensound-funkyelement.mp3');
    audio_background.play()
  }
}

// Stop button
function onStop() {
  audio_background.pause()
  audio_background.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=';
  clearInterval(counterID);
  clearInterval(emojiTimer);
  clearInterval(lifeTimer);
  audio_point.volume = 0.0;
  audio_counter.volume = 0.0;
  audio_fail.volume = 0.0;
  emojiTargets = [];
  score = 0

  log('#logs', "Stop button pressed");
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();  // stop detector
  }
};

// Add a callback to notify when camera access is allowed
detector.addEventListener("onWebcamConnectSuccess", function() {
  log('#logs', "Webcam access allowed");
});

// Add a callback to notify when camera access is denied
detector.addEventListener("onWebcamConnectFailure", function() {
  log('#logs', "webcam denied");
  console.log("Webcam access denied");
});

// Add a callback to notify when detector is stopped
detector.addEventListener("onStopSuccess", function() {
  log('#logs', "The detector reports stopped");
  $("#results").html("");
});

// Add a callback to notify when the detector is initialized and ready for running
detector.addEventListener("onInitializeSuccess", function() {
  log('#logs', "The detector reports initialized");
  //Display canvas instead of video feed because we want to draw the feature points on it
  $("#face_video_canvas").css("display", "block");
  $("#face_video").css("display", "none");

  // Initialise game
  gameInit()
});

// Add a callback to receive the results from processing an image
// NOTE: The faces object contains a list of the faces detected in the image,
//   probabilities for different expressions, emotions and appearance metrics
detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
  var canvas = $('#face_video_canvas')[0];
  var ctx = canvas.getContext('2d');

  if (!canvas)
    return;

  // draw a mirrored image of the webcam
  drawToCanvas(canvas, ctx, width, height);

  // Report how many faces were found
  $('#results').html("");
  log('#results', "Timestamp: " + timestamp.toFixed(2));
  log('#results', "Number of faces found: " + faces.length);
  if (faces.length > 0) {
    // Report desired metrics
    log('#results', "Appearance: " + JSON.stringify(faces[0].appearance));
    log('#results', "Emotions: " + JSON.stringify(faces[0].emotions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log('#results', "Expressions: " + JSON.stringify(faces[0].expressions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log('#results', "Emoji: " + faces[0].emojis.dominantEmoji);

    nPlayers = faces.length;

    // Call functions to draw feature points and dominant emoji (for the first face only)
    for (n=0; n<nPlayers; n++) {
      getPlayerLocation(canvas, faces[n], n);
      drawFeaturePoints(canvas, image, faces[n]);
      drawEmoji(canvas, image, faces[n], emojiMode, n);
    }
    drawGrid(canvas, image);
    drawTargets(canvas);
    drawScore(canvas);

    gameRun(canvas, image, faces);
  }
});

// --- Custom functions ---

// Draw a mirrored image of the webcam
function drawToCanvas(v, context, width, height){
  context.save();
  context.scale(-1,1);
  context.drawImage(v,0,0,width*-1,height);
  context.restore();
}

// Get location of player on the board
function getPlayerLocation(canvas, face, player=0){
  var x = new Array(face.featurePoints.length);
  var y = new Array(face.featurePoints.length);

  for (var id in face.featurePoints) {
    x[id] = face.featurePoints[id].x;
    y[id] = face.featurePoints[id].y;
  }

  playerLoc[player].xmax = width-Math.min(...x);
  playerLoc[player].xmin = width-Math.max(...x);
  playerLoc[player].xcenter = (playerLoc[player].xmin + playerLoc[player].xmax) / 2;
  playerLoc[player].ymin = Math.min(...y);
  playerLoc[player].ymax = Math.max(...y);
  playerLoc[player].ycenter = (playerLoc[player].ymin + playerLoc[player].ymax) / 2;

}

// Draw the detected facial feature points on the image
function drawFeaturePoints(canvas, img, face) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  ctx.strokeStyle = 'lightblue';

  // Loop over each feature point in the face
  for (var id in face.featurePoints) {
    var featurePoint = face.featurePoints[id];
    ctx.beginPath();
    ctx.arc(width-featurePoint.x, featurePoint.y, 2, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

// Draw the dominant emoji on the image
function drawEmoji(canvas, img, face, mode='status', player=0) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  if (mode == 'status') {
    var xpos = playerLoc[player].xmax
    var ypos = playerLoc[player].ycenter
    var size = (playerLoc[player].xmax - playerLoc[player].xmin) / 4;
  } else if (mode == 'success') {
    var size = playerLoc[player].xmax - playerLoc[player].xmin;
    var xpos = playerLoc[player].xcenter - size / 2;
    var ypos = playerLoc[player].ycenter;
  }

  ctx.font = size+'px serif';
  ctx.fillStyle = 'black';
  ctx.fillText(face.emojis.dominantEmoji, xpos, ypos);
}

// Displays the score
function drawScore(canvas) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');
  ctx.font = '32px serif'
  ctx.fillStyle = 'blue';
  ctx.fillText(score + ' / ' + total, width-96, 32);
}

// Displays the game grid, highlighting players location
function drawGrid(canvas, image) {
  var ctx = canvas.getContext("2d");

  // draw grid
  for (n=0; n<columns; n++) {
    ctx.beginPath();
    ctx.moveTo(gamegrid[n],0);
    ctx.lineTo(gamegrid[n],height);
    ctx.stroke();
  }
  // get players grid position
  for (n=0; n<nPlayers; n++){
    playerLoc[n].grid = Math.floor(playerLoc[n].xcenter / (width / columns))
  }
  // highlight the current active grid
  for (n=0; n<nPlayers; n++){
    ctx.fillStyle = 'rgba(225,225,225,0.25)';
    ctx.fillRect(gamegrid[playerLoc[n].grid],0,(width / columns),height);
  }
}

// Displays the target emojis
function drawTargets(canvas){
  var ctx = canvas.getContext('2d');
  var targetsize = Math.floor(width/10);
  ctx.font = targetsize+'px serif';
  ctx.fillStyle = 'black';

  if (emojiTargets.length > 0){
    for (n=0; n<emojiTargets.length; n++){
      targetColumn = emojiTargets[n][0];
      targetEmoji = emojiTargets[n][1];
      targetLife = emojiTargets[n][2];

      xpos = gamegrid[targetColumn] + Math.floor(width/columns/2-targetsize/2);
      ypos = height - (height / emojiLife * targetLife);
      ctx.fillText(String.fromCodePoint(targetEmoji), xpos, ypos);
    }
  }
}

// keep track of emoji lifetime
function reduceLife(erf){
  for (n=0; n<emojiTargets.length; n++){
    emojiTargets[n][2] -= erf;

    // countdown if emoji gets close to bottom
    if (emojiTargets[n][2] <= 2000 && emojiTargets[n][2] % 1000 == 0){
      if (!audio_counter.paused) {
        audio_counter.pause();
        audio_counter.currentTime = 0;
      }
      audio_counter.play();
    }
    // remove emojis that reached the bottom
    if (emojiTargets[n][2] <= 0){
      emojiTargets.splice(n,1);
      
      if (!audio_fail.paused) {
        audio_fail.pause();
        audio_fail.currentTime = 0;
      }
      audio_fail.play();

      if (score>0){
        score --;
        setScore(score,total)
      }
    }
  }
}

// Initialise the game
function gameInit() {
  bgInterval = setInterval(function(){ audio_background.play() }, audio_background.duration*1000)

  // Initialise game parameter with settings or defaults
  // Game mode: mimic X number of emojis and measure time
  score = 0;
  goalscore = setPoints;
  total = goalscore;
  setScore(score, total)

  columns = setCols;
  emojiInterval = 3000 / setDrops;
  emojiLife = 5000 / setSpeed;
  erf = 100; // emoji refresh frequency

  // initialise player location
  for (n=0; n<nPlayers; n++){
    playerLoc[n] = {xmin: 0, xmax: 0, xcenter: 0, ymin: 0, ymax: 0, ycenter: 0};
  }

  // initialise game grid
  gamegrid = new Array(columns);
  for (n=0; n<columns; n++) {
    gamegrid[n] = n*Math.floor(width/columns)
  }
  gamegrid[columns] = width;

  // create random emoji in random column every X seconds
  // start with a delay so everything can be displayed in time
  setTimeout(function() {
    newEmoji();
    emojiTimer = setInterval(function() { newEmoji() }, emojiInterval);

    // keep track of emoji life and position
    lifeTimer = setInterval(function() { reduceLife(erf) }, erf);

    startTime = new Date();
  }, 2000);

  // necessary to make it work on android
  audio_point.volume = 1.0;
  audio_counter.volume = 1.0;
  audio_fail.volume = 1.0;
}

// Run the game, randomly change emojis and check if the player mimics them
function gameRun(canvas, image, faces) {
  var ctx = canvas.getContext('2d');

  // if a player mimics an emoji, remove it from the list of targets
  for (player=0; player<nPlayers; player++){
    hit = emojiTargets.indexOfArray( [playerLoc[player].grid, toUnicode(faces[player].emojis.dominantEmoji)] )

    if (hit != -1){
      emojiTargets.splice(hit,1);
      score += 1;
      setScore(score, total)
      audio_point.play();
      emojiMode = 'success';
      setTimeout(function() {emojiMode='status'}, 1000);

      // check goal condition
      if (score >= goalscore) {
        gameWin(canvas, image, faces[player])
      }
    }
  }
}

// Creates a new emoji in a random columns
function newEmoji() {
  // get a random emoji
  targetEmoji = validEmojis[Math.floor(Math.random() * validEmojis.length)];
  // get a random column
  targetColumn = Math.floor(Math.random() * columns);

  emojiTargets.push([targetColumn, targetEmoji, emojiLife]);
}

// When the game is won
function gameWin(canvas, image, face) {
  endTime = new Date()
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  ctx.font = '32px serif'
  ctx.fillStyle = 'blue';
  
  runtime = (endTime-startTime)/1000;
  ctx.fillText("You mimicked " + goalscore + " emojis in " + runtime + " seconds!", 10, 96);
  drawEmoji(canvas, image, face);

  var img = canvas.toDataURL("image/png");
  $("#camera").html('<img src="'+img+'"/>');
  onStop()
}

// Allows to search for arrays in arrays, ignoring the last element of each element in the array that is being searched in
Array.prototype.indexOfArray = function(input)
{
  var inputJSON = JSON.stringify(input);
  var mapJSON = this.map(function(obj) {
    obj = obj.slice(0,obj.length-1);
    obj = JSON.stringify(obj);
    return obj;
  });
  return mapJSON.indexOf(inputJSON);
};

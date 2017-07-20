// Mimic Me!
// Fun game where you need to express emojis being displayed

// --- Affectiva setup ---

// The affdex SDK Needs to create video and canvas elements in the DOM
var divRoot = $("#camera")[0];  // div node where we want to add these elements
var width = 640, height = 480;  // camera image size
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
var emojiMode = 'status'
var audio_point, audio_background, audio_counter, audio_fail;
var startTime, endTime;

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

// --- Callback functions ---

// Start button
function onStart() {
  if (detector && !detector.isRunning) {
    $("#logs").html("");  // clear out previous log
    detector.start();  // start detector
  }
  log('#logs', "Start button pressed");
}

// Stop button
function onStop() {
  audio_background.pause()
  audio_background.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=';
  clearInterval(counterID);

  log('#logs', "Stop button pressed");
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();  // stop detector
  }
};

// Reset button
function onReset() {
  log('#logs', "Reset button pressed");
  if (detector && detector.isRunning) {
    detector.reset();
  }
  $('#results').html("");  // clear out results
  $("#logs").html("");  // clear out previous log
  $("#camera").html("");  // clear out previous log

  // TODO(optional): You can restart the game as well
  // <your code here>
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
  if (!canvas)
    return;

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

    // Call functions to draw feature points and dominant emoji (for the first face only)
    drawFeaturePoints(canvas, image, faces[0]);
    drawEmoji(canvas, image, faces[0], emojiMode);
    drawCounter(canvas);

    // TODO: Call your function to run the game (define it first!)
    gameRun(canvas, image, faces[0])
  }
});


// --- Custom functions ---

// Draw the detected facial feature points on the image
function drawFeaturePoints(canvas, img, face) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  // TODO: Set the stroke and/or fill style you want for each feature point marker
  // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D#Fill_and_stroke_styles
  ctx.strokeStyle = 'lightblue';

  // Loop over each feature point in the face
  for (var id in face.featurePoints) {
    var featurePoint = face.featurePoints[id];

    // TODO: Draw feature point, e.g. as a circle using ctx.arc()
    // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc
    ctx.beginPath();
    ctx.arc(featurePoint.x, featurePoint.y, 2, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

// Draw the dominant emoji on the image
function drawEmoji(canvas, img, face, mode='status') {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');
  
  // TODO: Draw it using ctx.strokeText() or fillText()
  // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText
  // TIP: Pick a particular feature point as an anchor so that the emoji sticks to your face

  var x = new Array(face.featurePoints.length);
  var y = new Array(face.featurePoints.length);

  for (var id in face.featurePoints) {
    x[id] = face.featurePoints[id].x;
    y[id] = face.featurePoints[id].y;
  }

  if (mode == 'status') {
    var xpos = Math.max(...x);
    var ypos = (Math.max(...y) + Math.min(...y)) / 2;
    var size = (xpos - Math.min(...x)) / 4;
  } else if (mode == 'success') {
    var size = (Math.max(...x) - Math.min(...x));
    var xpos = (Math.max(...x) + Math.min(...x)) / 2 - size / 2;
    var ypos = (Math.max(...y) + Math.min(...y)) / 2;
  }

  ctx.font = size+'px serif';
  ctx.fillStyle = 'black';
  ctx.fillText(face.emojis.dominantEmoji, xpos, ypos);
}


// Displays the countdown timer
function drawCounter(canvas) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  ctx.font = '48px serif'

  if (timer / (timeout/1000) > 2/3){
    ctx.fillStyle = 'green';
  } else if (timer / (timeout/1000) > 1/3){
    ctx.fillStyle = 'yellow';
  } else {
    ctx.fillStyle = 'red';
  } 
  
  ctx.fillText(timer, 10, 48)
}


// Initialise the game
function gameInit() {
  gameGetEmoji();
  score = 0;

  // sound from http://www.rpgamer.com/games/ff/ff7/ff7snd.html
  audio_point = new Audio('point.wav');
  // sound from http://soundbible.com/
  audio_counter = new Audio('beep.mp3')
  audio_fail = new Audio('fail.mp3')
  // music from http://www.bensound.com
  audio_background = new Audio('bensound-funkyelement.mp3');
  // audio_background = new Audio('Venice_Beach.mp3');
  bgInterval = setInterval(function(){ audio_background.play() }, audio_background.duration*1000)

  // Game mode: mimic X number of emojis and measure time
  goalscore = 10;
  total = goalscore;
  setScore(score, total)

  startTime = new Date()
  console.log(startTime)
}


// Run the game, randomly change emojis and check if the player mimics them
function gameRun(canvas, image, face) {
    var ctx = canvas.getContext('2d');

    // if timer runs out, get a new emoji
    checkTimer();

    // if player mimcs emoji, increase score and show new one
    if (targetEmoji == toUnicode(face.emojis.dominantEmoji)){
      score += 1;
      audio_point.play();
      emojiMode = 'success';
      setTimeout(function() {emojiMode='status'}, 1000)

      // check goal condition
      if (score == goalscore) {
        gameWin(canvas, image, face)
      }

      gameGetEmoji();
    }
}


// Check if timer needs to be restarted
function checkTimer(){
  if (timerID == -1){
    timerID = setTimeout(function() { gameGetEmoji('fail') }, timeout);
    timer = timeout/1000;
    counterID = setInterval(function () { 
      timer -= 1; 
      if (timer / (timeout/1000) <= 1/3){
          if (audio_counter.paused) {
            audio_counter.play();
        }else{
            audio_counter.currentTime = 0;
        }
      }
    }, 1000);
  }
}

// Get new emoji in case timer runs out before it has been mimiced
function gameGetEmoji(status='success') {
  clearTimeout(timerID);
  clearInterval(counterID);
  timerID = -1;
  if (status == 'fail') { audio_fail.play() }

  // total += 1;
  setScore(score, total)

  // get a random emoji
  targetEmoji = validEmojis[Math.floor(Math.random() * validEmojis.length)];

  // set it as the target for the player
  setTargetEmoji(targetEmoji);
}

// When the game is won
function gameWin(canvas, image, face) {
  endTime = new Date()
  console.log(endTime)

  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  ctx.font = '32px serif'
  ctx.fillStyle = 'blue';
  
  // ctx.strokeText("You mimicked " + goalscore + " in " + endTime-startTime + " seconds!", 10, 96)
  runtime = (endTime-startTime)/1000;
  ctx.fillText("You mimicked " + goalscore + " emojis in " + runtime + " seconds!", 10, 96);
  drawEmoji(canvas, image, face);

  var img = canvas.toDataURL("image/png");
  $("#camera").html('<img src="'+img+'"/>');
  // document.write('<img src="'+img+'"/>');
  onStop()
}

// TODO: Define any variables and functions to implement the Mimic Me! game mechanics

// NOTE:
// - Remember to call your update function from the "onImageResultsSuccess" event handler above
// - You can use setTargetEmoji() and setScore() functions to update the respective elements
// - You will have to pass in emojis as unicode values, e.g. setTargetEmoji(128578) for a simple smiley
// - Unicode values for all emojis recognized by Affectiva are provided above in the list 'emojis'
// - To check for a match, you can convert the dominant emoji to unicode using the toUnicode() function

// Optional:
// - Define an initialization/reset function, and call it from the "onInitializeSuccess" event handler above
// - Define a game reset function (same as init?), and call it from the onReset() function above

// <your code here>

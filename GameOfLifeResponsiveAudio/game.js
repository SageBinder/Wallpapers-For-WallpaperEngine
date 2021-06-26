'use strict';

Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
};

var screenWidth;
var screenHeight;
var gridWidth;
var cellSize;
var cellPadding;
var gridHeight;

var grid;
var canvas;

var background = [54, 54, 54, 1];
var highColor = [255, 0, 255, 1];
var lowColor = [0, 255, 54, 1];

var defaultGenerationsPerSecond = 16;
var currentInterval;

var audio = [];

var audioHeightAmplification = 1;

var birthValues = [3];
var surviveValues = [2, 3];

function startGame() {
  canvas = document.getElementById("game");
  init();
  initAudioListener();
  initUserPropertyUpdateHandle();
  setUpdateInterval(defaultGenerationsPerSecond);
}

function setUpdateInterval(generationsPerSecond) {
  if(currentInterval) {
    clearInterval(currentInterval);
  }
  currentInterval = setInterval(function() {
    update();
    draw();
  }, (1 / generationsPerSecond) * 1000);
}

function update() {
  doGeneration();
  fillGridWithAudio();
}

function doGeneration() {
  var updatedGrid = [];
  for(var x = 0; x < gridWidth; x++) {
    updatedGrid[x] = [];
    for(var y = 0; y < gridHeight; y++) {
      updatedGrid[x][y] = grid[x][y];
    }
  }

  for(var x = 0; x < gridWidth; x++) {
    for(var y = 0; y < gridHeight; y++) {
      var neighbors = 0;
      var colorSum = [0, 0, 0, 0]

      for(var xOffset = -1; xOffset <= 1; xOffset++) {
        for(var yOffset = -1; yOffset <= 1; yOffset++) {
          var shiftedX = x + xOffset;
          var shiftedY = y + yOffset;

          if((xOffset == 0 && yOffset == 0)
              || shiftedX < 0
              || shiftedX >= gridWidth
              || shiftedY < 0
              || shiftedY >= gridHeight) {
            continue;
          }

          if(grid[shiftedX][shiftedY]) {
            neighbors++;

            colorSum[0] += grid[shiftedX][shiftedY][0];
            colorSum[1] += grid[shiftedX][shiftedY][1];
            colorSum[2] += grid[shiftedX][shiftedY][2];
            colorSum[3] += grid[shiftedX][shiftedY][3];
          }
        }
      }

      if(!surviveValues.includes(neighbors)) {
        updatedGrid[x][y] = false;
      }
      if(birthValues.includes(neighbors)) {
        updatedGrid[x][y] = [
          colorSum[0] / neighbors,
          colorSum[1] / neighbors,
          colorSum[2] / neighbors,
          colorSum[3] / neighbors
        ];
      }
    }
  }

  grid = updatedGrid;
}

function fillGridWithAudio() {
  for(var x = 0; x < audio.length; x++) {
    let colHeight = Math.round(Math.min(audio[x] * gridHeight, gridHeight));
    for(var y = 0; y < colHeight; y++) {
      var colorScaleFromRight = x / (audio.length - 1);
      var colorScaleFromLeft = 1.0 - colorScaleFromRight;
      grid[x][y] = [
        (highColor[0] * colorScaleFromRight) + (lowColor[0] * colorScaleFromLeft),
        (highColor[1] * colorScaleFromRight) + (lowColor[1] * colorScaleFromLeft),
        (highColor[2] * colorScaleFromRight) + (lowColor[2] * colorScaleFromLeft),
        (highColor[3] * colorScaleFromRight) + (lowColor[3] * colorScaleFromLeft),
      ]
    }
  }
}

function draw() {
  let ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, screenWidth, screenHeight);
  ctx.fillStyle = `rgba(${background.join(',')})`;
  ctx.fillRect(0, 0, screenWidth, screenHeight);

  // ctx.fillStyle = `rgba(${cellColor.join(',')})`;
  if(canvas.getContext) {
    for(var x = 0; x < gridWidth; x++) {
      for(var y = 0; y < gridHeight; y++) {
        if(grid[x][y]) {
          let xPos = (cellSize * x) + cellPadding;
          let yPos = (cellSize * y) + cellPadding;
          let drawSize = cellSize - (2 * cellPadding);

          var colorArray = grid[x][y];
          if(!colorArray) {
            colorArray = [0, 0, 0, 0];
          }
          colorArray[0] = Math.round(colorArray[0]).clamp(0, 255);
          colorArray[1] = Math.round(colorArray[1]).clamp(0, 255);
          colorArray[2] = Math.round(colorArray[2]).clamp(0, 255);
          colorArray[3] = Math.round(colorArray[3]).clamp(0, 255);

          ctx.fillStyle = `rgba(${colorArray.join(',')})`;
          ctx.fillRect(xPos, screenHeight - yPos - cellSize, drawSize, drawSize);
        }
      }
    }
  }
}

function init() {
  screenWidth = document.body.clientWidth;
  screenHeight = document.body.clientHeight;

  gridWidth = 128; // Because the audio array provided by WallpaperEngine is always 128 long
  cellSize = screenWidth / gridWidth;
  cellPadding = 2;
  gridHeight = Math.round(screenHeight / cellSize);

  fillGrid();
  resizeCanvas();
}

function fillGrid() {
  grid = [];
  for(var x = 0; x < gridWidth; x++) {
    grid[x] = [];
    for(var y = 0; y < gridHeight; y++) {
      grid[x][y] = false;
    }
  }
}

function resizeCanvas() {
  canvas.width = screenWidth;
  canvas.height = screenHeight;
}

function audioListener(audioArray) {
  audio = []
  for(var i = 64; i < audioArray.length; i++) {
    audio.push(amplify(audioArray[i - 64]));
    audio.push(amplify(audioArray[i]));
  }
}

function amplify(audioVal) {
  return Math.min(Math.pow(Math.round(audioVal * 100000) / 100000, 1 / audioHeightAmplification));
}

function initAudioListener() {
  window.wallpaperRegisterAudioListener(audioListener);
}

function initUserPropertyUpdateHandle() {
  window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {
      rulestringProp(properties);
      lowcolorProp(properties);
      highcolorProp(properties);
      backgroundcolorProp(properties);
      generationspersecondProp(properties);
      audioheightamplificationProp(properties);
    }
  }
}

function rulestringProp(properties) {
  if(properties.rulestring) {
    var values = properties.rulestring.value.split("/");
    var birthValuesString = values[0];
    var surviveValuesString = values[1];

    birthValues = [];
    surviveValues = [];

    for(var c of birthValuesString) {
      if(isNumeric(c)) {
        birthValues.push(parseInt(c));
      }
    }

    for(var c of surviveValuesString) {
      if(isNumeric(c)) {
        surviveValues.push(parseInt(c));
      }
    }
  }
}

function lowcolorProp(properties) {
  if(properties.lowcolor) {
    lowColor = [];
    lowColor = properties.lowcolor.value.split(" ").map(function(c) {
      return Math.ceil(c * 255);
    });
    lowColor.push(1);
  }
}

function highcolorProp(properties) {
  if(properties.highcolor) {
    highColor = [];
    highColor = properties.highcolor.value.split(" ").map(function(c) {
      return Math.ceil(c * 255);
    });
    highColor.push(1);
  }
}

function backgroundcolorProp(properties) {
  if(properties.backgroundcolor) {
    background = [];
    background = properties.backgroundcolor.value.split(" ").map(function(c) {
      return Math.ceil(c * 255);
    });
    background.push(1);
  }
}

function generationspersecondProp(properties) {
  if(properties.generationspersecond) {
    setUpdateInterval(properties.generationspersecond.value);
  }
}

function audioheightamplificationProp(properties) {
  if(properties.audioheightamplification) {
    audioHeightAmplification = properties.audioheightamplification.value;
  }
}

function isNumeric(num) {
  return !isNaN(num);
}
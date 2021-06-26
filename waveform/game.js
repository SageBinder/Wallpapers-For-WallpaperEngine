'use strict';

var freqIndex = [26,48,73,93,115,138,162,185,
  207,231,254,276,298,323,346,370,
  392,414,436,459,483,507,529,552,
  575,598,621,644,669,714,828,920,
  1057,1173,1334,1472,1655,1840,2046,2253,
  2483,2735,3012,3287,3609,3930,4275,4665,
  5056,5493,5929,6412,6917,7446,7998,8618,
  9261,9928,10617,11352,11996,12937,13718,14408];
// Thank you to Squee for this array of frequencies:
// https://steamcommunity.com/sharedfiles/filedetails/?id=837435817

var screenWidth;
var screenHeight;

var maxAmplitude;
var root = 2;
var maxAmplitudeScalar = 0.6;
var screenWidthInSeconds = 0.05;
var numSamples;

var canvas;

var xAxisPosition;

var background = [0, 0, 0, 1];
var lineColor = [0, 255, 0, 1];
var lineWidth = 5;

var interval = 1000 / 30;

var audio;

function startGame() {
  canvas = document.getElementById("game");
  init();
  initAudioListener();
  initUserPropertyUpdateHandle();

  setInterval(function() {
    draw();
  }, interval);
}

function draw() {
  if(canvas.getContext) {
    var frequencySamples = audio.map(function(amplitude, idx) {
      var f = freqIndex[idx];
      var samples = [];
      for(var i = 0; i < numSamples; i++) {
        var t = (i / (numSamples - 1)) * screenWidthInSeconds;
        var sample = amplitude * Math.sin((f * (t + 0.25) * 2 * Math.PI));
        samples.push(sample);
      }

      return samples;
    });

    var sumOfSamples = frequencySamples.reduce(function(x, y) {
      var sum = [];

      for(var i = 0; i < numSamples; i++) {
        sum.push(x[i] + y[i]);
      }

      return sum;
    });

    let ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, screenWidth, screenHeight);
    ctx.fillStyle = `rgba(${background.join(',')})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    ctx.strokeStyle = `rgba(${lineColor.join(',')})`;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();


    ctx.moveTo(0, transformY(sumOfSamples[0]));
    for(var i = 1; i < sumOfSamples.length; i++) {
      var x = (i / (sumOfSamples.length - 1)) * screenWidth
      var y = transformY(sumOfSamples[i]);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function init() {
  screenWidth = document.body.clientWidth;
  screenHeight = document.body.clientHeight;
  maxAmplitude = (screenHeight / 2) * maxAmplitudeScalar;
  xAxisPosition = screenHeight / 2;
  numSamples = Math.round(screenWidth / 2);

  audio = [];
  for(var i = 0; i < 64; i++) {
    audio.push(0);
  }

  resizeCanvas();
}

function resizeCanvas() {
  canvas.width = screenWidth;
  canvas.height = screenHeight;
}

function audioListener(audioArray) {
  audio = []
  for(var i = 64; i < audioArray.length; i++) {
    var value = Math.max(audioArray[i], audioArray[i - 64]);
    var valueRoot = Math.pow(Math.round(value * 1000) / 1000, 1 / root);
    audio.push(Math.min(valueRoot, 1.0));
  }
}

function initAudioListener() {
  window.wallpaperRegisterAudioListener(audioListener);
}

function initUserPropertyUpdateHandle() {
  window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {
      linecolorProp(properties);
      backgroundcolorProp(properties);
      rootProp(properties);
      maxamplitudescalarProp(properties);
      screenwidthinsecondsProp(properties)
      linewidthProp(properties);
    }
  }
}

function linecolorProp(properties) {
  if(properties.linecolor) {
    lineColor = [];
    lineColor = properties.linecolor.value.split(" ").map(function(c) {
      return Math.ceil(c * 255);
    });
    lineColor.push(1);
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

function rootProp(properties) {
  if(properties.root) {
    root = properties.root.value;
  }
}

function maxamplitudescalarProp(properties) {
  if(properties.maxamplitudescalar) {
    maxAmplitudeScalar = properties.maxamplitudescalar.value;
    maxAmplitude = (screenHeight / 2) * maxAmplitudeScalar;
  }
}

function screenwidthinsecondsProp(properties) {
  if(properties.screenwidthinseconds) {
    screenWidthInSeconds = properties.screenwidthinseconds.value;
  }
}

function linewidthProp(properties) {
  if(properties.linewidth) {
    lineWidth = properties.linewidth.value;
  }
}

function isNumeric(num) {
  return !isNaN(num);
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function transformY(y) {
  return (xAxisPosition - ((sigmoid(y) - 0.5) * 2 * maxAmplitude));
}
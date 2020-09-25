let TWO_PI;
let distortionAmount = 0;

const kit = new Tone.Players({
  lo: "samples/mt800_tomlo.wav",
  md: "samples/mt800_tommd.wav",
  hi: "samples/mt800_tomhi.wav",
  bd: "samples/mt800_bd.wav",
  hhc: "samples/mt800_hhc.wav",
  sd: "samples/mt800_sd.wav",
});

// Set up master effects
const compressor = new Tone.Compressor({});
const distortion = new Tone.Distortion({ distortion: 0 });
const reverb = new Tone.Freeverb({ wet: 0 });
const gain = new Tone.Gain({ gain: 1 });
const split = new Tone.MultibandSplit();

kit.chain(distortion, reverb, gain, compressor, split);

// Make low frequencies mono to make reverb effect bearable in headphones
split.low.chain(new Tone.Mono(), Tone.Master);
split.mid.chain(Tone.Master);
split.high.chain(Tone.Master);

const sounds = [
  { sample: "lo", color: [190, 23, 237] },
  { sample: "md", color: [59, 128, 247] },
  { sample: "hi", color: [42, 234, 157] },
  { sample: "bd", color: [224, 132, 13] },
  { sample: "hhc", color: [234, 190, 14] },
  { sample: "sd", color: [224, 10, 100] },
];

tracks = sounds.map((track) => ({
  ...track,
  loop: null,
  loopInterval: 1,
  divisions: 1,
  isMuted: false,
}));

// Create the colored controller for each track
tracks.forEach(({ color, isMuted }, i) => {
  $(".color-controls").append(
    `<div class="color-control" style="background: rgb(${color[0]},${
      color[1]
    },${color[2]});">
      <span>
      <label class="container">
        <input class="mute-toggle" data-track=${i} type="checkbox" checked=${!isMuted}>
        <span class="checkmark"></span>
      </label>
      </span>
      <input class="track-slider" type="range" data-track=${i} value="50" data-target="playbackRate" min="20" max="100"/>
      <input class="track-slider" type="range" data-track=${i} value="1" data-target="divisions" min="1" max="12"/>
    </div>
    `
  );
});

// Create Effect slider
$(".project-controls").append(
  `<div class="effect-knob">
    <div><strong>!</strong></div>
    <input class="effect-range" type="range" data-effect="distortion" value="0" min="0" max="100"/>
    </div>
    `
);

$("#toggle-play").on("click", () => {
  Tone.Transport.toggle();
  $("#toggle-play").toggleClass("is-playing");
});

$(".mute-toggle").on("change", ({ target }) => {
  const { attributes, value } = target;
  const trackIndex = parseInt(attributes["data-track"].value);
  const isMuted = !tracks[trackIndex].isMuted;
  tracks[trackIndex].isMuted = isMuted;
  tracks[trackIndex].loop.mute = isMuted;
});

// handle slider changes
$(".track-slider").on("input", ({ target }) => {
  const { attributes, value } = target;
  const trackIndex = parseInt(attributes["data-track"].value);
  const dataTarget = attributes["data-target"].value;
  if (dataTarget === "playbackRate") {
    tracks[trackIndex].loopInterval = value / 50;
    tracks[trackIndex].loop.interval = value / 50;
  }
  if (dataTarget === "divisions") {
    tracks[trackIndex].divisions = parseInt(value);
  }
});

// reset slider on double click
$(".track-slider").on("dblclick", ({ target }) => {
  const { attributes } = target;
  const trackIndex = parseInt(attributes["data-track"].value);
  const dataTarget = attributes["data-target"].value;
  if (dataTarget === "playbackRate") {
    target.value = 50;
    tracks[trackIndex].loopInterval = 1;
    tracks[trackIndex].loop.interval = 1;
  }
  if (dataTarget === "divisions") {
    target.value = 1;
    tracks[trackIndex].divisions = 1;
  }
});

// Effect/distortion slider on master output
$(".effect-range").on("input", ({ target }) => {
  const { value } = target;
  const val = value / 100;
  distortion.set("distortion", val);
  reverb.set("wet", val);
  const gainVal = 1 - val / 3;
  distortionAmount = val * 5;
  // lower gain a bit because the effects increase the overall volume
  gain.set("gain", gainVal);
});

function setup() {
  TWO_PI = 2 * PI;
  createCanvas(670, 670);
  rectMode(CENTER);

  tracks.forEach(({ sample, loopInterval: initialInterval }, i) => {
    const loop = new Tone.Loop((time) => {
      const { divisions, loopInterval } = tracks[i];
      const timeUnit = loopInterval / divisions;
      for (let i = 0; i < divisions; i++) {
        kit.get(sample).start(time + i * timeUnit);
      }
    }, initialInterval).start(0);
    tracks[i].loop = loop;
  });
}

// Draw circle representing loop
function drawCircle(trackIndex) {
  const { color, loop, divisions, loopInterval } = tracks[trackIndex];
  const { progress } = loop;
  const r = (TWO_PI / (1 / loopInterval)) * 40;

  const currTheta = progress * TWO_PI;
  const sliceTheta = TWO_PI / divisions;
  const stepProgress = (currTheta % sliceTheta) / sliceTheta;
  const size = 14 - stepProgress * 8;

  strokeWeight(6 - stepProgress * 4);
  stroke(...color, 50 - stepProgress * 50);
  circle(width / 2, height / 2, r);
  noStroke();

  push();
  noStroke();
  fill(...color, 255 - stepProgress * 230);
  translate(width / 2, height / 2);
  rotate(progress * TWO_PI);
  ellipse(0, r / -2, size, size);
  pop();
}

// Spokes represent loop divisions
function drawSpokes(trackIndex) {
  const { color, loop, divisions } = tracks[trackIndex];
  const { progress } = loop;
  const currTheta = progress * TWO_PI;
  const sliceTheta = TWO_PI / divisions;
  const stepProgress = (currTheta % sliceTheta) / sliceTheta;

  for (let i = 0; i < divisions; i++) {
    const startTheta = TWO_PI * (i / divisions);
    const endTheta = TWO_PI * ((i + 1) / divisions);
    const isActive = currTheta >= startTheta && currTheta < endTheta;
    const opacity = isActive ? 220 - stepProgress * 150 : 50;
    const rectWidth = isActive ? 12 - stepProgress * 10 : 2;

    push();
    fill(...color, opacity);
    translate(width / 2, height / 2);
    rotate(TWO_PI * (i / divisions));
    if (distortionAmount > 1) {
      rect(
        0,
        -width / 2 - 1,
        rectWidth * random(-distortionAmount, distortionAmount),
        height
      );
    } else {
      rect(0, -width / 2 - 1, rectWidth, height);
    }

    pop();
  }
}

// Dots show progress around the loop
function drawDot(trackIndex) {
  const { color, loop, divisions, loopInterval } = tracks[trackIndex];
  const { progress } = loop;
  const r = (TWO_PI / (1 / loopInterval)) * 40;
  const currTheta = progress * TWO_PI;
  const sliceTheta = TWO_PI / divisions;
  const stepProgress = (currTheta % sliceTheta) / sliceTheta;
  const size = 14 - stepProgress * 8;

  push();
  noStroke();
  fill(...color, 255 - stepProgress * 230);
  translate(width / 2, height / 2);
  rotate(progress * TWO_PI);
  ellipse(0, r / -2, size, size);
  pop();
}

function draw() {
  background(33);
  strokeWeight(2);
  fill(100);
  noStroke();
  noFill();
  // Draw spokes first
  for (let i = 0; i < tracks.length; i++) {
    if (!tracks[i].isMuted) {
      drawSpokes(i);
    }
  }
  // Then circles
  for (let i = 0; i < tracks.length; i++) {
    if (!tracks[i].isMuted) {
      drawCircle(i);
    }
  }
  // Dots on top
  for (let i = 0; i < tracks.length; i++) {
    if (!tracks[i].isMuted) {
      drawDot(i);
    }
  }
}

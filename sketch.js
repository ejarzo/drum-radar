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

const compressor = new Tone.Compressor({});
const distortion = new Tone.Distortion({ distortion: 0 });
const reverb = new Tone.Freeverb({ wet: 0 });
const gain = new Tone.Gain({ gain: 1 });
const multibandSplit = new Tone.MultibandSplit();
kit.chain(distortion, reverb, gain, compressor, multibandSplit);
multibandSplit.low.chain(new Tone.Mono(), Tone.Master);
multibandSplit.mid.chain(Tone.Master);
multibandSplit.high.chain(Tone.Master);

const sounds = [
  { sample: "lo", color: [190, 23, 237] },
  { sample: "md", color: [59, 128, 247] },
  { sample: "hi", color: [42, 234, 157] },
  { sample: "bd", color: [224, 132, 13] },
  { sample: "hhc", color: [234, 190, 14] },
  { sample: "sd", color: [224, 10, 100] },
];

circles = sounds.map((circle) => ({
  ...circle,
  loop: null,
  loopInterval: 1,
  divisions: 1,
  isMuted: false,
}));

circles.forEach(({ color, isMuted }, i) => {
  $(".color-controls").append(
    `<div class="color-control" style="background: rgb(${color[0]},${
      color[1]
    },${color[2]});">
      <span>
      <label class="container">
        <input class="mute-toggle" data-circle=${i} type="checkbox" checked=${!isMuted}>
        <span class="checkmark"></span>
      </label>
      </span>
      <input class="circle-range" type="range" data-circle=${i} value="50" data-target="playbackRate" min="20" max="100"/>
      <input class="circle-range" type="range" data-circle=${i} value="1" data-target="divisions" min="1" max="12"/>
    </div>
    `
  );
});

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
  const circleIndex = parseInt(attributes["data-circle"].value);
  const isMuted = !circles[circleIndex].isMuted;
  circles[circleIndex].isMuted = isMuted;
  circles[circleIndex].loop.mute = isMuted;
});

// handle slider changes
$(".circle-range").on("input", ({ target }) => {
  const { attributes, value } = target;
  const circleIndex = parseInt(attributes["data-circle"].value);
  const dataTarget = attributes["data-target"].value;
  if (dataTarget === "playbackRate") {
    circles[circleIndex].loopInterval = value / 50;
    circles[circleIndex].loop.interval = value / 50;
  }
  if (dataTarget === "divisions") {
    circles[circleIndex].divisions = parseInt(value);
  }
});

// reset on double click - maybe done by accident?
$(".circle-range").on("dblclick", ({ target }) => {
  // console.log("double click");
  const { attributes } = target;
  const circleIndex = parseInt(attributes["data-circle"].value);
  const dataTarget = attributes["data-target"].value;
  if (dataTarget === "playbackRate") {
    target.value = 50;
    circles[circleIndex].loopInterval = 1;
    circles[circleIndex].loop.interval = 1;
  }
  if (dataTarget === "divisions") {
    target.value = 1;
    circles[circleIndex].divisions = 1;
  }
});

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

  circles.forEach(({ sample, loopInterval: initialInterval }, i) => {
    const loop = new Tone.Loop((time) => {
      const { divisions, loopInterval } = circles[i];
      const timeUnit = loopInterval / divisions;
      for (let i = 0; i < divisions; i++) {
        kit.get(sample).start(time + i * timeUnit);
      }
    }, initialInterval).start(0);
    circles[i].loop = loop;
  });
}

function drawCircle(circleIndex) {
  const { color, loop, divisions, loopInterval } = circles[circleIndex];
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

function drawSpokes(circleIndex) {
  const { color, loop, divisions } = circles[circleIndex];
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
function drawDot(circleIndex) {
  const { color, loop, divisions, loopInterval } = circles[circleIndex];
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
  // rect(width / 2 - 1, 0, 1, height);
  noFill();
  // blendMode(HARD_LIGHT);
  for (let i = 0; i < circles.length; i++) {
    if (!circles[i].isMuted) {
      drawSpokes(i);
    }
  }
  for (let i = 0; i < circles.length; i++) {
    if (!circles[i].isMuted) {
      drawCircle(i);
    }
  }
  for (let i = 0; i < circles.length; i++) {
    if (!circles[i].isMuted) {
      drawDot(i);
    }
  }
}

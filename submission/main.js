////////////////////////////////////////////////////////////////////////////////
// 2D Scene using only SQUARE / TRIANGLE / CIRCLE + glMatrix-0.9.5
// - Circle support: initCircleBuffer() + drawCircle()
// - Modular objects: house, windmill, river, boat, sun, moon, tree
// - Animations: windmill blades, sun rotation, boat oscillation, moon drift
// - Modes: POINTS / LINE_LOOP / TRIANGLES (toggle buttons)
// - API style matches the class examples (no shader edits)
////////////////////////////////////////////////////////////////////////////////

var gl, canvas, shaderProgram;

// attribs & uniforms
var aPositionLocation, uMMatrixLocation, uColorLocation;

// draw mode
var currentMode;

// primitive buffers
var sqVertexPositionBuffer, sqVertexIndexBuffer;
var triVertexPositionBuffer, triVertexIndexBuffer;
var circleVertexPositionBuffer, circleIndexBuffer;

// matrices & stack
var mMatrix = mat4.create();
var matrixStack = [];
function pushMatrix(stack, m) { var c = mat4.create(m); stack.push(c); }
function popMatrix(stack) { if (stack.length > 0) return stack.pop(); else console.log("Matrix stack underflow"); }

// utility
function degToRad(d) { return (d * Math.PI) / 180.0; }

// --- Shaders (same spirit as your examples; do not modify for this assignment) ---
const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;
void main() {
  gl_Position = uMMatrix * vec4(aPosition, 0.0, 1.0);
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 fragColor;
void main() {
  fragColor = uColor;
}`;

// compile & link
function compileShader(src, type) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}
function initShaders() {
  shaderProgram = gl.createProgram();
  var vs = compileShader(vertexShaderCode, gl.VERTEX_SHADER);
  var fs = compileShader(fragShaderCode, gl.FRAGMENT_SHADER);
  gl.attachShader(shaderProgram, vs);
  gl.attachShader(shaderProgram, fs);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(shaderProgram));
  }
  gl.useProgram(shaderProgram);

  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  uMMatrixLocation  = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uColorLocation    = gl.getUniformLocation(shaderProgram, "uColor");
  gl.enableVertexAttribArray(aPositionLocation);
}

// init GL
function initGL(c) {
  gl = c.getContext("webgl2");
  if (!gl) { alert("WebGL2 not available"); return; }
  gl.viewportWidth = c.width;
  gl.viewportHeight = c.height;
  gl.clearColor(0.8, 0.9, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

// ----------------------------- Primitives ----------------------------------
// Square: unit square centered at origin
function initSquareBuffer() {
  const verts = new Float32Array([
     0.5,  0.5,
    -0.5,  0.5,
    -0.5, -0.5,
     0.5, -0.5,
  ]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;

  const idx = new Uint16Array([0,1,2, 0,2,3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, M) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, M);
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.uniform4fv(uColorLocation, color);

  if (currentMode === gl.TRIANGLES) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.drawElements(gl.TRIANGLES, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  } else if (currentMode === gl.LINE_LOOP) {
    gl.drawArrays(gl.LINE_LOOP, 0, sqVertexPositionBuffer.numItems);
  } else { // POINTS
    gl.drawArrays(gl.POINTS, 0, sqVertexPositionBuffer.numItems);
  }
}

// Triangle: an isosceles/eq‑like triangle centered at origin (base width 1, height ~0.866)
function initTriangleBuffer() {
  const h = Math.sqrt(3)/2; // ~0.866
  const verts = new Float32Array([
     0.0,  h*0.6667,   // top (slightly squashed for nicer proportions)
    -0.5, -h*0.3333,   // bottom-left
     0.5, -h*0.3333,   // bottom-right
  ]);
  triVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  triVertexPositionBuffer.itemSize = 2;
  triVertexPositionBuffer.numItems = 3;

  const idx = new Uint16Array([0,1,2]);
  triVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  triVertexIndexBuffer.numItems = 3;
}

function drawTriangle(color, M) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, M);
  gl.bindBuffer(gl.ARRAY_BUFFER, triVertexPositionBuffer);
  gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.uniform4fv(uColorLocation, color);

  if (currentMode === gl.TRIANGLES) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triVertexIndexBuffer);
    gl.drawElements(gl.TRIANGLES, triVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  } else if (currentMode === gl.LINE_LOOP) {
    gl.drawArrays(gl.LINE_LOOP, 0, triVertexPositionBuffer.numItems);
  } else { // POINTS
    gl.drawArrays(gl.POINTS, 0, triVertexPositionBuffer.numItems);
  }
}

// Circle: triangle fan (center + ring). Matches assignment style.
function initCircleBuffer(numSegments = 60) {
  let verts = [0.0, 0.0];
  for (let i = 0; i <= numSegments; i++) {
    let ang = (i * 2.0 * Math.PI) / numSegments;
    verts.push(Math.cos(ang), Math.sin(ang));
  }

  circleVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  circleVertexPositionBuffer.itemSize = 2;
  circleVertexPositionBuffer.numItems = numSegments + 2;

  let idx = [];
  for (let i = 1; i <= numSegments; i++) {
    idx.push(0, i, i + 1);
  }
  circleIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  circleIndexBuffer.numItems = idx.length;
}

function drawCircle(color, M) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, M);
  gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexPositionBuffer);
  gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.uniform4fv(uColorLocation, color);

  if (currentMode === gl.TRIANGLES) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuffer);
    gl.drawElements(gl.TRIANGLES, circleIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  } else if (currentMode === gl.LINE_LOOP) {
    // outline only (skip center at index 0)
    gl.drawArrays(gl.LINE_LOOP, 1, circleVertexPositionBuffer.numItems - 1);
  } else { // POINTS
    gl.drawArrays(gl.POINTS, 0, circleVertexPositionBuffer.numItems);
  }
}

// ----------------------------- Scene Objects -------------------------------
// Colors
const SKY      = [0.0, 0.0, 0.0, 1.0];
const GROUND   = [0.70, 0.90, 0.70, 1.0];
const RIVER    = [0.35, 0.60, 0.95, 1.0];
const HOUSE    = [0.90, 0.70, 0.50, 1.0];
const ROOF     = [0.65, 0.20, 0.20, 1.0];
const TREE_TRK = [0.45, 0.25, 0.15, 1.0];
const TREE_LEF = [0.10, 0.60, 0.25, 1.0];
const BOAT     = [0.40, 0.20, 0.05, 1.0];
const SAIL     = [0.95, 0.95, 0.95, 1.0];
const SUNCOL   = [1.00, 0.85, 0.20, 1.0];
const MOONCOL  = [0.95, 0.95, 0.98, 1.0];
const TOWER    = [0.85, 0.85, 0.90, 1.0];
const BLADE    = [0.85, 0.85, 0.85, 1.0];

// Big background rectangles (sky/ground/river)
function drawBackground() {
  // sky
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, 0.35, 0]);
  mMatrix = mat4.scale(mMatrix, [2.0, 1.3, 1.0]);
  drawSquare(SKY, mMatrix);

  // ground
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, -0.55, 0]);
  mMatrix = mat4.scale(mMatrix, [2.0, 0.9, 1.0]);
  drawSquare(GROUND, mMatrix);

  // river strip across bottom
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, -0.85, 0]);
  mMatrix = mat4.scale(mMatrix, [2.0, 0.3, 1.0]);
  drawSquare(RIVER, mMatrix);
}

function drawHouseAt(x, y, s) {
  // base
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x, y, 0]);
  pushMatrix(matrixStack, mMatrix);

  // walls (square)
  mMatrix = mat4.scale(mMatrix, [0.35*s, 0.25*s, 1]);
  drawSquare(HOUSE, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // roof (triangle)
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x, y + 0.22*s, 0]);
  mMatrix = mat4.scale(mMatrix, [0.4*s, 0.35*s, 1]);
  drawTriangle(ROOF, mMatrix);
}

function drawTreeAt(x, y, s) {
  // trunk
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x, y - 0.15*s, 0]);
  mMatrix = mat4.scale(mMatrix, [0.07*s, 0.25*s, 1]);
  drawSquare(TREE_TRK, mMatrix);

  // foliage (circles)
  const blobs = [
    {dx: 0.00, dy: 0.08, sc: 0.16},
    {dx: -0.10, dy: 0.05, sc: 0.12},
    {dx: 0.10, dy: 0.05, sc: 0.12},
  ];
  blobs.forEach(b => {
    mat4.identity(mMatrix);
    mMatrix = mat4.translate(mMatrix, [x + b.dx*s, y + b.dy*s, 0]);
    mMatrix = mat4.scale(mMatrix, [b.sc*s, b.sc*s, 1]);
    drawCircle(TREE_LEF, mMatrix);
  });
}

function drawBoatAt(x, y, s, phase) {
  // hull (rectangle)
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x, y, 0]);
  pushMatrix(matrixStack, mMatrix);

  mMatrix = mat4.scale(mMatrix, [0.30*s, 0.07*s, 1]);
  drawSquare(BOAT, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // prow (triangle at right)
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x + 0.18*s, y, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(90), [0,0,1]);
  mMatrix = mat4.scale(mMatrix, [0.07*s, 0.14*s, 1]);
  drawTriangle(BOAT, mMatrix);

  // mast (thin square)
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x, y + 0.06*s, 0]);
  mMatrix = mat4.scale(mMatrix, [0.01*s, 0.20*s, 1]);
  drawSquare([0.2,0.2,0.2,1], mMatrix);

  // sail (triangle)
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x + 0.06*s, y + 0.12*s, 0]);
  mMatrix = mat4.scale(mMatrix, [0.16*s, 0.20*s, 1]);
  drawTriangle(SAIL, mMatrix);
}

function drawWindmillAt(x, y, s, angleDeg) {
  // tower (square stretched tall)
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x, y - 0.10*s, 0]);
  mMatrix = mat4.scale(mMatrix, [0.10*s, 0.40*s, 1]);
  drawSquare(TOWER, mMatrix);

  // hub position (rotation center for blades)
  const hubX = x, hubY = y + 0.12*s;

  // hub (small circle)
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [hubX, hubY, 0]);
  mMatrix = mat4.scale(mMatrix, [0.035*s, 0.035*s, 1]);
  drawCircle([0.75,0.75,0.8,1], mMatrix);

  // blades (4 squares rotated about hub)
  for (let k=0; k<4; k++) {
    mat4.identity(mMatrix);
    mMatrix = mat4.translate(mMatrix, [hubX, hubY, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(angleDeg + k*90), [0,0,1]);
    mMatrix = mat4.translate(mMatrix, [0.15*s, 0.0, 0]); // offset outward
    mMatrix = mat4.scale(mMatrix, [0.20*s, 0.04*s, 1]);
    drawSquare(BLADE, mMatrix);
  }
}

function drawMoonAt(x, y, s, angleDeg) {
  const MOONCOL = [1.0, 1.0, 1.0, 1.0]; // white

  // moon disc
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x, y, 0]);
  mMatrix = mat4.scale(mMatrix, [0.10 * s, 0.10 * s, 1]);
  drawCircle(MOONCOL, mMatrix);

  // rotating rectangular spokes
  for (let k = 0; k < 8; k++) {
    mat4.identity(mMatrix);
    mMatrix = mat4.translate(mMatrix, [x, y, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(angleDeg + k * 45), [0, 0, 1]);

    // translate outwards a little
    mMatrix = mat4.translate(mMatrix, [0.0, 0.18 * s, 0]);

    // scale into a thin rectangle
    mMatrix = mat4.scale(mMatrix, [0.02 * s, 0.25 * s, 1]);

    drawSquare(MOONCOL, mMatrix);
  }
}

function drawCloudAt(x, y, s) {
  // Three shades for depth
  const COLORS = [
    [0.7, 0.7, 0.7, 1.0], // darker grey (small rightmost)
    [1.0, 1.0, 1.0, 1.0], // medium grey (middle)
    [0.7, 0.7, 0.7, 1.0]  // light grey (biggest leftmost)
  ];
// Leftmost biggest oval
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x - 0.20 * s, y, 0]);
  mMatrix = mat4.scale(mMatrix, [0.25 * s, 0.13 * s, 1]);
  drawCircle(COLORS[2], mMatrix);
  

  // Middle medium oval
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x, y + 0.02 * s, 0]);
  mMatrix = mat4.scale(mMatrix, [0.18 * s, 0.10 * s, 1]);
  drawCircle(COLORS[1], mMatrix);

  // Rightmost small oval
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x + 0.18 * s, y, 0]);
  mMatrix = mat4.scale(mMatrix, [0.12 * s, 0.07 * s, 1]);
  drawCircle(COLORS[0], mMatrix);
}

function drawMoonAt(x, y, s) {
  // simple disc moon (you can do crescent by subtractive draw in later assignments)
  mat4.identity(mMatrix);
  mMatrix = mat4.translate(mMatrix, [x, y, 0]);
  mMatrix = mat4.scale(mMatrix, [0.08*s, 0.08*s, 1]);
  drawCircle(MOONCOL, mMatrix);
}


// ----------------------------- Animation State -----------------------------
// var angleSun = 0.0;
var angleMoon = 0.0;
var angleWindmill = 0.0;
var boatOffset = 0.0, boatDir = 1;
var moonPhase = -0.8; // drift along top

function updateAnim() {
  // angleSun += 0.6; 
  angleMoon -= 0.5;                // moon rotates
  angleWindmill += 2.0;            // blades rotate faster
  boatOffset += boatDir * 0.004;   // oscillate
  if (boatOffset > 0.22 || boatOffset < -0.22) boatDir *= -1;
//   moonPhase += 0.0009;             // slow drift
//   if (moonPhase > 1.2) moonPhase = -1.2;
}

// ----------------------------- Draw Scene ----------------------------------
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // background layers
  drawBackground();

  // static scenery (left trees + house)
  drawTreeAt(-0.75, -0.25, 1.0);
  drawTreeAt(-0.60, -0.20, 0.9);
  drawHouseAt(-0.25, -0.20, 1.1);

  // river boats (animate back & forth)
  drawBoatAt(-0.50 + boatOffset, -0.85, 1.0, 0.0);
  drawBoatAt( 0.30 - boatOffset, -0.83, 0.9, 0.3);

  // windmill (should be in front of boats → draw after boats)
  drawWindmillAt(0.55, -0.15, 1.0, angleWindmill);

  // sun top-right, moon drifting top-left (both visible to show both animations)
  // drawSunAt(0.75, 0.70, 1.0, angleSun);
  // drawSunAt(0.75, 0.70, 1.0, angleSun);   // remove or comment this
  drawMoonAt(-0.75, 0.70, 1.0, angleMoon);
  drawCloudAt(-0.70, 0.40, 1.0);   // clouds below the moon
}

// ----------------------------- Loop & UI -----------------------------------
function tick() {
  updateAnim();
  drawScene();
  requestAnimationFrame(tick);
}

function setMode(mode) {
  currentMode = mode;
  document.getElementById("modeLabel").textContent =
    (mode === gl.POINTS ? "Mode: POINTS" :
     mode === gl.LINE_LOOP ? "Mode: LINE_LOOP" : "Mode: TRIANGLES");
}

// Entry
function webGLStart() {
  canvas = document.getElementById("scene");
  initGL(canvas);
  initShaders();

  initSquareBuffer();
  initTriangleBuffer();
  initCircleBuffer(72);

  currentMode = gl.TRIANGLES;
  setMode(currentMode);

  tick();
}
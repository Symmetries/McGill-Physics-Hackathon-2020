let k = 1000;
let N = 5;
let Nt = 2;
let dt = 1 / Nt ;
let epsilon = 10;
let gridSize = 14;
let eFieldGridNum = 6;

let charges = [];
let m = 1;

let colorradio;
let radio;

let physicsWidth = 1000;
let physicsHeight = 1000;
let theta = 0;
let phi;
let S = .4;
let ARROWSCALE = 150;

let arrowColor = 180;

let maxQueueSize = 20;

function windowSize() {
    /* Get the default non-full-screen canvas size. */
    side = min(800, Math.floor(window.innerWidth * 3/4), Math.floor(window.innerHeight * 3/ 4));
    return [side, side];
}

function reset() {
  let initialVelocities = [
    createVector(1/3, 1),
    createVector(-1/3, 1),
    createVector(1/3, -1),
    createVector(-1/3, -1),
    createVector(1, 1/3),
    createVector(-1, 1/3),
    createVector(1, -1/3),
    createVector(-1, -1/3),
  ]

  charges = [
    {
      position: canvasToPhysics(createVector(width / 2, height / 2)),
      velocity: random(initialVelocities),
      q: 1,
      trace: [],
    }
  ];
  phi = PI / 6;
}

function windowResized() {
  resizeCanvas(...windowSize());
}

function canvasToPhysics(v) {
 return createVector(map(v.x, 0, width, 0, physicsWidth),
                     map(v.y, 0, height, 0, physicsHeight));
}

function physicsToCanvas(v) {
  return createVector(map(v.x, 0, physicsWidth, 0, width),
                      map(v.y, 0, physicsHeight, 0, height));
}

function setup() {
  canvas = createCanvas(...windowSize());
  canvas.parent('canvas');
  reset();

  radio = createRadio(); 
  radio.option('Intrinsic', 'intrinsic');
  radio.option('Extrinsic', 'extrinsic'); 
  radio.selected('intrinsic');
  radio.addClass('radio');
  radio.parent('radiodiv'); 

  colorradio = createRadio();
  colorradio.option('\\(-\\)', '-');
  colorradio.option('\\(+\\)', '+');
  colorradio.selected('+');
  colorradio.addClass('radio');
  colorradio.parent('colorradiodiv');

  renderMathInElement(document.body, options = {
    delimeters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false },
      { left: "\\[", right: "\\]", display: true }
    ]
  });
}

function touchStarted() {
  return addCharge();
}

function mousePressed() {
  return addCharge();
}

function mouseDragged() {
  if (0 < mouseX && mouseX < width && 0 < mouseY && mouseY < height && radio.value() == 'extrinsic') {
    let dx = mouseX - pmouseX;
    let dy = mouseY - pmouseY;
    
    theta -= 2 * PI * dx / width;
    phi += 2 * PI * dy / height;
    phi = constrain(phi, -PI/2, PI/2);
    return false;
  }
  return true;
}

function addCharge() {
  if (0 < mouseX && mouseX < width && 0 < mouseY && mouseY < height && radio.value() == 'intrinsic') {
    charges.push({
      position: canvasToPhysics(createVector(mouseX, mouseY)),
      velocity: createVector(0, 0),
      acceleration: createVector(0, 0),
      q: colorradio.value() == '+' ? 1 : -1,
      trace: [],
    })
    return false;
  }
  return true;
}

function draw() {
  background(240);

  for (let i = 0; i < Nt; i++) {
    charges.forEach(charge => {
      charge.position.x %= physicsWidth;
      charge.position.y %= physicsHeight;
  
      charge.position.add(p5.Vector.mult(charge.velocity, dt));
      charge.acceleration = createVector(0, 0);
    });
  
  
    for (c1 of charges) {
      let force = createVector(0, 0);
      for (c2 of charges) {
        if (c1 != c2) {
          force.add(torusForce(c1, c2));
        }
      }
      c1.acceleration = p5.Vector.mult(force, 1 / m);
    }
  
    charges.forEach(charge => {
      // add to the queue
      charge.velocity.add(p5.Vector.mult(charge.acceleration, dt));
      charge.position.add(p5.Vector.mult(charge.velocity, dt));
    })
  }

  if (frameCount % 2 == 0) {
    charges.forEach(charge => {
      charge.trace.push(charge.position.copy());
      if (charge.trace.length > maxQueueSize) {
        charge.trace.shift();
      }
    });
  }


  if (radio.value() == 'intrinsic') {
    drawIntrinsic();
  } else {
    drawExtrinsic();
  }
}

function torusForce(c1, c2) {
  let totalForce = createVector(0, 0);
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      let posOffset = createVector(i * physicsWidth, j * physicsHeight);
      let c2_ = {...c2, position: p5.Vector.add(c2.position, posOffset)};
      totalForce.add(cartesianForce(c1, c2_));
    }
  }
  return totalForce;
}

function cartesianForce(c1, c2) { 
  // cartesian force by c1 on c2 
  let d = dist(c1.position.x, c1.position.y, c2.position.x, c2.position.y);
  let u = p5.Vector.sub(c1.position, c2.position);
  u.setMag(1);
  let F = k * c1.q * c2.q / (d + epsilon)**2;
  u.mult(F);
  return u;
}

function drawExtrinsic() {
  // TODO draw a torus in R^3 wireframe 
  // TODO draw the physics on the embedded surface

  stroke('black');
  strokeWeight(1);
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      let x = map(i, 0, gridSize - 1, 0, physicsWidth);
      let y = map(j, 0, gridSize - 1, 0, physicsHeight);
      let x_ = map(i + 1, 0, gridSize -1, 0, physicsWidth);
      let y_ = map(j + 1, 0, gridSize -1, 0, physicsHeight);

      // We need to draw these lines
      // (x, y) -- (x, y_)
      // (x, y) -- (x_, y)
      // createVector: point in 3d space 
      // then rotate (based on mouse drag)
      // then project: back to 2d plane 
            
      let p0 = project(rotate3D(inToEx(createVector(x, y)), theta, phi));
      let p1 = project(rotate3D(inToEx(createVector(x, y_)), theta, phi));
      let p2 = project(rotate3D(inToEx(createVector(x_, y)), theta, phi));
      line(map(p0.x, -S, S, 0, width),
           map(p0.y, -S, S, 0, height),
           map(p1.x, -S, S, 0, width),
           map(p1.y, -S, S, 0, height));
           
      line(map(p0.x, -S, S, 0, width),
           map(p0.y, -S, S, 0, height),
           map(p2.x, -S, S, 0, width),
           map(p2.y, -S, S, 0, height));
    }
  }

  charges.forEach(charge => {
    let q = rotate3D(inToEx(charge.position), theta, phi);
    let p = project(q);
    let x = map(p.x, -S, S, 0, physicsWidth);
    let y = map(p.y, -S, S, 0, physicsHeight);
    let trace = charge.trace.map(v => {
      let q_ = rotate3D(inToEx(v), theta, phi);
      let p_ = project(q_);
      let x_ = map(p_.x, -S, S, 0, physicsWidth);
      let y_ = map(p_.y, -S, S, 0, physicsHeight);
      return createVector(x_, y_);
    })
    drawCharge({...charge, position: createVector(x, y), trace}, 15 / (q.x**2 + (3 + q.y)**2 +  q.z**2)**0.5);
  })
}

function drawIntrinsic() {
  for (i = 0; i < eFieldGridNum + 2; i++) {
    for (j = 0; j < eFieldGridNum + 2; j++) {
      let pos = createVector(
        i*physicsWidth/(eFieldGridNum + 1), 
        j*physicsHeight/(eFieldGridNum + 1));
      let c = {position: pos, velocity: createVector(0, 0), q: -1} ; 
      let force = createVector(0, 0);
      for (c1 of charges) {
        if (dist(c1.position.x, c1.position.y, c.position.x, c.position.y) >= 2*epsilon) {
          force.add(torusForce(c1, c));
        }
      }
      drawArrow(pos, force); // does the rescaling to canvas coords
    }
  }
  charges.forEach(charge => drawCharge(charge, 10));
}

// \T^2 \to \R^3
function inToEx(v) {
  let R = 2/3;
  let r = 1/3;
  let theta = map(v.x, 0, physicsWidth, 0, 2 * PI);
  let phi = map(v.y, 0, physicsHeight, 0, 2 * PI);
  let x = (R + r * cos(theta)) * cos(phi);
  let y = (R + r * cos(theta)) * sin(phi);
  let z = r * sin(theta);
  return createVector(x, y, z);
}

// \R^3 \to \R^3
function rotate3D(v, theta, phi) {
  // theta: horizontal (about the z-axis)
  // phi: vertical
  // u: v rotated horizontally about z first 
  let u = createVector(v.x * cos(theta) + v.y * sin(theta),
                       v.x * -sin(theta) + v.y * cos(theta),
                       v.z);

  return createVector(u.x,
                      u.y * cos(phi) + u.z * sin(phi),
                      u.y * -sin(phi) + u.z * cos(phi));
}

// \R^3 \to \R^2
function project(v) {
  return createVector(v.x / (3 + v.y), v.z / (3 + v.y));
}

function drawCharge(c, r) {
  let chargeColor = c.q < 0 ? color(51, 149, 215) : color(215,51,67);
  fill(chargeColor);
  noStroke();
  let position = physicsToCanvas(c.position);
  for (let xOffset of [-width, 0, width]) {
    for (let yOffset of [-height, 0, height]) {
      ellipse(position.x + xOffset, position.y + yOffset, 2 * r, 2 * r);
    }
  }

  strokeWeight(2);
  if (radio.value() == 'extrinsic') {
    noFill();
    stroke(chargeColor);
    beginShape();
    if (random() < 0.01) print(c.trace);
    for (let p of c.trace) {
      let q = physicsToCanvas(p);
      vertex(q.x, q.y);
    }
    vertex(position.x, position.y);
    endShape();
  }
}

function drawArrow(pos, vec) {
  push();
  stroke(arrowColor);
  let vec_ = p5.Vector.mult(vec, ARROWSCALE);
  let arrowSize = log(1 + vec_.mag()) + 2; 
  strokeWeight(arrowSize/3); // TODO change this to reflect arrow length
  fill(arrowColor);
  // let angle = atan2(pos.y, pos.x);
  translate(physicsToCanvas(pos).x, physicsToCanvas(pos).y);
  rotate(vec_.heading()); 
  line(0, 0, vec_.mag(), 0);
  translate(vec_.mag() - arrowSize, 0);
  triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
  pop();
}

// TODO display traces in extrinsic view 
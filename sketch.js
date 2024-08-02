function Token(id, c) {
  this.id = id;
  this.c = c;
  this.toString = function() {
    return char(this.c);
  }
}

let token_id = 0;
function Program(x, y) {
  this.x = x;
  this.y = y;
  this.contents = [];
  this.taken = false;
  for (let i = 0; i < 64; i++) {
    let c = random(0, 256);
    this.contents.push(new Token(token_id++, floor(c)));
  }

  this.tokenAt = function tokenAt(x, y) {
    return this.contents[y * 8 + x];
  }
}

let programs = [];
let hues = {
  '<': 25,
  '>': 50,
  '{': 75,
  '}': 100,
  '-': 125,
  '+': 150,
  '.': 175,
  ',': 200,
  '[': 225,
  ']': 250,
};
let w = 20;
let h = 20;
let pixelSize = 5;
let img = 0;
let range = 2;
let radio2;

function setup() {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      programs.push(new Program(x, y));
    }
  }
  console.log(programs);
  createCanvas(w*8*pixelSize, h*8*pixelSize);
  colorMode(HSB, 255);
  img = createImage(w*8*pixelSize, h*8*pixelSize);
  img.loadPixels();
  radio2 = createRadio();
  radio2.option('Instructions');
  radio2.option('Identities');
  radio2.selected('Instructions');
}

function setColorFromChar(c, img, x, y, taken) {
  let hue = c;
  let brightness = /* taken ? 70 : */ 100;
  let saturation = /* taken ? 70 : */ 100;
  if (c == 0) {
    brightness = 0;
    saturation = 0;
  }
  if (hues.hasOwnProperty(char(c))) {
    hue = hues[char(c)];
    brightness = 255;
    saturation = 255;
  }
  for (let pxy = 0; pxy < pixelSize; pxy++) {
    for (let pxx = 0; pxx < pixelSize; pxx++) {
      img.set(x*pixelSize + pxx, y*pixelSize + pxy, color(hue, saturation, brightness));
    }
  }
}

function setColorFromId(id, img, x, y, taken) {
  let hue = lerp(0, 255, id / token_id);
  let brightness = /* taken ? */ 255 /* : 100 */;
  let saturation = /* taken ? */ 255 /* : 100 */;
  for (let pxy = 0; pxy < pixelSize; pxy++) {
    for (let pxx = 0; pxx < pixelSize; pxx++) {
      img.set(x*pixelSize + pxx, y*pixelSize + pxy, color(hue, saturation, brightness));
    }
  }
}

function programAt(x, y) {
  let p = programs[((y * w + x) + programs.length) % programs.length];
  return p;
}

function exec_and_split(progA, progB) {
  progA.taken = true;
  progB.taken = true;
  let tape = progA.contents.concat(progB.contents);
  let head0 = 0;
  let head1 = 0;
  let ip = 0;
  for (let i = 0; i < pow(8, 2) * 4; i++) {
    let c = char(tape[ip].c);
    if ("<>{}-+.,[]".indexOf(c) == -1) {
      ip = (ip + 1) % tape.length;
      continue;
    }
    if (c == '<') head0 = (head0 - 1 + tape.length) % tape.length;
    if (c == '>') head0 = (head0 + 1) % tape.length;
    if (c == '{') head1 = (head1 - 1 + tape.length) % tape.length;
    if (c == '}') head1 = (head1 + 1) % tape.length;
    if (c == '-') tape[head0].c = (tape[head0].c + 255) % 256;
    if (c == '+') tape[head0].c = (tape[head0].c + 1) % 256;
    if (c == '.') tape[head1] = tape[head0];
    if (c == ',') tape[head0] = tape[head1];
    if (c == '[' && tape[head0].c == 0) {
      let next = ip + 1;
      let depth = 1;
      while (depth != 0 && next != ip) {
        next = (next + 1) % tape.length;
        if (char(tape[(ip + next) % tape.length].c) == '[') depth++;
        if (char(tape[(ip + next) % tape.length].c) == ']') depth--;
      }
      if (next == ip) break;
      ip = next;
    }
    if (c.c == ']' && tape[head0].c != 0) {
      let next = ip - 1;
      let depth = 1;
      while (depth != 0 && next != ip) {
        next = (next - 1 + tape.length) % tape.length;
        if (char(tape[(ip + next) % tape.length].c) == ']') depth++;
        if (char(tape[(ip + next) % tape.length].c) == '[') depth--;
      }
      if (next == ip) break;
      ip = next;
    }
    ip = (ip + 1) % tape.length;
  }

  progA.contents = tape.slice(0, tape.length / 2);
  progB.contents = tape.slice(tape.length / 2, tape.length);
}

let loop = 0;
function draw() {
  for (let i = 0; i < 20; i++) {
    let untaken = programs.filter(f => f.taken == false);
    let programA = untaken[floor(random(untaken.length))];
    let neighbourOffsetX = floor(random(-range, range));
    let neighbourOffsetY = floor(random(-range, range));
    if (neighbourOffsetX == 0 && neighbourOffsetY == 0) {
      neighbourOffsetX = 1;
    }
    let programB = programAt(
      programA.x + neighbourOffsetX,
      programA.y + neighbourOffsetY
    );
    if (programB.taken) {
      continue;
    }

    exec_and_split(programA, programB);
  }
  console.log("loop");
  if (loop++ == 1) {
    for (let i = 0; i < programs.length; i++) {
      let program = programs[i];
      let offsetX = (i % w) * 8;
      let offsetY = floor(i / w) * 8;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          let token = program.tokenAt(x, y);
          if (radio2.value() == 'Instructions') {
            setColorFromChar(token.c, img, offsetX + x, offsetY + y, program.taken);
          } else {
            setColorFromId(token.id, img, offsetX + x, offsetY + y, program.taken);
          }
        }
      }
    }
    
    img.updatePixels();

    image(img, 0, 0);
    loop = 0;
  }
  
  programs.filter(p => p.taken == true).forEach(p => p.taken = false);
}

function stringify_bf(arr) {
  return arr.map(a => {
    if ("<>{},.-+[]".indexOf(char(a.c)) == -1) {
      return a;
    }
    return char(a.c);
  });
}

function mousePressed() {
  let x = mouseX / (8*pixelSize);
  let y = mouseY / (8*pixelSize);
  let program = programAt(floor(x), floor(y));
  console.log("Program at ", x, y, stringify_bf(program.contents));
}
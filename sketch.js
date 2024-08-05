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
let radio_display;
let checkbox_highlight;
let mutation_amount = 0;
let heavy_mutation_rate = 0.1;
let max_program_steps = 20;

function setup() {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      programs.push(new Program(x, y));
    }
  }

  let replicatorString = "[[{.>]-]                                                ]-]>.{[[";
  for (let i = 0; i < replicatorString.length; i++) {
    programs[0].contents[i].c = replicatorString.charCodeAt(i);
  }

  console.log(programs);
  createCanvas(w*8*pixelSize, h*8*pixelSize);
  colorMode(HSB, 255);
  img = createImage(w*8*pixelSize, h*8*pixelSize);
  img.loadPixels();
  
  radio_display = createRadio();
  radio_display.option('Instructions');
  radio_display.option('Identities');
  radio_display.selected('Instructions');
  
  checkbox_highlight = createCheckbox('Highlight taken', false);

  programFocus = createDiv('');
  programFocus.style('font-size', '36px');
  programFocus.style('font-family', 'Consolas');
  programFocus.html('Program at mouse: ');
}

function setColorFromChar(c, img, x, y, taken) {
  let hue = c;
  let brightness = (taken || !checkbox_highlight.checked()) ? 100 : 70;
  let saturation = (taken || !checkbox_highlight.checked()) ? 100 : 70;
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
  let brightness =  (taken || !checkbox_highlight.checked()) ? 255 : 100;
  let saturation =  (taken || !checkbox_highlight.checked()) ? 255 : 100;
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

function debug_tape(i, tape, head0, head1, ip) {
  console.log("Step: ", i);
  let tapeString = "";
  let css = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < (tape.length / 8); x++) {
      let token = tape[y * (tape.length / 8) + x];
      let thisCss = "";
      if (head0 == y * 16 + x) {
        thisCss += "background-color: lightblue;";
      } 
      if (head1 == y * 16 + x) {
        thisCss += "color: red;";
      }
      if (ip == y * 16 + x) {
        thisCss += "text-decoration: underline;";
      }
      tapeString += "%c%s%c";
      if (thisCss == "")
        css.push("background-color: inherit;color:inherit;text-decoration: inherit");
      else 
        css.push(thisCss);
      if ("<>{},.-+[]".indexOf(char(token.c)) == -1) {
        css.push("-");
      } else {
        css.push(char(token.c));
      }
      css.push("background-color: inherit;color:inherit;text-decoration: inherit");
    }
    tapeString += "\n";
  }
  console.log(tapeString, ...css);
  console.log("");
}

function exec_and_split(progA, progB) {
  progA.taken = true;
  progB.taken = true;
  let tape = progA.contents.concat(progB.contents);
  let head0 = 0;
  let head1 = 0;
  let ip = 0;
  for (let i = 0; i < pow(8, 2) * max_program_steps; i++) {
    let c = char(tape[ip].c);
    //debug_tape(i, tape, head0, head1, ip);
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
    if (c == '.') tape[head1] = new Token(tape[head0].id, tape[head0].c);
    if (c == ',') tape[head0] = new Token(tape[head1].id, tape[head1].c);
    if (c == '[' && tape[head0].c == 0) {
      let next = ip;
      let depth = 1;
      while (depth != 0) {
        next = (next + 1) % tape.length;
        if (next == ip) break;
        if (char(tape[next].c) == '[') depth++;
        if (char(tape[next].c) == ']') depth--;
      }
      if (next == ip) break;
      ip = next;
    }
    if (c == ']' && tape[head0].c != 0) {
      let next = ip;
      let depth = 1;
      while (depth != 0) {
        next = (next - 1 + tape.length) % tape.length;
        if (next == ip) break;
        if (char(tape[next].c) == ']') depth++;
        if (char(tape[next].c) == '[') depth--;
      }
      if (next == ip) break;
      ip = next;
    }
    ip = (ip + 1) % tape.length;
  }

  progA.contents = tape.slice(0, tape.length / 2);
  progB.contents = tape.slice(tape.length / 2, tape.length);
  //debug_tape('end A', progA.contents, 0,0,0);
  //debug_tape('end B', progB.contents, 0,0,0);
}

let loop = 0;
function draw() {
  for (let i = 0; i < 100; i++) {
    let untaken = programs.filter(f => f.taken == false);
    let programA = untaken[floor(random(untaken.length))];
    let neighbourOffsetX = 0;
    let neighbourOffsetY = 0;
    while (neighbourOffsetX == 0 && neighbourOffsetY == 0) {
      neighbourOffsetX = floor(random(-range, range));
      neighbourOffsetY = floor(random(-range, range));
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

  for (let i = 0; i < mutation_amount; i++) {
    let program = programs[floor(random(programs.length))];
    let token = program.contents[floor(random(program.contents.length))];
    if (random() < heavy_mutation_rate) {
      token.c = floor(random(256));
    } else {
      if (random() < 0.5) {
        token.c = (token.c + 1) % 256;
      }
      else {
        token.c = (token.c - 1 + 256) % 256;
      }
    }
    token.id = token_id++;
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
          if (radio_display.value() == 'Instructions') {
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
      return a.c;
    }
    return char(a.c);
  });
}

function matrix_bf(arr) {
  let str = "<br/>";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let c = arr[y * 8 + x].c;
      str += "<span ";
      if ("<>{},.-+[]".indexOf(char(c)) == -1) {
        str += "style='background-color: hsl(0, 0%," + (c / 2.55) + "%)'>&nbsp;";
      } else {
        str += "style='background-color: hsl(" + hues[char(c)] + ", 100%, 50%)'>";
        str += char(c);
      }
      str += "</span>";
    }
    str += "<br/>";
  }
  return str;
}

function mousePressed() {
  let x = mouseX / (8*pixelSize);
  let y = mouseY / (8*pixelSize);
  if (x < 0 || y < 0 || x >= w || y >= h) {
    return;
  }
  let program = programAt(floor(x), floor(y));
  console.log("Program at ", x, y, stringify_bf(program.contents));
  programFocus.html('Program at mouse: ' + matrix_bf(program.contents));
}
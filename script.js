// Sound-reactive particles with p5.js + p5.sound
let particles = [];
let sound = null;
let fft, amp;
let playing = false;

function setup() {
  const canvas = createCanvas(900, 500);
  canvas.parent(document.body);
  pixelDensity(1);
  noStroke();

  // Create initial particles
  for (let i = 0; i < 200; i++) {
    particles.push(new Particle(createVector(random(width), random(height))));
  }

  fft = new p5.FFT(0.9, 1024);
  amp = new p5.Amplitude();

  // File input (HTML)
  const fileInput = document.getElementById('audioFile');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (sound && sound.isPlaying()) sound.stop();
    // loadSound requires a user gesture to play in some browsers; we provide Play button
    loadSound(url, (s) => {
      sound = s;
      fft.setInput(sound);
      amp.setInput(sound);
      sound.loop();
      playing = true;
      document.getElementById('playBtn').textContent = 'Pause';
    }, (err) => {
      console.error('loadSound error', err);
    });
  });

  // Play/pause button
  document.getElementById('playBtn').addEventListener('click', async () => {
    // userStartAudio for mobile/Chrome autoplay restrictions
    await userStartAudio();
    if (!sound) return;
    if (sound.isPlaying()) {
      sound.pause();
      playing = false;
      document.getElementById('playBtn').textContent = 'Play';
    } else {
      sound.play();
      playing = true;
      document.getElementById('playBtn').textContent = 'Pause';
    }
  });

  // Click canvas to enable audio in strict browsers
  canvas.mousePressed(async () => {
    await userStartAudio();
    if (sound && !sound.isPlaying()) {
      sound.play();
      document.getElementById('playBtn').textContent = 'Pause';
      playing = true;
    }
  });
}

function draw() {
  background(5, 12, 25, 150);

  // Get amplitude / spectrum
  let level = amp.getLevel(); // 0..1
  let spectrum = fft.analyze();

  // Map bass energy to a single variable
  let bass = fft.getEnergy('bass'); // 0..255

  // Update + draw particles
  for (let p of particles) {
    p.update(level, bass, spectrum);
    p.display();
  }
}

// Particle class
class Particle {
  constructor(pos) {
    this.pos = pos.copy();
    this.vel = p5.Vector.random2D().mult(random(0.2, 1.4));
    this.size = random(2, 6);
    this.baseSize = this.size;
    this.hue = random(180, 300);
  }
  update(level, bass, spectrum) {
    // Push particles outward on bass hits
    let push = map(bass, 0, 255, 0, 6); // stronger with stronger bass
    let dir = p5.Vector.random2D().mult(push * random(0.2, 1.0));
    this.vel.add(dir);
    // small attraction to center so particles don't wander off
    let center = createVector(width / 2, height / 2);
    let toCenter = p5.Vector.sub(center, this.pos).mult(0.0008);
    this.vel.add(toCenter);

    // Damping
    this.vel.mult(0.98);
    this.pos.add(this.vel);

    // Wrap around edges
    if (this.pos.x < -10) this.pos.x = width + 10;
    if (this.pos.x > width + 10) this.pos.x = -10;
    if (this.pos.y < -10) this.pos.y = height + 10;
    if (this.pos.y > height + 10) this.pos.y = -10;

    // Size pulses with general amplitude
    let pulse = map(level, 0, 0.3, 0, 12);
    this.size = this.baseSize + pulse * random(0.5, 1.7);

    // Color shift with high frequencies
    let treble = fft.getEnergy('treble');
    this.hue += map(treble, 0, 255, -0.5, 1.2);
  }
  display() {
    push();
    translate(this.pos.x, this.pos.y);
    // Color from hue
    let h = (this.hue % 360 + 360) % 360;
    colorMode(HSL, 360, 100, 100, 1);
    let light = map(this.size, 2, 18, 60, 85);
    fill(h, 80, light, 0.9);
    circle(0, 0, this.size);
    pop();
  }
}

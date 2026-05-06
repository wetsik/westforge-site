const canvas = document.querySelector("#forgeCanvas");
const ctx = canvas.getContext("2d");
const reveals = document.querySelectorAll(".reveal");
const tiltItems = document.querySelectorAll(".tilt");
const magneticItems = document.querySelectorAll(".magnetic");

let width = 0;
let height = 0;
let waves = [];
let pointer = { x: 0, y: 0, active: false };

function resize() {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  waves = Array.from({ length: 42 }, (_, index) => ({
    x: (index / 41) * width,
    offset: Math.random() * Math.PI * 2,
    speed: 0.003 + Math.random() * 0.003,
    amp: 20 + Math.random() * 42,
  }));
}

function draw(time) {
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(255,255,255,0.0)");
  gradient.addColorStop(0.45, "rgba(0,113,227,0.10)");
  gradient.addColorStop(1, "rgba(124,58,237,0.08)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 1;
  for (let row = 0; row < 6; row += 1) {
    ctx.beginPath();
    for (let i = 0; i < waves.length; i += 1) {
      const wave = waves[i];
      const y = height * (0.2 + row * 0.13)
        + Math.sin(time * wave.speed + wave.offset + row) * wave.amp;
      const pull = pointer.active ? Math.max(0, 1 - Math.hypot(wave.x - pointer.x, y - pointer.y) / 260) : 0;
      const finalY = y - pull * 34;

      if (i === 0) {
        ctx.moveTo(wave.x, finalY);
      } else {
        ctx.lineTo(wave.x, finalY);
      }
    }
    ctx.strokeStyle = `rgba(17,17,20,${0.028 + row * 0.004})`;
    ctx.stroke();
  }

  requestAnimationFrame(draw);
}

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  }
}, { threshold: 0.16 });

for (const element of reveals) {
  observer.observe(element);
}

for (const item of tiltItems) {
  item.addEventListener("pointermove", (event) => {
    const rect = item.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    item.style.transform = `rotateX(${y * -5}deg) rotateY(${x * 7}deg) translateY(-3px)`;
  });

  item.addEventListener("pointerleave", () => {
    item.style.transform = "";
  });
}

for (const item of magneticItems) {
  item.addEventListener("pointermove", (event) => {
    const rect = item.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
    const y = (event.clientY - rect.top - rect.height / 2) * 0.12;
    item.style.transform = `translate(${x}px, ${y}px)`;
  });

  item.addEventListener("pointerleave", () => {
    item.style.transform = "";
  });
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer = { x: event.clientX, y: event.clientY, active: true };
});
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

resize();
draw(0);

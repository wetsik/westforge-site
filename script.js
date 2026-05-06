const canvas = document.querySelector("#forgeCanvas");
const ctx = canvas.getContext("2d");
const reveals = document.querySelectorAll(".reveal");

let width = 0;
let height = 0;
let points = [];
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

  const count = Math.max(36, Math.floor((width * height) / 26000));
  points = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
  }));
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050608";
  ctx.fillRect(0, 0, width, height);

  for (const point of points) {
    point.x += point.vx;
    point.y += point.vy;

    if (point.x < -20) point.x = width + 20;
    if (point.x > width + 20) point.x = -20;
    if (point.y < -20) point.y = height + 20;
    if (point.y > height + 20) point.y = -20;

    if (pointer.active) {
      const dx = point.x - pointer.x;
      const dy = point.y - pointer.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 150) {
        point.x += dx * 0.002;
        point.y += dy * 0.002;
      }
    }
  }

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (distance < 150) {
        ctx.strokeStyle = `rgba(103, 232, 249, ${0.16 * (1 - distance / 150)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (const point of points) {
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  }
}, { threshold: 0.18 });

for (const element of reveals) {
  observer.observe(element);
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer = { x: event.clientX, y: event.clientY, active: true };
});
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

resize();
draw();

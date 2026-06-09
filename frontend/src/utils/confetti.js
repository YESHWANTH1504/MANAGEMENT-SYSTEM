/* utils/confetti.js */
// Simple confetti burst using canvas. This creates small colored particles that explode outward.
// The function can be called after a successful login to celebrate.

export const launchConfetti = () => {
  // Create canvas overlay
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const particles = [];
  const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93']; // festive palette
  const particleCount = 120;
  const maxLife = 120; // frames

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);
  const centerX = width / 2;
  const centerY = height / 2;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
    });
  }

  const render = () => {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.07; // gravity
      p.life++;
      ctx.globalAlpha = 1 - p.life / maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    // Remove dead particles
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life > maxLife) particles.splice(i, 1);
    }
    if (particles.length > 0) {
      requestAnimationFrame(render);
    } else {
      // Cleanup
      canvas.remove();
    }
  };

  render();
};
export const triggerConfetti = launchConfetti;

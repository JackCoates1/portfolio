import { useEffect, useRef } from "react";

const AnimatedCenterpiece = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 400;

    // Particle system
    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      opacity: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = Math.random() > 0.5 ? "#22d3ee" : "#a78bfa";
        this.opacity = Math.random() * 0.5 + 0.3;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas!.width) this.x = 0;
        if (this.x < 0) this.x = canvas!.width;
        if (this.y > canvas!.height) this.y = 0;
        if (this.y < 0) this.y = canvas!.height;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push(new Particle());
    }

    let angle = 0;
    let pulseScale = 1;
    let pulseDirection = 1;

    const animate = () => {
      ctx.fillStyle = "rgba(20, 23, 30, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update particles
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      // Draw connecting lines
      particles.forEach((particleA, indexA) => {
        particles.slice(indexA + 1).forEach((particleB) => {
          const dx = particleA.x - particleB.x;
          const dy = particleA.y - particleB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.2 * (1 - distance / 100)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particleA.x, particleA.y);
            ctx.lineTo(particleB.x, particleB.y);
            ctx.stroke();
          }
        });
      });

      // Central rotating hexagon
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const sides = 6;
      const radius = 60 * pulseScale;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);

      // Outer glow hexagon
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#22d3ee";
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i * 2 * Math.PI) / sides;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner hexagon
      const innerRadius = radius * 0.7;
      ctx.strokeStyle = "#a78bfa";
      ctx.shadowColor = "#a78bfa";
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 6;
        const x = innerRadius * Math.cos(angle);
        const y = innerRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Spinning triangles
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((angle * 2 + (i * Math.PI * 2) / 3));
        ctx.translate(radius * 1.5, 0);
        ctx.fillStyle = "#22d3ee";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(8, 10);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();

      // Update animation values
      angle += 0.01;
      pulseScale += 0.005 * pulseDirection;
      if (pulseScale > 1.2 || pulseScale < 0.9) {
        pulseDirection *= -1;
      }

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div className="relative flex items-center justify-center my-8">
      <div className="relative" style={{ perspective: "1000px" }}>
        {/* Canvas with particles and shapes */}
        <canvas
          ref={canvasRef}
          className="relative pointer-events-none"
          style={{ mixBlendMode: "screen" }}
        />
        
        {/* Subtle orbital rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="orbital-ring"></div>
        </div>
      </div>

      <style>{`
        .orbital-ring {
          position: absolute;
          width: 300px;
          height: 300px;
          border: 1px solid hsl(var(--primary) / 0.15);
          border-radius: 50%;
          border-style: dashed;
          animation: spin 20s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AnimatedCenterpiece;

import { useEffect, useRef } from "react";

const AnimatedCenterpiece = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 600;

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
    for (let i = 0; i < 100; i++) {
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
      const radius = 80 * pulseScale;

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
    <div className="relative flex items-center justify-center my-12">
      {/* 3D Cube Container */}
      <div className="relative animate-float" style={{ 
        animation: "float 6s ease-in-out infinite",
        perspective: "1000px"
      }}>
        {/* Animated 3D Cube */}
        <div className="cube-container relative w-[300px] h-[300px]" style={{
          transformStyle: "preserve-3d",
          animation: "rotateCube 20s linear infinite"
        }}>
          <div className="cube-face cube-front"></div>
          <div className="cube-face cube-back"></div>
          <div className="cube-face cube-right"></div>
          <div className="cube-face cube-left"></div>
          <div className="cube-face cube-top"></div>
          <div className="cube-face cube-bottom"></div>
        </div>

        {/* Canvas overlay for particles */}
        <canvas
          ref={canvasRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ mixBlendMode: "screen" }}
        />
      </div>

      {/* Orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="orbital-ring orbital-ring-1"></div>
        <div className="orbital-ring orbital-ring-2"></div>
        <div className="orbital-ring orbital-ring-3"></div>
      </div>

      <style>{`
        @keyframes rotateCube {
          0% { transform: rotateX(0deg) rotateY(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes orbit {
          from { transform: rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg); }
        }

        .cube-face {
          position: absolute;
          width: 150px;
          height: 150px;
          border: 2px solid hsl(var(--primary));
          background: linear-gradient(135deg, 
            hsl(var(--primary) / 0.1), 
            hsl(var(--cyber-glow-secondary) / 0.1)
          );
          backdrop-filter: blur(10px);
          box-shadow: 
            inset 0 0 30px hsl(var(--primary) / 0.2),
            0 0 30px hsl(var(--primary) / 0.3);
        }

        .cube-front { 
          transform: translateZ(75px); 
        }
        .cube-back { 
          transform: translateZ(-75px) rotateY(180deg); 
        }
        .cube-right { 
          transform: rotateY(90deg) translateZ(75px); 
        }
        .cube-left { 
          transform: rotateY(-90deg) translateZ(75px); 
        }
        .cube-top { 
          transform: rotateX(90deg) translateZ(75px); 
        }
        .cube-bottom { 
          transform: rotateX(-90deg) translateZ(75px); 
        }

        .orbital-ring {
          position: absolute;
          border: 2px solid hsl(var(--primary) / 0.3);
          border-radius: 50%;
          box-shadow: 0 0 20px hsl(var(--primary) / 0.2);
        }

        .orbital-ring-1 {
          width: 400px;
          height: 400px;
          animation: spin 10s linear infinite;
          border-style: dashed;
        }

        .orbital-ring-2 {
          width: 500px;
          height: 500px;
          animation: spin 15s linear infinite reverse;
          border-color: hsl(var(--cyber-glow-secondary) / 0.3);
        }

        .orbital-ring-3 {
          width: 600px;
          height: 600px;
          animation: spin 20s linear infinite;
          border-style: dotted;
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

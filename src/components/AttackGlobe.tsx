import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Origin } from "@/data/telemetry";
interface Props {
  nodes: Origin[];
  paused: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  rotation: number;
  zoom: number;
  reset: number;
}
const vector = (lat: number, lon: number, radius = 1) =>
  new THREE.Vector3(
    radius * Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180),
    radius * Math.sin((lat * Math.PI) / 180),
    radius * Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180),
  );
export default function AttackGlobe({
  nodes,
  paused,
  selected,
  onSelect,
  rotation,
  zoom,
  reset,
}: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef({ paused, selected, onSelect, rotation, zoom, reset });
  state.current = { paused, selected, onSelect, rotation, zoom, reset };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    setFailed(false);
    let dirty = true;
    let contextLost = false;
    let lastState = state.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
    camera.position.set(0, 0, 4.6);
    const world = new THREE.Group();
    scene.add(world);
    world.rotation.set(0.32, -0.48, -0.12);
    scene.add(new THREE.AmbientLight(0x70949e, 1.3));
    const light = new THREE.DirectionalLight(0xc8f4ff, 2.4);
    light.position.set(-3, 4, 3);
    scene.add(light);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.995, 64, 48),
      new THREE.MeshPhongMaterial({
        color: 0x091924,
        shininess: 18,
        specular: 0x294654,
      }),
    );
    world.add(body);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.055, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader:
          "varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p; }",
        fragmentShader:
          "varying vec3 n;varying vec3 v;void main(){float f=pow(max(0.0,0.76-dot(n,v)),5.0);gl_FragColor=vec4(0.24,0.58,0.69,min(f*0.12,0.32));}",
      }),
    );
    scene.add(atmosphere);
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x436977,
      transparent: true,
      opacity: 0.18,
    });
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 3)
        pts.push(vector(lat, lon, 1.002));
      world.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          gridMaterial,
        ),
      );
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 3)
        pts.push(vector(lat, lon, 1.002));
      world.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          gridMaterial,
        ),
      );
    }
    const abort = new AbortController();
    let alive = true;
    fetch("/data/earth-land.json", { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        dirty = true;
        const vertices: number[] = [];
        const colors: number[] = [];
        for (const [lon, lat] of data.points) {
          const p = vector(lat, lon, 1.008);
          vertices.push(p.x, p.y, p.z);
          const shade = 0.56 + (0.28 * (p.y + 1)) / 2;
          colors.push(shade * 0.66, shade * 0.86, shade);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(vertices, 3),
        );
        geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        world.add(
          new THREE.Points(
            geo,
            new THREE.PointsMaterial({
              size: 0.011,
              vertexColors: true,
              sizeAttenuation: true,
              transparent: true,
              opacity: 0.94,
            }),
          ),
        );
        const coasts: number[] = [];
        for (const ring of data.coasts)
          for (let i = 1; i < ring.length; i++) {
            const a = vector(ring[i - 1][1], ring[i - 1][0], 1.009),
              b = vector(ring[i][1], ring[i][0], 1.009);
            coasts.push(...a.toArray(), ...b.toArray());
          }
        const linegeo = new THREE.BufferGeometry();
        linegeo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(coasts, 3),
        );
        world.add(
          new THREE.LineSegments(
            linegeo,
            new THREE.LineBasicMaterial({
              color: 0x94cbd6,
              transparent: true,
              opacity: 0.21,
            }),
          ),
        );
      })
      .catch(() => {
        if (alive && !abort.signal.aborted) {
          contextLost = true;
          setFailed(true);
        }
      });
    // Bradford is a symbolic home anchor, not a published endpoint or packet route.
    const home = vector(53.8, -1.8, 1.018);
    const homeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xc2faff }),
    );
    homeMesh.position.copy(home);
    world.add(homeMesh);
    const arcs: {
      point: THREE.Mesh;
      path: THREE.Vector3[];
      marker: THREE.Mesh;
      node: Origin;
      line: THREE.Line;
    }[] = [];
    // Display every aggregated origin. No manufactured routes or example coordinates.
    for (const node of nodes) {
      const start = vector(node.latitude, node.longitude, 1.015);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.01 + Math.min(node.count, 25) * 0.00025,
          10,
          10,
        ),
        new THREE.MeshBasicMaterial({ color: 0xf0b487 }),
      );
      dot.position.copy(start);
      world.add(dot);
      const path: THREE.Vector3[] = [];
      const distance = start.distanceTo(home);
      for (let i = 0; i <= 64; i++) {
        const t = i / 64;
        const p = start
          .clone()
          .lerp(home, t)
          .normalize()
          .multiplyScalar(
            1.017 + Math.sin(Math.PI * t) * Math.min(0.48, distance * 0.32),
          );
        path.push(p);
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(path),
        new THREE.LineBasicMaterial({
          color: 0xe6ad7a,
          transparent: true,
          opacity: 0.23,
        }),
      );
      world.add(line);
      const point = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffdfb2 }),
      );
      point.position.copy(start);
      world.add(point);
      arcs.push({ point, path, marker: dot, node, line });
    }
    let visible = true,
      raf = 0,
      last = 0,
      phase = 0,
      lastRotation = state.current.rotation,
      lastReset = state.current.reset;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(host);
    const resize = new ResizeObserver(() => {
      const w = host.clientWidth,
        h = host.clientHeight;
      if (w && h) {
        dirty = true;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    resize.observe(host);
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let down: { x: number; y: number; distance: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, distance: 0 };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x,
        dy = e.clientY - down.y;
      dirty = true;
      world.rotation.y += dx * 0.006;
      world.rotation.x = Math.max(
        -1.2,
        Math.min(1.2, world.rotation.x + dy * 0.004),
      );
      down.distance += Math.abs(dx) + Math.abs(dy);
      down.x = e.clientX;
      down.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (down && down.distance < 6) {
        const rect = canvas.getBoundingClientRect();
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects([
          body,
          ...arcs.map((a) => a.marker),
        ])[0];
        const a = arcs.find((a) => a.marker === hit?.object);
        if (a) state.current.onSelect(a.node.id);
      }
      down = null;
    };
    const onCancel = () => {
      down = null;
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      setFailed(true);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("webglcontextlost", onLost);
    function tick(time: number) {
      raf = requestAnimationFrame(tick);
      if (contextLost || !visible || document.hidden || time - last < 33)
        return;
      if (
        (state.current.paused || down) &&
        !dirty &&
        lastState === state.current
      )
        return;
      const delta = Math.min((time - last) / 1000, 0.05);
      last = time;
      const current = state.current;
      if (current.reset !== lastReset) {
        world.rotation.set(0.32, -0.48, -0.12);
        lastReset = current.reset;
      }
      world.rotation.y += (current.rotation - lastRotation) * 0.3;
      lastRotation = current.rotation;
      camera.position.z = 4.6 - current.zoom * 0.28;
      if (!current.paused && !down) {
        world.rotation.y += delta * 0.035;
        phase += delta * 0.1;
      }
      arcs.forEach((a, i) => {
        const chosen = a.node.id === current.selected;
        a.marker.scale.setScalar(chosen ? 1.85 : 1);
        (a.line.material as THREE.LineBasicMaterial).opacity = chosen
          ? 0.85
          : current.selected
            ? 0.12
            : 0.25;
        const f = ((phase + i * 0.073) % 1) * 64;
        const j = Math.floor(f);
        a.point.position
          .copy(a.path[j])
          .lerp(a.path[Math.min(j + 1, 64)], f - j);
      });
      renderer.render(scene, camera);
      lastState = current;
      dirty = false;
    }
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      abort.abort();
      cancelAnimationFrame(raf);
      resize.disconnect();
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("webglcontextlost", onLost);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        if (m.material) {
          for (const mat of Array.isArray(m.material)
            ? m.material
            : [m.material])
            mat.dispose();
        }
      });
      renderer.dispose();
      canvas.remove();
    };
  }, [nodes]);
  return (
    <div
      className={`globe-stage${failed ? " globe-unavailable" : ""}`}
      ref={mount}
    >
      {failed && (
        <div className="globe-fallback">
          <span>Globe unavailable</span>
          <p>
            Your browser could not render the 3D view. Every recorded origin is
            available in the list below.
          </p>
        </div>
      )}
    </div>
  );
}

/* 山地河谷科创城市 · P0 交互灰盒（Three.js）
 * 数据来自 data.js（由 docs/p0/*.csv 生成）；坐标：米，+X 东，+Y 北；three 内 y 轴为海拔，z = -Y。
 */
(function () {
  'use strict';

  const CITY = window.CITY;
  const $ = (id) => document.getElementById(id);
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function fail(message) {
    const box = $('error');
    box.textContent = '加载失败：' + message;
    box.classList.remove('hidden');
    $('loading').classList.add('done');
    console.error(message);
  }
  window.addEventListener('error', (event) => fail(event.message + ' @ app.js:' + event.lineno));

  // ---------------------------------------------------------------- 基础
  const canvas = $('scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    fail('当前浏览器无法创建 WebGL 上下文（' + err.message + '）');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe0ea, 1800, 6200);

  const persp = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  let activeCam = persp;
  let mode = 'persp';

  const orbit = {
    target: new THREE.Vector3(0, 6, -20),
    yaw: 0.55,
    pitch: 0.60,
    dist: 2500,
  };
  const orthoState = { zoom: 1 };

  // ---------------------------------------------------------------- 天空
  const skyUniforms = {
    topColor: { value: new THREE.Color('#2f6fa8') },
    horizonColor: { value: new THREE.Color('#c3dcef') },
    sunColor: { value: new THREE.Color('#fff6e8') },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(12000, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: [
        'varying vec3 vWorld;',
        'void main() {',
        '  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunColor; uniform vec3 sunDir;',
        'varying vec3 vWorld;',
        'void main() {',
        '  vec3 dir = normalize(vWorld - cameraPosition);',
        '  float h = clamp(dir.y, -0.15, 1.0);',
        '  vec3 col = mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.62));',
        '  if (h < 0.0) col = mix(horizonColor, horizonColor * 0.72, clamp(-h * 6.0, 0.0, 1.0));',
        '  float sd = max(dot(dir, sunDir), 0.0);',
        '  col += sunColor * pow(sd, 900.0) * 3.2;',
        '  col += sunColor * pow(sd, 10.0) * 0.14;',
        '  gl_FragColor = vec4(pow(max(col, 0.0), vec3(0.4545)), 1.0);',
        '}',
      ].join('\n'),
    })
  );
  sky.renderOrder = -10;
  scene.add(sky);

  const sun = new THREE.DirectionalLight(0xfff6e8, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -2800;
  sun.shadow.camera.right = 2800;
  sun.shadow.camera.top = 2800;
  sun.shadow.camera.bottom = -2800;
  sun.shadow.camera.near = 100;
  sun.shadow.camera.far = 12000;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 2.0;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xcfe4f2, 0x5a5142, 0.85);
  scene.add(hemi);

  // 星空
  function makeStars() {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.acos(0.05 + Math.random() * 0.95);
      const r = 11000;
      positions[i * 3] = Math.sin(v) * Math.cos(u) * r;
      positions[i * 3 + 1] = Math.cos(v) * r;
      positions[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xdfe9ff, size: 2.2, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, fog: false,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return points;
  }
  const stars = makeStars();
  scene.add(stars);

  // ---------------------------------------------------------------- 纹理
  function canvasTexture(w, h, draw) {
    const node = document.createElement('canvas');
    node.width = w;
    node.height = h;
    draw(node.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(node);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const glowTexture = canvasTexture(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,235,200,1)');
    grad.addColorStop(0.25, 'rgba(255,214,150,0.55)');
    grad.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });

  const poolTexture = canvasTexture(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,220,160,0.55)');
    grad.addColorStop(0.5, 'rgba(255,205,140,0.18)');
    grad.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });

  const rainTexture = canvasTexture(16, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(200,225,245,0)');
    grad.addColorStop(0.5, 'rgba(200,225,245,0.75)');
    grad.addColorStop(1, 'rgba(200,225,245,0)');
    g.fillStyle = grad;
    g.fillRect(w / 2 - 1.5, 0, 3, h);
  });

  function makeWindowTexture() {
    return canvasTexture(128, 256, (g, w, h) => {
      g.fillStyle = '#000000';
      g.fillRect(0, 0, w, h);
      const cols = 4, rows = 8;
      const cw = w / cols, rh = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.62) {
            const warm = 210 + Math.floor(Math.random() * 45);
            g.fillStyle = 'rgb(' + warm + ',' + Math.floor(warm * 0.84) + ',' + Math.floor(warm * 0.58) + ')';
            g.fillRect(c * cw + 3, r * rh + 5, cw - 6, rh - 10);
          }
        }
      }
    });
  }
  const windowTexture = makeWindowTexture();

  function makeWaterNormalTexture() {
    const size = 256;
    const height = new Float32Array(size * size);
    const tau = Math.PI * 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        height[y * size + x] =
          Math.sin(tau * (3 * u + 2 * v)) * 0.5 +
          Math.sin(tau * (5 * u - 3 * v) + 1.7) * 0.32 +
          Math.sin(tau * (2 * u + 7 * v) + 3.1) * 0.18;
      }
    }
    const node = document.createElement('canvas');
    node.width = size;
    node.height = size;
    const g = node.getContext('2d');
    const img = g.createImageData(size, size);
    const strength = 2.2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const xm = (x - 1 + size) % size, xp = (x + 1) % size;
        const ym = (y - 1 + size) % size, yp = (y + 1) % size;
        const dx = (height[y * size + xp] - height[y * size + xm]) * strength;
        const dy = (height[yp * size + x] - height[ym * size + x]) * strength;
        const len = Math.hypot(dx, dy, 1);
        const i = (y * size + x) * 4;
        img.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
        img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(node);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(90, 4);
    return tex;
  }
  const waterNormal = makeWaterNormalTexture();

  // ---------------------------------------------------------------- 地形
  const RIVER = CITY.meta.river;
  const BED = -2.6;
  const CITY_FLOOR = 3.2;
  const HALF = 3400;
  const SEG = 300;

  function hash2(ix, iy) {
    let h = (ix * 374761393 + iy * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }

  function vnoise(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash2(x0, y0), b = hash2(x0 + 1, y0), c = hash2(x0, y0 + 1), d = hash2(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }

  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return { dist: Math.hypot(px - (ax + dx * t), py - (ay + dy * t)), t: t };
  }

  function roadInfoAt(x, y) {
    let best = null;
    for (const road of CITY.roads) {
      if (road.id === 'B1') continue;
      const pts = road.points;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const hit = distToSegment(x, y, a.x, a.y, b.x, b.y);
        const limit = road.width / 2 + 3;
        if (hit.dist > limit + 18) continue;
        const mask = 1 - smoothstep(limit, limit + 16, hit.dist);
        if (mask <= 0) continue;
        const el = lerp(a.el, b.el, hit.t);
        if (!best || mask > best.mask) best = { mask: mask, el: el };
      }
    }
    return best;
  }

  function mountainHeight(x, y) {
    const north = smoothstep(1150, 1420, y);
    const south = 1 - smoothstep(-1440, -1150, y);
    const ridge = 0.74 + 0.3 * Math.sin(x * 0.0017 + 1.3) + 0.12 * Math.sin(x * 0.0043 + 0.4);
    const n1 = vnoise(x * 0.0042, y * 0.0042);
    const n2 = vnoise(x * 0.011 + 5.3, y * 0.011 + 9.1);
    const hN = north > 0 ? CITY_FLOOR + north * (112 + n1 * 58 + n2 * 20) * ridge : -Infinity;
    const hS = south > 0 ? CITY_FLOOR + south * (92 + n1 * 42 + n2 * 14) * ridge : -Infinity;
    return Math.max(hN, hS);
  }

  function heightAt(x, y) {
    let h = CITY_FLOOR;
    const riverMask =
      smoothstep(RIVER.minY - 46, RIVER.minY - 8, y) *
      (1 - smoothstep(RIVER.maxY + 8, RIVER.maxY + 46, y));
    if (riverMask > 0) h = h + (BED - h) * riverMask;
    h = Math.max(h, mountainHeight(x, y));

    for (const zone of CITY.zones) {
      if (zone.type !== 'Plateau') continue;
      const m = smoothstep(zone.minX - 70, zone.minX, x) *
        (1 - smoothstep(zone.maxX, zone.maxX + 70, x)) *
        smoothstep(zone.minY - 70, zone.minY, y) *
        (1 - smoothstep(zone.maxY, zone.maxY + 70, y));
      if (m > 0) h = lerp(h, zone.el, m);
    }

    const road = roadInfoAt(x, y);
    if (road) h = lerp(h, road.el, road.mask);
    return h;
  }

  function buildTerrain() {
    const nx = SEG + 1;
    const positions = new Float32Array(nx * nx * 3);
    const colors = new Float32Array(nx * nx * 3);
    const indices = new Uint32Array(SEG * SEG * 6);
    const grass = new THREE.Color('#74905c');
    const high = new THREE.Color('#66765d');
    const bed = new THREE.Color('#3e4a38');
    const rockColor = new THREE.Color('#6e6a60');
    const col = new THREE.Color();

    for (let iz = 0; iz < nx; iz++) {
      const z = -HALF + (iz / SEG) * HALF * 2;
      for (let ix = 0; ix < nx; ix++) {
        const x = -HALF + (ix / SEG) * HALF * 2;
        const h = heightAt(x, -z);
        const index = iz * nx + ix;
        positions[index * 3] = x;
        positions[index * 3 + 1] = h;
        positions[index * 3 + 2] = z;

        if (h < 0.6) col.copy(bed);
        else {
          col.copy(grass).lerp(high, clamp((h - 40) / 130, 0, 1) * 0.85);
          const sx = heightAt(x + 8, -z) - heightAt(x - 8, -z);
          const sz = heightAt(x, -z + 8) - heightAt(x, -z - 8);
          const slope = Math.hypot(sx, sz) / 16;
          const rock = clamp((slope - 0.32) / 0.55, 0, 1);
          if (rock > 0) col.lerp(rockColor, rock * 0.75);
        }
        const tint = 0.9 + 0.16 * vnoise(x * 0.013, z * 0.013);
        colors[index * 3] = col.r * tint;
        colors[index * 3 + 1] = col.g * tint;
        colors[index * 3 + 2] = col.b * tint;
      }
    }

    let k = 0;
    for (let iz = 0; iz < SEG; iz++) {
      for (let ix = 0; ix < SEG; ix++) {
        const a = iz * nx + ix;
        const b = a + 1;
        const c = a + nx;
        const d = c + 1;
        indices[k++] = a; indices[k++] = c; indices[k++] = b;
        indices[k++] = b; indices[k++] = c; indices[k++] = d;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  buildTerrain();

  // 分区着色 + 标签
  const ZONE_COLORS = { A: '#5b8db8', B: '#e08a3c', C: '#6fa85a', D: '#a97fa8', F: '#d26a6a' };

  function makeLabelSprite(text, color, sub) {
    const node = document.createElement('canvas');
    const w = 1024, h = 256;
    node.width = w;
    node.height = h;
    const g = node.getContext('2d');
    g.fillStyle = 'rgba(10,16,24,0.62)';
    g.beginPath();
    g.roundRect(8, 40, w - 16, 176, 34);
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = 5;
    g.stroke();
    g.fillStyle = color;
    g.font = '600 78px "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif';
    g.textBaseline = 'middle';
    g.fillText(text, 48, 132);
    if (sub) {
      g.fillStyle = 'rgba(255,255,255,0.62)';
      g.font = '400 44px "Noto Sans CJK SC", sans-serif';
      g.fillText(sub, 48 + g.measureText(text).width + 18, 136);
    }
    const tex = new THREE.CanvasTexture(node);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(230, 58, 1);
    return sprite;
  }

  const zoneLabels = [];
  CITY.zones.forEach((zone) => {
    if (zone.type === 'Mountain') {
      const sprite = makeLabelSprite(zone.id + ' ' + zone.name, '#cbd6c4', 'EL ' + zone.el.toFixed(0));
      sprite.position.set(zone.minX + 420, heightAt(zone.minX + 420, zone.minY + 120) + 60, -(zone.minY + 120));
      scene.add(sprite);
      zoneLabels.push(sprite);
      return;
    }
    const color = ZONE_COLORS[zone.id] || '#9aa4a0';
    const w = zone.maxX - zone.minX;
    const d = zone.maxY - zone.minY;
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: color, emissive: new THREE.Color(color), emissiveIntensity: 0.1,
      transparent: true, opacity: 0.26, roughness: 1,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.position.set((zone.minX + zone.maxX) / 2, zone.el + 0.12, -(zone.minY + zone.maxY) / 2);
    scene.add(plane);

    const pts = [
      new THREE.Vector3(zone.minX, zone.el + 0.2, -zone.minY),
      new THREE.Vector3(zone.maxX, zone.el + 0.2, -zone.minY),
      new THREE.Vector3(zone.maxX, zone.el + 0.2, -zone.maxY),
      new THREE.Vector3(zone.minX, zone.el + 0.2, -zone.maxY),
      new THREE.Vector3(zone.minX, zone.el + 0.2, -zone.minY),
    ];
    const border = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.65 })
    );
    scene.add(border);

    const label = makeLabelSprite(zone.id + ' ' + zone.name, color, 'EL ' + zone.el.toFixed(1));
    label.position.set(zone.minX + 300, zone.el + 46, -(zone.minY + 110));
    scene.add(label);
    zoneLabels.push(label);
  });

  // ---------------------------------------------------------------- 道路与桥
  const roadMaterial = new THREE.MeshStandardMaterial({ color: '#3a3f45', roughness: 0.95, metalness: 0.02 });
  const bridgeMaterial = new THREE.MeshStandardMaterial({ color: '#5b5148', roughness: 0.85, metalness: 0.05 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: '#b9c1c7', roughness: 0.5, metalness: 0.4 });

  function segmentBox(a, b, width, thickness, material, lift) {
    const from = new THREE.Vector3(a.x, a.el + (lift || 0), -a.y);
    const to = new THREE.Vector3(b.x, b.el + (lift || 0), -b.y);
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.01) return null;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.position.y -= thickness / 2;
    mesh.scale.set(width, thickness, len);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  }

  const roadsGroup = new THREE.Group();
  CITY.roads.forEach((road) => {
    const isBridge = road.id === 'B1';
    const material = isBridge ? bridgeMaterial : roadMaterial;
    const thickness = isBridge ? 1.7 : 0.55;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i], b = road.points[i + 1];
      const deck = segmentBox(a, b, road.width, thickness, material, isBridge ? 0.12 : 0.14);
      if (deck) roadsGroup.add(deck);
      if (isBridge) {
        const dir = new THREE.Vector3(b.x - a.x, 0, -(b.y - a.y)).normalize();
        const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
        for (const sign of [-1, 1]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.35, 1), railMaterial);
          const mid = new THREE.Vector3((a.x + b.x) / 2, (a.el + b.el) / 2, -(a.y + b.y) / 2);
          rail.position.copy(mid).addScaledVector(side, sign * (road.width / 2 - 0.6));
          rail.position.y += 0.7;
          rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(b.x - a.x, b.el - a.el, -(b.y - a.y)).normalize());
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          rail.scale.z = len;
          rail.castShadow = true;
          roadsGroup.add(rail);
        }
      }
    }
  });

  // 桥墩
  const pierMaterial = new THREE.MeshStandardMaterial({ color: '#9aa0a2', roughness: 0.9 });
  [-60, -110, -160].forEach((y) => {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(5, 6.5, 19, 12), pierMaterial);
    pier.position.set(-250, 4.5, -y);
    pier.castShadow = true;
    pier.receiveShadow = true;
    roadsGroup.add(pier);
  });

  scene.add(roadsGroup);

  // 车道虚线（单个 InstancedMesh）
  (function buildLaneDashes() {
    const items = [];
    CITY.roads.forEach((road) => {
      if (road.id === 'B1') return;
      for (let i = 0; i < road.points.length - 1; i++) {
        const a = road.points[i], b = road.points[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const dir = new THREE.Vector3(b.x - a.x, b.el - a.el, -(b.y - a.y)).normalize();
        const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
        for (let d = 10; d < len - 10; d += 16) {
          const t = d / len;
          items.push({
            p: new THREE.Vector3(lerp(a.x, b.x, t), lerp(a.el, b.el, t) + 0.2, -lerp(a.y, b.y, t)),
            dir: dir, flat: flat,
          });
        }
      }
    });
    const geo = new THREE.BoxGeometry(0.3, 0.05, 3.4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xdfe6e8, transparent: true, opacity: 0.5 });
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.copy(item.p).addScaledVector(item.flat, 0.01);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), item.dir);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  })();

  // ---------------------------------------------------------------- 水面
  const waterGeo = new THREE.PlaneGeometry(6800, 130);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x24506b,
    roughness: 0.08,
    metalness: 0.0,
    transparent: true,
    opacity: 0.94,
    normalMap: waterNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
  });
  const water = new THREE.Mesh(waterGeo, waterMaterial);
  water.position.set(0, 0.04, 110);
  water.receiveShadow = true;
  scene.add(water);
  const waterState = { level: 0.04, target: 0.04, spread: 1, targetSpread: 1, flow: 0.8, targetFlow: 0.8, color: new THREE.Color('#2e5f7a'), targetColor: new THREE.Color('#2e5f7a') };

  // ---------------------------------------------------------------- 建筑
  const BUILDING_COLORS = {
    Tower: '#efe9dc', Office: '#dbe3ea', DataCenter: '#c8ced4', Exhibition: '#f0e2c4',
    Civic: '#e4d9e9', Residential: '#ecd8c6', Retail: '#f2c98f', Toll: '#dedede',
  };
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x2f3a44, transparent: true, opacity: 0.35 });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const buildingMeshes = [];
  const buildings = [];

  CITY.buildings.forEach((building, index) => {
    const color = BUILDING_COLORS[building.type] || '#d8d4cc';
    const winTex = windowTexture.clone();
    winTex.needsUpdate = true;
    winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
    winTex.repeat.set(Math.max(1.4, building.sx / 13), Math.max(1.4, building.h / 26));
    winTex.colorSpace = THREE.SRGBColorSpace;

    const wall = new THREE.MeshStandardMaterial({
      color: color, roughness: 0.78, metalness: 0.04,
      emissive: new THREE.Color('#ffd39a'), emissiveMap: winTex, emissiveIntensity: 0,
    });
    const roof = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.70), roughness: 0.9 });

    const group = new THREE.Group();
    group.position.set(building.x, building.baseEL, -building.y);
    group.rotation.y = building.yaw * DEG;
    scene.add(group);

    const mesh = new THREE.Mesh(unitBox, [wall, wall, roof, roof, wall, wall]);
    mesh.scale.set(building.sx, building.h, building.sy);
    mesh.position.y = building.h / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.pick = { type: 'building', id: building.id };
    group.add(mesh);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(unitBox), edgeMaterial);
    mesh.add(edges);
    mesh.userData.edges = edges;

    // 塔楼冠部机房 + 航空障碍灯（挂在未缩放的 group 上，避免继承建筑缩放）
    if (building.type === 'Tower') {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(building.sx * 0.42, 8, building.sy * 0.42),
        new THREE.MeshStandardMaterial({ color: '#cfd4d6', roughness: 0.7 }));
      crown.position.y = building.h + 4;
      crown.castShadow = true;
      group.add(crown);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff4a3d }));
      beacon.position.y = building.h + 8.4;
      group.add(beacon);
      mesh.userData.beacon = beacon;
    }

    buildingMeshes.push(mesh);
    buildings.push({
      data: building, mesh: mesh, wall: wall, index: index,
      delay: index * 0.07, windows: 0,
    });
  });

  // ---------------------------------------------------------------- 填充体块
  // 只补城市肌理：不可交互、不可拾取，避开命名建筑与道路。
  const fillerTex = windowTexture.clone();
  fillerTex.needsUpdate = true;
  fillerTex.wrapS = fillerTex.wrapT = THREE.RepeatWrapping;
  fillerTex.repeat.set(5, 11);
  fillerTex.colorSpace = THREE.SRGBColorSpace;
  const fillerMaterial = new THREE.MeshStandardMaterial({
    color: '#c9ced1', roughness: 0.9, metalness: 0.02,
    emissive: new THREE.Color('#ffdca8'), emissiveMap: fillerTex, emissiveIntensity: 0,
  });
  const FILLER_RULES = {
    A: { step: 128, hMin: 16, hMax: 52, sMin: 26, sMax: 44, skip: 0.18 },
    B: { step: 124, hMin: 24, hMax: 64, sMin: 24, sMax: 42, skip: 0.14 },
    D: { step: 116, hMin: 8, hMax: 18, sMin: 30, sMax: 52, skip: 0.30 },
    F: { step: 132, hMin: 9, hMax: 16, sMin: 26, sMax: 40, skip: 0.35 },
  };
  const fillerList = [];
  CITY.zones.forEach((zone) => {
    const rule = FILLER_RULES[zone.id];
    if (!rule) return;
    for (let x = zone.minX + 80; x <= zone.maxX - 80; x += rule.step) {
      for (let y = zone.minY + 80; y <= zone.maxY - 80; y += rule.step) {
        if (Math.random() < rule.skip) continue;
        const cx = x + (Math.random() - 0.5) * rule.step * 0.35;
        const cy = y + (Math.random() - 0.5) * rule.step * 0.35;
        if (CITY.buildings.some((b) => Math.hypot(b.x - cx, b.y - cy) < Math.max(b.sx, b.sy) / 2 + 30)) continue;
        let blocked = false;
        for (const road of CITY.roads) {
          for (let i = 0; i < road.points.length - 1 && !blocked; i++) {
            const a = road.points[i], b = road.points[i + 1];
            if (distToSegment(cx, cy, a.x, a.y, b.x, b.y).dist < road.width / 2 + 18) blocked = true;
          }
          if (blocked) break;
        }
        if (blocked) continue;
        const sx = rule.sMin + Math.random() * (rule.sMax - rule.sMin);
        const sy = rule.sMin + Math.random() * (rule.sMax - rule.sMin);
        const h = rule.hMin + Math.random() * (rule.hMax - rule.hMin);
        fillerList.push({ x: cx, y: cy, sx: sx, sy: sy, h: h, rot: (Math.random() - 0.5) * 0.16, el: zone.el });
      }
    }
  });
  const fillerMesh = new THREE.InstancedMesh(unitBox, fillerMaterial, fillerList.length);
  const fillerDummy = new THREE.Object3D();
  const fillerColor = new THREE.Color();
  fillerList.forEach((f, i) => {
    fillerDummy.position.set(f.x, f.el + f.h / 2, -f.y);
    fillerDummy.rotation.set(0, f.rot, 0);
    fillerDummy.scale.set(f.sx, f.h, f.sy);
    fillerDummy.updateMatrix();
    fillerMesh.setMatrixAt(i, fillerDummy.matrix);
    fillerColor.setHSL(0.56 + Math.random() * 0.05, 0.04 + Math.random() * 0.05, 0.72 + Math.random() * 0.16);
    fillerMesh.setColorAt(i, fillerColor);
  });
  fillerMesh.castShadow = true;
  fillerMesh.receiveShadow = true;
  scene.add(fillerMesh);

  // ---------------------------------------------------------------- 路灯
  const poleMaterial = new THREE.MeshStandardMaterial({ color: '#4a5158', roughness: 0.6, metalness: 0.4 });
  const lampHeadMaterialBase = new THREE.MeshStandardMaterial({
    color: '#ffe9c4', emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0, roughness: 0.4,
  });
  const lampGlowMaterial = new THREE.SpriteMaterial({
    map: glowTexture, color: 0xffd8a0, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const poolMaterial = new THREE.MeshBasicMaterial({
    map: poolTexture, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  });

  const lamps = [];
  function addLamp(x, y, height, interactiveNode) {
    const group = new THREE.Group();
    const base = heightAt(x, y);
    group.position.set(x, base, -y);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 9, 7), poleMaterial);
    pole.position.y = 4.5;
    pole.castShadow = true;
    group.add(pole);

    const headMat = lampHeadMaterialBase.clone();
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.85), headMat);
    head.position.set(0.7, 9.1, 0);
    head.castShadow = true;
    group.add(head);

    const glow = new THREE.Sprite(lampGlowMaterial.clone());
    glow.position.set(0.7, 9.0, 0);
    glow.scale.set(34, 34, 1);
    group.add(glow);

    const pool = new THREE.Mesh(new THREE.CircleGeometry(11, 24), poolMaterial.clone());
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.12;
    group.add(pool);

    if (interactiveNode) {
      head.userData.pick = { type: 'node', id: interactiveNode };
      pole.userData.pick = { type: 'node', id: interactiveNode };
      group.userData.node = interactiveNode;
    }
    scene.add(group);
    lamps.push({ group: group, head: head, glow: glow, pool: pool, base: base, on: true, brightness: 0.8, y: y, x: x });
  }

  for (let x = -2000; x <= 2000; x += 360) addLamp(x, -30, 3.2);
  addLamp(-1150, 480, 4.0, 'OBJ-02');
  addLamp(-700, -600, 2.8);
  addLamp(300, -350, 2.2);
  addLamp(1500, -600, 3.5);

  // ---------------------------------------------------------------- 树
  function buildTrees() {
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 4.2, 5);
    const crownGeo = new THREE.ConeGeometry(3.4, 9.5, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#4d4034', roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: '#57734a', roughness: 1 });

    const spots = [];
    const pushRandom = (zone, count) => {
      for (let i = 0; i < count; i++) {
        const x = lerp(zone.minX + 40, zone.maxX - 40, Math.random());
        const y = lerp(zone.minY + 40, zone.maxY - 40, Math.random());
        if (roadInfoAt(x, y)) continue;
        if (CITY.buildings.some((b) => Math.abs(b.x - x) < b.sx / 2 + 6 && Math.abs(b.y - y) < b.sy / 2 + 6)) continue;
        spots.push({ x: x, y: y, s: 0.8 + Math.random() * 0.7 });
      }
    };
    CITY.zones.forEach((zone) => {
      if (zone.type === 'Mountain') pushRandom(zone, 110);
      else if (zone.id === 'C') pushRandom(zone, 190);
      else if (zone.id === 'A' || zone.id === 'D') pushRandom(zone, 45);
    });
    // 河岸带
    for (let i = 0; i < 160; i++) {
      const x = lerp(-2100, 2100, Math.random());
      const y = Math.random() < 0.5 ? lerp(-46, -22, Math.random()) : lerp(-238, -214, Math.random());
      if (roadInfoAt(x, y)) continue;
      spots.push({ x: x, y: y, s: 0.7 + Math.random() * 0.5 });
    }

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, spots.length);
    const dummy = new THREE.Object3D();
    spots.forEach((spot, i) => {
      const h = heightAt(spot.x, spot.y);
      dummy.position.set(spot.x, h + 2.1 * spot.s, -spot.y);
      dummy.scale.setScalar(spot.s);
      dummy.rotation.set(0, Math.random() * 6.28, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.y = h + (4.2 + 4.75) * spot.s * 0.9;
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
    });
    trunks.castShadow = crowns.castShadow = true;
    trunks.receiveShadow = crowns.receiveShadow = true;
    scene.add(trunks, crowns);
  }
  buildTrees();

  // ---------------------------------------------------------------- 车流
  const cars = [];
  function buildCars() {
    const count = 70;
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 });
    const carMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
    carMesh.castShadow = true;
    carMesh.receiveShadow = true;
    const palette = ['#d8dde2', '#2f3a44', '#8c2f2f', '#33506b', '#c9b06a', '#5c6a5c'];
    const usable = CITY.roads.filter((r) => r.id !== 'B1');
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const road = usable[i % usable.length];
      const a = road.points[0], b = road.points[road.points.length - 1];
      const dir = i % 2 === 0 ? 1 : -1;
      const lane = dir > 0 ? road.width * 0.22 : -road.width * 0.22;
      cars.push({ road: road, dir: dir, lane: lane, s: Math.random() * 1, speed: 9 + Math.random() * 9 });
      carMesh.setColorAt(i, new THREE.Color(palette[i % palette.length]));
    }
    carMesh.instanceColor.needsUpdate = true;
    scene.add(carMesh);
    return carMesh;
  }
  const carMesh = buildCars();

  // ---------------------------------------------------------------- 锚点
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: '#ffcf80', emissive: new THREE.Color('#ffb347'), emissiveIntensity: 1.1, roughness: 0.35,
  });
  const markerRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc25c, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
  });
  const markers = [];
  CITY.markers.forEach((marker, i) => {
    const h = marker.z;
    const group = new THREE.Group();
    group.position.set(marker.x, h, -marker.y);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(9, 0), markerMaterial);
    gem.position.y = 22;
    gem.userData.pick = { type: 'node', id: marker.nodeId };
    group.add(gem);
    const ring = new THREE.Mesh(new THREE.RingGeometry(13, 18, 32), markerRingMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.4;
    group.add(ring);
    group.userData.phase = i * 1.7;
    scene.add(group);
    markers.push({ group: group, gem: gem, marker: marker });
  });

  // ---------------------------------------------------------------- 雨
  const RAIN_COUNT = 2200;
  const rainPositions = new Float32Array(RAIN_COUNT * 3);
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 4600;
    rainPositions[i * 3 + 1] = Math.random() * 900;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 3400;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.PointsMaterial({
    map: rainTexture, color: 0xc6dcec, size: 11, transparent: true, opacity: 0,
    depthWrite: false, sizeAttenuation: true,
  });
  const rain = new THREE.Points(rainGeo, rainMaterial);
  rain.visible = false;
  scene.add(rain);

  // ---------------------------------------------------------------- 环境预设
  const TIMES = {
    dawn: {
      skyTop: '#2c4a68', horizon: '#f2b184', sunColor: '#ffc38a', sunI: 2.1, hemi: 0.55,
      fog: '#e6c4ac', fogNear: 2600, fogFar: 10000, exposure: 1.02, sunEl: 13, sunAz: 78,
      lamp: 0.45, windows: 0.25, stars: 0.05, ground: '#7d8a78',
    },
    noon: {
      skyTop: '#2f6fa8', horizon: '#c3dcef', sunColor: '#fff6e8', sunI: 3.6, hemi: 0.78,
      fog: '#c9dde9', fogNear: 4200, fogFar: 13000, exposure: 0.94, sunEl: 60, sunAz: 165,
      lamp: 0.0, windows: 0.0, stars: 0.0, ground: '#74905c',
    },
    dusk: {
      skyTop: '#243450', horizon: '#ee9a66', sunColor: '#ff9955', sunI: 2.0, hemi: 0.45,
      fog: '#df9f7d', fogNear: 2200, fogFar: 9000, exposure: 1.05, sunEl: 9, sunAz: 252,
      lamp: 0.8, windows: 0.6, stars: 0.1, ground: '#7b8272',
    },
    rainy_night: {
      skyTop: '#08101c', horizon: '#1c2c3e', sunColor: '#93aec9', sunI: 0.42, hemi: 0.3,
      fog: '#16232f', fogNear: 900, fogFar: 8200, exposure: 1.26, sunEl: 55, sunAz: 200,
      lamp: 1.0, windows: 1.0, stars: 0.0, ground: '#5c6b66',
    },
    night: {
      skyTop: '#060c18', horizon: '#16283c', sunColor: '#8ea8c8', sunI: 0.5, hemi: 0.34,
      fog: '#101c2a', fogNear: 1100, fogFar: 9500, exposure: 1.3, sunEl: 48, sunAz: 210,
      lamp: 1.0, windows: 1.0, stars: 1.0, ground: '#55625f',
    },
  };

  const WEATHERS = {
    clear: { sun: 1.0, hemi: 1.0, fogNear: 1.0, fogFar: 1.0, rain: 0, sky: '#cfe4f2', sunAz: 0 },
    cloudy: { sun: 0.55, hemi: 0.9, fogNear: 0.75, fogFar: 0.8, rain: 0, sky: '#c3cdd6', sunAz: 0 },
    drizzle: { sun: 0.42, hemi: 0.8, fogNear: 0.6, fogFar: 0.7, rain: 1, sky: '#b5c3cc', sunAz: 0 },
    mist: { sun: 0.5, hemi: 0.85, fogNear: 0.16, fogFar: 0.42, rain: 0, sky: '#dfe6e6', sunAz: 0 },
  };

  const state = {
    time: 'noon', weather: 'clear', traffic: true, flood: false, nightShow: false,
    nightShowStart: 0, lampManual: true, lampBrightness: 0.8,
  };

  const envCur = {
    sunI: 3.3, hemi: 0.95, fogNear: 4200, fogFar: 13000, exposure: 1.0,
    lamp: 0, windows: 0, stars: 0, sunEl: 60, sunAz: 165,
    skyTop: new THREE.Color('#4b86c4'), horizon: new THREE.Color('#d5e7f4'),
    sunColor: new THREE.Color('#fff6e8'), fogColor: new THREE.Color('#c9dde9'),
    ground: new THREE.Color('#74905c'),
  };
  const envTgt = { ...envCur, skyTop: envCur.skyTop.clone(), horizon: envCur.horizon.clone(), sunColor: envCur.sunColor.clone(), fogColor: envCur.fogColor.clone(), ground: envCur.ground.clone() };

  function computeEnvTarget() {
    const t = TIMES[state.time];
    const w = WEATHERS[state.weather];
    return {
      sunI: t.sunI * w.sun, hemi: t.hemi * w.hemi,
      fogNear: t.fogNear * w.fogNear, fogFar: t.fogFar * w.fogFar,
      exposure: t.exposure, sunEl: t.sunEl, sunAz: t.sunAz + w.sunAz,
      lamp: Math.max(t.lamp, 0), windows: t.windows, stars: t.stars,
      skyTop: new THREE.Color(t.skyTop), horizon: new THREE.Color(state.weather === 'clear' ? t.horizon : w.sky),
      sunColor: new THREE.Color(t.sunColor), fogColor: new THREE.Color(state.weather === 'clear' ? t.fog : w.sky),
      ground: new THREE.Color(t.ground),
    };
  }

  function sunDirection(elDeg, azDeg) {
    const el = elDeg * DEG, az = azDeg * DEG;
    return new THREE.Vector3(
      Math.sin(az) * Math.cos(el),
      Math.sin(el),
      -Math.cos(az) * Math.cos(el)
    ).normalize();
  }

  function refreshEnv() {
    const t = computeEnvTarget();
    envTgt.sunI = t.sunI;
    envTgt.hemi = t.hemi;
    envTgt.fogNear = t.fogNear;
    envTgt.fogFar = t.fogFar;
    envTgt.exposure = t.exposure;
    envTgt.sunEl = t.sunEl;
    envTgt.sunAz = t.sunAz;
    envTgt.lamp = t.lamp;
    envTgt.windows = t.windows;
    envTgt.stars = t.stars;
    envTgt.skyTop.copy(t.skyTop);
    envTgt.horizon.copy(t.horizon);
    envTgt.sunColor.copy(t.sunColor);
    envTgt.fogColor.copy(t.fogColor);
    envTgt.ground.copy(t.ground);
    rain.visible = wRain();
  }
  function wRain() {
    return state.weather === 'drizzle' || state.time === 'rainy_night';
  }

  function updateEnvironment(dt, now) {
    const k = 1 - Math.exp(-dt * 2.2);
    envCur.sunI = lerp(envCur.sunI, envTgt.sunI, k);
    envCur.hemi = lerp(envCur.hemi, envTgt.hemi, k);
    envCur.fogNear = lerp(envCur.fogNear, envTgt.fogNear, k);
    envCur.fogFar = lerp(envCur.fogFar, envTgt.fogFar, k);
    envCur.exposure = lerp(envCur.exposure, envTgt.exposure, k);
    envCur.lamp = lerp(envCur.lamp, envTgt.lamp, k);
    envCur.windows = lerp(envCur.windows, envTgt.windows, k);
    envCur.stars = lerp(envCur.stars, envTgt.stars, k);
    envCur.sunEl = lerp(envCur.sunEl, envTgt.sunEl, k);
    envCur.sunAz = lerp(envCur.sunAz, envTgt.sunAz, k);
    envCur.skyTop.lerp(envTgt.skyTop, k);
    envCur.horizon.lerp(envTgt.horizon, k);
    envCur.sunColor.lerp(envTgt.sunColor, k);
    envCur.fogColor.lerp(envTgt.fogColor, k);
    envCur.ground.lerp(envTgt.ground, k);

    renderer.toneMappingExposure = envCur.exposure;
    hemi.intensity = envCur.hemi;
    hemi.color.copy(envCur.horizon);
    hemi.groundColor.copy(envCur.ground);
    sun.color.copy(envCur.sunColor);
    sun.intensity = envCur.sunI;
    const dir = sunDirection(envCur.sunEl, envCur.sunAz);
    sun.position.copy(dir).multiplyScalar(4200);
    sun.target.position.set(0, 0, 0);
    skyUniforms.sunDir.value.copy(dir);
    skyUniforms.topColor.value.copy(envCur.skyTop);
    skyUniforms.horizonColor.value.copy(envCur.horizon);
    skyUniforms.sunColor.value.copy(envCur.sunColor);

    scene.fog.color.copy(envCur.fogColor);
    scene.fog.near = envCur.fogNear;
    scene.fog.far = envCur.fogFar;

    stars.material.opacity = envCur.stars * 0.85;
    stars.visible = envCur.stars > 0.02;

    rainMaterial.opacity = wRain() ? 0.7 : 0;
    rain.visible = wRain();

    // 路灯
    lamps.forEach((lamp, i) => {
      let factor = envCur.lamp;
      if (state.nightShow) {
        const delay = i * 0.06;
        factor *= clamp((now - state.nightShowStart) / 900 - delay, 0, 1);
      }
      const e = lamp.on ? factor * lamp.brightness : 0;
      lamp.head.material.emissiveIntensity = e * 2.6;
      lamp.head.material.emissive.setRGB(1, 0.82, 0.55);
      lamp.glow.material.opacity = e * 0.95;
      lamp.pool.material.opacity = e * 0.6;
    });

    // 建筑窗光
    buildings.forEach((b) => {
      let factor = envCur.windows;
      if (state.nightShow) {
        factor *= clamp((now - state.nightShowStart) / 1000 - b.delay, 0, 1);
      }
      b.windowFactor = factor;
      b.wall.emissiveIntensity = factor * 3.0;
      if (b.mesh.userData.beacon) {
        const blink = (Math.sin(now * 0.004 + b.index) > 0.4) ? 1 : 0.15;
        b.mesh.userData.beacon.material.opacity = 1;
        b.mesh.userData.beacon.material.color.setRGB(1 * blink, 0.25 * blink, 0.2 * blink);
      }
    });

    // 水面
    waterState.level = lerp(waterState.level, waterState.target, k);
    waterState.spread = lerp(waterState.spread, waterState.targetSpread, k);
    waterState.flow = lerp(waterState.flow, waterState.targetFlow, k);
    waterState.color.lerp(waterState.targetColor, k);
    water.position.y = waterState.level;
    water.scale.z = waterState.spread;
    waterMaterial.color.copy(waterState.color);
    waterMaterial.opacity = lerp(0.9, 0.96, clamp(waterState.level / 2.4, 0, 1));
    waterMaterial.normalMap.offset.x += waterState.flow * dt * 0.02;
    waterMaterial.normalMap.offset.y += waterState.flow * dt * 0.006;
  }

  // ---------------------------------------------------------------- 相机
  function updatePersp() {
    const cp = Math.cos(orbit.pitch), sp = Math.sin(orbit.pitch);
    persp.position.set(
      orbit.target.x + orbit.dist * cp * Math.sin(orbit.yaw),
      orbit.target.y + orbit.dist * sp,
      orbit.target.z + orbit.dist * cp * Math.cos(orbit.yaw)
    );
    persp.lookAt(orbit.target);
    persp.fov = 55;
    persp.updateProjectionMatrix();
  }

  function updateOrtho() {
    const aspect = window.innerWidth / window.innerHeight;
    const halfH = Math.max(1750, 2300 / aspect) * orthoState.zoom;
    const halfW = halfH * aspect;
    ortho.left = -halfW;
    ortho.right = halfW;
    ortho.top = halfH;
    ortho.bottom = -halfH;
    ortho.position.set(orbit.target.x, 5200, orbit.target.z);
    ortho.up.set(0, 0, -1);
    ortho.lookAt(orbit.target.x, 0, orbit.target.z);
    ortho.updateProjectionMatrix();
  }

  function setMode(next) {
    mode = next;
    if (mode === 'ortho') {
      activeCam = ortho;
      updateOrtho();
    } else {
      activeCam = persp;
      updatePersp();
    }
    updateCamButtons();
  }

  let flight = null;
  function flyTo(spec) {
    const pos = new THREE.Vector3(spec.x, spec.z, -spec.y);
    const yaw = spec.yaw * DEG, pitch = spec.pitch * DEG;
    const dir = new THREE.Vector3(
      Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw)
    );
    const dist = Math.min(Math.max(pos.y * 2.4, 220), 900);
    const target = pos.clone().addScaledVector(dir, dist);
    target.y = Math.max(target.y, 2);
    setMode('persp');
    flight = {
      fromPos: persp.position.clone(), fromTarget: orbit.target.clone(),
      toPos: pos, toTarget: target, t: 0, dur: spec.duration || 1.8,
    };
  }

  function updateFlight(dt) {
    if (!flight) return;
    flight.t = Math.min(1, flight.t + dt / flight.dur);
    const e = flight.t * flight.t * (3 - 2 * flight.t);
    persp.position.lerpVectors(flight.fromPos, flight.toPos, e);
    const target = new THREE.Vector3().lerpVectors(flight.fromTarget, flight.toTarget, e);
    persp.lookAt(target);
    if (flight.t >= 1) {
      orbit.target.copy(target);
      const offset = persp.position.clone().sub(target);
      orbit.dist = offset.length();
      orbit.yaw = Math.atan2(offset.x, offset.z);
      orbit.pitch = Math.asin(clamp(offset.y / orbit.dist, -0.99, 0.99));
      flight = null;
    }
  }

  const HOME = { target: new THREE.Vector3(-120, 10, -330), yaw: 0.55, pitch: 0.60, dist: 2500 };

  // ---------------------------------------------------------------- 输入
  let drag = null;
  let lastHover = 0;

  function ndc(event) {
    const rect = canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  const raycaster = new THREE.Raycaster();

  function pickables() {
    const list = [];
    buildings.forEach((b) => list.push(b.mesh));
    lamps.forEach((lamp) => {
      if (lamp.group.userData.node) {
        lamp.group.traverse((child) => {
          if (child.isMesh && child.userData.pick) list.push(child);
        });
      }
    });
    markers.forEach((m) => list.push(m.gem));
    return list;
  }
  const pickList = pickables();

  function raycastAt(event) {
    raycaster.setFromCamera(ndc(event), activeCam);
    return raycaster.intersectObjects(pickList, false);
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.button !== 2) return;
    canvas.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY, button: event.button, moved: 0 };
  }

  function onPointerMove(event) {
    if (!drag) {
      const now = performance.now();
      if (now - lastHover > 90) {
        lastHover = now;
        const hit = raycastAt(event)[0];
        canvas.style.cursor = hit ? 'pointer' : 'grab';
      }
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (event.buttons === 0) { drag = null; return; }
    if (mode === 'ortho') {
      pan(dx, dy);
    } else if (drag.button === 2 || event.shiftKey) {
      pan(dx, dy);
    } else {
      orbit.yaw -= dx * 0.005;
      orbit.pitch = clamp(orbit.pitch + dy * 0.004, 0.05, 1.45);
      updatePersp();
    }
  }

  function pan(dx, dy) {
    const scale = (mode === 'ortho' ? orthoState.zoom * 3.6 : orbit.dist * 0.0011);
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const cam = activeCam;
    right.setFromMatrixColumn(cam.matrixWorld, 0);
    up.setFromMatrixColumn(cam.matrixWorld, 1);
    if (mode === 'ortho') {
      orbit.target.addScaledVector(right, -dx * scale);
      orbit.target.addScaledVector(up, dy * scale);
      updateOrtho();
    } else {
      const ground = new THREE.Vector3(-Math.sin(orbit.yaw), 0, -Math.cos(orbit.yaw));
      orbit.target.addScaledVector(right, -dx * scale);
      orbit.target.addScaledVector(ground, dy * scale * 1.4);
      orbit.target.y = Math.max(0, orbit.target.y);
      updatePersp();
    }
  }

  function onPointerUp(event) {
    if (!drag) return;
    const wasClick = drag.moved < 6 && drag.button === 0;
    drag = null;
    if (!wasClick) return;
    const hit = raycastAt(event)[0];
    if (!hit) return;
    const pick = hit.object.userData.pick;
    if (!pick) return;
    if (pick.type === 'building') openBuilding(pick.id);
    else if (pick.type === 'node') openNode(pick.id);
  }

  function onWheel(event) {
    event.preventDefault();
    const factor = Math.exp(event.deltaY * 0.0012);
    if (mode === 'ortho') {
      orthoState.zoom = clamp(orthoState.zoom * factor, 0.34, 2.6);
      updateOrtho();
    } else {
      orbit.dist = clamp(orbit.dist * factor, 260, 9500);
      updatePersp();
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    persp.aspect = window.innerWidth / window.innerHeight;
    persp.updateProjectionMatrix();
    if (mode === 'ortho') updateOrtho();
  });

  // ---------------------------------------------------------------- UI
  const panel = $('panel');
  const panelBody = $('panel-body');

  function openPanel(html) {
    panelBody.innerHTML = html;
    panel.classList.remove('hidden');
  }
  function closePanel() {
    panel.classList.add('hidden');
  }
  $('panel-close').addEventListener('click', closePanel);

  function nodeById(id) {
    return CITY.nodes[id];
  }

  function openNode(id) {
    const node = nodeById(id);
    if (!node) return;
    if (id === 'OBJ-01') openTower(node);
    else if (id === 'OBJ-02') openLamp(node);
    else if (id === 'OBJ-03') openWater(node);
    else openGenericNode(node);
  }

  function openBuilding(id) {
    const b = CITY.buildings.find((x) => x.id === id);
    if (!b) return;
    if (id === 'B-01') { openTower(nodeById('OBJ-01')); return; }
    openPanel(
      '<h2>' + b.name + '</h2>' +
      '<div class="sub">' + b.id + ' · ' + b.zone + ' 区 · ' + b.type + '</div>' +
      '<dl class="kv">' +
      '<dt>尺寸</dt><dd>' + b.sx + ' × ' + b.sy + ' m</dd>' +
      '<dt>高度</dt><dd>' + b.h + ' m / ' + b.floors + ' 层</dd>' +
      '<dt>基底</dt><dd>EL ' + b.baseEL.toFixed(1) + '</dd>' +
      '<dt>说明</dt><dd>' + b.notes + '</dd>' +
      '</dl>'
    );
  }

  function openTower(node) {
    openPanel(
      '<h2>科创大楼</h2><div class="sub">B-01 · A 科创园区 · 78 m / 18F</div>' +
      '<div class="tabs">' +
      '<button data-tab="intro" class="active">简介</button>' +
      '<button data-tab="floors">楼层</button>' +
      '<button data-tab="energy">能耗</button>' +
      '</div><div id="tab-body"></div>'
    );
    const body = $('tab-body');
    const tabs = panelBody.querySelectorAll('.tabs button');
    const intro = '<p class="note">园区地标，78 m / 18 层。裙房 12 m 做展厅与会议；塔楼 6–16 层为研发办公，17 层设备层，18 层观景层。<br><br>点击楼体即弹本面板；时间、天气、灯光、汛期等全局控制在顶栏。</p>';
    const floors = '<div class="floors">' + [
      ['18F', '观景层 · 城市展厅'], ['17F', '设备层 / 屋顶花园'], ['12–16F', '研发办公 · 实验室'],
      ['7–11F', '研发办公'], ['6F', '会议中心'], ['2–5F', '共享实验室 · 孵化器'], ['1F', '大堂 · 展厅'],
      ['B1', '车库 · 设备机房'],
    ].map((row) => '<div><span>' + row[0] + '</span><b>' + row[1] + '</b></div>').join('') + '</div>';
    const energy = '<div class="bars">' + [
      ['空调用电', 46], ['照明插座', 22], ['实验设备', 18], ['电梯水泵', 9], ['其他', 5],
    ].map((row) => '<div class="bar"><span>' + row[0] + '</span><i style="width:' + row[1] + '%"></i><span>' + row[1] + '%</span></div>').join('') +
      '</div><p class="note" style="margin-top:10px">今日 42.7 MWh · 屋顶光伏 18% · 较昨日 −3.2%<br>数据为演示占位，接入能耗平台后替换。</p>';
    const render = (tab) => {
      body.innerHTML = tab === 'intro' ? intro : tab === 'floors' ? floors : energy;
      tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    };
    tabs.forEach((t) => t.addEventListener('click', () => render(t.dataset.tab)));
    render('intro');
  }

  function openLamp(node) {
    const lamp = lamps.find((l) => l.group.userData.node === 'OBJ-02');
    openPanel(
      '<h2>路灯 · OBJ-02</h2><div class="sub">园区广场东侧 · 单灯控制</div>' +
      '<div class="row"><span>开关</span><button id="lamp-toggle" class="toggle ' + (lamp && lamp.on ? 'active' : '') + '">' + (lamp && lamp.on ? '开' : '关') + '</button></div>' +
      '<div class="row"><span>亮度</span><span id="lamp-val">' + Math.round((lamp ? lamp.brightness : 0.8) * 100) + '%</span></div>' +
      '<input id="lamp-range" type="range" min="0" max="100" value="' + Math.round((lamp ? lamp.brightness : 0.8) * 100) + '">' +
      '<p class="note">夜间（黄昏/雨夜/夜晚）路灯自动开启；点灯杆或灯泡也能选中。亮度只影响这一盏。</p>'
    );
    const toggle = $('lamp-toggle');
    const range = $('lamp-range');
    const val = $('lamp-val');
    toggle.addEventListener('click', () => {
      if (!lamp) return;
      lamp.on = !lamp.on;
      toggle.classList.toggle('active', lamp.on);
      toggle.textContent = lamp.on ? '开' : '关';
      lamp.head.material.emissiveIntensity = lamp.on ? 2 : 0;
      lamp.glow.material.opacity = lamp.on ? 0.7 : 0;
      lamp.pool.material.opacity = lamp.on ? 0.5 : 0;
    });
    range.addEventListener('input', () => {
      if (!lamp) return;
      lamp.brightness = Number(range.value) / 100;
      val.textContent = range.value + '%';
    });
  }

  function openWater(node) {
    openPanel(
      '<h2>亲水平台 · OBJ-03</h2><div class="sub">桥南岸 · 水位与流速控制</div>' +
      '<div class="row"><span>水位</span><span class="seg">' +
      '<button id="water-normal" class="' + (state.flood ? '' : 'active') + '">常态</button>' +
      '<button id="water-flood" class="' + (state.flood ? 'active' : '') + '">汛期</button></span></div>' +
      '<div class="row"><span>流速</span><span id="flow-val">' + waterState.targetFlow.toFixed(1) + ' m/s</span></div>' +
      '<input id="flow-range" type="range" min="8" max="25" value="' + Math.round(waterState.targetFlow * 10) + '">' +
      '<p class="note">常态水位 EL 0，汛期 +2.40 m。切换后水面、水色与流速同步变化，岸边警示灯转红。</p>'
    );
    $('water-normal').addEventListener('click', () => setFlood(false));
    $('water-flood').addEventListener('click', () => setFlood(true));
    const range = $('flow-range');
    range.addEventListener('input', () => {
      waterState.targetFlow = Number(range.value) / 10;
      $('flow-val').textContent = waterState.targetFlow.toFixed(1) + ' m/s';
    });
  }

  function openGenericNode(node) {
    openPanel(
      '<h2>' + node.name + '</h2><div class="sub">' + node.nodeId + ' · ' + node.category + '</div>' +
      '<dl class="kv"><dt>触发</dt><dd>' + node.trigger + '</dd>' +
      '<dt>反馈</dt><dd>' + node.feedback + '</dd>' +
      '<dt>状态</dt><dd>' + (node.enabled ? '启用' : '停用') + '</dd></dl>' +
      (node.params ? '<pre class="note" style="white-space:pre-wrap">' + JSON.stringify(node.params, null, 2) + '</pre>' : '')
    );
  }

  const toast = $('toast');
  let toastTimer = 0;
  function showToast(text, ms) {
    toast.textContent = text;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), ms || 4200);
  }

  function setFlood(on) {
    state.flood = on;
    waterState.target = on ? 2.44 : 0.04;
    waterState.targetSpread = on ? 2.7 : 1;
    waterState.targetFlow = on ? 2.5 : 0.8;
    waterState.targetColor.set(on ? '#6b6146' : '#24506b');
    $('flood-btn').classList.toggle('active', on);
    $('flood-btn').classList.toggle('flood', on);
    if (on) showToast('汛期模拟：水位 +2.40 m，滨河步道与亲水平台封闭');
    const normal = $('water-normal'), flood = $('water-flood');
    if (normal && flood) {
      normal.classList.toggle('active', !on);
      flood.classList.toggle('active', on);
    }
  }

  function setTime(name) {
    state.time = name;
    document.querySelectorAll('#time-group button').forEach((b) => b.classList.toggle('active', b.dataset.time === name));
    refreshEnv();
  }

  function setWeather(name) {
    state.weather = name;
    document.querySelectorAll('#weather-group button').forEach((b) => b.classList.toggle('active', b.dataset.weather === name));
    refreshEnv();
  }

  document.querySelectorAll('#time-group button').forEach((b) => b.addEventListener('click', () => setTime(b.dataset.time)));
  document.querySelectorAll('#weather-group button').forEach((b) => b.addEventListener('click', () => setWeather(b.dataset.weather)));

  $('traffic-btn').addEventListener('click', () => {
    state.traffic = !state.traffic;
    carMesh.visible = state.traffic;
    $('traffic-btn').classList.toggle('active', state.traffic);
  });

  $('flood-btn').addEventListener('click', () => setFlood(!state.flood));

  $('nightshow-btn').addEventListener('click', () => {
    state.nightShow = !state.nightShow;
    $('nightshow-btn').classList.toggle('active', state.nightShow);
    if (state.nightShow) {
      state.nightShowStart = performance.now();
      setTime('night');
      showToast('夜景模式：建筑内光与路灯依次点亮');
    } else {
      setTime('noon');
    }
  });

  $('reset-btn').addEventListener('click', () => {
    setMode('persp');
    orbit.target.copy(HOME.target);
    orbit.yaw = HOME.yaw;
    orbit.pitch = HOME.pitch;
    orbit.dist = HOME.dist;
    updatePersp();
  });

  const CAM_BUTTONS = {
    ortho: () => { setMode('ortho'); orbit.target.set(0, 0, 0); updateOrtho(); },
  };
  CITY.cameras.forEach((cam) => {
    if (cam.type === 'BoardOrtho' || cam.type === 'BoardPersp' || cam.type === 'JumpPersp') {
      CAM_BUTTONS[cam.id] = () => flyTo(cam);
    }
  });
  document.querySelectorAll('#cams button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.cam;
      if (key === 'ortho') setMode('ortho');
      else flyTo(CITY.cameras.find((c) => c.id === key));
      updateCamButtons(key);
    });
  });
  function updateCamButtons(activeKey) {
    document.querySelectorAll('#cams button').forEach((b) => {
      if (activeKey) b.classList.toggle('active', b.dataset.cam === activeKey);
    });
  }

  // ---------------------------------------------------------------- 循环
  const clock = new THREE.Clock();
  const carDummy = new THREE.Object3D();
  let elapsed = 0;
  let hideLoading = false;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    const now = performance.now();

    updateFlight(dt);
    if (mode === 'persp' && !flight) {
      // orbit 在交互时直接更新；这里不重复计算
    }

    updateEnvironment(dt, now);

    // 车流
    if (state.traffic) {
      cars.forEach((car, i) => {
        car.s += (car.speed * dt * car.dir) / car.roadLength;
        if (car.s > 1) car.s -= 1;
        if (car.s < 0) car.s += 1;
        const a = car.road.points[0], b = car.road.points[car.road.points.length - 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const t = car.dir > 0 ? car.s : 1 - car.s;
        const px = lerp(a.x, b.x, t), py = lerp(a.y, b.y, t);
        const nx = -dy / len, ny = dx / len;
        const x = px + nx * car.lane, y = py + ny * car.lane;
        const el = lerp(a.el, b.el, t);
        carDummy.position.set(x, el + 0.95, -y);
        const heading = new THREE.Vector3(dx / len * car.dir, 0, -dy / len * car.dir);
        carDummy.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), heading);
        carDummy.scale.set(4.6, 1.5, 1.95);
        carDummy.updateMatrix();
        carMesh.setMatrixAt(i, carDummy.matrix);
      });
      carMesh.instanceMatrix.needsUpdate = true;
    }

    // 雨
    if (rain.visible) {
      const pos = rain.geometry.attributes.position;
      for (let i = 0; i < RAIN_COUNT; i++) {
        pos.array[i * 3 + 1] -= dt * 160;
        if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] += 900;
      }
      pos.needsUpdate = true;
    }

    fillerMaterial.emissiveIntensity = envCur.windows * 1.7;

    // 分区标签：近景淡出，避免大牌子糊脸
    zoneLabels.forEach((sprite) => {
      const d = activeCam.position.distanceTo(sprite.position);
      sprite.material.opacity = clamp((d - 520) / 720, 0.03, 0.92);
    });

    // 锚点浮动
    markers.forEach((m) => {
      const bob = Math.sin(elapsed * 1.6 + m.group.userData.phase) * 3;
      m.gem.position.y = 22 + bob;
      m.gem.rotation.y += dt * 0.9;
    });

    renderer.render(scene, activeCam);

    if (!hideLoading) {
      hideLoading = true;
      $('loading').classList.add('done');
    }
    requestAnimationFrame(frame);
  }

  cars.forEach((car) => {
    const a = car.road.points[0], b = car.road.points[car.road.points.length - 1];
    car.roadLength = Math.hypot(b.x - a.x, b.y - a.y);
  });

  const params = new URLSearchParams(window.location.search);
  if (TIMES[params.get('time')]) setTime(params.get('time'));
  if (WEATHERS[params.get('weather')]) setWeather(params.get('weather'));
  if (params.get('flood') === '1') setFlood(true);
  if (params.get('open')) setTimeout(() => openNode(params.get('open')), 30);
  const viewParam = params.get('view');
  if (viewParam === 'ortho') {
    setMode('ortho');
  } else if (viewParam) {
    const cam = CITY.cameras.find((c) => c.id === viewParam);
    if (cam) {
      flyTo(cam);
      if (flight) flight.dur = 0.01;
    }
  }

  refreshEnv();
  if (params.has('time') || params.has('weather') || params.has('flood')) {
    envCur.sunI = envTgt.sunI; envCur.hemi = envTgt.hemi;
    envCur.fogNear = envTgt.fogNear; envCur.fogFar = envTgt.fogFar;
    envCur.exposure = envTgt.exposure; envCur.lamp = envTgt.lamp;
    envCur.windows = envTgt.windows; envCur.stars = envTgt.stars;
    envCur.sunEl = envTgt.sunEl; envCur.sunAz = envTgt.sunAz;
    envCur.skyTop.copy(envTgt.skyTop); envCur.horizon.copy(envTgt.horizon);
    envCur.sunColor.copy(envTgt.sunColor); envCur.fogColor.copy(envTgt.fogColor);
    envCur.ground.copy(envTgt.ground);
    waterState.level = waterState.target; waterState.spread = waterState.targetSpread;
    waterState.flow = waterState.targetFlow; waterState.color.copy(waterState.targetColor);
  }
  updatePersp();
  updateCamButtons(null);
  requestAnimationFrame(frame);
})();

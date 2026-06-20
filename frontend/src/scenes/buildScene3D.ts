import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import type { PlantaResponse, StatusAtivo } from '@sgm/shared';
import { COLORS_3D, STATUS_LABELS } from '../utils/colors';
import { getSectorStatus, seedHash } from '../utils/sectorStatus';
import type { Scene3DRef } from '../store/plantaStore';

type SelectCallback = (sectorId: string, machineId?: string | null) => void;
type TooltipCallback = (machine: { id: string; name: string; status: string; kpis: { oee: number }; opAtiva?: string | null }, sector: { name: string }) => void;
type HideTooltipCallback = () => void;

export function buildScene3D(
  container: HTMLDivElement,
  planta: PlantaResponse,
  onSelect: SelectCallback,
  onShowTooltip: TooltipCallback,
  onHideTooltip: HideTooltipCallback
): Scene3DRef & { dispose: () => void } {
  const getSize = () => ({
    w: Math.max(1, container.clientWidth),
    h: Math.max(1, container.clientHeight),
  });
  const { w, h } = getSize();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(w, h);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ color: 0xf3d3cc, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new THREE.GridHelper(220, 55, 0xdddddd, 0xeeeeee));

  [[0, 25, 180, 8], [0, -25, 180, 8], [-15, 0, 8, 100]].forEach(([x, z, ww, dd]) => {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(ww, 0.05, dd),
      new THREE.MeshStandardMaterial({ color: 0xe8e8e8 })
    );
    c.position.set(x, 0.03, z);
    scene.add(c);
  });

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dl = new THREE.DirectionalLight(0xffffff, 0.55);
  dl.position.set(50, 80, 50);
  dl.castShadow = true;
  scene.add(dl);

  const sectorMeshes: THREE.Mesh[] = [];
  const machineMeshes: THREE.Mesh[] = [];
  const sectorGroups: Record<string, THREE.Group> = {};
  const machineMeshMap: Record<string, THREE.Mesh> = {};
  let plantaData = planta;
  let userInteracting3D = false;
  let animationId = 0;
  let disposed = false;

  function buildMeshes(data: PlantaResponse) {
    Object.values(sectorGroups).forEach((g) => scene.remove(g));
    sectorMeshes.length = 0;
    machineMeshes.length = 0;
    Object.keys(sectorGroups).forEach((k) => delete sectorGroups[k]);
    Object.keys(machineMeshMap).forEach((k) => delete machineMeshMap[k]);

    data.setores.forEach((s) => {
      const l = s.layout3d;
      const st = getSectorStatus(s) as StatusAtivo;
      const group = new THREE.Group();
      group.position.set(l.x, 0, l.z);
      scene.add(group);
      sectorGroups[s.id] = group;

      const mat = new THREE.MeshStandardMaterial({
        color: COLORS_3D[st] || COLORS_3D.operando,
        transparent: true,
        opacity: 0.15,
        roughness: 1,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(l.w, l.h, l.d), mat);
      mesh.position.y = l.h / 2;
      mesh.userData = { type: 'sector', id: s.id, baseOpacity: 0.15 };
      group.add(mesh);
      sectorMeshes.push(mesh);

      const labelDiv = document.createElement('div');
      labelDiv.className = 'label-3d' + (st === 'alerta' ? ' alert-label' : '');
      labelDiv.textContent = `${s.name} · ${STATUS_LABELS[st]}`;
      const label = new CSS2DObject(labelDiv);
      label.position.set(0, l.h + 2, 0);
      group.add(label);

      const rows = Math.ceil(Math.sqrt(s.maquinas.length));
      const cols = Math.ceil(s.maquinas.length / rows);
      const sx = (l.w - 3) / cols;
      const sz = (l.d - 3) / rows;

      s.maquinas.forEach((m, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const col = COLORS_3D[m.status as StatusAtivo] || COLORS_3D.operando;
        const mMat = new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.3,
          metalness: 0.2,
          emissive: col,
          emissiveIntensity: m.status === 'alerta' ? 0.3 : 0.05,
        });
        const machine = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.65, 1.6, sz * 0.65), mMat);
        machine.position.set(-l.w / 2 + 1.5 + c * sx + sx / 2, l.h + 0.8, -l.d / 2 + 1.5 + r * sz + sz / 2);
        machine.castShadow = true;
        machine.userData = { type: 'machine', sectorId: s.id, machineId: m.id, status: m.status };
        group.add(machine);
        machineMeshes.push(machine);
        machineMeshMap[m.id] = machine;
      });
    });
  }

  buildMeshes(planta);

  camera.position.set(90, 75, 90);
  camera.lookAt(0, 0, 0);
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.maxPolarAngle = Math.PI / 2.2;
  orbitControls.addEventListener('start', () => {
    userInteracting3D = true;
  });
  orbitControls.addEventListener('end', () => {
    setTimeout(() => {
      userInteracting3D = false;
    }, 2000);
  });

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredObj: THREE.Object3D | null = null;
  let lastRaycast = 0;
  let selectedId: string | null = null;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  container.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([...machineMeshes, ...sectorMeshes]);
    if (!hits.length) return;
    const obj = hits[0].object;
    const d = obj.userData;
    focusCameraOn(obj);
    if (d.type === 'machine') onSelect(d.sectorId, d.machineId);
    else onSelect(d.id);
  });

  function focusCameraOn(obj: THREE.Object3D | string) {
    let target: THREE.Object3D;
    if (typeof obj === 'string') {
      const mesh = sectorMeshes.find((m) => m.userData.id === obj) ?? machineMeshMap[obj];
      if (!mesh) return;
      target = mesh;
    } else {
      target = obj;
    }
    const pos = new THREE.Vector3();
    target.getWorldPosition(pos);
    const dist = target.userData.type === 'machine' ? 18 : 35;
    gsap.to(camera.position, {
      x: pos.x + dist,
      y: pos.y + dist * 0.8,
      z: pos.z + dist,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(pos);
        orbitControls.target.copy(pos);
      },
    });
  }

  function resetView() {
    gsap.to(camera.position, {
      x: 90,
      y: 75,
      z: 90,
      duration: 1.2,
      onUpdate: () => {
        camera.lookAt(0, 0, 0);
        orbitControls.target.set(0, 0, 0);
      },
    });
  }

  function updateFromData() {
    plantaData.setores.forEach((s) => {
      const st = getSectorStatus(s) as StatusAtivo;
      const mesh = sectorMeshes.find((m) => m.userData.id === s.id);
      if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.setHex(COLORS_3D[st] || COLORS_3D.operando);
      }
      s.maquinas.forEach((m) => {
        const mm = machineMeshMap[m.id];
        if (mm && mm.material instanceof THREE.MeshStandardMaterial) {
          mm.material.color.setHex(COLORS_3D[m.status as StatusAtivo] || COLORS_3D.operando);
          mm.userData.status = m.status;
        }
      });
    });
  }

  function applyIsolation(selId: string | null) {
    selectedId = selId;
    plantaData.setores.forEach((s) => {
      const g = sectorGroups[s.id];
      if (!g) return;
      const dim = selId !== null && s.id !== selId;
      g.children.forEach((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.material) return;
        if (mesh.userData?.type === 'sector' && mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.opacity = dim ? 0.06 : mesh.userData.baseOpacity || 0.15;
        } else if (mesh.userData?.type === 'machine' && mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.opacity = dim ? 0.3 : mesh.userData.status === 'offline' ? 0.45 : 1;
        }
      });
    });
  }

  function applyStatusFilter(filter: StatusAtivo | 'todos', getStatus: (id: string) => StatusAtivo) {
    plantaData.setores.forEach((s) => {
      const st = getStatus(s.id);
      const match = filter === 'todos' || st === filter;
      const g = sectorGroups[s.id];
      if (g) g.visible = match;
    });
  }

  function animate(t: number) {
    if (disposed) return;
    animationId = requestAnimationFrame(animate);
    orbitControls.update();
    if (!selectedId && !userInteracting3D) scene.rotation.y += 0.00012;

    machineMeshes.forEach((mesh) => {
      const st = mesh.userData.status as string;
      if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
      if (st === 'operando') {
        mesh.material.emissiveIntensity = 0.05 + Math.sin(t * 0.003 + seedHash(mesh.userData.machineId)) * 0.04;
        mesh.material.opacity = 1;
      } else if (st === 'alerta') {
        mesh.material.emissiveIntensity = 0.2 + Math.sin(t * 0.008) * 0.25;
        mesh.material.opacity = 1;
      } else if (st === 'offline') {
        mesh.material.opacity = 0.45;
      } else {
        mesh.material.opacity = 1;
      }
    });

    if (t - lastRaycast > 50) {
      lastRaycast = t;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects([...machineMeshes, ...sectorMeshes]);
      if (hits.length) {
        const obj = hits[0].object;
        if (hoveredObj !== obj) {
          if (hoveredObj?.userData.type === 'sector') {
            const mat = (hoveredObj as THREE.Mesh).material;
            if (mat instanceof THREE.MeshStandardMaterial) {
              gsap.to(mat, { opacity: hoveredObj.userData.baseOpacity, duration: 0.2 });
            }
          }
          hoveredObj = obj;
          if (obj.userData.type === 'sector') {
            const mat = (obj as THREE.Mesh).material;
            if (mat instanceof THREE.MeshStandardMaterial) {
              gsap.to(mat, { opacity: 0.38, duration: 0.2 });
            }
          }
          container.style.cursor = 'pointer';
          if (obj.userData.type === 'machine') {
            const s = plantaData.setores.find((x) => x.id === obj.userData.sectorId);
            const m = s?.maquinas.find((x) => x.id === obj.userData.machineId);
            if (m && s) onShowTooltip(m, s);
          }
        }
      } else if (hoveredObj) {
        if (hoveredObj.userData.type === 'sector') {
          const mat = (hoveredObj as THREE.Mesh).material;
          if (mat instanceof THREE.MeshStandardMaterial) {
            gsap.to(mat, { opacity: hoveredObj.userData.baseOpacity, duration: 0.2 });
          }
        }
        hoveredObj = null;
        container.style.cursor = 'default';
        onHideTooltip();
      }
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  animate(0);

  const onResize = () => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    if (nw < 1 || nh < 1) return;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
    labelRenderer.setSize(nw, nh);
  };
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);
  window.addEventListener('resize', onResize);

  const controller: Scene3DRef & { dispose: () => void; setPlanta: (p: PlantaResponse) => void } = {
    focusCameraOn: (obj) => focusCameraOn(obj as THREE.Object3D | string),
    resetView,
    updateFromData,
    applyIsolation,
    applyStatusFilter,
    setPlanta: (p) => {
      plantaData = p;
      buildMeshes(p);
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      orbitControls.dispose();
      renderer.dispose();
      container.innerHTML = '';
    },
  };

  return controller;
}

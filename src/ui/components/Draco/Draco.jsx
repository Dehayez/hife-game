import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CLIP_NAMES = ['Walk', 'Jump', 'Attack', 'Heal', 'Fly'];
const LOOPING_CLIPS = new Set(['Walk', 'Fly']);
const ONE_SHOT_CLIPS = new Set(['Jump', 'Attack', 'Heal']);
const CROSSFADE_SECONDS = 0.3;
const DEFAULT_IDLE = 'Walk';

const Draco = React.forwardRef(function Draco(
  {
    modelUrl = '/assets/characters/herald/Draco.glb',
    showControlButtons = true,
    onReady,
    onClipStart,
    onClipFinish,
    className,
    style,
  },
  ref,
) {
  const containerRef = useRef(null);
  const apiRef = useRef({ playClip: () => {} });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let disposed = false;

    const scene = new THREE.Scene();

    const initialWidth = container.clientWidth || 1;
    const initialHeight = container.clientHeight || 1;

    const camera = new THREE.PerspectiveCamera(
      45,
      initialWidth / initialHeight,
      0.1,
      100,
    );
    camera.position.set(0, 1.4, -3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(initialWidth, initialHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(2.5, 4, -3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffe6cc, 0.35);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1, 0);
    controls.update();

    const clock = new THREE.Clock();

    let mixer = null;
    const actions = new Map();
    let currentActionName = null;
    let pendingIdleTimer = null;
    let onMixerFinished = null;
    let animationFrame = null;

    const clearPendingIdle = () => {
      if (pendingIdleTimer !== null) {
        clearTimeout(pendingIdleTimer);
        pendingIdleTimer = null;
      }
    };

    const crossfadeTo = (name) => {
      if (!actions.has(name)) return false;
      const next = actions.get(name);
      const prevName = currentActionName;
      const prev = prevName ? actions.get(prevName) : null;

      clearPendingIdle();

      next.reset();
      next.enabled = true;
      next.setEffectiveTimeScale(1);
      next.setEffectiveWeight(1);
      next.play();

      if (prev && prev !== next) {
        prev.crossFadeTo(next, CROSSFADE_SECONDS, false);
      }

      currentActionName = name;
      if (onClipStart) onClipStart(name);

      if (ONE_SHOT_CLIPS.has(name)) {
        const durationMs = Math.max(0, (next.getClip().duration - CROSSFADE_SECONDS) * 1000);
        pendingIdleTimer = setTimeout(() => {
          pendingIdleTimer = null;
          if (!disposed && currentActionName === name) {
            crossfadeTo(DEFAULT_IDLE);
          }
        }, durationMs);
      }

      return true;
    };

    const playClip = (name) => {
      if (!CLIP_NAMES.includes(name)) return false;
      return crossfadeTo(name);
    };

    apiRef.current = { playClip };

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;

        const model = gltf.scene;
        model.rotation.y = Math.PI;

        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        const groundOffset = size.y / 2;
        model.position.y += groundOffset;

        scene.add(model);

        const focusY = groundOffset;
        controls.target.set(0, focusY, 0);
        const fitDistance = Math.max(size.x, size.y, size.z) * 1.8;
        camera.position.set(0, focusY + size.y * 0.25, -fitDistance);
        controls.update();

        mixer = new THREE.AnimationMixer(model);

        gltf.animations.forEach((clip) => {
          if (!CLIP_NAMES.includes(clip.name)) return;
          const action = mixer.clipAction(clip);
          if (LOOPING_CLIPS.has(clip.name)) {
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = false;
          } else {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          actions.set(clip.name, action);
        });

        onMixerFinished = (event) => {
          const finishedName = [...actions.entries()].find(
            ([, action]) => action === event.action,
          )?.[0];
          if (finishedName && onClipFinish) onClipFinish(finishedName);
          if (
            finishedName &&
            ONE_SHOT_CLIPS.has(finishedName) &&
            currentActionName === finishedName
          ) {
            clearPendingIdle();
            crossfadeTo(DEFAULT_IDLE);
          }
        };
        mixer.addEventListener('finished', onMixerFinished);

        if (actions.has(DEFAULT_IDLE)) {
          const idle = actions.get(DEFAULT_IDLE);
          idle.play();
          currentActionName = DEFAULT_IDLE;
        }

        if (onReady) onReady({ playClip });
      },
      undefined,
      (error) => {
        console.error('Failed to load Draco model:', error);
      },
    );

    const handleResize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      clearPendingIdle();
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();

      if (mixer) {
        if (onMixerFinished) mixer.removeEventListener('finished', onMixerFinished);
        mixer.stopAllAction();
        mixer.uncacheRoot(mixer.getRoot());
      }
      actions.clear();

      controls.dispose();

      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      apiRef.current = { playClip: () => {} };
    };
  }, [modelUrl, onReady, onClipStart, onClipFinish]);

  const playClip = useCallback((name) => apiRef.current.playClip(name), []);

  useImperativeHandle(ref, () => ({ playClip }), [playClip]);

  return (
    <div
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
      {showControlButtons && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 8,
            padding: '6px 8px',
            background: 'rgba(0, 0, 0, 0.35)',
            borderRadius: 8,
            backdropFilter: 'blur(4px)',
          }}
        >
          {CLIP_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => playClip(name)}
              style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                font: '500 13px system-ui, sans-serif',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default Draco;

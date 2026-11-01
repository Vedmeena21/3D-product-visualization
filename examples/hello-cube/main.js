// The smallest scene: a cube that turns once every 6 seconds. render(t) is all there is.
import * as THREE from 'three';
import {runSim} from 'rig/video.js';

runSim({duration: 6, fps: 60}, async ({canvas, capture}) => {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true});
  renderer.setPixelRatio(capture ? devicePixelRatio : Math.min(devicePixelRatio, 2));
  renderer.setSize(1600, 900, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#efece3');
  const sun = new THREE.DirectionalLight('#ffffff', 3);
  sun.position.set(3, 5, 4);
  scene.add(sun, new THREE.AmbientLight('#ffffff', 0.7));

  const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({color: '#d97757', roughness: 0.4}));
  scene.add(cube);
  const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 50);
  camera.position.set(0, 1.5, 8);
  camera.lookAt(0, 0, 0);

  return {
    render(t) {
      cube.rotation.set(0.45, (t / 6) * Math.PI * 2, 0);
      renderer.render(scene, camera);
    },
  };
});

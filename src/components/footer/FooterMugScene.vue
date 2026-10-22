<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

gsap.registerPlugin(ScrollTrigger)

const containerRef = ref(null)
const canvasWrapperRef = ref(null)
const isLoading = ref(true)
const hasWebGLError = ref(false)

let renderer = null
let scene = null
let camera = null
let envTexture = null
let rafId = null
let resizeObserver = null
let intersectionObserver = null
let gsapCtx = null

let entranceGroup = null
let floatGroup = null
let tiltGroup = null
let spinGroup = null
let mainSpotLight = null
let spotTarget = null
let contactShadowMesh = null
let shadowReceiverPlane = null
let steamParticles = []

let isFooterVisible = false
let prefersReducedMotion = false
let lastFrameTime = 0

// Estado físico de mouse e inércia angular
const pointerNorm = { x: 0, y: 0 }
const smoothPointer = { x: 0, y: 0 }
const lastPointer = { x: 0, y: 0, initialized: false }
let angularBoostVelocity = 0
let isDraggingCanvas = false
let dragPrevX = 0

function createSoftRadialTexture(innerColor, outerColor) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2)
  grad.addColorStop(0, innerColor)
  grad.addColorStop(0.38, innerColor.replace(/[\d.]+\)$/, '0.42)'))
  grad.addColorStop(0.72, outerColor.replace(/[\d.]+\)$/, '0.12)'))
  grad.addColorStop(1, outerColor)

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function handleWindowPointerMove(e) {
  if (prefersReducedMotion) return
  const vw = window.innerWidth || 1
  const vh = window.innerHeight || 1

  const nx = (e.clientX / vw) * 2 - 1
  const ny = (e.clientY / vh) * 2 - 1

  if (lastPointer.initialized) {
    const dx = nx - lastPointer.x
    const dy = ny - lastPointer.y
    const speed = Math.hypot(dx, dy)
    // Impulso de velocidade angular proporcional à velocidade do mouse com sinal direcional
    const dir = dx >= 0 ? 1 : -1
    angularBoostVelocity = Math.max(
      -3.2,
      Math.min(3.2, angularBoostVelocity + dir * speed * 2.6),
    )
  }

  lastPointer.x = nx
  lastPointer.y = ny
  lastPointer.initialized = true

  pointerNorm.x = Math.max(-1, Math.min(1, nx))
  pointerNorm.y = Math.max(-1, Math.min(1, ny))
}

function handleWindowPointerLeave() {
  pointerNorm.x = 0
  pointerNorm.y = 0
  lastPointer.initialized = false
}

function handleCanvasPointerDown(e) {
  if (prefersReducedMotion) return
  isDraggingCanvas = true
  dragPrevX = e.clientX
}

function handleCanvasPointerMove(e) {
  if (!isDraggingCanvas || prefersReducedMotion) return
  const dx = e.clientX - dragPrevX
  dragPrevX = e.clientX
  angularBoostVelocity = Math.max(-4, Math.min(4, angularBoostVelocity + dx * 0.045))
}

function handleCanvasPointerUp() {
  isDraggingCanvas = false
}

function initMugScene() {
  const container = containerRef.value
  const canvasHost = canvasWrapperRef.value
  if (!container || !canvasHost) return

  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isMobile = window.innerWidth < 768

  const width = canvasHost.clientWidth || 320
  const height = canvasHost.clientHeight || 320

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
  } catch {
    hasWebGLError.value = true
    isLoading.value = false
    return
  }

  renderer.setClearColor(0x000000, 0)
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  canvasHost.appendChild(renderer.domElement)

  scene = new THREE.Scene()

  // Câmera com FOV 34 e elevação de ~20° para enquadrar o corpo e a abertura superior da caneca
  camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 30)
  camera.position.set(0, 1.48, 4.15)
  camera.lookAt(0, -0.08, 0)

  // Ambiente controlado para reflexos sutis no material da caneca
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader()
  const roomEnv = new RoomEnvironment()
  envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture
  scene.environment = envTexture
  scene.environmentIntensity = 0.3
  roomEnv.dispose()
  pmremGenerator.dispose()

  // Luz ambiente suave para não chapar o lado escuro
  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0b0f17, 0.28)
  scene.add(hemiLight)

  // SpotLight principal de palco (quente #ffe2b8) com sombra suave e alvo dinâmico
  mainSpotLight = new THREE.SpotLight(0xffe2b8, 46)
  mainSpotLight.position.set(1.6, 4.2, 2.8)
  mainSpotLight.angle = 0.44
  mainSpotLight.penumbra = 0.82
  mainSpotLight.decay = 1.65
  mainSpotLight.distance = 14
  mainSpotLight.castShadow = true
  const shadowSize = isMobile ? 1024 : 2048
  mainSpotLight.shadow.mapSize.width = shadowSize
  mainSpotLight.shadow.mapSize.height = shadowSize
  mainSpotLight.shadow.camera.near = 1.2
  mainSpotLight.shadow.camera.far = 10
  mainSpotLight.shadow.bias = -0.00035
  mainSpotLight.shadow.normalBias = 0.02
  mainSpotLight.shadow.radius = 9

  spotTarget = new THREE.Object3D()
  spotTarget.position.set(0, 0, 0)
  scene.add(spotTarget)
  mainSpotLight.target = spotTarget
  scene.add(mainSpotLight)

  // Rim light fria/azulada vinda de trás e da esquerda para destacar a silhueta
  const rimLight = new THREE.SpotLight(0x79b8ff, 18)
  rimLight.position.set(-2.9, 2.3, -2.5)
  rimLight.angle = 0.58
  rimLight.penumbra = 0.85
  rimLight.decay = 1.6
  rimLight.distance = 12
  rimLight.target = spotTarget
  scene.add(rimLight)

  // Fill light suave do lado oposto
  const fillLight = new THREE.DirectionalLight(0xf97583, 0.65)
  fillLight.position.set(-2.2, 0.8, 2.4)
  scene.add(fillLight)

  // Plano de chão receptor de sombra real + Contact Shadow difusa com blur gaussiano procedural
  const floorY = -0.92
  shadowReceiverPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.ShadowMaterial({ opacity: 0.38, color: 0x05070a }),
  )
  shadowReceiverPlane.rotation.x = -Math.PI / 2
  shadowReceiverPlane.position.y = floorY
  shadowReceiverPlane.receiveShadow = true
  scene.add(shadowReceiverPlane)

  const contactShadowTex = createSoftRadialTexture(
    'rgba(4, 6, 10, 0.68)',
    'rgba(4, 6, 10, 0)',
  )
  if (contactShadowTex) {
    contactShadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 2.35),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.62,
      }),
    )
    contactShadowMesh.rotation.x = -Math.PI / 2
    contactShadowMesh.position.y = floorY - 0.005
    scene.add(contactShadowMesh)
  }

  // Hierarquia de grupos para isolar entrada, flutuação/parallax, inclinação de mouse e giro contínuo
  entranceGroup = new THREE.Group()
  floatGroup = new THREE.Group()
  tiltGroup = new THREE.Group()
  spinGroup = new THREE.Group()
  const pivotGroup = new THREE.Group()

  entranceGroup.add(floatGroup)
  floatGroup.add(tiltGroup)
  tiltGroup.add(spinGroup)
  spinGroup.add(pivotGroup)
  scene.add(entranceGroup)

  // Partículas discretas de vapor subindo da abertura da caneca (apenas desktop e sem reduced motion)
  if (!isMobile && !prefersReducedMotion) {
    const steamTex = createSoftRadialTexture(
      'rgba(255, 255, 255, 0.22)',
      'rgba(255, 255, 255, 0)',
    )
    if (steamTex) {
      for (let i = 0; i < 5; i++) {
        const mat = new THREE.SpriteMaterial({
          map: steamTex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
        const sprite = new THREE.Sprite(mat)
        sprite.position.set((Math.random() - 0.5) * 0.25, 0.55 + i * 0.18, (Math.random() - 0.5) * 0.2)
        sprite.scale.setScalar(0.35 + i * 0.08)
        floatGroup.add(sprite)
        steamParticles.push({
          sprite,
          phase: i * 1.25,
          speed: 0.32 + Math.random() * 0.14,
          driftX: (Math.random() - 0.5) * 0.18,
        })
      }
    }
  }

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy?.() || 4
  const loader = new GLTFLoader()

  loader.load(
    '/coffee-mug.glb',
    (gltf) => {
      if (!scene) return
      const model = gltf.scene

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat) => {
            if (!mat) return
            if (mat.map) {
              mat.map.colorSpace = THREE.SRGBColorSpace
              mat.map.anisotropy = maxAnisotropy
              mat.map.needsUpdate = true
            }
            if (typeof mat.roughness === 'number') {
              mat.roughness = Math.min(0.82, Math.max(0.28, mat.roughness))
            }
            if (typeof mat.metalness === 'number') {
              mat.metalness = Math.min(0.35, mat.metalness)
            }
            mat.needsUpdate = true
          })
        }
      })

      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const targetScale = 1.72 / maxDim

      model.scale.setScalar(targetScale)
      model.position.set(
        -center.x * targetScale,
        -center.y * targetScale,
        -center.z * targetScale,
      )

      pivotGroup.add(model)
      isLoading.value = false
      setupEntranceAnimation()
      // Renderiza um frame inicial imediato caso esteja em reduced-motion
      renderer?.render(scene, camera)
    },
    undefined,
    (err) => {
      console.error('Erro ao carregar /coffee-mug.glb:', err)
      hasWebGLError.value = true
      isLoading.value = false
    },
  )

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (!renderer || !camera) continue
      const { width: w, height: h } = entry.contentRect
      if (w <= 0 || h <= 0) continue
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      renderer.render(scene, camera)
    }
  })
  resizeObserver.observe(canvasHost)

  // Pausa o loop de renderização quando o footer está fora da viewport
  intersectionObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      isFooterVisible = Boolean(entry?.isIntersecting)
      if (isFooterVisible && !rafId) {
        lastFrameTime = performance.now()
        rafId = requestAnimationFrame(tick)
      }
    },
    { threshold: 0.02 },
  )
  intersectionObserver.observe(container.closest('footer') || container)

  window.addEventListener('pointermove', handleWindowPointerMove, { passive: true })
  window.addEventListener('pointerleave', handleWindowPointerLeave, { passive: true })
}

function setupEntranceAnimation() {
  const container = containerRef.value
  const canvasHost = canvasWrapperRef.value
  if (!container || !canvasHost || !entranceGroup) return

  gsapCtx = gsap.context(() => {
    if (prefersReducedMotion) {
      entranceGroup.scale.setScalar(1)
      entranceGroup.rotation.y = 0.45
      gsap.set(canvasHost, { opacity: 1 })
      return
    }

    entranceGroup.scale.setScalar(0.6)
    entranceGroup.rotation.y = -Math.PI
    gsap.set(canvasHost, { opacity: 0 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container.closest('footer') || container,
        start: 'top 74%',
        toggleActions: 'play none none reverse',
      },
    })

    tl.to(
      canvasHost,
      {
        opacity: 1,
        duration: 0.85,
        ease: 'power2.out',
      },
      0,
    )
      .to(
        entranceGroup.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.25,
          ease: 'back.out(1.4)',
        },
        0,
      )
      .to(
        entranceGroup.rotation,
        {
          y: 0,
          duration: 1.35,
          ease: 'expo.out',
        },
        0,
      )
  }, container)
}

function tick(now) {
  if (!isFooterVisible || !renderer || !scene || !camera) {
    rafId = null
    return
  }

  rafId = requestAnimationFrame(tick)

  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000))
  lastFrameTime = now

  if (!prefersReducedMotion && spinGroup && tiltGroup && floatGroup) {
    // Suavização exponencial do cursor (damping ~0.075 por frame a 60fps)
    const lerpFactor = 1 - Math.pow(1 - 0.075, dt * 60)
    smoothPointer.x += (pointerNorm.x - smoothPointer.x) * lerpFactor
    smoothPointer.y += (pointerNorm.y - smoothPointer.y) * lerpFactor

    // Decaimento exponencial do impulso angular de movimento rápido do mouse
    angularBoostVelocity *= Math.pow(0.92, dt * 60)

    // Giro contínuo (~0.32 rad/s) + impulso de velocidade do mouse
    const baseSpinSpeed = 0.32
    spinGroup.rotation.y += (baseSpinSpeed + angularBoostVelocity) * dt

    // Caneca "olha" para o cursor: inclinação X (máx ±0.35 rad) e virada Y (máx ±0.8 rad)
    tiltGroup.rotation.x = smoothPointer.y * 0.35
    tiltGroup.rotation.y = smoothPointer.x * 0.8

    // Flutuação senoidal no eixo Y (amplitude 0.05, frequência 0.8Hz) + parallax X/Y (máx ±0.14)
    const elapsedSec = now * 0.001
    const floatOffsetY = Math.sin(elapsedSec * Math.PI * 2 * 0.8) * 0.05
    floatGroup.position.x = smoothPointer.x * 0.14
    floatGroup.position.y = floatOffsetY - smoothPointer.y * 0.1

    // Sombra acompanha deslocamento horizontal e varia opacidade/escala conforme a altura da flutuação
    if (contactShadowMesh) {
      contactShadowMesh.position.x = floatGroup.position.x * 0.85
      contactShadowMesh.position.z = tiltGroup.rotation.x * 0.25
      const heightRatio = (floatOffsetY + 0.05) / 0.1 // 0 (baixo) a 1 (alto)
      const shadowScale = 1 + heightRatio * 0.14
      contactShadowMesh.scale.set(shadowScale, shadowScale, 1)
      contactShadowMesh.material.opacity = 0.66 - heightRatio * 0.16
    }

    // Spotlight persegue suavemente o cursor e aumenta intensidade quando próximo à caneca
    if (mainSpotLight && spotTarget) {
      mainSpotLight.position.x = 1.6 + smoothPointer.x * 0.95
      mainSpotLight.position.y = 4.2 - smoothPointer.y * 0.45
      spotTarget.position.x = smoothPointer.x * 0.35
      spotTarget.position.y = -smoothPointer.y * 0.22

      // Distância aproximada do cursor ao canto superior direito (x: ~0.65, y: ~-0.55)
      const distToMug = Math.hypot(smoothPointer.x - 0.65, smoothPointer.y + 0.55)
      const proximityBoost = Math.max(0, 1 - distToMug / 1.4) * 14
      mainSpotLight.intensity = 46 + proximityBoost
    }

    // Animação discreta das partículas de vapor
    for (const item of steamParticles) {
      const cycle = ((elapsedSec * item.speed + item.phase) % 1 + 1) % 1
      item.sprite.position.y = 0.52 + cycle * 0.85
      item.sprite.position.x = Math.sin(elapsedSec * 1.4 + item.phase) * 0.08 + item.driftX * cycle
      const scale = 0.28 + cycle * 0.42
      item.sprite.scale.set(scale, scale, 1)
      item.sprite.material.opacity = Math.sin(cycle * Math.PI) * 0.14
    }
  }

  renderer.render(scene, camera)
}

function disposeScene() {
  window.removeEventListener('pointermove', handleWindowPointerMove)
  window.removeEventListener('pointerleave', handleWindowPointerLeave)

  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  intersectionObserver?.disconnect()
  intersectionObserver = null
  gsapCtx?.revert()
  gsapCtx = null

  if (envTexture) {
    envTexture.dispose()
    envTexture = null
  }

  if (scene) {
    scene.traverse((obj) => {
      if (obj.isMesh || obj.isSprite) {
        obj.geometry?.dispose()
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((mat) => {
          if (!mat) return
          Object.values(mat).forEach((val) => {
            if (val && typeof val.dispose === 'function') {
              val.dispose()
            }
          })
          mat.dispose?.()
        })
      }
    })
    scene = null
  }

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss?.()
    renderer.domElement?.remove()
    renderer = null
  }

  camera = null
  entranceGroup = null
  floatGroup = null
  tiltGroup = null
  spinGroup = null
  mainSpotLight = null
  spotTarget = null
  contactShadowMesh = null
  shadowReceiverPlane = null
  steamParticles = []
}

onMounted(() => {
  initMugScene()
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<template>
  <div
    ref="containerRef"
    class="footer-mug-stage select-none"
    aria-hidden="true"
  >
    <!-- Glow volumétrico sutil de palco atrás da caneca 3D -->
    <div class="mug-spotlight-glow pointer-events-none"></div>

    <!-- Skeleton discreto de carregamento -->
    <div
      v-if="isLoading && !hasWebGLError"
      class="mug-loading-skeleton pointer-events-none flex items-center justify-center"
    >
      <span class="mug-loading-ring"></span>
    </div>

    <!-- Host do Canvas WebGL isolado -->
    <div
      v-show="!hasWebGLError"
      ref="canvasWrapperRef"
      class="mug-canvas-host cursor-grab active:cursor-grabbing"
      @pointerdown="handleCanvasPointerDown"
      @pointermove="handleCanvasPointerMove"
      @pointerup="handleCanvasPointerUp"
      @pointercancel="handleCanvasPointerUp"
    ></div>
  </div>
</template>

<style scoped>
.footer-mug-stage {
  position: relative;
  z-index: 10;
  width: clamp(230px, 28vw, 490px);
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mug-spotlight-glow {
  position: absolute;
  inset: 6%;
  border-radius: 9999px;
  background: radial-gradient(
    circle at 52% 38%,
    rgba(255, 226, 184, 0.16) 0%,
    rgba(121, 184, 255, 0.08) 42%,
    rgba(0, 0, 0, 0) 72%
  );
  filter: blur(18px);
}

.mug-canvas-host {
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
}

.mug-loading-skeleton {
  position: absolute;
  inset: 0;
}

.mug-loading-ring {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  border: 2px solid var(--secondary-border);
  border-top-color: var(--token-support);
  animation: mug-spin 0.9s linear infinite;
}

@keyframes mug-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1023px) {
  .footer-mug-stage {
    width: clamp(195px, 27vw, 310px);
  }
}

@media (max-width: 767px) {
  .footer-mug-stage {
    width: clamp(175px, 48vw, 235px);
    margin: -0.25rem auto 0.25rem;
  }
}
</style>

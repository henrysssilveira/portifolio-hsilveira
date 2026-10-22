<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'

const githubBtnRef = ref(null)
const linkedinBtnRef = ref(null)

let prefersReducedMotion = false
const quickSetters = new Map()

function setupMagneticButton(el) {
  if (!el || prefersReducedMotion) return
  const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' })
  const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' })
  quickSetters.set(el, { xTo, yTo })
}

function handlePointerMove(e, el) {
  if (prefersReducedMotion || !el) return
  const setters = quickSetters.get(el)
  if (!setters) return
  const rect = el.getBoundingClientRect()
  const dx = e.clientX - (rect.left + rect.width / 2)
  const dy = e.clientY - (rect.top + rect.height / 2)
  setters.xTo(dx * 0.22)
  setters.yTo(dy * 0.28)
}

function handlePointerLeave(el) {
  if (prefersReducedMotion || !el) return
  const setters = quickSetters.get(el)
  if (!setters) return
  setters.xTo(0)
  setters.yTo(0)
}

onMounted(() => {
  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setupMagneticButton(githubBtnRef.value)
  setupMagneticButton(linkedinBtnRef.value)
})

onBeforeUnmount(() => {
  quickSetters.clear()
})
</script>

<template>
  <nav
    aria-label="Redes sociais de Henrique Silveira"
    class="social-links-nav flex flex-wrap items-center justify-center gap-3 sm:gap-4"
  >
    <a
      ref="githubBtnRef"
      href="https://github.com/henrysssilveira"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir GitHub de Henrique Silveira em nova aba"
      class="social-pill-btn group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-5 py-2.5"
      @pointermove="(e) => handlePointerMove(e, githubBtnRef)"
      @pointerleave="() => handlePointerLeave(githubBtnRef)"
    >
      <span class="social-pill-fill" aria-hidden="true"></span>
      <svg
        class="social-pill-icon relative z-10 h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.92.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.05 11.05 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
        />
      </svg>
      <span class="social-pill-label relative z-10">GitHub</span>
      <svg
        class="social-pill-arrow relative z-10 h-3.5 w-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
    </a>

    <a
      ref="linkedinBtnRef"
      href="https://www.linkedin.com/in/henryssilveira/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir LinkedIn de Henrique Silveira em nova aba"
      class="social-pill-btn group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-5 py-2.5"
      @pointermove="(e) => handlePointerMove(e, linkedinBtnRef)"
      @pointerleave="() => handlePointerLeave(linkedinBtnRef)"
    >
      <span class="social-pill-fill" aria-hidden="true"></span>
      <svg
        class="social-pill-icon relative z-10 h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z"
        />
      </svg>
      <span class="social-pill-label relative z-10">LinkedIn</span>
      <svg
        class="social-pill-arrow relative z-10 h-3.5 w-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
    </a>
  </nav>
</template>

<style scoped>
.social-pill-btn {
  background-color: var(--secondary-bg);
  border: 1px solid var(--secondary-border);
  color: var(--editor-fg);
  font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif;
  font-weight: 800;
  font-size: clamp(0.76rem, 0.9vw, 0.86rem);
  letter-spacing: -0.02em;
  transition:
    border-color 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease;
  will-change: transform;
}

.social-pill-btn:focus-visible {
  outline: 2px solid var(--token-support);
  outline-offset: 3px;
}

.social-pill-fill {
  position: absolute;
  inset: 0;
  background-color: var(--token-support);
  transform: translateY(102%);
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
}

.social-pill-icon,
.social-pill-arrow {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.social-pill-btn:hover {
  border-color: var(--token-support);
  color: #0d1117;
  box-shadow: 0 10px 26px rgba(121, 184, 255, 0.22);
}

.social-pill-btn:hover .social-pill-fill {
  transform: translateY(0%);
}

.social-pill-btn:hover .social-pill-icon {
  transform: rotate(-8deg) scale(1.08);
}

.social-pill-btn:hover .social-pill-arrow {
  transform: translate(2px, -2px);
}

@media (prefers-reduced-motion: reduce) {
  .social-pill-fill,
  .social-pill-icon,
  .social-pill-arrow {
    transition: none;
  }
}
</style>

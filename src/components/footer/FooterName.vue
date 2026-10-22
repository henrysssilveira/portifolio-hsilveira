<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const nameRootRef = ref(null)
const charRefs = ref([])

const nameLines = [
  { id: 'first', text: 'Henrique', chars: 'Henrique'.split('') },
  { id: 'last', text: 'Silveira', chars: 'Silveira'.split('') },
]

function setCharRef(el, key) {
  if (el) {
    charRefs.value[key] = el
  }
}

let gsapCtx = null

onMounted(() => {
  const rootEl = nameRootRef.value
  if (!rootEl) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const chars = charRefs.value.filter(Boolean)

  gsapCtx = gsap.context(() => {
    if (prefersReducedMotion) {
      gsap.set(chars, { yPercent: 0, opacity: 1 })
      return
    }

    gsap.set(chars, {
      yPercent: 110,
      rotateZ: 2.5,
    })

    gsap.to(chars, {
      yPercent: 0,
      rotateZ: 0,
      duration: 1.1,
      stagger: 0.045,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: rootEl.closest('footer') || rootEl,
        start: 'top 70%',
        toggleActions: 'play none none reverse',
      },
    })
  }, rootEl)
})

onBeforeUnmount(() => {
  gsapCtx?.revert()
})
</script>

<template>
  <div ref="nameRootRef" class="footer-name-wrapper select-none">
    <h2 class="sr-only">Henrique Silveira</h2>
    <div aria-hidden="true" class="footer-name-display">
      <div
        v-for="(line, lineIdx) in nameLines"
        :key="line.id"
        class="footer-name-line"
      >
        <span
          v-for="(char, charIdx) in line.chars"
          :key="`${line.id}-${charIdx}`"
          class="footer-char-mask"
        >
          <span
            :ref="(el) => setCharRef(el, lineIdx * 10 + charIdx)"
            class="footer-char-inner"
          >{{ char }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.footer-name-wrapper {
  position: relative;
  z-index: 20;
  padding: clamp(0.35rem, 0.9vw, 0.85rem) 0 0 clamp(0.45rem, 1vw, 1rem);
  pointer-events: auto;
  max-width: 62vw;
}

.footer-name-display {
  font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif;
  font-weight: 800;
  font-size: clamp(2.65rem, 7.6vw, 9.2rem);
  line-height: 0.85;
  letter-spacing: -0.055em;
  color: var(--editor-fg);
  margin-left: -0.05em;
  margin-top: -0.04em;
}

.footer-name-line {
  display: flex;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.footer-char-mask {
  display: inline-block;
  overflow: hidden;
  padding-bottom: 0.08em;
  margin-bottom: -0.08em;
}

.footer-char-inner {
  display: inline-block;
  will-change: transform, color;
  transition:
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.28s ease;
}

@media (hover: hover) and (pointer: fine) {
  .footer-char-mask:hover .footer-char-inner {
    transform: translateY(-0.05em) skewX(-5deg);
    color: var(--token-support);
  }
}

@media (max-width: 1023px) {
  .footer-name-wrapper {
    max-width: 60vw;
  }

  .footer-name-display {
    font-size: clamp(2.65rem, 9.2vw, 6.2rem);
  }
}

@media (max-width: 767px) {
  .footer-name-wrapper {
    max-width: 100%;
    padding: 0.5rem 0 0 0;
  }

  .footer-name-display {
    font-size: clamp(2.6rem, 13.5vw, 4.4rem);
    line-height: 0.86;
  }
}
</style>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SocialLinks from './SocialLinks.vue'

gsap.registerPlugin(ScrollTrigger)

const contactRootRef = ref(null)
const titleWordRefs = ref([])
const staggerItemRefs = ref([])

const nameInputRef = ref(null)
const emailInputRef = ref(null)
const subjectInputRef = ref(null)
const messageInputRef = ref(null)
const submitBtnRef = ref(null)
const submitBtnTextRef = ref(null)

const titleText = 'Entre em contato para colocar sua ideia no papel'
const titleWords = titleText.split(' ')

function setTitleWordRef(el, idx) {
  if (el) titleWordRefs.value[idx] = el
}

function setStaggerItemRef(el, idx) {
  if (el) staggerItemRefs.value[idx] = el
}

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
  honeypot: '',
})

const touched = reactive({
  name: false,
  email: false,
  subject: false,
  message: false,
})

const errors = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

// 'idle' | 'loading' | 'success' | 'error'
const submitState = ref('idle')
const feedbackMessage = ref('')
const cooldownRemaining = ref(0)

let cooldownTimer = null
let gsapCtx = null
let btnQuickX = null
let btnQuickY = null
let btnTextQuickX = null
let btnTextQuickY = null
let prefersReducedMotion = false

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateField(field) {
  const val = form[field]?.trim() || ''

  if (field === 'name') {
    if (!val) {
      errors.name = 'Informe seu nome para continuarmos.'
    } else if (val.length < 2) {
      errors.name = 'O nome deve ter pelo menos 2 caracteres.'
    } else if (val.length > 100) {
      errors.name = 'O nome deve ter no máximo 100 caracteres.'
    } else {
      errors.name = ''
    }
  } else if (field === 'email') {
    if (!val) {
      errors.email = 'Informe seu e-mail de contato.'
    } else if (!EMAIL_REGEX.test(val) || val.length > 254) {
      errors.email = 'Digite um endereço de e-mail válido.'
    } else {
      errors.email = ''
    }
  } else if (field === 'subject') {
    if (val.length > 150) {
      errors.subject = 'O assunto deve ter no máximo 150 caracteres.'
    } else {
      errors.subject = ''
    }
  } else if (field === 'message') {
    if (!val) {
      errors.message = 'Conte um pouco sobre sua ideia ou projeto.'
    } else if (val.length < 10) {
      errors.message = 'A mensagem deve ter pelo menos 10 caracteres.'
    } else if (val.length > 2000) {
      errors.message = 'A mensagem não pode ultrapassar 2000 caracteres.'
    } else {
      errors.message = ''
    }
  }

  return !errors[field]
}

function handleBlur(field) {
  touched[field] = true
  validateField(field)
}

function handleInput(field) {
  if (touched[field]) {
    validateField(field)
  }
  if (submitState.value === 'error') {
    submitState.value = 'idle'
    feedbackMessage.value = ''
  }
}

function validateAllAndFocusFirst() {
  const fields = ['name', 'email', 'subject', 'message']
  let firstInvalid = null

  for (const f of fields) {
    touched[f] = true
    const ok = validateField(f)
    if (!ok && !firstInvalid) {
      firstInvalid = f
    }
  }

  if (firstInvalid) {
    const refMap = {
      name: nameInputRef,
      email: emailInputRef,
      subject: subjectInputRef,
      message: messageInputRef,
    }
    refMap[firstInvalid]?.value?.focus()
    return false
  }
  return true
}

function startCooldown(seconds = 30) {
  cooldownRemaining.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    if (cooldownRemaining.value > 1) {
      cooldownRemaining.value -= 1
    } else {
      cooldownRemaining.value = 0
      clearInterval(cooldownTimer)
      cooldownTimer = null
      if (submitState.value === 'success') {
        submitState.value = 'idle'
      }
    }
  }, 1000)
}

const isSubmitDisabled = computed(() => {
  return submitState.value === 'loading' || cooldownRemaining.value > 0
})

const buttonLabel = computed(() => {
  if (submitState.value === 'loading') return 'Enviando...'
  if (submitState.value === 'success') return 'Mensagem enviada ✓'
  if (submitState.value === 'error') return 'Não foi possível enviar. Tente novamente.'
  if (cooldownRemaining.value > 0) return `Aguarde ${cooldownRemaining.value}s`
  return 'Enviar mensagem'
})

async function handleSubmit() {
  if (isSubmitDisabled.value) return

  feedbackMessage.value = ''
  const isValid = validateAllAndFocusFirst()
  if (!isValid) return

  // Honeypot preenchido: simula sucesso silenciosamente sem chamar o servidor
  if (form.honeypot && form.honeypot.trim().length > 0) {
    submitState.value = 'success'
    feedbackMessage.value = 'Recebemos sua mensagem! Em breve entrarei em contato.'
    form.name = ''
    form.email = ''
    form.subject = ''
    form.message = ''
    form.honeypot = ''
    startCooldown(30)
    return
  }

  submitState.value = 'loading'
  const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT || '/contact'
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        honeypot: form.honeypot,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (response.ok && data?.ok !== false) {
      submitState.value = 'success'
      feedbackMessage.value =
        data?.message || 'Mensagem enviada com sucesso! Retornarei em breve.'
      form.name = ''
      form.email = ''
      form.subject = ''
      form.message = ''
      touched.name = false
      touched.email = false
      touched.subject = false
      touched.message = false
      startCooldown(30)
      return
    }

    submitState.value = 'error'
    if (response.status === 400) {
      feedbackMessage.value =
        data?.error || 'Verifique os campos preenchidos e tente novamente.'
    } else if (response.status === 413) {
      feedbackMessage.value = 'Sua mensagem excede o limite permitido de tamanho.'
    } else if (response.status === 429) {
      feedbackMessage.value =
        data?.error || 'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.'
    } else {
      feedbackMessage.value =
        data?.error || 'Não foi possível enviar no momento. Tente novamente em instantes.'
    }
  } catch (err) {
    clearTimeout(timeoutId)
    submitState.value = 'error'
    if (err?.name === 'AbortError') {
      feedbackMessage.value = 'O envio demorou mais que o esperado. Verifique sua conexão e tente novamente.'
    } else {
      feedbackMessage.value =
        'Erro de conexão com o servidor de contato. Tente novamente ou chame pelo LinkedIn.'
    }
  }
}

function handleBtnPointerMove(e) {
  if (prefersReducedMotion || isSubmitDisabled.value || !submitBtnRef.value) return
  const rect = submitBtnRef.value.getBoundingClientRect()
  const dx = e.clientX - (rect.left + rect.width / 2)
  const dy = e.clientY - (rect.top + rect.height / 2)
  btnQuickX?.(dx * 0.2)
  btnQuickY?.(dy * 0.28)
  btnTextQuickX?.(dx * 0.1)
  btnTextQuickY?.(dy * 0.14)
}

function handleBtnPointerLeave() {
  if (prefersReducedMotion) return
  btnQuickX?.(0)
  btnQuickY?.(0)
  btnTextQuickX?.(0)
  btnTextQuickY?.(0)
}

onMounted(() => {
  const rootEl = contactRootRef.value
  if (!rootEl) return

  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!prefersReducedMotion && submitBtnRef.value && submitBtnTextRef.value) {
    btnQuickX = gsap.quickTo(submitBtnRef.value, 'x', { duration: 0.45, ease: 'power3.out' })
    btnQuickY = gsap.quickTo(submitBtnRef.value, 'y', { duration: 0.45, ease: 'power3.out' })
    btnTextQuickX = gsap.quickTo(submitBtnTextRef.value, 'x', {
      duration: 0.45,
      ease: 'power3.out',
    })
    btnTextQuickY = gsap.quickTo(submitBtnTextRef.value, 'y', {
      duration: 0.45,
      ease: 'power3.out',
    })
  }

  gsapCtx = gsap.context(() => {
    const words = titleWordRefs.value.filter(Boolean)
    const items = staggerItemRefs.value.filter(Boolean)

    if (prefersReducedMotion) {
      gsap.set(words, { yPercent: 0, opacity: 1 })
      gsap.set(items, { y: 0, opacity: 1 })
      return
    }

    gsap.set(words, { yPercent: 105, opacity: 0 })
    gsap.set(items, { y: 28, opacity: 0 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: rootEl.closest('footer') || rootEl,
        start: 'top 68%',
        toggleActions: 'play none none reverse',
      },
    })

    tl.to(
      words,
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.85,
        stagger: 0.04,
        ease: 'power4.out',
      },
      0.1,
    ).to(
      items,
      {
        y: 0,
        opacity: 1,
        duration: 0.75,
        stagger: 0.08,
        ease: 'power3.out',
      },
      0.32,
    )
  }, rootEl)
})

onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
  gsapCtx?.revert()
})
</script>

<template>
  <div ref="contactRootRef" class="contact-block-wrapper relative z-30 mx-auto w-full">
    <div class="contact-header text-center">
      <span
        :ref="(el) => setStaggerItemRef(el, 0)"
        class="code-typography contact-kicker inline-block uppercase tracking-widest"
      >
        // contato &amp; novos projetos
      </span>

      <h2 class="contact-title hero-typography mt-1.5">
        <span
          v-for="(word, wIdx) in titleWords"
          :key="wIdx"
          class="contact-word-mask"
        >
          <span
            :ref="(el) => setTitleWordRef(el, wIdx)"
            class="contact-word-inner"
          >{{ word }}</span>
        </span>
      </h2>

      <p
        :ref="(el) => setStaggerItemRef(el, 1)"
        class="contact-subtitle mx-auto mt-1.5 max-w-xl"
      >
        Me conta o que você tem em mente e vamos transformar em projeto.
      </p>
    </div>

    <form
      novalidate
      class="contact-form mt-3.5 sm:mt-4"
      @submit.prevent="handleSubmit"
    >
      <!-- Honeypot invisível para proteção contra bots -->
      <div class="honeypot-field" aria-hidden="true">
        <label for="contact-company-website">Website</label>
        <input
          id="contact-company-website"
          v-model="form.honeypot"
          type="text"
          name="company_website"
          tabindex="-1"
          autocomplete="off"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        <!-- Campo: Nome -->
        <div
          :ref="(el) => setStaggerItemRef(el, 2)"
          class="field-group"
        >
          <label for="contact-name" class="field-label">
            Nome <span class="field-required" aria-hidden="true">*</span>
          </label>
          <div class="field-input-wrap">
            <input
              id="contact-name"
              ref="nameInputRef"
              v-model="form.name"
              type="text"
              name="name"
              required
              minlength="2"
              maxlength="100"
              autocomplete="name"
              placeholder="Como posso te chamar?"
              class="field-input"
              :aria-invalid="Boolean(errors.name)"
              :aria-describedby="errors.name ? 'error-contact-name' : undefined"
              @blur="handleBlur('name')"
              @input="handleInput('name')"
            />
            <span class="field-focus-line" aria-hidden="true"></span>
          </div>
          <p
            v-if="errors.name"
            id="error-contact-name"
            role="alert"
            class="field-error-msg"
          >
            {{ errors.name }}
          </p>
        </div>

        <!-- Campo: E-mail -->
        <div
          :ref="(el) => setStaggerItemRef(el, 3)"
          class="field-group"
        >
          <label for="contact-email" class="field-label">
            E-mail <span class="field-required" aria-hidden="true">*</span>
          </label>
          <div class="field-input-wrap">
            <input
              id="contact-email"
              ref="emailInputRef"
              v-model="form.email"
              type="email"
              name="email"
              required
              maxlength="254"
              autocomplete="email"
              placeholder="seu@email.com"
              class="field-input"
              :aria-invalid="Boolean(errors.email)"
              :aria-describedby="errors.email ? 'error-contact-email' : undefined"
              @blur="handleBlur('email')"
              @input="handleInput('email')"
            />
            <span class="field-focus-line" aria-hidden="true"></span>
          </div>
          <p
            v-if="errors.email"
            id="error-contact-email"
            role="alert"
            class="field-error-msg"
          >
            {{ errors.email }}
          </p>
        </div>
      </div>

      <!-- Campo: Assunto (opcional) -->
      <div
        :ref="(el) => setStaggerItemRef(el, 4)"
        class="field-group mt-3 sm:mt-3.5"
      >
        <div class="flex items-baseline justify-between">
          <label for="contact-subject" class="field-label">Assunto</label>
          <span class="field-optional">opcional</span>
        </div>
        <div class="field-input-wrap">
          <input
            id="contact-subject"
            ref="subjectInputRef"
            v-model="form.subject"
            type="text"
            name="subject"
            maxlength="150"
            placeholder="Ex.: Automação n8n, Desenvolvimento Web, Consultoria..."
            class="field-input"
            :aria-invalid="Boolean(errors.subject)"
            :aria-describedby="errors.subject ? 'error-contact-subject' : undefined"
            @blur="handleBlur('subject')"
            @input="handleInput('subject')"
          />
          <span class="field-focus-line" aria-hidden="true"></span>
        </div>
        <p
          v-if="errors.subject"
          id="error-contact-subject"
          role="alert"
          class="field-error-msg"
        >
          {{ errors.subject }}
        </p>
      </div>

      <!-- Campo: Mensagem -->
      <div
        :ref="(el) => setStaggerItemRef(el, 5)"
        class="field-group mt-3 sm:mt-3.5"
      >
        <div class="flex items-baseline justify-between">
          <label for="contact-message" class="field-label">
            Mensagem <span class="field-required" aria-hidden="true">*</span>
          </label>
          <span
            class="field-char-counter code-typography"
            :class="{ 'field-counter-warn': form.message.length > 1850 }"
            aria-live="polite"
          >
            {{ form.message.length }} / 2000
          </span>
        </div>
        <div class="field-input-wrap">
          <textarea
            id="contact-message"
            ref="messageInputRef"
            v-model="form.message"
            name="message"
            rows="2"
            required
            minlength="10"
            maxlength="2000"
            placeholder="Descreva seu objetivo, prazo ou desafio atual..."
            class="field-input field-textarea"
            :aria-invalid="Boolean(errors.message)"
            :aria-describedby="errors.message ? 'error-contact-message' : undefined"
            @blur="handleBlur('message')"
            @input="handleInput('message')"
          ></textarea>
          <span class="field-focus-line" aria-hidden="true"></span>
        </div>
        <p
          v-if="errors.message"
          id="error-contact-message"
          role="alert"
          class="field-error-msg"
        >
          {{ errors.message }}
        </p>
      </div>

      <!-- Ações e Feedback de Envio -->
      <div
        :ref="(el) => setStaggerItemRef(el, 6)"
        class="mt-3.5 flex flex-col items-center gap-1.5 sm:mt-4"
      >
        <button
          ref="submitBtnRef"
          type="submit"
          :disabled="isSubmitDisabled"
          class="submit-btn group relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full px-7 py-3 disabled:cursor-not-allowed disabled:opacity-65"
          :class="[
            submitState === 'success' ? 'submit-btn-success' : '',
            submitState === 'error' ? 'submit-btn-error' : '',
          ]"
          @pointermove="handleBtnPointerMove"
          @pointerleave="handleBtnPointerLeave"
        >
          <span class="submit-btn-bg" aria-hidden="true"></span>
          <span
            ref="submitBtnTextRef"
            class="submit-btn-content relative z-10 inline-flex items-center gap-2.5"
          >
            <svg
              v-if="submitState === 'loading'"
              class="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                stroke-width="2.5"
                class="opacity-25"
              />
              <path
                fill="currentColor"
                d="M12 3a9 9 0 0 1 9 9h-2.5a6.5 6.5 0 0 0-6.5-6.5V3Z"
              />
            </svg>
            <span>{{ buttonLabel }}</span>
          </span>
        </button>

        <!-- Mensagem de confirmação ou erro global -->
        <div
          aria-live="polite"
          role="status"
          class="min-h-[1rem] text-center"
        >
          <p
            v-if="feedbackMessage"
            class="feedback-banner"
            :class="submitState === 'success' ? 'feedback-success' : 'feedback-error'"
          >
            {{ feedbackMessage }}
          </p>
        </div>
      </div>
    </form>

    <!-- Botões de Redes Sociais (GitHub e LinkedIn) -->
    <div
      :ref="(el) => setStaggerItemRef(el, 7)"
      class="mt-1.5 pt-1 sm:mt-2"
    >
      <SocialLinks />
    </div>
  </div>
</template>

<style scoped>
.contact-block-wrapper {
  max-width: clamp(320px, 88vw, 690px);
}

.contact-kicker {
  color: var(--token-keyword);
  font-size: clamp(0.64rem, 0.78vw, 0.74rem);
}

.contact-title {
  font-size: clamp(1.45rem, 2.75vw, 2.55rem);
  line-height: 1.06;
  letter-spacing: -0.04em;
  color: var(--editor-fg);
}

.contact-word-mask {
  display: inline-block;
  overflow: hidden;
  padding-bottom: 0.08em;
  margin-bottom: -0.08em;
  margin-right: 0.26em;
}

.contact-word-mask:last-child {
  margin-right: 0;
}

.contact-word-inner {
  display: inline-block;
  will-change: transform, opacity;
}

.contact-subtitle {
  color: var(--token-plain);
  opacity: 0.82;
  font-size: clamp(0.8rem, 0.98vw, 0.96rem);
  line-height: 1.45;
}

.honeypot-field {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.field-group {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.field-label {
  font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif;
  font-weight: 800;
  font-size: clamp(0.72rem, 0.85vw, 0.82rem);
  letter-spacing: -0.02em;
  color: var(--editor-fg);
}

.field-required {
  color: var(--token-keyword);
}

.field-optional,
.field-char-counter {
  font-size: 0.68rem;
  color: var(--token-comment);
}

.field-counter-warn {
  color: var(--token-keyword);
}

.field-input-wrap {
  position: relative;
  margin-top: 0.2rem;
}

.field-input {
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1.5px solid var(--secondary-border);
  padding: 0.48rem 0.1rem 0.52rem;
  color: var(--editor-fg);
  font-size: clamp(0.82rem, 0.95vw, 0.94rem);
  line-height: 1.4;
  transition: border-color 0.25s ease;
}

.field-input::placeholder {
  color: var(--token-comment);
  opacity: 0.72;
}

.field-input:focus {
  outline: none;
}

.field-textarea {
  resize: vertical;
  min-height: 3.1rem;
  max-height: 7rem;
}

.field-focus-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background-color: var(--token-support);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.field-input:focus + .field-focus-line {
  transform: scaleX(1);
}

.field-input[aria-invalid='true'] {
  border-bottom-color: var(--token-keyword);
}

.field-input[aria-invalid='true'] + .field-focus-line {
  background-color: var(--token-keyword);
}

.field-error-msg {
  margin-top: 0.28rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--token-keyword);
}

.submit-btn {
  background-color: var(--editor-fg);
  color: var(--editor-bg);
  border: 1.5px solid var(--editor-fg);
  font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif;
  font-weight: 800;
  font-size: clamp(0.8rem, 0.94vw, 0.92rem);
  letter-spacing: -0.02em;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease;
  will-change: transform;
}

.submit-btn:focus-visible {
  outline: 2px solid var(--token-support);
  outline-offset: 3px;
}

.submit-btn-bg {
  position: absolute;
  inset: 0;
  background-color: var(--token-support);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.submit-btn:hover:not(:disabled) {
  border-color: var(--token-support);
  color: #0d1117;
  box-shadow: 0 12px 30px rgba(121, 184, 255, 0.28);
}

.submit-btn:hover:not(:disabled) .submit-btn-bg {
  transform: scaleX(1);
}

.submit-btn-success {
  background-color: var(--token-tag);
  border-color: var(--token-tag);
  color: #0d1117;
}

.submit-btn-error {
  border-color: var(--token-keyword);
}

.feedback-banner {
  font-size: 0.78rem;
  font-weight: 700;
}

.feedback-success {
  color: var(--token-tag);
}

.feedback-error {
  color: var(--token-keyword);
}

@media (prefers-reduced-motion: reduce) {
  .field-focus-line,
  .submit-btn-bg {
    transition: none;
  }
}
</style>

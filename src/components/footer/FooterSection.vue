<script setup>
import FooterSignature from './FooterSignature.vue'
import FooterName from './FooterName.vue'
import FooterMugScene from './FooterMugScene.vue'
import ContactForm from './ContactForm.vue'
</script>

<template>
  <footer
    aria-label="Rodapé e formulário de contato"
    class="portfolio-footer relative w-full overflow-hidden"
  >
    <!-- Camada 0 (mais baixa, z-0): Rubrica artística em SVG no canto inferior esquerdo (≥ 60% da área) -->
    <FooterSignature />

    <!-- Estrutura principal das Camadas 1, 2 e 3 -->
    <div class="footer-layout-grid relative flex min-h-[100svh] w-full flex-col justify-between">
      <!-- Topo: Camada 2 (Nome gigante no canto superior esquerdo) + Camada 1 (Caneca 3D no canto superior direito) -->
      <div class="footer-top-zone relative flex w-full flex-col md:flex-row md:items-start md:justify-between">
        <FooterName />
        <div class="footer-mug-anchor">
          <FooterMugScene />
        </div>
      </div>

      <!-- Centro/Base: Camada 3 (Bloco de contato centralizado + Botões de redes sociais) -->
      <div class="footer-contact-zone relative z-30 flex w-full flex-1 items-center justify-center px-4 pb-2 pt-1 sm:px-6 sm:pb-3 md:px-10 lg:px-14">
        <ContactForm />
      </div>
    </div>
  </footer>
</template>

<style scoped>
.portfolio-footer {
  --footer-pad-x: clamp(0.45rem, 1.1vw, 1.15rem);
  --footer-pad-y: clamp(0.25rem, 0.7vw, 0.75rem);
  min-height: 100vh;
  min-height: 100svh;
  background-color: var(--secondary-bg);
  border-top: 2px solid var(--secondary-border);
  box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.45);
  color: var(--editor-fg);
}

.footer-top-zone {
  width: 100%;
  pointer-events: none;
}

.footer-top-zone > * {
  pointer-events: auto;
}

.footer-mug-anchor {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: center;
  width: 100%;
}

@media (min-width: 768px) {
  .portfolio-footer {
    height: 100vh;
    height: 100svh;
  }

  .footer-layout-grid {
    height: 100%;
    min-height: 100%;
  }

  .footer-mug-anchor {
    position: absolute;
    top: clamp(0.1rem, 0.4vw, 0.45rem);
    right: clamp(0.4rem, 1.5vw, 2rem);
    width: auto;
  }

  .footer-contact-zone {
    margin-top: clamp(-1.25rem, -1.5vh, 0rem);
    padding-bottom: clamp(0.35rem, 0.8vh, 0.85rem);
  }
}

@media (min-width: 1280px) {
  .footer-contact-zone {
    margin-top: clamp(-2.5rem, -3vh, -0.5rem);
    padding-bottom: clamp(0.35rem, 0.7vh, 0.75rem);
  }
}
</style>

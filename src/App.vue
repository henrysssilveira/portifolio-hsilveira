<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Marked } from 'marked'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import '@n8n_io/n8n-demo-component'
import n8nWorkflowData from './data/n8n-workflow.json'
import FooterSection from './components/footer/FooterSection.vue'

gsap.registerPlugin(ScrollTrigger)

const isDark = ref(true) // Tema escuro (GitHub Dark) por padrão

const heroSection = ref(null)
const codeScreen = ref(null)
const heroMessageWrapper = ref(null)
const fallingWordsStage = ref(null)
const wordRefs = ref([])
const risingDivider = ref(null)
const notebookStageWrapper = ref(null)
const threeCanvasContainer = ref(null)
const nextRisingDivider = ref(null)

// Refs e dados da seção n8n & Automação (@n8n_io/n8n-demo-component em modo read-only)
const n8nWorkflowWrapper = ref(null)
const n8nBenefitsWrapper = ref(null)
const n8nBenefitRefs = ref([])
const n8nWorkflowJson = JSON.stringify(n8nWorkflowData)

// Refs da seção Case de Sucesso & Conversa WhatsApp
const caseSectionDivider = ref(null)
const chatTrackRef = ref(null)
const chatMsgRefs = ref([])

// Refs da seção Rahamim Acamps (Desenvolvimento do site do evento)
const rahamimSectionDivider = ref(null)
const rahamimShowcaseRef = ref(null)
const rahamimViewportRef = ref(null)
const rahamimScreenshotRef = ref(null)

const n8nBenefits = [
  {
    num: '01.',
    title: 'Reduzo custos sem limites de execução',
    description:
      'Elimino taxas abusivas por cliques ou tarefas com uma infraestrutura própria e sem travas no orçamento.',
  },
  {
    num: '02.',
    title: 'Conecto qualquer ferramenta do seu negócio',
    description:
      'Integro CRMs, ERPs, APIs e WhatsApp sem depender de limitações de plataformas engessadas.',
  },
  {
    num: '03.',
    title: 'Garanto a segurança e o controle dos seus dados',
    description:
      'Tudo roda no seu próprio ambiente, mantendo total privacidade e conformidade técnica.',
  },
  {
    num: '04.',
    title: 'Escalo sua operação sem erros manuais',
    description:
      'Crio fluxos estáveis que tiram o trabalho repetitivo das costas do seu time e agilizam a rotina.',
  },
]

// Sequência exata de mensagens do Case de Sucesso (conversa em grupo de 3 participantes: Usuário, Bot e Especialista)
const whatsappMessages = [
  {
    sender: 'Usuário',
    role: 'user',
    isOutgoing: true,
    isFirstInGroup: true,
    text: '#open#',
    time: '09:14',
    tickStatus: 'read', // 'sent' (1 cinza) | 'delivered' (2 cinzas) | 'read' (2 azuis)
  },
  {
    sender: 'Bot',
    role: 'bot',
    isOutgoing: false,
    isFirstInGroup: true,
    text: 'Seu chamado foi aberto com sucesso, o número dele é: 5673910',
    time: '09:14',
  },
  {
    sender: 'Usuário',
    role: 'user',
    isOutgoing: true,
    isFirstInGroup: true,
    text: 'Estamos com problemas em conexão com a internet, poderiam validar?',
    time: '09:15',
    tickStatus: 'read',
  },
  {
    sender: 'Especialista',
    role: 'specialist',
    isOutgoing: false,
    isFirstInGroup: true,
    text: 'Foi solucionado o problema, estávamos sem as autorizações de política.',
    time: '09:28',
  },
  {
    sender: 'Especialista',
    role: 'specialist',
    isOutgoing: false,
    isFirstInGroup: false,
    text: '#Close#',
    time: '09:29',
  },
  {
    sender: 'Bot',
    role: 'bot',
    isOutgoing: false,
    isFirstInGroup: true,
    text: 'O chamado 5673910 foi realizado com sucesso e adicionado à solução.',
    time: '09:29',
  },
]

// =========================================================
// Renderizador de Markdown real (Marked) alinhado à identidade visual e tipográfica do portfólio
// =========================================================
const portfolioMarkdown = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    heading(token) {
      const fullTitleHtml = this.parser.parseInline(token.tokens)
      if (token.depth === 1) {
        return `<h1 class="md-rendered-h1">${fullTitleHtml}</h1>`
      }
      if (token.depth === 2) {
        const stepMatch = token.text.match(/^(\d{2}\.)\s+/)
        if (stepMatch) {
          const numText = stepMatch[1]
          const restTitleHtml = fullTitleHtml.replace(/^\d{2}\.\s+/, '')
          return `<h2 class="md-rendered-step-h2"><span class="md-rendered-step-num">${numText}</span><span class="md-rendered-step-title">${restTitleHtml}</span></h2>`
        }
        return `<h2 class="md-rendered-h2">${fullTitleHtml}</h2>`
      }
      return `<h${token.depth} class="md-rendered-h${token.depth}">${fullTitleHtml}</h${token.depth}>`
    },
    paragraph(token) {
      const innerHtml = this.parser.parseInline(token.tokens)
      const isLeadStrong =
        Array.isArray(token.tokens) &&
        token.tokens.length === 1 &&
        token.tokens[0].type === 'strong'
      if (isLeadStrong) {
        return `<p class="md-rendered-p md-rendered-lead-strong">${innerHtml}</p>`
      }
      return `<p class="md-rendered-p">${innerHtml}</p>`
    },
    strong(token) {
      const innerHtml = this.parser.parseInline(token.tokens)
      return `<strong class="md-rendered-strong">${innerHtml}</strong>`
    },
    codespan(token) {
      return `<code class="md-rendered-code">${token.text}</code>`
    },
  },
})

function renderPortfolioMarkdown(stagesOrText) {
  const rawSource = Array.isArray(stagesOrText) ? stagesOrText.join('') : String(stagesOrText)
  return portfolioMarkdown.parse(rawSource.trim())
}

// Conteúdo em Markdown da coluna esquerda da seção de integração com WhatsApp (seguindo o padrão de etapas do portfólio)
const caseStudyMarkdownRaw = [
  `## Case de Sucesso`,
  `\n\n**Sistema de Registro de chamados via integração com Whatsapp**`,
  `\n\nIdentifiquei que a equipe não abria chamados porque o processo tradicional era burocrático e lento. Problemas urgentes se perdiam em conversas soltas, deixando a operação sem controle.`,
  `\n\nPara resolver isso, levei o suporte direto para o WhatsApp. Desenvolvi um fluxo onde qualquer pessoa abre um ticket apenas digitando **\`#open#\`** e já envia fotos, vídeos ou documentos. O especialista atende, registra a resposta e encerra com **\`#close#\`**.`,
  `\n\nNos bastidores, integrei n8n, Evolution API e PostgreSQL com o sistema de chamados, além de aplicar inteligência artificial para resumir cada problema e solução. O resultado foi simples e direto: eliminamos as mensagens perdidas e assumimos o controle total dos atendimentos.`,
]

const renderedCaseStudyHtml = renderPortfolioMarkdown(caseStudyMarkdownRaw)

// Conteúdo em Markdown da seção Rahamim Acamps (Desenvolvimento do site do evento)
const rahamimMarkdownRaw = [
  `# Rahamim Acamps`,
  `\n\n## Um sistema próprio para gerenciar a experiência do evento\n\nDesenvolvi um site para simplificar a operação do evento, conectando a experiência de inscrição aos processos de pagamento e controle de participantes.`,
  `\n\n## 01. Desenvolvimento\n\nConstruído com **HTML, CSS, JavaScript e Tailwind CSS**, priorizando uma interface leve, responsiva e fácil de utilizar.`,
  `\n\n## 02. Prazo\n\nDo planejamento à entrega final, o projeto foi desenvolvido em **apenas 7 dias**, exigindo foco nas funcionalidades essenciais e decisões rápidas de implementação.`,
  `\n\n## 03. Integrações\n\nIntegração com **Google Sheets, Mercado Pago e Gmail** para conectar os dados das inscrições, os pagamentos e as comunicações relacionadas ao evento.`,
  `\n\n## 04. Funcionalidades\n\nAlém do site principal, o projeto contou com telas de **checkout e check-in** de participantes, apoiando etapas importantes da jornada do evento.`,
  `\n\n## 05. Por que desenvolver uma solução própria?\n\nPrecisávamos de um sistema leve, simples de usar e **sob nosso controle**, evitando taxas elevadas e mantendo maior autonomia sobre a operação.`,
]

const renderedRahamimHtml = renderPortfolioMarkdown(rahamimMarkdownRaw)

function handleRahamimImageLoad() {
  ScrollTrigger.refresh()
}

const TARGET_PHRASE = 'Uma nova ideia\nestá pronta para vir...'
const CIPHER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>[]{}/\\~+=?'

const displayedText = ref('')

// Palavras da segunda parte organizadas em linhas editoriais para preencher toda a área visível
const fallingWordRows = [
  [
    { index: 0, text: 'e' },
    { index: 1, text: 'por' },
    { index: 2, text: 'onde' },
  ],
  [
    { index: 3, text: 'seu' },
    { index: 4, text: 'projeto' },
  ],
  [{ index: 5, text: 'começa?' }],
]

function setWordRef(el, idx) {
  if (el) {
    wordRefs.value[idx] = el
  }
}

function setN8nBenefitRef(el, idx) {
  if (el) {
    n8nBenefitRefs.value[idx] = el
  }
}

function setChatMsgRef(el, idx) {
  if (el) {
    chatMsgRefs.value[idx] = el
  }
}

// =========================================================
// Conteúdo de código Markdown das 3 etapas (digitado caractere por caractere no scroll)
// =========================================================
const markdownStageRaw = [
  `# Planejamento`,
  `\n\n## 01. Entendo o problema\n\nMergulho na rotina e nas dores da sua operação antes de propor qualquer linha de código.`,
  `\n\n## 02. Traço o caminho\n\nApresento a arquitetura ideal unindo front-end fluido, visual moderno e automações eficientes.`,
  `\n\n## 03. Coloco para rodar\n\nEntrego uma solução pronta, rápida e funcional, sem atalhos ou retrabalho.`,
]

const fullMarkdownSource = markdownStageRaw.join('')
const stage1EndLen = markdownStageRaw[0].length
const stage2EndLen = stage1EndLen + markdownStageRaw[1].length
const stage3EndLen = fullMarkdownSource.length

const mdTypedChars = ref(0)

// Divide o código Markdown já digitado em linhas com destaque de sintaxe (#, ##, -, parágrafos)
const renderedMarkdownLines = computed(() => {
  const count = Math.floor(mdTypedChars.value)
  if (count <= 0) return []

  const slicedText = fullMarkdownSource.slice(0, count)
  const rawLines = slicedText.split('\n')

  return rawLines.map((lineText, idx) => {
    const isLastLine = idx === rawLines.length - 1
    let tokens

    if (lineText.startsWith('##')) {
      const match = lineText.match(/^(##\s?)(.*)$/)
      tokens = [
        { type: 'md-hash', text: match ? match[1] : '##' },
        { type: 'md-h2', text: match ? match[2] : lineText.slice(2) },
      ]
    } else if (lineText.startsWith('#')) {
      const match = lineText.match(/^(#\s?)(.*)$/)
      tokens = [
        { type: 'md-hash', text: match ? match[1] : '#' },
        { type: 'md-h1', text: match ? match[2] : lineText.slice(1) },
      ]
    } else if (lineText.startsWith('-')) {
      const match = lineText.match(/^(-\s?)(.*)$/)
      tokens = [
        { type: 'md-bullet', text: match ? match[1] : '-' },
        { type: 'md-list-text', text: match ? match[2] : lineText.slice(1) },
      ]
    } else {
      tokens = [{ type: 'md-p', text: lineText }]
    }

    return {
      idx,
      tokens,
      isLastLine,
    }
  })
})

// Uma única tela de código extensa preenchendo a página inteira com bastante conteúdo sendo escrito
const codeSnippets = [
  {
    indent: 0,
    tokens: [
      { type: 'keyword', text: 'import' },
      { type: 'plain', text: ' { ' },
      { type: 'entity', text: 'createFuture' },
      { type: 'plain', text: ', ' },
      { type: 'entity', text: 'deployVision' },
      { type: 'plain', text: ', ' },
      { type: 'entity', text: 'compileKernel' },
      { type: 'plain', text: ' } ' },
      { type: 'keyword', text: 'from' },
      { type: 'string', text: " '@hsilveira/core'" },
    ],
  },
  {
    indent: 0,
    tokens: [
      { type: 'keyword', text: 'import' },
      { type: 'plain', text: ' { ' },
      { type: 'entity', text: 'NeuralEngine' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'runtimeConfig' },
      { type: 'plain', text: ', ' },
      { type: 'entity', text: 'StreamPipeline' },
      { type: 'plain', text: ' } ' },
      { type: 'keyword', text: 'from' },
      { type: 'string', text: " '@hsilveira/automation'" },
    ],
  },
  {
    indent: 0,
    tokens: [
      { type: 'keyword', text: 'import' },
      { type: 'plain', text: ' { ' },
      { type: 'entity', text: 'createCluster' },
      { type: 'plain', text: ', ' },
      { type: 'entity', text: 'syncDistributedState' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: ' telemetryBus' },
      { type: 'plain', text: ' } ' },
      { type: 'keyword', text: 'from' },
      { type: 'string', text: " '@hsilveira/distributed'" },
    ],
  },
  { indent: 0, tokens: [] },
  {
    indent: 0,
    tokens: [
      {
        type: 'comment',
        text: '// Inicializando arquitetura de soluções digitais, automação de ponta a ponta e engenharia criativa em tempo real',
      },
    ],
  },
  {
    indent: 0,
    tokens: [
      { type: 'keyword', text: 'export async function' },
      { type: 'entity', text: ' bootstrapIdea' },
      { type: 'plain', text: '(' },
      { type: 'keyword', text: 'context' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'options' },
      { type: 'plain', text: ' = { ' },
      { type: 'support', text: 'seamlessLoop' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: 'true' },
      { type: 'plain', text: ' }) {' },
    ],
  },
  {
    indent: 1,
    tokens: [
      { type: 'keyword', text: 'const' },
      { type: 'plain', text: ' engine = ' },
      { type: 'keyword', text: 'new' },
      { type: 'entity', text: ' NeuralEngine' },
      { type: 'plain', text: '({ ' },
      { type: 'support', text: 'architect' },
      { type: 'plain', text: ': ' },
      { type: 'string', text: "'Henrique Silveira'" },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'precision' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: '0.9998' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'mode' },
      { type: 'plain', text: ': ' },
      { type: 'string', text: "'realtime-synthesis'" },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'threads' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: '32' },
      { type: 'plain', text: ' })' },
    ],
  },
  {
    indent: 1,
    tokens: [
      { type: 'keyword', text: 'const' },
      { type: 'plain', text: ' cluster = ' },
      { type: 'entity', text: 'createCluster' },
      { type: 'plain', text: '({ ' },
      { type: 'support', text: 'region' },
      { type: 'plain', text: ': ' },
      { type: 'string', text: "'sa-east-1'" },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'nodes' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: '128' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'autoScale' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: 'true' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'protocol' },
      { type: 'plain', text: ': ' },
      { type: 'string', text: "'quic-v2'" },
      { type: 'plain', text: ' })' },
    ],
  },
  { indent: 0, tokens: [] },
  {
    indent: 1,
    tokens: [
      { type: 'keyword', text: 'await' },
      { type: 'plain', text: ' engine.' },
      { type: 'entity', text: 'compileShaders' },
      { type: 'plain', text: '(context.' },
      { type: 'support', text: 'viewport' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'runtimeConfig' },
      { type: 'plain', text: ', { ' },
      { type: 'support', text: 'antialias' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: 'true' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'hdr' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: 'true' },
      { type: 'plain', text: ' })' },
    ],
  },
  {
    indent: 1,
    tokens: [
      { type: 'keyword', text: 'const' },
      { type: 'plain', text: ' pipeline = ' },
      { type: 'keyword', text: 'new' },
      { type: 'entity', text: ' StreamPipeline' },
      { type: 'plain', text: '(engine).' },
      { type: 'entity', text: 'connectStreams' },
      { type: 'plain', text: '([' },
      { type: 'string', text: "'full-stack-architecture'" },
      { type: 'plain', text: ', ' },
      { type: 'string', text: "'creative-engineering'" },
      { type: 'plain', text: ', ' },
      { type: 'string', text: "'intelligent-automation'" },
      { type: 'plain', text: ', ' },
      { type: 'string', text: "'distributed-systems'" },
      { type: 'plain', text: '])' },
    ],
  },
  { indent: 0, tokens: [] },
  {
    indent: 1,
    tokens: [
      {
        type: 'comment',
        text: '// Orquestração de estado distribuído e compilação contínua de módulos',
      },
    ],
  },
  {
    indent: 1,
    tokens: [
      { type: 'plain', text: 'cluster.' },
      { type: 'entity', text: 'on' },
      { type: 'plain', text: '(' },
      { type: 'string', text: "'telemetry:tick'" },
      { type: 'plain', text: ', (' },
      { type: 'support', text: 'snapshot' },
      { type: 'plain', text: ') => {' },
    ],
  },
  {
    indent: 2,
    tokens: [
      { type: 'keyword', text: 'const' },
      { type: 'plain', text: ' metrics = ' },
      { type: 'entity', text: 'compileKernel' },
      { type: 'plain', text: '(snapshot.' },
      { type: 'support', text: 'memoryGraph' },
      { type: 'plain', text: ', { ' },
      { type: 'support', text: 'targetFps' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: '120' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'zeroCopy' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: 'true' },
      { type: 'plain', text: ' })' },
    ],
  },
  {
    indent: 2,
    tokens: [
      { type: 'support', text: 'telemetryBus' },
      { type: 'plain', text: '.' },
      { type: 'entity', text: 'publish' },
      { type: 'plain', text: '(' },
      { type: 'string', text: "'runtime:optimized'" },
      { type: 'plain', text: ', { ...metrics, ' },
      { type: 'support', text: 'timestamp' },
      { type: 'plain', text: ': ' },
      { type: 'entity', text: ' performance' },
      { type: 'plain', text: '.' },
      { type: 'entity', text: 'now' },
      { type: 'plain', text: '() })' },
    ],
  },
  { indent: 1, tokens: [{ type: 'plain', text: '})' }] },
  { indent: 0, tokens: [] },
  {
    indent: 1,
    tokens: [
      {
        type: 'comment',
        text: '// Transformando conceitos complexos em produtos escaláveis de alta performance',
      },
    ],
  },
  {
    indent: 1,
    tokens: [
      { type: 'keyword', text: 'for await' },
      { type: 'plain', text: ' (' },
      { type: 'keyword', text: 'const' },
      { type: 'plain', text: ' packet ' },
      { type: 'keyword', text: 'of' },
      { type: 'plain', text: ' pipeline.' },
      { type: 'entity', text: 'listen' },
      { type: 'plain', text: '({ ' },
      { type: 'support', text: 'bufferSize' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: '8192' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'backpressure' },
      { type: 'plain', text: ': ' },
      { type: 'string', text: "'adaptive'" },
      { type: 'plain', text: ' })) {' },
    ],
  },
  {
    indent: 2,
    tokens: [
      { type: 'keyword', text: 'const' },
      { type: 'plain', text: ' state = ' },
      { type: 'keyword', text: 'await' },
      { type: 'plain', text: ' ' },
      { type: 'entity', text: 'syncDistributedState' },
      { type: 'plain', text: '(cluster, packet.' },
      { type: 'support', text: 'payload' },
      { type: 'plain', text: ')' },
    ],
  },
  {
    indent: 2,
    tokens: [
      { type: 'keyword', text: 'if' },
      { type: 'plain', text: ' (packet.' },
      { type: 'support', text: 'readyToLaunch' },
      { type: 'plain', text: ' && state.' },
      { type: 'support', text: 'verified' },
      { type: 'plain', text: ') {' },
    ],
  },
  {
    indent: 3,
    tokens: [
      { type: 'keyword', text: 'return' },
      { type: 'entity', text: ' deployVision' },
      { type: 'plain', text: '({ ' },
      { type: 'support', text: 'component' },
      { type: 'plain', text: ': ' },
      { type: 'tag', text: "'<PortfolioExperience />'" },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'status' },
      { type: 'plain', text: ': ' },
      { type: 'string', text: "'ONLINE'" },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'scale' },
      { type: 'plain', text: ': ' },
      { type: 'string', text: "'INFINITE'" },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'options' },
      { type: 'plain', text: ' })' },
    ],
  },
  { indent: 2, tokens: [{ type: 'plain', text: '}' }] },
  { indent: 1, tokens: [{ type: 'plain', text: '}' }] },
  { indent: 0, tokens: [{ type: 'plain', text: '}' }] },
  { indent: 0, tokens: [] },
  {
    indent: 0,
    tokens: [
      {
        type: 'comment',
        text: '// Exportando malha reativa de renderização e controle de câmera por foco',
      },
    ],
  },
  {
    indent: 0,
    tokens: [
      { type: 'keyword', text: 'export const' },
      { type: 'entity', text: ' createViewportCamera' },
      { type: 'plain', text: ' = (' },
      { type: 'support', text: 'originX' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'originY' },
      { type: 'plain', text: ') => ({ ' },
      { type: 'support', text: 'zoom' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: '8.5' },
      { type: 'plain', text: ', ' },
      { type: 'support', text: 'focus' },
      { type: 'plain', text: ': [originX, originY], ' },
      { type: 'support', text: 'active' },
      { type: 'plain', text: ': ' },
      { type: 'support', text: 'true' },
      { type: 'plain', text: ' })' },
    ],
  },
  {
    indent: 0,
    tokens: [
      { type: 'keyword', text: 'export default' },
      { type: 'plain', text: ' { ' },
      { type: 'entity', text: 'bootstrapIdea' },
      { type: 'plain', text: ', ' },
      { type: 'entity', text: 'createViewportCamera' },
      { type: 'plain', text: ' }' },
    ],
  },
]

const lineLengths = codeSnippets.map((line) =>
  line.tokens.reduce((acc, token) => acc + token.text.length, 0),
)

const visibleCharCounts = ref(lineLengths.map((len, idx) => (idx < 14 ? len : 0)))
const activeCodingLine = ref(14)

let decodeTween = null
let codingInterval = null
let scrollTl = null

// Recursos Three.js para controle, rotação rápida de entrada, inércia de mouse e limpeza WebGL
let threeRenderer = null
let threeScene = null
let threeCamera = null
let threeControls = null
let envTexture = null
let animationFrameId = null
let entranceSpinGroup = null
let mouseTrackGroup = null

const mouseTargetRot = { x: 0, y: 0 }

function toggleTheme() {
  isDark.value = !isDark.value
}

function getRenderedTokens(line, lineIndex) {
  const maxChars = visibleCharCounts.value[lineIndex] ?? 0
  let remaining = maxChars
  const result = []

  for (const token of line.tokens) {
    if (remaining <= 0) break
    const sliceText = token.text.slice(0, remaining)
    result.push({ type: token.type, text: sliceText })
    remaining -= token.text.length
  }
  return result
}

function runDecodeAnimation() {
  const progressObj = { value: 0 }
  const totalLen = TARGET_PHRASE.length

  decodeTween = gsap.to(progressObj, {
    value: totalLen,
    duration: 2.5,
    delay: 0.25,
    ease: 'power2.inOut',
    onUpdate: () => {
      const lockedCount = Math.floor(progressObj.value)
      let output = ''

      for (let i = 0; i < totalLen; i++) {
        const targetChar = TARGET_PHRASE[i]
        if (targetChar === ' ' || targetChar === '\n') {
          output += targetChar
        } else if (i < lockedCount) {
          output += targetChar
        } else if (i < lockedCount + 6) {
          const randomIndex = Math.floor(Math.random() * CIPHER_CHARS.length)
          output += CIPHER_CHARS[randomIndex]
        }
      }

      displayedText.value = output
    },
    onComplete: () => {
      displayedText.value = TARGET_PHRASE
    },
  })
}

function startBackgroundCoding() {
  codingInterval = setInterval(() => {
    const idx = activeCodingLine.value
    const fullLen = lineLengths[idx]

    if (visibleCharCounts.value[idx] < fullLen) {
      visibleCharCounts.value[idx] = Math.min(
        fullLen,
        visibleCharCounts.value[idx] + Math.ceil(Math.random() * 4),
      )
    } else {
      let nextIdx = (idx + 1) % codeSnippets.length
      while (lineLengths[nextIdx] === 0) {
        nextIdx = (nextIdx + 1) % codeSnippets.length
      }
      activeCodingLine.value = nextIdx
      visibleCharCounts.value[nextIdx] = 0
    }
  }, 28)
}

function handleMouseMove(event) {
  if (!heroSection.value) return
  const rect = heroSection.value.getBoundingClientRect()
  const relX = ((event.clientX - rect.left) / rect.width) * 100
  const relY = ((event.clientY - rect.top) / rect.height) * 100

  const clampedX = Math.max(5, Math.min(95, relX))
  const clampedY = Math.max(5, Math.min(95, relY))

  if (codeScreen.value) {
    gsap.to(codeScreen.value, {
      transformOrigin: `${clampedX.toFixed(2)}% ${clampedY.toFixed(2)}%`,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }

  // Coordenadas normalizadas (-1 a 1) para o livro 3D acompanhar o mouse com inércia suave
  const normX = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const normY = ((event.clientY - rect.top) / rect.height) * 2 - 1

  mouseTargetRot.y = normX * 0.42
  mouseTargetRot.x = normY * 0.28
}

// Inicializa o modelo 3D NoteBook.glb com iluminação cinematográfica via SpotLight, rotação de entrada e acompanhamento do mouse
function initThreeNotebook() {
  const container = threeCanvasContainer.value
  if (!container) return

  const width = container.clientWidth || window.innerWidth
  const height = container.clientHeight || window.innerHeight

  threeScene = new THREE.Scene()

  threeCamera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100)
  threeCamera.position.set(0, 1.35, 5.2)

  threeRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  threeRenderer.setSize(width, height)
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  threeRenderer.outputColorSpace = THREE.SRGBColorSpace
  threeRenderer.toneMapping = THREE.ACESFilmicToneMapping
  threeRenderer.toneMappingExposure = 1.05
  threeRenderer.shadowMap.enabled = true
  threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap

  container.appendChild(threeRenderer.domElement)

  // Ambiente sutil apenas para reflexos metálicos suaves sem chapar o contraste do SpotLight
  const pmremGenerator = new THREE.PMREMGenerator(threeRenderer)
  pmremGenerator.compileEquirectangularShader()
  const roomEnv = new RoomEnvironment()
  envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture
  threeScene.environment = envTexture
  threeScene.environmentIntensity = 0.22
  roomEnv.dispose()
  pmremGenerator.dispose()

  // Luz ambiente mínima para preservar sombras profundas e volume
  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x080b10, 0.18)
  threeScene.add(hemiLight)

  // SpotLight principal cinematográfico focado no livro 3D
  const mainSpotLight = new THREE.SpotLight(0xfff7ed, 42)
  mainSpotLight.position.set(2.6, 4.6, 3.8)
  mainSpotLight.angle = Math.PI / 5.2
  mainSpotLight.penumbra = 0.68
  mainSpotLight.decay = 1.55
  mainSpotLight.distance = 18
  mainSpotLight.castShadow = true
  mainSpotLight.shadow.mapSize.width = 2048
  mainSpotLight.shadow.mapSize.height = 2048
  mainSpotLight.shadow.camera.near = 1.2
  mainSpotLight.shadow.camera.far = 14
  mainSpotLight.shadow.bias = -0.0003
  mainSpotLight.shadow.radius = 4
  mainSpotLight.target.position.set(0, 0, 0)
  threeScene.add(mainSpotLight)
  threeScene.add(mainSpotLight.target)

  // SpotLight secundário de recorte (rim light) para destacar bordas e relevo
  const rimSpotLight = new THREE.SpotLight(0x79b8ff, 14)
  rimSpotLight.position.set(-3.4, 2.4, -3.2)
  rimSpotLight.angle = Math.PI / 4
  rimSpotLight.penumbra = 0.85
  rimSpotLight.decay = 1.6
  rimSpotLight.distance = 15
  rimSpotLight.target.position.set(0, 0, 0)
  threeScene.add(rimSpotLight)
  threeScene.add(rimSpotLight.target)

  // Plano invisível receptor de sombra suave sob o livro para reforçar profundidade
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.ShadowMaterial({ opacity: 0.34 }),
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = -0.95
  shadowPlane.receiveShadow = true
  threeScene.add(shadowPlane)

  // Controle de rotação por clique e arraste sem conflitar com o scroll
  threeControls = new OrbitControls(threeCamera, threeRenderer.domElement)
  threeControls.enableDamping = true
  threeControls.dampingFactor = 0.06
  threeControls.enableZoom = false
  threeControls.enablePan = false
  threeControls.rotateSpeed = 0.85
  threeControls.target.set(0, 0, 0)

  // Hierarquia de grupos:
  // entranceSpinGroup -> rotação rápida na entrada
  // mouseTrackGroup -> acompanha o mouse com inércia suave
  // pivotGroup -> orientação base e centralização do modelo GLB
  entranceSpinGroup = new THREE.Group()
  mouseTrackGroup = new THREE.Group()
  const pivotGroup = new THREE.Group()

  entranceSpinGroup.add(mouseTrackGroup)
  mouseTrackGroup.add(pivotGroup)
  threeScene.add(entranceSpinGroup)

  // Começa rotacionado para girar rapidamente ao entrar em cena
  entranceSpinGroup.rotation.set(0.35, -Math.PI * 3.5, -0.2)

  const loader = new GLTFLoader()
  loader.load(
    '/NoteBook.glb',
    (gltf) => {
      if (!threeScene) return
      const model = gltf.scene

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material && child.material.normalScale) {
            child.material.normalScale.set(1.35, 1.35)
          }
        }
      })

      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const isMobile = window.innerWidth < 768
      const targetSize = isMobile ? 2.15 : 2.75
      const scaleFactor = targetSize / maxDim

      model.scale.setScalar(scaleFactor)
      model.position.set(-center.x * scaleFactor, -center.y * scaleFactor, -center.z * scaleFactor)

      pivotGroup.add(model)
      pivotGroup.rotation.set(0.42, -0.52, 0.08)
    },
    undefined,
    (error) => {
      console.error('Erro ao carregar /NoteBook.glb:', error)
    },
  )

  const renderLoop = () => {
    animationFrameId = requestAnimationFrame(renderLoop)

    // Suavização com inércia para o livro acompanhar o mouse naturalmente
    if (mouseTrackGroup) {
      mouseTrackGroup.rotation.x += (mouseTargetRot.x - mouseTrackGroup.rotation.x) * 0.055
      mouseTrackGroup.rotation.y += (mouseTargetRot.y - mouseTrackGroup.rotation.y) * 0.055
    }

    threeControls?.update()
    threeRenderer?.render(threeScene, threeCamera)
  }
  renderLoop()

  window.addEventListener('resize', handleThreeResize)
}

function handleThreeResize() {
  if (!threeCanvasContainer.value || !threeRenderer || !threeCamera) return
  const width = threeCanvasContainer.value.clientWidth || window.innerWidth
  const height = threeCanvasContainer.value.clientHeight || window.innerHeight

  threeCamera.aspect = width / height
  threeCamera.updateProjectionMatrix()
  threeRenderer.setSize(width, height)
}

function disposeThreeResources() {
  window.removeEventListener('resize', handleThreeResize)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (threeControls) {
    threeControls.dispose()
    threeControls = null
  }
  if (envTexture) {
    envTexture.dispose()
    envTexture = null
  }
  if (threeScene) {
    threeScene.traverse((obj) => {
      if (obj.isMesh) {
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
    threeScene = null
  }
  if (threeRenderer) {
    threeRenderer.dispose()
    threeRenderer.domElement?.remove()
    threeRenderer = null
  }
  threeCamera = null
  entranceSpinGroup = null
  mouseTrackGroup = null
}

onMounted(() => {
  runDecodeAnimation()
  startBackgroundCoding()
  initThreeNotebook()

  // Estado inicial da Parte 1 (código ao fundo desfocado)
  gsap.set(codeScreen.value, {
    scale: 1,
    filter: 'blur(6px)',
    opacity: 0.38,
    transformOrigin: '50% 50%',
  })

  // Estado inicial da Parte 2 (palavras acima do topo da tela prontas para cair)
  gsap.set(wordRefs.value, {
    y: '-115vh',
    opacity: 0,
  })

  // Estado inicial da Parte 3 (divisória com modelo 3D posicionada abaixo da tela)
  gsap.set(risingDivider.value, {
    yPercent: 100,
  })

  // Modelo 3D começa centralizado na tela
  gsap.set(notebookStageWrapper.value, {
    x: 0,
    y: 0,
  })

  // Seção do n8n começa abaixo da tela para sobrepor ao final das 3 etapas do livro 3D
  gsap.set(nextRisingDivider.value, {
    yPercent: 100,
  })

  // Workflow do n8n começa centralizado e com destaque visual
  gsap.set(n8nWorkflowWrapper.value, {
    x: 0,
    y: 0,
    scale: 1,
  })

  // Cabeçalho e os 4 benefícios do n8n começam invisíveis à esquerda
  gsap.set(n8nBenefitsWrapper.value, {
    opacity: 0,
    y: 20,
  })
  gsap.set(n8nBenefitRefs.value, {
    opacity: 0,
    y: 24,
  })

  // Seção Case de Sucesso começa abaixo da tela
  gsap.set(caseSectionDivider.value, {
    yPercent: 100,
  })

  // Calcula dinamicamente o deslocamento vertical da trilha de mensagens para que cada nova mensagem
  // empurre as anteriores para cima e a 6ª (última) mensagem nunca fique cortada em nenhuma resolução
  const getChatTrackYForStep = (stepIdx) => {
    const track = chatTrackRef.value
    const msgEl = chatMsgRefs.value[stepIdx]
    if (!track || !msgEl || !track.parentElement) return 0

    const areaEl = track.parentElement
    const style = window.getComputedStyle(areaEl)
    const padTop = parseFloat(style.paddingTop) || 0
    const padBottom = parseFloat(style.paddingBottom) || 0
    const usableHeight = Math.max(180, areaEl.clientHeight - padTop - padBottom)

    const msgBottom = msgEl.offsetTop + msgEl.offsetHeight
    const targetBottom = usableHeight * 0.92

    return Math.round(targetBottom - msgBottom)
  }

  // Mensagens do WhatsApp começam ocultas e a trilha posicionada para a entrada da 1ª mensagem
  gsap.set(chatTrackRef.value, {
    y: () => getChatTrackYForStep(0),
  })
  gsap.set(chatMsgRefs.value, {
    opacity: 0,
    y: 20,
    scale: 0.97,
  })

  // Seção Rahamim Acamps começa abaixo da tela e prepara elementos de parallax para o desktop
  gsap.set(rahamimSectionDivider.value, {
    yPercent: 100,
  })
  gsap.set(rahamimShowcaseRef.value, {
    y: 26,
  })
  gsap.set(rahamimScreenshotRef.value, {
    y: 0,
  })

  // Calcula o deslocamento proporcional de parallax da screenshot respeitando os limites do frame
  const getRahamimParallaxY = () => {
    const viewportEl = rahamimViewportRef.value
    const imgEl = rahamimScreenshotRef.value
    if (!viewportEl || !imgEl) return -180
    const overflowPx = Math.max(0, imgEl.offsetHeight - viewportEl.clientHeight)
    if (overflowPx <= 0) return -120
    return -Math.round(Math.min(overflowPx, viewportEl.clientHeight * 0.58))
  }

  scrollTl = gsap.timeline({
    scrollTrigger: {
      trigger: heroSection.value,
      start: 'top top',
      end: '+=12500',
      scrub: 0.5,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  })

  scrollTl
    // =========================================================
    // PARTE 1: Fade out da frase inicial + Foco e Zoom no código
    // =========================================================
    .to(
      heroMessageWrapper.value,
      {
        opacity: 0,
        scale: 1.25,
        filter: 'blur(10px)',
        duration: 0.28,
        ease: 'power2.inOut',
      },
      0,
    )
    .to(
      codeScreen.value,
      {
        filter: 'blur(0px)',
        opacity: 1,
        scale: 2.6,
        duration: 0.35,
        ease: 'power2.out',
      },
      0.02,
    )
    .to(
      codeScreen.value,
      {
        scale: 8.5,
        opacity: 0,
        filter: 'blur(5px)',
        duration: 0.32,
        ease: 'power3.in',
      },
      0.38,
    )

    // =========================================================
    // PARTE 2: Palavras brancas gigantes caindo do topo e preenchendo a tela
    // Frase: "e por onde seu projeto começa?"
    // =========================================================
    .to(
      wordRefs.value,
      {
        y: '0vh',
        opacity: 1,
        duration: 0.55,
        stagger: 0.06,
        ease: 'power3.out',
      },
      0.62,
    )

    // =========================================================
    // PARTE 3: Divisória sobe sobrepondo as palavras + Rotação rápida de entrada do livro 3D
    // =========================================================
    .to(
      risingDivider.value,
      {
        yPercent: 0,
        duration: 0.7,
        ease: 'none',
      },
      1.3,
    )
    .to(
      entranceSpinGroup ? entranceSpinGroup.rotation : {},
      {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.95,
        ease: 'power3.out',
      },
      1.35,
    )

    // =========================================================
    // PARTE 4: Modelo 3D desloca-se gradualmente para a lateral direita
    // =========================================================
    .to(
      notebookStageWrapper.value,
      {
        x: () => (window.innerWidth >= 768 ? window.innerWidth * 0.23 : 0),
        y: () => (window.innerWidth < 768 ? -window.innerHeight * 0.2 : 0),
        duration: 0.65,
        ease: 'power2.inOut',
      },
      2.1,
    )

    // =========================================================
    // PARTE 5: Escrita progressiva do código Markdown caractere por caractere nas 3 etapas
    // =========================================================
    .to(
      mdTypedChars,
      {
        value: stage1EndLen,
        duration: 0.55,
        ease: 'none',
      },
      2.7,
    )
    .to(
      mdTypedChars,
      {
        value: stage2EndLen,
        duration: 0.55,
        ease: 'none',
      },
      3.35,
    )
    .to(
      mdTypedChars,
      {
        value: stage3EndLen,
        duration: 0.55,
        ease: 'none',
      },
      4.0,
    )

    // =========================================================
    // PARTE 6: Seção n8n sobe sobrepondo o livro 3D com o workflow centralizado
    // =========================================================
    .to(
      nextRisingDivider.value,
      {
        yPercent: 0,
        duration: 0.7,
        ease: 'none',
      },
      4.7,
    )

    // =========================================================
    // PARTE 7: Workflow do n8n desloca-se para a direita (ou topo no celular) enquanto os 4 benefícios surgem
    // =========================================================
    .to(
      n8nWorkflowWrapper.value,
      {
        x: () => (window.innerWidth >= 1024 ? window.innerWidth * 0.21 : 0),
        y: () => (window.innerWidth < 1024 ? -window.innerHeight * 0.29 : 0),
        scale: () => (window.innerWidth >= 1024 ? 0.92 : 0.94),
        duration: 0.7,
        ease: 'power2.inOut',
      },
      5.55,
    )
    .to(
      n8nBenefitsWrapper.value,
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
      },
      5.95,
    )
    .to(
      n8nBenefitRefs.value,
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.32,
        ease: 'power2.out',
      },
      6.1,
    )

    // =========================================================
    // PARTE 8: Seção "Case de Sucesso" sobe sobrepondo a seção do n8n
    // =========================================================
    .to(
      caseSectionDivider.value,
      {
        yPercent: 0,
        duration: 0.7,
        ease: 'none',
      },
      7.75,
    )

    // =========================================================
    // PARTE 9: Conversa do WhatsApp surge progressivamente no scroll e sobe as mensagens anteriores
    // =========================================================
    .fromTo(
      chatTrackRef.value,
      { y: () => getChatTrackYForStep(0) },
      {
        y: () => getChatTrackYForStep(0),
        duration: 0.01,
        ease: 'none',
      },
      8.5,
    )
    .to(
      chatMsgRefs.value[0],
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
      },
      8.55,
    )
    .to(
      chatMsgRefs.value[1],
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
      },
      8.95,
    )
    .to(
      chatTrackRef.value,
      {
        y: () => getChatTrackYForStep(1),
        duration: 0.35,
        ease: 'power1.inOut',
      },
      8.95,
    )
    .to(
      chatMsgRefs.value[2],
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
      },
      9.35,
    )
    .to(
      chatTrackRef.value,
      {
        y: () => getChatTrackYForStep(2),
        duration: 0.35,
        ease: 'power1.inOut',
      },
      9.35,
    )
    .to(
      chatMsgRefs.value[3],
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
      },
      9.75,
    )
    .to(
      chatTrackRef.value,
      {
        y: () => getChatTrackYForStep(3),
        duration: 0.35,
        ease: 'power1.inOut',
      },
      9.75,
    )
    .to(
      chatMsgRefs.value[4],
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
      },
      10.15,
    )
    .to(
      chatTrackRef.value,
      {
        y: () => getChatTrackYForStep(4),
        duration: 0.35,
        ease: 'power1.inOut',
      },
      10.15,
    )
    .to(
      chatMsgRefs.value[5],
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
      },
      10.55,
    )
    .to(
      chatTrackRef.value,
      {
        y: () => getChatTrackYForStep(5),
        duration: 0.35,
        ease: 'power1.inOut',
      },
      10.55,
    )

    // =========================================================
    // PARTE 10: Seção Rahamim Acamps sobe após a conversa do WhatsApp + Parallax suave da screenshot no desktop
    // =========================================================
    .to(
      rahamimSectionDivider.value,
      {
        yPercent: 0,
        duration: 0.7,
        ease: 'none',
      },
      11.2,
    )
    .fromTo(
      rahamimShowcaseRef.value,
      { y: 26 },
      {
        y: -26,
        duration: 2.3,
        ease: 'none',
      },
      11.2,
    )
    .fromTo(
      rahamimScreenshotRef.value,
      { y: 0 },
      {
        y: () => getRahamimParallaxY(),
        duration: 2.1,
        ease: 'none',
      },
      11.4,
    )
})

onBeforeUnmount(() => {
  decodeTween?.kill()
  if (codingInterval) clearInterval(codingInterval)
  scrollTl?.scrollTrigger?.kill()
  scrollTl?.kill()
  disposeThreeResources()
})
</script>

<template>
  <div
    :class="[
      'theme-root min-h-screen w-full overflow-x-hidden transition-colors duration-300',
      isDark ? 'theme-dark' : 'theme-light',
    ]"
  >
    <!-- Botão discreto para alternar entre GitHub Dark e GitHub Light -->
    <button
      type="button"
      class="fixed top-5 right-5 z-50 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg opacity-75 transition hover:opacity-100"
      :aria-label="isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
      :title="isDark ? 'Tema Claro (GitHub Light)' : 'Tema Escuro (GitHub Dark)'"
      @click="toggleTheme"
    >
      <svg
        v-if="isDark"
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-[#ffea7f]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>

      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-[#24292e]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>

    <main>
      <!-- STAGE PRINCIPAL PINNADO COM AS FASES DE SCROLL -->
      <section
        ref="heroSection"
        class="editor-bg relative flex h-screen w-full items-center justify-center overflow-hidden transition-colors duration-300"
        @mousemove="handleMouseMove"
      >
        <!-- PARTE 1 (FUNDO): UMA ÚNICA PARTE CODANDO NA PÁGINA INTEIRA EM LOOP INVISÍVEL -->
        <div
          ref="codeScreen"
          class="code-typography pointer-events-none absolute inset-0 z-0 flex h-full w-full flex-col justify-between overflow-hidden px-6 py-5 sm:px-10 sm:py-8 will-change-transform"
        >
          <div class="seamless-single-loop flex flex-col">
            <div v-for="repeatIdx in 2" :key="repeatIdx" class="flex flex-col pb-4">
              <div
                v-for="(line, lineIdx) in codeSnippets"
                :key="`${repeatIdx}-${lineIdx}`"
                class="flex min-h-[1rem] items-start px-2 py-[1px]"
                :class="{ 'line-highlight': activeCodingLine === lineIdx }"
              >
                <div
                  class="w-full whitespace-pre-wrap break-words"
                  :style="{ paddingLeft: `${line.indent * 1.1}rem` }"
                >
                  <span
                    v-for="(token, tokenIdx) in getRenderedTokens(line, lineIdx)"
                    :key="tokenIdx"
                    :class="`token-${token.type}`"
                    >{{ token.text }}</span
                  ><span
                    v-if="activeCodingLine === lineIdx"
                    class="terminal-cursor ml-0.5 inline-block h-[1.05em] w-[0.7ch] align-middle"
                  ></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PARTE 1 (CENTRO): MENSAGEM INICIAL DE DESCODIFICAÇÃO -->
        <div
          ref="heroMessageWrapper"
          class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 text-center"
        >
          <h2 class="hero-typography hero-title whitespace-pre-wrap break-words">
            <span>{{ displayedText }}</span
            ><span
              class="terminal-cursor ml-1 inline-block h-[1.05em] w-[0.68ch] align-middle"
            ></span>
          </h2>
        </div>

        <!-- PARTE 2: PALAVRAS CAINDO DO TOPO E PREENCHENDO A TELA ("e por onde seu projeto começa?") -->
        <div
          ref="fallingWordsStage"
          class="pointer-events-none absolute inset-0 z-30 flex h-screen w-full flex-col justify-between overflow-hidden px-3 py-2 sm:px-6 sm:py-4"
        >
          <div
            v-for="(row, rowIdx) in fallingWordRows"
            :key="rowIdx"
            class="flex w-full flex-1 items-center"
            :class="row.length > 1 ? 'justify-between gap-2' : 'justify-center'"
          >
            <span
              v-for="word in row"
              :key="word.index"
              :ref="(el) => setWordRef(el, word.index)"
              class="falling-word hero-typography inline-block select-none will-change-transform"
            >
              {{ word.text }}
            </span>
          </div>
        </div>

        <!-- PARTE 3, 4 e 5: DIVISÓRIA DO LIVRO 3D COM ESCRITA DE CÓDIGO MARKDOWN À ESQUERDA -->
        <div
          ref="risingDivider"
          class="rising-divider absolute inset-0 z-40 flex h-full w-full items-center justify-center overflow-hidden will-change-transform"
        >
          <!-- Painel Lateral Esquerdo: Código Markdown sendo digitado caractere por caractere -->
          <div
            class="pointer-events-none relative z-20 mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-6 pb-8 md:justify-center md:px-14 md:pb-0"
          >
            <div
              v-if="renderedMarkdownLines.length > 0"
              class="markdown-editor-panel w-full max-w-lg"
            >
              <div
                v-for="line in renderedMarkdownLines"
                :key="line.idx"
                class="flex min-h-[1.35rem] items-baseline whitespace-pre-wrap break-words"
              >
                <span v-for="(token, tIdx) in line.tokens" :key="tIdx" :class="token.type">{{
                  token.text
                }}</span
                ><span
                  v-if="line.isLastLine"
                  class="md-cursor ml-0.5 inline-block h-[1em] w-[0.55ch] align-middle"
                ></span>
              </div>
            </div>
          </div>

          <!-- Container do Livro 3D Interativo (começa no centro, gira rápido na entrada, acompanha o mouse e vai para a direita) -->
          <div
            ref="notebookStageWrapper"
            class="absolute inset-0 z-10 flex items-center justify-center will-change-transform"
          >
            <div
              ref="threeCanvasContainer"
              class="three-canvas-container h-full w-full cursor-grab active:cursor-grabbing"
            ></div>
          </div>
        </div>

        <!-- PARTE 6 e 7: SEÇÃO N8N & AUTOMAÇÃO (FUNDO PONTILHADO + WORKFLOW INTERATIVO + 4 BENEFÍCIOS) -->
        <div
          ref="nextRisingDivider"
          class="n8n-section-divider n8n-dotted-bg absolute inset-0 z-50 flex h-full w-full items-center justify-center overflow-hidden will-change-transform"
        >
          <!-- Coluna Esquerda: 4 Benefícios do n8n organizados tipograficamente -->
          <div
            ref="n8nBenefitsWrapper"
            class="pointer-events-none relative z-20 mx-auto flex h-full w-full max-w-7xl flex-col justify-start px-4 pt-[36vh] sm:px-6 sm:pt-[37vh] lg:justify-center lg:px-14 lg:pt-0 will-change-transform"
          >
            <div class="w-full max-w-md space-y-2.5 sm:space-y-4 lg:space-y-6">
              <div class="space-y-0.5 sm:space-y-1">
                <span class="code-typography text-[10.5px] sm:text-xs uppercase tracking-widest token-keyword">
                  // n8n &amp; automação de processos
                </span>
                <h2 class="hero-typography text-lg sm:text-2xl lg:text-3xl">
                  Fluxos inteligentes sob seu controle
                </h2>
              </div>

              <div class="space-y-2 sm:space-y-3.5 lg:space-y-5">
                <div
                  v-for="(item, idx) in n8nBenefits"
                  :key="item.num"
                  :ref="(el) => setN8nBenefitRef(el, idx)"
                  class="n8n-benefit-item will-change-transform"
                >
                  <div class="flex items-baseline gap-2 sm:gap-2.5">
                    <span class="n8n-benefit-num code-typography">{{ item.num }}</span>
                    <h3 class="hero-typography text-xs sm:text-sm lg:text-base">{{ item.title }}</h3>
                  </div>
                  <p class="n8n-benefit-desc mt-0.5 pl-5 text-[11.6px] sm:mt-1 sm:pl-7 sm:text-xs lg:text-sm">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Container do Workflow Read-Only (@n8n_io/n8n-demo-component) que começa centralizado e move-se para a direita no scroll -->
          <div
            ref="n8nWorkflowWrapper"
            class="absolute inset-0 z-10 flex items-center justify-center px-3 sm:px-8 will-change-transform"
          >
            <div class="n8n-workflow-frame relative w-full max-w-3xl overflow-hidden rounded-xl">
              <n8n-demo
                :workflow="n8nWorkflowJson"
                :theme="isDark ? 'dark' : 'light'"
                frame="false"
                hidecanvaserrors="true"
                disableinteractivity="true"
                collapseformobile="false"
                class="n8n-demo-element block w-full"
              ></n8n-demo>
            </div>
          </div>
        </div>

        <!-- PARTE 8 e 9: SEÇÃO CASE DE SUCESSO (2/3 EXPLICAÇÃO EM MARKDOWN À ESQUERDA + 1/3 MENSAGENS WHATSAPP À DIREITA) -->
        <div
          ref="caseSectionDivider"
          class="case-section-divider absolute inset-0 z-[60] flex h-full w-full items-center justify-center overflow-hidden will-change-transform"
        >
          <div class="mx-auto flex h-full w-full max-w-7xl flex-col justify-between gap-2 px-4 py-4 sm:px-6 sm:py-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-14 lg:py-8">
            <!-- 2/3 da largura à esquerda: Conteúdo em Markdown real e estilizado (Título, Subtítulo em negrito, 3 parágrafos e código inline) -->
            <div
              class="portfolio-markdown portfolio-markdown-case flex shrink-0 flex-col justify-center lg:col-span-8 lg:max-w-2xl"
              v-html="renderedCaseStudyHtml"
            ></div>

            <!-- 1/3 da largura à direita: Apenas as mensagens subindo (sem fundo e sem moldura), estilo grupo com 3 participantes -->
            <div class="flex min-h-0 w-full flex-1 flex-col justify-center lg:col-span-4 lg:h-[78vh] lg:flex-none">
              <div class="wa-messages-area relative flex h-full w-full flex-col justify-start overflow-hidden px-3 py-3 sm:px-4 sm:py-5">
                <div
                  ref="chatTrackRef"
                  class="flex w-full flex-col pb-4 will-change-transform"
                >
                  <div
                    v-for="(msg, mIdx) in whatsappMessages"
                    :key="mIdx"
                    :ref="(el) => setChatMsgRef(el, mIdx)"
                    class="flex w-full flex-col will-change-transform"
                    :class="[
                      msg.isOutgoing ? 'items-end' : 'items-start',
                      mIdx === 0 ? 'mt-0' : msg.isFirstInGroup ? 'mt-2.5 sm:mt-3' : 'mt-1',
                    ]"
                  >
                    <div
                      class="wa-bubble relative"
                      :class="[
                        msg.isOutgoing ? 'wa-bubble-out' : 'wa-bubble-in',
                        msg.isFirstInGroup
                          ? msg.isOutgoing
                            ? 'wa-first-out'
                            : 'wa-first-in'
                          : '',
                      ]"
                    >
                      <!-- Cauda discreta na primeira mensagem de cada sequência -->
                      <svg
                        v-if="msg.isFirstInGroup && msg.isOutgoing"
                        class="wa-tail wa-tail-out"
                        viewBox="0 0 8 13"
                        width="8"
                        height="13"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"
                        />
                      </svg>
                      <svg
                        v-if="msg.isFirstInGroup && !msg.isOutgoing"
                        class="wa-tail wa-tail-in"
                        viewBox="0 0 8 13"
                        width="8"
                        height="13"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M1.533 2.568L8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"
                        />
                      </svg>

                      <!-- Nome do participante no grupo (cor individual apenas no nome) -->
                      <div
                        class="wa-sender-name"
                        :class="`wa-sender-${msg.role}`"
                      >
                        {{ msg.sender }}
                      </div>

                      <!-- Conteúdo da mensagem + espaçador invisível para horário/tiques não sobreporem o texto -->
                      <div class="wa-text">
                        <span>{{ msg.text }}</span>
                        <span
                          class="wa-spacer"
                          :class="msg.isOutgoing ? 'wa-spacer-out' : 'wa-spacer-in'"
                        ></span>
                      </div>

                      <!-- Horário discreto e indicadores de leitura no canto inferior direito do balão -->
                      <span class="wa-meta">
                        <span class="wa-time">{{ msg.time }}</span>

                        <!-- 1 tique cinza: mensagem enviada -->
                        <svg
                          v-if="msg.isOutgoing && msg.tickStatus === 'sent'"
                          class="wa-tick wa-tick-gray"
                          viewBox="0 0 16 11"
                          width="16"
                          height="11"
                          aria-label="Mensagem enviada"
                        >
                          <path
                            fill="currentColor"
                            d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .501.203.697.697 0 0 0 .546-.266l6.646-8.417a.497.497 0 0 0 .108-.299.441.441 0 0 0-.19-.374l-.337-.273Z"
                          />
                        </svg>

                        <!-- 2 tiques cinza (entregue) ou 2 tiques azuis (lida) -->
                        <svg
                          v-else-if="msg.isOutgoing"
                          class="wa-tick"
                          :class="
                            msg.tickStatus === 'read' ? 'wa-tick-blue' : 'wa-tick-gray'
                          "
                          viewBox="0 0 16 11"
                          width="16"
                          height="11"
                          :aria-label="
                            msg.tickStatus === 'read'
                              ? 'Mensagem lida'
                              : 'Mensagem entregue'
                          "
                        >
                          <path
                            fill="currentColor"
                            d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .501.203.697.697 0 0 0 .546-.266l6.646-8.417a.497.497 0 0 0 .108-.299.441.441 0 0 0-.19-.374l-.337-.273Zm3.692 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.134-.66.819 1.655 1.655a.724.724 0 0 0 .501.203.697.697 0 0 0 .546-.266l6.646-8.417a.497.497 0 0 0 .108-.299.441.441 0 0 0-.19-.374l-.331-.273Z"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PARTE 10: SEÇÃO RAHAMIM ACAMPS — DESENVOLVIMENTO DO SITE DO EVENTO (50% SCREENSHOT PARALLAX DESKTOP / 50% MARKDOWN + LOGO MOBILE) -->
        <div
          ref="rahamimSectionDivider"
          class="rahamim-section-divider absolute inset-0 z-[65] flex h-full w-full items-center justify-center overflow-hidden will-change-transform"
        >
          <div
            class="mx-auto flex h-full w-full max-w-7xl flex-col justify-center px-4 py-3 sm:px-6 sm:py-5 md:grid md:grid-cols-12 md:items-center md:gap-8 md:px-10 md:py-8 lg:gap-12 lg:px-14"
          >
            <!-- Lado Esquerdo (50% no Desktop, oculto no Mobile): Screenshot do site com movimento de parallax suave -->
            <div
              class="hidden md:col-span-6 md:flex md:h-full md:items-center md:justify-center"
            >
              <div
                ref="rahamimShowcaseRef"
                class="rahamim-showcase-wrapper relative flex w-full max-w-xl items-center justify-center will-change-transform"
              >
                <div
                  ref="rahamimViewportRef"
                  class="rahamim-showcase-frame relative h-[76vh] max-h-[680px] w-full overflow-hidden rounded-2xl"
                >
                  <img
                    ref="rahamimScreenshotRef"
                    src="/Screenshot_22-10-2026_0244_rahamimacamps.com.br.jpeg"
                    alt="Screenshot do site do evento Rahamim Acamps"
                    width="1379"
                    height="2622"
                    class="rahamim-screenshot-img block h-auto min-h-[122%] w-full select-none object-cover object-top will-change-transform"
                    @load="handleRahamimImageLoad"
                  />
                </div>
              </div>
            </div>

            <!-- Lado Direito (50% no Desktop / Coluna única no Mobile): Logo no mobile + Conteúdo textual em Markdown estilizado -->
            <div class="flex w-full flex-col justify-center md:col-span-6">
              <!-- Mobile: exibe somente a logo do evento (/logo.png) mantendo proporção original sem distorção -->
              <div class="mb-2 flex items-center justify-start sm:mb-3 md:hidden">
                <img
                  src="/logo.png"
                  alt="Logo Rahamim Acamps"
                  width="1280"
                  height="626"
                  class="rahamim-mobile-logo block h-11 w-auto max-w-[175px] select-none object-contain sm:h-14 sm:max-w-[210px]"
                />
              </div>

              <!-- Documento Markdown estilizado do projeto -->
              <div
                class="portfolio-markdown portfolio-markdown-event w-full max-w-xl"
                v-html="renderedRahamimHtml"
              ></div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- FOOTER FINAL DO PORTFÓLIO (4 CAMADAS: RUBRICA SVG, CANECA 3D WEBGL, NOME GIGANTE E BLOCO DE CONTATO + REDES) -->
    <FooterSection />
  </div>
</template>

<style scoped>
/* =========================================================
   Tema Escuro por Padrão: GitHub Dark (dark.json)
   ========================================================= */
.theme-dark {
  --editor-bg: #24292e;
  --editor-fg: #e1e4e8;
  --secondary-bg: #1f2428;
  --secondary-border: #1b1f23;
  --line-highlight: #2b3036;
  --cursor-color: #79b8ff;
  --n8n-dot-color: rgba(225, 228, 232, 0.11);

  /* Tokens dark.json */
  --token-plain: #e1e4e8;
  --token-comment: #6a737d;
  --token-string: #9ecbff;
  --token-support: #79b8ff;
  --token-keyword: #f97583;
  --token-entity: #b392f0;
  --token-tag: #85e89d;

  /* Balões WhatsApp em Tema Escuro */
  --wa-bubble-out-bg: #005c4b;
  --wa-bubble-in-bg: #202c33;
  --wa-text-color: #e9edef;
  --wa-time-color: #8696a0;
  --wa-sender-user: #53bdeb;
  --wa-sender-bot: #00a884;
  --wa-sender-specialist: #ffab70;
}

/* =========================================================
   Tema Claro: GitHub Theme Light
   ========================================================= */
.theme-light {
  --editor-bg: #ffffff;
  --editor-fg: #24292e;
  --secondary-bg: #fafbfc;
  --secondary-border: #dddddd;
  --line-highlight: #fffbdd;
  --cursor-color: #24292e;
  --n8n-dot-color: rgba(36, 41, 46, 0.12);

  /* Tokens light */
  --token-plain: #24292e;
  --token-comment: #6a737d;
  --token-string: #032f62;
  --token-support: #005cc5;
  --token-keyword: #d73a49;
  --token-entity: #6f42c1;
  --token-tag: #22863a;

  /* Balões WhatsApp em Tema Claro */
  --wa-bubble-out-bg: #d9fdd3;
  --wa-bubble-in-bg: #ffffff;
  --wa-text-color: #111b21;
  --wa-time-color: #667781;
  --wa-sender-user: #0284c7;
  --wa-sender-bot: #008069;
  --wa-sender-specialist: #c2410c;
}

.theme-root {
  background-color: var(--editor-bg);
  color: var(--editor-fg);
}

.editor-bg {
  background-color: var(--editor-bg);
}

.line-highlight {
  background-color: var(--line-highlight);
}

/* =========================================================
   Parte 2: Palavras gigantes cobrindo a tela inteira
   ========================================================= */
.falling-word {
  color: #ffffff;
  font-size: clamp(3.6rem, 16vw, 20rem);
  line-height: 0.82;
  letter-spacing: -0.055em;
  text-transform: lowercase;
}

/* =========================================================
   Parte 3, 4 e 5: Divisória do Livro 3D e Editor Markdown
   ========================================================= */
.rising-divider {
  background-color: var(--secondary-bg);
  border-top: 2px solid var(--secondary-border);
  box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.45);
}

.three-canvas-container {
  touch-action: pan-y;
}

.markdown-editor-panel {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(0.78rem, 1.05vw, 0.94rem);
  line-height: 1.45;
  letter-spacing: -0.02em;
}

.md-hash {
  color: var(--token-keyword);
  font-weight: 800;
}

.md-h1 {
  color: var(--token-support);
  font-weight: 800;
  font-size: 1.15em;
}

.md-h2 {
  color: var(--token-entity);
  font-weight: 800;
  font-size: 1.05em;
}

.md-bullet {
  color: var(--token-keyword);
  font-weight: 800;
}

.md-list-text {
  color: var(--token-string);
  font-weight: 700;
}

.md-p {
  color: var(--token-plain);
  font-weight: 700;
  opacity: 0.9;
}

.md-cursor {
  background-color: var(--cursor-color);
  opacity: 0.8;
  animation: terminal-blink 0.9s steps(2, start) infinite;
}

/* =========================================================
   Parte 6 e 7: Seção n8n (Fundo Pontilhado + @n8n_io/n8n-demo-component + 4 Benefícios)
   ========================================================= */
.n8n-section-divider {
  background-color: var(--editor-bg);
  border-top: 2px solid var(--secondary-border);
  box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.45);
}

.n8n-dotted-bg {
  background-image: radial-gradient(var(--n8n-dot-color) 1.25px, transparent 1.25px);
  background-size: 20px 20px;
}

.n8n-benefit-item {
  border-left: 2px solid var(--secondary-border);
  padding-left: 0.7rem;
}

.n8n-benefit-num {
  color: #ff6d5a;
  font-size: 0.8rem;
}

.n8n-benefit-desc {
  color: var(--editor-fg);
  opacity: 0.78;
  line-height: 1.35;
}

.n8n-workflow-frame {
  background-color: var(--secondary-bg);
  border: 1px solid var(--secondary-border);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

.n8n-demo-element {
  --n8n-workflow-min-height: clamp(185px, 26vh, 235px);
  --n8n-iframe-border-radius: 12px;
}

@media (min-width: 1024px) {
  .n8n-benefit-item {
    padding-left: 0.85rem;
  }

  .n8n-benefit-num {
    font-size: 0.85rem;
  }

  .n8n-benefit-desc {
    line-height: 1.4;
  }

  .n8n-demo-element {
    --n8n-workflow-min-height: clamp(330px, 54vh, 470px);
  }
}

/* =========================================================
   Renderização unificada de Markdown (Case de Sucesso + Rahamim Acamps)
   Reutilizando a paleta de tokens e tipografia editorial do portfólio
   ========================================================= */
.portfolio-markdown :deep(.md-rendered-h1) {
  font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif;
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1.04;
  color: var(--editor-fg);
  margin: 0;
}

.portfolio-markdown :deep(.md-rendered-h2) {
  font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--editor-fg);
  margin: 0;
}

.portfolio-markdown :deep(.md-rendered-p) {
  color: var(--token-plain);
  margin: 0;
}

.portfolio-markdown :deep(.md-rendered-strong) {
  color: var(--editor-fg);
  font-weight: 800;
}

.portfolio-markdown :deep(.md-rendered-code) {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 800;
  display: inline-block;
  padding: 0.1rem 0.42rem;
  margin: 0 0.1rem;
  border-radius: 0.32rem;
  background-color: var(--editor-bg);
  border: 1px solid var(--secondary-border);
  color: var(--token-keyword);
  font-size: 0.92em;
  line-height: 1.25;
  vertical-align: baseline;
}

/* =========================================================
   Parte 8 e 9: Seção Case de Sucesso & Balões WhatsApp (Sem Fundo / Grupo 3 Pessoas)
   ========================================================= */
.case-section-divider {
  background-color: var(--secondary-bg);
  border-top: 2px solid var(--secondary-border);
  box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.45);
}

.portfolio-markdown-case :deep(.md-rendered-h2) {
  font-size: clamp(1.35rem, 3.2vw, 2.75rem);
}

.portfolio-markdown-case :deep(.md-rendered-lead-strong) {
  font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.24;
  font-size: clamp(0.86rem, 1.4vw, 1.25rem);
  color: var(--token-support);
  margin-top: 0.3rem;
  margin-bottom: 0.55rem;
}

.portfolio-markdown-case :deep(.md-rendered-lead-strong .md-rendered-strong) {
  color: inherit;
  font-weight: 800;
}

.portfolio-markdown-case :deep(.md-rendered-p:not(.md-rendered-lead-strong)) {
  border-left: 2px solid var(--secondary-border);
  padding-left: 0.72rem;
  color: var(--token-plain);
  opacity: 0.9;
  font-size: clamp(0.74rem, 0.98vw, 0.95rem);
  line-height: 1.48;
  margin-top: 0.5rem;
}

@media (min-width: 640px) {
  .portfolio-markdown-case :deep(.md-rendered-lead-strong) {
    margin-top: 0.45rem;
    margin-bottom: 1rem;
  }

  .portfolio-markdown-case :deep(.md-rendered-p:not(.md-rendered-lead-strong)) {
    padding-left: 0.9rem;
    line-height: 1.62;
    margin-top: 0.9rem;
  }
}

/* Sem fundo atrás das mensagens: apenas os balões subindo diretamente na página */
.wa-messages-area {
  background-color: transparent;
}

.wa-bubble {
  max-width: 78%;
  border-radius: 7.5px;
  padding: 5px 6px 6px 8px;
  box-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.22);
  font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: 400;
  letter-spacing: normal;
  text-align: left;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.wa-bubble-out {
  background-color: var(--wa-bubble-out-bg);
  color: var(--wa-text-color);
}

.wa-bubble-in {
  background-color: var(--wa-bubble-in-bg);
  color: var(--wa-text-color);
}

/* Cores individuais apenas para o nome de cada participante do grupo */
.wa-sender-name {
  font-size: 12.1px;
  font-weight: 600;
  line-height: 16px;
  margin-bottom: 1px;
}

.wa-sender-user {
  color: var(--wa-sender-user);
}

.wa-sender-bot {
  color: var(--wa-sender-bot);
}

.wa-sender-specialist {
  color: var(--wa-sender-specialist);
}

.wa-first-out {
  border-top-right-radius: 0;
}

.wa-first-in {
  border-top-left-radius: 0;
}

.wa-tail {
  position: absolute;
  top: 0;
  display: block;
  pointer-events: none;
}

.wa-tail-out {
  right: -8px;
  color: var(--wa-bubble-out-bg);
}

.wa-tail-in {
  left: -8px;
  color: var(--wa-bubble-in-bg);
}

.wa-text {
  font-size: 13.45px;
  line-height: 18px;
  color: var(--wa-text-color);
  white-space: pre-wrap;
  word-break: break-word;
}

.wa-spacer {
  display: inline-block;
  vertical-align: middle;
  user-select: none;
}

.wa-spacer-out {
  width: 54px;
}

.wa-spacer-in {
  width: 38px;
}

.wa-meta {
  position: absolute;
  right: 7px;
  bottom: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  pointer-events: none;
  user-select: none;
}

.wa-time {
  font-size: 11px;
  line-height: 14.5px;
  color: var(--wa-time-color);
}

@media (min-width: 640px) {
  .wa-bubble {
    max-width: 65%;
    padding: 6px 7px 8px 9px;
  }

  .wa-sender-name {
    font-size: 12.5px;
    line-height: 17px;
    margin-bottom: 2px;
  }

  .wa-text {
    font-size: 14px;
    line-height: 19px;
  }

  .wa-spacer-out {
    width: 56px;
  }

  .wa-spacer-in {
    width: 38px;
  }

  .wa-time {
    font-size: 11px;
    line-height: 15px;
  }
}

.wa-tick {
  display: inline-block;
  flex-shrink: 0;
}

.wa-tick-gray {
  color: var(--wa-time-color);
}

.wa-tick-blue {
  color: #53bdeb;
}

/* =========================================================
   Parte 10: Seção Rahamim Acamps (Desenvolvimento do Site do Evento)
   ========================================================= */
.rahamim-section-divider {
  background-color: var(--editor-bg);
  border-top: 2px solid var(--secondary-border);
  box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.45);
}

.rahamim-showcase-frame {
  background-color: var(--secondary-bg);
  border: 1px solid var(--secondary-border);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.42);
}

.theme-dark .rahamim-mobile-logo {
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))
    drop-shadow(0 1px 1px rgba(255, 255, 255, 0.55));
}

.theme-light .rahamim-mobile-logo {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
}

.portfolio-markdown-event :deep(.md-rendered-h1) {
  font-size: clamp(1.3rem, 2.6vw, 2.3rem);
}

.portfolio-markdown-event :deep(.md-rendered-h2) {
  color: var(--token-support);
  font-size: clamp(0.8rem, 1.15vw, 1.06rem);
  letter-spacing: -0.03em;
  line-height: 1.22;
  margin-top: 0.2rem;
}

.portfolio-markdown-event :deep(.md-rendered-h2 + .md-rendered-p) {
  color: var(--token-plain);
  opacity: 0.88;
  font-size: clamp(0.71rem, 0.9vw, 0.86rem);
  line-height: 1.38;
  margin-top: 0.25rem;
  margin-bottom: 0.4rem;
}

.portfolio-markdown-event :deep(.md-rendered-step-h2) {
  display: flex;
  align-items: baseline;
  gap: 0.42rem;
  margin-top: 0.38rem;
  margin-bottom: 0;
}

.portfolio-markdown-event :deep(.md-rendered-step-num) {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 800;
  font-size: clamp(0.68rem, 0.8vw, 0.8rem);
  color: var(--token-keyword);
  letter-spacing: -0.04em;
  line-height: 1.1;
  flex-shrink: 0;
}

.portfolio-markdown-event :deep(.md-rendered-step-title) {
  font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif;
  font-weight: 800;
  font-size: clamp(0.76rem, 0.96vw, 0.94rem);
  color: var(--editor-fg);
  letter-spacing: -0.03em;
  line-height: 1.18;
}

.portfolio-markdown-event :deep(.md-rendered-step-h2 + .md-rendered-p) {
  border-left: 2px solid var(--secondary-border);
  padding-left: 0.65rem;
  margin-left: 0.08rem;
  margin-top: 0.12rem;
  color: var(--token-plain);
  opacity: 0.84;
  font-size: clamp(0.69rem, 0.85vw, 0.83rem);
  line-height: 1.34;
}

@media (min-width: 1024px) {
  .portfolio-markdown-event :deep(.md-rendered-h2 + .md-rendered-p) {
    line-height: 1.45;
    margin-top: 0.35rem;
    margin-bottom: 0.7rem;
  }

  .portfolio-markdown-event :deep(.md-rendered-step-h2) {
    margin-top: 0.6rem;
    gap: 0.5rem;
  }

  .portfolio-markdown-event :deep(.md-rendered-step-h2 + .md-rendered-p) {
    padding-left: 0.8rem;
    margin-top: 0.18rem;
    line-height: 1.42;
  }
}

/* =========================================================
   Parte 11: Próxima seção que sobe após o projeto Rahamim Acamps
   ========================================================= */
.final-rising-divider {
  background-color: var(--secondary-bg);
  border-top: 2px solid var(--secondary-border);
  box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.45);
}

/* =========================================================
   Loop invisível de rolagem contínua em tela única
   ========================================================= */
.seamless-single-loop {
  will-change: transform;
  animation: moveSingleCodeLoop 32s linear infinite;
}

@keyframes moveSingleCodeLoop {
  from {
    transform: translate3d(0, 0%, 0);
  }
  to {
    transform: translate3d(0, -50%, 0);
  }
}

/* =========================================================
   Tipografia Extra Bold, compacta e ~15% menor
   ========================================================= */
.code-typography {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 800;
  font-size: clamp(0.58rem, 0.72vw, 0.68rem);
  letter-spacing: -0.045em;
  line-height: 1.08;
}

.hero-typography {
  font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif;
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1.08;
  color: var(--editor-fg);
}

.hero-title {
  font-size: clamp(1.15rem, 2.2vw, 1.82rem);
}

/* =========================================================
   Cores dos Tokens
   ========================================================= */
.token-plain {
  color: var(--token-plain);
}

.token-comment {
  color: var(--token-comment);
  font-style: italic;
}

.token-string {
  color: var(--token-string);
}

.token-support {
  color: var(--token-support);
}

.token-keyword {
  color: var(--token-keyword);
}

.token-entity {
  color: var(--token-entity);
}

.token-tag {
  color: var(--token-tag);
}

/* =========================================================
   Cursor Grosso Estilo Terminal
   ========================================================= */
.terminal-cursor {
  background-color: var(--cursor-color);
  animation: terminal-blink 0.9s steps(2, start) infinite;
}

@keyframes terminal-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>

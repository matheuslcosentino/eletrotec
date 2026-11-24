/* ==========================================================================
   ELETROTEC — CONFIGURAÇÃO CENTRAL DO SITE
   --------------------------------------------------------------------------
   Tudo o que muda de um cliente para outro está aqui.
   Fontes usadas (conferidas em 24/11/2026):
   • Instagram @eletrotec.direcao (bio e posts de dicas)
   • bio.site/eletrotec.com (texto institucional, WhatsApp, endereço)
   • Perfil da Empresa no Google "Eletro Tec" (endereço, horários, nota, avaliações)

   Regras: campos null ou listas vazias ficam ocultos. Use só dados confirmados.
   ========================================================================== */

window.SITE_CONFIG = {
  business: {
    name: 'EletroTEC',
    legalName: null, // razão social / CNPJ, quando informados
    tagline: 'Assistência Técnica Especializada',
    slogan: 'O melhor ao seu alcance!', // bio do Instagram
  },

  contact: {
    whatsapp: { number: '5547996122184', display: '(47) 99612-2184' },
    instagram: { handle: '@eletrotec.direcao', url: 'https://www.instagram.com/eletrotec.direcao' },
    facebook: { label: 'Eletro Tec', url: 'https://www.facebook.com/eletro.tec.23' },
    email: null,
  },

  // Mensagens pré-preenchidas do WhatsApp ({servico} é trocado automaticamente).
  messages: {
    general: 'Olá! Vim pelo site da EletroTEC e gostaria de agendar uma avaliação gratuita.',
    service: 'Olá! Vim pelo site da EletroTEC e gostaria de um orçamento para {servico}.',
  },

  address: {
    street: 'Rua João de Deus Carvalho, 138',
    complement: 'Sala 1 · Comercial KNF',
    district: 'Santo Antônio',
    city: 'Balneário Piçarras',
    state: 'SC',
    zip: '88380-000',
    geo: { lat: -26.7705027, lng: -48.6790179 },
    // Identificador do perfil no Google: abre exatamente a loja no Maps.
    placeId: 'ChIJSZiDRSnT2JQRBOW40E4h0kw',
    mapsQuery: 'Eletro Tec, Rua João de Deus Carvalho, 138 - Sala 1, Santo Antônio, Balneário Piçarras - SC',
  },

  // Horários do Perfil da Empresa no Google. days: 0 = domingo … 6 = sábado.
  hours: [
    { label: 'Segunda a sexta', days: [1, 2, 3, 4, 5], open: '09:00', close: '19:00' },
    { label: 'Sábado', days: [6], open: '09:00', close: '15:00' },
    { label: 'Domingo', days: [0], closed: true },
  ],
  hoursNote: 'Horários podem mudar em feriados.',

  // Nota pública no Google (atualize de tempos em tempos).
  rating: {
    value: '5,0',
    count: 197,
    source: 'Google',
    checkedAt: 'novembro de 2026',
  },

  // Serviços citados pela própria loja (bio do Instagram, bio.site, posts) e em avaliações.
  // part = peça destacada no celular 3D: screen | battery | port | board | back
  services: [
    {
      name: 'Troca de tela',
      topic: 'troca de tela',
      part: 'screen',
      description: 'Tela trincada, manchada, com linhas ou sem toque? Fazemos a avaliação e a troca do display.',
    },
    {
      name: 'Bateria',
      topic: 'bateria',
      part: 'battery',
      description: 'Bateria que descarrega rápido, estufada ou esquentando demais: diagnóstico e troca.',
    },
    {
      name: 'Conector de carga',
      topic: 'conector de carga',
      part: 'port',
      description: 'Não carrega ou só carrega em certa posição? Pode ser sujeira ou oxidação na entrada de carga.',
    },
    {
      name: 'Celular molhado',
      topic: 'celular molhado',
      part: 'board',
      description: 'Desligue o aparelho e não tente carregar. Avaliamos e tratamos a oxidação dos componentes internos.',
    },
    {
      name: 'Software, lentidão e vírus',
      topic: 'software / lentidão',
      part: 'screen',
      description: 'Travamentos, lentidão ou vírus: limpeza, atualização e restauração do sistema.',
    },
    {
      name: 'Notebooks e informática',
      topic: 'notebook',
      part: 'board',
      description: 'Notebook que não liga, está lento ou esquentando: diagnóstico, limpeza interna e reparo.',
    },
    {
      name: 'Videogames',
      topic: 'videogame',
      part: 'board',
      description: 'Console travando, desligando ou superaquecendo: manutenção e limpeza interna.',
    },
    {
      name: 'Acessórios',
      topic: 'acessórios',
      part: 'back',
      description: 'Acessórios para celulares, games e informática. Consulte a disponibilidade pelo WhatsApp.',
    },
  ],

  // Diferenciais (texto do bio.site e temas das avaliações no Google).
  differentials: [
    {
      icon: 'scan',
      title: 'Avaliação gratuita',
      text: 'Traga o aparelho e entenda o defeito antes de decidir pelo conserto.',
    },
    {
      icon: 'shield',
      title: 'Peças originais e garantia',
      text: 'Reparos com peças originais, garantia e cuidado na execução de cada serviço.',
    },
    {
      icon: 'bolt',
      title: 'Consertos rápidos',
      text: 'Agilidade para você ficar o menor tempo possível sem o seu aparelho.',
    },
    {
      icon: 'chat',
      title: 'Atendimento transparente',
      text: 'Explicação clara do problema e do orçamento, do primeiro contato no WhatsApp à entrega.',
    },
  ],

  steps: [
    { title: 'Fale no WhatsApp', text: 'Conte o que aconteceu com o aparelho e combine a avaliação.' },
    { title: 'Avaliação gratuita', text: 'O técnico identifica o defeito, sem custo para você.' },
    { title: 'Orçamento', text: 'Você recebe o valor do reparo e decide se quer seguir.' },
    { title: 'Conserto e retirada', text: 'Reparo com peças originais e garantia. É só retirar na loja.' },
  ],

  // Trechos reais de avaliações públicas no Google (nomes abreviados).
  reviews: {
    enabled: true,
    tags: ['preço', 'honesto', 'confiança', 'equipe'], // temas mais citados nas avaliações
    items: [
      {
        author: 'Cleide C.',
        text: 'Pesquisei, e era o único que estava aberto. Ótimo atendimento! E trocou a tela do meu celular na hora. Ficou muito bom. Parabéns pelo trabalho.',
      },
      {
        author: 'Ana Paula D.',
        text: '…eles foram, disparados, os mais atenciosos, educados e gentis, desde o primeiro contato no WhatsApp, me explicando detalhadamente…',
      },
      {
        author: 'Ivan C.',
        text: 'Excelente! Marquei um horário […] e ele arrumou na hora pra mim. 30 min já estava pronto. Ficou perfeito.',
      },
    ],
  },

  // Dicas publicadas no Instagram da loja.
  tips: [
    {
      icon: 'drop',
      title: 'Celular molhado? Arroz não resolve.',
      text: 'O arroz pode absorver um pouco da umidade, mas não remove a oxidação dos componentes internos. Desligue o aparelho, não tente carregar e leve a uma assistência técnica o mais rápido possível.',
    },
    {
      icon: 'plug',
      title: 'Não carrega? Pode ser oxidação.',
      text: 'Sujeira, umidade e carregadores falsificados podem danificar a entrada de carga. Não force o cabo.',
    },
    {
      icon: 'flame',
      title: 'Esquentando muito? Cuidado.',
      text: 'Apps pesados, carregadores falsos ou problemas na bateria causam superaquecimento. Se continuar, traga para uma avaliação.',
    },
    {
      icon: 'turtle',
      title: 'Celular lento? Faça uma faxina.',
      text: 'Limpe o cache dos apps, apague arquivos desnecessários e reinicie o celular uma vez por semana.',
    },
    {
      icon: 'refresh',
      title: 'Nem sempre é preciso trocar peças.',
      text: 'Muitas falhas se resolvem com reset de software ou atualização do sistema. Antes de descartar o aparelho, procure uma assistência de confiança.',
    },
    {
      icon: 'moon',
      title: 'Carregar embaixo do travesseiro? Não.',
      text: 'O calor acumulado pode superaquecer a bateria e reduzir a vida útil dela.',
    },
  ],

  // Atalhos aceitos nas respostas: {whatsapp} {instagram} {endereco} {horarios}
  faq: [
    {
      q: 'A avaliação é gratuita?',
      a: 'Sim. A EletroTEC faz a avaliação do aparelho sem custo. Agende pelo WhatsApp {whatsapp} ou venha até a loja.',
    },
    {
      q: 'Quais aparelhos vocês consertam?',
      a: 'Celulares, notebooks e videogames, além de outros equipamentos de informática. Na dúvida, mande uma mensagem com o modelo do aparelho.',
    },
    {
      q: 'Vocês usam peças originais e dão garantia?',
      a: 'Sim. Os reparos são feitos com peças originais e têm garantia. As condições são informadas junto com o orçamento.',
    },
    {
      q: 'Quanto tempo demora o conserto?',
      a: 'Depende do defeito e da disponibilidade de peças. Alguns reparos ficam prontos no mesmo dia. Consulte o prazo pelo WhatsApp {whatsapp}.',
    },
    {
      q: 'Meu celular molhou. O que eu faço?',
      a: 'Desligue o aparelho, não tente carregar e não coloque no arroz, porque ele não remove a oxidação. Traga o celular para uma avaliação o quanto antes.',
    },
    {
      q: 'Onde fica a loja e qual o horário?',
      a: 'Na {endereco}. Horário: {horarios}',
    },
    {
      q: 'Vocês vendem acessórios?',
      a: 'Sim, acessórios para celulares, games e informática. Consulte a disponibilidade pelo WhatsApp ou pelo Instagram {instagram}.',
    },
  ],
};

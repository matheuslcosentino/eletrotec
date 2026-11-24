# EletroTEC — Landing page

Site da EletroTEC (assistência técnica e acessórios, Balneário Piçarras – SC), com foco em avaliação gratuita pelo WhatsApp.

O site é **estático** (HTML + CSS + JS), sem build. As bibliotecas vêm de CDN: GSAP 3.13 + ScrollTrigger, Lenis 1.3 e Three.js r170. As fontes vêm do Google Fonts: Space Grotesk, Inter, JetBrains Mono e Doto, que tem o estilo matriz de pontos do "TEC" do logo.

## Como visualizar

Dê dois cliques em `index.html`, ou abra num servidor local:

```bash
python -m http.server 5520
```

Depois acesse `http://localhost:5520`.

> As animações respeitam a opção "reduzir movimento" do sistema. Para pré-visualizar com animação mesmo assim,
> abra `index.html?animacoes=on`.

## Onde editar

Os dados ficam em **`assets/js/config.js`**: contatos, endereço, horários, nota do Google, serviços (com a peça destacada no 3D), diferenciais, etapas, avaliações, dicas e FAQ.

## Destaques

- **Hero:** um celular desenhado em pontos. Na abertura, a tela trincada é "consertada" por uma varredura e acende o "TEC". Os pontos reagem ao cursor.
- **Serviços:** um celular 3D em vista explodida, que se desmonta com a rolagem. O serviço selecionado acende a peça correspondente (tela, bateria, conector, placa ou tampa).
- **Sinal elétrico:** percorre a página como trilha de circuito, com diagonais de 45° e "vias" que acendem. No fim, liga o botão de energia do CTA.
- **Status em tempo real:** "Aberto agora / Fechado · abre às…", calculado pelo horário de Brasília.

## Fontes das informações (conferidas em 24/11/2026)

| Informação | Fonte |
|---|---|
| Logo, texto institucional, WhatsApp, endereço | bio.site/eletrotec.com (link da bio do Instagram) |
| Serviços, slogan, dicas | Instagram @eletrotec.direcao |
| Horários, nota 5,0 (197 avaliações), trechos de avaliações | Perfil da Empresa "Eletro Tec" no Google |
| Foto da bancada | capa do reel "PS4 nunca aberto!" no Instagram |

## Antes de publicar

1. Troque `https://SEU-DOMINIO.com.br` em `index.html` (og:image, og:url e canonical, que estão comentados), em `robots.txt` e em `sitemap.xml`.
2. Confirme com a loja as frases do bio.site que o site repete: "avaliação gratuita", "peças originais" e "garantia".
3. A nota e o número de avaliações do Google mudam com o tempo. Atualize `rating` no `config.js`.
4. O TikTok que aparece no bio.site (@eletro.tec.assist) não existe mais, por isso ficou fora do site.
5. A foto real disponível é pequena (360×640). Fotos da loja e da bancada em alta resolução deixam o site mais forte.

## Publicação

Envie todo o conteúdo da pasta para a hospedagem, exceto `_originais/` e `.claude/`.

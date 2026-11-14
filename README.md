# Diário ABCDEF

App de treino de hipertrofia com registro de séries, programas por metodologia, nutrição, acompanhamento médico e recomendação de treinos por IA (TensorFlow.js).

O projeto tem duas partes que compartilham o mesmo núcleo de IA:

| Parte | O que é |
| --- | --- |
| `app/` | App web em um único HTML, sem servidor. Sai em três versões: app instalável (GitHub Pages, login com Google), artefato no Claude e página simples para o navegador. |
| `backend/` | API em Node.js + Express + TensorFlow.js para recomendação de treinos e substituição de exercícios por limitação. |

## Funcionalidades do app

- **Treino do dia:** semana em blocos, cartão do dia, registro de carga e reps por série, cronômetro de descanso, tela sempre ligada e vibração.
- **Programas:** 32 prontos e criador de programas próprios.
  - *Metodologias:* FST-7, Y3T, DC Training, Heavy Duty, German Volume, Blood & Guts, Rest-Pause, Myo-reps, Superséries, Tri-sets e Giant sets, Drop Sets, Pré-exaustão, 6-12-25, Pirâmide, SST, SuperSlow (TUT), Mountain Dog, Max-OT e HST.
  - *Força:* 5×5, 5/3/1, Periodização ondulatória (DUP) e Cluster Sets.
  - *Divisões:* ABCDEF híbrido, Push Pull Legs, Upper/Lower, Full Body ABC, PHAT, PHUL e Arnold Split.
  - *Outros:* Mobilidade e Condicionamento.
  - *Técnicas* marcadas em cada exercício: TS+BO, FST-7, superséries, bi-set, tri-set, giant set, rest-pause, myo-reps, drop set, drop mecânico, pré e pós-exaustão, 6-12-25, pirâmide, cluster, série 21, 1½, parciais e isometria alongadas, negativas, forçadas, TUT, AMRAP, BFR, SST e falha.
  - A recomendação da IA ainda escolhe entre os 12 programas originais.
- **Ajustes:** volume e intensidade escolhidos pelo usuário; semana do mesociclo com deload.
- **Ferramentas por exercício:** sugestão de carga (dupla progressão), aquecimento, calculadora de anilhas, troca de exercício e recorde pessoal.
- **IA:** recomendação de programa, volume e intensidade a partir do perfil, das limitações e do histórico; troca automática dos exercícios que conflitam com limitações.
- **Evolução:** 1RM estimada, volume semanal por músculo, recordes, peso, medidas e fotos, exportação em CSV.
- **Nutrição:** metas de calorias e macros, ritmo do peso, registro diário de proteína, água e suplementos; guia de suplementos por nível de evidência e registro dos prescritos.
- **Hormônios e peptídeos:** cadastro com o tipo (hormônio, peptídeo ou medicamento) e a molécula. Cada aplicação é registrada com data e hora. O app conta o tempo desde a última aplicação em meias-vidas, estima o nível relativo ao pico (modelo de um compartimento com absorção, somando as aplicações), prevê a próxima aplicação pelo intervalo da receita e avisa no Início antes e depois do horário. A curva mostra o vale previsto; quando ele fica abaixo de 50% do pico, o app sugere levar a curva ao médico. Meias-vidas de bulas e da literatura (cipionato, enantato, undecanoato e propionato de testosterona, mistura de ésteres, nandrolona, oxandrolona, hCG, somatropina, semaglutida, tirzepatida, liraglutida, anastrozol, letrozol, tamoxifeno, cabergolina, clomifeno) ou informadas pelo usuário. A curva traz a contagem dia a dia desde a aplicação (meias-vidas passadas e nível estimado, com a média do ciclo) e o intervalo médio real entre as aplicações; sem intervalo da receita, a próxima aplicação é prevista pela média. Não sugere dose nem intervalo.
- **Cardio no treino:** seção opcional abaixo dos exercícios de cada sessão, com tipo, intensidade, duração, distância, calorias, FC média e máxima, velocidade, inclinação e foto do painel ou do relógio (no Claude, o app lê os números da foto). Histórico em *Evolução > Cardio*, com minutos por semana comparados à meta de 150 min.
- **Salvar e finalizar treino:** botão no fim da sessão com resumo (séries, volume, duração, cardio e recordes); o treino fica marcado como finalizado e pode ser reaberto.
- **Saúde** (aba própria no menu):
  - *Hormônios:* registro de hormônios e medicamentos como estão na receita e conteúdo educativo sobre ergogênicos e riscos.
  - *Exames e colaterais:* laudos com tabela de valores, referência e situação; relato de efeitos colaterais; resumo com perguntas para a consulta.
- **Treinador:** perguntas respondidas pelo Claude com o histórico como contexto.

## Versões do app

| Versão | Onde | Conta | Onde ficam os dados |
| --- | --- | --- | --- |
| **App instalável** | https://lzphellipe.github.io/diario-abcdef/ | Google | Só no celular (`localStorage` + IndexedDB) |
| **Artefato no Claude** | claude.ai | Conta do Claude | Sincronizado pelo Claude entre aparelhos |
| **Página simples** | `app/dist/index.html` | Nenhuma | No navegador, sem fotos nem laudos |
| **App de iPhone** | `mobile/` (Xcode) | Conta local | Só no iPhone |

### App de iPhone (Capacitor)

A pasta `mobile/` empacota o mesmo app como app nativo de iOS (Capacitor 8, Swift Package Manager).

- **Conta local:** no primeiro uso, "Começar neste iPhone" e o cadastro (nome completo, idade, peso, altura). Os dados ficam só no aparelho; o backup sai pela folha de compartilhar do iOS (Arquivos, AirDrop, e-mail). O login com Google no iPhone exige o SDK nativo do Google e fica para uma próxima versão.
- **Abrir no Xcode (Mac):**
  ```bash
  cd mobile
  npm install
  npm run sync      # gera o app web e copia para o projeto iOS
  npm run open      # abre mobile/ios/App/App.xcodeproj no Xcode
  ```
  No Xcode, escolha um iPhone do simulador e clique em Run. Para instalar num iPhone de verdade, selecione seu time em *Signing & Capabilities*.
- **Simulador na nuvem:** o workflow *App iOS (simulador)* compila num Mac do GitHub Actions, roda o app no Simulador de iPhone em modo demonstração (`npm run demo`, com dados fictícios) e publica no branch `ios-simulador` o vídeo, os prints, os logs e o `.app` para simulador.

### App instalável (PWA)

- **Login com Google** (Google Identity Services). O login só identifica a pessoa neste aparelho: não há servidor, e cada conta Google tem seus dados separados no mesmo celular.
- **Cadastro no primeiro uso:** nome completo, idade, peso e altura, com confirmação de que os dados ficam no aparelho. Idade e altura vão para a nutrição; o peso entra no histórico corporal. Editável depois em *Minha conta* (avatar no topo).
- **Dados no celular:** registros em `localStorage`; fotos e laudos em IndexedDB, servidos pelo service worker. O app pede armazenamento persistente ao navegador.
- **Offline:** o service worker guarda o app, as fontes e o TensorFlow.js depois do primeiro acesso.
- **Backup:** exportar e importar um arquivo `.json` com dados, cadastro e arquivos; apagar tudo do aparelho.
- **Instalar:** no Android, menu do Chrome > *Instalar app*; no iPhone, Safari > Compartilhar > *Adicionar à Tela de Início*.

Leitura automática de laudos e o treinador dependem do Claude e aparecem só no artefato. No app instalável, os laudos são guardados e os valores são digitados na tabela de exames.

#### Configurar o login com Google

1. Em https://console.cloud.google.com/apis/credentials, crie um projeto e configure a *Tela de consentimento OAuth* (tipo Externo, escopos padrão `openid`, `email`, `profile`).
2. *Criar credenciais > ID do cliente OAuth > Aplicativo da Web*.
3. Em *Origens JavaScript autorizadas*, adicione `https://lzphellipe.github.io` e, para testar no computador, `http://localhost:8080`. Não é preciso URI de redirecionamento.
4. Copie o Client ID para `app/pwa/config.js` (`googleClientId`), rode `node scripts/build-app.js` e faça o push. O Client ID não é segredo.

Sem Client ID, o app mostra o aviso de configuração; em `localhost` aparece também o botão *Entrar em modo de teste*.

## Estrutura

```
app/
  src/index.html          código-fonte do app (com marcadores para o núcleo de IA)
  pwa/                    camada do app instalável: login, cadastro, service worker, manifesto, ícones, config.js
  dist/pwa/               app instalável gerado (publicado no GitHub Pages)
  dist/index.html         app pronto para abrir no navegador
  dist/artifact.html      mesmo app, só o corpo, para publicar como artefato
backend/
  src/core/coach-core.js  núcleo compartilhado: exercícios, limitações, sinais, modelo e substituições
  src/server.js           API
  model/weights.json      modelo treinado
  test/                   testes (node:test)
scripts/build-app.js      gera app/dist a partir de app/src + núcleo + pesos
.github/workflows/ci.yml     testes e verificação do app gerado
.github/workflows/pages.yml  publica app/dist/pwa no GitHub Pages a cada push na main
.github/workflows/ios.yml    compila o app de iPhone e roda no Simulador (resultado no branch ios-simulador)
```

## Como rodar

App:

```bash
node scripts/build-app.js     # gera app/dist
open app/dist/index.html      # página simples

# app instalável (service worker exige http, não file://)
cd app/dist/pwa && python3 -m http.server 8080   # http://localhost:8080
```

Backend:

```bash
cd backend
npm install
npm test
npm start                     # http://localhost:3000
```

Detalhes da API, do treino do modelo e do Docker em [`backend/README.md`](backend/README.md).

## Fluxo de mudanças

1. Alterou o núcleo de IA (`backend/src/core/coach-core.js`) ou as regras do professor? Rode `npm run train` em `backend/` para atualizar `model/weights.json`.
2. Rode `node scripts/build-app.js` para levar núcleo e pesos para o app.
3. A CI roda os testes e falha se `app/dist` estiver desatualizado.
4. No push para a `main`, o workflow *Publicar app* coloca a nova versão no GitHub Pages. Ao mudar arquivos do app instalável, aumente `VERSION` em `app/pwa/sw.js` para renovar o cache.

## Aviso

O app organiza informações e sugere treinos; ele não substitui treinador, nutricionista ou médico. Limitações de saúde, uso de hormônios e resultados de exames devem ser avaliados por um profissional.

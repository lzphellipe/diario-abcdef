# Diário ABCDEF

App de treino de hipertrofia com registro de séries, programas por metodologia, nutrição, acompanhamento médico e recomendação de treinos por IA (TensorFlow.js).

O projeto tem duas partes que compartilham o mesmo núcleo de IA:

| Parte | O que é |
| --- | --- |
| `app/` | App web em um único HTML, sem servidor. Funciona aberto no navegador ou publicado como artefato no Claude. |
| `backend/` | API em Node.js + Express + TensorFlow.js para recomendação de treinos e substituição de exercícios por limitação. |

## Funcionalidades do app

- **Treino do dia:** semana em blocos, cartão do dia, registro de carga e reps por série, cronômetro de descanso, tela sempre ligada e vibração.
- **Programas:** 12 prontos (ABCDEF híbrido, FST-7, Y3T, DC Training, Heavy Duty, German Volume, Blood & Guts, Push Pull Legs, Upper/Lower, Full Body ABC, Mobilidade e Condicionamento) e criador de programas próprios.
- **Ajustes:** volume e intensidade escolhidos pelo usuário; semana do mesociclo com deload.
- **Ferramentas por exercício:** sugestão de carga (dupla progressão), aquecimento, calculadora de anilhas, troca de exercício e recorde pessoal.
- **IA:** recomendação de programa, volume e intensidade a partir do perfil, das limitações e do histórico; troca automática dos exercícios que conflitam com limitações.
- **Evolução:** 1RM estimada, volume semanal por músculo, recordes, peso, medidas e fotos, exportação em CSV.
- **Nutrição:** metas de calorias e macros, ritmo do peso, registro diário de proteína, água e suplementos.
- **Suplementos e hormônios:** guia por nível de evidência, conteúdo educativo sobre riscos e registro do que foi prescrito pelo médico.
- **Exames e colaterais:** envio de laudos com leitura dos valores, tabela com referência e situação, relato de efeitos colaterais e resumo com perguntas para a consulta.
- **Treinador:** perguntas respondidas pelo Claude com o histórico como contexto.

Recursos que dependem do Claude (sincronização entre aparelhos, envio de arquivos, leitura de laudos, exportação e treinador) aparecem só quando o app é aberto como artefato no Claude. Aberto direto no navegador, o app salva os dados no próprio navegador (`localStorage`) e esconde esses recursos.

## Estrutura

```
app/
  src/index.html          código-fonte do app (com marcadores para o núcleo de IA)
  dist/index.html         app pronto para abrir no navegador
  dist/artifact.html      mesmo app, só o corpo, para publicar como artefato
backend/
  src/core/coach-core.js  núcleo compartilhado: exercícios, limitações, sinais, modelo e substituições
  src/server.js           API
  model/weights.json      modelo treinado
  test/                   testes (node:test)
scripts/build-app.js      gera app/dist a partir de app/src + núcleo + pesos
.github/workflows/ci.yml  testes e verificação do app gerado
```

## Como rodar

App:

```bash
node scripts/build-app.js     # gera app/dist
open app/dist/index.html      # ou sirva a pasta com qualquer servidor estático
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

## Aviso

O app organiza informações e sugere treinos; ele não substitui treinador, nutricionista ou médico. Limitações de saúde, uso de hormônios e resultados de exames devem ser avaliados por um profissional.

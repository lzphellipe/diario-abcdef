# Backend · Coach (Node + TensorFlow.js)

Backend de recomendação de treinos e de substituição de exercícios por limitação.
O mesmo núcleo (`src/core/coach-core.js`) roda aqui e dentro do app Diário ABCDEF, então a recomendação é igual nos dois lugares.

## O que ele faz

| Recurso | Como funciona |
| --- | --- |
| Recomendar programa | Rede neural (TensorFlow.js) com 30 entradas e três saídas: programa (12 opções), volume (reduzido, padrão, alto) e intensidade (moderada, padrão, alta). |
| Sinais do usuário | A partir do histórico: sono e energia médios, adesão, tendência de 1RM estimada, sinais de fadiga, dor relatada e semanas no programa atual. |
| Substituir exercícios | Base com 128 exercícios descritos por músculo, padrão de movimento, equipamento e estresse em 7 articulações. Filtra pelas limitações e ordena por similaridade de cosseno (calculada com tensores). |
| Limitações cobertas | Articulações (ombro, cotovelo, punho, lombar, joelho, quadril, tornozelo), equipamento (só halteres, só máquinas, em casa, sem barra) e condições (hipertensão, hérnia de disco, gestação, pós-operatório). |
| Aprender com o uso | `POST /api/feedback` grava a escolha do usuário; o próximo treino dá peso 5 a cada feedback real. |

### Como o modelo é treinado

Não existe um conjunto público de dados de "programa ideal por pessoa". Por isso o treino usa **destilação de regras**:

1. Um "professor" (`teacher` no núcleo) pontua os 12 programas para um perfil com regras baseadas em evidência: frequência pedida × dias disponíveis, nível mínimo, tempo por sessão, objetivo, preferência por volume ou intensidade, recuperação, limitações e se o programa atual está progredindo ou estagnou.
2. São gerados 15.000 perfis sintéticos (semente fixa), rotulados pelo professor com um pouco de ruído para suavizar as fronteiras.
3. A rede aprende a imitar essas decisões e generaliza para combinações intermediárias. Feedbacks reais do usuário entram por cima e deslocam o modelo para o que ele de fato escolhe.

Concordância com as regras num conjunto de teste sem ruído (1.500 perfis), no último treino:

| Saída | Concordância |
| --- | --- |
| Programa (1ª opção) | 78,9% |
| Programa (entre as 3 primeiras) | 98,1% |
| Volume | 97,5% |
| Intensidade | 98,0% |

O resultado é uma sugestão. Ele não substitui um treinador, e as limitações de saúde sempre pedem liberação do médico ou do fisioterapeuta.

## Rodar

```bash
npm install            # instala express e @tensorflow/tfjs (puro JS)
npm run train          # treina e grava model/weights.json (cerca de 1 min)
npm start              # API em http://localhost:3000
npm test               # 16 testes (núcleo e API)
```

Para treinar mais rápido, instale o backend nativo: `npm install @tensorflow/tfjs-node`. O servidor usa ele automaticamente quando está disponível.

Com Docker:

```bash
docker build -t diario-coach .
docker run -p 3000:3000 -e CORS_ORIGIN=https://seu-dominio -e ADMIN_TOKEN=troque-isto diario-coach
```

Variáveis: `PORT` (padrão 3000), `CORS_ORIGIN` (padrão `*`), `ADMIN_TOKEN` (libera `POST /api/train`), `EPOCHS` e `SAMPLES` (no `npm run train`).

## API

### `POST /api/recommend`

```json
{
  "today": "2026-11-08",
  "profile": { "years": 6, "days": 6, "minutes": 80, "goal": "hipertrofia", "pref": 0.2,
               "limits": ["ombro"], "current": "abcdef", "plannedPerWeek": 6 },
  "sessions": [ { "date": "2026-11-02", "prog": "abcdef", "day": "A",
                  "sets": { "a1": [ { "kg": 100, "reps": 8, "done": true } ] },
                  "notes": { "sleep": 7.5, "energy": 4, "pain": "" } } ]
}
```

`goal`: `hipertrofia`, `forca` ou `saude`. `pref`: de −1 (prefere mais séries) a +1 (prefere séries mais intensas). Em vez de `sessions`, dá para enviar `signals` já calculados.

Resposta: `programs` (12, ordenados por probabilidade, com motivos), `volume`, `intensity`, `settingsReasons`, `signals`, `teacher` (o que as regras sozinhas diriam) e `features`.

### `POST /api/substitutions`

```json
{ "exercise": "Supino reto com barra", "limits": ["ombro", "so_maquinas"], "n": 6 }
```

Resposta: `target`, `status` (se o exercício original é permitido e por quê), `alternatives` (permitidas, com nota e motivos) e `blocked` (bloqueadas e o motivo).

### `POST /api/check`

```json
{ "exercises": ["Agachamento livre", "Cadeira extensora"], "limits": ["hernia"] }
```

Diz quais exercícios da sessão conflitam com as limitações e dá 3 sugestões para cada um.

### Outras rotas

- `GET /health`: estado, backend do TensorFlow e métricas do último treino.
- `GET /api/limitations`: limitações e orientações.
- `GET /api/exercises?q=remada&muscle=Costas`: base de exercícios.
- `POST /api/feedback`: `{ profile, signals, program, volume, intensity }`.
- `POST /api/train`: retreina com os feedbacks (cabeçalho `x-admin-token`).
- `GET /api/model/weights`: pesos atuais no formato que o app usa.

## Estrutura

```
src/core/coach-core.js   núcleo compartilhado (base, limitações, sinais, professor, modelo, substituições)
src/server.js            API Express
src/trainer.js           geração de dados, feedback e avaliação
src/model-store.js       salvar e carregar pesos (JSON)
src/tf.js                escolhe tfjs-node ou tfjs
scripts/train.js         npm run train
model/weights.json       modelo treinado
test/                    testes com node:test
```

## Sobre o app

O app (`../app`) roda num ambiente isolado que não acessa servidores externos quando publicado como artefato. Por isso ele embute o mesmo núcleo (`src/core/coach-core.js`) e os mesmos pesos (`model/weights.json`) e faz a inferência no navegador com TensorFlow.js. Depois de retreinar, rode `node scripts/build-app.js` na raiz do repositório para atualizar o app.

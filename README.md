# Apuração 2026 · São Paulo

[**Abrir o painel**](https://williamccampos.github.io/eleicoes-2026/)

Página HTML independente para acompanhar os resultados oficiais do TSE no **primeiro turno de 04/10/2026**, com fotos dos candidatos.

- Presidente da República: resultado nacional ou votos de São Paulo.
- Governador, senadores, deputados federais e deputados estaduais: São Paulo.
- Consulta automática ao TSE a cada 30 segundos enquanto a página estiver visível, além do botão de atualização manual.
- Horário de geração do arquivo exibido em cada cargo. Consultas novas podem retornar o mesmo resultado, dependendo da divulgação do TSE.
- Busca por nome, número ou partido nas listas de deputados.

Os dados e as fotos são consultados diretamente nos arquivos públicos do [TSE](https://resultados.tse.jus.br/oficial/app/index.html). O painel mostra indisponibilidade quando uma consulta falha e mantém o último resultado recebido com seu horário original. A ordem de votos dos deputados não confirma a eleição: a distribuição de vagas depende do sistema proporcional.

## Hospedagem

O [repositório público](https://github.com/williamccampos/eleicoes-2026) é publicado pelo GitHub Pages a partir da branch `main`, pasta raiz. Basta atualizar `index.html` e enviar a alteração para essa branch. Nenhum computador ou servidor local precisa ficar ligado.

O arquivo `.nojekyll` permite servir a página HTML diretamente. Os arquivos da hospedagem anterior e as capturas de tela locais não fazem parte desta publicação.

Para abrir localmente, execute `python3 -m http.server 8766` na pasta do projeto e acesse `http://localhost:8766/`.

## Segundo turno

Esta publicação permanece no **primeiro turno**. A mudança para o segundo turno será feita quando solicitada, ajustando a configuração da eleição, os cargos aplicáveis, os candidatos e as fotos conforme os arquivos oficiais do TSE. Não há mudança automática de turno.

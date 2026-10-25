# Apuração 2026 · Presidente · Segundo turno

[**Abrir o painel público**](https://williamccampos.github.io/eleicoes-2026/)

Painel independente para o segundo turno presidencial de **25/10/2026**, com os dados e as fotos oficiais do TSE. Consulta o resultado nacional e as 27 unidades da Federação a cada 30 segundos enquanto a página está visível, com atualização manual e retomada ao retornar à página.

## Visualização

- Placar nacional com fotos, votos válidos e percentuais dos dois candidatos.
- Mapa 3D real, com estados extrudados, rotação, aproximação e seleção por clique.
- A cor identifica o candidato que lidera; sua intensidade aumenta com a diferença em pontos percentuais (saturação em 50 p.p.). A altura acompanha o percentual de seções totalizadas.
- Cinza indica ausência de votos válidos ou de dados; amarelo indica empate. Não há atribuição de liderança antes dos primeiros votos.
- Mapa 2D selecionável por teclado, também usado quando o navegador não oferece WebGL.
- Detalhes de cada estado, pesquisa por nome ou sigla e ordenação por apuração ou vantagem.
- Horário original de cada arquivo, avisos de indisponibilidade e preservação do último resultado recebido. Lideranças parciais não confirmam vitória.

O total nacional inclui votos do exterior; o mapa e a tabela mostram os 26 estados e o Distrito Federal. A página exibe somente presidente neste turno.

## Fontes

A configuração da eleição é resolvida em `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json`, selecionando a data `25/10/2026`, turno `2` e cargo `1`. Cada arquivo recebido é validado por eleição, turno, ambiente oficial e abrangência. **Não há fallback para o primeiro turno nem dados de votação fictícios.** Os arquivos podem estar zerados antes da divulgação dos votos.

- [Resultados oficiais do TSE](https://resultados.tse.jus.br/oficial/app/index.html).
- [Malha simplificada oficial do IBGE](https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&formato=application/vnd.geo%2Bjson&qualidade=minima), obtida em 25/10/2026 e servida localmente em `assets/brasil-uf-ibge.geojson`.
- [Three.js](https://threejs.org/) 0.186.1, distribuído localmente em `assets/vendor/`, com licença MIT preservada em `THREE-LICENSE.txt`. Não depende de CDN para carregar o mapa.

## Hospedagem e execução local

O [repositório público](https://github.com/williamccampos/eleicoes-2026) usa GitHub Pages: branch `main`, pasta raiz, com `.nojekyll`. Os arquivos `index.html`, `styles.css`, `app.js`, `data.js`, `map.js` e a pasta `assets/` devem ser publicados juntos. Não há etapa de build nem servidor de aplicação.

Para executar localmente: `python3 -m http.server 8766`, depois abra `http://localhost:8766/`. Módulos JavaScript precisam de HTTP; abrir o HTML com `file://` não é suficiente.

O projeto Sites mantém a mesma aplicação estática em `painel/dist/client/`, com acesso independente do repositório público. A pasta `painel/`, as credenciais da hospedagem e as capturas de tela locais não são publicadas no GitHub. A versão do primeiro turno permanece no histórico Git.

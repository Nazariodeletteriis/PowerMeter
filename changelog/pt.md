# Changelog (pt)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

## 0.3.7

- Alterado: Recluta, Daeva e o teste gratuito funcionam em 1 PC por conta, Empyrean em 2; ao mudar para um plano com menos PCs, os registrados primeiro mantêm o acesso.

## 0.3.6

- Corrigido: a página Supporter não deixa mais a janela preta quando o painel de administração lista usuários; se uma página falhar, mostra o erro com Tentar novamente em vez de uma janela preta.

## 0.3.5

- Novo: monstros que ficam dentro de uma masmorra mostram o mapa do mundo com a entrada da masmorra e um link para ela, e os monstros da camada Illusion Curtain de Verteron agora aparecem no mapa de Verteron.

## 0.3.4

- Novo: planos de Apoiador no Patreon (Recluta 3 €, Daeva 7 €, Empyrean 15 € por mês). O medidor e a maioria das abas continuam gratuitas; Banco de dados, Relatório de combate, Logs online e Classificações exigem Recluta, Grupo e rotações, Crafting e Calculadoras exigem Daeva. As abas bloqueadas ficam no menu com um cadeado e uma prévia desfocada.
- Novo: teste grátis de tudo por 14 dias, uma vez por conta do Discord: entre com o Discord para começá-lo.
- Novo: um plano funciona em até 2 PCs por conta (um PC libera a vaga após 30 dias sem uso) e o teste gratuito é um por pessoa, vinculado à conta do Discord e ao PC.
- Novo: página do Apoiador: seu plano e de onde ele vem, vincular ou desvincular o Patreon, e os planos lado a lado.
- Novo: Builds da comunidade mostra as builds da comunidade vindas do questlog.gg, com filtros de classe, tag, região e busca; abra qualquer uma no Character Builder e duplique-a para torná-la sua.
- Novo: os cards de NPCs, monstros e masmorras mostram um minimapa de onde eles estão, e os cards de missão mostram onde estão quem dá a missão, os alvos, o NPC de entrega e a masmorra. Adicionados os mapas de Poeta, Ishalgen, Eltnen e Morheim.
- Alterado: "Suas builds" lista apenas as builds que você criou ou duplicou; "Curtidas" agora se chama "Favoritas" e permanece após reiniciar.
- Alterado: os mapas carregam apenas a parte que você está vendo.

## 0.3.3

- Novo: NPCs e monstros do banco de dados mostram seus pontos de spawn no mapa (Ver no mapa), para Verteron, Altgard e Reshanta.
- Alterado: a build principal agora é por personagem e não por classe: dois personagens da mesma classe têm equipamentos separados. Até um personagem editar a sua, ele parte da build compartilhada anterior.
- Alterado: os cards em Meus personagens mostram o Gear Score da build principal do personagem (atual / objetivo, os mesmos números do Character Builder) em vez de um CP sempre vazio; a barra superior também não o mostra mais.
- Corrigido: uma build aberta pelo card de um personagem usa o Arcana e o Daevanion desse personagem, não os do ativo.

## 0.3.2

- Corrigido: em Meus personagens o card inteiro do personagem abre a build dele (antes só o nome, sem nenhuma indicação visual).
- Corrigido: o medidor segue o personagem com que você está jogando de verdade, lido do jogo; ativar um personagem em Meus personagens não muda mais quem o medidor acompanha.

## 0.3.1

- Novo: Antes de começar: os Termos e condições e a Política de privacidade completos (inglês, italiano, alemão, francês, espanhol, português, russo) precisam ser aceitos antes que o PowerMeter leia qualquer dado de combate. Quem já usa o app os aceita uma vez na próxima inicialização.
- Alterado: "Abrir widget" agora se chama "Iniciar DPSMeter".
- Alterado: os modos do medidor aparecem como BOSS, TRAIN, PVE, PVP, nesta ordem, no medidor, no Histórico de combates e nas Configurações.
- Alterado: clicar no nome de um personagem em Meus personagens abre a build dele sem mudar o personagem ativo.
- Alterado: a janela de atualização agrupa as notas de versão por tipo (novo, alterado, corrigido) e ficou mais fácil de ler.
- Corrigido: o Gear Viewer mostrava a maioria das peças duas vezes (o mesmo item existe uma vez por facção); agora cada peça aparece uma só vez.
- Corrigido: o cabeçalho da build mostrava contadores fictícios de curtidas e comentários em vez das curtidas reais da build.

## 0.3.0

- Novo: Registos online: os combates que enviou, com link, visibilidade alterável (público, não listado, privado), visualizações, posição na classificação e eliminação.
- Novo: Estatísticas de classes: DPS médio por classe em cada chefe, classes mais jogadas e tendência semanal, a partir dos registos públicos da comunidade. O mesmo combate enviado por vários membros do grupo conta só uma vez.
- Novo: Visualizador de equipamento: todas as peças de equipamento com filtros, pesquisa e estatísticas ordenáveis. Selecione itens para os fixar no topo ou compará-los, com seta verde no melhor valor e vermelha no pior.
- Novo: Armaria: pesquise personagens por região, facção, servidor e classe, veja os perfis populares, as classificações e a ficha completa de um personagem (EU/NA assim que estiverem disponíveis).
- Novo: Festival Shugo: contagem decrescente ao vivo para a próxima ronda, os seus minijogos, as rondas seguintes e um planeador da loja do festival com as fichas que lhe faltam.
- Novo: Fenda Espaço-Temporal: contagens decrescentes do portal e da fenda, o horário de 24 horas e a rota da sua facção.
- Novo: Calculadoras: estatísticas e Gear Score de uma peça entre dois níveis de melhoria com a qualidade do soul imprint, bónus das estatísticas primárias e probabilidade Splendent de uma receita.
- Novo: Mercado (substitui a Lista de compras): pesquisa de itens e lista de seguimento; preços, tendências e estatísticas aparecerão quando existir uma fonte de dados de mercado para EU/NA.
- Novo: Criação passo a passo: cada passo mostra o item exato que usa, os resultados Normal e Splendent e qual o passo seguinte precisa; no último nível escolha entre melhorar a peça normal e criar até obter Splendent.
- Alterado: o Flow Map é substituído pelo Festival Shugo; Registos online e Estatísticas de classes explicam para que servem.
- Corrigido: asas, títulos e mascotes na base de dados mostram os bónus que dão.

## 0.2.14

- Novo: separador PvE no medidor para farm de mobs. O dano soma-se em todos os mobs que atinge, mesmo depois de morrerem, e reinicia após 5 minutos sem atingir mobs, ao mudar de zona ou com Repor.
- Novo: Chefe, PvE, Train e PvP estão separados: cada golpe conta só no separador do seu tipo de alvo. O widget mostra sempre o que está a registar (tipo e nome do alvo), e os combates guardados vão para o seu separador, com um filtro por modo no Histórico.
- Novo: Cura recebida por jogador (própria e de outros) e Aggro (golpes recebidos dos mobs; Templário e Gladiador marcados como TANK; uma estimativa, indicada como tal, até os mobs atingirem alguém).
- Novo: Criação: todos os itens criáveis com as armas primeiro, a cadeia de melhoria do primeiro ao último nível, a árvore de receitas e os materiais para a quantidade escolhida com Tens e Faltam, guardados.
- Alterado: o dano é mostrado por inteiro em todo o lado (widget, janela de detalhes, medidor e relatório do painel), sem arredondamento K/M.
- Corrigido: o medidor já não para de contar quando um mob se move (era tomado por um jogador), e o separador Chefe mostra só chefes.
- Corrigido: bloquear o widget já não esvazia a lista de jogadores; Build e Lobby continuam visíveis quando bloqueado.
- Corrigido: o widget mostra os ícones da build guardada, mesmo depois de a criar ou renomear.
- Corrigido: Enviar no widget envia o combate que acabou de terminar, pede para entrar com o Discord se necessário e avisa quando um combate de treino não pode ser enviado.

## 0.2.13

- Novo: os personagens têm uma facção (Elyos ou Asmodian). Escolha-a ao adicionar um personagem, ou no cartão de um existente; aparece no Início e no Character Builder.
- Novo: o relatório de combate mostra os seus combates guardados: tentativas no mesmo chefe, visão geral, habilidades, gráfico de DPS, linha do tempo, dano recebido, cura e Comparar. Clicar num combate no Histórico ou no Início abre-o no relatório.
- Novo: Exportar no relatório de combate guarda o combate inteiro, que pode ser carregado de novo em Histórico de combates → Enviar → De ficheiro.
- Novo: a Análise de grupo mostra os jogadores, as habilidades e as rotações de abertura do seu último combate.
- Alterado: todos os dados de exemplo foram removidos antes do lançamento. As páginas que ainda não têm nada para mostrar (classificações, builds da comunidade, comentários, notícias, atividades, cura e aggro no medidor, lobby do widget) mostram um estado vazio.
- Alterado: Partilhar só dá um link real, depois de enviar o combate a partir do Histórico.
- Alterado: as definições ainda não disponíveis aparecem desativadas e marcadas "Em breve".
- Corrigido: o equipamento da sua build principal guardado em versões anteriores é mantido.

## 0.2.12

- Novo: Enviar no Histórico de combates abre uma janela para enviar os combates selecionados ou um arquivo salvo com Exportar, e permite entrar com o Discord a partir dali.
- Novo: renomeie uma build que você criou ou clonou e salve-a; botões Editar e Excluir nas suas builds, com uma janela de confirmação.
- Novo: os atributos das asas mostram os bônus da asa equipada além dos da coleção.
- Alterado: asas, títulos e mascotes sem atributos voltam a aparecer na lista, depois dos demais, marcados como "Sem atributos".
- Alterado: Suas builds só lista as builds que você criou ou clonou.
- Corrigido: Baixar Npcap inicia o instalador novamente (agora ele pede permissões de administrador em vez de falhar silenciosamente).

## 0.2.11

- Novo: os atributos do Character Builder são reais e em tempo real: atributos base da classe, equipamento (Magicstones e todos os outros slots), Daevanion, coleções e títulos, calculados da mesma forma que o questlog. A vista Alvo mostra a mudança em cada atributo.
- Novo: coleções de Pantheon, Arcana e Genus Insight, com seus atributos no builder.
- Novo: habilidades e missões no banco de dados mostram a página em inglês e, abaixo dela, a mesma página no seu idioma (o italiano é uma tradução não oficial).
- Novo: exclua as builds que você criou ou clonou; suas builds e seus nós de Daevanion são mantidos após um reinício.
- Novo: novo ícone do Windows.
- Alterado: o Gear Score é calculado da mesma forma que o questlog (aprimoramento, avanço, Magicstones, Theostone, Arcana, pontos de Daevanion).
- Alterado: uma build só pode ser clonada para um personagem da mesma classe.
- Alterado: um único botão Voltar: para a build a partir de Peças faltando, e para o Character Builder nos demais casos.
- Corrigido: Enviar no Histórico de combates envia os combates selecionados.
- Corrigido: asas e títulos equipados dão seus bônus; asas e títulos sem atributos não são mais listados; o poder de voo não está mais inflado.
- Corrigido: o visual de manopla e as asas do Brawler ficam ocultos até o Brawler ser lançado em EU/NA.

## 0.2.10

- Novo: coleções no Character Builder (visuais, mascotes, asas, monólito, títulos) com os totais reais de atributos; um personagem novo começa do 0. Genus Insight, Pantheon e Arcana chegam numa atualização dedicada.
- Novo: atributos reais dos itens no Character Builder (base, aprimoramento, avanço, linhas de impressão de alma), Magicstones, Theostones e Pedras filosofais reais, e Gear Score calculado pelas suas peças.
- Novo: na página de um item, Adicionar à build o coloca no seu equipamento atual e Adicionar ao alvo no equipamento alvo.
- Novo: Comparar e Exportar no relatório de combate; Exportar no Histórico de combates.
- Alterado: o slot da mão secundária é a Guard para todas as classes; o controle de Potencial foi removido; o Combat Power não é mais mostrado com números inventados.
- Corrigido: o widget de build mostra os ícones dos itens.
- Corrigido: Peças faltando conta todos os slots (inclusive braceletes); Atual mostra vazia uma build vazia; Voltar à build retorna à build em que você estava trabalhando.
- Corrigido: as barras de curas, dano recebido e alvos do relatório de combate usam a escala do combate inteiro, e o contador de tentativas muda entre as tentativas.
- Corrigido: os retratos de Build community mostram o rosto do personagem.

## 0.2.9

- Novo: todo o banco de dados do jogo está no app (itens, NPCs, missões, masmorras, habilidades, receitas, títulos, conquistas, mascotes, asas e mais) com detalhes reais, links entre entradas e busca com Ctrl+K.
- Novo: aba PvP no DPS Meter: o dano causado por você e seu grupo a outros jogadores.
- Novo: Character Builder refeito: cada slot oferece só itens do seu tipo, controles deslizantes e menus de atributos funcionando, equipamento atual e alvo reais, peças faltando, Comparar, Widget e Compartilhar (Discord).
- Novo: Build community mostra 12 builds por página; Suas builds e Curtidas funcionam.
- Alterado: o arquivo do programa agora se chama PowerMeter.exe.
- Alterado: o chip do personagem no topo é um botão simples que abre Meus personagens.
- Corrigido: exportar personagens salva o arquivo em Downloads.
- Corrigido: cada aba do relatório de combate (linha do tempo de habilidades e buffs, dano recebido, curas, alvos) segue o intervalo selecionado.
- Corrigido: o equipamento padrão e as listas de builds seguem a classe do seu personagem.

## 0.2.8

- Novo: Meus personagens funciona: adicione, importe, exporte, duplique e exclua personagens, e escolha o ativo. Trocar de personagem atualiza todo o painel (builder, Skill Planner, Daevanion).
- Novo: o Daevanion Planner mostra os tabuleiros reais da classe do seu personagem.
- Novo: ícones reais de itens no builder, páginas de item, busca e início.
- Novo: mapa-múndi interativo com marcadores reais (dados: aion2-interactive-map, CC BY-NC 4.0).
- Novo: escolha de tags ao criar uma nova build.
- Alterado: as abas do DPS Meter agora são Boss, Train e PvP.
- Alterado: só EU e NA são exibidas; o Brawler fica oculto até ser lançado no Ocidente.
- Corrigido: trocar de aba no DPS Meter não volta mais para Boss.
- Corrigido: selecionar um intervalo no relatório de combate atualiza as estatísticas abaixo.
- Corrigido: abas e filtros dos rankings e números de página de Build community funcionam.

## 0.2.7

- Corrigido: as notas da versão na janela de atualização agora aparecem no idioma escolhido para o PowerMeter.

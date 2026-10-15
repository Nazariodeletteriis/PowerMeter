# Changelog (pt)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

## 0.5.12

- Corrigido: Sua própria linha não mostra mais um número (#6653) no lugar do seu nome depois do reset automático entre dois chefes: o PowerMeter segue seu novo id mesmo quando o jogo não reenvia seu nome.
- Corrigido: Avisos de eventos: cada Shugo e cada chefe mundial tem seu próprio aviso 10 minutos antes, também quando vários começam com um minuto de diferença (uma linha cada); fechar um aviso não esconde mais os próximos, e se o carregamento falhar tenta de novo após um minuto em vez de uma hora.

## 0.5.11

- Alterado: Widget: a barra superior, a linha do chefe e o rodapé ficam opacos; a opacidade agora só deixa transparente a lista de jogadores, assim os botões continuam legíveis sobre um jogo claro.

## 0.5.10

- Corrigido: O widget ficava em "Não conectado" / "nenhum pacote" mesmo depois que o PowerMeter se conectava ao jogo: agora acompanha a conexão a cada poucos segundos.

## 0.5.9

- Novo: Quando o PowerMeter não consegue se conectar ao jogo, o widget diz o motivo (nenhum pacote dos adaptadores de rede, nenhum pacote do jogo, janela do jogo não reconhecida…) e "Copiar diagnóstico" copia um relatório para colar no Discord.
- Corrigido: Wi-Fi: os adaptadores de rede não são mais abertos em modo promíscuo, que em muitos drivers Wi-Fi não capturava nada.
- Corrigido: Adaptadores de rede que marcam os pacotes (Killer e outros adaptadores gaming) agora são lidos.
- Corrigido: O aviso "não conectado" nunca aparecia: o widget confundia "sem porta" com uma porta.
- Alterado: Widget: o Reset fica no rodapé, embaixo à esquerda.

## 0.5.8

- Novo: Widget redesenhado: abas DPS / HEAL / AGGRO, nome do chefe com barra de HP, linhas de classificação com barras de DPS na cor da classe. O layout Compacta segue o mesmo estilo.
- Alterado: Os layouts do widget agora são apenas "Interface" e "Compacta". Os layouts Clássicos foram removidos: se você usava um, passa para o novo layout correspondente.
- Corrigido: O PowerMeter encontra o jogo mesmo quando a janela tem outro título (por exemplo "AION 2"): reconhece-o pelo programa.
- Corrigido: Npcap instalado sem o modo "WinPcap API-compatible" agora funciona; se o Npcap não iniciar, o widget avisa.
- Corrigido: Adaptadores de rede ligados depois do início (VPN, ExitLag, Wi-Fi após suspensão) são capturados sem reiniciar, e o medidor não fica mais preso numa conexão morta.
- Corrigido: Mapa do mundo: marcadores e limites de zona estavam de cabeça para baixo (cubos asmodianos no mar). Agora ficam em terra em todos os mapas.
- Alterado: Supporter: os três planos do Patreon desbloqueiam tudo; mudam apenas o período de cobrança e o desconto.

## 0.5.7

- Novo: Construtor de personagem: aba Mascote: sua coleção de mascotes como na janela Mascote do jogo (categorias, nível, progresso x/75, MAX), aberta com "Mostrar mascotes". O PowerMeter a lê do jogo no login; você também pode marcar mascotes à mão. A contagem é igual à do jogo (mascotes Special excluídos).
- Corrigido: Construtor de personagem: um item equipado ausente dos dados de itens (como o escudo do Clérigo) fica no seu slot em vez de sumir.
- Corrigido: Trocar de personagem no jogo agora troca toda a aba Personagem, construtor incluído, não só o cabeçalho.

## 0.5.6

- Novo: Relatório de combate: o dano de cada golpe agora é registrado, então um intervalo de tempo selecionado mostra o dano real de cada habilidade, não uma estimativa (a partir dos próximos combates).
- Novo: Treinador também no widget, Beta compacto incluído: o ícone de alvo no rodapé.
- Novo: Treinador: o botão Recomeçar refaz a contagem regressiva e o reset.
- Corrigido: Seu personagem é reconhecido mesmo quando o PowerMeter inicia com você já no jogo: nada de número no lugar do seu nome.
- Corrigido: Treinador: volta a medir (ficava vazio) e o widget não o devolve mais para PVE.
- Corrigido: "Só o meu DPS" no widget agora esconde os outros jogadores.
- Corrigido: Widget Beta compacto: a barra superior fica legível com o mouse em cima (mostrava só "I").

## 0.5.4

- Novo: Medidor DPS: modo Treinador: contagem 3-2-1 e depois o seu DPS apenas no boneco de treino.
- Novo: Opção "Só o meu DPS" no rodapé do widget e no Medidor DPS: esconde todos os outros.
- Novo: Histórico de combates: os testes no boneco são salvos como combates próprios, poucos segundos depois de parar.
- Novo: Widget Beta compacto: barras de DPS animadas, linhas mais limpas e botão Reset no rodapé.
- Corrigido: O Reset não transforma mais os companheiros em números: nomes e classes ficam.
- Corrigido: Ao trocar o layout do widget, nomes e classes aparecem na hora, nunca um número.
- Corrigido: Layout Classic e histórico do widget: faltavam os ícones das classes.
- Corrigido: Relatório de combate: clicar em um nome seleciona esse jogador, e o intervalo de tempo não pisca mais ao arrastar.

## 0.5.3

- Novo: Painel de administração dentro do app: os administradores o abrem em Configurações. O painel web não existe mais.
- Corrigido: Itens sem ícone (como Wrathful Mind) agora o mostram, a partir dos ícones oficiais do jogo.
- Corrigido: Masmorras: os cartões de Conquista não ficam mais sempre vermelhos: são desbloqueados com o Gear Score do seu personagem.
- Alterado: Masmorras: uma masmorra só abre quando seu Gear Score a desbloqueia; as bloqueadas continuam fechadas.

## 0.5.2

- Novo: Os administradores abrem o novo painel de administração web na página Supporter.
- Novo: Uma conta suspensa vê uma mensagem clara ao iniciar sessão.
- Alterado: A app envia a sua versão ao servidor PowerMeter, para saber que versões estão em uso.

## 0.5.1

- Alterado: Crafting mais simples: o item escolhido com os materiais ao lado, abaixo apenas o próximo passo com os seus materiais e depois a tabela dos materiais necessários e dos que você tem.
- Alterado: Crafting: a lista de itens é mais larga e legível.
- Alterado: Crafting: as quantidades que você tem são um único inventário por personagem, válido para todos os itens.

## 0.5.0

- Novo: Criação refeita: separadores Alchemy, Blacksmithing, Cooking, Armorsmithing e Handicrafting, cada um com as suas subcategorias.
- Novo: Árvore de criação: escolhe um item e vê toda a sua cadeia, da base ao último passo, com todos os materiais; começa num item intermédio para ver o resto da cadeia.
- Novo: Inventário de criação: introduz os materiais que já tens e marca os passos que fabricaste; são descontados do que ainda falta e guardados por personagem.
- Novo: Widget: separadores DPS, HEAL e AGGRO: dano, cura feita e dano sofrido de cada jogador.
- Novo: Widget: o botão Copiar copia o combate como imagem: cola-a no Discord com Ctrl+V.
- Novo: Builder: o teu Gear Score e Combat Power reais, lidos do jogo.
- Novo: Masmorras: desbloqueadas pelo Gear Score do teu personagem, com o que falta para as bloqueadas.
- Novo: Builder: secções Pet, Wings, Pantheon, Achievements e Closet (em breve).
- Alterado: O histórico de combates (widget e dashboard) mostra os últimos 10 combates, com um botão para mostrar mais 10.
- Alterado: Widget: os separadores Build e Lobby foram removidos.
- Corrigido: Widget: mudar de separador já não altera o tamanho do widget.

## 0.4.9

- Novo: Funções: todos começam como Player com 30 dias de teste completo (login Discord e uma conta Discord com pelo menos 8 meses); depois Party, rotações e Gear Viewer ficam para os planos. Os planos Patreon chegam em breve.
- Novo: Página de masmorras refeita: cartões Exploration e Conquest com requisitos, recompensas e drops.
- Novo: Builder: a barra de habilidades aparece como no jogo, cada conjunto com as habilidades encadeadas sobre cada espaço (estigmas incluídos).
- Novo: Widget: botão Copiar para o DPS do combate, pronto a colar no Discord.
- Novo: Widget: volume do aviso de eventos nas definições.
- Novo: Depois de trocar de personagem, uma dica sugere um teletransporte para a atualizar.
- Corrigido: Trocar de personagem troca todo o perfil, Builder e Daevanion incluídos.
- Corrigido: Redimensionamento do widget: sem bordas transparentes a bloquear o jogo, tamanho guardado, o ícone minimizado pode ser arrastado.
- Corrigido: Um Npcap já instalado é reconhecido: sem pedido para o reinstalar.
- Corrigido: Missões: a lista já não começa com missões sem nome.
- Alterado: Logs de pacotes e de depuração só para as funções Debugger e Admin.
- Alterado: Calculadoras e Armory removidos.
- Alterado: Termos e privacidade atualizados: vais ter de os aceitar de novo.

## 0.4.8

- Novo: Builder: cada deus do separador Daevanion mostra o seu tabuleiro em pequeno, com os nós que escolheste; a lupa amplia-o.
- Corrigido: A barra de cima segue a personagem para a qual mudas no jogo (o título da janela do jogo trazia de volta a anterior).
- Corrigido: Builder: a tua barra de habilidades é lida quando entras no mundo, não só quando a mudas.
- Corrigido: Base de habilidades e Daevanion: cada habilidade mostra o seu ícone.

## 0.4.7

- Novo: Relatório: Inspecionar mostra o equipamento dos outros jogadores do combate (arma, armadura, colar, brincos, com aprimoramento).
- Novo: Builder: o teu Daevanion vem do jogo, pontos por deus; clica num deus para ver as suas habilidades Daevanion.
- Novo: Builder: a aba Habilidades mostra a tua barra de habilidades no jogo, por personagem.
- Novo: Builder: os níveis de aprimoramento (+N) são lidos do jogo.
- Novo: O aviso de eventos do widget toca o som do Temporizador, se o ativaste.
- Corrigido: Widget: «DPS médio por classe» mostra o combate no medidor em vez de números fixos.
- Corrigido: Runas e amuleto agora aparecem no equipamento lido do jogo.
- Corrigido: Relatório e Base de habilidades: ícones para muitas mais habilidades (dano ao longo do tempo, Teopedras, habilidades renomeadas); todas as habilidades do jogo estão listadas.
- Corrigido: Widget: mais espaço entre o aviso de eventos e a barra do chefe.
- Corrigido: Ícones do Cantor e do Templário nas cores da sua classe.
- Corrigido: A guarda do Patrulheiro fica no espaço da mão secundária.

## 0.4.6

- Corrigido: Builder: o equipamento volta a ser lido ao entrar no mundo (um pacote grande do login era descartado e o equipamento atual ficava vazio).
- Corrigido: O equipamento vai para a personagem que estás a jogar: ao trocar de personagem já não fica na anterior.
- Corrigido: O equipamento lido do jogo agora mostra os ícones dos itens.

## 0.4.5

- Novo: Builder: o teu equipamento atual vem do jogo (lido ao entrar e a cada troca), com atributos e níveis de aprimoramento.
- Novo: O widget avisa 10 minutos antes de um evento (fenda, chefes do mundo, Festival Shugo, resets) com contagem regressiva.
- Corrigido: Relatório: só jogadores reais, com os nomes como nos registos; sem linhas cinzentas com números.
- Corrigido: Uma personagem já na tua lista é reconhecida mesmo com o nome escrito de forma ligeiramente diferente: já não pede para a criar de novo.
- Corrigido: Itens: o escudo aparece como mão secundária para todas as classes.

## 0.4.4

- Novo: O medidor muda de modo sozinho: BOSS num chefe, PVP contra jogadores, PVE para todo o resto.
- Alterado: TRAIN deixa de existir: os bonecos de treino contam como PVE, no widget e no painel.
- Novo: Botão RESET sempre visível no widget, ao lado do seletor de modo.
- Novo: As mortes de chefes são enviadas automaticamente (com sessão iniciada, desativável nas Configurações); as páginas de log mostram só nomes de personagens.
- Novo: Rankings (maior golpe, kill mais rápido, DPS do grupo) e os melhores jogadores de cada classe em Estatísticas de classes.
- Novo: Aba Rotação no Relatório; o Relatório abre o teu último chefe com a masmorra e Chefe 1/2/3.
- Novo: Histórico agrupado por masmorra, com um filtro Masmorra real.
- Novo: O Skill Planner preenche a barra de habilidades a partir do jogo; passivas por pontos, nível 1–20.
- Novo: Builder com o equipamento atual e o desejado e a diferença de atributos.
- Novo: Filtros de itens (categoria, slot, grau, nível, troca, facção, fonte, classe); o Gear Viewer pode selecionar, comparar e fixar.
- Corrigido: O widget já não congela ao mudar de modo, e a barra STAGGER atualiza sem dano novo.
- Corrigido: Pacotes perdidos recuperados e menor latência: o medidor acompanha o combate em tempo real.
- Alterado: Marketplace removido.

## 0.4.3

- Novo: Quando há uma atualização, ao abrir a app aparece uma janela com os botões Atualizar agora e Notas da versão.

## 0.4.2

- Novo: Barra STAGGER por baixo da barra de vida do chefe no widget, com o valor real: desce com os teus golpes e mostra quando o chefe está quebrado.
- Corrigido: O widget e as suas Definições seguem o idioma escolhido (na app instalada ficavam em inglês).
- Corrigido: Reset diário e semanal às 07:00 UTC, mostrados na tua hora local.
- Corrigido: A tua vida já não se mistura com a dos monstros.

## 0.4.1

- Alterado: Novo design do widget DPS Meter: botões maiores e mais fáceis de clicar, barra do chefe e linhas dos jogadores mais claras com ícones de classe.
- Novo: Vista do DPS médio por classe no widget, a partir do botão ao lado do cadeado.

## 0.4.0

- Novo: Base de dados: pesquisa, itens, NPCs e monstros com os seus drops e um botão Mapa que mostra onde estão, missões, masmorras, crafting e habilidades, com os dados do jogo.
- Novo: Gear Viewer com os dados do jogo.
- Novo: Temporizadores: 9 eventos recorrentes na tua hora local, com contagem decrescente e som opcional.
- Novo: Daevanion Planner: os tabuleiros Daevanion do jogo, escolhe os nós e vê as estatísticas e níveis de habilidade que dão.
- Novo: Character Builder: estatísticas base, níveis de melhoria e uma estimativa de CP e DPS da build.
- Alterado: o PowerMeter é descrito em todo o lado como um projeto amador não oficial feito para a comunidade de Aion 2.
- Corrigido: o jogo é detetado de forma fiável quando é iniciado a partir do Purple.
- Corrigido: o DPS e o dano já não ficam negativos com ataques de vários golpes muito fortes.
- Corrigido: as curas de um curandeiro que ainda não usou uma habilidade no combate já não se perdem.
- Corrigido: em Os meus personagens, clicar num personagem abre diretamente a sua build no Character Builder.
- Corrigido: o Character Builder já não mostra gostos nem respostas que não existem: uma build começa em 0.
- Corrigido: a ficha de um monstro já não está vazia, e o botão Mapa abre o seu mapa numa janela.
- Corrigido: o Gear Viewer mostra cada peça uma vez em vez de duas.
- Corrigido: Masmorras lista todas as masmorras, cada uma uma vez.

## 0.3.9

- Alterado: Termos atualizados: em Recluta e Daeva, o Banco de dados, o Gear Viewer, o assistente de criação e a calculadora estão incluídos quando houver dados oficiais do jogo. Será pedido que você aceite os Termos de novo.

## 0.3.8

- Removido: Banco de dados, Gear Viewer, Arsenal, planejador Daevanion, Criação, Calculadoras e Mercado mostram "Dados oficiais em breve" até que haja dados oficiais do jogo.
- Removido: o Character Builder mantém habilidades, descrição e comentários; equipamento, atributos, Gear Score e coleções voltarão com os dados oficiais, e o equipamento salvo nas suas builds foi apagado.
- Removido: Builds da comunidade lista só as suas builds; builds da comunidade, favoritos e pontos de spawn no mapa foram retirados.
- Alterado: Fenda espaço-temporal e Festival Shugo mostram só os detalhes confirmados pela NCSOFT; o portal da Fenda fica aberto 15 minutos.

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

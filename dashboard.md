-Dashboards como agregadores visuais de dados do Workspace. Eles convertem dados de tarefas, tempo, status e campos personalizados em representações visuais. A ideia central é: o Dashboard não armazena dados próprios — ele faz queries nos dados já existentes do sistema (tarefas, listas, pastas, espaços) e os renderiza visualmente.

-Dashboard se conecta a essa hierarquia em qualquer nível como "fonte de dados" (Data Source). Cada cartão dentro do Dashboard faz uma query isolada nessa hierarquia. Isso significa que um único Dashboard pode ter cartões apontando para diferentes Spaces, Folders e Lists simultaneamente.

-O modelo de dados envolve essencialmente três entidades principais para o sistema de dashboards:

-Dashboard — a entidade raiz, com propriedades como: nome, proprietário (owner), localização na hierarquia (ou apenas no Hub), visibilidade/permissões, configuração de auto-refresh, e data de criação/atualização.

-Card (Cartão) — cada widget dentro do Dashboard. Cada cartão tem: tipo (chart type), data source (quais locais da hierarquia ele consulta), filtros individuais, configuração de eixos (X/Y), dimensões de layout (posição x, y, largura, altura no grid), e configurações específicas do tipo de gráfico.

-Dashboard Filters — filtros globais que se aplicam a todos os cartões simultaneamente, podendo ser combinados com os filtros individuais de cada cartão.


-SISTEMA DE CARTÕES (WIDGETS)
- Esta é a parte mais rica da arquitetura. Os cartões são os "blocos construtivos" dos Dashboards.
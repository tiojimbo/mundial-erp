INSERT INTO custom_task_types (id, workspace_id, name, icon, color, is_builtin, sort_order, created_at, updated_at)
SELECT v.id, w.id, v.name, v.icon, '#6b7280', false, v.sort_order, now(), now()
FROM workspaces w
CROSS JOIN (VALUES
  ('ctt-bobina-ceramica',                 'Bobina Ceramica',                  'Scroll',  1),
  ('ctt-bobina-natural',                  'Bobina Natural',                   'Scroll',  2),
  ('ctt-bobina-branco',                   'Bobina Branco',                    'Scroll',  3),
  ('ctt-bobina-amadeirado-claro-01',      'Bobina Amadeirado Claro 01',       'Scroll',  4),
  ('ctt-bobina-amadeirado-claro-02',      'Bobina Amadeirado Claro 02',       'Scroll',  5),
  ('ctt-bobina-amadeirado-escuro-01',     'Bobina Amadeirado Escuro 01',      'Scroll',  6),
  ('ctt-bobina-amadeirado-escuro-02',     'Bobina Amadeirado Escuro 02',      'Scroll',  7),
  ('ctt-bobina-amadeirado-texturizado-01','Bobina Amadeirado Texturizado 01', 'Scroll',  8),
  ('ctt-bobina-amadeirado-texturizado-02','Bobina Amadeirado Texturizado 02', 'Scroll',  9),
  ('ctt-bobina-azul',                     'Bobina Azul',                      'Scroll', 10),
  ('ctt-bobina-preto',                    'Bobina Preto',                     'Scroll', 11),
  ('ctt-bloco-eps-3cm',                   'Bloco EPS 3cm',                    'Box',    12),
  ('ctt-bloco-eps-5cm',                   'Bloco EPS 5cm',                    'Box',    13),
  ('ctt-filete-eps',                      'Filete EPS',                       'Box',    14),
  ('ctt-manta-aluminizada-metro',         'Manta aluminizada por metro',      'Layers', 15),
  ('ctt-manta-branca',                    'Manta branca',                     'Layers', 16),
  ('ctt-manta-preta',                     'Manta preta',                      'Layers', 17)
) AS v(id, name, icon, sort_order)
WHERE w.slug = 'mundial-telhas'
ON CONFLICT (id) DO NOTHING;

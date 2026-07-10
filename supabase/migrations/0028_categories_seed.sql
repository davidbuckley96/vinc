-- Vinc — D-041: initial category tree approved by David (docs/02 §2).
-- 8 top-level categories + subcategories; regulated professions stay out
-- of the MVP. "Outros" remains as the catch-all. Ordering is explicit.

alter table public.categories
  add column sort_order integer not null default 100;

-- Reuse existing rows where they fit the approved list.
update public.categories set name = 'Cuidados', icon = 'heart', sort_order = 20
  where name = 'Cuidado de crianças';
update public.categories set sort_order = 10 where name = 'Serviços domésticos';
update public.categories set icon = 'balloon', sort_order = 30 where name = 'Eventos';
update public.categories set sort_order = 90 where name = 'Outros';

-- Retired top-levels (only if nothing references them).
delete from public.categories c
  where c.name in ('Saúde', 'Entretenimento')
    and not exists (select 1 from public.gigs g where g.category_id = c.id);

insert into public.categories (name, icon, sort_order) values
  ('Reparos e montagem', 'construct', 40),
  ('Mudanças e fretes', 'car', 50),
  ('Aulas', 'book', 60),
  ('Beleza', 'cut', 70),
  ('Tecnologia', 'laptop', 80)
on conflict (name) do nothing;

-- Subcategories (child rows; a gig may point at the parent or a child).
with parents as (select id, name from public.categories where parent_id is null)
insert into public.categories (name, icon, parent_id, sort_order)
select sub.name, null, parents.id, sub.ord
from (values
  ('Faxina',                 'Serviços domésticos', 1),
  ('Passadeira',             'Serviços domésticos', 2),
  ('Cozinha',                'Serviços domésticos', 3),
  ('Babá',                   'Cuidados', 1),
  ('Acompanhante de idosos', 'Cuidados', 2),
  ('Pet',                    'Cuidados', 3),
  ('Garçom',                 'Eventos', 1),
  ('DJ',                     'Eventos', 2),
  ('Fotógrafo',              'Eventos', 3),
  ('Montagem de evento',     'Eventos', 4),
  ('Montador de móveis',     'Reparos e montagem', 1),
  ('Pintura',                'Reparos e montagem', 2),
  ('Jardim',                 'Reparos e montagem', 3),
  ('Carreto',                'Mudanças e fretes', 1),
  ('Ajudante de mudança',    'Mudanças e fretes', 2),
  ('Reforço escolar',        'Aulas', 1),
  ('Música',                 'Aulas', 2),
  ('Idiomas',                'Aulas', 3),
  ('Cabelo',                 'Beleza', 1),
  ('Unhas',                  'Beleza', 2),
  ('Maquiagem',              'Beleza', 3),
  ('Instalações',            'Tecnologia', 1),
  ('Suporte',                'Tecnologia', 2)
) as sub (name, parent_name, ord)
join parents on parents.name = sub.parent_name
on conflict (name) do nothing;

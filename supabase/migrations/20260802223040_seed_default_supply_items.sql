-- Catálogo inicial de insumos internos. O saldo e o custo começam zerados e
-- passam a existir somente quando o gestor registra uma entrada/lote real.
with management_actor as (
  select ur.user_id
  from public.user_roles ur
  where ur.role in ('admin'::public.app_role, 'gestor'::public.app_role)
  order by case when ur.role = 'admin'::public.app_role then 0 else 1 end
  limit 1
), defaults(name, category, unit, minimum_stock, expiry_warning_days, notes) as (
  values
    ('Lâmina descartável', 'Barbearia', 'unidade', 50::numeric, 15, 'Lâminas utilizadas em cortes e acabamento.'),
    ('Papel de pescoço', 'Barbearia', 'rolo', 5::numeric, 15, 'Proteção descartável para o pescoço do cliente.'),
    ('Luvas descartáveis', 'Descartáveis', 'caixa', 2::numeric, 15, 'Luvas para procedimentos e higienização.'),
    ('Máscara descartável', 'Descartáveis', 'caixa', 1::numeric, 15, null),
    ('Toalha descartável', 'Descartáveis', 'pacote', 3::numeric, 15, null),
    ('Algodão', 'Descartáveis', 'pacote', 2::numeric, 15, null),
    ('Touca descartável', 'Descartáveis', 'pacote', 1::numeric, 15, null),
    ('Álcool 70%', 'Higiene e Limpeza', 'frasco', 3::numeric, 15, 'Uso na higienização de superfícies e equipamentos.'),
    ('Desinfetante', 'Higiene e Limpeza', 'frasco', 2::numeric, 15, null),
    ('Detergente', 'Higiene e Limpeza', 'frasco', 2::numeric, 15, null),
    ('Água sanitária', 'Higiene e Limpeza', 'frasco', 2::numeric, 15, null),
    ('Papel toalha', 'Higiene e Limpeza', 'rolo', 6::numeric, 15, null),
    ('Papel higiênico', 'Higiene e Limpeza', 'rolo', 8::numeric, 15, null),
    ('Saco de lixo', 'Higiene e Limpeza', 'pacote', 2::numeric, 15, null),
    ('Shampoo profissional', 'Atendimento', 'frasco', 2::numeric, 30, null),
    ('Condicionador profissional', 'Atendimento', 'frasco', 2::numeric, 30, null),
    ('Gel para cabelo', 'Atendimento', 'pote', 2::numeric, 30, null),
    ('Pomada modeladora', 'Atendimento', 'pote', 2::numeric, 30, null),
    ('Talco profissional', 'Atendimento', 'frasco', 2::numeric, 30, null),
    ('Loção pós-barba', 'Atendimento', 'frasco', 2::numeric, 30, null),
    ('Café', 'Copa', 'pacote', 2::numeric, 30, 'Cadastrar a validade de cada lote comprado.'),
    ('Açúcar', 'Copa', 'pacote', 2::numeric, 30, null),
    ('Adoçante', 'Copa', 'frasco', 1::numeric, 30, null),
    ('Copo descartável', 'Copa', 'pacote', 3::numeric, 15, null),
    ('Água mineral', 'Copa', 'fardo', 2::numeric, 15, null)
)
insert into public.supply_items (
  name, category, unit, minimum_stock, expiry_warning_days, notes, active, created_by
)
select d.name, d.category, d.unit, d.minimum_stock, d.expiry_warning_days, d.notes, true, a.user_id
from defaults d
cross join management_actor a
where not exists (
  select 1 from public.supply_items existing
  where lower(trim(existing.name)) = lower(trim(d.name))
)
on conflict (name) do nothing;

do $$
begin
  if not exists (
    select 1 from public.user_roles where role in ('admin'::public.app_role, 'gestor'::public.app_role)
  ) then
    raise exception 'Não existe admin ou gestor para vincular os insumos padrão';
  end if;
end $$;

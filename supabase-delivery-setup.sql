-- Portal privado de delivery para Ritual Ancestral
-- Ejecutar una sola vez en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.delivery_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  delivery_persona text not null,
  activo boolean not null default true,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  vence_en timestamptz not null default (now() + interval '90 days'),
  ultimo_uso timestamptz
);

alter table public.delivery_access_tokens enable row level security;
alter table public.delivery_access_tokens add column if not exists vence_en timestamptz not null default (now() + interval '90 days');

drop policy if exists "administrador gestiona sus enlaces delivery" on public.delivery_access_tokens;
create policy "administrador gestiona sus enlaces delivery"
on public.delivery_access_tokens for all
to authenticated
using ((select auth.uid()) = creado_por)
with check ((select auth.uid()) = creado_por);

drop policy if exists "portal valida token delivery" on public.delivery_access_tokens;
create policy "portal valida token delivery"
on public.delivery_access_tokens for select
to anon
using (
  token::text=current_setting('app.delivery_token',true)
  and activo=true and vence_en>now()
);

-- Campo independiente para las notas escritas por el repartidor.
alter table public.ventas add column if not exists delivery_observacion text default '';
alter table public.ventas add column if not exists delivery_actualizado_en timestamptz;
alter table public.ventas add column if not exists delivery_historial jsonb not null default '[]'::jsonb;

drop policy if exists "portal lee entregas asignadas" on public.ventas;
create policy "portal lee entregas asignadas"
on public.ventas for select to anon
using (exists(
  select 1 from public.delivery_access_tokens t
  where t.token::text=current_setting('app.delivery_token',true)
    and t.activo=true and t.vence_en>now()
    and lower(t.delivery_persona)=lower(coalesce(ventas.delivery_persona,''))
));

drop policy if exists "portal actualiza entregas asignadas" on public.ventas;
create policy "portal actualiza entregas asignadas"
on public.ventas for update to anon
using (exists(
  select 1 from public.delivery_access_tokens t
  where t.token::text=current_setting('app.delivery_token',true)
    and t.activo=true and t.vence_en>now()
    and lower(t.delivery_persona)=lower(coalesce(ventas.delivery_persona,''))
))
with check (exists(
  select 1 from public.delivery_access_tokens t
  where t.token::text=current_setting('app.delivery_token',true)
    and t.activo=true and t.vence_en>now()
    and lower(t.delivery_persona)=lower(coalesce(ventas.delivery_persona,''))
));

-- El panel administrativo autenticado crea o renueva enlaces.
create or replace function public.delivery_crear_acceso(p_delivery_persona text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare v_token uuid;
begin
  if auth.uid() is null then raise exception 'Sesión administrativa requerida'; end if;
  if nullif(trim(p_delivery_persona),'') is null then raise exception 'Nombre de delivery requerido'; end if;
  update delivery_access_tokens set activo=false
    where creado_por=(select auth.uid()) and lower(delivery_persona)=lower(trim(p_delivery_persona)) and activo=true;
  insert into delivery_access_tokens(delivery_persona,creado_por) values(trim(p_delivery_persona),(select auth.uid()))
    returning token into v_token;
  return jsonb_build_object('token',v_token,'delivery_persona',trim(p_delivery_persona));
end;
$$;

create or replace function public.delivery_revocar_acceso(p_delivery_persona text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sesión administrativa requerida'; end if;
  update delivery_access_tokens set activo=false
    where creado_por=(select auth.uid()) and lower(delivery_persona)=lower(trim(p_delivery_persona)) and activo=true;
  return true;
end;
$$;

-- Devuelve únicamente las entregas asignadas al dueño del enlace.
drop function if exists public.delivery_listar(uuid);
create or replace function public.delivery_listar(p_token uuid)
returns table (
  id text, fecha date, dia_entrega date, cliente text, contacto text, ciudad text,
  ubicacion text, detalle text, observaciones text, estado_entrega text,
  estado_pago text, metodo_pago text, costo_delivery numeric,
  total_productos numeric, delivery_persona text, delivery_observacion text,
  delivery_actualizado_en timestamptz, delivery_historial jsonb
)
language plpgsql
security invoker
set search_path = ''
as $$
declare v_persona text;
begin
  perform set_config('app.delivery_token',p_token::text,true);
  select t.delivery_persona into v_persona from public.delivery_access_tokens t
   where t.token=p_token and t.activo=true and t.vence_en>now();
  if v_persona is null then raise exception 'Enlace inválido o vencido'; end if;
  return query
  select v.id::text,v.fecha,v.dia_entrega,v.cliente,v.contacto,v.ciudad,v.ubicacion,
         v.detalle,v.observaciones,v.estado_entrega,v.estado_pago,v.metodo_pago,
         v.costo_delivery::numeric,v.total_productos::numeric,v.delivery_persona,
         coalesce(v.delivery_observacion,''),v.delivery_actualizado_en,
         coalesce(v.delivery_historial,'[]'::jsonb)
    from public.ventas v
   where lower(coalesce(v.delivery_persona,''))=lower(v_persona)
     and lower(coalesce(v.estado_entrega,'')) not in ('cancelado')
     and coalesce(v.dia_entrega,v.fecha)>=current_date-30
   order by coalesce(v.dia_entrega,v.fecha),v.fecha;
end;
$$;

create or replace function public.delivery_actualizar(
  p_token uuid, p_venta_id text, p_estado text,
  p_observacion text default '', p_nueva_fecha date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_persona text; v_count integer;
begin
  perform set_config('app.delivery_token',p_token::text,true);
  select t.delivery_persona into v_persona from public.delivery_access_tokens t
   where t.token=p_token and t.activo=true and t.vence_en>now();
  if v_persona is null then raise exception 'Enlace inválido o vencido'; end if;
  if p_estado not in ('Pendiente','Asignado','En camino','Entregado','Cliente ausente','Cliente no responde','Reprogramado','Cancelado')
    then raise exception 'Estado no permitido'; end if;
  if length(coalesce(p_observacion,''))>1000 then raise exception 'Observación demasiado larga'; end if;
  if p_estado in ('Cliente ausente','Cliente no responde','Reprogramado','Cancelado')
     and length(trim(coalesce(p_observacion,'')))=0 then
    raise exception 'Este estado requiere una observación';
  end if;
  if p_estado='Reprogramado' and p_nueva_fecha is null then
    raise exception 'Elegí una nueva fecha de entrega';
  end if;
  update public.ventas set
    estado_entrega=p_estado,
    delivery_observacion=coalesce(p_observacion,''),
    dia_entrega=case when p_nueva_fecha is not null then p_nueva_fecha else dia_entrega end,
    delivery_actualizado_en=now(),
    delivery_historial=coalesce(delivery_historial,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
      'estado',p_estado,'observacion',coalesce(p_observacion,''),
      'nueva_fecha',p_nueva_fecha,'momento',now()
    ))
  where id::text=p_venta_id and lower(coalesce(delivery_persona,''))=lower(v_persona);
  get diagnostics v_count=row_count;
  if v_count=0 then raise exception 'Entrega no encontrada o no asignada'; end if;
  return jsonb_build_object('ok',true,'estado',p_estado);
end;
$$;

revoke all on function public.delivery_crear_acceso(text) from public, anon, authenticated;
revoke all on function public.delivery_revocar_acceso(text) from public, anon, authenticated;
revoke all on function public.delivery_listar(uuid) from public, anon, authenticated;
revoke all on function public.delivery_actualizar(uuid,text,text,text,date) from public, anon, authenticated;
grant execute on function public.delivery_crear_acceso(text) to authenticated;
grant execute on function public.delivery_revocar_acceso(text) to authenticated;
grant execute on function public.delivery_listar(uuid) to anon, authenticated;
grant execute on function public.delivery_actualizar(uuid,text,text,text,date) to anon, authenticated;
grant select (token,delivery_persona,activo,vence_en) on public.delivery_access_tokens to anon;
grant select (id,fecha,dia_entrega,cliente,contacto,ciudad,ubicacion,detalle,observaciones,estado_entrega,estado_pago,metodo_pago,costo_delivery,total_productos,delivery_persona,delivery_observacion,delivery_actualizado_en,delivery_historial) on public.ventas to anon;
grant update (estado_entrega,delivery_observacion,dia_entrega,delivery_actualizado_en,delivery_historial) on public.ventas to anon;

-- Mejoras del registro de ventas: descuentos, referencias, abonos y auditoría.
alter table public.ventas
  add column if not exists descuento integer not null default 0,
  add column if not exists direccion_referencia text not null default '',
  add column if not exists abonos jsonb not null default '[]'::jsonb,
  add column if not exists creado_por uuid default auth.uid(),
  add column if not exists actualizado_por uuid;

comment on column public.ventas.abonos is 'Historial de pagos: monto, método, fecha y usuario';
comment on column public.ventas.creado_por is 'Usuario autenticado que creó la venta';
comment on column public.ventas.actualizado_por is 'Último usuario autenticado que modificó la venta';

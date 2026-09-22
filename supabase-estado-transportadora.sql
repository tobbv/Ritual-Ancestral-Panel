-- Amplía únicamente el estado permitido en el portal de delivery.
-- Conserva la validación de token, la asignación de repartidor y los permisos existentes.
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
  if p_estado not in ('Pendiente','Asignado','Entregado a transportadora','En camino','Entregado','Cliente ausente','Cliente no responde','Reprogramado','Cancelado')
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

-- Si el repartidor avanza la entrega, la preparación queda lista también.
-- Esto mantiene consistentes el panel, el enlace del cliente y el portal delivery.
create or replace function public.pedido_sincronizar_preparacion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.estado_entrega in ('Entregado a transportadora','En camino','Entregado') then
    new.preparacion_estado := 'Listo';
  end if;
  return new;
end;
$$;

drop trigger if exists pedido_preparacion_al_despachar on public.ventas;
create trigger pedido_preparacion_al_despachar
before insert or update of estado_entrega on public.ventas
for each row execute function public.pedido_sincronizar_preparacion();
revoke all on function public.pedido_sincronizar_preparacion() from public;

-- Regulariza pedidos antiguos que ya fueron entregados o están en ruta.
update public.ventas
set preparacion_estado='Listo'
where estado_entrega in ('Entregado a transportadora','En camino','Entregado')
  and preparacion_estado is distinct from 'Listo';

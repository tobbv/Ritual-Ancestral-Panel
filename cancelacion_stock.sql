-- Ejecutar una sola vez en el SQL Editor de Supabase antes de publicar el HTML nuevo.
-- Los pedidos históricos sin pedido_items se bloquean al cancelar: no se adivina el stock.
alter table public.ventas
  add column if not exists stock_liberado_por_cancelacion boolean not null default false;

create or replace function public.ritual_sincronizar_cancelacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  cantidad numeric;
  cantidad_base numeric;
  v_codigo text;
  componente jsonb;
  items_stock jsonb := '[]'::jsonb;
  stock_disponible numeric;
  es_cancelacion boolean;
  era_cancelado boolean;
begin
  -- Un administrador autenticado llega por las políticas normales de ventas.
  -- El portal anónimo solo puede continuar si delivery_actualizar validó un token
  -- vigente y ese token pertenece al repartidor asignado a este pedido.
  if (select auth.uid()) is null and not exists (
    select 1 from public.delivery_access_tokens t
    where t.token::text = (select current_setting('app.delivery_token', true))
      and t.activo = true and t.vence_en > now()
      and lower(t.delivery_persona) = lower(coalesce(new.delivery_persona, ''))
  ) then
    raise exception 'Operación de cancelación no autorizada.';
  end if;

  es_cancelacion := lower(coalesce(new.estado_entrega, '')) = 'cancelado';
  era_cancelado := lower(coalesce(old.estado_entrega, '')) = 'cancelado';
  if es_cancelacion = era_cancelado then
    return new;
  end if;

  if es_cancelacion and (
    coalesce(new.monto_pagado, 0) > 0 or
    lower(coalesce(new.estado_pago, '')) = 'pagado' or
    jsonb_array_length(coalesce(new.abonos, '[]'::jsonb)) > 0
  ) then
    raise exception 'El pedido tiene un pago o abono. Resolvé ese importe antes de cancelarlo.';
  end if;

  -- Una cancelación previa a esta migración no liberó stock: al reactivarla no se descuenta otra vez.
  if not es_cancelacion and not coalesce(old.stock_liberado_por_cancelacion, false) then
    new.stock_liberado_por_cancelacion := false;
    new.saldo_pendiente := greatest(0, coalesce(new.total_productos, 0) + coalesce(new.costo_delivery, 0) - coalesce(new.monto_pagado, 0));
    return new;
  end if;

  if jsonb_typeof(new.pedido_items) is distinct from 'array'
     or jsonb_array_length(new.pedido_items) = 0 then
    raise exception 'Este pedido histórico no tiene desglose de productos. Revisá su stock antes de cambiar el estado.';
  end if;

  for item in select value from jsonb_array_elements(new.pedido_items) loop
    if coalesce(item->>'cant', '') !~ '^[0-9]+([.][0-9]+)?$' then
      raise exception 'El pedido contiene una cantidad inválida.';
    end if;
    cantidad_base := (item->>'cant')::numeric;
    if cantidad_base <= 0 then raise exception 'El pedido contiene una cantidad inválida.'; end if;
    if jsonb_typeof(item->'componentes') = 'array' and jsonb_array_length(item->'componentes') > 0 then
      for componente in select value from jsonb_array_elements(item->'componentes') loop
        if nullif(trim(componente->>'codigo'), '') is null
          or coalesce(componente->>'cantidad', '') !~ '^[0-9]+([.][0-9]+)?$' then
          raise exception 'El combo tiene un componente inválido.';
        end if;
        items_stock := items_stock || jsonb_build_array(jsonb_build_object(
          'codigo', componente->>'codigo', 'cant', cantidad_base * (componente->>'cantidad')::numeric));
      end loop;
    else
      items_stock := items_stock || jsonb_build_array(jsonb_build_object(
        'codigo', item->>'codigo', 'cant', cantidad_base));
    end if;
  end loop;

  for item in select value from jsonb_array_elements(items_stock) loop
    v_codigo := nullif(trim(item->>'codigo'), '');
    if v_codigo is null or coalesce(item->>'cant', '') !~ '^[0-9]+([.][0-9]+)?$' then
      raise exception 'El pedido contiene un producto sin código o una cantidad inválida.';
    end if;
    cantidad := (item->>'cant')::numeric;
    if cantidad <= 0 then
      raise exception 'El pedido contiene una cantidad inválida.';
    end if;
    select p.stock_actual into stock_disponible
      from public.productos p where p.codigo = v_codigo for update;
    if not found then
      raise exception 'No se encontró el producto % en inventario.', v_codigo;
    end if;
    if es_cancelacion then
      update public.productos p set stock_actual = coalesce(p.stock_actual, 0) + cantidad
        where p.codigo = v_codigo;
    else
      if coalesce(stock_disponible, 0) < cantidad then
        raise exception 'Stock insuficiente para reactivar el producto %.', v_codigo;
      end if;
      update public.productos p set stock_actual = p.stock_actual - cantidad
        where p.codigo = v_codigo;
    end if;
    insert into public.movimientos
      (fecha, codigo_producto, tipo, cantidad, costo_unitario, proveedor, observaciones)
    values
      ((now() at time zone 'America/Asuncion')::date, v_codigo,
       case when es_cancelacion then 'devolucion' else 'venta' end,
       case when es_cancelacion then cantidad else -cantidad end,
       0, '',
       case when es_cancelacion then 'Cancelación del pedido #' else 'Reactivación del pedido #' end
         || coalesce(new.numero_orden::text, new.id::text));
  end loop;

  new.stock_liberado_por_cancelacion := es_cancelacion;
  new.saldo_pendiente := case when es_cancelacion then 0
    else greatest(0, coalesce(new.total_productos, 0) + coalesce(new.costo_delivery, 0) - coalesce(new.monto_pagado, 0)) end;
  new.historial := coalesce(new.historial, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('fecha', now(), 'accion',
      case when es_cancelacion then 'Pedido cancelado · stock devuelto al inventario'
           else 'Pedido reactivado · stock reservado nuevamente' end,
      'usuario', coalesce((select auth.uid())::text, 'Portal delivery')));
  return new;
end;
$$;

drop trigger if exists ritual_sincronizar_cancelacion on public.ventas;
create trigger ritual_sincronizar_cancelacion
before update of estado_entrega on public.ventas
for each row execute function public.ritual_sincronizar_cancelacion();

-- La función solo debe ejecutarse como trigger, nunca como RPC pública.
revoke all on function public.ritual_sincronizar_cancelacion() from public, anon, authenticated;

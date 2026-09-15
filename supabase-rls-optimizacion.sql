-- Optimiza las políticas de enlaces privados para evaluar cada token una vez por consulta.
drop policy if exists "portal valida token delivery" on public.delivery_access_tokens;
create policy "portal valida token delivery"
on public.delivery_access_tokens for select to anon
using (
  token::text=(select current_setting('app.delivery_token',true))
  and activo=true and vence_en>now()
);

drop policy if exists "portal lee entregas asignadas" on public.ventas;
create policy "portal lee entregas asignadas"
on public.ventas for select to anon
using (exists(
  select 1 from public.delivery_access_tokens t
  where t.token::text=(select current_setting('app.delivery_token',true))
    and t.activo=true and t.vence_en>now()
    and lower(t.delivery_persona)=lower(coalesce(ventas.delivery_persona,''))
));

drop policy if exists "portal actualiza entregas asignadas" on public.ventas;
create policy "portal actualiza entregas asignadas"
on public.ventas for update to anon
using (exists(
  select 1 from public.delivery_access_tokens t
  where t.token::text=(select current_setting('app.delivery_token',true))
    and t.activo=true and t.vence_en>now()
    and lower(t.delivery_persona)=lower(coalesce(ventas.delivery_persona,''))
))
with check (exists(
  select 1 from public.delivery_access_tokens t
  where t.token::text=(select current_setting('app.delivery_token',true))
    and t.activo=true and t.vence_en>now()
    and lower(t.delivery_persona)=lower(coalesce(ventas.delivery_persona,''))
));

drop policy if exists "pedido_cliente_lectura" on public.pedido_seguimiento;
create policy "pedido_cliente_lectura"
on public.pedido_seguimiento for select to anon
using (
  activo
  and access_token::text=nullif((select current_setting('app.pedido_token',true)),'')
);

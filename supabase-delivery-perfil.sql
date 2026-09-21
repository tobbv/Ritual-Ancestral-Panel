-- Foto del repartidor para su enlace privado. No concede lectura pública de configuración.
-- Ejecutar una vez en el proyecto Supabase del panel.
create or replace function public.delivery_perfil(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_persona text;
  v_foto text;
begin
  select t.delivery_persona into v_persona
  from public.delivery_access_tokens t
  where t.token = p_token and t.activo = true and t.vence_en > now();

  if v_persona is null then
    raise exception 'Enlace inválido o vencido';
  end if;

  select d.item ->> 'foto' into v_foto
  from public.configuracion c,
       lateral jsonb_array_elements(c.valor::jsonb) as d(item)
  where c.clave = 'deliverys_fijos'
    and lower(d.item ->> 'nombre') = lower(v_persona)
  limit 1;

  if v_foto is null or length(v_foto) > 32000
    or v_foto !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then
    v_foto := null;
  end if;

  return jsonb_build_object('nombre', v_persona, 'foto', v_foto);
end;
$$;

revoke all on function public.delivery_perfil(uuid) from public, anon, authenticated;
grant execute on function public.delivery_perfil(uuid) to anon, authenticated;

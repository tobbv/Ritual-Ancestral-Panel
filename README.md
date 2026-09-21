# Panel Ritual Ancestral

Panel web estático de ventas, productos, clientes, entregas y finanzas. La página principal es `index.html`; `pedido.html` muestra el seguimiento público de un pedido y `delivery.html` el portal privado del repartidor. Conservá la estructura de carpetas al subirlo a GitHub o a un hosting estático: las hojas de estilo, scripts, imágenes y `assets/config-icons/` usan rutas relativas.

Para verlo localmente, desde la carpeta del proyecto ejecutá `python3 -m http.server 8794` y abrí `http://localhost:8794/index.html?preview=1`. La vista previa usa datos de ejemplo. El acceso real depende de la configuración y las políticas existentes en Supabase; los archivos SQL del repositorio son referencias y no se ejecutan al publicar el sitio.

La verificación local del panel está en `tools/verify-v2.cjs` y la revisión de tamaños en `tools/audit-responsive.cjs`. Ambas necesitan Playwright instalado en el entorno donde se ejecuten.

En Configuración → Entregas se puede agregar, cambiar o quitar la foto de cada repartidor. La imagen se recorta y reduce antes de guardarse en la configuración existente; el portal `delivery.html` la obtiene solo con su enlace privado. La migración `supabase-delivery-perfil.sql` crea esa consulta restringida por token. Ya fue aplicada al proyecto Supabase conectado el 21 de septiembre de 2026; conservá el archivo SQL en GitHub como referencia, sin ejecutarlo de nuevo al publicar archivos estáticos.

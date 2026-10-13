# Flujo ADM — demo pública

[Abrir la demo](https://thanos0015.github.io/flujo-adm-demo/)

Demostración instalable en móvil de un control financiero quincenal y mensual.
Permite registrar y editar ingresos, gastos y traspasos, consultar saldos por
cuenta, compromisos, gráficos e historial con filtros.

Los perfiles **Alex** y **Sam** y todos los importes iniciales son ficticios.
Los cambios se guardan únicamente en el almacenamiento local del navegador:
no hay inicio de sesión, sincronización ni conexión con la base de datos de la
aplicación privada. Usa «Reiniciar» para recuperar los ejemplos iniciales.

## Desarrollo

```sh
pnpm install
pnpm test
pnpm dev
pnpm build
```

La carpeta `docs/` es el sitio compilado para GitHub Pages. Después de
`pnpm build`, publica `main /docs` en **Settings → Pages**. Esta demo está
separada de la aplicación privada y no contiene sus datos ni su configuración
de Firebase.

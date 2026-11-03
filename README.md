# Gestor WhatsApp MVP

MVP de un bot de trámites configurable por JSON. El motor no tiene preguntas ni trámites hardcodeados: interpreta `src/flows/procedures.json`.

## Qué hace

1. Recibe un primer "Hola".
2. Saluda y muestra dos trámites.
3. Pregunta los datos de cada trámite.
4. Usa botones interactivos de WhatsApp para preguntas de opciones (hasta 3); para más opciones usa listas.
5. Genera un resumen y pide confirmación.
6. Envía el resumen al gestor (`GESTOR_PHONE`).
7. Confirma al usuario que el gestor lo contactará.

## Requisitos

- Node.js 20+ (recomendado Node 22).
- Una app de Meta con WhatsApp Cloud API para probar con WhatsApp real.
- Un número de prueba o número habilitado en WhatsApp Cloud API.

## Instalación

```bash
npm install
cp .env.example .env
```

En Windows PowerShell, en lugar de `cp`:

```powershell
Copy-Item .env.example .env
```

Completá `.env`:

- `WHATSAPP_TOKEN`: token de acceso de Meta.
- `WHATSAPP_PHONE_NUMBER_ID`: ID del número de WhatsApp de Meta.
- `WHATSAPP_VERIFY_TOKEN`: texto secreto que elijas para verificar el webhook.
- `GESTOR_PHONE`: teléfono del gestor en formato internacional, sin `+`.

## Ejecutar

```bash
npm run dev
```

El servidor escucha en el puerto 3000. Configurá en Meta el webhook:

- Callback URL: `https://TU-DOMINIO/webhook`
- Verify token: el mismo valor de `WHATSAPP_VERIFY_TOKEN`
- Suscribí el campo `messages`.

Para desarrollo local necesitás exponer el puerto con un túnel HTTPS, por ejemplo ngrok o Cloudflare Tunnel.

## Personalizar trámites

Editá `src/flows/procedures.json`. Cada trámite contiene `steps`.

### Pregunta de texto

```json
{
  "id": "direccion",
  "type": "text",
  "question": "¿Cuál es la dirección del local?",
  "saveAs": "Dirección"
}
```

### Pregunta con botones

```json
{
  "id": "tipo",
  "type": "buttons",
  "question": "¿Qué tipo de comercio es?",
  "saveAs": "Tipo de comercio",
  "options": [
    { "id": "local", "title": "Local comercial" },
    { "id": "gastronomia", "title": "Gastronomía" }
  ]
}
```

Las opciones usan IDs internos estables. El texto que ve el usuario puede cambiar sin romper el procesamiento.

## Probar sin credenciales de Meta

Si no configurás `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`, el adaptador imprime los mensajes salientes en consola. También queda disponible `POST /dev/message` mientras `NODE_ENV` no sea `production`, para simular mensajes entrantes.

Ejemplo (PowerShell):

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/dev/message -ContentType "application/json" -Body '{"phone":"5492210000000","text":"Hola"}'
```

Para elegir un trámite, enviá su ID interno como `replyId`:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/dev/message -ContentType "application/json" -Body '{"phone":"5492210000000","text":"Habilitación","replyId":"procedure:habilitacion"}'
```

Para responder una pregunta de botones, enviá el ID de la opción (por ejemplo `local`, `si` o `no`). Para preguntas de texto, enviá `text` con la respuesta. En WhatsApp real esos IDs llegan automáticamente en el webhook.

## Limitaciones intencionales del MVP

- Las conversaciones se guardan en memoria: reiniciar el servidor borra las sesiones.
- No incluye panel visual todavía: el JSON es el administrador inicial.
- No incluye base de datos ni múltiples gestores/negocios.
- Antes de producción hay que agregar persistencia PostgreSQL, validación de firma de webhooks, deduplicación de eventos, control de errores/reintentos, logs y manejo de consentimiento/privacidad.
- Los mensajes interactivos están sujetos a las reglas y límites vigentes de WhatsApp Cloud API.

## Próxima evolución

1. Cambiar `store.ts` por PostgreSQL.
2. Crear panel web para administrar trámites y preguntas.
3. Agregar condiciones y saltos (por ejemplo, si responde "No", preguntar otra cosa).
4. Agregar carga de documentos/fotos y derivación a un operador.
5. Guardar cada solicitud con estado: nueva, en revisión, contactada, cerrada.

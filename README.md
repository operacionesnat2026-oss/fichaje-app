# Control de Asistencia — Guía de despliegue

## 1. Crear la base de datos (Supabase, gratis)

1. Entrá a https://supabase.com y creá una cuenta (podés usar tu Google).
2. Creá un proyecto nuevo (elegí una región cercana, ej. São Paulo).
3. Andá a **SQL Editor** (menú izquierdo) → **New query**.
4. Copiá y pegá el contenido del archivo `supabase-setup.sql` de esta carpeta → **Run**.
   Esto crea las tres tablas que necesita la app (empleados, registros, ajustes) y deja
   el PIN de administrador inicial en `0000`.
5. Andá a **Project Settings → API**. Ahí vas a ver dos datos que necesitás:
   - **Project URL**
   - **anon public key**

## 2. Configurar el proyecto

1. Renombrá el archivo `.env.example` a `.env`.
2. Pegá ahí los dos datos del paso anterior:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon
   ```

## 3. Probarlo en tu computadora (opcional pero recomendado)

Necesitás tener [Node.js](https://nodejs.org) instalado. Después, en esta carpeta:

```
npm install
npm run dev
```

Te va a abrir un link tipo `http://localhost:5173` para probar la app antes de publicarla.

## 4. Publicarlo gratis (Vercel)

1. Subí esta carpeta a un repositorio de GitHub (podés arrastrar los archivos desde
   github.com/new si no usás git desde la terminal).
2. Entrá a https://vercel.com, creá cuenta con tu GitHub.
3. **Add New → Project** → elegís el repositorio que acabás de subir.
4. En **Environment Variables**, cargá las mismas dos variables del `.env`
   (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
5. **Deploy**. En un minuto te da un link público (ej. `fichaje-tuempresa.vercel.app`).

Ese link es el que le pasás a tus empleados. Desde el celular, al entrar, pueden tocar
"Agregar a pantalla de inicio" en el navegador y les queda como un ícono de app normal.

## 5. Uso diario

- **Vos (admin):** entrás al mismo link, tocás "Admin", ponés el PIN (`0000` al principio,
  cambialo enseguida desde Ajustes), y ahí cargás a cada empleado con su nombre y un PIN
  de 4 dígitos que le vas a pasar vos.
- **Cada empleado:** entra al link, elige su nombre, pone su PIN, y le aparece el botón
  para marcar entrada o salida. Ve su propio historial abajo.
- **Vos podés exportar** todos los registros a CSV desde el panel de administrador,
  filtrando por empleado si querés.

## Nota sobre seguridad

Esto queda protegido por PIN de 4 dígitos, pensado para uso interno de confianza dentro
de tu empresa — no es un sistema con autenticación robusta tipo usuario/contraseña con
recuperación de cuenta, etc. Para el tamaño de equipo que tenés hoy es razonable. Si en
el futuro crecés mucho o necesitás algo con más garantías (auditoría, roles, 2FA),
se puede migrar a Supabase Auth sin rehacer toda la app.

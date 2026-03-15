# 📋 Control de Asistencia - Mensajeros

Sistema de control de asistencia para mensajeros con geolocalización y base de datos en Supabase.

## 🚀 Características

- ✅ **Login con usuarios preestablecidos** y contraseña
- 📍 **Geolocalización automática** al iniciar y cerrar sesión
- 🕐 **Fecha y hora** del registro de entrada/salida
- 🔒 **Sesiones persistentes** (se mantienen abiertas hasta cerrar con contraseña)
- 💾 **Base de datos Supabase** para almacenamiento seguro
- 📊 **Panel administrativo** con filtros y exportación CSV
- 📱 **Diseño responsivo** (funciona en móvil y escritorio)

## 📁 Estructura del Proyecto

```
control_asistencia_mensajeros/
├── index.html          # Página principal con todas las vistas
├── styles.css          # Estilos (tema oscuro, glassmorphism)
├── app.js              # Lógica de la aplicación
├── supabase_setup.sql  # Script SQL para configurar Supabase
└── README.md           # Este archivo
```

## ⚙️ Configuración Paso a Paso

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Crea un nuevo proyecto
3. Anota los siguientes datos (los encuentras en *Settings > API*):
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (la clave `anon`)

### 2. Ejecutar el script SQL

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Copia todo el contenido de `supabase_setup.sql`
3. Pégalo y ejecuta
4. Esto creará:
   - Tabla `usuarios` con 6 usuarios de ejemplo
   - Tabla `sesiones` para registrar la asistencia
   - Vista `reporte_asistencia` para consultas
   - Políticas de acceso (RLS)

### 3. Configurar credenciales en la app

1. Abre `app.js`
2. En las primeras líneas, reemplaza:
```javascript
const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY_AQUI';
```
Con tus datos reales:
```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiI...tu_clave_aqui';
```

### 4. Abrir la aplicación

Simplemente abre `index.html` en un navegador web.

> **Nota:** Para que la geolocalización funcione, se recomienda usar HTTPS o localhost.

## 👥 Usuarios de Ejemplo

| Nombre              | Rol       | Contraseña |
|---------------------|-----------|------------|
| ADMIN               | admin     | admin2024  |
| JUAN PÉREZ          | mensajero | 1234       |
| MARÍA LÓPEZ         | mensajero | 5678       |
| CARLOS GARCÍA       | mensajero | 9012       |
| ANA MARTÍNEZ        | mensajero | 3456       |
| ROBERTO HERNÁNDEZ   | mensajero | 7890       |

## 📱 Vistas de la Aplicación

### 1. Login
- Seleccionar usuario del dropdown
- Ingresar contraseña
- Se solicita permiso de ubicación automáticamente

### 2. Sesión Activa (Mensajeros)
- Timer en tiempo real
- Datos de entrada (hora, fecha, ubicación)
- Botón para cerrar sesión

### 3. Cerrar Sesión
- Requiere contraseña para confirmar
- Registra ubicación y hora de salida

### 4. Panel Administrativo
- Estadísticas en tiempo real
- Tabla de registros con filtros
- Exportación a CSV para reportes

## 🔐 Seguridad

- Las contraseñas están almacenadas en texto plano en la tabla `usuarios` (para uso interno/empresarial)
- Para producción, se recomienda implementar hash de contraseñas
- Las políticas RLS están habilitadas en Supabase

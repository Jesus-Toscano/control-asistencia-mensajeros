-- =====================================================
-- CONTROL DE ASISTENCIA MENSAJEROS - SETUP SUPABASE
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'mensajero' CHECK (rol IN ('mensajero', 'admin')),
    password TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Sesiones (registros de asistencia)
CREATE TABLE IF NOT EXISTS sesiones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitud_inicio DOUBLE PRECISION,
    longitud_inicio DOUBLE PRECISION,
    direccion_inicio TEXT,
    fecha_cierre TIMESTAMPTZ,
    latitud_cierre DOUBLE PRECISION,
    longitud_cierre DOUBLE PRECISION,
    direccion_cierre TEXT,
    estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_estado ON sesiones(estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones(fecha_inicio);

-- 4. Deshabilitar RLS para acceso directo (ajustar según necesidades de seguridad)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para la app (usando anon key)
CREATE POLICY "Permitir lectura usuarios" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Permitir lectura sesiones" ON sesiones FOR SELECT USING (true);
CREATE POLICY "Permitir insertar sesiones" ON sesiones FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar sesiones" ON sesiones FOR UPDATE USING (true);

-- 5. Insertar usuarios de ejemplo
-- Cambia los nombres y contraseñas según tus mensajeros reales
INSERT INTO usuarios (nombre, rol, password) VALUES
    ('ADMIN', 'admin', 'admin2024'),
    ('JUAN PÉREZ', 'mensajero', '1234'),
    ('MARÍA LÓPEZ', 'mensajero', '5678'),
    ('CARLOS GARCÍA', 'mensajero', '9012'),
    ('ANA MARTÍNEZ', 'mensajero', '3456'),
    ('ROBERTO HERNÁNDEZ', 'mensajero', '7890');

-- 6. Vista útil para reportes (opcional)
CREATE OR REPLACE VIEW reporte_asistencia AS
SELECT 
    s.id AS sesion_id,
    u.nombre AS mensajero,
    s.fecha_inicio,
    s.fecha_cierre,
    CASE 
        WHEN s.fecha_cierre IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (s.fecha_cierre - s.fecha_inicio)) / 3600
        ELSE NULL 
    END AS horas_trabajadas,
    s.latitud_inicio,
    s.longitud_inicio,
    s.direccion_inicio,
    s.latitud_cierre,
    s.longitud_cierre,
    s.direccion_cierre,
    s.estado,
    s.notas
FROM sesiones s
JOIN usuarios u ON s.usuario_id = u.id
ORDER BY s.fecha_inicio DESC;

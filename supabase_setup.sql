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
    usa_vehiculo BOOLEAN DEFAULT false,
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
    dispositivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Vehículos
CREATE TABLE IF NOT EXISTS vehiculos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    placa TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Bitácora de Uso de Vehículos
CREATE TABLE IF NOT EXISTS bitacora_vehiculos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id),
    vehiculo_id UUID REFERENCES vehiculos(id),
    km_inicial INTEGER NOT NULL,
    km_final INTEGER,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_estado ON sesiones(estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_bitacora_sesion ON bitacora_vehiculos(sesion_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario ON bitacora_vehiculos(usuario_id);

-- 6. RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_vehiculos ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (usando anon key)
CREATE POLICY "Permitir lectura usuarios" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Permitir actualizar usuarios" ON usuarios FOR UPDATE USING (true);
CREATE POLICY "Permitir insertar usuarios" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura sesiones" ON sesiones FOR SELECT USING (true);
CREATE POLICY "Permitir insertar sesiones" ON sesiones FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar sesiones" ON sesiones FOR UPDATE USING (true);
CREATE POLICY "Permitir lectura vehiculos" ON vehiculos FOR SELECT USING (true);
CREATE POLICY "Permitir lectura bitacora" ON bitacora_vehiculos FOR SELECT USING (true);
CREATE POLICY "Permitir insertar bitacora" ON bitacora_vehiculos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar bitacora" ON bitacora_vehiculos FOR UPDATE USING (true);

-- 7. Insertar usuarios de ejemplo
-- Cambia los nombres y contraseñas según tus mensajeros reales
INSERT INTO usuarios (nombre, rol, password, usa_vehiculo) VALUES
    ('ADMIN', 'admin', 'admin2024', false),
    ('LEONEL ALEXANDRO BARRIOS TORRES', 'mensajero', 'LB8201', false),
    ('FABIAN ALEJANDRO TOLOSA GARCIA', 'mensajero', 'FT9352', false),
    ('GIL CARRILLO', 'mensajero', 'GC5106', false),
    ('ISMAEL ROMERO FERNÁNDEZ', 'mensajero', 'IR2749', false),
    ('CRISTIAN ALBERTO HUERTA CHÁVEZ', 'mensajero', 'CH6830', false),
    ('JUAN ANTONIO ALONSO MUÑIZ', 'mensajero', 'JA4152', false),
    ('ADRIAN ESQUIVEL', 'mensajero', 'AE8063', false);

-- 8. Vehículos
INSERT INTO vehiculos (placa, descripcion) VALUES
    ('28NUJ3', 'HONDA'),
    ('38PDK8', 'HONDA'),
    ('39PDK8', 'HONDA'),
    ('37PDK8', 'HONDA'),
    ('85NYP7', 'HONDA'),
    ('K5K93B', 'HONDA'),
    ('K4V90X', 'HONDA'),
    ('JU61452', 'NISSAN NP 300'),
    ('JX17744', 'NISSAN NP300'),
    ('JV47607', 'NISSAN NP300'),
    ('JW50550', 'FRONTIER PLATA DOBLE CABINA'),
    ('PDX8591', 'CHEVROLET TRAX');


-- 9. Vista para reportes de asistencia
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
    s.dispositivo,
    s.notas
FROM sesiones s
JOIN usuarios u ON s.usuario_id = u.id
ORDER BY s.fecha_inicio DESC;

-- 10. Vista para bitácora de vehículos
CREATE OR REPLACE VIEW reporte_bitacora AS
SELECT
    b.id,
    u.nombre AS mensajero,
    v.placa,
    v.descripcion AS vehiculo,
    b.km_inicial,
    b.km_final,
    CASE WHEN b.km_final IS NOT NULL THEN b.km_final - b.km_inicial ELSE NULL END AS km_recorridos,
    s.fecha_inicio,
    s.fecha_cierre,
    s.estado,
    b.notas,
    b.created_at
FROM bitacora_vehiculos b
JOIN usuarios u ON b.usuario_id = u.id
JOIN vehiculos v ON b.vehiculo_id = v.id
JOIN sesiones s ON b.sesion_id = s.id
ORDER BY b.created_at DESC;

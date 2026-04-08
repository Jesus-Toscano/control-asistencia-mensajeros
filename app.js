/* =====================================================
   CONTROL DE ASISTENCIA MENSAJEROS
   Lógica Principal de la Aplicación
   ===================================================== */

// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
// ⚠️ IMPORTANTE: Reemplaza estos valores con los de tu proyecto Supabase
const SUPABASE_URL = 'https://najdjlcqgmqielcwjwni.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hamRqbGNxZ21xaWVsY3dqd25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTAzMzUsImV4cCI6MjA4OTE2NjMzNX0.D4Hnl57yO18d4YcDdIEnLfZ2hFAzcr8kuTFWAokUiz0';

// Ubicación por defecto (CDMX) para pruebas si falla el GPS
const DEFAULT_LOCATION = {
    lat: 19.432608,
    lng: -99.133209,
    accuracy: 0,
    isFallback: true
};

// Inicializar cliente Supabase
let supabaseClient = null;

function initSupabase() {
    if (!SUPABASE_URL || SUPABASE_URL.includes('TU_SUPABASE')) {
        console.warn('⚠️ Configura tus credenciales de Supabase en app.js');
        return false;
    }
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase conectado');
    return true;
} catch (error) {
    console.error('❌ Error conectando Supabase:', error);
    showToast('error', 'Error de Conexión', 'No se pudo conectar con la base de datos');
    return false;
}
}

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================
const AppState = {
    currentView: 'view-login',
    currentUser: null,
    currentSession: null,
    currentBitacora: null,
    location: null,
    timerInterval: null,
    usuarios: [],
    sesiones: [],
    vehiculos: [],
    bitacora: [],
    // Paginación — Asistencia
    currentPage: 1,
    pageSize: 30,
    totalRecords: 0,
    currentFilters: {},
    // Paginación — Bitácora (propia)
    bitacoraPage: 1,
    bitacoraPageSize: 25,
    bitacoraTotal: 0,
    // Lazy loading: tabs destruidas al cambiar
    activeTab: 'asistencia',
    tabsLoaded: {},
    // Nuevo vehículo temporal (modal)
    nuevoVehiculoId: null,
};

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const DOM = {
    // Splash
    splashScreen: () => document.getElementById('splash-screen'),
    app: () => document.getElementById('app'),

    // Views
    viewLogin: () => document.getElementById('view-login'),
    viewSession: () => document.getElementById('view-session'),
    viewAdmin: () => document.getElementById('view-admin'),

    // Login
    loginForm: () => document.getElementById('login-form'),
    selectUsuario: () => document.getElementById('select-usuario'),
    inputPassword: () => document.getElementById('input-password'),
    btnTogglePassword: () => document.getElementById('btn-toggle-password'),
    btnLogin: () => document.getElementById('btn-login'),
    locationStatus: () => document.getElementById('location-status'),

    // Session
    sessionUserName: () => document.getElementById('session-user-name'),
    sessionAvatar: () => document.getElementById('session-avatar'),
    sessionTimer: () => document.getElementById('session-timer'),
    sessionDate: () => document.getElementById('session-date'),
    sessionHoraEntrada: () => document.getElementById('session-hora-entrada'),
    sessionFecha: () => document.getElementById('session-fecha'),
    sessionUbicacion: () => document.getElementById('session-ubicacion'),
    sessionCoords: () => document.getElementById('session-coords'),
    btnCerrarSesion: () => document.getElementById('btn-cerrar-sesion'),

    // Modal
    modalOverlay: () => document.getElementById('modal-cerrar'),
    modalPassword: () => document.getElementById('modal-password'),
    modalLocationStatus: () => document.getElementById('modal-location-status'),
    btnModalCancel: () => document.getElementById('btn-modal-cancel'),
    btnModalConfirm: () => document.getElementById('btn-modal-confirm'),

    // Admin
    btnAdminLogout: () => document.getElementById('btn-admin-logout'),
    statActivos: () => document.getElementById('stat-activos'),
    statHoy: () => document.getElementById('stat-hoy'),
    statSemana: () => document.getElementById('stat-semana'),
    statUsuarios: () => document.getElementById('stat-usuarios'),
    filterFechaInicio: () => document.getElementById('filter-fecha-inicio'),
    filterFechaFin: () => document.getElementById('filter-fecha-fin'),
    filterUsuario: () => document.getElementById('filter-usuario'),
    filterEstado: () => document.getElementById('filter-estado'),
    btnFiltrar: () => document.getElementById('btn-filtrar'),
    btnLimpiarFiltros: () => document.getElementById('btn-limpiar-filtros'),
    btnRefresh: () => document.getElementById('btn-refresh'),
    btnExportCSV: () => document.getElementById('btn-export-csv'),
    tablaBody: () => document.getElementById('tabla-body'),
    recordCount: () => document.getElementById('record-count'),
    bitacoraBody: () => document.getElementById('bitacora-body'),
    bitacoraCount: () => document.getElementById('bitacora-count'),

    // Vehicle form in login
    vehiculoSection: () => document.getElementById('vehiculo-section'),
    selectVehiculo: () => document.getElementById('select-vehiculo'),
    inputKmInicial: () => document.getElementById('input-km-inicial'),

    // Modal km final
    modalKmSection: () => document.getElementById('modal-km-section'),
    modalKmFinal: () => document.getElementById('modal-km-final'),

    // Toast
    toastContainer: () => document.getElementById('toast-container'),
};

// ============================================
// NAVEGACIÓN DE VISTAS
// ============================================
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        AppState.currentView = viewId;
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(type, title, message, duration = 4000) {
    const container = DOM.toastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <span class="material-icons-round">${iconMap[type] || 'info'}</span>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').remove()">
            <span class="material-icons-round">close</span>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// GEOLOCALIZACIÓN
// ============================================
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalización no disponible en este navegador'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let msg = 'Error obteniendo ubicación';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg = 'Permiso de ubicación denegado. Por favor habilítalo en la configuración del navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg = 'Ubicación no disponible';
                        break;
                    case error.TIMEOUT:
                        msg = 'Tiempo de espera agotado para obtener ubicación';
                        break;
                }
                reject(new Error(msg));
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' } }
        );
        const data = await response.json();
        if (data.display_name) {
            const parts = data.display_name.split(',').slice(0, 4);
            return parts.join(',').trim();
        }
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

// ============================================
// DETECCIÓN DE DISPOSITIVO
// ============================================
function getDeviceInfo() {
    const ua = navigator.userAgent;
    // iPhone
    const iphoneMatch = ua.match(/iPhone OS (\d+_\d+)/);
    if (iphoneMatch) return `iPhone iOS ${iphoneMatch[1].replace('_', '.')}`;
    // iPad
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
    // Android — intentar obtener modelo
    const androidMatch = ua.match(/Android [\d.]+; ([^)]+)/);
    if (androidMatch) {
        const model = androidMatch[1].trim().split(' BUILD')[0].split(';')[0].trim();
        return `Android - ${model}`;
    }
    // Windows
    if (/Windows NT 10/.test(ua)) return 'Windows 10/11 PC';
    if (/Windows/.test(ua)) return 'Windows PC';
    // Mac
    if (/Macintosh/.test(ua)) return 'Mac';
    // Linux
    if (/Linux/.test(ua)) return 'Linux PC';
    return ua.substring(0, 40); // fallback: primeros 40 chars del UA
}

async function getPublicIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        return data.ip || null;
    } catch {
        return null;
    }
}

function getBrowserFingerprint() {
    const parts = [
        screen.width + 'x' + screen.height,
        navigator.language || '',
        Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        navigator.platform || '',
        navigator.hardwareConcurrency || ''
    ].join('|');
    // Hash simple
    let hash = 0;
    for (let i = 0; i < parts.length; i++) {
        hash = ((hash << 5) - hash) + parts.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).toUpperCase().substring(0, 6);
}

async function getFullDeviceInfo() {
    const device = getDeviceInfo();
    const ip = await getPublicIP();
    const fp = getBrowserFingerprint();
    const ipPart = ip ? ` | IP: ${ip}` : '';
    return { label: `${device}${ipPart} | ID:${fp}`, ip: ip || 'N/A' };
}

function updateLocationStatus(element, status, message) {
    const iconMap = {
        loading: 'my_location',
        success: 'check_circle',
        error: 'error'
    };
    const classMap = {
        loading: '',
        success: 'success',
        error: 'error'
    };

    element.className = `location-status ${classMap[status]}`;
    element.innerHTML = `
        <span class="material-icons-round ${status === 'loading' ? 'spinning' : ''}">${iconMap[status]}</span>
        <span>${message}</span>
    `;
}

// ============================================
// GESTIÓN DE USUARIOS
// ============================================
async function loadUsuarios() {
    if (!supabaseClient) return [];

    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('id, nombre, rol, activo, usa_vehiculo')
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;
        AppState.usuarios = data || [];

        // Llenar select de login
        const select = DOM.selectUsuario();
        select.innerHTML = '<option value="">Selecciona tu nombre...</option>';
        data.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.nombre;
            option.dataset.rol = user.rol;
            option.dataset.usaVehiculo = user.usa_vehiculo ? '1' : '0';
            select.appendChild(option);
        });

        // Listener para mostrar/ocultar sección de vehículo
        // Se usa variable de bandera para evitar problema con async en removeEventListener
        if (!select._vehiculoListenerAdded) {
            select.addEventListener('change', onUserSelectChange);
            select._vehiculoListenerAdded = true;
        }
        // Ocultar la sección al recargar usuarios
        DOM.vehiculoSection().classList.add('hidden');

        return data;
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showToast('error', 'Error', 'No se pudieron cargar los usuarios');
        return [];
    }
}

async function onUserSelectChange() {
    const select = DOM.selectUsuario();
    const selected = select.options[select.selectedIndex];
    const section = DOM.vehiculoSection();

    // Si no hay usuario seleccionado (opción en blanco), ocultar siempre
    if (!selected || !selected.value) {
        section.classList.add('hidden');
        DOM.selectVehiculo().removeAttribute('required');
        const kmInput = DOM.inputKmInicial();
        kmInput.removeAttribute('required');
        kmInput.removeAttribute('disabled');
        // Ocultar botón agregar si existe
        const btnAgregar = document.getElementById('btn-agregar-vehiculo');
        if (btnAgregar) btnAgregar.classList.add('hidden');
        return;
    }

    const usaVehiculo = selected.dataset.usaVehiculo === '1';

    if (usaVehiculo) {
        section.classList.remove('hidden');
        DOM.selectVehiculo().setAttribute('required', 'required');
        // NO poner required en km aún — se decide después de cargar el select de vehículos
        await loadVehiculos();
        // Aplicar candado según la opción que quedó seleccionada (sin_asignar por defecto)
        onVehiculoSelectChange();
    } else {
        section.classList.add('hidden');
        DOM.selectVehiculo().removeAttribute('required');
        DOM.inputKmInicial().removeAttribute('required');
        DOM.inputKmInicial().removeAttribute('disabled');
        DOM.inputKmInicial().value = '';
        DOM.selectVehiculo().value = '';
        const btnAgregar = document.getElementById('btn-agregar-vehiculo');
        if (btnAgregar) btnAgregar.classList.add('hidden');
    }
}

async function loadVehiculos() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('id, placa, descripcion')
            .eq('activo', true)
            .order('placa');
        if (error) throw error;
        AppState.vehiculos = data || [];
        const select = DOM.selectVehiculo();
        // REQ 5 — opción por defecto "Sin asignar aún"
        select.innerHTML = '<option value="sin_asignar">Sin asignar aún</option>';
        data.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.placa}${v.descripcion ? ' — ' + v.descripcion : ''}`;
            select.appendChild(opt);
        });
        // Escuchar cambio para mostrar/ocultar km inicial
        if (!select._kmListener) {
            select.addEventListener('change', onVehiculoSelectChange);
            select._kmListener = true;
        }
    } catch (err) {
        console.error('Error cargando vehículos:', err);
    }
}

// REQ 8 — Control dinámico de km según vehículo seleccionado (solo login)
function onVehiculoSelectChange() {
    const select = DOM.selectVehiculo();
    const kmInput = DOM.inputKmInicial();
    const esSinAsignar = select.value === 'sin_asignar';
    applyKmLock(kmInput, esSinAsignar);
}

// REQ 8 — Aplica/quita el candado de validación del km
function applyKmLock(kmInput, deshabilitar) {
    if (deshabilitar) {
        kmInput.removeAttribute('required');
        kmInput.value = '';
        kmInput.setAttribute('disabled', 'disabled');
        kmInput.closest('.form-group').style.opacity = '0.4';
        kmInput.closest('.form-group').style.pointerEvents = 'none';
    } else {
        kmInput.removeAttribute('disabled');
        kmInput.setAttribute('required', 'required');
        kmInput.closest('.form-group').style.opacity = '';
        kmInput.closest('.form-group').style.pointerEvents = '';
    }
}

// ============================================
// MODAL: AGREGAR VEHÍCULO (solo Admin panel)
// ============================================
function openAdminNuevoVehiculoModal() {
    let overlay = document.getElementById('modal-admin-vehiculo');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-admin-vehiculo';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-icon" style="background:linear-gradient(135deg,#6366f1,#4f46e5)">
                        <span class="material-icons-round">two_wheeler</span>
                    </div>
                    <h3>Registrar Vehículo</h3>
                    <p>Solo los administradores pueden agregar vehículos al catálogo</p>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label><span class="material-icons-round">pin</span> Placa</label>
                        <input type="text" id="adm-nv-placa" placeholder="Ej. ABC-1234" style="text-transform:uppercase">
                    </div>
                    <div class="form-group">
                        <label><span class="material-icons-round">directions_car</span> Descripción (Marca / Modelo)</label>
                        <input type="text" id="adm-nv-descripcion" placeholder="Ej. Honda PCX 2022">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btn-adm-nv-cancel" class="btn btn-ghost">Cancelar</button>
                    <button id="btn-adm-nv-save" class="btn btn-primary">
                        <span class="material-icons-round">save</span> Guardar Vehículo
                    </button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        document.getElementById('btn-adm-nv-cancel').addEventListener('click', () => overlay.classList.remove('visible'));
        document.getElementById('btn-adm-nv-save').addEventListener('click', handleAdminSaveNuevoVehiculo);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('visible'); });
    }
    document.getElementById('adm-nv-placa').value = '';
    document.getElementById('adm-nv-descripcion').value = '';
    overlay.classList.add('visible');
    document.getElementById('adm-nv-placa').focus();
}

async function handleAdminSaveNuevoVehiculo() {
    const placa = document.getElementById('adm-nv-placa').value.trim().toUpperCase();
    const descripcion = document.getElementById('adm-nv-descripcion').value.trim();
    if (!placa) { showToast('warning', 'Placa Requerida', 'Escribe la placa del vehículo'); return; }

    const btn = document.getElementById('btn-adm-nv-save');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round spinning">sync</span> Guardando...';
    try {
        const { error } = await supabaseClient
            .from('vehiculos')
            .insert({ placa, descripcion, activo: true });
        if (error) throw error;
        document.getElementById('modal-admin-vehiculo').classList.remove('visible');
        showToast('success', 'Vehículo Registrado', `${placa} añadido al catálogo`);
    } catch (err) {
        console.error('Error al guardar vehículo:', err);
        showToast('error', 'Error', 'No se pudo guardar el vehículo');
    }
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">save</span> Guardar Vehículo';
}

// ============================================
// MODAL: ASIGNAR VEHÍCULO MID-SESSION
// ============================================
function openAsignarVehiculoModal() {
    let overlay = document.getElementById('modal-asignar-vehiculo');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-asignar-vehiculo';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-icon" style="background:linear-gradient(135deg,#10b981,#059669)">
                        <span class="material-icons-round">two_wheeler</span>
                    </div>
                    <h3>Asignar Vehículo</h3>
                    <p>Selecciona el vehículo y registra el kilometraje inicial</p>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label><span class="material-icons-round">directions_car</span> Vehículo</label>
                        <select id="asignar-select-vehiculo"><option value="">Cargando...</option></select>
                    </div>
                    <div class="form-group">
                        <label><span class="material-icons-round">speed</span> Kilometraje Inicial</label>
                        <input type="number" id="asignar-km-inicial" placeholder="Ej. 12500" min="0">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btn-asignar-cancel" class="btn btn-ghost">Cancelar</button>
                    <button id="btn-asignar-save" class="btn btn-primary">
                        <span class="material-icons-round">check_circle</span> Confirmar Asignación
                    </button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        document.getElementById('btn-asignar-cancel').addEventListener('click', () => overlay.classList.remove('visible'));
        document.getElementById('btn-asignar-save').addEventListener('click', handleSaveAsignacionVehiculo);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('visible'); });
    }

    // Cargar vehículos disponibles
    const sel = document.getElementById('asignar-select-vehiculo');
    sel.innerHTML = '<option value="">Selecciona un vehículo...</option>';
    (AppState.vehiculos.length ? Promise.resolve(AppState.vehiculos) :
        supabaseClient.from('vehiculos').select('id,placa,descripcion').eq('activo',true).order('placa')
            .then(r => { AppState.vehiculos = r.data || []; return AppState.vehiculos; })
    ).then(vehiculos => {
        vehiculos.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.placa}${v.descripcion ? ' — ' + v.descripcion : ''}`;
            sel.appendChild(opt);
        });
    });

    document.getElementById('asignar-km-inicial').value = '';
    overlay.classList.add('visible');
}

async function handleSaveAsignacionVehiculo() {
    const vehiculoId = document.getElementById('asignar-select-vehiculo').value;
    const km = document.getElementById('asignar-km-inicial').value;

    if (!vehiculoId) { showToast('warning', 'Vehículo Requerido', 'Selecciona un vehículo'); return; }
    if (!km || isNaN(km) || parseInt(km) < 0) { showToast('warning', 'Km Requerido', 'Ingresa el kilometraje inicial'); return; }

    const btn = document.getElementById('btn-asignar-save');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round spinning">sync</span> Guardando...';

    try {
        const { data: bv, error } = await supabaseClient
            .from('bitacora_vehiculos')
            .insert({
                sesion_id: AppState.currentSession.id,
                usuario_id: AppState.currentUser.id,
                vehiculo_id: vehiculoId,
                km_inicial: parseInt(km)
            })
            .select()
            .single();
        if (error) throw error;

        AppState.currentBitacora = bv;
        document.getElementById('modal-asignar-vehiculo').classList.remove('visible');
        // Ocultar el botón mid-session
        document.getElementById('btn-asignar-vehiculo-wrapper').classList.add('hidden');
        showToast('success', 'Vehículo Asignado', 'El vehículo quedó registrado en tu sesión');
    } catch (err) {
        console.error('Error asignando vehículo:', err);
        showToast('error', 'Error', 'No se pudo asignar el vehículo');
    }
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">check_circle</span> Confirmar Asignación';
}

// ============================================
// LOGIN
// ============================================
async function handleLogin(event) {
    event.preventDefault();

    const userId = DOM.selectUsuario().value;
    const password = DOM.inputPassword().value;
    const select = DOM.selectUsuario();
    const selectedOption = select.options[select.selectedIndex];
    const usaVehiculo = selectedOption && selectedOption.dataset.usaVehiculo === '1';

    if (!userId || !password) {
        showToast('warning', 'Campos Requeridos', 'Selecciona tu usuario y escribe tu contraseña');
        return;
    }

    // REQ 5 — Validar campos de vehículo si aplica
    if (usaVehiculo) {
        const vehiculoId = DOM.selectVehiculo().value;
        const esSinAsignar = vehiculoId === 'sin_asignar';
        const kmInicial = DOM.inputKmInicial().value;
        if (!vehiculoId) {
            showToast('warning', 'Bitácora Requerida', 'Selecciona el vehículo');
            return;
        }
        // Solo exigir km inicial si el vehículo no es "Sin asignar aún"
        if (!esSinAsignar && !kmInicial) {
            showToast('warning', 'Bitácora Requerida', 'Anota el km inicial del vehículo');
            return;
        }
    }

    // Verificar ubicación
    if (!AppState.location) {
        showToast('error', 'Ubicación Requerida', 'Se necesita acceso a tu ubicación para continuar');
        return;
    }

    const btn = DOM.btnLogin();
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round spinning">sync</span> Verificando...';

    try {
        // Verificar credenciales
        const { data: user, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('id', userId)
            .eq('password', password)
            .single();

        if (error || !user) {
            showToast('error', 'Acceso Denegado', 'Contraseña incorrecta');
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons-round">login</span> Iniciar Sesión';
            return;
        }

        AppState.currentUser = user;

        // Detectar dispositivo + IP pública + fingerprint
        const deviceInfo = await getFullDeviceInfo();
        const dispositivo = deviceInfo.label;

        // Si es admin, ir al dashboard
        if (user.rol === 'admin') {
            await loadAdminDashboard();
            navigateTo('view-admin');
            showToast('success', '¡Bienvenido!', `Panel administrativo - ${user.nombre}`);
        } else {
            // Verificar si ya tiene sesión abierta
            const { data: openSession } = await supabaseClient
                .from('sesiones')
                .select('*')
                .eq('usuario_id', user.id)
                .eq('estado', 'abierta')
                .maybeSingle();

            if (openSession) {
                AppState.currentSession = openSession;
                // Recuperar bitácora de vehículo si aplica
                if (user.usa_vehiculo) {
                    const { data: bv } = await supabaseClient
                        .from('bitacora_vehiculos')
                        .select('*')
                        .eq('sesion_id', openSession.id)
                        .maybeSingle();
                    AppState.currentBitacora = bv || null;
                }
                showActiveSession(openSession);
                navigateTo('view-session');
                showToast('info', 'Sesión Restaurada', 'Tu sesión anterior sigue activa');
            } else {
                // Crear nueva sesión
                const direccion = await reverseGeocode(AppState.location.lat, AppState.location.lng);

                const { data: newSession, error: sessionError } = await supabaseClient
                    .from('sesiones')
                    .insert({
                        usuario_id: user.id,
                        fecha_inicio: new Date().toISOString(),
                        latitud_inicio: AppState.location.lat,
                        longitud_inicio: AppState.location.lng,
                        direccion_inicio: direccion,
                        estado: 'abierta',
                        dispositivo: dispositivo
                    })
                    .select()
                    .single();

                if (sessionError) throw sessionError;

                AppState.currentSession = newSession;

                // REQ 5 — Guardar bitácora de vehículo si aplica (omitir si "Sin asignar aún")
                if (user.usa_vehiculo) {
                    const vehiculoId = DOM.selectVehiculo().value;
                    const esSinAsignar = vehiculoId === 'sin_asignar';
                    if (!esSinAsignar) {
                        const kmInicial = parseInt(DOM.inputKmInicial().value);
                        const { data: bv } = await supabaseClient
                            .from('bitacora_vehiculos')
                            .insert({
                                sesion_id: newSession.id,
                                usuario_id: user.id,
                                vehiculo_id: vehiculoId,
                                km_inicial: kmInicial
                            })
                            .select()
                            .single();
                        AppState.currentBitacora = bv || null;
                    } else {
                        AppState.currentBitacora = null;
                    }
                }

                showActiveSession(newSession);
                navigateTo('view-session');
                showToast('success', '¡Sesión Iniciada!', `Bienvenido ${user.nombre}, tu asistencia fue registrada`);
            }
        }

        // Limpiar formulario
        DOM.inputPassword().value = '';
        DOM.inputKmInicial() && (DOM.inputKmInicial().value = '');
    } catch (error) {
        console.error('Error en login:', error);
        showToast('error', 'Error', 'Ocurrió un error al iniciar sesión. Intenta de nuevo.');
    }

    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">login</span> Iniciar Sesión';
}

// ============================================
// SESIÓN ACTIVA
// ============================================
function showActiveSession(session) {
    const user = AppState.currentUser;
    const fechaInicio = new Date(session.fecha_inicio);

    // Nombre y avatar
    DOM.sessionUserName().textContent = user.nombre;

    // Hora de entrada
    DOM.sessionHoraEntrada().textContent = fechaInicio.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // Fecha
    DOM.sessionFecha().textContent = fechaInicio.toLocaleDateString('es-MX', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Fecha completa debajo del timer
    DOM.sessionDate().textContent = fechaInicio.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Ubicación
    if (session.direccion_inicio) {
        DOM.sessionUbicacion().textContent = session.direccion_inicio;
    } else {
        DOM.sessionUbicacion().textContent = 'No disponible';
    }

    // Coordenadas
    if (session.latitud_inicio && session.longitud_inicio) {
        DOM.sessionCoords().textContent = `${session.latitud_inicio.toFixed(6)}, ${session.longitud_inicio.toFixed(6)}`;
    }

    // Botón MID-SESSION: mostrar si usa vehículo pero no tiene bitácora asignada
    const wrapper = document.getElementById('btn-asignar-vehiculo-wrapper');
    const btnAsignar = document.getElementById('btn-asignar-vehiculo');
    if (user.usa_vehiculo && !AppState.currentBitacora) {
        wrapper.classList.remove('hidden');
        if (!btnAsignar._listenerAdded) {
            btnAsignar.addEventListener('click', openAsignarVehiculoModal);
            btnAsignar._listenerAdded = true;
        }
    } else {
        wrapper.classList.add('hidden');
    }

    // Iniciar timer
    startTimer(fechaInicio);
}

function startTimer(startDate) {
    if (AppState.timerInterval) {
        clearInterval(AppState.timerInterval);
    }

    function updateTimer() {
        const now = new Date();
        const diff = Math.floor((now - startDate) / 1000);
        const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const seconds = (diff % 60).toString().padStart(2, '0');
        DOM.sessionTimer().textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateTimer();
    AppState.timerInterval = setInterval(updateTimer, 1000);
}

// ============================================
// CERRAR SESIÓN
// ============================================
function openCloseModal() {
    DOM.modalOverlay().classList.add('visible');
    DOM.modalPassword().value = '';
    DOM.modalPassword().focus();

    // REQ 6 — Mostrar campo km final solo si tiene bitácora activa (vehículo asignado real)
    const kmSection = DOM.modalKmSection();
    if (AppState.currentUser && AppState.currentUser.usa_vehiculo && AppState.currentBitacora) {
        kmSection.classList.remove('hidden');
        DOM.modalKmFinal().value = '';
    } else {
        kmSection.classList.add('hidden');
    }

    // Obtener ubicación de salida
    updateLocationStatus(DOM.modalLocationStatus(), 'loading', 'Obteniendo ubicación de salida...');
    getCurrentLocation()
        .then(loc => {
            AppState.closeLocation = loc;
            updateLocationStatus(DOM.modalLocationStatus(), 'success', `Ubicación obtenida (precisión: ${loc.accuracy.toFixed(0)}m)`);
        })
        .catch(err => {
            console.warn('Usando ubicación por defecto al cerrar:', err.message);
            AppState.closeLocation = DEFAULT_LOCATION;
            updateLocationStatus(DOM.modalLocationStatus(), 'success', 'Ubicación por defecto aplicada (GPS no disponible)');
        });
}

function closeCloseModal() {
    DOM.modalOverlay().classList.remove('visible');
    AppState.closeLocation = null;
}

async function handleCloseSession() {
    const password = DOM.modalPassword().value;

    if (!password) {
        showToast('warning', 'Contraseña Requerida', 'Ingresa tu contraseña para cerrar la sesión');
        return;
    }

    // Verificar contraseña
    if (password !== AppState.currentUser.password) {
        showToast('error', 'Contraseña Incorrecta', 'La contraseña no coincide');
        DOM.modalPassword().value = '';
        DOM.modalPassword().focus();
        return;
    }

    // Validar km final si aplica
    if (AppState.currentUser.usa_vehiculo && AppState.currentBitacora) {
        const kmFinal = DOM.modalKmFinal().value;
        if (!kmFinal) {
            showToast('warning', 'Km Final Requerido', 'Anota el kilometraje final del vehículo');
            return;
        }
        const kmInicial = AppState.currentBitacora.km_inicial;
        if (parseInt(kmFinal) < kmInicial) {
            showToast('warning', 'Km Inválido', `El km final (${kmFinal}) no puede ser menor al inicial (${kmInicial})`);
            return;
        }
    }

    const btn = DOM.btnModalConfirm();
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round spinning">sync</span> Cerrando...';

    try {
        const updateData = {
            estado: 'cerrada',
            fecha_cierre: new Date().toISOString(),
        };

        // Agregar ubicación de cierre si está disponible
        if (AppState.closeLocation) {
            updateData.latitud_cierre = AppState.closeLocation.lat;
            updateData.longitud_cierre = AppState.closeLocation.lng;
            updateData.direccion_cierre = await reverseGeocode(
                AppState.closeLocation.lat,
                AppState.closeLocation.lng
            );
        }

        const { error } = await supabaseClient
            .from('sesiones')
            .update(updateData)
            .eq('id', AppState.currentSession.id);

        if (error) throw error;

        // Actualizar km final en bitácora si aplica
        if (AppState.currentUser.usa_vehiculo && AppState.currentBitacora) {
            const kmFinal = parseInt(DOM.modalKmFinal().value);
            await supabaseClient
                .from('bitacora_vehiculos')
                .update({ km_final: kmFinal })
                .eq('id', AppState.currentBitacora.id);
        }

        // Limpiar estado
        clearInterval(AppState.timerInterval);
        AppState.currentUser = null;
        AppState.currentSession = null;
        AppState.currentBitacora = null;
        AppState.closeLocation = null;

        closeCloseModal();
        navigateTo('view-login');
        showToast('success', 'Sesión Cerrada', 'Tu jornada fue registrada correctamente');

        // Recargar lista de usuarios
        await loadUsuarios();
        requestLocation();
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        showToast('error', 'Error', 'No se pudo cerrar la sesión. Intenta de nuevo.');
    }

    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">logout</span> Confirmar Cierre';
}

// ============================================
// PANEL ADMINISTRATIVO
// ============================================
async function loadAdminDashboard() {
    if (!supabaseClient) return;
    try {
        // REQ 3 — Lazy loading: solo cargar stats + filtros + tab activa por defecto (asistencia)
        AppState.tabsLoaded = {};
        await Promise.all([
            loadStats(),
            loadFilterUsuarios()
        ]);
        // Cargar tab de asistencia (activa por defecto) con ventana de 3 días
        await loadTabAsistencia();
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showToast('error', 'Error', 'No se pudo cargar el panel administrativo');
    }
}

async function loadStats() {
    try {
        // Sesiones activas
        const { count: activas } = await supabaseClient
            .from('sesiones')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'abierta');

        DOM.statActivos().textContent = activas || 0;

        // Registros hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: hoy } = await supabaseClient
            .from('sesiones')
            .select('*', { count: 'exact', head: true })
            .gte('fecha_inicio', today.toISOString());

        DOM.statHoy().textContent = hoy || 0;

        // Esta semana
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        const { count: semana } = await supabaseClient
            .from('sesiones')
            .select('*', { count: 'exact', head: true })
            .gte('fecha_inicio', weekAgo.toISOString());

        DOM.statSemana().textContent = semana || 0;

        // Total mensajeros
        const { count: totalUsuarios } = await supabaseClient
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('rol', 'mensajero')
            .eq('activo', true);

        DOM.statUsuarios().textContent = totalUsuarios || 0;
    } catch (error) {
        console.error('Error cargando stats:', error);
    }
}

async function loadFilterUsuarios() {
    try {
        const { data: usuarios } = await supabaseClient
            .from('usuarios')
            .select('id, nombre')
            .eq('rol', 'mensajero')
            .eq('activo', true)
            .order('nombre');

        const select = DOM.filterUsuario();
        select.innerHTML = '<option value="">Todos los mensajeros</option>';
        (usuarios || []).forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.nombre;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error cargando filtro de usuarios:', error);
    }
}

// REQ 1 — Parseo de fecha seguro (sin problemas de zona horaria)
function parseDateLocal(dateStr) {
    // dateStr viene del input[type=date]: 'YYYY-MM-DD'
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// REQ 4 — Por defecto traer solo los últimos 3 días
function getDefaultDateRange() {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 2); // hoy - 2 = 3 días totales
    start.setHours(0, 0, 0, 0);
    return { start, end };
}

async function loadSesiones(filters = {}) {
    try {
        AppState.currentFilters = filters;

        // REQ 4 — Ventana de 3 días por defecto si no hay filtro de fecha
        const defaultRange = getDefaultDateRange();
        const from = filters.fechaInicio
            ? (() => { const d = parseDateLocal(filters.fechaInicio); d.setHours(0,0,0,0); return d; })()
            : defaultRange.start;
        const to = filters.fechaFin
            ? (() => { const d = parseDateLocal(filters.fechaFin); d.setHours(23,59,59,999); return d; })()
            : defaultRange.end;

        const page = AppState.currentPage;
        const size = AppState.pageSize;
        const rangeFrom = (page - 1) * size;
        const rangeTo = rangeFrom + size - 1;

        let query = supabaseClient
            .from('sesiones')
            .select(`
                id,
                fecha_inicio,
                fecha_cierre,
                latitud_inicio,
                longitud_inicio,
                direccion_inicio,
                latitud_cierre,
                longitud_cierre,
                direccion_cierre,
                estado,
                notas,
                dispositivo,
                usuarios!inner(nombre)
            `, { count: 'exact' })
            .order('fecha_inicio', { ascending: false })
            // REQ 1 — Filtro de fecha corregido con parseo sin zona horaria
            .gte('fecha_inicio', from.toISOString())
            .lte('fecha_inicio', to.toISOString())
            .range(rangeFrom, rangeTo);

        if (filters.usuarioId) {
            query = query.eq('usuario_id', filters.usuarioId);
        }
        if (filters.estado) {
            query = query.eq('estado', filters.estado);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        AppState.sesiones = data || [];
        AppState.totalRecords = count || 0;
        renderTable(AppState.sesiones);
        renderPagination();
    } catch (error) {
        console.error('Error cargando sesiones:', error);
        showToast('error', 'Error', 'No se pudieron cargar los registros');
    }
}

// REQ 4 — Paginación
function renderPagination() {
    const totalPages = Math.ceil(AppState.totalRecords / AppState.pageSize);
    let container = document.getElementById('pagination-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pagination-container';
        container.className = 'pagination-container';
        const panel = document.getElementById('panel-asistencia');
        panel.appendChild(container);
    }

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const page = AppState.currentPage;
    let html = `<div class="pagination">`;
    html += `<button class="pagination-btn" onclick="goToPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>
                <span class="material-icons-round">chevron_left</span> Anterior
             </button>`;

    // Números de página (máx 5 visibles)
    const startP = Math.max(1, page - 2);
    const endP = Math.min(totalPages, startP + 4);
    for (let p = startP; p <= endP; p++) {
        html += `<button class="pagination-num ${p === page ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`;
    }

    html += `<button class="pagination-btn" onclick="goToPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
                Siguiente <span class="material-icons-round">chevron_right</span>
             </button>`;
    html += `<span class="pagination-info">${AppState.totalRecords} registros · Página ${page}/${totalPages}</span>`;
    html += `</div>`;
    container.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(AppState.totalRecords / AppState.pageSize);
    if (page < 1 || page > totalPages) return;
    AppState.currentPage = page;
    loadSesiones(AppState.currentFilters);
    document.getElementById('panel-asistencia').scrollIntoView({ behavior: 'smooth' });
}

// Carga de tabs (siempre frescas tras switchAdminTab)
async function loadTabAsistencia() {
    AppState.currentPage = 1;
    showTableLoader('tabla-body', 9, 'Cargando asistencia...');
    await loadSesiones({});
    AppState.tabsLoaded.asistencia = true;
}

async function loadTabBitacora() {
    // REQ 2 — Bitácora siempre arranca en página 1 con ventana de 3 días
    AppState.bitacoraPage = 1;
    await loadBitacora(1);
    AppState.tabsLoaded.bitacora = true;
}

async function loadTabUsuarios() {
    await loadUsuariosAdmin();
    AppState.tabsLoaded.usuarios = true;
}

function renderTable(sesiones) {
    const tbody = DOM.tablaBody();
    const count = DOM.recordCount();

    if (!sesiones || sesiones.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    <div class="empty-state">
                        <span class="material-icons-round">inbox</span>
                        <p>No hay registros para mostrar</p>
                    </div>
                </td>
            </tr>
        `;
        count.textContent = '0 registros';
        return;
    }

    count.textContent = `${sesiones.length} registro${sesiones.length !== 1 ? 's' : ''}`;

    tbody.innerHTML = sesiones.map(s => {
        const fechaInicio = new Date(s.fecha_inicio);
        const fechaCierre = s.fecha_cierre ? new Date(s.fecha_cierre) : null;

        let horasTrabajadas = '--';
        if (fechaCierre) {
            // REQ 2 — Cálculo correcto: diferencia en minutos totales, no centésimas de hora
            const totalMinutos = Math.round((fechaCierre - fechaInicio) / 1000 / 60);
            const hh = Math.floor(totalMinutos / 60);
            const mm = totalMinutos % 60;
            horasTrabajadas = hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
        }

        const nombreUsuario = s.usuarios?.nombre || 'Desconocido';

        const ubicEntrada = s.direccion_inicio
            ? `<span title="${s.direccion_inicio}">${truncate(s.direccion_inicio, 30)}</span>`
            : (s.latitud_inicio ? `${s.latitud_inicio.toFixed(4)}, ${s.longitud_inicio.toFixed(4)}` : '--');

        const ubicSalida = s.direccion_cierre
            ? `<span title="${s.direccion_cierre}">${truncate(s.direccion_cierre, 30)}</span>`
            : (s.latitud_cierre ? `${s.latitud_cierre.toFixed(4)}, ${s.longitud_cierre.toFixed(4)}` : '--');

        const dispositivoIcon = s.dispositivo
            ? (s.dispositivo.includes('iPhone') || s.dispositivo.includes('iPad') ? 'phone_iphone'
              : s.dispositivo.includes('Android') ? 'smartphone' : 'computer')
            : 'device_unknown';

        // Extraer IP del campo dispositivo si existe
        const ipMatch = s.dispositivo ? s.dispositivo.match(/IP: ([\d.]+)/) : null;
        const ipLabel = ipMatch ? ipMatch[1] : '--';
        const fpMatch = s.dispositivo ? s.dispositivo.match(/ID:([A-F0-9]+)/) : null;
        const fpLabel = fpMatch ? fpMatch[1] : '--';
        const deviceLabel = s.dispositivo ? s.dispositivo.split(' | ')[0] : 'Desconocido';

        return `
            <tr>
                <td><strong>${nombreUsuario}</strong></td>
                <td>${fechaInicio.toLocaleDateString('es-MX')}</td>
                <td>${fechaInicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${fechaCierre ? fechaCierre.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                <td>${horasTrabajadas}</td>
                <td>${ubicEntrada}</td>
                <td>${ubicSalida}</td>
                <td>
                    <div class="device-info-cell" title="${s.dispositivo || 'Sin datos'}">
                        <span class="device-badge">
                            <span class="material-icons-round" style="font-size:14px">${dispositivoIcon}</span>
                            ${truncate(deviceLabel, 16)}
                        </span>
                        <div class="device-sub">
                            <span class="device-ip">IP: ${ipLabel}</span>
                            <span class="device-fp">ID: ${fpLabel}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="table-badge ${s.estado === 'abierta' ? 'open' : 'closed'}">
                        ${s.estado === 'abierta' ? '● Activa' : '● Cerrada'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function truncate(str, max) {
    return str.length > max ? str.substring(0, max) + '...' : str;
}

// ============================================
// BITÁCORA DE VEHÍCULOS
// ============================================
// REQ 2 — Bitácora con ventana de 3 días por defecto + paginación propia
async function loadBitacora(page = 1) {
    if (!supabaseClient) return;

    AppState.bitacoraPage = page;

    // Calcular rango: últimos 3 días por defecto
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 2); // hoy + 2 días atrás = 3 días
    startDate.setHours(0, 0, 0, 0);

    const size = AppState.bitacoraPageSize;
    const rangeFrom = (page - 1) * size;
    const rangeTo = rangeFrom + size - 1;

    showBitacoraLoader(true);
    try {
        const { data, error, count } = await supabaseClient
            .from('bitacora_vehiculos')
            .select(`
                id, km_inicial, km_final, notas, created_at,
                usuarios(nombre),
                vehiculos(placa, descripcion),
                sesiones(fecha_inicio, fecha_cierre, estado)
            `, { count: 'exact' })
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false })
            .range(rangeFrom, rangeTo);

        if (error) throw error;
        AppState.bitacora = data || [];
        AppState.bitacoraTotal = count || 0;
        renderBitacoraTable(AppState.bitacora);
        renderBitacoraPagination();
    } catch (err) {
        console.error('Error cargando bitácora:', err);
        showToast('error', 'Error', 'No se pudo cargar la bitácora');
    } finally {
        showBitacoraLoader(false);
    }
}

function showBitacoraLoader(show) {
    let loader = document.getElementById('bitacora-loader');
    if (!loader) {
        loader = document.createElement('tr');
        loader.id = 'bitacora-loader';
        loader.innerHTML = `<td colspan="8"><div class="empty-state"><span class="material-icons-round spinning">sync</span><p>Cargando bitácora...</p></div></td>`;
    }
    const tbody = DOM.bitacoraBody();
    if (show) {
        tbody.innerHTML = '';
        tbody.appendChild(loader);
        DOM.bitacoraCount().textContent = 'Cargando...';
    }
}

function renderBitacoraPagination() {
    const totalPages = Math.ceil(AppState.bitacoraTotal / AppState.bitacoraPageSize);
    let container = document.getElementById('bitacora-pagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'bitacora-pagination';
        container.className = 'pagination-container';
        document.getElementById('panel-bitacora').appendChild(container);
    }

    if (totalPages <= 1) { container.innerHTML = ''; return; }

    const page = AppState.bitacoraPage;
    const startP = Math.max(1, page - 2);
    const endP = Math.min(totalPages, startP + 4);

    let html = `<div class="pagination">`;
    html += `<button class="pagination-btn" onclick="goToBitacoraPage(${page-1})" ${page===1?'disabled':''}><span class="material-icons-round">chevron_left</span> Anterior</button>`;
    for (let p = startP; p <= endP; p++) {
        html += `<button class="pagination-num ${p===page?'active':''}" onclick="goToBitacoraPage(${p})">${p}</button>`;
    }
    html += `<button class="pagination-btn" onclick="goToBitacoraPage(${page+1})" ${page===totalPages?'disabled':''}> Siguiente <span class="material-icons-round">chevron_right</span></button>`;
    html += `<span class="pagination-info">${AppState.bitacoraTotal} registros (últimos 3 días) · Pág ${page}/${totalPages}</span>`;
    html += `</div>`;
    container.innerHTML = html;
}

function goToBitacoraPage(page) {
    const totalPages = Math.ceil(AppState.bitacoraTotal / AppState.bitacoraPageSize);
    if (page < 1 || page > totalPages) return;
    loadBitacora(page);
    document.getElementById('panel-bitacora').scrollIntoView({ behavior: 'smooth' });
}

function renderBitacoraTable(registros) {
    const tbody = DOM.bitacoraBody();
    const count = DOM.bitacoraCount();

    if (!registros || registros.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    <div class="empty-state">
                        <span class="material-icons-round">two_wheeler</span>
                        <p>No hay registros de vehículos</p>
                    </div>
                </td>
            </tr>`;
        count.textContent = '0 registros';
        return;
    }

    count.textContent = `${registros.length} registro${registros.length !== 1 ? 's' : ''}`;

    tbody.innerHTML = registros.map(r => {
        const fecha = new Date(r.created_at).toLocaleDateString('es-MX');
        const mensajero = r.usuarios?.nombre || '--';
        const placa = r.vehiculos?.placa || '--';
        const vehiculo = r.vehiculos?.descripcion || '--';
        const kmRec = r.km_final != null ? r.km_final - r.km_inicial : '--';
        const estado = r.sesiones?.estado || '--';

        return `
            <tr>
                <td><strong>${mensajero}</strong></td>
                <td>${fecha}</td>
                <td>${vehiculo}</td>
                <td><span class="table-badge open">${placa}</span></td>
                <td>${r.km_inicial.toLocaleString()} km</td>
                <td>${r.km_final != null ? r.km_final.toLocaleString() + ' km' : '<em style="color:#aaa">En ruta</em>'}</td>
                <td>${kmRec !== '--' ? kmRec.toLocaleString() + ' km' : '--'}</td>
                <td><span class="table-badge ${estado === 'abierta' ? 'open' : 'closed'}">${estado === 'abierta' ? '● Activa' : '● Cerrada'}</span></td>
            </tr>`;
    }).join('');
}

// ============================================
// TABS ADMIN
// ============================================
// REQ 1 — Aislamiento estricto: destruir datos de la tab anterior + loader + fetch solo de la nueva
function switchAdminTab(tab) {
    if (AppState.activeTab === tab) return; // ya estamos en esa tab

    // 1. Ocultar/mostrar paneles y activar botón de tab
    ['asistencia', 'bitacora', 'usuarios'].forEach(t => {
        document.getElementById(`panel-${t}`).classList.toggle('hidden', tab !== t);
        document.getElementById(`tab-${t}`).classList.toggle('active', tab === t);
    });

    // 2. Destruir datos de la tab que se abandona
    destroyTabData(AppState.activeTab);

    // 3. Marcar tab activa y marcar como NO cargada para forzar nuevo fetch
    AppState.activeTab = tab;
    AppState.tabsLoaded[tab] = false;

    // 4. Cargar datos de la nueva tab
    if (tab === 'asistencia') {
        showTableLoader('tabla-body', 9, 'Cargando asistencia...');
        loadTabAsistencia();
    } else if (tab === 'bitacora') {
        showBitacoraLoader(true);
        loadTabBitacora();
    } else if (tab === 'usuarios') {
        showUsuariosLoader();
        loadTabUsuarios();
    }
}

// Destruye los datos visuales de una tab cuando se abandona
function destroyTabData(tab) {
    if (tab === 'asistencia') {
        const tbody = DOM.tablaBody();
        if (tbody) tbody.innerHTML = '';
        const pg = document.getElementById('pagination-container');
        if (pg) pg.innerHTML = '';
        DOM.recordCount().textContent = '0 registros';
        AppState.sesiones = [];
    } else if (tab === 'bitacora') {
        const tbody = DOM.bitacoraBody();
        if (tbody) tbody.innerHTML = '';
        const pg = document.getElementById('bitacora-pagination');
        if (pg) pg.innerHTML = '';
        DOM.bitacoraCount().textContent = '0 registros';
        AppState.bitacora = [];
    } else if (tab === 'usuarios') {
        const grid = document.getElementById('usuarios-grid');
        if (grid) grid.innerHTML = '';
        const cnt = document.getElementById('usuarios-count');
        if (cnt) cnt.textContent = '0 usuarios';
    }
}

// Loader de fila para tablas
function showTableLoader(tbodyId, colspan, msg = 'Cargando...') {
    const tbody = document.getElementById(tbodyId);
    if (tbody) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="${colspan}"><div class="empty-state"><span class="material-icons-round spinning">sync</span><p>${msg}</p></div></td></tr>`;
    }
}

function showUsuariosLoader() {
    const grid = document.getElementById('usuarios-grid');
    if (grid) grid.innerHTML = `<div class="empty-state"><span class="material-icons-round spinning">sync</span><p>Cargando usuarios...</p></div>`;
}

// ============================================
// CSV BITÁCORA DE VEHÍCULOS
// ============================================
function exportBitacoraToCSV() {
    if (!AppState.bitacora || AppState.bitacora.length === 0) {
        showToast('warning', 'Sin Datos', 'No hay registros de vehículos para exportar');
        return;
    }

    const headers = [
        'Mensajero',
        'Fecha',
        'Vehículo',
        'Placa',
        'Km Inicial',
        'Km Final',
        'Km Recorridos',
        'Estado Sesión'
    ];

    const rows = AppState.bitacora.map(r => {
        const fecha = new Date(r.created_at).toLocaleDateString('es-MX');
        const kmRec = r.km_final != null ? r.km_final - r.km_inicial : '';
        return [
            r.usuarios?.nombre || '',
            fecha,
            r.vehiculos?.descripcion || '',
            r.vehiculos?.placa || '',
            r.km_inicial ?? '',
            r.km_final ?? '',
            kmRec,
            r.sesiones?.estado || ''
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = `bitacora_vehiculos_${new Date().toISOString().split('T')[0]}.csv`;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Exportado', `${fileName} descargado`);
}

// ============================================
// GESTIÓN DE USUARIOS (PANEL ADMIN)
// ============================================
async function loadUsuariosAdmin() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('id, nombre, rol, activo, usa_vehiculo')
            .eq('activo', true)
            .order('nombre');
        if (error) throw error;
        renderUsuariosGrid(data || []);
    } catch (err) {
        console.error('Error cargando usuarios admin:', err);
        showToast('error', 'Error', 'No se pudo cargar la lista de usuarios');
    }
}

function renderUsuariosGrid(usuarios) {
    const grid = document.getElementById('usuarios-grid');
    const count = document.getElementById('usuarios-count');
    count.textContent = `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''}`;

    if (!usuarios.length) {
        grid.innerHTML = '<div class="empty-state"><span class="material-icons-round">group_off</span><p>No hay usuarios registrados</p></div>';
        return;
    }

    grid.innerHTML = usuarios.map(u => {
        const rolIcon = u.rol === 'admin' ? 'admin_panel_settings' : 'person';
        const rolColor = u.rol === 'admin' ? 'purple' : 'blue';
        return `
            <div class="usuario-card" id="card-${u.id}">
                <div class="usuario-card-header">
                    <div class="info-card-icon ${rolColor}">
                        <span class="material-icons-round">${rolIcon}</span>
                    </div>
                    <div>
                        <div class="usuario-nombre">${u.nombre}</div>
                        <div class="usuario-rol">${u.rol === 'admin' ? 'Administrador' : 'Mensajero'}</div>
                    </div>
                </div>
                <div class="usuario-card-footer">
                    <span class="vehicle-label">
                        <span class="material-icons-round">two_wheeler</span>
                        Usa vehículo
                    </span>
                    <button
                        class="toggle-btn ${u.usa_vehiculo ? 'active' : ''}"
                        onclick="toggleVehiculo('${u.id}', ${u.usa_vehiculo})"
                        id="toggle-${u.id}"
                        title="${u.usa_vehiculo ? 'Quitar vehículo' : 'Asignar vehículo'}"
                    >
                        <span class="toggle-track">
                            <span class="toggle-thumb"></span>
                        </span>
                    </button>
                </div>
            </div>`;
    }).join('');
}

async function toggleVehiculo(userId, currentValue) {
    const newValue = !currentValue;
    const btn = document.getElementById(`toggle-${userId}`);
    if (btn) btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('usuarios')
            .update({ usa_vehiculo: newValue })
            .eq('id', userId);
        if (error) throw error;

        // Actualizar UI sin recargar todo
        if (btn) {
            btn.classList.toggle('active', newValue);
            btn.title = newValue ? 'Quitar vehículo' : 'Asignar vehículo';
            btn.onclick = () => toggleVehiculo(userId, newValue);
        }
        // Actualizar en el select de login también
        const opt = DOM.selectUsuario().querySelector(`option[value="${userId}"]`);
        if (opt) opt.dataset.usaVehiculo = newValue ? '1' : '0';

        showToast('success', 'Actualizado', newValue ? 'Vehículo asignado' : 'Vehículo removido');
    } catch (err) {
        console.error('Error actualizando usuario:', err);
        showToast('error', 'Error', 'No se pudo actualizar el usuario');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ============================================
// FILTROS
// ============================================
function handleFilter() {
    // REQ 1 — Pasar fechas como string 'YYYY-MM-DD'; el parseo seguro ocurre en loadSesiones
    const filters = {
        fechaInicio: DOM.filterFechaInicio().value || null,
        fechaFin: DOM.filterFechaFin().value || null,
        usuarioId: DOM.filterUsuario().value || null,
        estado: DOM.filterEstado().value || null,
    };
    AppState.currentPage = 1; // REQ 4 — Resetear a página 1 al filtrar
    AppState.tabsLoaded.asistencia = false;
    loadSesiones(filters);
    AppState.tabsLoaded.asistencia = true;
}

function handleClearFilters() {
    DOM.filterFechaInicio().value = '';
    DOM.filterFechaFin().value = '';
    DOM.filterUsuario().value = '';
    DOM.filterEstado().value = '';
    AppState.currentPage = 1;
    AppState.currentFilters = {};
    loadSesiones({});
}

// ============================================
// EXPORTAR CSV
// ============================================
function exportToCSV() {
    if (!AppState.sesiones || AppState.sesiones.length === 0) {
        showToast('warning', 'Sin Datos', 'No hay registros para exportar');
        return;
    }

    const headers = [
        'Mensajero',
        'Fecha Inicio',
        'Hora Entrada',
        'Fecha Cierre',
        'Hora Salida',
        'Horas Trabajadas',
        'Latitud Entrada',
        'Longitud Entrada',
        'Dirección Entrada',
        'Latitud Salida',
        'Longitud Salida',
        'Dirección Salida',
        'Dispositivo',
        'IP',
        'ID Dispositivo',
        'Estado'
    ];

    const rows = AppState.sesiones.map(s => {
        const fi = new Date(s.fecha_inicio);
        const fc = s.fecha_cierre ? new Date(s.fecha_cierre) : null;

        let horas = '';
        if (fc) {
            // REQ 2 — Mismo cálculo correcto en el CSV
            const totalMin = Math.round((fc - fi) / 1000 / 60);
            const hh = Math.floor(totalMin / 60);
            const mm = totalMin % 60;
            horas = hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
        }

        const ipM = s.dispositivo ? s.dispositivo.match(/IP: ([\d.]+)/) : null;
        const fpM = s.dispositivo ? s.dispositivo.match(/ID:([A-F0-9]+)/) : null;
        const devLabel = s.dispositivo ? s.dispositivo.split(' | ')[0] : '';

        return [
            s.usuarios?.nombre || 'Desconocido',
            fi.toLocaleDateString('es-MX'),
            fi.toLocaleTimeString('es-MX'),
            fc ? fc.toLocaleDateString('es-MX') : '',
            fc ? fc.toLocaleTimeString('es-MX') : '',
            horas,
            s.latitud_inicio || '',
            s.longitud_inicio || '',
            s.direccion_inicio || '',
            s.latitud_cierre || '',
            s.longitud_cierre || '',
            s.direccion_cierre || '',
            devLabel,
            ipM ? ipM[1] : '',
            fpM ? fpM[1] : '',
            s.estado
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const fileName = `asistencia_${now.toISOString().split('T')[0]}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    showToast('success', 'Exportación Exitosa', `Archivo ${fileName} descargado`);
}

// ============================================
// ADMIN LOGOUT
// ============================================
function handleAdminLogout() {
    AppState.currentUser = null;
    navigateTo('view-login');
    showToast('info', 'Sesión Cerrada', 'Has salido del panel administrativo');
}

// ============================================
// TOGGLE PASSWORD VISIBILITY
// ============================================
function togglePasswordVisibility() {
    const input = DOM.inputPassword();
    const icon = DOM.btnTogglePassword().querySelector('.material-icons-round');

    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility_off';
    }
}

// ============================================
// SOLICITAR UBICACIÓN AL CARGAR
// ============================================
async function requestLocation() {
    const statusEl = DOM.locationStatus();
    updateLocationStatus(statusEl, 'loading', 'Obteniendo ubicación...');

    try {
        const loc = await getCurrentLocation();
        AppState.location = loc;
        updateLocationStatus(statusEl, 'success', `Ubicación obtenida (precisión: ${loc.accuracy.toFixed(0)}m)`);
        DOM.btnLogin().disabled = false;
    } catch (error) {
        console.warn('Usando ubicación por defecto al iniciar:', error.message);
        AppState.location = DEFAULT_LOCATION;
        updateLocationStatus(statusEl, 'success', 'Ubicación por defecto aplicada (GPS no disponible)');
        DOM.btnLogin().disabled = false; // Habilitar de todas formas
    }
}

// ============================================
// VERIFICAR SESIÓN PERSISTENTE (localStorage)
// ============================================
function checkPersistedSession() {
    const saved = localStorage.getItem('active_session');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            return data;
        } catch {
            localStorage.removeItem('active_session');
        }
    }
    return null;
}

function persistSession(userId, sessionId) {
    localStorage.setItem('active_session', JSON.stringify({ userId, sessionId }));
}

function clearPersistedSession() {
    localStorage.removeItem('active_session');
}

// ============================================
// INICIALIZACIÓN
// ============================================
async function initApp() {
    try {
        // Conectar Supabase
        initSupabase();

        // Esperar un momento para el efecto visual
        await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (e) {
        console.error("Error en inicialización:", e);
    } finally {
        // ASEGURAR que el splash desaparezca pase lo que pase
        const splash = document.getElementById('splash-screen');
        const mainApp = document.getElementById('app');
        if (splash) splash.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');
    }

    // Cargar usuarios si hay conexión
    if (supabaseClient) {
        await loadUsuarios();
        
        // Verificar si hay sesión persistida
        const persisted = checkPersistedSession();
        if (persisted) {
            try {
                const { data: user } = await supabaseClient
                    .from('usuarios')
                    .select('*')
                    .eq('id', persisted.userId)
                    .single();

                if (user) {
                    const { data: session } = await supabaseClient
                        .from('sesiones')
                        .select('*')
                        .eq('id', persisted.sessionId)
                        .eq('estado', 'abierta')
                        .single();

                    if (session) {
                        AppState.currentUser = user;
                        AppState.currentSession = session;
                        showActiveSession(session);
                        navigateTo('view-session');
                        showToast('info', 'Sesión Restaurada', `Bienvenido de nuevo, ${user.nombre}`);
                        return;
                    }
                }
            } catch (e) {
                console.error("Error restaurando sesión:", e);
                clearPersistedSession();
            }
        }
        
        // Solicitar ubicación para el login
        requestLocation();
    } else {
        showToast('error', 'Error Crítico', 'No se pudo conectar con Supabase. Revisa tus credenciales en app.js');
    }
}

function setupEventListeners() {
    // Login
    DOM.loginForm().addEventListener('submit', async (e) => {
        await handleLogin(e);
        // Persistir sesión si inició como mensajero
        if (AppState.currentSession) {
            persistSession(AppState.currentUser.id, AppState.currentSession.id);
        }
    });

    DOM.btnTogglePassword().addEventListener('click', togglePasswordVisibility);

    // Session
    DOM.btnCerrarSesion().addEventListener('click', openCloseModal);

    // Modal
    DOM.btnModalCancel().addEventListener('click', closeCloseModal);
    DOM.btnModalConfirm().addEventListener('click', async () => {
        await handleCloseSession();
        clearPersistedSession();
    });

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCloseModal();
        }
    });

    // Click fuera del modal para cerrar
    DOM.modalOverlay().addEventListener('click', (e) => {
        if (e.target === DOM.modalOverlay()) {
            closeCloseModal();
        }
    });

    // Admin
    DOM.btnAdminLogout().addEventListener('click', handleAdminLogout);
    DOM.btnFiltrar().addEventListener('click', handleFilter);
    DOM.btnLimpiarFiltros().addEventListener('click', handleClearFilters);
    DOM.btnExportCSV().addEventListener('click', exportToCSV);
    DOM.btnRefresh().addEventListener('click', () => {
        loadAdminDashboard();
        showToast('info', 'Actualizado', 'Datos actualizados correctamente');
    });
}

// ============================================
// ARRANCAR LA APLICACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

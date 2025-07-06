# 📹 EZVIZ Camera Platform

Una plataforma web profesional fullstack para visualizar cámaras EZVIZ en vivo y sus grabaciones locales. Cada usuario puede agregar múltiples cámaras y visualizarlas desde un panel centralizado.

## ✨ Características

### 🔐 Autenticación y Usuarios
- Registro y login de usuarios
- Autenticación JWT segura
- Cada usuario gestiona sus propias cámaras
- Protección de rutas y datos

### 📹 Gestión de Cámaras
- Agregar cámaras con serial y nombre personalizado
- Soporte para cámaras encriptadas con código de verificación
- Editar y eliminar cámaras
- Estadísticas de cámaras (total, encriptadas, no encriptadas)

### 🎥 Visualización en Vivo
- Reproducción de streams HLS (.m3u8) en tiempo real
- Controles de video (play/pause, volumen, pantalla completa)
- Interfaz moderna y responsiva
- Indicador de estado en vivo

### 📼 Reproducción de Grabaciones
- Búsqueda de grabaciones por rango de fecha/hora
- Lista de grabaciones disponibles
- Reproducción de grabaciones locales
- Controles de video completos

### 🔧 Backend Robusto
- Renovación automática del accessToken EZVIZ (cada 6 días)
- Manejo de errores de API EZVIZ
- Validación de datos
- Rate limiting y seguridad
- Base de datos MongoDB

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** + **Express.js** - Servidor web
- **MongoDB** + **Mongoose** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Encriptación de contraseñas
- **axios** - Cliente HTTP
- **node-cron** - Programación de tareas
- **express-validator** - Validación de datos
- **helmet** - Seguridad

### Frontend
- **React** - Framework de UI
- **TailwindCSS** - Framework de estilos
- **React Router** - Navegación
- **HLS.js** - Reproducción de video HLS
- **axios** - Cliente HTTP
- **react-hot-toast** - Notificaciones
- **react-icons** - Iconos
- **date-fns** - Manipulación de fechas

## 📋 Requisitos Previos

- Node.js (v16 o superior)
- MongoDB (local o Atlas)
- Cuenta de desarrollador EZVIZ con appKey y appSecret

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd ezviz-camera-platform
```

### 2. Instalar dependencias
```bash
# Instalar dependencias del backend
npm install

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

### 3. Configurar variables de entorno
```bash
# Copiar el archivo de ejemplo
cp env.example .env

# Editar .env con tus credenciales
```

Configura las siguientes variables en `.env`:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ezviz_platform

# JWT Secret (genera una clave segura)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# EZVIZ API Configuration (obtén estas credenciales de EZVIZ)
EZVIZ_APP_KEY=your_ezviz_app_key
EZVIZ_APP_SECRET=your_ezviz_app_secret

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Configurar MongoDB
Asegúrate de que MongoDB esté ejecutándose. Si usas MongoDB local:
```bash
# Iniciar MongoDB (Ubuntu/Debian)
sudo systemctl start mongod

# O en macOS con Homebrew
brew services start mongodb-community
```

### 5. Ejecutar la aplicación

#### Desarrollo (ambos servidores)
```bash
npm run dev
```

#### Solo backend
```bash
npm run server
```

#### Solo frontend
```bash
cd frontend
npm start
```

#### Producción
```bash
# Construir frontend
npm run build

# Iniciar servidor de producción
npm start
```

## 🌐 Acceso a la Aplicación

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 📖 Uso

### 1. Registro/Login
- Accede a http://localhost:3000
- Regístrate con un nuevo usuario o inicia sesión
- Los tokens JWT se almacenan automáticamente

### 2. Agregar Cámaras
- En el dashboard, haz clic en "Add Camera"
- Ingresa el serial de la cámara (encontrado en la etiqueta del dispositivo)
- Asigna un nombre descriptivo
- Marca si la cámara está encriptada y proporciona el código de verificación

### 3. Visualización en Vivo
- En el dashboard, haz clic en "Live View" para cualquier cámara
- El stream se cargará automáticamente
- Usa los controles para pausar, ajustar volumen, etc.

### 4. Ver Grabaciones
- Haz clic en "Recordings" para cualquier cámara
- Selecciona el rango de fecha/hora
- Busca las grabaciones disponibles
- Haz clic en una grabación para reproducirla

## 🔧 Configuración de EZVIZ

### Obtener Credenciales
1. Ve a [EZVIZ Open Platform](https://open.ezvizlife.com/)
2. Crea una cuenta de desarrollador
3. Crea una nueva aplicación
4. Obtén el `appKey` y `appSecret`

### Configurar Cámaras
1. Asegúrate de que tus cámaras estén registradas en EZVIZ
2. El serial de la cámara se encuentra en la etiqueta del dispositivo
3. Si la cámara tiene encriptación habilitada, necesitarás el código de verificación

## 🔒 Seguridad

### Características de Seguridad Implementadas
- **JWT Tokens**: Autenticación segura con expiración
- **Encriptación de Contraseñas**: bcrypt con salt
- **Rate Limiting**: Protección contra ataques de fuerza bruta
- **Helmet**: Headers de seguridad HTTP
- **Validación de Datos**: Sanitización de inputs
- **CORS**: Configuración segura para cross-origin
- **Protección de Rutas**: Middleware de autenticación

### Buenas Prácticas
- Nunca expongas el `appSecret` en el frontend
- Usa HTTPS en producción
- Cambia el `JWT_SECRET` en producción
- Configura MongoDB con autenticación
- Monitorea los logs del servidor

## 🐛 Solución de Problemas

### Error de Conexión a MongoDB
```bash
# Verificar que MongoDB esté ejecutándose
sudo systemctl status mongod

# Verificar la URI de conexión en .env
MONGODB_URI=mongodb://localhost:27017/ezviz_platform
```

### Error de EZVIZ API
- Verifica que las credenciales `EZVIZ_APP_KEY` y `EZVIZ_APP_SECRET` sean correctas
- Asegúrate de que la aplicación esté activa en EZVIZ
- Revisa los logs del servidor para errores específicos

### Error de Video Stream
- Verifica que la cámara esté en línea
- Confirma que el serial de la cámara sea correcto
- Para cámaras encriptadas, verifica el código de verificación

### Problemas de CORS
- Verifica que `FRONTEND_URL` en `.env` coincida con la URL del frontend
- En desarrollo, asegúrate de que el proxy esté configurado en `frontend/package.json`

## 📁 Estructura del Proyecto

```
ezviz-camera-platform/
├── backend/
│   ├── models/          # Modelos de MongoDB
│   ├── routes/          # Rutas de la API
│   ├── middleware/      # Middleware de autenticación
│   ├── services/        # Servicios EZVIZ
│   ├── utils/           # Utilidades
│   └── server.js        # Servidor principal
├── frontend/
│   ├── public/          # Archivos públicos
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── contexts/    # Contextos (Auth)
│   │   ├── pages/       # Páginas principales
│   │   ├── App.js       # Componente principal
│   │   └── index.js     # Punto de entrada
│   ├── package.json
│   └── tailwind.config.js
├── docs/                # Documentación
├── package.json         # Dependencias del backend
├── env.example          # Variables de entorno de ejemplo
└── README.md           # Este archivo
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa la sección de [Solución de Problemas](#-solución-de-problemas)
2. Verifica los logs del servidor
3. Abre un issue en GitHub
4. Contacta al equipo de desarrollo

## 🔄 Actualizaciones

Para mantener la aplicación actualizada:

```bash
# Actualizar dependencias del backend
npm update

# Actualizar dependencias del frontend
cd frontend
npm update
cd ..

# Verificar vulnerabilidades
npm audit
npm audit fix
```

---

**¡Disfruta monitoreando tus cámaras EZVIZ! 🎥✨** 
# TaskPro Frontend

Cliente web de **TaskPro**, una plataforma de gestión de proyectos y tareas colaborativas. Permite organizar equipos, visualizar el avance en tableros Kanban, asignar responsables y consultar métricas de rendimiento en tiempo real.

Desarrollado con **Angular 19** como aplicación SPA standalone, con autenticación JWT, control de acceso por roles y una interfaz basada en Angular Material.

---

## Características principales

| Módulo | Descripción |
|--------|-------------|
| **Autenticación** | Inicio de sesión con JWT, persistencia de sesión y cierre automático ante respuestas 401. |
| **Dashboard** | Vista general con KPIs: proyectos activos, tareas totales, completadas, vencidas, progreso por proyecto y distribución por prioridad. |
| **Proyectos** | Creación y edición mediante modales, listado en tarjetas, detalle del proyecto y acceso directo al Kanban. |
| **Kanban** | Tablero drag-and-drop con columnas *Pendiente*, *En proceso* y *Finalizada*; vista expandida por columna, detalle rápido de tareas y enlace a la vista completa. |
| **Tareas** | Listado agrupado por proyecto, creación/edición con modales, vista detallada con historial de actividad y comentarios con adjuntos. |
| **Métricas por proyecto** | Indicadores de avance, carga por usuario, eficiencia del equipo y filtrado por periodo. |
| **Usuarios** *(solo ADMIN)* | Administración de cuentas, roles y estado de acceso. |

---

## Control de acceso por roles

La aplicación define tres roles con permisos diferenciados:

| Acción | ADMIN | GERENTE | COLABORADOR |
|--------|:-----:|:-------:|:-----------:|
| Ver dashboard, proyectos y tareas | ✓ | ✓ | ✓ |
| Crear proyectos | ✓ | ✓ | ✓ |
| Editar proyectos | ✓ | ✓ | — |
| Asignar miembros a proyectos | ✓ | ✓ | — |
| Asignar usuarios a tareas | ✓ | ✓ | — |
| Eliminar tareas (Kanban) | ✓ | ✓ | — |
| Administrar usuarios | ✓ | — | — |
| Mover tareas en el Kanban | ✓ | ✓ | ✓ |

Tras el login, la redirección inicial depende del rol: **ADMIN** → Usuarios, **GERENTE** → Proyectos, **COLABORADOR** → Dashboard.

---

## Stack tecnológico

- **Framework:** Angular 19 (componentes standalone, lazy loading)
- **UI:** Angular Material 19 + Angular CDK (drag-and-drop)
- **Estilos:** SCSS con variables CSS personalizadas
- **Estado reactivo:** Angular Signals + RxJS
- **Formularios:** Reactive Forms
- **HTTP:** `HttpClient` con interceptor de autenticación
- **Build:** Angular CLI / esbuild

---

## Requisitos previos

- [Node.js](https://nodejs.org/) 18 o superior
- [npm](https://www.npmjs.com/) 9 o superior
- Backend **TaskPro API** en ejecución (por defecto en `http://localhost:3000`)

---

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd TaskPro-Frontend

# Instalar dependencias
npm install
```

---

## Desarrollo

Inicia el servidor de desarrollo:

```bash
npm start
# equivalente a: ng serve
```

Abre [http://localhost:4200](http://localhost:4200) en el navegador. La aplicación se recarga automáticamente al guardar cambios en el código fuente.

> **Nota:** El frontend espera que la API esté disponible en `http://localhost:3000/api`. La URL base está definida en los servicios de `src/app/core/services/` y en los servicios de cada feature. Ajusta esas constantes si tu backend corre en otro host o puerto.

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Servidor de desarrollo en el puerto 4200 |
| `npm run build` | Compilación de producción en `dist/taskpro-frontend` |
| `npm run watch` | Compilación en modo desarrollo con recarga |
| `npm test` | Ejecución de pruebas unitarias con Karma + Jasmine |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── core/                    # Lógica transversal
│   │   ├── guards/              # authGuard, roleGuard
│   │   ├── interceptors/        # Inyección de token JWT
│   │   ├── models/              # Tipos e interfaces compartidas
│   │   └── services/            # AuthService, UsersService
│   │
│   ├── features/                # Módulos funcionales (lazy loaded)
│   │   ├── auth/                # Login
│   │   ├── dashboard/           # Vista general y métricas globales
│   │   ├── projects/            # CRUD de proyectos, detalle y métricas
│   │   ├── tasks/               # Gestión y vista detallada de tareas
│   │   ├── kanban/              # Tablero Kanban por proyecto
│   │   └── users/               # Administración de usuarios (ADMIN)
│   │
│   ├── shared/                  # Componentes reutilizables
│   │   └── components/
│   │       ├── app-shell/       # Layout con sidebar y toolbar
│   │       ├── confirm-dialog/  # Diálogo de confirmación
│   │       ├── task-detail-dialog/
│   │       ├── task-form-modal/
│   │       ├── project-form-modal/
│   │       └── user-search-modal/
│   │
│   ├── app.routes.ts            # Definición de rutas
│   └── app.config.ts            # Providers globales
│
├── index.html
└── styles.scss                  # Estilos globales y design tokens

public/
├── favicon.ico
├── favicon.png
└── favicon.svg
```

---

## Rutas principales

| Ruta | Descripción | Guard |
|------|-------------|-------|
| `/auth/login` | Inicio de sesión | — |
| `/dashboard` | Panel de control | Auth |
| `/projects` | Listado de proyectos | Auth |
| `/projects/:id` | Detalle del proyecto | Auth |
| `/projects/:id/metrics` | Métricas del proyecto | Auth |
| `/tasks` | Tareas agrupadas por proyecto | Auth |
| `/tasks/:id/view` | Vista detallada de una tarea | Auth |
| `/kanban/:projectId` | Tablero Kanban | Auth |
| `/users` | Gestión de usuarios | Auth + ADMIN |

---

## Integración con la API

El frontend consume los siguientes endpoints (prefijo base: `/api`):

| Recurso | Endpoints |
|---------|-----------|
| Auth | `POST /auth/login` |
| Proyectos | `GET/POST /projects`, `GET/PUT /projects/:id`, `PATCH /projects/:id/members`, `GET /projects/:id/metrics` |
| Tareas | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/:id`, `PATCH /tasks/:id/status`, `GET /tasks/kanban/:projectId`, `GET /tasks/:id/activity` |
| Comentarios | `GET /comments/task/:taskId`, `POST /comments` |
| Dashboard | `GET /dashboard/metrics` |
| Usuarios | `GET/POST/PUT /users` |

Todas las peticiones autenticadas incluyen el header `Authorization: Bearer <token>` mediante el interceptor HTTP.

---

## Build de producción

```bash
npm run build
```

Los artefactos se generan en `dist/taskpro-frontend/`. Sirve esa carpeta con cualquier servidor estático (Nginx, Apache, etc.) o despliega en la plataforma de tu preferencia.

---

## Pruebas

```bash
npm test
```

Las pruebas unitarias se ejecutan con **Karma** y **Jasmine** en un navegador headless o interactivo según la configuración local.

---

## Licencia

Proyecto académico — Universidad del Valle.

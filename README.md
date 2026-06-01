# ITO Servicios - Sistema de Gestion

Sistema completo para gestionar ventas, mantenimiento y reparaciones de equipos electronicos y bombas de agua.

## Puertos

- **Frontend:** http://localhost:3005
- **Backend API:** http://localhost:8000
- **Docs API:** http://localhost:8000/docs

## Instalacion Rapida

1. Ejecutar `iniciar_backend.bat`
2. Ejecutar `iniciar_frontend.bat`
3. Abrir http://localhost:3005

## Credenciales

- Admin: admin@ito.com / admin123
- Tecnico 1: tecnico1@ito.com / tecnico123
- Tecnico 2: tecnico2@ito.com / tecnico123

## Cambios de Puerto

Si necesitas cambiar el puerto del frontend:
1. Editar `frontend/package.json` - cambiar 3005 por otro puerto
2. Editar `iniciar_frontend.bat` - cambiar el mensaje
3. Reiniciar el servidor

Si necesitas cambiar el puerto del backend:
1. Editar `iniciar_backend.bat` - cambiar 8000 por otro puerto
2. Editar `frontend/.env.local` - cambiar NEXT_PUBLIC_API_URL
3. Reiniciar el servidor
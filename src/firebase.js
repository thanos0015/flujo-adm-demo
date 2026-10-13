// La demo pública funciona sin autenticación, base de datos ni acceso al
// proyecto Firebase privado. Estas funciones solo conservan la interfaz
// común con la aplicación principal; las ramas de producción no se usan aquí.
export const configured = false;
export const login = async () => { throw new Error('Esta es una demo sin inicio de sesión.'); };
export const logout = async () => {};
export const watchAuth = () => () => {};
export const watchAccount = () => () => {};
export const saveMovement = async () => { throw new Error('La demo no se conecta a Firebase.'); };

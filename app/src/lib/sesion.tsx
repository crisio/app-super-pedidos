import { useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { PedirCodigo, Sesion, VerificarCodigo } from "@super-pedidos/compartido";
import { borrarSesion, guardarSesion, leerSesionGuardada } from "./almacen-sesion";
import { ErrorDeApi, llamarApi, type OpcionesLlamada } from "./api";

type ContextoSesion = {
  sesion: Sesion | null;
  cargando: boolean;
  entrar: (usuario: string, clave: string) => Promise<void>;
  // Entrar por correo: primero se pide el código y luego se entra con él.
  pedirCodigo: (correo: string) => Promise<void>;
  entrarConCodigo: (correo: string, codigo: string) => Promise<void>;
  salir: () => Promise<void>;
};

const Contexto = createContext<ContextoSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const clienteConsultas = useQueryClient();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    leerSesionGuardada().then((guardada) => {
      if (!vigente) return;
      try {
        setSesion(guardada ? (JSON.parse(guardada) as Sesion) : null);
      } catch {
        setSesion(null);
      }
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, []);

  async function abrir(nueva: Sesion) {
    await guardarSesion(JSON.stringify(nueva));
    setSesion(nueva);
  }

  async function entrar(usuario: string, clave: string) {
    await abrir(await llamarApi<Sesion>("/sesion", { metodo: "POST", cuerpo: { usuario, clave } }));
  }

  async function pedirCodigo(correo: string) {
    const cuerpo: PedirCodigo = { correo };
    await llamarApi("/sesion/codigo", { metodo: "POST", cuerpo });
  }

  async function entrarConCodigo(correo: string, codigo: string) {
    const cuerpo: VerificarCodigo = { correo, codigo };
    await abrir(await llamarApi<Sesion>("/sesion/codigo/verificar", { metodo: "POST", cuerpo }));
  }

  async function salir() {
    const token = sesion?.token;
    setSesion(null);
    clienteConsultas.clear();
    await borrarSesion();
    if (token) await llamarApi("/sesion", { metodo: "DELETE", token }).catch(() => undefined);
  }

  return (
    <Contexto value={{ sesion, cargando, entrar, pedirCodigo, entrarConCodigo, salir }}>{children}</Contexto>
  );
}

export function useSesion() {
  const contexto = use(Contexto);
  if (!contexto) throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  return contexto;
}

// Para pantallas que solo se muestran con sesión iniciada.
export function useUsuario() {
  const { sesion } = useSesion();
  if (!sesion) throw new Error("No hay sesión iniciada");
  return sesion.usuario;
}

// Llama a la API con el token de la sesión; si el token venció, cierra la sesión.
export function useApi() {
  const { sesion, salir } = useSesion();
  return async function api<T>(ruta: string, opciones: Omit<OpcionesLlamada, "token"> = {}) {
    try {
      return await llamarApi<T>(ruta, { ...opciones, token: sesion?.token });
    } catch (error) {
      if (error instanceof ErrorDeApi && error.status === 401) await salir();
      throw error;
    }
  };
}

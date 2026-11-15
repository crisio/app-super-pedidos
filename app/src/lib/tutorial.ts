// Tutorial "Así funciona": los pasos que ve cada persona la primera vez que entra.
// Los muestran tutorial.tsx (web y Android) y tutorial.ios.tsx (iOS).
import { useRouter } from "expo-router";
import { useEffect } from "react";
import type { SFSymbol } from "sf-symbols-typescript";
import type { Rol } from "@super-pedidos/compartido";
import { guardarPreferencia, leerPreferencia } from "./almacen-preferencias";

export type PasoTutorial = {
  clave: "correo" | "bandeja" | "avanzar" | "cliente" | "nuevo" | "disponibilidad" | "locales";
  // Ícono de iOS (SF Symbols); la web usa su propio ícono de Lucide para cada clave.
  simbolo: SFSymbol;
  titulo: string;
  texto: string;
};

export function pasosTutorial(rol: Rol): PasoTutorial[] {
  return [
    {
      clave: "correo",
      simbolo: "envelope.badge",
      titulo: "Entras con tu correo",
      texto:
        "Escribes tu correo y te llega un código de 6 números que vence en 10 minutos. En iPhone, el código aparece solo encima del teclado.",
    },
    {
      clave: "bandeja",
      simbolo: "tray.full",
      titulo: "Todos los pedidos llegan a la bandeja",
      texto:
        "App, WhatsApp, teléfono, redes y deliveries externos, en un solo lugar. Se actualiza sola y la pestaña avisa cuántos pedidos nuevos hay.",
    },
    {
      clave: "avanzar",
      simbolo: "arrow.forward.circle",
      titulo: "Avanzas cada pedido",
      texto:
        "Lo abres y tocas el botón principal: aceptar, preparar, listo, en camino y entregado. Si se cae, lo cancelas con el motivo. Todo queda en el historial.",
    },
    {
      clave: "cliente",
      simbolo: "message",
      titulo: "Le avisas al cliente",
      texto: "Desde el pedido lo llamas o le escribes por WhatsApp con el estado ya redactado.",
    },
    {
      clave: "nuevo",
      simbolo: "plus.circle",
      titulo: "Capturas pedidos de WhatsApp o teléfono",
      texto:
        "En Nuevo pedido eliges por dónde llegó, el cliente, la entrega y los productos. Solo aparecen los disponibles en ese local y el total se calcula solo.",
    },
    {
      clave: "disponibilidad",
      simbolo: "shippingbox",
      titulo: "Marcas lo que se agotó",
      texto: "En Disponibilidad apagas un producto y deja de aparecer en los pedidos nuevos de ese local.",
    },
    rol === "central"
      ? {
          clave: "locales",
          simbolo: "storefront",
          titulo: "Ves todos los locales",
          texto:
            "Puedes ver todos los locales juntos o elegir uno. El inventario de SAP se importa desde la web, en Importar SAP.",
        }
      : {
          clave: "locales",
          simbolo: "storefront",
          titulo: "Trabajas con tu local",
          texto: "Ves y atiendes solo los pedidos y la disponibilidad de tu local.",
        },
  ];
}

const clave = (usuarioId: string) => `tutorial.${usuarioId}`;

export function marcarTutorialVisto(usuarioId: string) {
  return guardarPreferencia(clave(usuarioId), "1");
}

// La primera vez que alguien entra en este dispositivo, abre el tutorial.
export function useTutorialLaPrimeraVez(usuarioId: string) {
  const router = useRouter();
  useEffect(() => {
    let vigente = true;
    leerPreferencia(clave(usuarioId)).then((visto) => {
      if (vigente && !visto) router.push("/tutorial");
    });
    return () => {
      vigente = false;
    };
  }, [usuarioId, router]);
}

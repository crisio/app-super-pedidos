// Tutorial en la web y Android: los mismos pasos que en iOS, con el diseño de la web.
import { useRouter } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { Text, View } from "react-native";
import {
  ArrowRight,
  CircleArrowRight,
  CirclePlus,
  Inbox,
  Mail,
  MessageCircle,
  Package,
  Store,
} from "@/components/iconos";
import { Aparecer, Boton, Encabezado, Pantalla, Tarjeta } from "@/components/ui";
import { useUsuario } from "@/lib/sesion";
import { marcarTutorialVisto, pasosTutorial, type PasoTutorial } from "@/lib/tutorial";
import { colores } from "@/tema";

const iconos: Record<PasoTutorial["clave"], ReactNode> = {
  correo: <Mail size={18} color={colores.marca} />,
  bandeja: <Inbox size={18} color={colores.marca} />,
  avanzar: <CircleArrowRight size={18} color={colores.marca} />,
  cliente: <MessageCircle size={18} color={colores.marca} />,
  nuevo: <CirclePlus size={18} color={colores.marca} />,
  disponibilidad: <Package size={18} color={colores.marca} />,
  locales: <Store size={18} color={colores.marca} />,
};

export default function Tutorial() {
  const usuario = useUsuario();
  const router = useRouter();
  const pasos = pasosTutorial(usuario.rol);

  useEffect(() => {
    marcarTutorialVisto(usuario.id);
  }, [usuario.id]);

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <Pantalla>
      <Encabezado
        etiqueta="Tutorial"
        titulo="Así funciona Super Pedidos"
        descripcion="Lo básico para atender los pedidos de tus locales, en la web o en el celular."
      />
      <View className="gap-3">
        {pasos.map((paso, indice) => (
          <Aparecer key={paso.clave} indice={indice}>
            <Tarjeta className="flex-row items-start gap-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
                {iconos[paso.clave]}
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Paso {indice + 1}
                </Text>
                <Text className="text-base font-semibold text-white">{paso.titulo}</Text>
                <Text className="text-sm leading-5 text-zinc-400">{paso.texto}</Text>
              </View>
            </Tarjeta>
          </Aparecer>
        ))}
      </View>
      <Boton
        titulo="Empezar"
        onPress={cerrar}
        icono={<ArrowRight size={18} color={colores.sobreMarca} />}
        iconoAlFinal
      />
    </Pantalla>
  );
}

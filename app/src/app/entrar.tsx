import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowRight, ShoppingBasket } from "@/components/iconos";
import { Boton, Campo, EtiquetaEnVivo, FondoDecorado, MensajeError, Tarjeta } from "@/components/ui";
import { mensajeDeError } from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import { colores, degradadoMarca } from "@/tema";

export default function Entrar() {
  const { entrar } = useSesion();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!usuario.trim() || !clave) {
      setError("Escribe tu usuario y contraseña.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await entrar(usuario.trim(), clave);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  }

  return (
    <View className="flex-1 bg-fondo">
      <FondoDecorado intensidad={0.28} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", padding: 16 }}
      >
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={{ width: "100%", maxWidth: 400, gap: 32, alignSelf: "center" }}
        >
          <View className="items-center gap-4">
            <LinearGradient
              colors={[...degradadoMarca]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 40px rgba(52, 211, 153, 0.45)",
              }}
            >
              <ShoppingBasket size={30} color={colores.sobreMarca} />
            </LinearGradient>
            <EtiquetaEnVivo texto="Bandeja central de pedidos" centrada />
            <View className="items-center gap-2">
              <Text className="text-center text-4xl font-bold tracking-tight text-white">Super Pedidos</Text>
              <Text className="text-center text-[15px] leading-6 text-zinc-400">
                Todos los pedidos de tus locales, de todos los canales, en un solo lugar.
              </Text>
            </View>
          </View>

          <Tarjeta brillo className="gap-4">
            <Campo
              etiqueta="Usuario"
              value={usuario}
              onChangeText={setUsuario}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
            />
            <Campo
              etiqueta="Contraseña"
              value={clave}
              onChangeText={setClave}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={enviar}
            />
            {error ? <MensajeError mensaje={error} /> : null}
            <Boton
              titulo="Entrar"
              onPress={enviar}
              cargando={enviando}
              icono={<ArrowRight size={18} color={colores.sobreMarca} />}
              iconoAlFinal
            />
          </Tarjeta>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

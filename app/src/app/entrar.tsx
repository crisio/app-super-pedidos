import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowRight, ShoppingBasket } from "@/components/iconos";
import { Boton, Campo, EtiquetaEnVivo, FondoDecorado, MensajeError, Tarjeta } from "@/components/ui";
import { ErrorDeApi, mensajeDeError } from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import { colores, degradadoMarca } from "@/tema";

type Paso = "correo" | "codigo" | "clave";

const ESPERA_REENVIO_S = 30;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Entrar con el código de 6 números que llega por correo. Usuario y contraseña quedan como respaldo.
export default function Entrar() {
  const { entrar, pedirCodigo, entrarConCodigo } = useSesion();
  const [paso, setPaso] = useState<Paso>("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  // Cuenta regresiva para poder pedir otro código.
  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  async function intentar(accion: () => Promise<void>, traducir?: (error: unknown) => string | undefined) {
    setEnviando(true);
    setError(null);
    try {
      await accion();
      return true;
    } catch (e) {
      setError(traducir?.(e) ?? mensajeDeError(e));
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function enviarCorreo() {
    const limpio = correo.trim().toLowerCase();
    if (!CORREO_VALIDO.test(limpio)) {
      setError("Escribe tu correo completo, por ejemplo ana@supercoquin.com.");
      return;
    }
    const enviado = await intentar(
      () => pedirCodigo(limpio),
      (e) => {
        // La API publicada todavía no tiene la entrada por correo (o le falta la clave de Resend).
        if (e instanceof ErrorDeApi && (e.status === 404 || e.status === 503)) {
          setPaso("clave");
          return "La entrada por correo todavía no está lista. Entra con tu usuario y contraseña.";
        }
      },
    );
    if (enviado) {
      setCorreo(limpio);
      setCodigo("");
      setEspera(ESPERA_REENVIO_S);
      setPaso("codigo");
    }
  }

  async function verificar(valor = codigo) {
    if (!/^\d{6}$/.test(valor)) {
      setError("El código tiene 6 números.");
      return;
    }
    if (!(await intentar(() => entrarConCodigo(correo, valor)))) setCodigo("");
  }

  function cambiarCodigo(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, 6);
    setCodigo(digitos);
    if (digitos.length === 6 && !enviando) verificar(digitos);
  }

  async function entrarConClave() {
    if (!usuario.trim() || !clave) {
      setError("Escribe tu usuario y contraseña.");
      return;
    }
    await intentar(() => entrar(usuario.trim(), clave));
  }

  function irA(nuevo: Paso) {
    setError(null);
    setPaso(nuevo);
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
            {paso === "codigo" ? (
              <Text className="text-sm leading-5 text-zinc-300">
                Enviamos un código de 6 números a <Text className="font-semibold text-white">{correo}</Text>.
              </Text>
            ) : null}
            {paso === "correo" ? (
              <Campo
                etiqueta="Correo"
                value={correo}
                onChangeText={setCorreo}
                placeholder="tu@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={enviarCorreo}
                autoFocus
              />
            ) : paso === "codigo" ? (
              <Campo
                etiqueta="Código"
                value={codigo}
                onChangeText={cambiarCodigo}
                placeholder="000000"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
              />
            ) : (
              <>
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
                  onSubmitEditing={entrarConClave}
                />
              </>
            )}
            {error ? <MensajeError mensaje={error} /> : null}
            <Boton
              titulo={paso === "correo" ? "Enviarme un código" : "Entrar"}
              onPress={
                paso === "correo" ? enviarCorreo : paso === "codigo" ? () => verificar() : entrarConClave
              }
              cargando={enviando}
              icono={<ArrowRight size={18} color={colores.sobreMarca} />}
              iconoAlFinal
            />
            <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-2">
              {paso === "codigo" ? (
                <>
                  <Enlace
                    titulo={espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
                    deshabilitado={espera > 0 || enviando}
                    onPress={enviarCorreo}
                  />
                  <Enlace titulo="Usar otro correo" onPress={() => irA("correo")} />
                </>
              ) : (
                <Enlace
                  titulo={paso === "clave" ? "Entrar con mi correo" : "Entrar con usuario y contraseña"}
                  onPress={() => irA(paso === "clave" ? "correo" : "clave")}
                />
              )}
            </View>
          </Tarjeta>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Enlace({
  titulo,
  onPress,
  deshabilitado = false,
}: {
  titulo: string;
  onPress: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={deshabilitado} hitSlop={6}>
      <Text
        className={`text-sm font-medium ${deshabilitado ? "text-zinc-600" : "text-emerald-300 hover:text-emerald-200"}`}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

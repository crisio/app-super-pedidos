// Entrar en iOS: el correo, luego el código de 6 números que llega por correo.
// iOS ofrece el código del correo encima del teclado. Usuario y contraseña quedan como respaldo.
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type TextInput } from "react-native";
import { Aviso, Boton, Simbolo } from "@/components/ios/controles";
import { CampoTexto, Seccion } from "@/components/ios/lista";
import { color, MARGEN, texto } from "@/components/ios/sistema";
import { ErrorDeApi, mensajeDeError } from "@/lib/api";
import { useSesion } from "@/lib/sesion";

type Paso = "correo" | "codigo" | "clave";

const ESPERA_REENVIO_S = 30;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const campoClave = useRef<ComponentRef<typeof TextInput>>(null);

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    const ok = await intentar(() => entrarConCodigo(correo, valor));
    if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else setCodigo("");
  }

  function cambiarCodigo(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, 6);
    setCodigo(digitos);
    // Con el sexto número (o al pegarlo desde Mail) entra solo.
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
    <ScrollView
      style={estilos.fondo}
      contentContainerStyle={estilos.contenido}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <View style={estilos.cabecera}>
        <LinearGradient
          colors={["#34C759", "#0B8A55"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={estilos.iconoApp}
        >
          <Simbolo nombre="basket.fill" tamano={40} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[texto.titulo1, estilos.titulo]}>
          {paso === "codigo" ? "Revisa tu correo" : "Super Pedidos"}
        </Text>
        <Text style={[texto.cuerpo, estilos.subtitulo]}>
          {paso === "codigo"
            ? `Enviamos un código de 6 números a ${correo}.`
            : paso === "clave"
              ? "Entra con el usuario y la contraseña que te dio la central."
              : "Escribe tu correo y te enviaremos un código para entrar."}
        </Text>
      </View>

      {paso === "correo" ? (
        <Seccion>
          <CampoTexto
            value={correo}
            onChangeText={setCorreo}
            placeholder="Correo"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={enviarCorreo}
            autoFocus
          />
        </Seccion>
      ) : paso === "codigo" ? (
        <Seccion>
          <CampoTexto
            value={codigo}
            onChangeText={cambiarCodigo}
            placeholder="000000"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            accessibilityLabel="Código de 6 números"
            style={estilos.codigo}
          />
        </Seccion>
      ) : (
        <Seccion>
          <CampoTexto
            value={usuario}
            onChangeText={setUsuario}
            placeholder="Usuario"
            textContentType="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => campoClave.current?.focus()}
            autoFocus
          />
          <CampoTexto
            ref={campoClave}
            value={clave}
            onChangeText={setClave}
            placeholder="Contraseña"
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={entrarConClave}
          />
        </Seccion>
      )}

      {error ? <Aviso mensaje={error} /> : null}

      <View style={estilos.acciones}>
        <Boton
          titulo={paso === "correo" ? "Continuar" : "Entrar"}
          cargando={enviando}
          onPress={paso === "correo" ? enviarCorreo : paso === "codigo" ? () => verificar() : entrarConClave}
        />
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
    </ScrollView>
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
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={8}
      style={({ pressed }) => [estilos.enlace, pressed && { opacity: 0.4 }]}
    >
      <Text style={[texto.cuerpo, { color: deshabilitado ? color.terciario : color.tinte }]}>{titulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 24,
    paddingVertical: 32,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  cabecera: { alignItems: "center", gap: 10, paddingHorizontal: MARGEN * 2 },
  iconoApp: {
    width: 84,
    height: 84,
    borderRadius: 19,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  titulo: { color: color.texto, textAlign: "center" },
  subtitulo: { color: color.secundario, textAlign: "center" },
  codigo: {
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: 10,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  acciones: { gap: 18, paddingHorizontal: MARGEN, alignItems: "center" },
  enlace: { paddingVertical: 2 },
});

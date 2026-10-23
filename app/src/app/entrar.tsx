import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Boton, Campo, MensajeError, Tarjeta, Texto } from "@/components/ui";
import { mensajeDeError } from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import { useTema } from "@/tema";

export default function Entrar() {
  const t = useTema();
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: t.fondo, justifyContent: "center", padding: 16 }}
    >
      <View style={{ width: "100%", maxWidth: 400, alignSelf: "center", gap: 20 }}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: t.marca,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Texto style={{ fontSize: 32 }} accessibilityElementsHidden importantForAccessibility="no">
              🛒
            </Texto>
          </View>
          <Texto variante="titulo">Super Pedidos</Texto>
          <Texto variante="tenue">Bandeja central de pedidos</Texto>
        </View>
        <Tarjeta style={{ gap: 16 }}>
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
          <Boton titulo="Entrar" onPress={enviar} cargando={enviando} />
        </Tarjeta>
      </View>
    </KeyboardAvoidingView>
  );
}

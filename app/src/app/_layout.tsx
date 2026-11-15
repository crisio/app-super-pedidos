import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import { Cargando } from "@/components/ui";
import { ProveedorSesion, useSesion } from "@/lib/sesion";
import { colores, TINTE_IOS } from "@/tema";

const esIOS = Platform.OS === "ios";

// La pantalla de inicio se queda hasta saber si hay sesión guardada.
SplashScreen.preventAutoHideAsync();

// Web y Android: siempre el tema oscuro, como Spectrum UI y Aceternity UI.
const temaMarca: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colores.marca,
    background: colores.fondo,
    card: colores.fondo,
    text: colores.texto,
    border: colores.borde,
  },
};

// iOS: los colores del sistema, en claro u oscuro según el iPhone.
const temaIOSClaro: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: TINTE_IOS,
    background: "#F2F2F7",
    card: "#FFFFFF",
    text: "#000000",
    border: "#C6C6C8",
  },
};
const temaIOSOscuro: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: TINTE_IOS,
    background: "#000000",
    card: "#1C1C1E",
    text: "#FFFFFF",
    border: "#38383A",
  },
};

export default function Raiz() {
  const [clienteConsultas] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const esquema = useColorScheme();
  const tema = esIOS ? (esquema === "dark" ? temaIOSOscuro : temaIOSClaro) : temaMarca;

  return (
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorSesion>
        <ThemeProvider value={tema}>
          <StatusBar style={esIOS ? "auto" : "light"} />
          <Navegacion />
        </ThemeProvider>
      </ProveedorSesion>
    </QueryClientProvider>
  );
}

function Navegacion() {
  const { sesion, cargando } = useSesion();
  useEffect(() => {
    if (!cargando) SplashScreen.hide();
  }, [cargando]);
  if (cargando) return esIOS ? null : <Cargando />;

  return (
    <Stack
      screenOptions={
        esIOS
          ? // iOS: barra de título del sistema (Liquid Glass en iOS 26).
            { headerShown: false, headerBackButtonDisplayMode: "minimal" }
          : {
              headerShown: false,
              headerStyle: { backgroundColor: colores.fondo },
              headerTintColor: colores.texto,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colores.fondo },
            }
      }
    >
      <Stack.Protected guard={sesion !== null} redirectTo="/entrar">
        <Stack.Screen name="(panel)" />
        <Stack.Screen name="pedido/[id]" options={{ headerShown: true, title: "Pedido" }} />
        <Stack.Screen name="tutorial" options={{ presentation: "modal", title: "Cómo funciona" }} />
      </Stack.Protected>
      <Stack.Protected guard={sesion === null} redirectTo="/">
        <Stack.Screen name="entrar" />
      </Stack.Protected>
    </Stack>
  );
}

import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, Stack, ThemeProvider, type Theme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Cargando } from "@/components/ui";
import { ProveedorSesion, useSesion } from "@/lib/sesion";
import { colores } from "@/tema";

// La app usa siempre el tema oscuro, como Spectrum UI y Aceternity UI.
const temaNavegacion: Theme = {
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

export default function Raiz() {
  const [clienteConsultas] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  return (
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorSesion>
        <ThemeProvider value={temaNavegacion}>
          <StatusBar style="light" />
          <Navegacion />
        </ThemeProvider>
      </ProveedorSesion>
    </QueryClientProvider>
  );
}

function Navegacion() {
  const { sesion, cargando } = useSesion();
  if (cargando) return <Cargando />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colores.fondo },
        headerTintColor: colores.texto,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Protected guard={sesion !== null} redirectTo="/entrar">
        <Stack.Screen name="(panel)" />
        <Stack.Screen name="pedido/[id]" options={{ headerShown: true, title: "Pedido" }} />
      </Stack.Protected>
      <Stack.Protected guard={sesion === null} redirectTo="/">
        <Stack.Screen name="entrar" />
      </Stack.Protected>
    </Stack>
  );
}

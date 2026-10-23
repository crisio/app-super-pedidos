import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useColorScheme } from "react-native";
import { Cargando } from "@/components/ui";
import { ProveedorSesion, useSesion } from "@/lib/sesion";
import { useTema } from "@/tema";

export default function Raiz() {
  const [clienteConsultas] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const esquema = useColorScheme();

  return (
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorSesion>
        <ThemeProvider value={esquema === "dark" ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <Navegacion />
        </ThemeProvider>
      </ProveedorSesion>
    </QueryClientProvider>
  );
}

function Navegacion() {
  const { sesion, cargando } = useSesion();
  const t = useTema();
  if (cargando) return <Cargando />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: t.superficie },
        headerTintColor: t.texto,
        contentStyle: { backgroundColor: t.fondo },
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

import { Stack } from "expo-router";

// iOS: cada pestaña tiene su propia pila, con la barra de título grande del sistema.
export default function Pila() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Pedidos", headerLargeTitleEnabled: true }} />
    </Stack>
  );
}

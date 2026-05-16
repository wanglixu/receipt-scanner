import { Pressable, Text } from "react-native";

interface Props {
  onPress: () => void;
}

export default function ScanButton({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg ios:shadow-sm"
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Text className="text-2xl text-white">+</Text>
    </Pressable>
  );
}

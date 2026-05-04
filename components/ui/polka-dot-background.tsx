import { type FC, type ReactNode, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LightColors } from '@/constants/Colors';

interface PolkaDotBackgroundProps {
  style?: ViewStyle;
  children?: ReactNode;
}

export const PolkaDotBackground: FC<PolkaDotBackgroundProps> = ({ style, children }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const spacing = 44;
  const dotColor = LightColors.primary;

  const renderDots = () => {
    const dots = [];
    const rows = Math.ceil(layout.height / spacing) + 1;
    const cols = Math.ceil(layout.width / spacing) + 1;

    for (let i = 0; i < rows; i++) {
      const isPrimary = i % 2 === 0;
      const dotSize = isPrimary ? 5 : 3;
      const opacity = isPrimary ? 0.65 : 0.35;
      const offsetX = isPrimary ? 0 : spacing / 2;

      for (let j = 0; j < cols; j++) {
        dots.push(
          <View
            key={`${i}-${j}`}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: dotColor,
                left: j * spacing + offsetX,
                top: i * spacing,
                opacity,
              },
            ]}
          />,
        );
      }
    }
    return dots;
  };

  return (
    <View
      style={[styles.container, style]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({ width, height });
      }}
    >
      {layout.width > 0 && renderDots()}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightColors.background,
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
  },
});

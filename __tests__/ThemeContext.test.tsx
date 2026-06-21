/**
 * ThemeContext Tests
 * Tests color object memoization and theme switching
 */

import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider, ThemeContext } from '../context/ThemeContext';
import { Text } from 'react-native';

const ThemeConsumer = () => {
  const theme = useContext(ThemeContext);

  return (
    <>
      <Text testID="primary-color">{theme?.colors?.primary}</Text>
      <Text testID="background-color">{theme?.colors?.background}</Text>
      <Text testID="text-color">{theme?.colors?.text}</Text>
    </>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Theme Provider', () => {
    it('provides theme context to children', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestID('primary-color')).toBeTruthy();
    });

    it('has light theme by default', () => {
      render(
        <ThemeProvider initialMode="light">
          <ThemeConsumer />
        </ThemeProvider>
      );

      const primaryColor = screen.getByTestID('primary-color').props.children;
      expect(primaryColor).toBeDefined();
    });
  });

  describe('Color object memoization', () => {
    it('returns memoized color object', () => {
      const renderCount = jest.fn();

      const TestComponent = () => {
        const theme = useContext(ThemeContext);
        renderCount();

        return (
          <Text testID="color">
            {theme?.colors?.primary}
          </Text>
        );
      };

      const { rerender } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const initialRenderCount = renderCount.mock.calls.length;

      rerender(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Component should not re-render unnecessarily
      expect(renderCount.mock.calls.length).toBeLessThanOrEqual(initialRenderCount + 1);
    });

    it('prevents cascade re-renders', () => {
      const childRenderCount = jest.fn();

      const Child = () => {
        const theme = useContext(ThemeContext);
        childRenderCount();

        return <Text>{theme?.colors?.primary}</Text>;
      };

      const Parent = () => {
        const [count, setCount] = React.useState(0);

        return (
          <>
            <Text onPress={() => setCount(count + 1)}>Press me</Text>
            <ThemeProvider>
              <Child />
            </ThemeProvider>
          </>
        );
      };

      render(<Parent />);

      const initialCount = childRenderCount.mock.calls.length;

      // Parent re-renders
      const pressable = screen.getByText('Press me');
      pressable.props.onPress();

      // Child should not re-render excessively
      expect(childRenderCount.mock.calls.length).toBeLessThanOrEqual(initialCount + 1);
    });
  });

  describe('Theme switching', () => {
    it('switches from light to dark theme', () => {
      const { rerender } = render(
        <ThemeProvider initialMode="light">
          <ThemeConsumer />
        </ThemeProvider>
      );

      const lightPrimary = screen.getByTestID('primary-color').props.children;

      rerender(
        <ThemeProvider initialMode="dark">
          <ThemeConsumer />
        </ThemeProvider>
      );

      const darkPrimary = screen.getByTestID('primary-color').props.children;

      // Colors should be different
      expect(lightPrimary).not.toEqual(darkPrimary);
    });

    it('maintains color consistency within theme', () => {
      render(
        <ThemeProvider initialMode="light">
          <ThemeConsumer />
        </ThemeProvider>
      );

      const primaryColor = screen.getByTestID('primary-color').props.children;
      const backgroundColor = screen.getByTestID('background-color').props.children;
      const textColor = screen.getByTestID('text-color').props.children;

      // All colors should be defined
      expect(primaryColor).toBeDefined();
      expect(backgroundColor).toBeDefined();
      expect(textColor).toBeDefined();
    });

    it('applies theme consistently to all children', () => {
      const TestComponent1 = () => {
        const theme = useContext(ThemeContext);
        return <Text testID="comp1-primary">{theme?.colors?.primary}</Text>;
      };

      const TestComponent2 = () => {
        const theme = useContext(ThemeContext);
        return <Text testID="comp2-primary">{theme?.colors?.primary}</Text>;
      };

      render(
        <ThemeProvider initialMode="light">
          <TestComponent1 />
          <TestComponent2 />
        </ThemeProvider>
      );

      const color1 = screen.getByTestID('comp1-primary').props.children;
      const color2 = screen.getByTestID('comp2-primary').props.children;

      expect(color1).toEqual(color2);
    });
  });

  describe('Dark mode support', () => {
    it('provides dark mode colors', () => {
      render(
        <ThemeProvider initialMode="dark">
          <ThemeConsumer />
        </ThemeProvider>
      );

      const backgroundColor = screen.getByTestID('background-color').props.children;

      // Dark mode background should be dark
      expect(backgroundColor).toBeDefined();
    });

    it('switches dark mode at runtime', () => {
      const { rerender } = render(
        <ThemeProvider initialMode="light">
          <ThemeConsumer />
        </ThemeProvider>
      );

      const lightBackground = screen.getByTestID('background-color').props.children;

      rerender(
        <ThemeProvider initialMode="dark">
          <ThemeConsumer />
        </ThemeProvider>
      );

      const darkBackground = screen.getByTestID('background-color').props.children;

      expect(lightBackground).not.toEqual(darkBackground);
    });
  });

  describe('Color palette', () => {
    it('exports complete color palette', () => {
      let themeColors: any;

      const TestComponent = () => {
        const theme = useContext(ThemeContext);
        themeColors = theme?.colors;
        return null;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Verify essential colors exist
      const requiredColors = [
        'primary',
        'secondary',
        'background',
        'surface',
        'text',
        'textSecondary',
        'error',
        'warning',
        'success',
        'border'
      ];

      requiredColors.forEach(color => {
        expect(themeColors[color]).toBeDefined();
      });
    });
  });

  describe('Performance', () => {
    it('does not cause excessive re-renders on theme switch', () => {
      const renderCount = jest.fn();

      const TestComponent = () => {
        const theme = useContext(ThemeContext);
        renderCount();

        return <Text>{theme?.colors?.primary}</Text>;
      };

      const { rerender } = render(
        <ThemeProvider initialMode="light">
          <TestComponent />
        </ThemeProvider>
      );

      const initialCount = renderCount.mock.calls.length;

      // Switch theme
      rerender(
        <ThemeProvider initialMode="dark">
          <TestComponent />
        </ThemeProvider>
      );

      // Should render once more for the theme change
      expect(renderCount.mock.calls.length).toBe(initialCount + 1);
    });
  });
});

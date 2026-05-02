import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LightColors } from '@/constants/Colors';
import { logger } from '@/lib/utils/logger';
import DSText from './ds-text';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ErrorBoundary', error.message, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <DSText style={styles.title}>Something went wrong</DSText>
          <DSText style={styles.message}>
            {this.props.fallbackLabel ??
              this.state.error?.message ??
              'An unexpected error occurred'}
          </DSText>
          <TouchableOpacity style={styles.button} onPress={this.reset}>
            <DSText style={styles.buttonText}>Try again</DSText>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: LightColors.background,
  },
  title: {
    fontSize: 28,
    color: LightColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: LightColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: LightColors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: LightColors.textLight,
    fontSize: 18,
  },
});

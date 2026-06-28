import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../lib/colors'

/**
 * Anatomi — Global Error Boundary
 *
 * Beklenmeyen crash'lerde beyaz ekran yerine kullanıcıya
 * anlamlı bir hata ekranı gösterir ve uygulamayı yeniden
 * başlatma seçeneği sunar.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>😵</Text>
          <Text style={styles.title}>Bir Şeyler Ters Gitti</Text>
          <Text style={styles.message}>
            Beklenmeyen bir hata oluştu. Uygulamayı yeniden başlatmayı deneyin.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetail}>
              {this.state.error.toString()}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  errorDetail: {
    fontSize: 11,
    color: Colors.error,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
})

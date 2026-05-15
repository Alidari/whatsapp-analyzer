import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Colors } from '../lib/colors';

export const customAlertRef = React.createRef();

export const CustomAlert = {
  alert: (title, message, buttons, options) => {
    if (customAlertRef.current) {
      customAlertRef.current.alert(title, message, buttons, options);
    } else {
      console.warn("CustomAlert reference is not set. Have you mounted CustomAlertRoot?");
    }
  }
};

export const CustomAlertRoot = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    options: {}
  });
  
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    alert: (title, message, buttons, options) => {
      let defaultButtons = buttons;
      if (!defaultButtons || defaultButtons.length === 0) {
        defaultButtons = [{ text: 'Tamam', onPress: () => {} }];
      }
      setConfig({ title, message, buttons: defaultButtons, options });
      setVisible(true);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }));

  const close = (callback) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => {
      if (config.options?.cancelable) close();
    }}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.alertBox, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          {config.title ? <Text style={styles.title}>{config.title}</Text> : null}
          {config.message ? <Text style={styles.message}>{config.message}</Text> : null}
          
          <View style={styles.buttonContainer}>
            {config.buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel' || (config.buttons.length === 2 && index === 0 && btn.style !== 'destructive');
              const isDestructive = btn.style === 'destructive';
              
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.button, 
                    isCancel && styles.buttonCancel,
                    isDestructive && styles.buttonDestructive
                  ]} 
                  onPress={() => {
                    close(() => {
                      if (btn.onPress) {
                        btn.onPress();
                      }
                    });
                  }}
                >
                  <Text style={[
                    styles.buttonText,
                    isCancel && styles.buttonTextCancel,
                    isDestructive && styles.buttonTextDestructive
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: Colors.surfaceVariant,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: Colors.surfaceContainerHighest,
  },
  buttonDestructive: {
    backgroundColor: Colors.errorContainer,
  },
  buttonText: {
    color: Colors.onPrimaryContainer,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextCancel: {
    color: Colors.onSurfaceVariant,
  },
  buttonTextDestructive: {
    color: Colors.error,
  }
});

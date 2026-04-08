import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useToast } from '@/contexts/toast-content';
import { CoreService } from '@/helpers/core-service';

const { width } = Dimensions.get('window');

// ── Types ─────────────────────────────────────────────────────────────────────
type StepType = 0 | 1 | 2 | 3;

type StepDotProps = {
  active: boolean;
  done: boolean;
};

type OtpArray = [string, string, string, string, string, string];

// ── Step indicators ──────────────────────────────────────────────────────────
const StepDot = ({ active, done }: StepDotProps) => (
  <View style={[styles.dot, active && styles.dotActive, done && styles.dotDone]}>
    {done && <Text style={styles.dotCheck}>✓</Text>}
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<StepType>(0);
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<OtpArray>(['', '', '', '', '', '']);
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPass, setShowPass] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const {showToast} = useToast();
  const service:CoreService = new CoreService();

  const slideAnim = useRef(new Animated.Value(0)).current;

  const otpRefs = useRef(
    Array.from({ length: 6 }, () => React.createRef<TextInput>())
  );

  const slide = (direction: number = 1): void => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -direction * width,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction * width,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const sendCodeToEmail = async () => {
    setLoading(true);
    const payload = {
      email:email
    }
    try{
      const res = await service.send('/api/auth/send-code', payload);
      if(res.success){
        showToast(res.message);
        setLoading(false);
        slide();
        setStep(1);
      }else{
        showToast(res.message, 'error');
      }
    }catch(e:any){
      showToast(e.message,'error');
    }finally{
      setLoading(false);
    }
  }

  // Step 0 → send email
  const handleSendEmail = async (): Promise<void> => {
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    await sendCodeToEmail();
  };

  const verifyOtp = async() => {
    setLoading(true);
    const payload = {
      email:email,
      code: otp.join('')
    }
    try{
      const res = await service.send('/api/auth/verify-code', payload);
      if(res.success){
        showToast(res.message);
         setLoading(false);
        slide();
        setStep(2);
      }else{
        showToast(res.message, 'error');
      }
    }catch(e:any){
      showToast(e.message,'error');
    }finally{
      setLoading(false);
    }
  }

  // Step 1 → verify OTP
  const handleVerifyOtp = async (): Promise<void> => {
    if (otp.join('').length < 6) {
      setError('Enter the full 6-digit code.');
      return;
    }

    setError('');
    await verifyOtp();
  };

  const resetPassword = async() => {
     setLoading(true);
    const payload = {
      email:email,
      code: otp.join(''),
      newPassword: password
    }
    try{
      const res = await service.send('/api/auth/create-new-password', payload);
      if(res.success){
        showToast(res.message);
        setLoading(false);
        setStep(3);
      }else{
        showToast(res.message,'error');
      }
    }catch(e:any){
      showToast(e.message, 'error');
    }finally{
      setLoading(false);
    }
  }

  // Step 2 → reset password
  const handleReset = async (): Promise<void> => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    await resetPassword();
    
  };

  const handleOtpChange = (val: string, idx: number): void => {
    const next = [...otp] as OtpArray;
    next[idx] = val.slice(-1);
    setOtp(next);

    if (val && idx < 5) {
      otpRefs.current[idx + 1].current?.focus();
    }
  };

  const handleOtpKey = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    idx: number
  ): void => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1].current?.focus();
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <View>
      <Text style={styles.stepTitle}>Forgot your{'\n'}password?</Text>
      <Text style={styles.stepSub}>
        No worries. Enter your email and we&apos;ll send a reset code.
      </Text>

      <Text style={styles.label}>Email address</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSendEmail}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Send reset code</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Check your{'\n'}inbox</Text>
      <Text style={styles.stepSub}>
        We sent a 6-digit code to <Text style={styles.highlight}>{email}</Text>
      </Text>

      <View style={styles.otpRow}>
        {otp.map((val, i) => (
          <TextInput
            key={i}
            ref={otpRefs.current[i]}
            style={[styles.otpBox, val && styles.otpBoxFilled]}
            value={val}
            onChangeText={(v) => handleOtpChange(v, i)}
            onKeyPress={(e) => handleOtpKey(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleVerifyOtp}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Verify code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn}>
        <Text style={styles.linkText}>Didn&apos;t receive it? Resend</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Create new{'\n'}password</Text>
      <Text style={styles.stepSub}>Make it strong and memorable.</Text>

      <Text style={styles.label}>New password</Text>
      <View style={styles.passWrap}>
        <TextInput
          style={[styles.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]}
          placeholder="Min. 8 characters"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPass}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
          <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Confirm password</Text>
      <TextInput
        style={styles.input}
        placeholder="Repeat password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry={!showPass}
        value={confirm}
        onChangeText={setConfirm}
      />

      <View style={styles.strengthBar}>
        {[1, 2, 3, 4].map((n) => (
          <View
            key={n}
            style={[
              styles.strengthSeg,
              password.length >= n * 3 && styles.strengthSegActive,
              password.length >= 10 && styles.strengthSegStrong,
            ]}
          />
        ))}
      </View>

      <Text style={styles.strengthLabel}>
        {password.length === 0
          ? ''
          : password.length < 6
          ? 'Weak'
          : password.length < 10
          ? 'Fair'
          : 'Strong 💪'}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleReset}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Reset password</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successBox}>
      <Text style={styles.successIcon}>🎉</Text>
      <Text style={styles.successTitle}>Password reset!</Text>
      <Text style={styles.successSub}>
        You can now sign in with your new password.
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.replace('/login/LoginScreen')}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        {step < 3 && step > 0 && (
          <TouchableOpacity onPress={() => setStep((step - 1) as StepType)} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}

        {step === 0 && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}

        {step < 3 && (
          <View style={styles.stepIndicator}>
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>
                <StepDot active={step === i} done={step > i} />
                {i < 2 && <View style={[styles.stepLine, step > i && styles.stepLineDone]} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </View>

      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderSuccess()}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const TEAL = '#0D9488';
const TEAL_LIGHT = '#CCFBF1';
const DARK = '#0F172A';
const MID = '#64748B';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 24,
    top: 56,
    padding: 8,
  },
  backArrow: {
    fontSize: 22,
    color: DARK,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    borderColor: TEAL,
    backgroundColor: TEAL_LIGHT,
  },
  dotDone: {
    borderColor: TEAL,
    backgroundColor: TEAL,
  },
  dotCheck: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  stepLine: {
    width: 36,
    height: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: TEAL,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: DARK,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  stepSub: {
    fontSize: 15,
    color: MID,
    lineHeight: 22,
    marginBottom: 32,
  },
  highlight: {
    color: TEAL,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: DARK,
    marginBottom: 16,
  },
  passWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  eyeIcon: {
    fontSize: 18,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    fontSize: 22,
    fontWeight: '700',
    color: DARK,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: TEAL,
    backgroundColor: TEAL_LIGHT,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  strengthSeg: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  strengthSegActive: {
    backgroundColor: '#F59E0B',
  },
  strengthSegStrong: {
    backgroundColor: TEAL,
  },
  strengthLabel: {
    fontSize: 12,
    color: MID,
    marginBottom: 20,
    minHeight: 16,
  },
  btn: {
    backgroundColor: TEAL,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal:17,
    alignItems: 'center',
    justifyContent:'center',
    marginTop: 4,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  linkText: {
    color: TEAL,
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
  },
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: DARK,
    marginBottom: 12,
  },
  successSub: {
    fontSize: 15,
    color: MID,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
});
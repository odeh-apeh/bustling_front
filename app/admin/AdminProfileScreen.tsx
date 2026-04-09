import { useToast } from '@/contexts/toast-content';
import { CoreService } from '@/helpers/core-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type admin = {
  id: number,
  name: string;
  username: string;
  phone: string;
  email: string;
  factor: boolean;
  otp: string;
}

const AdminProfileScreen =  () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [loginNotifications, setLoginNotifications] = useState(false);
  const {showToast} = useToast();
  const service:CoreService = new CoreService();
  const [adminDetails, setAdminDetails] = useState<admin[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [localStateLoading, setLocalStateLoading] = useState<boolean>(false);

  const [adminId, setAdminId] = useState<string>('');

  const getPasswordStrength = (pwd: string): { label: string; color: string; score: number } => {
    if (pwd.length === 0) return { label: '', color: '#E0E0E0', score: 0 };
    if (pwd.length < 6) return { label: 'Weak', color: '#E53935', score: 1 };
    if (pwd.length < 10) return { label: 'Fair', color: '#FB8C00', score: 2 };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd))
      return { label: 'Strong', color: '#43A047', score: 4 };
    return { label: 'Good', color: '#1565C0', score: 3 };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSave = async() => {
    if (newPassword && newPassword !== confirmPassword) {
      showToast('New passwords do not match.','error');
      return;
    }
    setLocalStateLoading(true);
    const payload = {
      id: Number(adminId),
      name: fullName,
      username: username,
      email: email,
      currentPassword: currentPassword,
      password: newPassword,
      otp:'',
      factor: twoFactorEnabled,
      phone: phone
    }
    try{
      const res = await service.send('/api/admin/update-admin-details', payload);
      if(res.success){
        showToast(res.message);
        await fetchAdminDetails();
        setLocalStateLoading(false);
      }else{
        showToast(res.message,'error');
      }
    }catch(e:any){
      showToast(e.message,'error');
    }finally{
      setLocalStateLoading(false);
    }
  };

  const getAdminId = async() => {
    const id = await AsyncStorage.getItem('admin_id');
    if(id){
      setAdminId(id);
      
    }
  }

  const fetchAdminDetails =  async() => {
    setLoading(true);
    try{
      const res = await service.get<admin[]>("/api/admin/fetch-admin-details");
      if(res.success && res.data){
        setAdminDetails(res.data);
        setLoading(false);
       await getAdminId();
       const result = res.data.find((item) => item.id === Number(adminId));
       setEmail(result?.email ?? '');
       setFullName(result?.name ?? '');
       setUsername(result?.username?? "");
       setPhone(result?.phone ?? '');
       setTwoFactorEnabled(result?.factor ?? false);
      }else{
        showToast(res.message,'error');
      }
    }catch(e:any){
      showToast(e.message,'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdminDetails();
  },[])

  useEffect(() => {
    fetchAdminDetails();
  },[adminId])


  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };
  const getInitials = (fullName: string) => {
  if (!fullName) return "";

  const names = fullName.trim().split(/\s+/);
  const firstName = names[0];
  const lastName = names.length > 1 ? names[names.length - 1] : "";

  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

if(loading){
  return (
    <SafeAreaView style={{backgroundColor:'white', flex:1}} edges={['top']}>
      <View style={{
        display:'flex',
        justifyContent:'center',
        alignItems:'center',
        height:'100%'
      }}>
        <Text style={{textAlign:'center'}}>Loading Data...</Text>
      </View>
    </SafeAreaView>
  )
}

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar backgroundColor="#1565C0" barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your account info</Text>
        </View>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{
              getInitials(adminDetails.find((item) => item.id === Number(adminId))?.name ?? 'John Doe')
              }</Text>
          </View>
          <TouchableOpacity style={styles.cameraButton}>
            <Text style={styles.cameraIcon}>📷</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.avatarName}>{adminDetails.find((item) => item.id === Number(adminId))?.name}</Text>
        <Text style={styles.avatarRole}>Super Admin</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Personal Information */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Personal Information</Text>

          <InputField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            keyboardType="default"
          />
          <InputField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
          <InputField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            prefix="@"
            autoCapitalize="none"
          />
        </View>

        {/* Security */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Security</Text>

          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            show={showCurrentPwd}
            onToggle={() => setShowCurrentPwd(v => !v)}
          />
          <PasswordField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            show={showNewPwd}
            onToggle={() => setShowNewPwd(v => !v)}
          />

          {/* Password strength */}
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthLabel}>Password strength</Text>
                <Text style={[styles.strengthValue, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: i <= strength.score ? strength.color : '#E0E0E0' },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            show={showConfirmPwd}
            onToggle={() => setShowConfirmPwd(v => !v)}
          />
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Preferences</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Two-factor authentication</Text>
              <Text style={styles.toggleSubtitle}>Add an extra layer of security</Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={setTwoFactorEnabled}
              trackColor={{ false: '#E0E0E0', true: '#BBDEFB' }}
              thumbColor={twoFactorEnabled ? '#1565C0' : '#fff'}
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Login notifications</Text>
              <Text style={styles.toggleSubtitle}>Get alerted on new sign-ins</Text>
            </View>
            <Switch
              value={loginNotifications}
              onValueChange={setLoginNotifications}
              trackColor={{ false: '#E0E0E0', true: '#BBDEFB' }}
              thumbColor={loginNotifications ? '#1565C0' : '#fff'}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>{localStateLoading ? 'Updating...':'Save Changes'}</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.85}
        >
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─── Sub-components ─────────────────────────────────── */

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
  prefix?: string;
}

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'words',
  prefix,
}: InputFieldProps) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputBox}>
      {prefix && <Text style={styles.prefix}>{prefix}</Text>}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B0BEC5"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  </View>
);

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}

const PasswordField = ({
  label,
  value,
  onChangeText,
  placeholder,
  show,
  onToggle,
}: PasswordFieldProps) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputBox}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B0BEC5"
        secureTextEntry={!show}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={onToggle} style={styles.eyeButton}>
        <Text style={styles.eyeIcon}>{show ? '🙈' : '👁'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

/* ─── Styles ─────────────────────────────────────────── */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1565C0',
  },
  header: {
    backgroundColor: '#1565C0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    marginTop: -2,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  avatarSection: {
    backgroundColor: '#1565C0',
    alignItems: 'center',
    paddingBottom: 28,
  },
  avatarWrapper: {
    position: 'relative',
    width: 86,
    height: 86,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#E3F2FD',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '500',
    color: '#1565C0',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 13,
  },
  avatarName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  avatarRole: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F0F6FF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1565C0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  fieldWrapper: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64B5F6',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BBDEFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FBFF',
    gap: 8,
  },
  prefix: {
    fontSize: 14,
    color: '#90A4AE',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a2e',
    padding: 0,
  },
  eyeButton: {
    padding: 2,
  },
  eyeIcon: {
    fontSize: 15,
  },
  strengthContainer: {
    marginBottom: 14,
    marginTop: -4,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  strengthLabel: {
    fontSize: 11,
    color: '#90A4AE',
  },
  strengthValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F6FF',
    paddingBottom: 14,
    marginBottom: 14,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#90A4AE',
  },
  saveButton: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#E53935',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AdminProfileScreen;

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoreService } from '@/helpers/core-service';
import { useToast } from '@/contexts/toast-content';

const { width } = Dimensions.get('window');

// ── Theme ─────────────────────────────────────────────────────────────────────
const NAVY = '#1E3A5F';
const ACCENT = '#2563EB';
const MID = '#64748B';
const DARK = '#0F172A';

// ── Types ─────────────────────────────────────────────────────────────────────
type TabType = 'ticket' | 'faq' | 'history';
type CategoryType = 'billing' | 'account' | 'order' | 'tech' | 'feedback' | 'other' | '';
export type PriorityType = 'low' | 'medium' | 'high';

type FaqType = {
  q: string;
  a: string;
};

type ErrorType = {
  category?: string;
  subject?: string;
  message?: string;
  email?: string;
};

export type TicketStatus = 'Open' | 'Resolved' | 'Pending';

export type TicketType = {
  id: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  date_created: string;
  priority: PriorityType;
  ticket_id: string;
  category: string;
  email: string;
  user_id: number;
};

type CategoryItem = {
  id: Exclude<CategoryType, ''>;
  icon: string;
  label: string;
};

type PriorityItem = {
  id: PriorityType;
  label: string;
  color: string;
};

// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES: CategoryItem[] = [
  { id: 'billing', icon: '💳', label: 'Billing' },
  { id: 'account', icon: '👤', label: 'Account' },
  { id: 'order', icon: '📦', label: 'Orders' },
  { id: 'tech', icon: '🔧', label: 'Technical' },
  { id: 'feedback', icon: '💬', label: 'Feedback' },
  { id: 'other', icon: '🗂️', label: 'Other' },
];

const PRIORITY: PriorityItem[] = [
  { id: 'low', label: 'Low', color: '#10B981' },
  { id: 'medium', label: 'Medium', color: '#F59E0B' },
  { id: 'high', label: 'High', color: '#EF4444' },
];

const FAQ: FaqType[] = [
  {
    q: 'How do I reset my password?',
    a: 'Tap "Forgot Password" on the login screen and follow the steps.',
  },
  {
    q: 'When will my order arrive?',
    a: 'Orders typically arrive in 3–5 business days. Check your email for tracking info.',
  },
  {
    q: 'How do I request a refund?',
    a: 'Go to Orders → select the order → tap "Request Refund".',
  },
];



const statusColor: Record<TicketStatus, string> = {
  Open: '#3B82F6',
  Resolved: '#10B981',
  Pending: '#F59E0B',
};


// ── FAQ accordion item ────────────────────────────────────────────────────────
const FaqItem = ({ item }: { item: FaqType }) => {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setOpen(!open)}
      activeOpacity={0.8}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Text style={styles.faqChevron}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CustomerServiceScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<TabType>('ticket');
  const [category, setCategory] = useState<CategoryType>('');
  const [priority, setPriority] = useState<PriorityType>('medium');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errors, setErrors] = useState<ErrorType>({});
  const service = new CoreService();
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [isTicketLoading, setIsTicketLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  const validate = (): boolean => {
    const e: ErrorType = {};

    if (!category) e.category = 'Please select a category.';
    if (!subject.trim()) e.subject = 'Subject is required.';
    if (message.trim().length < 20) e.message = 'Please describe your issue (min 20 chars).';
    if (!email.includes('@')) e.email = 'Enter a valid email address.';

    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const fetchTickets = async (): Promise<void> => {
    setIsTicketLoading(true);
    try {
      const res = await service.get<TicketType[]>(`/api/tickets/user/${userId}`);
      if (res.success && res.data) {
        setTickets(res.data);
      }
    } catch (e) {
      console.error('Failed to fetch tickets:', e);
    }finally{
      setIsTicketLoading(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);

    const payload = {
      userId: Number(userId),
      category,
      priority,
      subject,
      dateCreated: new Date().toISOString(),
      status: 'Open',
      description: message,
      email,
      ticketId: `TKT-${Math.floor(100000 + Math.random() * 900000)}`,
    };
    console.log('Submitting ticket with payload:', payload);
    try{
      const res = await service.send('/api/tickets/create', payload);
      if (!res.success) {
        showToast(res.message || 'Unable to submit your ticket. Please try again later.', 'error');
      }else{
        showToast('Your support ticket has been submitted successfully.', 'success');
        await fetchTickets();
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }catch(e){
      showToast('An unexpected error occurred. Please try again later.', 'error');
    }finally{
    setLoading(false);
    setSubmitted(true);
    }
  };

  const handleNewTicket = (): void => {
    setSubmitted(false);
    setCategory('');
    setSubject('');
    setMessage('');
    setEmail('');
    setPriority('medium');
    setErrors({});
  };

  const getId = async (): Promise<void> => {
    const userId = await AsyncStorage.getItem('user_id');
    setUserId(userId);
    
  }
  // 1. Get the ID on mount
useEffect(() => {
  getId();
}, []);


// 2. Fetch tickets ONLY when userId is available
useEffect(() => {
  if (userId) {
    fetchTickets();
  }
}, [userId]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'ticket', label: '📝 New Ticket' },
    { id: 'faq', label: '❓ FAQs' },
    { id: 'history', label: '🕐 My Tickets' },
  ];

  const renderTicketForm = () => {
    if (submitted) {
      return (
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Ticket submitted!</Text>
          <Text style={styles.successSub}>
            We&apos;ve received your request and will respond to{' '}
            <Text style={{ color: NAVY, fontWeight: '600' }}>{email}</Text> within 24 hours.
          </Text>
          <View style={styles.ticketRefBox}>
            <Text style={styles.ticketRefLabel}>Status</Text>
            <Text style={styles.ticketRef}>
                Open
            </Text>
          </View>
          <TouchableOpacity style={styles.btn} onPress={handleNewTicket} activeOpacity={0.85}>
            <Text style={styles.btnText}>Submit another ticket</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>
          Category <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.categoryCard, category === c.id && styles.categoryCardActive]}
              onPress={() => {
                setCategory(c.id);
                setErrors((prev) => ({ ...prev, category: undefined }));
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.categoryIcon}>{c.icon}</Text>
              <Text style={[styles.categoryLabel, category === c.id && styles.categoryLabelActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

        <Text style={styles.fieldLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITY.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.priorityBtn,
                priority === p.id && { backgroundColor: p.color, borderColor: p.color },
              ]}
              onPress={() => setPriority(p.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.priorityText, priority === p.id && { color: '#fff' }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>
          Subject <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.subject && styles.inputError]}
          placeholder="Brief summary of your issue"
          placeholderTextColor="#94A3B8"
          value={subject}
          onChangeText={(v) => {
            setSubject(v);
            setErrors((prev) => ({ ...prev, subject: undefined }));
          }}
        />
        {errors.subject && <Text style={styles.errorText}>{errors.subject}</Text>}

        <Text style={styles.fieldLabel}>
          Describe your issue <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.textarea, errors.message && styles.inputError]}
          placeholder="Please provide as much detail as possible so we can help you quickly…"
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={message}
          onChangeText={(v) => {
            setMessage(v);
            setErrors((prev) => ({ ...prev, message: undefined }));
          }}
        />
        <Text style={[styles.charCount, message.length < 20 && message.length > 0 && { color: '#EF4444' }]}>
          {message.length} / 20 min
        </Text>
        {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}

        <Text style={styles.fieldLabel}>
          Reply-to email <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="your@email.com"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit ticket →</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderFaq = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Common questions</Text>
      {FAQ.map((item, i) => (
        <FaqItem key={i} item={item} />
      ))}
      <View style={styles.contactRow}>
        <Text style={styles.contactLabel}>Still stuck?</Text>
        <TouchableOpacity onPress={() => setTab('ticket')}>
          <Text style={styles.contactLink}>Open a ticket →</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Your tickets</Text>
      {isTicketLoading && (
        <Text style={{ color: MID, textAlign: 'center', marginTop: 40 }}>
          Loading tickets...
        </Text>
      )}

      {(tickets.length === 0 && !isTicketLoading) ? (
        <Text style={{ color: MID, textAlign: 'center', marginTop: 40 }}>
          You have not submitted any tickets yet.
        </Text>
      ):
      (
      tickets.map((t) => (
        <TouchableOpacity key={t.ticket_id} style={styles.historyCard} activeOpacity={0.8}>
          <View style={styles.historyTop}>
            <Text style={styles.historyId}>{t.ticket_id}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor[t.status]}22` },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor[t.status] }]}>
                {t.status}
              </Text>
            </View>
          </View>
          <Text style={styles.historySubject}>{t.subject}</Text>
          <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
            {t.description}
          </Text>
          <Text style={styles.historyDate}>{t.date_created}</Text>
        </TouchableOpacity>
      )))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Support Center</Text>
          <Text style={styles.headerSub}>We&apos;re here to help</Text>
        </View>

        <View style={styles.supportBadge}>
          <Text style={styles.supportBadgeText}>🟢 Online</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {tab === 'ticket' && renderTicketForm()}
        {tab === 'faq' && renderFaq()}
        {tab === 'history' && renderHistory()}
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  headerBar: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    marginRight: 12,
  },
  backArrow: {
    color: '#fff',
    fontSize: 22,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: '#93C5FD',
    fontSize: 13,
    marginTop: 2,
  },
  supportBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  supportBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: ACCENT,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: MID,
  },
  tabTextActive: {
    color: ACCENT,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: DARK,
    marginBottom: 16,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textarea: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: DARK,
    minHeight: 120,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 11,
    color: MID,
    textAlign: 'right',
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 12,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryCard: {
    width: (width - 40 - 20) / 3,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  categoryCardActive: {
    borderColor: ACCENT,
    backgroundColor: '#EFF6FF',
  },
  categoryIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: MID,
  },
  categoryLabelActive: {
    color: ACCENT,
  },

  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  priorityBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '700',
    color: MID,
  },

  btn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    padding:20,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
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

  successBox: {
    alignItems: 'center',
    paddingTop: 32,
  },
  successEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: DARK,
    marginBottom: 10,
  },
  successSub: {
    fontSize: 14,
    color: MID,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  ticketRefBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginBottom: 28,
  },
  ticketRefLabel: {
    fontSize: 12,
    color: MID,
    marginBottom: 4,
  },
  ticketRef: {
    fontSize: 22,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 1,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DARK,
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQ: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
    flex: 1,
    paddingRight: 8,
  },
  faqChevron: {
    fontSize: 11,
    color: MID,
  },
  faqA: {
    fontSize: 14,
    color: MID,
    lineHeight: 20,
    marginTop: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  contactLabel: {
    fontSize: 14,
    color: MID,
  },
  contactLink: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },

  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyId: {
    fontSize: 12,
    fontWeight: '700',
    color: MID,
    letterSpacing: 0.5,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historySubject: {
    fontSize: 15,
    fontWeight: '600',
    color: DARK,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: MID,
  },
  description: {
    fontSize: 14,
    color: DARK,
    lineHeight: 20,
  },

});
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '@/contexts/toast-content';
import { CoreService } from '@/helpers/core-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { friendlyDate } from '@/helpers/date';


// ─── Types ───────────────────────────────────────────────────────────────────

export type TicketStatus = 'open' | 'in_progress' | 'resolve' | 'close';
export type PriorityType = 'low' | 'medium' | 'high' | 'critical';

export type TicketType = {
  id: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  date_created: string;
  priority: PriorityType;
  ticket_id: string;
  user_id?: string;
  category?: string;
  email?: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

// ─── Config Maps ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; icon: string }> = {
  open: { label: 'Open', color: '#1e6ef4', bg: '#e8f0fe', icon: 'radio-button-on' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: '#fef3c7', icon: 'time' },
  resolve: { label: 'Resolved', color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle' },
  close: { label: 'Closed', color: '#6b7280', bg: '#f3f4f6', icon: 'close-circle' },
};

const PRIORITY_CONFIG: Record<PriorityType, { label: string; color: string; dot: string }> = {
  low: { label: 'Low', color: '#6b7280', dot: '#9ca3af' },
  medium: { label: 'Medium', color: '#f59e0b', dot: '#fbbf24' },
  high: { label: 'High', color: '#ef4444', dot: '#f87171' },
  critical: { label: 'Critical', color: '#7c3aed', dot: '#8b5cf6' },
};

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

// ─── Filter Tab ───────────────────────────────────────────────────────────────

const FILTERS: { key: TicketStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolve', label: 'Resolved' },
  { key: 'close', label: 'Closed' },
];

// ─── Ticket Card ──────────────────────────────────────────────────────────────

const TicketCard = ({
  ticket,
  onPress,
}: {
  ticket: TicketType;
  onPress: () => void;
}) => {
  // normalize status and priority
const status = STATUS_CONFIG[ticket.status.toLowerCase() as TicketStatus];
const priority = PRIORITY_CONFIG[ticket.priority.toLowerCase() as PriorityType];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Priority bar */}
      <View style={[styles.priorityBar, { backgroundColor: priority.dot }]} />

      <View style={styles.cardContent}>
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <Text style={styles.ticketId}>{ticket.ticket_id} - user_id:{ticket.user_id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon as any} size={10} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Subject */}
        <Text style={styles.subject} numberOfLines={2}>{ticket.subject}</Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.priorityChip}>
            <View style={[styles.priorityDot, { backgroundColor: priority.dot }]} />
            <Text style={[styles.priorityLabel, { color: priority.color }]}>{priority.label}</Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={11} color="#9ca3af" />
            <Text style={styles.dateText}>{friendlyDate(ticket.date_created)}</Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" style={styles.chevron} />
    </TouchableOpacity>
  );
};

// ─── Action Button ────────────────────────────────────────────────────────────

const ActionButton = ({
  icon,
  label,
  color,
  bg,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.actionIconWrap, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={18} color={color} />
    </View>
    <Text style={[styles.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const TicketDetailModal = ({
  ticket,
  visible,
  onClose,
  onAction,
  loading,
  task,
}: {
  ticket: TicketType | null;
  visible: boolean;
  onClose: () => void;
  onAction: (action: string, ticket: TicketType, text?:string) => void;
  loading:boolean,
  task: string
}) => {
  const [replyText, setReplyText] = useState('');
  

  if (!ticket) return null;

  // normalize status and priority
const status = STATUS_CONFIG[ticket.status.toLowerCase() as TicketStatus];
const priority = PRIORITY_CONFIG[ticket.priority.toLowerCase() as PriorityType];



  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTicketId}>{ticket.ticket_id} - user_id:{ticket.user_id}</Text>
              <Text style={styles.modalTitle} numberOfLines={2}>{ticket.subject}</Text>
              <Text style={{fontSize:10, color:'gray'}}>{ticket.email}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            {/* Meta Row */}
            <View style={styles.metaRow}>
              <View style={[styles.statusBadge, { backgroundColor: status.bg, paddingHorizontal: 10, paddingVertical: 5 }]}>
                <Ionicons name={status.icon as any} size={12} color={status.color} />
                <Text style={[styles.statusText, { color: status.color, fontSize: 12 }]}>{status.label}</Text>
              </View>
              <View style={[styles.priorityChip, { borderWidth: 1, borderColor: priority.dot + '50', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }]}>
                <View style={[styles.priorityDot, { backgroundColor: priority.dot }]} />
                <Text style={[styles.priorityLabel, { color: priority.color }]}>{priority.label} Priority</Text>
              </View>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                <Text style={styles.dateText}>{}</Text>
              </View>
            </View>

            {/* Description */}
            {ticket.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>User&apos;s Message</Text>
                <View style={styles.descBox}>
                  <Text style={styles.descText}>{ticket.description}</Text>
                </View>
              </View>
            ) : null}

            {/* Admin Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Admin Actions</Text>
              <View style={styles.actionsGrid}>
                <ActionButton
                  icon="checkmark-circle-outline"
                  label= {loading && task === 'resolve' ? "updating...":"Mark Resolved"}
                  color="#10b981"
                  bg="#d1fae5"
                  onPress={() => onAction('resolve', ticket)}
                />
                <ActionButton
                  icon="time-outline"
                  label={loading && task === 'in_progress' ? "updating...":"Set In Progress"}
                  color="#f59e0b"
                  bg="#fef3c7"
                  onPress={() => onAction('in_progress', ticket)}
                />
                <ActionButton
                  icon="close-circle-outline"
                  label={loading && task === 'close'? "updating...":"Close Ticket"}
                  color="#6b7280"
                  bg="#f3f4f6"
                  onPress={() => onAction('close', ticket)}
                />
                <ActionButton
                  icon="arrow-up-circle-outline"
                  label={loading && task === 'escalate'? "updating...":"Escalate"}
                  color="#7c3aed"
                  bg="#ede9fe"
                  onPress={() => onAction('escalate', ticket)}
                />
                <ActionButton
                  icon="person-outline"
                  label={loading && task === 'assign'? "updating...":"Assign Agent"}
                  color="#3986f9"
                  bg="#e8f0fe"
                  onPress={() => onAction('assign', ticket)}
                />
                <ActionButton
                  icon={loading && task === 'delete' ? "updating...":"trash-outline"}
                  label="Delete"
                  color="#ef4444"
                  bg="#fee2e2"
                  onPress={() => onAction('delete', ticket)}
                />
              </View>
            </View>

            {/* Reply Box */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reply to User</Text>
              <TextInput
                style={styles.replyInput}
                placeholder="Type your response here..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                value={replyText}
                onChangeText={setReplyText}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !replyText.trim() && styles.sendBtnDisabled]}
                onPress={() => {
                  if (replyText.trim()) {
                    onAction('reply', ticket, replyText);
                    setReplyText('');
                  }
                }}
                disabled={!replyText.trim()}
              >
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.sendBtnText}>Send Reply</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminTicketsScreen({ onBack }: { onBack?: () => void }) {
  const [activeFilter, setActiveFilter] = useState<TicketStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const {showToast} = useToast();
  const service:CoreService = new CoreService();
  const [loading, setLoading] = useState<boolean>(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const [localStateLoading, setLocalStateLoading] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<string>('');


const replyUser = async (
  email: string,
  subject: string,
  message: string,
  ticket_id: string
) => {
  if (!email?.trim() || !subject?.trim() || !message?.trim() || !ticket_id?.trim()) {
    showToast('All fields are required', 'error');
    return;
  }

  try {
    const res = await service.send('/api/admin/tickets/email-user', {
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      ticket_id: ticket_id.trim(),
    });
    
    if (res.success) {
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  } catch (e: any) {
    showToast(e?.message || 'Failed to send email', 'error');
  }
};

  const fetchAllTickets = async() => {
    setLoading(true);
    try{
        const res = await service.get<TicketType[]>('/api/admin/tickets/all');
        if (res.success && Array.isArray(res.data)) {
        setTickets(res.data);
        showToast(res.message);
        } else {
        setTickets([]); // <-- ensures tickets is always an array
        showToast(res.message, 'error');
        }
    }catch(e:any){
        showToast(e.message,'error');
    }finally{
        setLoading(false);
    }
  }


  useEffect(() => {
    fetchAllTickets();
    Animated.loop(
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  ).start();
  },[]);


  const filtered = tickets.filter((t) => {
    const matchFilter = activeFilter === 'all' || t.status === activeFilter;
    const matchSearch =
      search.trim() === '' ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolve').length,
    closed: tickets.filter((t) => t.status === 'close').length,
  };

  const updateStatus = async(ticketId:string, status:string) => {
    setLocalStateLoading(true);
    setCurrentTask(status);
    try{
        const res = await service.put(`/api/admin/tickets/status/${ticketId}`, {status});
        if(res.success){
            showToast(res.message);
        }else{
            showToast(res.message,'error');
        }
    }catch(e:any){
        showToast(e.message,'error');
    } finally {
        setLocalStateLoading(false);
    }
  }

  const handleAction = async(action: string, ticket: TicketType, text?:string) => {
    const ticketId = tickets.find((t) => t.ticket_id === ticket.ticket_id)?.ticket_id;
   if (ticketId !== undefined && action !== 'delete' && action !== 'assign' && action !== 'escalate' && text == null) {
    await updateStatus(ticketId, action);
  }
    if (action === 'resolve') {
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: 'resolve' } : t)));
    } else if (action === 'in_progress') {
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: 'in_progress' } : t)));
    } else if (action === 'close') {
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: 'close' } : t)));
    } else if(action === 'reply'){
      await replyUser(ticket.email!, ticket.category!, text ?? 'Some text', ticket.ticket_id);
    }else if (action === 'delete') {
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
      setModalVisible(false);
      return;
    }
    // Refresh selected ticket state
    setSelectedTicket((prev) => (prev ? { ...prev, status: action === 'resolve' ? 'resolve' : action === 'close' ? 'close' : action === 'in_progress' ? 'in_progress' : prev.status } : prev));
  };

  
const spin = spinValue.interpolate({
  inputRange: [0, 1],
  outputRange: ['0deg', '360deg'],
});

if (loading) {
  return (
    <View style={styles.loadingState}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="sync" size={32} color="#3986f9" />
      </Animated.View>
    </View>
  );
}

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#3986f9" />

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={isSmallDevice ? 20 : 22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Support Issues</Text>
          <Text style={styles.headerSub}>{tickets.length} total tickets</Text>
        </View>
        <TouchableOpacity style={styles.filterIconBtn}>
          <Ionicons name="options-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{counts.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={[styles.statCard, styles.statCardMid]}>
          <Text style={[styles.statNum, { color: '#f59e0b' }]}>{counts.in_progress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#10b981' }]}>{counts.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by subject or ticket ID..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterTabText, activeFilter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
            <View style={[styles.filterCount, activeFilter === f.key && styles.filterCountActive]}>
              <Text style={[styles.filterCountText, activeFilter === f.key && styles.filterCountTextActive]}>
                {counts[f.key as keyof typeof counts]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Ticket List */}
      <View style={{ flex: 1, marginTop: 12 }}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.ticket_id}
        renderItem={({ item }) => (
          <TicketCard
            ticket={item}
            onPress={() => {
              setSelectedTicket(item);
              setModalVisible(true);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="ticket-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No tickets found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search</Text>
          </View>
        }
      />
      </View>

      {/* Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAction={handleAction}
        loading={localStateLoading}
       task={currentTask}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    backgroundColor: '#3986f9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 14 : 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    color: '#fff',
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 1,
  },
  filterIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#3986f9',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statCardMid: { backgroundColor: 'rgba(255,255,255,0.18)' },
  statNum: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#3986f9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    padding: 0,
  },

  // Filter Tabs
  filterScroll: {
    marginTop: 14,
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    height: 36,
  },
  filterTabActive: {
    backgroundColor: '#3986f9',
    borderColor: '#3986f9',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterTabTextActive: { color: '#fff' },
  filterCount: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  filterCountTextActive: { color: '#fff' },

  // List
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  priorityBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ticketId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3986f9',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  chevron: {
    marginRight: 12,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent:'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
    height: 60,
    width:'100%'
  },
  modalTicketId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3986f9',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    lineHeight: 22,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: { paddingHorizontal: 20 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingVertical: 16,
  },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  descBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#3986f9',
  },
  descText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    width: '47%',
  },
  actionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  replyInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 100,
    backgroundColor: '#fafafa',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3986f9',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 10,
  },
  sendBtnDisabled: { backgroundColor: '#93c5fd' },
  sendBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  loadingState:{
    flex:1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:'white'
  }
});
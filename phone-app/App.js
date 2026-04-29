import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, Animated, Platform, Alert,
  SafeAreaView, ActivityIndicator, Vibration
} from 'react-native';
import { io } from 'socket.io-client';
import { BACKEND_URL, DESTROY_KEY } from './config';

// ── Card definitions (mirrors server) ────────────────────────────────────
const CARDS = [
  { label: "Card 1", desc: "Don't misunderstand me", icon: "👋" },
  { label: "Card 2", desc: "Remember how we used to talk?", icon: "💭" },
  { label: "Card 3", desc: "Ever since the BBSR incident...", icon: "😔" },
  { label: "Card 4", desc: "But I totally understand", icon: "🤝" },
  { label: "Card 5", desc: "Bye!!", icon: "🏃" },
  { label: "Reply Card", desc: "Any reply?", icon: "💬" },
];

// ── Colors ────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0d0a0e',
  surface:  '#1a1520',
  border:   'rgba(255,255,255,0.08)',
  accent:   '#c97b84',
  accentDim:'rgba(201,123,132,0.15)',
  green:    '#6dc87c',
  greenDim: 'rgba(109,200,124,0.15)',
  red:      '#e07070',
  redDim:   'rgba(224,112,112,0.15)',
  muted:    '#6b5f75',
  text:     '#e0d8f0',
  subtext:  '#9a8a95',
};

export default function App() {
  const [socket, setSocket]         = useState(null);
  const [connected, setConnected]   = useState(false);
  const [destroyed, setDestroyed]   = useState(false);
  const [sessionOpen, setSession]   = useState(false);
  const [currentCard, setCard]      = useState(-1);
  const [replied, setReplied]       = useState(null); // null | true | false
  const [replyMsg, setReplyMsg]     = useState('');
  const [events, setEvents]         = useState([]);
  const [resetKey, setResetKey]     = useState('');
  const [resetLoading, setRLoading] = useState(false);
  const [showReset, setShowReset]   = useState(false);
  const [pulseAnim]                 = useState(new Animated.Value(1));
  const scrollRef                   = useRef(null);

  // ── Pulse animation for live dot ─────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Add event to log ──────────────────────────────────────────────────
  const addEvent = useCallback((msg) => {
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEvents(prev => [{ msg, time, id: Date.now() }, ...prev].slice(0, 50));
    Vibration.vibrate(60);
  }, []);

  // ── Socket.io connection ──────────────────────────────────────────────
  useEffect(() => {
    const s = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });

    s.on('connect',    () => { setConnected(true);  addEvent('🔗 Connected to server'); });
    s.on('disconnect', () => { setConnected(false); addEvent('⚡ Connection lost — reconnecting…'); });

    s.on('state_sync', (state) => {
      setDestroyed(state.destroyed);
      setSession(state.sessionOpen);
      setCard(state.lastCard ?? -1);
      setReplied(state.replySent ? true : null);
      addEvent('📡 Synced with server');
    });

    s.on('session_open', () => {
      setSession(true);
      addEvent('👀 She opened the cards!');
      Vibration.vibrate([0, 100, 50, 100]);
    });

    s.on('card_view', ({ index, name }) => {
      setCard(index);
      addEvent(`📖 Now reading: ${name}`);
    });

    s.on('destroyed', ({ replied: r, message }) => {
      setDestroyed(true);
      setReplied(r);
      if (r) {
        setReplyMsg(message);
        addEvent(`💬 She replied: "${message}"`);
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      } else {
        addEvent('🔇 She passed without replying — App destroyed');
        Vibration.vibrate([0, 300, 100, 300]);
      }
    });

    s.on('reset', () => {
      setDestroyed(false);
      setSession(false);
      setCard(-1);
      setReplied(null);
      setReplyMsg('');
      addEvent('🔓 App reset by developer');
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  // ── Reset handler ────────────────────────────────────────────────────
  const handleReset = async () => {
    setRLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: resetKey }),
      });
      const data = await res.json();
      if (data.ok) {
        Alert.alert('✅ Success', 'App unlocked and reset!');
        setShowReset(false);
        setResetKey('');
      } else {
        Alert.alert('❌ Wrong Key', data.error || 'Try again');
      }
    } catch {
      Alert.alert('❌ Error', 'Could not reach server');
    }
    setRLoading(false);
  };

  // ── Status bar colors ────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.title}>📊 Card Tracker</Text>
          <Text style={s.subtitle}>Private dashboard — for your eyes only</Text>
        </View>

        {/* ── Connection + App Status ── */}
        <View style={s.row}>
          <View style={[s.pill, connected ? s.pillGreen : s.pillRed]}>
            {connected && (
              <Animated.View style={[s.dot, { backgroundColor: C.green, opacity: pulseAnim }]} />
            )}
            {!connected && <View style={[s.dot, { backgroundColor: C.red }]} />}
            <Text style={[s.pillText, { color: connected ? C.green : C.red }]}>
              {connected ? 'Server Connected' : 'Reconnecting…'}
            </Text>
          </View>
          <View style={[s.pill, destroyed ? s.pillRed : s.pillGreen]}>
            <Text style={[s.pillText, { color: destroyed ? C.red : C.green }]}>
              {destroyed ? '💀 DESTROYED' : '✅ App Live'}
            </Text>
          </View>
        </View>

        {/* ── Session Status ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>SESSION</Text>
          <View style={s.sessionRow}>
            <View style={[s.dot, { backgroundColor: sessionOpen ? C.green : C.muted, width: 10, height: 10 }]} />
            <Text style={[s.sessionText, { color: sessionOpen ? C.green : C.muted }]}>
              {sessionOpen ? 'She has opened the cards' : 'Waiting for her to open…'}
            </Text>
          </View>
          {replied !== null && (
            <View style={[s.replyBadge, { backgroundColor: replied ? C.accentDim : C.redDim }]}>
              <Text style={[s.replyText, { color: replied ? C.accent : C.red }]}>
                {replied ? `💬 Replied: "${replyMsg}"` : '🔇 No reply — passed through'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Card Progress ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>CARD PROGRESS</Text>
          {CARDS.map((card, i) => {
            const isCurrent = i === currentCard;
            const isDone    = i < currentCard;
            return (
              <View
                key={i}
                style={[
                  s.cardRow,
                  isCurrent && s.cardRowActive,
                  isDone    && s.cardRowDone,
                ]}
              >
                <View style={[
                  s.cardDot,
                  isCurrent && { backgroundColor: C.accent },
                  isDone    && { backgroundColor: C.green },
                ]} />
                <Text style={s.cardIcon}>{card.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    s.cardLabel,
                    isCurrent && { color: C.text },
                    isDone    && { color: C.muted, textDecorationLine: 'line-through' },
                  ]}>
                    {card.label}
                  </Text>
                  <Text style={s.cardDesc} numberOfLines={1}>{card.desc}</Text>
                </View>
                {isCurrent && (
                  <View style={s.currentBadge}>
                    <Animated.View style={{ opacity: pulseAnim }}>
                      <Text style={s.currentBadgeText}>HERE</Text>
                    </Animated.View>
                  </View>
                )}
              </View>
            );
          })}
          {currentCard === -1 && (
            <Text style={s.waitingText}>Waiting for first card view…</Text>
          )}
        </View>

        {/* ── Event Log ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>EVENT LOG</Text>
          {events.length === 0 ? (
            <Text style={s.waitingText}>No events yet…</Text>
          ) : (
            events.map(ev => (
              <View key={ev.id} style={s.eventRow}>
                <Text style={s.eventTime}>{ev.time}</Text>
                <Text style={s.eventMsg}>{ev.msg}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Developer Reset ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>DEVELOPER CONTROLS</Text>
          <TouchableOpacity
            style={s.resetToggle}
            onPress={() => setShowReset(!showReset)}
            activeOpacity={0.7}
          >
            <Text style={s.resetToggleText}>
              {showReset ? '▲ Hide Reset Panel' : '🔑 Unlock & Reset App'}
            </Text>
          </TouchableOpacity>
          {showReset && (
            <View style={s.resetPanel}>
              <TextInput
                style={s.input}
                placeholder="Enter secret developer key…"
                placeholderTextColor={C.muted}
                value={resetKey}
                onChangeText={setResetKey}
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[s.resetBtn, resetLoading && { opacity: 0.5 }]}
                onPress={handleReset}
                disabled={resetLoading}
                activeOpacity={0.8}
              >
                {resetLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.resetBtnText}>🔓 Unlock &amp; Reset</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.bg },
  scroll:       { flex: 1 },
  scrollContent:{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 },

  header:       { marginBottom: 20 },
  title:        { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 24, color: C.accent, fontWeight: '700', marginBottom: 4 },
  subtitle:     { fontSize: 12, color: C.muted, letterSpacing: 0.8 },

  row:          { flexDirection: 'row', gap: 10, marginBottom: 14 },
  pill:         { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 30, borderWidth: 1, flex: 1 },
  pillGreen:    { backgroundColor: C.greenDim, borderColor: 'rgba(109,200,124,0.3)' },
  pillRed:      { backgroundColor: C.redDim,   borderColor: 'rgba(224,112,112,0.3)' },
  pillText:     { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  dot:          { width: 8, height: 8, borderRadius: 4 },

  card:         { backgroundColor: C.surface, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  sectionLabel: { fontSize: 10, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14, fontWeight: '700' },

  sessionRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionText:  { fontSize: 15, fontWeight: '600' },
  replyBadge:   { marginTop: 12, borderRadius: 10, padding: 12 },
  replyText:    { fontSize: 13, fontStyle: 'italic', lineHeight: 20 },

  cardRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'transparent', gap: 10 },
  cardRowActive:{ backgroundColor: 'rgba(201,123,132,0.1)', borderColor: 'rgba(201,123,132,0.3)' },
  cardRowDone:  { opacity: 0.4 },
  cardDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  cardIcon:     { fontSize: 18 },
  cardLabel:    { fontSize: 13, color: C.muted, fontWeight: '600' },
  cardDesc:     { fontSize: 11, color: C.muted, marginTop: 1, opacity: 0.6 },
  currentBadge: { backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  currentBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  waitingText:  { color: C.muted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },

  eventRow:     { flexDirection: 'row', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  eventTime:    { fontSize: 11, color: C.muted, width: 70 },
  eventMsg:     { fontSize: 13, color: C.subtext, flex: 1, lineHeight: 18 },

  resetToggle:  { backgroundColor: C.accentDim, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(201,123,132,0.3)' },
  resetToggleText: { color: C.accent, fontWeight: '700', fontSize: 14 },
  resetPanel:   { marginTop: 14, gap: 10 },
  input:        { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 14, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border },
  resetBtn:     { backgroundColor: C.accent, borderRadius: 12, padding: 15, alignItems: 'center' },
  resetBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

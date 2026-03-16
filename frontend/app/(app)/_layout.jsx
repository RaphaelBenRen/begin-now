import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

function TabIcon({ emoji, focused }) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconFocused]}>
      <View style={{ opacity: focused ? 1 : 0.4 }}>
        {/* On utilisera des icônes vectorielles plus tard */}
        {/* Pour l'instant emoji en attendant l'intégration Lucide */}
      </View>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Aujourd\'hui',
          tabBarIcon: ({ focused }) => (
            <TabBarEmoji emoji="○" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => (
            <TabBarEmoji emoji="▦" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Amis',
          tabBarIcon: ({ focused }) => (
            <TabBarEmoji emoji="◎" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabBarEmoji emoji="◯" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabBarEmoji({ emoji, focused }) {
  return (
    <View style={{ opacity: focused ? 1 : 0.35 }}>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconFocused: {
    backgroundColor: colors.accentLight,
  },
});

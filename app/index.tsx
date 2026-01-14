import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

interface CheckInHistory {
  id: string;
  date: string;
  time: string;
  status: 'checked_in' | 'checked_out';
  duration?: string;
}

interface ActiveShift {
  id: string;
  startTime: string;
  startDate: string;
  duration: string;
  location: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<CheckInHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setCurrentTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to fetch active shift and history
      // For now, using mock data
      const mockActiveShift: ActiveShift | null = null;
      const mockHistory: CheckInHistory[] = [
        {
          id: '1',
          date: '2026-01-14',
          time: '02:00:00',
          status: 'checked_in',
          duration: '2h 48m',
        },
        {
          id: '2',
          date: '2026-01-13',
          time: '08:30:00',
          status: 'checked_out',
          duration: '8h 15m',
        },
        {
          id: '3',
          date: '2026-01-12',
          time: '08:00:00',
          status: 'checked_in',
          duration: '8h 0m',
        },
      ];

      setActiveShift(mockActiveShift);
      setCheckInHistory(mockHistory);
      setIsCheckedIn(mockActiveShift !== null);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to check in
      const newShift: ActiveShift = {
        id: Date.now().toString(),
        startTime: currentTime.split(' ')[1],
        startDate: currentTime.split(' ')[0],
        duration: '0m',
        location: 'Current Location',
      };

      setActiveShift(newShift);
      setIsCheckedIn(true);

      // Add to history
      const historyEntry: CheckInHistory = {
        id: Date.now().toString(),
        date: currentTime.split(' ')[0],
        time: currentTime.split(' ')[1],
        status: 'checked_in',
      };

      setCheckInHistory([historyEntry, ...checkInHistory]);
      Alert.alert('Success', 'You have checked in successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to check in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to check out
      if (activeShift) {
        // Add checkout entry to history
        const historyEntry: CheckInHistory = {
          id: Date.now().toString(),
          date: currentTime.split(' ')[0],
          time: currentTime.split(' ')[1],
          status: 'checked_out',
          duration: calculateDuration(activeShift.startTime, currentTime.split(' ')[1]),
        };

        setCheckInHistory([historyEntry, ...checkInHistory]);
        setActiveShift(null);
        setIsCheckedIn(false);
        Alert.alert('Success', 'You have checked out successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check out');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDuration = (startTime: string, endTime: string): string => {
    // Simple duration calculation (can be enhanced)
    return '8h 0m';
  };

  const renderHistoryItem = ({ item }: { item: CheckInHistory }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyContent}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyDate}>{item.date}</Text>
          <Text
            style={[
              styles.historyStatus,
              item.status === 'checked_in'
                ? styles.statusCheckedIn
                : styles.statusCheckedOut,
            ]}
          >
            {item.status === 'checked_in' ? 'Check In' : 'Check Out'}
          </Text>
        </View>
        <Text style={styles.historyTime}>{item.time}</Text>
        {item.duration && <Text style={styles.historyDuration}>Duration: {item.duration}</Text>}
      </View>
    </View>
  );

  const emptyListMessage = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No check-in history yet</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bank Minder</Text>
        <Text style={styles.currentTime}>{currentTime}</Text>
      </View>

      {/* Check-In Button Section */}
      <View style={styles.checkInSection}>
        <TouchableOpacity
          style={[
            styles.checkInButton,
            isCheckedIn && styles.checkOutButton,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.checkInButtonText}>
              {isCheckedIn ? 'Check Out' : 'Check In'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Shift Display */}
      {activeShift && (
        <View style={styles.activeShiftCard}>
          <Text style={styles.activeShiftTitle}>Active Shift</Text>
          <View style={styles.shiftDetails}>
            <View style={styles.shiftDetail}>
              <Text style={styles.shiftLabel}>Start Date</Text>
              <Text style={styles.shiftValue}>{activeShift.startDate}</Text>
            </View>
            <View style={styles.shiftDetail}>
              <Text style={styles.shiftLabel}>Start Time</Text>
              <Text style={styles.shiftValue}>{activeShift.startTime}</Text>
            </View>
            <View style={styles.shiftDetail}>
              <Text style={styles.shiftLabel}>Location</Text>
              <Text style={styles.shiftValue}>{activeShift.location}</Text>
            </View>
          </View>
        </View>
      )}

      {/* History Section */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Check-In History</Text>
        {isLoading && checkInHistory.length === 0 ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <FlatList
            data={checkInHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={emptyListMessage}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  currentTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  checkInSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  checkOutButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  activeShiftCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeShiftTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  shiftDetails: {
    gap: 10,
  },
  shiftDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  shiftValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  historySection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  historyContent: {
    gap: 6,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusCheckedIn: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  statusCheckedOut: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  historyTime: {
    fontSize: 12,
    color: '#666',
  },
  historyDuration: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  loader: {
    marginTop: 20,
  },
});

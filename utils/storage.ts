import AsyncStorage from '@react-native-async-storage/async-storage';

export type CheckInHistory = {
  id: string;
  date: string;
  time: string;
  completed: boolean;
  receiptUri?: string;
  amount?: number;
  notes?: string;
};

const HISTORY_KEY = 'shift_checkins';
const ACTIVE_SHIFT_KEY = 'active_shift';

/**
 * Save a new check-in entry to history
 */
export async function saveCheckIn(entry: CheckInHistory) {
  try {
    const list = await getHistory();
    list.unshift(entry);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    console.log('Check-in saved:', entry.id);
  } catch (error) {
    console.error('Failed to save check-in:', error);
    throw error;
  }
}

/**
 * Get all check-in history entries
 */
export async function getHistory(): Promise<CheckInHistory[]> {
  try {
    const str = await AsyncStorage.getItem(HISTORY_KEY);
    return str ? JSON.parse(str) : [];
  } catch (error) {
    console.error('Failed to retrieve history:', error);
    return [];
  }
}

/**
 * Mark a check-in as complete with receipt details
 */
export async function markCheckInComplete(
  id: string,
  receiptUri: string,
  amount?: number,
  notes?: string
) {
  try {
    const list = await getHistory();
    const idx = list.findIndex((e) => e.id === id);
    if (idx >= 0) {
      list[idx].completed = true;
      list[idx].receiptUri = receiptUri;
      if (amount !== undefined) list[idx].amount = amount;
      if (notes !== undefined) list[idx].notes = notes;
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
      console.log('Check-in marked complete:', id);
    }
  } catch (error) {
    console.error('Failed to mark check-in complete:', error);
    throw error;
  }
}

/**
 * Get the currently active shift
 */
export async function getActiveShift(): Promise<CheckInHistory | null> {
  try {
    const str = await AsyncStorage.getItem(ACTIVE_SHIFT_KEY);
    return str ? JSON.parse(str) : null;
  } catch (error) {
    console.error('Failed to retrieve active shift:', error);
    return null;
  }
}

/**
 * Set the currently active shift
 */
export async function setActiveShift(shift: CheckInHistory | null) {
  try {
    if (shift === null) {
      await AsyncStorage.removeItem(ACTIVE_SHIFT_KEY);
    } else {
      await AsyncStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(shift));
    }
    console.log('Active shift updated:', shift?.id);
  } catch (error) {
    console.error('Failed to set active shift:', error);
    throw error;
  }
}

/**
 * Clear all history (use with caution)
 */
export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    console.log('History cleared');
  } catch (error) {
    console.error('Failed to clear history:', error);
    throw error;
  }
}
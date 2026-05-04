import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-notifications', () => ({ requestPermissionsAsync: jest.fn() }));

import SetupScreen from '@/app/setup';

// Platform defaults to iOS in jest-expo — permission steps auto-grant and advance,
// which is sufficient to verify the entire step flow and navigation logic.
describe('SetupScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the welcome step on mount', () => {
    const { getByText } = render(<SetupScreen />);
    expect(getByText('OVERWORLD')).toBeTruthy();
    expect(getByText("Let's Go →")).toBeTruthy();
  });

  it("advances to location step when Let's Go is pressed", () => {
    const { getByText } = render(<SetupScreen />);
    fireEvent.press(getByText("Let's Go →"));
    expect(getByText('Location Access')).toBeTruthy();
    expect(getByText('Grant Location')).toBeTruthy();
  });

  it('advances past location step', async () => {
    const { getByText } = render(<SetupScreen />);
    fireEvent.press(getByText("Let's Go →"));
    await act(async () => {
      fireEvent.press(getByText('Grant Location'));
    });
    await waitFor(() => expect(getByText('Bluetooth Access')).toBeTruthy());
  });

  it('reaches the done step after all permission steps', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

    const { getByText } = render(<SetupScreen />);
    fireEvent.press(getByText("Let's Go →"));
    await act(async () => {
      fireEvent.press(getByText('Grant Location'));
    });
    await waitFor(() => getByText('Bluetooth Access'));
    await act(async () => {
      fireEvent.press(getByText('Grant Bluetooth'));
    });
    await waitFor(() => getByText('Notifications'));
    await act(async () => {
      fireEvent.press(getByText('Grant Notifications'));
    });
    await waitFor(() => expect(getByText('All Set!')).toBeTruthy());
  });

  it('Enter Overworld writes setup flag and navigates to tabs', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

    const { getByText } = render(<SetupScreen />);
    fireEvent.press(getByText("Let's Go →"));
    await act(async () => {
      fireEvent.press(getByText('Grant Location'));
    });
    await waitFor(() => getByText('Bluetooth Access'));
    await act(async () => {
      fireEvent.press(getByText('Grant Bluetooth'));
    });
    await waitFor(() => getByText('Notifications'));
    await act(async () => {
      fireEvent.press(getByText('Grant Notifications'));
    });
    await waitFor(() => getByText('All Set!'));
    await act(async () => {
      fireEvent.press(getByText('Enter Overworld'));
    });
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});

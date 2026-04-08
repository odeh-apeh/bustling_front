import { Linking, Platform } from "react-native";

interface dialerProps {
    phoneNumber: string;
    onError?:(err:string) => void;
}

export const openDialer = ({phoneNumber, onError}:dialerProps) => {
  let url = '';

  if (Platform.OS === 'android') {
    url = `tel:${phoneNumber}`;
  } else {
    url = `telprompt:${phoneNumber}`;
  }

  Linking.canOpenURL(url)
    .then((supported) => {
      if (!supported) {
        if(onError)
        onError('Phone dialer is not supported on this device');
      } else {
        return Linking.openURL(url);
      }
    })
    .catch((err) => console.error('An error occurred', err));
};
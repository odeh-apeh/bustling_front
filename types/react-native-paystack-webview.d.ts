declare module 'react-native-paystack-webview' {
  import { Component } from 'react';
  
  interface PaystackWebViewProps {
    showPaystack: boolean;
    paystackKey: string;
    amount: number;
    billingEmail: string;
    activityIndicatorColor?: string;
    onCancel: () => void;
    onSuccess: (response: any) => void;
    autoStart: boolean;
    billingName?: string;
    refNumber?: string;
    channel?: string;
    style?: object;
  }

  export default class PaystackWebView extends Component<PaystackWebViewProps> {}
}
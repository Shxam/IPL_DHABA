import { create } from 'zustand';

interface OtpState {
  otpToken: string | null;
  otpVerified: boolean;
  phone: string;
  setOtpToken: (token: string | null) => void;
  setOtpVerified: (verified: boolean) => void;
  setPhone: (phone: string) => void;
  resetOtp: () => void;
}

export const useOtpStore = create<OtpState>((set) => ({
  otpToken: null,
  otpVerified: false,
  phone: '',
  setOtpToken: (otpToken) => set({ otpToken }),
  setOtpVerified: (otpVerified) => set({ otpVerified }),
  setPhone: (phone) => set({ phone }),
  resetOtp: () => set({ otpToken: null, otpVerified: false, phone: '' }),
}));

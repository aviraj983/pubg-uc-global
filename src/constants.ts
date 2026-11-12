export type CountryCode = 'IN' | 'BD' | 'PK';

export interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
  flagEmoji: string;
  currency: string;
  currencySymbol: string;
  exchangeRateText: string;
  serverRegion: string;
  paymentMethods: PaymentMethod[];
}

export interface UCPackage {
  id: string;
  amount: number;
  bonus?: number;
  price: number | string;
  currency: string;
  isPopular?: boolean;
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'IN',
    name: 'India',
    flagEmoji: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    exchangeRateText: 'Base Currency (1 INR = ₹1.00)',
    serverRegion: 'PUBG Mobile (India / IN)',
    paymentMethods: [
      {
        id: 'upi',
        name: 'UPI Payment Gateway',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg',
        description: 'Pay using PhonePe, Google Pay, Paytm, BHIM & all UPI apps',
      },
    ],
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    flagEmoji: '🇧🇩',
    currency: 'BDT',
    currencySymbol: '৳',
    exchangeRateText: 'Current Rate: 1 INR ≈ 1.42 BDT',
    serverRegion: 'PUBG Mobile (Bangladesh / BD)',
    paymentMethods: [
      {
        id: 'bkash',
        name: 'bKash',
        description: 'Instant bKash Personal & Merchant Wallet Payment',
      },
      {
        id: 'nagad',
        name: 'Nagad',
        description: 'Fast and secure Nagad digital wallet payment',
      },
    ],
  },
  {
    code: 'PK',
    name: 'Pakistan',
    flagEmoji: '🇵🇰',
    currency: 'PKR',
    currencySymbol: 'Rs',
    exchangeRateText: 'Current Rate: 1 INR ≈ 3.31 PKR',
    serverRegion: 'PUBG Mobile (Pakistan / PK)',
    paymentMethods: [
      {
        id: 'easypaisa',
        name: 'Easypaisa',
        description: 'Pay via Easypaisa Mobile Account or QR',
      },
      {
        id: 'jazzcash',
        name: 'JazzCash',
        description: 'Pay using JazzCash Mobile Wallet',
      },
    ],
  },
];

export const BASE_UC_PACKAGES = [
  { id: 'uc-1800', amount: 1800, baseInr: 399, bdt: 567, pkr: 1320, usdt: 4.65 },
  { id: 'uc-8100', amount: 8100, baseInr: 699, bdt: 992, pkr: 2310, usdt: 8.15, isPopular: true },
  { id: 'uc-16200', amount: 16200, baseInr: 1099, bdt: 1560, pkr: 3640, usdt: 12.79 },
  { id: 'uc-32400', amount: 32400, baseInr: 1999, bdt: 2839, pkr: 6615, usdt: 23.25 },
  { id: 'uc-64800', amount: 64800, baseInr: 3599, bdt: 5110, pkr: 11910, usdt: 41.85 },
  { id: 'uc-129999', amount: 129999, baseInr: 6699, bdt: 9510, pkr: 22170, usdt: 77.89 },
];

export function getPackagesForCountry(countryCode: CountryCode): UCPackage[] {
  return BASE_UC_PACKAGES.map((pkg) => {
    let price: number | string = pkg.baseInr;
    let currency = 'INR';

    if (countryCode === 'BD') {
      price = pkg.bdt;
      currency = 'BDT';
    } else if (countryCode === 'PK') {
      price = pkg.pkr;
      currency = 'PKR';
    }

    return {
      id: pkg.id,
      amount: pkg.amount,
      price,
      currency,
      isPopular: pkg.isPopular,
    };
  });
}

// Default export for initial state / backwards compatibility
export const UC_PACKAGES = getPackagesForCountry('IN');
export const PAYMENT_METHODS = COUNTRIES[0].paymentMethods;

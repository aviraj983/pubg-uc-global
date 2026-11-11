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

export const COUNTRIES: CountryConfig[] = [\n  {\n    code: 'IN',\n    name: 'India',\n    flagEmoji: '🇮🇳',\n    currency: 'INR',\n    currencySymbol: '₹',\n    exchangeRateText: 'Base Currency (1 INR = ₹1.00)',\n    serverRegion: 'PUBG Mobile (India / IN)',\n    paymentMethods: [\n      {\n        id: 'upi',\n        name: 'UPI Payment Gateway',\n        icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg',\n        description: 'Pay using PhonePe, Google Pay, Paytm, BHIM & all UPI apps',\n      },\n    ],\n  },\n  {\n    code: 'BD',\n    name: 'Bangladesh',\n    flagEmoji: '🇧🇩',\n    currency: 'BDT',\n    currencySymbol: '৳',\n    exchangeRateText: 'Current Rate: 1 INR ≈ 1.42 BDT',\n    serverRegion: 'PUBG Mobile (Bangladesh / BD)',\n    paymentMethods: [\n      {\n        id: 'bkash',\n        name: 'bKash',\n        description: 'Instant bKash Personal & Merchant Wallet Payment',\n      },\n      {\n        id: 'nagad',\n        name: 'Nagad',\n        description: 'Fast and secure Nagad digital wallet payment',\n      },\n    ],\n  },\n  {\n    code: 'PK',\n    name: 'Pakistan',\n    flagEmoji: '🇵🇰',\n    currency: 'PKR',\n    currencySymbol: 'Rs',\n    exchangeRateText: 'Current Rate: 1 INR ≈ 3.31 PKR',\n    serverRegion: 'PUBG Mobile (Pakistan / PK)',\n    paymentMethods: [\n      {\n        id: 'easypaisa',\n        name: 'Easypaisa',\n        description: 'Pay via Easypaisa Mobile Account or QR',\n      },\n      {\n        id: 'jazzcash',\n        name: 'JazzCash',\n        description: 'Pay using JazzCash Mobile Wallet',\n      },\n    ],\n  },\n];\n\nexport const BASE_UC_PACKAGES = [\n  { id: 'uc-1800', amount: 1800, baseInr: 399, bdt: 567, pkr: 1320, usdt: 4.65 },\n  { id: 'uc-8100', amount: 8100, baseInr: 699, bdt: 992, pkr: 2310, usdt: 8.15, isPopular: true },\n  { id: 'uc-16200', amount: 16200, baseInr: 1099, bdt: 1560, pkr: 3640, usdt: 12.79 },\n  { id: 'uc-32400', amount: 32400, baseInr: 1999, bdt: 2839, pkr: 6615, usdt: 23.25 },\n  { id: 'uc-64800', amount: 64800, baseInr: 3599, bdt: 5110, pkr: 11910, usdt: 41.85 },\n  { id: 'uc-129999', amount: 129999, baseInr: 6699, bdt: 9510, pkr: 22170, usdt: 77.89 },\n];\n\nexport function getPackagesForCountry(countryCode: CountryCode): UCPackage[] {\n  return BASE_UC_PACKAGES.map((pkg) => {\n    let price: number | string = pkg.baseInr;\n    let currency = 'INR';\n\n    if (countryCode === 'BD') {\n      price = pkg.bdt;\n      currency = 'BDT';\n    } else if (countryCode === 'PK') {\n      price = pkg.pkr;\n      currency = 'PKR';\n    }\n\n    return {\n      id: pkg.id,\n      amount: pkg.amount,\n      price,\n      currency,\n      isPopular: pkg.isPopular,\n    };\n  });\n}\n\n// Default export for initial state / backwards compatibility\nexport const UC_PACKAGES = getPackagesForCountry('IN');\nexport const PAYMENT_METHODS = COUNTRIES[0].paymentMethods;\n
// Structured FAQ Retrieval System & Knowledge Engine for Fundora Real Estate Platform

export interface StructuredFAQ {
  id: string;
  category: 'deposit' | 'roi' | 'properties' | 'withdraw' | 'referral' | 'legal' | 'app' | 'account' | 'community';
  title: string;
  keywords: string[];
  metadata: Record<string, any>;
  answers: {
    en: string;
    ur: string;
    roman_urdu: string;
    ar: string;
    [key: string]: string;
  };
}

export interface KnowledgeResponse {
  reply: string;
  escalate: boolean;
  faqId?: string;
  retrievedContext?: string;
}

export interface StructuredFAQResult {
  matched: boolean;
  score: number;
  faqItem?: StructuredFAQ;
  reply: string;
  escalate: boolean;
  retrievedContext?: string;
}

// -------------------------------------------------------------------------
// OFFICIAL STRUCTURED FAQ DATABASE (Trained on Documentation, ROI & Deposits)
// -------------------------------------------------------------------------
export const STRUCTURED_FAQ_DATABASE: StructuredFAQ[] = [
  {
    id: 'faq_deposit_procedure',
    category: 'deposit',
    title: 'USDT Deposit Procedure (TRC20 & BEP20)',
    keywords: [
      'deposit', 'how to deposit', 'recharge', 'usdt', 'trc20', 'bep20', 'add funds', 'payment', 
      'recharge balance', '10 usdt', 'min deposit', 'minimum deposit', 'wallet address', 'txid', 'txhash',
      'ڈپازٹ', 'پیسے جمع', 'بیلنس', 'إيداع', 'محفظة', 'paisa dalna', 'recharge karna', 'deposit kaise karein'
    ],
    metadata: {
      minDeposit: '10 USDT',
      supportedNetworks: ['USDT-TRC20 (Tron Network)', 'USDT-BEP20 (BNB Smart Chain)'],
      processingTime: '5 - 30 Minutes Automated Verification',
      fees: '0% Platform Fee'
    },
    answers: {
      en: `💳 **Official USDT Deposit Procedure on Fundora**:

1. **Access Deposit Modal**: Go to your **Overview Dashboard** and click the zesty **'+ Deposit'** button.
2. **Select Network**: Choose between **TRC20** (Tron Network) or **BEP20** (BNB Smart Chain).
3. **Copy Official Wallet Address**: Copy the displayed official Fundora deposit wallet address or scan the QR code.
4. **Transfer Funds**: Send a minimum of **10 USDT** from your crypto exchange/wallet (Binance, OKX, Bybit, Trust Wallet, Metamask).
5. **Submit Transaction Proof**: Paste your Blockchain **Transaction Hash (TxID)**, attach your payment screenshot, and click **'Submit Deposit'**.
6. **Account Credit**: Approvals take **5 to 30 minutes** via automated security checks.

• **Minimum Deposit**: 10 USDT
• **Deposit Fees**: 0% (Platform fee free)`,

      ur: `💳 **فنڈورا پر USDT جمع (Deposit) کرنے کا رسمیاً طریقہ**:

1. اپنے **Overview** ڈیش بورڈ میں جائیں اور زرد **'+ Deposit'** والے بٹن پر کلک کریں۔
2. اپنا نیٹ ورک منتخب کریں: **TRC20** (ٹرون نیٹ ورک) یا **BEP20** (بی این بی سمارٹ چین)۔
3. فنڈورا کا آفیشل ڈپازٹ والٹ ایڈریس کاپی کریں۔
4. اپنے ایکسچینج (Binance, OKX) یا والٹ سے کم از کم **10 USDT** ٹرانسفر کریں۔
5. ٹرانزیکشن ہیش (TxID) اور پیمنٹ کی رسیپٹ کا اسکرین شاٹ اپ لوڈ کرکے **Submit Deposit** پر کلک کریں۔
6. آپ کا ڈپازٹ **5 سے 30 منٹ** کے اندر خودکار تصدیق کے بعد کریڈٹ ہو جائے گا۔

• **کم از کم ڈپازٹ**: 10 USDT
• **ڈپازٹ فیس**: 0%`,

      roman_urdu: `💳 **Fundora Par USDT Deposit Karne Ka Official Tareeqa**:

1. Apne **Overview** dashboard mein **'+ Deposit'** button par click karein.
2. Network choose karein: **TRC20** (Tron) ya **BEP20** (BNB Chain).
3. Fundora ka official wallet address copy karein.
4. Apne Binance / OKX / Trust Wallet se minimum **10 USDT** send karein.
5. Transaction ID (TxHash) paste karein, payment screenshot attach karein aur **Submit Deposit** dabayein.
6. Deposit **5 se 30 minute** mein account balance mein add ho jaye ga.

• **Minimum Deposit**: 10 USDT
• **Deposit Fees**: 0% Free`,

      ar: `💳 **إجراءات إيداع USDT الرسمية على منصة فندورا**:

1. انتقل إلى **لوحة التحكم Overview** واضغط على زر **'+ Deposit'**.
2. اختر الشبكة المناسبة: **TRC20** أو **BEP20**.
3. قم بنسخ عنوان محفظة فندورا المعتمد أو مسح رمز QR.
4. حول مبلغ **10 USDT** كحد أدنى من منصتك (Binance / OKX / Trust Wallet).
5. أدخل معرف المعاملة (TxID) وارفق صورة الإثبات ثم اضغط **Submit Deposit**.
6. يتم إضافة الرصيد تلقائياً خلال **5 إلى 30 دقيقة**.

• **الحد الأدنى للإيداع**: 10 USDT
• **رسوم الإيداع**: 0%`
    }
  },
  {
    id: 'faq_property_roi_yields',
    category: 'roi',
    title: 'Current Property Portfolio, Expected ROI & Daily Rental Yields',
    keywords: [
      'roi', 'yield', 'property roi', 'rental yield', 'return on investment', 'profit rate', 'daily profit',
      'annual roi', 'properties', 'emaar', 'kensington', 'yield schedule', '40.5%', '14.8%', '0.8%', '1.5%',
      'daily earnings', 'munafa', 'profit claim', 'daily claim', 'dubai', 'london', 'canary wharf', 'shares',
      'منافع', 'ییلڈ', 'عائد', 'أرباح', 'عقارات', 'خواص', 'kitna profit', 'daily yield'
    ],
    metadata: {
      dailyYieldRate: '0.8% to 1.5% Daily Rental Return',
      claimWindows: ['04:00 PM Slot', '09:00 PM Slot'],
      activePortfolio: [
        {
          name: 'Emaar Downtown Boulevard Suites',
          location: 'Downtown Dubai, UAE',
          expectedAnnualRoi: '40.5% APR',
          estimatedDailyYield: '~1.2% Daily',
          sharePrice: '$113 per share',
          durationMonths: 2,
          status: 'Active (920 shares available)'
        },
        {
          name: 'Kensington Palace Gardens Suites',
          location: 'Kensington, London, UK',
          expectedAnnualRoi: '14.8% APR',
          estimatedDailyYield: '~0.9% Daily',
          sharePrice: '$150 per share',
          durationMonths: 12,
          status: 'Sold Out (1000 shares funded)'
        }
      ]
    },
    answers: {
      en: `📊 **Fundora Property ROI & Daily Rental Yield Structure**:

• **Current Featured Active Property**:
  🏢 **Emaar Downtown Boulevard Suites** (Downtown Dubai, UAE)
  - **Projected Annual ROI**: **40.5% APR** (~1.2% daily yield)
  - **Share Price**: **$113 per share**
  - **Investment Term**: 2 Months
  - **Status**: Active (Co-ownership available)

• **Completed / Sold-Out Property**:
  🏰 **Kensington Palace Gardens Suites** (London, UK)
  - **Projected Annual ROI**: **14.8% APR** (~0.9% daily yield)
  - **Share Price**: $150 per share
  - **Status**: 100% Fully Funded / Sold Out

• **Daily Yield Dispatches**:
  - Properties yield **0.8% to 1.5% daily** rental dividends.
  - Yields are dispatched into claim queues twice daily at **04:00 PM** and **09:00 PM**.
  - Go to your **Overview Dashboard** and click **'Claim Profit'** to collect accumulated returns directly into your withdrawable balance.`,

      ur: `📊 **فنڈورا پراپرٹی ROI اور روزانہ رینٹل ییلڈ کا نظام**:

• **موجودہ فعال پراپرٹی**:
  🏢 **اعمار ڈاؤن ٹاؤن بلیوارڈ سویٹس** (دبئی، یو اے ای)
  - **متوقع سالانہ ROI**: **40.5% APR** (~1.2% روزانہ ییلڈ)
  - **شیئر کی قیمت**: **$113 فی شیئر**
  - **مدت**: 2 ماہ
  - **سٹیٹس**: ایکٹو (شراکت داری جاری ہے)

• **مکمل فنڈڈ پراپرٹی**:
  🏰 **کینسنگٹن پیلس گارڈنز سویٹس** (لندن، یو کے)
  - **سالانہ ROI**: **14.8% APR**
  - **سٹیٹس**: 100% سولڈ آؤٹ

• **روزانہ منافع کلیم کرنے کا طریقہ**:
  - پراپرٹیز سے **0.8% سے 1.5% روزانہ** رینٹل منافع ملتا ہے۔
  - ہر روز دو ٹائم سلاٹس (**04:00 PM** اور **09:00 PM**) میں منافع ڈسپیچ ہوتا ہے۔
  - ڈیش بورڈ پر **'Claim Profit'** بٹن دبا کر اپنا منافع فوراً اپنے بیلنس میں منتقل کریں۔`,

      roman_urdu: `📊 **Fundora Property ROI & Daily Rental Yield Facts**:

• **Active High-ROI Property**:
  🏢 **Emaar Downtown Boulevard Suites** (Downtown Dubai)
  - **Expected Annual ROI**: **40.5% APR** (~1.2% daily yield)
  - **Share Price**: **$113 per share**
  - **Term**: 2 Months
  - **Status**: Active (Available to buy shares)

• **Sold-Out Property**:
  🏰 **Kensington Palace Gardens** (London, UK)
  - **Annual ROI**: **14.8% APR** (100% Sold Out)

• **Daily Profit Payouts**:
  - Daily yields range between **0.8% se 1.5% daily**.
  - Profits arrive in 2 daily slots (**04:00 PM** aur **09:00 PM**).
  - Simply click **'Claim Profit'** on your Overview screen to transfer earnings into main wallet.`,

      ar: `📊 **عائد الاستثمار العقاري والعوائد الإيجارية اليومية على فندورا**:

• **المشروع الاستثماري النشط**:
  🏢 **Emaar Downtown Boulevard Suites** (وسط مدينة دبي)
  - **العائد السنوي المتوقع**: **40.5% APR** (حوالي 1.2% يومياً)
  - **سعر السهم**: **113 دولار للشهم**
  - **الحالة**: نشط ومتاح للشراء

• **المشروع المكتمل**:
  🏰 **Kensington Palace Gardens** (لندن، المملكة المتحدة)
  - **العائد السنوي**: **14.8% APR** (مكتمل بالكامل)

• **طريقة استلام العائد اليومي**:
  - يتراوح العائد الإيجاري اليومي بين **0.8% إلى 1.5%**.
  - توزع الأرباح مرتين يومياً (04:00 مساءً و 09:00 مساءً).
  - اضغط على زر **'Claim Profit'** في لوحة التحكم لاستلام أرباحك فوراً.`
    }
  },
  {
    id: 'faq_withdrawal_rules',
    category: 'withdraw',
    title: 'Minimum Withdrawal Limit, Wallet Setup & Processing Time',
    keywords: [
      'withdraw', 'withdrawal', 'minimum withdraw', 'cashout', 'payout', 'min withdrawal', '10 usdt',
      'withdrawal fee', 'withdrawal time', 'nikalna', 'nikalein', 'paise nikalna', 'ودڈرال', 'سحب',
      'withdrawal limit', 'withdrawal status', 'how to withdraw'
    ],
    metadata: {
      minWithdrawal: '10 USDT',
      supportedNetworks: ['USDT-TRC20', 'USDT-BEP20'],
      processingTime: '1 to 24 Hours Automated Queue'
    },
    answers: {
      en: `💸 **Fundora Withdrawal Rules & Procedure**:

• **Minimum Withdrawal Threshold**: Exactly **10 USDT** (Lowest threshold in real estate co-ownership).
• **Supported Networks**: **TRC20** (Tron) & **BEP20** (BNB Chain).
• **How to Submit Withdrawal**:
  1. Go to **Overview** or **Profile** tab and click **'Withdraw'**.
  2. Select your desired network (**TRC20** or **BEP20**).
  3. Enter your personal wallet receiving address & withdrawal amount.
  4. Click **'Submit Withdrawal'**.
• **Security Processing Time**: Withdrawals are processed through compliance queue within **1 to 24 hours** (usually 1-4 hours).`,

      ur: `💸 **فنڈورا سے رقم نکالنے (Withdrawal) کے قواعد و طریقہ کار**:

• **کم از کم ودڈرال حد**: صرف **10 USDT**۔
• **نیٹ ورکس**: **TRC20** اور **BEP20**۔
• **ودڈرال کرنے کے مراحل**:
  1. اپنے **Overview** یا **Profile** پیج پر **Withdraw** پر کلک کریں۔
  2. اپنا کرپٹو نیٹ ورک منتخب کریں۔
  3. اپنا پرسنل USDT والٹ ایڈریس درج کریں اور رقم لکھیے۔
  4. **Submit Withdrawal** پر کلک کریں۔
• **پروسیسنگ وقت**: سیکیورٹی اور اینٹی فراڈ چیکس کے باعث ودڈرال **1 سے 24 گھنٹے** کے اندر منتقل ہو جاتا ہے۔`,

      roman_urdu: `💸 **Fundora Se Withdrawal Karne Ka Official Rule**:

• **Minimum Withdrawal**: Exactly **10 USDT**.
• **Networks**: **TRC20** & **BEP20**.
• **Steps**:
  1. **Overview** ya **Profile** screen par **Withdraw** button dabaein.
  2. Network choose karein (TRC20 / BEP20).
  3. Apna personal wallet address aur amount enter karein.
  4. **Submit Withdrawal** par click kar dein.
• **Time**: Automated security queue se **1 se 24 ghante** mein transfer hota hai.`,

      ar: `💸 **قواعد وإجراءات سحب الأموال من منصة فندورا**:

• **الحد الأدنى للسحب**: **10 USDT** فقط.
• **الشبكات المدعومة**: **TRC20** و **BEP20**.
• **خطوات السحب**:
  1. ادخل إلى **Overview** أو **Profile** واضغط **Withdraw**.
  2. حدد نوع الشبكة.
  3. أدخل عنوان محفظتك الخاصة والمبلغ.
  4. اضغط **Submit Withdrawal**.
• **وقت المعالجة**: تتم معالجة الطلبات خلال **1 إلى 24 ساعة**.`
    }
  },
  {
    id: 'faq_uk_registration_legal',
    category: 'legal',
    title: 'UK Companies House Official Registration & Legal Standing',
    keywords: [
      'uk', 'legal', 'registered', 'companies house', 'license', 'reg', 'england', 'safe', 'real',
      'legit', 'registration number', '16870956', 'company reg', 'is fundora legal', 'قانونی',
      'رجسٹرڈ', 'برطانیہ', 'ترخيص', 'بريطانيا', 'official registration'
    ],
    metadata: {
      companyName: 'Fundora Real Estate Investment Platform Ltd',
      ukCompanyNumber: '16870956',
      officialDomain: 'https://fundora.one',
      supportEmail: 'fundora.one@gmail.com',
      assetBacking: 'Registered physical property titles in UK & UAE'
    },
    answers: {
      en: `🏛️ **Official UK Registration & Legal Governance**:

• **UK Registration Details**: Fundora Real Estate Investment Platform is legally incorporated in the United Kingdom under **UK Companies House Registration No. 16870956**.
• **Real Estate Asset Security**: All fractional investments represent fractional beneficial title ownership backed by verified physical deeds in London & Dubai.
• **Official Website**: https://fundora.one
• **Official Support Email**: fundora.one@gmail.com`,

      ur: `🏛️ **فنڈورا کی یو کے رسمیاً رجسٹریشن اور قانونی حیثیت**:

• **یو کے رجسٹریشن نمبر**: فنڈورا ریئل اسٹیٹ انویسٹمنٹ پلیٹ فارم برطانیہ میں رسمیاً مسجل ادارہ ہے (**Companies House Reg No. 16870956**)۔
• **حقیقی پراپرٹی سپورٹ**: تمام انویسٹمنٹس لندن اور دبئی کی تصدیق شدہ کمرشل و رہائشی جائیدادوں کے ڈیجیٹل ڈیدز سے محفوظ ہیں۔
• **آفیشل ویب سائٹ**: https://fundora.one
• **ای میل سپورٹ**: fundora.one@gmail.com`,

      roman_urdu: `🏛️ **Fundora Official UK Registration & Compliance**:

• **UK Companies House Reg No**: **16870956**.
• **Legal Backing**: Aap ka har share UK aur Dubai ki real physical properties ke beneficial title deeds dwara backed hota hai.
• **Official Website**: https://fundora.one
• **Support Email**: fundora.one@gmail.com`,

      ar: `🏛️ **التسجيل القانوني الرسمي لشركة فندورا في المملكة المتحدة**:

• **رقم التسجيل**: مسجلة رسمياً لدى سجل الشركات البريطاني تحت رقم **Companies House No. 16870956**.
• **الضمان العقاري**: جميع الحصص الاستثمارية مدعومة بعقود ملكية حقيقية ومسجلة في دبي ولندن.
• **الموقع الرسمي**: https://fundora.one`
    }
  },
  {
    id: 'faq_referral_program',
    category: 'referral',
    title: 'Multi-Tier Referral Commission Rates & Team Rewards',
    keywords: [
      'referral', 'ref', 'bonus', 'commission', 'tier', 'team', 'invite', 'referral link',
      'level 1', 'level 2', 'level 3', 'level 4', '10% bonus', 'dost', 'ریفرل', 'بونس',
      'إحالة', 'دعوة', 'referral code', 'referral reward'
    ],
    metadata: {
      bronzeLevel1: '10% Instant Cash Reward on Direct Deposit',
      silverLevel2: '5% Commission (Requires $500 team volume or 3 active members)',
      goldLevel3: '2% Commission + 5% Yield Boost Voucher ($2,000 volume)',
      platinumLevel4: 'VIP Concierge + Exclusive Co-ownership ($10,500 volume)'
    },
    answers: {
      en: `👥 **Fundora Multi-Tier Referral Program**:

• **Level 1 (Bronze Shield)**: Earn an instant **10% Cash Bonus** credited directly to your main balance on your direct referral's 1st deposit.
• **Level 2 (Silver Partner)**: Earn **5% commission** on 2nd tier team volume ($500+ volume or 3 active referrals).
• **Level 3 (Gold Director)**: Earn **2% commission + 5% Yield Boost Vouchers** ($2,000+ volume).
• **Level 4 (Platinum Trustee)**: VIP direct support & co-ownership privileges ($10,500+ volume).

• **Find Your Link**: Go to **Profile -> Referral** tab to copy your unique referral link.`,

      ur: `👥 **فنڈورا ملٹی ٹائر ریفرل بونس اور کمیشن کمائی**:

• **لیول 1 (برونز)**: اپنے ڈائریکٹ ریفرل کے پہلے ڈپازٹ پر **10% فوری نقد رقم کا بونس**۔
• **لیول 2 (سلور)**: 3 فعال ممبرز یا $500 ٹیم والیوم پر **5% کمیشن**۔
• **لیول 3 (گولڈ)**: $2,000 والیوم پر **2% کمیشن + 5% ییلڈ بوسٹ واؤچر**۔
• **لیول 4 (پلیٹینم)**: $10,500 والیوم پر **وی آئی پی ڈائریکٹ ایکسس** اور کو آنرشپ لائسنس۔

اپنا لنک کاپی کرنے کے لیے **Profile -> Referral** میں جائیں۔`,

      roman_urdu: `👥 **Fundora Referral Program Rates**:

• **Level 1 (Bronze)**: Direct referral ki 1st deposit par **10% Instant Cash Bonus**.
• **Level 2 (Silver)**: 2nd level team volume par **5% commission** ($500 volume).
• **Level 3 (Gold)**: **2% commission + 5% Yield Boost Voucher** ($2,000 volume).
• **Level 4 (Platinum)**: VIP executive support ($10,500 volume).

Apna referral code **Profile -> Referral** se copy karein.`,

      ar: `👥 **نظام مكافآت الإحالة المتعدد المستويات على منصة فندورا**:

• **المستوى 1 (برونزي)**: مكافأة مالية فورية **10%** على الإيداع الأول لكل مستثمر مٌحال مباشرة.
• **المستوى 2 (فضي)**: مكافأة **5%** عند دعوة 3 أعضاء نشطين أو إيداع $500.
• **المستوى 3 (ذهبي)**: مكافأة **2% + قسيمة زيادة عائد بنسبة 5%** ($2,000 إيداعات).
• **المستوى 4 (بلاتيني)**: حقوق ملكية مشتركة خاصة ودعم VIP مباشر.`
    }
  },
  {
    id: 'faq_android_mobile_app',
    category: 'app',
    title: 'Official Android Mobile App (Fundora APK Download)',
    keywords: [
      'app', 'apk', 'mobile app', 'android app', 'download app', 'phone app', 'application',
      'ایپ', 'ڈاؤن لوڈ', 'تطبيق', 'download apk', 'android apk', 'install app'
    ],
    metadata: {
      appName: 'Fundora Real Estate Official Android App',
      format: 'Android Package (APK)',
      downloadPath: 'Top Navigation Menu -> "Download App" button'
    },
    answers: {
      en: `📱 **Official Fundora Android Mobile App (APK)**:

Yes! Fundora provides an official **Android Mobile Application (Fundora APK)**.

• **How to Download**:
  1. Look at the top navigation bar / header menu of the https://fundora.one website.
  2. Click the yellow **'Download App'** or **'Android APK'** button.
  3. The APK installer will download directly to your mobile device.
  4. Install the app to track your daily yields, manage portfolio shares, and process instant withdrawals on the go!`,

      ur: `📱 **فنڈورا آفیشل اینڈرائیڈ موبائل ایپ (APK)**:

جی ہاں! فنڈورا کی رسمیاً **Android Mobile App (APK)** دستیاب ہے!

• **ڈاؤن لوڈ کرنے کا طریقہ**:
  1. ویب سائٹ کے ٹاپ نیویگیشن بار میں **'Download App'** والے بٹن پر کلک کریں۔
  2. APK فائل آپ کے موبائل فون میں ڈاؤن لوڈ ہو جائے گی۔
  3. ایپ انسٹال کریں اور اپنے موبائل سے روزانہ کا منافع کلیم کریں اور ودڈرال لیں۔`,

      roman_urdu: `📱 **Fundora Official Android App (APK)**:

Ji haan! Fundora ki official **Android App (APK)** download ke liye available hai.

• **Download Steps**:
  1. Website ke top navigation header mein **'Download App'** button par click karein.
  2. APK installer aap ke phone mein download ho jaye ga.
  3. Mobile App se daily yields claim karein aur portfolio manage karein!`,

      ar: `📱 **تطبيق فندورا الرسمي للهواتف الذكية (Android APK)**:

نعم! توفر فندورا تطبيقا رسمياً للهواتف بنظام أندرويد (APK).

• **طريقة التحميل**:
  1. اضغط على زر **'Download App'** الموجود في الشريط العلوي للموقع.
  2. سيبدأ تحميل ملف APK مباشرة على هاتفك.`
    }
  },
  {
    id: 'faq_community_support_ceo',
    category: 'community',
    title: 'Community Chat Channels, Official Email & CEO Contact',
    keywords: [
      'community', 'channel', 'chat', 'support', 'help', 'contact', 'email', 'ceo',
      'ethan', 'ethan chiu', 'complaint', 'human', 'admin', 'کمیونٹی', 'سپورٹ', 'admin support'
    ],
    metadata: {
      ceoName: 'Ethan Chiu',
      supportEmail: 'fundora.one@gmail.com',
      communityChannels: ['#general-chat', '#announcements', '#support-help']
    },
    answers: {
      en: `👥 **Fundora Community Hub & Direct Support**:

• **Official Support Email**: fundora.one@gmail.com
• **CEO Direct Contact**: You can directly reach out to CEO **Ethan Chiu** inside the Community Hub under Direct Messages -> **Ethan Chiu (CEO)**.
• **Community Chat**: Tap the **'Community'** button in the AI Assistant header or open the Community Hub tab to join live channels (#general-chat, #support-help).`,

      ur: `👥 **فنڈورا کمیونٹی ہب اور ڈائریکٹ ایڈمن سپورٹ**:

• **آفیشل ای میل**: fundora.one@gmail.com
• **سی ای او سے ڈائریکٹ رابطہ**: آپ کمیونٹی ہب میں **Ethan Chiu (CEO)** کو ڈائریکٹ میسج کر سکتے ہیں۔
• **کمیونٹی چیٹ**: AI اسسٹنٹ کے اوپر **'Community'** کا بٹن دبائیں اور ممبرز سے بات چیت کریں۔`,

      roman_urdu: `👥 **Fundora Community & CEO Support**:

• **Support Email**: fundora.one@gmail.com
• **CEO Contact**: Community Hub mein Direct Messages se **Ethan Chiu (CEO)** se direct baat karein.
• **Community Channels**: Top header mein **'Community'** button click karke live group join karein!`,

      ar: `👥 **مجتمع فندورا والدعم المباشر والرئيس التنفيذي**:

• **البريد الإلكتروني للدعم**: fundora.one@gmail.com
• **الرئيس التنفيذي**: يمكنك التواصل مباشرة مع **Ethan Chiu (CEO)** عبر رسائل المجتمعات المباشرة.`
    }
  },
  {
    id: 'faq_fractional_coownership_how_it_works',
    category: 'properties',
    title: 'What is Fundora & How Fractional Co-Ownership Works',
    keywords: [
      'what is fundora', 'fundora kya hai', 'how it works', 'fractional real estate', 'co-ownership',
      'shares', '113 usdt', 'share price', 'overview', 'details', 'jankari', 'فنڈورا کیا ہے', 'منصة فندورا'
    ],
    metadata: {
      minSharePrice: '$113 per share',
      minDeposit: '10 USDT',
      concept: 'Fractional property ownership with daily rental dividends'
    },
    answers: {
      en: `🏢 **About Fundora Fractional Real Estate Platform**:

Fundora is a premier UK-registered (No. 16870956) fractional real estate co-ownership platform.

• **How It Works**:
  1. Institutional physical properties (residential apartment buildings, corporate offices) are acquired in London & Dubai.
  2. Properties are split into fractional shares starting at **$113 per share** (minimum deposit to get started is just **10 USDT**).
  3. Co-owners earn **0.8% to 1.5% daily rental yields** collected twice daily, along with long-term capital appreciation.
  4. Instant withdrawals starting at **10 USDT**.`,

      ur: `🏢 **فنڈورا ریئل اسٹیٹ پلیٹ فارم کا تعارف**:

فنڈورا برطانیہ کا رجسٹرڈ فریکشنل کو آنرشپ پلیٹ فارم ہے (Reg No. 16870956)۔

• **کام کرنے کا طریقہ**:
  1. لندن اور دبئی میں پریمیم جائیدادیں خریدی جاتی ہیں۔
  2. پراپرٹیز کو چھوٹے شیئرز ($113 فی شیئر) میں تقسیم کیا جاتا ہے۔
  3. سرمایہ کار 10 USDT کے ڈپازٹ سے شراکت دار بن کر **0.8% سے 1.5% روزانہ رینٹل منافع** حاصل کرتے ہیں۔`,

      roman_urdu: `🏢 **Fundora Platform Details**:

Fundora ek UK registered fractional real estate platform hai (Company Reg 16870956).

• **How It Works**:
  1. Prime UK aur Dubai properties ko fractional shares ($113 per share) mein divide kiya jata hai.
  2. Aap minimum **10 USDT** deposit se co-owner ban kar **0.8% - 1.5% daily rental yield** earn karte hain.
  3. Minimum withdrawal sirf **10 USDT** hai.`,

      ar: `🏢 **عن منصة فندورا للاستثمار العقاري**:

فندورا هي منصة بريطانية مسجلة رسمياً (رقم 16870956) تتيح الاستثمار العقاري بنظام الملكية المجزأة بدءاً من 10 USDT بعوائد إيجارية يومية تصل إلى 1.5%.`
    }
  }
];

// -------------------------------------------------------------------------
// HIGH-PRECISION STRUCTURED FAQ SEARCH & RETRIEVAL ENGINE
// -------------------------------------------------------------------------

export function searchStructuredFAQ(
  userQuery: string,
  userLanguage: string = 'en'
): StructuredFAQResult {
  const query = (userQuery || '').toLowerCase().trim();
  if (!query) {
    return {
      matched: false,
      score: 0,
      reply: '',
      escalate: false
    };
  }

  // Language & script detection
  const hasUrduArabicScript = /[\u0600-\u06FF]/.test(userQuery);
  const isUrduScript = hasUrduArabicScript && (
    userQuery.includes('کیا') || userQuery.includes('کے') || userQuery.includes('بتا') || 
    userQuery.includes('ہم') || userQuery.includes('ہے') || userQuery.includes('میں') || 
    userQuery.includes('فنڈورا') || userQuery.includes('کیسے') || userQuery.includes('سرمایہ') ||
    userQuery.includes('سلام') || userQuery.includes('آپ') || userQuery.includes('منافع')
  );

  const isArabicScript = hasUrduArabicScript && !isUrduScript && (
    userQuery.includes('منصة') || userQuery.includes('عقاري') || userQuery.includes('كيف') || 
    userQuery.includes('عن') || userQuery.includes('في') || userQuery.includes('استثمار') ||
    userQuery.includes('مرحبا') || userQuery.includes('أرباح')
  );

  const isRomanUrdu = !hasUrduArabicScript && (
    query.includes('kaise') || query.includes('kese') || query.includes('kya') || 
    query.includes('hai') || query.includes('hoon') || query.includes('hun') || 
    query.includes('batao') || query.includes('batai') || query.includes('tarika') || 
    query.includes('tareeqa') || query.includes('karna') || query.includes('chahiye') || 
    query.includes('ko') || query.includes('mein') || query.includes('me') || 
    query.includes('par') || query.includes('bhai') || query.includes('sir') || 
    query.includes('shukriya') || query.includes('ap') || query.includes('aap') ||
    query.includes('munafa') || query.includes('paise') || query.includes('nikalna') ||
    query.includes('dalna') || query.includes('karo') || query.includes('rha') ||
    query.includes('rhi') || query.includes('karain') || query.includes('krain')
  );

  let detectedLangKey = 'en';
  if (isUrduScript || userLanguage === 'ur') detectedLangKey = 'ur';
  else if (isArabicScript || userLanguage === 'ar') detectedLangKey = 'ar';
  else if (isRomanUrdu) detectedLangKey = 'roman_urdu';

  // Human Escalation Check
  const isHumanEscalation = query.includes('human') || query.includes('agent') || 
    query.includes('admin') || query.includes('person') || 
    query.includes('support team') || query.includes('complaint') || 
    query.includes('complain') || userQuery.includes('انسانی') || userQuery.includes('سپورٹ');

  // Tokenize user query into clean word tokens
  const queryTokens = query.split(/\s+/).filter(t => t.length > 1);

  let bestMatch: StructuredFAQ | undefined = undefined;
  let maxScore = 0;

  for (const faq of STRUCTURED_FAQ_DATABASE) {
    let score = 0;

    for (const kw of faq.keywords) {
      const kwLower = kw.toLowerCase();
      if (query === kwLower) {
        score += 50; // Exact full match
      } else if (query.includes(kwLower)) {
        score += 25; // Substring phrase match
      } else {
        // Token match
        for (const token of queryTokens) {
          if (kwLower === token) {
            score += 10;
          } else if (kwLower.includes(token) && token.length > 3) {
            score += 5;
          }
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = faq;
    }
  }

  if (bestMatch && maxScore >= 3) {
    const rawAnswer = bestMatch.answers[detectedLangKey] || bestMatch.answers['en'];
    const retrievedContext = `RETRIEVED DOCUMENTATION FAQ [${bestMatch.id}] (${bestMatch.title}):\n${JSON.stringify(bestMatch.metadata, null, 2)}\nOfficial Fact Answer:\n${bestMatch.answers.en}`;

    return {
      matched: true,
      score: maxScore,
      faqItem: bestMatch,
      reply: rawAnswer,
      escalate: isHumanEscalation,
      retrievedContext
    };
  }

  // If maxScore is lower than 3, still return bestMatch if available for context
  const retrievedContextFallback = bestMatch
    ? `RETRIEVED DOCUMENTATION FAQ [${bestMatch.id}] (${bestMatch.title}):\n${JSON.stringify(bestMatch.metadata, null, 2)}\nOfficial Fact Answer:\n${bestMatch.answers.en}`
    : undefined;

  return {
    matched: false,
    score: maxScore,
    faqItem: bestMatch,
    reply: bestMatch ? (bestMatch.answers[detectedLangKey] || bestMatch.answers['en']) : '',
    escalate: isHumanEscalation,
    retrievedContext: retrievedContextFallback
  };
}

// -------------------------------------------------------------------------
// COMPREHENSIVE ANSWER GENERATOR & RETRIEVAL FALLBACK
// -------------------------------------------------------------------------

export function generateSmartFundoraAnswer(
  message: string,
  userLanguage: string = 'en',
  channelName?: string
): KnowledgeResponse {
  const query = (message || '').toLowerCase().trim();

  // First, query the Structured FAQ Engine
  const faqResult = searchStructuredFAQ(message, userLanguage);

  if (faqResult.reply) {
    return {
      reply: faqResult.reply,
      escalate: faqResult.escalate,
      faqId: faqResult.faqItem?.id,
      retrievedContext: faqResult.retrievedContext
    };
  }

  // Greetings handling
  const isUrduScript = /[\u0600-\u06FF]/.test(message) && (message.includes('کیا') || message.includes('سلام') || message.includes('کے') || message.includes('فنڈورا') || message.includes('منافع'));
  const isArabicScript = /[\u0600-\u06FF]/.test(message) && !isUrduScript;
  const isRomanUrdu = query.includes('kaise') || query.includes('kese') || query.includes('kya') || query.includes('batao') || query.includes('salam') || query.includes('paise') || query.includes('paisa') || query.includes('bhai') || query.includes('chahiye');

  if (
    query === 'hi' || query === 'hello' || query === 'hey' || query === 'hy' ||
    query.includes('salam') || query.includes('aoa') || query.includes('how are you') || query.includes('kya haal')
  ) {
    if (isUrduScript) {
      return {
        reply: `وعلیکم السلام! 🤖 میں فنڈورا اے آئی ایجنٹ ہوں۔\n\nآپ مجھ سے **10 USDT** ڈپازٹ کرنے، **0.8%-1.5%** روزانہ رینٹل ییلڈ، 10 USDT ودڈرال یا یو کے رجسٹریشن (No. 16870956) کے بارے میں کوئی بھی سوال پوچھ سکتے ہیں۔`,
        escalate: false
      };
    }
    if (isArabicScript) {
      return {
        reply: `أهلاً وسهلاً! 🤖 أنا مساعد فندورا الذكي للاستثمار العقاري.\n\nيمكنك الاستفسار عن عمليات الإيداع (10 USDT)، العوائد اليومية (0.8%-1.5%)، السحب (10 USDT)، أو التراخيص الرسمية.`,
        escalate: false
      };
    }
    if (isRomanUrdu) {
      return {
        reply: `Walaikum Assalam! 🤖 Main Fundora AI Agent hoon.\n\nAap mujhse USDT Deposit (10 USDT min), Daily Rental Yield (0.8%-1.5%), Withdrawal (10 USDT min), ya UK Registration Reg No. 16870956 ke hawale se direct sawal pooch sakte hain.`,
        escalate: false
      };
    }
    return {
      reply: `Hello! 🤖 I am the Fundora AI Investment Concierge.\n\nHow can I help with your real estate co-ownership today? Feel free to ask about depositing USDT (10 USDT min), claiming 0.8%-1.5% daily yields, current property ROI, or UK legal registration.`,
      escalate: false
    };
  }

  // Intent checks if searchStructuredFAQ didn't catch an explicit reply
  const isDepositIntent = query.includes('deposit') || query.includes('deposite') || query.includes('recharge') || query.includes('dalna') || query.includes('paisa') || query.includes('paise') || query.includes('trc20') || query.includes('bep20') || message.includes('ڈپازٹ') || message.includes('جمع');
  const isWithdrawIntent = query.includes('withdraw') || query.includes('withdrawal') || query.includes('nikalna') || query.includes('nikalein') || query.includes('payout') || query.includes('cashout') || message.includes('ودڈرال') || message.includes('سحب');
  const isRoiProfitIntent = query.includes('roi') || query.includes('profit') || query.includes('yield') || query.includes('kamai') || query.includes('munafa') || query.includes('return') || query.includes('earning') || query.includes('daily') || message.includes('منافع') || message.includes('ییلڈ');
  const isLegalIntent = query.includes('legal') || query.includes('real') || query.includes('fake') || query.includes('scam') || query.includes('legit') || query.includes('company') || query.includes('register') || query.includes('registration') || query.includes('halal') || message.includes('قانونی') || message.includes('حلال');
  const isReferralIntent = query.includes('referral') || query.includes('refer') || query.includes('code') || query.includes('link') || query.includes('commission') || query.includes('bonus') || query.includes('level') || message.includes('ریفرل');
  const isAppIntent = query.includes('app') || query.includes('apk') || query.includes('download') || query.includes('android') || query.includes('mobile') || message.includes('ایپ');

  let targetFaqId = 'faq_fractional_coownership_how_it_works';
  if (isDepositIntent) targetFaqId = 'faq_deposit_procedure';
  else if (isWithdrawIntent) targetFaqId = 'faq_withdrawal_rules';
  else if (isRoiProfitIntent) targetFaqId = 'faq_property_roi_yields';
  else if (isLegalIntent) targetFaqId = 'faq_uk_registration_legal';
  else if (isReferralIntent) targetFaqId = 'faq_referral_program';
  else if (isAppIntent) targetFaqId = 'faq_android_mobile_app';

  const matchedFaq = STRUCTURED_FAQ_DATABASE.find(f => f.id === targetFaqId);
  if (matchedFaq) {
    let langKey = 'en';
    if (isUrduScript || userLanguage === 'ur') langKey = 'ur';
    else if (isArabicScript || userLanguage === 'ar') langKey = 'ar';
    else if (isRomanUrdu) langKey = 'roman_urdu';

    return {
      reply: matchedFaq.answers[langKey] || matchedFaq.answers['en'],
      escalate: faqResult.escalate,
      faqId: matchedFaq.id
    };
  }

  // Final fallback formatted response
  if (isUrduScript) {
    return {
      reply: `🤖 **فنڈورا اے آئی رہنمائی**:

• **ڈپازٹ**: کم از کم 10 USDT (TRC20 / BEP20)
• **روزانہ رینٹل ییلڈ**: 0.8% سے 1.5% روزانہ رینٹل منافع
• **ایکٹو پراپرٹی**: اعمار ڈاؤن ٹاؤن سویٹس (دبئی) - **40.5% سالانہ ROI**
• **ودڈرال**: کم از کم 10 USDT
• **رجسٹریشن**: UK Companies House No. 16870956

آپ کا سوال موصول ہو چکا ہے۔ کیا آپ ڈپازٹ کرنے کا طریقہ، ودڈرال، یا روزانہ کا منافع کلیم کرنے کے بارے میں مزید تفصیل چاہتے ہیں؟`,
      escalate: faqResult.escalate
    };
  }

  if (isRomanUrdu) {
    return {
      reply: `🤖 **Fundora AI Guidance**:

• **Deposit**: Minimum 10 USDT (TRC20 / BEP20)
• **Daily Rental Yield**: 0.8% se 1.5% daily profit
• **Active Property**: Emaar Downtown Suites (Dubai) - **40.5% Annual ROI** ($113/share)
• **Withdrawal**: Minimum 10 USDT (1-24 hours)
• **Legal**: UK Companies House Reg No. 16870956

Aap ka sawal mil gaya hai. Deposit, daily profit claim, ya withdrawal ke bare mein mazeed poochiye!`,
      escalate: faqResult.escalate
    };
  }

  return {
    reply: `🤖 **Fundora AI Assistant**:

Here are the key verified facts regarding your request:
• **Minimum Deposit**: 10 USDT (TRC20 / BEP20 accepted, 0% fees)
• **Current Featured Property**: Emaar Downtown Boulevard Suites (Dubai) — **40.5% Annual ROI** ($113/share)
• **Daily Yield Dividend**: 0.8% to 1.5% daily rental returns
• **Minimum Withdrawal**: 10 USDT (Instant queue approval)
• **UK Legal Registration**: UK Companies House Registration No. 16870956

Your request is noted! Ask anything about depositing, claiming daily yields, or processing withdrawals!`,
    escalate: faqResult.escalate
  };
}

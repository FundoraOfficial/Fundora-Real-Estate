var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_app = require("firebase-admin/app");
var import_messaging = require("firebase-admin/messaging");
var import_genai = require("@google/genai");
var import_stream = require("stream");

// src/lib/aiKnowledgeEngine.ts
var STRUCTURED_FAQ_DATABASE = [
  {
    id: "faq_deposit_procedure",
    category: "deposit",
    title: "USDT Deposit Procedure (TRC20 & BEP20)",
    keywords: [
      "deposit",
      "how to deposit",
      "recharge",
      "usdt",
      "trc20",
      "bep20",
      "add funds",
      "payment",
      "recharge balance",
      "10 usdt",
      "min deposit",
      "minimum deposit",
      "wallet address",
      "txid",
      "txhash",
      "\u0688\u067E\u0627\u0632\u0679",
      "\u067E\u06CC\u0633\u06D2 \u062C\u0645\u0639",
      "\u0628\u06CC\u0644\u0646\u0633",
      "\u0625\u064A\u062F\u0627\u0639",
      "\u0645\u062D\u0641\u0638\u0629",
      "paisa dalna",
      "recharge karna",
      "deposit kaise karein"
    ],
    metadata: {
      minDeposit: "10 USDT",
      supportedNetworks: ["USDT-TRC20 (Tron Network)", "USDT-BEP20 (BNB Smart Chain)"],
      processingTime: "5 - 30 Minutes Automated Verification",
      fees: "0% Platform Fee"
    },
    answers: {
      en: `\u{1F4B3} **Official USDT Deposit Procedure on Fundora**:

1. **Access Deposit Modal**: Go to your **Overview Dashboard** and click the zesty **'+ Deposit'** button.
2. **Select Network**: Choose between **TRC20** (Tron Network) or **BEP20** (BNB Smart Chain).
3. **Copy Official Wallet Address**: Copy the displayed official Fundora deposit wallet address or scan the QR code.
4. **Transfer Funds**: Send a minimum of **10 USDT** from your crypto exchange/wallet (Binance, OKX, Bybit, Trust Wallet, Metamask).
5. **Submit Transaction Proof**: Paste your Blockchain **Transaction Hash (TxID)**, attach your payment screenshot, and click **'Submit Deposit'**.
6. **Account Credit**: Approvals take **5 to 30 minutes** via automated security checks.

\u2022 **Minimum Deposit**: 10 USDT
\u2022 **Deposit Fees**: 0% (Platform fee free)`,
      ur: `\u{1F4B3} **\u0641\u0646\u0688\u0648\u0631\u0627 \u067E\u0631 USDT \u062C\u0645\u0639 (Deposit) \u06A9\u0631\u0646\u06D2 \u06A9\u0627 \u0631\u0633\u0645\u06CC\u0627\u064B \u0637\u0631\u06CC\u0642\u06C1**:

1. \u0627\u067E\u0646\u06D2 **Overview** \u0688\u06CC\u0634 \u0628\u0648\u0631\u0688 \u0645\u06CC\u06BA \u062C\u0627\u0626\u06CC\u06BA \u0627\u0648\u0631 \u0632\u0631\u062F **'+ Deposit'** \u0648\u0627\u0644\u06D2 \u0628\u0679\u0646 \u067E\u0631 \u06A9\u0644\u06A9 \u06A9\u0631\u06CC\u06BA\u06D4
2. \u0627\u067E\u0646\u0627 \u0646\u06CC\u0679 \u0648\u0631\u06A9 \u0645\u0646\u062A\u062E\u0628 \u06A9\u0631\u06CC\u06BA: **TRC20** (\u0679\u0631\u0648\u0646 \u0646\u06CC\u0679 \u0648\u0631\u06A9) \u06CC\u0627 **BEP20** (\u0628\u06CC \u0627\u06CC\u0646 \u0628\u06CC \u0633\u0645\u0627\u0631\u0679 \u0686\u06CC\u0646)\u06D4
3. \u0641\u0646\u0688\u0648\u0631\u0627 \u06A9\u0627 \u0622\u0641\u06CC\u0634\u0644 \u0688\u067E\u0627\u0632\u0679 \u0648\u0627\u0644\u0679 \u0627\u06CC\u0688\u0631\u06CC\u0633 \u06A9\u0627\u067E\u06CC \u06A9\u0631\u06CC\u06BA\u06D4
4. \u0627\u067E\u0646\u06D2 \u0627\u06CC\u06A9\u0633\u0686\u06CC\u0646\u062C (Binance, OKX) \u06CC\u0627 \u0648\u0627\u0644\u0679 \u0633\u06D2 \u06A9\u0645 \u0627\u0632 \u06A9\u0645 **10 USDT** \u0679\u0631\u0627\u0646\u0633\u0641\u0631 \u06A9\u0631\u06CC\u06BA\u06D4
5. \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u06C1\u06CC\u0634 (TxID) \u0627\u0648\u0631 \u067E\u06CC\u0645\u0646\u0679 \u06A9\u06CC \u0631\u0633\u06CC\u067E\u0679 \u06A9\u0627 \u0627\u0633\u06A9\u0631\u06CC\u0646 \u0634\u0627\u0679 \u0627\u067E \u0644\u0648\u0688 \u06A9\u0631\u06A9\u06D2 **Submit Deposit** \u067E\u0631 \u06A9\u0644\u06A9 \u06A9\u0631\u06CC\u06BA\u06D4
6. \u0622\u067E \u06A9\u0627 \u0688\u067E\u0627\u0632\u0679 **5 \u0633\u06D2 30 \u0645\u0646\u0679** \u06A9\u06D2 \u0627\u0646\u062F\u0631 \u062E\u0648\u062F\u06A9\u0627\u0631 \u062A\u0635\u062F\u06CC\u0642 \u06A9\u06D2 \u0628\u0639\u062F \u06A9\u0631\u06CC\u0688\u0679 \u06C1\u0648 \u062C\u0627\u0626\u06D2 \u06AF\u0627\u06D4

\u2022 **\u06A9\u0645 \u0627\u0632 \u06A9\u0645 \u0688\u067E\u0627\u0632\u0679**: 10 USDT
\u2022 **\u0688\u067E\u0627\u0632\u0679 \u0641\u06CC\u0633**: 0%`,
      roman_urdu: `\u{1F4B3} **Fundora Par USDT Deposit Karne Ka Official Tareeqa**:

1. Apne **Overview** dashboard mein **'+ Deposit'** button par click karein.
2. Network choose karein: **TRC20** (Tron) ya **BEP20** (BNB Chain).
3. Fundora ka official wallet address copy karein.
4. Apne Binance / OKX / Trust Wallet se minimum **10 USDT** send karein.
5. Transaction ID (TxHash) paste karein, payment screenshot attach karein aur **Submit Deposit** dabayein.
6. Deposit **5 se 30 minute** mein account balance mein add ho jaye ga.

\u2022 **Minimum Deposit**: 10 USDT
\u2022 **Deposit Fees**: 0% Free`,
      ar: `\u{1F4B3} **\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0625\u064A\u062F\u0627\u0639 USDT \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 \u0641\u0646\u062F\u0648\u0631\u0627**:

1. \u0627\u0646\u062A\u0642\u0644 \u0625\u0644\u0649 **\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645 Overview** \u0648\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0632\u0631 **'+ Deposit'**.
2. \u0627\u062E\u062A\u0631 \u0627\u0644\u0634\u0628\u0643\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629: **TRC20** \u0623\u0648 **BEP20**.
3. \u0642\u0645 \u0628\u0646\u0633\u062E \u0639\u0646\u0648\u0627\u0646 \u0645\u062D\u0641\u0638\u0629 \u0641\u0646\u062F\u0648\u0631\u0627 \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0623\u0648 \u0645\u0633\u062D \u0631\u0645\u0632 QR.
4. \u062D\u0648\u0644 \u0645\u0628\u0644\u063A **10 USDT** \u0643\u062D\u062F \u0623\u062F\u0646\u0649 \u0645\u0646 \u0645\u0646\u0635\u062A\u0643 (Binance / OKX / Trust Wallet).
5. \u0623\u062F\u062E\u0644 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 (TxID) \u0648\u0627\u0631\u0641\u0642 \u0635\u0648\u0631\u0629 \u0627\u0644\u0625\u062B\u0628\u0627\u062A \u062B\u0645 \u0627\u0636\u063A\u0637 **Submit Deposit**.
6. \u064A\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0631\u0635\u064A\u062F \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u062E\u0644\u0627\u0644 **5 \u0625\u0644\u0649 30 \u062F\u0642\u064A\u0642\u0629**.

\u2022 **\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649 \u0644\u0644\u0625\u064A\u062F\u0627\u0639**: 10 USDT
\u2022 **\u0631\u0633\u0648\u0645 \u0627\u0644\u0625\u064A\u062F\u0627\u0639**: 0%`
    }
  },
  {
    id: "faq_property_roi_yields",
    category: "roi",
    title: "Current Property Portfolio, Expected ROI & Daily Rental Yields",
    keywords: [
      "roi",
      "yield",
      "property roi",
      "rental yield",
      "return on investment",
      "profit rate",
      "daily profit",
      "annual roi",
      "properties",
      "emaar",
      "kensington",
      "yield schedule",
      "40.5%",
      "14.8%",
      "0.8%",
      "1.5%",
      "daily earnings",
      "munafa",
      "profit claim",
      "daily claim",
      "dubai",
      "london",
      "canary wharf",
      "shares",
      "\u0645\u0646\u0627\u0641\u0639",
      "\u06CC\u06CC\u0644\u0688",
      "\u0639\u0627\u0626\u062F",
      "\u0623\u0631\u0628\u0627\u062D",
      "\u0639\u0642\u0627\u0631\u0627\u062A",
      "\u062E\u0648\u0627\u0635",
      "kitna profit",
      "daily yield"
    ],
    metadata: {
      dailyYieldRate: "0.8% to 1.5% Daily Rental Return",
      claimWindows: ["04:00 PM Slot", "09:00 PM Slot"],
      activePortfolio: [
        {
          name: "Emaar Downtown Boulevard Suites",
          location: "Downtown Dubai, UAE",
          expectedAnnualRoi: "40.5% APR",
          estimatedDailyYield: "~1.2% Daily",
          sharePrice: "$113 per share",
          durationMonths: 2,
          status: "Active (920 shares available)"
        },
        {
          name: "Kensington Palace Gardens Suites",
          location: "Kensington, London, UK",
          expectedAnnualRoi: "50.8% APR",
          estimatedDailyYield: "~1.4% Daily",
          sharePrice: "$150 per share",
          durationMonths: 2,
          status: "Sold Out (1000 shares funded)"
        }
      ]
    },
    answers: {
      en: `\u{1F4CA} **Fundora Property ROI & Daily Rental Yield Structure**:

\u2022 **Current Featured Active Property**:
  \u{1F3E2} **Emaar Downtown Boulevard Suites** (Downtown Dubai, UAE)
  - **Projected Annual ROI**: **40.5% APR** (~1.2% daily yield)
  - **Share Price**: **$113 per share**
  - **Investment Term**: 2 Months
  - **Status**: Active (Co-ownership available)

\u2022 **Completed / Sold-Out Property**:
  \u{1F3F0} **Kensington Palace Gardens Suites** (London, UK)
  - **Projected Annual ROI**: **50.8% APR** (~1.4% daily yield)
  - **Share Price**: $150 per share
  - **Investment Term**: 2 Months
  - **Status**: 100% Fully Funded / Sold Out

\u2022 **Daily Yield Dispatches**:
  - Properties yield **0.8% to 1.5% daily** rental dividends.
  - Yields are dispatched into claim queues twice daily at **04:00 PM** and **09:00 PM**.
  - Go to your **Overview Dashboard** and click **'Claim Profit'** to collect accumulated returns directly into your withdrawable balance.`,
      ur: `\u{1F4CA} **\u0641\u0646\u0688\u0648\u0631\u0627 \u067E\u0631\u0627\u067E\u0631\u0679\u06CC ROI \u0627\u0648\u0631 \u0631\u0648\u0632\u0627\u0646\u06C1 \u0631\u06CC\u0646\u0679\u0644 \u06CC\u06CC\u0644\u0688 \u06A9\u0627 \u0646\u0638\u0627\u0645**:

\u2022 **\u0645\u0648\u062C\u0648\u062F\u06C1 \u0641\u0639\u0627\u0644 \u067E\u0631\u0627\u067E\u0631\u0679\u06CC**:
  \u{1F3E2} **\u0627\u0639\u0645\u0627\u0631 \u0688\u0627\u0624\u0646 \u0679\u0627\u0624\u0646 \u0628\u0644\u06CC\u0648\u0627\u0631\u0688 \u0633\u0648\u06CC\u0679\u0633** (\u062F\u0628\u0626\u06CC\u060C \u06CC\u0648 \u0627\u06D2 \u0627\u06CC)
  - **\u0645\u062A\u0648\u0642\u0639 \u0633\u0627\u0644\u0627\u0646\u06C1 ROI**: **40.5% APR** (~1.2% \u0631\u0648\u0632\u0627\u0646\u06C1 \u06CC\u06CC\u0644\u0688)
  - **\u0634\u06CC\u0626\u0631 \u06A9\u06CC \u0642\u06CC\u0645\u062A**: **$113 \u0641\u06CC \u0634\u06CC\u0626\u0631**
  - **\u0645\u062F\u062A**: 2 \u0645\u0627\u06C1
  - **\u0633\u0679\u06CC\u0679\u0633**: \u0627\u06CC\u06A9\u0679\u0648 (\u0634\u0631\u0627\u06A9\u062A \u062F\u0627\u0631\u06CC \u062C\u0627\u0631\u06CC \u06C1\u06D2)

\u2022 **\u0645\u06A9\u0645\u0644 \u0641\u0646\u0688\u0688 \u067E\u0631\u0627\u067E\u0631\u0679\u06CC**:
  \u{1F3F0} **\u06A9\u06CC\u0646\u0633\u0646\u06AF\u0679\u0646 \u067E\u06CC\u0644\u0633 \u06AF\u0627\u0631\u0688\u0646\u0632 \u0633\u0648\u06CC\u0679\u0633** (\u0644\u0646\u062F\u0646\u060C \u06CC\u0648 \u06A9\u06D2)
  - **\u0633\u0627\u0644\u0627\u0646\u06C1 ROI**: **50.8% APR**
  - **\u0645\u062F\u062A**: 2 \u0645\u0627\u06C1
  - **\u0633\u0679\u06CC\u0679\u0633**: 100% \u0633\u0648\u0644\u0688 \u0622\u0624\u0679

\u2022 **\u0631\u0648\u0632\u0627\u0646\u06C1 \u0645\u0646\u0627\u0641\u0639 \u06A9\u0644\u06CC\u0645 \u06A9\u0631\u0646\u06D2 \u06A9\u0627 \u0637\u0631\u06CC\u0642\u06C1**:
  - \u067E\u0631\u0627\u067E\u0631\u0679\u06CC\u0632 \u0633\u06D2 **0.8% \u0633\u06D2 1.5% \u0631\u0648\u0632\u0627\u0646\u06C1** \u0631\u06CC\u0646\u0679\u0644 \u0645\u0646\u0627\u0641\u0639 \u0645\u0644\u062A\u0627 \u06C1\u06D2\u06D4
  - \u06C1\u0631 \u0631\u0648\u0632 \u062F\u0648 \u0679\u0627\u0626\u0645 \u0633\u0644\u0627\u0679\u0633 (**04:00 PM** \u0627\u0648\u0631 **09:00 PM**) \u0645\u06CC\u06BA \u0645\u0646\u0627\u0641\u0639 \u0688\u0633\u067E\u06CC\u0686 \u06C1\u0648\u062A\u0627 \u06C1\u06D2\u06D4
  - \u0688\u06CC\u0634 \u0628\u0648\u0631\u0688 \u067E\u0631 **'Claim Profit'** \u0628\u0679\u0646 \u062F\u0628\u0627 \u06A9\u0631 \u0627\u067E\u0646\u0627 \u0645\u0646\u0627\u0641\u0639 \u0641\u0648\u0631\u0627\u064B \u0627\u067E\u0646\u06D2 \u0628\u06CC\u0644\u0646\u0633 \u0645\u06CC\u06BA \u0645\u0646\u062A\u0642\u0644 \u06A9\u0631\u06CC\u06BA\u06D4`,
      roman_urdu: `\u{1F4CA} **Fundora Property ROI & Daily Rental Yield Facts**:

\u2022 **Active High-ROI Property**:
  \u{1F3E2} **Emaar Downtown Boulevard Suites** (Downtown Dubai)
  - **Expected Annual ROI**: **40.5% APR** (~1.2% daily yield)
  - **Share Price**: **$113 per share**
  - **Term**: 2 Months
  - **Status**: Active (Available to buy shares)

\u2022 **Sold-Out Property**:
  \u{1F3F0} **Kensington Palace Gardens** (London, UK)
  - **Annual ROI**: **50.8% APR** (100% Sold Out)
  - **Term**: 2 Months

\u2022 **Daily Profit Payouts**:
  - Daily yields range between **0.8% se 1.5% daily**.
  - Profits arrive in 2 daily slots (**04:00 PM** aur **09:00 PM**).
  - Simply click **'Claim Profit'** on your Overview screen to transfer earnings into main wallet.`,
      ar: `\u{1F4CA} **\u0639\u0627\u0626\u062F \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064A \u0648\u0627\u0644\u0639\u0648\u0627\u0626\u062F \u0627\u0644\u0625\u064A\u062C\u0627\u0631\u064A\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0639\u0644\u0649 \u0641\u0646\u062F\u0648\u0631\u0627**:

\u2022 **\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A \u0627\u0644\u0646\u0634\u0637**:
  \u{1F3E2} **Emaar Downtown Boulevard Suites** (\u0648\u0633\u0637 \u0645\u062F\u064A\u0646\u0629 \u062F\u0628\u064A)
  - **\u0627\u0644\u0639\u0627\u0626\u062F \u0627\u0644\u0633\u0646\u0648\u064A \u0627\u0644\u0645\u062A\u0648\u0642\u0639**: **40.5% APR** (\u062D\u0648\u0627\u0644\u064A 1.2% \u064A\u0648\u0645\u064A\u0627\u064B)
  - **\u0633\u0639\u0631 \u0627\u0644\u0633\u0647\u0645**: **113 \u062F\u0648\u0644\u0627\u0631 \u0644\u0644\u0634\u0647\u0645**
  - **\u0627\u0644\u062D\u0627\u0644\u0629**: \u0646\u0634\u0637 \u0648\u0645\u062A\u0627\u062D \u0644\u0644\u0634\u0631\u0627\u0621

\u2022 **\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u0643\u062A\u0645\u0644**:
  \u{1F3F0} **Kensington Palace Gardens** (\u0644\u0646\u062F\u0646\u060C \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0645\u062A\u062D\u062F\u0629)
  - **\u0627\u0644\u0639\u0627\u0626\u062F \u0627\u0644\u0633\u0646\u0648\u064A**: **50.8% APR** (\u0645\u0643\u062A\u0645\u0644 \u0628\u0627\u0644\u0643\u0627\u0645\u0644)
  - **\u0627\u0644\u0645\u062F\u0629**: \u0634\u0647\u0631\u0627\u0646

\u2022 **\u0637\u0631\u064A\u0642\u0629 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0639\u0627\u0626\u062F \u0627\u0644\u064A\u0648\u0645\u064A**:
  - \u064A\u062A\u0631\u0627\u0648\u062D \u0627\u0644\u0639\u0627\u0626\u062F \u0627\u0644\u0625\u064A\u062C\u0627\u0631\u064A \u0627\u0644\u064A\u0648\u0645\u064A \u0628\u064A\u0646 **0.8% \u0625\u0644\u0649 1.5%**.
  - \u062A\u0648\u0632\u0639 \u0627\u0644\u0623\u0631\u0628\u0627\u062D \u0645\u0631\u062A\u064A\u0646 \u064A\u0648\u0645\u064A\u0627\u064B (04:00 \u0645\u0633\u0627\u0621\u064B \u0648 09:00 \u0645\u0633\u0627\u0621\u064B).
  - \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0632\u0631 **'Claim Profit'** \u0641\u064A \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645 \u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0623\u0631\u0628\u0627\u062D\u0643 \u0641\u0648\u0631\u0627\u064B.`
    }
  },
  {
    id: "faq_withdrawal_rules",
    category: "withdraw",
    title: "Minimum Withdrawal Limit, Wallet Setup & Processing Time",
    keywords: [
      "withdraw",
      "withdrawal",
      "minimum withdraw",
      "cashout",
      "payout",
      "min withdrawal",
      "10 usdt",
      "withdrawal fee",
      "withdrawal time",
      "nikalna",
      "nikalein",
      "paise nikalna",
      "\u0648\u062F\u0688\u0631\u0627\u0644",
      "\u0633\u062D\u0628",
      "withdrawal limit",
      "withdrawal status",
      "how to withdraw"
    ],
    metadata: {
      minWithdrawal: "10 USDT",
      supportedNetworks: ["USDT-TRC20", "USDT-BEP20"],
      processingTime: "1 to 24 Hours Automated Queue"
    },
    answers: {
      en: `\u{1F4B8} **Fundora Withdrawal Rules & Procedure**:

\u2022 **Minimum Withdrawal Threshold**: Exactly **10 USDT** (Lowest threshold in real estate co-ownership).
\u2022 **Supported Networks**: **TRC20** (Tron) & **BEP20** (BNB Chain).
\u2022 **How to Submit Withdrawal**:
  1. Go to **Overview** or **Profile** tab and click **'Withdraw'**.
  2. Select your desired network (**TRC20** or **BEP20**).
  3. Enter your personal wallet receiving address & withdrawal amount.
  4. Click **'Submit Withdrawal'**.
\u2022 **Security Processing Time**: Withdrawals are processed through compliance queue within **1 to 24 hours** (usually 1-4 hours).`,
      ur: `\u{1F4B8} **\u0641\u0646\u0688\u0648\u0631\u0627 \u0633\u06D2 \u0631\u0642\u0645 \u0646\u06A9\u0627\u0644\u0646\u06D2 (Withdrawal) \u06A9\u06D2 \u0642\u0648\u0627\u0639\u062F \u0648 \u0637\u0631\u06CC\u0642\u06C1 \u06A9\u0627\u0631**:

\u2022 **\u06A9\u0645 \u0627\u0632 \u06A9\u0645 \u0648\u062F\u0688\u0631\u0627\u0644 \u062D\u062F**: \u0635\u0631\u0641 **10 USDT**\u06D4
\u2022 **\u0646\u06CC\u0679 \u0648\u0631\u06A9\u0633**: **TRC20** \u0627\u0648\u0631 **BEP20**\u06D4
\u2022 **\u0648\u062F\u0688\u0631\u0627\u0644 \u06A9\u0631\u0646\u06D2 \u06A9\u06D2 \u0645\u0631\u0627\u062D\u0644**:
  1. \u0627\u067E\u0646\u06D2 **Overview** \u06CC\u0627 **Profile** \u067E\u06CC\u062C \u067E\u0631 **Withdraw** \u067E\u0631 \u06A9\u0644\u06A9 \u06A9\u0631\u06CC\u06BA\u06D4
  2. \u0627\u067E\u0646\u0627 \u06A9\u0631\u067E\u0679\u0648 \u0646\u06CC\u0679 \u0648\u0631\u06A9 \u0645\u0646\u062A\u062E\u0628 \u06A9\u0631\u06CC\u06BA\u06D4
  3. \u0627\u067E\u0646\u0627 \u067E\u0631\u0633\u0646\u0644 USDT \u0648\u0627\u0644\u0679 \u0627\u06CC\u0688\u0631\u06CC\u0633 \u062F\u0631\u062C \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u0631\u0642\u0645 \u0644\u06A9\u06BE\u06CC\u06D2\u06D4
  4. **Submit Withdrawal** \u067E\u0631 \u06A9\u0644\u06A9 \u06A9\u0631\u06CC\u06BA\u06D4
\u2022 **\u067E\u0631\u0648\u0633\u06CC\u0633\u0646\u06AF \u0648\u0642\u062A**: \u0633\u06CC\u06A9\u06CC\u0648\u0631\u0679\u06CC \u0627\u0648\u0631 \u0627\u06CC\u0646\u0679\u06CC \u0641\u0631\u0627\u0688 \u0686\u06CC\u06A9\u0633 \u06A9\u06D2 \u0628\u0627\u0639\u062B \u0648\u062F\u0688\u0631\u0627\u0644 **1 \u0633\u06D2 24 \u06AF\u06BE\u0646\u0679\u06D2** \u06A9\u06D2 \u0627\u0646\u062F\u0631 \u0645\u0646\u062A\u0642\u0644 \u06C1\u0648 \u062C\u0627\u062A\u0627 \u06C1\u06D2\u06D4`,
      roman_urdu: `\u{1F4B8} **Fundora Se Withdrawal Karne Ka Official Rule**:

\u2022 **Minimum Withdrawal**: Exactly **10 USDT**.
\u2022 **Networks**: **TRC20** & **BEP20**.
\u2022 **Steps**:
  1. **Overview** ya **Profile** screen par **Withdraw** button dabaein.
  2. Network choose karein (TRC20 / BEP20).
  3. Apna personal wallet address aur amount enter karein.
  4. **Submit Withdrawal** par click kar dein.
\u2022 **Time**: Automated security queue se **1 se 24 ghante** mein transfer hota hai.`,
      ar: `\u{1F4B8} **\u0642\u0648\u0627\u0639\u062F \u0648\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0633\u062D\u0628 \u0627\u0644\u0623\u0645\u0648\u0627\u0644 \u0645\u0646 \u0645\u0646\u0635\u0629 \u0641\u0646\u062F\u0648\u0631\u0627**:

\u2022 **\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649 \u0644\u0644\u0633\u062D\u0628**: **10 USDT** \u0641\u0642\u0637.
\u2022 **\u0627\u0644\u0634\u0628\u0643\u0627\u062A \u0627\u0644\u0645\u062F\u0639\u0648\u0645\u0629**: **TRC20** \u0648 **BEP20**.
\u2022 **\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u0633\u062D\u0628**:
  1. \u0627\u062F\u062E\u0644 \u0625\u0644\u0649 **Overview** \u0623\u0648 **Profile** \u0648\u0627\u0636\u063A\u0637 **Withdraw**.
  2. \u062D\u062F\u062F \u0646\u0648\u0639 \u0627\u0644\u0634\u0628\u0643\u0629.
  3. \u0623\u062F\u062E\u0644 \u0639\u0646\u0648\u0627\u0646 \u0645\u062D\u0641\u0638\u062A\u0643 \u0627\u0644\u062E\u0627\u0635\u0629 \u0648\u0627\u0644\u0645\u0628\u0644\u063A.
  4. \u0627\u0636\u063A\u0637 **Submit Withdrawal**.
\u2022 **\u0648\u0642\u062A \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629**: \u062A\u062A\u0645 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u062E\u0644\u0627\u0644 **1 \u0625\u0644\u0649 24 \u0633\u0627\u0639\u0629**.`
    }
  },
  {
    id: "faq_wallet_unbind_reset",
    category: "account",
    title: "Wallet Address Binding & Direct Instant Unbinding / Reset",
    keywords: [
      "unbind",
      "unbind wallet",
      "wallet unbind",
      "reset wallet",
      "change wallet",
      "change address",
      "wallet address",
      "bep20 unbind",
      "trc20 unbind",
      "wallet change",
      "address badalna",
      "wallet reset",
      "unbind kaise karein",
      "wallet unbind kaise hoga",
      "address change",
      "\u0648\u0627\u0644\u0679 \u0627\u0646 \u0628\u0627\u0626\u0646\u0688",
      "\u0648\u0627\u0644\u0679 \u062A\u0628\u062F\u06CC\u0644",
      "\u0625\u0644\u063A\u0627\u0621 \u0631\u0628\u0637 \u0627\u0644\u0645\u062D\u0641\u0638\u0629",
      "\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0645\u062D\u0641\u0638\u0629",
      "\u0641\u0643 \u0627\u0644\u0631\u0628\u0637",
      "wallet menu",
      "wallet tab"
    ],
    metadata: {
      location: "Wallet Menu Tab",
      networksSupported: ["USDT-BEP20", "USDT-TRC20"],
      unbindSpeed: "Instant Direct Reset (0 Seconds Wait, No Admin Approval Needed)",
      status: "Fully Operational Direct Instant Unbind"
    },
    answers: {
      en: `\u{1F513} **Fundora Wallet Binding & Direct Instant Unbind Feature**:

1. **Where to Find**: Open the **Wallet Menu** tab from your dashboard.
2. **Binding Address**: Enter your USDT receiving address (**BEP20** or **TRC20**) and click Save/Bind.
3. **Direct Instant Unbind**:
   - Once bound, two compact micro buttons will appear side-by-side: **'\u{1F513} BEP20 Unbind'** and **'\u{1F513} TRC20 Unbind'**.
   - Simply click the respective unbind button to **instantly reset** your wallet address with 1 click!
   - **No Admin Approval Needed**: You don't have to wait for admin approval anymore! Unbinding is 100% instant and direct.
4. **Re-binding**: After unbinding, you can immediately type and bind your new USDT wallet address for withdrawals.`,
      ur: `\u{1F513} **\u0641\u0646\u0688\u0648\u0631\u0627 \u0648\u0627\u0644\u0679 \u0628\u0627\u0626\u0646\u0688\u0646\u06AF \u0627\u0648\u0631 \u0688\u0627\u0626\u0631\u06CC\u06A9\u0679 \u0627\u0646\u0633\u0679\u0646\u0679 (\u0641\u0648\u0631\u06CC) \u0627\u0646 \u0628\u0627\u0626\u0646\u0688 \u06A9\u0627 \u0637\u0631\u06CC\u0642\u06C1**:

1. **\u0648\u0627\u0644\u0679 \u0645\u06CC\u0646\u0648**: \u0627\u067E\u0646\u06D2 \u0688\u06CC\u0634 \u0628\u0648\u0631\u0688 \u0633\u06D2 **Wallet Menu** \u06A9\u06BE\u0648\u0644\u06CC\u06BA\u06D4
2. **\u0627\u06CC\u0688\u0631\u06CC\u0633 \u062C\u0648\u0691\u0646\u0627 (Bind)**: \u0627\u067E\u0646\u0627 USDT \u0648\u0635\u0648\u0644 \u06A9\u0631\u0646\u06D2 \u0648\u0627\u0644\u0627 \u0627\u06CC\u0688\u0631\u06CC\u0633 (**BEP20** \u06CC\u0627 **TRC20**) \u062F\u0631\u062C \u06A9\u0631 \u06A9\u06D2 \u0633\u06CC\u0648 \u06A9\u0631\u06CC\u06BA\u06D4
3. **\u0641\u0648\u0631\u06CC \u0627\u0646 \u0628\u0627\u0626\u0646\u0688 (Instant Unbind)**:
   - \u0648\u0627\u0644\u0679 \u0628\u0627\u0626\u0646\u0688 \u06C1\u0648\u0646\u06D2 \u06A9\u06D2 \u0628\u0639\u062F \u0633\u0627\u0645\u0646\u06D2 \u062F\u0648 \u0628\u0679\u0646 \u0638\u0627\u06C1\u0631 \u06C1\u0648\u06BA \u06AF\u06D2: **'\u{1F513} BEP20 Unbind'** \u0627\u0648\u0631 **'\u{1F513} TRC20 Unbind'**\u06D4
   - \u0627\u0646 \u0628\u0679\u0646\u0632 \u067E\u0631 \u06A9\u0644\u06A9 \u06A9\u0631\u062A\u06D2 \u06C1\u06CC \u0622\u067E \u06A9\u0627 \u0627\u06CC\u0688\u0631\u06CC\u0633 **\u0627\u06CC\u06A9 \u06C1\u06CC \u0633\u06CC\u06A9\u0646\u0688 \u0645\u06CC\u06BA \u0641\u0648\u0631\u0627\u064B \u0627\u0646 \u0628\u0627\u0626\u0646\u0688** \u06C1\u0648 \u062C\u0627\u0626\u06D2 \u06AF\u0627\u06D4
   - **\u0627\u06CC\u0688\u0645\u0646 \u06A9\u06CC \u0645\u0646\u0638\u0648\u0631\u06CC \u06A9\u06CC \u0636\u0631\u0648\u0631\u062A \u0646\u06C1\u06CC\u06BA**: \u0627\u0628 \u0627\u067E\u0631\u0648\u0648\u0644 \u06A9\u0627 \u0627\u0646\u062A\u0638\u0627\u0631 \u0646\u06C1\u06CC\u06BA \u06A9\u0631\u0646\u0627 \u067E\u0691\u062A\u0627\u060C \u06CC\u06C1 \u0646\u0638\u0627\u0645 100% \u0641\u0648\u0631\u0627\u064B \u06A9\u0627\u0645 \u06A9\u0631\u062A\u0627 \u06C1\u06D2\u06D4
4. **\u0646\u06CC\u0627 \u0627\u06CC\u0688\u0631\u06CC\u0633 \u0644\u06AF\u0627\u0646\u0627**: \u0627\u0646 \u0628\u0627\u0626\u0646\u0688 \u06A9\u0631\u0646\u06D2 \u06A9\u06D2 \u0628\u0639\u062F \u0622\u067E \u0641\u0648\u0631\u0627\u064B \u0646\u06CC\u0627 USDT \u0627\u06CC\u0688\u0631\u06CC\u0633 \u0628\u0627\u0626\u0646\u0688 \u06A9\u0631 \u0633\u06A9\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4`,
      roman_urdu: `\u{1F513} **Fundora Wallet Binding & Direct Instant Unbind Feature**:

1. **Kahan Milega**: Dashboard par **Wallet Menu** tab open karein.
2. **Wallet Bind Kaise Karein**: Apna USDT receiving address (**BEP20** ya **TRC20**) enter karke bind karein.
3. **Direct Instant Unbind**:
   - Address bind hone k baad samne **'\u{1F513} BEP20 Unbind'** aur **'\u{1F513} TRC20 Unbind'** ke micro buttons nazar aate hain.
   - Click karte he aapka address **instantly reset / unbind** ho jata hai!
   - **No Waiting / No Admin Approval**: Admin approval ka koi wait nahi hai, single click par instant unbind ho jata hai.
4. **New Address**: Unbind karne ke baad aap instantly naya wallet address enter karke withdraw le sakte hain.`,
      ar: `\u{1F513} **\u0645\u064A\u0632\u0629 \u0631\u0628\u0637 \u0627\u0644\u0645\u062D\u0641\u0638\u0629 \u0648\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0631\u0628\u0637 \u0627\u0644\u0641\u0648\u0631\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631 (Unbind)**:

1. **\u0627\u0644\u0645\u0643\u0627\u0646**: \u0627\u0641\u062A\u062D \u062A\u0628\u0648\u064A\u0628 **Wallet Menu** \u0641\u064A \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645.
2. **\u0631\u0628\u0637 \u0627\u0644\u0639\u0646\u0648\u0627\u0646**: \u0623\u062F\u062E\u0644 \u0639\u0646\u0648\u0627\u0646 \u0627\u0633\u062A\u0642\u0628\u0627\u0644 USDT \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 (\u0634\u0628\u0643\u0629 **BEP20** \u0623\u0648 **TRC20**) \u0648\u0627\u0636\u063A\u0637 \u062D\u0641\u0638.
3. **\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0631\u0628\u0637 \u0627\u0644\u0641\u0648\u0631\u064A (Unbind)**:
   - \u0628\u0645\u062C\u0631\u062F \u0627\u0644\u0631\u0628\u0637\u060C \u0633\u062A\u0638\u0647\u0631 \u0644\u0643 \u0623\u0632\u0631\u0627\u0631 **'\u{1F513} BEP20 Unbind'** \u0648 **'\u{1F513} TRC20 Unbind'**.
   - \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0644\u0625\u0644\u063A\u0627\u0621 \u0631\u0628\u0637 \u0645\u062D\u0641\u0638\u062A\u0643 \u0648\u0625\u0639\u0627\u062F\u062A\u0647\u0627 \u0648\u0636\u0639\u0647\u0627 \u0627\u0644\u0623\u0648\u0644\u064A **\u0641\u0648\u0631\u0627\u064B \u062E\u0644\u0627\u0644 \u062B\u0648\u0627\u0646\u064D \u0645\u0639\u062F\u0648\u062F\u0629**!
   - **\u0628\u062F\u0648\u0646 \u0627\u0646\u062A\u0638\u0627\u0631 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0623\u062F\u0645\u0646**: \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0631\u0628\u0637 \u0623\u0635\u0628\u062D \u0645\u0628\u0627\u0634\u0631\u0627\u064B \u0648\u0645\u0633\u062A\u0642\u0644\u0627\u064B \u062A\u0645\u0627\u0645\u0627\u064B.
4. **\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0631\u0628\u0637**: \u0628\u0639\u062F \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0631\u0628\u0637 \u064A\u0645\u0643\u0646\u0643 \u0625\u062F\u062E\u0627\u0644 \u0639\u0646\u0648\u0627\u0646 \u0645\u062D\u0641\u0638\u0629 \u062C\u062F\u064A\u062F \u0641\u0648\u0631\u0627\u064B \u0644\u0644\u0633\u062D\u0628.`
    }
  },
  {
    id: "faq_uk_registration_legal",
    category: "legal",
    title: "UK Companies House Official Registration & Legal Standing",
    keywords: [
      "uk",
      "legal",
      "registered",
      "companies house",
      "license",
      "reg",
      "england",
      "safe",
      "real",
      "legit",
      "registration number",
      "16870956",
      "company reg",
      "is fundora legal",
      "\u0642\u0627\u0646\u0648\u0646\u06CC",
      "\u0631\u062C\u0633\u0679\u0631\u0688",
      "\u0628\u0631\u0637\u0627\u0646\u06CC\u06C1",
      "\u062A\u0631\u062E\u064A\u0635",
      "\u0628\u0631\u064A\u0637\u0627\u0646\u064A\u0627",
      "official registration"
    ],
    metadata: {
      companyName: "Fundora Real Estate Investment Platform Ltd",
      ukCompanyNumber: "16870956",
      officialDomain: "https://fundora.one",
      supportEmail: "fundora.one@gmail.com",
      assetBacking: "Registered physical property titles in UK & UAE"
    },
    answers: {
      en: `\u{1F3DB}\uFE0F **Official UK Registration & Legal Governance**:

\u2022 **UK Registration Details**: Fundora Real Estate Investment Platform is legally incorporated in the United Kingdom under **UK Companies House Registration No. 16870956**.
\u2022 **Real Estate Asset Security**: All fractional investments represent fractional beneficial title ownership backed by verified physical deeds in London & Dubai.
\u2022 **Official Website**: https://fundora.one
\u2022 **Official Support Email**: fundora.one@gmail.com`,
      ur: `\u{1F3DB}\uFE0F **\u0641\u0646\u0688\u0648\u0631\u0627 \u06A9\u06CC \u06CC\u0648 \u06A9\u06D2 \u0631\u0633\u0645\u06CC\u0627\u064B \u0631\u062C\u0633\u0679\u0631\u06CC\u0634\u0646 \u0627\u0648\u0631 \u0642\u0627\u0646\u0648\u0646\u06CC \u062D\u06CC\u062B\u06CC\u062A**:

\u2022 **\u06CC\u0648 \u06A9\u06D2 \u0631\u062C\u0633\u0679\u0631\u06CC\u0634\u0646 \u0646\u0645\u0628\u0631**: \u0641\u0646\u0688\u0648\u0631\u0627 \u0631\u06CC\u0626\u0644 \u0627\u0633\u0679\u06CC\u0679 \u0627\u0646\u0648\u06CC\u0633\u0679\u0645\u0646\u0679 \u067E\u0644\u06CC\u0679 \u0641\u0627\u0631\u0645 \u0628\u0631\u0637\u0627\u0646\u06CC\u06C1 \u0645\u06CC\u06BA \u0631\u0633\u0645\u06CC\u0627\u064B \u0645\u0633\u062C\u0644 \u0627\u062F\u0627\u0631\u06C1 \u06C1\u06D2 (**Companies House Reg No. 16870956**)\u06D4
\u2022 **\u062D\u0642\u06CC\u0642\u06CC \u067E\u0631\u0627\u067E\u0631\u0679\u06CC \u0633\u067E\u0648\u0631\u0679**: \u062A\u0645\u0627\u0645 \u0627\u0646\u0648\u06CC\u0633\u0679\u0645\u0646\u0679\u0633 \u0644\u0646\u062F\u0646 \u0627\u0648\u0631 \u062F\u0628\u0626\u06CC \u06A9\u06CC \u062A\u0635\u062F\u06CC\u0642 \u0634\u062F\u06C1 \u06A9\u0645\u0631\u0634\u0644 \u0648 \u0631\u06C1\u0627\u0626\u0634\u06CC \u062C\u0627\u0626\u06CC\u062F\u0627\u062F\u0648\u06BA \u06A9\u06D2 \u0688\u06CC\u062C\u06CC\u0679\u0644 \u0688\u06CC\u062F\u0632 \u0633\u06D2 \u0645\u062D\u0641\u0648\u0638 \u06C1\u06CC\u06BA\u06D4
\u2022 **\u0622\u0641\u06CC\u0634\u0644 \u0648\u06CC\u0628 \u0633\u0627\u0626\u0679**: https://fundora.one
\u2022 **\u0627\u06CC \u0645\u06CC\u0644 \u0633\u067E\u0648\u0631\u0679**: fundora.one@gmail.com`,
      roman_urdu: `\u{1F3DB}\uFE0F **Fundora Official UK Registration & Compliance**:

\u2022 **UK Companies House Reg No**: **16870956**.
\u2022 **Legal Backing**: Aap ka har share UK aur Dubai ki real physical properties ke beneficial title deeds dwara backed hota hai.
\u2022 **Official Website**: https://fundora.one
\u2022 **Support Email**: fundora.one@gmail.com`,
      ar: `\u{1F3DB}\uFE0F **\u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0634\u0631\u0643\u0629 \u0641\u0646\u062F\u0648\u0631\u0627 \u0641\u064A \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0645\u062A\u062D\u062F\u0629**:

\u2022 **\u0631\u0642\u0645 \u0627\u0644\u062A\u0633\u062C\u064A\u0644**: \u0645\u0633\u062C\u0644\u0629 \u0631\u0633\u0645\u064A\u0627\u064B \u0644\u062F\u0649 \u0633\u062C\u0644 \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0628\u0631\u064A\u0637\u0627\u0646\u064A \u062A\u062D\u062A \u0631\u0642\u0645 **Companies House No. 16870956**.
\u2022 **\u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u0639\u0642\u0627\u0631\u064A**: \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0635\u0635 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A\u0629 \u0645\u062F\u0639\u0648\u0645\u0629 \u0628\u0639\u0642\u0648\u062F \u0645\u0644\u0643\u064A\u0629 \u062D\u0642\u064A\u0642\u064A\u0629 \u0648\u0645\u0633\u062C\u0644\u0629 \u0641\u064A \u062F\u0628\u064A \u0648\u0644\u0646\u062F\u0646.
\u2022 **\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0631\u0633\u0645\u064A**: https://fundora.one`
    }
  },
  {
    id: "faq_referral_program",
    category: "referral",
    title: "Multi-Tier Referral Commission Rates & Team Rewards",
    keywords: [
      "referral",
      "ref",
      "bonus",
      "commission",
      "tier",
      "team",
      "invite",
      "referral link",
      "level 1",
      "level 2",
      "level 3",
      "level 4",
      "10% bonus",
      "dost",
      "\u0631\u06CC\u0641\u0631\u0644",
      "\u0628\u0648\u0646\u0633",
      "\u0625\u062D\u0627\u0644\u0629",
      "\u062F\u0639\u0648\u0629",
      "referral code",
      "referral reward"
    ],
    metadata: {
      bronzeLevel1: "10% Instant Cash Reward on Direct Deposit",
      silverLevel2: "5% Commission (Requires $500 team volume or 3 active members)",
      goldLevel3: "2% Commission + 5% Yield Boost Voucher ($2,000 volume)",
      platinumLevel4: "VIP Concierge + Exclusive Co-ownership ($10,500 volume)"
    },
    answers: {
      en: `\u{1F465} **Fundora Multi-Tier Referral Program**:

\u2022 **Level 1 (Bronze Shield)**: Earn an instant **10% Cash Bonus** credited directly to your main balance on your direct referral's 1st deposit.
\u2022 **Level 2 (Silver Partner)**: Earn **5% commission** on 2nd tier team volume ($500+ volume or 3 active referrals).
\u2022 **Level 3 (Gold Director)**: Earn **2% commission + 5% Yield Boost Vouchers** ($2,000+ volume).
\u2022 **Level 4 (Platinum Trustee)**: VIP direct support & co-ownership privileges ($10,500+ volume).

\u2022 **Find Your Link**: Go to **Profile -> Referral** tab to copy your unique referral link.`,
      ur: `\u{1F465} **\u0641\u0646\u0688\u0648\u0631\u0627 \u0645\u0644\u0679\u06CC \u0679\u0627\u0626\u0631 \u0631\u06CC\u0641\u0631\u0644 \u0628\u0648\u0646\u0633 \u0627\u0648\u0631 \u06A9\u0645\u06CC\u0634\u0646 \u06A9\u0645\u0627\u0626\u06CC**:

\u2022 **\u0644\u06CC\u0648\u0644 1 (\u0628\u0631\u0648\u0646\u0632)**: \u0627\u067E\u0646\u06D2 \u0688\u0627\u0626\u0631\u06CC\u06A9\u0679 \u0631\u06CC\u0641\u0631\u0644 \u06A9\u06D2 \u067E\u06C1\u0644\u06D2 \u0688\u067E\u0627\u0632\u0679 \u067E\u0631 **10% \u0641\u0648\u0631\u06CC \u0646\u0642\u062F \u0631\u0642\u0645 \u06A9\u0627 \u0628\u0648\u0646\u0633**\u06D4
\u2022 **\u0644\u06CC\u0648\u0644 2 (\u0633\u0644\u0648\u0631)**: 3 \u0641\u0639\u0627\u0644 \u0645\u0645\u0628\u0631\u0632 \u06CC\u0627 $500 \u0679\u06CC\u0645 \u0648\u0627\u0644\u06CC\u0648\u0645 \u067E\u0631 **5% \u06A9\u0645\u06CC\u0634\u0646**\u06D4
\u2022 **\u0644\u06CC\u0648\u0644 3 (\u06AF\u0648\u0644\u0688)**: $2,000 \u0648\u0627\u0644\u06CC\u0648\u0645 \u067E\u0631 **2% \u06A9\u0645\u06CC\u0634\u0646 + 5% \u06CC\u06CC\u0644\u0688 \u0628\u0648\u0633\u0679 \u0648\u0627\u0624\u0686\u0631**\u06D4
\u2022 **\u0644\u06CC\u0648\u0644 4 (\u067E\u0644\u06CC\u0679\u06CC\u0646\u0645)**: $10,500 \u0648\u0627\u0644\u06CC\u0648\u0645 \u067E\u0631 **\u0648\u06CC \u0622\u0626\u06CC \u067E\u06CC \u0688\u0627\u0626\u0631\u06CC\u06A9\u0679 \u0627\u06CC\u06A9\u0633\u0633** \u0627\u0648\u0631 \u06A9\u0648 \u0622\u0646\u0631\u0634\u067E \u0644\u0627\u0626\u0633\u0646\u0633\u06D4

\u0627\u067E\u0646\u0627 \u0644\u0646\u06A9 \u06A9\u0627\u067E\u06CC \u06A9\u0631\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 **Profile -> Referral** \u0645\u06CC\u06BA \u062C\u0627\u0626\u06CC\u06BA\u06D4`,
      roman_urdu: `\u{1F465} **Fundora Referral Program Rates**:

\u2022 **Level 1 (Bronze)**: Direct referral ki 1st deposit par **10% Instant Cash Bonus**.
\u2022 **Level 2 (Silver)**: 2nd level team volume par **5% commission** ($500 volume).
\u2022 **Level 3 (Gold)**: **2% commission + 5% Yield Boost Voucher** ($2,000 volume).
\u2022 **Level 4 (Platinum)**: VIP executive support ($10,500 volume).

Apna referral code **Profile -> Referral** se copy karein.`,
      ar: `\u{1F465} **\u0646\u0638\u0627\u0645 \u0645\u0643\u0627\u0641\u0622\u062A \u0627\u0644\u0625\u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 \u0641\u0646\u062F\u0648\u0631\u0627**:

\u2022 **\u0627\u0644\u0645\u0633\u062A\u0648\u0649 1 (\u0628\u0631\u0648\u0646\u0632\u064A)**: \u0645\u0643\u0627\u0641\u0623\u0629 \u0645\u0627\u0644\u064A\u0629 \u0641\u0648\u0631\u064A\u0629 **10%** \u0639\u0644\u0649 \u0627\u0644\u0625\u064A\u062F\u0627\u0639 \u0627\u0644\u0623\u0648\u0644 \u0644\u0643\u0644 \u0645\u0633\u062A\u062B\u0645\u0631 \u0645\u064C\u062D\u0627\u0644 \u0645\u0628\u0627\u0634\u0631\u0629.
\u2022 **\u0627\u0644\u0645\u0633\u062A\u0648\u0649 2 (\u0641\u0636\u064A)**: \u0645\u0643\u0627\u0641\u0623\u0629 **5%** \u0639\u0646\u062F \u062F\u0639\u0648\u0629 3 \u0623\u0639\u0636\u0627\u0621 \u0646\u0634\u0637\u064A\u0646 \u0623\u0648 \u0625\u064A\u062F\u0627\u0639 $500.
\u2022 **\u0627\u0644\u0645\u0633\u062A\u0648\u0649 3 (\u0630\u0647\u0628\u064A)**: \u0645\u0643\u0627\u0641\u0623\u0629 **2% + \u0642\u0633\u064A\u0645\u0629 \u0632\u064A\u0627\u062F\u0629 \u0639\u0627\u0626\u062F \u0628\u0646\u0633\u0628\u0629 5%** ($2,000 \u0625\u064A\u062F\u0627\u0639\u0627\u062A).
\u2022 **\u0627\u0644\u0645\u0633\u062A\u0648\u0649 4 (\u0628\u0644\u0627\u062A\u064A\u0646\u064A)**: \u062D\u0642\u0648\u0642 \u0645\u0644\u0643\u064A\u0629 \u0645\u0634\u062A\u0631\u0643\u0629 \u062E\u0627\u0635\u0629 \u0648\u062F\u0639\u0645 VIP \u0645\u0628\u0627\u0634\u0631.`
    }
  },
  {
    id: "faq_android_mobile_app",
    category: "app",
    title: "Official Android Mobile App (Fundora APK Download)",
    keywords: [
      "app",
      "apk",
      "mobile app",
      "android app",
      "download app",
      "phone app",
      "application",
      "\u0627\u06CC\u067E",
      "\u0688\u0627\u0624\u0646 \u0644\u0648\u0688",
      "\u062A\u0637\u0628\u064A\u0642",
      "download apk",
      "android apk",
      "install app"
    ],
    metadata: {
      appName: "Fundora Real Estate Official Android App",
      format: "Android Package (APK)",
      downloadPath: 'Top Navigation Menu -> "Download App" button'
    },
    answers: {
      en: `\u{1F4F1} **Official Fundora Android Mobile App (APK)**:

Yes! Fundora provides an official **Android Mobile Application (Fundora APK)**.

\u2022 **How to Download**:
  1. Look at the top navigation bar / header menu of the https://fundora.one website.
  2. Click the yellow **'Download App'** or **'Android APK'** button.
  3. The APK installer will download directly to your mobile device.
  4. Install the app to track your daily yields, manage portfolio shares, and process instant withdrawals on the go!`,
      ur: `\u{1F4F1} **\u0641\u0646\u0688\u0648\u0631\u0627 \u0622\u0641\u06CC\u0634\u0644 \u0627\u06CC\u0646\u0688\u0631\u0627\u0626\u06CC\u0688 \u0645\u0648\u0628\u0627\u0626\u0644 \u0627\u06CC\u067E (APK)**:

\u062C\u06CC \u06C1\u0627\u06BA! \u0641\u0646\u0688\u0648\u0631\u0627 \u06A9\u06CC \u0631\u0633\u0645\u06CC\u0627\u064B **Android Mobile App (APK)** \u062F\u0633\u062A\u06CC\u0627\u0628 \u06C1\u06D2!

\u2022 **\u0688\u0627\u0624\u0646 \u0644\u0648\u0688 \u06A9\u0631\u0646\u06D2 \u06A9\u0627 \u0637\u0631\u06CC\u0642\u06C1**:
  1. \u0648\u06CC\u0628 \u0633\u0627\u0626\u0679 \u06A9\u06D2 \u0679\u0627\u067E \u0646\u06CC\u0648\u06CC\u06AF\u06CC\u0634\u0646 \u0628\u0627\u0631 \u0645\u06CC\u06BA **'Download App'** \u0648\u0627\u0644\u06D2 \u0628\u0679\u0646 \u067E\u0631 \u06A9\u0644\u06A9 \u06A9\u0631\u06CC\u06BA\u06D4
  2. APK \u0641\u0627\u0626\u0644 \u0622\u067E \u06A9\u06D2 \u0645\u0648\u0628\u0627\u0626\u0644 \u0641\u0648\u0646 \u0645\u06CC\u06BA \u0688\u0627\u0624\u0646 \u0644\u0648\u0688 \u06C1\u0648 \u062C\u0627\u0626\u06D2 \u06AF\u06CC\u06D4
  3. \u0627\u06CC\u067E \u0627\u0646\u0633\u0679\u0627\u0644 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u0627\u067E\u0646\u06D2 \u0645\u0648\u0628\u0627\u0626\u0644 \u0633\u06D2 \u0631\u0648\u0632\u0627\u0646\u06C1 \u06A9\u0627 \u0645\u0646\u0627\u0641\u0639 \u06A9\u0644\u06CC\u0645 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u0648\u062F\u0688\u0631\u0627\u0644 \u0644\u06CC\u06BA\u06D4`,
      roman_urdu: `\u{1F4F1} **Fundora Official Android App (APK)**:

Ji haan! Fundora ki official **Android App (APK)** download ke liye available hai.

\u2022 **Download Steps**:
  1. Website ke top navigation header mein **'Download App'** button par click karein.
  2. APK installer aap ke phone mein download ho jaye ga.
  3. Mobile App se daily yields claim karein aur portfolio manage karein!`,
      ar: `\u{1F4F1} **\u062A\u0637\u0628\u064A\u0642 \u0641\u0646\u062F\u0648\u0631\u0627 \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0644\u0647\u0648\u0627\u062A\u0641 \u0627\u0644\u0630\u0643\u064A\u0629 (Android APK)**:

\u0646\u0639\u0645! \u062A\u0648\u0641\u0631 \u0641\u0646\u062F\u0648\u0631\u0627 \u062A\u0637\u0628\u064A\u0642\u0627 \u0631\u0633\u0645\u064A\u0627\u064B \u0644\u0644\u0647\u0648\u0627\u062A\u0641 \u0628\u0646\u0638\u0627\u0645 \u0623\u0646\u062F\u0631\u0648\u064A\u062F (APK).

\u2022 **\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062A\u062D\u0645\u064A\u0644**:
  1. \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0632\u0631 **'Download App'** \u0627\u0644\u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0634\u0631\u064A\u0637 \u0627\u0644\u0639\u0644\u0648\u064A \u0644\u0644\u0645\u0648\u0642\u0639.
  2. \u0633\u064A\u0628\u062F\u0623 \u062A\u062D\u0645\u064A\u0644 \u0645\u0644\u0641 APK \u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0644\u0649 \u0647\u0627\u062A\u0641\u0643.`
    }
  },
  {
    id: "faq_community_support_ceo",
    category: "community",
    title: "Community Chat Channels, Official Email & CEO Contact",
    keywords: [
      "community",
      "channel",
      "chat",
      "support",
      "help",
      "contact",
      "email",
      "ceo",
      "ethan",
      "ethan chiu",
      "complaint",
      "human",
      "admin",
      "\u06A9\u0645\u06CC\u0648\u0646\u0679\u06CC",
      "\u0633\u067E\u0648\u0631\u0679",
      "admin support"
    ],
    metadata: {
      ceoName: "Ethan Chiu",
      supportEmail: "fundora.one@gmail.com",
      communityChannels: ["#general-chat", "#announcements", "#support-help"]
    },
    answers: {
      en: `\u{1F465} **Fundora Community Hub & Direct Support**:

\u2022 **Official Support Email**: fundora.one@gmail.com
\u2022 **CEO Direct Contact**: You can directly reach out to CEO **Ethan Chiu** inside the Community Hub under Direct Messages -> **Ethan Chiu (CEO)**.
\u2022 **Community Chat**: Tap the **'Community'** button in the AI Assistant header or open the Community Hub tab to join live channels (#general-chat, #support-help).`,
      ur: `\u{1F465} **\u0641\u0646\u0688\u0648\u0631\u0627 \u06A9\u0645\u06CC\u0648\u0646\u0679\u06CC \u06C1\u0628 \u0627\u0648\u0631 \u0688\u0627\u0626\u0631\u06CC\u06A9\u0679 \u0627\u06CC\u0688\u0645\u0646 \u0633\u067E\u0648\u0631\u0679**:

\u2022 **\u0622\u0641\u06CC\u0634\u0644 \u0627\u06CC \u0645\u06CC\u0644**: fundora.one@gmail.com
\u2022 **\u0633\u06CC \u0627\u06CC \u0627\u0648 \u0633\u06D2 \u0688\u0627\u0626\u0631\u06CC\u06A9\u0679 \u0631\u0627\u0628\u0637\u06C1**: \u0622\u067E \u06A9\u0645\u06CC\u0648\u0646\u0679\u06CC \u06C1\u0628 \u0645\u06CC\u06BA **Ethan Chiu (CEO)** \u06A9\u0648 \u0688\u0627\u0626\u0631\u06CC\u06A9\u0679 \u0645\u06CC\u0633\u062C \u06A9\u0631 \u0633\u06A9\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4
\u2022 **\u06A9\u0645\u06CC\u0648\u0646\u0679\u06CC \u0686\u06CC\u0679**: AI \u0627\u0633\u0633\u0679\u0646\u0679 \u06A9\u06D2 \u0627\u0648\u067E\u0631 **'Community'** \u06A9\u0627 \u0628\u0679\u0646 \u062F\u0628\u0627\u0626\u06CC\u06BA \u0627\u0648\u0631 \u0645\u0645\u0628\u0631\u0632 \u0633\u06D2 \u0628\u0627\u062A \u0686\u06CC\u062A \u06A9\u0631\u06CC\u06BA\u06D4`,
      roman_urdu: `\u{1F465} **Fundora Community & CEO Support**:

\u2022 **Support Email**: fundora.one@gmail.com
\u2022 **CEO Contact**: Community Hub mein Direct Messages se **Ethan Chiu (CEO)** se direct baat karein.
\u2022 **Community Channels**: Top header mein **'Community'** button click karke live group join karein!`,
      ar: `\u{1F465} **\u0645\u062C\u062A\u0645\u0639 \u0641\u0646\u062F\u0648\u0631\u0627 \u0648\u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0648\u0627\u0644\u0631\u0626\u064A\u0633 \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A**:

\u2022 **\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u0644\u062F\u0639\u0645**: fundora.one@gmail.com
\u2022 **\u0627\u0644\u0631\u0626\u064A\u0633 \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A**: \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0639 **Ethan Chiu (CEO)** \u0639\u0628\u0631 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u062C\u062A\u0645\u0639\u0627\u062A \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629.`
    }
  },
  {
    id: "faq_fractional_coownership_how_it_works",
    category: "properties",
    title: "What is Fundora & How Fractional Co-Ownership Works",
    keywords: [
      "what is fundora",
      "fundora kya hai",
      "how it works",
      "fractional real estate",
      "co-ownership",
      "shares",
      "113 usdt",
      "share price",
      "overview",
      "details",
      "jankari",
      "\u0641\u0646\u0688\u0648\u0631\u0627 \u06A9\u06CC\u0627 \u06C1\u06D2",
      "\u0645\u0646\u0635\u0629 \u0641\u0646\u062F\u0648\u0631\u0627"
    ],
    metadata: {
      minSharePrice: "$113 per share",
      minDeposit: "10 USDT",
      concept: "Fractional property ownership with daily rental dividends"
    },
    answers: {
      en: `\u{1F3E2} **About Fundora Fractional Real Estate Platform**:

Fundora is a premier UK-registered (No. 16870956) fractional real estate co-ownership platform.

\u2022 **How It Works**:
  1. Institutional physical properties (residential apartment buildings, corporate offices) are acquired in London & Dubai.
  2. Properties are split into fractional shares starting at **$113 per share** (minimum deposit to get started is just **10 USDT**).
  3. Co-owners earn **0.8% to 1.5% daily rental yields** collected twice daily, along with long-term capital appreciation.
  4. Instant withdrawals starting at **10 USDT**.`,
      ur: `\u{1F3E2} **\u0641\u0646\u0688\u0648\u0631\u0627 \u0631\u06CC\u0626\u0644 \u0627\u0633\u0679\u06CC\u0679 \u067E\u0644\u06CC\u0679 \u0641\u0627\u0631\u0645 \u06A9\u0627 \u062A\u0639\u0627\u0631\u0641**:

\u0641\u0646\u0688\u0648\u0631\u0627 \u0628\u0631\u0637\u0627\u0646\u06CC\u06C1 \u06A9\u0627 \u0631\u062C\u0633\u0679\u0631\u0688 \u0641\u0631\u06CC\u06A9\u0634\u0646\u0644 \u06A9\u0648 \u0622\u0646\u0631\u0634\u067E \u067E\u0644\u06CC\u0679 \u0641\u0627\u0631\u0645 \u06C1\u06D2 (Reg No. 16870956)\u06D4

\u2022 **\u06A9\u0627\u0645 \u06A9\u0631\u0646\u06D2 \u06A9\u0627 \u0637\u0631\u06CC\u0642\u06C1**:
  1. \u0644\u0646\u062F\u0646 \u0627\u0648\u0631 \u062F\u0628\u0626\u06CC \u0645\u06CC\u06BA \u067E\u0631\u06CC\u0645\u06CC\u0645 \u062C\u0627\u0626\u06CC\u062F\u0627\u062F\u06CC\u06BA \u062E\u0631\u06CC\u062F\u06CC \u062C\u0627\u062A\u06CC \u06C1\u06CC\u06BA\u06D4
  2. \u067E\u0631\u0627\u067E\u0631\u0679\u06CC\u0632 \u06A9\u0648 \u0686\u06BE\u0648\u0679\u06D2 \u0634\u06CC\u0626\u0631\u0632 ($113 \u0641\u06CC \u0634\u06CC\u0626\u0631) \u0645\u06CC\u06BA \u062A\u0642\u0633\u06CC\u0645 \u06A9\u06CC\u0627 \u062C\u0627\u062A\u0627 \u06C1\u06D2\u06D4
  3. \u0633\u0631\u0645\u0627\u06CC\u06C1 \u06A9\u0627\u0631 10 USDT \u06A9\u06D2 \u0688\u067E\u0627\u0632\u0679 \u0633\u06D2 \u0634\u0631\u0627\u06A9\u062A \u062F\u0627\u0631 \u0628\u0646 \u06A9\u0631 **0.8% \u0633\u06D2 1.5% \u0631\u0648\u0632\u0627\u0646\u06C1 \u0631\u06CC\u0646\u0679\u0644 \u0645\u0646\u0627\u0641\u0639** \u062D\u0627\u0635\u0644 \u06A9\u0631\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4`,
      roman_urdu: `\u{1F3E2} **Fundora Platform Details**:

Fundora ek UK registered fractional real estate platform hai (Company Reg 16870956).

\u2022 **How It Works**:
  1. Prime UK aur Dubai properties ko fractional shares ($113 per share) mein divide kiya jata hai.
  2. Aap minimum **10 USDT** deposit se co-owner ban kar **0.8% - 1.5% daily rental yield** earn karte hain.
  3. Minimum withdrawal sirf **10 USDT** hai.`,
      ar: `\u{1F3E2} **\u0639\u0646 \u0645\u0646\u0635\u0629 \u0641\u0646\u062F\u0648\u0631\u0627 \u0644\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064A**:

\u0641\u0646\u062F\u0648\u0631\u0627 \u0647\u064A \u0645\u0646\u0635\u0629 \u0628\u0631\u064A\u0637\u0627\u0646\u064A\u0629 \u0645\u0633\u062C\u0644\u0629 \u0631\u0633\u0645\u064A\u0627\u064B (\u0631\u0642\u0645 16870956) \u062A\u062A\u064A\u062D \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064A \u0628\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0644\u0643\u064A\u0629 \u0627\u0644\u0645\u062C\u0632\u0623\u0629 \u0628\u062F\u0621\u0627\u064B \u0645\u0646 10 USDT \u0628\u0639\u0648\u0627\u0626\u062F \u0625\u064A\u062C\u0627\u0631\u064A\u0629 \u064A\u0648\u0645\u064A\u0629 \u062A\u0635\u0644 \u0625\u0644\u0649 1.5%.`
    }
  }
];
function searchStructuredFAQ(userQuery, userLanguage = "en") {
  const query = (userQuery || "").toLowerCase().trim();
  if (!query) {
    return {
      matched: false,
      score: 0,
      reply: "",
      escalate: false
    };
  }
  const hasUrduArabicScript = /[\u0600-\u06FF]/.test(userQuery);
  const isUrduScript = hasUrduArabicScript && (userQuery.includes("\u06A9\u06CC\u0627") || userQuery.includes("\u06A9\u06D2") || userQuery.includes("\u0628\u062A\u0627") || userQuery.includes("\u06C1\u0645") || userQuery.includes("\u06C1\u06D2") || userQuery.includes("\u0645\u06CC\u06BA") || userQuery.includes("\u0641\u0646\u0688\u0648\u0631\u0627") || userQuery.includes("\u06A9\u06CC\u0633\u06D2") || userQuery.includes("\u0633\u0631\u0645\u0627\u06CC\u06C1") || userQuery.includes("\u0633\u0644\u0627\u0645") || userQuery.includes("\u0622\u067E") || userQuery.includes("\u0645\u0646\u0627\u0641\u0639"));
  const isArabicScript = hasUrduArabicScript && !isUrduScript && (userQuery.includes("\u0645\u0646\u0635\u0629") || userQuery.includes("\u0639\u0642\u0627\u0631\u064A") || userQuery.includes("\u0643\u064A\u0641") || userQuery.includes("\u0639\u0646") || userQuery.includes("\u0641\u064A") || userQuery.includes("\u0627\u0633\u062A\u062B\u0645\u0627\u0631") || userQuery.includes("\u0645\u0631\u062D\u0628\u0627") || userQuery.includes("\u0623\u0631\u0628\u0627\u062D"));
  const isRomanUrdu = !hasUrduArabicScript && (query.includes("kaise") || query.includes("kese") || query.includes("kya") || query.includes("hai") || query.includes("hoon") || query.includes("hun") || query.includes("batao") || query.includes("batai") || query.includes("tarika") || query.includes("tareeqa") || query.includes("karna") || query.includes("chahiye") || query.includes("ko") || query.includes("mein") || query.includes("me") || query.includes("par") || query.includes("bhai") || query.includes("sir") || query.includes("shukriya") || query.includes("ap") || query.includes("aap") || query.includes("munafa") || query.includes("paise") || query.includes("nikalna") || query.includes("dalna") || query.includes("karo") || query.includes("rha") || query.includes("rhi") || query.includes("karain") || query.includes("krain"));
  let detectedLangKey = "en";
  if (isUrduScript || userLanguage === "ur") detectedLangKey = "ur";
  else if (isArabicScript || userLanguage === "ar") detectedLangKey = "ar";
  else if (isRomanUrdu) detectedLangKey = "roman_urdu";
  const isHumanEscalation = query.includes("human") || query.includes("agent") || query.includes("admin") || query.includes("person") || query.includes("support team") || query.includes("complaint") || query.includes("complain") || userQuery.includes("\u0627\u0646\u0633\u0627\u0646\u06CC") || userQuery.includes("\u0633\u067E\u0648\u0631\u0679");
  const queryTokens = query.split(/\s+/).filter((t) => t.length > 1);
  let bestMatch = void 0;
  let maxScore = 0;
  for (const faq of STRUCTURED_FAQ_DATABASE) {
    let score = 0;
    for (const kw of faq.keywords) {
      const kwLower = kw.toLowerCase();
      if (query === kwLower) {
        score += 50;
      } else if (query.includes(kwLower)) {
        score += 25;
      } else {
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
    const rawAnswer = bestMatch.answers[detectedLangKey] || bestMatch.answers["en"];
    const retrievedContext = `RETRIEVED DOCUMENTATION FAQ [${bestMatch.id}] (${bestMatch.title}):
${JSON.stringify(bestMatch.metadata, null, 2)}
Official Fact Answer:
${bestMatch.answers.en}`;
    return {
      matched: true,
      score: maxScore,
      faqItem: bestMatch,
      reply: rawAnswer,
      escalate: isHumanEscalation,
      retrievedContext
    };
  }
  const retrievedContextFallback = bestMatch ? `RETRIEVED DOCUMENTATION FAQ [${bestMatch.id}] (${bestMatch.title}):
${JSON.stringify(bestMatch.metadata, null, 2)}
Official Fact Answer:
${bestMatch.answers.en}` : void 0;
  return {
    matched: false,
    score: maxScore,
    faqItem: bestMatch,
    reply: bestMatch ? bestMatch.answers[detectedLangKey] || bestMatch.answers["en"] : "",
    escalate: isHumanEscalation,
    retrievedContext: retrievedContextFallback
  };
}
function generateSmartFundoraAnswer(message, userLanguage = "en", channelName) {
  const query = (message || "").toLowerCase().trim();
  const faqResult = searchStructuredFAQ(message, userLanguage);
  if (faqResult.reply) {
    return {
      reply: faqResult.reply,
      escalate: faqResult.escalate,
      faqId: faqResult.faqItem?.id,
      retrievedContext: faqResult.retrievedContext
    };
  }
  const isUrduScript = /[\u0600-\u06FF]/.test(message) && (message.includes("\u06A9\u06CC\u0627") || message.includes("\u0633\u0644\u0627\u0645") || message.includes("\u06A9\u06D2") || message.includes("\u0641\u0646\u0688\u0648\u0631\u0627") || message.includes("\u0645\u0646\u0627\u0641\u0639"));
  const isArabicScript = /[\u0600-\u06FF]/.test(message) && !isUrduScript;
  const isRomanUrdu = query.includes("kaise") || query.includes("kese") || query.includes("kya") || query.includes("batao") || query.includes("salam") || query.includes("paise") || query.includes("paisa") || query.includes("bhai") || query.includes("chahiye");
  if (query === "hi" || query === "hello" || query === "hey" || query === "hy" || query.includes("salam") || query.includes("aoa") || query.includes("how are you") || query.includes("kya haal")) {
    if (isUrduScript) {
      return {
        reply: `\u0648\u0639\u0644\u06CC\u06A9\u0645 \u0627\u0644\u0633\u0644\u0627\u0645! \u{1F916} \u0645\u06CC\u06BA \u0641\u0646\u0688\u0648\u0631\u0627 \u0627\u06D2 \u0622\u0626\u06CC \u0627\u06CC\u062C\u0646\u0679 \u06C1\u0648\u06BA\u06D4

\u0622\u067E \u0645\u062C\u06BE \u0633\u06D2 **10 USDT** \u0688\u067E\u0627\u0632\u0679 \u06A9\u0631\u0646\u06D2\u060C **0.8%-1.5%** \u0631\u0648\u0632\u0627\u0646\u06C1 \u0631\u06CC\u0646\u0679\u0644 \u06CC\u06CC\u0644\u0688\u060C 10 USDT \u0648\u062F\u0688\u0631\u0627\u0644 \u06CC\u0627 \u06CC\u0648 \u06A9\u06D2 \u0631\u062C\u0633\u0679\u0631\u06CC\u0634\u0646 (No. 16870956) \u06A9\u06D2 \u0628\u0627\u0631\u06D2 \u0645\u06CC\u06BA \u06A9\u0648\u0626\u06CC \u0628\u06BE\u06CC \u0633\u0648\u0627\u0644 \u067E\u0648\u0686\u06BE \u0633\u06A9\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4`,
        escalate: false
      };
    }
    if (isArabicScript) {
      return {
        reply: `\u0623\u0647\u0644\u0627\u064B \u0648\u0633\u0647\u0644\u0627\u064B! \u{1F916} \u0623\u0646\u0627 \u0645\u0633\u0627\u0639\u062F \u0641\u0646\u062F\u0648\u0631\u0627 \u0627\u0644\u0630\u0643\u064A \u0644\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064A.

\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0639\u0646 \u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0625\u064A\u062F\u0627\u0639 (10 USDT)\u060C \u0627\u0644\u0639\u0648\u0627\u0626\u062F \u0627\u0644\u064A\u0648\u0645\u064A\u0629 (0.8%-1.5%)\u060C \u0627\u0644\u0633\u062D\u0628 (10 USDT)\u060C \u0623\u0648 \u0627\u0644\u062A\u0631\u0627\u062E\u064A\u0635 \u0627\u0644\u0631\u0633\u0645\u064A\u0629.`,
        escalate: false
      };
    }
    if (isRomanUrdu) {
      return {
        reply: `Walaikum Assalam! \u{1F916} Main Fundora AI Agent hoon.

Aap mujhse USDT Deposit (10 USDT min), Daily Rental Yield (0.8%-1.5%), Withdrawal (10 USDT min), ya UK Registration Reg No. 16870956 ke hawale se direct sawal pooch sakte hain.`,
        escalate: false
      };
    }
    return {
      reply: `Hello! \u{1F916} I am the Fundora AI Investment Concierge.

How can I help with your real estate co-ownership today? Feel free to ask about depositing USDT (10 USDT min), claiming 0.8%-1.5% daily yields, current property ROI, or UK legal registration.`,
      escalate: false
    };
  }
  const isUnbindIntent = query.includes("unbind") || query.includes("reset") || query.includes("change wallet") || query.includes("wallet reset") || query.includes("address change") || message.includes("\u0627\u0646 \u0628\u0627\u0626\u0646\u0688") || message.includes("\u0641\u0643 \u0627\u0644\u0631\u0628\u0637");
  const isDepositIntent = query.includes("deposit") || query.includes("deposite") || query.includes("recharge") || query.includes("dalna") || query.includes("paisa") || query.includes("paise") || query.includes("trc20") || query.includes("bep20") || message.includes("\u0688\u067E\u0627\u0632\u0679") || message.includes("\u062C\u0645\u0639");
  const isWithdrawIntent = query.includes("withdraw") || query.includes("withdrawal") || query.includes("nikalna") || query.includes("nikalein") || query.includes("payout") || query.includes("cashout") || message.includes("\u0648\u062F\u0688\u0631\u0627\u0644") || message.includes("\u0633\u062D\u0628");
  const isRoiProfitIntent = query.includes("roi") || query.includes("profit") || query.includes("yield") || query.includes("kamai") || query.includes("munafa") || query.includes("return") || query.includes("earning") || query.includes("daily") || message.includes("\u0645\u0646\u0627\u0641\u0639") || message.includes("\u06CC\u06CC\u0644\u0688");
  const isLegalIntent = query.includes("legal") || query.includes("real") || query.includes("fake") || query.includes("scam") || query.includes("legit") || query.includes("company") || query.includes("register") || query.includes("registration") || query.includes("halal") || message.includes("\u0642\u0627\u0646\u0648\u0646\u06CC") || message.includes("\u062D\u0644\u0627\u0644");
  const isReferralIntent = query.includes("referral") || query.includes("refer") || query.includes("code") || query.includes("link") || query.includes("commission") || query.includes("bonus") || query.includes("level") || message.includes("\u0631\u06CC\u0641\u0631\u0644");
  const isAppIntent = query.includes("app") || query.includes("apk") || query.includes("download") || query.includes("android") || query.includes("mobile") || message.includes("\u0627\u06CC\u067E");
  let targetFaqId = "faq_fractional_coownership_how_it_works";
  if (isUnbindIntent) targetFaqId = "faq_wallet_unbind_reset";
  else if (isDepositIntent) targetFaqId = "faq_deposit_procedure";
  else if (isWithdrawIntent) targetFaqId = "faq_withdrawal_rules";
  else if (isRoiProfitIntent) targetFaqId = "faq_property_roi_yields";
  else if (isLegalIntent) targetFaqId = "faq_uk_registration_legal";
  else if (isReferralIntent) targetFaqId = "faq_referral_program";
  else if (isAppIntent) targetFaqId = "faq_android_mobile_app";
  const matchedFaq = STRUCTURED_FAQ_DATABASE.find((f) => f.id === targetFaqId);
  if (matchedFaq) {
    let langKey = "en";
    if (isUrduScript || userLanguage === "ur") langKey = "ur";
    else if (isArabicScript || userLanguage === "ar") langKey = "ar";
    else if (isRomanUrdu) langKey = "roman_urdu";
    return {
      reply: matchedFaq.answers[langKey] || matchedFaq.answers["en"],
      escalate: faqResult.escalate,
      faqId: matchedFaq.id
    };
  }
  if (isUrduScript) {
    return {
      reply: `\u{1F916} **\u0641\u0646\u0688\u0648\u0631\u0627 \u0627\u06D2 \u0622\u0626\u06CC \u0631\u06C1\u0646\u0645\u0627\u0626\u06CC**:

\u2022 **\u0688\u067E\u0627\u0632\u0679**: \u06A9\u0645 \u0627\u0632 \u06A9\u0645 10 USDT (TRC20 / BEP20)
\u2022 **\u0631\u0648\u0632\u0627\u0646\u06C1 \u0631\u06CC\u0646\u0679\u0644 \u06CC\u06CC\u0644\u0688**: 0.8% \u0633\u06D2 1.5% \u0631\u0648\u0632\u0627\u0646\u06C1 \u0631\u06CC\u0646\u0679\u0644 \u0645\u0646\u0627\u0641\u0639
\u2022 **\u0627\u06CC\u06A9\u0679\u0648 \u067E\u0631\u0627\u067E\u0631\u0679\u06CC**: \u0627\u0639\u0645\u0627\u0631 \u0688\u0627\u0624\u0646 \u0679\u0627\u0624\u0646 \u0633\u0648\u06CC\u0679\u0633 (\u062F\u0628\u0626\u06CC) - **40.5% \u0633\u0627\u0644\u0627\u0646\u06C1 ROI**
\u2022 **\u0648\u062F\u0688\u0631\u0627\u0644**: \u06A9\u0645 \u0627\u0632 \u06A9\u0645 10 USDT
\u2022 **\u0631\u062C\u0633\u0679\u0631\u06CC\u0634\u0646**: UK Companies House No. 16870956

\u0622\u067E \u06A9\u0627 \u0633\u0648\u0627\u0644 \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648 \u0686\u06A9\u0627 \u06C1\u06D2\u06D4 \u06A9\u06CC\u0627 \u0622\u067E \u0688\u067E\u0627\u0632\u0679 \u06A9\u0631\u0646\u06D2 \u06A9\u0627 \u0637\u0631\u06CC\u0642\u06C1\u060C \u0648\u062F\u0688\u0631\u0627\u0644\u060C \u06CC\u0627 \u0631\u0648\u0632\u0627\u0646\u06C1 \u06A9\u0627 \u0645\u0646\u0627\u0641\u0639 \u06A9\u0644\u06CC\u0645 \u06A9\u0631\u0646\u06D2 \u06A9\u06D2 \u0628\u0627\u0631\u06D2 \u0645\u06CC\u06BA \u0645\u0632\u06CC\u062F \u062A\u0641\u0635\u06CC\u0644 \u0686\u0627\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA\u061F`,
      escalate: faqResult.escalate
    };
  }
  if (isRomanUrdu) {
    return {
      reply: `\u{1F916} **Fundora AI Guidance**:

\u2022 **Deposit**: Minimum 10 USDT (TRC20 / BEP20)
\u2022 **Daily Rental Yield**: 0.8% se 1.5% daily profit
\u2022 **Active Property**: Emaar Downtown Suites (Dubai) - **40.5% Annual ROI** ($113/share)
\u2022 **Withdrawal**: Minimum 10 USDT (1-24 hours)
\u2022 **Legal**: UK Companies House Reg No. 16870956

Aap ka sawal mil gaya hai. Deposit, daily profit claim, ya withdrawal ke bare mein mazeed poochiye!`,
      escalate: faqResult.escalate
    };
  }
  return {
    reply: `\u{1F916} **Fundora AI Assistant**:

Here are the key verified facts regarding your request:
\u2022 **Minimum Deposit**: 10 USDT (TRC20 / BEP20 accepted, 0% fees)
\u2022 **Current Featured Property**: Emaar Downtown Boulevard Suites (Dubai) \u2014 **40.5% Annual ROI** ($113/share)
\u2022 **Daily Yield Dividend**: 0.8% to 1.5% daily rental returns
\u2022 **Minimum Withdrawal**: 10 USDT (Instant queue approval)
\u2022 **UK Legal Registration**: UK Companies House Registration No. 16870956

Your request is noted! Ask anything about depositing, claiming daily yields, or processing withdrawals!`,
    escalate: faqResult.escalate
  };
}

// server.ts
import_dotenv.default.config();
var firebaseAdminApp = null;
function initFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;
  const activeApps = (0, import_app.getApps)();
  if (activeApps.length > 0 && activeApps[0]) {
    firebaseAdminApp = activeApps[0];
    return firebaseAdminApp;
  }
  try {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (rawServiceAccount) {
      let parsedCreds;
      const trimmed = rawServiceAccount.trim();
      if (trimmed.startsWith("{")) {
        parsedCreds = JSON.parse(trimmed);
      } else {
        try {
          const decoded = Buffer.from(trimmed, "base64").toString("utf8");
          parsedCreds = JSON.parse(decoded);
        } catch {
          parsedCreds = JSON.parse(trimmed);
        }
      }
      firebaseAdminApp = (0, import_app.initializeApp)({
        credential: (0, import_app.cert)(parsedCreds)
      });
      console.log("[Firebase Admin] Successfully initialized Firebase Admin SDK with Service Account JSON credentials.");
      return firebaseAdminApp;
    }
  } catch (err) {
    console.warn("[Firebase Admin] Initialization attempt warning:", err?.message || err);
  }
  return null;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Headers, *");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  const isValidResendApiKey = (key) => {
    if (!key) return false;
    const trimmed = key.trim();
    return trimmed.startsWith("re_") && trimmed.length >= 25 && !trimmed.includes("12345678") && !trimmed.includes("your_");
  };
  const APK_GITHUB_SOURCE_URL = "https://github.com/tajammalrehmat/Fundora-Real-Estate/releases/download/Apk/app-fundora.apk";
  const handleApkDownload = async (req, res) => {
    try {
      console.log(`[APK Download Proxy] Request received from IP: ${req.ip}`);
      res.setHeader("Content-Disposition", 'attachment; filename="app-fundora.apk"');
      res.setHeader("Content-Type", "application/vnd.android.package-archive");
      res.setHeader("Cache-Control", "public, max-age=3600");
      const response = await fetch(APK_GITHUB_SOURCE_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        redirect: "follow"
      });
      if (!response.ok) {
        console.error(`[APK Download Proxy] Failed to fetch source APK: ${response.status} ${response.statusText}`);
        return res.redirect(302, APK_GITHUB_SOURCE_URL);
      }
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      if (response.body) {
        const nodeReadable = import_stream.Readable.fromWeb(response.body);
        nodeReadable.pipe(res);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.error("[APK Download Proxy Error]", err?.message || err);
      res.redirect(302, APK_GITHUB_SOURCE_URL);
    }
  };
  app.get("/api/download-apk", handleApkDownload);
  app.get("/download/app-fundora.apk", handleApkDownload);
  app.get("/app-fundora.apk", handleApkDownload);
  const getSpFallbackKey = () => {
    try {
      return Buffer.from("c3BfYXBpa2V5X2ZkYTFhNWQ5ZWQ2N2ViNDY3NWQyM2UxZDAxZmI0YzNjYmYyZGM5NGY3MjZjMmNmM2ExNjM0YmE2ZmM2MjQ5NTU=", "base64").toString("utf-8");
    } catch (_) {
      return "";
    }
  };
  app.post("/api/send-email", async (req, res) => {
    const { toEmail, toName, subject, title, message, badge, badgeColor, detailsHtml, otpCode } = req.body;
    if (!toEmail || !subject) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: toEmail and subject are required."
      });
    }
    const isRealOtp = !!(otpCode && /^\d{4,8}$/.test(String(otpCode).trim()));
    if (!isRealOtp) {
      console.log(`[Email Server] Suppressed non-OTP email ("${subject}") for ${toEmail}. Only OTP emails are enabled.`);
      return res.json({ success: true, skipped: true });
    }
    const headerTitle = title || subject;
    const headerBadge = badge || "OFFICIAL NOTIFICATION";
    const headerColor = badgeColor || "#0d6efd";
    const isFullHtmlDocument = detailsHtml && (detailsHtml.includes("<!DOCTYPE") || detailsHtml.includes("<html"));
    const htmlContent = isFullHtmlDocument ? detailsHtml : `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#060819;font-family:Arial,sans-serif;color:#e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#060819;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0e122b;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
<tr>
<td style="background:linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);color:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #334155;">
<div style="font-size:24px;font-weight:900;letter-spacing:2px;color:#38bdf8;">FUNDORA.ONE</div>
<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Real Estate Fractional Investment Platform</div>
</td>
</tr>
<tr>
<td style="padding:32px;">
<div style="display:inline-block;background:${headerColor}22;color:${headerColor};border:1px solid ${headerColor}55;padding:4px 12px;font-size:10px;font-weight:bold;letter-spacing:1.5px;border-radius:20px;text-transform:uppercase;margin-bottom:16px;">
${headerBadge}
</div>
<h2 style="margin-top:0;margin-bottom:16px;color:#f8fafc;font-size:20px;font-weight:700;">
${headerTitle}
</h2>
<p style="font-size:15px;color:#cbd5e1;line-height:24px;margin-bottom:16px;">
Hello ${toName || "Investor"},
</p>
<div style="font-size:14px;color:#cbd5e1;line-height:22px;background:#070a1e;padding:18px;border-radius:12px;border:1px solid #1e293b;margin-bottom:20px;">
${message || ""}
</div>
${detailsHtml ? `<div style="margin-bottom:20px;">${detailsHtml}</div>` : ""}
${isRealOtp ? `<div style="margin:24px 0;text-align:center;"><div style="display:inline-block;background:#38bdf8;color:#0f172a;padding:16px 32px;font-size:32px;font-weight:bold;letter-spacing:6px;border-radius:10px;">${otpCode}</div></div>` : ""}
<hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
<p style="font-size:12px;color:#64748b;text-align:center;line-height:18px;">
This is an automated notification from <strong>Fundora.one</strong>.<br>
If you have any questions, contact support at <a href="mailto:fundora.one@gmail.com" style="color:#38bdf8;text-decoration:none;">fundora.one@gmail.com</a>
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
    const rawKey = (process.env.SENDPULSE_API_KEY || process.env.VITE_SENDPULSE_API_KEY || req.body?.apiKey || "").trim();
    const sendpulseApiKey = rawKey.startsWith("sp_apikey_") ? rawKey : getSpFallbackKey();
    const senderEmail = "no-reply@fundora.one";
    console.log(`[Email Server] Dispatching email (${subject}) to ${toEmail} via SendPulse...`);
    try {
      const base64Html = Buffer.from(htmlContent, "utf-8").toString("base64");
      const sendpulseResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendpulseApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: {
            subject,
            html: base64Html,
            text: message || subject,
            from: {
              name: "Fundora",
              email: senderEmail
            },
            to: [
              {
                name: toName || "Investor",
                email: toEmail
              }
            ]
          }
        })
      });
      const responseData = await sendpulseResponse.json().catch(() => ({}));
      if (sendpulseResponse.ok && (responseData.result === true || responseData.id)) {
        console.log(`[Email Server] Email sent successfully to ${toEmail} via SendPulse:`, responseData);
        return res.json({ success: true, via: "sendpulse", data: responseData });
      } else {
        const errDetails = responseData.message || responseData.error || JSON.stringify(responseData);
        console.error(`[Email Server] SendPulse API error status ${sendpulseResponse.status}:`, errDetails);
        return res.status(sendpulseResponse.status || 500).json({ success: false, error: `SendPulse Error (${sendpulseResponse.status}): ${errDetails}` });
      }
    } catch (sendpulseErr) {
      console.error(`[Email Server] SendPulse API exception:`, sendpulseErr?.message || sendpulseErr);
      return res.status(500).json({ success: false, error: sendpulseErr?.message || "SendPulse email dispatch failed" });
    }
  });
  app.post("/api/send-otp", async (req, res) => {
    const { toEmail, toName, otpCode } = req.body;
    if (!toEmail || !otpCode) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: toEmail and otpCode are required."
      });
    }
    const rawOtpKey = (process.env.SENDPULSE_API_KEY || process.env.VITE_SENDPULSE_API_KEY || req.body?.apiKey || "").trim();
    const sendpulseApiKey = rawOtpKey.startsWith("sp_apikey_") ? rawOtpKey : getSpFallbackKey();
    const senderEmail = "no-reply@fundora.one";
    try {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Fundora OTP</title>
</head>

<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,.08);">

<tr>
<td style="background:#0d6efd;color:#ffffff;padding:20px;text-align:center;font-size:26px;font-weight:bold;">
Fundora
</td>
</tr>

<tr>
<td style="padding:35px;">

<h2 style="margin-top:0;color:#222;">
Verify Your Email
</h2>

<p style="font-size:16px;color:#555;">
Hello ${toName || "Investor"},
</p>

<p style="font-size:16px;color:#555;line-height:26px;">
Use the verification code below to complete your registration.
</p>

<div style="margin:35px 0;text-align:center;">

<div style="
display:inline-block;
background:#0d6efd;
color:#fff;
padding:18px 35px;
font-size:34px;
font-weight:bold;
letter-spacing:8px;
border-radius:8px;">
${otpCode}
</div>

</div>

<p style="font-size:15px;color:#777;">
This code will expire in <strong>10 minutes</strong>.
</p>

<p style="font-size:15px;color:#777;">
If you didn't request this verification, simply ignore this email.
</p>

<hr>

<p style="font-size:13px;color:#999;text-align:center;">
\xA9 2026 Fundora. All rights reserved.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;
      console.log(`[SendPulse Server Proxy] Dispatching OTP email to ${toEmail}...`);
      const base64Html = Buffer.from(htmlContent, "utf-8").toString("base64");
      const response = await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendpulseApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: {
            subject: "Your Fundora Verification Code",
            html: base64Html,
            text: `Your Fundora verification code is ${otpCode}`,
            from: {
              name: "Fundora",
              email: senderEmail
            },
            to: [
              {
                name: toName || "Investor",
                email: toEmail
              }
            ]
          }
        })
      });
      const responseData = await response.json().catch(() => ({}));
      if (response.ok && (responseData.result === true || responseData.id)) {
        console.log(`[SendPulse Server Proxy] Email sent successfully to ${toEmail}:`, responseData);
        return res.json({ success: true, via: "sendpulse", data: responseData });
      } else {
        const errDetails = responseData.message || responseData.error || JSON.stringify(responseData);
        console.error(`[SendPulse Server Proxy] SendPulse API error:`, errDetails);
        return res.status(response.status || 500).json({
          success: false,
          error: `SendPulse Error (${response.status}): ${errDetails}`
        });
      }
    } catch (error) {
      console.error("[SendPulse Server Proxy] Exception in /api/send-otp:", error?.message || error);
      return res.status(500).json({
        success: false,
        error: error.message || "An exception occurred during email dispatch."
      });
    }
  });
  app.post("/api/analyze-receipt", async (req, res) => {
    const { base64Data, mimeType, apiKey: clientBodyKey } = req.body;
    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: base64Data is required."
      });
    }
    try {
      const headerKey = req.headers["x-gemini-key"];
      let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || clientBodyKey || headerKey || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
        console.warn("[Receipt Analyzer] No valid GEMINI_API_KEY detected in env or request.");
        return res.status(400).json({
          success: false,
          error: "No valid Gemini API Key available for receipt OCR parsing."
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      let cleanBase64 = base64Data;
      let detectedMimeType = mimeType || "image/jpeg";
      if (base64Data.startsWith("data:")) {
        const parts = base64Data.split(";base64,");
        if (parts.length === 2) {
          detectedMimeType = parts[0].replace("data:", "").split(";")[0];
          cleanBase64 = parts[1];
        }
      }
      console.log(`[Receipt Analyzer] Triggering Gemini 3.6 Flash for receipt parsing, size: ~${Math.round(cleanBase64.length / 1024)} KB, mime: ${detectedMimeType}...`);
      const imagePart = {
        inlineData: {
          mimeType: detectedMimeType,
          data: cleanBase64
        }
      };
      const promptPart = {
        text: "You are an expert AI payment auditor. Carefully analyze this image of a cryptocurrency payment receipt, deposit confirmation, transfer invoice, or order screenshot (such as Quotex, Binance, OKX, Bybit, Trust Wallet, MetaMask, Bitnbox, KuCoin, etc.).\n\nIdentify and extract these EXACT fields from the screenshot:\n1. 'amount': The exact DEPOSIT, PAYMENT, or TRANSFER amount in USDT or USD (e.g., if the receipt shows 'Paid: $12', 'Transfer: 12 USDT', 'Deposit Amount: 12', 'Total: $12', return 12). CRITICAL: DO NOT return user account balances, available balances, wallet balances, or fee amounts! If multiple amounts exist on screen, strictly select the actual transfer/deposit payment amount.\n2. 'txid': The transaction hash, transaction ID, Order ID, Deposit ID, Ref No, or Reference Code (e.g. '124119776', 'TX...', '0x...'). Look for labels like 'Order ID', 'Deposit ID', 'Quotex Deposit ID', 'TxID', 'TxHash', 'Transaction ID', 'Ref No', 'Reference Number', 'Hash', 'ID'. Extract the clean ID string without prefixes or labels.\n3. 'network': The matching transfer network (e.g. 'TRC20', 'BEP20', 'BSC', 'TRX'). Default to 'TRC20' if not specified.\n\nFormat the output STRICTLY as JSON matching the schema."
      };
      let response;
      const modelsToTry = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      let lastAiErr = null;
      for (const modelName of modelsToTry) {
        try {
          console.log(`[Receipt Analyzer] Attempting receipt parsing with model: ${modelName}...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [imagePart, promptPart] },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: import_genai.Type.OBJECT,
                properties: {
                  txid: {
                    type: import_genai.Type.STRING,
                    description: "The transaction hash, Order ID, Deposit ID, or TxID from the screenshot."
                  },
                  amount: {
                    type: import_genai.Type.NUMBER,
                    description: "The transfer/payment amount parsed strictly as a number."
                  },
                  network: {
                    type: import_genai.Type.STRING,
                    description: "The blockchain network ('TRC20' or 'BEP20')."
                  }
                },
                required: ["txid", "amount", "network"]
              }
            }
          });
          if (response && response.text) {
            console.log(`[Receipt Analyzer] Successfully retrieved response using ${modelName}`);
            lastAiErr = null;
            break;
          }
        } catch (modelErr) {
          lastAiErr = modelErr;
          console.warn(`[Receipt Analyzer] ${modelName} call failed:`, modelErr?.message || modelErr);
        }
      }
      if (!response || !response.text) {
        const errString = String(lastAiErr?.message || lastAiErr || "");
        const isQuotaExceeded = errString.includes("429") || errString.includes("quota") || errString.includes("RESOURCE_EXHAUSTED");
        console.warn(`[Receipt Analyzer] All Gemini models failed (${isQuotaExceeded ? "Quota Exceeded 429" : "General AI Error"}). Returning graceful manual entry fallback.`);
        return res.json({
          success: true,
          quotaExceeded: isQuotaExceeded,
          warning: isQuotaExceeded ? "AI scanning service is busy (Quota Limit). Receipt attached successfully \u2014 please enter your TxID/Amount manually below." : "AI scanner could not process image details. Receipt attached successfully \u2014 please enter your TxID/Amount manually below.",
          data: {
            txid: "",
            amount: 0,
            network: "TRC20"
          }
        });
      }
      const responseText = response.text || "{}";
      console.log(`[Receipt Analyzer] Gemini Raw Response:`, responseText);
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
      }
      const parsedData = JSON.parse(cleanedResponse);
      return res.json({
        success: true,
        data: parsedData
      });
    } catch (error) {
      console.error("[Receipt Analyzer] Error parsing receipt screenshot:", error?.message || error);
      return res.json({
        success: true,
        quotaExceeded: true,
        warning: "Receipt image uploaded! Please verify or enter your TxID & Amount manually.",
        data: {
          txid: "",
          amount: 0,
          network: "TRC20"
        }
      });
    }
  });
  const getGeminiClient = (req) => {
    const headerKey = req.headers["x-gemini-key"];
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || headerKey || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) return null;
    return new import_genai.GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
  };
  const FUNDORA_SYSTEM_PROMPT = `You are Fundora AI Assistant, the official AI concierge for Fundora Real Estate Platform (fundora.one).
You assist investors worldwide with verified platform knowledge in multiple languages including English, Urdu, Roman Urdu, Arabic, Pashto, Hindi, Bengali, Spanish, French, Turkish, Chinese, etc.

FUNDORA PLATFORM FACTS & OFFICIAL DOCUMENTATION:
- Official Registered Entity: Fundora Real Estate Investment Platform Ltd (UK Companies House Registration No. 16870956).
- Official Website: https://fundora.one
- Official Support Email: fundora.one@gmail.com
- Official Mobile App: YES! Fundora provides an official downloadable Android Mobile App (Fundora APK) available directly on our website! Users can click the "Download App" / "Android APK" button in the top navigation bar or menu.

KEY FEATURES & RECENT UPDATES:
1. WALLET BINDING & DIRECT INSTANT UNBINDING:
   - Wallet binding for USDT receiving addresses is located in the **Wallet Menu**.
   - Supports USDT (BEP20 Network) and USDT (TRC20 Network).
   - Once bound, the wallet form hides automatically, and two compact side-by-side micro buttons appear: "\u{1F513} BEP20 Unbind" and "\u{1F513} TRC20 Unbind".
   - Unbinding is **INSTANT and DIRECT** with a single click! Users no longer need to wait for admin approval to reset or update their wallet address.
   - Once unbound, users can immediately bind a new receiving address for withdrawals.
   - Wallet configuration is cleanly centralized in the Wallet Menu.

2. PROPERTY PROJECTS & ROI DETAILS:
   - **Emaar Downtown Boulevard Suites** (Downtown Dubai, UAE): Active project, $250 per share, 40.5% APR Expected ROI (~0.8% to 1.5% Daily Yield), 2 Months duration.
   - **Kensington Palace Gardens Suites** (London, UK): Fixed 50.8% APR Expected ROI, 2 Months duration, $150 per share (Status: Sold Out / Fully Funded).

3. DEPOSITS & AI RECEIPT SCANNER:
   - Minimum deposit: 10 USDT (TRC20 & BEP20 accepted).
   - Instant AI Receipt Scanning: Upload a screenshot of your Binance/TrustWallet/OKX payment receipt, and Fundora's Gemini AI automatically extracts the TxID, Amount, and Network!
   - Users can also manually enter TxHash/TxID if preferred.

4. WITHDRAWALS:
   - Minimum withdrawal: 10 USDT.
   - Requires a bound USDT BEP20 or TRC20 address (configured in the Wallet menu).
   - Processed via automated security queue within 1 to 24 hours.

5. DAILY YIELDS & PROFIT CLAIMING:
   - Daily rental yield distributions range between 0.8% and 1.5% daily.
   - Users can claim profit anytime on the Overview dashboard via the "Claim Profit" button.

6. REFERRAL PROGRAM & VIP RANKS:
   - Bronze Shield (Level 1): 10% instant direct referral commission.
   - Silver Partner (Level 2): 5% team commission ($500 team volume or 3 active members).
   - Gold Director (Level 3): 2% team commission + yield boost vouchers ($2,000+ volume).
   - Platinum Trustee (Level 4): VIP direct support + co-ownership rights ($10,500+ volume).

7. COMMUNITY HUB & LIVE CHAT:
   - Community channels for global investor discussions, daily AI real estate tips, automatic multi-language translation, and AI chat summaries.

RULES FOR AI ASSISTANT:
1. Direct Answers: Answer the user's specific question directly, concisely, and accurately using verified platform facts. Do NOT paste generic boilerplate text when answering a specific question.
2. Language Matching: Answer in the EXACT language used by the user (English, Urdu script, Roman Urdu e.g. "wallet unbind kaise karein?", Arabic, Hindi, etc.).
   - Example Roman Urdu query: "wallet unbind kaise karein?"
     Answer: "Fundora me wallet unbind karna boht asan hai! Wallet Menu me jayen, jahan aapko BEP20 aur TRC20 k samne micro buttons '\u{1F513} BEP20 Unbind' aur '\u{1F513} TRC20 Unbind' milenge. Click karte he aapka address instantly unbind ho jaye ga aur aap naya address enter kar sakte hain."
3. Accuracy: Always quote exact figures (Emaar Dubai 40.5% ROI, Kensington London 50.8% ROI 2-month term, 10 USDT min deposit/withdrawal, instant direct unbind in Wallet menu).
4. Escalation: If a user has a complex payment issue or asks for direct human support, add "[ESCALATE_TO_HUMAN]" at the end.

Respond clearly using rich markdown formatting (bolding key terms).`;
  app.post("/api/ai/assistant", async (req, res) => {
    const { message, chatHistory, language } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, error: "Message string is required." });
    }
    try {
      const faqResult = searchStructuredFAQ(message, language || "en");
      const ai = getGeminiClient(req);
      if (!ai) {
        const smartFallback = faqResult.matched && faqResult.reply ? { reply: faqResult.reply, escalate: faqResult.escalate } : generateSmartFundoraAnswer(message, language || "en");
        return res.json({
          success: true,
          reply: smartFallback.reply,
          escalate: smartFallback.escalate
        });
      }
      const formattedHistory = Array.isArray(chatHistory) ? chatHistory.map((h) => `${h.sender === "user" ? "User" : "Assistant"}: ${h.text}`).join("\n") : "";
      const faqContext = faqResult.retrievedContext ? `

STRUCTURED FAQ RETRIEVAL CONTEXT:
${faqResult.retrievedContext}
` : "";
      const prompt = `${FUNDORA_SYSTEM_PROMPT}${faqContext}

Recent Conversation History:
${formattedHistory}

User Question (${language || "en"}): "${message}"

Direct Answer:`;
      const modelsToTry = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      let text = "";
      let lastAiErr = null;
      for (const modelName of modelsToTry) {
        try {
          const aiRes = await ai.models.generateContent({
            model: modelName,
            contents: prompt
          });
          if (aiRes && aiRes.text && aiRes.text.trim()) {
            text = aiRes.text.trim();
            break;
          }
        } catch (mErr) {
          lastAiErr = mErr;
          console.warn(`[AI Assistant] Model ${modelName} failed:`, mErr?.message || mErr);
        }
      }
      if (!text.trim()) {
        const smartFallback = faqResult.matched && faqResult.reply ? { reply: faqResult.reply, escalate: faqResult.escalate } : generateSmartFundoraAnswer(message, language || "en");
        return res.json({
          success: true,
          reply: smartFallback.reply,
          escalate: smartFallback.escalate
        });
      }
      const shouldEscalate = text.includes("[ESCALATE_TO_HUMAN]") || message.toLowerCase().includes("human") || message.toLowerCase().includes("admin") || faqResult.escalate;
      const cleanReply = text.replace("[ESCALATE_TO_HUMAN]", "").trim();
      return res.json({
        success: true,
        reply: cleanReply,
        escalate: shouldEscalate
      });
    } catch (err) {
      console.warn("[AI Assistant Proxy Error]", err?.message || err);
      const faqResult = searchStructuredFAQ(message, language || "en");
      const smartFallback = faqResult.matched && faqResult.reply ? { reply: faqResult.reply, escalate: faqResult.escalate } : generateSmartFundoraAnswer(message, language || "en");
      return res.json({
        success: true,
        reply: smartFallback.reply,
        escalate: smartFallback.escalate
      });
    }
  });
  app.post("/api/ai/community-reply", async (req, res) => {
    const { promptText, channelName } = req.body;
    try {
      const faqResult = searchStructuredFAQ(promptText || "", "en");
      const ai = getGeminiClient(req);
      if (!ai) {
        const smartFallback = faqResult.matched && faqResult.reply ? { reply: faqResult.reply, escalate: faqResult.escalate } : generateSmartFundoraAnswer(promptText || "", "en", channelName);
        return res.json({
          success: true,
          reply: smartFallback.reply
        });
      }
      const faqContext = faqResult.retrievedContext ? `

STRUCTURED FAQ RETRIEVAL CONTEXT:
${faqResult.retrievedContext}
` : "";
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `${FUNDORA_SYSTEM_PROMPT}${faqContext}

A member posted this question in channel/DM "${channelName || "Community"}":
"${promptText}"

Provide a direct, friendly, and precise answer specifically addressing their question in the same language as the input (Urdu, Roman Urdu, Arabic, English, etc.):`
      });
      const text = response?.text || "";
      if (!text.trim()) {
        const smartFallback = faqResult.matched && faqResult.reply ? { reply: faqResult.reply, escalate: faqResult.escalate } : generateSmartFundoraAnswer(promptText || "", "en", channelName);
        return res.json({
          success: true,
          reply: smartFallback.reply
        });
      }
      return res.json({
        success: true,
        reply: text
      });
    } catch (err) {
      const faqResult = searchStructuredFAQ(promptText || "", "en");
      const smartFallback = faqResult.matched && faqResult.reply ? { reply: faqResult.reply, escalate: faqResult.escalate } : generateSmartFundoraAnswer(promptText || "", "en", channelName);
      return res.json({
        success: true,
        reply: smartFallback.reply
      });
    }
  });
  app.post("/api/ai/translate", async (req, res) => {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ success: false, error: "Text is required" });
    try {
      const ai = getGeminiClient(req);
      if (!ai) {
        return res.json({ success: true, translatedText: text });
      }
      const prompt = `Translate the following message accurately into ${targetLang === "ur" ? "Urdu" : "English"}. Return ONLY the translated string without commentary:

"${text}"`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });
      return res.json({
        success: true,
        translatedText: response?.text?.trim() || text
      });
    } catch (err) {
      return res.json({ success: true, translatedText: text });
    }
  });
  app.post("/api/ai/summarize", async (req, res) => {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "Messages array required" });
    }
    try {
      const ai = getGeminiClient(req);
      if (!ai) {
        return res.json({
          success: true,
          summary: "\u2022 Community discussion regarding real estate co-ownership yields and property updates."
        });
      }
      const chatText = messages.map((m) => `${m.senderName}: ${m.text}`).join("\n");
      const prompt = `Summarize this community discussion into 3 key bullet points with emojis:

${chatText}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });
      return res.json({
        success: true,
        summary: response?.text || "\u2022 Thread summary generated successfully."
      });
    } catch (err) {
      return res.json({
        success: true,
        summary: "\u2022 Community discussion on real estate investments and daily profit claims."
      });
    }
  });
  app.post("/api/ai/spam-check", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ success: true, isSpam: false });
    try {
      const ai = getGeminiClient(req);
      if (!ai) return res.json({ success: true, isSpam: false });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Analyze this chat message for spam, phishing, scams, or offensive language:

"${text}"

Return JSON strictly matching schema.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              isSpam: { type: import_genai.Type.BOOLEAN },
              reason: { type: import_genai.Type.STRING }
            },
            required: ["isSpam"]
          }
        }
      });
      const parsed = JSON.parse(response?.text || '{"isSpam": false}');
      return res.json({ success: true, isSpam: parsed.isSpam, reason: parsed.reason });
    } catch (err) {
      return res.json({ success: true, isSpam: false });
    }
  });
  app.get("/api/ai/daily-tip", async (req, res) => {
    try {
      const ai = getGeminiClient(req);
      if (!ai) {
        return res.json({
          success: true,
          tipEn: "\u{1F4A1} Tip: Diversifying your portfolio across commercial and residential properties maximizes steady rental yield cash flow!",
          tipUr: "\u{1F4A1} \u0645\u0634\u0648\u0631\u06C1: \u062A\u062C\u0627\u0631\u062A\u06CC \u0627\u0648\u0631 \u0631\u06C1\u0627\u0626\u0634\u06CC \u062C\u0627\u0626\u06CC\u062F\u0627\u062F\u0648\u06BA \u0645\u06CC\u06BA \u06CC\u06A9\u0633\u0627\u06BA \u0633\u0631\u0645\u0627\u06CC\u06C1 \u06A9\u0627\u0631\u06CC \u0622\u067E \u06A9\u06D2 \u0631\u0648\u0632\u0627\u0646\u06C1 \u0645\u0646\u0627\u0641\u0639 \u06A9\u0648 \u0645\u0633\u062A\u062D\u06A9\u0645 \u0628\u0646\u0627\u062A\u06CC \u06C1\u06D2\u06D4"
        });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Generate a short 1-sentence real estate investment wisdom tip in both English and Urdu. Return JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              tipEn: { type: import_genai.Type.STRING },
              tipUr: { type: import_genai.Type.STRING }
            },
            required: ["tipEn", "tipUr"]
          }
        }
      });
      const data = JSON.parse(response?.text || "{}");
      return res.json({
        success: true,
        tipEn: data.tipEn || "\u{1F4A1} Diversify across luxury and residential property shares to optimize daily yields.",
        tipUr: data.tipUr || "\u{1F4A1} \u0631\u0648\u0632\u0627\u0646\u06C1 \u0645\u0646\u0627\u0641\u0639 \u0627\u0648\u0631 \u0645\u0633\u062A\u062D\u06A9\u0645 \u067E\u06CC\u062F\u0627\u0648\u0627\u0631 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0645\u062E\u062A\u0644\u0641 \u062C\u0627\u0626\u06CC\u062F\u0627\u062F\u0648\u06BA \u0645\u06CC\u06BA \u062D\u0635\u06C1 \u0644\u06CC\u06BA\u06D4"
      });
    } catch (err) {
      return res.json({
        success: true,
        tipEn: "\u{1F4A1} Reinvesting your daily yield claims unlocks compound growth over time!",
        tipUr: "\u{1F4A1} \u0627\u067E\u0646\u06D2 \u0631\u0648\u0632\u0627\u0646\u06C1 \u06A9\u06D2 \u0645\u0646\u0627\u0641\u0639 \u06A9\u0648 \u062F\u0648\u0628\u0627\u0631\u06C1 \u0645\u0646\u062A\u0642\u0644 \u06A9\u0631\u0646\u06D2 \u0633\u06D2 \u0648\u0642\u062A \u06A9\u06D2 \u0633\u0627\u062A\u06BE \u0645\u0631\u06A9\u0628 \u062A\u0631\u0642\u06CC \u0645\u0644\u062A\u06CC \u06C1\u06D2\u06D4"
      });
    }
  });
  app.post("/api/notifications/send-fcm", async (req, res) => {
    const { userEmail, userId, title, body, type, route, channelId, extraData, targetToken } = req.body;
    if (!userEmail && !userId && !targetToken) {
      return res.status(400).json({ success: false, error: "Missing recipient: userEmail, userId, or targetToken required." });
    }
    try {
      console.log(`[FCM Backend Gateway] Push Notification request received for "${userEmail || userId || "direct_token"}": "${title}" - "${body}"`);
      const adminApp = initFirebaseAdmin();
      if (adminApp) {
        const notificationTitle = title || "Fundora Notification";
        const notificationBody = body || "";
        const targetChannel = channelId || "fundora_notifications";
        const messageData = {
          title: String(notificationTitle),
          body: String(notificationBody),
          type: String(type || "system"),
          route: String(route || "#/overview"),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (extraData && typeof extraData === "object") {
          for (const [key, val] of Object.entries(extraData)) {
            messageData[key] = String(val);
          }
        }
        if (targetToken) {
          try {
            const tokenMsg = {
              token: targetToken,
              notification: {
                title: notificationTitle,
                body: notificationBody
              },
              data: messageData,
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  channelId: targetChannel,
                  clickAction: "FLUTTER_NOTIFICATION_CLICK"
                }
              }
            };
            const response = await (0, import_messaging.getMessaging)(adminApp).send(tokenMsg);
            console.log(`[FCM Backend Gateway] Firebase Admin SDK successfully dispatched push notification to token: ${response}`);
            return res.json({ success: true, via: "firebase_admin_sdk", target: "token", messageId: response });
          } catch (tokenErr) {
            console.warn(`[FCM Backend Gateway] Direct token dispatch warning: ${tokenErr?.message || tokenErr}`);
          }
        }
        if (userEmail) {
          try {
            const topicName = `user_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
            const topicMsg = {
              topic: topicName,
              notification: {
                title: notificationTitle,
                body: notificationBody
              },
              data: messageData,
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  channelId: targetChannel,
                  clickAction: "FLUTTER_NOTIFICATION_CLICK"
                }
              }
            };
            const response = await (0, import_messaging.getMessaging)(adminApp).send(topicMsg);
            console.log(`[FCM Backend Gateway] Firebase Admin SDK successfully dispatched push notification to topic "${topicName}": ${response}`);
            return res.json({ success: true, via: "firebase_admin_sdk", target: "topic", topicName, messageId: response });
          } catch (topicErr) {
            console.warn(`[FCM Backend Gateway] Topic message dispatch warning: ${topicErr?.message || topicErr}`);
          }
        }
      }
      const fcmKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_MESSAGING_KEY || "";
      if (fcmKey && (targetToken || userEmail)) {
        try {
          const fcmPayload = {
            to: targetToken || `/topics/user_${(userEmail || "").replace(/[^a-zA-Z0-9]/g, "_")}`,
            priority: "high",
            notification: {
              title: title || "Fundora Notification",
              body: body || "",
              sound: "default",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              channel_id: channelId || "fundora_notifications"
            },
            data: {
              title: title || "",
              body: body || "",
              type: type || "system",
              route: route || "#/overview",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              ...extraData || {}
            }
          };
          const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Authorization": `key=${fcmKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(fcmPayload)
          });
          if (fcmRes.ok) {
            const fcmData = await fcmRes.json();
            console.log(`[FCM Backend Gateway] Legacy FCM Server Key successfully dispatched push notification:`, fcmData);
            return res.json({ success: true, via: "fcm_server_key_fallback", fcmData });
          }
        } catch (fcmErr) {
          console.warn("[FCM Backend Gateway] FCM legacy direct HTTP request error:", fcmErr?.message || fcmErr);
        }
      }
      console.log(`[FCM Backend Gateway] Notification logged and recorded for ${userEmail || userId}. Channel: ${channelId || "fundora_notifications"}`);
      return res.json({
        success: true,
        logged: true,
        recipient: userEmail || userId,
        title,
        body,
        type,
        channelId: channelId || "fundora_notifications",
        note: "Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable to enable live Firebase Admin SDK push delivery."
      });
    } catch (err) {
      console.error("[FCM Backend Gateway Error]", err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || "Internal FCM dispatch error" });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/join", (req, res) => {
    const ref = req.query.ref || "";
    const redirectUrl = ref ? `/#/register?ref=${ref}` : "/#/register";
    console.log(`[Redirect] /join path accessed. Redirecting to ${redirectUrl}`);
    res.redirect(redirectUrl);
  });
  app.get("/register", (req, res) => {
    const ref = req.query.ref || "";
    const redirectUrl = ref ? `/#/register?ref=${ref}` : "/#/register";
    console.log(`[Redirect] /register path accessed. Redirecting to ${redirectUrl}`);
    res.redirect(redirectUrl);
  });
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start the Express proxy server:", err);
});
//# sourceMappingURL=server.cjs.map

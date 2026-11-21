export const STATES = [
  ["AP", "Andhra Pradesh", "आंध्र प्रदेश", "অন্ধ্রপ্রদেশ"], ["AR", "Arunachal Pradesh", "अरुणाचल प्रदेश", "অরুণাচল প্রদেশ"],
  ["AS", "Assam", "असम", "অসম"], ["BR", "Bihar", "बिहार", "বিহার"], ["CG", "Chhattisgarh", "छत्तीसगढ़", "ছত্তিশগড়"],
  ["GA", "Goa", "गोवा", "গোয়া"], ["GJ", "Gujarat", "गुजरात", "গুজরাট"], ["HR", "Haryana", "हरियाणा", "হরিয়ানা"],
  ["HP", "Himachal Pradesh", "हिमाचल प्रदेश", "হিমাচল প্রদেশ"], ["JH", "Jharkhand", "झारखंड", "ঝাড়খণ্ড"],
  ["KA", "Karnataka", "कर्नाटक", "কর্ণাটক"], ["KL", "Kerala", "केरल", "কেরালা"], ["MP", "Madhya Pradesh", "मध्य प्रदेश", "মধ্যপ্রদেশ"],
  ["MH", "Maharashtra", "महाराष्ट्र", "মহারাষ্ট্র"], ["MN", "Manipur", "मणिपुर", "মণিপুর"], ["ML", "Meghalaya", "मेघालय", "মেঘালয়"],
  ["MZ", "Mizoram", "मिज़ोरम", "মিজোরাম"], ["NL", "Nagaland", "नागालैंड", "নাগাল্যান্ড"], ["OD", "Odisha", "ओडिशा", "ওড়িশা"],
  ["PB", "Punjab", "पंजाब", "পাঞ্জাব"], ["RJ", "Rajasthan", "राजस्थान", "রাজস্থান"], ["SK", "Sikkim", "सिक्किम", "সিকিম"],
  ["TN", "Tamil Nadu", "तमिलनाडु", "তামিলনাড়ু"], ["TS", "Telangana", "तेलंगाना", "তেলেঙ্গানা"], ["TR", "Tripura", "त्रिपुरा", "ত্রিপুরা"],
  ["UP", "Uttar Pradesh", "उत्तर प्रदेश", "উত্তরপ্রদেশ"], ["UK", "Uttarakhand", "उत्तराखंड", "উত্তরাখণ্ড"], ["WB", "West Bengal", "पश्चिम बंगाल", "পশ্চিমবঙ্গ"],
].map(([code, en, hi, bn]) => ({ code, type: "state", name: { en, hi, bn } }));

export const UTS = [
  ["AN", "Andaman and Nicobar Islands", "अंडमान और निकोबार द्वीपसमूह", "আন্দামান ও নিকোবর দ্বীপপুঞ্জ"], ["CH", "Chandigarh", "चंडीगढ़", "চণ্ডীগড়"],
  ["DN", "Dadra and Nagar Haveli and Daman and Diu", "दादरा और नगर हवेली और दमन और दीव", "দাদরা ও নগর হাভেলি এবং দমন ও দিউ"],
  ["DL", "Delhi", "दिल्ली", "দিল্লি"], ["JK", "Jammu and Kashmir", "जम्मू और कश्मीर", "জম্মু ও কাশ্মীর"], ["LA", "Ladakh", "लद्दाख", "লাদাখ"],
  ["LD", "Lakshadweep", "लक्षद्वीप", "লাক্ষাদ্বীপ"], ["PY", "Puducherry", "पुडुचेरी", "পুদুচেরি"],
].map(([code, en, hi, bn]) => ({ code, type: "ut", name: { en, hi, bn } }));

export const ALL_REGIONS = [...STATES, ...UTS];
export const regionName = (code, lang) => ALL_REGIONS.find((r) => r.code === code)?.name[lang] || code;

export type Dhikr = {
  id: string;
  title: string;
  reference: string;
  count: number;
  times: ("morning" | "evening")[];
  arabic: string;
  arabicEvening?: string;
  istiadha?: string; // optional line shown above the main text
  english: string;
  englishEvening?: string;
  source: string;
  authenticity: string;
  categories?: string[];
};

export const ADHKAR: Dhikr[] = [
  {
    id: "ayat-al-kursi", title: "Ayat al-Kursi", reference: "Al-Baqarah 2:255 • 1 time", count: 1, times: ["morning", "evening"],
    istiadha: "أَعُوذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
    arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
    english: "I seek refuge in Allah from the accursed Satan. Allah—there is no deity worthy of worship except Him, the Ever-Living, the Sustainer of all. Neither drowsiness nor sleep overtakes Him. Everything in the heavens and earth belongs to Him. No one can intercede with Him except by His permission. He knows what lies before people and what lies behind them, while they grasp nothing of His knowledge except what He wills. His Kursi encompasses the heavens and the earth, and preserving them does not tire Him. He is the Most High, the Most Great.",
    source: "Hisn 75 • Qur'an 2:255", authenticity: "Authenticated in Hisn",
  },
  {
    id: "al-ikhlas", title: "Surah Al-Ikhlas", reference: "112 • 3 times", count: 3, times: ["morning", "evening"],
    arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n\nقُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
    english: "In the name of Allah, the Most Compassionate, the Most Merciful. Say: He is Allah, One; Allah, the One upon whom all depend. He neither begets nor was He begotten, and there is none comparable to Him.",
    source: "Hisn 76 • Abu Dawud / Tirmidhi", authenticity: "Authenticated",
  },
  {
    id: "al-falaq", title: "Surah Al-Falaq", reference: "113 • 3 times", count: 3, times: ["morning", "evening"],
    arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n\nقُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِنْ شَرِّ مَا خَلَقَ ۝ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ",
    english: "In the name of Allah, the Most Compassionate, the Most Merciful. Say: I seek refuge in the Lord of daybreak from the evil of what He created; from the evil of darkness when it settles; from the evil of those who blow upon knots; and from the evil of an envier when he envies.",
    source: "Hisn 76 • Abu Dawud / Tirmidhi", authenticity: "Authenticated",
  },
  {
    id: "an-nas", title: "Surah An-Nas", reference: "114 • 3 times", count: 3, times: ["morning", "evening"],
    arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n\nقُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ",
    english: "In the name of Allah, the Most Compassionate, the Most Merciful. Say: I seek refuge in the Lord of humankind, the King of humankind, the God of humankind, from the evil of the whisperer who withdraws—the one who whispers into people's hearts—from among jinn and people.",
    source: "Hisn 76 • Abu Dawud / Tirmidhi", authenticity: "Authenticated",
  },
  {
    id: "dominion", title: "The dominion belongs to Allah", reference: "1 time", count: 1, times: ["morning", "evening"],
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
    arabicEvening: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
    english: "We have entered a new morning and all dominion belongs to Allah; all praise belongs to Allah. None has the right to be worshipped but Allah alone, without partner. His is the dominion and His is the praise, and He is able to do all things. My Lord, I ask You for the good of this day and what follows it, and I seek refuge in You from its evil and what follows it. I seek refuge in You from laziness, the hardships of old age, the punishment of the Fire, and the punishment of the grave.",
    englishEvening: "We have entered the evening and all dominion belongs to Allah; all praise belongs to Allah. None has the right to be worshipped but Allah alone, without partner. His is the dominion and His is the praise, and He is able to do all things. My Lord, I ask You for the good of this night and what follows it, and I seek refuge in You from its evil and what follows it. I seek refuge in You from laziness, the hardships of old age, the punishment of the Fire, and the punishment of the grave.",
    source: "Hisn 77 • Sahih Muslim", authenticity: "Sahih",
  },
  {
    id: "by-you", title: "By You we enter morning and evening", reference: "1 time", count: 1, times: ["morning", "evening"],
    arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
    arabicEvening: "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ",
    english: "O Allah, by You we enter the morning and by You we enter the evening; by You we live and by You we die, and to You is the resurrection.",
    englishEvening: "O Allah, by You we enter the evening and by You we enter the morning; by You we live and by You we die, and to You is the final return.",
    source: "Hisn 78 • Tirmidhi", authenticity: "Sahih",
  },
  {
    id: "sayyid-istighfar", title: "Sayyid al-Istighfar", reference: "1 time", count: 1, times: ["morning", "evening"],
    arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    english: "O Allah, You are my Lord; none has the right to be worshipped but You. You created me and I am Your servant. I remain upon Your covenant and promise as much as I am able. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me and I acknowledge my sin, so forgive me, for no one forgives sins except You.",
    source: "Hisn 79 • Sahih al-Bukhari", authenticity: "Sahih",
  },
  {
    id: "witness", title: "Bear witness to Allah's oneness", reference: "4 times", count: 4, times: ["morning", "evening"],
    arabic: "اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
    arabicEvening: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
    english: "O Allah, this morning I call You, the bearers of Your Throne, Your angels, and all creation to witness that You are Allah; none has the right to be worshipped but You alone, without partner, and Muhammad is Your servant and Messenger.",
    englishEvening: "O Allah, this evening I call You, the bearers of Your Throne, Your angels, and all creation to witness that You are Allah; none has the right to be worshipped but You alone, without partner, and Muhammad is Your servant and Messenger.",
    source: "Hisn 80 • Abu Dawud", authenticity: "Hasan",
  },
  {
    id: "blessings", title: "Acknowledge Allah's blessings", reference: "1 time", count: 1, times: ["morning", "evening"],
    arabic: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
    arabicEvening: "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
    english: "O Allah, every blessing that has reached me or any of Your creation this morning is from You alone, without partner. All praise and thanks belong to You.",
    englishEvening: "O Allah, every blessing that has reached me or any of Your creation this evening is from You alone, without partner. All praise and thanks belong to You.",
    source: "Hisn 81 • Abu Dawud", authenticity: "Hasan",
  },
  {
    id: "wellbeing", title: "Well-being in body, hearing and sight", reference: "3 times", count: 3, times: ["morning", "evening"],
    arabic: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ",
    english: "O Allah, grant well-being to my body, my hearing, and my sight. None has the right to be worshipped but You. O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave. None has the right to be worshipped but You.",
    source: "Hisn 82 • Abu Dawud", authenticity: "Hasan",
  },
  {
    id: "hasbi", title: "Allah is sufficient for me", reference: "7 times", count: 7, times: ["morning", "evening"],
    arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    english: "Allah is sufficient for me. None has the right to be worshipped but Him. I place my trust in Him, and He is the Lord of the Mighty Throne.",
    source: "Hisn 83", authenticity: "Sound chain",
  },
  {
    id: "pardon", title: "Pardon and well-being", reference: "1 time", count: 1, times: ["morning", "evening"],
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي",
    english: "O Allah, I ask You for pardon and well-being in this world and the Hereafter; in my religion, my worldly affairs, my family, and my wealth. Conceal my faults and calm my fears. Guard me from in front of me, behind me, on my right, on my left, and above me; and I seek refuge in Your greatness from being struck unexpectedly from beneath me.",
    source: "Hisn 84 • Abu Dawud / Ibn Majah", authenticity: "Authenticated",
  },
  {
    id: "refuge-self", title: "Refuge from the evil of the self and Shaytan", reference: "1 time", count: 1, times: ["morning", "evening"],
    arabic: "اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ",
    english: "O Allah, Knower of the unseen and the seen, Originator of the heavens and the earth, Lord and Sovereign of everything: I testify that none has the right to be worshipped but You. I seek refuge in You from the evil of myself, from the evil of Satan and his call to shirk, and from committing evil against myself or bringing it upon another Muslim.",
    source: "Hisn 85 • Tirmidhi / Abu Dawud", authenticity: "Authenticated",
  },
  {
    id: "bismillah-noharm", title: "In Allah's name, nothing can harm", reference: "3 times", count: 3, times: ["morning", "evening"],
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ، وَهُوَ السَّمِيعُ الْعَلِيمُ",
    english: "In the name of Allah, with whose name nothing on earth or in heaven can cause harm; He is the All-Hearing, the All-Knowing.",
    source: "Hisn 86 • Abu Dawud / Tirmidhi", authenticity: "Hasan",
  },
  {
    id: "pleased", title: "Pleased with Allah, Islam and Muhammad ﷺ", reference: "3 times", count: 3, times: ["morning", "evening"],
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا",
    english: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad ﷺ as my Prophet.",
    source: "Hisn 87", authenticity: "Hasan",
  },
  {
    id: "ya-hayy", title: "O Ever-Living, O Sustainer", reference: "1 time", count: 1, times: ["morning", "evening"],
    arabic: "يَا حَيُّ يَا قَيُّومُ، بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    english: "O Ever-Living, O Sustainer, by Your mercy I seek help. Set right all of my affairs and do not leave me to myself even for the blink of an eye.",
    source: "Hisn 88", authenticity: "Sahih chain",
  },
  {
    id: "good-of-day", title: "Ask for the good of the day / night", reference: "1 time", count: 1, times: ["morning", "evening"],
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ: فَتْحَهُ، وَنَصْرَهُ، وَنُورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ",
    arabicEvening: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ: فَتْحَهَا، وَنَصْرَهَا، وَنُورَهَا، وَبَرَكَتَهَا، وَهُدَاهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا",
    english: "We have entered the morning and all dominion belongs to Allah, Lord of all worlds. O Allah, I ask You for the good of this day—its opening, victory, light, blessing, and guidance—and I seek refuge in You from the evil within it and the evil that follows it.",
    englishEvening: "We have entered the evening and all dominion belongs to Allah, Lord of all worlds. O Allah, I ask You for the good of this night—its opening, victory, light, blessing, and guidance—and I seek refuge in You from the evil within it and the evil that follows it.",
    source: "Hisn 89 • Abu Dawud", authenticity: "Hasan",
  },
  {
    id: "fitrah", title: "Upon the natural religion of Islam", reference: "1 time", count: 1, times: ["morning", "evening"],
    arabic: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
    arabicEvening: "أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
    english: "We have entered the morning upon the natural way of Islam, the word of sincere devotion, the religion of our Prophet Muhammad ﷺ, and the way of our father Ibrahim, upright and Muslim, who was not among those who associated partners with Allah.",
    englishEvening: "We have entered the evening upon the natural way of Islam, the word of sincere devotion, the religion of our Prophet Muhammad ﷺ, and the way of our father Ibrahim, upright and Muslim, who was not among those who associated partners with Allah.",
    source: "Hisn 90", authenticity: "Ahmad / Nasa'i / Tirmidhi",
  },
  {
    id: "subhanallah-hamd", title: "SubhanAllahi wa bihamdih", reference: "100 times", count: 100, times: ["morning", "evening"],
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    english: "Glory be to Allah, and praise belongs to Him.",
    source: "Hisn 91", authenticity: "Sahih",
  },
  {
    id: "tahlil-10", title: "La ilaha illa Allah (morning/evening)", reference: "10 times", count: 10, times: ["morning", "evening"],
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    english: "None has the right to be worshipped but Allah alone, without partner. His is the dominion and His is the praise, and He is able to do all things.",
    source: "Hisn 92", authenticity: "Sahih / Hasan",
  },
  {
    id: "tahlil-100", title: "La ilaha illa Allah — 100 in the day", reference: "100 times • shared daily count", count: 100, times: ["morning", "evening"],
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    english: "None has the right to be worshipped but Allah alone, without partner. His is the dominion and His is the praise, and He is able to do all things.",
    source: "Hisn 93 • Bukhari / Muslim", authenticity: "Sahih",
  },
  {
    id: "by-number", title: "By the number of His creation", reference: "3 times • morning", count: 3, times: ["morning"],
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
    english: "Glory be to Allah and praise be to Him—by the number of His creation, by His pleasure, by the weight of His Throne, and by the extent of His words.",
    source: "Hisn 94 • Sahih Muslim", authenticity: "Sahih",
  },
  {
    id: "beneficial-knowledge", title: "Beneficial knowledge, good provision, accepted deeds", reference: "1 time • morning", count: 1, times: ["morning"],
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
    english: "O Allah, I ask You for beneficial knowledge, good and wholesome provision, and deeds that are accepted.",
    source: "Hisn 95 • Ibn Majah", authenticity: "Hasan",
  },
  {
    id: "istighfar-100", title: "Seek Allah's forgiveness and repent", reference: "100 times • shared count", count: 100, times: ["morning", "evening"],
    arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    english: "I seek Allah's forgiveness and repent to Him.",
    source: "Hisn 96 • Bukhari / Muslim", authenticity: "Sahih",
  },
  {
    id: "perfect-words", title: "Refuge in Allah's perfect words", reference: "3 times • evening", count: 3, times: ["evening"],
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    english: "I seek refuge in the perfect words of Allah from the evil of what He created.",
    source: "Hisn 97", authenticity: "Sahih / Hasan",
  },
  {
    id: "salawat-10", title: "Send peace and blessings upon the Prophet ﷺ", reference: "10 times", count: 10, times: ["morning", "evening"],
    arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
    english: "O Allah, send Your peace and blessings upon our Prophet Muhammad.",
    source: "Hisn 98", authenticity: "Jayyid chain",
  },
  {
    id: "last-baqarah", title: "The last two verses of Al-Baqarah", reference: "2:285–286 • 1 time", count: 1, times: ["evening"],
    arabic: "آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ رَبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِنْ رُسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ۝ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِنْ قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنْتَ مَوْلَانَا فَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    english: "The Messenger believes in what was sent down to him from his Lord, and so do the believers. Each believes in Allah, His angels, His books, and His messengers, making no distinction between His messengers. They say: We hear and obey. We seek Your forgiveness, our Lord, and to You is the return. Allah does not burden a soul beyond its capacity. Each soul receives the good it earns and bears the evil it commits. Our Lord, do not take us to task if we forget or make a mistake. Do not place on us a burden like the one placed on those before us. Do not burden us with what we cannot bear. Pardon us, forgive us, and have mercy on us. You are our Protector, so grant us help against those who reject faith.",
    source: "Hisn 101 • Bukhari / Muslim", authenticity: "Sahih",
  },
  {
    id: "leaving-home", title: "Leaving the home", reference: "1 time", count: 1, times: [],
    categories: ["home", "protection", "guidance"],
    arabic: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    english: "In Allah's name; I rely upon Allah. There is no might or power except through Allah.",
    source: "Hisn 16 • Sunan Abi Dawud 5095", authenticity: "Sahih",
  },
  {
    id: "worry-grief", title: "Refuge from worry and grief", reference: "1 time", count: 1, times: [],
    categories: ["anxiety", "protection"],
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْجُبْنِ وَالْبُخْلِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ",
    english: "O Allah, protect me from worry, grief, incapacity, laziness, cowardice, miserliness, crushing debt, and being overpowered.",
    source: "Sahih al-Bukhari 6369", authenticity: "Sahih",
  },
  {
    id: "enter-mosque", title: "Entering the mosque", reference: "1 time", count: 1, times: [],
    categories: ["mosque", "prayer"],
    arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    english: "O Allah, open for me the doors of Your mercy.",
    source: "Sahih Muslim 713a", authenticity: "Sahih",
  },
  {
    id: "before-food", title: "Remember Allah before eating", reference: "1 time", count: 1, times: [],
    categories: ["food", "gratitude"],
    arabic: "بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ",
    english: "In Allah's name, at its beginning and its end.",
    source: "Sunan Abi Dawud 3767", authenticity: "Sahih",
  },
  {
    id: "sleep-wake", title: "Before sleep", reference: "1 time", count: 1, times: [],
    categories: ["sleep"],
    arabic: "بِاسْمِكَ أَمُوتُ وَأَحْيَا",
    english: "In Your name I die and I live.",
    source: "Sahih al-Bukhari 6312", authenticity: "Sahih",
  },
  {
    id: "protect-children", title: "Protection for family and children", reference: "1 time", count: 1, times: [],
    categories: ["family", "protection"],
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ",
    english: "I seek refuge in Allah's perfect words from every devil, harmful creature, and harmful envious eye.",
    source: "Sahih al-Bukhari 3371", authenticity: "Sahih",
  },
  {
    id: "increase-knowledge", title: "Increase me in knowledge", reference: "Qur'an 20:114 • 1 time", count: 1, times: [],
    categories: ["knowledge", "guidance"],
    arabic: "رَبِّ زِدْنِي عِلْمًا",
    english: "My Lord, increase me in knowledge.",
    source: "Qur'an 20:114", authenticity: "Qur'an",
  },
  {
    id: "travel-ride", title: "Beginning a journey", reference: "Qur'an 43:13–14 • 1 time", count: 1, times: [],
    categories: ["travel", "protection"],
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ ۝ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ",
    english: "Glory to the One who subjected this for us; we could not have mastered it ourselves, and to our Lord we will return.",
    source: "Qur'an 43:13–14 • Sahih Muslim 1342", authenticity: "Qur'an / Sahih",
  },
  {
    id: "waking-up", title: "Upon waking", reference: "1 time", count: 1, times: [],
    categories: ["sleep", "waking", "gratitude"],
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    english: "Praise belongs to Allah who gave us life after causing us to die, and to Him is the resurrection.",
    source: "Sahih al-Bukhari 6312", authenticity: "Sahih",
  },
  {
    id: "before-restroom", title: "Before entering the restroom", reference: "1 time", count: 1, times: [],
    categories: ["restroom", "protection"],
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
    english: "O Allah, I seek refuge in You from evil and impure things.",
    source: "Sahih al-Bukhari 142", authenticity: "Sahih",
  },
  {
    id: "after-restroom", title: "After leaving the restroom", reference: "1 time", count: 1, times: [],
    categories: ["restroom", "forgiveness"],
    arabic: "غُفْرَانَكَ",
    english: "I seek Your forgiveness.",
    source: "Sunan Abi Dawud 30", authenticity: "Sahih (Al-Albani)",
  },
  {
    id: "after-wudu", title: "After wudu", reference: "1 time", count: 1, times: [],
    categories: ["wudu", "faith", "prayer"],
    arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
    english: "I testify that none has the right to be worshipped except Allah alone, with no partner, and I testify that Muhammad is His servant and Messenger.",
    source: "Sahih Muslim 234b", authenticity: "Sahih",
  },
  {
    id: "after-prayer-peace", title: "Remembrance after the prayer", reference: "3× forgiveness, then 1 time", count: 1, times: [],
    categories: ["prayer", "after-prayer", "forgiveness"],
    arabic: "أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ ذَا الْجَلَالِ وَالْإِكْرَامِ",
    english: "I seek Allah's forgiveness three times. O Allah, You are Peace and from You comes peace. Blessed are You, Possessor of Majesty and Honor.",
    source: "Sahih Muslim 591", authenticity: "Sahih",
  },
  {
    id: "after-adhan", title: "After hearing the Adhan", reference: "1 time", count: 1, times: [],
    categories: ["adhan", "prayer", "salawat"],
    arabic: "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ",
    english: "O Allah, Lord of this perfect call and the established prayer, grant Muhammad the means and virtue, and raise him to the praised station You promised him.",
    source: "Sahih al-Bukhari 614", authenticity: "Sahih",
  },
  {
    id: "beneficial-rain", title: "When rain begins", reference: "1 time", count: 1, times: [],
    categories: ["rain", "gratitude"],
    arabic: "اللَّهُمَّ صَيِّبًا نَافِعًا",
    english: "O Allah, make it beneficial rain.",
    source: "Sahih al-Bukhari 1032", authenticity: "Sahih",
  },
  {
    id: "visiting-sick", title: "Supplication when visiting the sick", reference: "7 times", count: 7, times: [],
    categories: ["health", "illness"],
    arabic: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ",
    english: "I ask Allah the Magnificent, Lord of the Magnificent Throne, to heal you.",
    source: "Sunan Abi Dawud 3106", authenticity: "Sahih (Al-Albani)",
  },
  {
    id: "debt-provision", title: "Lawful provision and relief from debt", reference: "1 time", count: 1, times: [],
    categories: ["provision", "anxiety"],
    arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
    english: "O Allah, suffice me with what You made lawful instead of what You prohibited, and enrich me by Your bounty so I need no one besides You.",
    source: "Jami' at-Tirmidhi 3563", authenticity: "Hasan",
  },
  {
    id: "after-food", title: "After finishing food", reference: "1 time", count: 1, times: [],
    categories: ["food", "gratitude", "provision"],
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    english: "Praise belongs to Allah who fed me this and provided it for me without any power or strength from me.",
    source: "Jami' at-Tirmidhi 3458", authenticity: "Hasan",
  },
  {
    id: "leaving-mosque", title: "Leaving the mosque", reference: "1 time", count: 1, times: [],
    categories: ["mosque", "prayer", "provision"],
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
    english: "O Allah, I ask You from Your bounty.",
    source: "Sahih Muslim 713a", authenticity: "Sahih",
  },
  {
    id: "wearing-garment", title: "When wearing a garment", reference: "1 time", count: 1, times: [],
    categories: ["clothing", "gratitude", "provision"],
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    english: "Praise belongs to Allah who clothed me with this and provided it for me without any power or strength from me.",
    source: "Hisn al-Muslim 5", authenticity: "Authenticated in Hisn",
  },
];

export function adhkarFor(time: "morning" | "evening"): Dhikr[] {
  return ADHKAR.filter((d) => d.times.includes(time));
}

export function dhikrArabic(d: Dhikr, time: "morning" | "evening"): string {
  return time === "evening" && d.arabicEvening ? d.arabicEvening : d.arabic;
}

export function dhikrEnglish(d: Dhikr, time: "morning" | "evening"): string {
  return time === "evening" && d.englishEvening ? d.englishEvening : d.english;
}

export const TASBEEH_PHRASES = [
  { id: "subhanallah", arabic: "سُبْحَانَ اللهِ", label: "SubhanAllah", meaning: "Glory be to Allah" },
  { id: "alhamdulillah", arabic: "الْحَمْدُ لِلَّهِ", label: "Alhamdulillah", meaning: "All praise is due to Allah" },
  { id: "allahuakbar", arabic: "اللهُ أَكْبَرُ", label: "Allahu Akbar", meaning: "Allah is the Greatest" },
  { id: "lailahaillallah", arabic: "لَا إِلٰهَ إِلَّا اللهُ", label: "La ilaha illa Allah", meaning: "There is no god but Allah" },
  { id: "astaghfirullah", arabic: "أَسْتَغْفِرُ اللهَ", label: "Astaghfirullah", meaning: "I seek forgiveness from Allah" },
  { id: "subhanallah-bihamdih", arabic: "سُبْحَانَ اللهِ وَبِحَمْدِهِ", label: "SubhanAllahi wa bihamdih", meaning: "Glory and praise be to Allah" },
];

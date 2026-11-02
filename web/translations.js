

const TRANSLATIONS = {
  en: {
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    months: [
      "January", "February", "March", "April",
      "May", "June", "July", "August",
      "September", "October", "November", "December"
    ],
    week: "Week",
    strings: {
      addHabit: "Add habit",
      editHabit: "Edit habit",
      deleteHabit: "Delete habit",
      markDone: "Mark as done today",
      completed: "Completed today",
      bestStreak: "Best streak",
      description: "Description",
      save: "Save",
      cancel: "Cancel",
      loading: "Loading habits...",
      noHabits: "No habits yet",
      futureMessage1: "Let's not celebrate prematurely",
      futureMessage2: "Ambitious! But the calendar disagrees",
      futureMessage3: "Your future self hasn't done that yet",
      futureMessage4: "Future achievements? Earn them first",
      futureMessage5: "Patience, grasshopper",
      futureMessage6: "Let's not lie to the database",
      futureMessage7: "Already taking credit for tomorrow?",
      futureMessage8: "The checkbox is not a wishing well",
      futureMessage9: "Today's mission first, please!",
      futureMessage10: "Nice try, little liar"
              

    }
  },

  ta: {
    weekdays: [
      "Thingal", "Sevvai", "Budhan",
      "Vyazhan", "Velli", "Sani", "Nyayiru"
    ],
    months: [
      "Janavari", "Pibravari", "Maarch", "Epral",
      "Mei", "Joon", "Joolai", "Aagast",
      "Septembar", "Aktobar", "Navambar", "Disambar"
    ],
    week: "Vaaram",
    strings: {
      addHabit: "Pudhu pazhakkam",
      editHabit: "Pazhakkathai thiruthu",
      deleteHabit: "Pazhakkathai neekku",
      markDone: "Indru mudithen",
      completed: "Indru mudinthathu",
      bestStreak: "Sirandha thodar",
      description: "Vilakkam",
      save: "Semikkavum",
      cancel: "Raththu sei",
      loading: "Pazhakkangal yetrappadugindrana...",
      noHabits: "Innum pazhakkangal illai",
      futureMessage1: "Innum nadakkaathathai munkoottiye kondaada vendaam!",
      futureMessage2: "Aasai adhigam! Aanaal calendar oththukkollavillai",
      futureMessage3: "Un ethirkaala nee innum idhaich seyyavillai",
      futureMessage4: "Ethirkaala saadhanaiyaa? Mudhalil adhaich seydhu kaattu",
      futureMessage5: "Porumai, kutti thuraviye!",
      futureMessage6: "Tharavuththalaththidam poi solla vendaam",
      futureMessage7: "Naalaikkaana perumaiyai ippodhe eduththukkolgiraayaa?",
      futureMessage8: "Indha checkbox aasaigalai niraivettrum vilakku alla",
      futureMessage9: "Mudhalil indraiya velaiyai mudiththu vidu!",
      futureMessage10: "Nalla muyarchi, kutti poyyare!"
    }
  },

  ml: {
    weekdays: [
      "Thinkal", "Chovva", "Budhan",
      "Vyazham", "Velli", "Shani", "Njayar"
    ],
    months: [
      "Janavari", "Phibravari", "March", "Epril",
      "May", "June", "July", "August",
      "September", "October", "November", "December"
    ],
    week: "Aazhcha",
    strings: {
      addHabit: "Puthiya sheelam",
      editHabit: "Sheelam maattuka",
      deleteHabit: "Sheelam neekkuka",
      markDone: "Innu poorthiyakki",
      completed: "Innu poorthiyakki",
      bestStreak: "Mikacha thudarcha",
      description: "Vivaranam",
      save: "Save cheyyuka",
      cancel: "Raddakkuka",
      loading: "Sheelangal load cheyyunnu...",
      noHabits: "Ithuvare sheelangal illa",
      futureMessage1: "Nadakkaatha kaaryam nerathe aaghoshikkenda!",
      futureMessage2: "Aagraham kollam! Pakshe calendarinu sammathamalla",
      futureMessage3: "Ninte bhaaviyile nee polum ithu ithuvare cheythittilla",
      futureMessage4: "Bhaaviyile nettamo? Aadyam athu cheythu kaanikkoo",
      futureMessage5: "Kshamikkoo, kochu sanyaasi!",
      futureMessage6: "Databasenodu kallam parayenda",
      futureMessage7: "Naalathe nettathinte credit ippazhe edukkukayaano?",
      futureMessage8: "Ee checkbox aagrahangal saadhikkunna vilakkalla",
      futureMessage9: "Aadyam innathe dauthyam poorthiyaakkoo!",
      futureMessage10: "Nalla shramam, kochu kallaa!"
    },
  },

  kn: {
    weekdays: [
      "Somavara", "Mangalavara", "Budhavara",
      "Guruvāra", "Shukravara", "Shanivara", "Bhanuvara"
    ],
    months: [
      "Janavari", "Phibravari", "March", "Epril",
      "May", "June", "July", "August",
      "September", "October", "November", "December"
    ],
    week: "Vaara",
    strings: {
      addHabit: "Hosa abhyasa",
      editHabit: "Abhyasavannu badalisi",
      deleteHabit: "Abhyasavannu alisi",
      markDone: "Indu mugiside",
      completed: "Indu mugidide",
      bestStreak: "Uttama nirantara dinagalu",
      description: "Vivara",
      save: "Ulisiri",
      cancel: "Raddumadi",
      loading: "Abhyasagalu load aguttive...",
      noHabits: "Innu abhyasagalilla",
      futureMessage1: "Innoo aagadiddannu modale sambhramisabeda!",
      futureMessage2: "Aase chennagide! Aadare calendar opputtilla",
      futureMessage3: "Ninna bhavishyada neenu idannu innoo maadilla",
      futureMessage4: "Bhavishyada saadhaneye? Modalu adannu maadi torisu",
      futureMessage5: "Taalme irali, putta yogiye!",
      futureMessage6: "Database-ge sullu helabeda",
      futureMessage7: "Naaleya saadhaneya shreyassannu eegaale padeyuttiddiyaa?",
      futureMessage8: "Ee checkbox aasegalannu eederisuva deepavalla",
      futureMessage9: "Modalu indina kelasa mugisu!",
      futureMessage10: "Olley prayatna, putta sullugaara!"
    },
  },

  hi: {
    weekdays: [
      "Somvaar", "Mangalvaar", "Budhvaar",
      "Guruvaar", "Shukravaar", "Shanivaar", "Ravivaar"
    ],
    months: [
      "Janavari", "Faravari", "Maarch", "Aprail",
      "Mai", "Joon", "Julai", "Agast",
      "Sitambar", "Aktubar", "Navambar", "Disambar"
    ],
    week: "Hafte",
    strings: {
      addHabit: "Nayi aadat",
      editHabit: "Aadat badlein",
      deleteHabit: "Aadat hataayein",
      markDone: "Aaj poora kiya",
      completed: "Aaj poora hua",
      bestStreak: "Sabse lambi lagataar avadhi",
      description: "Vivaran",
      save: "Sahejein",
      cancel: "Radd karein",
      loading: "Aadatein load ho rahi hain...",
      noHabits: "Abhi koi aadat nahi hai",
      futureMessage1: "Abhi se jashn mat manao!",
      futureMessage2: "Iraade toh bade hain! Lekin calendar sahmat nahin hai",
      futureMessage3: "Tumhare bhavishya wale roop ne bhi abhi tak yeh nahin kiya",
      futureMessage4: "Bhavishya ki uplabdhi? Pehle use haasil toh karo",
      futureMessage5: "Sabr karo, chhote yogi!",
      futureMessage6: "Database se jhooth mat bolo",
      futureMessage7: "Kal ki uplabdhi ka shrey abhi se le rahe ho?",
      futureMessage8: "Yeh checkbox koi ichchha poori karne wala chiraag nahin hai",
      futureMessage9: "Pehle aaj ka kaam poora karo!",
      futureMessage10: "Achchhi koshish, chhote jhoothe!"
    },
  }
};
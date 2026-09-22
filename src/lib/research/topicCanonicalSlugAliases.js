// Topic canonical URL migrations — Human-Gate approved semantic cleanup.
//
// This is representation/addressability only. It never changes Topic identity, title, evidence,
// provenance, ranking or truth. Old user-prefixed slugs remain aliases; new semantic Latin slugs
// are the canonical public addresses.
export const TOPIC_CANONICAL_SLUG_MIGRATIONS = Object.freeze([
  Object.freeze({ oldSlug: "shimon-conv-827", newSlug: "827-avodat-hashem-hitbodedut-daat-simcha" }),
  Object.freeze({ oldSlug: "tzvi-conv-101", newSlug: "101-chilazon-zvulun-techelet" }),
  Object.freeze({ oldSlug: "tzvi-conv-1032", newSlug: "1032-rachum-vechanun" }),
  Object.freeze({ oldSlug: "tzvi-conv-1042", newSlug: "1042-kumi-ori" }),
  Object.freeze({ oldSlug: "tzvi-conv-1111", newSlug: "1111-shem-hashnit-atzeret" }),
  Object.freeze({ oldSlug: "tzvi-conv-1144", newSlug: "1144-shemesh-yareach" }),
  Object.freeze({ oldSlug: "tzvi-conv-1152", newSlug: "1152-tzvi-atbash-moshe" }),
  Object.freeze({ oldSlug: "tzvi-conv-1158", newSlug: "1158-pitchei-olam" }),
  Object.freeze({ oldSlug: "tzvi-conv-119", newSlug: "119-dimah-beit-hamikdash" }),
  Object.freeze({ oldSlug: "tzvi-conv-123", newSlug: "123-chanania-tov-hashem" }),
  Object.freeze({ oldSlug: "tzvi-conv-1233", newSlug: "1233-ma-zot-asita" }),
  Object.freeze({ oldSlug: "tzvi-conv-1254", newSlug: "1254-matamim" }),
  Object.freeze({ oldSlug: "tzvi-conv-128", newSlug: "128-beinoni-tov-meod" }),
  Object.freeze({ oldSlug: "tzvi-conv-1356", newSlug: "1356-beit-habetarim-geula" }),
  Object.freeze({ oldSlug: "tzvi-conv-136", newSlug: "136-mamon-kol-tzom" }),
  Object.freeze({ oldSlug: "tzvi-conv-1528", newSlug: "1528-mevaseret-yerushalayim" }),
  Object.freeze({ oldSlug: "tzvi-conv-155", newSlug: "155-ledovka-bo" }),
  Object.freeze({ oldSlug: "tzvi-conv-156", newSlug: "156-yosef-poter-hachalomot" }),
  Object.freeze({ oldSlug: "tzvi-conv-168", newSlug: "168-lo-matza" }),
  Object.freeze({ oldSlug: "tzvi-conv-170", newSlug: "170-naomi-tov" }),
  Object.freeze({ oldSlug: "tzvi-conv-173", newSlug: "173-lo-matzah" }),
  Object.freeze({ oldSlug: "tzvi-conv-199", newSlug: "199-od-meat-tzedaka" }),
  Object.freeze({ oldSlug: "tzvi-conv-204", newSlug: "204-tzadik-emunah" }),
  Object.freeze({ oldSlug: "tzvi-conv-209", newSlug: "209-matamim-taamei-torah" }),
  Object.freeze({ oldSlug: "tzvi-conv-217", newSlug: "217-dvorah-or" }),
  Object.freeze({ oldSlug: "tzvi-conv-223", newSlug: "223-zeh-hadavar" }),
  Object.freeze({ oldSlug: "tzvi-conv-238", newSlug: "238-rachel-chesed" }),
  Object.freeze({ oldSlug: "tzvi-conv-245", newSlug: "245-kmitza-hatzala" }),
  Object.freeze({ oldSlug: "tzvi-conv-246", newSlug: "246-gavriel" }),
  Object.freeze({ oldSlug: "tzvi-conv-277", newSlug: "277-ki-amru-yeshua" }),
  Object.freeze({ oldSlug: "tzvi-conv-305", newSlug: "305-rachel-mevaka-kapara" }),
  Object.freeze({ oldSlug: "tzvi-conv-306", newSlug: "306-isha-kapara-tikun" }),
  Object.freeze({ oldSlug: "tzvi-conv-335", newSlug: "335-para-aduma" }),
  Object.freeze({ oldSlug: "tzvi-conv-336", newSlug: "336-tzvi-latzadik-purim" }),
  Object.freeze({ oldSlug: "tzvi-conv-352", newSlug: "352-anavim" }),
  Object.freeze({ oldSlug: "tzvi-conv-374", newSlug: "374-achishena-geula" }),
  Object.freeze({ oldSlug: "tzvi-conv-386", newSlug: "386-david-ben-yishai-tzipor" }),
  Object.freeze({ oldSlug: "tzvi-conv-408", newSlug: "408-zot-malchut" }),
  Object.freeze({ oldSlug: "tzvi-conv-417", newSlug: "417-zayit-adam-david-mashiach" }),
  Object.freeze({ oldSlug: "tzvi-conv-444", newSlug: "444-tzfardea-shira" }),
  Object.freeze({ oldSlug: "tzvi-conv-448", newSlug: "448-boker-chasdecha" }),
  Object.freeze({ oldSlug: "tzvi-conv-453", newSlug: "453-melech-hamashiach-tamuz" }),
  Object.freeze({ oldSlug: "tzvi-conv-456", newSlug: "456-vayelech-yosef-yeshua" }),
  Object.freeze({ oldSlug: "tzvi-conv-466", newSlug: "466-shimon-bracha" }),
  Object.freeze({ oldSlug: "tzvi-conv-467", newSlug: "467-ketzir-chitim-mashiach" }),
  Object.freeze({ oldSlug: "tzvi-conv-489", newSlug: "489-kemishpatam" }),
  Object.freeze({ oldSlug: "tzvi-conv-495", newSlug: "495-matana-ahava" }),
  Object.freeze({ oldSlug: "tzvi-conv-496", newSlug: "496-livyatan-malchut" }),
  Object.freeze({ oldSlug: "tzvi-conv-503", newSlug: "503-emunot-zayit" }),
  Object.freeze({ oldSlug: "tzvi-conv-513", newSlug: "513-besora-emunah-geula" }),
  Object.freeze({ oldSlug: "tzvi-conv-517", newSlug: "517-matana-tova-shabbat" }),
  Object.freeze({ oldSlug: "tzvi-conv-530", newSlug: "530-moshe-mashiach" }),
  Object.freeze({ oldSlug: "tzvi-conv-553", newSlug: "553-rachem-arachamenu" }),
  Object.freeze({ oldSlug: "tzvi-conv-560", newSlug: "560-yesharim-avot-haolam" }),
  Object.freeze({ oldSlug: "tzvi-conv-562", newSlug: "562-hesech-hadaat" }),
  Object.freeze({ oldSlug: "tzvi-conv-566", newSlug: "566-mashiach-ben-yosef" }),
  Object.freeze({ oldSlug: "tzvi-conv-599", newSlug: "599-matzati-chen" }),
  Object.freeze({ oldSlug: "tzvi-conv-610", newSlug: "610-or-halevana-or-hachama" }),
  Object.freeze({ oldSlug: "tzvi-conv-613", newSlug: "613-hashem-elohai-yisrael" }),
  Object.freeze({ oldSlug: "tzvi-conv-618", newSlug: "618-masaot-tikun-hadinim" }),
  Object.freeze({ oldSlug: "tzvi-conv-620", newSlug: "620-keter" }),
  Object.freeze({ oldSlug: "tzvi-conv-638", newSlug: "638-kedem-yadati" }),
  Object.freeze({ oldSlug: "tzvi-conv-645", newSlug: "645-david-melech-yisrael" }),
  Object.freeze({ oldSlug: "tzvi-conv-651", newSlug: "651-yakir-efraim" }),
  Object.freeze({ oldSlug: "tzvi-conv-656", newSlug: "656-chanania-ben-akashya" }),
  Object.freeze({ oldSlug: "tzvi-conv-680", newSlug: "680-avodat-hatzedaka" }),
  Object.freeze({ oldSlug: "tzvi-conv-696", newSlug: "696-atik-yomin-keter" }),
  Object.freeze({ oldSlug: "tzvi-conv-702", newSlug: "702-shabbat" }),
  Object.freeze({ oldSlug: "tzvi-conv-717", newSlug: "717-lo-yikhat-amim" }),
  Object.freeze({ oldSlug: "tzvi-conv-739", newSlug: "739-nerot-chanukah" }),
  Object.freeze({ oldSlug: "tzvi-conv-773", newSlug: "773-shabbat-chazon" }),
  Object.freeze({ oldSlug: "tzvi-conv-777", newSlug: "777-shivim-shana" }),
  Object.freeze({ oldSlug: "tzvi-conv-849", newSlug: "849-sinat-chinam" }),
  Object.freeze({ oldSlug: "tzvi-conv-863", newSlug: "863-tomer-dvorah" }),
  Object.freeze({ oldSlug: "tzvi-conv-910", newSlug: "910-raza-deshabbat" }),
  Object.freeze({ oldSlug: "tzvi-conv-914", newSlug: "914-shchorot-keter" }),
  Object.freeze({ oldSlug: "tzvi-conv-95", newSlug: "95-yom-echad-malka" }),
  Object.freeze({ oldSlug: "tzvi-conv-98", newSlug: "98-ikuv-geula" }),
  Object.freeze({ oldSlug: "tzvi-conv-996", newSlug: "996-tishmerun" }),
]);

const OLD_TO_NEW = new Map(TOPIC_CANONICAL_SLUG_MIGRATIONS.map((row) => [row.oldSlug, row.newSlug]));
const NEW_TO_OLD = new Map(TOPIC_CANONICAL_SLUG_MIGRATIONS.map((row) => [row.newSlug, row.oldSlug]));

export function canonicalTopicSlug(slug) {
  const key = String(slug || "").trim();
  return OLD_TO_NEW.get(key) || key;
}

export function topicSourceSlugCandidates(slug) {
  const key = String(slug || "").trim();
  if (!key) return [];
  return [...new Set([
    canonicalTopicSlug(key),
    key,
    NEW_TO_OLD.get(key),
  ].filter(Boolean))];
}

export function legacyTopicSlugForCanonical(slug) {
  const key = String(slug || "").trim();
  return NEW_TO_OLD.get(key) || null;
}

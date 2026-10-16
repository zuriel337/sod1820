
## arm A (5 valid runs; drawn: usable 4132 ms, LCP 4028 ms)
totals (median of runs): requests 65, reads 65, scripts 51, script gzip 480.4 KB, compile 4273.2 ms, function calls 1591 ms, long tasks 1178.7 ms

script waves of the drawn run:
  wave 1: 9 scripts, 182.7 KB gzip, requested 245..248 ms, done by 1466 ms
  wave 2: 26 scripts, 157.7 KB gzip, requested 1819..1865 ms, done by 3435 ms
  wave 3: 10 scripts, 110.7 KB gzip, requested 4069..4074 ms, done by 4939 ms
  wave 4: 4 scripts, 19.6 KB gzip, requested 4495..4509 ms, done by 4846 ms
  wave 5: 2 scripts, 9.6 KB gzip, requested 5227..5228 ms, done by 5458 ms

reads of the drawn run (65 requests, 40 shapes), repeated shapes: GET site_flags?select x2; GET gematria_words?is_published&is_verified&limit&or&order&select x2; GET posts?categories&limit&offset&order&select&tags x3; GET posts?limit&select&slug x7; GET topic_cards_public?limit&offset&order&select x2; GET topic_cards_public?select&slug x4; POST rpc/gematria_method_trace x6; POST rpc/convergence_meter x4; GET nodes?is_active&limit&metadata->>tier&select x2; GET nodes?is_active&rule_id&select&type x2; POST rpc/fn_zero_scale x2
    245 ms  x1  GET css2?display&family
    302 ms  x1  GET posts?home_hidden&limit&order&select&slug
   1895 ms  x2  GET site_flags?select
   4075 ms  x1  POST rpc/notification_prefs_guest_get_v1
   4075 ms  x1  HEAD gematria_words?is_published&is_verified&or&select
   4075 ms  x1  HEAD gematria_words?created_at&is_published&is_verified&or&select
   4075 ms  x1  HEAD gematria_words?is_published&is_verified&or&select&visibility_changed_at
   4075 ms  x1  HEAD gematria_words?created_at&is_published&is_verified&or&select&visibility_changed_at
   4076 ms  x2  GET gematria_words?is_published&is_verified&limit&or&order&select
   4079 ms  x1  GET research_contributions?created_at&limit&order&select&status
   4079 ms  x3  GET posts?categories&limit&offset&order&select&tags
   4080 ms  x1  POST rpc/get_category_videos
   4080 ms  x1  GET els_records?limit&offset&or&order&select&status&visibility
   4085 ms  x1  GET posts?select&slug
   4137 ms  x1  GET storage/v1/object/public/media/…
   4169 ms  x1  GET storage/v1/object/public/media/…
   4169 ms  x1  GET storage/v1/object/public/media/…
   4169 ms  x1  GET storage/v1/object/public/media/…
   4170 ms  x1  GET storage/v1/object/public/media/…
   4183 ms  x7  GET posts?limit&select&slug
   4218 ms  x1  GET contributors?select&slug
   4220 ms  x1  GET contributors?active&kind&select&trusted
   4379 ms  x1  GET posts?categories&home_hidden&id&limit&select&tags
   4486 ms  x1  GET research_contributions?author_contributor_id&convergence_slug&limit&order&select&status
   4756 ms  x2  GET topic_cards_public?limit&offset&order&select
   4779 ms  x1  GET posts?home_hidden&limit&order&select&source&tags
   4781 ms  x1  POST rpc/world_group_source_arrivals_v2
   4888 ms  x1  GET topic_cards_public?limit&select&slug
   4919 ms  x1  GET storage/v1/object/public/media/…
   5029 ms  x1  POST rpc/fn_method_value
   5228 ms  x4  GET topic_cards_public?select&slug
   5233 ms  x6  POST rpc/gematria_method_trace
   5291 ms  x4  POST rpc/convergence_meter
   5348 ms  x2  GET nodes?is_active&limit&metadata->>tier&select
   5351 ms  x1  GET nodes?is_active&limit&metadata->>role&select
   5530 ms  x2  GET nodes?is_active&rule_id&select&type
   5571 ms  x1  GET research_contributions?limit&order&select&status&target_id&target_type
   5573 ms  x1  GET posts?ai_addition&home_hidden&limit&order&select&space
   5574 ms  x1  GET gematria_words?is_verified&limit&select&tags
   5699 ms  x2  POST rpc/fn_zero_scale

## arm B (5 valid runs; drawn: usable 3615 ms, LCP 3848 ms)
totals (median of runs): requests 46, reads 46, scripts 44, script gzip 433.2 KB, compile 3740 ms, function calls 1054.6 ms, long tasks 310 ms

script waves of the drawn run:
  wave 1: 9 scripts, 182.8 KB gzip, requested 194..196 ms, done by 1392 ms
  wave 2: 27 scripts, 159.3 KB gzip, requested 1605..1615 ms, done by 3241 ms
  wave 3: 1 scripts, 54.0 KB gzip, requested 3556..3556 ms, done by 3981 ms
  wave 4: 7 scripts, 37.2 KB gzip, requested 3944..3951 ms, done by 4332 ms

reads of the drawn run (46 requests, 35 shapes), repeated shapes: GET site_flags?select x2; GET posts?limit&select&slug x3; GET gematria_words?is_published&is_verified&limit&or&order&select x2; GET posts?categories&limit&offset&order&select&tags x3; GET topic_cards_public?limit&offset&order&select x2; GET nodes?is_active&limit&metadata->>tier&select x2; POST rpc/convergence_meter x4
    194 ms  x1  GET css2?display&family
    206 ms  x1  GET posts?home_hidden&limit&order&select&slug
   1657 ms  x2  GET site_flags?select
   3557 ms  x3  GET posts?limit&select&slug
   3559 ms  x1  POST rpc/notification_prefs_guest_get_v1
   3560 ms  x1  HEAD gematria_words?is_published&is_verified&or&select
   3560 ms  x1  HEAD gematria_words?created_at&is_published&is_verified&or&select
   3561 ms  x1  HEAD gematria_words?is_published&is_verified&or&select&visibility_changed_at
   3561 ms  x1  HEAD gematria_words?created_at&is_published&is_verified&or&select&visibility_changed_at
   3561 ms  x2  GET gematria_words?is_published&is_verified&limit&or&order&select
   3561 ms  x1  GET research_contributions?created_at&limit&order&select&status
   3561 ms  x3  GET posts?categories&limit&offset&order&select&tags
   3564 ms  x1  POST rpc/get_category_videos
   3564 ms  x1  GET els_records?limit&offset&or&order&select&status&visibility
   3577 ms  x1  GET posts?select&slug
   3630 ms  x1  GET storage/v1/object/public/media/…
   3648 ms  x1  GET storage/v1/object/public/media/…
   3648 ms  x1  GET storage/v1/object/public/media/…
   3649 ms  x1  GET storage/v1/object/public/media/…
   3649 ms  x1  GET storage/v1/object/public/media/…
   3671 ms  x1  GET contributors?select&slug
   3674 ms  x1  GET contributors?active&kind&select&trusted
   3803 ms  x1  GET storage/v1/object/public/media/…
   3850 ms  x1  GET posts?categories&home_hidden&id&limit&select&tags
   3933 ms  x1  GET research_contributions?author_contributor_id&convergence_slug&limit&order&select&status
   4020 ms  x1  POST rpc/fn_method_value
   4125 ms  x2  GET topic_cards_public?limit&offset&order&select
   4138 ms  x1  GET posts?home_hidden&limit&order&select&source&tags
   4142 ms  x1  POST rpc/world_group_source_arrivals_v2
   4192 ms  x2  GET nodes?is_active&limit&metadata->>tier&select
   4193 ms  x1  GET nodes?is_active&limit&metadata->>role&select
   4377 ms  x1  GET research_contributions?limit&order&select&status&target_id&target_type
   4377 ms  x1  GET posts?ai_addition&home_hidden&limit&order&select&space
   4378 ms  x1  GET gematria_words?is_verified&limit&select&tags
   4584 ms  x4  POST rpc/convergence_meter

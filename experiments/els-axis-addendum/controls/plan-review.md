| run | instruction | cap | window | cells | lines | est. input tokens | worst case | request sha | lock sha |
|---|---|---|---|---|---|---|---|---|---|
| U | general_v2_axis_marked_unnamed | 25 | 33x41 | 1353 | 212 | 21542 | $1.735 | 27f467a7b463 | 74137e81e92a |
| A | general_v2_axis_marked_unnamed+axis_deepening_addendum_unmeasured | 25 | 33x41 | 1353 | 212 | 23107 | $1.744 | 5dc874c7ee57 | b378dc29ec8c |

Sum of the two worst cases (every run to max_tokens): $3.4791. Cap $4; headroom $0.5209. Request differences U to A: .messages[0].content, .output_config.format.schema.required[1], .output_config.format.schema.required[2], .output_config.format.schema.properties.review. U equals the live run's request: true.
